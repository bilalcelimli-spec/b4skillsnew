# İlk sprint: otomatik gözetim temeli

24 Ekim 2026. Canlı görüntülü insan gözetmeni kapsam dışı. Teknik olayların sonradan yetkili incelemesi korunur; otomatik sinyaller tek başına adayın başarısız sayılmasına yol açmaz.

## Uygulanan dikey kesit

- `GET /api/assessment/policy`: kimliği doğrulanmış kullanıcının gerçek kurumundan sürümlü politika; URL ile kurum seçilemez; yanıta `no-store` uygulanır.
- Kurum ayarı `Organization.settings.nativeExamPolicy`: `{mode: 'standard'|'monitored'|'secure', enforcePreflight?: boolean, lifecycleEvents?: boolean}`. Bilinmeyen/bozuk yapılandırma hata verir. Canlı insan seçeneği yoktur.
- Varsayılan standart profil mevcut web istemcileriyle uyum için ön kontrolü zorunlu kılmaz ve yaşam döngüsü olayı toplamaz. Native yeni sınavda her zaman kontrol ve açıklama onayı ister. `lifecycleEvents:true` veya daha güçlü profil sunucuda ön kontrolü zorunlu yapar. Kurumların toplu açılması bu sprintte yapılmaz.
- Başlatma isteğinde `preflight`: sunucu politika revizyonu, `accepted:true` ve `ClientCapabilities v1`. Kontrol kredi düşülmeden önce yapılır; kredi transaction’ında kurum satırı kilitlenerek güncel politika yeniden doğrulanır. Revizyon değişimi 409, eksik ön kontrol 428, eksik yetenek 422, bozuk kurum politikası 503 verir. Daha önce kaydedilmiş başlatma makbuzu önce geri döner; kayıp yanıt ikinci kredi harcatmaz.
- Politika/yetenekler ve sunucu onay zamanı oturumun metadata alanına kredi işlemiyle aynı transaction içinde kaydedilir; durum endpoint'i bu snapshot'ı döndürür. Kurum politikası değişimi eski oturumun kabul koşulunu sessizce değiştirmez.
- Native hazırlık ekranı mikrofon izni, Keychain yazılabilirliği, koşullar açıklaması ve erişilebilir onay alanını içerir. İzin kontrolü açık kullanıcı eylemiyle başlar. Kamera kanıtı ve Apple Assessment Mode yetenekleri bu sürümde `false`; gerektiren profiller engellenir.
- Mevcut `/api/proctoring/event` endpoint'inde v2: UUID olay kimliği, sıra, platform, istemci zamanı; veritabanı alım zamanı sunucudan. Aynı kimlikle aynı içerik tek satır ve aynı ACK; farklı içerik 409. Önce mevcut sahiplik/kurum/rol denetimi çalışır. Eski web protokolü korunur. Veritabanı migration gerekmez.
- Olay kuyruğu iPad/macOS Keychain içinde OS tarafından şifrelenir. Hesap + backend kapsamında ayrılır. Sadece kaydedildikten sonra gönderilir, doğrulanmış ACK sonrası yerel kayıt silinir. Kayıp ACK aynı kimlikle yeniden gönderilir; kayıt silme başarısızlığı da çift sunucu kaydı oluşturmaz. 128 olay / 100.000 karakter kotasında eski kayıtlar atılmaz; hata görünürdür.
- Ağ hatasında 10–60 saniyelik artan yeniden deneme, normalde 5 saniyelik boşaltma kontrolü vardır. Çıkışta kuyruk başka hesaba gönderilmez; aynı hesap yeniden girişte devam eder. Kuyruk için açık depolama kullanılamaması/güvenli kayıt hatası varsa açıklama ve tekrar deneme görünür; zorunlu olay politikasında yanıt editörü korunarak gönderim engellenir. OS sonlandırması sırasında henüz Keychain'e yazılamamış olaya dayanıklılık iddiası yoktur.
- Sadece oturum politikasında etkinse native ön/arka plan olayları gönderilir; odak değişimi `INFO` teknik sinyaldir. Clipboard içeriği, yanıt metni, kimlik, kamera görüntüsü veya ortam sesi bu kuyruğa alınmaz.
- `ProctoringCoordinator`: dinleme, mikrofon ve gelecekteki kamera için sahiplik kiraları. Konuşma başlamadan dinleme durdurulur; kayıt sırasında yeni dinleme engellenir; hata/bitirme/temizleme/ayrılmada kaynak bırakılır.

## Güvenlik ve işletim sınırları

