# Adaptif Motor Yol Haritası — Her Sınavda Doğru ve Güncel Çalışma

> **Tarih:** 2026-10-30
> **Kapsam:** `src/lib/assessment-engine/`, `src/lib/selection/`, `src/lib/psychometrics/`, `src/lib/jobs/scheduled-jobs.ts`, `src/lib/product-lines/profiles.ts`
> **Amaç:** Adaptif soru motorunun her oturumda ölçme açısından doğru, tekrarlanabilir ve denetlenebilir çalışması; arka plandaki kalibrasyon, maruz kalma ve kalite döngülerinin gerçekten beslenmesi.
> **İlişkili belgeler:** [validity-roadmap.md](validity-roadmap.md) (kanıt katmanları), [roadmap.md](roadmap.md) (üretim motoru), [WORLD_CLASS_EXECUTION_BASELINE_2026-09-27.md](WORLD_CLASS_EXECUTION_BASELINE_2026-09-27.md) (Gate B), [quality/assessment-quality-matrix.md](quality/assessment-quality-matrix.md)

Bu belge kod okunarak hazırlandı; her tespit dosya ve satır referansıyla verildi. "State of the art" burada şu anlama gelir: van der Linden (2005) shadow-test CAT, Davey–Parshall koşullu maruz kalma, Chang–Ying KL başlangıç seçimi, EAP + bilgilendirici prior, ortak 3PL/GRM olabilirlik, RT-IRT ile aberrant davranış tespiti, sürümlü madde parametreleri ve canlı sınavdan ayrılmış toplu kalibrasyon. Bu bileşenlerin çoğu kod tabanında **var**; sorun, bir kısmının sınav yolunda **olmaması** ve birkaç kritik yerde canlı sınavın kendi parametrelerini değiştirmesidir.

---

## 1. Bugün bir sınavda gerçekte ne çalışıyor

Üretim yolu `AssessmentService` (`server-engine.ts`) üzerinden geçer. Aşağıdaki tablo kodun fiilen çağırdığı zinciri gösterir; motor dosyasındaki ama çağrılmayan parçalar §2'de ayrıca listelenmiştir.

| Adım | Nerede | Bugünkü davranış |
|---|---|---|
| Başlatma | `server-engine.ts:347-370` | Son doğrulanmış oturumun θ'sı ±0,1 jitter ile; yeni adayda ±0,2 rastgele. Yalnızca ilk bölümü etkiler. |
| Bölüm akışı | `server-engine.ts:505-560` | Profil `sectionOrder`; bölüm, `skillSem ≤ semThreshold` **veya** bütçe dolunca biter. Beceri θ'sı her bölümde N(0,1)'den başlar (`adaptive-policy.ts:sectionAbility`). |
| Havuz sorgusu | `adaptive-policy.ts:adaptiveItemWhere` + `item-bank-cache.ts` | `status: ACTIVE, isPretest: false`, profil CEFR aralığı, kaynak etiketi; 5 dk TTL önbellek; adayın önceki oturumlarındaki maddeler hariç (400 sınır). |
| Ön filtreler | `server-engine.ts:648-737` | Warm-up (ilk N madde b ≤ θ+offset), oturum tohumlu karıştırma, son 3 maddenin içerik etiketinden kaçınma (yumuşak), MCQ art arda ise tür rotasyonu, pasaj başına üst sınır (`passage-cap.ts`). |
| Seçim | `selection/cat-selector.ts` | Sıralama kuralları → **greedy** shadow test (`psychometrics/shadow-test.ts`) → Davey–Parshall α kapısı (süreç içi `_dpStore`, 7 katman) → KL/MFI **ikili** anahtar (`kl-information.ts:selectMethod`) → bileşik skor α=0,50 I(θ), β=0,20 maruz kalma, γ=0,20 blueprint aciliyeti, δ=0,10 recency (**her zaman 0**) × IQS çarpanı → en iyi skorun %95'i içindeki ilk 5'ten rastgele. |
| Madde teslimi | `server-engine.ts:780-830` | `currentItemId` atomik claim; MCQ seçenekleri oturum+madde tohumuyla karıştırılır; anahtar istemciye gitmez; `Item.exposureCount` +1. |
| Yanıt işleme | `server-engine.ts:843-1060` + `engine.ts:processResponse` | Nesnel puanlama sunucuda; RT-IRT **kapalı** (`useRtIrt=false`); hızlı tahmin sezgiseli doğru yanıtı 0,3/0,5'e indirir; EAP [-4,4] ızgara adım 0,1; beceri-başına EAP; 6D MIRT **varsayılan açık** ama çapraz yüksüz; oturum kilidi altında yazılır. |
| Üretici beceriler | `scoring/scoring-queue.ts` → `refreshSessionScoring` | Yazma/konuşma asenkron puanlanır; puan gelene dek θ'dan hariç; sonra oturum yeniden kestirilir. GRM eşikleri sentetik (`rubricToGrmParams`). |
| Sonlandırma | `server-engine.ts:1089-1634` | Nihai EAP, CEFR eşlemesi, CI, MIRT-4D, G-DINA, person-fit, kopya ve kümelenme analizleri, sınıflama tutarlılığı; analiz hatası raporu engellemez; güvenlik bayrağı raporu "doğrulanmamış" yapar. |
| Arka plan | `jobs/scheduled-jobs.ts` | Süreç içi `setInterval`: DIF (7 g), emeklilik (7 g), drift (7 g), QWK (1 g), pretest kalibrasyonu (7 g), maruz kalma emekliliği (1 g), çeldirici taraması (7 g). Ayrıca **her yanıtta** `CalibrationService.recalibrateItem` (bkz. F3). |

