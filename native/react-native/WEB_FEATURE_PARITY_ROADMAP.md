# iPad ve macOS için web sınav özelliklerini tamamlama planı

24 Ekim 2026

Amaç, web sınav deneyiminin aday akışını, gözetmenlik kanıtlarını ve yönetici incelemesini mevcut backend üzerinde iPad ve macOS'a taşımaktır. Öncelik sırası ortak sınav politikası, güvenilir kanıt aktarımı, kamera gözetimi, Apple değerlendirme modu ve kapsamlı sınav araçlarıdır. Canlı görüntülü insan gözetmeni kullanıcı kararıyla kapsam dışıdır.

Bu planın süreleri tahmindir. İlk kapsam denemesi, fiziksel cihaz sonuçları ve Apple yetkisi takvimi sonrasında güncellenir. Önceki cihaz doğrulamasında macOS'ta gerçek veritabanıyla 53 yanıt ve sonuç ekranı görüldü. iPad'in aynı koşullardaki tam sınav doğrulaması henüz kapanmış değildir; ilk teslim kapısında tamamlanır.

## 1 Mevcut kapsam ve taşınacak özellikler

Aşağıdaki web durumu kaynak kodundaki bağlantılara dayanır; bir dosyanın bulunması, üretimde tüm kurumlarda etkin olduğu anlamına gelmez.

| Özellik | Web tarafındaki dayanak | Native hedef ve öncelik |
| --- | --- | --- |
| Cihaz ve bağlantı kontrolü | `PracticeMode.tsx`: kamera, mikrofon, hoparlör, internet adımları | Tek hazırlık akışı; gerekli izinleri ve cihaz uygunluğunu sınavdan önce denetle. P0 |
| Örnek sorular ve alıştırma | `PracticeMode.tsx`, `TestPlayer.tsx` | Puanlanmayan, kredi tüketmeyen örnek akış; gerçek sınavdan ayrılmış veri. P1 |
| Sınav öncesi fotoğraf | `FaceCapture.tsx`, `/api/sessions/:id/identity-snapshot` | Kamera önizlemesi, tekrar çekme, yükleme onayı ve kurum politikasına göre hata akışı. Fotoğraf çekmek tek başına kimlik doğrulama sayılmaz. P0 |
| Kamera ve yüz sayımı | `ProctoringMonitor.tsx`, BlazeFace adaptörü | AVFoundation kamera ve Vision yüz sayımı; yüz yok/çoklu yüz için süre eşiği, tekrarları azaltma ve erişilebilir uyarı. Kimlik eşleştirme ayrı kapsamdır. P1 |
| Odak ve tam ekran olayları | Aktif `ProctoringMonitor.tsx` | AppState ve macOS pencere yaşam döngüsü; izin penceresi, kilit, ekran okuyucu ve uygulama geçişini ayır. P0 |
| Kopyalama ve yapıştırma politikası | Aktif monitörde clipboard olayları | Yanıt alanlarında kurum politikasına bağlı sınırlama; tüm sistem panosunu sürekli okuma yok. P1 |
| Görsel kanıt | `/api/proctoring/screenshot` | Web'de bu kanıt kamera karesidir. Native'de aynı anlamla kamera karesi gönder; ekran kaydını ayrı yetenek olarak tanımla. P1 |
| Olay ve kanıt inceleme | `/api/proctoring/event`, `/report`, `/evidence`, `/review`, `ProctoringReview.tsx` | Mevcut yönetici panelinde platform, zaman çizelgesi, kanıt ve inceleme kararı. P1 |
| Süre ve bölüm geçişleri | `TestPlayer.tsx`, sunucu profil/süre kuralları | Sunucu bitiş zamanını göster; cihaz saatinden karar verme. Uygulama yeniden açılınca süreyi uzatma. P0 |
| Çıkış, ara verme ve devam | `ExitAssessmentControl`, `AssessmentContinuation`, `/pause`, `/resume` | Mevcut bir çıkış hakkı ve 48 saatlik devam penceresini sunucu durumuyla uygula. Kurum politikası bu davranışı açıkça belirlesin. P0 |
| Gelişmiş soru türleri | `ItemRenderer.tsx`, yapılandırılmış yanıt puanlayıcısı | Mevcut MCQ, boşluk, yazma ve konuşmaya eşleştirme, sıralama, yerleştirme ve entegre görevleri ekle. P1 |
| Sabit form ve profil seçenekleri | `OzgunKidsPlayer.tsx`, değerlendirme kataloğu | Adaptif sınavın geri dönüş kurallarını sabit forma dayatma; soru haritası, bölüm süreleri ve teslim akışını ayrı uygula. P2 |
| Gelişmiş sonuçlar | `CandidateAdaptiveReport.tsx` | Canlı puanlama durumu, ayrıntılı beceri raporu, PDF, geçmiş, izinli paylaşım; yalnız kesinleşmiş sonuçta uygun sertifika bağlantısı. P2 |
| Aday geri bildirimi | `CandidateFeedback.tsx` | Oturuma bağlı, sınav sonunda isteğe bağlı geri bildirim. P2 |
| Çevrimdışı dayanıklılık | `OfflineAssessment.tsx` ayrı bir bileşendir; ana oyuncuya bağlı olduğu bu incelemede gösterilmedi | Önce şifreli taslak ve olay kuyruğu. Tam çevrimdışı adaptif sınavı vaat etme; sunucu soru seçimi, süre ve gözetim politikası için ayrı tasarım gerekir. P1/P3 |
| Canlı insan gözetmeni | Kullanıcı kararıyla kapsam dışı | Canlı görüşme, insan gözetmen atama, WebRTC/TURN/SFU geliştirilmez. Otomatik teknik sinyaller ve sonradan yetkili inceleme korunur. |

