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
  /** The sync server's HTTP address as seen from the API; restoring a file version goes through it. */
  COLLAB_URL: z
    .string()
    .url()
    .default("http://localhost:1234")
    .transform((url) => url.replace(/\/+$/, "")),
  /** Requests per minute per address; 0 turns the limit off (the default for development). */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(0).default(0),
  /** The stricter limit for sign-in, registration and guest entry; 0 means "same as the general one". */
  RATE_LIMIT_AUTH_PER_MINUTE: z.coerce.number().int().min(0).default(0),
  /** Behind a proxy or tunnel the real client address is in X-Forwarded-For. */
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  /** How many days a deleted file stays in the trash before it is deleted for good. */
  TRASH_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  /** How many days a guest account lives once it is in no project and its session has ended. */
  GUEST_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  /** "false" turns off running visitors' code (no queue, no runner needed). */
  RUN_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  /** Where the API is mounted when a proxy serves it under a path, such as "/api"; the docs page needs it for its files. */
  API_PATH_PREFIX: z.string().regex(/^(\/[\w-]+)*$/).default(""),
  /** With a code set, running code and the terminal work only for people who entered it. */
  RUN_ACCESS_CODE: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(8).optional()),
  /** smtp://user:password@host:587 (or smtps://…:465). Without it, emails are only written to the log in development. */
  SMTP_URL: z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional()),
  MAIL_FROM: z.string().default("Collab <no-reply@localhost>"),
  /** Address of the web app, for links in emails. Defaults to the first CORS origin. */
  APP_URL: z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional()),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  APP_URL: (parsed.APP_URL ?? parsed.CORS_ORIGIN.split(",")[0]!.trim()).replace(/\/+$/, ""),
};
