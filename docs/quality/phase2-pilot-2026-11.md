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
