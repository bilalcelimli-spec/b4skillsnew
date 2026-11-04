# 4 Kasım 2026 son doğrulama kaydı

Bu kayıt önceki “kullanıcı ZDR etkin dedi” bilgisini günceller. Bir yayın veya hukuki uygunluk onayı değildir.

## Doğrulanan durum

- OpenAI Platform oturumu açıldı. Görünen organizasyon Personal; veri saklama ekranında API call logging seçenekleri var, ZDR seçimi/onayı doğrulanamadı. Kullanıcı ZDR'nin nereden onaylandığını sordu. ZDR **doğrulanmadı** kabul edilir; eski kullanıcı teyidi devreye alma kanıtı değildir.
- BAA/HIPAA sözleşmesi kabul edilmedi. Bu, eğitim uygulamasının ZDR uygunluk başvurusunun yerine geçmez.
- Kullanıcı OpenAI, Render ve Supabase için imzalı aktarım sözleşmeleri/kabul yazılarının henüz olmadığını teyit etti. Mevcut belgeler taslak; imza ve KVKK bildirimi yapılmadı.
- Render B4Skills hizmeti main 691660b sürümünü çalıştırıyor. Kullanıcının anahtarı eklemesinden sonra dep-dblop4uk1f9s73enfqog yayını başarıyla tamamlandı. Web Shell kontrolünde OPENAI_API_KEY ve ffmpeg mevcut; OPENAI_PROJECT_ID tanımlı değil; MINOR_PROCESSING_READY ve RETENTION_APPLY_ENABLED etkin değil. Sentetik yazma ve kamusal, yazılmış TTS ses örneğiyle sağlayıcı testi başlatıldı; Mac kilitlendiği için sonuç okunamadı, başarı iddia edilmez. Gizli değerler okunmadı veya kopyalanmadı.
- Altı test dosyasında 55/55 test geçti, atlanan test yok: veli akışı 18 birim + 9 PostgreSQL; hesap silme 9; saklama/silme 9 PostgreSQL; OpenAI yazma 5 + konuşma 5 birim testi. Ayrı yerel PostgreSQL kullanıldı. OpenAI testlerinde sağlayıcı taklidi kullanılır; bu sonuç canlı API bağlantısı veya ZDR kanıtı değildir.

- PR #87, 6122bf0 sürümünde 16/16 GitHub kontrolünü geçti. Bu CI sonucu eksik üretim sırrını veya gerçek silme uygulamasını doğrulamaz.

## Üretim saklama önizlemesi

Üretim veritabanına salt okunur kuru çalışma uygulandı; silme yapılmadı. Bir sayfada tarama tamamlandı: 32 kamera, 10 kimlik fotoğrafı, 17 ses kaydı uygun; iki yılı dolmuş oturum yok; 33 hata, hukuki muhafaza sayısı sıfır. Bu sayılar kayıt kapsamlarını gösterir, tekil kişi sayısı değildir.

Hata incelemesi 33 SCREENSHOT olayında dosya referansı olmadığını gösterdi. 32 olayın metaverisi yalnız reason/timestamp; bir olayınki reason/capturedAt/frameLength alanlarından oluşuyor. Bu, dosyanın hiç oluşturulmadığını veya başka bir yerde bulunmadığını kanıtlamaz. Dosya referansı uydurulmadı, olaylar “silindi” diye işaretlenmedi ve koruyucu hata bastırılmadı. Kaynak sürüm/yükleme günlükleri ile depolama envanteri eşleştirilerek çözülmeli.

GitHub Data Retention çalışması 41893378790, APP_URL ve INTERNAL_API_SECRET boş olduğu için başarısız. APP_URL production ortamında kayıtlıyken iş bu ortamı seçmiyordu; workflow production ortamına bağlandı. INTERNAL_API_SECRET hâlâ yetkili işletim kurulumu gerektiriyor. İşi yeşile çevirmek için atlama veya sahte başarı eklenmedi. Sağlayıcı yedek süresi, geri yükleme tatbikatı ve üretimde uygulama ayrı açık işlerdir.

## Mağaza ve cihazlar

Apple yaş anketi 9+ kaydedildi. Tütün referanslı dört soru RETIRED; kullanıcı verileri silinmedi. Mac build 13 üzerinde demo giriş, General English ön koşul, dört beceri ve destek ekranları görüldü. Üç gerçek Mac pencere görüntüsü kaydedildi; 2560×1640 özgün görüntüler mağaza yükleme ölçüsünde değildir. iPad simülatörü başlatıldı; cihaz etkileşimi güvenilir biçimde doğrulanamadığından iPad kabulü veya mağaza ekran görüntüsü tamamlandı denmez. Fiziksel iPad testi de açık.

## Kapanış koşulları

1. OpenAI ZDR başvurusu ve üretim organizasyon/proje/uç kapsamının yazılı onayı.
2. Sağlayıcı DPA/aktarım dosyaları, gerçek roller, yetkili imzalar ve gerekiyorsa bildirim alındısı; kurum sözleşmelerindeki karşı taraf bilgileri.
3. Anahtar ve ses dönüştürücü doğrulandı; başlatılan sentetik metin/ses canlı testinin sonucu henüz doğrulanmadı.
4. Eski 33 medya referansı, yedekler ve zamanlanmış silme kurulumu/gerçek uygulama kanıtı.
5. Mağaza boyutlarında iPad/Mac ekranları ve cihaz kabul testleri.

Bu koşullar kapanmadan MINOR_PROCESSING_READY açılmaz, hukuki taslak etiketleri kaldırılmaz, App Privacy uygunluk taahhüdü veya inceleme başvurusu gönderilmez.

Kaynaklar: [OpenAI veri kontrolleri](https://developers.openai.com/api/docs/guides/your-data), [18 yaş altı rehberi](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance), [KVKK bildirim duyurusu](https://www.kvkk.gov.tr/Icerik/8043/Standart-Sozlesme-Bildirim-Modulu-Hakkinda-Kamuoyu-Duyurusu).
