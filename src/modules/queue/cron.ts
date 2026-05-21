import cron from "node-cron";
import { env } from "../../config/env.js";
import { readSchedule } from "../schedule/schedule.service.js";
import { hasActiveRun, markOverlapSkipped, triggerRun } from "../runs/runs.service.js";
import { ensureWorker } from "./worker.js";

let schedulerStarted = false;

async function runScheduled(type: "daily" | "weekly") {
  const active = await hasActiveRun();
  if (active) {
    await markOverlapSkipped(type);
    return;
  }
  await triggerRun(type, "scheduled");
}

export function ensureScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  ensureWorker();

  cron.schedule("0 9 * * 1-5", async () => {
    const schedule = await readSchedule();
    if (!schedule.daily_enabled) return;
    await runScheduled("daily");
  }, { timezone: env.TZ });

  cron.schedule("0 9 * * 0", async () => {
    const schedule = await readSchedule();
    if (!schedule.weekly_enabled) return;
    await runScheduled("weekly");
  }, { timezone: env.TZ });
}
