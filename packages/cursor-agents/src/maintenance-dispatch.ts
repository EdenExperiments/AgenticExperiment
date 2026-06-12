/**
 * Pillar C (M4): maintenance dispatch — turn queue selections into lane-tagged
 * work items with verification commands and prompt briefs for TDD vs SDK paths.
 */

import type { ScoredQueueItem } from "./maintenance-queue.js";

export type DispatchLane = "tdd" | "sdk-fix" | "defer";

export interface MaintenanceQueueDocument {
  schema: "cursor-maintenance-queue:v1";
  generatedAt: string;
  repository: string;
  openBotPrCount: number;
  availableSlots: number;
  selected: ScoredQueueItem[];
  deferred: ScoredQueueItem[];
  ineligible: ScoredQueueItem[];
}

export interface DispatchLaneAssignment {
  lane: DispatchLane;
  deferReason?: string;
}

export interface MaintenanceDispatchItem {
  source: ScoredQueueItem["source"];
  id: string;
  description: string;
  files: string[];
  estEffortMinutes: number | null;
  risk: ScoredQueueItem["risk"];
  severity: string;
  securityRelevant: boolean;
  confidence: number;
  impact: number;
  score: number;
  lane: DispatchLane;
  deferReason?: string;
  verificationCommand: string;
  promptBrief: string;
}

export interface MaintenanceDispatchDocument {
  schema: "cursor-maintenance-dispatch:v1";
  generatedAt: string;
  repository: string;
  availableSlots: number;
  autoFixEnabled: boolean;
  items: MaintenanceDispatchItem[];
}

const MAX_EFFORT_MINUTES = 30;

export function resolveQueueInputPath(
  env: Record<string, string | undefined> = process.env
): string {
  return env.CURSOR_QUEUE_INPUT?.trim() || "./maintenance-queue.json";
}

function resolveVerificationCommand(files: string[]): string {
  const file = files[0] ?? "";
  if (file.startsWith("apps/api/") || file.endsWith(".go")) {
    return "pnpm test:go";
  }
  if (file.startsWith("packages/cursor-agents/")) {
    return "pnpm --filter @rpgtracker/cursor-agents test";
  }
  if (file.startsWith("packages/ui/")) {
    return "pnpm --filter @rpgtracker/ui test";
  }
  if (file.startsWith("packages/")) {
    return "pnpm test:ci";
  }
  if (file.startsWith("apps/rpg-tracker/")) {
    return "pnpm --filter rpg-tracker test";
  }
  if (file.startsWith("apps/nutri-log/")) {
    return "pnpm --filter nutri-log test";
  }
  if (file.startsWith("apps/mental-health/")) {
    return "pnpm --filter mental-health test";
  }
  return "pnpm test:ci";
}

function buildPromptBrief(item: ScoredQueueItem, assignment: DispatchLaneAssignment): string {
  const files = item.files.length > 0 ? item.files.join(", ") : "(no file scope)";
  const effort = item.estEffortMinutes !== null ? `${item.estEffortMinutes}min` : "unknown";
  const laneNotes =
    assignment.lane === "tdd"
      ? "Route via IDE TDD chain: write failing tests, implement minimal fix, verify."
      : assignment.lane === "sdk-fix"
        ? "Route via gated SDK fix-attempt (Sonar-first, Bugbot advisory only)."
        : `Defer — ${assignment.deferReason ?? "below dispatch confidence threshold"}.`;

  return `# Maintenance fix: ${item.id}

**Source:** ${item.source}
**Description:** ${item.description}
**Files:** ${files}
**Severity:** ${item.severity} · **Risk:** ${item.risk} · **Effort:** ${effort}
**Dispatch lane:** ${assignment.lane}

## Task

Address the scoped finding with a minimal, test-backed change. Keep blast radius to the listed file(s).

## Lane guidance

${laneNotes}

## Verification

Run: \`${resolveVerificationCommand(item.files)}\`
`.trim();
}

