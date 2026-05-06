import { existsSync } from "node:fs";
import { setMaxListeners } from "node:events";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

function findFirstExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveFromPathEnv(): string | null {
  const pathValue = process.env.PATH;
  if (!pathValue) {
    return null;
  }

  const separator = process.platform === "win32" ? ";" : ":";
  const binaryName = process.platform === "win32" ? "rg.exe" : "rg";
  const candidates = pathValue
    .split(separator)
    .filter(Boolean)
    .map((entry) => join(entry, binaryName));

  return findFirstExisting(candidates);
}

function resolveBundledRipgrepPathFromSdk(require: NodeRequire): string | null {
  try {
    const sdkPackageJsonPath = require.resolve("@cursor/sdk/package.json");
    const sdkPackageDir = dirname(sdkPackageJsonPath);
    return findFirstExisting([
      join(sdkPackageDir, "node_modules", "@vscode", "ripgrep", "bin", "rg"),
      join(sdkPackageDir, "node_modules", "@vscode", "ripgrep", "bin", "rg.exe"),
      join(sdkPackageDir, "..", "@vscode", "ripgrep", "bin", "rg"),
      join(sdkPackageDir, "..", "@vscode", "ripgrep", "bin", "rg.exe"),
    ]);
  } catch {
    return null;
  }
}

function resolveBundledRipgrepPath(require: NodeRequire): string | null {
  try {
    const ripgrepPackageJsonPath = require.resolve("@vscode/ripgrep/package.json");
    const ripgrepPackageDir = dirname(ripgrepPackageJsonPath);
    return findFirstExisting([
      join(ripgrepPackageDir, "bin", "rg"),
      join(ripgrepPackageDir, "bin", "rg.exe"),
    ]);
  } catch {
    return null;
  }
}

/**
 * Cursor SDK currently requires an explicit ripgrep binary in some CI environments.
 * Setting CURSOR_RIPGREP_PATH prevents noisy initialization failures and retries.
 */
export function bootstrapCursorSdkRuntime(): void {
  // Cursor SDK fan-out can attach many abort listeners in CI. Increase the warning
  // threshold to avoid noisy false-positive memory leak warnings in workflow logs.
  setMaxListeners(50);

  if (process.env.CURSOR_RIPGREP_PATH) {
    return;
  }

  const require = createRequire(import.meta.url);
  const ripgrepPath =
    resolveBundledRipgrepPath(require) ??
    resolveBundledRipgrepPathFromSdk(require) ??
    resolveFromPathEnv();

  if (ripgrepPath) {
    process.env.CURSOR_RIPGREP_PATH = ripgrepPath;
  }
}
