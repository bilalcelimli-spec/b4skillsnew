# Faz 2: okuma/dinleme derinliği, üretici düzeltmeleri ve ilk pilot (2026-11-14)

Faz 2'nin hedefi okuma ve dinlemede metin/kayıt sayısını kapasite minimumuna çıkarmak. Öncelik A1 dinleme, A1–A2 okuma ve zor (C1) dinleme. Ölçeklemeden önce iki iş yapıldı: Faz 1'de görülen üretici sorunları düzeltildi, sonra küçük bir pilotla kapıların kaç taslağı geçirdiği ölçüldü.

## Hedef (General English, `verify:capacity`)

| Hücre | Bugün | Min | Hedef |
|---|---|---|---|
| Okuma A1 / A2 / B1 / B2 / C1 | 7 / 5 / 16 / 10 / 9 metin | 20 | 30 |
| Dinleme A1 / A2 / B1 / B2 / C1 | 5 / 16 / 29 / 17 / 15 kayıt | 17 | 26 |

## Üretici değişiklikleri

Değişiklikler `src/lib/content-factory/age-context.ts` ve `batch-generator.ts` içinde.

- **İsim ve ortam rotasyonu:** Faz 1'deki tekdüzeliğin kaynağı buydu: `pickDistinct` her çağrıda listenin ilk elemanlarını alıyordu, bu yüzden hep Amara, Kenji, Sofia, Ravi ve "a community centre" çıkıyordu. Yeni sistemde:
  - Seçimin başlangıç noktası hücreden, parçadan ve çalıştırma tohumundan türetiliyor (`rotatePick`).
  - Her parçaya 6 isim ve 3 ortam veriliyor.
  - İsim listesi 32'den 48'e çıktı.
- **Yaşa göre ortam listesi:** TEEN hücreleri yetişkin ortam listesini kullanıyordu (üniversite, araştırma enstitüsü, start-up). Artık 24 ortamlık ayrı bir genç listesi var. TEEN kuralları hücrenin yaş aralığını kullanıyor; eskiden sabit "13-17" yazılıydı, Junior ise 11-14. Kurallarda üniversite, iş ve para bağlamı açıkça yasak.
- **Yaş bağlamı kapısı:** TEEN ve YOUNG_LEARNER taslaklarında metin, seçenek ve eşleştirmeler deterministik bir yetişkin-bağlam listesiyle taranıyor (university, professor, salary, loan, colleagues…). Eşleşen taslak, ücretli model kapılarından önce reddediliyor (`AGE_CONTEXT`). Listede "office" ve "meeting" gibi gençlerde de sık geçen sözcükler bilerek yok.
- **Sıkı metin bağımlılığı:** `BatchSpec.strictTextDependency` adlı yeni bir seçenek eklendi. Açıkken, metni görmeden çözülen (`*-SOLVABLE-BLIND`) ya da anahtarı doğrulanamayan taslaklar kaydedilmiyor; eskiden bayrakla kaydediliyordu. Varsayılan kapalı, eski betikler etkilenmiyor.

Testler `test/age-context.test.ts` (8 test).

## Pilot (`scripts/jobs/generate-phase2-pilot.ts`)

11 hücre, 39 taslak istendi, sıkı metin bağımlılığı açık. **15 taslak DRAFT olarak kaydedildi** (kodlar `scripts/jobs/.out/phase2/pilot-ids.json`; inceleme paketine eklendi).

| Grup | Format | Kaydedilen | Kayıp nedeni |
|---|---|---|---|
| A1 dinleme | çoktan seçmeli | 7/8 | 1 metinsiz çözülebilir |
| A1–A2 okuma | çoktan seçmeli | 2/8 | 6 metinsiz çözülebilir |
| A2 okuma | eşleştirme | 1/3 | 2 metinsiz çözülebilir |
| C1 dinleme | çoktan seçmeli | 0/8 | 8 metinsiz çözülebilir |
| C1 dinleme | eşleştirme | 3/3 | – |
| Junior TEEN tekrar (B2) | çoktan seçmeli | 2/9 | 7 metinsiz çözülebilir |

