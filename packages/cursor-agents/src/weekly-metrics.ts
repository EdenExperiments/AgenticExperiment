/**
 * M6 telemetry: weekly outcome metrics over vibes (brief §7).
 *
 * Deterministic aggregation (no model call): PR throughput by surface
 * (human / cursor agent / dependency bot), merge rates, cycle time, Sonar issue
 * count, dependency freshness proxy (open dep PRs + their age). Output goes to
 * the Actions step summary and is upserted onto the metrics dashboard issue when
 * `CURSOR_METRICS_ISSUE_NUMBER` is set.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { appendStepSummary, GitHubClient, isNonFatalCommentPermissionError, requireEnv } from "./github.js";
import { writeRunSummary } from "./run-summary.js";
import { classifySurface, type Surface } from "./surface-classification.js";

const METRICS_MARKER = "<!-- cursor-weekly-metrics -->";
export const WEEKLY_METRICS_WINDOW_DAYS = 7;
const WEEK_MS = WEEKLY_METRICS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface SurfaceStats {
  opened: number;
  merged: number;
  closedUnmerged: number;
  totalCycleTimeMs: number;
}

export interface WeeklyMetricsSurfaceEntry {
  opened: number;
  merged: number;
  closedUnmerged: number;
  mergeRate: number | null;
  avgCycleTimeMs: number | null;
}

export interface WeeklyMetricsJson {
  schema: "cursor-weekly-metrics:v1";
  windowDays: typeof WEEKLY_METRICS_WINDOW_DAYS;
  bySurface: Record<Surface, WeeklyMetricsSurfaceEntry>;
  openDependencyPrs: number;
  sonarOpenIssues: number | null;
}

export function emptyStats(): SurfaceStats {
  return { opened: 0, merged: 0, closedUnmerged: 0, totalCycleTimeMs: 0 };
}

export function buildWeeklyMetricsJson(input: {
  statsBySurface: Map<Surface, SurfaceStats>;
  openDependencyPrs: number;
  sonarOpenIssues: number | null;
}): WeeklyMetricsJson {
  const bySurface = {} as Record<Surface, WeeklyMetricsSurfaceEntry>;
  for (const [surface, stats] of input.statsBySurface) {
    bySurface[surface] = {
      opened: stats.opened,
      merged: stats.merged,
      closedUnmerged: stats.closedUnmerged,
      mergeRate: stats.opened === 0 ? null : stats.merged / stats.opened,
      avgCycleTimeMs: stats.merged === 0 ? null : Math.round(stats.totalCycleTimeMs / stats.merged),
    };
  }
  return {
    schema: "cursor-weekly-metrics:v1",
    windowDays: WEEKLY_METRICS_WINDOW_DAYS,
    bySurface,
    openDependencyPrs: input.openDependencyPrs,
    sonarOpenIssues: input.sonarOpenIssues,
  };
}

export function writeWeeklyMetricsJson(
  metrics: WeeklyMetricsJson,
  outputPath = `${process.env.GITHUB_WORKSPACE ?? process.cwd()}/weekly-metrics.json`
): void {
  writeFileSync(outputPath, `${JSON.stringify(metrics, null, 2)}\n`);
}

function formatHours(ms: number): string {
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

async function fetchSonarIssueCount(
  token: string,
  projectKey: string,
  branch: string
): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      componentKeys: projectKey,
      branch,
      statuses: "OPEN,CONFIRMED,REOPENED",
      ps: "1",
    });
    const response = await fetch(
      `https://sonarcloud.io/api/issues/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`,
          Accept: "application/json",
        },
      }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { total?: number };
    return data.total ?? null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const githubToken = requireEnv("GITHUB_TOKEN");
  const repository = requireEnv("GITHUB_REPOSITORY");
  const github = new GitHubClient({ token: githubToken, repository });
  const startedAt = new Date();
  const cutoff = Date.now() - WEEK_MS;

  try {
    const closed = await github.listRecentClosedPullRequests(80);
    const recentClosed = closed.filter(
      (pr) => new Date(pr.closed_at ?? pr.created_at).getTime() >= cutoff
    );

    const statsBySurface = new Map<Surface, SurfaceStats>([
      ["human", emptyStats()],
      ["cursor-agent", emptyStats()],
      ["dependency-bot", emptyStats()],
    ]);

    for (const pr of recentClosed) {
      const surface = classifySurface(pr.user.login, pr.head.ref);
      const stats = statsBySurface.get(surface)!;
      stats.opened += 1;
      if (pr.merged_at) {
        stats.merged += 1;
        stats.totalCycleTimeMs +=
          new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime();
      } else {
        stats.closedUnmerged += 1;
      }
    }

    const open = await github.listOpenPullRequests(50);
    const openDepPrs = open.filter(
      (pr) => classifySurface(pr.user.login, pr.head.ref) === "dependency-bot"
    );

    let sonarOpenIssues: number | null = null;
    let sonarLine = "Sonar issue count: not configured.";
    const sonarToken = process.env.SONAR_TOKEN;
    const sonarProjectKey = process.env.SONAR_PROJECT_KEY;
    if (sonarToken && sonarProjectKey) {
      sonarOpenIssues = await fetchSonarIssueCount(
        sonarToken,
        sonarProjectKey,
        (process.env.SONAR_BRANCH ?? "main").trim() || "main"
      );
      sonarLine =
        sonarOpenIssues === null
          ? "Sonar issue count: query failed."
          : `Sonar open issue count (burn-down datum): **${sonarOpenIssues}**`;
    }

    writeWeeklyMetricsJson(
      buildWeeklyMetricsJson({
        statsBySurface,
        openDependencyPrs: openDepPrs.length,
        sonarOpenIssues,
      })
    );

    const rows = [...statsBySurface.entries()].map(([surface, stats]) => {
      const mergeRate = stats.opened === 0 ? "—" : `${Math.round((stats.merged / stats.opened) * 100)}%`;
      const avgCycle = stats.merged === 0 ? "—" : formatHours(stats.totalCycleTimeMs / stats.merged);
      return `| ${surface} | ${stats.opened} | ${stats.merged} | ${stats.closedUnmerged} | ${mergeRate} | ${avgCycle} |`;
    });

    const body = `${METRICS_MARKER}
## Weekly agentic pipeline metrics

_Generated ${new Date().toISOString()} · window: last 7 days_

### PR throughput by surface

| Surface | Closed PRs | Merged | Closed unmerged | Merge rate | Avg cycle time |
|---|---|---|---|---|---|
${rows.join("\n")}

### Maintenance signals

- Open dependency-bot PRs: **${openDepPrs.length}** (cap guidance: 3-5)
- ${sonarLine}

> Surfaces: dependency-bot = Renovate/Dependabot/Mend; cursor-agent = cursor logins or \`cursor/\` branches; human = everything else.

_Workflow: cursor-weekly-metrics.yml · marker ${METRICS_MARKER}_
`;

    appendStepSummary(body);

    const issueRaw = process.env.CURSOR_METRICS_ISSUE_NUMBER?.trim();
    if (issueRaw) {
      const issueNumber = Number(issueRaw);
      if (!Number.isFinite(issueNumber) || issueNumber <= 0) {
        throw new Error(`Invalid CURSOR_METRICS_ISSUE_NUMBER: ${issueRaw}`);
      }
      try {
        await github.upsertIssueComment(issueNumber, METRICS_MARKER, body);
      } catch (error) {
        if (!isNonFatalCommentPermissionError(error)) throw error;
        appendStepSummary(
          `> Note: unable to upsert metrics comment on issue #${issueNumber} (403 integration scope).`
        );
      }
    }

    writeRunSummary({
      job: "weekly-metrics",
      trigger: process.env.GITHUB_EVENT_NAME ?? "manual",
      startedAt,
      outcome: "success",
      details: {
        closedPrsInWindow: recentClosed.length,
        openDependencyPrs: openDepPrs.length,
      },
    });
    console.log(`Weekly metrics aggregated over ${recentClosed.length} closed PRs.`);
  } catch (error) {
    writeRunSummary({
      job: "weekly-metrics",
      trigger: process.env.GITHUB_EVENT_NAME ?? "manual",
      startedAt,
      outcome: "failure",
      details: { error: String(error) },
    });
    throw error;
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  void main();
}
