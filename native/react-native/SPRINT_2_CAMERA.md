# Sprint 2 — Kamera, sürekli yüz sayımı ve şifreli fotoğraf kuyruğu

24 Ekim 2026. İsteğe bağlı kurum pilotu. Canlı insan gözetmeni, ortam sesi kaydı, kişi eşleştirme ve otomatik ihlal kararı yoktur. Bu rapor önceki kamera kesitinin durumunu günceller; tüm güvenli sınav modunun tamamlandığı anlamına gelmez.

## Sürekli yüz sayımı

Aday kamerayı açınca AVFoundation video çıkışı üzerinde Vision yüz sayımı saniyede en fazla bir kez çalışır. Ham video kareleri diske yazılmaz veya gönderilmez. Kamera açık kaldığı sürece sayım sürer; fotoğraf çekimi kamerayı durdurur, sayımı sürdürmek için aday yeniden açar.

- Kesintisiz **5 saniye sıfır yüz**, **3 saniye birden fazla yüz** gözlem üretir. Tek yüz geri geldiğinde süre sıfırlanır; aynı gözlem türünde 30 saniye tekrar sınırı vardır. Sürekli aynı durumda olay yağmuru oluşmaz.
- 2,5 saniyeden büyük örnek aralığı süreyi baştan başlatır. Vision hatası sıfır yüz sayılmaz. 3,5 saniye kare gelmezse arayüz ölçümü belirsiz gösterir. Eski saat örnekleri ve önceki kamera açılışına ait `runId` atılır.
- `FACE_NOT_DETECTED` / `MULTIPLE_FACES` olayları mevcut dayanıklı teknik olay kuyruğundan **INFO** olarak gider. Native protokol etiketi nedeniyle güven/risk puanını etkilemez; inceleme ekranında teknik gözlemdir.
- Arka plan, kapanış, ekranın kaldırılması veya medya sahipliği kaybı kamerayı durdurur. iPad video/fotoğraf çıkışı cihaz yönüne göre dik tutulur; önizleme yerleşimi de yönü izler. Fiziksel cihazda dönüş kabulü ayrıca gereklidir.

İlgili kaynaklar: `modules/b4-native/apple/B4Native.m`, `src/proctoring/faceMonitor.ts`, `useCameraEvidence.ts`, `useProctoringEvents.ts`.

## Şifreli dayanıklı fotoğraf kuyruğu

Akış: kamera → fotoğraf → yalnız cihazda önizleme/yüz sayısı → **Fotoğrafı onayla ve gönder** → şifreli atomik kayıt → rezervasyon → private yükleme/DB commit → doğrulanmış sunucu ACK → yerel kaydı kaldırma.

Onaylanmamış fotoğraf yalnız bellektedir. Onaylı fotoğraf backend adresi + aday UID kapsamında saklanır; uygulama yeniden açıldığında aynı hesapla teslim sürer. Kuyruk kamera kartından bağımsız olarak girişte yüklenir; soru geçişinde veya pilot kartı kapandığında kaybolmaz.

- Apple tarafında AES-256-CBC + HMAC-SHA256 **encrypt-then-MAC** zarfı: her yazmada yeni rastgele IV; kapsam kimliği de MAC kapsamındadır. MAC doğrulanmadan çözülmez. 64 bayt rastgele anahtar Keychain'dedir; fotoğraflar Keychain'e konmaz.
- Application Support içinde yalnız şifreli dosya; klasör 0700, dosya 0600, yedeklemeye kapalı. iPad dosyası ve anahtarı ilk kilit açılışından sonra erişilebilir; anahtar başka cihaza taşınmaz. macOS anahtarı uygulamanın Keychain erişimine bağlıdır.
- Eksik anahtar, bozuk MAC, yanlış kapsam, geçersiz JSON veya boyut aşımı görünür hata verir; mevcut dosyanın üzerine yazılmaz. “Kuyruk boş” diye yorumlanmaz.
- En fazla dört fotoğraf, JSON en fazla 5,5 MB; native zarf ayrıca 6 MB sınırını denetler. Dolu kuyruk eski kaydı sessizce atmaz. Aday bekleyen kaydı cihazdan silebilir; başlamış bir sunucu teslimini geri alma anlamına gelmez.
- Kaydetmeden gönderim başlamaz. Kayıp ACK veya yerel ACK kaydı hatasında aynı UUID/fotoğraf yeniden denenir. Yerel kayıt yalnız doğrulanmış sunucu yanıtı ve başarılı disk yazması sonrasında kaldırılır.
- Geçici hatalar 10–60 saniye aralıkla yeniden denenir. Süre dolması, kalıcı ret ve oturum kotası ayrı görünür durumlara dönüşür; sonsuz kota denemesi yapılmaz. Hesap kirası sona ermişse yeni gönderim/commit başlamaz; o sırada gelen ret eski hesabın kuyruğunu kalıcı hataya düşürmez.
- Sunucu süreleri genişletilmedi: yeni rezervasyon çekimden sonraki 10 dakika içinde, ilk yükleme rezervasyonun 10 dakikalık süresinde olmalı. Önceden commit edilmiş fotoğrafın kayıp ACK'i daha sonra aynı UUID ile kurtarılabilir; bu yüzden yalnız cihaz saatiyle eski kaydı silmiyoruz. Kalıcı başarısız yerel fotoğraf aday silene kadar şifreli kalır.

