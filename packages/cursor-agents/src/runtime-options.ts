import { requireEnv } from "./github.js";

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
