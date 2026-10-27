# B4Skills — React Native (iPad + macOS + Android)

Tek JavaScript kod tabanı, iki native Apple uygulaması:

| Hedef | Teknoloji | Proje |
|---|---|---|
| iPad (iPadOS 16+, yalnızca iPad) | React Native 0.83.10 | `ios/B4Skills.xcworkspace` → `B4Skills` |
| Mac (macOS 14+, sandbox) | react-native-macos 0.83.0 | `macos/b4skills-native.xcworkspace` → `b4skills-native-macOS` |

İkisinde de paket kimliği `com.b4skills.assessment`. App Store Connect'te aynı kimlikle iOS ve macOS uygulaması açılırsa **Universal Purchase** ile tek mağaza kaydı olur.

Mevcut backend kullanılır. Başlatma isteğine isteğe bağlı `launchRequestId` eklendi: sunucu aynı adayın aynı isteğine aynı oturumu döndürür ve ikinci kredi tüketmez. Bu backend güncellemesi uygulamadan önce dağıtılmalıdır. Önceki SwiftUI prototipinin yerini alır.

## Kurulum

```sh
cd native/react-native
npm install
npm run pods          # ios/ ve macos/ için pod install (CocoaPods gerekir: brew install cocoapods)
npm start             # İsteğe bağlı canlı geliştirme için Metro
```

Ardından Xcode'da ilgili workspace'i açıp çalıştırın veya `npm run ios` / `npm run macos`.

### Android (Aşama 0: iskelet)

Plan ve kararlar: [Android yol haritası](ANDROID_ROADMAP.md). Yalnız tablet (`supports-screens`, en küçük genişlik 600 dp), `minSdk 29`, paket `com.b4skills.assessment`. Sürüm `release.json`'dan okunur (`version`, `androidVersionCode`).

Gerekenler: JDK 17 ve Android SDK (`~/Library/Android/sdk`). Homebrew ile kurulduysa:

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
$ANDROID_HOME/emulator/emulator -avd B4Skills_Tablet &   # tablet emülatörü
npm start                                              # Debug, JS'i Metro'dan yükler
npm run android
```

Debug paketi JS'i `10.0.2.2:8081`'den (Mac'in 8081 portu) ister. 8081'i başka bir proje kullanıyorsa Metro'yu `npx react-native start --port 8082` ile açın, `adb reverse tcp:8081 tcp:8082` çalıştırın ve geliştirici menüsünde (Cmd+M) "Change Bundle Location" ile adresi `localhost:8081` yapın. Emülatörde `localhost` emülatörün kendisidir; yerel backend için `adb reverse tcp:3001 tcp:3001` çalıştırın, uygulamadaki `http://localhost:3001` adresi Mac'e ulaşır. Düz HTTP yalnız Debug'da açıktır (`android/app/src/debug/res/xml/network_security_config.xml`); Release yalnız HTTPS kabul eder. Yedekleme ve cihazdan cihaza aktarım kapalıdır.

Native modül (`modules/b4-native/android`): tercihler, `newRequestId` ve çerez temizliği çalışır. Ses, kamera ve güvenli depolama Aşama 1–2'ye kadar `E_ANDROID_PENDING` hatasıyla reddedilir. Release imzası için upload anahtarı `~/.gradle/gradle.properties` içinde `B4SKILLS_UPLOAD_STORE_FILE`, `B4SKILLS_UPLOAD_STORE_PASSWORD`, `B4SKILLS_UPLOAD_KEY_ALIAS`, `B4SKILLS_UPLOAD_KEY_PASSWORD` ile verilir; yoksa Release paketi imzasız kalır, debug anahtarıyla asla imzalanmaz. Simge ve açılış logosu `npm run icons` ile üretilir (`scripts/prepare-android-icons.py`; Play mağaza simgesi `android/play-store-icon.png`).

Debug derlemeleri de JavaScript paketini uygulamanın içine gömer ve varsayılan olarak bu paketten açılır; Metro gerekmez. Canlı geliştirme için Xcode scheme Launch Arguments listesine `-b4skills.useMetro YES` ekleyin. Bu seçenek Release'te kullanılmaz. Sürüm/test doğrulamasında bu argümanı kaldırın.

