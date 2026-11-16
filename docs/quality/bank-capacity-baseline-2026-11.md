# Soru havuzu kapasite tabanı — Faz 0 (2026-11-14)

Havuz genişletme planının ilk fazı: hedefleri koda bağlamak ve bugünkü bankanın ne ölçebildiğini ölçmek. Yeni soru üretilmedi, veritabanına yazılmadı.

**Kanıt düzeyi:** Kapasite sayıları canlı veritabanından salt okunur alındı. Simülasyon sonuçları sentetik yanıtlarla, CEFR etiketinden türetilmiş (ampirik olmayan) parametreler üzerinde üretildi. Bu yüzden gerçek aday doğruluğunu değil bankanın *şeklini* (nerede kaç kullanılabilir madde olduğunu) gösterir.

## Eklenen araçlar

| Araç | Ne yapar |
|---|---|
| `src/lib/content-factory/bank-capacity.ts` | Ürün × beceri × CEFR kapasite kuralı (aşağıda) ve denetim fonksiyonu |
| `npm run verify:capacity` (`scripts/verify-bank-capacity.ts`) | Canlı banka ya da snapshot üzerinde kapasite denetimi; `--with-queue` PRETEST/REVIEW/DRAFT'ı canlıymış gibi sayar; `--json`; asgari altı hücre varsa çıkış kodu 1. Kalite turuna `capacity` adımı olarak eklendi |
| `scripts/jobs/bank-baseline-simulation.ts` | Profil başına, gerçek θ'nın CEFR bandına göre RMSE, CEFR doğruluğu, bölüm SEM hedefine ulaşma, gösterim. `--synthetic N` referans banka ile karşılaştırma |
| `scripts/jobs/backfill-context-fields.ts` + `context-backfill.ts` | `ageSuitability`/`genre`/`topic` için LLM'siz öneri listesi (yalnızca kuru çalıştırma; `--apply` yok) |

### Kapasite kuralı

- Aday başına talep `d`: gramer/kelime için bölüm `maxItems`; okuma/dinleme için `⌈maxItems / 2⌉` metin/kayıt (metin başına en çok 2 soru kuralı); yazma/konuşma için `maxItems` görev.
- Seviye başına asgari = `⌈d / maxExposureRate⌉`, hedef = asgari × 1,5.
- Gramer/kelimede çoktan seçmeli dışı pay hedefi %30.
- Seviye etiketi başına saymak temkinlidir (sınırdaki aday komşu seviyeden de soru alır). Bunlar gösterim kuralından türetilmiş planlama sayılarıdır.

## Sonuçlar

### 1. Kapasite (canlı banka, yalnızca ACTIVE)

226 hücrenin 154'ü asgarinin altında, 23'ü hedefin altında, 49'u tamam. Gramer/kelime hücrelerinin 70'inde çoktan seçmeli dışı soru yok (pay %0).

| Profil | Asgari altı | Hedef altı | Tamam |
|---|---|---|---|
| Primary (7-10) | 17 | 1 | 0 |
| Junior Suite (11-14) | 24 | 0 | 0 |
| Rapid Diagnostic | 6 | 5 | 19 |
| Express | 9 | 7 | 14 |
| General English | 12 | 4 | 14 |
| Academia | 15 | 1 | 0 |
| Corporate | 24 | 0 | 0 |
| Language Schools | 30 | 0 | 0 |
| Specialized | 17 | 5 | 2 |

Kuyruk (PRETEST/REVIEW/DRAFT) canlı sayılsaydı asgari altı hücre sayısı 154'ten 118'e iner. General English'te okuma B1–C1, dinleme B2–C1 ve konuşma A1–B1 kuyrukla tamamen kapanır. Junior, Corporate, Language Schools ve Academia'da kuyruk neredeyse hiçbir şey değiştirmez. Bu ürünlerin boşluğu ya gerçekten içerik eksiği ya da etiket politikasından kaynaklanıyor (bkz. karar 1).

Ayrıntı: `scripts/jobs/.out/bank-baseline/capacity-{active,with-queue}.{txt,json}`

### 2. Taban simülasyonu (400 aday/profil, θ profil aralığında düzgün dağılımlı)

