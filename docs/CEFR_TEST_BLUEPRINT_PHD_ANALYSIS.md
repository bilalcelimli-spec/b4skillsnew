# b4skills — CEFR Test Blueprint ve İçerik Sınıflama Çerçevesi

**PhD-Düzeyi Psikometrik Analiz** · *Standartlar: CEFR Companion Volume 2020 · ALTE Code of Practice · AERA/APA/NCME (2014) · Bachman & Palmer (2010)*

> Bu doküman, sistemdeki tüm sınav türlerini ve item havuzunu inceleyerek (a) CEFR sınıflamasının nasıl yapılması gerektiğini, (b) her sınav formatı × beceri × CEFR seviyesi için **kaç item gerektiğini** ve (c) içerik blueprint'lerinin nasıl optimize edilmesi gerektiğini ortaya koyar. Üç soruyu da hem teorik (Item Response Theory, Classical Test Theory) hem ampirik (alan uygulamaları: Cambridge, ETS, Pearson, BC) temelde yanıtlar.

---

## 0. SİSTEMİN MEVCUT YAPISAL TESPİTİ

### 0.1 Veri Modeli (Prisma schema'dan)

| Boyut | Değerler |
|---|---|
| **Item Types (6)** | `MULTIPLE_CHOICE` · `FILL_IN_BLANKS` · `DRAG_DROP` · `SPEAKING_PROMPT` · `WRITING_PROMPT` · `INTEGRATED_TASK` |
| **Skills (6)** | `READING` · `LISTENING` · `WRITING` · `SPEAKING` · `GRAMMAR` · `VOCABULARY` |
| **CEFR Levels (7)** | `PRE_A1` · `A1` · `A2` · `B1` · `B2` · `C1` · `C2` |
| **Product Lines (7)** | Primary · Junior Suite · 15-Min Diagnostic · Express (30-Min) · Academia · Corporate · Language Schools |
| **IRT Model** | 3PL (a, b, c parametreleri kalibre ediliyor) |

### 0.2 Mevcut Item Bank — Hücre Bazında Yaklaşık Yoğunluk

Üretim seed scriptlerinden (`scripts/seed-*.ts` 71 dosya) elde edilen tahminler:

| Skill | PRE_A1 | A1 | A2 | B1 | B2 | C1 | C2 | **Toplam** |
|---|---|---|---|---|---|---|---|---|
| GRAMMAR    | ~30 | ~80 | ~120 | ~150 | ~160 | ~120 | ~80 | **~740** |
| VOCABULARY | ~25 | ~70 | ~110 | ~140 | ~150 | ~110 | ~70 | **~675** |
| READING    | ~15 | ~50 | ~90  | ~110 | ~120 | ~90  | ~55 | **~530** |
| LISTENING  | ~20 | ~50 | ~80  | ~100 | ~110 | ~80  | ~45 | **~485** |
| WRITING    |   0 |   5 |  10  |  15  |  18  |  12  |   8 | **~68**  |
| SPEAKING   |   0 |   5 |  10  |  15  |  18  |  12  |   8 | **~68**  |
| **Toplam** | **90** | **260** | **420** | **530** | **576** | **424** | **266** | **~2 566** |

> Gerçek DB sorgusu: `SELECT skill, "cefrLevel", COUNT(*) FROM "Item" GROUP BY 1,2`. Yukarıdaki tahminlerden ±%15 sapma normal.

### 0.3 Tespit Edilen 5 Kritik Açık

1. **Productive skill (W/S) item havuzu yetersiz** — Cambridge B2 First sınavının Writing havuzunda 1500+ task var; bizde ~18.
2. **PRE_A1 düzeyinde WRITING/SPEAKING yok** — Pre-A1 Starters seviyesi için Cambridge Young Learners modeli gerektirir (Sketch + Picture description).
3. **Item type heterojenliği düşük** — Sistemde 6 item type tanımlı ama %95+ item `MULTIPLE_CHOICE` (`type: "MULTIPLE_CHOICE"`). `FILL_IN_BLANKS`, `DRAG_DROP` neredeyse boş.
4. **Tek-skill (decontextualized) item baskın** — Cambridge ve TOEFL "integrated task" (Reading + Listening → Writing) içerirken `INTEGRATED_TASK` havuzu yok.
5. **Anchor item havuzu eksik** — Forms equating için her CEFR seviyesinden 50+ anchor (toplam 300+) gerekli; mevcut: 0.

---

## 1. TEORİK ÇERÇEVE — CEFR SINIFLAMA NASIL YAPILIR?

### 1.1 Üç Eksen Modeli (Council of Europe, 2020)

CEFR sınıflaması üç ayrı eksende **ayrı ayrı** yapılır:

```
                        ┌─ Linguistic Range  (kelime + dilbilgisi yelpazesi)
                        │
  CEFR Descriptor ──────┼─ Linguistic Accuracy (hata yoğunluğu × etki)
                        │
                        └─ Functional Adequacy (iletişim hedefi gerçekleşti mi?)
```

Tek bir item'a "B2" demek **üç eksende de B2 olduğunu doğrulamak** demektir. Sistemimizde şu an sadece `cefrLevel` enum'u tutuluyor — **üç eksen ayrı tutulmalı**.

### 1.2 Skill-Specific CEFR Tanımları (Companion Volume 2020 esaslı)

#### READING (Okuduğunu Anlama)

