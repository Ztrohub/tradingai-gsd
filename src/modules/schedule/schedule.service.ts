import { z } from "zod";
import { getSchedule, saveSchedule } from "./schedule.repository.js";

const scheduleSchema = z.object({
  timezone: z.literal("Asia/Jakarta"),
  daily_enabled: z.boolean(),
  daily_time: z.string().regex(/^\d{2}:\d{2}$/),
  weekdays: z.array(z.enum(["MON", "TUE", "WED", "THU", "FRI"])) ,
  weekly_enabled: z.boolean(),
  weekly_day: z.literal("SUN")
});

export async function readSchedule() {
  return getSchedule();
}

export async function updateSchedule(body: unknown) {
  const parsed = scheduleSchema.parse(body);
  return saveSchedule(parsed);
}
