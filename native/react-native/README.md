# B4Skills — React Native (iPad + macOS)

Tek JavaScript kod tabanı, iki native Apple uygulaması:

| Hedef | Teknoloji | Proje |
|---|---|---|
| iPad (iPadOS 16+, yalnızca iPad) | React Native 0.83.10 | `ios/B4Skills.xcworkspace` → `B4Skills` |
| Mac (macOS 14+, sandbox) | react-native-macos 0.83.0 | `macos/b4skills-native.xcworkspace` → `b4skills-native-macOS` |

İkisinde de paket kimliği `com.b4skills.assessment`. App Store Connect'te aynı kimlikle iOS ve macOS uygulaması açılırsa **Universal Purchase** ile tek mağaza kaydı olur.

Mevcut backend değiştirilmedi. Önceki SwiftUI prototipinin yerini alır; onun doğrulanmış API sözleşmesini ve tasarım dilini taşır.

## Kurulum

```sh
cd native/react-native
npm install
npm run pods          # ios/ ve macos/ için pod install (CocoaPods gerekir: brew install cocoapods)
npm start             # Metro
```

Ardından Xcode'da ilgili workspace'i açıp çalıştırın veya `npm run ios` / `npm run macos`.

Geliştirmede sunucu varsayılanı `http://localhost:3001`, Release derlemesinde `https://app.b4skills.com`. Giriş ekranındaki **Sunucu** düğmesiyle değiştirilebilir. HTTP yalnızca Debug'da ve yerel ağda kabul edilir.

## Yapı

- `src/api.ts` — backend istemcisi: `/api/auth/*`, `/api/sessions/launch|:id/next|:id/respond|:id/status`. 401'de tek yenileme; ağda kaybolan `respond` POST'u asla tekrar gönderilmez.
- `src/useAssessment.ts` — oturum akışı: bölüm geçişleri, `answeredItemIds` ile doğrulama, oturuma devam, geçici sonuçlar.
- `src/useRecorder.ts`, `modules/b4-native/` — iki platformda ortak ObjC modülü: AAC/M4A kayıt (en fazla 180 sn, `{audio, mimeType: "audio/mp4"}`), dinleme oynatma (soru başına 2), ayarlar, çıkışta cookie temizliği.
- `src/theme.ts`, `src/components/` — marka tokenları, `b4skills` yazı logosu (−6° eğim, sarı ışık), ikon seti.
- `src/screens/Onboarding.tsx` — **ilk açılış**: ortada yalnızca büyük logo ve altta "Devam et"; ardından 5 ekranlı tanıtım (uyarlanabilir değerlendirme, dört beceri, hazırlık, sonuçlar, giriş seçimi). Son ekran "Sınav kodum var" veya "E-posta ile giriş yap" ile giriş ekranını o yöntemle açar. Bir kez gösterilir (`onboarded` tercihi); oturumu açık adaya hiç gösterilmez; giriş ekranındaki "Tanıtım" ile tekrar izlenebilir. Sonuç çizimi "Örnek görünüm" olarak etiketlidir, düzey veya puan göstermez.
- `src/screens/Welcome.tsx` — giriş ekranı: ortada logo, altında web'deki gibi **sınav koduyla giriş** (`/api/codes/validate` → aday bilgileri → `/api/codes/redeem`, sunucu oturumu açar), altında e-posta/şifre. Giriş yapmış aday kodu hazırlık ekranından kendi hesabına tanımlayabilir. Var olan bir hesabın e-postası girilirse (`account_login_required`) önce e-postayla giriş istenir. Sabit formlu Özgün Kids kodları kullanılmadan web'e yönlendirilir.
- `src/screens/` — hazırlık (mikrofon testi), soru (geniş ekranda okuma metni yan panelde), sonuçlar.

## Marka

- **Logo:** `public/b4skillslogo.png`. Uygulamadaki `src/assets/b4skills-logo.png` ondan `npm run logo` (`scripts/prepare-logo.py`) ile üretilir: yalnızca rozetin dışındaki beyaz zemin şeffaf yapılır ve kırpılır, logo değişmez. Açılış ekranı, iOS launch ekranı ve kenar çubuğu bunu kullanır.
- **Açılış zemini:** `#1E0820`, logodaki geçişin derin mor ucu; arkadaki hale logonun macentası (`#C8246E`). iOS launch ekranı ve kök görünüm de bu renkte, yüklenirken beyaz ekran görünmez.
- **Uygulama içi:** `LandingPage.tsx` (`#9B276C` / `#7D1F57`), `src/App.tsx` (`#0F172A`, `#FDE047`).
- **Uygulama ikonu:** `public/favicon.svg` "b4" işareti; macOS ikonu `scripts/render-mac-icon.swift` ile. Eski mavi LinguAdapt `icons/pwa-*.png` kullanılmaz.

