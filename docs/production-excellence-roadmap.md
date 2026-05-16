# Production Excellence Roadmap — Tüm Boyutlarda 9.0+ Hedefi

> **Mevcut Durum:** 7.35 / 10 — "Production-Ready with Known Gaps"  
> **Hedef:** Her boyut ≥ 9.0 → Genel ortalama ≥ 9.2 / 10  
> **Süre:** 14 hafta, 9 sprint  
> **Son güncelleme:** 2026-05-16

---

## Başlangıç Skoru Tablosu ve Hedefler

| Boyut | Ağırlık | Şimdi | Hedef | Gap |
|-------|---------|-------|-------|-----|
| API Input Validation | 10% | 5.0 | 9.5 | **+4.5** 🔴 |
| Scalability | 5% | 6.0 | 9.0 | **+3.0** 🔴 |
| Test Coverage | 15% | 7.0 | 9.2 | **+2.2** 🟡 |
| Database | 10% | 7.0 | 9.2 | **+2.2** 🟡 |
| Observability | 10% | 7.0 | 9.5 | **+2.5** 🟡 |
| Deployment Readiness | 5% | 7.0 | 9.2 | **+2.2** 🟡 |
| Error Handling | 10% | 8.0 | 9.5 | **+1.5** 🟢 |
| Security | 20% | 8.0 | 9.5 | **+1.5** 🟢 |
| Psychometric Validity | 15% | 9.0 | 9.5 | **+0.5** 🟢 |

**Ağırlıklı hedef:** 9.35 / 10

---

## Sprint Genel Takvim

| Sprint | Hafta | Boyut | Öngörülen Kazanç |
|--------|-------|-------|-----------------|
| S1 | 1–2 | API Input Validation | 5.0 → 9.5 |
| S2 | 2–3 | Database & Analytics N+1 | 7.0 → 9.2 |
| S3 | 3–4 | Security Hardening | 8.0 → 9.5 |
| S4 | 4–5 | Error Handling — Centralized | 8.0 → 9.5 |
| S5 | 5–6 | Observability & APM | 7.0 → 9.5 |
| S6 | 6–8 | Test Coverage | 7.0 → 9.2 |
| S7 | 8–10 | Scalability — Queue & Aggregations | 6.0 → 9.0 |
| S8 | 10–12 | Deployment — Staging & Smoke Tests | 7.0 → 9.2 |
| S9 | 12–14 | Psychometric Validity — KL-info + LP | 9.0 → 9.5 |

---

## Sprint 1 — API Input Validation (5.0 → 9.5)

**Kök Sorun:** 120 rotadan yalnızca 7 tanesi `validate()` middleware kullanıyor. Ancak
iyi haber: `src/lib/security/schemas/` altında neredeyse tüm rotaların Zod şemaları
**zaten yazılmış**, sadece rotaya bağlanmamış.

### Analiz

```
/api/sessions/launch       → Schemas.Sessions.SessionLaunchBody  ✅ YAZILMIŞ
/api/sessions/:id/respond  → Schemas.Sessions.SessionRespondBody  ✅ YAZILMIŞ
/api/items (POST)          → Schemas.Items.CreateItemBody         ✅ YAZILMIŞ
/api/items/:id (PUT)       → Schemas.Items.UpdateItemBody         ✅ YAZILMIŞ
/api/items/generate        → Schemas.Items.GenerateItemBody       ✅ YAZILMIŞ
/api/items/generate/bulk   → Schemas.Items.BulkGenerateItemsBody  ✅ YAZILMIŞ
/api/rating/tasks/:id/submit → Schemas.Items.RatingSubmitBody     ✅ YAZILMIŞ
/api/codes/validate        → Schemas.Codes.ValidateCodeBody       ✅ YAZILMIŞ
/api/codes/redeem          → Schemas.Codes.RedeemCodeBody         ✅ YAZILMIŞ
```

### Task S1.1 — Kritik Rota Validasyonlarını Bağla

**Dosya:** `server.ts`

Aşağıdaki değişiklikler yapılacak (her biri tek satır ekleme):

```typescript
// ÖNCE:
app.post("/api/sessions/launch", sessionLaunchLimiter, async (req, res) => {

// SONRA:
app.post("/api/sessions/launch",
  sessionLaunchLimiter,
  validate({ body: Schemas.Sessions.SessionLaunchBody }),
  async (req, res) => {
```

**Uygulanacak rotalar ve şemaları:**

| Rota | Method | Şema |
|------|--------|------|
| `/api/sessions/launch` | POST | `Schemas.Sessions.SessionLaunchBody` |
| `/api/sessions/:id/respond` | POST | `Schemas.Sessions.SessionRespondBody` |
| `/api/items` | POST | `Schemas.Items.CreateItemBody` |
| `/api/items/:id` | PUT | `Schemas.Items.UpdateItemBody` |
| `/api/items/generate` | POST | `Schemas.Items.GenerateItemBody` |
| `/api/items/generate/bulk` | POST | `Schemas.Items.BulkGenerateItemsBody` |
| `/api/items/preview` | POST | `Schemas.Items.PreviewItemBody` |
| `/api/items/:id/assets` | POST | `Schemas.Items.AssetUploadBody` |
| `/api/rating/tasks/:id/submit` | POST | `Schemas.Items.RatingSubmitBody` |
| `/api/rating/tasks/:id/submit-second` | POST | `Schemas.Items.RatingSubmitBody` |
| `/api/codes/validate` | POST | `Schemas.Codes.ValidateCodeBody` |
| `/api/codes/redeem` | POST | `Schemas.Codes.RedeemCodeBody` |
| `/api/codes/generate` | POST | `Schemas.Codes.GenerateCodesBody` |
| `/api/admin/items/retire` | POST | (inline: `z.object({ itemIds, reason })`) |

### Task S1.2 — Eksik Şemaları Yaz

Birkaç rota için şema henüz yok. `src/lib/security/schemas/` altında eklenecekler:

**`src/lib/security/schemas/rating.ts`** (YENİ):
```typescript
import { z } from "zod";
import { CuidLike } from "./common.js";

export const RatingClaimBody = z.object({
  raterId: CuidLike.optional(),
}).strict();

export const RatingSubmitBodyFull = z.object({
  score: z.number().min(0).max(100),
  rubricScores: z.record(z.string(), z.number().min(0).max(100)).optional(),
  comments: z.string().max(10_000).optional(),
  flags: z.array(z.string().max(100)).max(20).optional(),
  timeSpentMs: z.number().int().nonnegative().max(4 * 60 * 60 * 1000).optional(),
}).strict();
```

**`src/lib/security/schemas/analytics.ts`** (YENİ):
```typescript
import { z } from "zod";

export const CohortQueryParams = z.object({
  organizationId: z.string().max(128).optional(),
  skill: z.enum(["READING","LISTENING","WRITING","SPEAKING","GRAMMAR","VOCABULARY","ALL"])
    .default("ALL"),
  cefrLevel: z.enum(["PRE_A1","A1","A2","B1","B2","C1","C2","ALL"]).default("ALL"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
}).strict();

export const OnboardingBulkBody = z.object({
  candidates: z.array(z.object({
    email: z.string().email().max(254),
    name: z.string().max(200).optional(),
    organizationId: z.string().max(128),
    role: z.enum(["CANDIDATE", "INSTRUCTOR", "CONTENT_ADMIN", "INST_ADMIN"]).default("CANDIDATE"),
  })).min(1).max(500),
}).strict();
```

**`src/lib/security/schemas/index.ts`** güncelleme:
```typescript
export * as Rating from "./rating.js";
export * as Analytics from "./analytics.js";
```

### Task S1.3 — Query Param Validasyonu

