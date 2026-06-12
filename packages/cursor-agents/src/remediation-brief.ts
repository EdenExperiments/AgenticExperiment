export interface ReviewFindingBriefInput {
  id: string;
  severity: string;
  confidence: string;
  title: string;
  location: string;
}

export interface SonarIssueBriefInput {
  severity: string;
  message: string;
  component?: string;
  line?: number;
}

/**
 * Deterministic merge of optional advisory findings and Sonar sample issues for planner/executor prompts.
 * Sonar is primary; advisory rows are optional overlap hints.
 */
export function buildMergedRemediationBrief(input: {
  reviewFindings: ReviewFindingBriefInput[];
  sonarIssues: SonarIssueBriefInput[];
  maxReview: number;
  maxSonar: number;
}): string {
  const reviewLines = input.reviewFindings.slice(0, input.maxReview).map((f) => {
    return `- [ADVISORY] ${f.id} ${f.severity}/${f.confidence}: ${f.title} @ ${f.location}`;
  });
  const sonarLines = input.sonarIssues.slice(0, input.maxSonar).map((issue) => {
    const loc =
      issue.component && issue.line !== undefined && issue.line !== null
        ? `${issue.component}:${issue.line}`
        : issue.component ?? "unknown-location";
    return `- [SONAR] ${issue.severity}: ${issue.message} (${loc})`;
  });

  return [
    "Merged remediation signals (deterministic; use with PR patch + scanner gates):",
    "",
    "Top advisory findings (optional):",
    reviewLines.length > 0 ? reviewLines.join("\n") : "- none",
    "",
    "Top SonarCloud issues (sample):",
    sonarLines.length > 0 ? sonarLines.join("\n") : "- none returned",
    "",
    "Planning rule: prefer fixes backed by Sonar issues and failing checks; use advisory overlap as a tie-breaker only.",
  ].join("\n");
}
