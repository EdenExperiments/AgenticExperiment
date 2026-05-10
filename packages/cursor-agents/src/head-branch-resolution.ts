import type { GitHubClient, PullRequestData } from "./github.js";

export function looksLikeGitSha(value: string): boolean {
  return /^[0-9a-f]{40}$/i.test(value.trim());
}

/**
 * Cloud clone URL for this workflow run: same repo as `GITHUB_REPOSITORY`, unless overridden.
 * Fork PRs are skipped in `fix-attempt` main; we only support branches opened in this repository for now.
 */
export function resolveCloudRepoUrl(repository: string): string {
  if (process.env.CURSOR_CLOUD_REPO_URL) {
    return process.env.CURSOR_CLOUD_REPO_URL;
  }
  return `https://github.com/${repository}.git`;
}

export function branchShortNameFromHeadLabel(label: string | undefined): string | null {
  if (!label || typeof label !== "string") {
    return null;
  }
  const idx = label.indexOf(":");
  if (idx === -1) {
    return null;
  }
  const ref = label.slice(idx + 1).trim();
  if (!ref || looksLikeGitSha(ref)) {
    return null;
  }
  return ref;
}

/** Prefer a feature branch name when multiple refs point at the same commit. */
export function pickBranchNameForHeadCommit(branchNames: string[], baseRef: string): string | null {
  if (branchNames.length === 0) {
    return null;
  }
  const filtered = branchNames.filter((b) => b !== baseRef);
  const candidates = filtered.length > 0 ? filtered : branchNames;
  const defaults = new Set(["main", "master"]);
  const nonDefault = candidates.filter((b) => !defaults.has(b.toLowerCase()));
  const pool = nonDefault.length > 0 ? nonDefault : candidates;
  pool.sort((a, b) => a.localeCompare(b));
  return pool[0] ?? null;
}

export interface HeadBranchResolution {
  /**
   * Short branch name for prompts and for Cursor Cloud `repos[].startingRef`.
   * Always set for successful resolution (never a 40-char SHA).
   */
  branchShortName: string;
  summaryNote?: string;
}

/**
 * GitHub sometimes returns `pull_request.head.ref` as a 40-char SHA (e.g. deleted branch).
 * Cursor Cloud validates a "branch" field; when only `prUrl` is sent it may incorrectly use
 * **head.sha** and fail with: Branch '<sha>' does not exist. We therefore **always** pass an
 * explicit `startingRef` with the real branch short name whenever `head.ref` is a normal name,
 * and resolve the name when `head.ref` is a SHA (label or branches-where-head).
 */
export async function resolveHeadBranchMetadata(
  github: GitHubClient,
  pullRequest: PullRequestData,
): Promise<HeadBranchResolution> {
  const envRaw = process.env.CURSOR_CLOUD_STARTING_REF?.trim();
  if (envRaw) {
    const normalized = envRaw.replace(/^refs\/heads\//, "").trim();
    if (!looksLikeGitSha(normalized)) {
      return {
        branchShortName: normalized,
        summaryNote: `Using \`CURSOR_CLOUD_STARTING_REF\` (\`${normalized}\`) for prompts and cloud \`startingRef\`.`,
      };
    }
  }

  if (!looksLikeGitSha(pullRequest.head.ref)) {
    return {
      branchShortName: pullRequest.head.ref,
    };
  }

  const fromLabel = branchShortNameFromHeadLabel(pullRequest.head.label);
  if (fromLabel) {
    return {
      branchShortName: fromLabel,
      summaryNote:
        "GitHub returned **head.ref** as a commit SHA; using **head.label** for the branch short name so Cursor Cloud receives a real ref name.",
    };
  }

  let branches: Array<{ name: string }>;
  try {
    branches = await github.listBranchesWhereHeadCommit(pullRequest.head.sha);
  } catch (error) {
    throw new Error(
      `GitHub returned head.ref as commit SHA (${pullRequest.head.ref.slice(0, 7)}…) but listing branches-where-head failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const picked = pickBranchNameForHeadCommit(
    branches.map((b) => b.name),
    pullRequest.base.ref,
  );

  if (!picked) {
    throw new Error(
      `GitHub returned head.ref as commit SHA (${pullRequest.head.ref.slice(0, 7)}…) and no branch has this commit as HEAD (empty branches-where-head). Recreate the branch or set CURSOR_CLOUD_STARTING_REF to the branch short name.`
    );
  }

  return {
    branchShortName: picked,
    summaryNote: `GitHub returned **head.ref** as a SHA; resolved branch **${picked}** via GET …/commits/{sha}/branches-where-head for Cursor Cloud \`startingRef\`.`,
  };
}

/**
 * Cursor Cloud `repos[]`: always send **startingRef** with the branch short name so the API does
 * not validate **head.sha** as a branch when resolving `prUrl`.
 *
 * Set `CURSOR_CLOUD_OMIT_PR_URL=true` if Cursor still fails validation (drops PR linkage on their side).
 */
export function buildCloudRepoSpec(
  repository: string,
  pullRequest: PullRequestData,
  branchShortName: string,
): { url: string; prUrl?: string; startingRef: string } {
  if (looksLikeGitSha(branchShortName)) {
    throw new Error(
      `Refusing to pass commit SHA as Cursor startingRef (${branchShortName.slice(0, 7)}…).`,
    );
  }
  const url = resolveCloudRepoUrl(repository);
  const omitPrUrl = process.env.CURSOR_CLOUD_OMIT_PR_URL === "true";
  const entry: { url: string; prUrl?: string; startingRef: string } = {
    url,
    startingRef: branchShortName,
  };
  if (!omitPrUrl) {
    entry.prUrl = pullRequest.html_url;
  }
  return entry;
}
