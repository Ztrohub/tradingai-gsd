import cron from "node-cron";
import { env } from "../../config/env.js";
import { readSchedule } from "../schedule/schedule.service.js";
import { hasActiveRun, markOverlapSkipped, triggerRun } from "../runs/runs.service.js";
import { ensureWorker } from "./worker.js";

let schedulerStarted = false;
const weekdayToCron: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6
};

async function runScheduled(type: "daily" | "weekly") {
  const active = await hasActiveRun();
  if (active) {
    await markOverlapSkipped(type);
    return;
  }
  await triggerRun(type, "scheduled");
}

function parseDailyCron(time: string, weekdays: string[]) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return "0 9 * * 1-5";
  }

  const dayNumbers = weekdays
    .map((day) => weekdayToCron[day])
    .filter((day): day is number => Number.isInteger(day))
    .sort((a, b) => a - b);
  const dayField = dayNumbers.length > 0 ? dayNumbers.join(",") : "1-5";
  return `${minute} ${hour} * * ${dayField}`;
}

function parseWeeklyCron(time: string, weeklyDay: string) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const day = weekdayToCron[weeklyDay];
  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59 ||
    !Number.isInteger(day)
  ) {
    return "0 9 * * 0";
  }
  return `${minute} ${hour} * * ${day}`;
}

export function ensureScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  ensureWorker();

  void readSchedule().then((schedule) => {
    const dailyExpression = parseDailyCron(schedule.daily_time, schedule.weekdays);
    const weeklyExpression = parseWeeklyCron(schedule.daily_time, schedule.weekly_day);

    cron.schedule(
      dailyExpression,
      async () => {
        const latest = await readSchedule();
        if (!latest.daily_enabled) return;
        await runScheduled("daily");
      },
      { timezone: env.TZ }
    );

    cron.schedule(
      weeklyExpression,
      async () => {
        const latest = await readSchedule();
        if (!latest.weekly_enabled) return;
        await runScheduled("weekly");
      },
      { timezone: env.TZ }
    );
  });
}