Kanıt durumu (27 Eylül 2026 temel çizgisi): 2.096 ACTIVE madde, **0/2.096 ampirik kalibre**; 9 tamamlanmış oturum; 996 PRETEST madde, 90 pretest yanıtı, madde başına en çok 3. Yani ölçme modelinin tamamı CEFR tohumlu önsel parametrelerle çalışıyor.

---

## 2. Tespitler (önceliklendirilmiş)

### P0 — Doğruluğu doğrudan etkiler

**F1. Pretest maddeleri canlı havuza hiç girmiyor.** `adaptiveItemWhere` `isPretest: false` ve `status: 'ACTIVE'` koşulu koyar (`adaptive-policy.ts:25`); `server-engine.ts:652` kalan pretest'leri de eler. Pretest slot mantığı yalnızca `engine.ts:getNextItem` içindedir ve bu metot üretimde çağrılmaz. Sonuç: kalibrasyon kuyruğu beslenmez, hiçbir madde ampirik parametreye geçemez, "online kalibrasyon" döngüsü tasarımda var, pratikte yok.

**F2. İki paralel motor; üretim olmayanı test ediliyor.** `AssessmentEngine.getNextItem` ve `shouldStop` (`engine.ts:214, 371`) üretimde hiç çağrılmaz. SPRT, sınıflama güveni ≥0,90, I(θ)≥12, CEFR sınırına koşullu SEM, LP shadow test, 2B/6D MIRT seçimi, b-hedefli son seçim ve yumuşak KL/MFI sigmoidi (`selector.ts`) yalnızca bu yolda yaşar. Üretimdeki durdurma kuralı tek satırdır: bölüm SEM eşiği veya bütçe. `test/simulation/parameter-recovery.test.ts` ve `scripts/audit-adaptive-delivery.ts` farklı motorları çalıştırır. Admin `SystemConfig` bayrakları (`useShadowTest`, `sprt`, `mst.moduleSizes`, `classificationConfidenceThreshold`) etkisizdir; arayüz yanlış güven verir.

**F3. Her yanıtta canlı parametre yazımı.** `submitResponse` → `CalibrationService.recalibrateItem(itemId)` (`server-engine.ts:1042`, `calibration-service.ts:380-470`). 30+ yanıtı olan **operasyonel** maddenin a/b/c'si doğrudan `Item` satırına yazılır; gözlemler devam eden oturumların geçici θ'sıdır; SE saklanmaz; `CalibrationRun` yazılmaz; drift Class C'de madde otomatik `RETIRED` olur; `exposureCount` ikinci kez artar (ilk artış `server-engine.ts:781`). Bu, ölçeğin kaymasına açık bir geri besleme döngüsüdür ve kesme skorlarının anlamını bozar. Bugün veri azlığından tetiklenmiyor; trafik gelince kendiliğinden devreye girecek.

