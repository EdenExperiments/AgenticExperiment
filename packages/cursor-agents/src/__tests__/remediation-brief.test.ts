import test from "node:test";
import assert from "node:assert/strict";
import { buildMergedRemediationBrief } from "../remediation-brief.js";

test("buildMergedRemediationBrief interleaves labels", () => {
  const text = buildMergedRemediationBrief({
    reviewFindings: [
      {
        id: "R-001",
        severity: "high",
        confidence: "high",
        title: "Leak",
        location: "apps/api/handler.go",
      },
    ],
    sonarIssues: [
      {
        severity: "CRITICAL",
        message: "SQL injection risk",
        component: "apps/api:handler.go",
        line: 42,
      },
    ],
    maxReview: 3,
    maxSonar: 3,
  });

  assert.match(text, /\[ADVISORY\]/);
  assert.match(text, /\[SONAR\]/);
  assert.match(text, /Leak/);
  assert.match(text, /SQL injection/);
});

test("buildMergedRemediationBrief handles empty inputs", () => {
  const text = buildMergedRemediationBrief({
    reviewFindings: [],
    sonarIssues: [],
    maxReview: 2,
    maxSonar: 2,
  });
  assert.match(text, /Top advisory findings/);
  assert.match(text, /- none/);
  assert.match(text, /none returned/);
});
