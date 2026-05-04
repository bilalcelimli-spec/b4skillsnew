# b4skills — Sınav + Soru Üretim Motoru: SOTA Yol Haritası

> **Version**: 1.0  
> **Tarih**: Mayıs 2026  
> **Sahip**: Assessment Director / Solo Dev  
> **Durum**: Aktif — Phase I başlandı

---

## 0. Mevcut Envanter

### Sınav Motoru (mevcut)
| Bileşen | Durum |
|---------|-------|
| 3PL IRT, EAP estimator (hiyerarşik prior) | ✅ |
| MIRT 6D | ✅ |
| van der Linden Shadow Test (2005) | ✅ |
| MST (multi-stage testing) | ✅ |
| SPRT (Sequential Probability Ratio Test) | ✅ |
| RT-IRT (response time IRT, van der Linden) | ✅ |
| Sympson-Hetter exposure control | ✅ |
| Conditional SEM + classification confidence stopping | ✅ |
| 124 unit test (bias=−0.005, RMSE=0.325, CEFR acc=%89) | ✅ |

### Soru Üretim Motoru (mevcut)
| Bileşen | Durum |
|---------|-------|
| ai-item-generator.ts (3-persona pipeline) | ✅ |
| item-quality-validator.ts | ✅ |
| item-similarity-detector.ts | ✅ |
| item-writing-framework.ts | ✅ |
| readability-engine.ts | ✅ |
| auto-item-generator.ts | ✅ |
| calibration-service.ts | ✅ |
| Pre-scoring integrity guard | ✅ |
| item-generation-pipeline.ts (6-stage) | ✅ |
| Phase 1 validation gates (ValidationReport) | ✅ |

### Boşluklar (kısa özet)
| Alan | Öncelik | Faz |
|------|---------|-----|
| Standard setting (Angoff cut scores) | KRITIK | I |
| Validity argument dokümanı | KRITIK | I |
| Item bank envanter raporu | KRITIK | I |
| DIF audit cron bağlantısı | YÜKSEK | II |
| CINEG equating | YÜKSEK | II |
| AIG kalite metrikleri (pretest survival rate) | ORTA | II–III |
| CDM (DINA/G-DINA) subscore feedback | DÜŞÜK | III |
| Test fraud detection (RT+similarity+IP) | ORTA | III |
| ALTE Q-Mark / ISO 23988 sertifikasyon | UZUN VADELI | IV |

---

## 1. SOTA Hedef Tanımı

### Sınav Motoru — Endüstri Benchmark'ları

| Boyut | SOTA Seviyesi | b4skills Hedefi | Mevcut |
|-------|--------------|----------------|--------|
| Kalibrasyon örnek | n ≥ 1000/item | n ≥ 500 | Ölçülmüyor |
| Item bank boyutu | 5000+ live item | 1000 (B2B) | Belirsiz |
| CEFR sınıflandırma doğruluğu | %92+ | %92+ | %89 |
| Test güvenilirliği | α ≥ 0.92 | ρ ≥ 0.93 | test-info ≥ 12 |
| DIF audit | Yıllık + form-başı | Cron + yıllık | Kısmi |
| Standard setting | Modified Angoff (n≥10) | Faz I | Yok |
| Equating | Pre- ve post-equating | Faz II | Yok |
| Validity argument | Herkese açık Kane-style doküman | Faz I | Taslak ✅ |
| Test sahteciliği tespiti | RT + similarity + IP cluster | Faz III | Sadece RT |

### Soru Üretim Motoru — Endüstri Benchmark'ları

| Boyut | SOTA Seviyesi | b4skills Hedefi | Mevcut |
|-------|--------------|----------------|--------|
| Item üretim kapasitesi | 50+ kalibre item/hafta | Faz III | Üretiliyor, ölçülmüyor |
| AIG kalite (pretest survival) | %60+ | Ölçülecek | Ölçülmüyor |
| CEFR alignment doğruluğu | r ≥ 0.85 (LLM b vs empirik b) | Faz II | Pretest verisi yok |
| Distractor etkinliği | Tüm distractorlar ≥%5 seçilmeli | Faz II | Audit yok |
| Bias tespiti | LLM-as-judge + insan review | Faz II–III | Sadece QA validator |
| Cognitive design model | Embretson radicals/incidentals | Faz III | Sadece prompt-based |