**F4. Hızlı tahmin cezası modele aykırı.** `engine.ts:84-104` doğru yanıtın skorunu 0,3/0,5'e indirip 3PL olabilirliğe `u=0,3` olarak sokar; bu dağılım tanımsızdır ve θ'yı sistematik aşağı çeker. Doğru araç zaten kodda: RT-IRT (`response-time-irt.ts`, `useRtIrt`) ile τ kestirimi ve aberrant bayrağı; şu an kapalı.

### P1 — Verimliliği ve savunulabilirliği etkiler

**F5. Üç ayrı maruz kalma deposu.** `ExposureStore` (5 katman, bellek/Redis), `_dpStore` (7 katman, süreç içi, Redis yok), `Item.exposureCount`. Paydalar farklı; çok instance'ta DP kapısı tutarsız; `CATSelector` recency ağırlığı sabit 0.

**F6. KL→MFI geçişi ikili.** Seçici `selectMethod` ile 5 madde / SEM 0,50 eşiğinde sert geçiş yapar; KL yalnızca ilk 3'e %20 bonus verir. Yumuşak sigmoid (`selector.ts:hybridAlpha`) üretimde değil.

**F7. 6D MIRT varsayılan açık ama bilgi katmıyor.** `uniToMirtParams` çapraz yük vermez; sonuç beceri-başına tek boyutlu EAP'ın pahalı tekrarıdır. 2B/4D yalnız raporda.

**F8. GRM parametreleri sentetik.** `rubricToGrmParams` b etrafında 4 logit genişlikte eşit aralıklı 10 eşik üretir; AI puanı 0–10'a yuvarlanıp tek kategoriye çöker; rubrik boyutları ölçme modeline girmez.

**F9. Kalibrasyon politikası üç yerde üç farklı.** `pretest-manager.ts` 30/50, `pretest-calibration-pipeline.ts` 80/150 (env ile), CLAUDE.md ≥200 & IQS≥65. `Item` satırında parametre SE'si ve sürümü yok; `CalibrationRun` var ama seçici onu okumaz.

**F10. Bölümler arası bilgi akmıyor.** Her bölüm θ=0, SD=1'den başlar; önceki oturum, diğer beceriler ve kurum dağılımı kullanılmaz (`priorMean/priorSd` global ve varsayılan 0/1). Beceriler arası korelasyon bilinen bir kaynak (collateral information) ve 2–3 madde tasarrufu sağlar.

**F11. Kesme skorları provizyonel ama rapor kesin konuşuyor.** `standard-setting-report.md` şablon; `classification-consistency.ts` eşikleri kesin kabul edip "yüksek riskli eşik karşılandı" üretir.

**F12. CAT'e özel gözlemlenebilirlik yok.** `observability/metrics.ts` HTTP ve AI puanlama ölçer; seçim süresi, havuz boyutu, fallback sayısı, durma nedeni, nihai SEM, maruz kalma maksimumu yok. k6 senaryosu var, CI'da değil.

### P2 — İyileştirme

**F13.** EAP ızgarası [-4,4]/0,1; θ ±6'ya clamp edilir ama ızgara ±4'te biter. Gauss–Hermite veya 0,05 adım ve [-5,5].
**F14.** Testlet bağımlılığı: pasaj başına üst sınır var, testlet modeli yok (bilgi %7–15 abartılı; bkz. bellek notu 2026-10-05).
**F15.** İşler süreç içi `setInterval`; çoklu instance'ta yinelenir; dış zamanlayıcı ve advisory lock yok.
**F16.** RL seçici deneysel, simülasyon ağırlıklı; kapalı kalmalı, kaldırılması değerlendirilmeli.
**F17.** Profil-düzeyi MST (`selection/mst-router.ts`) ile `SystemConfig.mst.moduleSizes` tabanlı MST (`engine.ts`) iki ayrı tasarımdır; ikincisi çağrılmaz.

---

## 3. Hedef zincir — her oturumda çalışması gerekenler

