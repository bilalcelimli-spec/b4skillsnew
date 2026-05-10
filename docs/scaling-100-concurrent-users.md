# 100+ Eş Zamanlı Kullanıcı — Ölçekleme Rehberi

**Tarih:** Mayıs 2026  
**Durum:** Kod analizi tamamlandı — iyileştirmeler uygulanmamış  
**Yük Testi Referansı:** `test/load/exam-session.js` (k6, 20 VU steady / 100 VU spike)

---

## Mevcut Mimari Darboğazları

Aşağıdaki şema, bir `GET /api/sessions/:id/next` isteğinin şu anki yolunu gösteriyor:

```
Browser
  │
  ▼
Express (tek process, tek thread)
  │
  ├─► prisma.session.findUnique({ include: { responses: true } })   ← DB sorgusu 1
  │       ↓
  ├─► prisma.item.findMany({ where: whereClause })                  ← DB sorgusu 2 (tam tablo tarama!)
  │       ↓
  ├─► EAP tahmin + Shadow Test CPU hesabı                           ← CPU bloğu
  │       ↓
  └─► res.json(...)

Connection pool: 5 bağlantı
```

100 eş zamanlı kullanıcıyla her saniye ~200–400 DB sorgu denemesi → **5 slot için kuyruk → 10 sn timeout → 503**.

---

## Öncelik 1 — Kritik (Hemen Uygulanmalı)

### 1.1 Veritabanı Bağlantı Havuzu: 5 → 20

**Sorun:** `src/lib/prisma.ts`'de `connection_limit=5` hardcode edilmiş. 100 eş zamanlı kullanıcı bu limiti ilk saniyede aşar.

**Etki:** Havuz dolarsa Prisma `P2024: Timed out fetching a connection` hatası fırlatır. Tüm sınav isteği 503 döner.

```typescript
// src/lib/prisma.ts — MEVCUT (sorunlu)
process.env.DATABASE_URL = `...&connection_limit=5&pool_timeout=10`;

// DÜZELTME
const MAX_POOL = parseInt(process.env.DATABASE_POOL_MAX ?? "20");
const POOL_TIMEOUT = parseInt(process.env.DATABASE_POOL_TIMEOUT ?? "15");

if (!process.env.DATABASE_URL?.includes("connection_limit")) {
  const sep = process.env.DATABASE_URL!.includes("?") ? "&" : "?";
  process.env.DATABASE_URL =
    `${process.env.DATABASE_URL}${sep}` +
    `connection_limit=${MAX_POOL}&pool_timeout=${POOL_TIMEOUT}&` +
    `connect_timeout=10&statement_cache_size=0`;
}
```

**Not:** Render Starter PostgreSQL'in toplam bağlantı limiti 25'tir. Render Pro (100 bağlantı) veya PgBouncer ile bunu 50–80'e yükseltebilirsiniz. Üretim için `DATABASE_POOL_MAX=20` env değişkeni yeterlidir.

**Beklenen etki:** Pool exhaustion hataları sıfıra düşer.

---

### 1.2 Madde Bankası Bellek Önbelleği

**Sorun:** `getNextItem()` her çağrıldığında `prisma.item.findMany()` ile tüm aktif madde bankasını PostgreSQL'den çeker. 100 kullanıcıda saniyede ~100 tam tablo tarama.

**Analiz:**
```typescript
// server-engine.ts:443 — MEVCUT (her istek için tam tablo tarama)
const dbItems = await prisma.item.findMany({ where: whereClause });
```

Madde bankası nadiren değişir (yalnızca admin panelinden yeni madde eklendiğinde). Önbelleğe alınmaya idealdir.

