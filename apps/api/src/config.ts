import { z } from "zod";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: resolve(currentDir, "../tests/.env"),
});

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1),

  SESSION_SECRET: z.string().min(32),

  FRONTEND_ORIGIN: z
    .string()
    .url()
    .default("http://localhost:5173"),

  TIME_ZONE: z.string().default("Asia/Manila"),
});

export const env = envSchema.parse(process.env);