1. **Başlangıç önseli.** Prior = kurum × profil dağılımı ⊕ adayın önceki doğrulanmış θ'sı (shrinkage ile). Jitter yerine prior varyansı kullanılır. Bölüm başlarken diğer becerilerin kestirimi korelasyon matrisi üzerinden prior'a taşınır (F10).
2. **Havuz.** Tek sorgu; yayınlanmış **parametre sürümü** okunur; pretest slotları (%10, pozisyon tabanlı 4, 8, 12 …) havuza dahil; anchor maddeler blueprint'te zorunlu; adayın önceki maddeleri hariç.
3. **Seçim.** Tek seçici. LP shadow test (`shadow-test-solver.ts`) blueprint, CEFR yayılımı ve pasaj kısıtlarını birlikte çözer; KL→MFI sigmoid geçişi; Davey–Parshall koşullu maruz kalma **tek paylaşımlı depoda**; sıralama kuralları; en iyi %95 içinde kısıtlı rastgelelik.
4. **Yanıt işleme.** 3PL + GRM ortak olabilirlik (var); RT-IRT ortak model ile hız τ kestirimi ve aberrant bayrağı; bayrak yanıtı **değiştirmez**, person-fit ve raporu besler; çok hızlı doğru yanıt ceza değil "doğrulanmamış kanıt".
5. **Güncelleme.** EAP (GH quadrature), beceri-başına + ortak; MIRT yalnızca kalibre çapraz yüklerle.
6. **Durdurma.** Bölüm: SEM eşiği **veya** CEFR sınırına koşullu güven ≥0,90 **veya** bütçe; süre tavanı. SPRT yalnızca "kapanmış karar" durumunda ve profil izin verirse.
7. **Sonlandırma.** Nihai EAP, CI, karar tutarlılığı; kesme skorları standard setting tamamlanana dek raporda "provizyonel"; güvenlik bayrağı raporu doğrulanmamış yapar (var).
8. **Sınav sonrası (arka plan).** Yanıtlar kalibrasyon kuyruğuna; haftalık toplu MMLE/EM; sonuç yeni **parametre sürümü** olarak yayınlanır; drift sürümler arası ölçülür; DIF, maruz kalma, emeklilik raporları. **Canlı sınav sırasında hiçbir parametre değişmez.**

---

## 4. Fazlar

### Faz 0 — Kilitler (1–2 hafta)

Amaç: Trafik artınca kendiliğinden devreye girecek hatalı davranışları durdurmak.

> **Durum (2026-10-30):** Kod tarafı uygulandı — `useOnlineRecalibration` bayrağı (varsayılan kapalı), hızlı tahmin cezası yerine `rtFlag = RAPID_GUESS`, çift `exposureCount` artışı kaldırıldı, drift Class C → `REVIEW`, `cat_*` metrikleri ve `GET /metrics` eklendi, admin formuna "canlı sınav okumuyor" notu düştü. Üretimde parametre değişmediğini doğrulayan günlük denetim sorgusu henüz kurulmadı.

- F3: `recalibrateItem` çağrısını `submitResponse` yolundan kaldır; `useOnlineRecalibration` bayrağı arkasına al (varsayılan kapalı). Otomatik RETIRE'ı yalnız toplu işe bırak. `exposureCount` çift artışını kaldır.
- F4: Hızlı tahmin cezasını kaldır; yerine `Response.rtFlag` + person-fit RGI bayrağı (RT-IRT kapalıyken sabit eşikli basit bayrak).
- F2 (kısmi): `SystemConfig` arayüzünde etkisiz bayrakları gizle veya "etkisiz" etiketle; `system-config-zod.ts` üzerinde açıklama.
- F12: `cat_selection_duration_seconds`, `cat_pool_size`, `cat_pool_fallback_total{reason}`, `cat_stop_reason_total{profile,reason}`, `cat_final_sem{profile,skill}`, `cat_exposure_max{profile}` metrikleri.
- Kabul: `npm test` yeşil; bir günlük üretim denetiminde `Item.discrimination/difficulty/guessing` değişmedi (sorguyla); `/metrics`'te `cat_*` serileri var.

### Faz 1 — Tek seçim motoru ve sahici simülasyon (3–4 hafta)

