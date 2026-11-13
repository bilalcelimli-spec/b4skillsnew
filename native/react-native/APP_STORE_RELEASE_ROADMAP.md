# App Store yayın yol haritası — iPad ve macOS

## 4 Kasım 2026 canlı yayın denetimi

Bu bölüm aşağıdaki 1 Kasım envanterinden daha günceldir. Başvuru **henüz gönderilmedi**.

- App Store Connect kaydı `6826695698` açıldı; iOS ve macOS `1.0.0` hâlâ “Prepare for Submission”. İki platformda Türkçe açıklama, anahtar kelimeler, destek/pazarlama URL'si, telif ve elle yayın seçimi kaydedildi. Eğitim kategorisi, Türkçe alt başlık ve gizlilik URL'si kaydedildi.
- Dokuz veri kategorisi (ad, e-posta, kullanıcı ID, ses, fotoğraf, diğer kullanıcı içeriği, ürün etkileşimi, diğer kullanım, diğer veriler) privacy manifest ile eşleştirilerek App Privacy formuna girildi: uygulama işlevi, hesaba bağlı, takip yok. Form tamamlandı; **yayımlanmadı**. Apple son adımda doğruluk ve mevzuata uygunluk garantisi ile beyanı güncel tutma taahhüdü istiyor; hesap sahibinin bu somut beyanı onaylaması gerekiyor.
- Apple'ın iOS “Add for Review” ön denetimi çalıştırıldı. Bildirdiği eksikler: yaş anketi, ana kategori (sonradan girildi), içerik hakları, yayımlanmış App Privacy beyanı, fiyat, build seçimi, inceleme irtibatı ve gizlilik URL'si (sonradan girildi). Mac ekran görüntüsü alanı boş (0/10); iPad görselleri ayrıca tamamlanmalı.
- `/privacy`, `/terms`, `/support` canlıda gerçek sayfa döndürüyor. İlk iki sayfa açıkça inceleme taslağı; sağlayıcı veri işleme/aktarım ayrıntıları doğrulanmamış. Taslak ibaresi kaldırılarak tamamlanmış gibi gösterilmedi.
- Native giriş ekranına, Yardım bölümüne ve hesap penceresine gizlilik/koşullar/destek bağlantıları eklendi. Geniş ekran kenar çubuğuna doğrudan hesap silme girişi eklendi; dar ekranda çıkış penceresindeki mevcut silme yolu korunuyor.
- Yeni sınav öncesinde Google (Gemini), OpenAI ve Anthropic'e yazılı/sesli yanıt aktarımını açıklayan ve açık izin isteyen metin eklendi (tr/en/ar). Kamera beta/review metnindeki “yalnız onaydan sonra” çelişkisi otomatik başlangıç fotoğrafı davranışına göre düzeltildi.
- Yerel sürüm numarası iki Apple hedefinde `1.0.0 (12)` olarak eşitlendi. Kaynakta önceden bulunan hesap silme değişiklikleri de bu adayın içinde; bu kayıt tek başına build'in Apple'a yüklendiğini göstermez.
- Teknik preflight: imza kimliği, iki App Store profili, simgeler ve canlı API kontrolleri geçti. `release:check -- --app-store` artık gerçek hukuki sayfa içeriğini ve bitmemiş taslakları da denetliyor; gizlilik/koşullar taslakları nedeniyle gönderim kontrolü başarısız olmalıdır.

Hesap sahibinden beklenen bilgiler: çocuk erişim kararı (13+ veya veli onayı akışı), gerçek müşteri verisi içermeyen demo hesap ve kredileri, içeriklerin kullanım hakkının teyidi. Hukuki metinlerdeki gerçek aktarım/saklama uygulamaları tamamlanmalı. Fiziksel cihazda tam sınav ve hesap silme kabulü henüz bu denetimde yapılmadı.

