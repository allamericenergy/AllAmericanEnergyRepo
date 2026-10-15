# Deployment Runbook

## Staging

1. Build containers in CI.
2. Push images to the registry.
3. Apply database migrations.
4. Deploy backend and frontend.
5. Run smoke tests: login, create contact, create deal, view dashboard.

## Production Promotion

1. Confirm staging release health for at least one business cycle.
2. Take a database backup.
3. Apply migrations with rollback notes ready.
4. Deploy backend first, then frontend.
5. Monitor error rate, latency, and database saturation.

## Required Secrets

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SENTRY_DSN`
- Container registry credentials

## Rollback

Roll back the application image first. Database rollback requires a tested down migration or restore from backup when schema changes are not backward compatible.
