import {
  appendStepSummary,
  GitHubClient,
  isNonFatalCommentPermissionError,
  requireEnv,
  truncate,
} from "./github.js";
import { bootstrapCursorSdkRuntime } from "./sdk-bootstrap.js";

const REVIEW_MARKER = "<!-- cursor-pr-review -->";
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

function resolveCloudRepoUrl(repository: string): string {
  if (process.env.CURSOR_CLOUD_REPO_URL) {
    return process.env.CURSOR_CLOUD_REPO_URL;
  }
  return `https://github.com/${repository}.git`;
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

function extractRunDiagnostics(result: unknown): string {
  if (!result || typeof result !== "object") {
    return String(result);
  }

  const candidate = result as Record<string, unknown>;
  const status = typeof candidate.status === "string" ? candidate.status : "unknown";
  const message =
    typeof candidate.error === "string"
      ? candidate.error
      : typeof candidate.message === "string"
        ? candidate.message
        : "no explicit message";

  return `status=${status}; message=${message}; raw=${JSON.stringify(result).slice(0, 2000)}`;
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

async function findLatestReviewComment(github: GitHubClient, prNumber: number): Promise<string> {
  const comments = await github.listIssueComments(prNumber);
  const latest = [...comments].reverse().find((comment) => comment.body.includes(REVIEW_MARKER));

  if (!latest) {
    throw new Error(
      `No Cursor PR review comment found on PR #${prNumber}. Expected marker ${REVIEW_MARKER}.`
    );
  }

  return truncate(latest.body, 12000);
}

function buildFixPrompt(input: {
  repository: string;
  prNumber: number;
  prTitle: string;
  baseRef: string;
  headRef: string;
  reviewComment: string;
  sonarContext: string;
}): string {
  return `
You are preparing an automated fix attempt for pull request #${input.prNumber} in ${input.repository}.

PR title: ${input.prTitle}
Base branch: ${input.baseRef}
Head branch: ${input.headRef}

Cursor PR review comment:
${input.reviewComment}

SonarCloud context:
${input.sonarContext}

Task requirements:
1) Focus on the highest-signal, low-to-medium risk issue(s) from the review and Sonar context.
2) Keep changes minimal and scoped to the reported problems only.
3) Preserve existing behavior except where directly fixing the reported issues.
4) Run targeted verification commands relevant to the edited files.
5) If no safe fix is possible, explain why in the final summary and make no speculative changes.

Output expectations:
- Apply code/documentation changes in this repository.
- Provide a concise summary of what was fixed and what remains.
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
  const modelId = process.env.CURSOR_FIX_MODEL ?? "composer-2";
  const excludedAuthors = parseCsv(process.env.CURSOR_AUTO_FIX_EXCLUDED_AUTHORS ?? "cursor[bot]");
  const fixAttemptPrLabels = parseCsv(
    process.env.CURSOR_AGENT_PR_LABELS ?? "cursor:agent-generated"
  );

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

  const reviewComment = await findLatestReviewComment(github, prNumber);
  const sonarContext = await buildSonarContext(prNumber);
  const prompt = buildFixPrompt({
    repository,
    prNumber,
    prTitle: pullRequest.title,
    baseRef: pullRequest.base.ref,
    headRef: pullRequest.head.ref,
    reviewComment,
    sonarContext,
  });

  let agent: { [Symbol.asyncDispose](): Promise<void> } | null = null;

  try {
    agent = await Agent.create({
      apiKey,
      model: { id: modelId },
      cloud: {
        repos: [
          {
            url: resolveCloudRepoUrl(repository),
            startingRef: pullRequest.head.sha,
          },
        ],
        autoCreatePR: true,
        skipReviewerRequest: process.env.CURSOR_CLOUD_SKIP_REVIEWER_REQUEST !== "false",
      },
    } as any);

    const run = await (agent as any).send(prompt);
    const runId = typeof run?.id === "string" ? run.id : "unknown";
    const result = await run.wait();

    if (result.status !== "finished") {
      throw new Error(`Cursor fix attempt run failed: ${extractRunDiagnostics(result)}`);
    }

    const fixPrUrl = extractAttemptPrUrl(result);
    const summary = extractAgentText(result);
    let labelOutcome = "No follow-up labels applied.";
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
    }
    const body = `${FIX_MARKER}
## Cursor Auto-Fix Attempt

Source PR: #${prNumber}
Run ID: \`${runId}\`
Model: \`${modelId}\`
Required label: \`${requiredLabel}\`

${fixPrUrl ? `Fix attempt PR: ${fixPrUrl}` : "Run finished, but no PR URL was returned by the SDK response."}

Label outcome: ${labelOutcome}

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
