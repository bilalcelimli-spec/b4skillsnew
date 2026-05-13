# b4skills — Rekabet Analizi & Dünya Sınıfına Ulaşma Yol Haritası

> **Tarih:** Mayıs 2026  
> **Kapsam:** Duolingo English Test, Cambridge Linguaskill, PTE Academic, TOEFL iBT, IELTS Online ile derinlemesine karşılaştırma + önceliklendirilmiş eylem planı  
> **Metodoloji:** Her boyutta 0–10 puan; mevcut = tahmini, rakip = bilinen kamu verisi

---

## 1. Karşılaştırılan Platformlar

| Platform | Sahibi | Yıllık Hacim | Kabul Eden Kurum | Fiyat/Test | Sonuç Süresi |
|---|---|---|---|---|---|
| **Duolingo English Test (DET)** | Duolingo Inc. | ~3M | 5,000+ | $65 | ~2 saat |
| **Cambridge Linguaskill** | Cambridge Assessment | ~500K | Dünya geneli | £16–£75 | Dakikalar |
| **PTE Academic** | Pearson | ~2M | 3,300+ | $210–$240 | 24–48 saat |
| **TOEFL iBT** | ETS | ~2M | 11,000+ | $195–$255 | 4–8 gün |
| **IELTS Online** | BC/IDP/Cambridge | ~3.5M | 12,000+ | $200–$300 | 3–5 gün |
| **b4skills (şu an)** | b4skills | — | 0 | — | ~Anlık |

---

## 2. Boyut Bazlı Karşılaştırma Matrisi

### 2.1 Psikometrik Motor

| Boyut | DET | Linguaskill | PTE | TOEFL | b4skills Şu An | Hedef |
|---|---|---|---|---|---|---|
| IRT modeli | 3PL + NRM | 3PL + GRM | 3PL + GRM | 3PL | **3PL + GRM + MIRT** ✅ | ≥ DET |
| EAP/MAP tahmin | ✅ | ✅ | ✅ | ❌ (non-adaptive) | ✅ | — |
| Shadow test LP | ✅ | ✅ | N/A | N/A | 🟡 Partial | ✅ |
| Davey-Parshall exposure | ✅ | ✅ | N/A | N/A | ✅ Sprint 1 | — |
| Person-fit (Lz/ECI/U3) | ✅ | ✅ | ✅ | ✅ | ✅ Sprint 1 | — |
| IPD monitoring | ✅ | ✅ | ✅ | ✅ | ✅ Sprint 1 | — |
| Online calibration (OCM) | ✅ RL | ✅ OCM | ✅ | ✅ | 🟡 Batch only | ✅ |
| DIF analizi (MH) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| MIRT 4D | ✅ | ❌ | ✅ | ❌ | 2B (2D) 🟡 | 4D |
| KL-bilgi seçimi | ✅ | ❌ | ❌ | N/A | ❌ | ✅ |
| RL tabanlı seçim | ✅ (deneysel) | ❌ | ❌ | ❌ | ❌ | Faz 3 |
| Skor eşitleme | ✅ | ✅ | ✅ | ✅ | 🟡 CINEG | ✅ tam |
| **Psikometrik toplam** | **9/10** | **8/10** | **7/10** | **6/10** | **7/10** | **9/10** |

> **Yorum:** b4skills'in psikometrik altyapısı rakiplerin büyük çoğunluğuyla eşdeğer ya da üstün. Bu b4skills'in **en güçlü yanı** — ve çok az insanın farkında olduğu bir gerçek.

---

### 2.2 Yapay Zeka Puanlama

