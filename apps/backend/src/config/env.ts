import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), override: false });

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  DEMO_MODE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  DATABASE_URL: z.string().min(1).default("sqlserver://LAPTOP-L4K0EB02:1433;database=GreenEnergyDB;user=sa;password=admin;encrypt=true;trustServerCertificate=true"),
  JWT_ACCESS_SECRET: z.string().min(20).default("local-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(20).default("local-refresh-secret-change-me"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SENTRY_DSN: z.string().optional(),
  SHAREPOINT_TENANT_ID: z.string().optional(),
  SHAREPOINT_CLIENT_ID: z.string().optional(),
  SHAREPOINT_CLIENT_SECRET: z.string().optional(),
  SHAREPOINT_SITE_ID: z.string().optional(),
  SHAREPOINT_DRIVE_ID: z.string().optional(),
  SHAREPOINT_COMPANY_ROOT_PATH: z.string().default(""),
  SHAREPOINT_COMPANY_SUBFOLDERS: z.string().default(""),
  SHAREPOINT_COMPANY_SUBFOLDERS_UTILITYBILLS: z.string().default("")
});

export const env = envSchema.parse(process.env);