GET rotaları için query param doğrulaması yok. `validate()` middleware'i
`query` ve `params` seçeneklerini de desteklediğinden:

```typescript
// /api/analytics/cohort
app.get("/api/analytics/cohort",
  checkRole([...]),
  validate({ query: Schemas.Analytics.CohortQueryParams }),
  async (req, res) => {
    const { skill, cefrLevel, from, to, limit } = req.query as any;
    // ✅ tip güvenli, doğrulanmış
```

**Etkilenen GET rotaları:**
- `/api/analytics/cohort` → `Analytics.CohortQueryParams`
- `/api/admin/calibration/snapshots` → inline Zod (`window`, `months`, `skill`)
- `/api/admin/calibration/qwk` → inline Zod (`window`, `skill`)
- `/api/items/inventory` → inline (pagination params)

### Task S1.4 — Merkezi Validasyon Hata Formatı

`src/lib/security/validate.ts` güncelle — hata mesajları tutarlı olsun:

```typescript
// MEVCUT: ham Zod hata mesajları dönüyor
// YENİ: yapılandırılmış hata formatı

export function validate(schemas: { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body)   req.body   = schemas.body.parse(req.body);
      if (schemas.query)  req.query  = schemas.query.parse(req.query) as any;
      if (schemas.params) req.params = schemas.params.parse(req.params) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Request validation failed",
          fields: err.errors.map(e => ({
            path: e.path.join("."),
            message: e.message,
            code: e.code,
          })),
        });
      }
      next(err);
    }
  };
}
```

### Task S1.5 — Testler

**`src/lib/security/__tests__/validation-schemas.test.ts`** (YENİ ~60 test):
```typescript
describe("SessionRespondBody", () => {
  it("rejects itemId longer than 128 chars", () => {
    expect(() => SessionRespondBody.parse({ itemId: "x".repeat(129), response: "ok" }))
      .toThrow();
  });
  it("accepts valid response types", () => {
    expect(() => SessionRespondBody.parse({ itemId: "cuid123", response: "text" }))
      .not.toThrow();
  });
  // ...
});
```

### S1 Başarı Kriterleri
- [ ] `validate()` tüm POST/PUT/PATCH rotalarında mevcut
- [ ] Hatalı body ile POST → HTTP 400 + `error: "VALIDATION_ERROR"` + `fields` array
- [ ] Tüm mevcut testler geçiyor
- [ ] `S1` branch'i PR review'dan geçiyor

---

## Sprint 2 — Database & Analytics N+1 (7.0 → 9.2)

**Kök Sorun:**
1. `computeSkillMetrics`: 6 skill × tam tablo `session.findMany` = 6 sorgu, her biri tüm session'ları çekiyor
2. `computePretestPipelineMetrics`: N pretest item × `response.count` = N sorgu (N+1 antipattern)
3. Eksik composite index'ler analytics sorguları için

### Task S2.1 — `computeSkillMetrics` Yeniden Yazımı

**Dosya:** `src/lib/analytics/live-metrics-engine.ts`

**Mevcut sorun:** 6 × `session.findMany()` + 6 × `response.findMany()` = 12 tam tablo taraması.

**Çözüm:** Tek `groupBy` + tek `response.groupBy` ile tüm skill metriklerini çek:

```typescript
private static async computeSkillMetrics(orgId: string): Promise<SkillMetrics[]> {
  // 1. Tüm session'ları TEK sorguda çek (tüm skill iterasyonları için)
  const allSessions = await prisma.session.findMany({
    where: { organizationId: orgId },
    select: { id: true, theta: true, cefrLevel: true, responsesCount: true, metadata: true },
  });

  // 2. Skill-bazlı ortalama score TEK groupBy ile
  const responseAggregates = await prisma.response.groupBy({
    by: ["sessionId"],
    where: {
      sessionId: { in: allSessions.map(s => s.id) },
      score: { not: null },
    },
    _avg: { score: true },
    _count: { id: true },
  });
  const avgScoreBySession = new Map(responseAggregates.map(r => [r.sessionId, r._avg.score]));

  // 3. Skill bazında in-memory aggregation (DB sorgusu yok)
  const SKILLS = ["READING","LISTENING","WRITING","SPEAKING","GRAMMAR","VOCABULARY"] as const;
  return SKILLS.map(skill => {
    const skillThetas = allSessions.map(s => {
      const profiles = (s.metadata as any)?.skillProfiles || {};
      return profiles[skill] ?? s.theta;
    }).filter(t => Number.isFinite(t));

    if (skillThetas.length === 0) {
      return { skill, candidates: 0, avgTheta: 0, stdTheta: 0, avgResponses: 0, byCSfR: {} };
    }

    const avgTheta = skillThetas.reduce((a,b) => a+b, 0) / skillThetas.length;
    const variance = skillThetas.reduce((a,t) => a + (t-avgTheta)**2, 0) / skillThetas.length;

    // byCSfR in-memory group
    const byCefr: Record<string, any> = {};
    for (const cefr of CEFR_LEVELS) {
      const group = allSessions.filter(s => s.cefrLevel === cefr);
      if (group.length === 0) continue;
      const groupThetas = group.map(s => {
        const p = (s.metadata as any)?.skillProfiles || {};
        return p[skill] ?? s.theta;
      }).filter(t => Number.isFinite(t));
      const scores = group
        .map(s => avgScoreBySession.get(s.id))
        .filter((v): v is number => v !== null && v !== undefined);
      byCefr[cefr] = {
        count: group.length,
        avgTheta: groupThetas.length > 0 ? groupThetas.reduce((a,b)=>a+b,0)/groupThetas.length : 0,
        avgScore: scores.length > 0 ? scores.reduce((a,b)=>a+b,0)/scores.length : 0,
      };
    }

    return {
      skill,
      candidates: allSessions.length,
      avgTheta,
      stdTheta: Math.sqrt(variance),
      avgResponses: allSessions.reduce((a,s)=>a+s.responsesCount,0)/allSessions.length,
      byCSfR: byCefr,
    };
  });
}
```

**Sonuç:** 12+ sorgu → **3 sorgu** (session, response groupBy, response aggregate).

### Task S2.2 — `computePretestPipelineMetrics` N+1 Düzeltmesi

**Dosya:** `src/lib/analytics/live-metrics-engine.ts`

**Mevcut sorun:** `pretestItems.map(item => prisma.response.count(...))` = N sorgu.

```typescript
private static async computePretestPipelineMetrics(orgId: string): Promise<PretestPipelineMetrics> {
  const pretestItems = await prisma.item.findMany({
    where: { organizationId: orgId, status: "PRETEST" },
    select: { id: true, createdAt: true },
  });

  if (pretestItems.length === 0) {
    return { totalPretestItems: 0, readyForCalibration: 0, readyForPromotion: 0,
             promotedThisWeek: 0, avgPromotionTime: 0 };
  }

  // TEK groupBy ile tüm pretest response sayıları
  const responseCounts = await prisma.response.groupBy({
    by: ["itemId"],
    where: {
      itemId: { in: pretestItems.map(i => i.id) },
      isPretest: true,
    },
    _count: { id: true },
  });
  const countMap = new Map(responseCounts.map(r => [r.itemId, r._count.id]));

  const readyForCalibration = pretestItems.filter(i => (countMap.get(i.id) ?? 0) >= 30).length;
  const readyForPromotion   = pretestItems.filter(i => (countMap.get(i.id) ?? 0) >= 50).length;

  // Promoted this week — tek count sorgusu
  const [promotedThisWeek, recentlyPromoted] = await Promise.all([
    prisma.item.count({
      where: { organizationId: orgId, status: "ACTIVE",
               updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.item.findMany({
      where: { organizationId: orgId, status: "ACTIVE",
               updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true, updatedAt: true },
    }),
  ]);

  const avgPromotionTime = recentlyPromoted.length > 0
    ? recentlyPromoted.reduce((a, i) =>
        a + (i.updatedAt.getTime() - i.createdAt.getTime()), 0)
      / recentlyPromoted.length / (24 * 60 * 60 * 1000)
    : 0;

  return { totalPretestItems: pretestItems.length, readyForCalibration,
           readyForPromotion, promotedThisWeek, avgPromotionTime };
}
```

