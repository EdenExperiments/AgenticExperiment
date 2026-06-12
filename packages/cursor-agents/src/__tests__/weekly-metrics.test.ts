import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildWeeklyMetricsJson,
  emptyStats,
  WEEKLY_METRICS_WINDOW_DAYS,
  type Surface,
} from "../weekly-metrics.js";

function statsMap(
  overrides: Partial<Record<Surface, ReturnType<typeof emptyStats>>> = {}
): Map<Surface, ReturnType<typeof emptyStats>> {
  return new Map<Surface, ReturnType<typeof emptyStats>>([
    ["human", { ...emptyStats(), ...overrides.human }],
    ["cursor-agent", { ...emptyStats(), ...overrides["cursor-agent"] }],
    ["dependency-bot", { ...emptyStats(), ...overrides["dependency-bot"] }],
  ]);
}

test("buildWeeklyMetricsJson emits cursor-weekly-metrics:v1 shape", () => {
  const metrics = buildWeeklyMetricsJson({
    statsBySurface: statsMap({
      human: { opened: 4, merged: 3, closedUnmerged: 1, totalCycleTimeMs: 9_000_000 },
      "cursor-agent": { opened: 2, merged: 1, closedUnmerged: 1, totalCycleTimeMs: 1_200_000 },
      "dependency-bot": { opened: 0, merged: 0, closedUnmerged: 0, totalCycleTimeMs: 0 },
    }),
    openDependencyPrs: 3,
    sonarOpenIssues: 42,
  });

  assert.equal(metrics.schema, "cursor-weekly-metrics:v1");
  assert.equal(metrics.windowDays, WEEKLY_METRICS_WINDOW_DAYS);
  assert.equal(metrics.openDependencyPrs, 3);
  assert.equal(metrics.sonarOpenIssues, 42);

  assert.deepEqual(metrics.bySurface.human, {
    opened: 4,
    merged: 3,
    closedUnmerged: 1,
    mergeRate: 0.75,
    avgCycleTimeMs: 3_000_000,
  });
  assert.deepEqual(metrics.bySurface["cursor-agent"], {
    opened: 2,
    merged: 1,
    closedUnmerged: 1,
    mergeRate: 0.5,
    avgCycleTimeMs: 1_200_000,
  });
  assert.deepEqual(metrics.bySurface["dependency-bot"], {
    opened: 0,
    merged: 0,
    closedUnmerged: 0,
    mergeRate: null,
    avgCycleTimeMs: null,
  });
});

test("buildWeeklyMetricsJson allows null sonarOpenIssues when unconfigured", () => {
  const metrics = buildWeeklyMetricsJson({
    statsBySurface: statsMap(),
    openDependencyPrs: 0,
    sonarOpenIssues: null,
  });

  assert.equal(metrics.sonarOpenIssues, null);
  assert.equal(metrics.openDependencyPrs, 0);
});
