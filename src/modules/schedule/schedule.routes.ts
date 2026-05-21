import { Router } from "express";
import { readSchedule, updateSchedule } from "./schedule.service.js";

export const scheduleRouter = Router();

scheduleRouter.get("/", async (_req, res) => {
  const cfg = await readSchedule();
  res.json(cfg);
});

scheduleRouter.put("/", async (req, res) => {
  try {
    const cfg = await updateSchedule(req.body);
    res.json(cfg);
  } catch (err) {
    res.status(400).json({ code: "invalid_schedule", message: String(err) });
  }
});
