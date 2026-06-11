/**
 * Pillar C (M4) entry point: build the unified maintenance queue and emit the
 * dispatch selection.
 *
 * Intake: SonarCloud issues (filtered severities, with effort) + GitHub Issues
 * labeled `tech-debt`. Output: markdown step summary + `maintenance-queue.json`
 * for the dispatching Cursor Automation (which starts one cloud agent per
 * selected item). This script never opens PRs itself.
 */

import { writeFileSync } from "node:fs";

import { appendStepSummary, GitHubClient, requireEnv } from "./github.js";
import {
  DEFAULT_CONCURRENT_BOT_PR_CAP,
  DEFAULT_TOP_K,
  fromGitHubIssue,
  fromSonarIssue,
  renderQueueMarkdown,
  selectDispatchBatch,
  type QueueItem,
} from "./maintenance-queue.js";
import { writeRunSummary } from "./run-summary.js";

interface SonarIssuesResponse {
  total?: number;
  issues?: Array<{
    key?: string;
    severity?: string;
    message?: string;
    component?: string;
    effort?: string;
    type?: string;
  }>;
}

async function fetchSonarIssues(
  token: string,
  projectKey: string,
  branch: string
): Promise<QueueItem[]> {
  const params = new URLSearchParams({
    componentKeys: projectKey,
    branch,
    statuses: "OPEN,CONFIRMED,REOPENED",
    severities: process.env.CURSOR_QUEUE_SONAR_SEVERITIES ?? "BLOCKER,CRITICAL,MAJOR",
    ps: "50",
  });
  const response = await fetch(`https://sonarcloud.io/api/issues/search?${params.toString()}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`SonarCloud issues/search failed (${response.status})`);
  }
  const data = (await response.json()) as SonarIssuesResponse;
  return (data.issues ?? []).map(fromSonarIssue);
}

function isBotLogin(login: string): boolean {
  const normalized = login.toLowerCase();
  return (
    normalized.includes("dependabot") ||
    normalized.includes("renovate") ||
    normalized.includes("mend-for-github") ||
    normalized.includes("cursor")
  );
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function main(): Promise<void> {
  const githubToken = requireEnv("GITHUB_TOKEN");
  const repository = requireEnv("GITHUB_REPOSITORY");
  const github = new GitHubClient({ token: githubToken, repository });
  const startedAt = new Date();

  try {
    const items: QueueItem[] = [];

    const sonarToken = process.env.SONAR_TOKEN;
    const sonarProjectKey = process.env.SONAR_PROJECT_KEY;
    const branch = (process.env.SONAR_BRANCH ?? "main").trim() || "main";
    if (sonarToken && sonarProjectKey) {
      try {
        items.push(...(await fetchSonarIssues(sonarToken, sonarProjectKey, branch)));
      } catch (error) {
        appendStepSummary(`> Sonar intake unavailable: ${String(error)}`);
      }
    } else {
      appendStepSummary("> Sonar intake skipped (SONAR_TOKEN / SONAR_PROJECT_KEY not set).");
    }

    const techDebtLabel = process.env.CURSOR_QUEUE_ISSUE_LABEL ?? "tech-debt";
    try {
      const issues = await github.listOpenIssuesByLabel(techDebtLabel, 50);
      items.push(
        ...issues.map((issue) =>
          fromGitHubIssue({
            number: issue.number,
            title: issue.title,
            labels: issue.labels,
            body: issue.body,
          })
        )
      );
    } catch (error) {
      appendStepSummary(`> GitHub issue intake unavailable: ${String(error)}`);
    }

    const openPulls = await github.listOpenPullRequests(50);
    const openBotPrCount = openPulls.filter((pr) => isBotLogin(pr.user.login)).length;

    const selection = selectDispatchBatch(items, {
      openBotPrCount,
      concurrentBotPrCap: toPositiveInt(
        process.env.CURSOR_QUEUE_BOT_PR_CAP,
        DEFAULT_CONCURRENT_BOT_PR_CAP
      ),
      topK: toPositiveInt(process.env.CURSOR_QUEUE_TOP_K, DEFAULT_TOP_K),
    });

    const markdown = renderQueueMarkdown(selection);
    appendStepSummary(markdown);

    const outputPath =
      process.env.CURSOR_QUEUE_OUTPUT ??
      `${process.env.GITHUB_WORKSPACE ?? process.cwd()}/maintenance-queue.json`;
    writeFileSync(
      outputPath,
      `${JSON.stringify(
        {
          schema: "cursor-maintenance-queue:v1",
          generatedAt: new Date().toISOString(),
          repository,
          openBotPrCount,
          availableSlots: selection.availableSlots,
          selected: selection.selected,
          deferred: selection.deferred,
          ineligible: selection.ineligible,
        },
        null,
        2
      )}\n`
    );

    writeRunSummary({
      job: "maintenance-queue",
      trigger: process.env.GITHUB_EVENT_NAME ?? "manual",
      startedAt,
      outcome: "success",
      details: {
        intakeCount: items.length,
        openBotPrCount,
        selected: selection.selected.map((item) => item.id),
        availableSlots: selection.availableSlots,
      },
    });

    console.log(
      `Maintenance queue built: ${items.length} intake items, ${selection.selected.length} selected, ${selection.availableSlots} slots.`
    );
  } catch (error) {
    writeRunSummary({
      job: "maintenance-queue",
      trigger: process.env.GITHUB_EVENT_NAME ?? "manual",
      startedAt,
      outcome: "failure",
      details: { error: String(error) },
    });
    throw error;
  }
}

void main();
