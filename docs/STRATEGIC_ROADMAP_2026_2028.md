# b4skills — Dünya Çapında Rekabet İçin Stratejik Geliştirme Planı

**Hedef:** 2026 Q3'e kadar Linguaskill / Duolingo English Test (DET) / Aptis seviyesinde rekabet edebilir; 2027 sonuna kadar TOEFL / IELTS / PTE Academic ile global kurumsal pazarlarda alternatif konuma gelmek.

**Hazırlayan:** Strateji Notu — 2026-05-24
**Kapsam:** 4 katman (Teknik · İçerik · Arayüz · Başvuru sistematiği) · 4 zaman dilimi (90 gün → 24 ay)

---

## 0. Rekabet Manzarası — Mevcut Lider Pazara Bakış

| Platform | Güçlü Yön | b4skills'in Açığı |
|---|---|---|
| **Cambridge Linguaskill** | Adaptif, kurumsal güven, ALTE/Council of Europe damga | Anker item bank büyüklüğü (50k+), kalibrasyon altyapısı |
| **Duolingo English Test (DET)** | Tamamen online proctoring, $59 fiyat, 48-saat sonuç, 5500+ üniversite kabulü | Anti-cheating ML, video review havuzu, marka tanınırlığı |
| **PTE Academic (Pearson)** | AI scoring (insan rater yok), 5 iş gününde sonuç, 100+ ülke test merkezi | Network of test centers, AI scoring güvenilirliği |
| **TOEFL iBT (ETS)** | Yarım yüzyıl psikometrik tarih, 12k+ kabul kurumu, integrated skills | Marka, kabul ağı, anti-cheat olgunluğu |
| **IELTS (British Council + IDP + Cambridge)** | Hem akademik hem göç için kabul, fiziksel + computer-delivered | Test merkezi ağı, hükümet/göç anlaşmaları |
| **Aptis (British Council)** | Kurumsal/öğretmen pazarı, modüler, ucuz | Kurumsal pazarlama gücü, BC marka |
| **EF SET** | Ücretsiz, 1 milyon test/yıl, kalibrasyon datasi | Ücretsiz tarafta ölçek (DET'in 100x'i) |

**b4skills'in yapısal avantajları:**
- Modern stack (React 19, TS, Prisma, Vite) — DET ve Cambridge legacy Java/PHP üzerinde
- Adaptif algoritma (3PL IRT + θ tahmini) zaten production'da
- Multi-rater AI ensemble (Gemini + Claude + GPT-4o) — DET tek model
- Kültürel adaptasyon framework'ü (Q8) — kimsede yok
- 9 düzeyli RBAC + GDPR/LGPD/CCPA compliance from day-1

**Stratejik tez:** Cambridge'in psikometrik titizliği + DET'in fiyat/UX devrimi + ChatGPT-çağı AI hızı = b4skills'in kazanma pozisyonu.

---

## 1. KATMAN 1 — TEKNİK MİMARİ

### 1.1 Mevcut Durum (2026-05)

✅ Var: Multi-rater AI ensemble · 3PL IRT · WebSocket realtime · PWA offline · K8s manifests · WCAG 2.1 AA · RBAC · Webhooks · HMAC-SHA256

