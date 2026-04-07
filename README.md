<div align="center">
  <h1>🌐 b4skills</h1>
  <p><strong>Adaptive English Assessment Platform</strong></p>
  <p>
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-deploy">Deploy</a> •
    <a href="#-environment-variables">Environment</a> •
    <a href="#%EF%B8%8F-architecture">Architecture</a>
  </p>
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="b4skills Banner" width="1200" />
</div>

---

## ✨ Features

| Category | Description |
|---|---|
| **Adaptive Testing** | Item Response Theory (IRT) engine with real-time θ estimation |
| **AI Scoring** | Gemini-powered Speaking & Writing evaluation against CEFR rubrics |
| **Multi-Tenancy** | Organisation-scoped data, custom branding, role-based access |
| **Proctoring** | Camera-based anomaly detection, audit logs, session reviews |
| **Certifications** | Auto-generated CEFR certificates (A1–C2) with PDF export |
| **Analytics** | Cohort reporting, psychometric dashboards, calibration studies |
| **Payments** | Stripe-integrated billing with webhook support |
| **i18n** | Multi-language UI via react-i18next |

---

## ⚡ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [PostgreSQL](https://www.postgresql.org/) ≥ 14 _(or use Docker Compose)_
- A [Gemini API key](https://aistudio.google.com/apikey)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.production.example .env.local
# Fill in DATABASE_URL, GEMINI_API_KEY, etc.
```

### 3. Set up the database

```bash
npx prisma migrate deploy
# or for a fresh dev environment:
npx prisma db push
```

### 4. Run in development mode

```bash
npm run dev
# → http://localhost:3000
```

### Docker Compose (all-in-one)

```bash
docker compose up --build
# PostgreSQL + app at http://localhost:3000
```

---

## 🚀 Deploy

### Render (zero-config)

1. Fork this repository.
2. Create a new **Web Service** on [Render](https://render.com) pointing to your fork.
3. Render auto-detects `render.yaml` and provisions the service + PostgreSQL.
4. Set the secrets in [Environment Variables](#-environment-variables) via the Render dashboard.

### Fly.io

```bash
fly launch           # first time
fly secrets set GEMINI_API_KEY=... STRIPE_SECRET_KEY=...
fly deploy
```

### Docker

```bash
docker build -t b4skills .
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  -e GEMINI_API_KEY=... \
  b4skills
```

### GitHub Actions

| Workflow | Trigger |
|---|---|
| **CI** | Every push / PR to `main` & `develop` |
| **Deploy** | Push to `main` or a `v*.*.*` tag |

Set `RENDER_DEPLOY_HOOK_URL` (or `FLY_API_TOKEN`) in your repository secrets.

---

## 🔐 Environment Variables

Copy `.env.production.example` and fill in all values.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GEMINI_API_KEY` | ✅ | Google Gemini AI API key |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `APP_URL` | ✅ | Public URL of the deployed app |

---

## 🏗️ Architecture

```
Browser / React SPA (Vite + Tailwind)
         │
         ▼ HTTP/REST
Express.js Server (Node 20)
  ├─ RBAC middleware
  ├─ API routes
  └─ Service layer
       ├─ IRT adaptive engine
       ├─ Gemini AI scoring
       ├─ Proctoring & audit
       └─ Stripe billing
         │
         ▼ Prisma ORM
    PostgreSQL
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detailed service descriptions.
See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for step-by-step cloud deployment guides.

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## 🔒 Security

See [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities.

## 📜 License

MIT — see [LICENSE](LICENSE).
