# Maintenance Checklist

- Rotate JWT secrets and service credentials on the approved schedule.
- Verify daily database backups and perform quarterly restore tests.
- Review audit logs for administrative actions.
- Patch base container images monthly.
- Review dependency vulnerabilities weekly.
- Track auth error rates, 5xx rates, p95 latency, and database CPU/IO.
- Rehearse incident response and production rollback twice per year.
