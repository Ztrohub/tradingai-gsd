import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { ensureSchema } from "./db/client.js";
import { appRouter } from "./server.js";
import { ensureScheduler } from "./modules/queue/cron.js";

async function main() {
  await ensureSchema();

  const app = express();
  app.use(express.json());
  app.use(appRouter);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uiDir = path.resolve(__dirname, "ui/public");

  app.use("/app", express.static(uiDir));
  app.get("/", (_req, res) => {
    res.redirect("/app");
  });

  ensureScheduler();

  app.listen(env.PORT, () => {
    console.log(`control-plane listening on :${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("startup_failed", err);
  process.exit(1);
});
