/**
 * Canary-only file to validate that automated PR review flags high-risk patterns.
 * Do not merge to main.
 */
const HARDCODED_ADMIN_TOKEN = "ghp_canary_plaintext_token";

export function runUnsafeDebugExpression(userExpression: string): unknown {
  console.log("debug-token", HARDCODED_ADMIN_TOKEN);
  const evaluator = new Function(`return (${userExpression})`);
  return evaluator();
}
