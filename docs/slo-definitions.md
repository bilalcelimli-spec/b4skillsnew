# Service Level Objectives (SLO) — b4skills Platform

**Versiyon:** 1.0  
**Son Güncelleme:** 2026-05-10  
**Sahip:** Platform Engineering / Assessment Director  
**İnceleme Periyodu:** 30 günlük kayan pencere

---

## 1. Hizmet Açıklaması

b4skills, kurumsal ve bireysel kullanıcılara CEFR tabanlı adaptif İngilizce yeterlik değerlendirmesi sunan bir SaaS platformudur. SLO'lar aşağıdaki hizmet bileşenlerini kapsar:

| Bileşen | Açıklama |
|---|---|
| **API Sunucusu** | Express.js REST API (port 3000) |
| **Sınav Motoru** | CAT/MST item seçimi + EAP tahmin |
| **AI Puanlama** | Gemini 2.5 Flash (writing + speaking) |
| **Veritabanı** | PostgreSQL (Prisma ORM) |
| **Önbellek** | Redis (exposure store) |

---

## 2. SLO Tablosu

### 2.1 Erişilebilirlik (Availability)

| SLO | Hedef | Ölçüm | Hata Bütçesi (30 gün) |
|---|---|---|---|
| **Genel API erişilebilirliği** | ≥ 99.5% | `/healthz` her 60s check | 3.6 saat/ay |
| **Sınav oturumu API'si** | ≥ 99.0% | `POST /api/sessions` 5xx oranı | 7.2 saat/ay |
| **AI Puanlama (Gemini)** | ≥ 95.0% | `scoreWriting`/`scoreSpeaking` başarı oranı | 36 saat/ay |
| **Veritabanı bağlantısı** | ≥ 99.9% | `/readyz` DB check | 43 dakika/ay |

> **Not:** AI Puanlama SLO'su circuit breaker + human review fallback nedeniyle daha düşük tutulmuştur — Gemini'nin mevcut olmadığı durumlarda yanıt otomatik olarak insan değerlendirme kuyruğuna yönlendirilir.

### 2.2 Gecikme (Latency)

| Endpoint / İşlem | p50 | p95 | p99 | Pencere |
|---|---|---|---|---|
| `GET /api/sessions/:id/next-item` (item seçimi) | < 50ms | < 300ms | < 500ms | 30 gün |
| `POST /api/sessions/:id/respond` (yanıt işleme) | < 100ms | < 500ms | < 1000ms | 30 gün |
| `POST /api/sessions` (oturum başlatma) | < 200ms | < 800ms | < 2000ms | 30 gün |
| AI Writing puanlama | < 5s | < 15s | < 30s | 30 gün |
| AI Speaking puanlama | < 10s | < 25s | < 45s | 30 gün |
| `GET /api/items/bank-report` | < 500ms | < 2000ms | < 5000ms | 30 gün |

### 2.3 Hata Oranı (Error Rate)

| Metrik | Hedef | Açıklama |
|---|---|---|
| **5xx genel hata oranı** | < 0.5% | Tüm API isteklerinin %0.5'inden azı sunucu hatası |
| **CEFR sınıflandırma hatası** | < 0.5% | Simülasyonda > %70 doğruluk ✅; live: izleniyor |
| **Integrity guard false-positive** | < 5% | Geçerli yanıtların yanlışlıkla reddedilmesi |
| **Puanlama pipeline kayıp oranı** | < 1% | `scoreSource: "ai_unavailable"` oranı (7-günlük) |

### 2.4 Veri Doğruluğu

| Metrik | Hedef | Yöntem |
|---|---|---|
| **AI-insan QWK (writing)** | ≥ 0.80 | `src/lib/scoring/ai-human-agreement.ts` rolling monitor |
| **AI-insan QWK (speaking)** | ≥ 0.80 | Aynı modül |
| **EAP bias** | \|bias\| < 0.10 θ | Monte Carlo simülasyonu (vitest ✅) |
| **EAP RMSE** | < 0.50 θ | 200 simüle aday, 30 madde (vitest ✅) |

---

## 3. Hata Bütçesi Hesaplama

```
Hata bütçesi (dakika/ay) = (1 - SLO_hedefi) × 43200 dakika

Örnek — API %99.5:
  (1 - 0.995) × 43200 = 216 dakika = 3.6 saat
```

### Hata Bütçesi Tüketim Kuralları

