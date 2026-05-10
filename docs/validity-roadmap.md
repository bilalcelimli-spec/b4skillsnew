# CEFR Geçerlik & Güvenilirlik Yol Haritası — b4skills

> **Çerçeve:** Kane (2013) Argümana Dayalı Geçerlik + ALTE Code of Practice + CEFR Companion Volume 2020  
> **Durum:** Yaşayan belge — kanıt birikimini takip eder  
> **Sahip:** Assessment Director / Psikometri Sorumlusu  
> **Son güncelleme:** 2026-05  
> **İlgili dosyalar:** `docs/validity-argument.md`, `docs/standard-setting-report.md`, `src/lib/product-lines/profiles.ts`

---

## Geçerlik Piramidi

```
            ┌─────────────────────────┐
            │   Katman 5 — Kararlar   │  CEFR sınıf kararları savunulabilir mi?
            │   (Decision Validity)   │
            └─────────┬───────────────┘
            ┌─────────▼───────────────┐
            │  Katman 4 — Kestirme    │  θ tahmini gerçek dil yetkinliğini yansıtıyor mu?
            │  (Extrapolation)        │
            └─────────┬───────────────┘
            ┌─────────▼───────────────┐
            │  Katman 3 — Genelleme   │  Sonuçlar farklı form/tarihe taşınır mı?
            │  (Generalization)       │
            └─────────┬───────────────┘
            ┌─────────▼───────────────┐
            │  Katman 2 — Puanlama    │  Maddeler doğru ve tutarlı ölçüyor mu?
            │  (Scoring Validity)     │
            └─────────┬───────────────┘
            ┌─────────▼───────────────┐
            │  Katman 1 — İçerik      │  Maddeler CEFR descriptor'larını temsil ediyor mu?
            │  (Content Validity)     │
            └─────────────────────────┘
```

Her katman, altındakinin temeline oturur. Biri eksik olduğunda üstteki tüm katmanlar çürür.

---

## Katman 1 — İçerik Geçerliği (Content Validity)

### 1.1 Blueprint Matrisi — Minimum Madde Envanteri

Her hücre: **skill × CEFR seviyesi** — hedef aktif madde sayısı.

| Skill      | PRE_A1 | A1  | A2  | B1  | B2  | C1  | C2  | Toplam |
|------------|--------|-----|-----|-----|-----|-----|-----|--------|
| READING    | —      | ≥30 | ≥30 | ≥35 | ≥35 | ≥25 | ≥20 | ≥175   |
| LISTENING  | —      | ≥30 | ≥30 | ≥35 | ≥35 | ≥25 | ≥20 | ≥175   |
| WRITING    | —      | ≥12 | ≥15 | ≥15 | ≥15 | ≥12 | ≥10 | ≥79    |
| SPEAKING   | —      | ≥12 | ≥15 | ≥15 | ≥15 | ≥12 | ≥10 | ≥79    |
| GRAMMAR    | ≥15    | ≥30 | ≥30 | ≥35 | ≥35 | ≥25 | ≥20 | ≥190   |
| VOCABULARY | ≥15    | ≥30 | ≥30 | ≥35 | ≥35 | ≥25 | ≥20 | ≥190   |
| **TOPLAM** | ≥30    | ≥144| ≥150| ≥170| ≥170| ≥124| ≥100| **≥888** |

**Exposure control kuralı:** ψ ≤ 0.20 hedeflenmişse her hücre için teorik minimum = hedef_madde / 0.20.  
Phase I geçici tolerans: ψ ≤ 0.35 → hücre başına ≥ 30 madde yeterli.

**Eylem öğesi:**
```bash
GET /api/admin/items/inventory?groupBy=skill,cefrLevel&status=ACTIVE
```
Eksik hücre < 20 madde → AI generator ile doldur → pretest pipeline'a al.

---

### 1.2 Madde Yazım Çerçevesi — CEFR Descriptor Hizalaması

Her skill × seviye için operasyonel tanımlar `docs/cefr-construct-map.md` dosyasında tutulur.  
Aşağıdaki kısaltılmış özet; tam tablo construct map'te.

#### READING

