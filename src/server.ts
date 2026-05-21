import { Router } from "express";
import { healthHandler } from "./modules/health/health.routes.js";
import { providerRouter } from "./modules/provider/profiles.routes.js";
import { scheduleRouter } from "./modules/schedule/schedule.routes.js";
import { runsRouter } from "./modules/runs/runs.routes.js";

export const appRouter = Router();
appRouter.get("/health", healthHandler);
appRouter.use("/api/config/provider-profiles", providerRouter);
appRouter.use("/api/config/schedule", scheduleRouter);
appRouter.use("/api/runs", runsRouter);
