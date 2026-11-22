# Yazma ve konuşma sorularının ACTIVE'e geçiş yolu (22 Kasım 2026)

## Sorun

Ön deneme havuzunda (PRETEST ya da ACTIVE + `isPretest`) bekleyen yazma ve konuşma soruları hiçbir sınavda sunulmuyor:

- Ön deneme yuvaları yazma ve konuşmayı kapsamaz (`section-flow.ts`, `PRETEST_EXCLUDED_SKILLS`).
- Canlı havuz yalnızca ön deneme işareti olmayan ACTIVE soruları alır (`adaptive-policy.ts`).

Bu sorular yanıt toplamaz, kalibrasyon taramasına giremez ve kalibrasyon yoluyla ACTIVE'e geçemez. 22 Kasım 2026'da bu durumda 301 soru vardı: 240 konuşma, 61 yazma. Bunların 228'i PRETEST, 73'ü ACTIVE + `isPretest`.

Aynı tarihte canlı havuzda ön deneme işareti olmayan 391 yazma ve konuşma sorusu var (191 yazma, 200 konuşma). Bunların hiçbirinin insan inceleme kaydı yok ve hepsi CEFR'den türetilmiş ön parametrelerle (prior) çalışıyor.

## Mevcut yoldaki iki eksik

Editoryal yol zaten vardı: Content Factory inceleme kuyruğu ve ardından pilot yükseltme (`POST /api/content/pilot/promote`, `pilot-promotion.ts`). Ancak bekleyen sorular bu yolu iki noktada tamamlayamıyordu:

1. **Kabul kapısı.** Pilot kabulü yalnızca DRAFT ve REVIEW durumundaki soruları kabul ediyordu. PRETEST ya da ACTIVE + `isPretest` durumundaki bir soru dört onayı da alsa `STATUS_NOT_ELIGIBLE` ile duruyordu.
2. **Hedef durum.** Kabul edilen bir yazma ya da konuşma sorusu, eksik hücre doldurmuyorsa yine PRETEST'e gönderiliyordu, yani tekrar çıkmaza.

## Yeni kural (RUBRIC_ACTIVATION_POLICY 1.0)

- **Kabul kapısı aynı.** Dört güncel onay gerekir: dil, CEFR, adillik ve moderasyon. Onaylar en az iki farklı inceleyiciden gelmeli ve sorunun mevcut sürümüne ve içerik hash'ine bağlı olmalı. İtiraz bulunmamalı, kanıt denetiminde engelleyici bulgu olmamalı.
- **Durum istisnası.** Ön deneme havuzunda bekleyen yazma ve konuşma soruları da kabul edilebilir. Dilbilgisi, kelime, okuma ve dinleme için bu istisna yoktur.
- **Hedef.** Kabul edilen her yazma ve konuşma sorusu ACTIVE olur:
  - `isPretest: false`, `pipelineStage: LIVE`;
  - parametreler CEFR'den türetilmiş ön değerler olarak kalır;
  - `metadata.provisionalActivation` kaydı tutulur: `{ policyVersion: '1.0', paramsSource: 'CEFR_PRIOR', calibrationPending: true, reason: 'NO_PRETEST_SLOT', previousStatus }`.
- **Diğer beceriler değişmedi.** Kabul edilen diğer sorular eskisi gibi PRETEST'e gider. `gapCells` seçeneği yalnızca bu sorular için eksik hücre doldurma kararını verir.

Bu kural eksik hücre kuralının (GAP_CELL_ACTIVATION_POLICY, 14 Kasım 2026) genellemesidir. Yazma ve konuşmada PRETEST hiçbir zaman sunulmadığı için hücre doluluğuna bakmanın bir anlamı yoktur.

## Psikometrik not

Bu yolla ACTIVE olan sorular ampirik olarak kalibre edilmemiştir; puanlamaya CEFR ön parametreleriyle girerler. Bu, canlı havuzdaki 391 yazma ve konuşma sorusunun bugünkü durumuyla aynıdır.