Yetenek bildirimi OS attestation değildir. `accepted` açıklamanın okunduğuna ilişkin teknik makbuzdur; kurumun hukuki dayanağının yerine geçmez. Bu sprint ekran kilitleme veya hile tespit garantisi vermez. Şifreli kuyruk sadece teknik olaylar içindir; fotoğraf/kanıt dosyaları bu kuyruğa base64 olarak konulmaz.

Etkinleştirme örneği (kurum ayarının diğer alanlarını koruyarak):

```json
{"nativeExamPolicy":{"mode":"standard","enforcePreflight":true,"lifecycleEvents":true}}
```

Bu ayar ortak adaptif başlatma endpoint’ini kullanan eski web istemcilerini de ön kontrol zorunluluğuyla engeller. Ayrı tanılama/sabit form akışlarının tamamının bu politikaya taşındığı iddia edilmez. Web ön kontrol entegrasyonu veya ayrı pilot kurumu olmadan yaygın açılmamalıdır. Bu sprint müşteri kurumlarının ayarlarını değiştirmez.

Olaylar mevcut PostgreSQL saklama/erişim düzeninde kalır. Keychain teslim edilmiş olayları siler; sıra sayacı korunur. Sunucu saklama ve otomatik silme işi bu kesitte uygulanmadı. Pilot öncesi kurumun saklama süresi ve silme görevi kesinleştirilmeli; açık uçlu saklama üretim politikası olarak kabul edilmemeli.

## Sonraki sprint için hazır sözleşme

Kamera kanıtında önce oturuma/sahibe bağlı private yükleme rezervasyonu; SHA-256 içerik özeti, MIME, byte sınırı ve kanıt UUID'si; ardından aynı UUID ile idempotent kesinleştirme ve ACK gerekir. İmzalı URL kuyrukta kalıcı kanıt adresi sayılmaz. Private storage erişimi kurum/rol/oturum üzerinden sürer. Mevcut `/api/proctoring/screenshot` bu yeni dosya sözleşmesini henüz karşılamaz ve bu sprintte native tarafından çağrılmaz.

Apple başvurusu için teknik taslak: ürün iPad ve macOS'ta kurumsal dil değerlendirmesi sunar; sınav sırasında uygulama geçişini işletim sistemi değerlendirme oturumuyla sınırlamak ve bitiş/hata durumunda kısıtlamayı kaldırmak ister. İstenen entitlement `com.apple.developer.automatic-assessment-configuration`. Başvuru için kuruluşun Apple Developer Team ID'si, imzalı App ID, sınav kullanım senaryosu ve fiziksel cihaz hata/çıkış planı geliştirici hesabında hazırlanmalıdır. Taslak başvuru yerine geçmez; Apple'a başvuru gönderilmedi ve entitlement projeye verilmiş gibi eklenmedi.

Kalan işler: fiziksel iPad/Mac kamera-ses-AAC denemesi; kamera izni/önizlemesi ve başlangıç fotoğrafı; cihazda yüz sayımı; private kanıt kuyruğu; süre/ara/uyarlama sözleşmelerinin genişletilmesi; inceleme panelindeki platform/teslim durumu; saklama/silme görevi; iPad gerçek veritabanı tam sınav referans koşusu. Bu sprintin başlangıç kesiti tüm yol haritasının tamamlandığı anlamına gelmez.

## Doğrulama

Doğrulama sonuçları bu bölümde gerçek koşular tamamlandıkça kaydedilir. Simülatör derlemesi fiziksel cihaz kamera/AAC doğrulaması değildir.

