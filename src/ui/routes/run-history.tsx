import { apiGet } from "../lib/api-client.js";

export type RunRecord = {
  id: number;
  run_type: "daily" | "weekly";
  trigger_type: "manual" | "scheduled";
  status: "queued" | "running" | "succeeded" | "failed" | "skipped_overlap" | "canceled";
  created_at: string;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  error_code?: string;
  error_message?: string;
};

export async function loadRunHistory() {
  return apiGet<RunRecord[]>("/api/runs");
}

export async function loadRunDetails(id: number) {
  return apiGet(`/api/runs/${id}`);
}
