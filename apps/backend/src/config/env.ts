import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1).default("postgresql://aae:aae_password@localhost:5432/allamericanenergy?schema=public"),
  JWT_ACCESS_SECRET: z.string().min(20).default("local-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(20).default("local-refresh-secret-change-me"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SENTRY_DSN: z.string().optional()
});

export const env = envSchema.parse(process.env);