Bulgular:
- **Asıl darboğaz metinsiz çözülebilirlik.** Çoktan seçmeli taslakların 33'ünden 22'si (%67) kaynağı görmeyen çözücü tarafından doğru yanıtlandı. Bu oran çeldirici güçlendirme (`hardenDistractors`) çalıştıktan sonraki oran. Eşleştirmede oran 6'da 2 (%33). C1 çoktan seçmelide hiçbir taslak geçemedi. Faz 1'de aynı ölçüm bayrak olarak %53'tü.
- **Eşleştirme formatı belirgin biçimde daha dayanıklı.** Faz 2 hacminin ağırlığı eşleştirmeye (bakış açısı ayırt etme, başlık/ana fikir eşleştirme) kaymalı. Çoktan seçmeli için üretim yöntemi değişmeden ölçeklemek kayıp olur. Seçenekler:
  - Soruyu yalnızca metinde geçen, genel bilgiyle tahmin edilemeyen ayrıntılara bağlamak
  - Çeldiricileri metinden alınmış ama yanlış ilişkilendirilmiş ifadelerden kurmak
- **Yaş kapısı ve rotasyon çalışıyor.** TEEN taslaklarının hiçbiri yaş kapısına takılmadı. Kaydedilen iki taslak antrenman sonrası ödev ve drama kulübü konulu; Faz 1'de 36'nın 11'i üniversite bağlamına kaymıştı. Örneklem küçük: 9 taslak. 15 kayıtlı taslakta 20 farklı isim var; "community centre" yalnızca bir kez geçiyor.
- **A1 duyurularında seviye kayması.** "Due to roadworks near the main gate", "Future of Energy conference" gibi ifadeler A1 için ağır. Uzman incelemesinde seviye kontrolü özellikle bu hücrede yapılmalı.
- **Zorluk parametreleri tohum değeri.** Bütün taslaklarda b, CEFR tohumu: A1 −2,5, C1 2,2. Zor dinleme (b ≥ 1) hedefi ancak kalibrasyonla (Faz 4) doğrulanabilir.
- **Ses dosyası yok.** Dinleme taslaklarında yalnızca `ttsScript` var. Ses dosyası olmadan pilot kabulü bloke (`AUDIO_MISSING`), bu yüzden ses üretimi inceleme sonrasında ayrı bir adım.

## Sonraki adımlar

1. Çoktan seçmeli üretim istemini metne bağlı ayrıntı ve metinden kurulmuş çeldiricilerle yeniden yaz; aynı pilotla ölç.
2. Ölçeklemeyi eşleştirme ağırlıklı yap: hücre başına çoktan seçmeli/eşleştirme oranı hedefi belirle.
3. Kabul edilen dinleme taslakları için ses üret.

## Çoktan seçmeli istemi v3: metne bağlı anahtar (2026-11-14)

Değişiklik (`generation-guidelines.ts` → `textBoundKeyRules`, yalnızca okuma/dinleme çoktan seçmeli):
- **Önce soru ve seçenekler:** Model önce soruyu ve dört seçeneği planlıyor, metni bunların arasında karar verecek şekilde yazıyor. Dört seçenek de gerçek hayatta eşit derecede inandırıcı olmalı.
- **Anahtar yalnızca metinde var:** Doğru cevap beklenen cevap olamaz, en olumlu ya da en makul görünen seçenek de olamaz.
- **Sağduyu çeldiricisi:** Çeldiricilerden biri, metni görmeyen okuyucunun seçeceği cevap olmak zorunda. Metin bu seçeneği açıkça dışarıda bırakmalı. Model bu seçeneğin id'sini `commonSenseOption` olarak bildiriyor. Bildirilen seçenek anahtarsa taslak reddediliyor (`COMMON_SENSE_KEY`). Bu alan aday içeriğinden çıkarılıp `metadata.generationGates.commonSenseOption` alanına taşınıyor.
- **Seviyeye göre:** B2+ seviyesinde konuşmacıya belirgin olmayan, koşullu bir tutum veriliyor; yaygın görüş çeldirici oluyor. A1–A2'de metinsiz çözmeyi zorlaştıran şey keyfi somut ayrıntılar (hangi gün, hangi oda).
- **İşaretleme:** `promptVersion: "v3-text-bound"`.

Aynı 8 çoktan seçmeli hücrede 33 taslak yeniden istendi (`--mcq-only --tag v3`). Yalnızca metin bağımlılığı kontrolünün gerçekten çalıştığı hücreler karşılaştırılıyor:

| Hücre | v2: metinsiz çözülen | v3: metinsiz çözülen |
|---|---|---|
| A1 dinleme (2 hücre) | 1/7 | 2/8 |
| A1–A2 okuma (2 hücre) | 6/8 | 3/8 |
| C1 dinleme, tutum | 4/4 | 3/4 |
| **Toplam** | **11/19 (%58)** | **8/20 (%40)** |

