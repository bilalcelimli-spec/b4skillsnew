# Mobil uygulamaları dünya standardına taşıma yol haritası

29 Ekim 2026 · Kapsam: iPad, macOS, Android (ve karar verilirse iPhone / Android telefon)

Bu belge bir **şemsiye plandır**. Mevcut planların yerine geçmez; onları beş boyutta (arayüz, kod kalitesi, güvenlik, içerik derinliği, içerik genişliği) tek sıraya koyar ve o planlarda olmayan işleri ekler.

| Mevcut plan | Kapsadığı alan |
| --- | --- |
| [APPLE_ROADMAP.md](APPLE_ROADMAP.md) | Apple platform uyumu, AAC, MDM, Faz 0–6 |
| [ANDROID_ROADMAP.md](ANDROID_ROADMAP.md) | Android taşıma, Kotlin modülü, Play Integrity |
| [EXAM_UI_EXCELLENCE_PLAN.md](EXAM_UI_EXCELLENCE_PLAN.md) | Soru türü düzeyinde etkileşim, `TaskSpec` |
| [EXAM_EXPERIENCE_ROADMAP.md](EXAM_EXPERIENCE_ROADMAP.md) | Profil davranışları, `ExamShell`, kabul ölçütleri |
| [WEB_FEATURE_PARITY_ROADMAP.md](WEB_FEATURE_PARITY_ROADMAP.md) | Gözetim ve web özellik eşitliği |

Süreler tek geliştirici için kaba tahmindir. Hedefler ölçülmüş sonuç değildir.

---

## 1 "Dünya standardı" burada ne demek

"State of the art" bir his değil, dışarıdan doğrulanabilen ölçütler kümesi olarak tanımlanır. Bir boyut ancak aşağıdaki ölçütü karşılayınca "tamam" sayılır.

| Boyut | Referans standart | Ölçülebilir hedef |
| --- | --- | --- |
| Arayüz ve deneyim | Apple HIG, Material 3, WCAG 2.2 AA (WCAG2ICT ile) | SUS ≥ 80; yardımsız tamamlama ≥ %95; VoiceOver/TalkBack, en büyük metin ve karanlık modda girişten sonuca tamamlama |
| Kod kalitesi | Sürekli entegrasyon, tip güvenliği, test piramidi | Kırmızı CI ile birleştirme yok; 0 lint hatası; sınav çekirdeğinde ≥ %85 satır kapsamı; çökmesiz oturum ≥ %99,9 |
| Güvenlik | OWASP MASVS v2 (L2 + R), MASTG testleri | Bağımsız sızma testinde kritik/yüksek bulgu yok; MASVS kontrol listesi kanıtlarıyla dolu; cihaz bütünlüğü sunucuda doğrulanıyor |
| İçerik derinliği | Web sınav eşitliği, CEFR Companion Volume, QTI 3 etkileşim modeli | Web'deki tüm soru türleri ve profiller native'de; sonuç raporu beceri + "can-do" + güven aralığı içeriyor |
| İçerik genişliği | Hedef kitlenin kullandığı tüm cihazlar ve diller | Karar verilen her cihaz sınıfı ve dilde tam sınav; alıştırma ve hazırlık akışı |

---

## 2 Bugünkü durum (kaynak koddan doğrulandı, 29 Ekim 2026)

**Güçlü yanlar:** Keychain/Keystore anahtarlı şifreli fotoğraf kasası; dayanıklı olay ve fotoğraf kuyruğu; idempotent başlatma ve yanıt kurtarma; 114 Jest testi; release sürümü sunucu adresini kilitliyor; ATS açık (`NSAllowsArbitraryLoads=false`); Android'de `allowBackup=false` ve `network_security_config`; gizlilik manifesti; tr/en/ar ve RTL; release betikleri.