**Sonuç:** N+1 → **3 sorgu** sabit.

### Task S2.3 — Analytics Cache Katmanı

**Dosya:** `src/lib/analytics/live-metrics-engine.ts` (ekleme)

`computeSnapshot` pahalı (3–10 saniye). Önbellekleme gerekli:

```typescript
// Sınıf başına TTL-based in-memory cache (Redis yokken de çalışır)
private static _cache = new Map<string, { snapshot: LiveAnalyticsSnapshot; expiresAt: number }>();
private static CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

static async computeSnapshot(organizationId: string): Promise<LiveAnalyticsSnapshot> {
  const cached = this._cache.get(organizationId);
  if (cached && cached.expiresAt > Date.now()) return cached.snapshot;

  const snapshot = await this._computeFresh(organizationId); // mevcut mantık
  this._cache.set(organizationId, { snapshot, expiresAt: Date.now() + this.CACHE_TTL_MS });
  return snapshot;
}

/** Cache'i zorla temizle — yeni calibration sonrası çağrılır */
static invalidateCache(organizationId: string): void {
  this._cache.delete(organizationId);
}
```

Redis varsa `KEYS analytics:snapshot:*` pattern'i ile persistent cache.

### Task S2.4 — Eksik Composite Index'ler

**Dosya:** `prisma/schema.prisma` + yeni migration

Yavaş olan analytics sorguları için eksik index'ler:

```prisma
// Session model'e ekle
@@index([organizationId, status, cefrLevel])     // computeSkillMetrics
@@index([organizationId, theta])                  // theta distribution queries

// Response model'e ekle
@@index([sessionId, isPretest, score])            // computePretestPipeline groupBy
@@index([itemId, isPretest])                      // pretest response counts

// Item model'e ekle (zaten bazıları var)
@@index([organizationId, status, updatedAt])      // recently promoted
@@index([organizationId, status, retirementScore]) // zaten var ✅
```

```bash
# Migration oluştur
npx prisma migrate dev --name add_analytics_indexes
```

### Task S2.5 — Testleri Güncelle

`live-metrics-engine.test.ts` testleri yeni groupBy mock pattern'i ile güncelle:

```typescript
// Eski: response.findMany mock
// Yeni: response.groupBy mock
(prisma.response.groupBy as any).mockResolvedValue([
  { sessionId: "s1", _avg: { score: 0.75 }, _count: { id: 15 } },
  { sessionId: "s2", _avg: { score: 0.80 }, _count: { id: 20 } },
]);
```

### S2 Başarı Kriterleri
- [ ] `computeSnapshot` toplam sorgu sayısı ≤ 10 (önceden: 50+)
- [ ] Büyük org (10k session) için `computeSnapshot` < 2 saniye
- [ ] Tüm `live-metrics-engine.test.ts` geçiyor
- [ ] Yeni migration çalışıyor (`npx prisma migrate deploy`)

---

## Sprint 3 — Security Hardening (8.0 → 9.5)

**Mevcut güçlü noktalar (korunacak):**
- Global API limiter: 500 req/15min ✅
- CSRF: Origin/Referer kontrolü ✅
- Cookie: httpOnly, secure, SameSite=lax ✅
- JWT: prod'da zorunlu ✅
- 2FA: TOTP ✅

**Kalan boşluklar:**
1. JWT revocation yok (logout cookie siler ama token hâlâ geçerli)
2. Role cache 5 dakika stale kalabilir (role revoke edilince bile)
3. Auth eventi audit log yok (başarılı/başarısız login kaydı yok)
4. 2FA challenge brute-force: IP bazlı limiter var ama per-user yok

### Task S3.1 — JWT Kara Listesi (Access Token Revocation)

**Problem:** Kullanıcı logout olduğunda access token (15 dakika ömürlü) hâlâ
geçerli. Eğer token ele geçirildiyse, 15 dakikaya kadar çalışır.

**Çözüm — Redis Token Blacklist:**

```typescript
// src/lib/auth/token-blacklist.ts (YENİ)
import type { Redis } from "ioredis";

export class TokenBlacklist {
  constructor(private readonly redis: Redis | null) {}

  /** Access token'ı blacklist'e ekle. TTL = token'ın kalan ömrü. */
  async revoke(jti: string, expiresAt: number): Promise<void> {
    if (!this.redis) return; // Redis yoksa skip (dev modda kabul edilebilir)
    const ttlSec = Math.max(0, Math.ceil((expiresAt * 1000 - Date.now()) / 1000));
    if (ttlSec > 0) {
      await this.redis.set(`blacklist:jti:${jti}`, "1", "EX", ttlSec);
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
    if (!this.redis) return false;
    return (await this.redis.exists(`blacklist:jti:${jti}`)) === 1;
  }
}
```

JWT payload'a `jti` (unique ID) eklenir:

```typescript
// login sırasında:
const jti = crypto.randomUUID();
const accessToken = jwt.sign({ userId: user.id, jti }, JWT_SECRET, { expiresIn: '15m' });

// authMiddleware'de:
const decoded: any = jwt.verify(token, JWT_SECRET);
if (decoded.jti && await tokenBlacklist.isRevoked(decoded.jti)) {
  return res.status(401).json({ error: 'Token has been revoked' });
}

// logout'ta:
if (decoded.jti) {
  await tokenBlacklist.revoke(decoded.jti, decoded.exp);
}
```

**Redis yoksa:** Fallback olarak in-memory Set (tek instance için yeterli),
Redis varsa distributed.

### Task S3.2 — Role Cache Invalidation

**Problem:** `checkRole` 5 dakika boyunca stale role kullanır.

**Mevcut kod** (`server.ts` ~line 803):
```typescript
_roleCache.set(decoded.userId, { role, organizationId, expiresAt: now + ROLE_CACHE_TTL_MS });
```

**Çözüm 1** — TTL'i 1 dakikaya düşür (basit):
```typescript
const ROLE_CACHE_TTL_MS = 60 * 1000; // 5 dk → 1 dk
```

**Çözüm 2** — Role değiştiğinde cache'i zorla temizle:
```typescript
// src/lib/auth/role-cache.ts (YENİ — singleton)
export const roleCache = {
  _store: new Map<string, { role: string; organizationId: string | null; expiresAt: number }>(),
  invalidate(userId: string) { this._store.delete(userId); },
  invalidateAll() { this._store.clear(); },
};

// Her kullanıcı rolü güncellemesinden sonra:
roleCache.invalidate(userId);
```

Şu anda `app.put("/api/users/:id/role", ...)` gibi rotalar var; bunlara
`roleCache.invalidate(userId)` ekle.

### Task S3.3 — Auth Audit Log

**Problem:** Başarılı/başarısız login denemeleri DB'de kayıt altına alınmıyor.

**Yeni tablo:** `prisma/schema.prisma`:
```prisma
model AuthAuditLog {
  id          String   @id @default(cuid())
  userId      String?  // null = kullanıcı bulunamadı
  email       String   // Denenen email
  event       String   // LOGIN_SUCCESS | LOGIN_FAIL | LOGOUT | 2FA_SUCCESS | 2FA_FAIL | PW_RESET
  ipAddress   String?
  userAgent   String?
  metadata    Json?    // { failReason, twoFactorUsed, etc. }
  createdAt   DateTime @default(now())

  @@index([email, createdAt])
  @@index([userId, createdAt])
  @@index([event, createdAt])
}
```

