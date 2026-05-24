import { Router } from "express";
import { healthHandler } from "./modules/health/health.routes.js";
import { providerRouter } from "./modules/provider/profiles.routes.js";
import { scheduleRouter } from "./modules/schedule/schedule.routes.js";
import { runsRouter } from "./modules/runs/runs.routes.js";
import { dataRouter } from "./modules/data/data.routes.js";
import { ensureSchemaOnce } from "./db/client.js";

export const appRouter = Router();
appRouter.get("/health", healthHandler);
appRouter.use("/api", async (_req, _res, next) => {
  try {
    await ensureSchemaOnce();
    next();
  } catch (error) {
    next(error);
  }
});
appRouter.use("/api/config/provider-profiles", providerRouter);
appRouter.use("/api/config/schedule", scheduleRouter);
appRouter.use("/api/runs", runsRouter);
appRouter.use("/api", dataRouter);
