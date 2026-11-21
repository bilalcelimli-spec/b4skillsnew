# Academia dinleme taslakları — dalga 01 (2026-11-21)

Durum: **DRAFT**. Hiçbir soru ACTIVE ya da PRETEST değil, ses yok, IRT parametresi yayımlanmadı.

## Neden

Academia (B1–C2, 16+) dinleme havuzunda 2026-11-21 itibarıyla 19 uygun aktif soru vardı (B1: 0, B2: 1, C1: 14, C2: 4; 12 kayıt). Bölüm aday başına 10–16 soru sorduğu için gösterim oranı 1.00'di. Banka kopyasıyla yapılan simülasyon, düzey başına 20 yeni soruyla dinleme RMSE'sinin 0.61'den 0.54'e, en yüksek gösterim oranının 0.50'ye indiğini gösterdi.

## Ne üretildi

| Düzey | Kayıt | Soru | Ortalama sözcük | Tür |
|---|---|---|---|---|
| B1 | 10 | 20 | 163 | duyuru, danışman görüşmesi, ders, kısa konuşma, öğrenci tartışması |
| B2 | 10 | 20 | 220 | ders, danışman görüşmesi, seminer tartışması, duyuru, sunum |
| C1 | 10 | 20 | 269 | ders, tez danışmanlığı, akademik tartışma, sunum + soru |
| C2 | 10 | 20 | 287 | ders, akademik tartışma, danışman görüşmesi |
| Toplam | 40 | 80 | | |

- Madde kodları: `ACA-LIS-<düzey>-W01-<01..10><A|B>`. Etiketler: `academia`, `academia-listening-wave-01`. `content.productLine = "ACADEMIA"`.
- Bir kaydın iki sorusu birebir aynı `ttsScript` metnini taşır (`passageKey` ikisini tek set sayar). `content.passage` yoktur; `transcript`, editoryal karşılaştırma için `ttsScript` ile aynıdır ve adaya gönderilmez.
- İki soru farklı alt becerileri ölçer. Bilişsel talep düzeye göre sınırlıdır (`generation-guidelines.ts`): C1/C2'de yalnızca çıkarım, tutum, sentez.
- Hepsi dört şıklı çoktan seçmeli; anahtar konumu her düzeyde dengeli. Başlangıç parametreleri CEFR tohumudur (`paramSource: "prior"`), ampirik değildir.

## Nasıl üretildi

Kapılı üretici (`batch-generator.ts`) kayıt başına tek soru yazdığı için iki sorulu set üretemiyor. Bu yüzden içerik elle yazıldı (`scripts/content/academia-listening-*.ts`) ve `scripts/seed-academia-listening-drafts.ts` ile doğrulandı. Betik varsayılan olarak yalnızca doğrular; `--apply` yalnızca DRAFT ekler ve var olan kodun üzerine yazmaz.

Betiğin her soru için denetledikleri: yapı (`validateItemStructure`), anahtarın karıştırma sonrası üretim puanlamasıyla uyumu, set anahtarının iki soruda aynı ve kayıtlar arasında farklı olması, konuşmacı etiketleri, soruda adı geçen kişinin kayıtta sesli söylenmesi, alt beceri ve talep düzeyi, deterministik içerik bütünlüğü kapısı (sözcük eşleşmesi, mutlak ifadeler, şık uzunluğu), kanıt denetimi ve Academia için `isAdaptiveEligible` (ACTIVE olsaydı kabul, DRAFT iken ret).

**Çalıştırılmayan kapılar:** gömme tabanlı tekrar taraması, LLM çeldirici sertleştirme ve LLM metin bağımlılığı kapısı (API maliyeti). Yerlerine aşağıdaki inceleme yapıldı.

## İnceleme bulguları (`sinav-kalite-ajani`, iki tur)

İnceleyici önce yalnızca kök ve şıkları görerek yanıtladı, sonra metni ve anahtarı okuyup denetledi. Yanlış ya da çift anahtar bulunmadı. Bulduğu belirsizlikler, sorular arası sızıntılar ve aynı fikri ölçen çiftler düzeltildi (25 soru yeniden yazıldı).

Metni görmeden doğru yanıtlama oranı (şans %25), düzeltmelerden önce:

| Düzey | Kör isabet |
|---|---|
| B1 | 16/20 |
| B2 | 19/20 |
| C1 | 20/20 |
| C2 | 18/20 |