| Boyut | DET | Linguaskill | PTE | TOEFL | b4skills Şu An |
|---|---|---|---|---|---|
| Yazma AI puanlaması | ✅ Kendi modeli | ✅ Cambridge AI | ✅ e-rater tipi | ✅ e-rater + insan | ✅ Gemini |
| Konuşma AI puanlaması | ✅ Kendi modeli | ✅ | ✅ Versant teknoloji | ✅ SpeechRater | ✅ Gemini multimodal |
| İnsan denetimi / QA | ✅ Çift gözden geçirme | ✅ | ❌ (tam AI) | ✅ | 🟡 Kuyruk var ama UI eksik |
| AI–insan QWK SLO | ≥ 0.87 | ≥ 0.85 | ≥ 0.82 | ≥ 0.88 | ~0.80 (tahmin) |
| Sürüklenme tespiti / geri alma | ✅ | ✅ | ✅ | ✅ | ❌ |
| Telaffuz alt skoru | ✅ | ❌ | ✅ (10 boyut) | ✅ | ❌ |
| Akıcılık alt skoru | ✅ | ❌ | ✅ | ✅ | ❌ |
| Sözvarlığı genişliği skoru | ✅ | ❌ | ✅ | ✅ | ❌ |
| **AI Puanlama toplam** | **9/10** | **7/10** | **9/10** | **9/10** | **5/10** |

> **Kritik boşluk:** Gemini puanlaması çalışıyor ama alt-skor raporlama (telaffuz, akıcılık, sözlük genişliği) yok. Aynı Gemini çıktısından bu bilgiler yapılandırılabilir — yeni bir model gerekmiyor.

---

### 2.3 Gözetim (Proctoring)

| Boyut | DET | Linguaskill | PTE | TOEFL | b4skills Şu An |
|---|---|---|---|---|---|
| Tarayıcı kilidi (tam ekran zorunlu) | ✅ | ✅ | ✅ | ✅ (özel yazılım) | ❌ |
| Yüz tespiti (canlı) | ✅ CV modeli | ✅ | ✅ | ✅ | 🟡 Temel |
| Kimlik doğrulama (fotoğraf/pasaport) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Oda taraması / 360° | ✅ | ❌ | ✅ | ✅ | ❌ |
| Biyometrik (parmak izi / yüz kimlik) | ❌ | ❌ | ✅ | ✅ | ❌ |
| İnsan gözetmen havuzu | ❌ (tam AI) | ❌ | ✅ isteğe bağlı | ✅ | 🟡 Rol var, UI yok |
| Ses izleme | ✅ | ❌ | ✅ | ✅ | ❌ |
| Göz takibi / bakış tahmini | ✅ (deneysel) | ❌ | ❌ | ❌ | ❌ |
| Kopya/kopya algılama (Wollack ω) | ✅ | ❌ | ✅ | ✅ | ❌ |
| Ekran görüntüsü engelleme | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Gözetim toplam** | **9/10** | **5/10** | **9/10** | **10/10** | **2/10** |

> **Kritik boşluk:** Gözetim mevcut platformun **en zayıf boyutu**. Kurumsal sözleşme için temel gereklilik; hiçbir üniversite veya büyük işveren bu olmadan sonuçları kabul etmez.

---

### 2.4 Madde Bankası & İçerik

| Boyut | DET | Linguaskill | PTE | TOEFL | b4skills Şu An |
|---|---|---|---|---|---|
| Tahmini madde sayısı | 200K+ | 50K+ | 30K+ | 20K+ | ~2,500 |
| Okuma görev çeşidi | 5+ | 6+ | 8+ | 3 | 3 |
| Dinleme görev çeşidi | 4+ | 5+ | 9+ | 2 | 2 |
| Yazma görev çeşidi | 3 | 2 | 2 | 2 | 2 |
| Konuşma görev çeşidi | 5+ | 4+ | 7+ | 4 | 2 |
| İş İngilizcesi modülü | ❌ | ✅ | ❌ | ❌ | ❌ |
| Akademik İngilizce odağı | ❌ | ❌ | ✅ | ✅ | ❌ |
| Çocuk/gençlik versiyonu | ❌ | ❌ | ❌ | ✅ TOEFL Junior | 🟡 Planlanmış |
| AI ile üretilen madde | ✅ | ❌ | ❌ | ❌ | ✅ Gemini boru hattı |
| Uzman gözden geçirme süreci | ✅ 3 aşama | ✅ | ✅ | ✅ | 🟡 Script var |
| Ön test / alan testi alt havuzu | ✅ | ✅ | ✅ | ✅ | 🟡 Altyapı var |
| **İçerik toplam** | **9/10** | **8/10** | **8/10** | **8/10** | **4/10** |

