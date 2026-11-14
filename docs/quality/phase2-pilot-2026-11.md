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