| Seviye | Kelime sayısı | Soru türü dağılımı | Okunabilirlik | Konular |
|--------|---------------|---------------------|---------------|---------|
| A1     | ≤ 80          | %70 doğrudan bilgi, %30 kelime anlam | FK Grade ≤ 2 | Aile, ev, sayılar, renkler |
| A2     | 80–150        | %60 doğrudan, %30 çıkarım, %10 bağlam | FK Grade 2–4 | Alışveriş, yolculuk, günlük rutin |
| B1     | 150–300       | %40 doğrudan, %45 çıkarım, %15 söylem | FK Grade 5–7 | Haber, kısa makale, sosyal konular |
| B2     | 300–500       | %25 doğrudan, %50 analiz, %25 retorik | FK Grade 8–10 | Akademik-öncesi, pozisyon makaleleri |
| C1     | 500–800       | %15 doğrudan, %45 analiz, %40 değerlendirme | FK Grade 11–14 | Akademik, mesleki, gazete |
| C2     | 700–1000      | %10 doğrudan, %40 analiz, %50 eleştirel | FK Grade ≥ 14 | Özgün edebi/akademik/teknik metin |

#### LISTENING

| Seviye | Format | Hız (wpm) | Vurgu/Lehçe |
|--------|--------|-----------|-------------|
| A1–A2  | Kısa diyalog (30–60 sn) | ≤ 120 | Standart RP/GenAm |
| B1     | Diyalog + kısa monolog (1–2 dk) | 120–150 | Hafif aksan kabul |
| B2     | Monolog / tartışma (2–3 dk) | 130–160 | Çeşitli lehçe |
| C1–C2  | Akademik ders / seminer (3–5 dk) | 150–180 | Doğal hız, lehçe çeşitliliği |

#### WRITING — Analitik Rubric Boyutları

```
Boyut                  | A2  | B1  | B2  | C1  | C2
───────────────────────┼─────┼─────┼─────┼─────┼─────
Task Achievement       | ≥3  | ≥3  | ≥3.5| ≥4  | ≥4.5   (0–5 skala)
Coherence & Cohesion   | ≥2.5| ≥3  | ≥3.5| ≥4  | ≥4.5
Lexical Resource       | ≥2.5| ≥3  | ≥3.5| ≥4  | ≥4.5
Grammatical Range & Acc| ≥2.5| ≥3  | ≥3.5| ≥4  | ≥4.5
```

Her boyut **ayrı puan** olarak kaydedilmeli — polytomous IRT için kritik.

#### SPEAKING — Analitik Rubric Boyutları

```
Boyut                  | A2  | B1  | B2  | C1  | C2
───────────────────────┼─────┼─────┼─────┼─────┼─────
Fluency & Coherence    | ≥2.5| ≥3  | ≥3.5| ≥4  | ≥4.5
Lexical Resource       | ≥2.5| ≥3  | ≥3.5| ≥4  | ≥4.5
Grammatical Range & Acc| ≥2.5| ≥3  | ≥3.5| ≥4  | ≥4.5
Pronunciation          | ≥2.5| ≥3  | ≥3.5| ≥4  | ≥4.5
```

---

### 1.3 Kelime Profil Analizi (Vocabulary Profiler)

Her reading/listening pasajının kelime bandı dağılımı analiz edilmeli.

**Referans:** English Vocabulary Profile (EVP) / British National Corpus (BNC) CEFR kelime listeleri  
**Modül:** `src/lib/language-skills/vocabulary-profiler.ts`

**Kontrol kuralı:**
```
A1 pasajı → A1 band kelimeler ≥ %85; A2+ kelimeler ≤ %5
B1 pasajı → A1+A2 band kelimeler ≥ %80; C1+ kelimeler ≤ %5
C1 pasajı → B1+ band ağırlıklı; ≥ %30 C1+ kelimeler
```

---

### 1.4 Uzman İçerik İnceleme Protokolü

| Aşama | Rol | Araç | Çıktı |
|-------|-----|------|-------|
| 1 — Üretim | AI Generator | auto-item-generator.ts | Ham madde |
| 2 — Teknik | İç QA (3-persona) | item-quality-validator.ts | Düzeltilmiş madde |
| 3 — Pedagojik | 2 CEFR-sertifikalı öğretmen | Google Form rubric | Kabul/Ret/Revizyon |
| 4 — Hassas (B2+) | 1 dilbilimci | Manuel inceleme | Onay |
| 5 — Önyargı | Çeşitli L1 profil | DIF anketi | Bayrak kaldır |