---

### 2.5 Sertifika Tanınırlığı & Geçerlilik

| Boyut | DET | Linguaskill | PTE | TOEFL | b4skills Şu An |
|---|---|---|---|---|---|
| Akredite kurum sayısı | 5,000+ | Dünya geneli | 3,300+ | 11,000+ | 0 |
| Bağımsız geçerlilik araştırmaları | ✅ Hakemli yayınlar | ✅ ALTE | ✅ Pearson Labs | ✅ ETS araştırma | ❌ |
| Uluslararası standart uyumu (ALTE/EALTA) | ALTE üyesi değil | ✅ ALTE kurucu | ALTE üyesi değil | ALTE değil | ❌ |
| Sertifika doğrulama API'si | ✅ api.duolingo.com | ✅ | ✅ | ✅ | ❌ |
| Sertifika geçerlilik süresi | 2 yıl | 2 yıl | 2 yıl | 2 yıl | Yayınlanmamış |
| Göç/vize amaçlı kabul | ❌ | ❌ | ✅ (AU, UK) | ✅ (bazı) | ❌ |
| **Tanınırlık toplam** | **7/10** | **9/10** | **8/10** | **10/10** | **0/10** |

> **Bu boyut en uzun süren ama en stratejik olan.** Hiçbir yazılım çalışması tek başına 0/10 → 8/10 yapamaz; kurumsal ortaklık ve yayımlanmış araştırma gerektirir.

---

### 2.6 Skor Raporlama & Geri Bildirim

| Boyut | DET | Linguaskill | PTE | TOEFL | b4skills Şu An |
|---|---|---|---|---|---|
| CEFR seviye raporu | ✅ | ✅ | ✅ (dönüşüm tablosu) | ✅ | ✅ |
| Alt-beceri profili | ✅ 4 boyut | ✅ | ✅ 9 beceri | ✅ 4 beceri | ✅ θ+CEFR per skill |
| Telaffuz skoru | ✅ | ❌ | ✅ 10 boyut | ✅ | ❌ |
| Sözvarlığı profili | ✅ | ❌ | ✅ | ✅ | ❌ |
| Eylem yapabilirlik (Can-Do) beyanları | ✅ | ✅ | ✅ | ✅ | 🟡 Altyapı var |
| Video/ses örneği (aday kanıtı) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Kurum portalı | ✅ | ✅ | ✅ | ✅ | ❌ |
| Büyüme takibi (yeniden test) | ✅ | ✅ | ✅ | ✅ | ❌ |
| PDF sertifika | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Skor Raporlama toplam** | **9/10** | **8/10** | **10/10** | **8/10** | **5/10** |

---

### 2.7 Teknik Altyapı & Entegrasyon

| Boyut | DET | Linguaskill | PTE | TOEFL | b4skills Şu An |
|---|---|---|---|---|---|
| LTI 1.3 (LMS entegrasyon standardı) | ❌ | ✅ | ❌ | ❌ | ❌ |
| SCORM / xAPI | ❌ | ✅ | ❌ | ❌ | ❌ |
| REST API (kurumsal) | ✅ | ✅ | ✅ | ✅ | 🟡 Dahili API var |
| Webhook desteği | ✅ | ✅ | ✅ | ✅ | ✅ Stripe |
| iOS / Android native uygulama | ✅ | ❌ | ✅ | ✅ | ❌ (PWA) |
| Çevrimdışı mod | ❌ | ❌ | ❌ | ❌ | 🟡 PWA cache |
| WCAG 2.1 AA erişilebilirlik | ✅ | ✅ | ✅ | ✅ | ❌ |
| SOC 2 Type II / ISO 27001 | ✅ | ✅ | ✅ | ✅ | ❌ |
| GDPR / KVKK uyumluluk | ✅ | ✅ | ✅ | ✅ | 🟡 Belgeler var |
| Çoklu kiracılık (multi-tenant) | ❌ (tek ürün) | ✅ | ❌ | ❌ | ✅ |
| Beyaz etiket (white-label) | ❌ | ✅ | ❌ | ❌ | ✅ |
| HRMS entegrasyonu (Workday/SAP) | ❌ | ✅ kurumsal | ❌ | ❌ | ❌ |
| **Teknik Altyapı toplam** | **7/10** | **9/10** | **6/10** | **6/10** | **5/10** |

