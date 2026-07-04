# AllAmericanEnergy CRM

AllAmericanEnergy is a multi-tenant CRM scaffold for an energy company. It includes a TypeScript API, React SPA, PostgreSQL schema, RBAC, seed data, Docker local development, CI, and production handoff documentation.

## Tech Decisions

| Area | Choice |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query |
| Backend | Node.js, TypeScript, Express, Prisma |
| Database | PostgreSQL |
| Auth | JWT access tokens, hashed refresh tokens, bcrypt password hashing |
| Testing | Vitest, Supertest, Playwright |
| Observability | Pino logs, Prometheus metrics endpoint, Sentry hook |
| Deployment | Docker Compose for local/staging, GitHub Actions CI |

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:4000  
OpenAPI: http://localhost:4000/docs

Local development is configured for the local SQL Server connection in `.env.example`.

For a quick in-memory demo with no database, set `DEMO_MODE=true`. Demo login:

- Email: `superadmin@allamericanenergy.local`
- Password: `ChangeMe123!`

For database-backed development, keep `DEMO_MODE=false`, configure `DATABASE_URL`, run Prisma migrations, then run `npm run seed`.

## Branch Strategy

- `main`: production-ready releases.
- `develop`: integration branch.
- `feature/*`: scoped feature work merged into `develop` by pull request.

## MVP Milestones

| Milestone | Scope | Estimate | Acceptance Criteria |
| --- | --- | --- | --- |
| 0. Setup and design | Repo, architecture docs, Docker, CI | 2-3 days | App boots locally and CI runs |
| 1. Core backend and auth | Prisma schema, JWT, refresh tokens, RBAC | 3-5 days | Login, refresh, logout, protected routes pass tests |
| 2. CRM APIs | Orgs, users, companies, contacts, deals, tasks, notes, audit logs | 5-7 days | CRUD endpoints enforce tenant and role boundaries |
| 3. Frontend shell | Login, protected app layout, role-aware nav | 4-6 days | Dashboards render by role |
| 4. CRM UI and reports | Entity lists/forms, pipeline and activity reports | 5-7 days | Admin/member flows work end to end |
| 5. Hardening | Tests, docs, monitoring, deployment runbook | 5-7 days | Staging deploy and handoff checklist complete |

## Permission Matrix

| Role | Users | Orgs | Companies | Contacts | Deals | Tasks | Notes | Reports | Audit Logs | Export |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| superadmin | CRUD | CRUD | CRUD all | CRUD all | CRUD all | CRUD all | CRUD all | all | read all | yes |
| admin | CRUD in org | read/update own org | CRUD | CRUD | CRUD | CRUD | CRUD | org | read org | yes |
| member | read | read own org | read | CRUD | CRUD | CRUD assigned/org | CRUD own | limited | no | no |
| user | read own | read own org | read assigned | create/read/update assigned | read assigned | CRUD own/assigned | CRUD own | personal | no | no |

## Key Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run seed
docker compose up --build
```

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/openapi.yaml)
- [Deployment Runbook](docs/deployment.md)
- [Maintenance Checklist](docs/maintenance.md)