Okuma:
- Okumada belirgin bir iyileşme var. Dinlemede fark yok; C1 tutum soruları hâlâ metinsiz çözülüyor.
- Toplamda düşüş 18 puan, ancak n = 20 ile bu farkın bir kısmı rastlantı olabilir.
- Alt sınır sıfır değil: dört seçenekte kör çözücü, metne tamamen bağlı bir soruda bile %25 olasılıkla doğruyu bulur. Yani %40, ulaşılabilir alt sınıra (~%25) yaklaşmış durumda. Sıkı mod bu yüzden iyi soruların da yaklaşık dörtte birini atar; ölçekli üretimde bu kayıp hesaba katılmalı. Alternatif: kör çözümü iki farklı karıştırmayla iki kez yapmak ve ikisinde de doğruysa reddetmek.
- Modelin kendi "sağduyu" seçeneğini anahtar yaptığı taslak hiç çıkmadı (0/33). Kontrol ucuz, ama tek başına ayırt edici değil.
- Yaş kapısı bir TEEN taslağını "university" nedeniyle reddetti.

### Kredi tükenmesi ve kontrol edilmeden kaydedilen taslaklar

Pilotun ortasında Gemini ön ödemeli kredisi bitti (HTTP 402). Sonuçları:
- C1 çıkarım hücresi ve Junior hücreleri değerlendirilemedi.
- Daha önemlisi: metin bağımlılığı kontrolü hata verdiğinde sıkı mod bunu geçmiş sayıyordu (yalnızca `null` sonucu engelleniyordu). Bu yüzden 7 taslak kontrol edilmeden kaydedildi:
  - v3: LIS-C1-0092…0095, LIS-B2-0104, LIS-B2-0105
  - İlk pilot: LIS-A1-0128 (model zaman aşımı)
- Düzeltme: Sıkı modda ERROR ya da SKIPPED sonucu artık engelliyor. 7 taslağa `TEXTDEP-UNCHECKED` bayrağı ve açıklama eklendi; incelemeden önce kontrol yeniden çalıştırılmalı.
- Aynı nedenle 6 taslak yinelenme (embedding) kontrolü olmadan kaydedildi. Bu durum zaten "Embedding failed" olarak kaydediliyor.

v3 taslakları (18) inceleme paketine eklendi; paket şu an 571 madde.

### Sonraki adım

Gemini kredisi yenilendikten sonra:
1. 7 kontrolsüz taslakta metin bağımlılığı kontrolünü yeniden çalıştır.
2. v3'ü daha büyük bir örneklemle ölç (hücre başına ≥ 10).
3. C1 dinleme tutum ve çıkarım için çoktan seçmeli yerine eşleştirmeyi öne al; o hücrede v3 yetmedi.

## Kredi sonrası: yeniden kontrol, büyük örneklem ve C1 eşleştirme (2026-11-14)

### 7 kontrolsüz taslağın yeniden kontrolü

`scripts/jobs/recheck-text-dependency.ts --apply`. Yalnızca `TEXTDEP-UNCHECKED` işaretli DRAFT'lara dokunur; bayrağı kapının gerçek sonucuyla değiştirir, başarısızı silmez. Önceki metadata `.out/textdep-recheck/applied-*.jsonl` günlüğünde.

| Sonuç | Taslaklar |
|---|---|
| Geçti (2) | LIS-C1-0092, LIS-C1-0094 |
| Metinsiz çözülebilir (5) | LIS-A1-0128, LIS-B2-0104, LIS-B2-0105, LIS-C1-0093, LIS-C1-0095 |

İlk denemede 3 hakem çağrısı geçici olarak hata verdi (zaman aşımı); ikinci denemede çalıştı. Bu yüzden üretici artık hata veren metin bağımlılığı kontrolünü bir kez yeniden deniyor. Bu turda kontrolü çalışmayan taslak kalmadı.

### v3, hücre başına 10 taslak (`--mcq-only --per-cell 10 --tag v3n10`)

