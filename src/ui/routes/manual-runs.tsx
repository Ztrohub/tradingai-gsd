import { apiPost } from "../lib/api-client.js";

export async function triggerDailyRun() {
  return apiPost("/api/runs/daily/trigger");
}

export async function triggerWeeklyRun() {
  return apiPost("/api/runs/weekly/trigger");
}

export function runInProgressHelperText() {
  return "Run in progress";
}
