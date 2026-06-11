/**
 * Pillar C (M4): unified maintenance queue.
 *
 * Sonar issues and `tech-debt` GitHub Issues are normalised into one queue item
 * shape, scored by confidence-to-fix x impact (NOT raw size — the burner earns
 * trust shipping boring, obviously-correct PRs first), ordered security-first,
 * and capped so concurrent open bot PRs never exceed the review-capacity limit.
 */

export type QueueSource = "sonar" | "github-issue" | "security";

export interface QueueItem {
  source: QueueSource;
  id: string;
  description: string;
  files: string[];
  /** Estimated effort in minutes; null when the source provides no estimate. */
  estEffortMinutes: number | null;
  risk: "low" | "medium" | "high";
  /** Source severity (Sonar severity, advisory severity, or label-derived). */
  severity: string;
  securityRelevant: boolean;
}

export interface ScoredQueueItem extends QueueItem {
  confidence: number;
  impact: number;
  score: number;
  eligible: boolean;
  ineligibleReasons: string[];
}

export interface DispatchSelection {
  selected: ScoredQueueItem[];
  deferred: ScoredQueueItem[];
  ineligible: ScoredQueueItem[];
  availableSlots: number;
}

const MAX_EFFORT_MINUTES = 30;
export const DEFAULT_CONCURRENT_BOT_PR_CAP = 4;
export const DEFAULT_TOP_K = 3;

const IMPACT_BY_SEVERITY: Record<string, number> = {
  blocker: 1.0,
  critical: 0.9,
  high: 0.85,
  major: 0.7,
  medium: 0.6,
  minor: 0.4,
  low: 0.3,
  info: 0.15,
};

/** Parse Sonar effort strings like "15min", "1h30min", "1d" into minutes. */
export function parseSonarEffort(effort: string | undefined | null): number | null {
  if (!effort) return null;
  const days = /(\d+)\s*d/.exec(effort);
  const hours = /(\d+)\s*h/.exec(effort);
  const minutes = /(\d+)\s*min/.exec(effort);
  if (!days && !hours && !minutes) return null;
  return (
    (days ? Number(days[1]) * 8 * 60 : 0) +
    (hours ? Number(hours[1]) * 60 : 0) +
    (minutes ? Number(minutes[1]) : 0)
  );
}

export function fromSonarIssue(issue: {
  key?: string;
  message?: string;
  component?: string;
  severity?: string;
  effort?: string;
  type?: string;
}): QueueItem {
  const file = issue.component?.includes(":")
    ? issue.component.split(":").slice(1).join(":")
    : issue.component;
  const severity = (issue.severity ?? "unknown").toLowerCase();
  const securityRelevant = (issue.type ?? "").toUpperCase() === "VULNERABILITY";
  return {
    source: securityRelevant ? "security" : "sonar",
    id: issue.key ?? "unknown-sonar-key",
    description: issue.message ?? "(no message)",
    files: file ? [file] : [],
    estEffortMinutes: parseSonarEffort(issue.effort),
    risk: severity === "blocker" || severity === "critical" ? "high" : severity === "major" ? "medium" : "low",
    severity,
    securityRelevant,
  };
}

export function fromGitHubIssue(issue: {
  number: number;
  title: string;
  labels: string[];
  body?: string | null;
}): QueueItem {
  const labels = issue.labels.map((label) => label.toLowerCase());
  const effortLabel = labels.find((label) => /^effort:\s*\d+m(in)?$/.test(label));
  const estEffortMinutes = effortLabel ? Number(/\d+/.exec(effortLabel)?.[0]) : null;
  const risk: QueueItem["risk"] = labels.includes("risk:high")
    ? "high"
    : labels.includes("risk:low")
      ? "low"
      : "medium";
  const securityRelevant = labels.some((label) => label.includes("security"));
  const files = extractFileReferences(issue.body ?? "");
  return {
    source: securityRelevant ? "security" : "github-issue",
    id: `#${issue.number}`,
    description: issue.title,
    files,
    estEffortMinutes,
    risk,
    severity: securityRelevant ? "high" : risk,
    securityRelevant,
  };
}

