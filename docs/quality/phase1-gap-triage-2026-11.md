# Faz 1 — kapsam boşlukları triyajı (2026-11-14)

`verify:coverage` kuralına göre (hücre başına en az `sectionConfig.minItems` ACTIVE madde) 37 boşluk var. Bu belge her boşluğun neyle kapanacağını ayırır ve yalnızca gerçekten içerik gerektiren hücreler için taslak üretir.

**Kanıt düzeyi:** Sayılar canlı veritabanından salt okunur alındı (`scripts/jobs/phase1-gap-triage.ts`). Durum değişikliği ya da etkinleştirme yapılmadı. Yeni maddeler DRAFT olarak yazıldı; DRAFT adaylara sunulmaz.

## Triyaj

| Yol | Hücre | Anlamı |
|---|---|---|
| POLICY | 13 | Profil, ürün etiketi taşımayan "genel çekirdek" maddeleri kullanabilseydi boşluk kapanırdı (karar a) |
| QUEUE | 9 | Hücre için yazılmış PRETEST/REVIEW/DRAFT maddeler zaten var; inceleme ve etkinleştirme bekliyorlar |
| POLICY+QUEUE | 13 | İkisi birlikte gerekiyor |
| CONTENT | 2 | Junior Suite WRITING/B2 ve Corporate WRITING/A2: hiçbir kaynakta madde yok |

Primary (7-10) bu analizde genel çekirdeği kullanmıyor; yetişkin maddeler 7–10 yaş için yazılmadı. Primary'nin 4 boşluğu da kuyrukla kapanıyor.

Profil başına:

| Profil | POLICY | QUEUE | POLICY+QUEUE | CONTENT |
|---|---|---|---|---|
| Primary (7-10) | – | 4 | – | – |
| Junior Suite (11-14) | 2 | – | 4 | 1 |
| General English | – | 1 | – | – |
| Academia | 2 | 1 | 2 | – |
| Corporate | 3 | 1 | 3 | 1 |
| Language Schools | 4 | 2 | 4 | – |
| Specialized | 2 | – | – | – |

Ayrıntı (her hücrede madde kodlarıyla): `scripts/jobs/.out/phase1/gap-triage.json`

### Karar (a) için uyarılar

