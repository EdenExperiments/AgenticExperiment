import type { PullRequestData } from "./github.js";
import { requireEnv } from "./github.js";
import { buildCloudRepoSpec } from "./head-branch-resolution.js";

export type CursorRuntimeMode = "local" | "cloud";

function resolveCloudRepoUrl(): string {
  if (process.env.CURSOR_CLOUD_REPO_URL) {
    return process.env.CURSOR_CLOUD_REPO_URL;
  }

  const repository = process.env.GITHUB_REPOSITORY;
  if (repository) {
    return `https://github.com/${repository}.git`;
  }

  return requireEnv("CURSOR_CLOUD_REPO_URL");
}

export function resolveRuntimeMode(): CursorRuntimeMode {
  return process.env.CURSOR_RUNTIME === "cloud" ? "cloud" : "local";
}

export function resolvePromptRuntimeOptions(): Record<string, unknown> {
  const runtimeMode = resolveRuntimeMode();

  if (runtimeMode === "cloud") {
    return {
      cloud: {
        repos: [{ url: resolveCloudRepoUrl() }],
        skipReviewerRequest: process.env.CURSOR_CLOUD_SKIP_REVIEWER_REQUEST !== "false",
      },
    };
  }

  return {
    local: {
      cwd: process.cwd(),
    },
  };
}

/**
 * Planner prompt runtime for fix attempts: mirror execution Agent cloud repo wiring when
 * `CURSOR_RUNTIME=cloud` so planning sees the same branch/PR linkage as the executor.
 */
export function resolveFixPlannerPromptOptions(
  repository: string,
  pullRequest: PullRequestData,
  branchShortName: string
): Record<string, unknown> {
  const runtimeMode = resolveRuntimeMode();

  if (runtimeMode === "cloud") {
    return {
      cloud: {
        repos: [buildCloudRepoSpec(repository, pullRequest, branchShortName)],
        skipReviewerRequest: process.env.CURSOR_CLOUD_SKIP_REVIEWER_REQUEST !== "false",
      },
    };
  }

  return {
    local: {
      cwd: process.cwd(),
    },
  };
}
