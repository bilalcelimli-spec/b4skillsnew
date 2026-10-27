# TestFlight hazırlığı — iPad ve macOS

25 Ekim 2026. B4Skills App ID ve iki platformun App Store dağıtım profilleri oluşturuldu, Xcode’a indirildi ve sertifika eşleşmeleri doğrulandı. Canlı native API dağıtımı [PR #57](https://github.com/bilalcelimli-spec/b4skillsnew/pull/57) ile tamamlandı; Render’da `76ea516fe759bd2ba1205360643d6d8bf83872a7` canlı. App Store Connect uygulama kaydı oluşturuldu; iki platformun imzalı Release arşivleri ve yerel IPA/PKG dağıtım paketleri oluşturuldu ve doğrulandı. **Güncel dağıtım: Türkçe, İngilizce ve Arapça arayüz destekli iPad ve universal macOS `1.0.0 (5)` paketleri uygulama + Hermes sembolleriyle Apple’a yüklendi. İki platform mevcut iç test gruplarında Testing; metadata kayıtlarında Validated, Includes Symbols: Yes ve Arabic, English, Turkish doğrulandı. Son yüklemelerde hata veya sembol uyarısı yok.**

## Dağıtım ayarları

| Alan | Değer |
| --- | --- |
| Uygulama | B4Skills |
| Bundle ID | `com.b4skills.assessment` — iki platformda aynı |
| Apple Team | `333355WMYW` — mevcut Apple Distribution kimliğiyle eşleşiyor |
| Sürüm / varsayılan build | `1.0.0` / `5` |
| Canlı API | Kullanıcının belirttiği `https://b4skills.com` |
| iPad | iPadOS 16+, device family **2**; iPhone hedefi yok |
| Mac | macOS 14+, standart Release mimarileri **arm64 + x86_64**, sandbox ve hardened runtime |

`release.json` sürüm, varsayılan build, takım, kimlik ve API kaynağıdır. Yeni build için `B4_BUILD_NUMBER` kullanılabilir; App Store Connect'te daha önce kullanılmamış olması ayrıca kontrol edilir. Proje sürümü değişecekse `release.json` ile iki Xcode projesi birlikte güncellenir.

Release, Debug'dan kalan yerel/staging sunucu tercihini yok sayar. Sunucu düzenleyicisi Release'de kapalıdır ve store üzerinden de farklı adrese geçiş reddedilir. Debug QA adresleri çalışmaya devam eder. Release JS, Metro sunucusuna ihtiyaç duymadan uygulamaya gömülür.

## İkon ve uygulama içi logo

- Paylaşılan orijinal kare görsel arşiv kaynağı olarak korunur: `src/assets/app-icon-source.png`. Beyaz dış alan düzeltilmiş platform kaynakları: `src/assets/app-icon-ipad.png` ve `src/assets/app-icon-macos.png`.
- Kaynak SHA-256: `fdd831d2049508571f4e0b3e1bc32cc9e3872dd70ea4eee707cd83b14645395b`.
- iPad 1024 px kataloğu renkli yüzeyi dört kenara uzanan opak RGB kaynaktan; Mac 16–1024 px katalogları dış alanı şeffaf RGBA kaynaktan üretilir. `npm run icons` tekrarlanabilir. Düzeltme TestFlight build 4 ile dağıtıldı; build 3 eski ikonu taşır.
- Uygulama içindeki eski yatay logo, halo, monogram ve önceki yerleşim ölçüleri korundu: `src/assets/logo.ts` hâlâ `b4skills-logo.png` kullanır. `npm run logo` bu eski logonun mevcut hazırlama komutudur.

## Tamamlanan yerel kontroller

- Native TypeScript ve **102 Jest testi**: üretim origin'i, eski Debug tercihinin Release'e taşınmaması, Release sunucu düzenlemesinin reddi ve mevcut sınav/kamera/kuyruk regresyonları.
- Her iki platformun **gerçek Xcode Release ayarları** çözüldü: `1.0.0 (2)`, doğru takım/bundle, Release, dSYM, `SKIP_INSTALL=NO`, `ONLY_ACTIVE_ARCH=NO`; Swift DEBUG koşulu yok. Mac universal ve hardened runtime, iPad family 2 doğrulandı.
- İkon kataloglarının tüm dosyaları boyut, opaklık ve kaynak görselle piksel karşılaştırmasından geçti; uygulama içi eski logo için ayrı kontrol var.
- Yerel Release JS/Hermes paketleme araçları eklendi. Son koşu sonuçları aşağıdaki doğrulama kaydında belirtilir. JS/Hermes kontrolü bir cihaz `.xcarchive`, IPA, PKG veya imzalı native Release çalıştırma testi değildir.

## Canlı API ve imzalama kapıları

Apple takımında `B4Skills Assessment` / `com.b4skills.assessment` açık kimliği kaydedildi. Başka uygulamaların profilleri kullanılmadı.

| Profil | UUID | Platform | Geçerlilik |
| --- | --- | --- | --- |
| B4Skills iPad App Store | `d3d3d0ee-605b-4a96-baae-aa001c788971` | iOS / iPadOS | 20 Ekim 2027 |
| B4Skills macOS App Store | `61cc8338-0ed3-4c3a-83ca-8f0f26e61421` | OSX / native macOS | 20 Ekim 2027 |

İki profilin gömülü sertifika SHA-1’i yerelde özel anahtarı bulunan Apple Distribution kimliğiyle eşleşiyor: `7A3F8BA1FCBA952DF08DCE27EEEC6CF8A3471FAB`. Takım `333355WMYW`, bundle kimliği açık ve tam eşleşiyor; geliştirme/ad hoc profili değil. Yerel kaynak + profil kontrolü **0 engel** döndürdü. [Apple profil yönergesi](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile).

Backend kapsamı [PR #57](https://github.com/bilalcelimli-spec/b4skillsnew/pull/57): sınav politikası/preflight, tek kredi kullanan tekrar güvenli launch, native olay ACK, kamera politikası, reserve/commit, özel depolama ve saklama denetimleri. Kamera pilotu varsayılan kapalı. Tüm PR kontrolleri ve Render dağıtımı geçti; canlı sağlık/veritabanı ve native sözleşmeler doğrulandı. `npm run smoke:native` altı canlı sağlık/kimlik denetimini aday verisi oluşturmadan yapar.

CI sırasında mevcut body-parser, DOMPurify ve Zod açıkları uyumlu sürümlerle giderildi. Çerezli API istekleri tam `APP_URL` origin’iyle doğrulanır; origin bulunmayan çerezli istemci `/api/auth/csrf` üzerinden oturuma bağlı imzalı token alıp `X-CSRF-Token` göndermelidir. Native istemci kendi doğrulanmış backend origin’ini gönderir; giriş/refresh/tekrar akışı test edildi. Web tarayıcısının normal aynı origin fetch’i bu başlığı gönderir.

Canlı son ölçüm (25 Ekim 2026, 01:23 TRT): `/api/health` **200**, `database: up`; kimliksiz politika, kamera politikası, native olay, kanıt reserve/commit çağrıları **401**. Altı `smoke:native` kontrolü geçti. Kontroller kendini `B4Skills-ReleasePreflight/1.0` olarak tanıtır ve TLS sertifika doğrulamasını korur.

Gerçek veritabanındaki yalnız `apple-native-realdb-validation` QA kurumunun iPad ve Mac adaylarıyla canlı `https://b4skills.com` üzerinde giriş, kullanıcı kimliği, politika, kendi kamera politikası, başka adaya erişim reddi, hatalı payload reddi, yabancı origin reddi, imzalı CSRF token kabulü, refresh sonrası eski CSRF token reddi, çerez yenileme ve çıkış doğrulandı. Kamera pilotu kapalı kaldı. Bu canlı API kontrolünde yeni sınav başlatılmadı, kredi düşülmedi ve fotoğraf yüklenmedi; tam cihaz sınavı veya üretim fotoğraf teslimi kabul testi sayılmaz. Sonuç: `build/distribution/live-native-api-result.json`.

İmzalı native arşiv/IPA/PKG kontrolleri tamamlandı; Apple sunucu kabulü de doğrulandı; gerçek iPad Release çalıştırması sonraki kapıdır. Mac Installer Distribution sertifikası kullanıcının işlem anındaki onayıyla Xcode’da oluşturuldu ve özel anahtarı yerel Anahtar Zinciri’nde: `88A3FBB7451B53CB63DC7E2DA6A0C98B0D29D2C1`. Apple Distribution uygulama sertifikasıyla aynı `333355WMYW` takımında. Geçerlilik sonu 25 Ekim 2027, 01:18 TRT. App Store Connect kaydı [B4Skills / 6826695698](https://appstoreconnect.apple.com/apps/6826695698/distribution): iOS + macOS, iki platformda `1.0.0`, ana dil Türkçe, SKU `b4skills-assessment`.

## Yerel komutlar

Native klasöründe çalıştırılır. Ağ kontrolleri kimliksiz ve salt okunurdur.

```sh
npm run icons
npm test -- --runInBand
npm run type-check
npm run release:check -- --source-only --xcode-settings
npm run release:check -- --online
npm run release:bundle -- ipad
npm run release:bundle -- macos
```

Canlı API ve profiller düzeltildikten sonra, kullanılmamış build numarasıyla:

```sh
B4_BUILD_NUMBER=2 npm run release:archive -- ipad
B4_BUILD_NUMBER=2 npm run release:archive -- macos
B4_BUILD_NUMBER=2 npm run release:export -- ipad /absolute/path/to/signed.xcarchive
B4_BUILD_NUMBER=2 npm run release:export -- macos /absolute/path/to/signed.xcarchive
```

Arşiv komutları Release ve normal `index.js` girişini zorlar, tek derleme işi kullanır, mevcut arşivi ezmez. Export yalnız **yerel** çıktı üretir (`destination=export`); otomatik yükleme yoktur. Arşiv kontrolü platform/kimlik/sürüm, gömülü JS, gizlilik dosyası, dSYM, kimlik bilgisi dosyalarının dışlanması ve takım imzasını denetler. `--unsigned` yalnız yerel native derleme teşhisi içindir; Mac için ek `--arm64-validation` evrensel dağıtım kabulü sayılmaz. Bu tür arşivler yüklemeye hazır kabul edilmez.

Xcode'un Apple hesabından profil edinmesine izin vermek isteyen operatör `B4_ALLOW_PROVISIONING_UPDATES=1` seçebilir; varsayılan kapalıdır. Bu seçenek canlı API kontrolünü atlamaz. Sertifika özel anahtarı, API anahtarı ve hesap parolası repoya/bundle'a eklenmez.

## Gizlilik ve dış beta hazırlığı

Privacy manifestlerindeki boş veri listesi mevcut payloadlarla uyumlu envantere çevrildi: ad, e-posta, kullanıcı ID, ses, onaylı fotoğraf, sınav içeriği/yanıtları, etkileşim/teknik gözlemler ve okul-sınıf gibi diğer bilgiler. Amaç uygulama işlevi; hesaba bağlı; reklam takibi yok. Manifest, App Store Connect gizlilik formunun ve yayımlanmış gizlilik politikasının yerine geçmez. Kurum/AI işleyicileri ve saklama uygulamasıyla son form kontrolünü ürün sahibi yapmalı. [Apple veri beyanı](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests).

Şifreleme Apple CommonCrypto/Security ve işletim sistemi HTTPS işlevleriyle uygulanır. Mevcut `ITSAppUsesNonExemptEncryption=false` bu OS-only kullanım temelinde korundu; ilk yüklemenin export compliance yanıtları App Store Connect'te tamamlanmalı. [Apple şifreleme belge tablosu](https://developer.apple.com/help/app-store-connect/reference/export-compliance-documentation-for-encryption/).

Dış beta/App Review için tamamlanacak ürün ve metadata işleri:

- Çalışan üretim QA/review hesabı, yeterli sınav hakkı ve gerçek müşteri verisi içermeyen test kurumu. Parola yalnız uygun güvenli inceleme alanına girilir.
- Yayımlanmış gizlilik politikası URL'si, destek URL'si, feedback e-postası ve inceleme irtibatı. Bu değerler tahmin edilmedi.
- Kodla kayıt akışı hesap oluşturabildiği için uygulamadan başlatılabilen hesap silme akışı. Mevcut native uygulamada bu akış bulunamadı; yalnız çıkış yapma yeterli değildir. [Apple hesap silme koşulu](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
- Gerçek iPad kamerası/izin/ses/uyku-dönüş kontrolü; iki platformda imzalı native Release çalıştırma; uzun oturum ve farklı yüz/ışık koşulları.
- Kurumsal erişim kodu modelinin, veri kullanımının ve uygulama işlevinin review notlarında doğru açıklanması; dış beta için gerekli TestFlight bilgileri. [Apple test bilgileri](https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/).

Beta metni taslağı: [TESTFLIGHT_BETA_NOTES.md](./TESTFLIGHT_BETA_NOTES.md). Önce kurum içi test grubu, ardından gerekli inceleme tamamlandığında dış beta önerilir. Bu çalışma hiçbir kullanıcıya davet/ileti göndermez.


## Son doğrulama kaydı

- [PR #57](https://github.com/bilalcelimli-spec/b4skillsnew/pull/57) tüm kontroller geçtikten sonra birleştirildi; canlı commit `76ea516fe759bd2ba1205360643d6d8bf83872a7`.
- CI Vitest/coverage: **2.514 geçti**, 54 atlandı, 2 todo. Playwright ana uygulama: **59 geçti**, 1 atlandı. Ayrı renderer koşucusu 10 dosyada 84 bileşen/akış testi kapsar ve geçti. TypeScript, rota denetimi, üretim/Docker derlemesi, CodeQL, gizli bilgi taraması ve bağımlılık kontrolleri başarılı.
- İzole yerel PostgreSQL ile native hedefli testler **40/40** geçti. CSRF için gerçek HTTP üzerinden ek imza, origin, oturum bağlama ve rotasyon testleri geçti. Üretim bağımlılıklarında yüksek/kritik bulgu yok; kalan 1 düşük ve 3 orta bulgu tarama raporunda mevcut.
- Native TypeScript ve **102/102 Jest testi** geçti. Origin başlığı giriş, refresh ve tekrarlanan istekte doğrulandı. İki platformun Release JS/Hermes paketleri güncellendi: `build/distribution/bundles/main.ios.hbc`, `main.macos.hbc`; üretim origin’i mevcut, QA fixture girişi yok.
- iPad gerçek cihaz hedefinde Xcode Release **BUILD SUCCEEDED**; `codesign --verify --deep --strict` başarılı, takım `333355WMYW`, `1.0.0 (2)`, `UIDeviceFamily=[2]`, iPadOS 16+. Gömülü JS mevcut. Bu yerel `.app` **Apple Development** ve Xcode wildcard development profiliyle imzalıdır; App Store dağıtım arşivi/IPA değildir.
- Her iki açık App Store profili indirildi; aynı yerel Apple Distribution özel anahtarlı kimliğe bağlandıkları doğrulandı. Tam kaynak/profil/canlı API ön kontrolü **0 engel** ile exit 0 döndü: `build/distribution/preflight-readiness.json` ve `preflight-live-final.log`.
- App Store Connect’te B4Skills kaydı oluşturuldu; iOS ve macOS sürüm taslakları `1.0.0` olarak kaydedildi. App Review’a gönderilmedi, TestFlight build’i yüklenmedi, kullanıcı davet edilmedi.

Devam eden dağıtım işleri: TestFlight kurulumuyla dağıtım imzalı Release çalıştırma ve gerçek iPad kabul testi. Kullanıcının onayladığı Apple yükleme/işleme doğrulaması tamamlandı. Dış beta için yukarıdaki metadata ve ürün gereklilikleri ayrıca tamamlanır.


## Dağıtım arşivleri — devam kaydı

iPad `1.0.0 (2)` arşivi oluşturuldu: `build/distribution/ipad/1.0.0-2.xcarchive`. App/dSYM UUID eşleşmesi doğrulandı. `build/distribution/ipad/export-2/B4Skills.ipa` yerelde üretildi ve 20 dağıtım kontrolünün tamamını geçti: gerçek Apple Distribution imzası, doğru takım/uygulama kimliği, debugger yetkisi olmaması, gömülü açık App Store profiliyle imzalayan sertifikanın eşleşmesi, iPad-only cihaz ailesi, TestFlight beta-reports-active, JS ve privacy manifest. Sonuç ve SHA-256: `build/distribution/ipad/export-2/distribution-verification.json`. İlk doğrulama aracındaki codesign seçenek sözdizimi düzeltildikten sonra mevcut IPA tekrar doğrulandı; `export-ipad-verification.log` başarılı son denetimdir.

macOS evrensel Release arşivi başarıyla oluşturuldu: `build/distribution/macos/1.0.0-2.xcarchive`. App/dSYM UUID eşleşmeleri iki mimaride doğrulandı: arm64 `33B82FC2-CF03-3B12-9AB6-A17A63789155`, x86_64 `35A9013A-E83D-32FF-89F4-5397EA1D3025`. Export başarıyla tamamlandı: `build/distribution/macos/export-2/B4Skills.pkg`. 23/23 dağıtım kontrolü geçti: uygulamada Apple Distribution, pakette Apple tarafından verilmiş Mac Installer imzası ve yerel sertifika eşleşmesi, açık App Store profili, sandbox, gömülü JS/privacy manifest ve iki mimari doğrulandı. `pkgutil` bu Store Installer zinciri için “signed by a developer certificate issued by Apple (Development)” metnini döndürdüğünden araç yalnız “trusted by” ifadesi beklemek yerine başarılı Apple sertifika durumunu ve yerel sertifika SHA-256 eşleşmesini denetleyecek biçimde düzeltildi. Geçerli imza denetimi atlanmadı. Son başarılı denetim: `export-macos-verification.log`; sonuç/hash: `macos/export-2/distribution-verification.json`.

Mac kilidi açıldıktan sonra Development imzalı **Release arşivi** doğrudan çalıştırıldı. Gömülü JS ile tanıtım, e-posta giriş formu, şifre yazma/temizleme ve sınav kodu ekranı gözlendi; kapanma olmadı. Bu kontrol App Store imzalı PKG'nin TestFlight üzerinden kurulumunu veya gerçek hesapla tam sınavı kapsamaz. Gerçek iPad mevcut olmadığından IPA cihaz çalıştırması bu turda yapılmadı.

| Paket | Boyut | Dağıtım denetimi |
| --- | --- | --- |
| `ipad/export-2/B4Skills.ipa` | 12.212.631 bayt | 20/20 |
| `macos/export-2/B4Skills.pkg` | 24.389.327 bayt | 23/23 |

Henüz TestFlight yüklemesi yapılmadı. App Store Connect kaydı hazır; Apple işleme/kabul sonucu ancak yüklemeden sonra doğrulanabilir.


## TestFlight yükleme girişimi

Kullanıcı iPad ve macOS paketlerinin hata ayıklama sembolleriyle Apple App Store Connect’e yüklenmesini açıkça onayladı. Her iki yükleme ayarında `destination=upload`, `uploadSymbols=true`, `manageAppVersionAndBuildNumber=false`; sürüm/build `1.0.0 (2)` korunur. İlk iPad `xcodebuild -exportArchive` yükleme girişimi dosya gönderilmeden `Failed to Use Accounts / App Store Connect access for 333355WMYW is required` hatasıyla durdu (exit 70). Xcode hesap giriş penceresi ve Safari App Store Connect girişi kullanıcı tarafından yenilenmeyi bekliyor. macOS aynı hesap sorunuyla karşılaşacağından henüz yükleme başlatılmadı. Bu sonuç Apple paket doğrulama/işleme hatası değildir; Apple’a başarılı teslim ve TestFlight işleme sonucu henüz yok. Durum: `build/distribution/testflight-upload-status.json`; başarısız girişim: `upload-ipad.log`.


## Hermes sembolleri tamamlanmış dağıtım

İlk iPad ve Mac `1.0.0 (2)` paketleri Apple’a başarıyla teslim edildi; iki platform da TestFlight’ta **Ready to Submit** durumuna geçti. iPad Build Metadata: Binary State **Validated**, Includes Symbols **Yes**, Device Family **iPad**. İlk yüklemelerde uygulama dSYM’leri gönderildi; Apple önceden derlenmiş Hermes dSYM’leri için uyarı verdi.

Resmi [React Native 0.83.10 sürüm sayfasının](https://github.com/react/react-native/releases/tag/v0.83.10) Hermes Release dSYM bağlantısı kullanıldı. iPad arm64 ve Mac arm64+x86_64 UUID’leri dağıtılan Hermes ikilileriyle birebir eşleşti. `scripts/release/vendor-symbols.py` resmi artifact’i indirip güvenli yolları ve tüm UUID/mimarileri denetler, sonra arşive ekler. `release:archive` artık bunu otomatik çalıştırır; preflight da Hermes UUID eşleşmesini zorunlu kontrol eder. Başarılı iki platform kontrolüne ek olarak uyuşmayan UUID’nin arşive dosya eklenmeden reddedildiği negatif test geçti.

Ayrı native yeniden derleme başlatıldı, sonra durduruldu: Xcode’un resmi `manageAppVersionAndBuildNumber=true` export seçeneği aynı doğrulanmış arşive yeni build numarası verdiğinden yeniden derlemeye gerek kalmadı. `1.0.0-3.xcarchive` için tamamlanmış yeni native derleme iddiası yoktur. `1.0.0-2.xcarchive` içindeki orijinal uygulamalar korunur; vendor dSYM’leri eklendi. Xcode upload pipeline çıktılarında iki paket için `CFBundleVersion=3` doğrulandı. Kaynak varsayılan build ve iki Xcode projesi de `3` olarak güncellendi.

Xcode’un gerçekten yüklediği paketlerin birebir kopyaları: `ipad/export-3/B4Skills.ipa`, `macos/export-3/B4Skills.pkg`. Dağıtım denetimleri tekrar geçti (iPad 20/20, Mac 23/23). Uygulama ve Hermes için gönderime hazırlanan semboller ayrıca `ipad/upload-symbols-3` (2 UUID) ve `macos/upload-symbols-3` (4 UUID) altında saklandı. Tam sembollü son yükleme logları: `upload-ipad-complete-symbols.log`, `upload-macos-complete-symbols.log`. İki tam sembollü yükleme de `EXPORT SUCCEEDED` ile tamamlandı ve son loglarda uyarı/hata yok. İki platformdaki build 3 TestFlight’ta **Ready to Submit** olarak doğrulandı; iki Build Metadata sayfasında **Binary State: Validated**, **Includes Symbols: Yes** görüldü. iPad Device Family **iPad**, Mac minimum sürüm **14.0** ve mimariler **x86_64, arm64**.


## Son Apple işleme sonucu — 1.0.0 (3)

| Platform | Apple build ID | TestFlight | Binary State | Includes Symbols |
| --- | --- | --- | --- | --- |
| iPad | `77a16b1d-e641-4bb2-bdfd-12e9838b879e` | Ready to Submit | Validated | Yes |
| macOS | `859212f3-c346-47e2-a944-801d39f1402a` | Ready to Submit | Validated | Yes |

Makine tarafından okunabilen sonuç: `build/distribution/testflight-upload-status.json`; paket hash’leri ve yerel kontroller: `build/distribution/distribution-readiness.json`. Test grubu/tester eklenmedi; davet gönderilmedi ve App Review/beta review gönderimi yapılmadı. Bu sonuç Apple’ın teknik işleme kabulüdür; gerçek cihazda tam sınav kabulünün yerine geçmez. `1.0.0 (2)` önceki build olarak hesapta kalır; yeni testlerde tam sembollü **build 3** seçilir.


## İç test grupları ve davet — 25 Ekim 2026

Kullanıcının açık talebiyle **B4Skills iPad** ve **B4Skills macOS** adlı iki internal TestFlight grubu oluşturuldu. Her grupta yalnız ilgili platformun `1.0.0 (3)` build’i bulunur; build/platform eşleşmesi ve **Ready to Test** durumu arayüzden doğrulandı. Otomatik tüm-build dağıtımı kapalıdır. Mevcut Apple Account Holder hesabı iki gruba da eklendi; her iki grupta **1 Tester · 1 Build**, test kullanıcısı durumu **Invited** doğrulandı. Davetin kabulü ve cihazda kurulum kullanıcı tarafında beklenir. Sonuç: `build/distribution/testflight-groups-result.json`.


## Uygulama ikonu beyaz dış alan düzeltmesi

Kullanıcı bildirimi üzerine kaynak görselin içine gömülü beyaz dış alan `image_gen` yerleşik aracıyla düzeltildi. iPad için opak, kenarlara kadar renkli kare; Mac için şeffaf dış alanlı yuvarlatılmış ikon kullanılır. `prepare-app-icons.py` artık platformlara ayrı kaynak ve alfa politikası uygular; beyaz zemin eklemez. Preflight, iPad kenarlarının renkli olmasını, Mac köşelerinin şeffaflığını ve katalogların kaynakla piksel/alfa eşleşmesini denetler. İki katalog `actool` ile derlendi; kaynak ön kontrolü 0 engel. Çıktılar: `build/distribution/icon-fix-validation`. Uygulama içi eski logo korunur. Yeni ikon henüz TestFlight’a yüklenmedi; build 3 değişmez, yeni dağıtım için kullanılmamış build numarası gerekir. Kaynaklar ve üretim kaydı: `src/assets/app-icon-provenance.json`.


## İkon düzeltmesi dağıtımı — build 4

Kullanıcının “devam et” talebiyle düzeltilmiş ikonları içeren yeni iPad ve macOS sürümü hazırlanıyor. Kaynak ve iki Xcode projesinin build numarası `4`; sürüm `1.0.0`. Normal Xcode Release arşivi, uygulama + Hermes dSYM’leri, Apple Distribution ve açık App Store profilleri kullanılacak. Yükleme seçeneklerinde `uploadSymbols=true`, `manageAppVersionAndBuildNumber=false`; yeni paketler build 4 olarak hazırlanır. Mevcut iPad/macOS iç test gruplarına ilgili platformun build 4’ü eklenecek. İlerleme kaydı: `build/distribution/icon-build4-status.json`.


### Build 4 ara doğrulaması

iPad gerçek Release arşivi oluştu, Hermes sembolleri eklendi ve arşiv denetimi geçti. Çalışan arşiv betiği sırasında operatörün yaptığı job-count düzenlemesi sonlandırma adımını kesmişti; başarılı Xcode arşivi korunarak vendor-symbols ve preflight adımları ayrıca çalıştırıldı. Yeniden derleme gerekmedi. Yerel IPA 20/20 kontrolden geçti. İlk Apple yükleme girişimi Xcode Anahtar Zinciri kaydı hatasıyla durdu; kullanıcı oturumu yeniledikten sonraki girişim başarıyla, sembol uyarısı olmadan tamamlandı. iPad build 4 mevcut gruba eklendi ve **Testing** doğrulandı. TestFlight ekranında build 3’ün beyaz çerçevesi ile build 4’ün kenarlara kadar dolu simgesi yan yana görüldü.

Mac evrensel Release arşivi ve 23/23 kontrolü geçen PKG oluşturuldu. Paket içindeki ICNS açılarak RGBA ve şeffaf köşeler doğrulandı; iki mimarinin Hermes sembolleri eşleşiyor. Mac Apple yüklemesi/işlemesi ve grup ekleme sonucu son kayıtta güncellenecek. `B4_BUILD_JOBS` 1 (varsayılan) veya 2 olabilir; bu Mac arşivi 2 ile hazırlandı.


### Build 4 son sonucu

Mac ekranı açıldıktan sonra Apple’ın işlediği **macOS build 4 / Ready to Test** seçildi ve mevcut **B4Skills macOS** grubuna eklendi. Son durumda her iki grupta **1 Tester · 2 Builds**; ilgili platformun `1.0.0 (4)` satırında **Testing** doğrulandı. TestFlight ekranında yeni ve eski ikonlar yan yana incelendi; beyaz dış zemin düzeltmesi yeni build’lerde mevcut. Apple yükleme loglarında son girişimler başarılı, sembol uyarısı yok. Uygulama içindeki eski logo korundu. `testflight-upload-status.json`, `testflight-groups-result.json`, `icon-build4-status.json` ve paket hash’lerini içeren `distribution-readiness.json` güncellendi. Bu tur cihazda tam sınav kabul testi yapılmadı; doğrulama ikon, imzalı dağıtım, Apple işleme ve test grubuna erişim kapsamındadır.


## Dil desteği dağıtımı — build 5

İngilizce ve Arapça arayüz, kalıcı dil seçimi, yerel RTL düzeni ve Mac kaydırma/animasyon uyumluluk düzeltmeleri `1.0.0 (5)` olarak iki platformda yeniden arşivlendi. Kaynak doğrulaması 112 Jest testi ve TypeScript ile geçti. Release arşivlerinde ve son IPA/PKG içinde `tr/en/ar` yerelleştirme kaynakları doğrulandı. iPad 20/20, universal Mac 23/23 dağıtım kontrolünden geçti; uygulama ve Hermes dSYM UUID'leri tüm mimarilerde eşleşiyor. API `https://b4skills.com`.

İki paket Apple'a `uploadSymbols=true`, `manageAppVersionAndBuildNumber=false` ayarlarıyla başarıyla teslim edildi. İki yükleme logunda `EXPORT SUCCEEDED`, hata veya sembol uyarısı yok. iPad build ID `4f2e4913-36af-4329-8c80-fe71857baff4`: Apple işlemesi tamamlandı ve mevcut B4Skills iPad grubunda **Testing**, **1 Tester · 3 Builds** doğrulandı. Mac build ID `ec970bc4-8a41-4b27-b8b1-a81c9203302a`: mevcut B4Skills macOS grubunda **Testing**, **1 Tester · 3 Builds** doğrulandı. İki metadata kaydında **Binary State: Validated**, **Includes Symbols: Yes**, **Localizations: Arabic, English, Turkish**; iPad family iPad, Mac macOS 14.0+ ve x86_64/arm64. İki build için dil/RTL test notları kaydedildi. Ayrıntılı ilerleme: `build/distribution/localization-build5-status.json`.

Paketler: `ipad/export-5/B4Skills.ipa`, `macos/export-5/B4Skills.pkg`. Loglar: `archive-ipad-5.log`, `archive-macos-5.log`, `export-ipad-5.log`, `export-macos-5.log`, `upload-ipad-5.log`, `upload-macos-5.log`. Bu tur TestFlight teslim/işleme doğrulamasıdır; yeni bir gerçek hesapla tam cihaz sınavı testi değildir.