Fark editoryal güvencededir: bu sorular canlıya iki inceleyicinin dört onayıyla girer. Puanlar ölçütle (rubric) ve yapay zekâ topluluğuyla verilir; güveni düşük yanıtlar insan puanlayıcı kuyruğuna düşer. Kalibrasyon taraması yeterli yanıt biriktiğinde gerçek tahminleri mevcut `CALIBRATION_POLICY` eşikleriyle yayımlar.

## İş akışı

1. Kuyruğu görün:
   ```bash
   npm run report:rubric-queue -- --out reports/rubric-queue.md
   ```
   Rapor her soru için eksik onayları ve önce düzeltilmesi gereken içerik sorunlarını listeler. 22 Kasım'da 301 sorunun hiçbirinde içerik engeli yoktu. 278'i `AI_DRAFT`, 23'ü `EDITING` aşamasındaydı.
2. İnceleme: admin panelinde Content Factory → Review Queue. AI Drafts sekmesinden başlanır: dil → CEFR → adillik → moderasyon. Her aşama ilgili rol tarafından onaylanır ve en az iki farklı kişi gerekir.
3. Önizleme: `POST /api/content/pilot/promote?dryRun=true`. Yazma ve konuşma adayları `target: ACTIVE`, `rubricActivation: true` ile görünür.
4. Yükseltme: aynı uç nokta `dryRun` olmadan çağrılır. Bu işlem SUPER_ADMIN ya da ASSESSMENT_DIRECTOR rolü gerektirir.

## Öncelik önerisi

- **Önce Primary (7–10) konuşma soruları.** Yaş incelemesinden geçen ve yeniden yazılan PRE_A1 soruları burada.
- **Sonra canlı havuzda eksik kalan hücreler.** Bunlar `npm run verify:coverage` ile görülebilir.
- **En son C1 ve C2.** Konuşma C1 ve yazma C1'de birikmiş çok sayıda soru var.
- **`SPK-C2-0009` ve `WRT-C2-0010`.** Bu ikisi `language-schools` etiketliydi, ancak o ürün C2'yi kapsamıyor. 22 Kasım kararıyla Academia'ya taşınıyorlar: `scripts/jobs/apply-c2-academia-retag.ts` (`--apply` ile yazar). Script yalnızca etiketi ve `content.productLine` alanını değiştirir; durum ve aşama aynı kalır, sorular yine dört onay bekler. İnceleyiciler için iki not `metadata.retag.reviewNote` alanına yazılır:
  - `SPK-C2-0009` adaydan "sınav görevlisiyle tartışmasını" istiyor. Oysa konuşma, karşısında biri olmadan kaydedilen bir monolog. Onaydan önce monolog olarak yeniden yazılmalı.
  - `WRT-C2-0010` yaratıcı mektup öyküsü istiyor (280–380 kelime). Bu, Academia'nın akademik yazma görevlerinin (uzun yanıt, 220–280 kelime) dışında. Onaydan önce yapının Academia'ya uyduğu doğrulanmalı ya da görev akademik hâle getirilmeli.

  Bu iki sorun `scripts/jobs/apply-c2-academia-rewrite.ts` ile giderildi. Script etiket değişikliğinden sonra çalıştırılır:
  - `SPK-C2-0009` aynı önerme üzerine tek kişilik bir konuşmaya (monolog) çevrildi: 90 saniye hazırlık, 210 saniye konuşma.
  - `WRT-C2-0010` akademik bir tartışma yazısına çevrildi: hakem değerlendirmesinin (peer review) uyumu ödüllendirdiği iddiası, 280–380 kelime. Bu uzunluk Academia'daki diğer C2 yazılarıyla aynı aralıkta. Yeni bir örnek cevap eklendi.

  Eski içerik `metadata.revision.previousContent` alanında saklanır. Sorular yine dört inceleme onayı bekler.

  Aynı sorun başka sorularda da var. 22 Kasım'da 490 konuşma sorusundan 75'inin metni karşıda bir görevli ya da partner varsayıyordu ("examiner", "discuss with" gibi); bunların 46'sı canlıdaydı.
