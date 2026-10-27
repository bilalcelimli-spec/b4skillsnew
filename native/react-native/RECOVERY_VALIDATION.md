# B4Skills kurtarma akışları doğrulaması

23–24 Ekim 2026 çalışması, dört hata düzeltmesini ve bunların tekrarını engelleyen testleri kapsar. Gerçek backend testleri yalnız `127.0.0.1:55432/b4skills_apple_e2e` veritabanında çalışır. Native hata testleri ayrı, yalnız localhost’ta çalışan fixture sunucusunu kullanır; bu sunucunun makbuz sayacı gerçek kredi kaydı değildir.

## Otomatik kontroller

3001 portu başka bir süreç tarafından kullanılmaya başlandığı için son gerçek backend kontrolleri 3003 portunda tekrarlandı. `B4SKILLS_E2E_PORT=3003` backend ve smoke komutlarına aynı şekilde verilir. Mevcut 3001 süreci durdurulmadı.

| Kontrol | Sonuç |
| --- | --- |
| React Native Jest | 31 test başarılı; API, kurtarma, uygulama yeniden açılışı, yazı/konuşma taslağı, dinleme yükleme ve hata hakkı |
| Xcode Debug derlemeleri | iPad simülatörü ve macOS başarılı; iki test paketi ad hoc imzalandı |
| Native TypeScript | `tsc --noEmit` temiz |
| Backend şema ve oturum ilerlemesi | 9 test başarılı |
| PostgreSQL makbuz işlemleri | 3 test başarılı; eşzamanlı tek oturum/tek kredi, aday kapsamı ve parametre uyuşmazlığı, rollback |
| Objective-C ses köprüsü | iPadOS ve macOS SDK’larıyla sözdizimi kontrolü başarılı |
| Gerçek backend başlatma yanıtı kaybı | `scripts/e2e/launch-recovery-smoke.ts`: yanıt kaybedildi, eşzamanlı tekrarlar aynı oturuma ulaştı; veritabanında bir oturum ve bir kredi tüketimi |
| Gerçek backend tam sınav | 53 yanıt, 5 bölüm geçişi, `COMPLETED`; dinleme medyası 200; anonim erişim 401 |

Tam sınavın altı yazma/konuşma yanıtı AI anahtarı bulunmayan test ortamında inceleme bekler. Fixture cevaplarından çıkan geçici düzey gerçek aday yeterlik sonucu olarak yorumlanmaz.

## iPad ve macOS arayüz kontrolleri

macOS uygulamasında da beş senaryo geçti. Yeniden açılış aynı başlatma makbuzunu kullandı; yazı taslağı korundu; 5 saniyelik konuşma kaydı aynı veriyle yeniden gönderildi (100804 bayt). İki ses hatası hak tüketmedi; başarılı oynatma bir hak kullandı.

iPadOS 26.5 simülatöründe başlatma yanıtı kaybından sonra uygulama yeniden açıldı ve aynı makbuzla devam edildi. Yazılı taslak korundu; 11 saniyelik konuşma kaydı yeniden gönderildiğinde veri aynı kaldı (144962 bayt). Süre bitişinde kaydedilmemiş yanıt için sonuç ekranı açıldı. İki ses 404 hatasında hak sayısı 2 kaldı; başarılı oynatma başladığında 1 oldu.

| Senaryo | iPad | macOS | Beklenen davranış |
| --- | --- | --- | --- |
| Başlatma yanıtı kaybı | Başarılı | Başarılı | Oturumu getir aynı makbuzla devam eder. |
| Yazılı yanıt gönderim hatası | Başarılı | Başarılı | Kontrolden sonra aynı taslakla soru geri açılır. |
| Konuşma yanıtı gönderim hatası | Başarılı | Başarılı | Kontrolden sonra kayıt korunur ve açıkça yeniden gönderilebilir. |
| Sınav süresi bitişi | Başarılı | Başarılı | Kaydedilmeyen geç yanıt kurtarmada kilitlenmez, sonuçlar açılır. |
| Ses yükleme hatası | Başarılı | Başarılı | Teknik hata dinleme hakkını tüketmez; sonradan başarılı oynatma mümkündür. |

Arayüz senaryoları `node scripts/e2e/fault-server.mjs` ile tekrarlanır. `POST /__qa` gövdesi senaryoyu seçer: `{"scenario":"writing","dropLaunch":true}`, `{"scenario":"speaking"}`, `{"scenario":"expired"}` veya `{"scenario":"listening","allowMedia":false}`. Hata görünümü doğrulandıktan sonra `PATCH /__qa` ile `dropLaunch:false`, `allowAnswers:true` veya `allowMedia:true` ilgili bağlantıyı açar; senaryoyu ve sayacı sıfırlamaz. Yanıtlar `allowAnswers:false` iken kaydedilmez.

## Sürüm koşulları

Native arayüz tablosu kontrollü kimlik fixture’ıyla doğrulandı. Mac’te gerçek hesaba e-posta/şifreyle giriş otomasyonu tamamlanamadı; gerçek hesapla tam sınav doğrulaması API istemcisi düzeyindedir. Mac’in sunucu alanında `http://localhost:3003` görüldü; son kalıcı Kaydet işlemi ekran kilitlendiği için teyit edilemedi.

Uygulama yayınlanmadan önce `launchRequestId` desteği backend’e dağıtılmalıdır. Mevcut istemciler bu alan olmadan çalışmaya devam eder. Başlatma makbuzu cihazda saklanır; yazı ve ses taslağı şu an yalnız açık uygulama içinde kurtarmada korunur. Uygulama zorla kapatıldıktan sonra yanıt taslağının diskte korunması, fiziksel cihaz ses kalitesi ve Release dağıtım kontrolleri ayrı işlerdir.
