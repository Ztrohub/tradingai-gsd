import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

dotenvConfig();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AI_ENGINE_URL: z.string().url().default("http://localhost:8080"),
  TZ: z.string().default("Asia/Jakarta"),
  LQ45_UNIVERSE_API_URL: z.string().url().optional(),
  LQ45_UNIVERSE_API_KEY: z.string().optional(),
  TWELVEDATA_API_KEY: z.string().optional(),
  TWELVEDATA_EXCHANGE: z.string().default("XIDX")
});

export const env = schema.parse(process.env);