- `CATSelector` tek seçim kaynağı olur. `engine.ts:getNextItem` kaldırılır ya da `CATSelector`'a devredilir; `shouldStop` bölüm akışına bağlanır (`server-engine.ts:529` civarı) ve profil başına etkin kurallar açıkça listelenir.
- Yumuşak KL/MFI sigmoid'i (`selector.ts:hybridAlpha`) seçiciye taşınır; ikili anahtar kaldırılır (F6).
- Greedy shadow test yerine LP çözücü (`shadow-test-solver.ts`), simülasyonla A/B kıyaslanarak (bilgi, blueprint ihlali, çalışma süresi).
- Recency gerçek veriden hesaplanır veya δ kaldırılır.
- **Simülasyon harness'i** `test/simulation/` altında üretim yolunu çalıştırır: gerçek banka anlık görüntüsü (anonim JSON), profil başına 500 simüle aday, çıktılar: bias, RMSE, SEM kalibrasyonu (RMSE/ortalama SEM ∈ [0,9; 1,2]), CEFR sınıflama doğruluğu, ortalama uzunluk, maruz kalma dağılımı (max ≤ `profile.maxExposureRate`), bölüm durma nedenleri. `scripts/audit-adaptive-delivery.ts` bu harness'in ince sarmalayıcısı olur.
- Kabul: Harness CI'da; her profil için eşikler `profiles.ts` başlığındaki türetimle tutarlı; p95 seçim süresi < 300 ms (k6, 50 VU).

### Faz 2 — Pretest ve kalibrasyon döngüsü (4–6 hafta)

- F1: Pretest maddeleri havuza girer: `adaptiveItemWhere` iki sorgu (operasyonel + pretest) veya `status IN (ACTIVE, PRETEST)`; slot politikası `engine.ts:getNextItem`'daki pozisyon mantığı `CATSelector`'a taşınır; pretest yanıtı θ'ya girmez (var), `pretest-selection.ts` en az maruz kalan |b−θ|≤1 seçimi korunur.
- `ItemParameterVersion` tablosu: `itemId, a, b, c, aSE, bSE, cSE, n, method, infit, outfit, publishedAt, publishedBy, supersedesId`. `Item.a/b/c` yalnız yayınlanmış sürümün önbelleğidir; seçici sürümü okur.
- Tek kalibrasyon politikası (`CALIBRATION_POLICY` sabiti, üç kaynak birleştirilir): kestirim için n ≥ 80; yayın/promosyon için n ≥ 200, bSE ≤ 0,25, infit/outfit 0,7–1,3, r_bis ≥ 0,30, IQS ≥ 65; aksi halde PRETEST'te kalır veya REVIEW.
- Toplu kalibrasyon işi ayrı süreç (`scripts/jobs/`), girdi: tamamlanmış ve doğrulanmış oturumlar; yöntem: `calibration-study/rasch-mmle.ts` + 3PL EM (`online-calibration.ts`); anchor maddeler ile CINEG bağlama (`equating-cineg.ts`); çıktı: taslak sürüm + drift raporu; yayın admin onayıyla.
- Drift (`item-parameter-drift.ts`) sürümler arasında çalışır; Class C → REVIEW, otomatik RETIRED yok.
- **Karar:** Kalibrasyon çalışması (7 form × ~40 madde, 11 anchor, ~700 kişi, B1–C2; `scripts/jobs/design-calibration-study.ts`) bu fazın ön koşuludur; pretest akışı tek başına ilk yılda 200 yanıt/madde üretmez. Bu karar hâlâ açık.
- Kabul: İlk yayınlanmış parametre sürümü; `verify:irt` kalibre yüzdesini sürüm tablosundan okur; Gate B eşiği (%80) hedef tarihiyle yazılır.

### Faz 3 — Durdurma ve karar kalitesi (3–4 hafta)

- Bölüm durdurma: `skillSem ≤ threshold` ∨ `P(CEFR seviyesi | veri) ≥ 0,90` ∨ bütçe; CEFR sınırına koşullu SEM kademeleri (0,16 / 0,12) kullanılır. SPRT yalnızca Rapid Diagnostic gibi sınıflama amaçlı profillerde ve `minItems` sonrası.
- Beceri bütçesi: SEM > 0,40 olan beceriye +1 esnekliği (`engine.ts:274` mantığı) bölüm akışına taşınır; üretici beceriler hariç.
- Rapor: kesme skorları standard setting bitene dek "provizyonel"; `classification-consistency` eşik belirsizliğini (`cut-score-bootstrap.ts`) karar tutarlılığına katar.
- Kabul: Simülasyonda sınır bandındaki (|θ−cut| < 0,25) adaylarda sınıflama doğruluğu raporlanır; ortalama uzunluk Faz 1'e göre artmaz.

