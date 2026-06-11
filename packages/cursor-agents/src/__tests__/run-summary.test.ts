import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRunSummary } from "../run-summary.js";
import { classifySurface } from "../surface-classification.js";

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
