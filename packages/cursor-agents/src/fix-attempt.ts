import {
  appendStepSummary,
  GitHubClient,
  isNonFatalCommentPermissionError,
  requireEnv,
  truncate,
  type PullRequestFile,
} from "./github.js";
import { bootstrapCursorSdkRuntime } from "./sdk-bootstrap.js";
import {
  buildCheckRunsMarkdown,
  resolveScannerWaitOptionsFromEnv,
  waitForScannerReadiness,
} from "./scanner-context.js";
import {
  buildCloudRepoSpec,
  resolveHeadBranchMetadata,
} from "./head-branch-resolution.js";
import { resolveFixPlannerPromptOptions, resolveRuntimeMode } from "./runtime-options.js";
import { buildMergedRemediationBrief, type SonarIssueBriefInput } from "./remediation-brief.js";

const SECURITY_TRIAGE_MARKER = "<!-- cursor-security-triage -->";
const DEP_ASSESSMENT_MARKER = "<!-- cursor-dep-assessment -->";
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

/**
 * Cloud agent git behavior (SDK `cloud.workOnCurrentBranch` / `cloud.autoCreatePR`).
 * Default matches historical behavior: open a new PR with the fix attempt.
 * To push onto the source PR branch instead, set repo var `CURSOR_CLOUD_WORK_ON_CURRENT_BRANCH=true`
 * and typically `CURSOR_CLOUD_AUTO_CREATE_PR=false`.
 */
function resolveCloudAgentGitBehavior(): {
  workOnCurrentBranch: boolean;
  autoCreatePR: boolean;
} {
  const workOnCurrentBranch = process.env.CURSOR_CLOUD_WORK_ON_CURRENT_BRANCH === "true";
  const autoCreatePR = process.env.CURSOR_CLOUD_AUTO_CREATE_PR !== "false";
  return { workOnCurrentBranch, autoCreatePR };
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

interface SonarMeasuresResponse {
  component?: {
    measures?: Array<{ metric?: string; value?: string }>;
  };
}

function parseSonarSeverityFilter(): string {
  const raw =
    process.env.CURSOR_AUTO_FIX_SONAR_SEVERITIES ?? "BLOCKER,CRITICAL,MAJOR";
  const normalized = raw
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
  return normalized.length > 0 ? normalized.join(",") : "BLOCKER,CRITICAL,MAJOR";
}

function measureMap(response: SonarMeasuresResponse): Record<string, string> {
  const rows = response.component?.measures ?? [];
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (row.metric && row.value !== undefined) {
      out[row.metric] = row.value;
    }
  }
  return out;
}

