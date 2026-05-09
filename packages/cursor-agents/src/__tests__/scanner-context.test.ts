import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCheckRunsMarkdown,
  waitForScannerReadiness,
  resolveScannerWaitOptionsFromEnv,
} from "../scanner-context.js";
import type { CheckRunData, GitHubClient } from "../github.js";

function githubWithFrames(frames: CheckRunData[][]): GitHubClient {
  let idx = 0;
  return {
    async listCheckRunsForCommit() {
      const pick = frames[Math.min(idx, frames.length - 1)] ?? [];
      idx += 1;
      return pick;
    },
  } as unknown as GitHubClient;
}

test("buildCheckRunsMarkdown: empty runs", () => {
  assert.match(buildCheckRunsMarkdown([]), /No GitHub check runs/);
});

test("buildCheckRunsMarkdown: lists fields", () => {
  const rows: CheckRunData[] = [
    { name: "CI", status: "completed", conclusion: "success", html_url: "https://x" },
    { name: "Sonar", status: "in_progress", conclusion: null, html_url: null },
  ];
  const md = buildCheckRunsMarkdown(rows, 10);
  assert.match(md, /CI/);
  assert.match(md, /conclusion=success/);
  assert.match(md, /conclusion=pending/);
});

test("buildCheckRunsMarkdown: respects limit", () => {
  const rows: CheckRunData[] = Array.from({ length: 5 }, (_, i) => ({
    name: `Job-${i}`,
    status: "completed",
    conclusion: "success",
    html_url: null,
  }));
  const md = buildCheckRunsMarkdown(rows, 2);
  assert.equal(md.split("\n").length, 3);
});

test("waitForScannerReadiness: required check then finish without Sonar", async () => {
  const github = githubWithFrames([
    [{ name: "SonarCloud Scan", status: "in_progress", conclusion: null, html_url: null }],
    [{ name: "SonarCloud Scan", status: "completed", conclusion: "success", html_url: null }],
  ]);

  const result = await waitForScannerReadiness({
    github,
    headSha: "abc",
    pollIntervalMs: 1,
    timeoutMs: 5000,
    optionalGraceMs: 0,
    requiredSubstrings: ["sonarcloud"],
    optionalSubstrings: [],
    prNumber: 43,
  });

  assert.equal(result.timedOut, false);
  assert.ok(result.notes.some((n) => n.includes("Scanner wait satisfied")));
  assert.ok(result.notes.some((n) => n.includes("Sonar API not configured")));
});

test("waitForScannerReadiness: notes non-success conclusions", async () => {
  const github = githubWithFrames([
    [
      {
        name: "SonarCloud Scan",
        status: "completed",
        conclusion: "failure",
        html_url: null,
      },
    ],
  ]);

  const result = await waitForScannerReadiness({
    github,
    headSha: "abc",
    pollIntervalMs: 1,
    timeoutMs: 5000,
    optionalGraceMs: 0,
    requiredSubstrings: ["sonarcloud"],
    optionalSubstrings: [],
    prNumber: 43,
  });

  assert.equal(result.timedOut, false);
  assert.ok(result.notes.some((n) => n.includes("conclusion=failure")));
  assert.ok(result.notes.some((n) => n.includes("Scanner wait satisfied")));
});

test("waitForScannerReadiness: polls Sonar API until status exists", async () => {
  const saved = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ projectStatus: { status: "ERROR" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const complete: CheckRunData[] = [
      { name: "SonarCloud Scan", status: "completed", conclusion: "success", html_url: null },
    ];
    const github = githubWithFrames([complete, complete]);

    const result = await waitForScannerReadiness({
      github,
      headSha: "abc",
      pollIntervalMs: 1,
      timeoutMs: 5000,
      optionalGraceMs: 0,
      requiredSubstrings: ["sonarcloud"],
      optionalSubstrings: [],
      sonarToken: "tok",
      sonarProjectKey: "myproj",
      prNumber: 43,
    });

    assert.ok(calls >= 1);
    assert.ok(result.notes.some((n) => n.includes("status=ERROR")));
    assert.ok(result.notes.some((n) => n.includes("Scanner wait satisfied")));
  } finally {
    globalThis.fetch = saved;
  }
});

test("waitForScannerReadiness: times out when required check missing", async () => {
  const github = githubWithFrames([[]]);

  const result = await waitForScannerReadiness({
    github,
    headSha: "abc",
    pollIntervalMs: 1,
    timeoutMs: 20,
    optionalGraceMs: 0,
    requiredSubstrings: ["never-match"],
    optionalSubstrings: [],
    prNumber: 43,
  });

  assert.equal(result.timedOut, true);
  assert.ok(result.notes.some((n) => n.includes("timed out")));
});

test("resolveScannerWaitOptionsFromEnv: defaults", () => {
  const prev = process.env.CURSOR_AUTO_FIX_WAIT_SCANNERS;
  const prevReq = process.env.CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS;
  try {
    delete process.env.CURSOR_AUTO_FIX_WAIT_SCANNERS;
    delete process.env.CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS;
    const opts = resolveScannerWaitOptionsFromEnv();
    assert.equal(opts.enabled, true);
    assert.ok(opts.requiredSubstrings.includes("sonarcloud"));
  } finally {
    if (prev === undefined) {
      delete process.env.CURSOR_AUTO_FIX_WAIT_SCANNERS;
    } else {
      process.env.CURSOR_AUTO_FIX_WAIT_SCANNERS = prev;
    }
    if (prevReq === undefined) {
      delete process.env.CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS;
    } else {
      process.env.CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS = prevReq;
    }
  }
});

test("resolveScannerWaitOptionsFromEnv: parses csv uniquely lowercase", () => {
  const prev = process.env.CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS;
  try {
    process.env.CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS = "Foo,foo,BAR";
    const opts = resolveScannerWaitOptionsFromEnv();
    assert.deepEqual(opts.requiredSubstrings.sort(), ["bar", "foo"]);
  } finally {
    if (prev === undefined) {
      delete process.env.CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS;
    } else {
      process.env.CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS = prev;
    }
  }
});