İlgili kaynaklar: `B4PhotoVault.h`, `photoQueue.ts`, `usePhotoQueue.ts`, `CameraEvidenceCard.tsx`, `App.tsx`.

## Sunucu ve pilot sınırları

`Organization.settings.nativeCameraPilot = {"enabled":true,"retentionDays":7}`; varsayılan kapalı, saklama 1–30 gün. Strict v1 rezervasyon/commit; JPEG en fazla 1 MB ve 1280 piksel, native yeniden kodlama en fazla 1024 piksel. Sunucu SHA/byte/JPEG doğrular ve metadatayı temizleyerek yeniden kodlar. İstemcinin yüz sayısı beyanı attestation değildir.

Deterministik `evidence_<uuid>` DB kimliği, immutable `native/<session>/<uuid>.jpg` private obje. Aynı kimliğin farklı içerikle kullanımı 409; oturum başına toplam üç rezervasyon. Aday yalnız kendi oturumuna gönderir; görüntüleme yetkili kurum inceleyicisindedir, public URL yoktur. Saklama süresi sonrası erişim 410.

`npm run evidence:expire` varsayılan kuru çalışmadır; `-- --apply` süresi dolmuş native kanıtları işler. Üretimde otomatik işletim takvimi ayrıca kurulmalıdır. Migration, müşteri ayarı veya gerçek müşteri kanıtı değiştirilmedi.

Zorunlu sınav öncesi fotoğraf kapısı ve fiziksel cihaz kabulü tamamlanmadığı için `ClientCapabilities.cameraEvidence` hâlâ **false**. `monitored` / `secure` sessizce açılmaz.

## Doğrulama

- **94/94 native Jest**, 13 dosya; süre eşikleri, örnek kesintisi, eski kamera örnekleri, arka plan, açık onay, disk hatası, uygulama yeniden oluşturma, kayıp ACK, eşzamanlı drain, kota, hesap değişimi ve rezervasyon sonrası iptal kapsanır. Native TypeScript temiz.
- **43/43 backend/izole PostgreSQL**, 5 dosya; rezervasyon yarışı, immutable upload, DB commit hatası, ACK, yetki, süre, kota, JPEG/SHA ve nötr risk puanı kapsanır.
- `npm run test:photo-vault`: uygulamanın kullandığı **aynı Objective-C zarf kodu** ile farklı IV, doğru çözme, her baytta tahrifat, yanlış hesap/anahtar, kesik veri, 0–1 MB sınırları ve 6 MB üstü ret geçti. Bu CLI testi iPad Keychain erişim testi olarak sunulmaz.
- `npm run e2e:camera-queue`: **gerçek Supabase + mevcut sentetik QA hesabı + sentetik 2×2 JPEG**. Sunucu commit'inden sonra ağ yanıtı kaybı, şifreli disk adaptöründen yeni kuyruk oluşturma ve eşzamanlı tekrar tek olay/private obje olarak geçti. İki sentetik yüz gözlemi INFO kaydedildi. Değişmiş SHA 409; anonim 401; adayın kanıt okuması/başka oturuma erişimi 403. Oturum/kredi tüketimi yok. **Bu CLI adaptörü Node AES-GCM kullanır; native Apple depolama adaptörü değildir.** Sonuç: `/tmp/b4skills-realdb-validation/sprint2-camera-queue-result.json`.
- iPad simülatörü ve macOS uygulamasında gerçek native depo dosyası oluştu: `B4P1`, 148 baytlık boş kuyruk zarfı, 0600, açık JSON yok. Her iki uygulama kapatılıp yalnız bu boş QA zarfında bir bayt değiştirildi. Yeniden açılışta dosya doğrulanamadı hatası görüldü, bozuk dosya korunup üzerine yazılmadı. Yedek özgün baytlar geri yüklendi. İnsan fotoğrafı diske kaydedilmedi veya gönderilmedi. Bu testler dolu native fotoğraf kuyruğunun fiziksel cihaz uçtan uca kabulü olarak sunulmaz.
- iPad derleme kuruldu/açıldı; hesap ve oturum korundu. Kamera pilotu, açıklama ve kontroller göründü. Kamera bulunmaması açık hata verdi ve sınav sorusu korundu. Bu hatadan sonra bir yanıt gerçek veritabanına kaydedildi ve sonraki soru açıldı (1 yanıt). **Simülatör gerçek yüz sayımı yapamaz.** Fiziksel iPad kabulü açık.

