import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  COLLAB_URL: z
    .string()
    .url()
    .default("http://localhost:1234")
    .transform((url) => url.replace(/\/+$/, "")),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_AUTH_PER_MINUTE: z.coerce.number().int().min(0).default(0),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  TRASH_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  GUEST_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  RUN_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  API_PATH_PREFIX: z.string().regex(/^(\/[\w-]+)*$/).default(""),
  RUN_ACCESS_CODE: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(8).optional()),
  MAX_PROJECTS_PER_USER: z.coerce.number().int().positive().default(100),
  MAX_FILES_PER_PROJECT: z.coerce.number().int().positive().default(2000),
  RUNS_PER_MINUTE: z.coerce.number().int().positive().default(20),
  SMTP_URL: z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional()),
  MAIL_FROM: z.string().default("Collab <no-reply@localhost>"),
  GITHUB_CLIENT_ID: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
  GITHUB_CLIENT_SECRET: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
  API_PUBLIC_URL: z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional()),
  APP_URL: z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional()),
});

const parsed = envSchema.parse(process.env);

const appUrl = (parsed.APP_URL ?? parsed.CORS_ORIGIN.split(",")[0]!.trim()).replace(/\/+$/, "");

export const env = {
  ...parsed,
  APP_URL: appUrl,
  API_PUBLIC_URL: (
    parsed.API_PUBLIC_URL ?? (parsed.API_PATH_PREFIX ? `${appUrl}${parsed.API_PATH_PREFIX}` : `http://localhost:${parsed.PORT}`)
  ).replace(/\/+$/, ""),
};
