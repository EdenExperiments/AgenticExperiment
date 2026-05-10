import {
  appendStepSummary,
  GitHubClient,
  isNonFatalCommentPermissionError,
  requireEnv,
  truncate,
} from "./github.js";
import { bootstrapCursorSdkRuntime } from "./sdk-bootstrap.js";
import { resolvePromptRuntimeOptions } from "./runtime-options.js";

const DIGEST_MARKER = "<!-- cursor-daily-quality-digest -->";

interface SonarIssuesResponse {
  total?: number;
  issues?: Array<{
    severity?: string;
    message?: string;
    component?: string;
    line?: number;
    type?: string;
  }>;
}

interface SonarQualityGateResponse {
  projectStatus?: {
    status?: string;
    conditions?: Array<{ metricKey?: string; status?: string }>;
  };
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

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), 50);
}

function botLogin(login: string): boolean {
  const normalized = login.toLowerCase();
  return (
    normalized.includes("dependabot") ||
    normalized.includes("renovate") ||
    normalized.includes("mend-for-github")
  );
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

async function main(): Promise<void> {
  bootstrapCursorSdkRuntime();
  const { Agent, CursorAgentError } = await import("@cursor/sdk");

  const apiKey = requireEnv("CURSOR_API_KEY");
  const githubToken = requireEnv("GITHUB_TOKEN");
  const repository = requireEnv("GITHUB_REPOSITORY");
  const github = new GitHubClient({ token: githubToken, repository });

  const sonarToken = process.env.SONAR_TOKEN;
  const sonarProjectKey = process.env.SONAR_PROJECT_KEY;
  const branch = (process.env.SONAR_BRANCH ?? "main").trim() || "main";
  const topIssues = toPositiveInt(process.env.CURSOR_DAILY_DIGEST_TOP_ISSUES, 12);
  const digestModel = process.env.CURSOR_DAILY_DIGEST_MODEL ?? "composer-2-fast";

  let sonarSection = "SonarCloud not configured (SONAR_TOKEN / SONAR_PROJECT_KEY missing).";
  if (sonarToken && sonarProjectKey) {
    try {
      const gateParams = new URLSearchParams({ projectKey: sonarProjectKey, branch });
      const gate = await fetchSonarJson<SonarQualityGateResponse>(
        "qualitygates/project_status",
        gateParams,
        sonarToken
      );
      const gateStatus = gate.projectStatus?.status ?? "UNKNOWN";

      const issueParams = new URLSearchParams({
        componentKeys: sonarProjectKey,
        branch,
        statuses: "OPEN,CONFIRMED,REOPENED",
        severities: "BLOCKER,CRITICAL,MAJOR",
        ps: String(topIssues),
      });
      const issues = await fetchSonarJson<SonarIssuesResponse>(
        "issues/search",
        issueParams,
        sonarToken
      );

      const lines = (issues.issues ?? []).map((issue) => {
        const loc =
          issue.component && issue.line !== undefined
            ? `${issue.component}:${issue.line}`
            : issue.component ?? "?";
        return `- [${issue.severity ?? "?"}] ${issue.message ?? ""} (${loc})`;
      });

      sonarSection = [
        `Branch: ${branch}`,
        `Quality gate status: ${gateStatus}`,
        `Open BLOCKER/CRITICAL/MAJOR sample (${lines.length}/${issues.total ?? 0}):`,
        lines.length > 0 ? lines.join("\n") : "- No issues returned for this filter.",
      ].join("\n");
    } catch (error) {
      sonarSection = `SonarCloud branch query failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  const openPulls = await github.listOpenPullRequests(35);
  const botPulls = openPulls.filter((pr) => botLogin(pr.user.login));
  const botPrLines = botPulls.slice(0, 15).map((pr) => {
    return `- #${pr.number} ${pr.title} (@${pr.user.login}, \`${pr.head.ref}\`)`;
  });

  const dependencySection =
    botPrLines.length > 0
      ? ["Open dependency automation PRs (recent):", ...botPrLines].join("\n")
      : "No open dependency-bot PRs detected in the latest page.";

  const prompt = `
You are summarizing daily code-health signals for ${repository}.

## SonarCloud (branch analysis)
${sonarSection}

## Dependency PRs (Renovate/Mend/Dependabot-shaped)
${dependencySection}

Produce markdown with these sections:
1) **Executive summary** (3-6 bullets): overall risk themes and what to tackle first.
2) **Top remediation targets**: ranked list (max ${Math.min(topIssues, 10)} items) mixing Sonar findings and dependency PR risk (security majors first).
3) **Suggested sequencing for a fix PR**: concrete ordering humans/agents can follow; note where Sonar fixes should land vs dependency bumps.
4) **Explicit non-goals**: what not to bundle into one PR.

Rules:
- Do not invent scanner status; only interpret the text above.
- Prefer actionable file/rule hints already present in Sonar lines.
- Keep the entire response under ~9000 characters.
`.trim();

  const runtimeOptions = resolvePromptRuntimeOptions();

  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: digestModel },
      ...runtimeOptions,
    } as any);

    if ((result as { status?: string }).status !== "finished") {
      throw new Error(`Daily digest agent failed: ${extractRunDiagnostics(result)}`);
    }

    const narrative = extractAgentText(result);
    const stamp = new Date().toISOString();
    const body = `${DIGEST_MARKER}
## Daily quality digest (${branch})

_Generated ${stamp} · model \`${digestModel}\`_

${narrative}

---
Raw Sonar excerpt:

\`\`\`text
${truncate(sonarSection, 4000)}
\`\`\`

---
Dependency PR excerpt:

\`\`\`text
${truncate(dependencySection, 2500)}
\`\`\`

_Workflow: cursor-daily-quality-digest.yml · marker ${DIGEST_MARKER}_
`;

    appendStepSummary(body);

    const issueRaw = process.env.CURSOR_DAILY_DIGEST_ISSUE_NUMBER?.trim();
    if (issueRaw) {
      const issueNumber = Number(issueRaw);
      if (!Number.isFinite(issueNumber) || issueNumber <= 0) {
        throw new Error(`Invalid CURSOR_DAILY_DIGEST_ISSUE_NUMBER: ${issueRaw}`);
      }
      try {
        await github.upsertIssueComment(issueNumber, DIGEST_MARKER, body);
      } catch (error) {
        if (!isNonFatalCommentPermissionError(error)) {
          throw error;
        }
        appendStepSummary(
          `> Note: unable to upsert digest comment on issue #${issueNumber} (403 integration scope).`
        );
      }
    }
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(
        `Daily digest agent startup failed (retryable=${error.isRetryable}): ${error.message}`
      );
    }
    throw error;
  }
}

void main();