| Hücre grubu | Metinsiz çözülen | Anahtar doğrulanamadı | Yaş kapısı | Kaydedilen |
|---|---|---|---|---|
| A1 dinleme (2 hücre) | 3/20 (%15) | 1 | – | 16/20 |
| A1–A2 okuma (2 hücre) | 10/20 (%50) | 1 | – | 9/20 |
| C1 dinleme, tutum + çıkarım | 17/20 (%85) | – | – | 3/20 |
| Junior B2 (TEEN, 3 hücre) | 21/30 (%70) | 1 | 1 | 7/30 |
| **Toplam** | **51/90 (%57)** | 3 | 1 | **35/90** |

Okuma:
- Küçük örneklemdeki %40 tutmadı; 90 taslakta oran %57, yani v2 düzeyine (%58) yakın. İlk karşılaştırmadaki düşüşün büyük kısmı rastlantıydı.
- Sorun seviye ve alt beceriyle belirleniyor, istemle değil. A1 dinleme rastlantı tabanının (%25) altında. B2–C1 tutum, çıkarım ve ana fikir sorularında ise doğru cevap, metni görmeden sorunun ve seçeneklerin kendisinden çıkarılabiliyor (%70–85).
- Bu hücrelerde çoktan seçmeli formatla bu üretici verimli değil: 50 taslaktan 10'u kaldı.

### C1 dinleme eşleştirme (`--matching-only --only C1 --per-cell 5 --tag c1match`)

| Hücre | Metinsiz çözülen | Kaydedilen |
|---|---|---|
| C1 görüş ayırt etme | 2/5 | 3/5 |
| C1 tutum | 3/5 | 2/5 |
| C1 çıkarım | 0/5 | 5/5 |
| **Toplam** | **5/15 (%33)** | **10/15** |

- Eşleştirmede kör çözücünün eşlemenin tamamını şansla bulma olasılığı %1'in altında. Yani %33 gerçek bir sızıntı, ama aynı C1 hücrelerinde çoktan seçmelinin %85'inden çok daha iyi.
- Çıkarımda eşleştirme belirgin şekilde işe yarıyor (5/5). Tutumda hâlâ sızıntı var: konuşmacının tutumu, seçenek ifadelerinin konuyla uyumundan tahmin edilebiliyor.

### Sonuç ve öneri

1. A1 dinleme ve A1–A2 okuma çoktan seçmeliyle ölçeklenebilir (hücre başına yaklaşık %80 ve %45 verim).
2. B2–C1 tutum, çıkarım ve ana fikir soruları için varsayılan format eşleştirme olmalı, Junior B2 dahil. Çoktan seçmeli üretim bu hücrelerde yalnızca sıkı kapıyla ve düşük verim kabul edilerek sürdürülebilir.
3. Tutum eşleştirmesinde seçenekler aynı konu alanından ve birbirine yakın tutumlardan seçilmeli (ör. "temkinli destek" / "isteksiz kabul"). Bu üretici kuralı henüz yazılmadı.

Bu turda 45 taslak kaydedildi (35 çoktan seçmeli + 10 eşleştirme), hepsi DRAFT/AI_DRAFT. İnceleme paketine eklendi.

## Eşleştirme öncelikli varsayılan ve tutum kuralı (2026-11-14)

### Değişiklikler

- `resolveItemType(cell)` (`blueprint.ts`): B2/C1/C2 okuma ve dinlemede çıkarım, tutum ve ana fikir alt becerileri (`MATCHING_FIRST_SUBSKILLS`) artık varsayılan olarak eşleştirme (DRAG_DROP) üretiyor.
  - Doğrudan ölçülenler: INFERENCE, SPEAKER_ATTITUDE, GIST. IMPLIED_MEANING, IMPLICATION, INFERRED_INTENTION, UNSTATED_CONCLUSION, WRITER_ATTITUDE, TONE, STANCE ve MAIN_IDEA aynı yapıyı ölçtüğü için kapsama alındı.
  - Hücrede `itemType` açıkça verilirse o geçerli. Eski (legacy) istem eski varsayılanı korur.
- `attitudeMatchingRules`: tutum eşleştirmesinde tüm şıklar aynı tek soru hakkında ve birbirine yakın tutumlar; zıt ikili yok. Tutum adıyla söylenmiyor, söyleyişten çıkarılıyor. En az iki konuşmacı aynı artı ve eksileri anıyor, yalnızca ağırlıkları farklı.
- Dinleme eşleştirmesinde kayıt 3–4 adlandırılmış konuşmacı içermeli. İlk denemede ikili sohbet ve röportajlar yalnızca 2 çift verdi; Junior dinlemede 10 taslağın 5'i bu yapı hatasıyla düştü.
- Testler: `test/matching-first.test.ts`.

