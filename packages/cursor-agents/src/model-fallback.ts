/**
 * Shared model-selection fallback for Cursor SDK agent scripts.
 *
 * The Cursor API retires model slugs over time (e.g. `composer-2-fast`),
 * which previously hard-failed every scheduled workflow that pinned a stale
 * default. Scripts should resolve an ordered candidate list and fall through
 * to the next candidate whenever the API rejects a model as unavailable.
 */

/** Ordered cheap-first defaults; escalate only when earlier slugs are rejected. */
export const DEFAULT_MODEL_FALLBACKS = ["composer-2.5", "composer-2", "gpt-5.4-mini"];

export interface ModelFallbackAttempt {
  modelId: string;
  reason: string;
}

export function resolveModelCandidates(
  preferred: string | undefined,
  fallbacks: string[] = DEFAULT_MODEL_FALLBACKS
): string[] {
  const candidates = [preferred, ...fallbacks]
    .map((entry) => entry?.trim() ?? "")
    .filter(Boolean);
  return [...new Set(candidates)];
}

export function isModelUnavailableError(error: unknown): boolean {
  return error instanceof Error && /cannot use this model/i.test(error.message);
}

/**
 * Run `runPrompt` against each candidate model in order, advancing past
 * candidates the API rejects as unavailable. Any other error is rethrown.
 */
export async function promptWithModelFallback<T>(
  candidates: string[],
  runPrompt: (modelId: string) => Promise<T>,
  isUnavailable: (error: unknown) => boolean = isModelUnavailableError
): Promise<{ result: T; modelUsed: string; attempts: ModelFallbackAttempt[] }> {
  if (candidates.length === 0) {
    throw new Error("promptWithModelFallback requires at least one model candidate.");
  }

  const attempts: ModelFallbackAttempt[] = [];
  for (const modelId of candidates) {
    try {
      const result = await runPrompt(modelId);
      return { result, modelUsed: modelId, attempts };
    } catch (error) {
      if (isUnavailable(error)) {
        attempts.push({
          modelId,
          reason: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `All model candidates were rejected as unavailable: ${attempts
      .map((attempt) => `[${attempt.modelId}] ${attempt.reason}`)
      .join(" || ")}`
  );
}
