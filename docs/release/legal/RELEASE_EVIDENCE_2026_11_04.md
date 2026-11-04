# 4 Kasım 2026 son doğrulama kaydı

Bu kayıt önceki “kullanıcı ZDR etkin dedi” bilgisini günceller. Bir yayın veya hukuki uygunluk onayı değildir.

## Doğrulanan durum

- OpenAI Platform oturumu açıldı. Görünen organizasyon Personal; veri saklama ekranında API call logging seçenekleri var, ZDR seçimi/onayı doğrulanamadı. Kullanıcı ZDR'nin nereden onaylandığını sordu. ZDR **doğrulanmadı** kabul edilir; eski kullanıcı teyidi devreye alma kanıtı değildir.
- BAA/HIPAA sözleşmesi kabul edilmedi. Bu, eğitim uygulamasının ZDR uygunluk başvurusunun yerine geçmez.
- Kullanıcı OpenAI, Render ve Supabase için imzalı aktarım sözleşmeleri/kabul yazılarının henüz olmadığını teyit etti. Mevcut belgeler taslak; imza ve KVKK bildirimi yapılmadı.
- Render B4Skills hizmeti main 691660b sürümünü çalıştırıyor. Kullanıcının anahtarı eklemesinden sonra dep-dblop4uk1f9s73enfqog yayını başarıyla tamamlandı. Web Shell kontrolünde OPENAI_API_KEY ve ffmpeg mevcut; OPENAI_PROJECT_ID tanımlı değil; MINOR_PROCESSING_READY ve RETENTION_APPLY_ENABLED etkin değil. Sentetik yazma testi gpt-6-astra ile geçti. Konuşma ilk denemede SyntaxError verdi; sonraki beş denemede gpt-audio-1.5 ile geçti. İlk başarısız yanıt saklanmadığı için kök neden kesin olarak belirlenemedi. Tam JSON nesnesini saran Markdown kod bloğunu kabul eden, eksik/çoklu/bozuk çıktıları reddeden ve ayrıştırma hatasında aday metnini açığa çıkarmayan koruma eklendi. Bu sonuç ZDR veya puan kalibrasyonu kanıtı değildir. Gizli değerler okunmadı veya kopyalanmadı.
- Altı test dosyasında 55/55 test geçti, atlanan test yok: veli akışı 18 birim + 9 PostgreSQL; hesap silme 9; saklama/silme 9 PostgreSQL; OpenAI yazma 5 + konuşma 5 birim testi. Ayrı yerel PostgreSQL kullanıldı. OpenAI testlerinde sağlayıcı taklidi kullanılır; bu sonuç canlı API bağlantısı veya ZDR kanıtı değildir.

- PR #87, 6122bf0 sürümünde 16/16 GitHub kontrolünü geçti. Bu CI sonucu eksik üretim sırrını veya gerçek silme uygulamasını doğrulamaz.

Son ek korumalarla sekiz test dosyasında 74/74 test geçti, atlanan test yok. Yeni testler eski bildirim sınıflandırmasını, eksik/bozuk ses modeli çıktısının reddini ve JSON kod bloğunda puan kanıtlarının doğrulanmasını kapsar.

## Üretim saklama önizlemesi

Üretim veritabanına salt okunur kuru çalışma uygulandı; silme yapılmadı. Bir sayfada tarama tamamlandı: 32 kamera, 10 kimlik fotoğrafı, 17 ses kaydı uygun; iki yılı dolmuş oturum yok; ilk taramada 33 hata, hukuki muhafaza sayısı sıfır; aşağıdaki düzeltmeden sonra hata sayısı sıfır. Bu sayılar kayıt kapsamlarını gösterir, tekil kişi sayısı değildir.

