import type { TriggerType, RunType } from "./runs.repository.js";
import { appendRunError, createRun, getRun, hasActiveRun, listRuns, setRunStatus } from "./runs.repository.js";
import { getEffectiveConfig } from "../provider/profiles.service.js";
import { enqueueRun } from "../queue/worker.js";
import { runDailyPipeline, runWeeklyPipeline } from "../data/pipeline.service.js";

export async function triggerRun(runType: RunType, triggerType: TriggerType) {
  const active = await hasActiveRun();
  if (active && triggerType === "manual") {
    const err = new Error("run_in_progress");
    throw err;
  }

  const effectiveConfig = (await getEffectiveConfig()) ?? { provider: null, model: null };
  const run = await createRun(runType, triggerType, effectiveConfig, "queued");
  await enqueueRun(run.id, runType, triggerType);
  return run;
}

export async function markOverlapSkipped(runType: RunType) {
  const run = await createRun(runType, "scheduled", { reason: "overlap" }, "skipped_overlap");
  return run;
}

export async function processRun(runId: number) {
  try {
    await setRunStatus(runId, "running");
    const run = await getRun(runId);
    if (!run) throw new Error("run_not_found");

    if (run.run_type === "weekly") {
      await runWeeklyPipeline(runId);
    } else {
      await runDailyPipeline(runId);
    }
    await setRunStatus(runId, "succeeded");
  } catch (err) {
    const asAny = err as Record<string, unknown>;
    await appendRunError(runId, "run_failed", String(err), {
      runId,
      code: typeof asAny.code === "string" ? asAny.code : null,
      detail: typeof asAny.detail === "string" ? asAny.detail : null,
      context: typeof asAny.context === "object" && asAny.context !== null ? asAny.context : null,
      constraint: typeof asAny.constraint === "string" ? asAny.constraint : null,
      stack: typeof asAny.stack === "string" ? asAny.stack : null
    });
    await setRunStatus(runId, "failed");
  }
}

export { listRuns, getRun, hasActiveRun };