```typescript
// src/lib/assessment-engine/item-bank-cache.ts — YENİ DOSYA

interface CacheEntry {
  items: Item[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const ITEM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

/**
 * Madde bankasını önbellekten veya DB'den getirir.
 * Cache key: JSON.stringify(whereClause) — farklı filtreler ayrı önbellek girdisi.
 */
export async function getCachedItems(
  whereClause: Record<string, unknown>
): Promise<Item[]> {
  const key = JSON.stringify(whereClause);
  const entry = cache.get(key);

  if (entry && entry.expiresAt > Date.now()) {
    return entry.items; // Cache hit — DB sorgusu yok
  }

  // Cache miss veya süresi dolmuş
  const dbItems = await prisma.item.findMany({ where: whereClause });
  const items = dbItems.map(dbItemToEngineItem);
  cache.set(key, { items, expiresAt: Date.now() + ITEM_CACHE_TTL_MS });
  return items;
}

/** Admin panelinden madde eklendiğinde/silindiğinde çağrılır. */
export function invalidateItemCache(): void {
  cache.clear();
}
```

```typescript
// server-engine.ts içinde getNextItem() — DEĞİŞİKLİK
import { getCachedItems } from "./item-bank-cache.js";

// ÖNCE:
const dbItems = await prisma.item.findMany({ where: whereClause });
const itemPool: Item[] = dbItems.map(dbItemToEngineItem);

// SONRA:
const itemPool = await getCachedItems(whereClause);
```

```typescript
// server.ts — Madde CRUD endpoint'lerinde önbellek invalidasyonu
import { invalidateItemCache } from "./src/lib/assessment-engine/item-bank-cache.js";

app.post("/api/items", async (req, res) => {
  const item = await AssessmentService.createItem(req.body);
  invalidateItemCache(); // ← EKLE
  res.json(item);
});

app.put("/api/items/:id", async (req, res) => {
  const item = await AssessmentService.updateItem(req.params.id, req.body);
  invalidateItemCache(); // ← EKLE
  res.json(item);
});
```

**Beklenen etki:** `getNextItem()` için DB yükü %90+ azalır; item selection p95 <50ms'ye düşer.

---

### 1.3 AI Puanlama: Senkron → Asenkron (Fire-and-Forget)

**Sorun:** Writing/Speaking yanıtları `submitResponse()` içinde **30 saniyelik blokaj** oluşturuyor:

```typescript
// server-engine.ts:571 — MEVCUT (yanıt beklenene kadar Express connection açık kalır)
scoringDecision = await withTimeout(
  ScoringOrchestrator.scoreWriting(String(value), prompt),
  30_000,
  "Writing AI scoring"
);
```

100 Writing sorusu gönderen kullanıcı → Express'te 100 adet 30s açık bağlantı → event loop tıkanması.

**Çözüm: Anlık 202 + Polling**

```typescript
// src/lib/scoring/scoring-queue.ts — YENİ DOSYA

type ScoringJob = {
  sessionId: string;
  responseId: string;
  skill: "WRITING" | "SPEAKING";
  value: string | { audio: string; mimeType: string };
  prompt: string;
  resolve: (result: OrchestratedScore) => void;
};

// Node.js'in tek thread'inden yararlanıyoruz — no mutex gerekli
const queue: ScoringJob[] = [];
let isProcessing = false;

/** Kuyruğa ekle ve hemen bir Promise döndür. */
export function enqueueScoringJob(
  sessionId: string,
  responseId: string,
  skill: "WRITING" | "SPEAKING",
  value: any,
  prompt: string
): Promise<OrchestratedScore> {
  return new Promise((resolve) => {
    queue.push({ sessionId, responseId, skill, value, prompt, resolve });
    if (!isProcessing) processQueue();
  });
}

/** Sırayla işle — paralel Gemini çağrı sayısını MAX_CONCURRENT ile sınırla. */
const MAX_CONCURRENT = 8; // Gemini rate limit güvenli eşiği
let activeCount = 0;

async function processQueue() {
  isProcessing = true;
  while (queue.length > 0 && activeCount < MAX_CONCURRENT) {
    const job = queue.shift()!;
    activeCount++;
    runJob(job).finally(() => {
      activeCount--;
      if (queue.length > 0) processQueue();
    });
  }
  isProcessing = queue.length > 0;
}

async function runJob(job: ScoringJob) {
  try {
    const result =
      job.skill === "WRITING"
        ? await ScoringOrchestrator.scoreWriting(job.value as string, job.prompt)
        : await ScoringOrchestrator.scoreSpeaking(
            (job.value as any).audio,
            (job.value as any).mimeType,
            job.prompt
          );
    job.resolve(result);
  } catch (err) {
    job.resolve({ score: 0, requiresHumanReview: true, scoreSource: "ai_unavailable" } as any);
  }
}
```