| Boyut | Açık |
| --- | --- |
| Arayüz | Yalnız açık tema (`useColorScheme` yok). Dynamic Type / `AccessibilityInfo` kullanılmıyor. Erişilebilirlik etiketi yalnız 12 dosyada. Klavye kısayolu ve macOS menüsü yok. |
| Kod kalitesi | `.github/workflows` içinde native'i derleyen veya test eden iş yok. ESLint'te 196 sorun. 10 `any`. `App.tsx` 576, `Onboarding.tsx` 611, `ItemScreen.tsx` 495 satır. Native kodda (ObjC ~870, Kotlin ~490 satır) birim testi yok. Çökme/performans takibi yok. |
| Güvenlik | Android release'te R8/ProGuard kapalı (`enableProguardInReleaseBuilds = false`). App Attest / Play Integrity yok; "güvenli mod açık" yalnız istemci beyanı. AAC uygulanmadı. Sınavda Writing Tools, Look Up, Çeviri açık. Oturum çerezleri platformun çerez deposunda; koruma sınıfı doğrulanmadı. Native bağımlılıklar `security.yml` taramasına girmiyor. Sızma testi yapılmadı. |
| İçerik derinliği | 4 yanıt modu (seçim, boşluk, yazma, ses). Sürükle-bırak ailesi ve entegre görev yok. Özgün Kids sabit formu web'e yönlendiriliyor. Konuşmada sabit 180 sn. Sonuç ekranı yalnız CEFR + beceri puanı; PDF, geçmiş, sertifika doğrulama yok. Alıştırma modu yok. |
| İçerik genişliği | iOS'ta yalnız iPad (`TARGETED_DEVICE_FAMILY = 2`); iPhone yok. Android'de tablet hedefi, telefon kararı açık. Arayüz dili 3 (tr/en/ar). Aday dışında rol yok (gözetmen, değerlendirici, kurum yöneticisi). |

---

## 3 Beş iş kolu

Her madde, ilgili ayrıntı başka planda ise oraya bağlanır. **Yeni** etiketi, hiçbir mevcut planda olmayan işi gösterir.

### 3.1 Arayüz ve deneyim

1. **Tasarım sistemi v2** — `theme.ts` token'larını anlamsal katmana taşı (yüzey, metin, vurgu, durum). Açık, koyu ve yüksek kontrast setleri. Marka renkleri (`#9B276C`, `#0F172A`, `#FDE047`) korunur; sarı yalnız vurgu. *(APPLE Faz 3)*
2. **Dinamik tipografi** — Dynamic Type / Android font ölçeği; en büyük boyutta ana eylem görünür. `maxFontSizeMultiplier` yalnız gerekçeli yerlerde. *(APPLE Faz 3)*
3. **Platforma özgü his** — iPad/Mac'te Liquid Glass şeritleri, gerçek menü çubuğu, klavye kısayolları; Android'de Material 3, kenardan kenara görünüm, tahmine dayalı geri hareketi. *(APPLE Faz 3, ANDROID)*
4. **Hareket ve dokunsal geri bildirim** — **Yeni.** Tek bir hareket kütüphanesi (süre, eğri) token olarak; "Hareketi azalt" açıkken kapanır. Yanıt gönderildi, kayıt başladı gibi anlarda hafif haptik. Sınav içinde dikkat dağıtan animasyon yok.
5. **Durum tasarımı** — **Yeni.** Her ekran için boş, yükleniyor, hata, çevrimdışı ve "sunucu onayı bekleniyor" durumlarının tasarım kataloğu. Tutarlı hata dili (ne oldu, yanıtınız güvende mi, ne yapmalısınız).
6. **Görsel regresyon** — **Yeni.** Her ekranın açık/koyu/büyük metin/RTL ekran görüntüleri CI'da karşılaştırılır.
7. **Kullanılabilirlik ölçümü** — Her yaş grubunda pilot; SUS, görev başarısı, hata sayısı. *(APPLE Faz 6)*

### 3.2 Kod kalitesi ve mühendislik