❌ Yok / yetersiz:
- Mobil native app (React Native + Expo)
- Çoklu bölge deployment (single-region risk)
- Anti-cheating ML pipeline (sadece kural-tabanlı)
- Sub-100ms global latency (CDN + edge functions yok)
- SOC 2 / ISO 27001 sertifikasyon süreci başlamamış
- LockDown Browser eşdeğeri yok
- Speech recognition pipeline kendi domain'imizde değil (Google TTS bağımlı)
- Stream-based item delivery (büyük item'lar tek-shot)

### 1.2 90-Gün Hedefleri (2026 Q3)

| # | İş | Çıktı | Sorumluluk |
|---|---|---|---|
| T-1 | **Multi-region deploy** — eu-west-1 + us-east-1 + ap-southeast-1 (Tokyo) | 3 bölge aktif-aktif, GeoDNS routing, RPO ≤ 5dk | DevOps |
| T-2 | **CDN + Edge** — Cloudflare Workers veya AWS CloudFront + Lambda@Edge | Static assets edge'de, API health-check edge'de | DevOps |
| T-3 | **Anti-cheat ML pipeline v1** — face presence + multi-face + gaze + tab-switch + paste anomaly | Real-time risk score (0–100), webhook'a alarm | ML + Backend |
| T-4 | **Browser lockdown** — Safe Exam Browser entegrasyonu veya kendi Electron sürümü | İndirilebilir client, screen recording'i bloklar | Frontend |
| T-5 | **OpenTelemetry** — distributed tracing (Jaeger) + log aggregation (Loki) | Tek bir session ID ile end-to-end trace | Backend |
| T-6 | **Speech pipeline v1** — Whisper-large-v3 self-hosted veya Deepgram Nova-2 | <500ms transkript, prosody features çıkarımı | ML |
| T-7 | **Mobil native app — alpha** — Expo + React Native, share UI components | iOS + Android TestFlight/Internal Testing | Mobile |
| T-8 | **Load testing CI** — k6 + 10k concurrent simülasyon, p95 < 800ms | GitHub Actions weekly run | QA |

### 1.3 6-Ay Hedefleri (2026 Q4)

| # | İş | Çıktı |
|---|---|---|
| T-9 | **SOC 2 Type I** denetim başlatma — Vanta/Drata otomasyon platformu | Auditor seçimi, 90-gün observation window başlatıldı |
| T-10 | **Anti-cheat ML v2** — speech voiceprint + typing rhythm biometrics | Voice cloning detection, multi-person speaker diarization |
| T-11 | **Hybrid proctoring** — live human proctor opsiyonu (Proctor360 veya kendi havuzumuz) | Premium tier için live proctor seçeneği |
| T-12 | **Real-time IRT calibration** — yeni response geldikçe item parametrelerini incremental güncelleme | Newton-Raphson + EM, R/TAM yerine in-house |
| T-13 | **Mobil app — public release** — iOS App Store, Google Play | 4.5+ yıldız hedefi, offline-first |
| T-14 | **Disaster recovery drill** — quarterly chaos engineering (region-down simülasyonu) | Game-day raporu, RPO/RTO doğrulandı |

### 1.4 12-Ay Hedefleri (2027 Q2)

- SOC 2 Type II + ISO 27001:2022 sertifikasyonu tamamlandı
- ISO 27701 (privacy) ve GDPR Art. 27 EU temsilcisi atandı
- FedRAMP Moderate ATO için süreç başlatıldı (US gov pazarı)
- 99.99% uptime SLA imzalanabilir hale geldi
- Edge inference: distractor quality scoring edge'de (Cloudflare Workers AI)
- Item bank 50k+ — bunun için bulk generation + auto-calibration pipeline'ı stable

### 1.5 24-Ay Hedefleri (2028 Q2)

- 99.999% uptime ("five nines") için aktif-aktif multi-region writes
- Custom silicon ML inference (AWS Inferentia2 veya Google TPU v5)
- Sub-50ms p99 global API latency
- Tam offline-capable mobile app (assessment + scoring on-device küçük modellerle)
- Open-source IRT engine — psikometrik topluluğa katkı (akademik PR)

---

## 2. KATMAN 2 — İÇERİK (Item Bank + Psychometrics)

### 2.1 Mevcut Durum (2026-05)

✅ Var: 2 461 MCQ item · 6 skill (GRAMMAR, VOCAB, READING, LISTENING, WRITING, SPEAKING) · CEFR A1–C2 · Pretest/calibration süreci · DIF detection · 9 dilekçe-bazlı tek-shot scoring

❌ Yok / yetersiz:
- Lider rakipler 50k–500k item bank — biz 2.5k (20–200x açık)
- Native speaker recording havuzu (LISTENING için Google TTS bağımlı)
- Domain-specific assessments (medical, legal, aviation, academic)
- Video tabanlı item'lar (DET'in görsel comprehension item'ları)
- Authentic context (gerçek iş yeri/akademik senaryolar)
- Field-test havuzu — 1000+ pretest taker / yeni item / dönem
- Item exposure controls (max exposure rate yok — overexposure riski)
- Anchor items + forms equating (eşit-zorluk paralel formlar)

### 2.2 90-Gün Hedefleri

| # | İş | Çıktı |
|---|---|---|
| C-1 | **Item bank 2.5k → 10k** — bulk AI generation + human review pipeline | Skill başına 1500+ item, her CEFR seviyesi balanced |
| C-2 | **Native speaker recording havuzu** — Voices.com / Voice123'den 12 ses (3 dilekçe × 4 aksan: British, American, Australian, Canadian) | LISTENING item'larının %80'i native recording'e geçti |
| C-3 | **Authentic context kütüphanesi** — BNC + COCA + BAWE corpus'lardan 5000+ gerçek metin pasajı | READING için seed materyal hazır |
| C-4 | **Anchor item havuzu** — her CEFR seviyesi için 50 anchor (toplam 300) | Forms equating için kullanılacak |
| C-5 | **Item exposure controls** — Sympson-Hetter veya Stocking-Lewis exposure control | Max exposure rate %30, item rotasyon planı |
| C-6 | **Field testing program** — her yeni item için min 200 pretest response (zaten var, scale-up) | Aylık pretest cohort raporu |

### 2.3 6-Ay Hedefleri

| # | İş | Çıktı |
|---|---|---|
| C-7 | **Item bank 10k → 25k** | Domain-specific item'lar dahil |
| C-8 | **Domain modules — v1** — Business English, Academic English (EAP), Healthcare English | 3 specialized assessment hazır, ayrı item bank |
| C-9 | **Video item formatı** — multimedya stem ile MCQ (Cambridge'in C1 Advanced part 7 stili) | İlk 100 video item, video stem upload pipeline |
| C-10 | **Multi-rater Speaking calibration** — minimum 3 human rater / response → IRR (κ) > 0.85 hedef | IRR raporu çeyrek dönemde yayımlanıyor |
| C-11 | **Cultural neutrality testing** — DIF (Differential Item Functioning) tüm item'lar için 12 demografi alt-grubu | DIF flag'li item'lar revize ediliyor |
| C-12 | **Constructed-response auto-scoring** — Writing için Gemini + Claude + GPT-4o ensemble (zaten var, accuracy hedef artır) | QWK (Quadratic Weighted Kappa) > 0.85 vs human |

### 2.4 12-Ay Hedefleri

| # | İş | Çıktı |
|---|---|---|
| C-13 | **Item bank 25k → 50k** | DET seviyesine yaklaşma |
| C-14 | **Specialized modules** — Aviation English, Maritime English, Legal English, Tourism & Hospitality | 4 yeni dikey eklendi |
| C-15 | **Open Badges 2.0 + Verifiable Credentials (W3C)** | LinkedIn'e shareable, blockchain-anchored sertifika |
| C-16 | **Adaptive Speaking** — adaptif konuşma testi (her dönüşte yeni difficulty) | Pilot grubu test, sonuç raporu |
| C-17 | **Concordance studies** — TOEFL/IELTS/CEFR concordance tablosu (akademik makale ile) | "b4skills 75 = IELTS 6.5 = TOEFL 79" gibi mapping |
| C-18 | **Item refresh policy** — her item için max kullanım ömrü (1 yıl), otomatik retire | Item retirement job (var, scale-up) |

### 2.5 24-Ay Hedefleri

- Item bank 50k → 150k (her major skill 25k+)
- ALTE (Association of Language Testers in Europe) üyeliği
- AERA/APA/NCME Standards for Educational and Psychological Testing tam uyum
- Concordance çalışmaları peer-reviewed dergide yayımlandı
- Field testing programına ücretli katılım (DET'in $5 incentive modeli)

---

## 3. KATMAN 3 — ARAYÜZ (UI/UX)

### 3.1 Mevcut Durum (2026-05)

✅ Var: React 19 + Vite · TailwindCSS · 38+ React komponenti · WCAG 2.1 AA temel · Accessibility settings · 8 dil i18n · Brand manager · PWA service worker

❌ Yok / yetersiz:
- Pixel-perfect design system (component library tutarlılığı %60 civarı)
- Motion design (Framer Motion sınırlı, mikro-etkileşim eksik)
- Dark mode (kısmi)
- 60 fps interaction guarantee yok (özellikle item rendering'de jitter var)
- Adaptive layout (tablet & küçük desktop için optimize değil)
- Score reporting visualization (rakipler radar/sankey diagrams kullanıyor)
- In-app onboarding tours (Userpilot/Appcues yok)
- Real-time progress micro-celebrations (confetti yok)
- Tablet ve E-Ink reader desteği
- Sesli navigasyon (voice UI)

### 3.2 90-Gün Hedefleri

| # | İş | Çıktı |
|---|---|---|
| U-1 | **Design system v2** — Radix UI + Tailwind variants ile sıfırdan tüm primitif komponentler | 40+ komponent, Storybook'a alındı |
| U-2 | **Motion system** — Framer Motion variant'larıyla micro-interactions (hover, tap, page transitions) | 8 standard motion preset, prefers-reduced-motion saygılı |
| U-3 | **Score Report Redesign** — radar chart (skills), gauge (CEFR), trajectory line | Aday raporu yeniden tasarlandı, Recharts + custom SVG |
| U-4 | **Onboarding tour** — first-run guided overlay (kendi tour engine'imiz, Shepherd.js veya custom) | Hem aday hem instructor için 8-adımlık tour |
| U-5 | **Tablet layout** — iPad Pro 11"/12.9" için optimize, landscape support | Breakpoint 768/1024/1280 yeniden ayarlandı |
| U-6 | **Dark mode complete** — tüm sayfalar + email template'leri | Sistem teması algılayıp uygulayan toggle |
| U-7 | **Empty states + skeleton screens** — her loading durumu için skeleton, her empty state için açıklayıcı CTA | 40+ ekrana eklendi |
| U-8 | **Micro-celebrations** — assessment completion → confetti + badge animasyonu | canvas-confetti zaten dep, AssessmentComplete'e eklendi |

### 3.3 6-Ay Hedefleri

| # | İş | Çıktı |
|---|---|---|
| U-9 | **Mobile UX — native feel** — React Native app'te bottom sheets, haptic feedback, native gestures | iOS Human Interface + Material Design uyumu |
| U-10 | **Multi-language UI — 40 dil** (şu an 8) | DeepL API ile auto-translate + native speaker review |
| U-11 | **RTL (Arapça, İbranice, Farsça)** tam destek | i18n RTL flip, ikon mirroring, tablo sütun yönü |
| U-12 | **Accessibility — WCAG 2.2 AAA hedefleri** | Renk kontrastı 7:1, focus indicators 3px, target size 44px |
| U-13 | **Print-friendly score reports** — A4 PDF + 8.5x11 inch, official seal | jsPDF + html2canvas ile pixel-perfect export |
| U-14 | **Voice UI (sesli komut)** — "Web Speech API + Whisper" — accessibility için sesli navigasyon | Görme engelliler için MVP |
| U-15 | **Calendar integrations** — Google Calendar, Outlook, Apple Calendar — assessment scheduling | OAuth + ICS feed |
| U-16 | **In-app notifications + push** — assessment hatırlatma, sonuç hazır bildirimi | Firebase Cloud Messaging / OneSignal |

### 3.4 12-Ay Hedefleri

- White-glove enterprise onboarding flow (Dedicated Success Manager + custom org setup)
- AI tutor chat overlay (Claude/GPT-powered, adayın o anki item'ına context-aware)
- Practice mode marketplace (test prep partnerleri içerik koyabilir)
- E-Ink reader support (Kindle Scribe, reMarkable için optimized typography)
- Vision Pro / Apple Vision spatial UI prototipi (uzun vade ar/vr)

### 3.5 24-Ay Hedefleri

- Tam design system handoff Figma → kod (Token Studio + Style Dictionary)
- Animasyon performansı: tüm major interaction'lar 60 fps, jank-free
- 80+ dil tam UI desteği, 30+ dilde marketing site
- Lighthouse Performance + Accessibility + SEO + Best Practices hepsi 95+

---

## 4. KATMAN 4 — BAŞVURU SİSTEMATİĞİ (Application + Process Layer)

### 4.1 Mevcut Durum (2026-05)

✅ Var: Email/password auth · MFA (TOTP) · Bulk onboarding · Billing service · Branding service · Cohort analytics · Audit logs · LTI 1.3 (kısmen)

❌ Yok / yetersiz:
- SSO (Google/Apple/Microsoft/Facebook social auth)
- 1-click registration (mandatory email verification flow ağır)
- Knowledge graph / kişiselleştirilmiş çalışma yolu
- Score reporting to institutions automatically (EFT/API ile direkt)
- LinkedIn integration (share certificate)
- Tutor marketplace
- AI tutor (zaten Q5'te skeleton var ama production'a girmedi)
- Peer practice partners
- Live group classes platform
- LMS integration (Canvas, Moodle, Blackboard, D2L) production-ready değil
- API for B2B integration documentation eksik
- Reseller program portalı yok
- Score validity policy (2-year industry standard) tanımlı değil
- Multiple attempts / retake policy yok
- Score guarantee program yok

### 4.2 90-Gün Hedefleri

| # | İş | Çıktı |
|---|---|---|
| P-1 | **Sosyal SSO** — Google, Microsoft, Apple sign-in (Facebook ikincil) | One-tap signup, email verification atlandı (provider doğruladıysa) |
| P-2 | **Diagnostic test — 5 dk** — ücretsiz placement, signup öncesi | Anonim cohort, dönüşüm funnel'ı analiz |
| P-3 | **Score reporting API** — institution-side dinleyebilsin (REST + webhook) | "Send my score to X University" otomatik akış |
| P-4 | **LinkedIn share** — certificate badge'i tek tıkla profile eklenir | LinkedIn Add to Profile API |
| P-5 | **LMS integrations v1** — Canvas + Moodle LTI 1.3 deep linking | 2 sandbox kurum entegrasyonu, demo video |
| P-6 | **Score policy** — 2 yıl geçerlilik, 30-gün cool-down, max 3 attempt/yıl | Resmi dokümana eklendi, sistemde enforce |
| P-7 | **API documentation portal** — Mintlify veya ReadMe.io | developer.b4skills.com canlı |
| P-8 | **Public status page** — statuspage.io veya kendi sayfası | status.b4skills.com canlı, uptime + incident history |

### 4.3 6-Ay Hedefleri

| # | İş | Çıktı |
|---|---|---|
| P-9 | **AI tutor — production** — adayın zayıf becerilerine göre içerik, Claude-powered chat | "Practice tutor" tab'ı, 100k mesaj/ay başlangıç |
| P-10 | **Live group classes** — Zoom/Daily.co ile entegre, instructor host, max 12 öğrenci | İlk 50 sınıf canlı |
| P-11 | **Tutor marketplace** — Preply/iTalki tarzı, b4skills içinde tutor profilleri | 100 doğrulanmış tutor, hizmet komisyonu %15 |
| P-12 | **LMS integrations v2** — Blackboard, D2L Brightspace, Schoology eklendi | 5 enterprise sandbox |
| P-13 | **Reseller portal** — partner kayıt, white-label opsiyonları, komisyon tracking | 10 reseller imzalandı |
| P-14 | **Knowledge graph** — item-skill-CEFR ilişki grafiği, Neo4j veya Postgres ltree | Adaptif path öneri motorunu besler |
| P-15 | **Score guarantee program** — "B2 garanti, olmazsa para iadesi veya ücretsiz retake" | Pricing sayfasında öne çıkıyor, risk modeli kuruldu |
| P-16 | **Mobile push + SMS reminders** — Twilio + FCM | 24h öncesi hatırlatma, no-show oranı %30 düştü |

### 4.4 12-Ay Hedefleri

| # | İş | Çıktı |
|---|---|---|
| P-17 | **Institution acceptance program** — university recognition outreach (DET'in oyun kitabı) | 500+ üniversite kabul listesi |
| P-18 | **Government pilots** — Türkiye MEB, EU Erasmus+, UK Home Office (basic visitor visa) | 3 hükümet pilotu imzalandı |
| P-19 | **Open API marketplace** — partners kendi entegrasyonlarını kurabilir | webhook + REST + GraphQL, RapidAPI'ye listelendi |
| P-20 | **Enterprise tier — dedicated CSM** | Top 50 müşteri için adanmış başarı yöneticisi |
| P-21 | **Test center network — opt-in** — fiziksel merkezler partner olur (Pearson VUE modeli) | İlk 25 partner test merkezi, 5 ülke |
| P-22 | **Blockchain certificate verification** — Ethereum L2 (Polygon/Optimism) anchor + IPFS | Tek tıkla doğrulama, çevrimdışı QR |
| P-23 | **B2B sales playbook + outbound** — HubSpot CRM, BDR team, demo havuzu | ARR $1M → $5M hedefi |

### 4.5 24-Ay Hedefleri

- 2 000+ kurum (üniversite + işveren) tarafından kabul ediliyor
- 50+ ülke aktif (her ülkede min 100 test/ay)
- Government immigration pathway: 5+ ülke (Australia, Canada, NZ, UK, Ireland başlangıç hedefi)
- Reseller network: 100+ aktif partner, 30+ ülkede
- ARR: $20M+ (DET 2020'de $30M idi, biz daha uzun yol)
- Test center network: 200+ partner merkez (Pearson VUE küçük versiyon)

---

## 5. ROL DAĞILIMI & ORGANİZASYON

| Şu Anki Ekip | Eklenmesi Gereken (12 ay içinde) |
|---|---|
| 1 solo dev (sen) | + 2 backend (Go/TS), + 1 ML engineer, + 1 frontend, + 1 mobile, + 1 DevOps/SRE, + 1 psychometrician (PhD), + 1 designer, + 1 PM, + 2 BDR (sales), + 1 success manager |

**Kritik ilk işe alımlar (öncelik sırası):**
1. **Psychometrician (PhD)** — item bank kalitesi ve scoring valid'asyonu için olmazsa olmaz
2. **DevOps/SRE** — SOC 2, multi-region, 99.99% uptime için
3. **Frontend / Designer** — UX katmanı için
4. **ML engineer** — anti-cheat ve speech pipeline için

---

## 6. FİNANSAL BÜYÜKLÜK & FONLAMA

### 6.1 90 günlük yatırım

| Kalem | Tutar (USD) |
|---|---|
| AI API ücretleri (Claude/Gemini/OpenAI) — item generation + scoring | $15k |
| Native speaker recordings (12 ses × 1000 paragraph) | $10k |
| Cloud (3-region K8s, Postgres, Redis) | $5k/ay × 3 = $15k |
| Voice/ML services (Deepgram veya Whisper hosting) | $8k |
| SSO + Auth (Auth0 veya Clerk) | $3k |
| Monitoring (Datadog/Sentry) | $5k |
| **Toplam 90 gün** | **~$56k** |

### 6.2 12 ay toplam yatırım tahmini

| Alan | Tutar (USD) |
|---|---|
| İnsan kaynağı (yukarıdaki 10 işe alım × ortalama maaş) | $1.2M |
| Cloud + AI altyapısı | $250k |
| Item bank büyütme (production + recording + field testing) | $400k |
| SOC 2 + ISO 27001 sertifikasyon | $80k |
| Hukuk (multi-jurisdiction privacy, terms, IP) | $60k |
| Marketing (B2B outbound + paid acquisition) | $300k |
| Tutor marketplace ödemeleri (komisyon) | $100k |
| **Toplam 12 ay** | **~$2.4M** |

**Önerilen fonlama yolu:**
- **Şu an → 6 ay:** $1M-$1.5M Pre-Seed (angel + early-stage VC, valuation $8M-$12M)
- **6 ay → 18 ay:** $5M-$8M Seed (Series Seed, valuation $30M-$50M)
- **18 ay → 36 ay:** $15M-$25M Series A (valuation $80M-$150M)

Benchmark: DET 2019'da $13M Series A (Union Square Ventures); Reforge $60M Series B 2022'de.

---

## 7. KPI'LAR & BAŞARI METRİKLERİ

| Kategori | Metrik | Şu An | 6 Ay | 12 Ay | 24 Ay |
|---|---|---|---|---|---|
| **Test** | Aylık test sayısı | <1k | 10k | 100k | 1M |
| **Test** | NPS (test alanlar) | ? | 40 | 55 | 70 |
| **Test** | Tamamlama oranı | ? | 85% | 92% | 95% |
| **Tek.** | Uptime | 99.5% | 99.9% | 99.95% | 99.99% |
| **Tek.** | API p95 latency | ~600ms | 400ms | 200ms | 100ms |
| **Tek.** | Mobile DAU/MAU | 0 | 15% | 25% | 40% |
| **İçerik** | Item bank büyüklüğü | 2.5k | 25k | 50k | 150k |
| **İçerik** | Speaking IRR (κ) | ? | 0.75 | 0.85 | 0.90 |
| **İçerik** | DIF-flagged items | ? | <5% | <2% | <1% |
| **B2B** | Aktif kurum | <10 | 100 | 500 | 2000 |
| **B2B** | Üniversite kabul | <5 | 50 | 500 | 2000 |
| **Gelir** | ARR | <$100k | $500k | $5M | $20M |
| **Gelir** | Net revenue retention | ? | 100% | 115% | 130% |
| **UX** | Lighthouse score | ~80 | 90 | 95 | 98 |
| **UX** | A11y violations (axe-core) | ? | 0 critical | 0 critical+serious | WCAG 2.2 AAA |

---

## 8. RİSK MATRİSİ

| Risk | Olasılık | Etki | Mitigasyon |
|---|---|---|---|
| AI scoring güvensizliği — kurumlar reddediyor | Yüksek | Yüksek | Multi-rater AI + spot human review + IRR raporları + concordance studies |
| Cheating skandalı — viral negatif PR | Orta | Çok yüksek | Anti-cheat ML v2 + live proctor seçeneği + transparent incident reports |
| Single founder bottleneck | Çok yüksek | Çok yüksek | Acil ilk işe alım: senior backend + DevOps + PM |
| Cambridge/Pearson hukuki tehdit (item patentleri) | Düşük | Yüksek | IP attorney + clean room item generation + DET emsali (zaten kazandı) |
| EU DSA / AI Act compliance | Orta | Orta | Hukuk müşaviri + audit trail + transparency reports |
| GPU/AI maliyet artışı | Orta | Orta | Multi-vendor (Anthropic + Google + OpenAI), self-host fallback, prompt caching |
| Stable döviz dalgalanması (TRY revenue, USD costs) | Yüksek | Orta | Multi-currency pricing + USD-based primary contracts |

---

## 9. ÖNCELİKLENDİRİLMİŞ İLK 4 HAFTA (Yarın başla)

1. **Hafta 1**
   - [ ] Senior backend + DevOps job posts canlıya (Wellfound, AngelList Talent, LinkedIn)
   - [ ] Pre-seed pitch deck hazır (12 slide max)
   - [ ] Item bank generation script v2 (10k hedef için pipeline ölçek)
   - [ ] Sosyal SSO (Google + Microsoft) MVP

2. **Hafta 2**
   - [ ] Multi-region deploy POC (eu-west-1 + us-east-1)
   - [ ] OpenTelemetry kurulumu + Datadog/Grafana dashboards
   - [ ] Design system v2 — ilk 10 primitif komponent (Button, Input, Card, Modal, vd.)
   - [ ] developer.b4skills.com docs portal stub

3. **Hafta 3**
   - [ ] Native speaker voice talent contracts (Voices.com — 4 sanatçı)
   - [ ] SOC 2 readiness assessment (Vanta sign-up)
   - [ ] Anti-cheat ML v1 — face presence + tab-switch detection MVP
   - [ ] Score reporting API v1

4. **Hafta 4**
   - [ ] Mobil app Expo proje başlangıç
   - [ ] LinkedIn certificate share entegrasyonu
   - [ ] Pre-seed investor warm intro listesi (50+ angels/early-stage VCs)
   - [ ] İlk 100 outbound demo email (B2B universities + corporates)

---

## 10. NIHAİ NOT

Dünyada bu pazarın liderlerinin tamamı en az 50 yıllık (Cambridge, ETS) veya 10 yıllık devler (DET, Pearson). Hiçbiri bugünün AI ve adaptive tech yığınıyla yeniden inşa edilmedi. **b4skills'in zaman avantajı:**

- 18 ayda DET'in 2017'deki konumuna gelmek mümkün (DET 2019'da Bill Gates tarafından öne çıkarıldı).
- Cambridge'in 50 yıllık item bank'ı yok ama AI ile 24 ayda 150k+ kaliteli item üretmek mümkün.
- TOEFL/IELTS'in test merkezi ağı yok ama tamamen online proctoring + opsiyonel partner merkezleri ile pazara girilebilir.

**Tek kritik gerçek:** Solo dev olarak bu seviyeye çıkamazsın. **Yarın yapılacak tek şey:** ilk işe alımları başlatmak ve pre-seed turunu açmak. Geri kalan her şey bu iki kararın türevi.

---

*Plan revize tarihi: 2026-05-24 · Sonraki revizyon: 2026-08-24 (quarterly)*
