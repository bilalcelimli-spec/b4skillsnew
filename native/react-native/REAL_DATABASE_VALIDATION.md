# Gerçek veritabanı doğrulaması — 24 Ekim 2026

React Native istemcisi mevcut Express API üzerinden `.env` içindeki gerçek Supabase PostgreSQL veritabanına bağlandı. Veritabanı parolası uygulamaya eklenmedi. Yerel API adresi `http://127.0.0.1:3004`; 3001 başka bir projeye ait olduğu için değiştirilmedi. Bağlantı kontrolünde 2.030 aktif soru vardı.

## Gerçek veritabanıyla API sonucu

`src/api.ts` içindeki uygulamanın kendi istemcisi kullanıldı. Test için ayrı bir QA kurumu, üç sentetik aday ve yedi gün geçerli 10 QA kredisi oluşturuldu. Müşteri hesaplarının kredileri kullanılmadı; soru bankası seed/reset edilmedi. Gerçek soru teslimi normal sınav akışındaki kullanım/yanıt kayıtlarını oluşturur; test kayıtları inceleme için korunur.

| Kontrol | Sonuç |
| --- | --- |
| Veritabanı ve API health | Başarılı, database=up |
| Gerçek adayla parola girişi | API üzerinden başarılı |
| Sınav başlatma ve aynı UUID ile tekrar | Aynı oturum, toplam 1 QA kredisi |
| Yanıtların PostgreSQL'den bağımsız kontrolü | 43 yanıtın her biri tek kayıt |
| Bölümler | Kelime 13, dil bilgisi 13, okuma 11, dinleme 6 |
| Gerçek dinleme medyası | 6 isteğin tümü HTTP 200 |
| Anonim durum sorgusu | 401 |
| Diğer adaydan oturum erişimi | 403 |
| Son durum | IN_PROGRESS; sınav tamamlanmadı |

Oturum: `cmvlj4pho0003uvukeu8c53gj`.
QA kurumu: `cmvlj3ynd0000uvuo9q6p5urh`.

**Tam sınavı engelleyen bulgu:** Dinleme sırasında `FILL_IN_BLANKS` türü geldi. Native istemcinin `responseMode`/`canRender` kontrolleri bu türü desteklemiyor. Test bu noktada durdu; tür değiştirilmedi, sahte yanıt gönderilmedi ve sonuç ekranı başarılı sayılmadı. Yazma ve konuşma bölümleri bu gerçek veritabanı koşusunda test edilmedi. Provisional=true bir yeterlilik sonucu olarak yorumlanmamalı.

## Yerel uygulama kontrolleri

macOS uygulamasının sunucu adresi 3004 olarak kaydedildi ve kalıcı tercih okumasıyla doğrulandı. E-posta/parola alanları arayüzden dolduruldu; giriş düğmesinden başarılı oturum açılamadı. Şifre alanına yeniden odaklanma sırasında SIGABRT kaydı oluştu; yığın `NSSecureTextView setDelegate:` → `RCTUISecureTextFieldCell selectWithFrame:` → `RCTTextInputComponentView focus` yolunu gösteriyor. Bu bulgu native giriş ile otomasyon etkileşiminde araştırılmalı; API girişinin başarılı olması native giriş doğrulamasının yerine geçmez.

İPadOS 26.5 test simülatörü gerçek backend adresiyle başlatıldı. İlk başlatma işleminde `NSPOSIXErrorDomain code=3` alındı; sonraki denemede süreç numarası döndü ancak uygulama açılış ekranında kaldı. Bu koşuda iPad arayüzünden gerçek hesapla uçtan uca sınav tamamlanmadı. Önceki izole veritabanı/fixture arayüz testleri bu rapordaki gerçek veritabanı sonucuyla karıştırılmamalı.

## Otomatik kontroller

- Native Jest: 4 paket, 31 test geçti.
- Native TypeScript: temiz.
- Backend launch-schema ve session-progress: 2 dosya, 9 test geçti.
- Backend esbuild: başarılı.
- Yeni scriptlerin JavaScript sözdizimi kontrolü başarılı.
- Çalışan 3004 portunu ikinci kez açma denemesi reddedildi; mevcut süreç durdurulmadı.

## Tekrar çalıştırma

`native/react-native` dizininde:

```sh
npm run e2e:real-backend
```

Ayrı terminalde aynı dizinden:

```sh
npm run e2e:real-candidates
npm run e2e:real-smoke
```

Backend başlatıcı normal proje `.env` dosyasındaki veritabanını kullanır. `B4SKILLS_API_VALIDATION_MODE=true` ile migration, yönetici bootstrap ve global bekleyen puanlama/rapor kurtarma taramaları kapalıdır. Bu süreç yalnızca `127.0.0.1:3004` üzerinde dinler. NODE_ENV=test yerel HTTP cookie akışı içindir; bu yapılandırma dağıtım için kullanılmaz. Veritabanı yoksa assessment API 503 döner; doğrulama modunda demo launch fallback kapalıdır.

Özel çalışma dosyaları uygulama klasöründeki git dışı `build/realdb-validation/` altında tutulur (dizin 0700, dosyalar 0600; paylaşılan `/tmp` kullanılmaz). `backend.env` ve `candidates.json` yalnızca kullanıcı tarafından okunabilir; repoya eklenmez. Aday scripti mevcut dosya varsa parola/kredi sıfırlamaz; dosya kaybolmuş ancak QA kurumu mevcutsa benzersiz slug kontrolü yeni kurum oluşturulmasını engeller. Smoke testi her tekrarında bir QA kredisi ve yeni test oturumu kullanır; desteklenmeyen soru türüyle karşılaşırsa çıkış kodu 2 verir.

Ham sonuç `result.json`, adım kayıtları `smoke.log` içindedir. Test zamanı UTC kaydedilir; bu raporun tarihi Europe/Istanbul saat dilimine göredir.