### Pilot (`--tag matchfirst`, `matchfirst2`)

| Hücre | Önceki: v3 çoktan seçmeli, metinsiz çözülen | Şimdi: eşleştirme, metinsiz çözülen | Kaydedilen |
|---|---|---|---|
| C1 dinleme, tutum (2 hücre) | 8/10 | 1/10 | 9/10 |
| Junior B2 dinleme, ana fikir + tutum | 13/20 | 1/9 (1 yaş kapısı) | 8/10 |
| Junior B2 okuma, çıkarım | 8/10 | 1/5 | 4/5 |

- Metinsiz çözülen oran %57–85'ten yaklaşık %14'e (4/29) indi. Örneklem küçük (n = 29), ama fark rastlantıyla açıklanamayacak kadar büyük.
- Yaş kapısı bir Junior taslağını yetişkin bağlamı nedeniyle reddetti.
- `matchfirst` turundaki 5 yapı hatası 3–4 konuşmacı kuralından önceydi; `matchfirst2` turunda yapı hatası olmadı.

Bu turda 25 taslak kaydedildi (17 + 8), hepsi DRAFT/AI_DRAFT. İnceleme paketine eklendi.

## Kuyruk kapsamı ve okuma deneme havuzu denetimi (2026-11-14)

### Kuyruk onaylansa kapsam (`verify:capacity --profile "General English" --with-queue`)

| | Canlı (metin/kayıt) | Kuyrukla |
|---|---|---|
| Okuma A1 / A2 / B1 / B2 / C1 | 7 / 5 / 16 / 10 / 9 | 23 / 31 / 41 / 56 / 34 |
| Dinleme A1 / A2 / B1 / B2 / C1 | 5 / 16 / 29 / 17 / 15 | 50 / 19 / 37 / 73 / 70 |

Minimum okumada 20, dinlemede 17. Kuyruk onaylansa yalnızca okuma A1 (23/30) ve dinleme A2 (19/26) hedefin altında kalıyor; darboğaz üretim değil inceleme.

Bu iki hücre için doldurma partisi (`--only Fill --tag fill`): okuma A1'de 10/16 taslak kaydedildi (REA-A1-0125…0134). Dinleme A2'de kredi bittiği için 0/12.

### Okuma PRETEST havuzu: metinsiz çözme denetimi (`scripts/_audit-pretest-text-dependency.ts`, salt okunur)

482 PRETEST okuma sorusunun hiçbiri metin bağımlılığı kontrolünden geçmemişti. Kontrolün çalıştığı 228 soru:

| Seviye | Değerlendirilen | Metinsiz çözülen |
|---|---|---|
| PRE_A1 | 11 | 8 (%73) |
| A1 | 48 | 31 (%65) |
| A2 | 72 | 62 (%86) |
| B1 | 97 | 85 (%88) |
| **Toplam** | **228** | **186 (%82)** |

- Dört şıkta rastlantı tabanı yaklaşık %25. %82, bu soruların büyük çoğunluğunun metin okunmadan çözülebildiğini gösteriyor.
- B2, C1 ve C2'deki 245 soru ile B1'deki 9 soru değerlendirilemedi: denetim sırasında Gemini kredisi yine bitti (402). Kredi gelince `--resume` ile yalnızca bunlar çalıştırılır.
- Hakem tek bir model (gemini-2.5-flash). Kısa A1 duyurularında dünya bilgisi doğru cevabı verebiliyor. Bu sonuç bir inceleme işareti, karar değil.

Sonuçlar:
1. Kuyruk kapsamı iyimser. Okuma PRETEST havuzu kapsama sayılıyor, ama soruların çoğu metin anlamayı ölçmüyor.
2. Bu sorular puanlanmıyor ama adaylara gösteriliyor ve kalibre ediliyor. Metinsiz çözülebilen bir soru büyük olasılıkla kolay ve düşük ayırt edicilikle kalibre olur. Yayın kapısı (IQS ≥ 65, SE(b) ≤ 0.25) bunların bir kısmını yakalayabilir, ama bu varsayılmamalı.
3. Veritabanında hiçbir şey değiştirilmedi. Metinsiz çözülebilen PRETEST sorularının ne olacağına (ör. REVIEW'a çekmek, yani hizmetten almak) karar verilmesi gerekiyor.
