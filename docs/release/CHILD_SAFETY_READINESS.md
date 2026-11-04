# Çocuk kullanıcı ve yayın hazırlığı — 4 Kasım 2026

Durum: yayın için hazır değil. Bu belge hukuki uygunluk belgesi veya tamamlanmış sözleşme değildir.

## Uygulanan kontroller

- Yaş grubu beyanı; küçük yaştan yetişkine kendi kendine geçiş engeli.
- Bilinen çocuk sınav kodlarında yetişkin beyanının veli kontrolünü atlamaması.
- 48 saatlik, yalnız özeti saklanan, tek kullanımlık veli bağlantısı.
- Ayrı veli e-postası, açık beyan, kurum tarafından veli yetkisi doğrulaması.
- Kurumlar arası erişim sınırı; doğrulamada onay zamanının eşleşmesi.
- Geri çekme, eski politika onayının yenilenmesi ve hesap silmede veli bilgilerinin silinmesi.
- Sınav, ses, kamera, devam eden oturum ve sıradaki AI işleri için sunucu kontrolü.
- `MINOR_PROCESSING_READY` varsayılan olarak kapalıdır. Kapalıyken çocuk sınavı, veli e-postası ve yeni onay kabulü engellenir. Bu ayar bir sözleşmenin veya sağlayıcı onayının yerine geçmez.

## Yayından önce tamamlanacak gerçek bağımlılıklar

1. Puanlamanın tüm etkin yollarını OpenAI'a taşı; Gemini/Claude geri dönüşlerini kaldır. Konuşma telaffuzunu yalnız metin üzerinden puanlama. Model, rubrik ve politika sürümünü sonuçla kaydet.
2. OpenAI projesinde çocuk verisi için gereken ZDR uygunluğunu ve kullanılan metin/ses hizmetlerinin kapsamını hesap üzerinden doğrula. `store:false` tek başına ZDR değildir.
3. Sağlayıcı sözleşmelerini, gerçek saklama ayarlarını ve KVKK yurt dışı aktarım mekanizmasını tamamla. Kullanıcı mevcut belge bulunmadığını bildirdi. Hiçbir sözleşme imzalanmış veya bildirim yapılmış sayılmadı.
4. Gizlilik/veli metinlerini nihai OpenAI veri akışına göre güncelle; mevcut Google/Anthropic açıklaması geçişten sonra kullanılmamalı. Veli onay sürümünü artır.
5. Saklama işlerini canlıya almadan önce kapsam ve silme sonuçlarını doğrula. Yazılı yanıtlar kişisel bilgi içerebilir; hesap kimliğini kaldırmak tek başına anonimleştirme değildir.
6. İçeriklerin dağıtım haklarını doğrula. Hak beyanı henüz alınmadı.
7. OpenAI puanlarını uzman referanslarıyla karşılaştır; maliyet, gecikme, aksan ve yaş grubu etkilerini ölç. Gerçek çocuk verisini sağlayıcı hazırlığı tamamlanmadan test için gönderme.
8. Veritabanı geçişini ve web/native sürümlerini birlikte yayınla; veli e-postasının gerçek teslimini uçtan uca doğrula.
9. Xcode hesap erişimini düzelt; güncel paketleri, gerçek ekran görüntülerini ve inceleme hesabını App Store Connect'e ekle. Gizlilik yayını, yaş derecelendirmesi ve içerik hakları alanlarını tamamla.

## Hesap ve mevcut yayın

`appreview@b4skills.com` ayrı deneme kurumunda oluşturuldu; üretim giriş yanıtı 200 olarak doğrulandı. Parola depoya eklenmedi; yerel özel dosyada saklanıyor. App Store başvurusu gönderilmedi. Veli akışı henüz canlıya dağıtılmadı.

## Resmî kaynaklar

- https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance
- https://developers.openai.com/api/docs/guides/your-data
- https://ai.google.dev/gemini-api/terms
- https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim
- https://developer.apple.com/app-store/review/guidelines/