Geliştirmede sunucu varsayılanı `http://localhost:3001`, Release derlemesinde `https://b4skills.com`. **Sunucu** düğmesi yalnız Debug sürümünde kullanılabilir; Release eski geliştirme adresini yüklemez ve üretim adresine sabitlenir. HTTP yalnızca Debug'da ve yerel ağda kabul edilir.

## Yapı

Soru türleri, sınav profilleri, erişilebilirlik ve teslim aşamaları: [Sınav deneyimi yol haritası](EXAM_EXPERIENCE_ROADMAP.md).

Web özelliklerinin iPad/macOS'a taşınması, otomatik kamera gözetimi ve Apple güvenli değerlendirme modu: [Web özellikleri ve gözetmenlik planı](WEB_FEATURE_PARITY_ROADMAP.md).

- `src/api.ts` — backend istemcisi: `/api/auth/*`, `/api/sessions/launch|:id/next|:id/respond|:id/status`. 401'de tek yenileme; ağda kaybolan `respond` POST'u asla tekrar gönderilmez.
- `src/useAssessment.ts` — oturum akışı: bölüm geçişleri, `answeredItemIds` ile doğrulama, oturuma devam, geçici sonuçlar.
- `src/useRecorder.ts`, `modules/b4-native/` — iki platformda ortak ObjC modülü: AAC/M4A kayıt (en fazla 180 sn, `{audio, mimeType: "audio/mp4"}`), dinleme oynatma (soru başına 2), ayarlar, çıkışta cookie temizliği.
- `src/theme.ts`, `src/components/` — marka tokenları, `b4skills` yazı logosu (−6° eğim, sarı ışık), ikon seti.
- `src/screens/Onboarding.tsx` — **oturum açılmamışken uygulamanın tamamı**. Her açılış ortasında büyük b4skills logosu ve altta "Devam et" olan sayfayla başlar (kayıtlı oturum geri yüklenirken de). İlk kez: 5 ekranlı tanıtım (uyarlanabilir değerlendirme, dört beceri, hazırlık, sonuçlar, giriş). Sonraki açılışlarda "Devam et" doğrudan son ekrana gider (`onboarded` tercihi). Ayrı bir giriş ekranı yoktur: son ekranda "Sınav kodum var" veya "E-posta ile giriş yap" seçilir ve form aynı ekranda açılır; yöntemler arası geçiş ve "Seçenekler"e dönüş vardır. Yardım üst köşede; sunucu adresi yalnızca geliştirme derlemesinde. Sonuç çizimi "Örnek görünüm" diye etiketlidir, düzey veya puan göstermez.
- `src/screens/SignInCards.tsx` — kod ve e-posta kartları. Sınav kodu web'deki gibi: `/api/codes/validate` → aday bilgileri → `/api/codes/redeem` (sunucu oturumu açar). Giriş yapmış aday kodu hazırlık ekranından kendi hesabına tanımlayabilir. Var olan bir hesabın e-postası girilirse (`account_login_required`) önce e-postayla giriş istenir. Sabit formlu Özgün Kids kodları kullanılmadan web'e yönlendirilir.
- `src/screens/` — hazırlık (mikrofon testi), soru (geniş ekranda okuma metni yan panelde), sonuçlar.

## Marka

- **Logo:** `public/b4skillslogo.png`. Uygulamadaki `src/assets/b4skills-logo.png` ondan `npm run logo` (`scripts/prepare-logo.py`) ile üretilir: yalnızca rozetin dışındaki beyaz zemin şeffaf yapılır ve kırpılır, logo değişmez. Açılış ekranı, iOS launch ekranı ve kenar çubuğu bunu kullanır.
- **Açılış zemini:** `#1E0820`, logodaki geçişin derin mor ucu; arkadaki hale logonun macentası (`#C8246E`). iOS launch ekranı ve kök görünüm de bu renkte, yüklenirken beyaz ekran görünmez.
- **Uygulama içi:** `LandingPage.tsx` (`#9B276C` / `#7D1F57`), `src/App.tsx` (`#0F172A`, `#FDE047`).
- **Uygulama simgesi:** Kullanıcının sağladığı `src/assets/app-icon-source.png`. iPad ve macOS AppIcon setleri bu görselin gereken boyutlara ölçeklenmiş sürümleridir.

## Doğrulama (24 Ekim 2026)