Bu, bir LLM çözücünün tek geçişidir; insan adaylar için kanıt değil, yön işaretidir. Yine de açık bir bulgudur: bu düzeylerde çoktan seçmeli biçim, bankanın geri kalanında olduğu gibi, üsluptan ve genel bilgiden çözülebiliyor. Sonuç her sorunun `metadata.generationGates` alanına yazıldı (`TEXTDEP-SOLVABLE-BLIND`; sonradan yeniden yazılan 25 soru `TEXTDEP-UNCHECKED`), inceleme paketinde görünür.

## İnsan incelemesinde bakılacaklar

1. **Biçim kararı.** İki konuşmacılı tartışma kayıtlarında (C1-02, 05, 10; C2-02, 05, 08) sorulardan birini "görüş – kim savunuyor" eşleştirmesine çevirmek kör çözülmeyi düşürebilir. Yapılmadı; görev iki çoktan seçmeli soru istiyordu ve simülasyon bu varsayımla koşuldu.
2. **Olgu denetimi.** C2-03 (ücret ve boy dizileri) ve C2-07 ("meritocracy" sözcüğünün kökeni) bir alan uzmanınca doğrulanmalı. Norbridge bisiklet yolu, kantin projesi gibi vakalar kurgudur.
3. **Sözlü doğallık.** C2 dersleri (01, 03, 06, 10) cilalı yazı gibi; seslendirmeden önce bakılmalı.
4. **Düzey.** C1-08B, C1 için kolay olabilir. C1 ile C2 metinleri ayrışıyor, soruların güçlüğü ayrışmayabilir; pilot verisi gösterir.
5. Yeniden yazılan 25 soru ikinci kez kör sınanmadı.

## Ses üretimi (ayrı adım, yapılmadı)

40 kayıt için 40 ses dosyası gerekir; iki soru aynı dosyayı paylaşmalı. Toplam yaklaşık 9.400 sözcük, tahminen 60–65 dakika ses. Dikkat edilecekler:

- Konuşmacı cinsiyeti şık gerekçeleriyle uyuşmalı (ör. Dr Hassan, Dr Petrov, Dr Nilsen erkek; Dr Lindqvist, Professor Lindgren, Dr Mwangi kadın).
- İki konuşmacılı 20 kayıtta sesler net ayrışmalı.
- `scripts/generate-draft-listening-audio.ts` ses üretince soruyu ACTIVE yapıyor; **bu parti için kullanılmamalı**. `scripts/jobs/generate-primary-listening-audio.ts` DRAFT bırakır ama madde başına dosya üretir; set başına tek dosya için küçük bir uyarlama gerekir.

## Komutlar

```bash
npx tsx scripts/seed-academia-listening-drafts.ts            # doğrula, yazma
npx tsx scripts/seed-academia-listening-drafts.ts --packet   # inceleme dosyaları (scripts/jobs/.out/academia-listening/)
npx tsx scripts/seed-academia-listening-drafts.ts --apply    # DRAFT olarak ekle
npx tsx scripts/jobs/export-review-packet.ts                 # uzman inceleme paketi (HTML)
```

Geri alma: `tags` içinde `academia-listening-wave-01` olan DRAFT kayıtları silmek yeterlidir; başka kayda dokunulmaz.

## Veritabanı

2026-11-21'de kullanıcı onayıyla canlı veritabanına (Supabase, `postgres`) 80 kayıt eklendi: düzey başına 20, hepsi `status = DRAFT`, `pipelineStage = AI_DRAFT`, `isPretest = false`. Yazım sonrası doğrulananlar: 40 ayrı kayıt metni, `audioUrl` yok, `content.passage` yok, `adaptiveItemWhere` ve `pretestItemWhere` (Academia, LISTENING) bu kayıtlardan 0 tanesini seçiyor, `ItemParameterVersion` kaydı yok. Kimlikler: `scripts/jobs/.out/academia-listening/wave-01-ids.json`; 80 soru `export-review-packet.ts` çıktısında "Academia — listening sets, wave 01" başlığı altında görünüyor.

Not: ilk `--apply` denemesi Prisma'nın 5 saniyelik işlem süresini aştığı için hata verdi, ama kayıtlar yazılmıştı; betik zaman aşımı 60 saniyeye çıkarılıp yeniden çalıştırıldı ve 80 kaydın parmak izini doğruladı (0 yeni ekleme).