1. **Native CI** — Her PR'da `type-check`, `lint` (0 hata, 0 uyarı), `jest`, `xcodebuild` (iPad simülatörü + macOS), `gradlew assembleRelease` + Android birim testleri. *(APPLE Faz 0; Android kısmı **yeni**)*
2. **Lint ve tip borcu** — **Yeni.** 196 lint sorunu ve 10 `any` sıfırlanır. `@typescript-eslint/no-explicit-any` uygulama kodunda hata seviyesinde. *Durum (29 Ekim):* hata 0, `any` 0. Kalan 166 satır içi stil uyarısı tasarım sistemi v2'de (Faz 3) token'lara taşınacak; o zamana kadar CI'da tavan (`lint:ci --max-warnings 166`), sayı yalnız düşebilir.
3. **Mimari bölme** — **Yeni.** `App.tsx` gezinme + sağlayıcılar olarak kalır; ekran durumu ayrı modüllere. Sınav akışı (`useAssessment.ts`) açık bir durum makinesine çevrilir (reducer veya XState): her durum ve geçiş test edilebilir, imkânsız durumlar tipte engellenir. `ExamShell` / `ItemRenderer` / `ResponseCodec` ayrımı *(EXAM_EXPERIENCE)*.
4. **Paylaşılan sözleşme paketi** — **Yeni.** Backend'in Zod şemaları (olay protokolü, `ExamPolicy`, `TaskSpec`, yanıt kodlaması) tek pakette; native ve web aynı tipi içe aktarır. Elle kopyalanan tipler kalkar, sözleşme kayması derleme hatası olur.
5. **TurboModule spec'i** — `B4Native` için tek TypeScript spec; codegen iki platformda tip güvenliği sağlar. *(ANDROID öneri olarak; burada zorunlu)*
6. **Test piramidi** — **Yeni** katmanlar:
   - Native birim testleri: XCTest (kayıt, kasa, kamera durumu), JUnit/Robolectric (Kotlin karşılıkları).
   - Cihazda uçtan uca: Maestro veya Detox ile kodla giriş → 5 bölüm → sonuç, her platformda.
   - Sözleşme testleri: her yanıt türünün golden fixture'ı backend puanlayıcısına karşı.
   - Kapsam eşiği: sınav çekirdeği, kuyruklar, kurtarma için ≥ %85.
7. **Gözlemlenebilirlik** — Çökme + performans takibi (Sentry veya MetricKit/Android Vitals; karar 2). Oturum kimliğiyle ilişkili, kişisel veri içermeyen kayıtlar. *(APPLE Faz 0)*
8. **Yayın mühendisliği** — **Yeni.** Fastlane ile imzalı build, sürüm numarası `release.json`'dan, TestFlight ve Play iç test kanalına otomatik yükleme, Play'de kademeli yayın. Sunucudan minimum sürüm ve özellik bayrağı *(APPLE Faz 0)*. Sınav bütünlüğü için OTA JS güncellemesi kullanılmaz.
9. **Bağımlılık hijyeni** — **Yeni.** React Native'i her ana sürümden en geç bir çeyrek sonra güncelleme takvimi; Renovate/Dependabot native dizinleri için; Pod ve Gradle kilit dosyaları incelemeyle değişir.
10. **Performans bütçesi** — Soğuk açılış < 1,5 sn, soru geçişi p95 < 300 ms, 2 saatlik oturumda bellek artışı yok; düşük kapasiteli cihazda ölçülür ve sürüm kapısına bağlanır. *(APPLE Faz 4)*

### 3.3 Güvenlik ve gizlilik (OWASP MASVS v2 ile)