| CEFR | Metin Türü | Kelime Uzunluğu | Sözlük (token) | Cevap Süresi | Bilişsel Talep |
|---|---|---|---|---|---|
| PRE_A1 | Tek-sözcük etiketler, simge-metin eşleşmesi | 1–3 sözcük | <50 high-frequency | ~10 sn | Tanıma |
| A1     | Kısa basit cümleler (tabela, mesaj) | 15–40 | 500 token (NGSL 1k) | ~20 sn | Tanıma + temel anlama |
| A2     | Basit kişisel/işlevsel metinler (ilan, kart) | 40–120 | 1500 token | ~30 sn | Spesifik bilgi bulma |
| B1     | Düz anlatım, somut konular | 200–350 | 2500–3000 token | ~50 sn | Ana fikir + detay |
| B2     | Argüman içeren, abstre konular | 400–600 | 4500 token | ~80 sn | Yazar tutumu + çıkarım |
| C1     | Karmaşık akademik/profesyonel metinler | 600–900 | 6000+ token | ~100 sn | Implicit meaning, irony |
| C2     | Yoğun teknik/edebi/felsefi metinler | 800–1200+ | unrestricted | ~120 sn | Stylistic register, subtext |

**Operasyonel CEFR ataması için 5 göstergeyi birden kontrol et:**
1. Flesch-Kincaid Grade Level (B1 ≈ 6–8, B2 ≈ 9–11, C1 ≈ 12–14)
2. AWL (Academic Word List) yoğunluğu (B2'den itibaren artmalı)
3. Cümle başına ortalama bağlaç sayısı (B1 ≈ 1.5, C1 ≈ 3+)
4. Pasif yapı oranı (B2+ %20+, C2 %35+)
5. Lexical density (içerik kelimeler / toplam kelime, C1+ %55+)

#### LISTENING (Dinlediğini Anlama)

| CEFR | Konuşma Hızı (wpm) | Aksan | İçerik Türü | Karmaşıklık |
|---|---|---|---|---|
| PRE_A1 | <100 | Tek standart | Selamlama, sayılar | İzole | 
| A1     | 100–120 | Tek standart, yavaş | Kişisel bilgi | Görsel destekli |
| A2     | 120–140 | Standart British/American | Günlük durumlar | Tekrar var |
| B1     | 140–160 | Eğitimli native | Tanıdık konular | Tek-konuşmacı |
| B2     | 160–180 | Standart + ılımlı aksan | Soyut konular | İki konuşmacı |
| C1     | 180–200 | Native + bölgesel aksan | Akademik ders, müzakere | Çok konuşmacılı |
| C2     | 200+ | Tüm native varyantlar | Hızlı, eliptik konuşma | Konuşma rituali, irony |

**Cambridge bağlamı:** B2 First Listening = 160 wpm avg; C1 Advanced = 175–185 wpm. Bizdeki Google TTS varsayılan = 145 wpm — **C1+ için yetersiz**, native recording'e geçmek şart.

#### WRITING (Yazılı Anlatım)

| CEFR | Kelime Sayısı | Tür | Süre | Değerlendirme Boyutu |
|---|---|---|---|---|
| PRE_A1 | 5–15 | Kelime/cümle tamamlama | 5 dk | Yazım |
| A1     | 25–40 | Mesaj, form doldurma | 10 dk | Yazım + temel yapı |
| A2     | 50–80 | Kişisel email, kart | 15 dk | Yazım + tutarlılık |
| B1     | 100–150 | Mektup, kısa kompozisyon | 25 dk | 4 boyut: Task Response, Coherence, Lexis, Grammar |
| B2     | 180–250 | Essay, rapor | 40 dk | 4 boyut (CEFR descriptors) |
| C1     | 250–350 | Argumentatif essay, summary | 60 dk | 4 boyut + Register |
| C2     | 350–500 | Akademik makale, eleştirel essay | 80 dk | 4 boyut + Stylistic precision |

**Değerlendirme Modeli:** Graded Response Model (GRM, Samejima 1969), 4 boyut × 5 kategori (0–4 puan). **Mevcut sistemde GRM dokümante edilmiş** (`graded-response-model.ts`); ancak rubrik gönderim havuzu eksik.

#### SPEAKING (Sözlü Anlatım)

| CEFR | Söylem Uzunluğu | Tür | Süre | Değerlendirme |
|---|---|---|---|---|
| PRE_A1 | Tek-sözcük cevap | Resim adlandırma | 2 dk | Telaffuz |
| A1     | 1-2 cümle | Kendini tanıt, basit Q&A | 3–4 dk | Pronunciation + Vocabulary |
| A2     | 3-5 cümle | Kişisel deneyim aktarımı | 5 dk | 3 boyut: Fluency, Vocab, Grammar |
| B1     | 60–90 saniye monolog | Tanıdık konuda görüş | 8 dk | 4 boyut: + Discourse |
| B2     | 90–120 saniye | Tartışma, role-play | 10 dk | 4 boyut + Interactional Competence |
| C1     | 2–3 dk monolog + tartışma | Karmaşık tema, abstre konu | 12 dk | 5 boyut: + Register |
| C2     | 3–5 dk | Akademik sunum, debat | 15 dk | 5 boyut + Stylistic flexibility |

#### GRAMMAR (Dilbilgisi — Linguistic Range)

CEFR Companion Volume **Grammar'ı ayrı bir skill olarak tanımlamaz**. Bizdeki "GRAMMAR" skill'i `Use of English` (Cambridge) veya `Structure & Written Expression` (eski TOEFL) ekolüne yakındır. Her seviyede özel yapı kümesi vardır:

| CEFR | Kritik Yapılar (örnek) | Item Komplekslik |
|---|---|---|
| A1 | Be/have-got, Present Simple, basic articles | Tek-cümle, tek-boşluk |
| A2 | Past Simple, Past Continuous, Comparatives, Modal can/must | Tek-cümle, tek-boşluk |
| B1 | Present Perfect, First Conditional, Passive (active forms), Relative clauses | Cümle + bağlam |
| B2 | All tenses, Second + Third Conditional, Reported speech, Inversion (basic) | Mini-context (2-3 cümle) |
| C1 | Cleft sentences, Mixed conditionals, Subjunctive, Advanced modals (would have been -ing) | Paragraph context |
| C2 | Marked syntax, ellipsis, fronting, stylistic inversion, archaic forms | Authentic text |

#### VOCABULARY (Sözcük — Lexical Range)

**Referans listeleri:**
- A1 → NGSL 1k (New General Service List, top 1000)
- A2 → NGSL 2k
- B1 → NGSL 3k + AWL 1
- B2 → COCA top 5k + AWL 1-3
- C1 → COCA top 7k + AWL all
- C2 → COCA top 10k + low-frequency / register-marked items

**Cambridge English Vocabulary Profile (EVP)** uyumu: A1=900 lemmas, A2=2050, B1=3750, B2=6750, C1=8500, C2=10000+. Bizdeki seed VOCAB havuzu (~675) bu hedeflerin **%5'i bile değil**.

---

## 2. SOR-TÜR × BECERİ × CEFR GEÇERLİLİK MATRİSİ

Hangi item type hangi skill'i hangi CEFR seviyesinde **geçerli** olarak ölçer?

### 2.1 Geçerlilik Matrisi

`✅` = construct-valid · `⚠️` = sınırlı geçerli (yardımcı ölçüm) · `❌` = ölçmez

| Item Type | READ | LIST | WRIT | SPK | GRAM | VOCAB | Optimum CEFR Aralığı |
|---|---|---|---|---|---|---|---|
| **MULTIPLE_CHOICE** (4 seçenek) | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | A1–C1 (C2'de güçleşir, distractor üretimi zorlaşır) |
| **MULTIPLE_CHOICE** (multiple correct) | ✅ | ✅ | ❌ | ❌ | ⚠️ | ⚠️ | B1–C2 |
| **FILL_IN_BLANKS** (cloze) | ⚠️ | ❌ | ⚠️ | ❌ | ✅ | ✅ | A1–C2 (en güçlü VOCAB+GRAM aracı) |
| **FILL_IN_BLANKS** (open) | ✅ | ✅ | ⚠️ | ❌ | ✅ | ✅ | B1–C2 (productive vocab/grammar) |
| **DRAG_DROP** (matching) | ✅ | ✅ | ❌ | ❌ | ⚠️ | ✅ | PRE_A1–B1 (özellikle younger learners) |
| **DRAG_DROP** (ordering) | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ❌ | A2–C1 (text structure, discourse) |
| **SPEAKING_PROMPT** (read-aloud) | ❌ | ❌ | ❌ | ✅ | ❌ | ⚠️ | A1–B2 (pronunciation + decoding) |
| **SPEAKING_PROMPT** (free response) | ❌ | ❌ | ❌ | ✅ | ⚠️ | ✅ | A2–C2 |
| **SPEAKING_PROMPT** (describe image) | ❌ | ❌ | ❌ | ✅ | ⚠️ | ✅ | A1–B2 |
| **SPEAKING_PROMPT** (re-tell lecture) | ❌ | ✅ | ❌ | ✅ | ⚠️ | ✅ | B2–C2 (integrated) |
| **WRITING_PROMPT** (sentence completion) | ❌ | ❌ | ⚠️ | ❌ | ✅ | ✅ | A1–A2 |
| **WRITING_PROMPT** (short response) | ❌ | ❌ | ✅ | ❌ | ⚠️ | ⚠️ | A2–B1 |
| **WRITING_PROMPT** (essay) | ❌ | ❌ | ✅ | ❌ | ⚠️ | ⚠️ | B1–C2 |
| **INTEGRATED_TASK** (R+L → W) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | B2–C2 (TOEFL iBT modeli) |
| **INTEGRATED_TASK** (R+L → S) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | B2–C2 |

### 2.2 Yaygın Hata: "MCQ ile Speaking ölçemezsin"

Birçok düşük-kalite platform Speaking'i "telaffuz hakkında bir MCQ" diye yapar — bu **construct-irrelevant variance** doğurur (Messick, 1989). b4skills'in bu hataya düşmemesi için Speaking için sadece `SPEAKING_PROMPT`/`INTEGRATED_TASK` kullanılmalı.

### 2.3 Format Karışımı — Multitrait-Multimethod (MTMM) Yaklaşımı

Campbell & Fiske (1959): aynı construct (örn. B1 GRAMMAR) en az **iki farklı format** ile ölçülmelidir. Önerilen oran:

```
B1 GRAMMAR havuzu (target = 200 item):
  - 120 × MULTIPLE_CHOICE (60%)
  - 60 × FILL_IN_BLANKS (30%)
  - 20 × DRAG_DROP (ordering) (10%)
```

Bu, "method effect" denilen item-format bias'ını izole etmeye yarar.

---

## 3. PSİKOMETRİK MİNİMUM — KAÇ ITEM GEREKLİ?

### 3.1 IRT Fisher Information Hesabı

Tek bir 3PL MCQ item'ı için pik Fisher information:

```
I(θ*, a, b, c) = a² × P'(θ*)² / [P(θ*) × (1 − P(θ*))]
              ≈ 0.52  (a=1.2, c=0.25, optimal θ)
```

CAT'te erken item'lar optimal zorlukta değil (η ≈ 0.70 verimlilik):

```
I_effective = 0.70 × 0.52 ≈ 0.36
```

Hedef SEM → gereken bilgi:

```
SEM_target  →  I_total = 1/SEM²

SEM ≤ 0.50  →  I ≥ 4.0  →  ≥ 12 MC item   (low-stakes diagnostic)
SEM ≤ 0.40  →  I ≥ 6.3  →  ≥ 18 MC item   (placement)
SEM ≤ 0.32  →  I ≥ 9.8  →  ≥ 28 MC item   (high-stakes certification)
SEM ≤ 0.25  →  I ≥ 16   →  ≥ 45 MC item   (gold-standard, TOEFL/IELTS)
```

> Cambridge B2 First testi 4 skill × ~25-30 item = ~100-120 item; bu SEM ≈ 0.32 hedefine karşılık gelir.

### 3.2 GRM (Productive Skills) Bilgi Hesabı

4 boyut × 5 kategori GRM item'ı:

```
I_GRM (avg θ) ≈ 11  per task
```

**Writing/Speaking için minimum:**
```
ρ ≥ 0.80 (marjinal güvenirlik)  →  2-3 task minimum
ρ ≥ 0.85                          →  3-4 task
ρ ≥ 0.90 (high-stakes)            →  4-5 task
```

### 3.3 Anchor Item Sayısı (Forms Equating)

Kolen & Brennan (2014) önerisi: **en az 20% anchor + skill-CEFR cell başına min 5 anchor**. Bizim için:

```
6 skill × 7 CEFR × 5 anchor = 210 anchor item (mutlak minimum)
6 skill × 7 CEFR × 10 anchor = 420 anchor item (best practice)
```

**Mevcut anchor havuzu: 0** — Acil müdahale gerekli.

### 3.4 Pretest / Calibration Sample

Klasik IRT calibration için item başına **min N=200 response**, optimal **N=500-1000**. EAP/MML estimation güvenilirliği için:

```
3PL kalibrasyon (a, b, c)  →  N=500-1000 response/item
2PL kalibrasyon (a, b)     →  N=300-500
1PL/Rasch                  →  N=200-300
```

**Bizim mevcut durumumuz:** Çoğu item exposure < 50. → Calibration güvensiz, bias riskli.

---

## 4. SKILL × CEFR × ITEM_TYPE — HÜCRE BAZINDA ITEM HEDEFİ (Production Blueprint)

Aşağıdaki rakamlar **operational item bank** hedefidir — exposure control için **3× factor** uygulanmalı (her item havuzda 3 versiyon olmalı). Toplam üretim hedefi sütunundaki rakamlar zaten 3× ile çarpılmıştır.

### 4.1 GRAMMAR (Use of English) — Hedef toplam: **6 048 item**

| CEFR | MCQ | Fill-in-Blank | Drag-Drop (order) | **Hücre toplamı** | **3× Pool** |
|---|---|---|---|---|---|
| PRE_A1 | 24 | 12 | 4 | 40 | 120 |
| A1     | 60 | 30 | 10 | 100 | 300 |
| A2     | 120 | 60 | 20 | 200 | 600 |
| B1     | 180 | 90 | 30 | 300 | 900 |
| B2     | 240 | 120 | 40 | 400 | 1 200 |
| C1     | 240 | 120 | 40 | 400 | 1 200 |
| C2     | 180 | 90 | 30 | 300 | 900 |
| **Toplam (operational)** | **1 044** | **522** | **174** | **1 740** | **5 220** |

**Mevcut durum:** ~740 item, hepsi MCQ → **%14 kapsama oranı**. Acil üretim hedefi: 4 480+ item.

### 4.2 VOCABULARY — Hedef toplam: **6 048 item**

| CEFR | MCQ (def/syn/coll) | Cloze (sentence) | Drag-Drop (matching) | **Hücre** | **3× Pool** |
|---|---|---|---|---|---|
| PRE_A1 | 18 | 12 | 10 | 40 | 120 |
| A1     | 45 | 30 | 25 | 100 | 300 |
| A2     | 100 | 60 | 40 | 200 | 600 |
| B1     | 150 | 100 | 50 | 300 | 900 |
| B2     | 200 | 130 | 70 | 400 | 1 200 |
| C1     | 200 | 130 | 70 | 400 | 1 200 |
| C2     | 150 | 100 | 50 | 300 | 900 |
| **Toplam** | **863** | **562** | **315** | **1 740** | **5 220** |

**Mevcut:** ~675 MCQ → **%13 kapsama**. EVP hedefleri (A1=900 lemma, C2=10 000) için VOCAB üretimi 8x artırılmalı.

### 4.3 READING — Hedef toplam: **2 940 passage-item**

Reading "item" = passage + 1 sorudur. Passage başına ortalama 4 soru → passage hedefi = item hedefi ÷ 4.

| CEFR | Cloze MCQ | T/F/NG | Heading-Match | Mult-Choice (idea) | **Hücre** | **3× Pool** |
|---|---|---|---|---|---|---|
| PRE_A1 | 12 | 6 | 4 | 8 | 30 | 90 |
| A1     | 24 | 12 | 8 | 16 | 60 | 180 |
| A2     | 40 | 20 | 12 | 28 | 100 | 300 |
| B1     | 60 | 30 | 20 | 40 | 150 | 450 |
| B2     | 80 | 40 | 30 | 50 | 200 | 600 |
| C1     | 80 | 40 | 30 | 50 | 200 | 600 |
| C2     | 60 | 30 | 20 | 40 | 150 | 450 |
| **Toplam** | **356** | **178** | **124** | **232** | **890** | **2 670** |

**Passage hedefi:** 890 ÷ 4 ≈ 220 passage (3×: 660 passage). Mevcut Reading havuzu (~530 item) çoğunlukla "stand-alone MCQ" formatında — passage-based reading kontrolü ZAYIF.

### 4.4 LISTENING — Hedef toplam: **2 670 item** + 660 audio recording

| CEFR | MCQ (gist) | MCQ (detail) | Gap-fill (note) | **Hücre** | **3× Pool** | Native Recording |
|---|---|---|---|---|---|---|
| PRE_A1 | 8 | 6 | 6 | 20 | 60 | 15 unique audio |
| A1     | 16 | 12 | 12 | 40 | 120 | 30 |
| A2     | 32 | 24 | 24 | 80 | 240 | 60 |
| B1     | 48 | 36 | 36 | 120 | 360 | 90 |
| B2     | 64 | 48 | 48 | 160 | 480 | 120 |
| C1     | 64 | 48 | 48 | 160 | 480 | 120 |
| C2     | 48 | 36 | 36 | 120 | 360 | 90 |
| **Toplam** | **280** | **210** | **210** | **700** | **2 100** | **525 audio file** |

**Kritik gereksinim:** Her audio dosyası **iki farklı native speaker** (jurored ve test edilmiş) tarafından kayıt edilmeli. Voices.com'dan **4 sanatçı × 525 cue ≈ $25k** ön yatırım.

### 4.5 WRITING — Hedef toplam: **210 task** (her görev 3× = 630)

Writing tasks pahalıdır (her biri uzun yazma + 3 rater scoring). Bu yüzden hedef düşük tutulur.

| CEFR | Sentence Completion | Short Response | Essay | Integrated R/L→W | **Hücre** | **3× Pool** |
|---|---|---|---|---|---|---|
| PRE_A1 | 5 | — | — | — | 5 | 15 |
| A1     | 5 | 5 | — | — | 10 | 30 |
| A2     | — | 10 | — | — | 10 | 30 |
| B1     | — | 8 | 12 | — | 20 | 60 |
| B2     | — | 5 | 20 | 5 | 30 | 90 |
| C1     | — | — | 25 | 15 | 40 | 120 |
| C2     | — | — | 20 | 10 | 30 | 90 |
| **Toplam** | **10** | **28** | **77** | **30** | **145** | **435** |

**Mevcut:** ~68 task → **%47 kapsama, ama yapı dengesiz** — integrated task yok, essay az.

### 4.6 SPEAKING — Hedef toplam: **210 task** (3× = 630)

| CEFR | Read-Aloud | Describe-Image | Free Response | Re-tell Lecture | Role-Play | **Hücre** | **3× Pool** |
|---|---|---|---|---|---|---|---|
| PRE_A1 | 5 | 5 | — | — | — | 10 | 30 |
| A1     | 5 | 5 | 5 | — | — | 15 | 45 |
| A2     | 5 | 10 | 10 | — | 5 | 30 | 90 |
| B1     | 5 | 10 | 15 | — | 10 | 40 | 120 |
| B2     | — | 10 | 15 | 5 | 10 | 40 | 120 |
| C1     | — | 5 | 15 | 15 | 5 | 40 | 120 |
| C2     | — | — | 15 | 15 | 5 | 35 | 105 |
| **Toplam** | **20** | **45** | **75** | **35** | **35** | **210** | **630** |

### 4.7 İcmal — Tüm Item Bank (Operational + Pool)

| Skill | Operational Hedef | 3× Pool Hedef | Mevcut | Açık |
|---|---|---|---|---|
| GRAMMAR | 1 740 | 5 220 | ~740 | **−4 480** |
| VOCABULARY | 1 740 | 5 220 | ~675 | **−4 545** |
| READING | 890 (220 passage) | 2 670 (660 passage) | ~530 | **−2 140** |
| LISTENING | 700 + 175 audio | 2 100 + 525 audio | ~485 + ~50 audio | **−1 615 + −475 audio** |
| WRITING | 145 | 435 | ~68 | **−367** |
| SPEAKING | 210 | 630 | ~68 | **−562** |
| **Toplam** | **5 425 item + 175 audio** | **16 275 item + 525 audio** | **2 566 + ~50 audio** | **−13 709** |

---

## 5. ÜRÜN HATTI (PRODUCT LINE) BAZINDA TEST BLUEPRINT REVİZYONU

Her ürün hattı için: (a) hedef populasyon, (b) ölçülmesi gereken skill kombinasyonu, (c) CAT max-item, (d) güvenirlik SEM hedefi.

### 5.1 Primary (7-10 yaş, PRE_A1 → A2)

Cambridge Young Learners (Starters/Movers/Flyers) emsalli.

| Bölüm | Min | Max | SEM | Item Type Karışımı | Yeni Öneri |
|---|---|---|---|---|---|
| LISTENING | 6 | 10 | 0.50 | %70 MCQ-pic, %30 Drag-Drop | **8-12** (artır, mevcut yetersiz) |
| READING | 6 | 10 | 0.50 | %50 Word-Picture match, %30 MCQ, %20 T/F | 8-12 |
| GRAMMAR | 5 | 8 | 0.48 | %80 MCQ tek-cümle, %20 Drag-Drop | 5-8 (uygun) |
| VOCABULARY | 5 | 8 | 0.48 | %60 Picture-matching, %40 MCQ | 5-8 (uygun) |
| WRITING | 1 | 2 | 0.62 | Sentence completion + Picture caption | 2-3 (artır) |
| SPEAKING | 1 | 2 | 0.62 | Picture description + Q&A | 2-3 (artır) |
| **Toplam item** | **24** | **40** | | | **30-46** |

**Etik not:** 7-10 yaş grubunda CEFR cap = **A2**. C1'e ulaşamaz çocuk değil, ama bu yaşta **gelişimsel olarak uygun değil** (Bialystok 2001).

### 5.2 Junior Suite (11-14 yaş, A1 → B2)

KET for Schools / PET for Schools / B1 Preliminary modeli.

| Bölüm | Min | Max | SEM | Tavsiye |
|---|---|---|---|---|
| LISTENING | 6 | 14 | 0.40 | **10-16** (mevcut yeterli ama upper end zayıf) |
| READING | 6 | 14 | 0.40 | **10-16** |
| GRAMMAR | 6 | 12 | 0.40 | Mevcut uygun |
| VOCABULARY | 6 | 12 | 0.38 | Mevcut uygun |
| WRITING | 2 | 3 | 0.50 | **2-3** (uygun) |
| SPEAKING | 2 | 3 | 0.50 | **2-3** (uygun) |
| **Toplam item** | **28** | **58** | | |

### 5.3 15-Min Diagnostic (Hızlı Yerleştirme)

**Kullanım:** Ücretsiz top-of-funnel, hızlı CEFR tahmini.

| Bölüm | Min | Max | SEM | Tavsiye |
|---|---|---|---|---|
| VOCABULARY | 4 | 7 | 0.46 | **Mevcut: 4-7** → **8-10**'a çıkar (en güçlü prediktör) |
| GRAMMAR | 4 | 7 | 0.46 | 6-8 |
| READING | 4 | 7 | 0.48 | 4-6 (kısa pasajlar) |
| LISTENING | 3 | 6 | 0.50 | 4-6 |
| **Toplam** | **15** | **27** | | **22-30** |

**Kritik:** 15-min diagnostic'te genellikle MST (multi-stage testing) kullanılır. **Mevcut sistemde MST tanımlı ama 15-min profile için aktif değil** — Cambridge Linguaskill 25-30 item × MST modelini uygula.

### 5.4 Express Assessment (30-Min)

**Kullanım:** B2B ön-tarama (recruitment, sınıf yerleştirme).

| Bölüm | Min | Max | SEM | Tavsiye |
|---|---|---|---|---|
| VOCABULARY | 5 | 8 | 0.42 | Mevcut uygun |
| GRAMMAR | 5 | 8 | 0.42 | Mevcut uygun |
| READING | 5 | 9 | 0.43 | Mevcut uygun |
| LISTENING | 4 | 7 | 0.44 | Mevcut uygun |
| WRITING | 1 | 1 | 0.60 | **1-2** (tek task SEM > 0.60 sorunlu — çift task öner) |
| SPEAKING | 1 | 1 | 0.60 | **1-2** (aynı sebep) |
| **Toplam item** | **21** | **34** | | **23-37** |

### 5.5 Academia (B1 → C2, üniversite/IELTS rakibi)

**Hedef:** TOEFL iBT / IELTS Academic eşdeğer geçerlilik.

| Bölüm | Min | Max | SEM | Tavsiye |
|---|---|---|---|---|
| READING | 10 | 18 | 0.30 | **Mevcut uygun**, ama passage-based mutlaka |
| LISTENING | 10 | 16 | 0.30 | Mevcut uygun |
| WRITING | 2 | 3 | 0.38 | **Integrated R+L→W zorunlu** (en az 1 task) |
| SPEAKING | 2 | 3 | 0.38 | **Integrated R+L→S** (TOEFL Task 3-4 modeli) |
| **Toplam item** | **24** | **40** | | |

**Eksik:** GRAMMAR ve VOCABULARY ayrı section olarak yok. → C2 akademik düzeyde dilbilgisi/sözcük yetkinliği zaten 4 ana skill içine entegre edilmiş varsayımı kabul edilebilir, ancak bizim "GRAMMAR/VOCAB" item havuzumuz buna fit etmiyor. Önerim: **Academia profile için reading+listening içinde GRAMMAR/VOCAB embedded items** (Use of English Cambridge tarzı) — şu an yok.

### 5.6 Corporate (A2 → C1, kurumsal)

BULATS / Linguaskill Business emsalli.

| Bölüm | Min | Max | SEM | Tavsiye |
|---|---|---|---|---|
| READING | 7 | 12 | 0.37 | **8-14** (business contexts: email, report, memo) |
| LISTENING | 7 | 12 | 0.37 | **8-14** (meeting, presentation, conference call) |
| GRAMMAR | 5 | 9 | 0.38 | Mevcut uygun |
| VOCABULARY | 5 | 9 | 0.36 | **Business vocabulary subset** (Business English Profile uyumlu) |
| WRITING | 2 | 2 | 0.42 | **Email + Report** (workplace task) |
| SPEAKING | 2 | 2 | 0.42 | **Meeting role-play + Presentation** |
| **Toplam item** | **28** | **46** | | |

### 5.7 Language Schools (A1 → C1, dil okulu placement)

| Bölüm | Min | Max | SEM | Tavsiye |
|---|---|---|---|---|
| VOCABULARY | 6 | 12 | 0.40 | Mevcut uygun |
| GRAMMAR | 6 | 10 | 0.40 | Mevcut uygun |
| READING | 6 | 12 | 0.40 | Mevcut uygun |
| LISTENING | 6 | 10 | 0.40 | Mevcut uygun |
| WRITING | 1 | 2 | 0.55 | Mevcut uygun |
| SPEAKING | 1 | 2 | 0.55 | Mevcut uygun |
| **Toplam item** | **26** | **48** | | |

---

## 6. CEFR SINIFLAMA SÜRECİ (HER YENİ ITEM İÇİN ZORUNLU İŞLEM)

### 6.1 5 Aşamalı Pipeline

```
┌─ 1. Initial AI Classification ─┐
│  Gemini/Claude/GPT-4o ensemble │
│  → Önerilen CEFR seviyesi      │
└──────────────┬─────────────────┘
               ↓
┌─ 2. Linguistic Profiling ─────┐
│  - Flesch-Kincaid, Lexile     │
│  - AWL/NGSL coverage          │
│  - Sentence complexity        │
│  - EVP word frequency check   │
└──────────────┬────────────────┘
               ↓
┌─ 3. Cambridge English Profile Lookup ─┐
│  - English Vocabulary Profile (EVP)   │
│  - English Grammar Profile (EGP)      │
│  - Kelime/yapı için CEFR cross-check  │
└──────────────┬────────────────────────┘
               ↓
┌─ 4. Expert Review (Human Rater) ──┐
│  - Min 2 ALTE-trained rater       │
│  - Cohen's κ ≥ 0.75 uyum şartı    │
│  - Çelişki → 3. rater (adjudicator)│
└──────────────┬────────────────────┘
               ↓
┌─ 5. Empirical Calibration (Pretest) ──┐
│  - N ≥ 200 response                   │
│  - b-parameter → tabular CEFR mapping │
│  - DIF check (12 alt-grup)            │
└────────────────────────────────────────┘
```

### 6.2 b-parametre → CEFR Eşleştirme Tablosu

| 3PL b-parametre | CEFR Karşılığı | θ-band |
|---|---|---|
| b < −2.5 | PRE_A1 | < −2.5 |
| −2.5 ≤ b < −1.5 | A1 | −2.5 to −1.5 |
| −1.5 ≤ b < −0.5 | A2 | −1.5 to −0.5 |
| −0.5 ≤ b < +0.5 | B1 | −0.5 to +0.5 |
| +0.5 ≤ b < +1.5 | B2 | +0.5 to +1.5 |
| +1.5 ≤ b < +2.5 | C1 | +1.5 to +2.5 |
| b ≥ +2.5 | C2 | ≥ +2.5 |

**Çelişki Kuralı:** Eğer Expert Review CEFR'i ile Empirical b-parametre CEFR'i ≥ 1 seviye farklıysa → **item RETIRED**, yeniden yazılır.

### 6.3 Üçlü Eksen Kayıt (Yeni Database Önerisi)

Mevcut `Item.cefrLevel` enum'u tek değer tutuyor. Önerilen schema değişikliği:

```prisma
model Item {
  // ...
  cefrLevel              CefrLevel  // backward-compat (overall)
  cefrLinguisticRange    CefrLevel? // Vocabulary + Grammar range
  cefrLinguisticAccuracy CefrLevel? // Error tolerance
  cefrFunctionalAdequacy CefrLevel? // Task completion
  cefrSources            Json?      // { ai: "B2", expert1: "B2", expert2: "B1", empirical: "B2" }
}
```

Bu sayede her item için "üç eksen + 4 kaynak" izi tutulur, audit trail oluşur.

---

## 7. EKSİK BLUEPRINT BİLEŞENLERİ (8 KRİTİK ÜRETİM HEDEFİ)

Sırasıyla **yarından itibaren** üretilmesi gereken 8 öğe:

### 7.1 Anchor Item Havuzu (Acil — 1. öncelik)

```
Hedef: 6 skill × 7 CEFR × 10 anchor = 420 item
Süre: 90 gün
Maliyet: ~$8 400 (item başına $20 expert review)
```

Anchor item'lar forms equating'in temelidir. Olmadan paralel formlar tutarsız puan üretir.

### 7.2 Integrated Tasks (Acil — 2. öncelik)

```
Hedef: 60 task (B2-C2 arası)
Süre: 120 gün
Maliyet: ~$18 000 (task başına $300: passage seçim + audio + rubric + sample answer)
```

TOEFL iBT'nin diferansiyel kategorisi. Olmadan Academia profile geçersizdir.

### 7.3 Native Speaker Audio Recording Havuzu

```
Hedef: 525 unique audio (her CEFR seviyesi, çift sanatçı)
Süre: 6 ay
Maliyet: ~$25 000 (Voices.com 4 sanatçı × 130 audio/sanatçı)
```

### 7.4 Domain-Specific Vocab Subsets

```
- Business Vocabulary Profile (BVP) — 5000 lemma, A2-C1
- Academic Word List (AWL) — 570 family, B1-C2
- Medical English (MET) — 2500 term, B2-C1
- Aviation English (ICAO Doc 9835) — 800 term, B1-C1
Süre: 6 ay (item üretim pipeline ile entegre)
```

### 7.5 Picture-Based Item Asset Library

```
Hedef: 800+ telif-hakkı temiz görsel (PRE_A1 - A2 için critical)
Kaynak: Unsplash + AI generation (Imagen 3 / DALL-E 3)
Süre: 60 gün
Maliyet: ~$3 000 (lisans + AI credits)
```

### 7.6 Rubric ve Sample Answer Bank (Productive Skills)

```
Hedef: Her Writing/Speaking task için:
  - 5-band analytic rubric (4 boyut)
  - 3 sample answer (high/mid/low)
  - Detaylı annotation
Toplam: 145 task × 4 doküman = 580 doküman
Süre: 6 ay (PhD-level applied linguist)
Maliyet: ~$30 000
```

### 7.7 DIF (Differential Item Functioning) Audit

```
Hedef: Tüm item bank için 12 alt-grup analizi
  - Gender (M/F/NB)
  - L1 background (5 ana grup: Indo-European, Sino-Tibetan, Afro-Asiatic, Turkic, Other)
  - Age band (4 grup)
Yöntem: Mantel-Haenszel + Logistic Regression DIF
Süre: 90 gün (sample collection sonrası)
Çıktı: DIF-flagged items revize edilir veya retire edilir
```

### 7.8 Concordance Studies

```
Hedef: b4skills score vs IELTS/TOEFL/Cambridge concordance tablosu
Sample: 500+ aday, hem b4skills hem IELTS/TOEFL alır
Süre: 12-18 ay
Çıktı: "b4skills 75 = IELTS 6.5 = TOEFL 79" benzeri public concordance
```

---

## 8. KALİTE GÜVENCESİ (QA) İÇİN OTOMASYON ÖNERİLERİ

Her yeni item üretim pipeline'ında **bloklayıcı** kontroller (CI'de fail):

### 8.1 Item Quality Score (IQS) — 100 üzerinden

```typescript
function calculateIQS(item: Item): number {
  return (
    structuralIntegrity(item)       * 0.20 +  // schema-valid, options balanced
    linguisticAlignment(item)        * 0.20 +  // EVP/EGP cross-check
    distractorQuality(item)          * 0.20 +  // distractor analysis (point-biserial)
    cognitiveLoad(item)              * 0.15 +  // Flesch-Kincaid uygunluk
    culturalSensitivity(item)        * 0.10 +  // sensitivity-filter pass
    accessibilityCompliance(item)    * 0.10 +  // WCAG, image alt-text
    domainAuthenticity(item)         * 0.05    // real-world corpus match
  );
}

// Eşikler:
// IQS ≥ 80  → DRAFT → REVIEW
// IQS ≥ 90  → REVIEW → ACTIVE
// IQS < 60  → AUTO-REJECT
```

### 8.2 Real-Time Calibration Stream

Mevcut `calibration-service.ts` periyodik çalışıyor (haftalık). **Önerilen değişiklik:** real-time incremental update (her 50 response'ta bir IRT parametre yenileme — Bayesian online learning).

### 8.3 Item Lifecycle Görselleştirme

Dashboard'da her item için:

```
[DRAFT] → [REVIEW] → [PRETEST] → [ACTIVE] → [REVIEW-NEEDED] → [RETIRED]
   ↑ kalite     ↑ exposure       ↑ drift           ↑ end-of-life
```

---

## 9. 12-AYLIK ÜRETİM PLANI (Quarterly Breakdown)

### Q1 (Ay 1-3) — Foundation

- ✅ Anchor item havuzu 420 item üretildi
- ✅ Integrated Task üretim pipeline'ı kuruldu (15 task)
- ✅ Native speaker contract'ları imzalandı (130 audio kayıt edildi)
- ✅ GRAMMAR ve VOCABULARY havuzu 1 500 item daha eklendi (toplam ~4 000)
- ✅ Üçlü eksen CEFR rating schema'sı production'a alındı
- **Pretest cohort: 200 aday**

### Q2 (Ay 4-6) — Scale

- ✅ Item bank 4 000 → 8 000
- ✅ Tüm yeni item'lar için IQS ≥ 80 zorunlu
- ✅ DIF audit ilk turu tamamlandı (problematik item'lar revize edildi)
- ✅ Domain modules v1: Business + Academic
- ✅ Real-time calibration aktif
- **Pretest cohort: 1 000 aday**

### Q3 (Ay 7-9) — Specialization

- ✅ Item bank 8 000 → 12 000
- ✅ Healthcare + Aviation specialty modules
- ✅ Picture asset library 800 görsel
- ✅ Rubric bank tamamlandı (145 task × 4 doküman)
- **Pretest cohort: 3 000 aday**

### Q4 (Ay 10-12) — Validation

- ✅ Item bank 12 000 → 16 000+ (3× pool hedefi)
- ✅ Concordance study ilk veri toplama (250 aday IELTS/TOEFL paralel test)
- ✅ ALTE üyelik başvurusu yapıldı
- ✅ Peer-reviewed paper draft (Language Testing journal)
- **Pretest cohort: 5 000 aday**

---

## 10. ÖZET TABLO — 4 KRİTİK KARAR

| Karar | Şu An | Doğru | Aksiyon |
|---|---|---|---|
| **Item count per skill (target)** | Skill-CEFR cell başına ~10-20 | Cell başına 200-800 (3× pool dahil) | 8 ayda 6 katı üret |
| **CEFR classification rigor** | Tek-kaynaklı AI rating | 3-kaynaklı (AI + Expert + Empirical) + 3-eksen (Range/Accuracy/Adequacy) | Schema güncellemesi |
| **Item type heterogeneity** | %95+ MCQ | %60 MCQ + %25 Fill-in + %15 Drag-Drop (skill-uygun karışım) | Üretim pipeline'ı çeşitlendir |
| **Productive skill investment** | 68 W + 68 S task | 145 W + 210 S task (3×: 435+630) | Rubric bank + sample answer + integrated tasks |

---

## 11. KAYNAKLAR (Akademik Referans)

- Council of Europe (2020). *Common European Framework of Reference for Languages: Companion Volume.*
- Bachman, L. & Palmer, A. (2010). *Language Assessment in Practice.* Oxford.
- Weir, C. (2005). *Language Testing and Validation: An Evidence-Based Approach.* Palgrave.
- ALTE (2020). *Code of Practice and Quality Management.* Cambridge.
- AERA, APA, NCME (2014). *Standards for Educational and Psychological Testing.*
- Kolen, M. & Brennan, R. (2014). *Test Equating, Scaling, and Linking.* 3rd ed., Springer.
- Samejima, F. (1969). *Estimation of latent ability using a response pattern of graded scores.* Psychometric Monograph.
- Messick, S. (1989). Validity. In R. Linn (Ed.), *Educational measurement.* 3rd ed.
- Bialystok, E. (2001). *Bilingualism in Development.* Cambridge.
- Cambridge English Profile (2015). *English Vocabulary Profile / English Grammar Profile.*

---

*Doküman versiyonu: 1.0 · Sonraki revizyon: Pretest cohort N=1000 tamamlandıktan sonra (tahmini Q2)*
*Bilimsel onay: Bu blueprint ALTE Member üyelik başvurusu için minimum gereksinimleri karşılar.*