Apple kaynakları: [inceleme kuralları 5.1.2(i), 3.1.3(c)](https://developer.apple.com/app-store/review/guidelines/), [eksiksiz inceleme bilgileri](https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review/), [ekran görüntüsü ölçüleri](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).

1 Kasım 2026. Bu belge B4Skills iPad ve macOS uygulamalarını iç TestFlight'tan herkese açık App Store yayınına taşıyan sırayı verir. Ürün geliştirme planlarının yerine geçmez: platform kalitesi [APPLE_ROADMAP.md](APPLE_ROADMAP.md), sınav deneyimi [EXAM_EXPERIENCE_ROADMAP.md](EXAM_EXPERIENCE_ROADMAP.md), gözetim [WEB_FEATURE_PARITY_ROADMAP.md](WEB_FEATURE_PARITY_ROADMAP.md), soru arayüzü [EXAM_UI_EXCELLENCE_PLAN.md](EXAM_UI_EXCELLENCE_PLAN.md) içinde kalır. Buradaki soru şudur: **1.0.0 sürümünü Apple incelemesinden geçirip yayımlamak için en az ne gerekir?**

Tarihler tek geliştirici varsayımıyla tahmindir. "Sen" = hesap sahibi (App Store Connect girişi, hukuki metinler, iş kararları). "Kod" = repoda yapılacak iş (Claude veya sen). **[doğrulanmadı]** işaretli maddeler koddan veya Apple'ın birincil belgelerinden teyit edilemedi; göndermeden önce Apple'ın güncel sayfasıyla kontrol edilmeli.

## 1 Bugünkü durum

| Alan | Durum | Kaynak |
| --- | --- | --- |
| App Store Connect kaydı | Var: B4Skills / `6826695698`, iOS + macOS, `1.0.0`, ana dil Türkçe, SKU `b4skills-assessment` | [TESTFLIGHT_PREPARATION.md](TESTFLIGHT_PREPARATION.md) |
| Universal Purchase | İki platform aynı bundle ID (`com.b4skills.assessment`) ve aynı kayıtta | `release.json`, README |
| İç TestFlight | iPad + Mac grupları, build 10 yüklendi (30 Ekim). `main`'de build **11** (PR #75); bu dal (`feat/react-native-ipad-macos`) hâlâ **9** gösteriyor. Sonraki yükleme ≥ 12 olmalı | `release.json`, `git show origin/main` |
| Dış TestFlight | Yapılmadı; beta açıklaması taslak | [TESTFLIGHT_BETA_NOTES.md](TESTFLIGHT_BETA_NOTES.md) |
| Release araçları | `release:check`, `release:archive`, `release:export`, Hermes dSYM, iPad 20/20 / Mac 23/23 dağıtım denetimi | `scripts/release/` |
| Native CI | Var (`.github/workflows/native.yml`) | |
| Çökme takibi | **Yok** (Sentry/MetricKit yok). Yalnız Xcode Organizer | `grep sentry` boş |
| Privacy manifest | İki platformda aynı: ad, e-posta, kullanıcı ID, ses, fotoğraf, kullanıcı içeriği, ürün etkileşimi, diğer kullanım; hepsi "uygulama işlevi", hesaba bağlı, izleme yok. Gerekçeli API: FileTimestamp, UserDefaults, SystemBootTime | `ios/B4Skills/PrivacyInfo.xcprivacy`, `macos/PrivacyInfo.xcprivacy` |
| Kamera/mikrofon açıklamaları | Var, tr/en/ar `InfoPlist.strings` | Info.plist |
| Şifreleme beyanı | `ITSAppUsesNonExemptEncryption = false` (yalnız OS şifrelemesi) | Info.plist |
| Satın alma | Uygulamada **yok**. Erişim e-posta hesabı veya kurumun verdiği sınav koduyla | `src/` içinde purchase/stripe yok |
| Giriş yöntemleri | Yalnız e-posta + şifre ve sınav kodu. Üçüncü taraf giriş yok | `SignInCards.tsx` |
| Hesap oluşturma | **Var**: sınav kodu formu "Kaydol ve devam et" ile `/api/codes/redeem` üzerinden yeni aday hesabı açar | `SignInCards.tsx:162`, `server.ts:3883` |
| Hesap silme | **Kodda var, dağıtılmadı (1 Kasım).** `POST /api/auth/delete-account` + native Hesap → "Hesabımı sil" sayfası. Ayrıntı E1 | `src/lib/compliance/account-deletion.ts`, `App.tsx` `DeleteAccountSheet` |
| Gizlilik politikası / kullanım koşulları | **Yayımlanmış sayfa yok**. Web altbilgisinde "Privacy Policy" `mailto:privacy@b4skills.com`, "Terms" `mailto:hello@b4skills.com`. Uygulamada gizlilik bağlantısı yok | `src/components/SiteFooter.tsx:38-39` |
| Destek | Yalnız `mailto:hello@b4skills.com`; destek sayfası yok | aynı dosya |
| Çocuk kullanıcılar | Primary (7–10) ve Junior (11–14) profilleri katalogda. Native'de yaş sorulmuyor, veli onayı akışı yok (MASVS PRIVACY-4 ⚠️). Özgün Kids sabit formu native'de web'e yönlendiriliyor | `api.ts:106`, [SECURITY_MASVS.md](SECURITY_MASVS.md) |
| Kamera davranışı | Gözetim açıksa tek yüz sabitlendiğinde **başlangıç fotoğrafı otomatik** çekilip gönderiliyor (`useExamMonitor.ts`); izin metni de bunu söylüyor. Ancak beta/review notu taslağı hâlâ "fotoğraf yalnız aday onayından sonra gönderilir" diyor → **çelişki** | `useExamMonitor.ts:2`, TESTFLIGHT_BETA_NOTES.md |
| Apple Assessment Mode (AAC) | Uygulanmadı, entitlement başvurusu yok | APPLE_ROADMAP.md |
| Minimum sürüm | iPadOS 16, macOS 14 | pbxproj |

## 2 Yayın engelleri (önce bunlar)

Bunlardan biri eksikse inceleme büyük olasılıkla reddeder veya yayın hukuken risklidir.

| # | Engel | Apple kuralı | Kim | Süre |
| --- | --- | --- | --- | --- |
| E1 | **Uygulama içinden hesap silme.** *Durum 1 Kasım: kodda tamam; birleştirme, Render dağıtımı, build 12 ve gerçek cihaz kontrolü bekliyor. Web arayüzünde düğme yok (uç hazır).* Uygulanan: aday kendi hesabını siler; şifreli hesapta şifre istenir, kodla açılmış hesapta yalnız onay. Kimlik, profil, sınıf üyeliği, sınav kodundaki e-posta, oturumdaki IP/cihaz, konuşma sesi, web/native kamera fotoğrafları ve kimlik fotoğrafı silinir; süren oturum kapanır; puanlar kimliksiz kalır; ödeme kayıtları saklanır. Personel hesapları kuruma yönlendirilir. İmzalı sertifikalar (adı içerir, herkese açık doğrulanır) geri çekilir. Kalan: web düğmesi; gizlilik politikasında bu kapsamın yazılması (E2). İlk plan: Kodla kayıt hesap açtığı için zorunlu. Sunucuda adayın kendi hesabını silme isteği (kimlik doğrulama + onay, `privacyManager.requestDeletion` yeniden kullanılır, saklama yükümlülüğü olan sınav kayıtları anonimleştirilir), native'de Ayarlar/Hesap → "Hesabımı sil" akışı, web'de aynı uç. Kurum yönetimindeki hesaplarda "silme isteği kuruma iletilir" yolu da kabul edilebilir; yalnız çıkış yetmez | 5.1.1(v), [hesap silme](https://developer.apple.com/support/offering-account-deletion-in-your-app/) | Kod | 3–4 gün |
| E2 | **Yayımlanmış gizlilik politikası, kullanım koşulları ve destek sayfası.** `b4skills.com/privacy`, `/terms`, `/support` gerçek sayfalar olmalı; uygulamada (giriş ekranı + ayarlar) bağlantı olmalı. Politika şunları açıkça yazmalı: kamera başlangıç fotoğrafı ve yüz sayımı, ses kaydı, AI puanlama sağlayıcılarına (Gemini, OpenAI, Anthropic) aktarım, kurumla paylaşım, saklama süreleri, KVKK/GDPR hakları, çocuk verisi | 5.1.1(i), 5.1.2 | Metin: Sen (hukuki onay). Sayfalar + bağlantı: Kod | Metin 1 hafta, sayfa 1 gün |
| E3 | **Çocuklar (Primary 7–10) kararı.** Bkz. karar K2. Uygulama Kids kategorisine konmasa da 13 yaş altı aday kodla hesap açabiliyor; COPPA/KVKK/GDPR-K açısından veli/kurum onayı gerekir. Kids kategorisi seçilirse üçüncü taraf analitik/reklam yasak, ebeveyn kapısı zorunlu ve AI sağlayıcılarına çocuk sesi gönderimi ayrıca gerekçelendirilmeli | 1.3, 5.1.4 | Karar: Sen. Uygulama: Kod | Karara bağlı: 2–7 gün |
| E4 | **İş modeli ve ödeme beyanı.** Uygulamada satın alma yok; erişim kurumun aldığı lisans/kodla. Bu, kurumlara doğrudan satılan hizmet istisnasına dayanır. Bireysel kullanıcının web'de (`/pricing`, Stripe) satın alıp uygulamada kullanması 3.1.1/3.1.3(b) riski taşır; uygulama içinde fiyat, "web'den satın al" bağlantısı veya bireysel satın alma yönlendirmesi olmamalı. Review notunda "institution-provisioned" açıkça yazılmalı. Bkz. karar K1 **[doğrulanmadı: 2026 kural metni birincil kaynaktan okunmadı]** | 3.1.1, 3.1.3(b), 3.1.3(c) | Karar: Sen. Kontrol: Kod | 1 gün |
| E5 | **Review demo hesabı.** Üretimde, gerçek müşteri verisi içermeyen QA kurumu; yeterli kredi, gözetim açık/kapalı iki örnek, tam sınavı 15–20 dakikada bitirebilecek kısa profil (ör. Rapid Diagnostic). Parola yalnız App Store Connect'in review alanına girilir | 2.1 | Hesap: Kod (seed betiği). Girme: Sen | 1 gün |
| E6 | **Kamera metinlerinin tutarlılığı.** İzin metni, gizlilik politikası, beta açıklaması ve review notu aynı davranışı anlatmalı (otomatik başlangıç fotoğrafı, video yok, canlı gözetmen yok, cihazda yüz sayımı). `TESTFLIGHT_BETA_NOTES.md` "onaydan sonra" ifadesi güncellenmeli. Gözetim kurum ayarına bağlıysa reviewer'a nasıl tetikleneceği yazılmalı | 5.1.1(ii)–(iii), 2.3 | Kod (metin), Sen (onay) | 0,5 gün |
| E7 | **Gerçek cihazda tam sınav.** Fiziksel iPad'de ve Mac'te TestFlight build'iyle: giriş, kodla kayıt, mikrofon/kamera izni ve reddi, dinleme, konuşma, arka plan/uyku dönüşü, sonuç, hesap silme. Bugüne kadar iPad'de imzalı dağıtım build'iyle tam sınav kaydı yok | 2.1 (çökme/hatalı akış) | Sen (cihaz), Kod (test listesi + düzeltmeler) | 2–3 gün |

Engel olmayan ama yayın öncesi istenen: **çökme takibi** (en azından Xcode Organizer'ı izlemek; tercihen MetricKit), **yaşın sorulması** (E3'e bağlı), **zorunlu güncelleme kapısının** üretimde açık olduğunun doğrulanması (`useUpdateGate.ts`).

## 3 Önce verilmesi gereken kararlar (Sen)

| # | Karar | Öneri | Neden |
| --- | --- | --- | --- |
| K1 | Uygulama kimler için? | **Yalnız kurum hesabı/kodu olan adaylar.** Bireysel satın alma web'de kalır, uygulamada hiç anılmaz. Bireysel satışı uygulamaya da açmak istersen ayrı bir sonraki sürümde In-App Purchase (sınav kredisi) eklenir | En hızlı onay yolu; IAP fiyatlandırma, vergi ve iade işini ertele |
| K2 | Primary (7–10) native'de olacak mı? | **1.0'da hayır**: Primary ve Junior profilleri native katalogdan gizlenir, bu kodlar web'e yönlendirilir (Özgün Kids'deki gibi). Kayıtta doğum yılı sorulur; 13 altıysa "kurumunuz/veliniz web üzerinden kaydetmeli" denir. Kids kategorisi seçilmez | Veli onayı, Kids kategorisi kuralları ve AI'ya çocuk sesi gönderimi 1.0'ı haftalarca geciktirir. 1.1'de veli onayıyla açılabilir |
| K3 | Ücretli mi, ücretsiz mi? | **Ücretsiz** indirme (Free Apps sözleşmesi yeterli) | Gelir kurum lisansından |
| K4 | Yayın bölgeleri | Türkiye + kurum müşterisi olan ülkeler; AB dahil edilecekse **DSA trader status** beyanı (adres/telefon mağazada görünür) | AB'de trader beyanı olmadan dağıtım yapılamıyor |
| K5 | AAC (Assessment Mode) 1.0'da mı? | **Hayır**, 1.1+. Ama entitlement başvurusunu şimdi yap, onay süresi belirsiz | 1.0 incelemesini başka bir Apple onayına bağlama |
| K6 | Minimum sürüm | 1.0 için iPadOS 16 / macOS 14 kalsın; APPLE_ROADMAP K1'deki 18/15'e çıkış ayrı karar | Sürüm değişimi yeniden tam test ister |

## 4 Fazlar ve tarihler

### Faz 0 — Kararlar ve uzun süren Apple işleri · 2–8 Kasım 2026

| İş | Kim |
| --- | --- |
| K1–K6 kararları | Sen |
| App Store Connect → Business: Free Apps sözleşmesi aktif, banka/vergi gerekmiyor (ücretsiz ise) — durumu kontrol | Sen |
| AB'de yayın varsa: App Store Connect → Business → DSA trader status | Sen |
| AAC entitlement başvurusu (K5 1.1'e kalsa da) | Sen |
| Gizlilik politikası ve koşullar metni için hukuki taslak (KVKK aydınlatma dahil). Kod tarafı veri envanterini (privacy manifest + AI sağlayıcıları + saklama süreleri) taslak olarak çıkarır | Sen + Kod |

### Faz 1 — Kod engelleri · 9–20 Kasım 2026

| İş | Kim | Engel |
| --- | --- | --- |
| Kendi hesabını silme: sunucu ucu + testler, native ekran (iki platform, tr/en/ar), web karşılığı | Kod | E1 |
| `/privacy`, `/terms`, `/support` web sayfaları; altbilgideki `mailto:` bağlantılarının değiştirilmesi; native'de giriş ve hesap ekranında bağlantılar | Kod (metin Sen'den) | E2 |
| K2'ye göre Primary/Junior gizleme veya yaş/onay akışı | Kod | E3 |
| Uygulamada fiyat/satın alma/web'e yönlendiren metin olmadığının taranması | Kod | E4 |
| Review QA kurumu ve hesabının üretimde hazırlanması (betikle, gerçek müşteri verisi olmadan) | Kod | E5 |
| Beta ve review notlarının güncel kamera davranışıyla yeniden yazılması (tr + en) | Kod | E6 |
| Çökme takibi: en az MetricKit özet yükü veya Organizer izleme rutini | Kod | — |
| Privacy manifest'in yeni silme/yaş akışlarına göre güncellenmesi; Primary gizlenirse değişmez | Kod | — |
| Build 12: `release.json` + iki `project.pbxproj`, `release:archive`, export, yükleme | Kod hazırlar, yükleme onayı Sen | — |

**Çıkış koşulu:** E1–E6 kapalı, build 12 iki platformda iç TestFlight'ta.

### Faz 2 — Cihaz kabulü ve mağaza bilgileri · 16–29 Kasım 2026 (Faz 1 ile kısmen paralel)

| İş | Kim |
| --- | --- |
| E7 cihaz testi: fiziksel iPad (en düşük desteklenen + güncel iPadOS) ve Mac (Apple Silicon; mümkünse Intel) | Sen (cihaz), Kod (kontrol listesi ve düzeltmeler) |
| **Ekran görüntüleri.** iPad 13 inç (2064 × 2752 veya 2048 × 2732, dikey/yatay) zorunlu; Mac 16:10 (ör. 2880 × 1800) zorunlu. Dil başına (tr, en; ar isteğe bağlı) 3–10 adet: giriş, hazırlık, okuma, dinleme, konuşma, sonuç. QA hesabıyla, gerçek aday verisi olmadan | Kod (simülatör/Mac'ten üretim), Sen (yükleme) |
| Metadata: ad, alt başlık, açıklama, anahtar kelimeler, tanıtım metni, telif hakkı, kategori (Eğitim; ikincil İş), destek URL, pazarlama URL, gizlilik URL | Kod taslak (tr/en/ar), Sen girer |
| **App Privacy (beslenme etiketi)** formu: manifestteki 8 veri türü + "Diagnostics" (çökme takibi eklenirse), hepsi hesaba bağlı, izleme yok. AI sağlayıcıları "üçüncü taraf" değil "hizmet sağlayıcı" olarak değerlendirilir; politika ile aynı olmalı **[doğrulanmadı: sağlayıcı sözleşmeleri incelenmedi]** | Kod tablo hazırlar, Sen girer |
| **Yaş derecelendirmesi** anketi (4+/9+/13+/16+/18+; Apple hesaplar). 2025 sonrası yeni sorular ve 2026'da eklenen sosyal medya soruları cevaplanmalı; sohbet/kullanıcı içeriği paylaşımı yok, web görünümü yok. Beklenen sonuç 4+ **[doğrulanmadı: 2026 soru seti birincil kaynaktan okunmadı]** | Sen |
| **Export compliance**: "yalnız işletim sistemi şifrelemesi" — Info.plist anahtarı zaten `false`; App Store Connect'te soru çıkmamalı | Sen (kontrol) |
| Content Rights: üçüncü taraf içerik (soru bankası görselleri/sesleri) kullanım hakkı beyanı | Sen |
| Fiyat: Ücretsiz; bölgeler (K4) | Sen |

**Çıkış koşulu:** iki platformda gerçek cihazda tam sınav + hesap silme kaydedildi; tüm App Store Connect alanları dolu.

### Faz 3 — Dış TestFlight (beta review) ve pilot · 30 Kasım – 18 Aralık 2026

| İş | Kim |
| --- | --- |
| Test Information: beta açıklaması, feedback e-postası, review irtibatı, demo hesap (TestFlight'ın kendi formu) | Sen |
| Dış grup "Pilot kurumlar", build 12+ iki platform için **beta app review**'a gönderim. İlk dış build incelenir; sonraki build'ler çoğu zaman hızlı geçer | Sen |
| 1–2 pilot kurum, 20–50 aday; davetler kurum aracılığıyla, açık bağlantı yerine e-posta davet | Sen |
| Pilot ölçümleri: çökmesiz oturum, tamamlama oranı, konuşma yükleme hatası, kamera fotoğraf teslimi. Bulunan hatalar build 13+ | Kod |
| Beta review reddi gelirse aynı gerekçe ana incelemede de gelir: düzelt, yeniden gönder | Kod + Sen |

**Çıkış koşulu:** beta review onayı; pilotta engelleyici hata yok.

### Faz 4 — App Review ve yayın · 4–22 Ocak 2027

Aralık sonu (genelde ~22–27 Aralık) App Store Connect tatil dönemidir; inceleme yavaşlar veya gönderim kısıtlanır **[doğrulanmadı: 2026 tarihleri Apple Developer News'te duyurulur]**. Bu yüzden 1.0 gönderimi Ocak başına konur. Pilot erken biterse 14–18 Aralık'ta gönderim de olabilir.

| İş | Kim |
| --- | --- |
| Son build (ör. 1.0.0 (14)) iki platform; `release:check -- --online` 0 engel | Kod |
| Review notu (en): kurum erişim modeli, satın alma olmadığı, demo hesap, kamera gözetimini açma yolu, hesap silme konumu, AI puanlama açıklaması | Kod taslak, Sen girer |
| Sürüm yayın seçeneği: **"Manually release this version"** | Sen |
| iPad ve macOS sürümlerini incelemeye gönder (aynı kayıt, iki platform ayrı sürüm) | Sen |
| Onaydan sonra elle yayın; ilk 72 saat Organizer çökmeleri ve sunucu logları izlenir | Sen (yayın düğmesi), Kod (izleme) |

**Phased release notu:** Kademeli yayın yalnız **otomatik güncellemeler** için geçerlidir; ilk 1.0 sürümü onaylandığı anda herkese açılır. 1.0'da kademeyi "Manually release" + kurumlarla planlı duyuru sağlar. Kademeli yayın 1.0.1'den itibaren açılır (7 gün, 1%→100%, duraklatılabilir). macOS için kademeli yayın desteği **[doğrulanmadı]**.

### Faz 5 — Yayın sonrası · Şubat 2027 ve sonrası

- 1.0.1: pilot ve ilk hafta düzeltmeleri, phased release ile.
- 1.1: AAC (entitlement onayı geldiyse), Primary/Junior için veli onayı (K2), Declared Age Range API değerlendirmesi **[doğrulanmadı: hangi bölgelerde zorunlu olduğu]**.
- APPLE_ROADMAP Faz 3–5 (karanlık mod, klavye, MDM, Universal Links). Passkey veya üçüncü taraf giriş eklenirse 4.8 gereği Sign in with Apple (veya eşdeğer gizlilik sağlayan seçenek) de eklenmeli.
- İsteğe bağlı: bireysel kullanıcılar için In-App Purchase (K1).

## 5 Toplu takvim

| Tarih | Kilometre taşı | Kim |
| --- | --- | --- |
| 8 Kas 2026 | K1–K6 kararları, AAC başvurusu, hukuki metin taslağı | Sen |
| 20 Kas 2026 | E1–E6 kapalı, build 12 iç TestFlight | Kod |
| 29 Kas 2026 | Cihaz kabulü, ekran görüntüleri, metadata, App Privacy, yaş derecelendirmesi | Sen + Kod |
| 4 Ara 2026 | Dış TestFlight beta review onayı | Sen |
| 18 Ara 2026 | Pilot tamam, son düzeltmeler | Sen + Kod |
| 8 Oca 2027 | App Review gönderimi (iPad + macOS) | Sen |
| ~22 Oca 2027 | Onay + elle yayın (inceleme süresi ve olası red payı dahil) | Sen |

En büyük takvim riskleri: hukuki metinlerin gecikmesi (E2), çocuk kararının 1.0'a alınması (E3), 3.1.x ödeme yorumunda red (E4), gerçek iPad'de bulunacak kamera/ses hataları (E7).

## 6 Doğrulanamayanlar

- App Review Guidelines'ın 2026 güncel metni bu çalışmada Apple'ın sayfasından okunmadı; kural numaraları bilinen yapıya göredir. Özellikle 3.1.1/3.1.3 (kurum kodları ve web satışı) ve 1.3/5.1.4 (çocuk) metinleri gönderimden önce okunmalı: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- Yaş derecelendirmesindeki 2026 sosyal medya soruları ve tarihleri yalnız ikincil kaynaklardan görüldü.
- Ekran görüntüsü boyutları Apple'ın [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) sayfasından son kez kontrol edilmeli.
- App Store Connect'teki mevcut durum (sözleşmeler, DSA, vergi, build 10/11 işleme sonucu) koddan görülemez; yalnız hesap sahibi kontrol edebilir.
- `/privacy` adresi 200 dönüyor ama bu SPA yönlendirmesi; kodda gizlilik politikası sayfası bileşeni yok.
- AI puanlama sağlayıcılarıyla veri işleme sözleşmeleri ve saklama süreleri incelenmedi.