- Native Jest: **64/64**, on test dosyası. Kayıp yanıt/kurtarma, taslak koruma, boşluk doldurma ve şifre alanı regresyonları yanında; kuyruk yeniden açılışı, kayıp ACK, kayıt/silme hatası, kota, hesap ayrımı, yaşam döngüsü, medya çakışması ve geç dönen kayıt sonuçları doğrulandı.
- Backend Vitest + izole PostgreSQL: **29/29**, beş test dosyası. Eşzamanlı tekilleştirme, değiştirilmiş olay içeriği/oturum çatışması, eski web olayları, politika ve makbuz sözleşmeleri dahil.
- Native TypeScript kontrolü ve backend sunucu paketleme başarılı. Tüm depoyu kapsayan TypeScript kontrolü bu makinede yüksek bellek tüketimi nedeniyle durduruldu; geçmiş sayılmadı. Yeni backend politika/olay sözleşmeleri ayrıca hedefli tip kontrolünden geçirildi.
- Gerçek Supabase QA kurumu: anonim politika isteği reddedildi; eski revizyon ve eksik mikrofon sınav/kredi işlemi öncesinde engellendi. Eşzamanlı + sonraki olay tekrarı tek satır; değişen içerik 409; başka adayın oturumuna gönderim 403. Yeni sınav veya kredi tüketimi olmadı. Sadece sentetik QA hesabının mevcut oturumuna işaretli teknik test olayı eklendi.
- Gerçek veri koşusu: `npm run e2e:proctoring` (native klasöründe, özel test backend'i açıkken). Yapılandırma normal üretim ortamında çalışmayı reddeder; QA kurum slug'ı ve aday aidiyeti doğrulanır. Şifreler/bağlantı sırları repoya veya rapora yazılmaz.
- Ham yerel sonuç: `/tmp/b4skills-realdb-validation/sprint1-proctoring-result.json`. Testler müşteri kurumlarında politika açmadı, soru bankasına dokunmadı ve migration çalıştırmadı.

- iPad simülatörü Debug derlemesi (`B4Skills`, gömülü JavaScript paketi, yeni Security/Keychain köprüsü): başarılı. Güncel platform ve arayüz kontrolü ayrıntıları aşağıdadır.
- Güncel macOS ve iPad Debug paketleri (izin bekleme süre sınırı dahil) başarıyla derlendi; ad-hoc imza doğrulaması geçti. Bunlar App Store dağıtımı veya Apple AAC yetkilendirmesi değildir.
- Kullanıcı mikrofon iznini verip Mac kilidini açtıktan sonra macOS gerçek sentetik QA hesabıyla yeniden giriş, gerçek kurum politikasının yüklenmesi, mikrofon ve Keychain hazırlığı arayüzden doğrulandı: **Mikrofon: hazır · Teknik olay kaydı: hazır**. Açıklama onayıyla başlatma düğmesinin etkinleşmesi kontrol edildi. Yeni sınav başlatılmadı/kredi harcanmadı. Kanıt: `/tmp/b4skills-realdb-validation/macos-sprint1-ready.png`.
- Ayrılmış iPad simülatörü `0CE0888D-E502-4B90-9785-6A44ABA84DEC`: gerçek sentetik hesapla giriş ve mikrofon hazırlığı geçti. Önceki imzasız derleme üzerine yalın ad-hoc imza uygulanan paket güvenli depolamayı kullanamıyordu. Xcode'un standart simülatör imzalama akışıyla derleme başarılı; oluşturulan `B4Skills.app-Simulated.xcent` uygulama kimliğini içeriyor. İmza doğrulaması geçti; paket aynı simülatöre veriler silinmeden kuruldu. Kullanıcı Mac kilidini yeniden açtıktan sonra **Mikrofon: hazır · Teknik olay kaydı: hazır** sonucu gerçek arayüzde doğrulandı. Açıklama onaylanmadan başlatma düğmesi devre dışı; onaydan sonra etkin. Teknik teslim uyarısı da görünmüyor. Kanıt: `/tmp/b4skills-realdb-validation/ipad-sprint1-ready.png`. Yeni sınav/kredi tüketimi olmadı. Başka projeye ait açık iPad simülatörüne müdahale edilmedi.
- Her iki platformda bu sprintin giriş → gerçek kurum politikası → mikrofon/Keychain kontrolü → açıklama onayı → başlatmaya hazır akışı geçti. Yeni sınav başlatılıp tüm soruların cevaplandığı bir native gözetim koşusu bu doğrulamada yapılmadı; kamera/AAC ve iPad tam sınav referans koşusu yukarıdaki kalan kapsamda duruyor.

### Tekrarlanabilir iPad test derlemesi

```sh
B4_SIMULATOR_ID=0CE0888D-E502-4B90-9785-6A44ABA84DEC npm run e2e:build-ipad
```

Komut native klasöründe çalışır ve sadece belirtilen simülatör için derler; veri silmez, cihaz açmaz veya uygulama kurmaz. `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-` ile simülatör uygulama kimliğini Xcode üretir. Sonradan boş yetkili `codesign --force --deep --sign -` uygulanmamalıdır. Fiziksel cihaz/App Store imzalama ayrı Apple Developer takımına ve provisioning profiline bağlıdır. Apple'ın [Keychain yetki tanılama belgesi](https://developer.apple.com/documentation/security/errsecmissingentitlement) uygulama kimliği ve erişim gruplarının denetlenmesini açıklar.