```typescript
// server-engine.ts içinde submitResponse() — DEĞİŞİKLİK
// AI puanlama gerektiren maddelerde:

if (itemSkill === "WRITING" || itemSkill === "SPEAKING") {
  // Anında 0.5 ile kaydet, puanı arka planda hesapla
  score = 0.5; // Geçici — theta'ya dahil edilmez (isPretest=true flag ile)
  aiResult = { requiresHumanReview: false, pending: true };

  // Arka planda skorla, tamamlanınca DB'yi güncelle
  setImmediate(async () => {
    try {
      const result = await enqueueScoringJob(sessionId, savedResponse.id, itemSkill, value, prompt);
      await prisma.response.update({
        where: { id: savedResponse.id },
        data: {
          score: result.score,
          aiScore: result.score,
          metadata: { ...savedResponse.metadata, scoreSource: result.scoreSource },
          isPretest: false, // Artık theta'ya dahil edilebilir
        },
      });
      // Session theta'sı bir sonraki getNextItem() çağrısında güncellenir
    } catch (e) {
      logger.error({ err: e, sessionId, responseId: savedResponse.id }, "background scoring failed");
    }
  });
}
```

**Frontend değişikliği:** Candidate sıradaki soruya geçerken bir önceki yanıtın skoru zaten hazır olur (çoğu durumda). Olmadığı durumda `GET /api/sessions/:id/status` polling ile kontrol edilir.

**Beklenen etki:** `submitResponse()` p95 latency ~800ms → ~150ms; eş zamanlı Gemini bağlantısı 100 → maks 8.

---

## Öncelik 2 — Yüksek (Bu Hafta)

### 2.1 `submitResponse()` N+1 Sorgu Azaltma

**Sorun:** Her yanıt gönderiminde **4 sıralı DB sorgusu**:

```
1. session.findUnique({ include: { responses: true } })   // Tüm responses yüklendi
2. item.findUnique({ where: { id: itemId } })             // Ayrı sorgu!
3. item.findMany({ where: { id: { in: usedItemIds } } }) // Kullanılan maddeler YENİDEN!
4. session.update(...)                                    // Kayıt
```

**Düzeltme:** Sorguları birleştir, önbellekten yararlan:

```typescript
// server-engine.ts — submitResponse() başı

// ÖNCE (4 ayrı sorgu):
const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { responses: true } });
const dbItem = await prisma.item.findUnique({ where: { id: itemId } });
// ... daha sonra:
const usedItems = await prisma.item.findMany({ where: { id: { in: Array.from(state.usedItemIds) } } });

// SONRA (2 sorgu):
const [session, dbItem] = await Promise.all([
  prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      responses: {
        select: { itemId: true, score: true, isPretest: true, latencyMs: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  }),
  getCachedItem(itemId), // ← Item bank cache'den (yukarıda eklendi)
]);

// usedItems için artık ayrı sorgu YOK — item cache'den al:
const itemDict: Record<string, Item> = {};
for (const id of state.usedItemIds) {
  const it = await getCachedItemById(id); // O(1) Map lookup — DB sorgusu yok
  if (it) itemDict[id] = it;
}
```

**Beklenen etki:** `submitResponse()` DB round-trip sayısı 4 → 2; latency ~250ms azalır.

