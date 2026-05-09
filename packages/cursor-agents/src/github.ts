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
  head: {
    ref: string;
    sha: string;
    repo?: {
      full_name?: string;
      fork?: boolean;
    };
  };
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

export interface IssueCommentData {
  id: number;
  body: string;
  in_reply_to_id?: number | null;
}

export interface CheckRunData {
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string | null;
}

export class GitHubApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly method: string;

  constructor(method: string, path: string, status: number, body: string) {
    super(`GitHub API ${method} failed (${status}) for ${path}: ${body}`);
    this.name = "GitHubApiError";
    this.status = status;
    this.path = path;
    this.method = method;
  }
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
      throw new GitHubApiError("GET", path, response.status, errorBody);
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
      throw new GitHubApiError("POST", path, response.status, errorBody);
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
      throw new GitHubApiError("PATCH", path, response.status, errorBody);
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
    return this.getJson<
      Array<{
        id: number;
        body: string;
        created_at?: string;
        updated_at?: string;
        user?: { login?: string };
      }>
    >(
      `/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments?per_page=100`
    );
  }

  async listIssueLabels(issueNumber: number): Promise<Array<{ name: string }>> {
    return this.getJson<Array<{ name: string }>>(
      `/repos/${this.owner}/${this.repo}/issues/${issueNumber}/labels?per_page=100`
    );
  }

  async createIssueComment(issueNumber: number, body: string): Promise<void> {
    await this.postJson(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments`, {
      body,
    });
  }

  async addIssueLabels(issueNumber: number, labels: string[]): Promise<void> {
    if (labels.length === 0) {
      return;
    }
    await this.postJson(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}/labels`, {
      labels,
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
  ): Promise<boolean> {
    const comments = await this.listIssueComments(issueNumber);
    const existing = comments.find((comment) => comment.body.includes(marker));
    if (existing) {
      await this.updateIssueComment(existing.id, body);
      return true;
    }

    await this.createIssueComment(issueNumber, body);
    return true;
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

  async getIssueComment(commentId: number): Promise<IssueCommentData> {
    return this.getJson<IssueCommentData>(
      `/repos/${this.owner}/${this.repo}/issues/comments/${commentId}`
    );
  }

  async listCheckRunsForCommit(sha: string): Promise<CheckRunData[]> {
    const runs: CheckRunData[] = [];

    for (let page = 1; page <= 10; page += 1) {
      const data = await this.getJson<{
        check_runs: Array<{
          name: string;
          status: string;
          conclusion: string | null;
          html_url?: string | null;
        }>;
      }>(`/repos/${this.owner}/${this.repo}/commits/${sha}/check-runs?per_page=100&page=${page}`);

      for (const run of data.check_runs) {
        runs.push({
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          html_url: run.html_url ?? null,
        });
      }

      if (data.check_runs.length < 100) {
        break;
      }
    }

    return runs;
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

export function isNonFatalCommentPermissionError(error: unknown): boolean {
  if (!(error instanceof GitHubApiError)) {
    return false;
  }

  // Fork PRs or read-only GITHUB_TOKEN contexts can block issue comment writes.
  if (error.status !== 403) {
    return false;
  }

  return error.message.includes("Resource not accessible by integration");
}