`useProctoring.ts`, `browser-lockdown.ts` ve `src/routes/proctoring.ts` içinde alternatif/eski uygulamalar bulunuyor. Taşınacak sözleşme, `server.ts` üzerinde gerçekten bağlı ve sahiplik kontrolü yapan endpoint'ler ile `event-protocol.ts`/Zod şemaları olmalıdır. Eski router doğrudan native entegrasyonun temeli yapılmamalıdır.

## 2 Üç sınav ve gözetim profili

| Profil | Davranış | Kullanım |
| --- | --- | --- |
| Standart | Cihaz kontrolü, süre, taslak koruma, bağlantı ve yaşam döngüsü olayları; kamera zorunluluğu kurumdan gelir | Alıştırma ve düşük riskli değerlendirme |
| Gözetimli | Açıklanmış kamera kullanımı, başlangıç fotoğrafı, yüz sayımı, olaylara bağlı kamera kanıtı, insan incelemesi | Uzaktan kurum sınavları |
| Güvenli değerlendirme | Apple Assessment Mode, gerekli hazırlık kontrolleri, uyumlu kamera kanıtı, doğrulanmış izinler | Güçlü cihaz kısıtlaması isteyen kurumlar |

Apple'ın Automatic Assessment Configuration mekanizması iPad ve macOS'ta sistem özelliklerini ve uygulama geçişini sınırlandırabilir; kullanım için Apple'dan özel entitlement izni gerekir. Sadece tam ekran açmak aynı güvenceyi vermez. Başvuru ve fiziksel cihaz denemesi ilk haftada başlatılmalıdır. [Apple değerlendirme modu](https://support.apple.com/en-us/101976), [Entitlement gereksinimi](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.automatic-assessment-configuration).

Değerlendirme modu ekran yakalamayı da kısıtlar. Bu nedenle güvenli mod ile sürekli ekran kaydını aynı pakette çalışır kabul etmiyoruz. Kamera kanıtı, ekran kanıtı ve cihaz kısıtlaması ayrı yetenekler olacak; birlikte çalışabilirlik gerçek cihazda doğrulanacak. İzin/yetenek eksikse sunucu bunu görür; uygulama sessizce daha düşük gözetim moduna geçmez.

