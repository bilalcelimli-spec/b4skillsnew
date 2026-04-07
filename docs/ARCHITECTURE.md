# LinguAdapt Architecture

## Overview

LinguAdapt is a full-stack Node.js application consisting of:

- **Frontend** — React 19 SPA, bundled by Vite, styled with Tailwind CSS v4.
- **Backend** — Express.js HTTP server running on Node.js 20.
- **Database** — PostgreSQL accessed via Prisma ORM.
- **AI** — Google Gemini API for Speaking & Writing evaluation.
- **Payments** — Stripe (checkout sessions + webhooks).
- **Auth** — Firebase Authentication (client-side), RBAC enforced server-side via `x-user-email` header.

---

## Directory Structure

```
linguadapt/
├── server.ts               # Express entry-point (API + static serving)
├── src/
│   ├── main.tsx            # React root
│   ├── App.tsx             # Route / dashboard switcher
│   ├── components/         # UI components
│   │   ├── admin/          # Admin-only views
│   │   └── ui/             # Primitive design-system components
│   ├── data/               # Static mock data
│   ├── lib/
│   │   ├── assessment-engine/   # IRT engine, estimator, selector, calibration
│   │   ├── scoring/             # Gemini AI scoring services
│   │   ├── proctoring/          # Anomaly detection, proctoring service
│   │   ├── certification/       # Certificate generation
│   │   ├── analytics/           # Analytics aggregation
│   │   ├── enterprise/          # Billing, enterprise features
│   │   ├── ecosystem/           # Webhook delivery
│   │   ├── onboarding/          # Bulk candidate import
│   │   ├── tenant/              # Per-org branding
│   │   ├── payments/            # Stripe integration
│   │   ├── i18n/                # react-i18next config
│   │   └── utils/               # PDF export
│   └── services/
│       └── adaptiveEngine.ts    # Client-side engine wrapper
└── prisma/
    └── schema.prisma       # PostgreSQL schema
```

---

## Key Services

### IRT Adaptive Engine (`src/lib/assessment-engine/`)

| File | Responsibility |
|---|---|
| `engine.ts` | Manages test sessions; orchestrates estimation and selection |
| `estimator.ts` | Expected A Posteriori (EAP) θ estimator |
| `irt.ts` | 3-Parameter Logistic (3PL) IRT probability model |
| `selector.ts` | Maximum Fisher Information item selection |
| `calibration-service.ts` | Pre-test item calibration, study creation, promotion |
| `item-generator.ts` | AI-assisted item generation using Gemini |

### Scoring (`src/lib/scoring/`)

| File | Responsibility |
|---|---|
| `gemini-scoring-service.ts` | Multimodal speaking (audio) evaluation |
| `ai-scoring.ts` | Writing essay scoring |
| `rating-queue.ts` | Human rater queue management |

### Proctoring (`src/lib/proctoring/`)

| File | Responsibility |
|---|---|
| `proctoring-service.ts` | Event ingestion, report generation |
| `anomaly-detection-service.ts` | ML-based anomaly classification |

---

## Data Flow — Adaptive Assessment

```
Candidate starts test
       │
       ▼
POST /api/sessions/launch
  → Creates Test + Session in DB
  → IRT Engine initialises θ = 0
       │
       ▼
GET /api/sessions/:id/next
  → Maximum Information selector picks item
  → Returns item to frontend
       │
       ▼
POST /api/sessions/:id/respond
  → Records response
  → EAP estimator updates θ
  → Checks stopping rule (SE threshold or max items)
       │
       ▼
POST /api/sessions/:id/complete
  → Final θ → CEFR band mapping
  → AI scoring for Speaking/Writing
  → Generates certificate if passing score
```

---

## Multi-Tenancy

Each `Organization` has:
- Its own pool of `Item`s (`organizationId` FK on every item)
- Custom `BrandingConfig` (logo, colours, custom domain)
- Role-scoped users (`SUPER_ADMIN`, `ASSESSMENT_DIRECTOR`, `RATER`, `CANDIDATE`)
- Isolated `TestSession` data

The server enforces tenant boundaries via RBAC middleware that reads the user's `organizationId` from the Prisma `User` record on every authenticated request.

---

## Security Considerations

- All API routes requiring elevated privileges are guarded by `checkRole()` middleware.
- Stripe webhook payloads are verified with `stripe.webhooks.constructEvent()`.
- Secrets are loaded from environment variables only — never hardcoded.
- Production Dockerfile runs the application as a non-root user (`appuser`).
