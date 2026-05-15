import { Agent, CursorAgentError, type McpServerConfig, type SettingSource } from "@cursor/sdk";
import { bootstrapCursorSdkRuntime } from "./sdk-bootstrap.js";

export type ExecutorMode = "prompt" | "stream";

export interface BridgeRequest {
  executorMode: ExecutorMode;
  model?: { id: string };
  cwd: string;
  prompt: string;
  settingSources?: SettingSource[];
  mcpServers?: Record<string, McpServerConfig> | null;
  timeoutMs?: number;
}

export interface BridgeResponseOk {
  ok: true;
  executorMode: ExecutorMode;
  runId?: string;
  status: string;
  result?: string;
  durationMs: number;
  toolEvents?: unknown[];
}

export interface BridgeResponseErr {
  ok: false;
  kind: "startup_error" | "run_error" | "unsupported";
  isRetryable?: boolean;
  message?: string;
  runId?: string | null;
  status?: string;
  result?: string;
  durationMs: number;
}

export type BridgeResponse = BridgeResponseOk | BridgeResponseErr;

function writeJsonStdout(payload: BridgeResponse): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function readJsonStdin(): Promise<BridgeRequest> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("empty stdin");
  }
  return JSON.parse(raw) as BridgeRequest;
}

function resolveModel(req: BridgeRequest): { id: string } {
  const id =
    req.model?.id ??
    process.env.CURSOR_LAB_EXECUTOR_MODEL ??
    "composer-2";
  return { id };
}

async function runPrompt(req: BridgeRequest): Promise<void> {
  const started = Date.now();
  try {
    const result = await Agent.prompt(req.prompt, {
      apiKey: process.env.CURSOR_API_KEY!,
      model: resolveModel(req),
      local: {
        cwd: req.cwd,
        settingSources: (req.settingSources ?? []) as SettingSource[],
      },
      ...(req.mcpServers
        ? { mcpServers: req.mcpServers as Record<string, McpServerConfig> }
        : {}),
    });

    const status = result.status;
    const failed = status === "error" || status === "cancelled";
    const runId = "id" in result ? (result as { id: string }).id : undefined;

    if (failed) {
      writeJsonStdout({
        ok: false,
        kind: "run_error",
        runId,
        status,
        result: result.result,
        durationMs: Date.now() - started,
      });
      return;
    }

    writeJsonStdout({
      ok: true,
      executorMode: "prompt",
      runId,
      status,
      result: result.result,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    if (err instanceof CursorAgentError) {
      writeJsonStdout({
        ok: false,
        kind: "startup_error",
        isRetryable: err.isRetryable,
        message: err.message,
        durationMs: Date.now() - started,
      });
      return;
    }
    throw err;
  }
}

export async function main(): Promise<void> {
  bootstrapCursorSdkRuntime();

  if (!process.env.CURSOR_API_KEY) {
    writeJsonStdout({
      ok: false,
      kind: "startup_error",
      isRetryable: false,
      message: "CURSOR_API_KEY is not set in the bridge process environment",
      durationMs: 0,
    });
    return;
  }

  const req = await readJsonStdin();
  const mode = req.executorMode ?? "prompt";

  if (mode === "stream") {
    writeJsonStdout({
      ok: false,
      kind: "unsupported",
      message:
        "executorMode stream is not implemented yet; use prompt or extend run-agent.ts per cursor.com/docs/evals",
      durationMs: 0,
    });
    return;
  }

  await runPrompt(req);
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  writeJsonStdout({
    ok: false,
    kind: "startup_error",
    isRetryable: false,
    message,
    durationMs: 0,
  });
  process.exitCode = 1;
});