---

### 2.8 Aday Deneyimi & UX

| Boyut | DET | Linguaskill | PTE | TOEFL | b4skills Şu An |
|---|---|---|---|---|---|
| Test süresi | 60 dk | 55–90 dk | 120 dk | 180 dk | 15–45 dk (CAT) |
| Anlık sonuç | ✅ ~2 saat | ✅ dakikalar | ❌ 24-48s | ❌ 4-8 gün | ✅ anlık |
| Mobil uyumluluk | ✅ | ✅ | ❌ | ❌ | ✅ PWA |
| Test kaygısı azaltma UX | ✅ Duolingo stili | ❌ | ❌ | ❌ | 🟡 |
| Egzersiz / alıştırma modu | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Çok dilli arayüz | ✅ 40+ dil | ❌ | ❌ | ❌ | ✅ i18n altyapısı |
| Ön test eğitimi / demo | ✅ | ✅ | ✅ | ✅ | ❌ |
| **UX toplam** | **9/10** | **6/10** | **5/10** | **4/10** | **6/10** |

---

## 3. Genel Puan Tablosu

| Boyut | DET | Linguaskill | PTE | TOEFL | **b4skills** | **b4skills Hedef** |
|---|---|---|---|---|---|---|
| Psikometrik motor | 9 | 8 | 7 | 6 | **7** | **9** |
| AI puanlama | 9 | 7 | 9 | 9 | **5** | **8** |
| Gözetim | 9 | 5 | 9 | 10 | **2** | **7** |
| İçerik/madde bankası | 9 | 8 | 8 | 8 | **4** | **7** |
| Tanınırlık/geçerlilik | 7 | 9 | 8 | 10 | **0** | **5** |
| Skor raporlama | 9 | 8 | 10 | 8 | **5** | **8** |
| Teknik altyapı | 7 | 9 | 6 | 6 | **5** | **8** |
| Aday UX | 9 | 6 | 5 | 4 | **6** | **8** |
| **TOPLAM** | **68/80** | **60/80** | **62/80** | **61/80** | **34/80** | **60/80** |

> **Sonuç:** b4skills şu an Cambridge Linguaskill ve PTE'nin yaklaşık %55 seviyesinde. 60/80 hedefi (Linguaskill eşdeğeri) 18–24 ayda ulaşılabilir. DET seviyesi (68/80) 3–4 yıllık bir yolculuk.

---

## 4. Stratejik Öncelik Analizi

### 4.1 Etki / Çaba Matrisi

```
Yüksek Etki
     │
     │  ◆ AI alt-skor raporlama    ◆ Kurum doğrulama portalı
     │  ◆ Gözetim güçlendirme      ◆ Geçerlilik araştırması (ortaklık)
     │
     │  ◆ Madde bankası genişletme ◆ MIRT 4D
     │  ◆ KL-bilgi seçimi          ◆ RL seçim
     │
     └──────────────────────────────────────────── Çaba
          Düşük                              Yüksek
```

**Kısa sürede yüksek etki (Quick Wins — 1–3 ay):**
- AI alt-skor raporlama (telaffuz, akıcılık, sözvarlığı genişliği) — Gemini promptlarını yapılandır
- Sertifika doğrulama portalı — basit token tabanlı URL yeterli
- Can-Do bildirimleri — CEFR altyapısı zaten var
- Büyüme takibi / yeniden test karşılaştırması — mevcut θ geçmişi yeterli
- Kurum portalı (salt okunur skor görüntüleme) — AdminDashboard üzerine