Minimum geçiş: aşama 1–3. `status: EXPERT_APPROVED` DB alanı eklenmeli.

---

## Katman 2 — Puanlama Geçerliği (Scoring Validity)

### 2.1 IRT Model Uyum Hedefleri

```
İnfit/Outfit (MNSQ):
  Kabul:         0.70 ≤ infit ≤ 1.30
  Uyarı:         infit > 1.50 veya < 0.50  → 30 gün içinde inceleme
  Otomatik retire: infit > 2.00 veya < 0.30

Biseryal korelasyon (r_bis):
  Kabul:   r_bis ≥ 0.30
  Uyarı:   0.20 ≤ r_bis < 0.30  → içerik inceleme
  Retire:  r_bis < 0.15
```

**Eylem:** `calibration-service.ts`'e infit/outfit hesaplaması ekle (N ≥ 50 yanıt sonrası).

---

### 2.2 Diferansiyel Madde Fonksiyonu (DIF)

**Gruplar:** L1 (Türkçe, Arapça, Farsça, Rusça, Çince, diğer), cinsiyet, yaş grubu

**Yöntem:** Mantel-Haenszel (kategorik), Lord's χ² (IRT-tabanlı)

```
DIF Sınıfı A (ihmal edilebilir): |MH D-DIF| < 1.0  → kabul
DIF Sınıfı B (orta):             1.0 ≤ |MH D-DIF| < 1.5  → içerik inceleme, etiket ekle
DIF Sınıfı C (büyük):            |MH D-DIF| ≥ 1.5  → otomatik retire
```

**Veri gereksinimi:** Her grup için N ≥ 200 yanıt. Registration formuna `nativeLanguage` (opsiyonel) alanı eklenmeli.

**Modül:** `src/lib/assessment-engine/calibration-service.ts` — DIF modülü (Q3 2026)

---

### 2.3 AI Puanlama Kalibrasyonu — QWK Protokolü

```
Faz 1 — Başlangıç Kalibrasyon:
  • Her skill × CEFR seviyesi: N ≥ 30 çapa yanıt
  • 3 eğitimli insan hakem → consensus score (Fleiss κ)
  • AI puanı vs. consensus: QWK hesapla; hedef ≥ 0.80

Faz 2 — Sürekli İzleme (Aylık):
  • Rastgele N = 50 yanıt double-scoring
  • QWK ≥ 0.80 → geç
  • QWK 0.75–0.79 → uyarı; model inceleme
  • QWK < 0.75 → alarm; model versiyonu beklet

Faz 3 — Çapraz Doğrulama (Yıllık):
  • Cambridge eğitimli hakem karşılaştırması
  • Hedef: r ≥ 0.80 (AI vs. Cambridge trained rater)
```

**Rubric boyut bazlı QWK:** Genel QWK iyi olsa bile her boyut (fluency, lexical, grammar, pronunciation) ayrı QWK hesaplanmalı.

**Cron:** `.github/workflows/ai-calibration-check.yml` (ayda bir, 1. gün 06:00 UTC)

---

### 2.4 Polytomous IRT — Writing/Speaking Bilgi Artışı

**Mevcut sorun:**
```
Writing rubric: 4 boyut × 0–5 = 0–20 toplam puan
Sisteme giriş:  toplam / 20 → binary item gibi işleme
Binary bilgi:   I ≈ 0.5

Olması gereken (GRM/GPCM):
Her boyut ayrı partial-credit item → I_boyut ≈ 2.8
4 boyut × 2.8 = 11.2 toplam bilgi → SEM ≈ 0.30
```

**Kısa vade:** Her rubric boyutunu ayrı yanıt olarak theta güncellemesine kat.  
**Uzun vade:** `src/lib/psychometrics/polytomous-irt.ts` — GPCM kalibrasyonu (Q1 2027)

---

### 2.5 RT-IRT Parametre Kalibrasyonu

Her madde için `λ_i` (log-zaman ortalama), `φ_i` (temporal discrimination) empirik olarak hesaplanmalı.

```
Mevcut: content.rtParams → varsayılan sabit değerler
Hedef:  N ≥ 100 yanıt/madde → empirical λ_i, φ_i güncelleme
```

---

## Katman 3 — Genelleme (Generalization)

