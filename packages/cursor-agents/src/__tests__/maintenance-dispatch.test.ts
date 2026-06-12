import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assignDispatchLane,
  buildMaintenanceDispatch,
  resolveQueueInputPath,
  type MaintenanceQueueDocument,
} from "../maintenance-dispatch.js";
import type { ScoredQueueItem } from "../maintenance-queue.js";

function scoredItem(overrides: Partial<ScoredQueueItem>): ScoredQueueItem {
  return {
    source: "sonar",
    id: "SONAR-1",
    description: "Remove unused import",
    files: ["apps/api/internal/foo.go"],
    estEffortMinutes: 15,
    risk: "low",
    severity: "major",
    securityRelevant: false,
    confidence: 0.95,
    impact: 0.7,
    score: 0.665,
    eligible: true,
    ineligibleReasons: [],
    ...overrides,
  };
}

function fixtureQueue(
  overrides: Partial<MaintenanceQueueDocument> & {
    selected?: ScoredQueueItem[];
    deferred?: ScoredQueueItem[];
    ineligible?: ScoredQueueItem[];
  } = {}
): MaintenanceQueueDocument {
  const selected = overrides.selected ?? [scoredItem({})];
  return {
    schema: "cursor-maintenance-queue:v1",
    generatedAt: "2026-06-12T08:00:00.000Z",
    repository: "org/repo",
    openBotPrCount: 0,
    availableSlots: 2,
    selected,
    deferred: overrides.deferred ?? [],
    ineligible: overrides.ineligible ?? [],
    ...overrides,
  };
}

test("resolveQueueInputPath defaults to ./maintenance-queue.json", () => {
  assert.equal(resolveQueueInputPath({}), "./maintenance-queue.json");
});

test("resolveQueueInputPath reads CURSOR_QUEUE_INPUT", () => {
  assert.equal(
    resolveQueueInputPath({ CURSOR_QUEUE_INPUT: "/tmp/custom-queue.json" }),
    "/tmp/custom-queue.json"
  );
});

test("buildMaintenanceDispatch emits cursor-maintenance-dispatch:v1 with metadata", () => {
  const dispatch = buildMaintenanceDispatch(fixtureQueue(), {
    repository: "org/repo",
    autoFixEnabled: false,
  });

  assert.equal(dispatch.schema, "cursor-maintenance-dispatch:v1");
  assert.equal(dispatch.repository, "org/repo");
  assert.equal(dispatch.availableSlots, 2);
  assert.ok(dispatch.generatedAt);
  assert.equal(dispatch.items.length, 1);
});

test("buildMaintenanceDispatch includes only selected queue items", () => {
  const selected = scoredItem({ id: "pick-me" });
  const deferred = scoredItem({ id: "wait", description: "deferred item" });
  const ineligible = scoredItem({
    id: "nope",
    files: ["a.go", "b.go"],
    eligible: false,
    ineligibleReasons: ["multi-file change"],
  });

  const dispatch = buildMaintenanceDispatch(
    fixtureQueue({ selected: [selected], deferred: [deferred], ineligible: [ineligible] })
  );

  assert.deepEqual(
    dispatch.items.map((entry) => entry.id),
    ["pick-me"]
  );
});

test("dispatch items include verification command and markdown prompt brief", () => {
  const dispatch = buildMaintenanceDispatch(fixtureQueue());

  const item = dispatch.items[0];
  assert.ok(item.verificationCommand.includes("pnpm"));
  assert.match(item.promptBrief, /^#/);
  assert.ok(item.promptBrief.includes("SONAR-1"));
  assert.ok(item.promptBrief.includes("apps/api/internal/foo.go"));
});

test("single-file Sonar tech-debt item with low effort routes to tdd lane", () => {
  const item = scoredItem({
    source: "sonar",
    id: "SONAR-TECH",
    estEffortMinutes: 20,
    risk: "low",
    files: ["packages/cursor-agents/src/foo.ts"],
  });

  assert.equal(assignDispatchLane(item, { autoFixEnabled: false }).lane, "tdd");
  assert.equal(
    buildMaintenanceDispatch(fixtureQueue({ selected: [item] })).items[0].lane,
    "tdd"
  );
});

test("GitHub tech-debt issue with scoped file routes to tdd lane", () => {
  const item = scoredItem({
    source: "github-issue",
    id: "#42",
    description: "Tidy XP helpers",
    estEffortMinutes: 20,
    risk: "low",
    files: ["apps/api/internal/xpcurve/xpcurve.go"],
  });

  assert.equal(assignDispatchLane(item, { autoFixEnabled: false }).lane, "tdd");
});

test("security-relevant item with file scope routes to sdk-fix when auto-fix enabled", () => {
  const item = scoredItem({
    source: "security",
    id: "SEC-1",
    securityRelevant: true,
    severity: "critical",
    risk: "medium",
    files: ["apps/api/internal/auth/middleware.go"],
    estEffortMinutes: 10,
  });

  assert.equal(assignDispatchLane(item, { autoFixEnabled: true }).lane, "sdk-fix");
  assert.equal(
    buildMaintenanceDispatch(fixtureQueue({ selected: [item] }), { autoFixEnabled: true })
      .items[0].lane,
    "sdk-fix"
  );
});

test("security-relevant item routes to tdd when auto-fix is disabled", () => {
  const item = scoredItem({
    source: "security",
    id: "SEC-2",
    securityRelevant: true,
    files: ["apps/api/internal/auth/token.go"],
    estEffortMinutes: 15,
    risk: "low",
  });

  assert.equal(assignDispatchLane(item, { autoFixEnabled: false }).lane, "tdd");
});

test("selected item outside tdd/sdk-fix rules routes to defer with reason", () => {
  const item = scoredItem({
    id: "SONAR-MED",
    risk: "medium",
    estEffortMinutes: 25,
    files: ["apps/api/internal/handler.go"],
    securityRelevant: false,
  });

  const assignment = assignDispatchLane(item, { autoFixEnabled: false });
  assert.equal(assignment.lane, "defer");
  assert.ok(assignment.deferReason);
  assert.equal(
    buildMaintenanceDispatch(fixtureQueue({ selected: [item] })).items[0].lane,
    "defer"
  );
});
