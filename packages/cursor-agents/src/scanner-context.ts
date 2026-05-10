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
    const name = row.name;
    const status = row.status;
    return `- ${name} | status=${status} | conclusion=${conclusion}`;
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
  const base = "https://sonarcloud.io/api/qualitygates/project_status";
  const url = base + "?" + params.toString();
  const basic = Buffer.from(token + ":", "utf8").toString("base64");
  const response = await fetch(url, {
    headers: {
      Authorization: "Basic " + basic,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SonarQualityGateResponse;
}

const NON_SUCCESS_CHECK_CONCLUSIONS = new Set([
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
]);

function matchingRunsForPattern(runs: CheckRunData[], pattern: string): CheckRunData[] {
  return runs.filter((run) => run.name.toLowerCase().includes(pattern));
}

function formatRunningRuns(matching: CheckRunData[]): string {
  return matching
    .filter((run) => run.status !== "completed")
    .map((run) => `${run.name}:${run.status}`)
    .join("; ");
}

function pushCompletedNonSuccessNotes(
  notes: string[],
  runs: CheckRunData[],
  patterns: string[],
  label: "Required" | "Optional"
): void {
  for (const pattern of patterns) {
    const matching = matchingRunsForPattern(runs, pattern);
    for (const run of matching) {
      if (run.status !== "completed" || !run.conclusion) {
        continue;
      }
      if (NON_SUCCESS_CHECK_CONCLUSIONS.has(run.conclusion)) {
        notes.push(
          `${label} check "${run.name}" completed with conclusion=${run.conclusion} (wait treats completion as ready; merge may still be blocked).`
        );
      }
    }
  }
}

type RequiredEval = { ready: boolean };

function evaluateRequiredSubstrings(
  runs: CheckRunData[],
  patterns: string[],
  elapsed: number,
  notes: string[]
): RequiredEval {
  for (const pattern of patterns) {
    const matching = matchingRunsForPattern(runs, pattern);
    if (matching.length === 0) {
      notes.push(`[wait ${elapsed}ms] Required scanner not observed yet: "${pattern}"`);
      return { ready: false };
    }
    const running = formatRunningRuns(matching);
    if (running.length > 0) {
      notes.push(`[wait ${elapsed}ms] "${pattern}" still running: ${running}`);
      return { ready: false };
    }
  }
  return { ready: true };
}

type OptionalEval = { ready: boolean };

function evaluateOptionalSubstrings(
  runs: CheckRunData[],
  patterns: string[],
  elapsed: number,
  optionalGraceMs: number,
  notes: string[]
): OptionalEval {
  for (const pattern of patterns) {
    const matching = matchingRunsForPattern(runs, pattern);
    if (matching.length === 0) {
      if (elapsed < optionalGraceMs) {
        notes.push(
          `[wait ${elapsed}ms] Optional scanner "${pattern}" not observed yet (grace ${optionalGraceMs}ms)`
        );
        return { ready: false };
      }
      continue;
    }
    const running = formatRunningRuns(matching);
    if (running.length > 0) {
      notes.push(`[wait ${elapsed}ms] Optional "${pattern}" still running: ${running}`);
      return { ready: false };
    }
  }
  return { ready: true };
}

type SonarPoll = { continueWaiting: boolean; gateStatus?: string };

async function evaluateSonarApiReadiness(
  options: {
    elapsed: number;
    sonarToken?: string;
    sonarProjectKey?: string;
    prNumber: number;
  },
  notes: string[]
): Promise<SonarPoll> {
  const { elapsed, sonarToken, sonarProjectKey, prNumber } = options;
  if (!sonarToken || !sonarProjectKey) {
    return { continueWaiting: false };
  }

  const gate = await fetchSonarQualityGateJson(sonarProjectKey, String(prNumber), sonarToken);
  const status = gate?.projectStatus?.status;

  if (!gate?.projectStatus || !status) {
    notes.push(
      `[wait ${elapsed}ms] SonarCloud quality gate not ready for PR #${prNumber} (API missing projectStatus.status)`
    );
    return { continueWaiting: true };
  }

  if (status !== "OK") {
    notes.push(
      `[wait ${elapsed}ms] SonarCloud quality gate readable with status=${status} (not OK; deterministic merge gate may still fail).`
    );
  }

  return { continueWaiting: false, gateStatus: status };
}

function sonarReadableSummaryPhrase(
  sonarConfigured: boolean,
  sonarGateStatus: string | undefined
): string {
  if (!sonarConfigured) {
    return "Sonar API not configured for wait (skipped).";
  }
  if (sonarGateStatus) {
    return `Sonar API gate readable (status=${sonarGateStatus}).`;
  }
  return "Sonar API gate readable.";
}

function buildSatisfactionSummary(
  startMs: number,
  sonarConfigured: boolean,
  sonarGateStatus: string | undefined
): string {
  const elapsed = Date.now() - startMs;
  const sonarPart = sonarReadableSummaryPhrase(sonarConfigured, sonarGateStatus);

  return (
    `Scanner wait satisfied after ${elapsed}ms: required and optional GitHub checks reached status=completed ` +
    `(non-success conclusions are noted above; this wait does not require green conclusions). ${sonarPart}`
  );
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
  const sonarConfigured = Boolean(options.sonarToken && options.sonarProjectKey);

  while (Date.now() < deadline) {
    const runs = await options.github.listCheckRunsForCommit(options.headSha);
    const elapsed = Date.now() - start;

    const required = evaluateRequiredSubstrings(
      runs,
      options.requiredSubstrings,
      elapsed,
      notes
    );
    if (!required.ready) {
      await sleep(options.pollIntervalMs);
      continue;
    }

    const optional = evaluateOptionalSubstrings(
      runs,
      options.optionalSubstrings,
      elapsed,
      options.optionalGraceMs,
      notes
    );
    if (!optional.ready) {
      await sleep(options.pollIntervalMs);
      continue;
    }

    pushCompletedNonSuccessNotes(notes, runs, options.requiredSubstrings, "Required");
    pushCompletedNonSuccessNotes(notes, runs, options.optionalSubstrings, "Optional");

    const sonarPoll = await evaluateSonarApiReadiness(
      {
        elapsed,
        sonarToken: options.sonarToken,
        sonarProjectKey: options.sonarProjectKey,
        prNumber: options.prNumber,
      },
      notes
    );

    if (sonarPoll.continueWaiting) {
      await sleep(options.pollIntervalMs);
      continue;
    }

    notes.push(buildSatisfactionSummary(start, sonarConfigured, sonarPoll.gateStatus));
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
