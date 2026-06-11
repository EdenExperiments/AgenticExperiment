import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyDependencyUpdate,
  detectEcosystems,
  extractChangelogExcerpt,
  extractDependencies,
  findAffectedCallSites,
} from "../dep-classification.js";

const RENOVATE_BODY = `
This PR contains the following updates:

| Package | Type | Update | Change |
|---|---|---|---|
| [react](https://react.dev) | dependencies | minor | \`19.1.0\` -> \`19.2.6\` |

---

### Release Notes

Some notes here.
`;

test("extracts dependencies from a Renovate body table", () => {
  const deps = extractDependencies({
    title: "Update dependency react to v19.2.6",
    body: RENOVATE_BODY,
    labels: [],
    changedFiles: [],
  });
  assert.equal(deps.length, 1);
  assert.equal(deps[0].name, "react");
  assert.equal(deps[0].fromVersion, "19.1.0");
  assert.equal(deps[0].toVersion, "19.2.6");
});

test("falls back to the PR title when the body has no table", () => {
  const deps = extractDependencies({
    title: "Update module github.com/go-chi/chi/v5 to v5.3.0",
    body: null,
    labels: [],
    changedFiles: [],
  });
  assert.equal(deps.length, 1);
  assert.equal(deps[0].name, "github.com/go-chi/chi/v5");
});

test("classifies deps:breaking label as breaking regardless of version math", () => {
  const result = classifyDependencyUpdate({
    title: "Update dependency typescript to v6",
    body: null,
    labels: ["deps:breaking"],
    changedFiles: ["package.json"],
  });
  assert.equal(result.classification, "breaking");
});

test("classifies a major version jump as breaking without labels", () => {
  const result = classifyDependencyUpdate({
    title: "Update dependency vitest to v4",
    body: RENOVATE_BODY.replace("19.1.0", "2.1.9").replace("19.2.6", "4.1.7"),
    labels: [],
    changedFiles: ["package.json"],
  });
  assert.equal(result.updateType, "major");
  assert.equal(result.classification, "breaking");
});

test("classifies labeled patch updates as safe", () => {
  const result = classifyDependencyUpdate({
    title: "Update dependency react to v19.2.6",
    body: RENOVATE_BODY,
    labels: ["deps:safe"],
    changedFiles: ["package.json", "pnpm-lock.yaml"],
  });
  assert.equal(result.classification, "safe");
  assert.deepEqual(result.ecosystems, ["npm"]);
});

test("classifies pre-1.0 updates as risky", () => {
  const result = classifyDependencyUpdate({
    title: "Update dependency some-lib to v0.9.1",
    body: RENOVATE_BODY.replace("react", "some-lib")
      .replace("19.1.0", "0.8.0")
      .replace("19.2.6", "0.9.1"),
    labels: [],
    changedFiles: ["package.json"],
  });
  assert.equal(result.classification, "risky");
});

test("detects ecosystems from changed files", () => {
  assert.deepEqual(
    detectEcosystems(["apps/api/go.mod", "apps/api/go.sum", ".github/workflows/ci.yml"]),
    ["github-actions", "gomod"]
  );
});

test("finds affected call sites for npm and Go imports", () => {
  const files = new Map<string, string>([
    ["apps/web/page.tsx", `import { useQuery } from "@tanstack/react-query";`],
    ["apps/api/internal/server/server.go", `import (\n\t"github.com/go-chi/chi/v5"\n)`],
    ["apps/web/other.tsx", `import x from "unrelated";`],
  ]);
  assert.deepEqual(findAffectedCallSites("@tanstack/react-query", files), ["apps/web/page.tsx"]);
  assert.deepEqual(findAffectedCallSites("github.com/go-chi/chi/v5", files), [
    "apps/api/internal/server/server.go",
  ]);
  assert.deepEqual(findAffectedCallSites("nonexistent", files), []);
});

test("extracts the release-notes section of the PR body", () => {
  const excerpt = extractChangelogExcerpt(RENOVATE_BODY);
  assert.ok(excerpt.startsWith("### Release Notes"));
});