macOS son derlemede gerçek önizleme, sürekli **1 yüz** sayımı, fotoğraf çekimi/önizlemede **1 yüz**, tekrar açma ve kapatma donanımda geçti. İnsan fotoğrafı gönderilmedi; onaylanmamış görüntü yeniden çekme ile temizlendi. Çekimde bulunan native çökme, aşağıdaki video-kare çözümüyle düzeltildi. iPad ve macOS son Debug derlemeleri ve imzaları doğrulandı; normal uygulamalar geri yüklendi. Gerçek arka plan geçişini UI aracıyla güvenilir üretme denemesi sonuç vermedi; otomatik geçiş kabulü yalnız hook testleriyle, arka planda açılışın reddi ise native UI ile doğrulandı.

## QA oturumları ve kalan kabul

Önceki kısmi iPad oturumu 26, Mac oturumu 35 yanıtla süre sınırında sunucu tarafından COMPLETED durumuna geçti; bunlar baştan sona yanıtlanmış sınav değildir. Yeni iPad QA oturumu `cmvm5fgr40009uvlg24k2gf4r`; iPad yeniden açılışları bu oturumu korudu. Yeni Mac QA oturumu `cmvm5tipc000duvlgq9polv6o`; bu turda iki platform için toplam iki QA kredisi kullanıldı.

Kalan kabul: Mac sıfır/çoklu yüz akışının farklı gerçek koşullarda ölçülmesi; fiziksel iPad kamera/yön/arka plan kontrolü; gerçek kamera fotoğrafıyla uzun kesinti ölçümü; uzun oturum, düşük ışık ve erişilebilirlik ölçümleri. Sonraki ürün teslimleri: zorunlu fotoğraf/kredi kapısı, kurum uyarlama kuralları ve otomatik saklama işletimi.


### Gerçek çekimde bulunan macOS çökmesi

Kamera izinlerinden sonra yeni Mac QA oturumu açıldı. `B4Skills-2026-10-24-115422.ips` raporu (yakalama 11:52:39 +03) fotoğraf çekiminde `AVCapturePhotoOutput_Tundra capturePhotoWithSettings:delegate:` Objective-C istisnasını doğruladı. Önceki 10:46 gözleminin raporu da aynı yolu gösteriyor. Bu, genel bir pencere zaman aşımı olarak kapatılmadı.

Mac'te bu still-capture yolu kaldırıldı: aday çekim istediğinde mevcut video çıkışının bir BGRA karesi sahipliği kopyalanarak JPEG'e çevrilir, ardından ortak 1024 piksel / SHA / Vision işleme hattına girer. Aynı kameradan ikinci bir still-photo çıkışı açılmaz. Kamera açılış kimliği ve çıkış kimliği eski karelerin yeni çekimi tamamlamasını engeller; kare gelmezse mevcut 15 saniyelik süre sınırı ve kamera kapatma çalışır. iPad still capture istisnası da uygulamayı kapatmak yerine görünür hataya çevrilir.

`npm run test:photo-vault` artık uygulamanın **aynı `B4FramePhoto.h` kodunu** sentetik BGRA pixel buffer ile de çalıştırır: gerçek JPEG decode, ölçüler, buffer serbest bırakıldıktan sonra verinin sahipliği, konum/çekim yorumu metadatası bulunmaması ve yanlış pixel formatı reddi geçti. Gerçek çekim tekrarı ve son derleme aşağıdaki kapanış notunda kaydedilir.


### İki platformda dolu native kuyruğun yeniden başlatma testi

`photo-queue-harness.tsx`, yalnız geçici kopyalarda ayrı giriş noktasıdır; `index.js` tarafından içe alınmaz. Mevcut QA oturum çerezleriyle yalnız sabit QA kurumu ve bu koşunun iki oturumuna izin verir. İnsan fotoğrafı, parola veya veritabanı sırrı içermez. Normal uygulamaya test düğmesi/arka kapı eklenmedi.

Her platformda şu akış gerçekten çalıştırıldı:

1. Uygulama içindeki gerçek `PhotoQueue` + `B4Native.photoWrite` ile sentetik JPEG onaylı test girdisi olarak kaydedildi. Gönderim adaptörü çevrimdışı hata verdi. UI bekleyen kaydın şifreli saklandığını gösterdi.
2. Native Apple deposunda **1236 bayt, B4P1, 0600** dosya oluştu; açık base64 bulunmadı. Bu aşamada sunucuda o UUID için **sıfır** kanıt kaydı olduğu doğrulandı.
3. Test uygulaması kapatıldı. Normal imzalı uygulama tekrar açıldı; aynı Keychain anahtarıyla mevcut kuyruk okundu. iPad'de test kopyası normal Xcode derlemesiyle değiştirilirken veri ve simülatör uygulama kimliği korundu.
4. Normal uygulama tek `SCREENSHOT` ve tek deterministic private JPEG teslim etti. Üst harfli native UUID ile sunucunun küçük harfli olay kimliği eşleşmesi de geçti. ACK sonrası native dosya **148 baytlık boş şifreli kuyruk** oldu.