**Uzun vadeli / yüksek yatırım gerektiren:**
- Gözetim derinleştirme — tam ürün tasarımı gerekiyor
- Kurumsal tanınırlık — ticari ve akademik ortaklık süreci
- Madde bankası ölçekleme — sistematik içerik programı

---

## 5. Uygulama Yol Haritası

### Faz 1: Pazar Hazırlığı (1–4. Aylar)

**Ay 1 — AI Puanlama Alt-Skorları**

Hedef: Gemini konuşma/yazma çıktısını 5 boyuta yapılandır.

```
Konuşma boyutları:
  pronunciation_score   (0.0–1.0) — ses netliği, vurgu, ton
  fluency_score         (0.0–1.0) — duraklamalar, tereddüt, akış
  lexical_range_score   (0.0–1.0) — sözvarlığı çeşitliliği
  grammar_accuracy_score(0.0–1.0) — yapısal doğruluk
  task_completion_score (0.0–1.0) — konuyu ele alma derinliği

Yazma boyutları:
  task_achievement, coherence_cohesion,
  lexical_resource, grammatical_range
```

Yapılacaklar:
- `gemini-scoring-service.ts` — yapılandırılmış JSON şema çıktısı
- `ScoreReport` şeması — 5 alt-skor alanı + Prisma migrasyonu
- `CandidateReport.tsx` — boyutsal radar/spider grafiği
- `ParticipantAnalysisPanel.tsx` — alt-skor gösterimi

---

**Ay 1 — AI Puanlama Kalite İzleme**

Hedef: QWK sürüklenme tespiti + otomatik geri alma.

Yapılacaklar:
- `scripts/qwk-monitor.ts` — haftalık Cohen κ hesaplama (AI vs insan)
- QWK < 0.75 → admin uyarısı + Gemini sürümünü dondur
- `src/lib/scoring/scoring-drift-detector.ts` — otomatik geri alma mantığı

---

**Ay 2 — Gözetim Güçlendirme (Aşama 1)**

Hedef: Temel kurumsal beklentiyi karşıla.

Yapılacaklar:
- Tarayıcı kilidi: Tam ekran zorunluluğu + sekme değiştirme tespiti (`visibilitychange`, `blur` olayları → oturumu duraklat/bayrakla)
- Kopyala/yapıştır engelleme: `keydown` yakalama, sağ tıklama devre dışı
- Kimlik doğrulama: Oturum başında `getUserMedia()` → yüz fotoğrafı çekme → admin görüntüsüyle karşılaştırma (Gemini Vision ile basit benzerlik skoru)
- Video kayıt: Oturum boyunca kameradan 1 kare/5 saniye kaydet → nesne depolamasına gönder
- Ses izleme: Arka plan sesi tespiti → skor raporu not alanına
- `ProctorEventLog` modeli — Prisma'ya ekleme

---

**Ay 2–3 — Kurum Skor Doğrulama Portalı**

Hedef: Bir işveren/üniversitenin sertifika kodunu girerek skoru doğrulayabilmesi.

Yapılacaklar:
- `GET /api/verify/:certificateCode` — genel API uç noktası
- `src/components/VerificationPage.tsx` — marka adı + CEFR + tarih + QR kodu
- PDF sertifikasına QR kodu + doğrulama URL'si gömme
- Oran sınırlaması: IP başına dakikada 10 istek

---

**Ay 3 — Skor Raporlama Zenginleştirme**

Yapılacaklar:
- **Can-Do bildirimleri**: Mevcut `cefr-framework.ts` `getCanDo()`'yu kullanarak PDF + web raporuna ekle
- **Büyüme raporu**: Aynı aday için iki oturumu karşılaştır — θ farkı + standart hata aralığı + yüzde birlik sıralama
- **Sözvarlığı profili**: Mevcut `vocabulary-profiler.ts`'i yanıt metnine bağla → CEFR-seviyeli sözcük dağılımı
- **Aday rapor indirme**: Tek sayfalık PDF özeti (jsPDF)

---

**Ay 4 — LMS Entegrasyonu (LTI 1.3)**

