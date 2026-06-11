/** M6: attribute PRs to an execution surface for per-surface outcome metrics. */

export type Surface = "dependency-bot" | "cursor-agent" | "human";

export function classifySurface(login: string, headRef: string): Surface {
  const normalizedLogin = login.toLowerCase();
  if (
    normalizedLogin.includes("renovate") ||
    normalizedLogin.includes("dependabot") ||
    normalizedLogin.includes("mend-for-github")
  ) {
    return "dependency-bot";
  }
  if (normalizedLogin.includes("cursor") || headRef.startsWith("cursor/")) {
    return "cursor-agent";
  }
  return "human";
}
