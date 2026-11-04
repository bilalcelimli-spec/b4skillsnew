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
6. İçeriklerin dağıtım haklarını doğrula. Kullanıcı 4 Kasım 2026 tarihinde tüm hakların kendilerine ait veya lisanslı olduğunu bildirdi; dayanak lisans kayıtları yayın dosyasında muhafaza edilmeli.
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

## Kullanıcı teyitleri — 4 Kasım 2026

- OpenAI API hesabında ZDR etkin olduğu kullanıcı tarafından teyit edildi. Bu, tarafımızdan hesap ayarı incelenerek doğrulandı anlamına gelmez; üretim projesi ve kullanılacak metin/ses uçlarının kapsamı ayrıca eşleştirilecek.
- Soru, görsel ve dinleme içeriklerinin kullanım ve dağıtım hakları kullanıcı tarafından teyit edildi.
- OpenAI yazma ve gerçek ses puanlama adaptörleri ana akışa bağlandı. Canlı model erişimi, kalibrasyon ve proje kapsamı doğrulaması bekliyor.

## OpenAI geçişi — uygulama durumu

Ana puanlama ve doğrudan konuşma puanlama ucu OpenAI adaptörüne bağlandı. Çok sağlayıcılı alternatif giriş noktası aynı OpenAI akışına yönlendiriliyor. Yazma Responses API, konuşma gerçek sesle Chat Completions kullanır; her iki istek `store:false` gönderir. Bu ayar ZDR onayı yerine geçmez. Ses dosyaları ffmpeg ile yerel bellek borularında WAV'a dönüştürülür; Docker çalışma imajına ffmpeg eklendi. Render'ın yerel Node ortamında ffmpeg kullanılabilirliği ayrıca doğrulanmalı. API anahtarı olmadığı için canlı sağlayıcı doğrulaması ve uzman puanlarıyla kalibrasyon yapılmadı. Üretim dağıtımı yapılmadı.

## Başvuru dosyası — son kontrol

Bu bölüm yükleme için hazırlanmış çalışma kaydıdır; üretime dağıtıldığı veya Apple’a gönderildiği anlamına gelmez.

| Alan | Hazır bilgi / yapılacak işlem |
| --- | --- |
| Uygulama | B4Skills, com.b4skills.assessment, Apple uygulama kimliği 6826695698 |
| Kategori / bölge | Eğitim; ilk dağıtım Türkiye |
| İnceleme hesabı | appreview@b4skills.com; ayrı demo kurumu, gerçek aday verisi yok. Parola özel yerel dosyada, depoda değil. |
| Destek / gizlilik | https://b4skills.com/support / https://b4skills.com/privacy; gizlilik metninin canlı sürümü ayrıca kontrol edilecek |
| İnceleme paketi | Yeni veli ve OpenAI akışını içeren güncel iPad/macOS arşivleri gerekli. Önceki build 12 bu değişiklikleri içermez. |
| Ekran görüntüleri | Güncel uygulamanın gerçek iPad ve Mac ekranları; test düzenekleri ve üretilmiş görseller kullanılmaz. |
| Yayın biçimi | İnceleme sonrası elle yayın; başarısız kontroller varken gönderim yapılmaz. |

### Apple inceleme notu — dağıtımdan sonra kullanılacak metin

B4Skills provides English language assessments for institutional candidates. It reports estimated CEFR-aligned levels and does not claim official CEFR accreditation. The app is free to download; assessment access is provided by the institution. There is no in-app purchase flow.

Use the dedicated review account supplied in the sign-in fields. It belongs to a demonstration institution and contains no real candidate records. Candidates can delete their own account in the app. Microphone access is used for speaking answers; camera access depends on the institution's disclosed proctoring configuration. Written answers and speech recordings are sent to OpenAI for assessment after the applicable permission flow. Minors require guardian approval and institutional verification of guardian authority before assessment access. Provider readiness must also be enabled; an email approval alone does not unlock an assessment. Scores may be challenged through support for human review.

Bu not ancak demo giriş, sınav tamamlama, hesap silme, mikrofon/kamera izinleri ve veli akışı yüklenen paket üzerinde tekrar doğrulandıktan sonra kaydedilir. İnceleme hesabı için geçici ayrıcalık veya güvenlik kontrollerini atlama eklenmez.

## Hukuki kapanış kaydı

