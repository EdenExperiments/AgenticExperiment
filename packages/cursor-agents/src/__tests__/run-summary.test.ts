import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { buildRunSummary } from "../run-summary.js";
import { classifySurface } from "../surface-classification.js";

const SRC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const AGENT_JOB_SOURCES: Array<{ file: string; jobId: string }> = [
  { file: "maintenance-queue-run.ts", jobId: "maintenance-queue" },
  { file: "dep-assessment.ts", jobId: "dep-assessment" },
  { file: "weekly-metrics.ts", jobId: "weekly-metrics" },
  { file: "daily-quality-digest.ts", jobId: "daily-quality-digest" },
  { file: "security-triage.ts", jobId: "security-triage" },
  { file: "fix-attempt.ts", jobId: "fix-attempt" },
];

function readJobSource(file: string): string {
  return readFileSync(path.join(SRC_DIR, file), "utf8");
}

function assertJobEmitsRunSummary(file: string, jobId: string): void {
  const source = readJobSource(file);
  assert.match(source, /writeRunSummary\s*\(/, `${file} must call writeRunSummary`);
  assert.match(
    source,
    new RegExp(`writeRunSummary\\(\\{[\\s\\S]*?job:\\s*["']${jobId}["']`),
    `${file} must pass job id "${jobId}"`
  );
  assert.match(
    source,
    /outcome:\s*["']success["']/,
    `${file} must emit a success summary`
  );
  assert.match(
    source,
    /outcome:\s*["']failure["']/,
    `${file} must emit a failure summary`
  );
}

test("buildRunSummary produces the v1 schema with duration", () => {
  const startedAt = new Date("2026-06-11T10:00:00.000Z");
  const now = new Date("2026-06-11T10:00:30.000Z");
  const summary = buildRunSummary(
    {
      job: "dep-assessment",
      trigger: "pr#7",
      runtime: "local",
      startedAt,
      outcome: "success",
      details: { classification: "safe" },
    },
    now
  );
  assert.equal(summary.schema, "cursor-agent-run-summary:v1");
  assert.equal(summary.job, "dep-assessment");
  assert.equal(summary.durationMs, 30000);
  assert.equal(summary.startedAt, "2026-06-11T10:00:00.000Z");
  assert.equal(summary.outcome, "success");
  assert.deepEqual(summary.details, { classification: "safe" });
});

test("buildRunSummary defaults details to an empty object", () => {
  const summary = buildRunSummary({
    job: "weekly-metrics",
    trigger: "schedule",
    startedAt: new Date(),
    outcome: "failure",
  });
  assert.deepEqual(summary.details, {});
});

test("classifySurface attributes PRs to surfaces", () => {
  assert.equal(classifySurface("renovate[bot]", "renovate/react-19.x"), "dependency-bot");
  assert.equal(classifySurface("dependabot[bot]", "dependabot/npm/x"), "dependency-bot");
  assert.equal(classifySurface("cursor[bot]", "feature/x"), "cursor-agent");
  assert.equal(classifySurface("macaulay", "cursor/agentic-pipeline-6c99"), "cursor-agent");
  assert.equal(classifySurface("macaulay", "feature/avatars"), "human");
});

for (const { file, jobId } of AGENT_JOB_SOURCES) {
  test(`${jobId} entry script emits success and failure run summaries`, () => {
    assertJobEmitsRunSummary(file, jobId);
  });
}

test("daily-quality-digest success summary includes digest telemetry details", () => {
  const summary = buildRunSummary({
    job: "daily-quality-digest",
    trigger: "schedule",
    runtime: "cloud",
    startedAt: new Date("2026-06-12T06:00:00.000Z"),
    outcome: "success",
    details: {
      model: "claude-sonnet",
      sonarIssueCount: 12,
      dependencyPrCount: 3,
    },
  });
  assert.equal(summary.job, "daily-quality-digest");
  assert.equal(summary.runtime, "cloud");
  assert.equal(summary.details.model, "claude-sonnet");
  assert.equal(summary.details.sonarIssueCount, 12);
});

test("security-triage success summary includes triage context details", () => {
  const summary = buildRunSummary({
    job: "security-triage",
    trigger: "pr#99",
    runtime: "local",
    startedAt: new Date("2026-06-12T07:00:00.000Z"),
    outcome: "success",
    details: {
      prNumber: 99,
      dependabotAlertCount: 2,
      codeScanningAlertCount: 1,
    },
  });
  assert.equal(summary.job, "security-triage");
  assert.equal(summary.details.prNumber, 99);
});

test("fix-attempt success summary includes remediation details", () => {
  const summary = buildRunSummary({
    job: "fix-attempt",
    trigger: "pr#42",
    runtime: "cloud",
    startedAt: new Date("2026-06-12T08:00:00.000Z"),
    outcome: "success",
    details: {
      prNumber: 42,
      plannerModel: "claude-sonnet",
      executionModel: "claude-sonnet",
      fixPrUrl: "https://github.com/org/repo/pull/43",
    },
  });
  assert.equal(summary.job, "fix-attempt");
  assert.equal(summary.details.plannerModel, "claude-sonnet");
  assert.ok(summary.details.fixPrUrl);
});

test("fix-attempt failure summary captures error details", () => {
  const summary = buildRunSummary({
    job: "fix-attempt",
    trigger: "pr#42",
    startedAt: new Date(),
    outcome: "failure",
    details: { error: "Scanner wait timed out" },
  });
  assert.equal(summary.outcome, "failure");
  assert.equal(summary.details.error, "Scanner wait timed out");
});