Kanıtlar: `/tmp/b4skills-realdb-validation/macos-native-photo-queue-proof.json`, `ipad-native-photo-queue-proof.json`. Bu test Node depolama adaptörü kullanmaz; iki gerçek native modül, Apple dosya/Keychain depolaması, uygulama sonlandırma ve normal uygulamadan gerçek Supabase teslimi kapsanır. Sentetik girdideki `faceCount: 1` bir test sözleşmesidir; yüz algılama doğrulaması değildir.

Yeniden üretim: önce normal native derlemeyi alın/imzalayın; native klasöründe `npm run e2e:queue-harness -- macos` veya `-- ipad` geçici kopyayı üretir. UI/lifecycle adımları sonrası özel proof dosyasıyla `npm run e2e:verify-native-queue -- macos after` / `ipad after` DB ve private objeyi denetler. Sabit QA oturumları kapalıysa harness güvenli hata verir; yeni oturum/kredi kendiliğinden açılmaz. Normal derlemeler test giriş noktası içermez. Geçici `.app` kopyaları testten sonra kaldırılır.

Mac'te bir `/next` yüklemesi geçici bağlantı hatası verdi; aynı soruyu yeniden getirme düğmesiyle mevcut soru geri geldi. Yanıt POST'u tekrar edilmedi, ek kredi/oturum açılmadı.

Dolu native kuyrukla yeniden başlatma kabulü **sentetik görselle her iki platformda geçti**. Bu ara nottan sonraki Mac tek-yüz/çekim kabulü aşağıdaki son kapanışta tamamlandı. Fiziksel iPad kamera/yön akışı açık kalır. Kamera arka planda açılmaya çalışıldığında güvenli biçimde durdu ve geri dönüp yeniden deneme mesajı görüldü; bu koruma testi başarılı gerçek yüz sayımı olarak yazılmadı.


### Son kapanış — gerçek Mac kamera kabulü

Son native derlemede Mac kamerası ön planda açıldı; canlı önizlemede **“Sürekli yüz sayımı açık · Görünen yüz: 1”** görüldü. Gerçek çekim tamamlandı; JPEG önizlemesi ve **“Görünen yüz sayısı: 1”** gösterildi, uygulama kapanmadı. Tundra çökmesine yol açan still-capture yolunun kaldırılması bu donanımda tekrar kontrol edildi.

“Fotoğrafı onayla ve gönder”e basılmadı. İnsan fotoğrafı sunucuya gönderilmedi ve dosyaya ekran görüntüsü kaydedilmedi. “Yeniden çek” ile onaylanmamış görüntü temizlendi, kamera tekrar açıldı; “Kamerayı kapat” ile önizleme kaldırıldı. Son durumda yalnız “Kamerayı aç” var; onaylanmamış fotoğraf/çekim önizlemesi kalmadı. Backend ve native boş kuyruk kontrolü, bu Mac oturumundaki tek kanıtın hâlâ önceden doğrulanan **sentetik fixture** olduğunu gösterdi.

macOS'ta kamera testi sonrası bir yanıt gerçek backend'e kaydedildi; iPad ve Mac yeni QA oturumları **birer yanıtla IN_PROGRESS**. Bu koşu tüm sınavın tamamlandığı iddiası değildir. Kamera açıkken başka uygulamayı otomasyonla öne alma denemesi güvenilir bir gerçek uygulama geçişi üretmedi; bu deneme başarılı arka plan geçişi diye raporlanmadı. Arka planda açılışın reddi native UI'de, geçişte kapanma ve eski callback'lerin atılması deterministik hook testlerinde doğrulandı. Gerçek Mac tek-yüz sayımı, çekim, tekrar açma ve kapatma donanımda geçti. Sıfır/çoklu yüz süreleri sentetik testlerle doğrulandı; farklı gerçek kişi/ışık ve fiziksel iPad kabulü ayrıca gereklidir.

İki platformun son Debug derlemesi ve imzaları doğrulandı; normal uygulamalar geri yüklendi, geçici `.app` kopyaları kaldırıldı ve normal bundle'larda harness giriş noktasının bulunmadığı denetlendi. Toplu kanıt: `/tmp/b4skills-realdb-validation/sprint2-continuous-validation.json`. Geçici QA kamera ayarı eski değerine döndürüldü; saklama işlemi müşteri verisinde çalıştırılmadı.