| MASVS alanı | İş | Kaynak |
| --- | --- | --- |
| STORAGE | Oturum çerezlerinin disk koruma sınıfını doğrula; gerekirse yenileme belirtecini Keychain/Keystore'a taşı (`ThisDeviceOnly`). Ses taslakları ve önbellek dosyaları için `FileProtectionComplete` / `noBackupFilesDir`. Çıkışta tüm sınav verisini sil. Uygulama değiştiricide sınav ekranı bulanıklaştırılır. | **Yeni** |
| CRYPTO | Mevcut AES-GCM + Keychain/Keystore kullanımını gözden geçir; anahtar dönüşü ve donanım destekli anahtar (Secure Enclave / StrongBox) kullanılabilirse tercih edilir. | **Yeni** |
| AUTH | Passkey ile giriş; kısa ömürlü erişim belirteci zaten var. Oturum, App Attest / Play Integrity ile cihaza bağlanır. | APPLE Faz 5 + **yeni** bağlama |
| NETWORK | ATS ve Android ağ yapılandırması korunur. Sertifika sabitleme kararı (karar 4): sabitlenirse açık anahtar + yedek anahtar ve uzaktan devre dışı bırakma yolu ile. | **Yeni** |
| PLATFORM | AAC (Apple), `FLAG_SECURE` + ekran sabitleme (Android). Sınavda Writing Tools, Look Up, Çeviri, otomatik düzeltme, dikte kapalı. Universal/App Links doğrulanmış alan adıyla; derin bağlantı parametreleri sunucuda doğrulanır. | APPLE Faz 2, ANDROID |
| CODE | Android'de R8 + kaynak küçültme açılır (kurallar test edilerek). Hermes bytecode, kaynak haritaları yalnız çökme servisine. Native bağımlılıklar için SBOM ve güvenlik açığı taraması `security.yml`'a eklenir. | **Yeni** |
| RESILIENCE | App Attest ve Play Integrity **sunucuda** doğrulanır. Jailbreak/root, hata ayıklayıcı, emülatör sinyalleri gözetim olayı olarak kaydedilir; tek başına ihlal kararı değildir. | APPLE Faz 2, ANDROID + **yeni** sinyaller |
| PRIVACY | Veri envanteri (ne toplanır, nerede saklanır, ne kadar). Apple gizlilik etiketi, Play Veri Güvenliği formu, KVKK/GDPR aydınlatma metni ile birebir eşleşir. Primary ve Junior profilleri için çocuk verisi kuralları (veli onayı, en az veri). | **Yeni** |

**Bağımsız doğrulama** — **Yeni.** Kurumsal yaygınlaştırmadan önce MASTG tabanlı dış sızma testi (iOS + Android + API). Bulgular kapatılmadan "güvenli değerlendirme" profili satılmaz. Sonrasında yılda bir tekrar ve bir güvenlik açığı bildirim politikası (`security.txt`).

### 3.4 İçerik derinliği

