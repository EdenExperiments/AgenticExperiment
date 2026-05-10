import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  branchShortNameFromHeadLabel,
  pickBranchNameForHeadCommit,
  resolveHeadBranchMetadata,
  buildCloudRepoSpec,
} from "../head-branch-resolution.js";
import type { GitHubClient, PullRequestData } from "../github.js";

const SHA_40 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const savedEnv: { CURSOR_CLOUD_STARTING_REF?: string; CURSOR_CLOUD_OMIT_PR_URL?: string } = {};

beforeEach(() => {
  savedEnv.CURSOR_CLOUD_STARTING_REF = process.env.CURSOR_CLOUD_STARTING_REF;
  savedEnv.CURSOR_CLOUD_OMIT_PR_URL = process.env.CURSOR_CLOUD_OMIT_PR_URL;
});

afterEach(() => {
  for (const key of ["CURSOR_CLOUD_STARTING_REF", "CURSOR_CLOUD_OMIT_PR_URL"] as const) {
    const v = savedEnv[key];
    if (v === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = v;
    }
  }
});

function stubPr(overrides: Partial<PullRequestData>): PullRequestData {
  const defaults: PullRequestData = {
    number: 43,
    title: "Test",
    body: null,
    html_url: "https://github.com/o/r/pull/43",
    user: { login: "u" },
    base: { ref: "main" },
    head: { ref: "feature/x", sha: "abc123" },
  };
  return {
    ...defaults,
    ...overrides,
    base: { ...defaults.base, ...overrides.base },
    head: { ...defaults.head, ...overrides.head },
  };
}

test("branchShortNameFromHeadLabel: parses owner:branch", () => {
  assert.equal(branchShortNameFromHeadLabel("org:auto-agent-fix"), "auto-agent-fix");
});

test("branchShortNameFromHeadLabel: missing colon", () => {
  assert.equal(branchShortNameFromHeadLabel("no-colon-here"), null);
});

test("branchShortNameFromHeadLabel: SHA-like ref after colon is rejected", () => {
  assert.equal(branchShortNameFromHeadLabel(`org:${SHA_40}`), null);
});

test("branchShortNameFromHeadLabel: undefined", () => {
  assert.equal(branchShortNameFromHeadLabel(undefined), null);
});

test("pickBranchNameForHeadCommit: excludes base when other branches exist", () => {
  assert.equal(
    pickBranchNameForHeadCommit(["main", "auto-agent-fix", "other"], "main"),
    "auto-agent-fix",
  );
});

test("pickBranchNameForHeadCommit: deterministic sort when multiple non-default", () => {
  assert.equal(
    pickBranchNameForHeadCommit(["z-branch", "a-branch", "main"], "main"),
    "a-branch",
  );
});

test("pickBranchNameForHeadCommit: only main and master — picks lexicographically first", () => {
  assert.equal(pickBranchNameForHeadCommit(["master", "main"], "release"), "main");
});

test("pickBranchNameForHeadCommit: empty", () => {
  assert.equal(pickBranchNameForHeadCommit([], "main"), null);
});

test("resolveHeadBranchMetadata: uses CURSOR_CLOUD_STARTING_REF when not a SHA", async () => {
  process.env.CURSOR_CLOUD_STARTING_REF = "refs/heads/my-override";
  const pr = stubPr({
    head: { ref: "other", sha: "abc" },
  });
  const github = {} as GitHubClient;
  const r = await resolveHeadBranchMetadata(github, pr);
  assert.equal(r.branchShortName, "my-override");
  assert.match(r.summaryNote ?? "", /CURSOR_CLOUD_STARTING_REF/);
});

test("resolveHeadBranchMetadata: normal head.ref passes through", async () => {
  delete process.env.CURSOR_CLOUD_STARTING_REF;
  const pr = stubPr({
    head: { ref: "feature/foo", sha: "abc" },
  });
  const github = {} as GitHubClient;
  const r = await resolveHeadBranchMetadata(github, pr);
  assert.equal(r.branchShortName, "feature/foo");
  assert.equal(r.summaryNote, undefined);
});

test("resolveHeadBranchMetadata: SHA ref + label resolves branch", async () => {
  delete process.env.CURSOR_CLOUD_STARTING_REF;
  const pr = stubPr({
    head: {
      ref: SHA_40,
      sha: SHA_40,
      label: "EdenExperiments:auto-agent-fix",
    },
  });
  const github = {} as GitHubClient;
  const r = await resolveHeadBranchMetadata(github, pr);
  assert.equal(r.branchShortName, "auto-agent-fix");
  assert.ok(r.summaryNote?.includes("head.label"));
});

test("resolveHeadBranchMetadata: SHA ref uses branches-where-head", async () => {
  delete process.env.CURSOR_CLOUD_STARTING_REF;
  const pr = stubPr({
    head: {
      ref: SHA_40,
      sha: SHA_40,
    },
  });
  const github: GitHubClient = {
    async listBranchesWhereHeadCommit() {
      return [{ name: "main" }, { name: "feature-from-api" }];
    },
  } as unknown as GitHubClient;

  const r = await resolveHeadBranchMetadata(github, pr);
  assert.equal(r.branchShortName, "feature-from-api");
});

test("resolveHeadBranchMetadata: SHA ref + empty branches throws", async () => {
  delete process.env.CURSOR_CLOUD_STARTING_REF;
  const pr = stubPr({
    head: {
      ref: SHA_40,
      sha: SHA_40,
    },
  });
  const github: GitHubClient = {
    async listBranchesWhereHeadCommit() {
      return [];
    },
  } as unknown as GitHubClient;

  await assert.rejects(() => resolveHeadBranchMetadata(github, pr), /empty branches-where-head/);
});

test("buildCloudRepoSpec: never accepts commit SHA as startingRef", () => {
  const pr = stubPr({});
  assert.throws(
    () => buildCloudRepoSpec("o/r", pr, SHA_40),
    /Refusing to pass commit SHA/,
  );
});

test("buildCloudRepoSpec: includes prUrl unless omitted", () => {
  const pr = stubPr({ html_url: "https://github.com/o/r/pull/1" });
  delete process.env.CURSOR_CLOUD_OMIT_PR_URL;
  const withPr = buildCloudRepoSpec("o/r", pr, "main");
  assert.equal(withPr.prUrl, "https://github.com/o/r/pull/1");

  process.env.CURSOR_CLOUD_OMIT_PR_URL = "true";
  const omit = buildCloudRepoSpec("o/r", pr, "main");
  assert.equal(omit.prUrl, undefined);
});
