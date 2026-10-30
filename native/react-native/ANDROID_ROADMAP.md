# Android uygulaması yol haritası

27 Ekim 2026

Amaç: iPad/macOS'ta TestFlight `1.0.0 (5)` ile dağıtılan React Native uygulamasını aynı kod tabanından Android'e taşımak ve Google Play'de yayınlamak. Android, Apple sürümünün önüne geçmez; aynı özellik setini hedefler (Apple'da henüz olmayan sürükle-bırak, güvenli mod, PDF vb. burada da sonraya kalır).

Süreler tek geliştirici için kaba tahmindir; fiziksel cihaz sonuçlarından sonra güncellenir.

## 1 Mevcut durum: ne hazır, ne eksik

**Hazır (değişmeden taşınır):**

- Tüm JS/TS akışı: `api.ts`, `useAssessment.ts`, giriş/kod kartları, tanıtım, soru/sonuç ekranları, i18n (tr/en/ar), proctoring koordinatörü, olay ve fotoğraf kuyruğunun JS tarafı.
- Bağımlılıklar Android'i destekliyor: `react-native 0.83.10`, `react-native-svg`, `react-native-safe-area-context`.
- Jest testleri (112) büyük ölçüde platformdan bağımsız; `live-smoke`, `e2e:code` API düzeyinde zaten çalışıyor.
- Backend: oturum, kod, kredi, idempotent başlatma (`launchRequestId`) Android için ek iş gerektirmez.

**Eksik:**

1. `android/` klasörü yok; `@react-native-community/cli-platform-android` bağımlılığı yok.
2. **Asıl iş: `modules/b4-native`** yalnızca Apple (ObjC, ~780 satır). Android'de `NativeModules.B4Native` olmadığı için `src/native.ts` açılışta hata fırlatır. Kotlin karşılığı yazılmalı.
3. Platform tipi `'ipad' | 'macos'` sabit: `src/proctoring/protocol.ts`, `src/api.ts` ve backend'de `src/lib/proctoring/exam-policy.ts`, `src/lib/proctoring/native-evidence.ts` Zod enumları. `'android'` eklenmeli, aksi halde gözetim politikası ve kamera kanıtı sunucuda reddedilir.

## 2 Native modülün Android karşılıkları

`src/native.ts` arayüzü aynı kalır; yalnız native taraf yazılır.

