# iPad ve macOS uygulamasını en üst seviyeye taşıma yol haritası

29 Ekim 2026

Bu belge mevcut planların yerine geçmez. Sınav arayüzü [EXAM_UI_EXCELLENCE_PLAN.md](EXAM_UI_EXCELLENCE_PLAN.md) içinde, gözetim ve web özellikleri [WEB_FEATURE_PARITY_ROADMAP.md](WEB_FEATURE_PARITY_ROADMAP.md) içinde, genel sınav deneyimi [EXAM_EXPERIENCE_ROADMAP.md](EXAM_EXPERIENCE_ROADMAP.md) içinde kalır. Bu belge, o planların ele almadığı üç alanı ekler: mühendislik temeli (native CI, çökme takibi), Apple platformuna uyum (karanlık mod, klavye, menüler, Assessment Mode) ve kurumsal dağıtım (MDM, Universal Links). Ayrıca tüm işleri tek bir sıraya koyar. App Store'a herkese açık yayın sırası ve yayın engelleri: [APP_STORE_RELEASE_ROADMAP.md](APP_STORE_RELEASE_ROADMAP.md).

Süreler tek geliştirici varsayımıyla kaba tahmindir. Aşağıdaki hedefler ölçülmüş sonuç değildir; pilotta ölçülür.

## 1 Bugünkü durum (kaynak koddan doğrulandı)

| Alan | Durum |
| --- | --- |
| Soru türleri | 4 yanıt modu (seçim, boşluk, yazma, ses). Sürükle-bırak ailesi ve entegre görev yok |
| Native CI | `.github/workflows` içindeki hiçbir iş native uygulamayı derlemiyor veya test etmiyor |
| Çökme ve performans takibi | Yok (Sentry, MetricKit vb. yok). TestFlight çökmeleri görünmüyor |
| Karanlık mod / yüksek kontrast | Tema yalnız açık renk; `useColorScheme` kullanılmıyor |
| Hareketi azalt, büyük metin | `AccessibilityInfo` kullanılmıyor; VoiceOver etiketi yalnız 12 dosyada |
| Donanım klavyesi, macOS menüsü | Kısayol yok, `NSMenu` yok |
| Apple Assessment Mode (AAC) | Uygulanmadı; entitlement başvurusu yapılmadı |
| Sınavda yazma yardımları | `autoCorrect` kısmen kapalı; Apple Intelligence Writing Tools, Look Up ve Çeviri kapatılmamış |
| Güçlü yanlar | Keychain anahtarlı şifreli fotoğraf kasası, kuyruk ve kurtarma testleri, release betikleri, gizlilik manifesti, tr/en/ar ve RTL |
| Hedef sürüm | iPadOS 16, macOS 14 |

## 2 Fazlar

### Faz 0 — Mühendislik temeli (1–2 hafta, önce bu)

Ölçülemeyen şey geliştirilemez.

- **Native CI.** Her PR'da `type-check`, `jest` ve `xcodebuild` (iPad simülatörü + macOS). Release build sürümü `release.json`'dan alınır.
- **Çökme ve performans takibi.** Sentry React Native (JS + native semboller) ya da MetricKit + Xcode Organizer. Sınav içi hatalar oturum kimliğiyle ilişkilendirilir; kişisel veri gönderilmez.
- **Özellik bayrakları ve minimum sürüm kontrolü** sunucudan gelir. Eski build sınava alınmaz ("lütfen güncelleyin").
- **Fiziksel cihaz matrisi.** iPad mini, iPad (A serisi, düşük kapasite), iPad Pro M serisi, Intel Mac, Apple Silicon Mac.

**Çıkış koşulu:** kırmızı CI ile birleştirme yapılamıyor; TestFlight çökmeleri 24 saat içinde görünüyor.

### Faz 1 — Sınav çekirdeği (5–7 hafta)

Ayrıntılar [EXAM_UI_EXCELLENCE_PLAN.md](EXAM_UI_EXCELLENCE_PLAN.md) aşama 0–4'te. Kritik yoldaki işler:

- `TaskSpec v1` ve bankanın çizilebilirlik raporu
- `ExamShell`
- Dinleme hakkının sunucuda sayılması
- Konuşmada sabit 180 sn yerine sorudan gelen hazırlık ve yanıt süresi
- Sürükle-bırak türleri ve entegre görev

### Faz 2 — Apple'a özgü sınav güvencesi (2–3 hafta)

- **Automatic Assessment Configuration.** Entitlement başvurusu hemen yapılır; onay süresi takvimdeki en büyük risktir. iPad ve Mac'te uygulama değiştirme, bildirimler ve ekran yakalama kapanır. Her çıkışta (normal bitiş, hata, çökme sonrası açılış) cihaz normal moda döner. [Entitlement gereksinimi](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.automatic-assessment-configuration)
- **Sınav modunda kapatılacak yardımlar.** Writing Tools (`writingToolsBehavior = .none`), otomatik düzeltme, akıllı noktalama, dikte, Look Up/Çeviri menüsü, Live Text. Okuma metninin kopyalanması da kapanır. Bunlar ölçülen beceriyi doğrudan değiştirir.
- **Ekran kaydı ve yansıtma algılama.** `UIScreen.isCaptured` ve macOS karşılığı gözetim olayı olarak kaydedilir; tek başına ihlal sayılmaz.
- **App Attest (DeviceCheck).** Sunucu, isteklerin değiştirilmemiş gerçek uygulamadan geldiğini doğrular. Bugün "güvenli mod açık" bilgisi yalnız istemcinin beyanıdır.