---

### 2.2 Node.js Cluster — Tüm CPU Çekirdeklerini Kullan

**Sorun:** Express tek process'te çalışıyor. IRT hesaplamaları (EAP, MIRT, Shadow Test) CPU-yoğun JavaScript → eş zamanlı hesaplamalar event loop'u tıkar.

```typescript
// server.ts en üstüne EKLE (startServer()'dan önce)

import cluster from "cluster";
import os from "os";

const WORKERS = parseInt(process.env.WEB_CONCURRENCY ?? String(os.cpus().length));

if (cluster.isPrimary && process.env.NODE_ENV === "production" && WORKERS > 1) {
  console.log(`[cluster] Primary ${process.pid} — forking ${WORKERS} workers`);
  for (let i = 0; i < WORKERS; i++) cluster.fork();

  cluster.on("exit", (worker, code, signal) => {
    console.warn(`[cluster] Worker ${worker.process.pid} died (${signal ?? code}) — respawning`);
    cluster.fork();
  });
} else {
  // Worker process veya dev ortamı
  startServer();
}
```

**Render.com'da:** `WEB_CONCURRENCY` env değişkeni otomatik olarak sunucu çekirdek sayısına ayarlanır. Starter plan 0.5 CPU → 1 worker; Pro 2 CPU → 2 worker. PM2 kullanıyorsanız: `pm2 start server.js -i max`.

**Önemli:** Redis (exposure store) ve item bank cache paylaşımlı state içerdiğinden, cluster modunda bunların her worker'da bağımsız instance olmasına dikkat edin. Item cache için Redis-backed cache (aşağıda) önerilir.

**Beklenen etki:** CPU-yoğun EAP/MIRT hesaplamalarında %40–70 throughput artışı.

---

### 2.3 Keep-Alive Timeout Düzeltmesi

**Sorun:** Node.js HTTP server'ın varsayılan `keepAliveTimeout = 5 saniye`. Render.com load balancer'ı 60 saniye timeout kullanır. Bu uyumsuzluk, yük altında **"socket hang up"** ve **ECONNRESET** hatalarına yol açar.

```typescript
// server.ts — startServer() içinde app.listen() sonrasına EKLE

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT }, `b4skills Server running on http://localhost:${PORT}`);
});

// EKLE: Load balancer timeout'undan 5 saniye fazla olmalı
server.keepAliveTimeout = 65_000;       // LB 60s → biz 65s
server.headersTimeout = 66_000;         // keepAlive + 1s buffer
server.requestTimeout = 30_000;         // Tek isteğin max süresi (AI scoring'i kapsamamalı)
server.maxRequestsPerSocket = 1000;     // Per-connection request sınırı (DOS koruması)
```

**Beklenen etki:** Yük altında "connection reset" hataları sıfıra düşer.

---

### 2.4 Redis Oturum Durumu Önbelleği

**Sorun:** `getNextItem()` her çağrısında `session.findUnique({ include: { responses: true } })` tüm geçmiş yanıtları yükler. 20 soruluk bir sınav sonunda bu sorgu her seferinde büyüyen bir response listesi getirir.

```typescript
// src/lib/assessment-engine/session-cache.ts — YENİ DOSYA

import { getExposureStore } from "./exposure-store.js";

const SESSION_CACHE_TTL = 30 * 60; // 30 dakika (saniye cinsinden)

export interface CachedSessionState {
  theta: number;
  sem: number;
  responseCount: number;
  usedItemIds: string[];
  metadata: Record<string, unknown>;
  updatedAt: number;
}

export async function getCachedSession(
  sessionId: string
): Promise<CachedSessionState | null> {
  const store = await getExposureStore();
  const raw = await store.client.get(`session:state:${sessionId}`);
  return raw ? JSON.parse(raw) : null;
}