Login handler'lara ekle:
```typescript
// Başarılı login:
await prisma.authAuditLog.create({
  data: { userId: user.id, email: user.email, event: "LOGIN_SUCCESS",
          ipAddress: req.ip, userAgent: req.headers["user-agent"] }
}).catch(() => {}); // audit log hatası login'i engellemez

// Başarısız login:
await prisma.authAuditLog.create({
  data: { email, event: "LOGIN_FAIL",
          ipAddress: req.ip,
          metadata: { reason: "INVALID_PASSWORD" } }
}).catch(() => {});
```

### Task S3.4 — Per-User 2FA Brute-Force Koruması

**Problem:** 2FA challenge mevcut IP limiter'ı bypass edilebilir (farklı IP'ler).

```typescript
// src/lib/auth/two-factor-guard.ts (YENİ)
const _attempts = new Map<string, { count: number; resetAt: number }>();

export function check2faAttempt(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = _attempts.get(userId);
  if (entry && entry.resetAt > now) {
    if (entry.count >= 5) return { allowed: false, remaining: 0 };
    entry.count++;
    return { allowed: true, remaining: 5 - entry.count };
  }
  _attempts.set(userId, { count: 1, resetAt: now + 15 * 60 * 1000 });
  return { allowed: true, remaining: 4 };
}

export function reset2faAttempts(userId: string): void {
  _attempts.delete(userId);
}
```

### Task S3.5 — Security Headers Audit

Helmet'te eksik olan / güçlendirilebilecek başlıklar:

```typescript
// src/lib/security/http-security.ts güncelleme
permissions: {
  policy: {
    camera: [],         // kamera erişimi yok (konuşma testinde sadece user gesture ile)
    microphone: [],     // mikrofon erişimi yok (aynı)
    geolocation: [],
    payment: [],
    "accelerometer": [],
  }
},
referrerPolicy: { policy: "strict-origin-when-cross-origin" },
```

### Task S3.6 — Güvenlik Testleri

**`src/lib/security/__tests__/token-blacklist.test.ts`** (YENİ ~20 test):
```typescript
describe("TokenBlacklist", () => {
  it("marks a jti as revoked and rejects it", async () => { ... });
  it("auto-expires entries after TTL", async () => { ... });
  it("returns false when Redis is unavailable", async () => { ... });
});
```

### S3 Başarı Kriterleri
- [ ] Logout sonrası access token HTTP 401 döner
- [ ] Role revoke edilince 60 saniye içinde tüm requestler engellenir
- [ ] Her login olayı `AuthAuditLog`'a yazılır
- [ ] 5 hatalı 2FA denemesinden sonra hesap kilitlenir (15 dk)

---

## Sprint 4 — Error Handling: Merkezi Middleware (8.0 → 9.5)

**Problem:** 244 ayrı `try/catch` bloğu, her biri kendi 500 formatını üretiyor.
Tutarsız hata yanıtları, izleme zorluğu, Sentry entegrasyon boşlukları.

### Task S4.1 — Merkezi Error Middleware

**`src/lib/errors/app-error.ts`** (YENİ):
```typescript
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "DB_ERROR"
  | "INTERNAL_ERROR"
  | "INTEGRITY_REJECTED"
  | "SESSION_NOT_FOUND"
  | "SESSION_ALREADY_COMPLETED"
  | "ITEM_NOT_FOUND"
  | "CALIBRATION_FAILED"
  | "INVALID_AUDIO";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  static notFound(resource: string): AppError {
    return new AppError("NOT_FOUND", `${resource} not found`, 404);
  }
  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError("UNAUTHORIZED", message, 401);
  }
  static forbidden(message = "Forbidden"): AppError {
    return new AppError("FORBIDDEN", message, 403);
  }
  static validation(message: string, details?: unknown): AppError {
    return new AppError("VALIDATION_ERROR", message, 400, details);
  }
  static aiUnavailable(): AppError {
    return new AppError("AI_UNAVAILABLE", "AI service temporarily unavailable", 503);
  }
}
```

**`src/lib/errors/error-handler.ts`** (YENİ):
```typescript
import type { Request, Response, NextFunction } from "express";
import { AppError } from "./app-error.js";
import { captureException } from "../observability/sentry.js";
import { logger } from "../observability/logger.js";

const isProd = process.env.NODE_ENV === "production";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Yapılandırılmış AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: (req as any).requestId }, "AppError 5xx");
      captureException(err, { requestId: (req as any).requestId });
    }
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      requestId: (req as any).requestId,
      ...(err.details && !isProd ? { details: err.details } : {}),
    });
    return;
  }

  // Prisma hatası
  if ((err as any)?.name === "PrismaClientKnownRequestError") {
    const pe = err as any;
    if (pe.code === "P2025") {
      res.status(404).json({ error: "NOT_FOUND", message: "Record not found", requestId: (req as any).requestId });
      return;
    }
    if (pe.code === "P2002") {
      res.status(409).json({ error: "CONFLICT", message: "Unique constraint violation", requestId: (req as any).requestId });
      return;
    }
  }

  // Bilinmeyen hata
  logger.error({ err, requestId: (req as any).requestId, path: req.path }, "Unhandled error");
  captureException(err, { requestId: (req as any).requestId, path: req.path });

  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    requestId: (req as any).requestId,
    ...(isProd ? {} : { stack: (err as any)?.stack }),
  });
}
```

**`server.ts`** son satıra ekle:
```typescript
// TÜM route tanımlamalarından SONRA
app.use(errorHandler);
```

### Task S4.2 — Route'larda try/catch Sadeleştirme

Her route şu kalıba geçer:
```typescript
// ÖNCE:
app.post("/api/sessions/:id/respond", async (req, res) => {
  try {
    const result = await AssessmentService.processResponse(...);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// SONRA:
app.post("/api/sessions/:id/respond", async (req, res, next) => {
  try {
    const result = await AssessmentService.processResponse(...);
    res.json(result);
  } catch (err) {
    next(err); // merkezi handler'a yönlendir
  }
});
```

**Öncelikli rotalar** (kritik iş mantığı):
- `/api/sessions/launch`, `/api/sessions/:id/respond`
- `/api/items/generate`, `/api/items/generate/bulk`
- `/api/calibration/*`
- `/api/scoring/*`

### Task S4.3 — Request ID Middleware

Her isteğe izlenebilir bir ID ekle:

```typescript
// server.ts — route tanımlamalarından ÖNCE
app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] as string
    || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});
```

Bu ID Sentry, Pino ve hata yanıtlarında ortak kullanılır.

### Task S4.4 — Testler

**`src/lib/errors/__tests__/app-error.test.ts`** (YENİ ~25 test):
```typescript
it("notFound factory generates correct code and status", () => {
  const err = AppError.notFound("Session");
  expect(err.statusCode).toBe(404);
  expect(err.code).toBe("NOT_FOUND");
  expect(err.message).toContain("Session");
});

it("error handler maps Prisma P2025 to 404", async () => {
  const prismaErr = Object.assign(new Error("Not found"), {
    name: "PrismaClientKnownRequestError", code: "P2025"
  });
  // ... supertest integration test
});
```

### S4 Başarı Kriterleri
- [ ] Tüm HTTP hata yanıtları `{ error, message, requestId }` formatında
- [ ] Prisma P2025 → 404, P2002 → 409 otomatik
- [ ] Her 5xx Sentry'e gönderiliyor
- [ ] `X-Request-Id` header her yanıtta mevcut

---

## Sprint 5 — Observability & APM (7.0 → 9.5)

**Problem:** p95/p99 latency ve HTTP 5xx oranı ölçülemiyor. APM olmadan SLO
target'larının yarısı "unknown" kalıyor.