/** Pull backtick-quoted repo-relative file paths out of an issue body. */
export function extractFileReferences(body: string): string[] {
  const refs = new Set<string>();
  for (const match of body.matchAll(/`((?:apps|packages|scripts|docs)\/[\w./-]+\.\w+)`/g)) {
    refs.add(match[1]);
  }
  return [...refs].sort();
}

export function scoreItem(item: QueueItem): ScoredQueueItem {
  const ineligibleReasons: string[] = [];

  let confidence = 1.0;
  if (item.files.length === 0) {
    confidence -= 0.5;
    ineligibleReasons.push("no file reference: cannot scope the fix");
  } else if (item.files.length > 1) {
    confidence -= 0.4;
    ineligibleReasons.push("multi-file change: blast radius too wide for the burner");
  }
  if (item.estEffortMinutes === null) {
    confidence -= 0.25;
  } else if (item.estEffortMinutes > MAX_EFFORT_MINUTES) {
    confidence -= 0.5;
    ineligibleReasons.push(`estimated effort ${item.estEffortMinutes}min exceeds ${MAX_EFFORT_MINUTES}min cap`);
  }
  if (item.risk === "high") {
    confidence -= 0.3;
    ineligibleReasons.push("high blast-radius risk: route to a human-led change");
  } else if (item.risk === "medium") {
    confidence -= 0.1;
  }
  confidence = Math.max(0, Math.min(1, confidence));

  const impact = IMPACT_BY_SEVERITY[item.severity] ?? 0.5;
  const score = Number((confidence * impact).toFixed(4));

  // Security items with a known fix stay eligible even at medium risk, but the
  // single-file and effort rules still apply.
  const eligible = ineligibleReasons.length === 0;

  return { ...item, confidence, impact, score, eligible, ineligibleReasons };
}

export function selectDispatchBatch(
  items: QueueItem[],
  options: {
    openBotPrCount: number;
    concurrentBotPrCap?: number;
    topK?: number;
  }
): DispatchSelection {
  const cap = options.concurrentBotPrCap ?? DEFAULT_CONCURRENT_BOT_PR_CAP;
  const topK = options.topK ?? DEFAULT_TOP_K;
  const availableSlots = Math.max(0, Math.min(topK, cap - options.openBotPrCount));

  const scored = items.map(scoreItem);
  const eligible = scored
    .filter((item) => item.eligible)
    .sort((a, b) => {
      // Security first (brief §4b maintenance flow control), then triage score.
      if (a.securityRelevant !== b.securityRelevant) {
        return a.securityRelevant ? -1 : 1;
      }
      return b.score - a.score;
    });

  return {
    selected: eligible.slice(0, availableSlots),
    deferred: eligible.slice(availableSlots),
    ineligible: scored.filter((item) => !item.eligible),
    availableSlots,
  };
}

export function renderQueueMarkdown(selection: DispatchSelection): string {
  const row = (item: ScoredQueueItem) =>
    `| ${item.source} | ${item.id} | ${item.description.slice(0, 80)} | ${item.files.join("<br>") || "—"} | ${item.estEffortMinutes ?? "?"}min | ${item.score} |`;

  const header = "| Source | ID | Description | Files | Effort | Score |\n|---|---|---|---|---|---|";

  return [
    "## Maintenance Queue Selection",
    "",
    `Available dispatch slots: ${selection.availableSlots} (cap minus open bot PRs)`,
    "",
    "### Selected for dispatch",
    selection.selected.length > 0 ? [header, ...selection.selected.map(row)].join("\n") : "_None — no slots or no eligible items._",
    "",
    "### Deferred (eligible, over slot limit)",
    selection.deferred.length > 0 ? [header, ...selection.deferred.map(row)].join("\n") : "_None._",
    "",
    "### Ineligible",
    selection.ineligible.length > 0
      ? selection.ineligible
          .map((item) => `- ${item.source} ${item.id}: ${item.ineligibleReasons.join("; ")}`)
          .join("\n")
      : "_None._",
  ].join("\n");
}
