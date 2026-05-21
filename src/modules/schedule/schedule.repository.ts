import { pool } from "../../db/client.js";

export type ScheduleConfig = {
  timezone: string;
  daily_enabled: boolean;
  daily_time: string;
  weekdays: string[];
  weekly_enabled: boolean;
  weekly_day: string;
};

export async function getSchedule(): Promise<ScheduleConfig> {
  const { rows } = await pool.query("select * from schedule_configs limit 1");
  if (rows[0]) return rows[0];
  const { rows: inserted } = await pool.query(
    `insert into schedule_configs (timezone,daily_enabled,daily_time,weekdays,weekly_enabled,weekly_day)
     values ('Asia/Jakarta',true,'09:00',array['MON','TUE','WED','THU','FRI'],true,'SUN') returning *`
  );
  return inserted[0];
}

export async function saveSchedule(input: ScheduleConfig): Promise<ScheduleConfig> {
  const { rows } = await pool.query(
    `update schedule_configs
     set timezone=$1,daily_enabled=$2,daily_time=$3,weekdays=$4,weekly_enabled=$5,weekly_day=$6,updated_at=now()
     where id=(select id from schedule_configs limit 1)
     returning *`,
    [input.timezone, input.daily_enabled, input.daily_time, input.weekdays, input.weekly_enabled, input.weekly_day]
  );
  if (rows[0]) return rows[0];
  const { rows: ins } = await pool.query(
    `insert into schedule_configs (timezone,daily_enabled,daily_time,weekdays,weekly_enabled,weekly_day)
     values ($1,$2,$3,$4,$5,$6) returning *`,
    [input.timezone, input.daily_enabled, input.daily_time, input.weekdays, input.weekly_enabled, input.weekly_day]
  );
  return ins[0];
}