**Çıkış koşulu:** yetkili imzalı fiziksel cihazlarda kısıtlamalar doğrulanmış; sınav modunda hiçbir yazma veya sözlük yardımı açılamıyor.

### Faz 3 — Native his ve erişilebilirlik (3–4 hafta)

- **Tema.** Karanlık mod ve Increase Contrast için token seti; marka renkleri korunur, sınav ekranı sakin kalır.
- **Hareketi azalt ve Dynamic Type.** En büyük erişilebilirlik boyutunda ana eylem görünür kalır.
- **Klavye.** iPad'de `UIKeyCommand`, Mac'te key event'ler: 1–9 seçim, Enter gönder, ⌘↑↓ uyaran/yanıt geçişi. iPad'de ⌘ basılı tutulunca kısayol listesi çıkar.
- **macOS.** Gerçek menü çubuğu (Dosya, Görünüm, Yardım), minimum pencere boyutu, pencere durumunu hatırlama, Tam Klavye Erişimi ile tüm akış.
- **iPad.** Split View, Stage Manager ve harici ekranda düzen. Apple Pencil Scribble yazma ve boşluk alanlarında sınav politikasına göre açılır veya kapanır.
- **Liquid Glass.** Üst/alt şeritler ve sayfalar sistem malzemesine yaklaştırılır; içerik yüzeyleri düz kalır. Minimum sürüm kararına bağlıdır (bölüm 3, karar 1).
- **VoiceOver.** Her soru türü için yazılı senaryo; sürükle-bırakta özel eylemler.

**Çıkış koşulu:** VoiceOver, Tam Klavye Erişimi, en büyük metin ve karanlık modda girişten sonuca bağımsız tamamlama, iki platformda.

### Faz 4 — Performans ve dayanıklılık (1–2 hafta, Faz 3 ile paralel)

- **Hedefler:** soğuk açılış < 1,5 sn, soru geçişi p95 < 300 ms, 2 saatlik oturumda bellek artışı yok.
- **Önceden yükleme:** sonraki sorunun medyası arka planda indirilir.
- **Sıcaklık yönetimi:** kamera + Vision sürekli çalışırken `thermalState` ve pil durumuna göre analiz sıklığı düşer; kanıt kalitesi korunur.
- **Ses kesintileri:** route change ve interruption senaryoları fiziksel cihazda test edilir.

**Çıkış koşulu:** hedefler düşük kapasiteli desteklenen cihazda ölçülmüş ve sürüm kapısına bağlanmış.

### Faz 5 — Kurumsal dağıtım ve ekosistem (2–3 hafta)

Okullarda asıl farkı bu faz yaratır.

- **Managed App Configuration (MDM).** Kurum, iPad'lere kurum kimliğini ve API adresini önceden yükler. Autonomous Single App Mode ile kiosk sınavı.
- **Universal Links.** `b4skills.com/code/XXXX` uygulamada sınav kodunu doğrudan açar.
- **Giriş.** Passkey ile giriş; kurum hesabı olmayanlar için Sign in with Apple yalnız gerekirse.
- **Sonuçlar.** "Sonucunuz hazır" bildirimi (APNs), PDF raporu paylaşma, sonuç geçmişi. Geçici sonuç sertifika gibi sunulmaz.

### Faz 6 — Pilot ve kanıt (3–4 hafta, Faz 3'ten itibaren paralel)

Mevcut plandaki kabul ölçütleri burada ölçülür: çökmesiz oturum ≥ %99,9, yardımsız tamamlama ≥ %95, SUS ≥ 80, web/iPad/Mac arasında anlamlı DIF yok. Bunlar ölçülene kadar "en üst seviye" yerine "ölçülmüş hedefler" ifadesi kullanılır.

**Toplam:** tek geliştirici için kabaca 4–5 ay. Faz 1 ile Faz 2–3 kısmen paralel yürüyebilir. AAC onay süresi takvimi uzatabilir.

## 3 Ürün sahibinin vermesi gereken kararlar

1. **Minimum sürüm:** iPadOS 16 / macOS 14'te mi kalınsın, yoksa 18 / 15'e mi çıkılsın? Writing Tools kontrolü ve yeni tasarım dili yeni sürüm ister. Öneri: iPadOS 18, macOS 15.
2. **Çökme takibi:** Sentry (daha zengin, üçüncü taraf) mı, yalnız Apple MetricKit mi (veri Apple dışına çıkmaz, daha sınırlı)?
3. **AAC kapsamı:** her kurumda zorunlu mu, "güvenli değerlendirme" profiliyle isteğe bağlı mı?
4. **MDM/kiosk desteği:** ilk sürümde mi, sonra mı?

## 4 İlk hafta iş listesi

1. AAC entitlement başvurusu (yalnız hesap sahibi yapabilir).
2. Native CI işi.
3. Çökme takibi kurulumu.
4. Sınav modunda Writing Tools, Look Up ve otomatik düzeltmenin kapatılması (küçük iş, ölçme geçerliğine etkisi büyük).
5. `TaskSpec v1` ve çizilebilirlik raporuna başlangıç.
