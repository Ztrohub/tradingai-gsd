import express from "express";
import { env } from "./config/env.js";
import { appRouter } from "./server.js";
import { ensureScheduler } from "./modules/queue/cron.js";

const app = express();
app.use(express.json());
app.use(appRouter);

ensureScheduler();

app.listen(env.PORT, () => {
  console.log(`control-plane listening on :${env.PORT}`);
});