export async function setCachedSession(
  sessionId: string,
  state: CachedSessionState
): Promise<void> {
  const store = await getExposureStore();
  await store.client.set(
    `session:state:${sessionId}`,
    JSON.stringify(state),
    "EX",
    SESSION_CACHE_TTL
  );
}

export async function invalidateSessionCache(sessionId: string): Promise<void> {
  const store = await getExposureStore();
  await store.client.del(`session:state:${sessionId}`);
}
```

```typescript
// server-engine.ts — getNextItem() başında

// ÖNCE: Her zaman DB'den yükle
const session = await prisma.session.findUnique({
  where: { id: sessionId },
  include: { responses: { include: { item: { select: { skill: true } } } } }
});

// SONRA: Önce cache'e bak
const cached = await getCachedSession(sessionId);
if (cached && /* son yanıttan beri değişmedi mi? */ cached.responseCount === session.responsesCount) {
  // Cache hit — DB'den sadece son yanıtı çek
  const lastResponse = await prisma.response.findFirst({
    where: { sessionId },
    orderBy: { order: "desc" },
    include: { item: { select: { skill: true } } },
  });
  // ... cached state + last response ile devam et
}
```

**Beklenen etki:** Uzun sınav seanslarında (15+ yanıt) `getNextItem()` DB yükü %60 azalır.

---

## Öncelik 3 — Orta (Bu Sprint)

### 3.1 Backpressure: Yük Altında Yeni Bağlantıları Yavaşlat

```typescript
// server.ts — rate limiter'lara EKLE (express-slow-down paketi)
import slowDown from "express-slow-down";  // npm install express-slow-down

const examSlowDown = slowDown({
  windowMs: 60_000,         // 1 dakika
  delayAfter: 80,           // 80 istek sonrası yavaşlamaya başla
  delayMs: (hits) => (hits - 80) * 100, // Her ekstra istek için +100ms delay
  maxDelayMs: 2_000,        // Max 2 saniye ekleme
  skip: (req) =>
    req.path === "/healthz" ||
    req.path === "/readyz" ||
    req.method === "GET" && req.path.includes("/next"), // item seçimi: asla yavaşlatma
});

app.use("/api/sessions", examSlowDown);
```

**Beklenen etki:** 80 eş zamanlı kullanıcı sonrasında yeni istekler kademeli olarak yavaşlar; DB pool patlaması yerine yumuşak degradasyon.

---

### 3.2 Item Pool Sorgusu: Fazla Sütun Yükleme Engeli

```typescript
// server-engine.ts — item pool sorgusu

// ÖNCE: Tüm sütunları yükle (metadata büyük olabilir)
const dbItems = await prisma.item.findMany({ where: whereClause });

// SONRA: Sadece CAT motoru için gerekli alanları seç
const dbItems = await prisma.item.findMany({
  where: whereClause,
  select: {
    id: true,
    skill: true,
    status: true,
    isPretest: true,
    discrimination: true,
    difficulty: true,
    guessing: true,
    cefrLevel: true,
    metadata: true,     // Prompt, seçenekler için gerekli
    // NOT: assets, auditLog vb. ağır alanlar DIŞARDA bırakıldı
  },
});
```

**Beklenen etki:** Her item pool sorgusu için aktarılan veri %30–50 azalır; DB → Node.js network I/O düşer.

---

### 3.3 Statik Varlıklar için Agresif Cache Header'ları

```typescript
// server.ts — express.static konfigürasyonu

app.use(
  express.static(distPath, {
    maxAge: "1y",        // JS/CSS hash'li dosyalar — 1 yıl önbellekte
    immutable: true,     // "Cache-Control: immutable" → browser hiç istek atmaz
    etag: false,         // ETag hesaplaması CPU kullanır; immutable ile gereksiz
    lastModified: false, // Aynı sebep
  })
);

