import {
  appendStepSummary,
  GitHubClient,
  isNonFatalCommentPermissionError,
  requireEnv,
  truncate,
  type PullRequestData,
  type PullRequestFile,
} from "./github.js";
import { bootstrapCursorSdkRuntime } from "./sdk-bootstrap.js";
import {
  buildCheckRunsMarkdown,
  resolveScannerWaitOptionsFromEnv,
  waitForScannerReadiness,
} from "./scanner-context.js";

const REVIEW_MARKER = "<!-- cursor-pr-review -->";
const REVIEW_SCHEMA_START = "<!-- cursor-pr-review-schema:v1 -->";
const REVIEW_SCHEMA_END = "<!-- /cursor-pr-review-schema -->";
const SECURITY_TRIAGE_MARKER = "<!-- cursor-security-triage -->";
const FIX_MARKER = "<!-- cursor-fix-attempt -->";

interface SonarQualityGateResponse {
  projectStatus?: {
    status?: string;
    ignoredConditions?: boolean;
    conditions?: Array<{
      metricKey?: string;
      status?: string;
      actualValue?: string;
      errorThreshold?: string;
    }>;
  };
}

interface SonarIssuesResponse {
  total?: number;
  issues?: Array<{
    key?: string;
    rule?: string;
    severity?: string;
    type?: string;
    status?: string;
    message?: string;
    component?: string;
    line?: number;
  }>;
}

type ReviewSeverity = "critical" | "high" | "medium" | "low";
type ReviewConfidence = "high" | "medium" | "low";
type ReviewRisk = ReviewSeverity | "none";

interface ReviewFinding {
  id: string;
  severity: ReviewSeverity;
  confidence: ReviewConfidence;
  category: string;
  title: string;
  summary: string;
  location: string;
  recommendation: string;
  test_plan: string;
}

interface ReviewSchemaV1 {
  schema_version: "1.0";
  overall_risk: ReviewRisk;
  findings: ReviewFinding[];
  missing_tests: string[];
  next_actions: string[];
}

function resolveCloudRepoUrl(repository: string): string {
  if (process.env.CURSOR_CLOUD_REPO_URL) {
    return process.env.CURSOR_CLOUD_REPO_URL;
  }
  return `https://github.com/${repository}.git`;
}

/**
 * Cursor Cloud: pass `prUrl` so the clone tracks the PR (see SDK CloudOptions.repos).
 * Do **not** send `startingRef` unless explicitly overridden: GitHub sometimes surfaces
 * `head.ref` as a commit SHA or Cursor validates HEAD incorrectly when both `prUrl`
 * and `startingRef` are present — producing validation_error Branch '<40-char-sha>' does not exist.
 */