---

## 2. Faz Planı (24 Aylık)

### Faz I — Temel (0–3 ay): "Geçerlilik kanıtı"

| İş | Çıktı | Çaba | Durum |
|----|-------|------|-------|
| TypeScript type-check yeşile al | Sıfır tsc hata | 8h | ✅ TAMAMLANDI |
| Item bank envanter raporu | Admin → Item Inventory sekmesi | 16h | ✅ TAMAMLANDI |
| Validity argument dokümanı | `docs/validity-argument.md` | 40h | ✅ TASLAK |
| Standard setting scaffold | `standard-setting.ts` + `docs/standard-setting-report.md` | 80h | ✅ SCAFFOLD |
| Anchor set scaffold | `anchor-set-service.ts` + API | 60h | ✅ SCAFFOLD |
| Standard setting paneli | N≥8 panelist, Modified Angoff | 80h | 🔲 BEKLIYOR |
| WCAG 2.2 AA audit | Lighthouse 95+ | 40h | 🔲 |
| ALTE Code of Practice dokümantasyonu | docs/alte-code-of-practice.md | 8h | 🔲 |

### Faz II — Kalibrasyon ve Doğrulama (3–6 ay): "Sayısal kanıt"

| İş | Çıktı | Çaba | Durum |
|----|-------|------|-------|
| DIF audit → cron bağlantısı | GitHub Actions haftalık cron | 40h | 🔲 |
| CINEG equating across forms | `psychometrics/equating-cineg.ts` | 60h | 🔲 |
| Subscore reliability (Livingston-Lewis) | `psychometrics/subscore-reliability.ts` | 24h | 🔲 |
| Conditional reliability curves (CSEM) | Score report görseli | 16h | 🔲 |
| Pretest pilot workflow | `lib/calibration/pretest-pilot-service.ts` | 32h | 🔲 |
| Online Bayesian item calibration | calibration-service.ts genişletme | 40h | 🔲 |
| AIG: LLM b vs. empirik b korelasyonu | Pretest sonuç raporu | 32h | 🔲 |
| Distractor audit | Response analytics + audit query | 24h | 🔲 |

### Faz III — İleri Modeller (6–12 ay): "Bilimsel saygınlık"

| İş | Çıktı | Çaba |
|----|-------|------|
| CDM (DINA/G-DINA) subscore feedback | `psychometrics/cdm-engine.ts` | 80h |
| Whisper-large-v3 fallback ASR + WER | `lib/scoring/asr-fallback.ts` | 40h |
| Multi-LLM bias review (Claude + GPT-4o) | `lib/ai/bias-review-orchestrator.ts` | 32h |
| Item bank rotation (alpha-stratified) | Selector güncellemesi | 24h |
| Test fraud detection (RT + similarity + IP) | `lib/security/fraud-detection.ts` | 60h |
| Z3 constraint solver shadow test | shadow-test.ts yükseltme | 40h |
| Embedding off-topic detector (pgvector) | `lib/scoring/off-topic-detector.ts` | 24h |

### Faz IV — Endüstri Sertifikası (12–18 ay): "Pazara açıl"

| İş | Çıktı | Çaba |
|----|-------|------|
| ALTE Q-Mark başvuru paketi | Standards mapping document | 80h |
| ISO/IEC 23988 compliance audit | Security + accessibility checklist | 60h |
| Karşılaştırmalı validasyon (Linguaskill) | n≥100 paired test | 120h |
| Yıllık DIF audit raporu | PDF + admin dashboard | 24h |
| Validity argument peer-review makale | Language Testing dergisi | 100h |
| GDPR/FERPA data export & delete | API + admin UI | 40h |

### Faz V — İnovasyon (18–24 ay): "Liderlik"

