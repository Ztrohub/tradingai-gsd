import { Router } from "express";
import { getRun, listRuns, triggerRun } from "./runs.service.js";

export const runsRouter = Router();

function parsePositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

runsRouter.post("/daily/trigger", async (_req, res) => {
  try {
    const run = await triggerRun("daily", "manual");
    res.status(202).json(run);
  } catch (err) {
    if (String(err).includes("run_in_progress")) {
      res.status(409).json({ code: "run_in_progress", message: "run in progress" });
      return;
    }
    res.status(500).json({ code: "daily_trigger_failed", message: String(err) });
  }
});

runsRouter.post("/weekly/trigger", async (_req, res) => {
  try {
    const run = await triggerRun("weekly", "manual");
    res.status(202).json(run);
  } catch (err) {
    if (String(err).includes("run_in_progress")) {
      res.status(409).json({ code: "run_in_progress", message: "run in progress" });
      return;
    }
    res.status(500).json({ code: "weekly_trigger_failed", message: String(err) });
  }
});

runsRouter.get("/", async (_req, res) => {
  const rows = await listRuns();
  res.json(rows);
});

runsRouter.get("/:id", async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) {
    res.status(400).json({ code: "invalid_id", message: "id must be a positive integer" });
    return;
  }

  const row = await getRun(id);
  if (!row) {
    res.status(404).json({ code: "run_not_found", message: "run not found" });
    return;
  }
  res.json(row);
});
