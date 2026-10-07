# Operations Runbook

This runbook covers production rollback and backup/restore drills for `b4skills`.

## 1) Fast Rollback (Application)

Use this when a fresh deploy is unhealthy (high 5xx, auth failures, broken UI).

1. Identify last known-good commit on `main`.
2. Re-deploy that commit through Render (manual redeploy of previous release, or push revert commit).
3. Run smoke checks:
   - `GET /api/healthz/live`
   - `GET /api/healthz/ready`
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

## 6) Assessment and certificate evidence

A submitted diagnostic with unresolved or insufficient grades remains `SCORING`. Human review refreshes the fixed six-skill diagnostic blueprint from persisted responses; each skill requires five scored items. Pending, missing, pretest and disputed grades do not count toward certification. Security holds remain in force after grading.

Certificate generation requires a completed, verified report with complete evidence and valid ability estimates. Identity and grades come from the database, and expiry is based on assessment completion. Issuance does not mark a report verified. Public verification rechecks current evidence and expiry without issuing certificates. Reports may exist without an issued certificate.

Signed certificates require a stable `CERT_SIGNING_KEY_PEM` in production. Without it, signed issuance returns 503; ephemeral keys are limited to development/tests. Signed payloads are persisted with the score report and cover nested skill scores. An on-chain status remains unknown unless independently verified. Keep the signing key stable across restarts; key rotation requires a verification-key migration strategy.

Population percentiles are unavailable without a validated reference population. The platform's default CEFR cut scores require empirical standard setting; passing software checks does not establish psychometric validity. Historical reports with incomplete evidence are withheld from certification and final progress displays rather than inferred or automatically backfilled.

## 7) Leaving and resuming an assessment

The in-exam exit control returns to the candidate dashboard after confirmation; it does not submit or complete the assessment, pause its timer, or create a new attempt. Submitted responses remain persisted. Unsubmitted answers/recordings may be lost; writing drafts use the existing per-session/per-item browser session storage. The dashboard refreshes history and links in-progress attempts back to their original session ID. The server still enforces the original deadline and current session status.

In-exam Analytics and `/api/sessions/:id/insights` use the same persisted progress contract as session status: section order/limits, answered and eligible scored counts, and pending counts. The UI refreshes on opening, after task delivery, and every ten seconds while open. In-progress estimates are provisional; no CEFR level or precision is invented before graded evidence exists. A failed status request shows a retry action without blocking task delivery.