Ekran kaydı ayrı bir isteğe bağlı iş paketidir. Minimum iPadOS 16 hedefinde eski sürüm desteği ayrıca ele alınır; Apple'ın güncel ScreenCaptureKit iOS örneği iOS 27 gerektirir. Hedef sürümde destek, sistem izin akışı ve AAC ile uyumluluk ölçülmeden tüm iPad'lerde ekran kaydı sözü verilmez. [Apple iOS ekran yakalama örneği](https://developer.apple.com/documentation/screencapturekit/capturing-screen-content-on-ios).

## 3 Ortak mimari ve backend işleri

Sınav motoru, puanlama, lisans ve kullanıcı kimliği mevcut backend'de kalır. React Native akışı ortak olur; kamera, ses ve işletim sistemi davranışlarını platform adaptörleri sağlar.

**Oturum politikası.** Oturumla birlikte sürümlü `ExamPolicy` ve istemcinin `ClientCapabilities` bilgisi kullanılır. Politika; gözetim profili, zorunlu izinler, kanıt sıklığı, saklama süresi, fotoğraf hatasında davranış, süre, ara verme, clipboard ve erişilebilirlik uyarlamalarını belirler. Sunucu sınav başlamadan yetenekleri kontrol eder. Gerekli gözetim kurulamıyorsa aday kredi tüketmeden çözüm veya uygun alternatif görür. Başlangıç fotoğrafı oturum gerektiriyorsa hazırlık rezervasyonu ve kredi kesinleştirmesi için transaction tasarımı yapılır.

**Tek kamera ve ses yöneticisi.** `ProctoringCoordinator`, konuşma kaydı, kamera önizlemesi, dinleme ve gözetmenlik için kaynak kullanımını koordine eder. Konuşma yanıtı kaydı ile ortam gözetimi aynı mikrofonu ayrı ayrı açmaz. Telefon/izin/ses kesintisinde yanıt kaydı korunur ve gözetim kaybı ayrıca bildirilir. Yüz yok ve çoklu yüz sinyalleri kimlik veya hile kararı yerine gözlemdir.

**Olay protokolü.** Mevcut kanonik olay adları korunur. `eventId`, sıra numarası, platform, istemci zamanı ve sunucu alım zamanı için v2 sözleşme/migration planlanır; mevcut strict Zod şemasına bilinmeyen alan gönderilmez. Aynı olayın tekrarı tek kayıt oluşturur. Kamera/izin kaybı gibi durumlar önce belgelenmiş `OTHER` metadatasıyla veya sürümlü yeni enumla taşınır.

**Dayanıklı kuyruk ve kanıt.** Şifreli yerel olay kuyruğu, alındı onayı, yeniden deneme, kontrollü geri çekilme ve disk kotası eklenir. Uygulama kapanınca kuyruk korunur; yanıt POST'u körlemesine tekrarlanmaz. Kanıt dosyaları private storage'da kalır; erişim oturum/kurum/rol üzerinden denetlenir. Web'deki sessiz kamera karesi yükleme hatası native'e taşınmaz: kuyrukta kalan, ulaştırılan ve kalıcı olarak başarısız kanıtlar ayırt edilir. Kuyruk dolması veya uzun gözetim kesintisinde devam/duraklatma kararı sunucunun politikasından gelir.

**Sunucu kabul kapıları.** Başlangıç kontrolleri ve politika sürümü oturuma bağlanır; gözetmenlik zorunluluğu yalnız ekrandaki bir anahtara bırakılmaz. Web ve native aynı yetki ve kanıt kurallarını kullanır. İstemci zaman damgası veya istemcinin “güvenli mod açık” beyanı tek başına güvenlik kanıtı sayılmaz. Desteklenen OS doğrulama/attestation seçenekleri keşif aşamasında değerlendirilir.

**Gözetmen paneli.** Mevcut panelde platform filtresi, kanıt teslim durumu, kesinti açıklamaları, aday açıklaması ve denetim geçmişi gösterilir. Otomatik sinyal adayın sınavını kendiliğinden iptal etmez; teknik kesinti ve erişilebilirlik gerekçeleri insan incelemesinde ayrıştırılır. Canlı insan gözetimi, görüntülü görüşme ve canlı gözetmen komutları kapsam dışıdır.

## 4 Aday deneyimi ve veri koruma

Akış: sınav bilgisi → gözetim açıklaması ve gerekli izinler → cihaz kontrolü → gerekiyorsa başlangıç fotoğrafı → alıştırma → sınav → teslim → geçici/kesin sonuç.

Kamera ve mikrofonun ne zaman, hangi amaçla kullanıldığı görünürdür. Aday açıklama ekranına geri dönebilir; cihaz izni, veri işleme bilgilendirmesi ve kurumun hukuki dayanak kararı birbirinin yerine kullanılmaz. Çocuk profilleri ve veli/kurum süreçleri ayrıca değerlendirilir. Kanıt saklama süresi, erişim rolleri, silme ve kayıt erişim denetimi pilot öncesinde belirlenir; hukuk ekibi ilgili veri koruma değerlendirmesini yapar.

Kamera, kimlik belgesi ve yüz biyometrisi aynı özellik olarak sunulmaz. İlk sürümde belge/OCR, otomatik kişi eşleştirme ve duygu/niyet çıkarımı yoktur. Yüz sayımı için görüntünün cihazda işlenmesi tercih edilir; sürekli video yükleme yalnız ayrıca onaylanmış ürün kapsamı ve veri politikasıyla eklenir.

VoiceOver, büyük metin, harici klavye ve motor erişilebilirliği sınav ve gözetim uyarılarında desteklenir. İşletim sistemi izin penceresi veya onaylı erişilebilirlik aracı nedeniyle oluşan odak değişimi otomatik “hile” sayılmaz. Uyarlamalar kurumun ölçme politikasına göre sunucudan gelir.

## 5 Aşamalı teslim planı

Varsayım: iki native geliştirici, bir backend geliştirici, bir QA; tasarım, ölçme ve güvenlik/veri koruma desteği gerektiğinde katılır. Bu kapasite olmadan takvim yeniden hesaplanır.

| Aşama | Tahmini süre | Somut teslim | Çıkış koşulu |
| --- | --- | --- | --- |
| 0 Kapsam ve platform denemesi | 1 hafta | Web bağlantı matrisi; fiziksel iPad/Mac kamera-ses-AAC denemesi; Apple yetki başvurusu; iPad tam sınav temel kontrolü | Zorunlu/opsiyonel özellikler ve desteklenen OS matrisi belli; mevcut kritik akış hatası kapalı |
| 1 Ortak sınav temeli | 2 hafta | Sürümlü politika/yetenek sözleşmesi; hazırlık ve alıştırma; sunucu süre/ara/devam; yerel taslak ve olay kuyruğu | İki platformda kesinti ve yeniden açılışta veri kaybı/çift kredi yok; süre sunucuyla tutarlı |
| 2 Gözetimli ilk sürüm | 2 hafta | Kamera, başlangıç fotoğrafı, yüz sayımı, yaşam döngüsü olayları, kanıt aktarımı, mevcut inceleme paneli | Gerçek cihaz olayları doğru oturumda tek kayıt; teknik hata aday ihlaliyle karışmıyor; kanıt erişimi kurumla sınırlı |
| 3 Apple güvenli mod | 1–2 hafta | AAC başlangıç/bitiş/hatadan çıkış; clipboard ve uyarlama kuralları; uyumlu medya davranışı | Yetkili imzalı fiziksel cihazlarda kısıtlamalar doğrulanmış; her çıkışta cihaz normal moda dönüyor |
| 4 Web sınav araçları | 2 hafta | Kalan soru türleri, sabit form, ayrıntılı rapor, puanlama güncellemesi, PDF ve geri bildirim | Desteklenen profil/tür matrisi iki platformda geçiyor; geçici sonuç sertifika gibi sunulmuyor |
| 5 Pilot ve yayın kapısı | 2 hafta | Fiziksel cihaz pilotu, uzun oturum, düşük bant genişliği, erişilebilirlik ve kanıt inceleme denemeleri | Kritik hata yok; ölçülen yanlış alarm oranı ve performans kabulü; kurum bazında kontrollü açılış |

Toplam çekirdek kapsam yaklaşık **10–11 hafta**; işletim sistemi keşfi ve Apple yetki süresi takvimi uzatabilir. Apple izni kritik yoldadır; standart/gözetimli pilot, güvenli modun hazır olduğu iddia edilmeden ayrı özellik bayrağıyla ilerleyebilir.

**Kapsam kararı (24 Ekim 2026):** Canlı görüntülü insan gözetmeni eklenmeyecek. Kamera kanıtı, cihazda yüz sayımı, otomatik teknik olaylar ve sonradan yetkili inceleme devam eder. İsteğe bağlı ekran kanıtı ayrı platform keşfi olarak kalır.

## 6 Test ve yayın ölçütleri

- iPad simülatörü tek başına kamera, AAC ve sistem kısıtlamaları için kabul kanıtı değildir. Desteklenen minimum sürüm ile güncel sürümde fiziksel iPad ve Mac doğrulaması gerekir; dış kamera/harici ekran yalnız ilan edilen destek kapsamında denenir.
- Aday kendi oturumu dışında olay/kanıt oluşturamaz; gözetmen başka kurumun kanıtını okuyamaz. Tekrarlı olay ve kanıt denemesinde yinelenen kayıt oluşmaz.
- Ağ kesintisi, erişim belirteci yenileme, izin reddi/geri çekme, uygulama kapanması, ekran kilidi, kamera meşguliyeti, mikrofon kesintisi, kuyruk kotası ve süre bitişi test edilir.
- Dinleme ve konuşma sırasında kamera çalışırken ses kalitesi, hak sayacı, kayıt bütünlüğü ve pil/ısınma ölçülür. Uyku/uyandırma ve Bluetooth değişimi kapsanır.
- Sınav sonu/çıkış/hata durumunda kamera-mikrofon kapanır; varsa Apple değerlendirme oturumu sonlandırılır. Çökmeye ilişkin OS kurtarma davranışı fiziksel cihazda ayrıca doğrulanır.
- Web, iPad ve macOS olayları aynı gözetmen zaman çizelgesinde görülebilir; aday açıklaması ve insan kararı denetlenebilir kayda dönüşür.
- Kamera/yüz sayımı için aydınlatma, gözlük, ten tonu, oturma biçimi ve erişilebilirlik koşullarında yanlış alarm ölçülür. Eşikler pilot verisiyle belirlenir; sinyal varlığı otomatik başarısızlık anlamına gelmez.
- Kontrollü QA kurumunda her desteklenen profil için tam sınav, PostgreSQL yanıt sayısı ve türleri, private kanıt erişimi ve panel incelemesi birlikte doğrulanır. Üretim müşteri hesabı veya kredisi test amacıyla kullanılmaz.

## 7 İlk sprint için iş listesi

1. Web'de bağlı özellik ve endpoint envanterini tamamla; eski modülleri aktif özelliklerden ayır.
2. `ExamPolicy v1` ve `ClientCapabilities v1` taslağını, sunucu kabul kapılarını ve gözetim profillerini kesinleştir.
3. `ProctoringCoordinator` ve ortak kamera/ses sahipliği arayüzlerini tanımla.
4. Olay v2 tekilleştirme ve private kanıt teslim sözleşmesi için backend değişikliklerini tasarla.
5. Fiziksel cihaz kamera/izin/AAC denemesini yap; Apple entitlement başvurusunu hazırla.
6. Fotoğraf ve izin başarısızlığı akışlarını, veri saklama politikasını ve erişilebilirlik uyarlamalarını ürün kararı olarak kapat.
7. iPad'de gerçek veritabanıyla kesilmemiş tam sınav temel doğrulamasını tamamla; gözetmenlik eklenmeden önce referans koşuyu kaydet.

İlk sprintin uygulanan kısmı ve doğrulama sınırları [SPRINT_1_PROCTORING.md](./SPRINT_1_PROCTORING.md) içindedir. Kamera, yüz sayımı, kanıt dosyası kuyruğu ve Apple güvenli modu henüz uygulanmış sayılmaz.

Sprint 2 kamera pilotunun ilk teslimi, private kanıt protokolü ve kalan kabul kapıları [SPRINT_2_CAMERA.md](./SPRINT_2_CAMERA.md) içinde kayıtlıdır. Sürekli cihazda yüz sayımı ve şifreli fotoğraf disk kuyruğu ikinci teslimde eklendi; fiziksel iPad kamera kabulü, zorunlu fotoğraf kabul kapısı ve saklama işletimi açık kalır. Ayrıntılı test sınırları aynı rapordadır.