- `npm test -- --runInBand` — 64/64 test (API, kurtarma, boşluk doldurma, şifre, politika hazırlığı, güvenli olay kuyruğu ve medya koordinasyonu dahil).
- Açılış akışı: iPad'de logolu sayfa, 5 tanıtım ekranı, tanıtım görüldükten sonra "Devam et"in doğrudan son ekrana gitmesi ve kod formunun yerinde açılması; Mac'te logolu sayfa, kısa pencerede son ekran ve e-posta formunun yerinde açılması elle kontrol edildi. macOS gerçek QA hesabıyla e-posta/şifre girişi ve mikrofon + güvenli olay kaydı hazırlığı da doğrulandı; ayrıntılar [ilk sprint raporunda](SPRINT_1_PROCTORING.md).
- `npm run type-check` — temiz.
- Xcode Debug derlemeleri: iPad simülatörü ve macOS başarılı.
- iPad Pro 13" simülatöründe ve Mac'te giriş ekranı görsel olarak kontrol edildi.
- `npm run live-smoke` — uygulamanın kendi `api.ts` istemcisi, izole yerel backend'e karşı (`npm run e2e:backend`): **53 yanıt, COMPLETED**, 5 bölüm geçişi, dinleme medyası HTTP 200, sentetik konuşma kaydı kabul edildi, anonim erişim 401. 6 üretici yanıt incelemede (AI anahtarı yüklenmedi); C2 fixture yanıtlarının geçici çıktısıdır.

- `npm run e2e:code` — kodla giriş, gerçek backend'e karşı: yeni aday kaydolup oturum açtı ve sınav başlattı; kullanılmış kod reddedildi (400); var olan hesap girişsiz kod kullanamadı (`account_login_required`); giriş yapmış aday kodu kendi hesabına tanımladı.
- Kod → aday bilgileri → oturum açma → hazırlık ekranı Mac arayüzünde (önceki giriş ekranı düzeninde, aynı kartla) elle geçildi.

Soru, kayıt ve sonuç ekranları iPadOS 26.5 simülatöründe ve macOS Debug uygulamasında hata fixture’larıyla elle geçildi. Gerçek backend’in tam sınavı ayrıca `live-smoke` ile API düzeyinde doğrulandı. Ayrıntılar: [Kurtarma doğrulaması](RECOVERY_VALIDATION.md).

**Bilinen react-native-macos 0.83 sorunları** (Mac uygulaması hata vermeden, çıkış kodu 0 ile kapanıyor):
- tek satırlı `TextInput`'a dikey `padding` → yükseklik dıştaki `View`'da (`codeBox`);
- `transform: [{ scale }]` ve `Animated` için `useNativeDriver: true` → macOS'ta kullanılmıyor;
- açılış sayfasındaki `ActivityIndicator` (muhtemel; düğmelerdeki sorun çıkarmadı) → yerine metin;
- `Modal` ana pencereyi boşaltıyor ve içerik görünmüyor → `Sheet` uygulama içi katman olarak çiziliyor;
- `useWindowDimensions` pencereyi değil ekranı veriyor → tanıtım yüksekliği `onLayout` ile ölçülüyor.

Fare üzeri vurgusu ve `cursor: pointer` yalnızca macOS'ta etkin. Mac'te otomatik/ani sonlandırma da kapalı (`NSSupportsAutomaticTermination = false`), sınav sırasında sistem uygulamayı kapatmasın diye.

## Yerel uçtan uca test

```sh
npm run e2e:backend   # ayrı terminalde: gerçek server.ts, izole PostgreSQL 16 (127.0.0.1:55432)
npm run live-smoke    # tam sınav, uygulamanın api.ts istemcisiyle
npm run e2e:code      # sınav koduyla giriş: yeni aday, kod tekrar kullanımı, var olan hesap, giriş yapmış aday
```

`scripts/e2e/start-local-backend.sh` normal `.env`'i yüklemez; yalnızca `b4skills_apple_e2e` veritabanını ve 3001/3003 test portlarını kabul eder; mevcut bir süreci durdurmaz. 3001 doluysa backend ve smoke komutlarını `B4SKILLS_E2E_PORT=3003` ile çalıştırın. Veriler `/tmp/b4skills-apple-e2e/` altındadır. Yerel test hesapları `apple.ipad@example.test`, `apple.mac@example.test`, `apple.client@example.test` (şifre `scripts/e2e/provision-e2e.mjs` içinde). Test backend'ini internete açmayın.

