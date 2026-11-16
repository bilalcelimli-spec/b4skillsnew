# App Store yayın hazırlığı — iPad ve macOS

4 Kasım 2026. Bu kayıt eski tarih tahminlerinin yerine geçer. Başvuru henüz gönderilmedi.

## Doğrulanmış durum

- Uygulama: B4Skills; App Store Connect ID `6826695698`; paket `com.b4skills.assessment`; ekip `333355WMYW`; sürüm 1.0.0. Yeni dağıtım adayı build 13; eski build 12 güncel veli/silme akışlarının kanıtı değildir.
- Sunucu PR #86, `5125143`: 16 kontrol başarılı olarak birleştirildi; ana dal commit’i `691660b`. Mobil PR #85, `b7698c3`: 21 kontrol başarılı; build 13 bu kaynaktan üretildi. Sonraki `df0af15` yükleme öncesi canlı veli onayı servisi kontrolünü ekler; sonraki commitlerin kontrolleri ayrıca izlenir.
- Mobil yerel 143 test, TypeScript ve mevcut lint sınırı başarılı. Sunucuda gerçek HTTP 40 senaryo başarılı; saklama/silme test kayıtları PR #86 içindedir.
- İmza ve export doğrulaması iPad/macOS için başarılı. Build 13 her iki platformda Apple’a başarıyla yüklendi; iPad TestFlight görünürlüğünü kullanıcı doğruladı. Mac yüklemesi Apple işlem kuyruğuna alındı; işlem tamamlanması ayrıca doğrulanacak.
- Canlı API/veritabanı sağlıklı; hesap silme ucu kimlik doğrulaması istiyor. İnceleme hesabı `appreview@b4skills.com` ile canlı giriş doğrulandı. Parola özel yerel dosyada; depoda veya bu belgede yok.
- Kullanıcı OpenAI ZDR ve içerik haklarını teyit etti. Son olarak Render anahtarı ve Xcode girişinin hazır olduğunu bildirdi. Üretim proje/uç eşleştirmesi ayrı doğrulanır.
- Çocuklar için veli onayı ve kurum doğrulaması ilk sürüm kapsamındadır. Ana değerlendirme OpenAI kullanır. Eski üç sağlayıcı ifadesi geçerli değildir.

## Başvuruya kalanlar

| İş | Durum / kapanış kanıtı |
| --- | --- |
| Backend yayını | #86 birleştirildi; migration 014–016 uygulandı. Canlı veli onayı 404 giderildi; demo hesapta durum → yetişkin yaş beyanı → General English başlatma → ilk soru HTTP 200 doğrulandı. Geri dönüş tatbikatı ayrı bekliyor |
| OpenAI canlı metin/ses | Render bağlantısıyla sentetik veri testi; model erişimi, proje ZDR kapsamı ve hata davranışı doğrulanacak |
| Gizlilik ve koşullar | Canlı `/privacy` ve `/terms` içerik veriyor fakat taslak; preflight iki engel bildiriyor. Hesaba uygulanabilir sözleşme/aktarım bilgileri tamamlanmadan taslak işareti kaldırılmaz |
| Sözleşmeler / aktarım | [Sunucu hukuki dosyası](https://github.com/bilalcelimli-spec/b4skillsnew/tree/codex/parental-consent/docs/release/legal) hazır; karşı taraf kabulü, imza ve bildirim tamamlanmadı |
| Saklama / yedekler | Kod ve geri yükleme aracı testli; üretim görevleri, sağlayıcı yedek ömrü ve gerçek geri yükleme testi bekliyor |
| Build 13 | iPad ve Mac imzalı arşiv, export doğrulaması ve Apple yüklemesi başarılı. iPad TestFlight’ta; Mac işlem sonucunun hesap üzerinden doğrulanması bekliyor |
| Ekran görüntüleri | Gerçek güncel arayüzden iPad ve Mac görselleri; müşteri verisi kullanılmayacak |
| Apple formları | Yaş anketi, içerik hakları, App Privacy yayımlama, fiyat, inceleme irtibatı, build seçimi ve ekran görüntüleri hesap üzerinden tamamlanacak |
| Cihaz kabulü | Fiziksel iPad/Mac üzerinde mikrofon, kamera, kesilen bağlantı, geri yükleme ve silme doğrulaması |

## Apple'a girilecek içerikler

`app-store-metadata.json` açıklama, anahtar kelimeler, bağlantılar ve inceleme notunu içerir. Alanlar gerçek güncel pakete göre son kez karşılaştırılır. Parola ve hesap sahibinin kişisel irtibatı bu dosyada tutulmaz. Uygulama ücretsiz indirilir; kurum hesabı/sınav koduyla erişim sağlar. Bireysel satış için kurum istisnası varsayılmaz.

App Store Connect'te en son gözlenen durum: iOS ve macOS 1.0.0 Prepare for Submission; Türkçe metadata, Eğitim kategorisi, gizlilik URL'si ve elle yayın seçimi girilmişti. Dokuz veri kategorisi hazırlanmış fakat App Privacy yayımlanmamıştı. Bunlar önceki oturum gözlemleridir; bugünkü hesap durumu yeniden okunmalıdır.

## Güncel resmî kaynak kontrolü

4 Kasım 2026 tarihinde [Apple inceleme kuralları](https://developer.apple.com/app-store/review/guidelines/) okundu. 3.1.3(c) kurumlara doğrudan satışı bireysel satıştan ayırır. 5.1.2(i) AI dahil üçüncü tarafa kişisel veri paylaşımında bilgilendirme ve izin ister. Çocuk verisi kuralları ve Kids kategorisi ayrı değerlendirilir; veli onayı bunları kendiliğinden karşılamaz.

[Apple ekran görüntüsü ölçüleri](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications): iPad 13 inç için 2064×2752 / 2752×2064 veya 2048×2732 / 2732×2048; Mac için 16:10 oranında 1280×800, 1440×900, 2560×1600 veya 2880×1800. Boyutu doğru olan görselin içerik doğruluğu ayrıca incelenir.

## 404 düzeltmesi ve yeniden doğrulama

TestFlight build 13 sunucuda bulunmayan `/api/guardian-consent/status` adresini çağırıyordu. Sunucu ve şema güncellemesinden sonra yetkisiz istek HTTP 401, demo aday isteği HTTP 200 döndü. Yaş/veli koşulları atlanmadı. Sadece ayrı inceleme hesabı yetişkin olarak beyan edildi. `MINOR_PROCESSING_READY` açılmadı; çocuk hizmetinin sağlayıcı/sözleşme koşulları hâlâ yayın engelidir.

`preflight.py --source-only --online` başarılı. `--app-store` hâlâ `/privacy` ve `/terms` taslakları nedeniyle iki engel bildiriyor. Tarayıcı erişimi araç tarafından “Local browser use is disabled in Work settings” hatasıyla reddediliyor; Apple formları gönderilmiş sayılmaz.
