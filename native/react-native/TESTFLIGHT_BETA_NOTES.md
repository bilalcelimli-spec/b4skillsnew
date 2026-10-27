# B4Skills — TestFlight bilgi taslağı

25 Ekim 2026. B4Skills uygulama kaydı App Store Connect’te oluşturuldu (ID `6826695698`); iOS ve macOS sürüm taslakları `1.0.0`. İki platformun `1.0.0 (3)` build’i uygulama ve Hermes sembolleriyle yüklendi; TestFlight **Ready to Submit**, Binary State **Validated**, Includes Symbols **Yes**. Aşağıdaki beta açıklaması ve test notları henüz App Store Connect’e kaydedilmemiş taslaktır. Eksik irtibat, politika ve review hesabı alanları ürün sahibi tarafından tamamlanır.

## Beta açıklaması

B4Skills, kurumunuzun sağladığı hesap veya sınav koduyla İngilizce değerlendirmesine katılmanızı sağlar. Sınav programına göre okuma, dinleme, yazma, konuşma, kelime bilgisi ve dil bilgisi görevleri sunulur. Soru seçimi ve sonuç durumu sunucu tarafından yönetilir.

Kurumun etkinleştirdiği kamera pilotunda aday kamerayı kendisi açar. Yüz sayımı cihazda yapılır; fotoğraf yalnız adayın gönderim onayından sonra iletilir. Teknik gözlemler tek başına ihlal veya geçersiz sınav kararı oluşturmaz. İnsan gözetmenle canlı görüşme yoktur.

## Bu build'de test edilecekler

Build 5 dil güncellemesi: Türkçe, İngilizce ve Arapça arayüz seçimi; tercihin yeniden açılışta korunması; Arapça sağdan sola yerleşim ve ok yönleri; dil değişiminde form/yanıt değerlerinin korunması. Sınavın İngilizce soru içeriği çevrilmez.

- iPad/macOS açılış, giriş ve sınav kodu akışı.
- Çoktan seçmeli ve boşluk doldurma yanıtları; yazma, dinleme ve konuşma kontrolleri.
- Soru geçişi, bağlantı kesilmesinden dönme, uygulamayı yeniden açıp aynı oturuma devam.
- Etkin kamera pilotunda izin, cihazda yüz sayımı, çekim/önizleme/yeniden çekim ve açık gönderim onayı.
- Onaylı fotoğraf kuyruğunun bağlantı kesintisi/yeniden açılış sonrası tek teslimi; süre/kota hatalarının görünür olması.

Yalnız verilen QA hesabı ve test kurumunu kullanın. Test verileri sonuç doğrulama veya gerçek bir aday hakkında karar verme amacı taşımaz. Sonuçların inceleme durumu uygulamada gösterilir.

## İnceleme bilgileri — doldurulacak

| Alan | Durum |
| --- | --- |
| Feedback e-postası | Ürün sahibi sağlayacak |
| İnceleme irtibat adı/e-posta/telefon | Ürün sahibi sağlayacak |
| Gizlilik politikası URL'si | Yayımlanmış URL gerekli |
| Destek URL'si | Doğrulanmış URL gerekli |
| Review kullanıcı adı/parola | Çalışan üretim QA hesabı; parolayı bu dosyaya yazmayın |
| QA kurum kredisi / geçerli kod | İnceleme boyunca yeterli hak gerekli |
| Yaş derecelendirmesi / bölge / kurumsal erişim açıklaması | App Store Connect formunda ürün sahibi tamamlayacak |

## Giriş ve inceleme yolu

Uygulamayı açın → Devam et → Giriş yap → verilen QA hesabı → Sınav koşullarını ve cihazı kontrol et → veri kullanımı açıklamasını okuyup onayla → Değerlendirmeye başla.

Kamera pilotunun test edilmesi için review kurumunda ilgili ayar ayrıca açık olmalı. Bir yüz görünmeyen fotoğrafın gönderimi engellenir; kamera izni ve teknik gözlemler, kimlik doğrulaması veya otomatik ihlal kararı olarak sunulmaz.


## English review notes (draft)

B4Skills provides institution-provisioned English assessment access. Reviewers need the supplied QA account or a valid institution-issued assessment code. No purchase flow is included in this beta. The optional camera pilot performs face counting on-device; a photo is uploaded only after the candidate explicitly approves it. Technical observations do not automatically invalidate an assessment. Live human proctoring is not offered. Review credentials and available QA assessment credits must be supplied securely before submission.


## Build 5 iç test dağıtımı

İngilizce/Arapça dil güncellemesi `1.0.0 (5)` olarak iki platformda mevcut iç test gruplarında Testing durumunda. Dil seçimi, kalıcılık, RTL düzeni ve yanıt/form korunmasını açıklayan kısa What to Test notları iki build için App Store Connect’e kaydedildi. Yukarıdaki genel beta açıklaması ve dış inceleme bilgileri taslak olarak kalır.
