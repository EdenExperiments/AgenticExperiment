/**
 * Pillar A (M2): deterministic classification of dependency-update PRs.
 *
 * Renovate already encodes most of the signal we need (labels from renovate.json
 * packageRules, conventional PR titles, changelog sections in the body). This module
 * turns that into a structured classification the assessment agent builds on.
 */

export type UpdateType = "patch" | "minor" | "major" | "unknown";
export type DepClassification = "safe" | "risky" | "breaking";

export interface UpdatedDependency {
  name: string;
  fromVersion?: string;
  toVersion?: string;
}

export interface DepAssessmentInput {
  title: string;
  body: string | null;
  labels: string[];
  changedFiles: string[];
}

export interface DepAssessmentClassification {
  updateType: UpdateType;
  classification: DepClassification;
  dependencies: UpdatedDependency[];
  ecosystems: string[];
  reasons: string[];
}

const TITLE_DEP_PATTERN =
  /(?:update|upgrade|bump)\s+(?:dependency\s+|module\s+|)([@a-z0-9._/-]+)\s+to\s+v?([\w.-]+)/i;

const VERSION_CHANGE_PATTERN = /[`']?v?([\w.-]+)[`']?\s*->\s*[`']?v?([\w.-]+)[`']?/;

export function detectUpdateType(input: DepAssessmentInput): UpdateType {
  const haystack = `${input.title}\n${input.body ?? ""}`.toLowerCase();
  const deps = extractDependencies(input);
  const versionJump = deps.find((dep) => dep.fromVersion && dep.toVersion);
  if (versionJump?.fromVersion && versionJump?.toVersion) {
    const from = parseSemverParts(versionJump.fromVersion);
    const to = parseSemverParts(versionJump.toVersion);
    if (from && to) {
      if (to.major > from.major) return "major";
      if (to.major === from.major && to.minor > from.minor) return "minor";
      if (to.major === from.major && to.minor === from.minor && to.patch > from.patch) {
        return "patch";
      }
    }
  }
  if (/\bmajor\b/.test(haystack)) return "major";
  if (/\bminor\b/.test(haystack)) return "minor";
  if (/\bpatch\b/.test(haystack)) return "patch";
  return "unknown";
}

function parseSemverParts(
  version: string
): { major: number; minor: number; patch: number } | null {
  const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3] ?? 0),
  };
}

export function extractDependencies(input: DepAssessmentInput): UpdatedDependency[] {
  const deps = new Map<string, UpdatedDependency>();

  // Renovate PR bodies contain a markdown table where the first cell is the package
  // (usually as a [name](url) link) and the change cell contains "`from` -> `to`".
  const body = input.body ?? "";
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.includes("->")) continue;
    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);
    if (cells.length < 2) continue;
    const nameCell = cells[0];
    const name =
      /\[([^\]]+)\]/.exec(nameCell)?.[1] ?? /^[@a-zA-Z0-9._/-]+/.exec(nameCell)?.[0] ?? "";
    const changeCell = cells.find((cell) => VERSION_CHANGE_PATTERN.test(cell));
    const versions = changeCell ? VERSION_CHANGE_PATTERN.exec(changeCell) : null;
    if (name && !deps.has(name)) {
      deps.set(name, {
        name,
        fromVersion: versions?.[1],
        toVersion: versions?.[2],
      });
    }
  }

  if (deps.size === 0) {
    const titleMatch = TITLE_DEP_PATTERN.exec(input.title);
    if (titleMatch) {
      deps.set(titleMatch[1], { name: titleMatch[1], toVersion: titleMatch[2] });
    }
  }

  return [...deps.values()];
}

export function detectEcosystems(changedFiles: string[]): string[] {
  const ecosystems = new Set<string>();
  for (const file of changedFiles) {
    if (/(^|\/)package\.json$|pnpm-lock\.yaml$/.test(file)) ecosystems.add("npm");
    if (/(^|\/)go\.(mod|sum)$/.test(file)) ecosystems.add("gomod");
    if (/^\.github\/workflows\//.test(file)) ecosystems.add("github-actions");
  }
  return [...ecosystems].sort();
}

export function classifyDependencyUpdate(
  input: DepAssessmentInput
): DepAssessmentClassification {
  const updateType = detectUpdateType(input);
  const dependencies = extractDependencies(input);
  const ecosystems = detectEcosystems(input.changedFiles);
  const reasons: string[] = [];

  let classification: DepClassification;
  if (input.labels.includes("deps:breaking") || updateType === "major") {
    classification = "breaking";
    reasons.push(
      input.labels.includes("deps:breaking")
        ? "labeled deps:breaking by Renovate packageRules"
        : "major version bump detected"
    );
  } else if (input.labels.includes("deps:security")) {
    classification = "risky";
    reasons.push("security-driven update: prioritise but verify behavior");
  } else if (
    dependencies.some((dep) => dep.fromVersion && /^v?0\./.test(dep.fromVersion))
  ) {
    classification = "risky";
    reasons.push("pre-1.0 dependency: semver minor/patch can break");
  } else if (input.labels.includes("deps:safe") || updateType === "patch" || updateType === "minor") {
    classification = "safe";
    reasons.push(
      input.labels.includes("deps:safe")
        ? "labeled deps:safe by Renovate packageRules"
        : `${updateType} update with no breaking signal`
    );
  } else {
    classification = "risky";
    reasons.push("update type could not be determined: treat as risky by default");
  }

  return { updateType, classification, dependencies, ecosystems, reasons };
}

/**
 * Pure call-site scan: given file contents, find files referencing the updated
 * package (npm import/require, Go import path, or GitHub Action `uses:`).
 */
export function findAffectedCallSites(
  packageName: string,
  files: ReadonlyMap<string, string>
): string[] {
  if (!packageName) return [];
  const needles = [
    `from "${packageName}"`,
    `from '${packageName}'`,
    `from "${packageName}/`,
    `from '${packageName}/`,
    `require("${packageName}")`,
    `require('${packageName}')`,
    `"${packageName}"`,
    `uses: ${packageName}@`,
  ];
  const hits: string[] = [];
  for (const [path, content] of files) {
    if (needles.some((needle) => content.includes(needle))) {
      hits.push(path);
    }
  }
  return hits.sort();
}

/** Extract the changelog/release-notes section Renovate embeds in PR bodies. */
export function extractChangelogExcerpt(body: string | null, maxLength = 6000): string {
  if (!body) return "[no PR body available]";
  const releaseNotesIndex = body.search(/#+\s*release notes/i);
  const excerpt = releaseNotesIndex >= 0 ? body.slice(releaseNotesIndex) : body;
  return excerpt.length > maxLength ? `${excerpt.slice(0, maxLength)}\n…[truncated]` : excerpt;
}
