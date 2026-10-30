#!/usr/bin/env bash
# Starts the real backend against a disposable local database, never the normal .env.
# Needs PostgreSQL 16 (brew install postgresql@16) and a valid locale (LC_ALL=en_US.UTF-8).
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"
set -euo pipefail
cd "$(dirname "$0")/../../../.."
e2e_root="${B4SKILLS_E2E_ROOT:-/tmp/b4skills-apple-e2e}"
pg_bin="${B4SKILLS_PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
e2e_port="${B4SKILLS_E2E_PORT:-3001}"
case "$e2e_port" in 3001|3003) ;; *) echo 'Only local test ports 3001 and 3003 are allowed.'; exit 1 ;; esac
if lsof -nP "-iTCP:$e2e_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $e2e_port is already in use. No existing process was stopped."
  exit 1
fi
export B4SKILLS_E2E_PORT="$e2e_port"
mkdir -p "$e2e_root"
if [[ ! -f "$e2e_root/pgdata/PG_VERSION" ]]; then
  "$pg_bin/initdb" -D "$e2e_root/pgdata" -A trust --no-locale -E UTF8 > "$e2e_root/initdb.log" 2>&1
fi
if ! "$pg_bin/pg_ctl" -D "$e2e_root/pgdata" status >/dev/null 2>&1; then
  "$pg_bin/pg_ctl" -D "$e2e_root/pgdata" -l "$e2e_root/postgres.log" -o "-h 127.0.0.1 -p 55432 -k $e2e_root" start
fi
if ! "$pg_bin/psql" -h 127.0.0.1 -p 55432 -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='b4skills_apple_e2e'" | grep -q 1; then
  "$pg_bin/createdb" -h 127.0.0.1 -p 55432 b4skills_apple_e2e
fi
export B4SKILLS_E2E_ROOT="$e2e_root"
node --input-type=module <<'JS'
import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
const file = `${process.env.B4SKILLS_E2E_ROOT}/backend.env`;
if (!fs.existsSync(file)) {
 const vars={DATABASE_URL:`postgresql://${process.env.USER}@127.0.0.1:55432/b4skills_apple_e2e`,NODE_ENV:'test',PORT:'3001',APP_URL:'http://localhost:3001',JWT_SECRET:crypto.randomBytes(32).toString('hex'),REFRESH_SECRET:crypto.randomBytes(32).toString('hex'),LOG_LEVEL:'warn',GEMINI_API_KEY:'',GOOGLE_API_KEY:'',STRIPE_SECRET_KEY:'',REDIS_URL:'',ADMIN_SEED_EMAIL:'',ADMIN_SEED_PASSWORD:'',SENTRY_DSN:'',OTEL_SDK_DISABLED:'true'};
 fs.writeFileSync(file,Object.entries(vars).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600});
}
const vars=dotenv.parse(fs.readFileSync(file));
const target=new URL(vars.DATABASE_URL);
if(target.hostname!=='127.0.0.1'||target.port!=='55432'||target.pathname!=='/b4skills_apple_e2e'||vars.NODE_ENV!=='test'||vars.PORT!=='3001') {
 throw new Error('Refusing an E2E configuration outside the dedicated local database and port.');
}
const port=process.env.B4SKILLS_E2E_PORT;
if(!['3001','3003'].includes(port)) throw new Error('Invalid local test port');
vars.PORT=port; vars.APP_URL=`http://localhost:${port}`;
fs.writeFileSync(`${process.env.B4SKILLS_E2E_ROOT}/backend-${port}.env`,Object.entries(vars).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600});
JS
export DOTENV_CONFIG_PATH="$e2e_root/backend-$e2e_port.env"
export DOTENV_CONFIG_OVERRIDE=true
export AWS_SECRET_ARN="" OPENAI_API_KEY="" ANTHROPIC_API_KEY="" RESEND_API_KEY="" SUPABASE_SECRET_KEY="" SUPABASE_SERVICE_ROLE_KEY=""
node -r dotenv/config node_modules/prisma/build/index.js migrate deploy
node -r dotenv/config node_modules/tsx/dist/cli.mjs scripts/seed-ci-item-bank.ts
node -r dotenv/config native/react-native/scripts/e2e/provision-e2e.mjs
if [[ ! -f "$e2e_root/speech.m4a" ]]; then
  say -v Samantha -o "$e2e_root/speech.aiff" 'This is synthetic English speech for the B4Skills integration test. I enjoy learning languages and reading books. Every morning I practise English so I can communicate clearly with friends. Last week I visited a library and found an interesting story about travel.'
  afconvert -f m4af -d aac -b 64000 "$e2e_root/speech.aiff" "$e2e_root/speech.m4a"
fi
mkdir -p public/audio
cp "$e2e_root/speech.m4a" public/audio/apple-e2e-fixture.m4a
if lsof -nP "-iTCP:$e2e_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $e2e_port is already in use. No existing process was stopped."
  exit 1
fi
exec node -r dotenv/config node_modules/tsx/dist/cli.mjs server.ts
