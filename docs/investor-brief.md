# b4skills — Yatırımcı Brifing Dosyası

**Belge Versiyonu:** 1.0  
**Tarih:** Mayıs 2026  
**Gizlilik:** Yalnızca yetkili alıcılar — lütfen üçüncü taraflarla paylaşmayınız  
**İletişim:** bilal@b4skills.com

---

## İçindekiler

1. [Yönetici Özeti](#1-yönetici-özeti)
2. [Problem](#2-problem)
3. [Çözüm](#3-çözüm)
4. [Ürün](#4-ürün)
5. [Teknoloji Farklılaşması](#5-teknoloji-farklılaşması)
6. [Pazar Büyüklüğü](#6-pazar-büyüklüğü)
7. [Gelir Modeli](#7-gelir-modeli)
8. [Rekabet Analizi](#8-rekabet-analizi)
9. [Traction ve Metrikler](#9-traction-ve-metrikler)
10. [Yol Haritası](#10-yol-haritası)
11. [Ekip](#11-ekip)
12. [Finansal Projeksiyonlar](#12-finansal-projeksiyonlar)
13. [Yatırım Talebi ve Kullanım Planı](#13-yatırım-talebi-ve-kullanım-planı)
14. [Risk Faktörleri](#14-risk-faktörleri)

---

## 1. Yönetici Özeti

**b4skills**, CEFR (Avrupa Dil Referans Çerçevesi) tabanlı, yapay zeka destekli adaptif İngilizce yeterlik değerlendirme platformudur. Geleneksel sınav modellerinin (IELTS, TOEFL, Cambridge Linguaskill) yapısal kısıtlamalarını aşarak kurumsal HR departmanlarına, dil okullarına, üniversitelere ve bireysel kullanıcılara sonuç süresini **günlerden anlara** indiren, maliyeti **%70'e varan oranlarda** düşüren ve psikometrik doğruluğu endüstri standartlarında tutan bir SaaS çözümü sunmaktadır.

### Neden Şimdi?

| Faktör | Etki |
|---|---|
| GenAI'ın konuşma/yazı puanlama doğruluğunu insan seviyesine taşıması | Anlık CR (constructed-response) puanlama mümkün |
| Uzaktan çalışmanın kurumsal İngilizce sertifikasyon ihtiyacını artırması | B2B talep patlaması |
| Türkiye'nin 2027 AB üyelik süreci ve KVKK ile gelen düzenleyici baskı | Regülasyon-uyumlu yerel çözüme ciddi talep |
| Açık kaynak IRT kütüphanelerinin olgunlaşması | CAT altyapısı artık tek kişi tarafından kurulabilir |

### Özet Rakamlar

| Metrik | Değer |
|---|---|
| Hedef TAM | ~$5.2 Milyar (küresel İngilizce sınav pazarı) |
| Hedef SAM | ~$280 Milyon (Türkiye + MENA dijital değerlendirme) |
| Mevcut SOM (Yıl 1–2) | $2–8 Milyon |
| Ürün Hazırlık Seviyesi | TRL 7 — canlı production ortamında çalışıyor |
| Test Güvenilirliği | α ≥ 0.93 (endüstri standardı eşdeğeri) |
| CEFR Doğruluk Oranı | %89 (mevcut), %92+ (Faz II hedefi) |
| Talep Edilen Yatırım | $500.000 – $1.500.000 (Seri Pre-Seed / Seed) |

---

## 2. Problem

### 2.1 Geleneksel Sınavların Üç Temel Kırılması

#### Kırılma 1: Zaman
IELTS ve TOEFL yazılı/konuşma bölümlerinde sonuç bekleme süresi **5–14 gün**. Kurumsal işe alım süreçlerinde bu gecikme:
- Aylık ortalama **$3.800 işveren maliyeti** (SHRM, 2025) yaratıyor
- Aday drop-off oranını %28 artırıyor (LinkedIn Hiring Insights, 2025)

#### Kırılma 2: Maliyet ve Erişim
- IELTS tek sınav ücreti: **₺9.000–12.000** (Türkiye, 2025)
- Sınav merkezi sayısı yetersiz; aday seyahat maliyeti ortalama ₺1.500
- B2B toplu lisanslama modeli yok → kuruluşlar her çalışan için bireysel ücret ödiyor

#### Kırılma 3: Veri Granülaritesi
Mevcut sınavlar tek bir kompozit skor üretiyor. İşverenler ve öğretmenler neyi geliştireceğini bilemiyor:
> *"85/120 TOEFL aldı — writing mi zayıf, grammar mi, kelime mi?"* → Cevap yok.

### 2.2 Pazar Boşluğu

```
Yüksek Psikometrik Kalite
          ↑
          │    [b4skills hedef bölge]
          │         ✦
Cambridge │
Linguaskill│        Duolingo
          │         English Test
          │
          └────────────────────────→
               Yavaş/Pahalı          Hızlı/Ucuz
```

Hızlı + ucuz + psikometrik olarak savunulabilir tek platform mevcut değil. b4skills bu boşluğu dolduruyor.

---

## 3. Çözüm

**b4skills** = Adaptif Test Motoru + AI Puanlayıcı + Tanısal Rapor + B2B API

### Temel Değer Önerisi

| Özellik | Geleneksel Sınav | b4skills |
|---|---|---|
| Toplam sınav süresi | 165–195 dk | **25–45 dk** (adaptif kısaltma) |
| Sonuç süresi | 5–14 gün | **< 90 saniye** |
| Birim maliyet (kurumsal) | $50–120/aday | **$8–15/aday** |
| Yazılı puanlama | İnsan yorumlayıcı | AI + kalibrasyon izleme |
| Beceri granülaritesi | 1–4 skor | **6 boyutlu** (Reading, Listening, Writing, Speaking, Grammar, Vocabulary) |
| API entegrasyonu | Yok | ✅ RESTful webhook + SSO |
| KVKK/GDPR uyumu | Veri Türkiye dışı | ✅ Yerli sunucu seçeneği |

---

## 4. Ürün

### 4.1 Bileşenler

```
┌────────────────────────────────────────────────────────────┐
│                    b4skills Platform                        │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   CAT Engine │  AI Scorer   │  Admin Panel │  Candidate    │
│  (IRT 3PL +  │  (Gemini +   │  (Org mgmt,  │  Dashboard    │
│   MIRT 6D)   │  circuit-    │   item bank, │  (Scores,     │
│              │  breaker)    │   analytics) │   certificates│
├──────────────┴──────────────┴──────────────┴───────────────┤
│              PostgreSQL + Redis + Prisma ORM                │
│              Render.com (EU region) / özel sunucu           │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Kullanıcı Akışı

1. **Kurum** → Admin panelden test kodu oluşturur (2 tıklama)
2. **Aday** → Kod girer, sınava başlar
3. **Sınav motoru** → Her cevaptan sonra en bilgilendirici soruyu seçer (IRT maksimum Fisher bilgisi)
4. **AI puanlayıcı** → Writing/Speaking cevaplarını 9 kalite dedektöründen geçirerek puanlar
5. **Sonuç** → CEFR seviyesi + 6D beceri profili + PDF sertifika, anında
6. **Kurum** → Toplu dashboard'da tüm adayların karşılaştırmalı analizi

### 4.3 Sınav Tipleri

| Sınav Formatı | Süre | Kullanım Alanı |
|---|---|---|
| **Tam Profil** (6 beceri) | 40–45 dk | İşe alım, yerleştirme |
| **Hızlı Tarama** (Reading + Grammar + Vocabulary) | 20–25 dk | Ön eleme |
| **Konuşma Odaklı** (Speaking + Listening) | 15–20 dk | Çağrı merkezi değerlendirme |
| **Akademik Yazı** (Writing + Grammar) | 20–25 dk | Üniversite kabul |
| **İlerleme Testi** (Adaptive, kısa) | 10–15 dk | Dil okulu haftalık takip |

### 4.4 Aday Sertifika

Her başarılı sınav sonunda:
- PDF dijital sertifika (QR doğrulama kodu ile)
- CEFR seviye rozeti (LinkedIn paylaşımına hazır format)
- 6 boyutlu radar grafiği + önerilen öğrenme kaynakları

---

## 5. Teknoloji Farklılaşması

### 5.1 CAT Motoru (Adaptif Test)

Dünya çapında yalnızca büyük test kuruluşlarının (ETS, British Council) kullandığı psikometrik altyapı, b4skills'te **tek geliştirici** tarafından production seviyesine taşındı:

| Bileşen | Teknik Detay | Endüstri Eşdeğeri |
|---|---|---|
| **IRT Modeli** | 3-Parametre Lojistik (3PL) | GRE, GMAT, TOEFL |
| **Yetenek Tahmini** | Expected A Posteriori (EAP) + hiyerarşik prior | ETS adaptive platform |
| **Madde Seçimi** | Shadow test + van der Linden (2005) kısıtlamaları | Cambridge CATS |
| **Çok Boyutlu** | 6D MIRT (skill-level profiling) | NAEP (ABD) |
| **Durdurma Kuralı** | SPRT (Sequential Probability Ratio Test) | Pearson VUE |
| **Maruz Kalma Kontrolü** | Sympson-Hetter algoritması | AICPA, NCLEX |
| **Eşitleme** | Tucker + Levine-True-Score (CINEG) | ETS |

**Doğrulanmış Sonuçlar** (vitest simülasyonları, n=2.000 sanal aday):
- EAP bias: **|bias| = −0.005θ** (hedef: < 0.10θ) ✅
- RMSE: **0.325θ** (hedef: < 0.50θ) ✅
- CEFR sınıflandırma doğruluğu: **%89** (Faz II hedefi: %92+)
- Test bilgi fonksiyonu: **≥ 12** (yüksek güvenilirlik bölgesi)

### 5.2 AI Puanlama (Writing + Speaking)

```
Aday cevabı
    ↓
[9-Dedektör Dürüstlük Filtresi]
    │  copy-paste, klavye-junk, adversarial input,
    │  minimal effort, dil tutarsızlığı, vb.
    ↓
[Circuit Breaker] ──── Gemini API yüklü → [Puan + Sebebi]
    │                                              ↓
    └──── Gemini kapalı → [İnsan Review Kuyruğu]  ↓
                                              [QWK Monitor]
                                              (rolling 30-gün)
                                              QWK ≥ 0.80 → ✅
                                              QWK < 0.80 → Alarm
```

**Önemli:** Gemini devre dışı kaldığında bile sınav kesintisiz devam eder (human review fallback). SLA %99.0 exam session garantisi.

### 5.3 Psikometrik Altyapı

Yatırımcıların değerlendirmesi için kritik nokta: b4skills'in psikometrik altyapısı, *Language Testing* dergisine (IF: 3.2) peer-review makale olarak gönderim hazırlığındadır. Bu düzeyde metodolojik şeffaflık, sektörde **rakipsiz** bir güven sinyali üretir.

- **Geçerlilik Argümanı:** Kane (2013) çerçevesi — 5 çıkarım zinciri
- **Standart Belirleme:** Modified Angoff paneli (8 panelyist, 4 CEFR sınırı)
- **BCa Bootstrap CI:** %95 güven aralığı ile cut-score tahminleri
- **ALTE Code of Practice:** §1–8 uyum belgesi
- **WCAG 2.1 AA:** Erişilebilirlik uyum beyanı (axe-core + statik denetim)

### 5.4 Güvenlik ve Uyum

| Katman | Uygulama |
|---|---|
| **Transport** | HTTPS + HSTS preload |
| **Kimlik Doğrulama** | JWT (15 dk) + Refresh Token (7 gün) rotasyon |
| **API Güvenliği** | Helmet.js CSP + SRI + Rate Limiting (endpoint başı) |
| **Veri Koruma** | KVKK §6698 + GDPR Art.5 — haftalık otomatik saklama süresi uygulaması |
| **Yedekleme** | Haftalık pg_dump + AES-256 GPG şifrelemesi |
| **İzleme** | Sentry APM + Pino structured logs + Circuit Breaker |

---

## 6. Pazar Büyüklüğü

### 6.1 Küresel Bağlam

| Segment | Büyüklük (2025) | CAGR | Kaynak |
|---|---|---|---|
| Küresel dil sınav pazarı | $5.2 Milyar | %8.4 | Grand View Research |
| Kurumsal İngilizce değerlendirme | $1.8 Milyar | %11.2 | MarketsandMarkets |
| Dijital adaptif test platformları | $890 Milyon | %14.7 | Technavio |
| AI destekli dil değerlendirme | $340 Milyon | %28.3 | Allied Market Research |

### 6.2 Türkiye + MENA Odağı

**TAM (Total Addressable Market):**
- Türkiye'de yıllık IELTS/TOEFL sınav sayan: ~420.000
- MENA bölgesinde toplam İngilizce sınav sayısı: ~3.2 milyon/yıl
- Kurumsal İngilizce değerlendirme bütçesi (Türkiye): ~$85 milyon/yıl
- **TAM:** $280 Milyon (Türkiye + MENA dijital kanal)

**SAM (Serviceable Addressable Market):**
- Dijital/online formatı benimseyen segment: %35
- **SAM:** ~$98 Milyon

**SOM (Serviceable Obtainable Market — Yıl 1–3):**
- Hedef kurumsal müşteri sayısı: 150–400 kuruluş
- Ortalama yıllık gelir/kuruluş: $8.000–$45.000
- **SOM:** $2 – $8 Milyon

### 6.3 Türkiye'ye Özgü Kataliz

| Faktör | Etki |
|---|---|
| 2027 AB üyelik müzakereleri — İngilizce kamu sektörü zorunluluğu | Kamu kurumları müşteri segmenti açılıyor |
| YÖK'ün lisans programlarına CEFR B2 zorunluluğu gündemde | 200+ üniversite potansiyel müşteri |
| KVKK veri yerelleştirme baskısı (yabancı sınav sağlayıcılara kısıt) | Yerli rekabet avantajı |
| Türkiye'nin 2025 İnovasyon Ekonomisi teşvik paketi | Yerli SaaS'a vergi avantajı + hibeler |

---

## 7. Gelir Modeli

### 7.1 Katmanlı Ücretlendirme

#### B2B — Kurumsal Lisans (Ana Gelir)

| Plan | Yıllık Lisans | Kapsam |
|---|---|---|
| **Starter** | $3.000/yıl | 100 sınav kredisi, 1 admin |
| **Professional** | $9.600/yıl | 400 sınav kredisi, 5 admin, özel marka |
| **Enterprise** | $24.000/yıl | Sınırsız sınav, SSO, API, SLA garantisi |
| **Enterprise+** | Özel fiyat | Özel sunucu, beyaz etiket, psikometrik danışmanlık |

**Birim Ekonomisi:**
- Brüt marj: %78 (AI API maliyeti dahil)
- LTV/CAC hedefi: 5.2x (Yıl 2)
- Ortalama sözleşme süresi: 14 ay (yıllık + yenileme)

#### B2C — Bireysel (Tamamlayıcı Gelir)

| Paket | Fiyat | Kapsam |
|---|---|---|
| Tek Sınav | ₺349 (~$10) | 1 tam profil testi + sertifika |
| 3'lü Paket | ₺850 | 3 sınav + ilerleme karşılaştırması |
| Aylık Abonelik | ₺199/ay | 4 kısa test + haftalık rapor |

#### API / Entegrasyon Geliri (Yıl 2+)

- HR platformları (Kariyer.net, LinkedIn Turkey, SAP SuccessFactors)
- LMS entegrasyonları (Moodle, Canvas, Blackboard)
- Kurs platformları (Udemy, Coursera Turkey)
- Ücretlendirme: $0.50–$2.50 / API çağrısı

### 7.2 Gelir Büyüme Tahmini

| Yıl | B2B Müşteri | ARR (Kurumsal) | B2C Gelir | API Gelir | **Toplam ARR** |
|---|---|---|---|---|---|
| 2026 (Pilot) | 12 | $72.000 | $18.000 | — | **$90.000** |
| 2027 | 65 | $520.000 | $85.000 | $24.000 | **$629.000** |
| 2028 | 180 | $1.800.000 | $240.000 | $120.000 | **$2.160.000** |
| 2029 | 380 | $4.560.000 | $580.000 | $380.000 | **$5.520.000** |
| 2030 | 700 | $9.800.000 | $1.100.000 | $900.000 | **$11.800.000** |

*Not: MENA genişlemesi Yıl 3'te başlamaktadır. Türkiye odaklı konservatif senaryo.*

### 7.3 Marj Yapısı

| Maliyet Kalemi | Gelirin %'si (Yıl 2) |
|---|---|
| AI API (Gemini) | %6 |
| Sunucu & Altyapı | %4 |
| Ödeme işlem komisyonu (Stripe) | %2.5 |
| **Brüt Kar** | **%87.5** |
| Satış & Pazarlama | %22 |
| Ar-Ge | %18 |
| G&A | %8 |
| **EBITDA** | **%39.5** (Yıl 3 hedefi) |

---

## 8. Rekabet Analizi

### 8.1 Rekabet Matrisi

| | b4skills | Cambridge Linguaskill | Duolingo English Test | IELTS/TOEFL | Pearson PTE |
|---|---|---|---|---|---|
| **Adaptif Test (CAT)** | ✅ Tam IRT | ✅ Kısmi | ✅ | ❌ Sabit form | ✅ |
| **Anlık AI puanlama (W+S)** | ✅ | ❌ İnsan | ✅ | ❌ | ✅ Kısmi |
| **6 Boyutlu Skill Profili** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **B2B API** | ✅ | ✅ Sınırlı | ❌ | ❌ | ✅ |
| **KVKK Uyumu (Yerli)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Birim Maliyet (kurumsal)** | $8–15 | $35–55 | $59 | $200–300 | $150–220 |
| **Sonuç Süresi** | <2 dk | 24–72 saat | <48 saat | 5–14 gün | 5 gün |
| **Psikometrik Yayın** | ✅ Hazırlanıyor | ✅ | ❌ | ✅ | ✅ |
| **Türkçe Destek** | ✅ | ❌ | ❌ | Kısmi | ❌ |
| **Fiyat (B2C)** | ~$10 | $55 | $59 | $230+ | $210+ |

### 8.2 Stratejik Konumlanma

b4skills, iki farklı rakip kategorisine karşı farklı değer önerileriyle rekabet ediyor:

**Büyük sınav kuruluşlarına karşı** (IELTS, TOEFL, Cambridge):
> "Aynı psikometrik güvenilirlik, %90 daha düşük maliyet, anlık sonuç"

**Hızlı dijital çözümlere karşı** (Duolingo, Mondly):
> "Duolingo'nun hızı + Cambridge'in psikometrik sertifikası"

### 8.3 Savunma Hendeği

1. **Ölçek gerektiren psikometri:** IRT kalibrasyonu, CINEG eşitleme ve standart belirleme paneli kolayca kopyalanamaz; 18+ ay akademik emek gerektiriyor
2. **Veri ağ etkisi:** Daha fazla sınav = daha iyi item kalibrasyon = daha doğru ölçüm = daha fazla müşteri
3. **Yerli uyum avantajı:** KVKK için yerli şirket + Türkçe destek, yabancı rakiplerin aşması zor engel
4. **Akademik kredibilite:** *Language Testing* dergisi yayını (hazırlıkta) eğitim kurumlarında erişilemez güven sinyali

---

## 9. Traction ve Metrikler

### 9.1 Teknik Olgunluk

| Gösterge | Değer | Sektör Standardı |
|---|---|---|
| Otomatik test sayısı | **613 passing** (50 dosya) | — |
| Type-check hataları | **0** | — |
| Test coverage (branches) | **%65+** | %60 (kabul) |
| CEFR simülasyon doğruluğu | **%89** | %87+ (Cambridge) |
| EAP bias | **−0.005θ** | ±0.10θ (ETS standard) |
| SLO — exam session p95 | <300ms hedef | <500ms (sektör) |
| Sınav tamamlama SLO | ≥99.0% | ≥98% (sektör) |
| AI scoring availability | ≥95.0% (circuit-breaker ile) | ≥90% (sektör) |

### 9.2 Ürün Olgunluk Kilometre Taşları

| Tarih | Kilometre Taşı |
|---|---|
| Oca 2026 | CAT motoru, IRT 3PL + EAP — ilk production deploy |
| Şub 2026 | MIRT 6D skill profiling — eklendi |
| Mar 2026 | AI writing/speaking scoring — Gemini entegrasyonu |
| Nis 2026 | Admin panel redesign + credential rotation + güvenlik katmanı |
| May 2026 | Circuit breaker, BCa bootstrap standard setting, WCAG AA, SLO monitoring — **(bugün)** |
| Haz 2026 | İlk B2B pilot (3 dil okulu, 1 üniversite bölümü) — **(planlanmış)** |
| Ağu 2026 | Axe-core tam DOM testi (A01–A05 kapatma), equating Faz II |
| Eyl 2026 | Yıllık standart belirleme paneli + ALTE formal audit başvurusu |
| 2027 Q1 | MENA genişlemesi (UAE, Mısır, Suudi Arabistan) |

### 9.3 Pilot Müşteri Pipeline

*NDA kapsamında isimler gizlidir.*

| Segment | Aday Sayısı | Beklenen Karar |
|---|---|---|
| Dil okulu zinciri (3 şube, İstanbul) | 80–120/ay | Haz 2026 |
| Özel üniversite (İngilizce hazırlık birimi) | 400–600/dönem | Tem 2026 |
| Orta ölçekli teknoloji şirketi (HR departmanı) | 50–80/işe alım | Haz 2026 |
| Devlet üniversitesi (YÖK zorunluluğu pilot) | 1.200–2.000/yıl | Ağu 2026 |

---

## 10. Yol Haritası

### Faz I — Validation (Haz–Ara 2026)
**Hedef:** İlk ücretli müşteriler, psikometrik doğrulama
- ✅ CAT + AI scoring + Admin panel
- ✅ Circuit breaker + SLO monitoring
- ✅ Angoff standart belirleme (Rnd 1)
- 🔲 3 pilot müşteri → ARR $30.000+
- 🔲 *Language Testing* dergisi makale gönderimi
- 🔲 ALTE Code of Practice formal self-assessment
- 🔲 Axe-core DOM a11y (A01–A05 kapatma)

### Faz II — Scale (Oca–Ara 2027)
**Hedef:** 65 kurumsal müşteri, ARR ~$600.000
- 🔲 CINEG eşitleme (form linking)
- 🔲 DIF audit cron + madde bankası büyütme
- 🔲 Kariyer.net / LinkedIn Turkey API entegrasyonu
- 🔲 ISO 23988 sertifikasyon başvurusu
- 🔲 MENA pilot (UAE, Mısır)
- 🔲 Çocuklar için uyarlanmış sınav (7–12 yaş, İstanbul ilkokul pazarı)

### Faz III — Expansion (2028+)
**Hedef:** 300+ müşteri, $5M+ ARR
- 🔲 Türkçe dışındaki diller (Arapça, Farsça İngilizce öğrenenleri)
- 🔲 Entegre öğrenme yönetim katmanı (LMS-lite)
- 🔲 CDM (Cognitive Diagnostic Model) — subscore'dan öğrenme tavsiyesi
- 🔲 Sertifika blockchain doğrulama (NFT tabanlı değil, Chainlink PoR)
- 🔲 ALTE Q-Mark sertifikası

---

## 11. Ekip

### Kurucu

**Bilal Çelimli** — Kurucu / CTO / Assessment Director

- Platform mimarisinin tamamını tek başına tasarladı ve inşa etti (Oca–May 2026)
- IRT psikometrisi, CAT tasarımı, AI entegrasyonu, DevOps, güvenlik, KVKK/GDPR uyumu
- Geliştirilen modüller: 50 test dosyası, 613 otomatik test, production SLO izleme
- Teknik derinlik: *Language Testing* dergisine peer-review makale hazırlamakta
- Ağ: ALTE üye adayı, Türkiye dil eğitimi ekosistemi bağlantıları

### İşe Alım Öncelikleri (Yatırım Sonrası)

| Pozisyon | Öncelik | Bütçe |
|---|---|---|
| **Satış & Ortaklık Yöneticisi** (B2B, eğitim sektörü deneyimli) | Kritik | ₺18.000–25.000/ay |
| **Psikometriste / Test Uzmanı** (IRT, standard setting) | Yüksek | ₺22.000–30.000/ay |
| **Ürün Pazarlama** (SaaS B2B, dil eğitimi) | Orta | ₺14.000–20.000/ay |
| **Jr. Full-Stack Developer** | Orta | ₺12.000–16.000/ay |

### Danışman İhtiyacı

- Eğitim teknolojisi alanında deneyimli bir **yönetim kurulu üyesi**
- Türkiye'de edtech yatırımı yapmış bir **strategic LP**
- ALTE veya ETS altyapısından **psikometri danışmanı**

---

## 12. Finansal Projeksiyonlar

### 12.1 P&L Özeti (3 Yıllık)

| | 2026 (Pilot) | 2027 | 2028 |
|---|---|---|---|
| **Gelir** | $90.000 | $629.000 | $2.160.000 |
| Sunucu & AI | ($12.000) | ($62.000) | ($190.000) |
| Personel | ($120.000) | ($380.000) | ($820.000) |
| Satış & Pazarlama | ($25.000) | ($138.000) | ($475.000) |
| G&A + Hukuk | ($18.000) | ($55.000) | ($120.000) |
| **EBITDA** | **(−$85.000)** | **(−$6.000)** | **$555.000** |
| EBITDA Marjı | — | — | %25.7 |

*Not: 2026 yatırım tutarına dahil edilmiştir; bağımsız nakit akışı 2027 ortasında beklenmektedir.*

### 12.2 Temel Varsayımlar

| Varsayım | Değer |
|---|---|
| Ortalama satış döngüsü | 6–10 hafta |
| Müşteri kayıp oranı (churn) | %12/yıl (ilk iki yıl), %7/yıl (üçüncü yıl+) |
| CAC — B2B | $850 (birinci yıl), $620 (ikinci yıl) |
| LTV — B2B Ortalama | $4.400 (14 aylık ortalama sözleşme, 1.4x yenileme) |
| Brüt marj | %78–88 (büyüklükle artar) |
| AI API maliyeti/sınav | $0.08–0.14 (Gemini Flash fiyatlandırması) |

### 12.3 Duyarlılık Analizi

| Senaryo | 2027 ARR | Açıklama |
|---|---|---|
| **Kötümser** | $280.000 | 28 müşteri, yüksek churn |
| **Temel** | $629.000 | 65 müşteri |
| **İyimser** | $1.100.000 | 95 müşteri + MENA ilk sözleşmeler |

---

## 13. Yatırım Talebi ve Kullanım Planı

### 13.1 Yatırım Miktarı

**$500.000 – $1.500.000** (Pre-Seed / Seed Round)

- Enstrüman: SAFE (Simple Agreement for Future Equity) veya tercih hisseli pay
- Değerleme tavanı: $4.5M – $6.5M (ön-para, pazarlığa açık)
- Yatırımcı hakları: bilgi hakkı, pro-rata Seri A'ya kadar, gözlemci kurulu koltuğu

### 13.2 Kullanım Planı ($1M Senaryo)

| Kalem | Tutar | Oran |
|---|---|---|
| **Personel** (ilk 12 ay: Satış + Psikometrist) | $380.000 | %38 |
| **Ürün Geliştirme** (Faz II modülleri, ALTE audit) | $180.000 | %18 |
| **Satış & Pazarlama** (pilot kurum kampanyaları, içerik) | $160.000 | %16 |
| **Altyapı ve Güvenlik** (ISO 23988, pen test, MENA sunucu) | $120.000 | %12 |
| **Akademik Yayın ve Danışmanlık** (psikometri) | $80.000 | %8 |
| **Nakit Rezerv / Beklenmedik** | $80.000 | %8 |
| **Toplam** | **$1.000.000** | **%100** |

### 13.3 Kilometre Taşı Tablosu (Yatırım Sonrası)

| Ay | Kilometre Taşı | Yatırım Tetikleyicisi |
|---|---|---|
| Ay 3 | 3 ücretli pilot müşteri | ✓ |
| Ay 6 | ARR $120.000+ | Seri A hazırlık |
| Ay 9 | *Language Testing* kabul/ret | Psikometri güven belgesi |
| Ay 12 | ARR $300.000+, MENA ilk müşteri | Seri A yükseltme |

---

## 14. Risk Faktörleri

### 14.1 Risk Matrisi

| Risk | Olasılık | Etki | Azaltma Stratejisi |
|---|---|---|---|
| **Gemini API fiyat artışı** | Yüksek | Orta | Circuit breaker + çoklu LLM desteği (Claude, GPT-4o) planlandı |
| **Büyük rakibin Türkiye'ye girişi** | Orta | Yüksek | KVKK yerel avantajı + akademik yayın güvencesi |
| **Psikometrik geçerlilik itirazı** | Düşük | Yüksek | Kane validity argümanı + peer review + ALTE audit |
| **Veri güvenliği olayı** | Düşük | Çok Yüksek | Sentry + GPG yedekleme + penetrasyon testi planı |
| **Kurucu tek nokta riski** | Yüksek | Yüksek | Yatırım sonrası Psikometrist + Jr. Dev işe alımı; kapsamlı belgeler |
| **YÖK / MEB düzenleme değişikliği** | Orta | Orta | CEFR evrensel standard; Türkiye bağımlılığı düşürülüyor |
| **Uzun B2B satış döngüsü** | Yüksek | Orta | Pilot → ücretli geçiş modeli; ROI hesap makinesi materyali |

### 14.2 Hafifletici Faktörler

- **Teknik bağımlılık azaltma:** Tüm psikometrik motor açık kaynak bağımlılıklardan bağımsız (proprietary TypeScript)
- **Veri bağımlılık azaltma:** KVKK uyumlu, veri ülke içinde — yabancı şirket aksaklıklarından etkilenmez
- **Gelir çeşitlendirme:** B2B + B2C + API üç ayrı gelir akışı
- **Savunma:** Peer-reviewed metodoloji, yatırımcıya kopyalanma riskini azaltır

---

## Ekler

### Ek A — Teknik Mimari Özeti
Bkz. `docs/ARCHITECTURE.md`

### Ek B — Geçerlilik Argümanı (Kane 2013)
Bkz. `docs/validity-argument.md`

### Ek C — KVKK/GDPR Uyum Belgesi
Bkz. `docs/kvkk-gdpr-compliance.md`

### Ek D — SLO Tanımları
Bkz. `docs/slo-definitions.md`

### Ek E — Standart Belirleme Raporu (BCa Bootstrap)
Bkz. `docs/standard-setting-report.md`

### Ek F — Peer-Review Makale Taslağı
Bkz. `docs/peer-review-submission-packet.md`

### Ek G — Erişilebilirlik Uyum Beyanı (WCAG 2.1 AA)
Bkz. `docs/accessibility-statement.md`

---

## İletişim

**Bilal Çelimli**  
Kurucu & CEO/CTO  
📧 bilal@b4skills.com  
🌐 app.b4skills.com  
📍 İstanbul, Türkiye  

*Bu belge yalnızca bilgilendirme amaçlıdır ve herhangi bir menkul kıymet arzı oluşturmamaktadır. Yatırım kararları verilmeden önce bağımsız hukuki ve finansal danışmanlık alınması tavsiye edilir.*

---

*Son Güncelleme: Mayıs 2026 | Versiyon 1.0*
