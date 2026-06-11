import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MODEL_FALLBACKS,
  isModelUnavailableError,
  promptWithModelFallback,
  resolveModelCandidates,
} from "../model-fallback.js";

test("resolveModelCandidates: defaults when no preferred model", () => {
  assert.deepEqual(resolveModelCandidates(undefined), DEFAULT_MODEL_FALLBACKS);
});

test("resolveModelCandidates: preferred model first, deduplicated", () => {
  assert.deepEqual(resolveModelCandidates("composer-2"), [
    "composer-2",
    "composer-2.5",
    "gpt-5.4-mini",
  ]);
});

test("resolveModelCandidates: trims and drops blank entries", () => {
  assert.deepEqual(resolveModelCandidates("  my-model  ", [" ", "other"]), [
    "my-model",
    "other",
  ]);
});

test("isModelUnavailableError: matches API rejection message", () => {
  assert.equal(
    isModelUnavailableError(new Error("Cannot use this model: . Available models: x")),
    true
  );
  assert.equal(isModelUnavailableError(new Error("network timeout")), false);
  assert.equal(isModelUnavailableError("not an error"), false);
});

test("promptWithModelFallback: returns first successful model", async () => {
  const calls: string[] = [];
  const { result, modelUsed, attempts } = await promptWithModelFallback(
    ["a", "b"],
    async (modelId) => {
      calls.push(modelId);
      return `ran:${modelId}`;
    }
  );
  assert.equal(result, "ran:a");
  assert.equal(modelUsed, "a");
  assert.deepEqual(attempts, []);
  assert.deepEqual(calls, ["a"]);
});

test("promptWithModelFallback: skips unavailable models and records attempts", async () => {
  const { result, modelUsed, attempts } = await promptWithModelFallback(
    ["stale", "valid"],
    async (modelId) => {
      if (modelId === "stale") {
        throw new Error("Cannot use this model: stale");
      }
      return `ran:${modelId}`;
    }
  );
  assert.equal(result, "ran:valid");
  assert.equal(modelUsed, "valid");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0]?.modelId, "stale");
});

test("promptWithModelFallback: rethrows non-availability errors immediately", async () => {
  await assert.rejects(
    promptWithModelFallback(["a", "b"], async () => {
      throw new Error("boom");
    }),
    /boom/
  );
});

test("promptWithModelFallback: fails with diagnostics when all candidates rejected", async () => {
  await assert.rejects(
    promptWithModelFallback(["a", "b"], async (modelId) => {
      throw new Error(`Cannot use this model: ${modelId}`);
    }),
    /\[a\] Cannot use this model: a \|\| \[b\] Cannot use this model: b/
  );
});

test("promptWithModelFallback: rejects empty candidate list", async () => {
  await assert.rejects(
    promptWithModelFallback([], async () => "x"),
    /at least one model candidate/
  );
});
