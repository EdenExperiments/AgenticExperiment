import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapCursorSdkRuntime } from "./sdk-bootstrap.js";

test("sdk bootstrap runs without throwing", () => {
  bootstrapCursorSdkRuntime();
  assert.ok(true);
});