| Tüketim | Aksiyon |
|---|---|
| 0–50% | Normal operasyon |
| 50–75% | Engineering ekibi uyarı alır |
| 75–90% | SEV-2 incident açılır; yeni deploy dondurulur |
| >90% | SEV-1; on-call tetiklenir; tüm değişiklikler askıya alınır |

---

## 4. Uyarı Kuralları (Alert Thresholds)

### Kritik Alarmlar (PagerDuty / Sentry SEV-1)

| Kural | Eşik | Gecikme |
|---|---|---|
| `/healthz` başarısız | 3 ardışık check (3 dakika) | 0 |
| DB bağlantısı yok | `/readyz` 2× ardışık fail | 0 |
| 5xx oranı | > 5% (5-dakika pencere) | 5 dk |
| Circuit breaker OPEN | `gemini-scoring` veya `gemini-generation` OPEN | 0 |

### Uyarı Alarmları (Slack #ops-alerts, SEV-2/3)

| Kural | Eşik | Gecikme |
|---|---|---|
| p95 latency yüksek | next-item > 400ms (5-dakika) | 10 dk |
| AI puanlama degraded | `ai_unavailable` > 1% (1-saat) | 30 dk |
| QWK drift | MAE artışı > 0.03 veya QWK düşüşü > 0.05 | Günlük |
| Hata bütçesi tüketimi | > 75% (7-günlük) | Günlük |
| SSL sertifika süresi | < 14 gün | Günlük |

---

## 5. Uptime Monitoring Konfigürasyonu

### Betterstack (önerilen)

```yaml
# betterstack-monitors.yml
monitors:
  - name: "b4skills API Liveness"
    url: "https://app.b4skills.com/healthz"
    method: GET
    check_frequency: 60        # saniye
    regions: [us-east, eu-west, ap-southeast]
    alert_after: 3             # 3 ardışık fail
    recovery_period: 2
    expected_status: 200
    ssl_check: true
    ssl_alert_days: 14

  - name: "b4skills DB Readiness"
    url: "https://app.b4skills.com/readyz"
    method: GET
    check_frequency: 120
    regions: [us-east, eu-west]
    alert_after: 2
    expected_status: 200
    expected_body_contains: '"status":"ready"'

  - name: "b4skills Exam Session API"
    url: "https://app.b4skills.com/api/health"
    method: GET
    check_frequency: 300
    regions: [eu-west]
    alert_after: 3
    expected_status: 200
```

### UptimeRobot (alternatif — ücretsiz tier)

```
Monitor Type: HTTP(s)
URL: https://app.b4skills.com/healthz
Monitoring Interval: 5 minutes
Alert Contacts: [ops@b4skills.com, Slack #ops-alerts]
HTTP Method: GET
Expected Status Code: 200
Keyword Monitoring: "status":"ok"
```

---

## 6. SLO Raporlama

### Haftalık Rapor (her Pazartesi, otomatik)

`.github/workflows/item-bank-health.yml` workflow'u mevcut item bank health metriklerini raporlar.

SLO dashboard'u için önerilen araç:
- **Grafana** (pino log → Loki → Grafana dashboard)
- **Metabase** (PostgreSQL → canlı sorgu dashboard'u)
- **Betterstack Dashboard** (uptime + response time grafikleri)

### Metrikler ve Sorgular

```sql
-- 5xx oranı (son 24 saat)
SELECT
  DATE_TRUNC('hour', "createdAt") AS hour,
  COUNT(*) FILTER (WHERE status >= 500) AS errors,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE status >= 500)::numeric / COUNT(*) * 100, 2) AS error_pct
FROM api_request_log
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY 1 ORDER BY 1;
```

---

## 7. Sorumluluklar

| Rol | Sorumluluk |
|---|---|
| **Platform Engineer** | SLO metrik toplama, uptime monitoring konfigürasyonu |
| **Assessment Director** | AI puanlama SLO ve QWK hedeflerinin gözden geçirilmesi |
| **On-Call** | Kritik alarm yanıtı (docs/OPERATIONS_RUNBOOK.md'e göre) |
| **Tüm ekip** | Hata bütçesi tüketiminin > 75% olduğunda yeni deploy yapmama |

---

## 8. Gözden Geçirme Takvimi

Bu belge her çeyrekte veya aşağıdaki durumlarda güncellenir:
- Yeni bir API endpoint üretim ortamına alındığında
- SLO hedefi tutarsız şekilde karşılanamadığında (2 ay üst üste)
- Mimari değişiklik (yeni veritabanı, yeni AI servisi) sonrasında

**Sonraki Planlı Gözden Geçirme:** 2026-08-10