| İş | Çıktı | Çaba |
|----|-------|------|
| LLM fine-tuning (CEFR examiner persona) | LoRA adapter on Llama 3.3 | 200h |
| Multi-turn dialogue speaking task | Yeni ItemType + frontend | 120h |
| RT-IRT joint calibration (van der Linden 2007) | useRtIrt flag genişletme | 40h |
| Adaptive item-pool depletion forecasting | Time-series model | 32h |
| Cross-lingual fairness study (Turkish, Arabic, Spanish L1) | Research paper | 80h |

---

## 3. Öğrenme Yol Haritası

### Faz 1 — Temel (0–3 ay)

| Öncelik | Kaynak | Odak |
|---------|--------|------|
| 1 | de Ayala — *The Theory and Practice of IRT* (2022) | Mevcut 3PL kodunu anlama |
| 2 | AERA/APA/NCME — *Standards for Educational and Psychological Testing* (2014) | Validity argument temeli |
| 3 | Bachman & Palmer — *Language Assessment in Practice* (2010) | CEFR + pratik framework |
| 4 | CoE — *CEFR Companion Volume* (2020), Annex 5–8 | Mediation, Plurilingual |

### Faz 2 — Operasyonel (3–6 ay)

| Öncelik | Kaynak | Odak |
|---------|--------|------|
| 5 | van der Linden — *Handbook of IRT, Vol. 1* | GRM, NRM, mixed-format |
| 6 | van der Linden — *Computerized Adaptive Testing* (2010) | Shadow test teorisi |
| 7 | Kolen & Brennan — *Test Equating, Scaling, and Linking* (3rd ed., 2014) | CINEG equating |
| 8 | Embretson & Reise — *IRT for Psychologists* (2000) | Cognitive design model |
| 9 | Gierl & Haladyna — *Automatic Item Generation* (2013) | AIG için ana kaynak |

### Faz 3 — İleri (6–12 ay)

| Öncelik | Kaynak | Odak |
|---------|--------|------|
| 10 | de la Torre & Sorrel — *Cognitive Diagnostic Modeling* (2023) | DINA/G-DINA |
| 11 | Wainer et al. — *Test Validity* (1988) | Messick validity construct |
| 12 | NRC — *Knowing What Students Know* (2001) | Modern assessment design |

### Akademik Dergiler (RSS'e ekle)

| Dergi | Yıllık makale |
|-------|--------------|
| Psychometrika | ~80 |
| Applied Psychological Measurement | ~40 |
| Journal of Educational Measurement | ~30 |
| Language Testing | ~30 |
| Educational Measurement: Issues & Practice | ~20 |
| Language Assessment Quarterly | ~25 |

### Konferanslar (solo dev önceliği)

| Konferans | Zaman | Öneri |
|-----------|-------|-------|
| NCME Annual Meeting | Nisan/Mayıs | Keynote videoları YouTube'da izle |
| LTRC (Language Testing Research Colloquium) | Haziran/Temmuz | Dil testi en niş konferans |
| EALTA | Mayıs | ALTE Q-Mark için bağlantı |

---

## 4. Teknoloji Stack Eklemeleri

### Sınav Motoru

```
Mevcut:  TS + Prisma + PostgreSQL + Express + Vitest
Eklemek:
  ├─ Python sidecar (R&D)
  │    ├─ pyirt / py-irt              [DIF + kalibrasyon sandbox]
  │    └─ jupyter                      [research notebooks]
  ├─ R sidecar (gerektiğinde)
  │    ├─ mirt                         [MIRT kalibrasyon ground truth]
  │    ├─ difR                         [Mantel-Haenszel + standardized P-DIF]
  │    └─ equateIRT                    [form equating]
  ├─ DuckDB                            [analytics on response logs]
  └─ Z3 TS bindings                    [shadow test constraint solver]
```

### Soru Üretim Motoru

```
Mevcut:  Gemini 2.5 Flash (single LLM)
Eklemek:
  ├─ Claude Sonnet 4.5           [bias/sensitive content review]
  ├─ GPT-4o                      [3rd-opinion anchor scoring]
  ├─ text-embedding-3-large      [semantic similarity]
  └─ pgvector                    [semantic dedup + off-topic detection]
```

---

## 5. Standartlar ve Sertifikasyon

