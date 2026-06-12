/**
 * Pillar C (M4) entry point: read maintenance-queue.json and emit a lane-tagged
 * dispatch artifact for Automations / SDK follow-up. Does not open PRs itself.
 */

import { readFileSync, writeFileSync } from "node:fs";

import { appendStepSummary } from "./github.js";
import {
  buildMaintenanceDispatch,
  renderDispatchMarkdown,
  resolveQueueInputPath,
  type MaintenanceQueueDocument,
} from "./maintenance-dispatch.js";
import { writeRunSummary } from "./run-summary.js";

function agentsEnabled(): boolean {
  return process.env.AGENTS_ENABLED !== "false";
}

async function main(): Promise<void> {
  const startedAt = new Date();
  const trigger = process.env.GITHUB_EVENT_NAME ?? "manual";

  if (!agentsEnabled()) {
    writeRunSummary({
      job: "maintenance-dispatch",
      trigger,
      startedAt,
      outcome: "skipped",
      details: { reason: "AGENTS_ENABLED=false" },
    });
    console.log("Maintenance dispatch skipped: AGENTS_ENABLED=false");
    return;
  }

  try {
    const inputPath = resolveQueueInputPath();
    const queue = JSON.parse(readFileSync(inputPath, "utf8")) as MaintenanceQueueDocument;
    if (queue.schema !== "cursor-maintenance-queue:v1") {
      throw new Error(`Unsupported queue schema: ${String(queue.schema)}`);
    }

    const dispatch = buildMaintenanceDispatch(queue);
    const markdown = renderDispatchMarkdown(dispatch);
    appendStepSummary(markdown);

    const outputPath =
      process.env.CURSOR_DISPATCH_OUTPUT ??
      `${process.env.GITHUB_WORKSPACE ?? process.cwd()}/maintenance-dispatch.json`;
    writeFileSync(outputPath, `${JSON.stringify(dispatch, null, 2)}\n`);

    const lanes = dispatch.items.reduce<Record<string, number>>((acc, item) => {
      acc[item.lane] = (acc[item.lane] ?? 0) + 1;
      return acc;
    }, {});

    writeRunSummary({
      job: "maintenance-dispatch",
      trigger,
      startedAt,
      outcome: "success",
      details: {
        inputPath,
        outputPath,
        itemCount: dispatch.items.length,
        lanes,
        availableSlots: dispatch.availableSlots,
      },
    });

    console.log(
      `Maintenance dispatch built: ${dispatch.items.length} item(s) from ${inputPath} → ${outputPath}`
    );
  } catch (error) {
    writeRunSummary({
      job: "maintenance-dispatch",
      trigger,
      startedAt,
      outcome: "failure",
      details: { error: String(error) },
    });
    throw error;
  }
}

void main();
