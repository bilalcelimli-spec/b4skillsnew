# scripts/archive/

One-off fixes, migration patches, seed scripts, and debugging helpers that accumulated at the repo root over time. Moved here to keep the repo root clean.

**Do not add new files here.** If a script is still useful:
- Promote seed scripts to `scripts/seed/`
- Promote maintenance scripts to `scripts/`
- Convert one-off database patches to proper Prisma migrations under `prisma/migrations/`
- Delete anything that is no longer needed

Files here are kept for reference only and are not wired into `package.json` scripts, CI, or the build.
