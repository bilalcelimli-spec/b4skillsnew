# Operations Runbook

This runbook covers production rollback and backup/restore drills for `b4skills`.

## 1) Fast Rollback (Application)

Use this when a fresh deploy is unhealthy (high 5xx, auth failures, broken UI).

1. Identify last known-good commit on `main`.
2. Re-deploy that commit through Render (manual redeploy of previous release, or push revert commit).
3. Run smoke checks:
   - `GET /healthz`
   - `GET /readyz`
   - `npm run smoke:auth` against production.
4. Confirm error budget and metrics recovered before closing incident.

### Git-based rollback (safe default)

```bash
git revert <bad_commit_sha>
git push origin main
```

Avoid force-push in incidents.

## 2) Database Backup Drill (Logical)

Run at least monthly.

### Create backup

```bash
pg_dump "$DATABASE_URL" -Fc -f backup-$(date +%F-%H%M).dump
```

Store backup in encrypted storage (S3 bucket / secure vault). Do not keep only local copies.

### Validate backup

1. Create an isolated restore database.
2. Restore dump:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d "$RESTORE_DATABASE_URL" backup-YYYY-MM-DD-HHMM.dump
```

3. Run checks:
   - Schema present
   - Critical tables non-empty (`User`, `Organization`, `Item`)
   - `npm run smoke:auth` against restore environment app

## 3) Disaster Restore Procedure

Use only when production data is corrupted/lost.

1. Freeze writes (maintenance mode).
2. Restore latest valid backup to new DB instance.
3. Re-point app `DATABASE_URL` to restored instance.
4. Run:
   - `npx prisma migrate deploy`
   - `npm run smoke:auth`
   - health endpoints
5. Re-enable traffic.

## 4) Incident Severity Guidance

- **SEV-1**: Complete outage, auth down, data loss.
- **SEV-2**: Partial outage, major feature unusable.
- **SEV-3**: Degraded but service available.

For SEV-1/2, open incident channel immediately and timestamp each action.

## 5) Required Production Secrets

- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_SECRET`
- `APP_URL`
- `CORS_ORIGINS` (must include `APP_URL`)
- `RENDER_DEPLOY_HOOK_URL`
- `AUTH_SMOKE_EMAIL`
- `AUTH_SMOKE_PASSWORD`

Rotate exposed credentials immediately after any leak.