function resolveCloudRepoSpec(repository: string, pullRequest: PullRequestData) {
  const url = resolveCloudRepoUrl(repository);
  const entry: { url: string; prUrl: string; startingRef?: string } = {
    url,
    prUrl: pullRequest.html_url,
  };

  const envRef = process.env.CURSOR_CLOUD_STARTING_REF?.trim();
  if (!envRef) {
    return entry;
  }

  const normalized = envRef.replace(/^refs\/heads\//, "").trim();
  if (/^[0-9a-f]{40}$/i.test(normalized)) {
    return entry;
  }

  entry.startingRef = normalized;
  return entry;
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  const labels = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return [...new Set(labels)];
}

function severityScore(value: ReviewSeverity): number {
  switch (value) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function confidenceScore(value: ReviewConfidence): number {
  switch (value) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function buildPatchContext(files: PullRequestFile[]): string {
  return files
    .slice(0, 20)
    .map((file) => {
      const patch = file.patch ? truncate(file.patch, 2500) : "[no textual patch available]";
      return [
        `File: ${file.filename}`,
        `Status: ${file.status}, +${file.additions} -${file.deletions}`,
        "Patch:",
        patch,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function extractRunDiagnostics(result: unknown): string {
  if (!result || typeof result !== "object") {
    return String(result);
  }

  const candidate = result as Record<string, unknown>;
  const status = typeof candidate.status === "string" ? candidate.status : "unknown";
  let message = "no explicit message";
  if (typeof candidate.error === "string") {
    message = candidate.error;
  } else if (typeof candidate.message === "string") {
    message = candidate.message;
  }

  return `status=${status}; message=${message}; raw=${JSON.stringify(result).slice(0, 2000)}`;
}

function describeScannerWaitForSummary(enabled: boolean, timedOut: boolean): string {
  if (!enabled) {
    return "disabled (CURSOR_AUTO_FIX_WAIT_SCANNERS=false)";
  }
  if (timedOut) {
    return "timed out (proceeded with best-effort context)";
  }
  return "ok";
}

function extractAgentText(result: unknown): string {
  if (!result || typeof result !== "object") {
    return String(result);
  }

  const candidate = result as Record<string, unknown>;
  if (typeof candidate.result === "string") {
    return candidate.result;
  }
  if (typeof candidate.output === "string") {
    return candidate.output;
  }

  return JSON.stringify(result, null, 2);
}

function extractAttemptPrUrl(result: unknown): string | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const candidate = result as Record<string, unknown>;
  const git = candidate.git as
    | {
        branches?: Array<{ prUrl?: string }>;
      }
    | undefined;
  if (git?.branches) {
    const branchWithPr = git.branches.find((branch) => typeof branch.prUrl === "string");
    if (branchWithPr?.prUrl) {
      return branchWithPr.prUrl;
    }
  }

  const text = extractAgentText(result);
  const match = text.match(/https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+/);
  return match ? match[0] : null;
}

function extractPullRequestNumberFromUrl(url: string): number | null {
  const match = url.match(/\/pull\/(\d+)(?:$|[/?#])/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseReviewSchemaFromComment(commentBody: string): ReviewSchemaV1 | null {
  const markerRegex = new RegExp(
    `${REVIEW_SCHEMA_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\\`\\\`\\\`json\\s*([\\s\\S]*?)\\s*\\\`\\\`\\\`\\s*${REVIEW_SCHEMA_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    "i"
  );
  const match = commentBody.match(markerRegex);
  if (!match?.[1]) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[1].trim()) as ReviewSchemaV1;
    if (parsed.schema_version !== "1.0" || !Array.isArray(parsed.findings)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function summarizeStructuredReviewPriorities(schema: ReviewSchemaV1): string {
  const ordered = [...schema.findings].sort((a, b) => {
    const severityDiff = severityScore(b.severity) - severityScore(a.severity);
    if (severityDiff !== 0) return severityDiff;
    return confidenceScore(b.confidence) - confidenceScore(a.confidence);
  });

  const findings = ordered
    .slice(0, 5)
    .map(
      (finding) =>
        `- ${finding.id} [${finding.severity.toUpperCase()}][confidence=${finding.confidence}] ${finding.title} | location=${finding.location} | recommendation=${finding.recommendation}`
    )
    .join("\n");
  const missingTests =
    schema.missing_tests.length > 0
      ? schema.missing_tests.map((item) => `- ${item}`).join("\n")
      : "- none";
  const nextActions =
    schema.next_actions.length > 0
      ? schema.next_actions.map((item) => `- ${item}`).join("\n")
      : "- none";

  return [
    `overall_risk=${schema.overall_risk}`,
    "prioritized_findings:",
    findings || "- none",
    "missing_tests:",
    missingTests,
    "next_actions:",
    nextActions,
  ].join("\n");
}

function isTestFile(filePath: string): boolean {
  return (
    /(^|\/)__tests__\//.test(filePath) ||
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath) ||
    /_test\.go$/.test(filePath)
  );
}

function isCodeFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|go)$/.test(filePath);
}

async function fetchSonarJson<T>(
  path: string,
  params: URLSearchParams,
  token: string
): Promise<T> {
  const response = await fetch(`https://sonarcloud.io/api/${path}?${params.toString()}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SonarCloud API ${path} failed (${response.status}): ${body.slice(0, 800)}`);
  }

  return (await response.json()) as T;
}

async function buildSonarContext(prNumber: number): Promise<string> {
  const token = process.env.SONAR_TOKEN;
  const projectKey = process.env.SONAR_PROJECT_KEY;

  if (!token || !projectKey) {
    return "SonarCloud context unavailable: SONAR_TOKEN or SONAR_PROJECT_KEY is not configured.";
  }

  try {
    const qualityGateParams = new URLSearchParams({
      projectKey,
      pullRequest: String(prNumber),
    });
    const qualityGate = await fetchSonarJson<SonarQualityGateResponse>(
      "qualitygates/project_status",
      qualityGateParams,
      token
    );

    const issueLimit = toNumber(process.env.CURSOR_AUTO_FIX_MAX_SONAR_ISSUES, 8);
    const issuesParams = new URLSearchParams({
      componentKeys: projectKey,
      pullRequest: String(prNumber),
      statuses: "OPEN,CONFIRMED,REOPENED",
      severities: "BLOCKER,CRITICAL,MAJOR",
      ps: String(issueLimit),
    });
    const issues = await fetchSonarJson<SonarIssuesResponse>("issues/search", issuesParams, token);

    const gateStatus = qualityGate.projectStatus?.status ?? "UNKNOWN";
    const failingConditions = (qualityGate.projectStatus?.conditions ?? [])
      .filter((condition) => condition.status === "ERROR")
      .map((condition) => {
        return `- ${condition.metricKey ?? "metric"}: actual=${condition.actualValue ?? "?"}, threshold=${condition.errorThreshold ?? "?"}`;
      });

    const issueLines = (issues.issues ?? []).map((issue) => {
      const location = issue.component
        ? `${issue.component}${issue.line ? `:${issue.line}` : ""}`
        : "unknown-location";
      return `- [${issue.severity ?? "UNKNOWN"}] ${issue.message ?? "No message"} (${location})`;
    });

    return [
      `Quality Gate: ${gateStatus}`,
      failingConditions.length > 0
        ? `Failing conditions:\n${failingConditions.join("\n")}`
        : "Failing conditions: none reported",
      `Issue sample (${issueLines.length}/${issues.total ?? 0}):`,
      issueLines.length > 0 ? issueLines.join("\n") : "- No open BLOCKER/CRITICAL/MAJOR issues returned for this PR",
    ].join("\n");
  } catch (error) {
    return `SonarCloud context query failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function findLatestMarkedComment(
  github: GitHubClient,
  prNumber: number,
  marker: string,
  required = false
): Promise<string | null> {
  const comments = await github.listIssueComments(prNumber);
  const latest = [...comments].reverse().find((comment) => comment.body.includes(marker));

  if (!latest) {
    if (required) {
      throw new Error(`No marker ${marker} found on PR #${prNumber}.`);
    }
    return null;
  }

  return latest.body;
}

function buildPlanningPrompt(input: {
  repository: string;
  prNumber: number;
  prTitle: string;
  baseRef: string;
  headRef: string;
  patchContext: string;
  reviewComment: string;
  structuredReviewPriorities: string;
  securityComment: string;
  sonarContext: string;
  deterministicGatesContext: string;
}): string {
  return `
You are a senior code-change planner for pull request #${input.prNumber} in ${input.repository}.

PR title: ${input.prTitle}
Base branch: ${input.baseRef}
Head branch: ${input.headRef}

Changed files and patch excerpt:
${input.patchContext}

Cursor PR review comment:
${input.reviewComment}

Structured review priorities (parsed schema):
${input.structuredReviewPriorities}

Cursor security/dependency triage comment:
${input.securityComment}

SonarCloud context:
${input.sonarContext}

Deterministic gates / CI signal (includes scanner wait notes and GitHub check runs on HEAD):
${input.deterministicGatesContext}

Create a concise plan with these sections:
1) Selected fixes (max 2) and why they are highest signal
2) File-level edit plan
3) Unit test plan (new/updated tests required)
4) Validation plan (commands to run)
5) Risks and rollback notes

Do not write code in this response. Return markdown only.
`.trim();
}

function buildExecutionPrompt(input: {
  repository: string;
  prNumber: number;
  prTitle: string;
  baseRef: string;
  headRef: string;
  patchContext: string;
  reviewComment: string;
  structuredReviewPriorities: string;
  securityComment: string;
  sonarContext: string;
  deterministicGatesContext: string;
  plan: string;
}): string {
  return `
You are preparing an automated fix attempt for pull request #${input.prNumber} in ${input.repository}.

PR title: ${input.prTitle}
Base branch: ${input.baseRef}
Head branch: ${input.headRef}

Changed files and patch excerpt:
${input.patchContext}

Cursor PR review comment:
${input.reviewComment}

Structured review priorities (parsed schema):
${input.structuredReviewPriorities}

Cursor security/dependency triage comment:
${input.securityComment}

SonarCloud context:
${input.sonarContext}

Deterministic gates / CI signal (includes scanner wait notes and GitHub check runs on HEAD):
${input.deterministicGatesContext}

Approved planning guidance:
${input.plan}

Task requirements:
1) Implement only the planned high-signal fixes (max 2).
2) Keep changes minimal and scoped to the reported problems only.
3) Add or update unit tests for code changes.
4) Preserve existing behavior except where directly fixing the reported issues.
5) Run targeted validation commands relevant to edited files.
6) If no safe fix is possible, explain why and avoid speculative refactors.
7) Treat the automated PR review as non-binding guidance. Do not “fix the merge gate” by inventing policy — align changes with failing scanners/tests where relevant.

Output expectations:
- Apply code/documentation changes in this repository.
- Include a concise summary of what was fixed and what remains.
`.trim();
}

async function main(): Promise<void> {
  bootstrapCursorSdkRuntime();
  const { Agent, CursorAgentError } = await import("@cursor/sdk");

  const apiKey = requireEnv("CURSOR_API_KEY");
  const githubToken = requireEnv("GITHUB_TOKEN");
  const repository = requireEnv("GITHUB_REPOSITORY");
  const prNumberRaw = requireEnv("PR_NUMBER");
  const prNumber = Number(prNumberRaw);
  if (!Number.isFinite(prNumber) || prNumber <= 0) {
    throw new Error(`Invalid PR_NUMBER: ${prNumberRaw}`);
  }

  const autoFixEnabled =
    process.env.CURSOR_AUTO_FIX_ENABLED === "true" || process.env.CURSOR_FORCE_AUTO_FIX === "true";
  const requiredLabel = (process.env.CURSOR_AUTO_FIX_LABEL ?? "cursor:auto-fix").trim();
  const plannerModel = process.env.CURSOR_FIX_PLANNER_MODEL ?? "composer-2";
  const executionModel =
    process.env.CURSOR_FIX_EXECUTION_MODEL ?? process.env.CURSOR_FIX_MODEL ?? "composer-2-fast";
  const excludedAuthors = parseCsv(process.env.CURSOR_AUTO_FIX_EXCLUDED_AUTHORS ?? "cursor[bot]");
  const fixAttemptPrLabels = parseCsv(
    process.env.CURSOR_AGENT_PR_LABELS ?? "cursor:agent-generated"
  );
  const requireTestChanges = process.env.CURSOR_REQUIRE_TEST_CHANGES !== "false";
  const requireReviewSchema = process.env.CURSOR_REQUIRE_REVIEW_SCHEMA !== "false";

  const github = new GitHubClient({ token: githubToken, repository });
  const pullRequest = await github.getPullRequest(prNumber);

  if (!autoFixEnabled) {
    appendStepSummary(
      `## Cursor Auto-Fix Attempt\n\nSkipped: auto-fix is disabled (set CURSOR_AUTO_FIX_ENABLED=true to enable).`
    );
    return;
  }

  if (pullRequest.head.repo?.fork === true) {
    appendStepSummary(
      `## Cursor Auto-Fix Attempt\n\nSkipped: PR #${prNumber} comes from a fork and is blocked by policy.`
    );
    return;
  }

  if (excludedAuthors.includes(pullRequest.user.login)) {
    appendStepSummary(
      `## Cursor Auto-Fix Attempt\n\nSkipped: PR #${prNumber} author \`${pullRequest.user.login}\` is excluded by CURSOR_AUTO_FIX_EXCLUDED_AUTHORS policy.`
    );
    return;
  }

  const labels = await github.listIssueLabels(prNumber);
  const hasRequiredLabel = labels.some((label) => label.name === requiredLabel);
  if (!hasRequiredLabel) {
    appendStepSummary(
      `## Cursor Auto-Fix Attempt\n\nSkipped: PR #${prNumber} is missing required label \`${requiredLabel}\`.`
    );
    return;
  }

  const waitOpts = resolveScannerWaitOptionsFromEnv();
  let scannerWaitNotes: string[] = [];
  let scannerWaitTimedOut = false;
  if (waitOpts.enabled) {
    const waitResult = await waitForScannerReadiness({
      github,
      headSha: pullRequest.head.sha,
      pollIntervalMs: waitOpts.pollIntervalMs,
      timeoutMs: waitOpts.timeoutMs,
      optionalGraceMs: waitOpts.optionalGraceMs,
      requiredSubstrings: waitOpts.requiredSubstrings,
      optionalSubstrings: waitOpts.optionalSubstrings,
      sonarToken: process.env.SONAR_TOKEN,
      sonarProjectKey: process.env.SONAR_PROJECT_KEY,
      prNumber,
    });
    scannerWaitNotes = waitResult.notes.slice(-50);
    scannerWaitTimedOut = waitResult.timedOut;
    appendStepSummary(
      `### Scanner wait\n\n${truncate(scannerWaitNotes.join("\n"), 12000)}`
    );
    if (
      scannerWaitTimedOut &&
      process.env.CURSOR_AUTO_FIX_FAIL_ON_SCANNER_TIMEOUT === "true"
    ) {
      throw new Error(
        "Scanner wait timed out while waiting for SonarCloud / optional scanners (CURSOR_AUTO_FIX_FAIL_ON_SCANNER_TIMEOUT=true)."
      );
    }
  }

  const checkRuns = await github.listCheckRunsForCommit(pullRequest.head.sha);
  const ciCheckSummary = buildCheckRunsMarkdown(checkRuns);
  const scannerWaitLog = waitOpts.enabled
    ? scannerWaitNotes.join("\n")
    : "Scanner wait disabled (set CURSOR_AUTO_FIX_WAIT_SCANNERS=false).";

  const deterministicGatesContext = [
    "Policy: Automated PR review comments are advisory (implementation quality and gaps vs intent). Merge readiness is determined by CI and configured scanners (for example SonarCloud quality gate and CodeQL / GitHub code scanning), not by the review narrative alone.",
    "",
    "### Scanner wait log",
    truncate(scannerWaitLog || "(empty)", 6000),
    "",
    "### GitHub check runs on PR HEAD",
    truncate(ciCheckSummary, 8000),
  ].join("\n");

  const fullReviewComment =
    (await findLatestMarkedComment(github, prNumber, REVIEW_MARKER, true)) ??
    "Review context unavailable.";
  const parsedReviewSchema = parseReviewSchemaFromComment(fullReviewComment);
  if (requireReviewSchema && !parsedReviewSchema) {
    throw new Error(
      `Cursor PR review schema payload missing or invalid. Expected markers ${REVIEW_SCHEMA_START} ... ${REVIEW_SCHEMA_END}.`
    );
  }
  const structuredReviewPriorities = parsedReviewSchema
    ? summarizeStructuredReviewPriorities(parsedReviewSchema)
    : "Structured review schema unavailable; falling back to unstructured review text.";
  const reviewComment = truncate(fullReviewComment, 12000);
  const securityComment =
    (await findLatestMarkedComment(github, prNumber, SECURITY_TRIAGE_MARKER)) ??
    "No security/dependency triage comment detected for this PR.";
  const sonarContext = await buildSonarContext(prNumber);
  const sourcePrFiles = await github.getPullRequestFiles(prNumber);
  const patchContext = buildPatchContext(sourcePrFiles);

  const planningPrompt = buildPlanningPrompt({
    repository,
    prNumber,
    prTitle: pullRequest.title,
    baseRef: pullRequest.base.ref,
    headRef: pullRequest.head.ref,
    patchContext,
    reviewComment,
    structuredReviewPriorities,
    securityComment,
    sonarContext,
    deterministicGatesContext,
  });

  let agent: { [Symbol.asyncDispose](): Promise<void> } | null = null;

  try {
    const planningResult = await Agent.prompt(planningPrompt, {
      apiKey,
      model: { id: plannerModel },
      local: { cwd: process.cwd() },
    } as any);
    if ((planningResult as { status?: string }).status !== "finished") {
      throw new Error(`Planning run failed: ${extractRunDiagnostics(planningResult)}`);
    }
    const plan = extractAgentText(planningResult);

    const executionPrompt = buildExecutionPrompt({
      repository,
      prNumber,
      prTitle: pullRequest.title,
      baseRef: pullRequest.base.ref,
      headRef: pullRequest.head.ref,
      patchContext,
      reviewComment,
      structuredReviewPriorities,
      securityComment,
      sonarContext,
      deterministicGatesContext,
      plan,
    });

    agent = await Agent.create({
      apiKey,
      model: { id: executionModel },
      cloud: {
        repos: [resolveCloudRepoSpec(repository, pullRequest)],
        autoCreatePR: true,
        skipReviewerRequest: process.env.CURSOR_CLOUD_SKIP_REVIEWER_REQUEST !== "false",
      },
    } as any);

    const run = await (agent as any).send(executionPrompt);
    const runId = typeof run?.id === "string" ? run.id : "unknown";
    const result = await run.wait();

    if (result.status !== "finished") {
      throw new Error(`Cursor fix attempt run failed: ${extractRunDiagnostics(result)}`);
    }

    const fixPrUrl = extractAttemptPrUrl(result);
    const summary = extractAgentText(result);
    let testPolicyOutcome = "Not evaluated.";
    let labelOutcome = "No follow-up labels applied.";
    let testPolicyViolation = false;
    if (fixPrUrl) {
      const fixPrNumber = extractPullRequestNumberFromUrl(fixPrUrl);
      if (fixPrNumber && fixAttemptPrLabels.length > 0) {
        try {
          await github.addIssueLabels(fixPrNumber, fixAttemptPrLabels);
          labelOutcome = `Applied labels to fix PR #${fixPrNumber}: ${fixAttemptPrLabels.join(", ")}`;
        } catch (error) {
          labelOutcome = `Could not apply labels to fix PR #${fixPrNumber}: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      if (fixPrNumber) {
        const fixPrFiles = await github.getPullRequestFiles(fixPrNumber);
        const hasCodeChanges = fixPrFiles.some(
          (file) => isCodeFile(file.filename) && !isTestFile(file.filename)
        );
        const hasTestChanges = fixPrFiles.some((file) => isTestFile(file.filename));

        if (requireTestChanges && hasCodeChanges && !hasTestChanges) {
          testPolicyViolation = true;
          testPolicyOutcome =
            "Violation: code changes detected in fix PR but no unit test file changes found.";
        } else if (hasCodeChanges && hasTestChanges) {
          testPolicyOutcome =
            "Passed: code changes and unit test changes were both detected in fix PR.";
        } else if (!hasCodeChanges) {
          testPolicyOutcome = "Passed: no code file changes detected, unit test change not required.";
        } else {
          testPolicyOutcome = "Warning: test policy check ran but result was inconclusive.";
        }
      }
    }
    const body = `${FIX_MARKER}
## Cursor Auto-Fix Attempt

Source PR: #${prNumber}
Run ID: \`${runId}\`
Planner model: \`${plannerModel}\`
Execution model: \`${executionModel}\`
Required label: \`${requiredLabel}\`
Scanner wait: ${describeScannerWaitForSummary(waitOpts.enabled, scannerWaitTimedOut)}

${fixPrUrl ? `Fix attempt PR: ${fixPrUrl}` : "Run finished, but no PR URL was returned by the SDK response."}

Label outcome: ${labelOutcome}
Unit test policy outcome: ${testPolicyOutcome}

### Planner output
${truncate(plan, 3000)}

### Agent summary
${truncate(summary, 5000)}

_Generated by Cursor SDK workflow (cursor-fix-attempt.yml)._`;

    try {
      await github.upsertIssueComment(prNumber, FIX_MARKER, body);
    } catch (error) {
      if (!isNonFatalCommentPermissionError(error)) {
        throw error;
      }

      const failure = `Unable to post auto-fix comment on #${prNumber} due to token permissions (403 Resource not accessible by integration).`;
      if (process.env.CURSOR_ALLOW_COMMENT_FAILURE !== "true") {
        throw new Error(failure);
      }
      appendStepSummary(`${body}\n\n> Note: ${failure}`);
      return;
    }

    appendStepSummary(body);

    if (testPolicyViolation) {
      throw new Error(
        "Fix attempt completed but violated CURSOR_REQUIRE_TEST_CHANGES policy (no unit test changes detected)."
      );
    }
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(
        `Cursor auto-fix startup failed (retryable=${error.isRetryable}): ${error.message}`
      );
    }
    throw error;
  } finally {
    if (agent) {
      await agent[Symbol.asyncDispose]();
    }
  }
}

void main();