- **Junior B2:** Genel çekirdek bu hücreleri sayıca kapatıyor (ör. okuma B2'de 143 madde). Ancak bunların çoğu yetişkin akademik metin ("moral luck", "algorithmic bias in predictive policing"). Junior'a açılacaksa yaş uygunluğu ayrıca süzülmeli; `ageSuitability` alanı bunun için doldurulmalı (Faz 0 kuru çalıştırması).
- **Academia ve Specialized dinleme:** Bunlar genel havuzdaki B1/B2/C2 kayıtlarıyla kapanıyor; içerik açısından sorun beklenmez.
- Bu değişiklik `adaptive-policy.ts` filtresinde yapılır ve motorun havuzunu değiştirir. Önce simülasyon kanıtı gerekir.

### Karar (b) için gözlem

- QUEUE yolundaki 9 hücreden 5'i yazma/konuşma. Kuyruktaki yazma/konuşma maddelerinin bir kısmı PRETEST durumunda. Ancak motor ön test maddelerini yazma/konuşmada hiç sunmuyor (CLAUDE.md, "never in writing/speaking"). Bu maddeler hiç yanıt toplayamaz, yani kalibrasyonla ACTIVE olamaz.
- Yazma/konuşma için tek gerçekçi yol uzman incelemesi → pilot kabulü (`/api/content/pilot/promote`, dört onay türü ve iki farklı onaylayan). Okuma/dinleme/gramer/kelimede ise kalibrasyon yolu var ama yanıt hacmi yok (en çok 27 yanıt/madde).

## Üretilen taslaklar (CONTENT hücreleri)

`scripts/jobs/generate-phase1-content-gaps.ts`, kapılı üretici. Hepsi DRAFT / AI_DRAFT, ürün etiketi ve `content.productLine` taşıyor. Kuru çalıştırmadan sonra iki düzeltme yapıldı:

- **Madde imleri:** Yazma istemlerindeki markdown imleri (`*   `) bankanın kullandığı `- ` biçimine çevriliyor. Canlı yazma istemlerinin hiçbirinde `*` yok, 58'inde `-`/`•` var. Düzeltme `script-text.ts` → `normalizeSourceFields`'e eklendi; tüm üretimlere uygulanır.
- **Corporate A2 ikinci hücre:** Kuru çalıştırmada özel hayata kaydı (kursa kayıt isteği). İş yeri e-postası olarak `construct` alanıyla sabitlendi. `notes` alanı üretici istemine girmiyor, yalnızca metadata'ya yazılıyor.

| Hücre | Kodlar | Adet |
|---|---|---|
| Junior B2 yazma: kısa e-posta (40–60 sözcük) | WRI-B2-0030…0033 | 4 |
| Junior B2 yazma: değerlendirme yazısı (80–120) | WRI-B2-0034…0037 | 4 |
| Junior B2 yazma: deneme (200–270) | WRI-B2-0038…0041 | 4 |
| Corporate A2 yazma: kısa iş e-postası (40–60) | WRI-A2-0019…0023 | 5 |
| Corporate A2 yazma: nötr üslupta iş e-postası (80–120) | WRI-A2-0024…0028 | 5 |

### İlk okuma (bu oturum; uzman incelemesi yerine geçmez)

- **Reddedilmeli:** WRI-A2-0028. Üniversite grup projesi bağlamı; iş yeri değil, Corporate yapısına uymuyor.
- **Revizyon önerisi:**
  - WRI-A2-0020: Yazanın rolü belirsiz (topluluk merkezi çalışanı mı, katılımcı mı); iş bağlamı zayıf.
  - WRI-B2-0036: "Travel website" ile "suitability for leisure activities" bir arada; hedef okuyucu ve görev karışık.
  - WRI-B2-0034, 0035, 0037: Hem arkadaşa hem dergi/blog okuruna yazma; hedef okuyucu tek olmalı.
- **Not:** WRI-A2-0019'da tüm içerik noktaları istemde veriliyor; üretim talebi düşük. A2 kısa görev için kabul edilebilir.
- **Uygun görünenler:** WRI-A2-0021…0027 (0028 hariç), WRI-B2-0030…0033, WRI-B2-0038…0041.

İnceleme ve kabul sonrası iki CONTENT hücresi de `minItems` (2) eşiğini geçer. Kapasite hedefi her iki hücre için 11 görev; kabul edilecek 8–10 görevle Faz 2'de tamamlanır.

## Sonraki adımlar

1. Karar (a): ürün profillerinin genel çekirdeği kullanması (Primary hariç; Junior için yaş süzgeciyle). Onay gelirse önce simülasyon, sonra filtre değişikliği.
2. Karar (b): boş hücrelerde uzman incelemesinden geçen maddelerin kalibrasyon beklemeden etkinleştirilmesi.
3. QUEUE hücrelerindeki maddelerin (kodlar `gap-triage.json` içinde) inceleme kuyruğuna alınması: Primary okuma PRE_A1/A2, Primary yazma/konuşma A2, General English dinleme A1 (8 taslak), Language Schools yazma/konuşma A2.
4. Bu belgedeki 22 taslağın uzman incelemesi.
5. Bağlam alanlarının (`ageSuitability`/`genre`/`topic`) uygulanması (Faz 0 kuru çalıştırması), uzman onayları başlamadan.

## Karar (a) simülasyonu: genel çekirdek erişimi (2026-11-14)

**Uygulama:** `ProductLineProfile.generalCoreAccess` bayrağı eklendi; varsayılan kapalı, şu an hiçbir profilde açık değil. Açık olan profil, kendi kaynaklarının yanında ürün etiketi ve `productLine` taşımayan maddeleri de kullanır. 16 yaş altı adayı olan profillerde `ageSuitability = ADULT` maddeler dışarıda kalır. Prisma filtresi ile bellek içi kopyası (`sourceWhere` / `sourceAllows`) canlı veritabanında 208 havuzda karşılaştırıldı; bayrak açıkken de kapalıyken de fark yok.

**Simülasyon:** DB snapshot, 400 aday/profil, θ profil aralığında düzgün dağılımlı, Primary hariç. Seed 20261114 ve 777. Specialized için ikinci seed alınamadı (profil adı eşleşmedi).

| Profil | Gösterim tavanını aşan madde payı | RMSE (iki seed) | CEFR tam (iki seed) | Not |
|---|---|---|---|---|
| Language Schools | 0,36 → 0,12 | −0,010 / −0,024 | −0,02 / 0,00 | Dinleme SEM ve bant RMSE'leri her iki seed'de iyileşiyor |
| Corporate | 0,54 → 0,17 | +0,006 / −0,013 | +0,03 / −0,045 | Doğruluk nötr, gösterim belirgin iyi |
| Junior Suite | 0,42 → 0,19 | −0,009 / +0,003 | −0,01 / −0,02 | Doğruluk nötr; içerik yaş uygunluğu ayrı sorun |
| Academia | 0,36 → 0,30 | −0,023 / +0,021 | −0,04 / −0,04 | Dinleme SEM iki seed'de de kötüleşiyor (0,50 → 0,54); C2 bandı kötüleşiyor |
| Specialized | 0,12 → 0,06 | +0,008 | −0,04 | C1/C2 bantları kötüleşiyor (tek seed) |
| General English, Express, Rapid Diagnostic | değişmez | değişmez | değişmez | Kaynak filtresi yok; beklenen kontrol sonucu |

**Öneri:**
- **Language Schools ve Corporate için aç.** Gösterim aşımı üçte bire iniyor ve doğruluk düşmüyor; Language Schools'ta iyileşiyor. Triyajdaki POLICY hücrelerinin 7'si (Language Schools 4, Corporate 3) doğrudan kapanır.
- **Junior için `ageSuitability` uygulandıktan sonra aç.** Şu an bankada tüm maddeler UNIVERSAL, yani yaş süzgeci hiçbir şeyi ayıklamıyor; genel çekirdekteki yetişkin akademik metinler 11–14 yaşa gelir.
- **Academia ve Specialized için kapalı bırak.** Kanıt ölçmeyi kötüleştirdiğini gösteriyor. Bu ürünlerin boşlukları alan-özel içerikle kapanmalı (Faz 2).

Sınırlılık: Simülasyon CEFR etiketinden türetilmiş parametrelerle yapıldı, gerçek aday doğruluğunu değil havuzun yapısını ölçer. Seed'ler arası RMSE oynaması ±0,02 civarında.

Yeniden üretmek: `npx tsx scripts/jobs/bank-baseline-simulation.ts --n 400 [--general-core] [--seed 777] [--profile "Language Schools"]`

**Uygulandı (2026-11-14, ürün sahibi onayıyla):** `generalCoreAccess: true` Language Schools ve Corporate'te açıldı. Uygulama sonrası canlı veritabanı (salt okunur):

- `verify:coverage` boşlukları 37 → 30 oldu. Language Schools 10 → 6, Corporate 8 → 5; triyajda öngörülen 7 POLICY hücresi kapandı.
- `verify:capacity`: asgari altı hücre 154 → 142.
- `audit-adaptive-delivery`: Prisma filtresi ile bellek içi kopya arasında fark yok.

## Junior Suite: gençlere uygun taslaklar (2026-11-14)

Junior'ın B2 ve A1 boşlukları şu an yalnızca yetişkin genel çekirdekle kapanabiliyor. Bu yüzden `scripts/jobs/generate-phase1-junior-teen.ts` ile TEEN etiketli, `junior` ürünlü taslaklar üretildi. 42 madde istendi, 36'sı DRAFT olarak kaydedildi (kodlar: `scripts/jobs/.out/phase1/junior-teen-ids.json`).

| Hücre | Kaydedilen |
|---|---|
| B2 okuma: başlık eşleştirme | 0/3. Üç taslak da "Position-revealing headings" kapısında reddedildi (başlık metnin sırasını ele veriyordu) |
| B2 okuma: çıkarım (blog) | 1/4 (JSON ayrıştırma hatası) |
| B2 okuma: yazarın tutumu | 4/4 |
| B2 dinleme: ana fikir, konuşmacı tutumu, ayrıntı | 9/9 |
| B2 konuşma | 6/6 |
| B2 kelime: eşdizimlilik, sözcük türetme | 8/8 |
| A1 dinleme | 8/8 |

Dinleme taslaklarında ses yok; `ttsScript` var, ses ayrı bir adımda üretilir.

### İlk okuma (uzman incelemesi yerine geçmez)

- **Yaş bağlamı kayıyor:** 11 taslakta üniversite, yüksek lisans öğrencisi veya profesör geçiyor. Örnekler: LIS-B2-0084, LIS-B2-0097, LIS-B2-0100, REA-B2-0216, SPE-B2-0081, LIS-A1-0115. `ageRange: [11, 14]` ve TEEN etiketi üretici istemine giriyor ama model yine yetişkin bağlama kayıyor. Bunlar Junior için reddedilmeli ya da yeniden yazılmalı.
- **Metinsiz çözülebilirlik:** 36 taslağın 19'u `TEXTDEP-SOLVABLE-BLIND` bayrağı taşıyor; LLM çözücü metni görmeden anahtarı buluyor. B2 okuma/dinleme çoktan seçmelide anahtar yine en uzun ve en nüanslı şık ("despite …", "both … and …"). Faz 0'daki banka bulgusunun aynısı. Eşleştirme formatı bu yüzden tercih edildi, ama o hücre kapıdan geçemedi.
- **İki savunulabilir anahtar:** LIS-A1-0117 ("end of the school week" ile "needs to begin soon" ikisi de doğru) ve LIS-A1-0121'de ilk buluşma tarihi ile her hafta buluşma karışık.
- **Bağlam tekdüzeliği:** 15 taslak "community centre"da geçiyor ve isimler hep aynı dört kişi (Amara, Kenji, Sofia, Ravi). Bir adayın aynı oturumda bunları üst üste görmesi muhtemel. `DIVERSE_NAMES` listesi var ama hücre başına rotasyon dar.
- **Uygun görünenler:** B2 sözcük türetme (VOC-B2-0107, 0109, 0110; 0108'de doğal yanıt "connectivity" olurdu), konuşma görevlerinin çoğu (SPE-B2-0083, 0084, 0085), LIS-A1-0118, 0119, 0120.

Sonuç: Bu üretim Junior'ın boşluğunu sayıca kapatabilir, ancak kabul oranı düşük olacak. Gerçekçi beklenti, 36 taslağın yarısının kabul edilmesi. Üreticide iki iyileştirme Junior için kalıcı çözüm olur, ikisi de Faz 2 işi:
- Yaş bağlamını istem dışında bir kapıyla denetlemek (üniversite/iş yeri sözcükleri TEEN hücrede reddedilsin).
- Ortam ve isim rotasyonunu genişletmek.

## İnceleme paketi

`scripts/jobs/.out/review-packet.html` artık üç Faz 1 kümesini de içeriyor:
- İçerik boşluğu yazma görevleri (22)
- Junior taslakları (36)
- Boşluk hücrelerini kapatacak kuyruk maddeleri (hücre başına açığın iki katı, kendi ürün maddeleri önce)

Paket toplam 536 madde içeriyor. `phase1-gap-triage.ts` kuyruk seçimini `scripts/jobs/.out/phase1/queue-ids.json` olarak yazıyor. Yeni taslaklarla birlikte triyaj: 30 boşluk; 21'i kuyrukla, 6'sı politika ile, 3'ü ikisiyle kapanır; yalnızca yeni içerik gerektiren hücre kalmadı.

## Karar (b): boş hücrelerde kalibrasyonsuz etkinleştirme (2026-11-14)

Karar: Uzman incelemesinden geçen bir madde, minimumun altındaki bir ürün × beceri × CEFR hücresini dolduruyorsa kalibrasyonu beklemeden ACTIVE olabilir.

Nasıl uygulandı (`src/lib/content-factory/pilot-promotion.ts`):
- **Seçenek:** `POST /api/content/pilot/promote?gapCells=true`. Önce `&dryRun=true` ile hangi maddenin ACTIVE, hangisinin PRETEST olacağı görülür. Seçenek verilmezse davranış eskisi gibidir: her madde PRETEST olur.
- **Önceki kapı değişmedi:** Madde yine 4 inceleme türünden onay almış, 2 bağımsız onaycıdan geçmiş olmalı; içerik hash'i güncel olmalı ve BLOCKER kanıt bulgusu olmamalı (`pilotAdmissionReasons`).
- **Hücrenin açığı kadar:** `planGapCellActivation` canlı havuz kuralını (`isAdaptiveEligible`) kullanır ve her hücreye yalnızca `minItems` açığı kadar madde ekler. Sıralama IQS'e göre, ardından id'ye göredir. Bir madde birden fazla hücreyi doldurabilir. Fazla madde PRETEST'e gider ve normal kalibrasyon yolunu izler.
- **İşaretleme:** Etkinleşen madde `status ACTIVE`, `pipelineStage LIVE` olur. `metadata.provisionalActivation` alanına şunlar yazılır: politika sürümü, `paramsSource: CEFR_PRIOR`, `calibrationPending: true`, doldurduğu hücreler, kimin ve ne zaman etkinleştirdiği.
- **Kalibrasyon kuralları gevşetilmedi:** `CALIBRATION_POLICY` aynı kaldı. Madde ACTIVE olduğu için yanıt toplamaya devam eder. Kalibrasyon taraması n ≥ 200'de gerçek parametreyi taslak sürüm olarak yazar, yayın kapıları da aynıdır.

Sınırlar:
- Bu maddelerin puana katkısı CEFR'den türetilmiş öncül parametrelere dayanır. O hücrelerde ölçüm hatası, simülasyonun gösterdiğinden büyük olabilir. Sertifika ve raporlarda "provisional" dili zaten var.
- Yazma ve konuşma maddeleri PRETEST olarak sunulmadığı için hücre açığını aşan kısmı PRETEST'te bekler. Açık bir hücrede yeniden ortaya çıkarsa sonraki koşuda etkinleşebilir. Şu an PRETEST'teki maddeler için ayrı bir yol yok, çünkü gapCells yalnızca APPROVED_FOR_PILOT aşamasındakilere bakar.
- Canlı veritabanında deneme koşusu (2026-11-14) 0 aday verdi. Henüz APPROVED_FOR_PILOT aşamasında madde yok, yani uzman incelemesi bu yolun ön koşulu olarak duruyor.

## Bağlam alanları uygulandı (2026-11-14)

Faz 0'da önerilen yaş, tür ve konu alanları veritabanına yazıldı (`npx tsx scripts/jobs/backfill-context-fields.ts --apply`). Kapsam ACTIVE, PRETEST, REVIEW ve DRAFT maddeleri; inceleme paketindeki taslaklar da onaya gideceği için dahil edildi.

- **Ne yazıldı:** 2.000 maddede 1.386 yaş, 855 tür ve 518 konu alanı. Yaş değerleri maddenin ürün etiketinden geliyor: academia/corporate/specialized → ADULT, junior → TEEN, primary → YOUNG_LEARNER.
- **Yalnızca boş alanlar:** Her parça satır kilidiyle yeniden okundu ve sadece hâlâ boş olan alanlar dolduruldu. Okuma ile yazma arasında değişen madde olmadı.
- **Sürüm değişmedi:** `version` artırılmadı, çünkü içerik aynı. Her maddede `metadata.contextBackfill` neyin, neden yazıldığını tutuyor.
- **Geri alınabilir:** `scripts/jobs/.out/context-backfill/applied-*.jsonl` her yazımı önceki değeriyle kaydediyor.
- **Onaylara etkisi yok:** Veritabanında hiç inceleme kaydı yoktu, dolayısıyla içerik hash'i değişse de geçersiz kalan bir onay olmadı. Bundan sonraki onaylar bu alanlarla birlikte hash'leniyor.
- **Canlı havuzlara etkisi yok:** Yaş alanını yalnızca 16 yaş altı profillerin genel çekirdek erişimi okuyor ve bu erişim hiçbirinde açık değil. Boşluk triyajı yazmadan önce ve sonra hücre hücre aynı: 30 boşluk.
- İnceleme paketi yenilendi (538 madde).

Bundan sonra Junior için `generalCoreAccess` teknik olarak açılabilir: ADULT işaretli maddeler 11-14 yaş havuzuna girmez. Yine de önce simülasyonla etkisi ölçülmeli.

## Junior genel çekirdek simülasyonu, yaş alanlarıyla (2026-11-14)

Ön düzeltme: Simülasyon aracı `ageSuitability` alanını taşımıyordu. Bu yüzden 11-14 yaş için ADULT süzgeci simülasyonda hiç çalışmıyordu. Alan artık banka anlık görüntüsüne (`scripts/export-bank-snapshot.ts`) ve simülasyonun havuz kuralına (`eligibleBankItems` / `eligiblePretestItems`) giriyor.

Kurulum: Yeni anlık görüntü (2.919 madde), n = 400, θ profil aralığında düzgün dağılımlı, iki tohum.

| Ölçüt | Kendi havuzu (tohum 1 / 2) | + genel çekirdek (tohum 1 / 2) |
|---|---|---|
| RMSE | 0,446 / 0,460 | 0,437 / 0,456 |
| CEFR tam doğruluk | 0,730 / 0,705 | 0,718 / 0,703 |
| B2 tam doğruluk | 0,692 / 0,677 | 0,637 / 0,613 |
| Tavan üstü maruziyet payı | 0,42 / 0,41 | 0,19 / 0,19 |
| En yüksek maruziyet | 0,95 / 0,96 | 0,64 / 0,68 |
| Dinleme havuzu (kullanılan/uygun) | 24 / 24 | 74 / 77 |
| Dilbilgisi havuzu | 62 / 74 | 101 / 257 |
| Sözcük havuzu | 63 / 77 | 70 / 102 |
| Okuma havuzu | 34 / 34 | 34 / 34 |

Kesinlik açısından genel çekirdek nötr:
- RMSE 0,005–0,009 iyileşiyor, CEFR doğruluğu biraz düşüyor.
- B2 doğruluğu iki tohumda da 0,05–0,06 düşüyor. Bandın n'i yaklaşık 90 olduğu için gürültü payı bu büyüklükte; ancak iki tohumda da aynı yönde çıktı.
- Asıl kazanç maruziyette: tavan üstü pay yarıdan fazla düşüyor. En büyük kazanç, tek bir öğenin adayların %95'ine gösterildiği dinlemede.

**Yaş süzgeci şu an hiçbir şey ayıklamıyor.** A1–B2'deki 261 genel çekirdek maddenin hepsi UNIVERSAL: 183 dilbilgisi, 25 sözcük, 53 dinleme. Bağlam alanı uygulaması yaşı ürün etiketinden türetti, ama genel çekirdek tanım gereği ürün etiketi taşımıyor. Kaba bir anahtar sözcük taraması (office, loan, employer, degree, meeting…) şunları yakaladı:
- 53 dinleme maddesinin 24'ü (ör. LST-A2-0013, LST-A2-0038 "loan")
- 183 dilbilgisi maddesinin 18'i
- 25 sözcük maddesinin 2'si

Tarama kaba; "post office" gibi zararsız eşleşmeler de var. Yine de dinlemedeki oran yüksek, ve Junior'ın kazancı da en çok dinlemeden geliyor.

Öneri: Junior için `generalCoreAccess` şimdilik kapalı kalsın. Açmanın ön koşulu, 261 çekirdek maddenin yaş açısından insan gözüyle işaretlenmesi (TEEN/UNIVERSAL ya da ADULT); 53 dinleme maddesiyle başlanmalı. ADULT işaretlenenler süzgeçle zaten dışarıda kalır. İşaretlemeden sonra bu simülasyon aynı komutla tekrarlanmalı:

```
npx tsx scripts/export-bank-snapshot.ts --output scripts/jobs/.out/bank-baseline/bank-snapshot-age.json
npx tsx scripts/jobs/bank-baseline-simulation.ts --bank scripts/jobs/.out/bank-baseline/bank-snapshot-age.json --profile "Junior Suite (11-14)" --general-core
```

### Genel çekirdek yaş inceleme paketi (2026-11-14)

`npx tsx scripts/jobs/export-core-age-review.ts` komutu `scripts/jobs/.out/core-age-review/packet.html` paketini yazıyor. Yalnızca okuma yapar.

Kapsam: Junior'a genel çekirdek açılırsa 11-14 yaş adaylarının görebileceği, yaş etiketi olmayan 906 madde.

| Bölüm | Madde | Beceriler | Anahtar sözcük eşleşmesi |
|---|---|---|---|
| 1 · Operasyonel (puanlanan) | 261 | dinleme 53, dilbilgisi 183, sözcük 25 | 35 |
| 2 · Ön test (puanlanmaz, ama adaya gösterilir) | 645 | okuma 346, dilbilgisi 161, konuşma 121, dinleme 13, sözcük 4 | 206 |

İkinci bölüm şu nedenle gerekli: `generalCoreAccess` ön test havuzunu da genişletiyor. Okumadaki 346 ön test maddesinin çoğu yetişkin akademik metin.

Kullanım:
- **İşaretleme:** İnceleyen kişi her maddeyi "Suitable for 11-14" (UNIVERSAL kalır) ya da "Adult only" (ADULT) olarak işaretler.
- **Sıralama:** Eşleşmeli maddeler her bölümde önce gelir ve açık gösterilir; vurgulanan sözcük yalnızca ipucudur.
- **Kayıt:** Seçimler tarayıcıda saklanır. "Download decisions" ile `core-age-decisions.json` indirilir; inceleyenin adı zorunludur.
- **İçe aktarma:** `npx tsx scripts/jobs/apply-core-age-review.ts core-age-decisions.json` önce deneme koşusu yapar, `--apply` ile yazar.
  - ADULT kararı `ageSuitability` alanını değiştirir; iki karar türü de `metadata.ageReview` alanına kaydedilir.
  - Yalnızca hâlâ genel çekirdekte ve UNIVERSAL olan maddeler değişir.
  - Her yazım önceki değeriyle birlikte `applied-*.jsonl` dosyasına kaydedilir.

İnceleme tamamlanınca Junior simülasyonu yukarıdaki komutla tekrarlanır ve ardından `generalCoreAccess` kararı verilir. İnceleme yalnızca 1. bölümle sınırlı kalırsa, Junior açılmadan önce ön test havuzu için ayrı bir karar gerekir (ör. Junior'da genel çekirdek ön testini kapatmak).