| JS metodu | iOS/macOS'ta | Android karşılığı | Dikkat |
| --- | --- | --- | --- |
| `requestMicrophone`, `startRecording`, `stopRecording`, `cancelRecording`, `recordingLevel` | AVAudioRecorder, AAC/M4A, 180 sn | `MediaRecorder` (MPEG_4 + AAC) → aynı `audio/mp4`; seviye `getMaxAmplitude()` | Backend/Whisper aynı formatı alır. Çağrı/odak kaybında kaydı koru: `AudioManager` audio focus. OEM'lerde (Samsung, Xiaomi) örnekleme hızı farkı denenmeli. |
| `play`, `stopPlayback` | AVPlayer; söz gerçekten çalınca çözülür, 20 sn zaman aşımı | Media3 ExoPlayer; `onIsPlayingChanged(true)` ile çöz, hata/zaman aşımında reddet | Dinleme hakkı kuralları buna bağlı; JS testleriyle aynı sözleşme korunmalı. |
| `startCamera`, `stopCamera`, `captureCamera`, `B4CameraPreview` görünümü | AVFoundation + Vision yüz sayımı (sn'de 1 kare) | CameraX Preview + ImageAnalysis (1 fps) + ML Kit yüz algılama (cihazda, paketli model) | `faceCount`, `sha256`, JPEG yönü iOS ile aynı anlamda olmalı. Kareler cihazdan çıkmaz. |
| `photoRead`, `photoWrite` (şifreli fotoğraf kasası) | Keychain anahtarı + AES | Android Keystore'da AES-GCM anahtarı; dosyalar `noBackupFilesDir` altında | Yedeklemeye girmemeli (`allowBackup=false` veya backup kuralları). |
| `secureRead`, `secureWrite` | Keychain (`ThisDeviceOnly`) | Keystore + AES-GCM ile şifrelenmiş SharedPreferences/DataStore | `EncryptedSharedPreferences` artık önerilmiyor; doğrudan Keystore kullan. |
| `getPref`, `setPref`, `setPrefAsync`, `removePref` | UserDefaults | SharedPreferences | `ui-language`, `onboarded` aynı anahtarlarla. |
| `newRequestId` | UUID | `UUID.randomUUID()` | — |
| `clearCookies` | NSHTTPCookieStorage | `android.webkit.CookieManager` (RN Android fetch çerezleri buradan yönetir) | httpOnly `refreshToken` çerezinin uygulama yeniden açılınca kalıcılığı doğrulanmalı. |
| `B4SecureField.focus` | Mac şifre alanı yardımcısı | Muhtemelen gereksiz; `TextInput secureTextEntry` yeterli | `PasswordInput.tsx` Android'de denenmeli. |

Öneri: Modül için tek bir TypeScript TurboModule spec'i yazmak; codegen iki platformda da tip güvenliği sağlar. Zorunlu değil, eski köprü (interop) 0.83'te çalışıyor.

## 3 Gözetim (proctoring) karşılıkları

İlk sürüm kapsamı Bölüm 6'da: Apple ile aynı gözetim + ekran sabitleme + Play Integrity.

| Yetenek | Apple | Android | Not |
| --- | --- | --- | --- |
| Yaşam döngüsü olayları | AppState, pencere olayları | AppState + `onWindowFocusChanged` (bildirim paneli, sistem penceresi), `isInMultiWindowMode` (bölünmüş ekran), PiP | İzin penceresi ve TalkBack kaynaklı odak kaybı "ihlal" sayılmamalı (iOS'taki kural). |
| Geri tuşu | Yok | `BackHandler`: sınav sırasında geri tuşu/hareketi uygulamadan çıkarmamalı; çıkış yalnız mevcut çıkış kontrolüyle | Android'e özgü yeni iş. |
| Ekran görüntüsü engeli | AAC kapsamında | `FLAG_SECURE` sınav ekranlarında | Kolay ve etkili; ilk sürüme alınabilir. Politika ile açılıp kapanmalı. |
| Güvenli mod (AAC karşılığı) | Automatic Assessment Configuration (entitlement) | Lock Task Mode: yönetilmeyen cihazda yalnızca "ekran sabitleme" (aday çıkabilir); tam kilit Device Owner/EMM ister | Apple'daki gibi sonraya bırak. Kurumsal tablet filoları için EMM yolu ayrı tasarım. |
| Cihaz bütünlüğü | — | Play Integrity API (sunucuda doğrulanır) | Parity planındaki "attestation" maddesine denk; root/emülatör tespiti için. |
| Pano | Yanıt alanında sınırlama | Aynı; panoyu okumayın (Android 12+ kullanıcıya bildirim gösterir) | — |

## 4 Aşamalar

### Aşama 0 · Kararlar ve iskelet (2–3 gün)

- Kararlar Bölüm 6'da: yalnız tablet, `minSdk 29`, paket adı `com.b4skills.assessment`.
- RN 0.83.10 şablonundan `android/` oluştur, `cli-platform-android` ekle, `npm run android` betiği.
- `modules/b4-native/android/` iskeleti (build.gradle, boş Kotlin modülü) ve autolinking.
- Uygulama simgesi (adaptive icon: ön plan + `#1E0820` zemin), açılış ekranı (Android 12 SplashScreen API, aynı mor zemin, beyaz flaş yok).
- Release sunucusu `https://b4skills.com`; Debug'da HTTP yalnız yerel ağ için `network_security_config`.

**Çıkış:** Emülatörde logolu açılış sayfası, tanıtım ve e-posta formu görünüyor; native modül eksik metotlarda anlamlı hata veriyor, çökmüyor.

### Aşama 1 · Temel sınav, gözetimsiz (1–1,5 hafta)

- Tercihler, güvenli depolama, çerez temizliği, `newRequestId`.
- Ses kaydı ve dinleme oynatma (Bölüm 2 sözleşmeleriyle).
- Platform tipine `'android'` ekle (istemci + backend Zod + gözetmen paneli filtresi); backend önce dağıtılır.
- `npm run e2e:backend` + emülatörde tam sınav; `e2e:code` akışı uygulama arayüzünden.
- Gerçek veritabanıyla bir tam sınav (`e2e:real-backend`).

**Çıkış:** Emülatörde ve en az bir fiziksel tablette kodla giriş → hazırlık (mikrofon testi) → 5 bölüm → sonuç; konuşma kaydı sunucuda kabul edildi; uygulama kapatılıp açılınca oturum devam ediyor.

### Aşama 2 · Gözetim eşitliği + ekran sabitleme + Play Integrity (2–2,5 hafta)

- Yaşam döngüsü olayları, geri tuşu kontrolü, `FLAG_SECURE`.
- CameraX önizleme + ML Kit yüz sayımı + `captureCamera`.
- Şifreli fotoğraf kasası; kuyruk testleri (`test:photo-vault` ve `verify-native-photo-queue` Android karşılıkları).
- Kamera/mikrofon/ses koordinasyonu: konuşma kaydı ve kamera aynı anda.

- Ekran sabitleme: sınav başında `startLockTask`, sabitleme durumu değişimini olay olarak gönder (yeni olay türü için protokol v2/`OTHER` metadatası, backend ile birlikte).
- Play Integrity: istemcide standart istek, backend'de belirteç doğrulama endpoint'i; sonuç oturuma ve gözetmen paneline. Google Cloud projesinin Play Console'a bağlanması gerekir.

**Çıkış:** `e2e:proctoring`, `e2e:camera`, `e2e:camera-queue` Android cihazla geçiyor; olaylar, sabitleme durumu, bütünlük sonucu ve kamera kanıtı yönetici panelinde `android` platformuyla görünüyor.

### Aşama 3 · Android'e özgü cila (≈1 hafta)

- Edge-to-edge (yeni `targetSdk` ile zorunlu): durum/gezinme çubuğu altında içerik kalmamalı.
- Klavye: yazma sorusu ve kod alanı klavye açılınca görünür kalmalı.
- Arapça RTL: `android:supportsRtl` ve mevcut "sistem RTL'sini değiştirme" yaklaşımı Android'de denenmeli.
- Farklı ekran boyutları/yoğunlukları, yazı ölçeği (büyük font), yatay/dikey, TalkBack.
- Düşük donanım performansı (giriş seviyesi Samsung/Lenovo tablet): açılış süresi, kayıt sırasında takılma.
- Sistem izin dili: `values-tr`, `values-ar` izin açıklamaları ve uygulama adı.

**Çıkış:** Bölüm 5'teki cihaz matrisi elle geçildi; macOS'ta yapılan RTL/dil geçişi kontrollerinin aynısı Android'de temiz.

### Aşama 4 · Play'de yayın (1 hafta iş + bekleme)

- Play Console hesabı, Play App Signing, upload anahtarı; AAB üretimi (`release:bundle` benzeri betik).
- Veri güvenliği formu: e-posta, ses kaydı, kamera fotoğrafı (değerlendirme/gözetim amaçlı), şifreleme, silme yolu. App Store gizlilik etiketleriyle tutarlı olmalı.
- İçerik derecelendirmesi, hedef kitle (çocuk profilleri varsa Aileler politikası ayrıca değerlendirilmeli), inceleme için test hesabı.
- Dahili test kanalı (TestFlight karşılığı) → kapalı test → üretim.
- **Bekleme süresi:** Kişisel geliştirici hesaplarında üretime çıkmadan önce kapalı testte belirli sayıda testçiyle (şu an 12 kişi, 14 gün) test zorunluluğu var. Kuruluş hesabıyla bu şart yok; hesap türü baştan seçilmeli.

**Çıkış:** Dahili testte çalışan sürüm; kapalı test başladı.

### Aşama 5 · Sonraya bırakılanlar

- Tam güvenli mod (Device Owner/EMM ile Lock Task) kurumsal tablet filoları için.
- Telefon ve Chromebook desteği.
- Apple tarafında henüz olmayan özellikler (sürükle-bırak, PDF, kalıcı çevrimdışı taslak) iki platformda birlikte.

**Toplam:** İlk dahili test sürümüne ≈5–6 hafta; üretime, hesap kişiselse kapalı test süresiyle birlikte ≈7–8 hafta, kuruluş hesabıysa ≈6 hafta.

## 5 Test cihaz matrisi (öneri)

| Cihaz sınıfı | Örnek | Neden |
| --- | --- | --- |
| Giriş seviyesi tablet | Samsung Galaxy Tab A serisi | Okullarda en yaygın; performans ve ses tabanı |
| Orta/üst tablet | Samsung Galaxy Tab S serisi | One UI çoklu pencere, DeX, S Pen |
| Başka OEM | Lenovo Tab veya Xiaomi Pad | Agresif pil yönetimi, farklı kamera/ses sürücüleri |
| En eski desteklenen Android | Android 10 (API 29) emülatör + mümkünse bir cihaz | İzin ve depolama farkları |

## 6 Kararlar (27 Ekim 2026)

1. **Cihazlar: yalnız tablet.** iPad sürümüyle aynı kapsam. Telefonlar Play'de ekran boyutu/cihaz kataloğu filtresiyle dışarıda kalır. Chromebook ve telefon Aşama 5'e kaldı.
2. **`minSdk` 29 (Android 10).** Kapsamlı depolama ve modern izin modeli varsayılır; daha eski sürümler için uyumluluk kodu yazılmaz. Bedeli: Android 9 ve altındaki eski okul tabletleri uygulamayı göremez. `targetSdk` Play'in güncel şartına göre ayarlanır.
3. **Play hesabı: mevcut hesap kullanılacak.** Hesabın türü (kişisel/kuruluş) Aşama 4'ten önce Play Console'da kontrol edilmeli. Kişiselse kapalı test şartı (şu an 12 testçi, 14 gün) takvime eklenir; testçi listesi Aşama 2 sırasında hazırlanmaya başlanmalı.
4. **Gözetim: Apple ile aynı + ekran sabitleme + Play Integrity.** Kamera pilotu, yüz sayımı, şifreli fotoğraf kuyruğu ve yaşam döngüsü olayları kurum politikasıyla açılır. Buna ek olarak ilk sürüme:
   - **Ekran sabitleme** (`startLockTask` yönetilmeyen cihazda): Sınav başlarken sabitleme istenir; aday sabitlemeden çıkarsa bu olay kaydedilir ve politikaya göre ele alınır. Bu bir kilit değildir, aday çıkabilir; kurumlara böyle anlatılmalı.
   - **Play Integrity:** Sınav başlatılırken alınan bütünlük belirteci sunucuda doğrulanır; sonuç (cihaz/uygulama bütünlüğü) oturuma ve gözetmen paneline yazılır. Başarısız sonuç sınavı kendiliğinden engellemez; davranışı kurum politikası belirler.
   - Tam kilit (Device Owner/EMM ile Lock Task) hâlâ kapsam dışı.

## 7 Riskler

- **OEM farklılıkları:** Ses kayıt formatı, kamera yönü, pil optimizasyonunun arka plandaki kuyruğu durdurması. Erken fiziksel cihaz testi şart.
- **Çerez kalıcılığı:** Android'de yenileme çerezinin yeniden açılışta kalması doğrulanmazsa adaylar sık sık çıkış yapmış görünür.
- **Güvenlik algısı:** Android'de yönetilmeyen cihazda AAC düzeyinde kilit yok. Kurumlara "standart" ve "gözetimli" profil sunulmalı, "güvenli değerlendirme" Android'de EMM şartına bağlanmalı.
- **Backend sırası:** `'android'` platform enumu uygulamadan önce üretime dağıtılmalı; yoksa gözetimli oturumlar sunucuda 400 alır.
- **İki dosya ağacının ayrışması:** Platform dosyaları (`*.android.tsx`) en aza indirilmeli; macOS'taki geçici çözümler (Modal → Sheet, `useNativeDriver` kapalı) Android'de gerekmiyorsa yalnız macOS'a kısıtlanmalı.
