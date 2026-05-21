import { Router } from "express";
import { getRun, listRuns, triggerRun } from "./runs.service.js";

export const runsRouter = Router();

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
  const row = await getRun(Number(req.params.id));
  if (!row) {
    res.status(404).json({ code: "run_not_found", message: "run not found" });
    return;
  }
  res.json(row);
});