Hiçbir profilde hiçbir beceri SEM eşiğine ulaşmıyor; bölümler madde bütçesi bitince duruyor. Aynı motorla iki sentetik referans bankayla karşılaştırma (hücre başına 40 ve 150 madde, %25'i boşluk doldurma, b ~ N(seviye merkezi, 0,45)):

| Profil | Gerçek banka: gramer/kelime SEM | Sentetik 40 | Sentetik 150 | Eşik |
|---|---|---|---|---|
| General English | 0,55 | 0,41 | 0,38–0,39 | 0,38 |
| Corporate | 0,56 | 0,42–0,43 | 0,38–0,39 | 0,35 |
| Junior | 0,57 | 0,40–0,41 | 0,36–0,37 | 0,36 |
| Language Schools | 0,55–0,58 | 0,41 | 0,36–0,37 | 0,36 |

| Profil | Gerçek: okuma / dinleme SEM | Sentetik 150 | Eşik |
|---|---|---|---|
| General English | 0,57 / 0,62 | 0,43 / 0,44 | 0,41 / 0,42 |
| Academia | 0,41 / 0,50 | 0,35 / 0,36 | 0,30 |
| Corporate | 0,58 / 0,59 | 0,40 / 0,40 | 0,37 |

Çıkarımlar:

- **Madde sayısı tek başına açıklamıyor.** General English kelime havuzunda seviye başına 79–139 madde var. Buna rağmen SEM 0,55; seviye başına yalnızca 40 sentetik madde 0,41 veriyor. Fark bilgi miktarından geliyor: gerçek maddelerin tamamı c=0,25 çoktan seçmeli ve b değerleri etiket merkezinde yığılı. Sentetik bankada %25 boşluk doldurma var (c=0) ve b dağılmış. Format çeşitlendirmesi (%30 çoktan seçmeli dışı) ve b yayılımı sayı artışından önce gelmeli.
- **Hedef eşiklere ancak seviye başına ~150 iyi dağılmış madde ile yaklaşılıyor.** Academia okuma/dinleme 150'de bile 0,35'te kalıyor (eşik 0,30).
- **Yazma/konuşma eşikleri banka büyüklüğünden bağımsız ulaşılamıyor.** Hücre başına 30 görevle bile SEM 0,51–0,55; eşikler 0,38–0,55. `profiles.ts` başlığındaki "görev başına I ≈ 11" varsayımı simülasyondaki GRM ile tutmuyor. Bu bir profil/puanlama modeli konusu, havuz konusu değil.
- **Gösterim tavanı hiçbir bankada tutmuyor.** En çok gösterilen madde: gerçek bankada 0,41–1,00, sentetik 150'de bile 0,38–0,59 (tavanlar 0,20–0,35). Banka büyütmek tek başına çözmüyor; gösterim kontrolü (α tabloları / Sympson-Hetter) simülasyonda bağlayıcı değil. Ayrı bir motor incelemesi gerekiyor.

Ayrıntı: `scripts/jobs/.out/bank-baseline/simulation*.{txt,json}`

### 3. Rapid Diagnostic'te SPRT hatası (havuzdan bağımsız, canlıyı etkiler)

Rapid Diagnostic'in dört reseptif bölümünün tamamı, her adayda ve her yetenek düzeyinde (C1 adaylar dahil) `SPRT_FAVOR_LOW_THETA` ile duruyor. Bölümler taban madde sayısında bitiyor.

Sebep `src/lib/assessment-engine/sequential-sprt.ts:128`: `waldLogThresholds` alt sınırı zaten negatif döndürüyor (`logB = ln(β/(1−α)) ≈ −2,94`). Karşılaştırma ise `logR <= -logB`, yani `logR ≤ +2,94` olarak yapılıyor. Bu neredeyse her durumda doğru olduğundan SPRT `minItems` sonrası ilk fırsatta duruyor. Doğrusu `logR <= logB`.

Profildeki "35 → 27 madde, RMSE 0,42 → 0,38" Faz 3 kanıtı bu davranışla üretildi.

**Düzeltildi (2026-11-14):** Karşılaştırma `logR <= logB` yapıldı ve sınırlar için regresyon testleri eklendi (`sequential-sprt.test.ts`). Düzeltmeden sonra yeniden ölçüldü (n=400; seed 20261030; sentetik banka ve DB snapshot'ı):

| Durum | Banka | RMSE | CEFR tam | Uzunluk | Dinleme maddesi / SEM |
|---|---|---|---|---|---|
| Eski (hatalı) | sentetik | 0,387 | 0,71 | 27 | — |
| Düzeltilmiş, sayılar aynı (12/12/7/6) | sentetik | 0,409 | 0,70 | 35 | 3 / 0,71 |
| Düzeltilmiş, kelime/gramer 9 (9/9/7/6) | sentetik | **0,359** | **0,74** | 34 | 6 / 0,57 |
| Eski (hatalı) | DB | 0,477 | 0,68 | 27 | — |
| Düzeltilmiş, sayılar aynı | DB | 0,457 | 0,66 | 35 | 3 / 0,82 |
| Düzeltilmiş, 9/9/7/6 | DB | **0,419** | **0,69** | 34 | 6 / 0,71 |

- Düzeltilmiş SPRT bu bölüm uzunluklarında bölümlerin %1'inden azında tetikleniyor. Wald sınırına ulaşmak için kesme yakınında 14 civarında tutarlı yanıt gerekiyor; bölümler en çok 12 madde.
- Sayılar değişmezse sınav 35 maddeye çıkıyor. Kelime ve gramer 12'şer madde alıyor ve genel tavan (35) yüzünden dinlemeye 3 madde kalıyor. Eski davranıştaki "iyileşme" erken durmanın kendisinden değil, bütçenin bölümlere daha dengeli dağılmasından geliyordu.
- **Uygulandı (2026-11-14, ürün sahibi onayıyla):** Kelime/gramer `maxItems` ve blueprint `maxCount` 12 → 9 (min 7 değişmedi). Uygulama sonrası simülasyon tablodaki 9/9/7/6 satırını birebir verdi: sentetik bankada RMSE 0,359, CEFR 0,74; DB'de 0,419 / 0,69; uzunluk 34; dinleme 6 madde.

### 4. Bağlam alanları (kuru çalıştırma)

ACTIVE+PRETEST 2.919 maddenin hepsinde `genre` ve `topic` boş, `ageSuitability` UNIVERSAL. Saklı sinyallerden öneri çıkarılabilenler:

- `ageSuitability`: 1.220 madde (242 YOUNG_LEARNER, 248 TEEN, 730 ADULT).
- `genre`: 841 madde (çoğu okuma).
- `topic`: 464 madde.

Örneklemde konu eşlemesinin yaklaşık 6'da 1'i tartışmalı (ör. "revival of craft skills in a digital…" → technology). Liste insan incelemesi için aday üretir, hüküm değildir.

Bu alanlar inceleme içerik özetine (`item-review-snapshot.ts`) dahil. Uzman onayları başladıktan sonra doldurulursa onaylar geçersizleşir; bu yüzden inceleme başlamadan uygulanmalı. Öneriler: `scripts/jobs/.out/context-backfill/proposals.jsonl`

## Plana etkisi

1. Faz 1'den önce iki karar gerekiyor:
   - **(a)** Ürün etiketli profiller yaşa uygun `general` maddeleri de çeksin mi?
   - **(b)** Boş hücrelerde uzman incelemesinden geçmiş maddeler kalibrasyon beklemeden etkinleştirilsin mi?
2. Gramer/kelime üretimi sayı değil format hedefli olmalı: çoktan seçmeli eklenmez; boşluk doldurma, kelime türetme, eşleştirme eklenir ve b'si seviye bandına yayılır.
3. Yazma/konuşma SEM eşikleri ile gösterim kontrolü havuz genişletmeyle çözülmez. İkisi ayrı psikometri işi olarak ele alınmalı (`profiles.ts` eşikleri ancak gerekçeyle ve onayla değişir).
4. SPRT hatası düzeltildi; Rapid Diagnostic kelime/gramer `maxItems` 12 → 9 uygulandı (§3).

## Yeniden üretmek

```bash
npm run verify:capacity -- --report-only
npx tsx scripts/export-bank-snapshot.ts --output scripts/jobs/.out/bank-baseline/bank-snapshot.json
npx tsx scripts/jobs/bank-baseline-simulation.ts --n 400
npx tsx scripts/jobs/bank-baseline-simulation.ts --n 300 --synthetic 150 --productive 30 --output scripts/jobs/.out/bank-baseline/simulation-synthetic-150.json
npx tsx scripts/jobs/backfill-context-fields.ts
```
