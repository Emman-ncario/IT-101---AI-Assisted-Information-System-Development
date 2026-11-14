
import { z } from "zod";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: resolve(currentDir, "../.env"),
});

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1),

  SESSION_SECRET: z.string().min(32),
  REPRESENTATIVE_INVITE_CODE: z.string().min(1),

  FRONTEND_ORIGIN: z
    .string()
    .url()
    .default("http://localhost:5173"),

  TIME_ZONE: z.string().default("Asia/Manila"),

  // Gmail SMTP configuration
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z.enum(["true", "false"]).default("true"),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
});

export const env = envSchema.parse(process.env);