### Task S5.1 — Request Timing Middleware

**`src/lib/observability/request-timing.ts`** (YENİ):
```typescript
import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";
import { metrics } from "./metrics.js"; // S5.2'de oluşturulacak

export function requestTimingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startHrTime = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startHrTime) / 1_000_000;
    const route = req.route?.path ?? req.path;
    const method = req.method;
    const status = res.statusCode;

    // Pino structured log (her istek)
    logger.info({
      type: "http_request",
      method,
      route,
      status,
      durationMs: Math.round(durationMs),
      requestId: (req as any).requestId,
      userId: (req as any).user?.id,
    }, `${method} ${route} ${status} ${Math.round(durationMs)}ms`);

    // Prometheus histogram (S5.2)
    metrics.httpRequestDuration.observe(
      { method, route, status_code: String(status) },
      durationMs / 1000
    );

    // 5xx sayacı
    if (status >= 500) {
      metrics.httpErrors.inc({ method, route, status_code: String(status) });
    }
  });

  next();
}
```

### Task S5.2 — Prometheus Metrics Endpoint

**`src/lib/observability/metrics.ts`** (YENİ):
```typescript
import { Registry, Counter, Histogram, Gauge } from "prom-client";

export const registry = new Registry();

export const metrics = {
  httpRequestDuration: new Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  }),

  httpErrors: new Counter({
    name: "http_errors_total",
    help: "Total HTTP 5xx errors",
    labelNames: ["method", "route", "status_code"],
    registers: [registry],
  }),

  aiScoringDuration: new Histogram({
    name: "ai_scoring_duration_seconds",
    help: "Gemini scoring call duration",
    labelNames: ["skill", "model", "pass"],
    buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
    registers: [registry],
  }),

  aiCircuitState: new Gauge({
    name: "ai_circuit_breaker_state",
    help: "Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)",
    labelNames: ["name"],
    registers: [registry],
  }),

  activeSessionsGauge: new Gauge({
    name: "active_sessions_total",
    help: "Currently active assessment sessions",
    registers: [registry],
  }),

  scoringQueueDepth: new Gauge({
    name: "scoring_queue_depth",
    help: "Number of items waiting in the async scoring queue",
    registers: [registry],
  }),

  personFitFlagRate: new Gauge({
    name: "person_fit_flag_rate",
    help: "Rolling person-fit aberrance flag rate (last 1000 sessions)",
    registers: [registry],
  }),
};
```

**`server.ts`**'e route ekle:
```typescript
// İç network'e (ya da INTERNAL_API_SECRET ile) açık
app.get("/metrics",
  checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
  async (_req, res) => {
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  }
);
```

### Task S5.3 — SLO Monitor Güçlendirmesi

**`src/lib/observability/slo-monitor.ts`** güncelleme:

Mevcut SLO'lara eklenecekler:

```typescript
// Yeni SLO: API p95 latency
{
  name: "api_p95_latency",
  description: "API p95 latency ≤ 500ms",
  target: 0.500, // seconds
  windowDays: 7,
  compute: async () => {
    // Pino log'larından veya Prometheus'tan
    // Redis'te rolling p95 hesapla
  }
},

// Yeni SLO: AI scoring availability
{
  name: "ai_scoring_availability",
  description: "AI scoring success rate ≥ 99%",
  target: 0.99,
  compute: async () => {
    const [total, failed] = await Promise.all([
      prisma.response.count({ where: { createdAt: { gte: windowStart } } }),
      prisma.response.count({
        where: { createdAt: { gte: windowStart }, scoreSource: "ai_unavailable" }
      }),
    ]);
    return total > 0 ? (total - failed) / total : null;
  }
},

// Yeni SLO: Person-fit flag rate
{
  name: "person_fit_quality",
  description: "Person-fit aberrance flag rate ≤ 5%",
  target: 0.05,
  compute: async () => { ... }
},
```

### Task S5.4 — Structured Performance Profiling

Ağır psikometrik hesaplamalar için:

```typescript
// src/lib/observability/perf-trace.ts (YENİ)
export async function traceAsync<T>(
  name: string,
  labels: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    const result = await fn();
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.debug({ type: "perf_trace", name, labels, durationMs: Math.round(ms) });
    // metrics histogram'a kaydet
    return result;
  } catch (err) {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.warn({ type: "perf_trace_error", name, labels, durationMs: Math.round(ms), err });
    throw err;
  }
}

// Kullanım:
const result = await traceAsync("finalizeSession", { sessionId }, () =>
  AssessmentService.finalizeSession(sessionId)
);
```

### S5 Başarı Kriterleri
- [ ] `GET /metrics` → valid Prometheus format, tüm metrikler doluyor
- [ ] Her HTTP isteği Pino'ya `durationMs` ile yazılıyor
- [ ] `npm run slo:report` çalıştırıldığında p95 latency raporda görünüyor
- [ ] AI circuit breaker durumu Prometheus'ta real-time izlenebilir

---

## Sprint 6 — Test Coverage (7.0 → 9.2)

**Mevcut durum:**
- Kapsam: 5 dizin (assessment-engine, psychometrics, cefr, ai, scoring)
- Eksik dizinler: analytics, selection, language-skills, observability
- Threshold: 75/78/65/76 → hedef: 85/88/75/86
- Eksik test dosyaları: server.ts API rotaları, live-metrics-engine mantığı

### Task S6.1 — Coverage Scope Genişletme

**`vitest.config.ts`** güncelleme:
```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "html", "lcov", "json-summary"],
  include: [
    "src/lib/assessment-engine/**/*.ts",
    "src/lib/psychometrics/**/*.ts",
    "src/lib/cefr/**/*.ts",
    "src/lib/ai/**/*.ts",
    "src/lib/scoring/**/*.ts",
    "src/lib/analytics/**/*.ts",       // YENİ
    "src/lib/selection/**/*.ts",       // YENİ
    "src/lib/language-skills/**/*.ts", // YENİ
    "src/lib/observability/**/*.ts",   // YENİ
    "src/lib/errors/**/*.ts",          // YENİ (S4'ten)
    "src/lib/auth/**/*.ts",            // YENİ (S3'ten)
  ],
  exclude: ["**/*.test.ts", "**/*.spec.ts", "**/types.ts", "**/index.ts"],
  thresholds: {
    lines: 85,      // 75 → 85
    functions: 88,  // 78 → 88
    branches: 75,   // 65 → 75
    statements: 86, // 76 → 86
    // Per-file minimums (kritik modüller için):
    "src/lib/assessment-engine/server-engine.ts": { lines: 80, branches: 70 },
    "src/lib/scoring/scoring-orchestrator.ts": { lines: 90, branches: 85 },
    "src/lib/psychometrics/person-fit.ts": { lines: 95 },
    "src/lib/selection/exposure-control-davey-parshall.ts": { lines: 90 },
    "src/lib/psychometrics/item-parameter-drift.ts": { lines: 90 },
  },
},
```

### Task S6.2 — API Route Entegrasyon Testleri

**Problem:** Tüm server.ts rotaları mock'lanmış Prisma ile unit test edilmiş değil.
Supertest ile API katmanını test et.

**`src/lib/assessment-engine/__tests__/api-sessions.test.ts`** (YENİ ~40 test):
```typescript
import request from "supertest";
import { buildApp } from "../../../server.js"; // factory pattern

describe("POST /api/sessions/launch", () => {
  it("rejects missing candidateId with 400", async () => {
    const res = await request(app)
      .post("/api/sessions/launch")
      .send({ organizationId: "org-1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("rejects candidateId > 128 chars with 400", async () => { ... });

  it("returns 503 when DB unavailable", async () => { ... });
});

describe("POST /api/sessions/:id/respond", () => {
  it("rejects invalid itemId format", async () => { ... });
  it("rejects response > 100_000 chars", async () => { ... });
  it("accepts valid writing response", async () => { ... });
});
```

