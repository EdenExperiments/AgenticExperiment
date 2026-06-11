/**
 * M6 telemetry: every agent job emits a structured JSON run summary.
 *
 * Summaries are written to `cursor-agent-run-summaries/<job>-<timestamp>.json` (the
 * workflow uploads the directory as an artifact) so the weekly metrics aggregation
 * can compute per-surface outcome metrics (brief §4, §7).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface RunSummaryInput {
  job: string;
  trigger: string;
  runtime?: string;
  startedAt: Date;
  outcome: "success" | "failure" | "skipped";
  details?: Record<string, unknown>;
}

export interface RunSummary extends Omit<RunSummaryInput, "startedAt"> {
  schema: "cursor-agent-run-summary:v1";
  repository: string | undefined;
  runId: string | undefined;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export function buildRunSummary(input: RunSummaryInput, now: Date = new Date()): RunSummary {
  return {
    schema: "cursor-agent-run-summary:v1",
    job: input.job,
    trigger: input.trigger,
    runtime: input.runtime,
    repository: process.env.GITHUB_REPOSITORY,
    runId: process.env.GITHUB_RUN_ID,
    startedAt: input.startedAt.toISOString(),
    finishedAt: now.toISOString(),
    durationMs: now.getTime() - input.startedAt.getTime(),
    outcome: input.outcome,
    details: input.details ?? {},
  };
}

export function writeRunSummary(input: RunSummaryInput): RunSummary | undefined {
  const summary = buildRunSummary(input);
  try {
    const dir = process.env.CURSOR_RUN_SUMMARY_DIR ?? "cursor-agent-run-summaries";
    mkdirSync(dir, { recursive: true });
    const filename = `${input.job}-${summary.startedAt.replace(/[:.]/g, "-")}.json`;
    writeFileSync(path.join(dir, filename), `${JSON.stringify(summary, null, 2)}\n`);
    return summary;
  } catch (error) {
    // Telemetry must never fail the job it is observing.
    console.error(`run-summary write failed (non-fatal): ${String(error)}`);
    return undefined;
  }
}