Hedef: Moodle/Canvas/Blackboard'dan tek tıkla erişim.

Yapılacaklar:
- `src/lib/ecosystem/lti13/` dizini
- LTI 1.3 başlatma, OIDC oturum açma akışı, derin bağlantı mesajları
- `lti_registrations` tablosu — Prisma migrasyonu
- xAPI deyimleri: `attempted`, `completed`, `scored` → LRS hedef desteği
- Canvas + Moodle ile doğrulama

---

### Faz 2: Ölçek & Kalite (5–10. Aylar)

**Ay 5–6 — Madde Bankası Programı**

Hedef: 2,500 → 10,000 madde.

Strateji:
- `scripts/expand-item-bank.ts` boru hattı üzerine kur
- Beceri × Seviye başına aylık 200 madde hedefi (4 beceri × 7 seviye × 6 ay = 16,800 üretim)
- 3 aşamalı kalite kapısı: AI üretim → otomatik kalite kontrolü → uzman onayı (harici dil uzmanları)
- Ön test havuzu: Her 100 yeni maddeden 15'ini operasyonel maddelere karıştır
- DIF denetimi: Yeni maddeler 200 yanıt toplandıktan sonra MH DIF için bayrakla

Yeni görev türleri:
- `FILL_IN_THE_BLANK` (gap-fill) — tüm beceriler
- `MATCHING` — Okuma/Kelime
- `SHORT_ANSWER` — Yazma alt görevi
- `DICTATION` — Dinleme (DET tarzı)
- `READ_ALOUD` — Konuşma (telaffuz + akıcılık)
- `REPEAT_SENTENCE` — Konuşma (çalışma belleği)
- `SUMMARIZE_SPOKEN_TEXT` — Konuşma + Dinleme entegre

---

**Ay 6–7 — Gelişmiş Gözetim (Aşama 2)**

Yapılacaklar:
- MediaPipe Face Mesh tabanlı göz takibi → bakış tahmini + "ekrandan uzaklaştı" uyarısı
- Yüz yok tespiti → oturumu otomatik duraklat (3 saniye hoşgörü süresi)
- Oda taraması (test başlamadan önce kamerayı döndürme talimatı)
- İnsan gözetmen paneli: Canlı video akışı izleme, not alma, oturumu durdurma

---

**Ay 7–8 — Wollack ω Kopya Tespiti**

Yapılacaklar:
- `src/lib/psychometrics/test-security/wollack-omega.ts`
- K-indeksi (Sotaridona 2002): Ortak yanlış yanıt örüntüsü analizi
- S2 istatistiği (van der Linden 2003): Yanıt süresi profili kollüzyon tespiti
- Paylaşılan IP + yanıt süresi örüntüsü çakışma puanlaması
- Admin: Bayraklı oturumlar → gözden geçirme kuyruğu + iş akışı yükseltme

---

**Ay 8–9 — KL-Bilgi Madde Seçimi (Faz 2 Psikometri)**

Yapılacaklar:
- `src/lib/psychometrics/kl-information.ts`
- Chang & Ying (1996) KL ıraksama: İlk 5 madde KL; kalan MFI
- MIRT 4D yükseltme: θ = (θ_receptive, θ_productive, θ_grammatical, θ_strategic)
- Dikey ölçekleme: CINEG eşitlemeyi tüm oturumlara bağla → büyüme raporları için tek θ ölçeği

---

**Ay 9–10 — Çevrimiçi Kalibrasyon (Stocking 1990)**

Yapılacaklar:
- `calibration-service.ts` → artımlı MML concurrent tahmin
- Gece batch: Her madde için 200+ yeni ön test yanıtından sonra çalıştır
- IRT parametrelerini güven aralığıyla güncelle; |Δb| > 0.3 → gözden geçirmeye al
- `calibration_runs` tablosu — Prisma

---

### Faz 3: Tanınırlık & Pazar Genişletme (11–24. Aylar)

**Ay 11–13 — Bağımsız Geçerlilik Araştırması**

Duolingo'nun 2019'da yaptığı şeyi yap: Bir ölçme birimi ortaklığı ve hakemli yayın.