## App Store'a göndermeden önce

1. Xcode → Signing & Capabilities: Development Team seçin (iki hedef).
2. Release sunucu adresini (`DEFAULT_BACKEND`, `src/useAssessment.ts`) gerçek üretim adresiyle doğrulayın.
3. Release derlemesi JS paketini gömer; Archive → Distribute App.
4. App Store Connect: gizlilik etiketleri (e-posta, ses kaydı — değerlendirme amaçlı), yaş derecelendirmesi, inceleme için çalışan bir test hesabı.
5. Apple hesap silme şartı: uygulama hesap açmıyor (hesapları kurum veriyor); inceleme notunda bunu belirtin.
6. Fiziksel iPad/Mac mikrofonu, mikrofon izni reddi ve yeniden giriş akışı cihazda denenmeli.

Boşluk doldurma, politika/teknik olay altyapısı ve isteğe bağlı kamera pilotu eklendi. Kamera açıkken cihazda sürekli yüz sayımı ve adayın onayladığı fotoğraflar için şifreli dayanıklı kuyruk vardır; fiziksel cihaz kabul sınırları Sprint 2 raporundadır. Henüz yok: sürükle-bırak / entegre görevler, zorunlu fotoğraf kabul kapısı, Apple güvenli modu, kalıcı çevrimdışı yanıt taslağı, ses önizleme, PDF. Canlı insan gözetmeni kapsam dışıdır.

## Bağlantı ve medya kurtarma testleri

Sonuçlar ve kapsam: [Kurtarma doğrulaması](RECOVERY_VALIDATION.md). Gerçek backend makbuz testi: `../../node_modules/.bin/tsx scripts/e2e/launch-recovery-smoke.ts`.

`npm test -- --runInBand` API istemcisi, oturum durumları, aynı başlatma makbuzuyla yeniden deneme, uygulama yeniden açılışı, yazı taslağı/konuşma kaydı koruma ve dinleme hakkı testlerini çalıştırır. Başlatma makbuzu ağ isteğinden önce cihazda saklanır. Yanıtı belirsiz bir başlatmada **Oturumu getir** aynı isteği tekrarlar. Yanıt gönderiminde ise otomatik POST tekrarı yapılmaz: sunucu durumu ve sıradaki soru doğrulanır; aday saklanan yanıtını açıkça yeniden gönderebilir. Tamamlanan/sona eren oturum doğrudan sonuçlara geçer.

Native ses köprüsü `play()` sözünü ses gerçekten oynayana kadar bekletir; yükleme hatası veya 20 saniyelik başlangıç zaman aşımı hak tüketmez. Akış sırasında teknik hata hakkı geri verir; adayın durdurduğu veya tamamlanan dinleme hakkı tüketir. Konuşma kaydı ve yazılı taslak, kurtarma görünümünde korunur. Taslakların uygulama kapatıldıktan sonra diskte korunması henüz kapsamda değildir.

Tekrarlanabilir arayüz hata senaryoları için:

```sh
node scripts/e2e/fault-server.mjs
```

Geliştirme uygulamasında sunucuyu `http://localhost:3002` yapın. Bu yalnızca loopback arayüzünde çalışan, veritabanına ve dış servislere erişmeyen bir fixture sunucusudur; gerçek sınav doğrulamasından ayrı tutulur. `POST /__qa` ile `writing`, `speaking`, `listening` veya `expired` senaryosu seçilir; `dropLaunch: true` başlatma yanıtını kaybettirir. Yanıt POST'ları `allowAnswers: false` iken kaydedilmeden kesilir. Kurtarma ekranı görüldükten sonra `PATCH /__qa` ile `dropLaunch: false` başlatma bağlantısını, `allowAnswers: true` yanıt gönderimini, `allowMedia: true` medyayı açar; PATCH senaryoyu sıfırlamaz. `GET /__qa` makbuz, başlatma ve yanıt sayısını gösterir. Test sonunda uygulama sunucusunu tekrar `http://localhost:3001` yapın.

Backend regresyonları kök dizinde `test/native-launch-schema.test.ts` ile; PostgreSQL eşzamanlılık, tek kredi ve rollback testleri `test/native-launch-idempotency.test.ts` ile doğrulanır. Veritabanı testi yalnız `B4_NATIVE_TEST_DB_URL` açıkça `127.0.0.1:55432/b4skills_apple_e2e` adresine verilirse çalışır; normal `.env` veritabanını kullanmaz.

