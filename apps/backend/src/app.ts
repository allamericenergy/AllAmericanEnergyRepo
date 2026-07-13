import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import client from "prom-client";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { env } from "./config/env.js";
import { authRoutes } from "./routes/auth.routes.js";
import { usersRoutes } from "./routes/users.routes.js";
import { crmRoutes } from "./routes/crm.routes.js";
import { reportsRoutes } from "./routes/reports.routes.js";
import { rbacRoutes } from "./routes/rbac.routes.js";

export function createApp() {
  const app = express();
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      console.log(JSON.stringify({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt
      }));
    });
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/metrics", async (_req, res) => {
    res.setHeader("content-type", registry.contentType);
    res.send(await registry.metrics());
  });

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true });
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/rbac", rbacRoutes);
  app.use("/api", crmRoutes);
  app.use("/api/reports", reportsRoutes);

  const openApiPath = [
    path.resolve(process.cwd(), "docs/openapi.yaml"),
    path.resolve(process.cwd(), "../../docs/openapi.yaml")
  ].find((candidate) => fs.existsSync(candidate));
  if (openApiPath) {
    const document = YAML.parse(fs.readFileSync(openApiPath, "utf8"));
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(document));
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error && typeof error === "object" && "issues" in error) {
      return res.status(400).json({ error: "Validation failed", details: error });
    }
    const statusCode = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 500;
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(statusCode).json({ error: message });
  });

  return app;
}