Adımlar:
- Bir devlet üniversitesi ölçme araştırma merkezi ile anlaşma (ör. bir eğitim fakültesi psikometri bölümü)
- Eşzamanlı geçerlilik çalışması tasarımı: 500+ aday → b4skills + CEFR altın standartı (Cambridge A2-B2 Key/PET)
- Sonuç: Pearson r ≥ 0.78 → yayın yoluna gir
- ALTE Kodunu Doğrulama Kılavuzu (Code of Practice) gerekliliklerini belgele

---

**Ay 13–15 — Kurum Ortaklık Programı**

- 5 pilot kurum ile MOU (iş/dil okulu/üniversite): Ücretsiz erişim karşılığı geçerlilik verisi
- Özel kurumsal tablo (beyaz etiket tenant): Kendi CEFR sertifikaları + logo
- Net Promoter Score toplama + referans mektubu programı

---

**Ay 15–18 — Sertifika Tanınırlık Programı**

- Üniversite yönetmelikleri onay süreci (bir Türk üniversitesi ilk hedef — YÖK akreditasyonu)
- İşveren entegrasyon API'si: Workday / SAP SuccessFactors webhook → HR sistemi skor gönderimi
- LinkedIn sertifika rozeti entegrasyonu (Open Badge 2.0 standardı)
- Uluslararası: ALTE/EALTA üyelik başvurusu hazırlığı

---

**Ay 18–24 — Gelişmiş AI & Ürün Genişlemesi**

- **G-DINA diagnostik geri bildirim**: Q-matrisi → öznitelik bazlı ustalık profilleri ("Koşul cümleleri: %87 ustalık")
- **RL tabanlı madde seçimi**: DET 2023+ yaklaşımı — PPO veya REINFORCE ile politika öğrenimi
- **Ses görüşmesi modu** (Versant tarzı): Telefon/düşük bant genişliği piyasaları için
- **Ürün genişleme**:
  - İş İngilizcesi modülü (Cambridge BEC tarzı içerik)
  - Gençlik/İlköğretim sürümü (A1-B1, görsel ağırlıklı)
  - Tıp/Hukuk/Mühendislik terminolojisi alan testleri

---

## 6. Mühendislik Sprint Planı (İlk 12 Hafta)

| Sprint | Hafta | Odak | Teslim |
|---|---|---|---|
| **S5** | 1–2 | AI alt-skor yapılandırma | Gemini 5 boyutlu JSON + DB şeması |
| **S6** | 3–4 | QWK izleme + geri alma | `qwk-monitor.ts` + uyarı dashboard |
| **S7** | 5–6 | Tarayıcı kilidi + sekme tespiti | `ProctorGuard` bileşeni + event log |
| **S8** | 7–8 | Kimlik doğrulama + yüz snapshot | Kamera yakalama + admin görüntüsü karşılaştırma |
| **S9** | 9–10 | Doğrulama portalı + sertifika QR | `GET /api/verify/:code` + `VerificationPage.tsx` |
| **S10** | 11–12 | Can-Do raporlama + büyüme raporu | PDF iyileştirme + yeniden test karşılaştırması |

---

## 7. KPI Gösterge Paneli

### Psikometrik

| KPI | Şu An (tahmin) | 12 ay hedefi | 24 ay hedefi |
|---|---|---|---|
| Marjinal güvenilirlik (α) | ~0.78 | ≥ 0.90 | ≥ 0.92 |
| Koşullu SEM @ sınır θ | ~0.45 | ≤ 0.35 | ≤ 0.30 |
| AI–insan QWK | ~0.80 | ≥ 0.84 | ≥ 0.87 |
| Sınıflandırma doğruluğu (κ) | ~0.65 | ≥ 0.82 | ≥ 0.88 |
| Eş zamanlı geçerlilik (r vs. altın standart) | — | ≥ 0.75 | ≥ 0.80 |

### Operasyonel