export function assignDispatchLane(
  item: ScoredQueueItem,
  options: { autoFixEnabled?: boolean } = {}
): DispatchLaneAssignment {
  const autoFixEnabled = options.autoFixEnabled === true;

  if (!item.eligible) {
    return {
      lane: "defer",
      deferReason: item.ineligibleReasons.join("; ") || "queue item marked ineligible",
    };
  }

  if (item.files.length !== 1) {
    return {
      lane: "defer",
      deferReason:
        item.files.length === 0
          ? "no file reference: cannot scope the fix"
          : "multi-file change: blast radius too wide for automated dispatch",
    };
  }

  if (item.risk === "high") {
    return {
      lane: "defer",
      deferReason: "high blast-radius risk: route to a human-led change",
    };
  }

  if (item.estEffortMinutes !== null && item.estEffortMinutes > MAX_EFFORT_MINUTES) {
    return {
      lane: "defer",
      deferReason: `estimated effort ${item.estEffortMinutes}min exceeds ${MAX_EFFORT_MINUTES}min cap`,
    };
  }

  if (item.securityRelevant && autoFixEnabled) {
    return { lane: "sdk-fix" };
  }

  if (item.risk === "low") {
    return { lane: "tdd" };
  }

  return {
    lane: "defer",
    deferReason: "medium-risk item outside automated TDD/sdk-fix gates",
  };
}

export function buildMaintenanceDispatch(
  queue: MaintenanceQueueDocument,
  options: {
    repository?: string;
    autoFixEnabled?: boolean;
  } = {}
): MaintenanceDispatchDocument {
  const autoFixEnabled =
    options.autoFixEnabled ??
    (process.env.CURSOR_AUTO_FIX_ENABLED === "true" ||
      process.env.CURSOR_FORCE_AUTO_FIX === "true");

  const items = queue.selected.map((item) => {
    const assignment = assignDispatchLane(item, { autoFixEnabled });
    return {
      source: item.source,
      id: item.id,
      description: item.description,
      files: item.files,
      estEffortMinutes: item.estEffortMinutes,
      risk: item.risk,
      severity: item.severity,
      securityRelevant: item.securityRelevant,
      confidence: item.confidence,
      impact: item.impact,
      score: item.score,
      lane: assignment.lane,
      deferReason: assignment.deferReason,
      verificationCommand: resolveVerificationCommand(item.files),
      promptBrief: buildPromptBrief(item, assignment),
    };
  });

  return {
    schema: "cursor-maintenance-dispatch:v1",
    generatedAt: new Date().toISOString(),
    repository: options.repository ?? queue.repository,
    availableSlots: queue.availableSlots,
    autoFixEnabled,
    items,
  };
}

export function renderDispatchMarkdown(dispatch: MaintenanceDispatchDocument): string {
  const row = (item: MaintenanceDispatchItem) =>
    `| ${item.id} | ${item.lane} | ${item.source} | ${item.files.join("<br>") || "—"} | ${item.score} |`;

  const header = "| ID | Lane | Source | Files | Score |\n|---|---|---|---|---|";

  const deferred = dispatch.items.filter((item) => item.lane === "defer");
  const actionable = dispatch.items.filter((item) => item.lane !== "defer");

  return [
    "## Maintenance Dispatch",
    "",
    `Repository: \`${dispatch.repository}\``,
    `Available slots: ${dispatch.availableSlots}`,
    `Auto-fix enabled: ${dispatch.autoFixEnabled}`,
    "",
    "### Actionable dispatch",
    actionable.length > 0 ? [header, ...actionable.map(row)].join("\n") : "_None._",
    "",
    "### Deferred at dispatch",
    deferred.length > 0
      ? deferred.map((item) => `- ${item.id}: ${item.deferReason ?? "deferred"}`).join("\n")
      : "_None._",
  ].join("\n");
}