### Faz 4 — Ölçme modeli derinliği (4–6 hafta)

- RT-IRT açık: τ kestirimi, `estimatedResponseTimeSec`'ten β; aberrant yanıt bayrak + opsiyonel hariç tutma (`useRtIrt` profil başına). Ceza yok.
- GRM: AI ve insan rubrik boyut puanları `Response.metadata.rubricScores`'tan polytomous gözlem olarak saklanır; eşikler çift puanlanmış yanıtlarla kalibre edilir; `rubricToGrmParams` yalnızca kalibre eşik yoksa yedek.
- MIRT: yalnızca kalibre çapraz yük varsa açılır; aksi halde `useMirt=false` varsayılanı (hesap ve risk azalır). 4D/2B raporu "keşif amaçlı" etiketi.
- Bilgilendirici prior: beceriler arası korelasyon matrisi (kalibrasyon verisinden) ile bölüm başlangıç prior'ı; kurum prior'ı `Organization` düzeyinde.
- Testlet: pasaj üst sınırı kalır; testlet varyansı tahmin edilip SEM'e şişirme faktörü olarak raporlanır; Rasch testlet modeli yalnızca veri yeterse.
- Kabul: Simülasyon ve gerçek veri üzerinde SEM kalibrasyonu korunur; aberrant bayrak oranı < %5 (sağlıklı kitle).

### Faz 5 — Sürekli operasyon

- Tek paylaşımlı maruz kalma deposu (Redis) ve DP α tabloları; süreç içi depolar yalnız test.
- İşler dış zamanlayıcıdan (`scripts/jobs/*`) ve Postgres advisory lock ile; `setInterval` kaldırılır.
- Haftalık "sınav sağlığı" raporu (`quality-tour.ts`'e ek): durma nedeni dağılımı, nihai SEM dağılımı, fallback sayısı, maruz kalma maksimumu, pretest yanıt birikimi, drift özetleri.
- Aylık simülasyon yeniden koşusu (banka değiştikçe); çeyreklik drift/DIF/eşdeğerleme raporu ve parametre sürümü yayını.

---

## 5. Kabul ölçütleri ve SLO'lar

| Ölçüt | Hedef | Kaynak |
|---|---|---|
| θ bias (simülasyon, profil başına) | \|bias\| < 0,05 | Faz 1 harness |
| SEM kalibrasyonu (RMSE / ortalama SEM) | 0,9–1,2 | Faz 1 harness |
| CEFR sınıflama doğruluğu (bant merkezleri) | ≥ 0,85; sınır bandı raporlanır | Faz 1/3 |
| Madde maruz kalma maksimumu | ≤ `profile.maxExposureRate` | `cat_exposure_max` |
| Seçim gecikmesi p95 | < 300 ms (50 VU) | k6 + `cat_selection_duration_seconds` |
| Havuz fallback oranı | < %0,5 | `cat_pool_fallback_total` |
| Canlı sınav sırasında parametre değişimi | 0 | Günlük denetim sorgusu |
| Pretest yanıt birikimi | ≥ 50 madde/ay n ≥ 80'e ulaşır | Faz 2 raporu |
| Ampirik kalibre ACTIVE madde | %80 (Gate B) | `verify:irt:production` |

---

## 6. Sıra ve bağımlılıklar

Faz 0 bağımsızdır ve hemen başlar. Faz 1 Faz 0'a dayanır; harness olmadan Faz 2–4'ün etkisi ölçülemez. Faz 2 pretest kısmı Faz 1'deki tek seçiciye bağlıdır; parametre sürümü tablosu bağımsız başlayabilir. Faz 3 ve Faz 4 Faz 1 harness'i ile doğrulanır ve birbirinden bağımsız yürüyebilir. Faz 5 sürekli olup Faz 0 metrikleriyle başlar.

Yapılmayacaklar: profil madde sayıları simülasyon kanıtı olmadan değiştirilmez; LLM tarama sonuçlarıyla toplu madde emekliliği yapılmaz; RL seçici üretime alınmaz; kesme skorları standard setting tamamlanmadan "doğrulanmış" olarak raporlanmaz.