| KPI | 6 ay hedefi | 12 ay hedefi |
|---|---|---|
| Madde bankası büyüklüğü | ≥ 5,000 | ≥ 10,000 |
| Madde maruz kalma oranı (maks) | ≤ 25% | ≤ 20% |
| Sertifika doğrulama sorgusu başarı | ≥ 99.9% | ≥ 99.9% |
| Gözetim olay kaydı kapsamı | %100 | %100 |
| Ortalama oturum süresi | ≤ 40 dk | ≤ 35 dk |

### İş

| KPI | 12 ay hedefi | 24 ay hedefi |
|---|---|---|
| Pilot kurum sayısı | ≥ 5 | ≥ 50 |
| Yayımlanan geçerlilik çalışmaları | 1 | 3 |
| Sertifika kabul eden kurum | ≥ 10 | ≥ 200 |
| Aylık aktif test | ≥ 500 | ≥ 5,000 |

---

## 8. Stratejik Özet: Ne Yapmalı, Ne Yapmamalı

### Yap ✅

1. **AI alt-skor yapılandırmasını hemen uygula** — Mevcut Gemini altyapısında büyük mühendislik değişikliği gerektirmez; skor raporlamanın kalitesini 5/10 → 8/10'a çıkarır
2. **Gözetimi önceliklendir** — Tanınırlık programı başlatmadan önce en büyük güven engeli bu; tarayıcı kilidi + kimlik doğrulama olmadan hiçbir kurum sonucu kabul etmez
3. **Doğrulama portalını aç** — Herhangi bir müşteri adayı için en kolay "evet" kapısı; bir işveren veya üniversite sertifikayı doğrulayabilmelidir
4. **Madde bankasını sistematik olarak büyüt** — AI üretim boru hattın var; ayda 500 madde üretmeye başla, uzman gözden geçirme süreci kur
5. **Bir üniversite ortaklığı başlat** — Yazılım ne kadar mükemmel olursa olsun, bağımsız doğrulama olmadan "dünya sınıfı" olmak mümkün değil

### Yapma ❌

1. **RL tabanlı madde seçimini şimdi inşa etme** — DET yıllarca deneysel veri topladı; önce item bank ölçekle
2. **Tüm rakip özelliklerini aynı anda kopyalamaya çalışma** — Önce tek bir niş'te en iyisi ol (ör. Türkiye kurumsal/eğitim piyasası)
3. **Teknik güvenilirliği ihmal ederek tanınırlık peşinde koşma** — Kötü puanlayan ama tanınan bir test olmak uzun vadede imkânsız

---

## 9. Rekabet Avantajı Analizi

b4skills'in rakiplere karşı gerçek avantajları:

| Avantaj | Rakipte yok | Açıklama |
|---|---|---|
| **Anlık sonuç** | TOEFL (4-8 gün), IELTS (3-5 gün), PTE (24s) | CAT → θ anında, AI puanlama ~30 saniye |
| **Beyaz etiket + çok kiracılı** | DET, PTE, TOEFL | Okul/kurum kendi markasıyla test sunabilir |
| **MIRT + GRM + kişi-uyumu bir arada** | Linguaskill, TOEFL | Psikometrik derinlik rakiplerin önünde |
| **Çok dilli arayüz** | PTE, TOEFL, IELTS | Türkçe + diğer dillerde erişilebilir |
| **CAT adaptifliği tüm becerilerde** | IELTS (non-adaptive) | Her beceri için ayrı θ tahmini |
| **Açık API ekosistemi** | DET, PTE | LMS + HRMS entegrasyonu mümkün |
| **Düşük test maliyeti potansiyeli** | $195–$300 rakip | Maliyet yapısı çok daha düşük tutulabilir |

> **Sonuç:** b4skills'in en net rekabet pozisyonu = **kurumsal B2B**, özellikle üniversiteler ve büyük şirketlerin kendi markasıyla sınav yapmasını isteyen durumlar. DET ve TOEFL bu pazara girmez; PTE ve Cambridge Linguaskill pahalı. b4skills doğru fiyat + derin psikometri + beyaz etiket kombinasyonuyla bu boşluğu doldurabilir.
