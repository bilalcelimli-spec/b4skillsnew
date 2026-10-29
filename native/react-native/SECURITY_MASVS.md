# OWASP MASVS v2 kontrol listesi

30 Ekim 2026 · iPad, macOS, Android · [MASVS v2](https://mas.owasp.org/MASVS/) · Hedef seviye: L2 + R

Bu liste [MOBILE_WORLD_CLASS_ROADMAP.md](MOBILE_WORLD_CLASS_ROADMAP.md) bölüm 3.3'ün çalışma belgesidir. Durumlar kaynak koddan doğrulanmıştır; bağımsız sızma testi değildir. Bir madde ancak kanıtı (dosya, test veya cihaz kaydı) yazılınca ✅ olur.

✅ karşılanıyor · ⚠️ kısmen veya doğrulanmadı · ❌ yok · — bu uygulamaya uygulanmaz

## STORAGE — hassas veri saklama

| Kontrol | Durum | Kanıt | Sonraki adım |
| --- | --- | --- | --- |
| 1 Hassas veri yalnız güvenli depoda | ⚠️ | Olay kuyruğu ve fotoğraf anahtarı Keychain'de `AfterFirstUnlockThisDeviceOnly` ([B4Native.m](modules/b4-native/apple/B4Native.m) satır 334, 712); Android'de dışa aktarılamayan Keystore anahtarıyla AES-GCM, `noBackupFilesDir` ([B4Vault.kt](modules/b4-native/android/src/main/java/com/b4skills/b4native/B4Vault.kt)). Şifre cihazda saklanmıyor. | Oturum çerezleri `NSHTTPCookieStorage`'da; disk koruma sınıfı doğrulanmadı. Konuşma kaydı `NSTemporaryDirectory()` altında, açık `NSFileProtectionComplete` yok (satır 490). İkisini cihazda doğrula, gerekirse koruma sınıfını açıkça ver. |
| 2 Yedeklemeye ve dışarıya veri sızmıyor | ⚠️ | Android `allowBackup=false`; Keychain öğeleri `ThisDeviceOnly`. | iOS'ta fotoğraf kasası klasörü için `NSURLIsExcludedFromBackupKey` doğrulanmalı. Uygulama değiştiricide sınav ekranı bulanıklaştırılmıyor (anlık görüntü). |

## CRYPTO

| Kontrol | Durum | Kanıt | Sonraki adım |
| --- | --- | --- | --- |
| 1 Güncel, güçlü kriptografi | ✅ | AES-GCM (Android), Keychain anahtarlı kasa (Apple), SHA-256 fotoğraf özeti. | — |
| 2 Anahtar yönetimi | ⚠️ | Anahtarlar cihaza bağlı, dışa aktarılamıyor. | Anahtar dönüşü yok. Destekleyen cihazda StrongBox / Secure Enclave tercih edilmeli. |

## AUTH

| Kontrol | Durum | Kanıt | Sonraki adım |
| --- | --- | --- | --- |
| 1 Güvenli kimlik doğrulama protokolü | ✅ | Sunucu tarafı JWT, 15 dk erişim + 7 gün yenileme, httpOnly çerez, yenilemede ikisi de döner ([api.ts](src/api.ts)). | Passkey (yol haritası Faz 5). |
| 2 Yerel kimlik doğrulama | — | Biyometrik kilit kullanılmıyor. | — |
| 3 Hassas işlemlerde ek doğrulama | ⚠️ | Sınav başlatma idempotent ve sunucuda kredi kontrollü. | Oturumu cihaza bağlamak için App Attest / Play Integrity (RESILIENCE 4). |

## NETWORK

| Kontrol | Durum | Kanıt | Sonraki adım |
| --- | --- | --- | --- |
| 1 Tüm trafik şifreli | ✅ | iOS/macOS `NSAllowsArbitraryLoads=false`; Android `cleartextTrafficPermitted=false`, yalnız sistem CA ([network_security_config.xml](android/app/src/main/res/xml/network_security_config.xml)). Release sunucu adresi değiştirilemez ([runtimeConfig.ts](src/runtimeConfig.ts)). | — |
| 2 Uzak uç nokta kimliği | ⚠️ | Sistem güven zinciri. | Sertifika sabitleme kararı (yol haritası karar 4). |

## PLATFORM

| Kontrol | Durum | Kanıt | Sonraki adım |
| --- | --- | --- | --- |
| 1 IPC güvenli | ✅ | Özel URL şeması yok; Android'de yalnız LAUNCHER intent. Dışa açılan tek bağlantı `mailto:`. | Universal Links eklenince parametreler sunucuda doğrulanmalı. |
| 2 WebView güvenli | — | WebView yok. | — |
| 3 Arayüz hassas veri sızdırmıyor | ⚠️ | Sınav yanıt alanlarında düzenleme menüsü, otomatik doldurma, otomatik düzeltme kapalı ([examInput.ts](src/components/examInput.ts)); Writing Tools, satır içi tahmin, akıllı noktalama native olarak kapalı ([B4ExamTextTraits.m](modules/b4-native/apple/B4ExamTextTraits.m), testi [exam-input-aids.test.tsx](__tests__/exam-input-aids.test.tsx)). | Ekran yakalama algılama (`UIScreen.isCaptured`) yok; Android'de `FLAG_SECURE` yok. Dikte kapatılamıyor. Apple AAC entitlement'ı başvuru bekliyor. |

## CODE

| Kontrol | Durum | Kanıt | Sonraki adım |
| --- | --- | --- | --- |
| 1 Güncel platform sürümü | ✅ | Android `targetSdk 36`, `minSdk 29`; iPadOS 16+, macOS 14+. | Minimum sürüm kararı (yol haritası karar 3). |
| 2 Güncelleme zorlama | ❌ | — | Sunucudan minimum sürüm kontrolü (Faz 0'dan kalan). |
| 3 Güvenlik açığı olmayan bileşenler | ✅ | CI'da native `npm audit` (yüksek/kritik), Dependabot npm + Gradle ([native.yml](../../.github/workflows/native.yml)). | CocoaPods için tarama yok. |
| 4 Girdi doğrulama | ✅ | Sunucu yanıtları kullanılmadan önce tip/aralık kontrolünden geçiyor (ör. `cameraPolicy`, kanıt makbuzu). Sunucuda strict Zod şemaları. | Paylaşılan sözleşme paketi (yol haritası 3.2 madde 4). |

## RESILIENCE

| Kontrol | Durum | Kanıt | Sonraki adım |
| --- | --- | --- | --- |
| 1 Platform bütünlüğü | ❌ | Jailbreak/root sinyali yok. | Gözetim olayı olarak kaydet; tek başına ihlal sayma. |
| 2 Kurcalamaya karşı | ⚠️ | Android R8 küçültme ve karartma açık; Hermes bytecode. | — |
| 3 Statik analize karşı | ⚠️ | R8, Hermes. | — |
| 4 Dinamik analize karşı / uygulama kimliği | ❌ | "Güvenli mod açık" yalnız istemci beyanı. | App Attest + Play Integrity, sunucuda doğrulama. |

## PRIVACY

| Kontrol | Durum | Kanıt | Sonraki adım |
| --- | --- | --- | --- |
| 1 Veri en aza indirilmiş | ✅ | Kamera kareleri cihazdan çıkmaz; yalnız tek yüzlü başlangıç fotoğrafı gönderilir. Canlı gözetim yok. | — |
| 2 Kimlik çıkarımı önleniyor | ✅ | Takip yok (`NSPrivacyTracking=false`), reklam kimliği yok. | — |
| 3 Şeffaflık | ✅ | Gizlilik manifesti sürüm ön kontrolünde doğrulanıyor ([preflight.py](scripts/release/preflight.py)); sınav öncesi açık veri kullanım metni. | Play Veri Güvenliği formu manifestle aynı olmalı. |
| 4 Kullanıcı kontrolü | ⚠️ | Kurum kamerayı kapatabilir (`nativeCameraPilot.enabled=false`). | Primary/Junior için veli onayı akışı; KVKK/GDPR silme talebi yolu. |

## Özet

| Alan | ✅ | ⚠️ | ❌ |
| --- | --- | --- | --- |
| STORAGE | 0 | 2 | 0 |
| CRYPTO | 1 | 1 | 0 |
| AUTH | 1 | 1 | 0 |
| NETWORK | 1 | 1 | 0 |
| PLATFORM | 1 | 1 | 0 |
| CODE | 3 | 0 | 1 |
| RESILIENCE | 0 | 2 | 2 |
| PRIVACY | 3 | 1 | 0 |

En büyük boşluklar: cihaz ve uygulama bütünlüğü (App Attest / Play Integrity), zorunlu güncelleme, ekran yakalama algılama ve dosya koruma sınıflarının cihazda doğrulanması.