## Doğrulama (23 Ekim 2026)

- `npm test` — API sözleşme testleri: 14/14 (kod doğrulama/kayıt dahil).
- İlk açılış: iPad'de açılış sayfası, 5 tanıtım ekranı, iki giriş seçimi, yöntemler arası geçiş ve yeniden açılışta tanıtımın atlanması; Mac'te açılış sayfası, tanıtım, kısa pencerede son ekran ve e-posta seçimi elle kontrol edildi.
- `npm run type-check` — temiz.
- Xcode Debug derlemeleri: iPad simülatörü ve macOS başarılı.
- iPad Pro 13" simülatöründe ve Mac'te giriş ekranı görsel olarak kontrol edildi.
- `npm run live-smoke` — uygulamanın kendi `api.ts` istemcisi, izole yerel backend'e karşı (`npm run e2e:backend`): **53 yanıt, COMPLETED**, 5 bölüm geçişi, dinleme medyası HTTP 200, sentetik konuşma kaydı kabul edildi, anonim erişim 401. 6 üretici yanıt incelemede (AI anahtarı yüklenmedi); C2 fixture yanıtlarının geçici çıktısıdır.

- `npm run e2e:code` — kodla giriş, gerçek backend'e karşı: yeni aday kaydolup oturum açtı ve sınav başlattı; kullanılmış kod reddedildi (400); var olan hesap girişsiz kod kullanamadı (`account_login_required`); giriş yapmış aday kodu kendi hesabına tanımladı.
- Mac arayüzünde kod → aday bilgileri → oturum açma → hazırlık ekranı elle geçildi. iPad'de açılış ve launch ekranı görsel olarak kontrol edildi.

Soru, kayıt ve sonuç ekranları arayüzden henüz elle geçilmedi; bu akış `live-smoke` ile API düzeyinde doğrulandı.

**Bilinen react-native-macos 0.83 sorunları** (Mac uygulaması hata vermeden, çıkış kodu 0 ile kapanıyor):
- tek satırlı `TextInput`'a dikey `padding` → yükseklik dıştaki `View`'da (`codeBox`);
- `transform: [{ scale }]` ve `Animated` için `useNativeDriver: true` → macOS'ta kullanılmıyor;
- `Modal` ana pencereyi boşaltıyor ve içerik görünmüyor → `Sheet` uygulama içi katman olarak çiziliyor;
- `useWindowDimensions` pencereyi değil ekranı veriyor → tanıtım yüksekliği `onLayout` ile ölçülüyor.

Fare üzeri vurgusu ve `cursor: pointer` yalnızca macOS'ta etkin. Mac'te otomatik/ani sonlandırma da kapalı (`NSSupportsAutomaticTermination = false`), sınav sırasında sistem uygulamayı kapatmasın diye.

## Yerel uçtan uca test

```sh
npm run e2e:backend   # ayrı terminalde: gerçek server.ts, izole PostgreSQL 16 (127.0.0.1:55432)
npm run live-smoke    # tam sınav, uygulamanın api.ts istemcisiyle
npm run e2e:code      # sınav koduyla giriş: yeni aday, kod tekrar kullanımı, var olan hesap, giriş yapmış aday
```

`scripts/e2e/start-local-backend.sh` normal `.env`'i yüklemez; yalnızca `b4skills_apple_e2e` veritabanını ve 3001 portunu kabul eder, başka bir 3001 sürecini durdurmaz. Veriler `/tmp/b4skills-apple-e2e/` altındadır. Yerel test hesapları `apple.ipad@example.test`, `apple.mac@example.test`, `apple.client@example.test` (şifre `scripts/e2e/provision-e2e.mjs` içinde). Test backend'ini internete açmayın.

## App Store'a göndermeden önce

1. Xcode → Signing & Capabilities: Development Team seçin (iki hedef).
2. Release sunucu adresini (`DEFAULT_BACKEND`, `src/useAssessment.ts`) gerçek üretim adresiyle doğrulayın.
3. Release derlemesi JS paketini gömer; Archive → Distribute App.
4. App Store Connect: gizlilik etiketleri (e-posta, ses kaydı — değerlendirme amaçlı), yaş derecelendirmesi, inceleme için çalışan bir test hesabı.
5. Apple hesap silme şartı: uygulama hesap açmıyor (hesapları kurum veriyor); inceleme notunda bunu belirtin.
6. Fiziksel iPad/Mac mikrofonu, mikrofon izni reddi ve yeniden giriş akışı cihazda denenmeli.

Henüz yok: sürükle-bırak / boşluk doldurma / entegre görevler, gözetim, çevrimdışı taslak, ses önizleme, PDF.
