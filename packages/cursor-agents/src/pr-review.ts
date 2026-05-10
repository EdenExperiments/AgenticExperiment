import {
  appendStepSummary,
  GitHubClient,
  isNonFatalCommentPermissionError,
  requireEnv,
  truncate,
  type PullRequestFile,
} from "./github.js";
import { bootstrapCursorSdkRuntime } from "./sdk-bootstrap.js";
import { resolvePromptRuntimeOptions, resolveRuntimeMode } from "./runtime-options.js";

const COMMENT_MARKER = "<!-- cursor-pr-review -->";
const REVIEW_SCHEMA_START = "<!-- cursor-pr-review-schema:v1 -->";
const REVIEW_SCHEMA_END = "<!-- /cursor-pr-review-schema -->";

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

function buildDiffContext(files: PullRequestFile[]): string {
  const changedFiles = files.slice(0, 20).map((file) => {
    const patch = file.patch ? truncate(file.patch, 2000) : "[no textual patch available]";
    return [
      `File: ${file.filename}`,
      `Status: ${file.status}, +${file.additions} -${file.deletions}`,
      "Patch:",
      patch,
    ].join("\n");
  });

  return changedFiles.join("\n\n---\n\n");
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

function tryParseJsonObject(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseReviewSchema(text: string): ReviewSchemaV1 | null {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const markerRegex = new RegExp(
    `${REVIEW_SCHEMA_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*([\\s\\S]*?)\\s*${REVIEW_SCHEMA_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    "i"
  );
  const markerMatch = text.match(markerRegex);
  const jsonCandidate =
    (markerMatch?.[1] ?? "").trim() ||
    (fencedMatch?.[1] ?? "").trim() ||
    text.trim();

  const parsed = tryParseJsonObject(jsonCandidate);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  return parsed as ReviewSchemaV1;
}

function validateReviewSchema(value: ReviewSchemaV1): string[] {
  const errors: string[] = [];
  if (value.schema_version !== "1.0") {
    errors.push("schema_version must be '1.0'");
  }

  const validRisk = new Set<ReviewRisk>(["none", "low", "medium", "high", "critical"]);
  if (!validRisk.has(value.overall_risk)) {
    errors.push("overall_risk must be one of none|low|medium|high|critical");
  }

  if (!Array.isArray(value.findings)) {
    errors.push("findings must be an array");
  }
  if (!Array.isArray(value.missing_tests)) {
    errors.push("missing_tests must be an array");
  }
  if (!Array.isArray(value.next_actions)) {
    errors.push("next_actions must be an array");
  }

  const validSeverity = new Set<ReviewSeverity>(["low", "medium", "high", "critical"]);
  const validConfidence = new Set<ReviewConfidence>(["low", "medium", "high"]);
  (value.findings ?? []).forEach((finding, index) => {
    const context = `findings[${index}]`;
    if (!finding.id || typeof finding.id !== "string") errors.push(`${context}.id missing`);
    if (!validSeverity.has(finding.severity)) errors.push(`${context}.severity invalid`);
    if (!validConfidence.has(finding.confidence)) errors.push(`${context}.confidence invalid`);
    if (!finding.category || typeof finding.category !== "string") {
      errors.push(`${context}.category missing`);
    }
    if (!finding.title || typeof finding.title !== "string") errors.push(`${context}.title missing`);
    if (!finding.summary || typeof finding.summary !== "string") {
      errors.push(`${context}.summary missing`);
    }
    if (!finding.location || typeof finding.location !== "string") {
      errors.push(`${context}.location missing`);
    }
    if (!finding.recommendation || typeof finding.recommendation !== "string") {
      errors.push(`${context}.recommendation missing`);
    }
    if (!finding.test_plan || typeof finding.test_plan !== "string") {
      errors.push(`${context}.test_plan missing`);
    }
  });

  return errors;
}

function renderReviewMarkdown(review: ReviewSchemaV1): string {
  const findingsSection =
    review.findings.length === 0
      ? "- No high-confidence issues detected."
      : review.findings
          .map((finding) =>
            [
              `- [${finding.severity.toUpperCase()}][confidence=${finding.confidence}] ${finding.id} ${finding.title}`,
              `  - Category: ${finding.category}`,
              `  - Location: ${finding.location}`,
              `  - Why it matters: ${finding.summary}`,
              `  - Recommendation: ${finding.recommendation}`,
              `  - Test plan: ${finding.test_plan}`,
            ].join("\n")
          )
          .join("\n");

  const missingTestsSection =
    review.missing_tests.length === 0
      ? "- No additional missing test gaps identified."
      : review.missing_tests.map((item) => `- ${item}`).join("\n");

  const nextActionsSection =
    review.next_actions.length === 0
      ? "- No follow-up actions required."
      : review.next_actions.map((item) => `- ${item}`).join("\n");

  return [
    `Overall risk: **${review.overall_risk.toUpperCase()}**`,
    "",
    "### Prioritized findings",
    findingsSection,
    "",
    "### Missing tests or validation risks",
    missingTestsSection,
    "",
    "### Suggested next actions",
    nextActionsSection,
  ].join("\n");
}

function extractRunDiagnostics(result: unknown): string {
  if (!result || typeof result !== "object") {
    return String(result);
  }

  const candidate = result as Record<string, unknown>;
  const status = typeof candidate.status === "string" ? candidate.status : "unknown";
  const errorMessage =
    typeof candidate.error === "string"
      ? candidate.error
      : typeof candidate.error_message === "string"
        ? candidate.error_message
        : typeof candidate.message === "string"
          ? candidate.message
          : "no explicit error message";

  return `status=${status}; message=${errorMessage}; raw=${JSON.stringify(result).slice(0, 2000)}`;
}

async function requestReviewWithFallback(
  prompt: string,
  apiKey: string,
  runtimeOptions: Record<string, unknown>
): Promise<{ review: ReviewSchemaV1; modelUsed: string; rawStatus: string }> {
  const { Agent, CursorAgentError } = await import("@cursor/sdk");
  const envModels = (process.env.CURSOR_REVIEW_MODELS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const fallbackModels = ["composer-2", "gpt-5.4-mini"];
  const models = [...new Set([...envModels, ...fallbackModels])];
  const attemptDiagnostics: string[] = [];

  for (const modelId of models) {
    let result: unknown;
    try {
      result = await Agent.prompt(prompt, {
        apiKey,
        model: { id: modelId },
        ...runtimeOptions,
      } as any);
    } catch (error) {
      if (
        error instanceof CursorAgentError &&
        /Cannot use this model/i.test(error.message)
      ) {
        attemptDiagnostics.push(`[${modelId}] unavailable model: ${error.message}`);
        continue;
      }
      throw error;
    }

    const status = (result as { status?: string }).status ?? "unknown";
    if (status !== "finished") {
      attemptDiagnostics.push(`[${modelId}] ${extractRunDiagnostics(result)}`);
      continue;
    }

    const reviewText = extractAgentText(result);
    const parsedReview = parseReviewSchema(reviewText);
    if (!parsedReview) {
      attemptDiagnostics.push(`[${modelId}] invalid schema: unable to parse JSON payload`);
      continue;
    }

    const schemaErrors = validateReviewSchema(parsedReview);
    if (schemaErrors.length > 0) {
      attemptDiagnostics.push(`[${modelId}] invalid schema: ${schemaErrors.join("; ")}`);
      continue;
    }

    return { review: parsedReview, modelUsed: modelId, rawStatus: status };
  }

  throw new Error(
    `Cursor PR review failed across models. ${attemptDiagnostics.join(" || ")}`
  );
}

async function main(): Promise<void> {
  bootstrapCursorSdkRuntime();

  const apiKey = requireEnv("CURSOR_API_KEY");
  const githubToken = requireEnv("GITHUB_TOKEN");
  const repository = requireEnv("GITHUB_REPOSITORY");
  const prNumber = Number(requireEnv("PR_NUMBER"));

  const github = new GitHubClient({ token: githubToken, repository });
  const runtimeMode = resolveRuntimeMode();
  const runtimeOptions = resolvePromptRuntimeOptions();
  console.log(`Starting Cursor PR review for ${repository}#${prNumber}`);
  const pullRequest = await github.getPullRequest(prNumber);
  const files = await github.getPullRequestFiles(prNumber);
  const diffContext = buildDiffContext(files);

  const prompt = `
You are reviewing pull request #${pullRequest.number} in ${repository}.

Title: ${pullRequest.title}
Author: ${pullRequest.user.login}
Base: ${pullRequest.base.ref}
Head: ${pullRequest.head.ref}

PR Body:
${pullRequest.body ?? "(empty)"}

Changed files count: ${files.length}
Changed files and partial patches:
${diffContext}

Return ONLY valid JSON matching this exact schema:
{
  "schema_version": "1.0",
  "overall_risk": "none|low|medium|high|critical",
  "findings": [
    {
      "id": "R-001",
      "severity": "low|medium|high|critical",
      "confidence": "low|medium|high",
      "category": "security|correctness|regression|performance|maintainability|testing|other",
      "title": "short issue title",
      "summary": "why this matters",
      "location": "file path or component scope",
      "recommendation": "specific fix guidance",
      "test_plan": "specific test or validation needed"
    }
  ],
  "missing_tests": ["..."],
  "next_actions": ["..."]
}

Constraints:
- Sort findings by severity descending then confidence descending.
- Use stable IDs R-001, R-002, ...
- If no actionable issues, return findings as [] and overall_risk as "none".
- Do not return markdown, commentary, or code fences.
`;

  const { CursorAgentError } = await import("@cursor/sdk");

  try {
    const { review, modelUsed, rawStatus } = await requestReviewWithFallback(
      prompt,
      apiKey,
      runtimeOptions
    );
    console.log(
      `Cursor PR review completed with runtime=${runtimeMode}, model=${modelUsed}, status=${rawStatus}`
    );
    const markdownReview = renderReviewMarkdown(review);
    const body = `${COMMENT_MARKER}
## Cursor PR Review

${markdownReview}

### Structured review payload
${REVIEW_SCHEMA_START}
\`\`\`json
${JSON.stringify(review, null, 2)}
\`\`\`
${REVIEW_SCHEMA_END}

**Auto-fix:** label the PR with \`cursor:auto-fix\` (or your configured allow label). Prefer a **new line** with \`/cursor-fix\` (GitHub often **drops HTML comments** from quoted review text). You can also **reply in thread** under this comment (nested replies supported).

_Generated by Cursor SDK workflow (cursor-pr-review.yml)._`;

    try {
      await github.upsertIssueComment(prNumber, COMMENT_MARKER, body);
      console.log(`Posted or updated Cursor PR review comment on #${prNumber}`);
    } catch (error) {
      if (!isNonFatalCommentPermissionError(error)) {
        throw error;
      }

      const failureMessage = `Unable to post PR review comment on #${prNumber} due to token permissions (403 Resource not accessible by integration).`;
      console.warn(failureMessage);

      if (process.env.CURSOR_ALLOW_COMMENT_FAILURE !== "true") {
        throw new Error(failureMessage);
      }

      const fallback = `${body}

> Note: ${failureMessage}`;
      appendStepSummary(fallback);
      return;
    }

    appendStepSummary(body);
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(
        `Cursor agent startup failed (retryable=${error.isRetryable}): ${error.message}`
      );
    }
    throw error;
  }
}

void main();