### 3.1 Madde Bankası Minimum Büyüklüğü ve Exposure Control

```
Sympson-Hetter hedefi: ψ ≤ 0.20

Teorik minimum bank boyutu:
  30 madde × (1/0.20) = 150 madde/hücre (ideal)

Phase I pratik hedef:
  ≥ 30 aktif madde/hücre, ψ ≤ 0.35

Konu çeşitliliği kuralı:
  Tek konu ≤ %20 kullanım (konu bayrağı shadow-test'e eklenmeli)
```

### 3.2 Güvenilirlik ve SEM Hedefleri — Profil Bazlı

| Profil               | Marginal ρ | Sınırlarda SEM | Band Merkezlerinde SEM | L-L κ |
|----------------------|------------|----------------|------------------------|-------|
| Primary (7-10)       | ≥ 0.86     | ≤ 0.50         | ≤ 0.40                 | ≥ 0.76 |
| Junior Suite (11-14) | ≥ 0.89     | ≤ 0.45         | ≤ 0.36                 | ≥ 0.78 |
| 15-Min Diagnostic    | ≥ 0.82     | ≤ 0.48         | ≤ 0.42                 | ≥ 0.72 |
| Academia             | ≥ 0.93     | ≤ 0.32         | ≤ 0.28                 | ≥ 0.85 |
| Corporate            | ≥ 0.90     | ≤ 0.37         | ≤ 0.30                 | ≥ 0.80 |
| Language Schools     | ≥ 0.89     | ≤ 0.40         | ≤ 0.34                 | ≥ 0.78 |

**L-L κ:** Livingston-Lewis sınıflandırma tutarlılığı — `src/lib/psychometrics/classification-consistency.ts`

### 3.3 Form Eşitleme (Equating)

```
Yöntem: CINEG (Common Item Non-Equivalent Groups)
Çapa madde seti: Her form için N = 15 sabit "anchor" madde
Eşitleme periyodu: Yılda 1 (her Haziran)
Ölçek drift kontrolü: Eski vs. yeni kalibrasyon korelasyonu ≥ 0.95
```

### 3.4 Subskor Güvenilirliği

Subskor farkı rapor edilmeden önce:
```
ρ_diff = (ρ_A + ρ_B − 2r_AB) / (2(1 − r_AB))
ρ_diff ≥ 0.70 → fark raporlanabilir
ρ_diff < 0.70 → "Bu fark ölçüm hatası sınırları içindedir" uyarısı
```

---

## Katman 4 — Kestirme (Extrapolation)

### 4.1 Eş Zamanlı Geçerlik Çalışması Takvimi

| Harici Test | Yöntem | Hedef N | Tarih | Hedef r |
|-------------|--------|---------|-------|---------|
| Cambridge Linguaskill | Paired sample | ≥ 100 | Q4 2026 | ≥ 0.78 |
| IELTS (kurumsal) | Paired sample | ≥ 80 | Q1 2027 | ≥ 0.75 |
| B2 First (FCE) | Arşiv skoru | ≥ 50 | Q4 2026 | ≥ 0.75 |

**Protokol:** Aynı adaylar, b4skills ve harici testi 30 gün içinde alır.  
Çıktı: Pearson r + Cohen's kappa (CEFR band agreement)

### 4.2 Prediktif Geçerlik (Longitudinal)

- B2 belgesi verilen adayların 6 ay sonra iş/akademik başarısı
- Hedef: r ≥ 0.55 (b4skills skor × kriter değerlendirmesi)
- KVKK uyumlu longitudinal takip sözleşmesi gerekli

### 4.3 Özgünlük Kontrol Listesi (Authenticity)

Her madde yayınlanmadan önce:
```
□ Gerçek hayat iletişim durumu mu?
□ Yapay "test dili" kullanılmıyor mu?
□ Pasaj gerçek kaynaklardan uyarlandı mı?
□ Speaking görevi gerçek iletişim amacı taşıyor mu?
□ Writing görevi gerçek bir metin türü mü (email/rapor/makale)?
□ Kültürel önyargı potansiyeli değerlendirildi mi?
```

---

## Katman 5 — Karar Geçerliği (Decision Validity)

### 5.1 Standard Setting — Angoff Panel Protokolü

**Hedef tarih:** Q3 2026 (Eylül)

