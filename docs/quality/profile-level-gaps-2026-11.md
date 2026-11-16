# Profil seviye boşlukları — üretim (2026-11-16)

## Neden

`npm run audit:adaptive` (n = 30, 2007 ACTIVE madde) hiçbir profilde başlatmayı engelleyen boşluk bulmadı: dokuz profilin her bölümünde `minItems` üzerinde uygun madde var. Ama 13 profil × beceri × CEFR hücresinde hiç uygun ACTIVE madde yok (`missingLevels`). Bu hücrelerdeki adaylar için ölçme, komşu seviyelerdeki maddelere dayanıyor.

Üretimden önce her hücrede bekleyen taslak sayıldı (hedef: `aws-1-eu-central-1.pooler.supabase.com` / `postgres`, salt okunur):

| Hücre | Bekleyen taslak | Karar |
|---|---|---|
| Primary WRITING A2 | 8 DRAFT | üretilmedi, inceleme bekliyor |
| Primary SPEAKING A2 | 8 DRAFT | üretilmedi |
| Junior LISTENING A1 / B2 | 8 / 30 DRAFT | üretilmedi |
| Junior READING / WRITING / SPEAKING B2 | 11 / 12 / 6 DRAFT | üretilmedi |
| Corporate WRITING A2 | 10 DRAFT | üretilmedi |
| Academia LISTENING B1 | yok | **üretildi** |
| Corporate READING A2, SPEAKING A2 | yok | **üretildi** |
| Language Schools READING A1, C1 | yok | **üretildi** |

## Üretici düzeltmeleri (deneme turunda bulunan)

1. **Ürün bağlamı.** Corporate ve Academia taslakları genel yetişkin mekân listesinden bağlam alıyordu (işyeri duyurusu hücresi için spor salonu havuz takvimi; üniversite konuşması için coworking alanı). `age-context.ts` artık `corporate` ve `academia` için ürüne özgü mekân listesi, `UNIVERSAL` hücreler (Language Schools, 12+) için gençlere ve yetişkinlere uygun ayrı bir liste kullanıyor.
2. **İsim tutarlılığı kapısı (`UNANCHORED_NAME`).** Soru "According to Jonas…" diyor ama metinde Jonas hiç geçmiyordu. Soru veya şıklarda geçip uyaran metinde (passage / ttsScript) geçmeyen karakter adı olan taslak artık ücretli kapılardan önce eleniyor. Üretim istemine de aynı kural eklendi.

## Sonuç (`scripts/jobs/generate-profile-level-gaps.ts`)

36 istendi, **31 DRAFT kaydedildi** (`scripts/jobs/.out/profile-level-gaps/ids.json`).

| Hücre | Kaydedilen | Elenen |
|---|---|---|
| Academia B1 dinleme (gist, lecture) | 4/4 | — |
| Academia B1 dinleme (factual detail) | 1/4 | 3 × UNANCHORED_NAME |
| Corporate A2 okuma (notice / email) | 8/8 | — |
| Corporate A2 konuşma | 6/6 | — |
| Language Schools A1 okuma | 8/8 | — |
| Language Schools C1 başlık eşleştirme | 1/3 | 2 × sırayı ele veren başlık |
| Language Schools C1 çıkarım eşleştirme | 3/3 | — |

Otomatik kapı işaretleri (LLM yargısı; karar değil, inceleme önceliği):

- Çoktan seçmeli 21 madde: 14'ü metinsiz çözülemiyor. 7'si `TEXTDEP-SOLVABLE-BLIND`: LIS-B1-0090, 0100, 0101, 0103; REA-A2-0169, 0171, 0175.
- C1 eşleştirme REA-C1-0145, 0146, 0147: `MATCH-KEY-UNCONFIRMED` (kılavuzlu çözücü de 0). Bu sırada Gemini 503 döndü; anahtar uzmanca öncelikle kontrol edilmeli.
- Elle örnekleme notları: REA-A2-0175 şıkları doğal değil ("Day fifteen / Day twenty"); REA-A1-0140 şıkları paralel değil (saat dilimi ile gün karışık); SPE-A2-0071/0072/0073 adayın kendi işini anlatması yerine üçüncü kişi rol yapma istiyor (0073 "his job").
- Dinleme taslaklarının sesi yok (ttsScript var); ses üretimi ayrı adım.

## Sonraki adımlar (onay gerekir)

1. Uzman incelemesi: `scripts/jobs/.out/review-packet.html` ("Profile level gaps" bölümü).
2. Kararlar gelince `apply-review-decisions.ts` önce kuru çalıştırılır; `--apply` ve PRETEST'e terfi onay ister.
3. Academia factual-detail hücresi 1/4'te kaldı; gerekirse aynı işle yeniden çalıştırılabilir.
