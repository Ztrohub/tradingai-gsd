import type { TriggerType, RunType } from "./runs.repository.js";
import { appendRunError, createRun, getRun, hasActiveRun, listRuns, setRunStatus } from "./runs.repository.js";
import { getEffectiveConfig } from "../provider/profiles.service.js";
import { enqueueRun } from "../queue/worker.js";

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
    await new Promise((resolve) => setTimeout(resolve, 20));
    await setRunStatus(runId, "succeeded");
  } catch (err) {
    await appendRunError(runId, "run_failed", String(err), { runId });
    await setRunStatus(runId, "failed");
  }
}

export { listRuns, getRun, hasActiveRun };