**Panelist profili (N = 8–12):**
- 4 × CEFR-sertifikalı EFL/ESL öğretmeni (Cambridge Delta veya CTEFLA, ≥ 5 yıl)
- 2 × kurumsal İngilizce öğretmeni (iş İngilizcesi)
- 1 × dil ölçme uzmanı
- 1 × CEFR eğiticisi

**2 Günlük Program:**
```
Gün 1:
  09:00–11:00  CEFR Companion Volume 2020 eğitimi
  11:00–12:00  Angoff prosedürü + 5 pratik madde
  13:00–15:30  Round 1: P(doğru | borderline aday) tahminleri
  15:30–16:30  Grup tartışması + istatistik geri bildirim
  16:30–17:30  Round 2: Revize tahminler

Gün 2:
  09:00–12:00  Sınır belirleme (A1/A2, A2/B1, B1/B2)
  13:00–16:00  Sınır belirleme (B2/C1, C1/C2) + itiraz prosedürü
  16:00–17:00  BCa bootstrap CI hesaplama + final rapor
```

**Kalite kontrolleri:**
```
Panelist tutarlılığı:    r(Round1, Round2) > 0.70 per panelist
Paneller arası uyum:    CV < 0.15
Cut score monotonicity: Her sınır bir öncekinden ≥ 0.5 θ yüksek
BCa 95% CI genişliği:  < 0.5 θ birimi
```

### 5.2 Borderline Raporlama Sistemi

```typescript
// ScoreReport'ta zorunlu alan:
interface BorderlineAssessment {
  isBorderline: boolean;            // |θ − cut| < 1.96 × SEM
  lowerBound: CefrLevel;
  upperBound: CefrLevel;
  posteriorProbability: number;     // P(gerçek seviye = atanan seviye)
  recommendedAction:
    | "ACCEPT"         // P > 0.80
    | "RETEST"         // 0.65 < P ≤ 0.80
    | "EXPERT_REVIEW"; // P ≤ 0.65
}
```

### 5.3 Livingston-Lewis Sınıflandırma Tutarlılığı

Modül: `src/lib/psychometrics/classification-consistency.ts`

```
κ = (P_agree − P_chance) / (1 − P_chance)

κ ≥ 0.80 → güçlü tutarlılık (iş/akademik kararlar)
κ ≥ 0.70 → orta (dil okulu yerleştirme)
κ < 0.70 → yetersiz → madde bankası büyütülmeli
```

---

## Uygulama Takvimi

### 2026 Q3 (Temmuz–Eylül) — Temel Altyapı

| # | Eylem | Modül / Dosya | Sahip | Durum |
|---|-------|---------------|-------|-------|
| 1 | Profil madde sayısı revizyonu | `profiles.ts` | Dev | ✅ Tamamlandı |
| 2 | Geçerlik yol haritası | `docs/validity-roadmap.md` | Psikometri | ✅ Tamamlandı |
| 3 | CEFR construct map | `docs/cefr-construct-map.md` | Psikometri | ✅ Tamamlandı |
| 4 | Sınıflandırma tutarlılığı (L-L κ) | `classification-consistency.ts` | Dev | ✅ Tamamlandı |
| 5 | Kelime profil analizi | `vocabulary-profiler.ts` | Dev | ✅ Tamamlandı |
| 6 | Aylık QWK cron | `ai-calibration-check.yml` | DevOps | ✅ Tamamlandı |
| 7 | Madde bankası envanter raporu | Admin panel | Dev | 🔲 Bekliyor |
| 8 | Angoff panel çalışması | Standard setting | Psikometri | 🔲 Eylül 2026 |
| 9 | L1 alanı (DIF için) | Registration form | Dev | 🔲 Bekliyor |

### 2026 Q4 (Ekim–Aralık) — Doğrulama

| # | Eylem | Hedef | Durum |
|---|-------|-------|-------|
| 10 | Cambridge Linguaskill concurrent validity | r ≥ 0.78, N = 100 | 🔲 |
| 11 | QWK kalibrasyon çalışması (Writing+Speaking) | QWK ≥ 0.80 | 🔲 |
| 12 | DIF analizi modülü | MH D-DIF tüm L1 grupları | 🔲 |
| 13 | Subskor reliability raporu | ρ_diff ≥ 0.70 | 🔲 |
| 14 | Borderline raporlama | ScoreReport entegrasyonu | 🔲 |
| 15 | MIRT CFA (N ≥ 500 aday) | 6D factor structure | 🔲 |