async function buildSonarRemediationContext(prNumber: number): Promise<{
  text: string;
  issues: SonarIssueBriefInput[];
}> {
  const token = process.env.SONAR_TOKEN;
  const projectKey = process.env.SONAR_PROJECT_KEY;

  if (!token || !projectKey) {
    return {
      text: "SonarCloud context unavailable: SONAR_TOKEN or SONAR_PROJECT_KEY is not configured.",
      issues: [],
    };
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

    const metrics =
      "new_coverage,new_line_coverage,new_violations,new_bugs,new_vulnerabilities,new_security_hotspots_reviewed";
    const measuresParams = new URLSearchParams({
      component: projectKey,
      pullRequest: String(prNumber),
      metricKeys: metrics,
    });
    const measures = await fetchSonarJson<SonarMeasuresResponse>(
      "measures/component",
      measuresParams,
      token
    );
    const measureValues = measureMap(measures);

    const issueLimit = toNumber(process.env.CURSOR_AUTO_FIX_MAX_SONAR_ISSUES, 8);
    const issuesParams = new URLSearchParams({
      componentKeys: projectKey,
      pullRequest: String(prNumber),
      statuses: "OPEN,CONFIRMED,REOPENED",
      severities: parseSonarSeverityFilter(),
      ps: String(issueLimit),
    });
    const issues = await fetchSonarJson<SonarIssuesResponse>("issues/search", issuesParams, token);

    const gateStatus = qualityGate.projectStatus?.status ?? "UNKNOWN";
    const failingConditions = (qualityGate.projectStatus?.conditions ?? [])
      .filter((condition) => condition.status === "ERROR")
      .map((condition) => {
        return `- ${condition.metricKey ?? "metric"}: actual=${condition.actualValue ?? "?"}, threshold=${condition.errorThreshold ?? "?"}`;
      });

    const briefIssues: SonarIssueBriefInput[] = (issues.issues ?? []).map((issue) => ({
      severity: String(issue.severity ?? "UNKNOWN"),
      message: String(issue.message ?? "No message"),
      component: issue.component,
      line: issue.line,
    }));

    const issueLines = briefIssues.map((issue) => {
      const location = issue.component
        ? `${issue.component}${issue.line !== undefined ? `:${issue.line}` : ""}`
        : "unknown-location";
      return `- [${issue.severity}] ${issue.message} (${location})`;
    });

    const coverageBits = [
      measureValues.new_coverage
        ? `new_coverage=${measureValues.new_coverage}%`
        : null,
      measureValues.new_line_coverage
        ? `new_line_coverage=${measureValues.new_line_coverage}%`
        : null,
      measureValues.new_violations ? `new_violations=${measureValues.new_violations}` : null,
      measureValues.new_bugs ? `new_bugs=${measureValues.new_bugs}` : null,
      measureValues.new_vulnerabilities ? `new_vulnerabilities=${measureValues.new_vulnerabilities}` : null,
    ].filter(Boolean);

    const text = [
      `Quality Gate: ${gateStatus}`,
      failingConditions.length > 0
        ? `Failing conditions:\n${failingConditions.join("\n")}`
        : "Failing conditions: none reported",
      coverageBits.length > 0 ? `New-code measures (PR): ${coverageBits.join(", ")}` : null,
      `Issue sample (${issueLines.length}/${issues.total ?? 0}) — severities=${parseSonarSeverityFilter()}:`,
      issueLines.length > 0 ? issueLines.join("\n") : "- No open issues returned for this filter",
    ]
      .filter(Boolean)
      .join("\n");

    return { text, issues: briefIssues };
  } catch (error) {
    return {
      text: `SonarCloud context query failed: ${error instanceof Error ? error.message : String(error)}`,
      issues: [],
    };
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

/** Optional Bugbot or other bot review prose — advisory only; Sonar/checks drive merge gates. */
async function findAdvisoryReviewContext(
  github: GitHubClient,
  prNumber: number
): Promise<string> {
  const comments = await github.listIssueComments(prNumber);
  const reversed = [...comments].reverse();
  for (const comment of reversed) {
    const body = comment.body;
    const login =
      (comment as { user?: { login?: string } }).user?.login?.toLowerCase() ?? "";
    const looksLikeBugbot =
      /bugbot/i.test(body) ||
      (login.includes("cursor") && /review|finding|severity|autofix/i.test(body));
    if (looksLikeBugbot) {
      return body;
    }
  }
  return "No Bugbot or advisory bot review comment detected for this PR.";
}

function buildPlanningPrompt(input: {
  repository: string;
  prNumber: number;
  prTitle: string;
  baseRef: string;
  headRef: string;
  patchContext: string;
  advisoryReviewComment: string;
  securityComment: string;
  depAssessmentComment: string;
  sonarContext: string;
  mergedRemediationBrief: string;
  deterministicGatesContext: string;
}): string {
  return `
You are a senior code-change planner for pull request #${input.prNumber} in ${input.repository}.

PR title: ${input.prTitle}
Base branch: ${input.baseRef}
Head branch: ${input.headRef}

Changed files and patch excerpt:
${input.patchContext}

Advisory review context (Bugbot or bot review — non-binding):
${input.advisoryReviewComment}

Cursor security/dependency triage comment:
${input.securityComment}

Renovate dependency assessment comment (highlight-only):
${input.depAssessmentComment}

SonarCloud context:
${input.sonarContext}

Merged remediation signals (Sonar-first; advisory overlap when present):
${input.mergedRemediationBrief}

Deterministic gates / CI signal (includes scanner wait notes and GitHub check runs on HEAD):
${input.deterministicGatesContext}

Create a concise plan with these sections:
1) Selected fixes (max 2) and why they are highest signal
2) File-level edit plan
3) Unit test plan (new/updated tests required)
4) Validation plan (commands to run)
5) Risks and rollback notes

Planning constraints:
- Prefer fixes backed by failing/overridden deterministic gates (Sonar conditions, failing checks).
- Treat Bugbot and other bot review prose as advisory; do not invent merge policy.

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
  advisoryReviewComment: string;
  securityComment: string;
  depAssessmentComment: string;
  sonarContext: string;
  mergedRemediationBrief: string;
  deterministicGatesContext: string;
  plan: string;
  cloudGitNotes: string;
  orchestrationNotes: string;
}): string {
  return `
You are preparing an SDK remediation run for pull request #${input.prNumber} in ${input.repository}.

PR title: ${input.prTitle}
Base branch: ${input.baseRef}
Head branch: ${input.headRef}

Changed files and patch excerpt:
${input.patchContext}

Advisory review context (Bugbot or bot review — non-binding):
${input.advisoryReviewComment}

Cursor security/dependency triage comment:
${input.securityComment}

Renovate dependency assessment comment (highlight-only):
${input.depAssessmentComment}

SonarCloud context:
${input.sonarContext}

Merged remediation signals (Sonar-first; advisory overlap when present):
${input.mergedRemediationBrief}

Deterministic gates / CI signal (includes scanner wait notes and GitHub check runs on HEAD):
${input.deterministicGatesContext}

Approved planning guidance:
${input.plan}

${input.cloudGitNotes}

Runtime/orchestration:
${input.orchestrationNotes}

Task requirements:
1) Implement only the planned high-signal fixes (max 2).
2) Keep changes minimal and scoped to the reported problems only.
3) Add or update unit tests for code changes.
4) Preserve existing behavior except where directly fixing the reported issues.
5) Run targeted validation commands relevant to edited files.
6) If no safe fix is possible, explain why and avoid speculative refactors.
7) Align changes with failing scanners/tests; Bugbot prose is advisory only.

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
    process.env.CURSOR_FIX_EXECUTION_MODEL ?? process.env.CURSOR_FIX_MODEL ?? "composer-2.5";
  const excludedAuthors = parseCsv(process.env.CURSOR_AUTO_FIX_EXCLUDED_AUTHORS ?? "cursor[bot]");
  const fixAttemptPrLabels = parseCsv(
    process.env.CURSOR_AGENT_PR_LABELS ?? "cursor:agent-generated"
  );
  const requireTestChanges = process.env.CURSOR_REQUIRE_TEST_CHANGES !== "false";

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

  const headBranchMeta = await resolveHeadBranchMetadata(github, pullRequest);
  if (headBranchMeta.summaryNote) {
    appendStepSummary(`### PR head branch resolution\n\n${headBranchMeta.summaryNote}`);
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
    "Policy: Bugbot and SDK advisory comments are non-binding. Merge readiness is determined by CI and configured scanners (SonarCloud quality gate, CodeQL / code scanning), not by review prose alone.",
    "",
    "### Scanner wait log",
    truncate(scannerWaitLog || "(empty)", 6000),
    "",
    "### GitHub check runs on PR HEAD",
    truncate(ciCheckSummary, 8000),
  ].join("\n");

  const advisoryReviewComment = truncate(
    await findAdvisoryReviewContext(github, prNumber),
    12000
  );
  const securityComment =
    (await findLatestMarkedComment(github, prNumber, SECURITY_TRIAGE_MARKER)) ??
    "No security/dependency triage comment detected for this PR.";
  const depAssessmentComment =
    (await findLatestMarkedComment(github, prNumber, DEP_ASSESSMENT_MARKER)) ??
    "No Renovate dependency assessment comment detected for this PR.";
  const sonarRemediation = await buildSonarRemediationContext(prNumber);
  const sonarContext = sonarRemediation.text;
  const mergedBriefLimit = toNumber(process.env.CURSOR_AUTO_FIX_MERGED_SIGNAL_LIMIT, 5);
  const mergedRemediationBrief = buildMergedRemediationBrief({
    reviewFindings: [],
    sonarIssues: sonarRemediation.issues,
    maxReview: mergedBriefLimit,
    maxSonar: mergedBriefLimit,
  });
  const sourcePrFiles = await github.getPullRequestFiles(prNumber);
  const patchContext = buildPatchContext(sourcePrFiles);

  const planningPrompt = buildPlanningPrompt({
    repository,
    prNumber,
    prTitle: pullRequest.title,
    baseRef: pullRequest.base.ref,
    headRef: headBranchMeta.branchShortName,
    patchContext,
    advisoryReviewComment,
    securityComment,
    depAssessmentComment,
    sonarContext,
    mergedRemediationBrief,
    deterministicGatesContext,
  });

  let agent: { [Symbol.asyncDispose](): Promise<void> } | null = null;

  try {
    const plannerRuntime = resolveFixPlannerPromptOptions(
      repository,
      pullRequest,
      headBranchMeta.branchShortName
    );
    const runtimeMode = resolveRuntimeMode();
    appendStepSummary(
      `### Fix-attempt planner runtime\n\n- **CURSOR_RUNTIME**: ${runtimeMode}\n- Planner uses ${runtimeMode === "cloud" ? "**Cursor Cloud** with the same repo startingRef/prUrl wiring as the executor" : "**local** CI workspace (Agent.prompt)"}.\n`
    );

    const planningResult = await Agent.prompt(planningPrompt, {
      apiKey,
      model: { id: plannerModel },
      ...plannerRuntime,
    } as any);
    if ((planningResult as { status?: string }).status !== "finished") {
      throw new Error(`Planning run failed: ${extractRunDiagnostics(planningResult)}`);
    }
    const plan = extractAgentText(planningResult);

    const cloudGit = resolveCloudAgentGitBehavior();
    appendStepSummary(
      [
        "### Cursor cloud git behavior",
        "",
        `- \`workOnCurrentBranch\`: **${cloudGit.workOnCurrentBranch}** (\`CURSOR_CLOUD_WORK_ON_CURRENT_BRANCH\`)`,
        `- \`autoCreatePR\`: **${cloudGit.autoCreatePR}** (\`CURSOR_CLOUD_AUTO_CREATE_PR\`)`,
        "",
        "Default opens a **new** PR for the fix. To push onto the **current** PR branch instead, set repo variables `CURSOR_CLOUD_WORK_ON_CURRENT_BRANCH=true` and `CURSOR_CLOUD_AUTO_CREATE_PR=false`.",
      ].join("\n")
    );

    let cloudGitNotes = "";
    if (cloudGit.workOnCurrentBranch && !cloudGit.autoCreatePR) {
      cloudGitNotes = `Git / PR workflow:\n- Commit and push to the existing branch for PR #${prNumber}; do not open a separate pull request.`;
    } else if (cloudGit.workOnCurrentBranch) {
      cloudGitNotes = `Git / PR workflow:\n- Prefer commits on the current PR branch (runtime: workOnCurrentBranch=true).`;
    }

    const orchestrationNotes = [
      `- Planner **CURSOR_RUNTIME**: ${runtimeMode}`,
      "- Executor: Cursor Cloud Agent.create against the PR-linked repo entry (see workflow logs for payload JSON).",
      "- Follow cloudGitNotes for branch versus new PR behavior.",
    ].join("\n");

    const executionPrompt = buildExecutionPrompt({
      repository,
      prNumber,
      prTitle: pullRequest.title,
      baseRef: pullRequest.base.ref,
      headRef: headBranchMeta.branchShortName,
      patchContext,
      advisoryReviewComment,
      securityComment,
      depAssessmentComment,
      sonarContext,
      mergedRemediationBrief,
      deterministicGatesContext,
      plan,
      cloudGitNotes,
      orchestrationNotes,
    });

    const cloudRepoEntry = buildCloudRepoSpec(
      repository,
      pullRequest,
      headBranchMeta.branchShortName,
    );
    appendStepSummary(
      `### Cursor cloud repo payload\n\n\`\`\`json\n${JSON.stringify(cloudRepoEntry, null, 2)}\n\`\`\`\n\nGitHub \`head.ref\`=\`${pullRequest.head.ref}\`, \`head.sha\`=\`${pullRequest.head.sha.slice(0, 7)}…\` (\`CURSOR_CLOUD_OMIT_PR_URL\`=${process.env.CURSOR_CLOUD_OMIT_PR_URL ?? "unset"})\n`
    );

    agent = await Agent.create({
      apiKey,
      model: { id: executionModel },
      cloud: {
        repos: [cloudRepoEntry],
        workOnCurrentBranch: cloudGit.workOnCurrentBranch,
        autoCreatePR: cloudGit.autoCreatePR,
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