### Gerçek Supabase veritabanıyla test

Yerel API'yi proje `.env` veritabanıyla çalıştırmak için `npm run e2e:real-backend` kullanılır; native sunucu adresi `http://127.0.0.1:3004` olarak seçilir. Ayrı QA adayları `npm run e2e:real-candidates`, gerçek soru bankası testi `npm run e2e:real-smoke` ile çalışır. Bu test gerçek veritabanına QA kayıtları yazar ve her koşuda bir QA kredisi kullanır. Başlangıç bakım işlemleri kapalıdır. Ayrıntılar ve tamamlanamayan kontroller: [REAL_DATABASE_VALIDATION.md](./REAL_DATABASE_VALIDATION.md).

İlk sprintin otomatik gözetim altyapısı, kurum bazlı açılış koşulları ve doğrulama sınırları: [SPRINT_1_PROCTORING.md](./SPRINT_1_PROCTORING.md). Canlı görüntülü insan gözetmeni kapsam dışıdır.

Sprint 2 kamera pilotu, private kanıt aktarımı ve doğrulama sınırları: [SPRINT_2_CAMERA.md](./SPRINT_2_CAMERA.md).


TestFlight sürüm/imza/Release kontrolleri ve açık dağıtım kapıları: [TESTFLIGHT_PREPARATION.md](./TESTFLIGHT_PREPARATION.md). `npm run icons` verilen kare uygulama ikonunu paketler; `npm run logo` mevcut yatay uygulama içi logoyu hazırlar.


## Arayüz dilleri

Uygulama Türkçe, İngilizce ve Arapça arayüz destekler. Dil seçimi ilk logo ekranında, tanıtımda ve giriş sonrası üst çubukta bulunur. `ui-language` tercihi native UserDefaults içinde saklanır; kayıt yoksa desteklenen cihaz dili, aksi halde Türkçe kullanılır. Dil geçişi ekranı/oturumu yeniden başlatmaz.

`src/i18n/messages.json` yalnız uygulama metinlerini içerir; soru, seçenek, okuma metni, aday adı ve yazılan yanıtlar çeviri motoruna verilmez. Arapça için yerel RTL yerleşimi ve ok yönleri kullanılır; İngilizce sınav içeriği ve yanıt alanları LTR kalır. Sistem genelindeki RTL ayarı değiştirilmez. Kamera/mikrofon açıklamalarının `tr/en/ar` InfoPlist.strings kaynakları iki Xcode hedefinde de bulunur; sistem izin pencerelerinin dili işletim sisteminin uygulama diline göre seçilir.

Doğrulama: 112 Jest testi, TypeScript, çeviri parametre/kapsam kontrolü ve Xcode yerelleştirme kaynak denetimi başarılı. İzole yerel test kopyaları `com.b4skills.assessment.localizationqa` kimliğiyle hazırlanır; üretim/TestFlight uygulamasını veya aday oturumunu değiştirmez. Dil desteği iPad ve universal macOS için TestFlight `1.0.0 (5)` ile dağıtıldı; iki mevcut iç test grubunda Testing, Apple metadata kaydında Validated / Includes Symbols: Yes / Arabic, English, Turkish doğrulandı.


Mac Arapça görsel kontrolünde RTL kaydırma alanının metinleri aynaladığı görüldü. Ortak ScrollView bileşeni Mac viewport yönünü LTR, içeriğin yönünü seçilen dile göre tutar. Mac tanıtım gövdesinde dil geçişi sırasında native transform temizleme hatası nedeniyle hareket efekti kullanılmaz; iPad animasyonu korunur. Yön okları native view transformu yerine SVG grubu içinde çevrilir. Metin bileşeni fiziksel hizalamayı LTR layout ile, Arapça yazım yönünü RTL ile ayrı uygular. `rtl-macos.test.tsx` kaydırma yönlerini ve tanıtım gövdesinin dil değişiminde transformsuz kalmasını kapsar. Mac ve iPad simülatöründe açılış, İngilizce/Arapça dil geçişi, sağdan sola yerleşim ve e-posta giriş formu kontrol edildi; dil değişiminde form değeri korundu. Bu kontrol gerçek hesapla yeni bir sınav tamamlama testi değildir.