1. **Soru türü eşitliği** — Eşleştirme, sıralama, yerleştirme (dokunarak seç-yerleştir alternatifiyle) ve entegre görevler. Konuşmada hazırlık/yanıt süresi sorudan gelir. *(EXAM_UI_EXCELLENCE aşama 0–4)*
2. **Tüm profiller** — Dokuz uyarlanabilir profil ve Özgün Kids sabit formu native'de; web yönlendirmesi kalkar. *(EXAM_EXPERIENCE)*
3. **Zengin sonuç raporu** — **Yeni** kapsam:
   - Beceri başına CEFR düzeyi ve ölçme belirsizliğini gösteren aralık (SEM'den).
   - CEFR Companion Volume "can-do" ifadeleriyle anlaşılır açıklama: "Bu düzeyde şunları yapabilirsiniz".
   - Bir sonraki düzey için 2–3 somut çalışma önerisi (genel öneri; kişisel ders vaadi değil).
   - Geçici ve kesinleşmiş sonuç açıkça ayrılır; kesinleşmiş sonuçta PDF ve doğrulanabilir sertifika bağlantısı (QR).
   - Sonuç geçmişi ve "sonucunuz hazır" bildirimi *(APPLE Faz 5)*.
4. **Alıştırma ve hazırlık** — Kredi tüketmeyen, puanlanmayan örnek sorular; her soru türü için kısa etkileşimli öğretici; cihaz kontrolü. *(WEB_FEATURE_PARITY P1)* Örnek sorular canlı bankadan değil, ayrı bir "örnek" havuzundan gelir; böylece sınav güvenliği korunur.
5. **Medya kalitesi** — **Yeni.** Dinleme seslerinde ses yüksekliği normalizasyonu (ör. −16 LUFS), onaylı uyarlamalar için altyazı/transkript seçeneği (yalnız politika izin verirse), görsellerde alt metin zorunluluğu. Bankaya yükleme sırasında otomatik kontrol.
6. **Aday geri bildirimi** — Sınav sonunda isteğe bağlı kısa anket; sonuçlar soru ve arayüz iyileştirmesine girer. *(WEB_FEATURE_PARITY P2)*

### 3.5 İçerik genişliği

1. **Cihaz sınıfları** — Karar 1'e bağlı:
   - **iPhone ve Android telefon:** tam sınav küçük ekranda zordur (uzun okuma, yazma). Önerilen yol: telefonda **alıştırma, hazırlık, sonuçlar ve sertifika**; puanlı tam sınav tablet/Mac/web'de. Kurum isterse kısa profiller (Rapid Diagnostic) telefonda açılır, ancak ayrı DIF analizi yapılmadan puan eşdeğer sayılmaz.
   - **Android tablet ve katlanabilir:** pencere boyutu sınıflarına göre düzen.
2. **Arayüz dilleri** — **Yeni.** tr/en/ar'a ek olarak hedef pazara göre (ör. es, de, fr, ru, zh, ja, fa). Çeviri bellek dosyası ve sözde-yerelleştirme testi CI'da (uzun metin, RTL, eksik anahtar). Soru içeriği İngilizce kalır; yalnız yönergeler ve arayüz çevrilir.
3. **Roller** — **Yeni**, sonraki aşama: iPad'de gözetmen kanıt inceleme ve insan değerlendirici (konuşma/yazma puanlama) görünümü. Bu, değerlendirici kuyruğunu hızlandırır ve tableti olan kurumlara ek değer sunar.
4. **Kurumsal dağıtım** — MDM yapılandırması, kiosk modu, Universal Links ile sınav kodu. *(APPLE Faz 5)* Android'de EMM / Android Enterprise karşılığı.

---

## 4 Sıralama

İş kolları paralel yürür, ama sıra şudur: ölçemediğini geliştiremezsin, güvenmediğin şeyi yaygınlaştıramazsın.

| Faz | Süre | İçerik | Çıkış koşulu |
| --- | --- | --- | --- |
| **0 · Temel** | 2 hafta | Native CI (iOS + macOS + Android), lint/`any` borcu sıfır, çökme takibi, minimum sürüm kontrolü, R8 açık, native bağımlılık taraması | Kırmızı CI ile birleştirme yok; TestFlight/Play çökmeleri 24 saatte görünür |
| **1 · Sınav çekirdeği** | 5–7 hafta | Paylaşılan sözleşme paketi, durum makinesi, `TaskSpec v1`, `ExamShell`, sürükle-bırak ve entegre görev, sunucudan gelen süreler | Web'deki her soru türü iki platformda; golden fixture testleri yeşil |
| **2 · Sınav güvencesi** | 3 hafta (1 ile kısmen paralel) | AAC, `FLAG_SECURE` + ekran sabitleme, yazma yardımlarının kapatılması, App Attest + Play Integrity sunucuda, depolama sertleştirmesi | MASVS L2 kontrol listesi kanıtlı; güvenli moda istemci beyanıyla girilemiyor |
| **3 · Native his ve erişilebilirlik** | 3–4 hafta | Tasarım sistemi v2, koyu/yüksek kontrast, Dynamic Type, klavye/menü, hareket ve haptik, durum kataloğu, görsel regresyon | VoiceOver/TalkBack + en büyük metin + koyu modda tam sınav, tüm platformlarda |
| **4 · İçerik derinliği** | 3–4 hafta | Tüm profiller + Kids sabit form, zengin sonuç raporu, PDF/sertifika, alıştırma modu, medya kalite kontrolü | Web yönlendirmesi kalmadı; rapor ölçme uzmanınca onaylandı |
| **5 · Genişlik ve dağıtım** | 3–5 hafta | Karar 1'e göre telefon uygulaması, yeni diller, MDM/EMM, Universal Links | Seçilen her cihaz/dilde uçtan uca test yeşil |
| **6 · Bağımsız kanıt** | 3–4 hafta (3'ten itibaren paralel) | Dış sızma testi, kullanılabilirlik pilotu, cihazlar arası DIF analizi, performans ölçümü | Kritik/yüksek güvenlik bulgusu yok; SUS ≥ 80; çökmesiz oturum ≥ %99,9; anlamlı DIF yok |

**Toplam:** tek geliştirici için kabaca 6–8 ay. Bir QA ve yarı zamanlı tasarımcı ile 4–5 aya iner. AAC entitlement onayı ve dış test takvimi en büyük dış risklerdir.

Faz 6 kapanana kadar dışarıya "dünya standardında" yerine "ölçülmüş hedeflere göre geliştirilen" ifadesi kullanılır.

---

## 5 Ürün sahibinin vermesi gereken kararlar

1. **Telefon:** iPhone ve Android telefon desteklensin mi? Öneri: evet, ama alıştırma + sonuç + sertifika için; puanlı tam sınav tablet/Mac/web'de.
2. **Çökme takibi:** Sentry (zengin, üçüncü taraf) mı, MetricKit + Android Vitals (veri platformda kalır, sınırlı) mı?
3. **Minimum sürüm:** iPadOS 16 / macOS 14 mü, 18 / 15 mi? Writing Tools kontrolü ve Liquid Glass yeni sürüm ister. Öneri: iPadOS 18, macOS 15, Android `minSdk 29` kalır.
4. **Sertifika sabitleme:** uygulansın mı? Daha güçlü ağ güvenliği sağlar, ama sertifika yenilemede yanlış yapılandırma tüm adayları kilitler. Öneri: önce App Attest / Play Integrity; sabitleme sonra, yedek anahtarla.
5. **Dış sızma testi bütçesi ve zamanı:** öneri Faz 2 bitiminde.
6. **Yeni arayüz dilleri:** hangi pazarlar önce?
7. **Değerlendirici/gözetmen iPad görünümü:** bu yıl mı, sonra mı?

---

## 6 İlk iki hafta

*Durum (29 Ekim):* 2, 3 ve 4 yapıldı ([.github/workflows/native.yml](../../.github/workflows/native.yml), Dependabot'a native npm ve Gradle girişleri). 1 hesap sahibini, 5 karar 2'yi bekliyor. 6–8 sırada.

1. AAC entitlement başvurusu (yalnız Apple hesap sahibi yapabilir; onay süresi en uzun bekleme).
2. Native CI işi: iOS simülatörü, macOS, Android release derlemesi, Jest, lint.
3. 196 lint sorunu ve 10 `any` temizliği; CI'da `--max-warnings 0`.
4. Android'de R8'i açıp tam sınav testi.
5. Çökme takibi kurulumu (karar 2'den sonra).
6. Sınav modunda Writing Tools, Look Up ve otomatik düzeltmeyi kapatma (küçük iş, ölçme geçerliğine etkisi büyük).
7. Paylaşılan sözleşme paketinin iskeleti: olay protokolü ve `ExamPolicy` şemaları ile başla.
8. MASVS kontrol listesini depoya ekle ve mevcut durumla doldur.