| Konu | Kanıt / gerekli işlem | Durum |
| --- | --- | --- |
| İçerik hakları | Kullanıcının 4 Kasım 2026 teyidi; lisans/üretim belgelerini kurum arşivinde saklama | Kullanıcı teyit etti |
| OpenAI ZDR | Kullanıcı etkin olduğunu teyit etti; üretim proje kimliği ile metin/ses uçlarının kapsamını eşleştirme | Hesap üzerinden eşleştirme bekliyor |
| Veri işleme sözleşmeleri | OpenAI, barındırma, veritabanı/depolama, e-posta ve hata izleme için geçerli sözleşme sürümü, taraf, tarih ve alt işleyen listesi | Taslak sözleşme ve aktarım paketi hazır; hesap nüshaları/imzalar bekliyor |
| KVKK yurt dışı aktarımı | Her alıcı için veri sorumlusu/işleyen rolü ve uygun md. 9 mekanizması; standart sözleşme seçilirse doğru modül, imza ve bildirim kaydı | Tamamlanmadı |
| Veli onayı | Açıklama, ayrı veli iletişimi, kurum yetki kontrolü, geri çekme; onay aktarım mekanizmasının yerine geçmez | Kod hazır, canlı uçtan uca test bekliyor |
| Saklama ve silme | Veritabanı, özel medya, yedekler, AI/hata izleme ve insan değerlendirme kopyalarını kapsayan süre ve silme kanıtı | Üretim uygulaması doğrulanmadı |
| Hesap silme | Yanıt, rapor, insan incelemesi, geri bildirim ve ilgili günlük kopyaları silinir; özel dosyalar kalıcı kuyrukta yeniden denenir; yedek geri yüklemede silme defteri uygulanır | Kod ve yerel test hazır; üretim/yedek sağlayıcısı doğrulaması bekliyor |
| Hak talepleri | hello@b4skills.com; gerekli ölçüde kimlik doğrulama, başvuru kaydı, 30 gün içinde sonuçlandırma; otomatik puana itiraz ve insan incelemesi | Metin hazır; operasyon kaydı gerekli |
| App Privacy | Toplanan gerçek kategoriler ve alıcılar güncel paketle eşleştirilecek; nihai beyan yayımlanacak | Henüz yayımlanmadı |

ZDR, veri işleme sözleşmesi ve KVKK aktarım dayanağı birbirinin yerine geçmez. Standart sözleşme kullanılıyorsa imzaların tamamlanmasından itibaren beş iş günü içinde Kuruma bildirim gerekliliği ayrıca takip edilir. Resmî bildirim açıklaması: https://standartsozlesme.kvkk.gov.tr/sharedFolder/aydinlatma-metni.pdf

Apple üçüncü taraf AI’a kişisel veri paylaşımının açıklanmasını ve paylaşım öncesi açık izin alınmasını ister: https://developer.apple.com/app-store/review/guidelines/ (5.1.2).

## Bu doğrulama turundaki düzeltmeler

- Eski, metinden telaffuz puanlayan `/api/speaking/transcribe` yolu 410 ile kapatıldı. Etkin puanlama gerçek ses kullanan değerlendirme akışında kalır.
- Gizlilik metni OpenAI veri akışı ve veli kontrolüyle güncellendi. Çözülmemiş aktarım/saklama bağımlılıkları nedeniyle taslak işareti korunur.
- Rota denetimi, ara erişim kontrolünden sonra bağlanan veli yönlendiricisini de denetler.
- Sınav testlerine yeni yaş/veli önkoşulları eklendi. Sentetik onay verisi yalnızca adı doğrulanmış, yerel ve geçici test veritabanına yazılabilir.
- Kullanıcı OpenAI ve Xcode erişimlerini hazırlayacağını bildirdi; hazır olduğu henüz doğrulanmadı.

## Son yerel doğrulama sonucu

- TypeScript kontrolü başarılı.
- Veli kontrolü ve hesap silme: 27 test başarılı.
- Tarayıcı: 83 senaryo ilk turda başarılı; kalan 320px tam sınav senaryosu ayrı tekrarında başarılı (17,7 saniye). İlk turdaki ekran sıfırlanmasının nedeni kesinleştirilmedi; temiz CI çalışması ayrıca kontrol edilecek.
- Geçici localhost PostgreSQL üzerinde 40 gerçek HTTP senaryosu başarılı, başarısız senaryo yok. Yeni hesapların yaş/veli adımını atlayamaması ve geri çekilen onayın sınavı kapatması da doğrulandı.
- Bu sonuçlar gerçek OpenAI çağrısı, üretim e-posta teslimi, fiziksel Apple cihazı veya hukuki sözleşme doğrulaması değildir.

