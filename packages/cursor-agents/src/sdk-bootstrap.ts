import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

function resolveBundledRipgrepPath(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const ripgrepPackageJsonPath = require.resolve("@vscode/ripgrep/package.json");
    const ripgrepPackageDir = dirname(ripgrepPackageJsonPath);
    const candidates = [
      join(ripgrepPackageDir, "bin", "rg"),
      join(ripgrepPackageDir, "bin", "rg.exe"),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  } catch {
    // Fall through to null when @vscode/ripgrep cannot be resolved.
  }

  return null;
}

/**
 * Cursor SDK currently requires an explicit ripgrep binary in some CI environments.
 * Setting CURSOR_RIPGREP_PATH prevents noisy initialization failures and retries.
 */
export function bootstrapCursorSdkRuntime(): void {
  if (process.env.CURSOR_RIPGREP_PATH) {
    return;
  }

  const bundledRipgrepPath = resolveBundledRipgrepPath();
  if (bundledRipgrepPath) {
    process.env.CURSOR_RIPGREP_PATH = bundledRipgrepPath;
  }
}