**`server.ts`** küçük refactor — test edilebilirlik için app factory:
```typescript
// server.ts
export async function buildApp(options?: { redis?: Redis }) {
  const app = express();
  // ... tüm middleware ve route kurulumu
  return app;
}

// Entry point:
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildApp();
  app.listen(PORT, () => logger.info(`Listening on ${PORT}`));
}
```

### Task S6.3 — Analytics Entegrasyon Testleri

**`src/lib/analytics/__tests__/live-metrics-aggregation.test.ts`** (YENİ ~30 test):
```typescript
describe("LiveMetricsEngine — N+1 fix (S2)", () => {
  it("computeSkillMetrics calls session.findMany exactly once", async () => {
    await LiveMetricsEngine.computeSnapshot("org-1");
    // session.findMany once, response.groupBy once, response.groupBy again
    expect(prisma.session.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.response.groupBy).toHaveBeenCalledTimes(2);
  });

  it("computePretestPipelineMetrics uses groupBy not N count queries", async () => {
    // ...
    expect(prisma.response.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ["itemId"] })
    );
    expect(prisma.response.count).not.toHaveBeenCalled();
  });
});
```

### Task S6.4 — Selection Module Testleri

**`src/lib/selection/__tests__/cat-selector.test.ts`** (YENİ ~25 test):
```typescript
describe("CAT Selector integration with Davey-Parshall", () => {
  it("routes through Davey-Parshall when exposure store is present", () => { ... });
  it("falls back to max-info when all items are blocked by alpha gate", () => { ... });
  it("respects skill filter", () => { ... });
});
```

### Task S6.5 — Error Handler Testleri

**`src/lib/errors/__tests__/error-handler.test.ts`** (YENİ ~30 test):
```typescript
describe("Error Handler Middleware", () => {
  it("maps AppError(NOT_FOUND) to 404", () => { ... });
  it("maps Prisma P2025 to 404", () => { ... });
  it("maps Prisma P2002 to 409", () => { ... });
  it("hides stack trace in production", () => { ... });
  it("includes requestId in all responses", () => { ... });
  it("sends 5xx errors to Sentry", () => { ... });
});
```

### Task S6.6 — CI Coverage Gate Güçlendirme

**`.github/workflows/ci.yml`** güncelleme:
```yaml
- name: Coverage with threshold enforcement
  run: npm run test:coverage
  # vitest.config.ts threshold'ları artık 85/88/75/86
  # Threshold karşılanmazsa non-zero exit → CI başarısız

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    file: ./coverage/lcov.info
    fail_ci_if_error: true

- name: Comment coverage on PR
  if: github.event_name == 'pull_request'
  uses: davelosert/vitest-coverage-report-action@v2
```

### S6 Başarı Kriterleri
- [ ] `npm run test:coverage` çıktısı: lines ≥85%, branches ≥75%
- [ ] Codecov badge README'de mevcut
- [ ] API route testleri Prisma'yı mock'lamadan supertest ile çalışıyor
- [ ] Her PR'da coverage delta görünür (regresyon engellenir)

---

## Sprint 7 — Scalability (6.0 → 9.0)

**Mevcut durum:**
- In-memory scoring queue var (`scoring-queue.ts`) ama tek process sınırı
- Restartlarda queue sıfırlanıyor
- Ağır psikometrik hesaplamalar main thread'i bloklayabiliyor

### Task S7.1 — Persistent Async Scoring Queue (BullMQ)

**Neden BullMQ:** Redis zaten var (exposure store için), BullMQ job persistence,
retry, dead-letter queue sağlıyor. Restartlarda iş kaybolmuyor.

```bash
npm install bullmq
```

**`src/lib/scoring/scoring-queue-bullmq.ts`** (YENİ):
```typescript
import { Queue, Worker, Job } from "bullmq";
import type { Redis } from "ioredis";

export interface ScoringJobData {
  sessionId: string;
  responseId: string;
  skill: "WRITING" | "SPEAKING";
  content: string;
  prompt: string;
  audioBase64?: string;
  mimeType?: string;
}

export function createScoringQueue(redis: Redis) {
  const queue = new Queue<ScoringJobData>("scoring", {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });

  const worker = new Worker<ScoringJobData>(
    "scoring",
    async (job: Job<ScoringJobData>) => {
      const { skill, content, prompt, audioBase64, mimeType, responseId, sessionId } = job.data;

      let orchestratedScore;
      if (skill === "WRITING") {
        orchestratedScore = await ScoringOrchestrator.scoreWriting(content, prompt);
      } else if (audioBase64) {
        orchestratedScore = await ScoringOrchestrator.scoreSpeaking(audioBase64, mimeType!, prompt);
      } else {
        orchestratedScore = await ScoringOrchestrator.scoreSpeakingFromText(content, prompt);
      }

      await prisma.response.update({
        where: { id: responseId },
        data: {
          score: orchestratedScore.score,
          scoreSource: orchestratedScore.scoreSource,
          metadata: { ...existingMeta, aiResult: orchestratedScore.aiResult },
        },
      });

      if (orchestratedScore.requiresHumanReview) {
        await RatingQueueService.enqueue({ responseId, sessionId, skill });
      }
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.AI_SCORE_CONCURRENCY ?? "3", 10),
    }
  );

  return { queue, worker };
}
```

**Redis yoksa:** Mevcut in-memory `scoring-queue.ts` fallback olarak kalır.

### Task S7.2 — Worker Thread: Ağır Psikometrik Hesaplamalar

Bazı endpoint'ler main thread'i bloklıyor (örn. `/api/psychometrics/mirt-snapshot`
büyük veri setlerinde). Node.js `worker_threads` ile:

**`src/lib/psychometrics/worker/mirt-worker.ts`** (YENİ):
```typescript
import { parentPort, workerData } from "worker_threads";
import { computeMirtSnapshot } from "../mirt-engine.js";

const result = await computeMirtSnapshot(workerData);
parentPort!.postMessage(result);
```

**`src/lib/psychometrics/worker-pool.ts`** (YENİ):
```typescript
import { Worker } from "worker_threads";

export function runInWorker<T>(workerScript: string, data: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerScript, { workerData: data });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", code => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}
```

### Task S7.3 — Response Streaming için Backpressure

Büyük veri döndüren endpoint'ler (ör. `/api/items/bank-report` binlerce item)
stream ile döndürülmeli:

```typescript
app.get("/api/items/bank-report", checkRole([...]), async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.write('{"items":[');

  let first = true;
  const cursor = prisma.item.findManyCursor({ ... }); // Prisma cursor API
  for await (const item of cursor) {
    if (!first) res.write(",");
    res.write(JSON.stringify(transformItem(item)));
    first = false;
  }

  res.write("]}");
  res.end();
});
```

### Task S7.4 — Analytics Snapshot Redis Cache

S2.3'te in-memory cache eklenmişti. Redis varsa distributed cache:

```typescript
static async computeSnapshot(orgId: string): Promise<LiveAnalyticsSnapshot> {
  const cacheKey = `analytics:snapshot:${orgId}`;

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } else {
    const mem = this._cache.get(orgId);
    if (mem && mem.expiresAt > Date.now()) return mem.snapshot;
  }

  const snapshot = await this._computeFresh(orgId);

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(snapshot), "EX", 300); // 5 dk
  } else {
    this._cache.set(orgId, { snapshot, expiresAt: Date.now() + 300_000 });
  }

  return snapshot;
}
```

### Task S7.5 — Load Test

