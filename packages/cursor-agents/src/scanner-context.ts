import type { GitHubClient, CheckRunData } from "./github.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseCsvLower(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return [...new Set(value.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean))];
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export function buildCheckRunsMarkdown(rows: CheckRunData[], limit = 40): string {
  if (rows.length === 0) {
    return "No GitHub check runs returned for this commit.";
  }

  const lines = rows.slice(0, limit).map((row) => {
    const conclusion = row.conclusion ?? "pending";
    return `- ${row.name} | status=${row.status} | conclusion=${conclusion}`;
  });

  return ["GitHub Actions check runs (head commit):", ...lines].join("\n");
}

interface SonarQualityGateResponse {
  projectStatus?: {
    status?: string;
  };
}

async function fetchSonarQualityGateJson(
  projectKey: string,
  pullRequest: string,
  token: string
): Promise<SonarQualityGateResponse | null> {
  const params = new URLSearchParams({ projectKey, pullRequest });
  const response = await fetch(`https://sonarcloud.io/api/qualitygates/project_status?${params}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SonarQualityGateResponse;
}

/**
 * Wait until required GitHub check runs complete. Optional patterns stop blocking after a grace period if no run appears.
 */
export async function waitForScannerReadiness(options: {
  github: GitHubClient;
  headSha: string;
  pollIntervalMs: number;
  timeoutMs: number;
  optionalGraceMs: number;
  requiredSubstrings: string[];
  optionalSubstrings: string[];
  sonarToken?: string;
  sonarProjectKey?: string;
  prNumber: number;
}): Promise<{ notes: string[]; timedOut: boolean }> {
  const notes: string[] = [];
  const start = Date.now();
  const deadline = start + options.timeoutMs;
  let timedOut = false;

  while (Date.now() < deadline) {
    const runs = await options.github.listCheckRunsForCommit(options.headSha);
    const elapsed = Date.now() - start;

    let ready = true;

    for (const pattern of options.requiredSubstrings) {
      const matching = runs.filter((run) => run.name.toLowerCase().includes(pattern));
      if (matching.length === 0) {
        notes.push(`[wait ${elapsed}ms] Required scanner not observed yet: "${pattern}"`);
        ready = false;
        break;
      }
      if (matching.some((run) => run.status !== "completed")) {
        notes.push(
          `[wait ${elapsed}ms] "${pattern}" still running: ${matching
            .filter((run) => run.status !== "completed")
            .map((run) => `${run.name}:${run.status}`)
            .join("; ")}`
        );
        ready = false;
        break;
      }
    }

    if (!ready) {
      await sleep(options.pollIntervalMs);
      continue;
    }

    for (const pattern of options.optionalSubstrings) {
      const matching = runs.filter((run) => run.name.toLowerCase().includes(pattern));
      if (matching.length === 0) {
        if (elapsed < options.optionalGraceMs) {
          notes.push(
            `[wait ${elapsed}ms] Optional scanner "${pattern}" not observed yet (grace ${options.optionalGraceMs}ms)`
          );
          ready = false;
        }
        continue;
      }
      if (matching.some((run) => run.status !== "completed")) {
        notes.push(
          `[wait ${elapsed}ms] Optional "${pattern}" still running: ${matching
            .filter((run) => run.status !== "completed")
            .map((run) => `${run.name}:${run.status}`)
            .join("; ")}`
        );
        ready = false;
        break;
      }
    }

    if (!ready) {
      await sleep(options.pollIntervalMs);
      continue;
    }

    if (options.sonarToken && options.sonarProjectKey) {
      const gate = await fetchSonarQualityGateJson(
        options.sonarProjectKey,
        String(options.prNumber),
        options.sonarToken
      );
      const status = gate?.projectStatus?.status;
      if (!gate?.projectStatus || !status) {
        notes.push(
          `[wait ${elapsed}ms] SonarCloud quality gate not ready for PR #${options.prNumber} (API missing projectStatus.status)`
        );
        await sleep(options.pollIntervalMs);
        continue;
      }
    }

    notes.push(
      `Scanner wait satisfied after ${Date.now() - start}ms (required+optional checks complete; Sonar API gate readable).`
    );
    return { notes, timedOut: false };
  }

  timedOut = true;
  notes.push(
    `Scanner wait timed out after ${options.timeoutMs}ms; continuing with best-effort context (may be incomplete).`
  );
  return { notes, timedOut };
}

export function resolveScannerWaitOptionsFromEnv(): {
  enabled: boolean;
  pollIntervalMs: number;
  timeoutMs: number;
  optionalGraceMs: number;
  requiredSubstrings: string[];
  optionalSubstrings: string[];
} {
  const enabled = process.env.CURSOR_AUTO_FIX_WAIT_SCANNERS !== "false";
  const pollIntervalMs = toNumber(process.env.CURSOR_AUTO_FIX_POLL_INTERVAL_MS, 20_000);
  const timeoutMs = toNumber(process.env.CURSOR_AUTO_FIX_WAIT_TIMEOUT_MS, 900_000);
  const optionalGraceMs = toNumber(process.env.CURSOR_AUTO_FIX_OPTIONAL_SCAN_GRACE_MS, 180_000);

  const requiredRaw =
    process.env.CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS ||
    process.env.CURSOR_AUTO_FIX_BLOCKING_CHECK_SUBSTRINGS ||
    "SonarCloud";
  const optionalRaw =
    process.env.CURSOR_AUTO_FIX_OPTIONAL_CHECK_SUBSTRINGS || "CodeQL,code scanning";

  return {
    enabled,
    pollIntervalMs,
    timeoutMs,
    optionalGraceMs,
    requiredSubstrings: parseCsvLower(requiredRaw),
    optionalSubstrings: parseCsvLower(optionalRaw),
  };
}
