import { pool } from "../../db/client.js";

export type RunType = "daily" | "weekly";
export type TriggerType = "manual" | "scheduled";
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "skipped_overlap" | "canceled";

export async function createRun(runType: RunType, triggerType: TriggerType, effectiveConfig: unknown, status: RunStatus = "queued") {
  const { rows } = await pool.query(
    `insert into job_runs (run_type, trigger_type, status, effective_config) values ($1,$2,$3,$4) returning *`,
    [runType, triggerType, status, effectiveConfig]
  );
  return rows[0];
}

export async function setRunStatus(id: number, status: RunStatus) {
  const started = status === "running" ? "started_at=coalesce(started_at, now())," : "";
  const finished = ["succeeded", "failed", "skipped_overlap", "canceled"].includes(status)
    ? ", finished_at=now(), duration_ms=extract(epoch from (now()-coalesce(started_at, now()))) * 1000"
    : "";
  await pool.query(`update job_runs set ${started} status=$2${finished} where id=$1`, [id, status]);
}

export async function appendRunError(id: number, code: string, message: string, context: Record<string, unknown>) {
  await pool.query(
    `insert into job_run_errors (run_id, code, message, context) values ($1,$2,$3,$4)`,
    [id, code, message, JSON.stringify(context)]
  );
}

export async function hasActiveRun(): Promise<boolean> {
  const { rows } = await pool.query("select 1 from job_runs where status in ('queued','running') limit 1");
  return Boolean(rows[0]);
}

export async function listRuns() {
  const { rows } = await pool.query(
    `select r.*, e.code as error_code, e.message as error_message
     from job_runs r
     left join lateral (
       select code, message from job_run_errors where run_id=r.id order by id desc limit 1
     ) e on true
     order by r.id desc limit 100`
  );
  return rows;
}

export async function getRun(id: number) {
  const { rows } = await pool.query(
    `select r.*, coalesce(json_agg(e.*) filter (where e.id is not null), '[]') as errors
     from job_runs r
     left join job_run_errors e on e.run_id=r.id
     where r.id=$1
     group by r.id`,
    [id]
  );
  return rows[0] ?? null;
}