## Saklama ve silme kapanış turu — 4 Kasım 2026

[Sözleşme ve aktarım dosyası](legal/README.md), kurum veri işleme sözleşmesini, KVKK aktarım eklerini, değiştirilmemiş resmî SS-2/SS-3 formlarını ve saklama/silme işletim belgesini içerir. Bunlar imzalı sözleşme veya yapılmış bildirim değildir.

- Migration 015 kalıcı dosya silme kuyruğu, imha defteri ve saklama iş kayıtlarını; 016 kalıcı silme taleplerini ekler. Yalnız geçici yerel veritabanlarına uygulandı.
- Süreler: ses 30 gün (açık inceleme en fazla 60); kamera varsayılan 7, kurum ayarına göre en fazla 30; sınav kayıtları iki yıl. Hukuki muhafaza kayıtları otomatik silmeyi durdurur.
- Başarısız dosya silme tekrar denenir; S3 sürümleri de kapsanır. Eşzamanlı yükleme, puanlama ve sınav açılışı silinen içeriği geri getiremez. Önizleme varsayılandır; uygulama için sunucu ayarı ve politika sürümü gerekir.
- Yerel genel paket: 2.614 test geçti, 96 koşullu test atlandı, 2 yapılacak test kaydı var. Ayrıca yeni iki puanlama ve iki operasyon senaryosu geçti. Veritabanına bağlı sınav teslimi: 27 test geçti.
- Gerçek geçici PostgreSQL: 9 saklama/silme/geri yükleme/sayfalama testi ve 3 kamera yükleme hata-kurtarma testi geçti. S3 sürüm silme testleri genel pakete dahildir; gerçek S3 hesabı kullanılmadı.
- Mobil: 25 pakette 143 test ve TypeScript kontrolü geçti. Sunucu TypeScript kontrolü ve paketleme geçti.
- Güncellenen sunucu ve migration 015/016 ile gerçek HTTP sınav akışları yeniden çalıştırıldı: 40 senaryo başarılı.
- Canlı OpenAI, Apple yüklemesi, sağlayıcı yedek ömrü, gerçek geri yükleme tatbikatı, sözleşme kabul/imza/bildirim işlemleri bu sonuçlarla tamamlanmış sayılmaz. Üretimde saklama işi etkinleştirilmedi.

## GitHub ve canlı ön kontrol kapanışı

4 Kasım 2026: backend `775a6a8` için 16 GitHub kontrolü, native `d27ebfa` için 21 kontrol başarılı. Buna güvenlik taramaları, gerçek PostgreSQL HTTP akışları, tarayıcı testleri ve iPad/macOS release derlemeleri dahildir. Daha sonraki commitler ayrıca izlenir. İnceleme hesabıyla canlı giriş başarılı; gizlilik ve koşullar sayfaları taslak olduğu için App Store preflight iki engel bildiriyor. Kullanıcı Render OpenAI anahtarı ve Xcode girişinin hazır olduğunu teyit etti; Render bağlantısı bu oturumda henüz bağlı değil.

Canlı sağlayıcı denetimi için `scripts/audits/openai-provider-smoke.mjs` yalnız sentetik metin/ses ile iki gerçek API isteği yapar, veritabanına bağlanmaz, anahtar veya yanıt içeriği yazdırmaz. Servis ortamında `ALLOW_REAL_AI_SCORING_SMOKE=1 B4SKILLS_AI_SMOKE_AUDIO_PATH=/private/synthetic.wav node --import tsx scripts/audits/openai-provider-smoke.mjs` çalıştırılır. Gerçek İngilizce konuşma içeren, kişisel veri taşımayan WAV gerekir. Bağlantı testi ZDR sözleşme kapsamını veya psikometrik kalibrasyonu kanıtlamaz. Yerel tam kuyruk testi ayrıca `ai-scoring-smoke.mjs` ile yapılır; yeni onay kapısına uygun sentetik yetişkin izin kaydı eklenmiştir.
