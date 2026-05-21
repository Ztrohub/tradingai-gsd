import { apiGet, apiPut } from "../lib/api-client.js";

export type ScheduleConfig = {
  timezone: "Asia/Jakarta";
  daily_enabled: boolean;
  daily_time: string;
  weekdays: Array<"MON" | "TUE" | "WED" | "THU" | "FRI">;
  weekly_enabled: boolean;
  weekly_day: "SUN";
};

export async function loadScheduleConfig() {
  return apiGet<ScheduleConfig>("/api/config/schedule");
}

export async function saveScheduleConfig(payload: ScheduleConfig) {
  return apiPut<ScheduleConfig>("/api/config/schedule", payload);
}