**`test/load/k6-session-flow.js`** (YENİ):
```javascript
import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 50 },   // ramp-up
    { duration: "2m",  target: 200 },  // sustained load
    { duration: "30s", target: 0 },    // ramp-down
  ],
  thresholds: {
    "http_req_duration{name:launch}": ["p95<500"],   // 500ms
    "http_req_duration{name:respond}": ["p95<1000"], // 1 sn
    "http_req_failed": ["rate<0.01"],                // %1 hata
  },
};

export default function () {
  const launch = http.post(`${BASE_URL}/api/sessions/launch`, payload, {
    tags: { name: "launch" }
  });
  check(launch, { "launch 200": (r) => r.status === 200 });
}
```

### S7 Başarı Kriterleri
- [ ] BullMQ queue çalışıyor, restart sonrası iş kaybolmuyor
- [ ] 200 eşzamanlı kullanıcıda p95 ≤ 500ms (k6 raporu)
- [ ] MIRT snapshot hesabı main thread'i 100ms'den fazla bloklamıyor
- [ ] `scoringQueueDepth` Prometheus metriği real-time güncelleniyor

---

## Sprint 8 — Deployment Readiness (7.0 → 9.2)

### Task S8.1 — Staging Environment (Render Preview)

**`.github/workflows/deploy.yml`** güncelleme:
```yaml
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: render-oss/github-action@v1
        id: deploy
        with:
          service-id: ${{ secrets.RENDER_STAGING_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: [type-check, test, seed-quality, build, deploy-staging, smoke-test]
    # ... production deploy
```

### Task S8.2 — Post-Deploy Smoke Tests

**`.github/workflows/deploy.yml`**'e ekle:
```yaml
  smoke-test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    env:
      STAGING_URL: ${{ needs.deploy-staging.outputs.url }}
    steps:
      - name: Health check
        run: |
          for i in 1 2 3 4 5; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/healthz")
            if [ "$STATUS" = "200" ]; then echo "Health OK"; break; fi
            echo "Attempt $i: $STATUS — waiting 10s..."; sleep 10
          done
          [ "$STATUS" = "200" ] || (echo "Health check failed" && exit 1)

      - name: Readiness check
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/readyz")
          [ "$STATUS" = "200" ] || exit 1

      - name: API smoke test
        run: |
          # Auth endpoint
          REGISTER=$(curl -s -X POST "$STAGING_URL/api/auth/register" \
            -H "Content-Type: application/json" \
            -d '{"email":"smoke@test.com","password":"Test1234!","name":"Smoke"}')
          echo "$REGISTER" | grep -q '"success"' || echo "Register may already exist"

          # Item bank inventory (unauthenticated → 401 expected)
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/api/items/inventory")
          [ "$STATUS" = "401" ] || (echo "Expected 401 got $STATUS" && exit 1)

          echo "Smoke tests passed ✅"
```

### Task S8.3 — Migration Dry-Run in CI

```yaml
  migrate-check:
    name: Prisma Migration Check
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
    env:
      DATABASE_URL: "postgresql://postgres:test@localhost:5432/test"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - name: Apply migrations
        run: npx prisma migrate deploy
      - name: Validate schema
        run: npx prisma validate
      - name: Check for pending migrations
        run: |
          STATUS=$(npx prisma migrate status 2>&1)
          echo "$STATUS"
          echo "$STATUS" | grep -q "No pending migrations" || \
            (echo "❌ Pending migrations exist!" && exit 1)
```

### Task S8.4 — Rollback Stratejisi

**`scripts/rollback.sh`** (YENİ):
```bash
#!/bin/bash
# Hızlı rollback: önceki Render deployment'ı aktive et
set -e

RENDER_API_KEY="${RENDER_API_KEY:?Required}"
SERVICE_ID="${RENDER_SERVICE_ID:?Required}"

echo "Fetching last 5 deployments..."
DEPLOYS=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID/deploys?limit=5")

PREV_DEPLOY_ID=$(echo "$DEPLOYS" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const success = d.filter(x => x.deploy.status === 'live');
  console.log(success[1]?.deploy?.id || '');
")

if [ -z "$PREV_DEPLOY_ID" ]; then
  echo "❌ No previous successful deployment found"
  exit 1
fi

echo "Rolling back to deployment: $PREV_DEPLOY_ID"
curl -s -X POST -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/deploys/$PREV_DEPLOY_ID/rollback"

echo "✅ Rollback initiated"
```

### Task S8.5 — Dependency Audit

**`.github/workflows/security.yml`**'e ekle:
```yaml
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
        continue-on-error: false
      - uses: ossf/scorecard-action@v2
        with:
          results_file: scorecard.sarif
          results_format: sarif
          publish_results: true
```

### S8 Başarı Kriterleri
- [ ] Her PR → staging'e otomatik deploy
- [ ] Staging smoke testleri geçmeden prod'a gitmiyor
- [ ] Migration CI'da test ediliyor, pending migration varsa CI başarısız
- [ ] Rollback scripti 2 dakikada tamamlanıyor
- [ ] `npm audit` yüksek/kritik zafiyet varsa CI başarısız

---

## Sprint 9 — Psychometric Validity (9.0 → 9.5)

**Mevcut güçlü noktalar (korunuyor):**
- Person-fit (Lz/ECI/U3/RGI) ✅
- Davey-Parshall exposure ✅
- IPD monitoring ✅
- DIF, equating, standard setting, subscore reliability ✅

**Kalan boşluklar:**
1. KL-information selector yazılmış ama CAT'a bağlanmamış
2. Shadow test solver LP (0-1 integer programming) yok
3. Item bank büyütme pipeline'ı otomatik değil

### Task S9.1 — KL-Information Selector Entegrasyonu

**`kl-information.ts`** fonksiyonu var (`klInformation()`). Şimdi selector'a bağla:

**`src/lib/selection/cat-selector.ts`** güncelleme:
```typescript
// Mevcut: MAX_INFO greedy
// Yeni: SELECTION_STRATEGY env var ile seçilebilir

type SelectionStrategy = "MAX_INFO" | "KL_INFO" | "DAVEY_PARSHALL";
const STRATEGY = (process.env.CAT_SELECTION_STRATEGY as SelectionStrategy) ?? "DAVEY_PARSHALL";

export function selectNextItem(
  candidates: Item[],
  theta: number,
  sem: number,
  exposureStore: ExposureStore,
  usedItemIds: Set<string>,
  rng?: () => number
): Item | null {
  switch (STRATEGY) {
    case "KL_INFO":
      return selectByKLInformation(candidates, theta, sem, usedItemIds);
    case "DAVEY_PARSHALL":
      return selectItemDaveyParshall(candidates, theta, { kMax: 0.20 }, usedItemIds, rng);
    case "MAX_INFO":
    default:
      return selectByMaxInfo(candidates, theta, usedItemIds);
  }
}

function selectByKLInformation(
  candidates: Item[],
  theta: number,
  sem: number,
  usedItemIds: Set<string>
): Item | null {
  const available = candidates.filter(i => !usedItemIds.has(i.id));
  if (available.length === 0) return null;

  return available.reduce((best, item) => {
    const { klScore } = klInformation(theta, sem, {
      a: item.discrimination,
      b: item.difficulty,
      c: item.guessing ?? 0,
    });
    const bestKl = klInformation(theta, sem, {
      a: best.discrimination,
      b: best.difficulty,
      c: best.guessing ?? 0,
    }).klScore;
    return klScore > bestKl ? item : best;
  });
}
```

### Task S9.2 — Shadow Test LP Upgrade (Temel)

Mevcut `shadow-test.ts` greedy constraint satisfaction kullanıyor.
Gerçek 0-1 LP için `javascript-lp-solver` paketi:

```bash
npm install javascript-lp-solver
```

