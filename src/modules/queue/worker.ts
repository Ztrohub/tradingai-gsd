import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { env } from "../../config/env.js";
import { processRun } from "../runs/runs.service.js";

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const queueName = "ai-trade-runs";
export const runQueue = new Queue(queueName, { connection });

let workerStarted = false;

export async function enqueueRun(runId: number, runType: string, triggerType: string) {
  await runQueue.add("run", { runId, runType, triggerType }, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
}

export function ensureWorker() {
  if (workerStarted) return;
  workerStarted = true;
  const worker = new Worker(
    queueName,
    async (job) => {
      await processRun(job.data.runId);
    },
    { connection, concurrency: 1 }
  );
  worker.on("error", (err) => console.error("worker_error", err));
}
