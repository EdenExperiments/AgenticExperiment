import { appendFileSync } from "node:fs";

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export interface GitHubClientOptions {
  token: string;
  repository: string;
}

export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface PullRequestData {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  user: { login: string };
  base: { ref: string };
  head: { ref: string; sha: string };
}

export interface CodeScanningAlert {
  number: number;
  state: string;
  rule?: { id?: string; severity?: string; description?: string };
  most_recent_instance?: {
    location?: {
      path?: string;
      start_line?: number;
      end_line?: number;
    };
  };
  html_url?: string;
}

export interface DependabotAlert {
  number: number;
  state: string;
  dependency?: { package?: { ecosystem?: string; name?: string } };
  security_advisory?: {
    summary?: string;
    severity?: string;
    cve_id?: string;
  };
  html_url?: string;
}

function parseRepository(repository: string): { owner: string; repo: string } {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`);
  }
  return { owner, repo };
}

export class GitHubClient {
  private readonly token: string;
  private readonly owner: string;
  private readonly repo: string;

  constructor(options: GitHubClientOptions) {
    this.token = options.token;
    const { owner, repo } = parseRepository(options.repository);
    this.owner = owner;
    this.repo = repo;
  }

  async getJson<T>(path: string): Promise<T> {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API request failed (${response.status}) for ${path}: ${errorBody}`);
    }

    return (await response.json()) as T;
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`https://api.github.com${path}`, {
      method: "POST",
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API POST failed (${response.status}) for ${path}: ${errorBody}`);
    }

    return (await response.json()) as T;
  }

  async patchJson<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`https://api.github.com${path}`, {
      method: "PATCH",
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API PATCH failed (${response.status}) for ${path}: ${errorBody}`);
    }

    return (await response.json()) as T;
  }

  async getPullRequest(prNumber: number): Promise<PullRequestData> {
    return this.getJson<PullRequestData>(
      `/repos/${this.owner}/${this.repo}/pulls/${prNumber}`
    );
  }

  async getPullRequestFiles(prNumber: number): Promise<PullRequestFile[]> {
    return this.getJson<PullRequestFile[]>(
      `/repos/${this.owner}/${this.repo}/pulls/${prNumber}/files?per_page=100`
    );
  }

  async listIssueComments(issueNumber: number): Promise<Array<{ id: number; body: string }>> {
    return this.getJson<Array<{ id: number; body: string }>>(
      `/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments?per_page=100`
    );
  }

  async createIssueComment(issueNumber: number, body: string): Promise<void> {
    await this.postJson(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments`, {
      body,
    });
  }

  async updateIssueComment(commentId: number, body: string): Promise<void> {
    await this.patchJson(`/repos/${this.owner}/${this.repo}/issues/comments/${commentId}`, {
      body,
    });
  }

  async upsertIssueComment(
    issueNumber: number,
    marker: string,
    body: string
  ): Promise<void> {
    const comments = await this.listIssueComments(issueNumber);
    const existing = comments.find((comment) => comment.body.includes(marker));
    if (existing) {
      await this.updateIssueComment(existing.id, body);
      return;
    }

    await this.createIssueComment(issueNumber, body);
  }

  async listCodeScanningAlerts(): Promise<CodeScanningAlert[]> {
    return this.getJson<CodeScanningAlert[]>(
      `/repos/${this.owner}/${this.repo}/code-scanning/alerts?state=open&per_page=30`
    );
  }

  async listDependabotAlerts(): Promise<DependabotAlert[]> {
    return this.getJson<DependabotAlert[]>(
      `/repos/${this.owner}/${this.repo}/dependabot/alerts?state=open&per_page=30`
    );
  }
}

export function appendStepSummary(markdown: string): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  const timestamp = new Date().toISOString();
  const payload = `\n## Cursor Agent Output (${timestamp})\n\n${markdown}\n`;
  try {
    appendFileSync(summaryPath, payload, { encoding: "utf8" });
  } catch {
    // no-op fallback when summary write fails
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}\n... [truncated]`;
}
