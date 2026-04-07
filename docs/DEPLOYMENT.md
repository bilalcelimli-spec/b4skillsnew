# Deployment Guide

## Prerequisites

- Node.js ≥ 20 (for local builds)
- Docker ≥ 24 (for container builds)
- A PostgreSQL 14+ instance
- Environment variables from `.env.production.example`

---

## Option 1 — Render (Recommended)

Render auto-provisions the Node.js service **and** PostgreSQL using `render.yaml`.

### Steps

1. Push the repository to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com) → **New → Blueprint**.
3. Connect your GitHub repo. Render detects `render.yaml` automatically.
4. In **Environment > Secret Files**, set:
   - `GEMINI_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
5. Click **Apply**. Render will:
   - Create a PostgreSQL database.
   - Run `npm ci && npm run build:all && npx prisma generate`.
   - Start with `npm start`.
   - Inject `DATABASE_URL` automatically.

### Auto-Deploy on push

Enabled by default for the `main` branch. Configure the deploy hook URL as `RENDER_DEPLOY_HOOK_URL` in your GitHub repository secrets to trigger deploys from GitHub Actions.

---

## Option 2 — Fly.io

```bash
# Install flyctl
brew install flyctl

# Authenticate
fly auth login

# Launch (first time only — creates fly.toml)
fly launch

# Set secrets
fly secrets set \
  GEMINI_API_KEY=<key> \
  DATABASE_URL=<pg-connection-string> \
  STRIPE_SECRET_KEY=<key> \
  STRIPE_WEBHOOK_SECRET=<secret> \
  APP_URL=https://<your-app>.fly.dev

# Create a managed Postgres cluster (optional)
fly postgres create --name linguadapt-db
fly postgres attach linguadapt-db

# Deploy
fly deploy
```

---

## Option 3 — Docker / Self-Hosted

### Build and run

```bash
docker build -t linguadapt:latest .

docker run -d \
  --name linguadapt \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://..." \
  -e GEMINI_API_KEY="..." \
  -e STRIPE_SECRET_KEY="..." \
  -e STRIPE_WEBHOOK_SECRET="..." \
  -e APP_URL="https://your-domain.com" \
  linguadapt:latest
```

### Docker Compose (app + database together)

```bash
cp .env.production.example .env.local
# Edit .env.local with real values
docker compose up -d --build
```

---

## Database Migrations

In all environments, run migrations **before** starting the application:

```bash
# Using Prisma CLI
npx prisma migrate deploy

# Via npm script
npm run db:migrate
```

If you are starting with an empty database for the first time:

```bash
npx prisma db push      # applies schema without migration history
```

---

## Health Check

The server exposes a health endpoint:

```
GET /api/health
→ 200 { status: "ok", timestamp: "..." }
```

This is used by Docker, Fly.io checks, and Render health monitors.

---

## Nginx Reverse Proxy (optional)

If you run LinguAdapt behind Nginx, here is a minimal config:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## CI/CD via GitHub Actions

| Secret Name | Where to get it |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio |
| `RENDER_DEPLOY_HOOK_URL` | Render dashboard → Settings → Deploy Hook |
| `FLY_API_TOKEN` | `fly auth token` |

Add these in your GitHub repository **Settings → Secrets → Actions**.