### 2027 Q1–Q2 — İleri Psikometri

| # | Eylem | Hedef | Durum |
|---|-------|-------|-------|
| 16 | IELTS concurrent validity | r ≥ 0.75, N = 80 | 🔲 |
| 17 | CINEG form equating altyapısı | Yıllık eşitleme | 🔲 |
| 18 | RT-IRT parametre kalibrasyonu | N ≥ 100/madde | 🔲 |
| 19 | Polytomous IRT (GPCM) | Writing/Speaking bilgi × 5.6 | 🔲 |
| 20 | Prediktif geçerlik başlatma | 6 ay longitudinal | 🔲 |

### 2027 Q3–Q4 — Dış Denetim

| # | Eylem | Hedef | Durum |
|---|-------|-------|-------|
| 21 | ALTE Code of Practice dış denetim | Sertifikasyon | 🔲 |
| 22 | Peer-reviewed geçerlik raporu | Yayın | 🔲 |
| 23 | Avrupa Konseyi CEFR alignment denetimi | Onay | 🔲 |
| 24 | Cognitive Diagnostic Model (G-DINA) | Araştırma fazı | 🔲 |

---

## Kritik Kırılganlıklar (Öncelik Sırası)

```
🔴 KRİTİK (Hemen):
  1. Madde bankası eksik hücreleri: < 20 madde/hücre → exposure riski
  2. Gerçek Angoff paneli yok: tüm cut scores sentetik → hukuki savunulamaz
  3. QWK empirik doğrulama yok: AI vs. human hakem çalışması yapılmamış

🟡 YÜKSEK (Bu çeyrek):
  4. DIF analizi yok: L1 alanı registration'a eklenmeli
  5. Concurrent validity yok: harici test korelasyonu bilinmiyor
  6. Livingston-Lewis κ hesaplanmıyor

🟢 ORTA (2026 Q4):
  7. Subskor fark güvenilirliği kontrol edilmiyor
  8. Polytomous IRT eksik → Writing/Speaking bilgisi düşük
  9. RT-IRT parametreleri varsayılan
```

---

## Psikometrik Hedef Özeti

```
Marginal reliability (ρ):              ≥ 0.90 (Academia ≥ 0.93)
Conditional SEM @ CEFR boundaries:    ≤ 0.45 θ
Test information @ boundaries:        I(θ_cut) ≥ 4.9
Livingston-Lewis κ:                   ≥ 0.80
AI Writing QWK:                       ≥ 0.80
AI Speaking QWK:                      ≥ 0.78
Concurrent validity (r):              ≥ 0.78 (Linguaskill)
Item infit range:                      0.70–1.30
DIF max (MH D-DIF):                   < 1.5 (Sınıf C retire)
Exposure rate max (ψ):                ≤ 0.20 (Phase I: ≤ 0.35)
Item bank per cell:                    ≥ 30 aktif madde
Classification accuracy @ centers:    ≥ 92%
```

---

## Referanslar

- Kane, M. T. (2013). Validating the interpretations and uses of test scores. *Journal of Educational Measurement, 50*(1), 1–73.
- AERA/APA/NCME. (2014). *Standards for Educational and Psychological Testing*. Washington, DC.
- Council of Europe. (2020). *Common European Framework of Reference for Languages: Companion Volume*. Strasbourg.
- Bachman, L. F., & Palmer, A. (2010). *Language Assessment in Practice*. Oxford University Press.
- Livingston, S. A., & Lewis, C. (1995). Estimating the consistency and accuracy of classifications based on test scores. *Journal of Educational Measurement, 32*(2), 179–197.
- van der Linden, W. J. (2005). *Linear Models for Optimal Test Design*. Springer.
- Mantel, N., & Haenszel, W. (1959). Statistical aspects of the analysis of data from retrospective studies. *Journal of the National Cancer Institute, 22*(4), 719–748.
- Sympson, J. B., & Hetter, R. D. (1985). Controlling item-exposure rates in computerized adaptive testing. *Proceedings of the 27th Annual Meeting of the Military Testing Association* (pp. 973–977).