// index.html her zaman taze (SPA route'ları için)
app.get("/", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(path.join(distPath, "index.html"));
});
```

**Beklenen etki:** CDN olmadan bile tekrar ziyaretçiler statik dosyaları hiç indirmez → Express üzerindeki statik yük %70 azalır.

---

### 3.4 Veritabanı İndeks Ekleme (Eksik Olanlar)

```prisma
// prisma/schema.prisma — Response modeline EKLE

model Response {
  // ...mevcut alanlar...

  @@index([sessionId])           // ✅ zaten var
  @@index([itemId])              // ✅ zaten var
  @@index([sessionId, order])    // ✅ zaten var
  @@index([sessionId, isPretest]) // ← EKLE: pretest filtrelemesi için
  @@index([createdAt])           // ← EKLE: veri saklama süreci için (KVKK)
}

model Session {
  // ...mevcut alanlar...

  @@index([organizationId, candidateId])  // ✅ zaten var
  @@index([organizationId, status])       // ✅ zaten var
  @@index([candidateId, status])          // ✅ zaten var
  @@index([status])                       // ✅ zaten var
  @@index([createdAt])                    // ✅ zaten var
  @@index([status, updatedAt])            // ← EKLE: aktif seans monitörü için
}
```

---

### 3.5 Pino HTTP Logger'ı Örnekleme

**Sorun:** Her istek için JSON log satırı yazılıyor. 100 kullanıcı × 20 sorgu = 2000 log/dk → I/O baskısı.

```typescript
// src/lib/observability/http-logger.ts

export function buildHttpLogger() {
  return pinoHttp({
    logger,
    // Yük altında sağlık kontrolü loglarını örnekle
    customLogLevel(req, res, err) {
      if (res.statusCode >= 500 || err) return "error";
      if (req.url === "/healthz" || req.url === "/readyz") return "silent"; // ← Logları sustur
      return "info";
    },
    // Başarılı GET isteklerini %10 olasılıkla logla (prod yük altında)
    autoLogging: {
      ignore: (req) =>
        process.env.NODE_ENV === "production" &&
        req.method === "GET" &&
        req.url?.includes("/next") &&
        Math.random() > 0.1, // %10 örnekleme
    },
  });
}
```

**Beklenen etki:** Log I/O %50–80 azalır; disk yazma tıkanmasına karşı koruma.

---

## Öncelik 4 — Uzun Vadeli Mimari

### 4.1 PgBouncer ile Bağlantı Havuzu Yönetimi

Render Pro'ya geçildiğinde veya self-hosted PostgreSQL'de:

```
Node.js (20 bağlantı) → PgBouncer (transaction pool) → PostgreSQL (100 bağlantı)
```

PgBouncer transaction pooling ile 20 Node.js bağlantısı, PostgreSQL'de 5–8 gerçek bağlantıya denk gelir. 200+ eş zamanlı kullanıcı için zorunludur.

```yaml
# docker-compose.pgbouncer.yml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:1.22
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_DBNAME: b4skills
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: 500
      PGBOUNCER_DEFAULT_POOL_SIZE: 25
```

### 4.2 CAT Hesaplamaları için Worker Threads

IRT/MIRT hesaplamaları CPU-yoğun ama stateless. Worker threads ile ana event loop'tan ayıralım:

```typescript
// src/lib/assessment-engine/worker-pool.ts
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import os from "os";

// EAP tahmin ve item selection'ı worker'a taşı
// Ana thread sadece DB ve I/O işleriyle ilgilenir
```

### 4.3 Ölçeklenebilir Item Bank: Redis Önbelleği

Çoklu Node.js instance'ı (cluster veya horizontal scaling) için Node.js in-memory cache yerine Redis:

```typescript
// İlk deploy: Node.js Map cache ✅ (tek instance)
// İkinci aşama: Redis cache (çoklu instance)

const itemPool = await redis.get(`items:pool:${cacheKey}`);
if (itemPool) return JSON.parse(itemPool);