**`src/lib/psychometrics/shadow-test-lp.ts`** (YENİ):
```typescript
import solver from "javascript-lp-solver";

/**
 * 0-1 LP formülasyonu (van der Linden, 1998):
 * Maximize: Σ I(θ, item_j) × x_j
 * Subject to:
 *   - Σ x_j ≤ n_remaining (max item count)
 *   - Σ x_j(skill=GRAMMAR) ∈ [min_grammar, max_grammar]
 *   - Already administered items: x_j = 1 (locked)
 *   - x_j ∈ {0, 1}
 */
export function solveShadowTestLP(
  candidates: Item[],
  administered: Item[],
  theta: number,
  constraints: BlueprintConstraints
): Item[] {
  const variables: Record<string, Record<string, number>> = {};
  const ints: Record<string, number> = {};

  for (const item of candidates) {
    const info = fisherInfo3pl(theta, { a: item.discrimination, b: item.difficulty, c: item.guessing ?? 0 });
    variables[item.id] = {
      objective: -info, // minimize negative info = maximize info
      total: 1,
      [`skill_${item.skill}`]: 1,
      [`cefr_${item.cefrLevel}`]: 1,
    };
    ints[item.id] = 1;
  }

  const model = {
    optimize: "objective",
    opType: "min",
    constraints: {
      total: { max: constraints.targetLength - administered.length },
      ...buildSkillConstraints(constraints),
    },
    variables,
    ints,
  };

  const result = solver.Solve(model);
  return candidates.filter(item => result[item.id] === 1);
}
```

### Task S9.3 — Otomatik Item Bank Büyütme Pipeline

**`.github/workflows/item-bank-health.yml`** güncelleme — otomatik item üretimi:
```yaml
  auto-generate:
    name: Auto-generate items for thin CEFR strata
    if: steps.coverage.outputs.needs_generation == 'true'
    steps:
      - name: Generate items for sparse strata
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          APP_URL: ${{ secrets.APP_URL }}
        run: |
          # Stratum coverage < 50 ise otomatik generate et
          SPARSE=$(echo "$COVERAGE" | node -e "
            const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
            const sparse = d.filter(s => s.count < 50);
            console.log(JSON.stringify(sparse));
          ")

          for STRATUM in $(echo $SPARSE | jq -r '.[] | @base64'); do
            SKILL=$(echo $STRATUM | base64 -d | jq -r '.skill')
            CEFR=$(echo $STRATUM | base64 -d | jq -r '.cefrLevel')
            COUNT=$(echo $STRATUM | base64 -d | jq -r '.count')
            NEED=$((50 - COUNT))

            curl -s -X POST "$APP_URL/api/items/generate/bulk" \
              -H "Authorization: Bearer $INTERNAL_API_SECRET" \
              -H "Content-Type: application/json" \
              -d "{\"skill\": \"$SKILL\", \"cefrLevel\": \"$CEFR\", \"count\": $NEED}"
          done
```

### Task S9.4 — MIRT 4D Upgrade (Opsiyonel, Phase 3)

Mevcut MIRT 2B → 4D compensatory model (Reading, Listening, Writing, Speaking ayrı boyutlar):

```typescript
// src/lib/psychometrics/mirt-4d.ts'i wire et
// server-engine.ts'de feature flag ile etkinleştir:
const USE_MIRT_4D = process.env.MIRT_DIMENSIONS === "4";

if (USE_MIRT_4D) {
  const { estimateMirt4D } = await import("../psychometrics/mirt-4d.js");
  skillProfiles = estimateMirt4D(responses, items);
} else {
  skillProfiles = estimateMirt2B(responses, items); // mevcut
}
```

### Task S9.5 — Psikometrik Validasyon Raporu

**Aylık otomatik rapor:**
```yaml
# .github/workflows/psychometrics-weekly.yml güncelleme
- name: Run psychometric validity report
  run: |
    node -e "
    const { generateValidityReport } = await import('./src/lib/psychometrics/construct-validity.js');
    const report = await generateValidityReport();
    console.log(JSON.stringify(report, null, 2));
    " > validity-report.json

    # Marginal reliability < 0.92 ise issue aç
    REL=$(node -e "const r = require('./validity-report.json'); console.log(r.marginalReliability);")
    if (( $(echo "$REL < 0.92" | bc -l) )); then
      gh issue create --title "⚠️ Marginal Reliability Below Target: $REL" --label "psychometrics,slo"
    fi
```

### S9 Başarı Kriterleri
- [ ] KL-information seçici `CAT_SELECTION_STRATEGY=KL_INFO` ile çalışıyor
- [ ] Shadow test LP feasible solution buluyor (test bank ≥ 100 item)
- [ ] Item bank: sparse strata otomatik büyütme aktif
- [ ] Marginal reliability ≥ 0.92 (haftalık kontrol)
- [ ] Tüm psikometrik testler: person-fit, IPD, equating yeşil

---

## Final Hedef Skor Tablosu

| Boyut | Önceki | Sonraki | Sprint |
|-------|--------|---------|--------|
| API Input Validation | 5.0 | **9.5** | S1 |
| Scalability | 6.0 | **9.0** | S7 |
| Test Coverage | 7.0 | **9.2** | S6 |
| Database | 7.0 | **9.2** | S2 |
| Observability | 7.0 | **9.5** | S5 |
| Deployment Readiness | 7.0 | **9.2** | S8 |
| Error Handling | 8.0 | **9.5** | S4 |
| Security | 8.0 | **9.5** | S3 |
| Psychometric Validity | 9.0 | **9.5** | S9 |

**Genel Ağırlıklı Skor:**

```
9.5×0.10 + 9.0×0.05 + 9.2×0.15 + 9.2×0.10 + 9.5×0.10 + 9.2×0.05 +
9.5×0.10 + 9.5×0.20 + 9.5×0.15
= 0.95 + 0.45 + 1.38 + 0.92 + 0.95 + 0.46 + 0.95 + 1.90 + 1.425
= 9.325 / 10
```

---

## İmplementasyon Öncelik Sırası

Tek bir sprint yapılabiliyorsa sıralama:

```
1. S1 — API Validation    (şemalar zaten var, sadece wire et — 1 gün)
2. S4 — Error Handling    (AppError + merkezi middleware — 1 gün)
3. S2 — Database N+1      (analytics rewrite — 2 gün)
4. S3 — Security          (JWT blacklist + audit log — 2 gün)
5. S5 — Observability     (Prometheus + timing — 2 gün)
6. S6 — Test Coverage     (threshold yükselt + yeni testler — 3 gün)
7. S7 — Scalability       (BullMQ + worker threads — 4 gün)
8. S8 — Deployment        (staging + smoke tests — 2 gün)
9. S9 — Psychometrics     (KL-info + shadow LP — 3 gün)
```

**Toplam tahmini efor:** ~20 gün (4 hafta yoğun sprint)

---

## Quick Wins (Bugün Yapılabilir — < 2 saat)

Bu değişiklikler hiçbir test değişikliği gerektirmez:

1. **S1.1 hızlı versiyon:** 10 rota için `validate()` ekle (şemalar hazır)
   ```bash
   # server.ts'de arama yap ve validate() ekle:
   # POST /api/sessions/launch, /api/sessions/:id/respond, /api/items (POST),
   # /api/items/generate, /api/items/generate/bulk, /api/items/:id (PUT),
   # /api/rating/tasks/:id/submit, /api/codes/validate, /api/codes/redeem
   ```

2. **S4.3 quick win:** Request ID middleware (5 satır)

3. **S2.2 quick win:** `computePretestPipelineMetrics` groupBy fix (N+1 → 3 sorgu)

4. **Vitest coverage scope genişletme:** `vitest.config.ts`'e 4 dizin ekle (2 dakika)
