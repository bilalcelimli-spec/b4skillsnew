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
- `src/screens/` — giriş, hazırlık (mikrofon testi), soru (geniş ekranda okuma metni yan panelde), sonuçlar.

## Marka

Kaynaklar: `src/components/SiteNav.tsx` (erik moru yazı logosu), `LandingPage.tsx` (`#9B276C` / `#7D1F57`), `src/App.tsx` (`#0F172A`, `#FDE047`), `public/favicon.svg` ("b4" ikon). iPad ikonu prototiple aynı 1024 px PNG; macOS ikonu `scripts/render-mac-icon.swift` ile Apple'ın yuvarlatılmış ızgarasına göre üretildi. Eski LinguAdapt mavi tokenları kullanılmaz.

## Doğrulama (23 Ekim 2026)

- `npm test` — API sözleşme testleri: 10/10.
- `npm run type-check` — temiz.
- Xcode Debug derlemeleri: iPad simülatörü ve macOS başarılı.
- iPad Pro 13" simülatöründe ve Mac'te giriş ekranı görsel olarak kontrol edildi.
- `npm run live-smoke` — uygulamanın kendi `api.ts` istemcisi, izole yerel backend'e karşı (`npm run e2e:backend`): **53 yanıt, COMPLETED**, 5 bölüm geçişi, dinleme medyası HTTP 200, sentetik konuşma kaydı kabul edildi, anonim erişim 401. 6 üretici yanıt incelemede (AI anahtarı yüklenmedi); C2 fixture yanıtlarının geçici çıktısıdır.

Arayüzde giriş sonrası ekranlar (soru, kayıt, sonuç) simülatör metin girişi çalışmadığı için henüz elle doğrulanmadı.

## Yerel uçtan uca test

```sh
npm run e2e:backend   # ayrı terminalde: gerçek server.ts, izole PostgreSQL 16 (127.0.0.1:55432)
npm run live-smoke    # tam sınav, uygulamanın api.ts istemcisiyle
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