| Standart | Kapsam | Hedef Faz |
|----------|--------|-----------|
| AERA/APA/NCME 2014 | Tüm test geliştirme | Sürekli rehber |
| CEFR Companion Volume 2020 | Dil seviyesi alignment | Mevcut |
| ALTE Code of Practice | Etik + fairness | Faz I dokümante et |
| WCAG 2.2 AA | Accessibility | Faz I |
| GDPR + FERPA + KVKK | Veri koruma | Faz I–II |
| ISO/IEC 23988:2007 | Computer-based testing security | Faz IV |
| ALTE Q-Mark | EU dil testi kalite | Faz IV |
| ISO 27001 | Bilgi güvenliği | Faz IV |
| EALTA Good Practice Guidelines | Avrupa best practice | Faz I dokümante et |

---

## 6. 90 Günlük Kişisel Öğrenme Planı

| Hafta | Aktivite | Çıktı |
|-------|----------|-------|
| 1–2 | de Ayala IRT bölüm 1–4 | Notebook: 3PL'i kendi koduna karşı doğrula |
| 3–4 | Bachman & Palmer + CEFR Companion bölüm 5–7 | `docs/cefr-construct-map.md` |
| 5–6 | AERA/APA/NCME Standards bölüm 1, 2, 5 | Validity argument şablonu doldurmaya başla |
| 7 | Concerto Platform tutorial | b4skills vs Concerto mini-karşılaştırma |
| 8 | NCME 2024 keynote (YouTube, ücretsiz) | Trend listesi |
| 9–10 | Gierl & Haladyna AIG bölüm 1–5 | Item generator'ı cognitive design model ile tasarla |
| 11–12 | mirt R paketi + 1 kalibrasyon notebook | TS engine vs R mirt karşılaştırması |
| 13 | Standard setting workshop (NCME webinar arşivi) | Modified Angoff plan taslağı |

---

## 7. Tamamlanan İşler (Faz I Başlangıcı)

- ✅ **TypeScript type-check temizlendi** — 0 hata (sıfır `tsc --noEmit` hatası)
  - Prisma `Item.metadata Json?` eklendi + migration oluşturuldu
  - Firebase bağımlılığı kaldırıldı → FileReader API ile değiştirildi
  - `QualityIssueSeverity` büyük/küçük harf uyumsuzlukları düzeltildi
  - `batch-dif-detection.ts` → `candidateProfile` üzerinden demografik erişim düzeltildi
  - `live-metrics-engine.ts` → `Partial<Record<CefrLevel, ...>>` tip düzeltmesi

- ✅ **Item Bank Inventory** — Admin → "Item Inventory" sekmesi
  - `GET /api/items/inventory` endpoint (skill × CEFR × status matrix)
  - Renk kodlu heatmap bileşeni (kırmızı = kritik eksiklik)

- ✅ **Validity Argument şablonu** — `docs/validity-argument.md`
  - Kane 2013 framework'ü: 5 inference × warrants + rebuttals + evidence needed

- ✅ **Standard setting scaffold** — `docs/standard-setting-report.md`
  - Modified Angoff prosedürü dokümante edildi
  - API endpoints: `/api/psychometrics/standard-setting/*`

- ✅ **Anchor set scaffold** — `src/lib/psychometrics/anchor-set-service.ts`
  - CINEG equating desteği için anchor item yönetimi
  - `seedFromActiveItems()` Phase I bootstrap
  - API endpoints: `/api/psychometrics/anchor-set/*`

---

## 8. Sıradaki Somut 3 Adım

1. **Standard setting paneli oluştur** (bu hafta): CEFR-sertifikalı 8 EFL öğretmenini panelist olarak davet et; `docs/standard-setting-report.md`'deki prosedürü uygula.

2. **Item bank envanter sonuçlarını analiz et**: `GET /api/items/inventory` çıktısına bakarak hangi skill × CEFR hücrelerinin kritik eksik (kırmızı) olduğunu belirle; öncelikli seed sırası oluştur.

3. **`docs/cefr-construct-map.md` yaz**: Bachman & Palmer + CEFR Companion Volume 2020 bölüm 5–7'yi okuyarak her skill için CEFR descriptor → item type → construct map oluştur (Inference 3 validity kanıtı).
