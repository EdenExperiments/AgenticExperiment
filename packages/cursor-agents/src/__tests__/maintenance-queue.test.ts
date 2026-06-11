import assert from "node:assert/strict";
import { test } from "node:test";

import {
  extractFileReferences,
  fromGitHubIssue,
  fromSonarIssue,
  parseSonarEffort,
  renderQueueMarkdown,
  scoreItem,
  selectDispatchBatch,
  type QueueItem,
} from "../maintenance-queue.js";

function item(overrides: Partial<QueueItem>): QueueItem {
  return {
    source: "sonar",
    id: "X",
    description: "test item",
    files: ["apps/api/internal/foo.go"],
    estEffortMinutes: 15,
    risk: "low",
    severity: "major",
    securityRelevant: false,
    ...overrides,
  };
}

test("parses Sonar effort strings", () => {
  assert.equal(parseSonarEffort("15min"), 15);
  assert.equal(parseSonarEffort("1h30min"), 90);
  assert.equal(parseSonarEffort("1d"), 480);
  assert.equal(parseSonarEffort(undefined), null);
  assert.equal(parseSonarEffort("garbage"), null);
});

test("normalises Sonar issues, marking vulnerabilities security-relevant", () => {
  const queueItem = fromSonarIssue({
    key: "AB-1",
    message: "Fix this",
    component: "proj:apps/api/internal/server/server.go",
    severity: "CRITICAL",
    effort: "10min",
    type: "VULNERABILITY",
  });
  assert.equal(queueItem.source, "security");
  assert.equal(queueItem.securityRelevant, true);
  assert.deepEqual(queueItem.files, ["apps/api/internal/server/server.go"]);
  assert.equal(queueItem.estEffortMinutes, 10);
  assert.equal(queueItem.risk, "high");
});

test("normalises GitHub issues with effort/risk labels and file refs", () => {
  const queueItem = fromGitHubIssue({
    number: 42,
    title: "Tidy up XP helpers",
    labels: ["tech-debt", "effort:20m", "risk:low"],
    body: "Refactor `apps/api/internal/xpcurve/xpcurve.go` only.",
  });
  assert.equal(queueItem.source, "github-issue");
  assert.equal(queueItem.id, "#42");
  assert.equal(queueItem.estEffortMinutes, 20);
  assert.equal(queueItem.risk, "low");
  assert.deepEqual(queueItem.files, ["apps/api/internal/xpcurve/xpcurve.go"]);
});

test("extracts only repo-relative backticked file references", () => {
  assert.deepEqual(
    extractFileReferences("touch `apps/api/main.go` and `packages/ui/src/x.tsx` not `README.md`"),
    ["apps/api/main.go", "packages/ui/src/x.tsx"]
  );
});

test("single-file, low-effort, low-risk items are eligible with high confidence", () => {
  const scored = scoreItem(item({}));
  assert.equal(scored.eligible, true);
  assert.ok(scored.confidence >= 0.9);
});

test("multi-file and over-effort items are ineligible", () => {
  assert.equal(scoreItem(item({ files: ["a.go", "b.go"] })).eligible, false);
  assert.equal(scoreItem(item({ estEffortMinutes: 45 })).eligible, false);
  assert.equal(scoreItem(item({ risk: "high" })).eligible, false);
  assert.equal(scoreItem(item({ files: [] })).eligible, false);
});

test("selection orders security first, then score, and respects the PR cap", () => {
  const items: QueueItem[] = [
    item({ id: "sonar-low", severity: "minor" }),
    item({ id: "sec-1", source: "security", securityRelevant: true, severity: "medium", risk: "medium" }),
    item({ id: "sonar-high", severity: "blocker" }),
    item({ id: "too-big", files: ["a", "b"] }),
  ];

  const selection = selectDispatchBatch(items, { openBotPrCount: 2, concurrentBotPrCap: 4, topK: 3 });
  assert.equal(selection.availableSlots, 2);
  assert.deepEqual(
    selection.selected.map((entry) => entry.id),
    ["sec-1", "sonar-high"]
  );
  assert.deepEqual(
    selection.deferred.map((entry) => entry.id),
    ["sonar-low"]
  );
  assert.deepEqual(
    selection.ineligible.map((entry) => entry.id),
    ["too-big"]
  );
});

test("no slots when open bot PRs are at the cap", () => {
  const selection = selectDispatchBatch([item({})], { openBotPrCount: 4, concurrentBotPrCap: 4 });
  assert.equal(selection.availableSlots, 0);
  assert.equal(selection.selected.length, 0);
  assert.equal(selection.deferred.length, 1);
});

test("renders markdown with all three sections", () => {
  const markdown = renderQueueMarkdown(
    selectDispatchBatch([item({}), item({ id: "Y", files: [] })], { openBotPrCount: 0 })
  );
  assert.ok(markdown.includes("### Selected for dispatch"));
  assert.ok(markdown.includes("### Deferred"));
  assert.ok(markdown.includes("### Ineligible"));
  assert.ok(markdown.includes("no file reference"));
});