Kaynak geçmişi ve üretim kayıt zamanları birlikte incelendi. ProctoringMonitor, dosya yükleme isteğinden bağımsız olarak reason/timestamp içeren yakalama girişimi olayını gönderiyordu. 32 kaydın şekli tam olarak bu bildirimle eşleşiyor; tarihler 27 Mayıs–19 Eylül 2026. server.ts 020c9f9 sürümünde frameLength/capturedAt/reason kaydını oluşturuyor ancak dosya kaydetmiyordu; aa0baff sürümü 29 Eylül'de gerçek depolamayı ekledi. Tek frameLength kaydı 28 Eylül'e ait.

Bu 33 eski bildirim tam anahtar kümesi, tür ve tarih sınırı kontrolüyle OTHER olarak yeniden sınıflandırıldı; metaveri ve zamanlar değiştirilmedi, dosya silinmedi. Özel 0600 geri alma kopyası oluşturuldu. Script: scripts/jobs/reclassify-legacy-screenshot-notices.ts; varsayılanı önizleme, --restore geri alır. Yeni veya ek alanlı kayıtlar, evidenceKey/reference içeren gerçek medya bu sınıflandırmaya alınmaz. Koruyucu eksik referans denetimi kaldırılmadı.

Düzeltme sonrası 4 Kasım 20:12 UTC üretim önizlemesi: 32 kamera, 10 kimlik, 17 ses, 0 oturum; **0 hata**, tam tarama. Bu önizleme gerçek dosyaların veya yedeklerin silindiği anlamına gelmez.

GitHub Data Retention çalışması 41893378790, APP_URL ve INTERNAL_API_SECRET boş olduğu için başarısız. APP_URL production ortamında kayıtlıyken iş bu ortamı seçmiyordu; workflow production ortamına bağlandı. INTERNAL_API_SECRET hâlâ yetkili işletim kurulumu gerektiriyor. İşi yeşile çevirmek için atlama veya sahte başarı eklenmedi. Sağlayıcı yedek süresi, geri yükleme tatbikatı ve üretimde uygulama ayrı açık işlerdir.

## Mağaza ve cihazlar

Apple yaş anketi 9+ kaydedildi. Tütün referanslı dört soru RETIRED; kullanıcı verileri silinmedi. Mac build 13 üzerinde demo giriş, General English ön koşul, dört beceri ve destek ekranları görüldü. Üç gerçek Mac pencere görüntüsü kullanıcı onayıyla standart araçlarla 2560×1600 ölçüsüne hazırlandı ve görsel olarak incelendi. Apple yüklemesi başlatıldı; Mac kilitlendiğinden yüklemenin/kaydetmenin tamamlanması henüz doğrulanmadı. iPad simülatörü başlatıldı; cihaz etkileşimi güvenilir biçimde doğrulanamadığından iPad kabulü veya mağaza ekran görüntüsü tamamlandı denmez. Fiziksel iPad testi de açık.

## Kapanış koşulları

1. OpenAI ZDR başvurusu ve üretim organizasyon/proje/uç kapsamının yazılı onayı.
2. Sağlayıcı DPA/aktarım dosyaları, gerçek roller, yetkili imzalar ve gerekiyorsa bildirim alındısı; kurum sözleşmelerindeki karşı taraf bilgileri.
3. Canlı yazma/ses bağlantısı doğrulandı; yanıt ayrıştırma korumasının üretime alınması ve ölçme doğruluğu doğrulaması açık.
4. Eski 33 bildirim düzeltildi; yedekler ve zamanlanmış silme kurulumu/gerçek uygulama kanıtı halen açık.
5. Mağaza boyutlarında iPad/Mac ekranları ve cihaz kabul testleri.

Bu koşullar kapanmadan MINOR_PROCESSING_READY açılmaz, hukuki taslak etiketleri kaldırılmaz, App Privacy uygunluk taahhüdü veya inceleme başvurusu gönderilmez.

Kaynaklar: [OpenAI veri kontrolleri](https://developers.openai.com/api/docs/guides/your-data), [18 yaş altı rehberi](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance), [KVKK bildirim duyurusu](https://www.kvkk.gov.tr/Icerik/8043/Standart-Sozlesme-Bildirim-Modulu-Hakkinda-Kamuoyu-Duyurusu).