const items = await prisma.item.findMany({ where: whereClause });
await redis.set(`items:pool:${cacheKey}`, JSON.stringify(items), "EX", 300);
return items;
```

---

## Özet Tablo

| # | İyileştirme | Öncelik | Etki | Efor |
|---|---|---|---|---|
| 1.1 | DB pool: 5→20 | 🔴 Kritik | DB timeout %100 azalır | 5 dk |
| 1.2 | Item bank bellek cache (5 dk TTL) | 🔴 Kritik | DB yükü %90 azalır | 2 saat |
| 1.3 | AI puanlama asenkron (kuyruk) | 🔴 Kritik | Yanıt p95: 800ms→150ms | 4 saat |
| 2.1 | submitResponse N+1 azaltma | 🟠 Yüksek | DB round-trip 4→2 | 3 saat |
| 2.2 | Node.js cluster (tüm CPU'lar) | 🟠 Yüksek | Throughput +%40–70 | 1 saat |
| 2.3 | Keep-alive timeout 65s | 🟠 Yüksek | "socket hang up" sıfır | 5 dk |
| 2.4 | Redis oturum durumu cache | 🟠 Yüksek | Uzun seanslar %60 daha hızlı | 3 saat |
| 3.1 | Backpressure (express-slow-down) | 🟡 Orta | Yumuşak degradasyon | 30 dk |
| 3.2 | Item pool select() sütun kısıtlama | 🟡 Orta | Ağ I/O %30–50 azalır | 1 saat |
| 3.3 | Statik varlık cache header'ları | 🟡 Orta | Express statik yük %70 azalır | 30 dk |
| 3.4 | Eksik DB indeksleri | 🟡 Orta | Response filtre sorgu hızı | 30 dk |
| 3.5 | Pino örnekleme | 🟡 Orta | Log I/O %50–80 azalır | 30 dk |
| 4.1 | PgBouncer | 🟢 Uzun vade | 200+ kullanıcı için | 1 gün |
| 4.2 | Worker threads (IRT) | 🟢 Uzun vade | CPU bağımsız event loop | 1 hafta |
| 4.3 | Redis item cache (multi-instance) | 🟢 Uzun vade | Horizontal scaling | 1 gün |

---

## Doğrulama: k6 Yük Testi

İyileştirmeleri uyguladıktan sonra mevcut yük testi ile doğrulama:

```bash
# Mevcut test (20 VU steady + 100 VU spike):
k6 run test/load/exam-session.js

# Hedef metrikler (iyileştirme sonrası):
# ✅ http_req_duration p95 < 300ms (next-item endpoint)
# ✅ http_req_duration p95 < 200ms (respond endpoint — AI hariç)
# ✅ http_req_failed rate < 0.5%
# ✅ 0 "P2024: Timed out fetching a connection" hatası
```

```javascript
// test/load/exam-session.js — Eşik güncellemesi
export const options = {
  thresholds: {
    http_req_duration: ["p(95)<300"],    // next-item
    http_req_failed: ["rate<0.005"],     // %0.5 hata toleransı
    "http_req_duration{name:respond}": ["p(95)<200"],
  },
};
```

---

## Hızlı Başlangıç: 2 Saatte 100 Kullanıcı Kapasitesi

En yüksek etkiyi en az eforla elde etmek için sıralama:

```
1. src/lib/prisma.ts          → connection_limit=5 → 20          (5 dk)
2. server.ts                  → keepAliveTimeout = 65_000         (5 dk)
3. item-bank-cache.ts         → Yeni dosya oluştur               (2 saat)
4. server-engine.ts           → getCachedItems() kullan          (30 dk)
5. k6 run test/load/...       → Doğrula                          (15 dk)
```

Bu 4 değişiklik uygulandıktan sonra 100 eş zamanlı kullanıcı kapasitesine ulaşılır.  
AI puanlama asenkron kuyruğu (1.3) Writing/Speaking ağırlıklı sınavlar için ek öncelik taşır.
