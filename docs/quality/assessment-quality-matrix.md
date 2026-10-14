# B4Skills sınav kalite matrisi

Güncelleme: 14 Ekim 2026. Sorumlular aşağıda rol olarak atanmıştır; insan ataması henüz yapılmamıştır.

## Kanıtların anlamı

- **Mevcut:** Kod veya yapılandırma var; çalıştığını tek başına kanıtlamaz.
- **Yerel doğrulama:** Kontrollü verilerle test edildi; üretim ve psikometrik doğrulama değildir.
- **Üretim doğrulaması bekliyor:** Bu çalışma canlı ortama bağlanmaz. Eski yerel sonuçlar üretim kanıtı sayılmaz.
- **Ölçme kanıtı bekliyor:** Ürün bazında tamamlanmış ve onaylı saha raporu bu incelemede doğrulanamadı. Çalışmanın hiç yapılmadığı anlamına gelmez.
- **Kapsam dışı:** Ürün ilgili beceriyi veya süreci sunmuyor; eksiklik olarak puanlanmaz.

G/V/R/L/W/S: grammar, vocabulary, reading, listening, writing, speaking. Dilbilgisi ve kelime alt testleri dört iletişim becerisiyle eşdeğer değildir.

## Ürün matrisi

| Sınav / kanonik ürün anahtarı | Güncel beceriler | Uygulama | Kod/giriş | Ara/devam | Puan/rapor | Yerel davranış kanıtı | Üretim | Ürün bazlı ölçme kanıtı | İlk öncelik |
|---|---|---|---|---|---|---|---|---|---|
| Primary (7-10) | G/V/R/L/W/S | CAT | Mevcut | Bir kez / 48 saat | Mevcut; eksik puanlama kesinleşmez | Ortak HTTP matrisi + bileşen tarayıcı testleri | Bekliyor | Bekliyor | Yaşa uygun içerik, çocuk kullanılabilirlik çalışması |
| Junior Suite (11-14) | G/V/R/L/W/S | MST | Mevcut | Bir kez / 48 saat | Mevcut; insan inceleme yolu | Ortak HTTP matrisi + bileşen tarayıcı testleri | Bekliyor | Bekliyor | Yönlendirme doğruluğu, yaşa göre pilot |
| Rapid Diagnostic (30–40 Min); anahtar: 15-Min Diagnostic | G/V/R/L/W/S | MST | Mevcut | Bir kez / 48 saat | Mevcut | Ortak HTTP matrisi + bileşen tarayıcı testleri | Bekliyor | Bekliyor | Ad/süre tutarlılığı, kısa test karar belirsizliği |
| Express Assessment (30-Min) | G/V/R/L/W/S | CAT | Mevcut | Bir kez / 48 saat | Mevcut | Ortak HTTP matrisi + bileşen tarayıcı testleri | Bekliyor | Bekliyor | Altı bölümle gerçek süre ve içerik yükü |
| General English | G/V/R/L/W/S | CAT | Mevcut | Bir kez / 48 saat | Mevcut | Ortak HTTP matrisi + eşzamanlılık senaryoları | Bekliyor | Bekliyor | CEFR eşikleri ve beceri tahminlerinin doğrulanması |
| Academia | G/V/R/L/W/S | MST | Mevcut | Bir kez / 48 saat | Mevcut | Ortak HTTP matrisi + bileşen tarayıcı testleri | Bekliyor | Bekliyor | Akademik görev kapsamı ve eşik kararları |
| Corporate | G/V/R/L/W/S | CAT | Mevcut | Bir kez / 48 saat | Mevcut | Ortak HTTP matrisi + bileşen tarayıcı testleri | Bekliyor | Bekliyor | İş iletişimi kapsamı ve gerçek kullanım ilişkisi |
| Language Schools | G/V/R/L/W/S | CAT | Mevcut | Bir kez / 48 saat | Mevcut | Ortak HTTP matrisi + bileşen tarayıcı testleri | Bekliyor | Bekliyor | Yerleştirmeyi ilk iki hafta ders başarısıyla karşılaştırma |
| Specialized / Integrated Skills | G/V/R/L/W/S | MST | Mevcut | Bir kez / 48 saat | Mevcut | Ortak HTTP matrisi + entegre görev bileşenleri | Bekliyor | Bekliyor | Alan uygunluğu, entegre görevlerde bağımlılık |
| Sabit 30 soruluk diagnostic | G/V/R/L/W/S | Sabit blueprint | Erişim kontrolü mevcut | Bir kez / 48 saat | Eksik puanlamada kesin rapor engellenir | Ayrı HTTP senaryosu + diagnostic DB testleri | Bekliyor | Bekliyor | Adaptif Rapid ile ürün/rapor ayrımının açıklığı |
| Public freemium placement | G/V/R/L/W/S | Kısa adaptif tarama | Halka açık; kod kapsam dışı | Kalıcı Session ara hakkı kapsam dışı | Tarama sonucu; puanlanmamış konuşmaya tam puan verilmez | Ayrı HTTP senaryosu | Bekliyor | Bekliyor | Kısa tarama iddiaları, kesinti davranışı |
| Özgün Placement; anahtar: Özgün Kids — Form A (96 soru) | G/V/R/L; W/S kapsam dışı | Sabit 96 soru | Admin seçimi/kod mevcut | Bir kez / 48 saat | Ham puan, kümeler, geçici kur önerisi; genel CEFR belgesi yok | Ayrı HTTP + Özgün tarayıcı + DB testleri | Bekliyor | Geçici eşikler; doğrulanmış CEFR sınırları değil | Pilot yerleştirme çalışması, sınır/dengesizlik incelemesi |

CAT: bireysel soruya göre seçim. MST: modül aşamaları arasında yönlendirme. Profil kaynağı: `src/lib/product-lines/profiles.ts`; sabit formlar ve halka açık tarama ayrı akışlardır.

Tarayıcı kanıtı paylaşılan ekran/bileşen senaryolarıdır; her ürünün tamamının gerçek tarayıcıda ayrı ayrı bitirildiği anlamına gelmez. HTTP matrisi gerçek yerel sunucu ve PostgreSQL kullanır; harici AI servisleri devre dışıdır.

## Ortak kalite boyutları ve kabul koşulları

| Boyut | Mevcut kanıt / sınır | Sonraki kabul koşulu | Sorumlu | Öncelik |
|---|---|---|---|---|
| Başlatma ve erişim | Kod/ürün eşleştirme, sahiplik ve kredi yarışları için HTTP testleri | Her ürünün zorunlu CI koşusu; başka aday/kurum erişim reddi | Backend + QA | P0 |
| Cevap bütünlüğü | Tek soru teslimi, çift cevap reddi ve bağlantı sonrası kayıt doğrulaması testleri | Kayıt onaylı cevabın kesinti/yeniden başlatmada korunması; kaos testi | Backend + QA | P0 |
| Ara ve süre | Ortak sunucu politikası; bir kez ve 48 saat, bölüm saatini kaydırma | Tüm kalıcı sınavlarda HTTP tekrar/sahiplik/aynı soruya dönüş; 48 saat sınırı testleri | Backend + QA | P0 |
| Puanlama bütünlüğü | Eksik productive kanıtında kesin sonuç engelleme, insan inceleme altyapısı | Gerçek AI entegrasyonunun kontrollü ve bağımsız referans kümesiyle doğrulanması | AI + değerlendirme lideri | P0 |
| Soru içerikleri | 11 Ekim otomatik raporu: 3052 ACTIVE/PRETEST, sıfır içerik bulgusu | Tüm aktif sürümlerde uzman, kaynak/hak, tanımlayıcı, anahtar gerekçesi ve medya inceleme kaydı | İçerik lideri | P1 |
| Adaptif ölçme | Seçim, durdurma, ön test ve EAP için kod/testler | Ürün/seviye bazında hata, belirsizlik, kapsam, exposure ve karar tutarlılığı raporu | Psikometri | P1 |
| CEFR eşikleri | Standard-setting belgesi TEMPLATE; tamamlanmış kanıt doğrulanamadı | Eğitimli panel, öğrenci verisiyle doğrulama, sürümlü onaylı eşikler | Ölçme lideri | P1 |
| Writing/speaking | Rubrik, puanlama kuyruğu, insan puanlama ve arbitration altyapısı | İki bağımsız insan puanı + hakem; boyut/alt grup bazlı AI karşılaştırması | Değerlendirme lideri | P1 |
| Raporlar | Kanıt sınırlamaları ve sabit-form ayrımı mevcut | Ürün bazlı yorum kılavuzu, belirsizlik, itiraz ve sürüm izlenebilirliği | Ürün + ölçme | P1 |
| Erişilebilirlik | Araçlar/testler var; tüm akış için AA kanıtı doğrulanamadı | Klavye, ekran okuyucu ve kullanıcı testiyle kapsamlı WCAG 2.2 AA incelemesi | UX + QA | P1 |
| Güvenlik ve gizlilik | Yetki testleri ve güvenlik modülleri mevcut | Kurum ayrımı, medya/anahtar erişimi, ASVS incelemesi, saklama/silme tatbikatı | Güvenlik + backend | P0/P1 |
| Operasyon | Ölçüm/yedekleme iş akışları var; canlı sonuçlar doğrulanmadı | Havuz kapasitesi, yük, alarm, yedekten dönüş ve dağıtım tatbikatları | Operasyon | P0/P1 |
| Adalet | DIF araçları var; temsili saha kanıtı doğrulanmadı | Yeterli alt grup verisi, belirsizlik ve uzman incelemesi; otomatik damgalama yok | Psikometri | P2 |
| Bağımsız doğrulama | Bu incelemede doğrulanmış dış denetim yok | Dış uzman incelemesi, ürün bazlı teknik rapor, uygunsa ALTE hazırlığı | Ölçme lideri | P2 |

P0: cevap/hak/sonuç bütünlüğü veya yayın regresyonu. P1: güvenilir kullanım için ilk program. P2: saha verisi ve dış taraf bağımlılığı olan çalışma. Her öncelik somut kabul kanıtıyla kapanır.

## Başlatılan uygulama: QG-001 — zorunlu sınav regresyonu

1. Ana CI içine bütün sınavların gerçek HTTP/PostgreSQL denetimi eklendi. Ortam yalnızca localhost üzerinde `all_exams_` adlı geçici veritabanını kabul eder; üretim sırları gerektirmez.
2. Dokuz profil, sabit diagnostic ve Özgün akışına bir kez ara verme, tam 48 saat, tekrarın süreyi uzatmaması, yetkisiz personel işlemi, idempotent devam ve ikinci ara reddi kontrolleri eklendi. Adaptif ve diagnostic akışında aynı soruya dönüş doğrulanır.
3. Mevcut tarayıcı regresyonları ana CI içine eklendi. Önceden ayrı E2E workflow'unda olması CI tamamlanınca tetiklenen dağıtımı durdurmuyordu.
4. Bu işler başarısız olduğunda CI başarısız olur; CI başarısına bağlı dağıtım yolu açılmaz. Harici Render otomatik dağıtımı/branch protection ayarları bu yerel değişiklikle doğrulanmış sayılmaz.
5. Sonuç JSON'u CI artifact olarak saklanır. Sunucu logları varsayılan artifact kapsamına alınmaz.

Çalıştırma: `npm run audit:assessment-flows` (geçici DB hazırlanmış olmalı), `npm run test:item-renderer`, `npx vitest run test/workflow-config.test.ts`.

Üretim kalibrasyonu seed verisi üzerinden geçmiş sayılmaz. CI teknik başarıları CEFR/AI geçerlik onayı değildir; bu kanıtlar ayrı yayın kararı gerektirir.

## 13 Ekim yerel doğrulama sonucu

- Gerçek sunucu + yeni localhost PostgreSQL: **18/18 senaryo geçti**; 12 sınav akışını ve ek erişim/kredi/eşzamanlılık kontrollerini kapsar.
- Chromium tarayıcı regresyonu: **55/55 geçti**. Sahte mikrofon/kamera cihazları kullanıldı; gerçek cihaz uyumluluğu saha kontrolü gerektirir.
- Workflow yayın güvenliği, YAML, ara/devam ve oturum ilerleme testleri: **37/37 geçti**.
- Tip kontrolü, sunucu derlemesi ve denetim betiği sözdizimi kontrolü geçti.
- Testler canlı AI çağrısı yapmadı. Üretim kalitesi, psikometrik geçerlik ve dış denetim sütunları bu sonuçlarla kapatılmadı.
- Kurulum sırasında migration yardımcısının ayrı `MIGRATION_DATABASE_URL` ayarı ilk kontrolü canlı hedefe yönlendirdi; sonuç “No pending migrations to apply” oldu, migration uygulanmadı. Yerel kurulum bu ayar açıkça geçici DB'ye sabitlenerek tekrar yapıldı. Yeni CI işi hem çalışma hem migration hedefini sabitler; bu bağlantı eşitliğini koruyan test eklendi.

## QG-002 — duraklatılmış ve süresi dolmuş sınavları koruma

Uygulandı ve 13 Ekim'de gerçek HTTP/PostgreSQL ile doğrulandı:

- Dokuz adaptif/MST profilinde, sabit diagnostic'te ve Özgün Placement'ta duraklatma ve 48 saatlik süre aşımı için negatif API kontrolleri eklendi.
- Duraklatılmış oturumda soru/cevap ve tamamlama; Özgün'de başlangıç/cevap/bölüm geçişi/dinleme başlatma engellenir. Duraklatılmış Özgün durum ekranı soru içeriği göstermez.
- Diagnostic'in hem ortak hem özel cevap yolu ve özel rapor yolu kontrol edilir. Engellenen istekler cevap, ilerleme, bölüm saati veya final rapor oluşturamaz.
- Süresi geçmiş PAUSED oturumda işlemler engellenir; devam isteği 410 döndürür ve EXPIRED durumunu kaydeder. Sonraki devam isteği sınavı yeniden açamaz.
- Bulunan hata düzeltildi: diagnostic'in ilk durum kontrolü EXPIRED oturumları da puanlama/cevap sorgusundan önce reddeder. Özel diagnostic cevap/rapor yolları durum çatışmasını diğer yollar gibi 409 ile bildirir.
- Doğrulama: **29/29 HTTP senaryosu**, **44/44 odaklı test**, tip kontrolü ve sunucu derlemesi geçti. Yerel fixture veritabanına açıkça yönlendirilen genel koşuda **2168 test geçti**, 68 test atlandı, 2 todo kaldı; atlananlar başarı sayılmadı. 48 saatin tam sınırı mevcut birim testlerinde ayrıca kontrol edilir; HTTP senaryoları sunucuda süresi geçmiş kayıt kullanır.

Bu kapsam adayın sınav işlemleridir. Yetkili insan puanlamasının duraklatılmış oturumdaki önceden kaydedilmiş cevapları işlemesi ayrı, izin verilen bir süreçtir. Kamuya açık freemium taramasında kalıcı Session ara/devam politikası bulunmadığından bu durum matrisi uygulanmaz.

## QG-003 — ad, süre, beceri ve başlangıç yönergesi tutarlılığı

Uygulama:

- Başlangıç ekranı ve sınav seçim kartları süre/beceri bilgisini `assessment-presentation.ts` üzerinden sunucunun kullandığı profillerden türetir. Rapid: 30–40; Express: 30–46; General: 42–62; Academia: 90–120 dakika tahmini. Bunlar saha verisiyle doğrulanmış süre dağılımları değildir.
- Express'in kalıcı anahtarı değişmeden görünen adı `Express Assessment (30–46 Min)` oldu; dashboard/kod girişi gibi ortak adlandırma yolları Rapid ve Express'in görünen adını kullanır.
- Express seçim kartının dört bölüm iddiası kaldırıldı; altı gerçek bölüm gösterilir. Aynı Express sınavını açan fakat 15–25 dakika ve doğrulanmış eşitleme vaat eden ayrı Progress Check kartı kaldırıldı. Tekrarlı sınav geçmişi özelliği korunur; bu değişiklik sınav motorunu değiştirmez.
- Özgün'ün süreli bölümleri 102 dakikadır. Kitapçık/admin toplamındaki 105 dakika yaklaşık üç dakika hazırlık içerir. Başlangıç ekranı artık açıkça 102 dakika süreli bölüm gösterir; hazırlık sınav saatini başlatmaz.
- Eski “30 dakika içinde devam” yönergesi, sunucuyla uyumlu bir defalık 48 saatlik ara/devam açıklamasıyla değiştirildi. Tarayıcı kapatma veya bağlantı kesilmesinin kendiliğinden süreyi durdurmadığı açıklanır.
- Kesin 48 saat puanlama ve otomatik sertifika vaadi kaldırıldı; gerekli puanlama ve insan incelemesi tamamlanınca sonuçların kesinleşeceği belirtilir.
- Kodla atanmış dokuz profil ve Özgün için seçim yönlendirmesi desteklenir. Önceden kartı olmayan Corporate/Primary/Junior gibi ürünler ilgisiz sınav seçeneklerine düşüyordu. Bilinmeyen atama ilgisiz sınav seçtirmez, kurumla iletişim mesajı gösterir. Legacy General eşleştirmesi korunur.
- Admin stüdyosunun eski 15 dakika/saf CAT/20 soru anlatımı güncel Rapid profiliyle hizalandı.
- Tarayıcı kontrolünde bulunan mobil navigasyon sorunu düzeltildi: salt okunur kamera önizlemesi alttaki düğmelere tıklamayı engellemez. Kamera ve gözetim çalışması devam eder.
- Yerel genel test koşusu: **2184 geçti**, 68 atlandı, 2 todo. İlk yoğun koşudaki yönlendirme zaman aşımı ayrı koşuda ve ardından genel koşuda yeniden doğrulandı. Tip kontrolü ve tam üretim derlemesi geçti. Son tarayıcı koşusunda **55/55 geçti**; mobil kamera önizlemesi düzeltmesi bu koşuya dahildir.

Kapsam: sınav seçim/başlangıç ve ortak adlandırma. Genel pazarlama sayfalarının kısa süre/CEFR iddiaları ve bütün rapor şablonları sonraki incelemede ayrıca ele alınmalıdır. Teacher/kurum ürün listeleri aşağıdaki ikinci uygulamada hizalandı.

## QG-003 ikinci uygulama — kurum davetleri ve öğretmen atamaları

- Admin kod oluşturma, kurum daveti ve öğretmen ataması ortak ürün kataloğuna bağlandı. Kod/davet kataloğu dokuz profil ve Özgün Placement'ı içerir; öğretmen atama kayıtları dokuz adaptif profili içerir. Özgün için mevcut kodlu uygulama yolu kullanılır.
- Primary/Junior/General eski adları hem yeni kayıtlarda hem mevcut kodların sınav başlatmasında kanonik ürünlere eşlenir. Bilinmeyen adların yeni kod/davet/atama oluşturması reddedilir. Böylece çocuk sınavının sessizce General English olarak çalışması önlenir; mevcut kayıtlar için migration gerekmez.
- Davet e-postası ve geçerlilik gün sayısı; atama ürün/tarih sırası/deneme sayısı sunucuda doğrulanır. Geçersiz girdiler 400 alır ve kayıt oluşturmaz.
- Öğretmen ekranı atama hatasını gösterir ve girdileri korur. `datetime-local` değerleri tarayıcıda UTC ISO biçimine çevrilir; sunucu saat dilimine göre istemeden kaymaları önlenir.
- Ortak ürün seçenekleri güncel görünen adları kullanır; atama/davet alanlarına erişilebilir isim eklendi.
- Gerçek HTTP kontrolleri tüm dokuz ürün için atama kaydı oluşturmayı, hatalı girdiyle hiçbir kod/atama oluşmamasını ve eski Primary/Junior kodlarının doğru profili açmasını kapsar. Davet yolunda yalnızca geçersiz ürünlerle doğrulama sınanır; e-posta gönderilmez. Gerçek e-posta teslimi bu çalışmanın kanıtı değildir.
- Son doğrulama: **31/31 HTTP senaryosu**, genel koşuda **2204 test**, son odaklı koşuda **39 test**, admin kod oluşturma/öğrenci kod girişi için **3 tarayıcı testi** geçti. Tip kontrolü ve tam üretim derlemesi başarılı. Genel koşuda 68 atlama ve 2 todo ayrıca kayıtlıdır.

## QG-003 üçüncü uygulama — rapor kanıtı ve belirsizlik

- Öğrenci raporunda ürünün güncel görünen adı ve rapor durumu gösterilir. Ortak PDF modeli de aynı ürün adını kullanır; kalıcı ürün anahtarı değişmez.
- Aynı CEFR bandında kalan model aralığı artık “95% CI: ±0” olarak gösterilmez. Aynı bantta kalmanın sıfır ölçüm hatası olmadığı açıkça belirtilir.
- Gelişim hedefleri gerçek beceri theta/SEM değerlerini alır. Genel puandan eksik beceriler üretilmez; SEM sabit .3 ile değiştirilmez.
- Bir sonraki bandın alt sınırı kullanılır. Önceki hesap B1→B2 gibi geçişlerde hedef bandın üst sınırını kullanıyordu. C2 genel sonucu daha zayıf ölçülmüş becerileri gizlemez.
- Yapay tamamlanma yüzdesi kaldırıldı; theta mesafesi ve model aralığının hedef sınırla çakışması gösterilir. Bunlar öğrenme hedefidir, başarı/tamamlama tahmini değildir. Kullanılan platform eşiklerinin geçici olduğu açıklanır.
- Öğrenci API'si ve PDF ortak beceri modelini kullanır. Yalnızca ön test cevabı veya hiç puanlanmış cevabı olmayan beceride eski profil kaydı seviye üretmez. Beceri içinde çözülmemiş puanlama varsa kesin beceri seviyesi gösterilmez ve bekleme durumu korunur.
- Tamamlanmamış sınavın raporu, son güncelleme tarihini tamamlanma tarihi diye kullanmaz. Varsayılan bitiş nedeni de gerçek oturum durumunu yansıtır.
- Yeni gerçek HTTP senaryosu ön test kanıtının aday sonucundan dışlanmasını, eski profilin seviye üretmemesini, bekleyen beceri puanının tutulmasını ve ürün/tarih bilgisini doğrular. PDF-model ve ekran testleri aynı-bandı/sıfır belirsizlik ayrımını, gerçek SEM aktarımını ve doğru hedef eşiğini kapsar.

Kapsam: ortak rapor modeli, aday adaptif ekranı ve gelişim hedefleri. Eski rapor bileşenleri, paylaşılan rapor ekranları, dış API tüketicileri ve madde bazlı tarihsel theta çizgisinin kanıt kaynağı ayrıca incelenmelidir. Bu uygulama psikometrik geçerlik çalışması yerine geçmez.

Doğrulama: **32/32 gerçek HTTP senaryosu**, genel koşuda **2215 test**, rapor/model/hedef odaklı koşuda **29 test**, mobil/masaüstü için **6 tarayıcı kontrolü** geçti. Son tip kontrolü ve tam üretim derlemesi başarılı. Genel koşuda 68 test atlandı ve 2 todo kaldı. Mobil rapor görüntüsü ayrıca incelendi.

## QG-009 — paylaşılan ve dış raporlar

- Public paylaşım sorgusundaki yanlış `session.user` ilişkisi `candidate` ile düzeltildi. İlk 5000 kaydı uygulamaya getirip tarama yerine token'a göre JSON sorgusu kullanılır; kayıt sayısından kaynaklanan görünmez bağlantı sınırı kalktı.
- Paylaşım oluşturma ve mevcut linki okuma güncel ortak rapor kanıtını doğrular. Pending, güvenlik incelemesi ve eksik kanıt 409; geçerlilik süresi dolmuş sonuç 410 döndürür. Metadatadaki güvenlik tutması ve geçerliliğin tam sınırı da uygulanır.
- Public yanıtta gerçek tamamlanma tarihi ve güncel ürün adı kullanılır. Kimlik e-postası, cevap metni/kayıtları veya değerlendirme metadatası paylaşılmaz. Kontrol sorguları yalnızca gerekli cevap alanlarını yükler.
- Paylaşım ekranının 0–100 beceri puanını theta gibi yorumlayan çubuk hesabı düzeltildi. Sıfır korunur; bilinmeyen/bozuk puan gösterilmez. Grammar/vocabulary ve ölçek açıklaması eklendi. Linkin başka bir sonuca geçişinde eski istekler ve hata durumu temizlenir.
- Dış rapor API'sinin ayrı ve eski CEFR tablosu kaldırıldı. Aday/PDF modeliyle aynı theta, SEM, seviye, beceri kanıtı ve ön test kuralları kullanılır. Kesinleşmemiş/geçersiz sonuçlarda final puanlar null, beceri listesi boş döner.
- API yanıt sözleşmesi **2.0.0** olarak sürümlendi; nullable alanlar ve tüketici uyarlaması `docs/quality/score-report-api-v2.md` içinde belgelendi. Uç yollar aynı kaldı. Harici tüketicilerin canlı uyumluluğu bu yerel testlerle doğrulanmış değildir.
- Kurum özetleri yalnızca uygun final kanıtlardan hesaplanır; çift sayıda kayıtta ortanca iki orta değerin ortalamasıdır. Boş örneklemde ortalama/ortanca null olur. En yeni 10000 tamamlanmış oturum sınırı metadatada açıklanır.
- API anahtar araması ilk 500 kurum sınırından çıkarıldı; tam digest sorgusu kullanılır. Bozuk saklanmış digest yetki hatası olarak reddedilir, karşılaştırma istisnası üretmez.
- Paylaşım ve kimlik doğrulamalı dış rapor yanıtlarında `private, no-store` önbellek politikası uygulanır. Paylaşım bağlantısı bağımsız sertifika olarak etiketlenmez.

Doğrulama kapsamı: final sonuç yayınlama; sonradan SCORING/FLAGGED/EXPIRED olma, geçerlilik dolması, metadata güvenlik tutması ve kanıt kaybında yayın durdurma. Testler localhost veritabanı ve kontrollü öğrenci kayıtları kullanır; e-posta gönderilmez. Büyük ölçekli sorgu/index performansı, token iptal/yenileme arayüzü ve canlı dış entegrasyon uyumu sonraki işlerdir.

Son doğrulama: **33/33 gerçek HTTP senaryosu**, genel koşuda **2234 test**, odaklı rapor/ekran koşusunda **38 test**, public rapor için **8 mobil/masaüstü tarayıcı kontrolü** geçti. Tip kontrolü, tam üretim derlemesi ve son sunucu derlemesi başarılı. Genel koşuda 68 atlama ve 2 todo başarı sayılmadı. Migration gerekmez.

## QG-010 — sınavdan çıkış, hesap çıkışı ve bitiş akışı

Tetikleyici: Kodla atanmış ürün, dashboard'a bağlanan seçim bileşeni her mount olduğunda `onSelect` çağırıyordu. Sınavdan çıkış dashboard'u yeniden açınca aynı sınav hazırlığı kendiliğinden başlıyor, hesap çıkışı menüsü erişilemez oluyordu. Önceki çıkış regresyonu kod ataması olmayan adayla sınırlıydı; yeni testler gerçek `allowedProductLine` durumunu kapsar.

- Seçim ekranı atanmış tek sınavda da kart gösterir ve açık tıklama ister. Exit/cancel/report-close yolları oturum ve sonuç geçici durumlarını temizleyip URL'yi doğrudan dashboard'a taşır.
- Kodun ilk başarılı tesliminde kullanıcının “Start Exam” eylemi hazırlık ekranını açıkça açar. Dashboard'a dönüşler yeni sınav başlatmaz.
- Hazırlıkta Sign out seçeneği eklendi. Hesap çıkışı tek istekle, 10 saniyelik zaman sınırıyla çalışır; sunucu başarılı olduğunda kimlik/oturum/sonuç/histori durumu temizlenip login'e gidilir. Başarısız istek kullanıcıya hata gösterir ve yeniden denenebilir. Başarısız çıkış başarılıymış gibi gösterilmez.
- Geç gelen geçmiş/sertifika cevapları yön değiştirme veya logout sonrasında eski ekranı geri getirmez.
- COMPLETED/SCORING/FLAGGED oturum bağlantıları hazırlığı tekrarlamadan sunucunun raporuna gider. Süresi dolmuş oturumda çıkış hakkı kullanılmış olsa da dashboard'a dönülebilir.
- Oyuncunun bitiş bildirimi bir kez yapılır; arka plan durum kontrolü terminal durum görürse rapora geçer. Aynı anda gelen next/status cevapları tekrar bitiş/sertifika isteği başlatmaz.
- Bitiş ekranı sınıflandırmayı istemcide theta'dan yeniden üretmez; sunucunun kanıta dayalı raporunu açar. Sertifika isteği top-level `sessionId` sözleşmesiyle düzeltilmiştir; sunucu yetki ve final kanıt kontrolünü korur. Sertifika isteği rapor açılışını engellemez; başarılı olursa rapor yenilenir.
- `/api/sessions/:id/complete` artık yaşam döngüsünü zorla COMPLETED yapmaz. Teslim/scoring motorunun sonlandırdığı COMPLETED/SCORING/FLAGGED kaydını yalnızca onaylar; aktif/paused/expired ve fixed-form yanlış yolunu reddeder. Tekrarlar durum, cevap, rapor ve tamamlanma tarihini değiştirmez. Eski uyumluluk yolunun tekrar tekrar sonuç bildirimi göndermesi kaldırıldı; normal sınav sonlandırması oyuncunun teslim yolu üzerinden yürür.

Yerel testler atanmış kodla mobil/masaüstü exit→dashboard→logout, preparation cancel/logout, pending/final report yönlendirmesi, sertifika sözleşmesi, hata sonrası logout tekrarı ve expired dönüşünü kapsar. Gerçek HTTP testi bitmemiş sınavın zorla tamamlanmadığını ve SCORING/FLAGGED durumlarının korunduğunu doğrular. Canlı dağıtım bu yerel çalışmayla yapılmış sayılmaz.

Son doğrulama: **2243 genel test**, **54 odaklı çıkış/yönlendirme testi**, **34/34 gerçek HTTP senaryosu** ve **68/68 tarayıcı regresyonu** geçti. Son tip kontrolü ve tam üretim derlemesi başarılı. Genel koşuda 68 atlama ve 2 todo başarı olarak sayılmadı. Migration gerekmez.

## Sıradaki iş listesi

| Kimlik | İş | Bağımlılık / teslim |
|---|---|---|
| QG-002 | Duraklatılmış/48 saati dolmuş oturumların negatif HTTP kontrolleri | Tamamlandı; yukarıdaki sonuçlar ve kapsam sınırları |
| QG-003 | Ürün süre/ad/bölüm sözleşmeleri | Seçim/başlangıç ve kod/davet/atama listeleri uygulandı; pazarlama ve rapor incelemesi sürüyor |
| QG-004 | Aktif soru sürümlerinin içerik/uzman/medya/kalibrasyon kanıt envanteri | Salt okunur yetkili bankaya erişim; eksik kanıtı onay saymama |
| QG-005 | AI sağlayıcı hata ve yeniden işleme tatbikatı | İzole ortam; bağımsız insan puanlı küme ayrıca gerekir |
| QG-006 | Ürün bazlı CAT/MST benzetim raporu | Seçilmiş model ve ölçülmüş parametre belirsizliği |
| QG-007 | Üretim kapasitesi ve yedekten geri dönüş doğrulaması | Operasyon ortamı ve onaylı hedefler |

## İncelenen kanıt kaynakları

- `docs/ASSESSMENT_FLOW_AUDIT_2026_10_07.md`: önceki yerel HTTP/DB/tarayıcı sonuçları; Express'in dört beceri olduğu eski anlatım güncel profil ile uyuşmuyor.
- `reports/active-item-content-audit.md`: 11 Ekim otomatik içerik raporu; uzman veya kalibrasyon onayı değildir.
- `docs/standard-setting-report.md`: şablon çalışma raporu.
- `src/lib/product-lines/profiles.ts`: dokuz ürünün güncel beceri, CAT/MST ve süre tanımları.
- `src/lib/assessment-engine/session-pause-service.ts`, `scripts/audits/assessment-flows.mjs`, `test/e2e/item-renderer.config.ts`.
- `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, `.github/workflows/deploy.yml`: yayın/test bağlantıları.

## QG-011 — yeniden başlatma sonrası puanlama kuyruğunun ilerlemesi

- Bulunan açık: kurtarma yalnızca başlangıçta veya veritabanı yeniden bağlandığında ilk 100 kaydı tarıyordu. Sağlıklı bağlantıda kalan kayıtlar bekleyebiliyor; ilk sayfadaki geçersiz/aktif kayıtlar sonraki yanıtları engelleyebiliyordu.
- Her başarılı 30 saniyelik bağlantı kontrolü kalıcı bekleyen yanıtların kurtarılmasını tetikler. Aynı süreçte üst üste gelen kurtarma çağrıları tek taramayı paylaşır.
- Kimlik üzerinden sayfalama silinen/değişen kuyruk kayıtları nedeniyle offset atlamasını önler. Her geçiş en fazla 100 yeni iş ve 1000 kayıt taramasıyla sınırlıdır; tarama konumu sonraki geçişe taşınır ve sona gelince başa döner. Kurtarma, aynı süreçte bekleyen iş sayısını 200'e tamamlayan kapasiteyi gözetir.
- Yanıtların kalıcı metni değiştirilmez. Ön test, insan tarafından kesinleşmiş puan ve tamamlanmış AI işi kurtarma ile yeniden puanlanmaz; mevcut AI hata/insan inceleme davranışı korunur.
- Regresyonlar: 205 yanıtın bütün partilerde işlenmesi; 100 ve 1000 kullanılamayan kaydın sonrasına ilerleme; eşzamanlı tarama; kapasite dolması/boşalması; veritabanı sorgu hatasından sonra yeniden deneme.
- Gerçek HTTP/PostgreSQL matrisine, sağlıklı çalışan sunucuya başlangıçtan sonra eklenen 105 kalıcı writing yanıtının otomatik kurtarılması eklendi. Harici AI anahtarları boş tutulur; cevapların korunması ve insan inceleme kuyruğuna alınması doğrulanır.

Kapsam: tek Node sürecindeki otomatik kurtarma ve kalıcı yanıt bütünlüğü. Birden fazla sunucu arasında dağıtık iş sahipliği/lease, gerçek sunucu öldürme ve servis kesintisi tatbikatı, puan tamamlandıktan sonraki rapor yenileme hatalarının kalıcı yeniden deneme mekanizması ayrıca ele alınmalıdır. Bu yerel kanıt gerçek AI–insan puan uyumu veya üretim kapasitesi onayı değildir. Migration gerekmez.

13 Ekim yerel doğrulama: **2249 genel test geçti**, 68 atlandı ve 2 todo kaldı; **35/35 gerçek HTTP/PostgreSQL senaryosu geçti**. Odaklı kuyruk koşusunda **18/18 test geçti**. Tip kontrolü, sunucu derlemesi, denetim betiği sözdizimi ve kapsamlı diff kontrolü başarılı. Genel koşuda görülen çıkış testi zamanlama hatası, `/login` yönlendirmesinin tamamlanmasını bekleyerek düzeltildi ve genel koşu yeniden geçirildi. İlk yerel bağlantı denemesinde test PostgreSQL'i yanlış portta açılmıştı; doğru localhost portuyla tekrarlandı. Üretim veritabanına bağlanılmadı. Bu değişiklikte yeni kullanıcı arayüzü davranışı bulunmadığından tarayıcı paketi yeniden koşulmadı.

## QG-012 — kalıcı rapor yenileme ve güvenlik incelemesini koruma

- AI veya insan puanı kaydedilirken cevabın metadatasına `reportRefreshPending` ve her puan kaydına özel `reportRefreshVersion` aynı yazmada eklenir. Veritabanı kesintisinde veya süreç yeniden başladığında rapor yenileme niyeti kaybolmaz. Mevcut JSON metadata alanları kullanılır; migration gerekmez.
- Yenileme tamamlandıktan sonra yalnızca işlem öncesindeki metadata sürümü hâlâ aynı olan kayıtların işareti temizlenir. Bu arada yeni bir puan gelirse onun işareti korunur. Rapor veya işaret temizliği hata verirse sonraki sağlıklı kontrol tekrar dener; AI/insan değerlendirmesi tekrarlanmaz.
- Rapor yenilemesi beklerken ortak aday/PDF modeli geçici durum gösterir; ilgili becerinin kesin seviyesini göstermez. Paylaşılan/dış rapor ve sertifika yolları eski doğrulanmış raporu yeni puanın kesin sonucu olarak sunamaz. Bu kapı ölçüm motorunda kayıtlı puanın kanıt olarak kullanılmasını engellemez.
- Başlangıçta ve her sağlıklı bağlantı kontrolünde en fazla 25 farklı oturum ele alınır. Oturum kimliğiyle sayfalama, başarısız bir partinin sonraki oturumları engellemesini önler. Aynı süreçte eşzamanlı taramalar birleştirilir; aynı oturumun raporları sırayla yenilenir. Süresi dolmuş ve henüz başlatılmamış oturumlar otomatik yeniden açılmaz.
- Adaptif rapor yenilemesi SCORING ve FLAGGED terminal durumlarını da yeniden hesaplar. FLAGGED, oturum metadatasındaki güvenlik tutması veya önceki rapordaki boolean güvenlik tutması kesin rapora çevrilmez. Tamamlanma tarihi korunur. Arka plan yenilemesinde analiz hatası sessizce başarılı sayılmaz; transaction geri alınır ve kalıcı işaret tekrar deneme için kalır.
- HTTP/PostgreSQL senaryosu: kayıtlı insan puanlarından COMPLETED/SCORING/FLAGGED raporlarının otomatik yeniden oluşturulması; cevap metni, insan puanı ve tamamlanma tarihinin korunması; güvenlik tutmasının kaldırılmaması. Bu yalnızca yerel kontrollü veri kullanır.

Sınır: önceki sürümlerde bu işaret olmadan kaydedilmiş tüm tarihsel puan/rapor uyuşmazlıkları otomatik olarak saptanmış sayılmaz. Dağıtık görev lease'i, gerçek süreç öldürme/üretim kesintisi tatbikatı ve insan değerlendirmesinin geçerlik çalışması ayrı teslimlerdir.

13 Ekim yerel doğrulama: **2261 genel test**, **36/36 gerçek HTTP/PostgreSQL senaryosu**, **44 odaklı kuyruk/insan puanlama/rapor yenileme testi** ve **16/16 mobil/masaüstü rapor-paylaşım-sertifika tarayıcı senaryosu** geçti. Genel koşuda 68 atlama ve 2 todo ayrıca kayıtlıdır. Son tip kontrolü (`node --max-old-space-size=1536 node_modules/typescript/bin/tsc --noEmit`), tam client/SSR/server/Prisma üretim derlemesi ve diff/sözdizimi kontrolleri başarılı. İlk tarayıcı denemesinde eşzamanlı yoğun derleme altında iki `page.goto` zaman aşımı görüldü; koşu durduruldu ve derleme tamamlandıktan sonra aynı testler varsayılan zaman aşımıyla, tek işçiyle yeniden geçirildi. İlk uzun tip kontrolü sonlandırıldı; bellek sınırı verilen tam kontrol başarıyla tamamlandı. Üretim veritabanı ve gerçek AI servisleri kullanılmadı; geçici yerel PostgreSQL kapatıldı.

## QG-013 — ani süreç kesintisi ve tarama oturumunun kaybı

- Gerçek HTTP/PostgreSQL matrisine SIGKILL → yeni Node süreci → aynı oturumdan devam tatbikatı eklendi. Yalnızca denetimin kendisinin başlattığı, localhost'taki geçici test sunucusu durdurulur; canlı servis veya veritabanı kullanılmaz.
- Dokuz CAT/MST profilinin, sabit 30 soruluk diagnostic'in ve Özgün Placement'ın her birinde cevap gönderilir, sunucunun kaydı onayladığı durum okunur ve sıradaki soru hazırlanır. Aktif ve duraklatılmış örnekler birlikte sınanır.
- Yeniden başlatmada cevapların tamamı, ilerleme metadatası, başlangıç/bölüm saatleri, mevcut soru ve 48 saatlik ara son tarihi karşılaştırılır. Devam aynı soruyu getirir; ek ara hakkı, oturum veya kredi tüketimi oluşamaz. Önceki cevabın tekrar gönderilmesi kaydı değiştiremez.
- Tatbikat bir hata yakaladı: diagnostic'in önceden cevaplanan/geçerli sırada olmayan soru ve kilit altındaki tekrar kontrolü genel Error fırlatıyor, ortak cevap yolunda 500 oluyordu. Bunlar 409 durum çatışmasına çevrildi; blueprint dışındaki madde 400 alır. Ortak ve diagnostic'e özel cevap yollarında tekrarın hiçbir cevap kaydını değiştirmediği kontrol edilir.
- Halka açık ücretsiz tarama bellekte tutulur; kalıcı sınavların bir kez/48 saat hakkı bu ürüne uygulanmaz. Sunucu yeniden başladığında kayıp tarama 410 / `PLACEMENT_SESSION_EXPIRED` döndürür, sonuç üretmez. Oturum sözlüğü prototip içermeyecek şekilde oluşturuldu; `__proto__`, `constructor` ve `toString` gibi yol değerleri oturum sayılmaz.
- Öğrenci ekranı kayıp taramada sonsuz Retry döngüsü yerine açık yeni tarama/kapama seçenekleri sunar. Yeni kayıt ekranına dönüş bir sınav başlatmaz; öğrenci tekrar başlatmayı seçer. Başlangıç yönergesi devam sınırlamasını açıklar. Geçici ağ/503 hatasında yazılan cevap korunur ve yeniden gönderilebilir; bu durum kayıp oturum gibi ele alınmaz.
- Mobil/masaüstü tarayıcı kontrolü, kayıp oturumdan yeni girişe dönüşü, yeni denemede eski taslağın taşınmamasını ve geçici hatada aynı cevabın tekrar gönderilebilmesini kapsar. Bu senaryolar mevcut zorunlu tarayıcı CI işine eklendi.

Kapsam: onaylanmış cevapların uygulama sürecinin ani kesintisinden sonra korunması. PostgreSQL'in kendisinin çökmesi, yedekten geri dönüş, medya deposu kesintisi, sürümler arası şema geçişi ve birden fazla sunucu arasında iş sahipliği ayrıca doğrulanmalıdır. Ücretsiz taramaya kalıcı devam özelliği eklenmiş değildir. Migration gerekmez.

13 Ekim yerel doğrulama: **2269 genel test geçti**; 68 atlama ve 2 todo ayrıca kayıtlıdır. **37/37 gerçek HTTP/PostgreSQL senaryosu**, **11 odaklı diagnostic/tarama testi** ve **4/4 mobil/masaüstü tarama kurtarma tarayıcı senaryosu** geçti. Son sunucu koşusu gerçek SIGKILL ve ikinci süreç başlangıcını içerir. Tip kontrolü (1536 MiB Node heap sınırı), tam client/SSR/server/Prisma derlemesi ve betik/diff kontrolleri başarılı. İlk kesinti denemesi diagnostic tekrarının 500 dönmesini yakaladı ve servis düzeltildi. Bir sonraki denemede eşzamanlı Vite derlemesinin `dist/server.js` dosyasını geçici temizlemesi test sunucusunun açılmasını engelledi; derleme tamamlandıktan sonra test ayrı çalıştırılarak tüm senaryolar geçirildi. Bu derleme yarışı ürünün veri kaybı bulgusu olarak raporlanmadı. Harici AI ve e-posta gönderimi kullanılmadı; üretime bağlanılmadı. Geçici yerel PostgreSQL kapatıldı.

## QG-014 — uzman soru incelemesinin çalışması ve sürüm kanıtı

- Arayüzün 0–100 boyutlarını API'nin 1–5 kabul etmesi; null notes/stageTarget ve BELOW_TARGET/ABOVE_TARGET etiketlerinin reddedilmesi düzeltildi. Sıfır dahil 0–100 tamsayı ve geçerli CEFR fit etiketleri ortak sözleşmeye alındı.
- Yeni incelemeler sunucunun doğruladığı itemVersion/contentHash ile kaydedilir. İstemci açtığı sürüm, içerik/bağlam özeti ve aşamayı gönderir. Değişmiş soru 409 alır; eski ekran onayı yeni içeriğe uygulanmaz. İçerik özeti type/skill/CEFR, content ve ürün/yaş/construct bağlamını kapsar; gerçek uzak medya byte'larının insan kontrolü yerine geçmez.
- Soru kilidi, inceleme kaydı ve aşama ilerlemesi tek transaction içinde çalışır. Inline içerik düzenleme ve pipeline işlemleri aynı kilidi kullanır. Aynı onayın iki gönderimi veya düzenleme/onay yarışı iki değişikliğin de eski snapshot'a karşı kaydedilmesine izin vermez.
- Uzman türü/rolü ve geçerli sonraki aşama kontrol edilir. İnceleme yolundan doğrudan LIVE'a atlanamaz. Revizyon yazarı yalnızca EDITING → LANGUAGE_REVIEW dönüşünü yapabilir; yayınlama veya uzman onayı alamaz. Revizyon talepleri yazara liste yanıtında gösterilir; yeniden gönderim hatası ekranda görünür.
- Ekran güncel, farklı/eski ve sürümü bilinmeyen incelemeleri ayırır. Soru/sürüm değişince form temizlenir; geç gelen yanıt eski aşamayı geri getiremez. Gecikmeli otomatik ilerletme zamanlayıcıları ekran değişiminde/unmount'ta iptal edilir. Mobil inceleme geçmişi yatay taşma yapmayacak biçimde sarılır; boyut ve not alanları erişilebilir isim aldı.
- Salt okunur kanıt denetimi yalnızca güncel sürüm/özete bağlı farklı incelemecileri sayar. Legacy onaylar yeni içeriğin kanıtı sayılmaz; kişi/tür başına son karar ve güncel itirazlar dikkate alınır. İki kullanıcı kaydı gerçek uzman bağımsızlığını kanıtlamaz; otomatik yayın onayı veya ampirik kalibrasyon sonucu üretilmez.
- Additive migration `010_item_review_snapshot` yalnızca geçici yerel PostgreSQL'e uygulandı. Eski kayıtlar null sürüm/özetle bırakılır; onay geriye dönük uydurulmaz. API/dağıtım ayrıntıları `docs/quality/item-review-contract.md` içindedir.

Kapsam: çevrimiçi uzman inceleme akışı, revizyon dönüşü ve sürüm kanıtı. Canlı bankanın uzmanlarca incelenmesi, kullanım hakkı/medya/pilot kanıtlarının tamamlanması ve bütün ayrı yayın/aktivasyon yollarının ortak yayın kapısında birleştirilmesi açık işlerdir. QG-004'ün üretim envanteri ve ölçme kanıtı bu teknik teslimle kapatılmaz.

13 Ekim yerel doğrulama: **2292 genel test geçti**; 68 atlama ve 2 todo ayrıca kayıtlıdır. **38/38 gerçek HTTP/PostgreSQL senaryosu** ve **10/10 mobil/masaüstü uzman inceleme/yeniden gönderim tarayıcı senaryosu** geçti. Gerçek test; uzman rolü, 0–100/null sözleşmesi, eski snapshot reddi, çift onay, düzenleme/onay yarışı, revizyon taleplerinin yazara görünmesi, yazarın sınırlı dönüş yetkisi ve legacy alanların null kalmasını kapsar. Birim testleri aşama yazma hatasında rollback'i, son kararın eski onayı geçersiz kılmasını, geç liste/inceleme cevaplarını ve başarılı yeniden gönderim sonrası liste yenileme hatasını da kapsar. Tip kontrolü (1536 MiB Node heap sınırı), tam client/SSR/server/Prisma derlemesi ve betik/diff kontrolleri başarılı. İlk mobil koşu inceleme geçmişinde yatay taşmayı yakaladı; layout düzeltmesinden sonra son koşu geçirildi. Migration yalnızca localhost geçici DB'de uygulandı; harici AI/e-posta ve canlı DB kullanılmadı. Test PostgreSQL'i kapatıldı.


## QG-015 — pilot kabulü, atomik aktarım ve kaynak kaydının korunması

- Bulunan hata: pilot aktarımı metadata'yı pilotStartedAt/promotedBy ile değiştiriyor; kaynak, hak, paramSource ve diğer kanıtlar siliniyordu. Aday listesi okunduktan sonra içerik/aşama değişse bile eski liste üzerinden aktarım yapılabiliyor, iki ayrı yazma kısmi işlem bırakabiliyordu.
- Aktarım soru satırlarını sabit kimlik sırasıyla kilitler, yalnızca kilitlenmiş kimliklerin güncel içerik ve incelemelerini okur. Kabul kontrolü, PRETEST/isPretest/PILOT değişikliği ve mevcut metadata'ya kabul kaydı ekleme tek transaction içindedir. Yazma hatası batch'i geri alır; eşzamanlı istekler aynı soruyu iki kez aktaramaz.
- DRAFT/REVIEW + APPROVED_FOR_PILOT ve güvenli durum gerekir. Güncel soru sürümü/özetine bağlı dört uzman inceleme türü, en az iki farklı onaylayan kullanıcı ve çözülmemiş itiraz bulunmaması aranır. Statik içerik BLOCKER bulguları kabulü durdurur. Eski onay, yalnızca pipeline etiketi veya çevrimdışı checklist yeni kabul kapısını geçirmez.
- Önizleme ve aktarım aynı kabul kurallarını kullanır; uygun sorular ile neden kodları bulunan engellenen sorular ayrı döner. Önizleme hata aldığında boş başarı diye gösterilmez; işlem HTTP hatasını başarı bildirimi saymaz. Admin engellenenlerin nedenlerini önizlemede görebilir.
- Kapsam bu pilot API'sidir. Kaynak hakkı, gerçek insan medya kontrolü, uzman bağımsızlığı ve ampirik kalibrasyon ayrıca kanıtlanmalıdır. Diğer ACTIVE/LIVE yollarının ortak yayın kapısına birleştirilmesi ve büyük bankalarda partileme/yük incelemesi açık kalır. Yeni migration gerekmez.

Dağıtım kaydı: önceki teslimin migration 010 dosyası, önceki commit/push/migration isteği üzerine yapılandırılmış Supabase hedefinde uygulandı ve doğrulandı. QG-015 geliştirme/test işlemleri yalnızca izole localhost veritabanını kullanır; canlı soru bankasına aktarım yapılmaz.

14 Ekim yerel doğrulama: **2314 genel test geçti**, 68 test atlandı ve 2 todo kaldı; **39/39 gerçek HTTP/PostgreSQL senaryosu** ve **55 odaklı pilot/inceleme/kanıt/arayüz testi** geçti. Yeni HTTP senaryosu önizlemenin yazmamasını, güncel dört onayı olan sorunun kabulünü, legacy/değişmiş/askıdaki/itirazlı/bozuk anahtarlı soruların engellenmesini, eşzamanlı iki aktarımda tek kabulü ve kaynak/parametre metadatasının korunmasını doğrular. Birim testleri batch yazma hatasında rollback'i, tek kişinin dört onayının yetersizliğini, her uzman türünün zorunluluğunu, ele geçirilmiş/emekli/aktif sorunun reddini ve önizleme sonrası değişikliğin yeniden kontrolünü kapsar. Arayüz testleri engel nedenlerini, HTTP hatasının başarı sayılmamasını ve yeniden denemeyi kapsar; bu teslimde yeni gerçek tarayıcı senaryosu çalıştırılmadı. Tip kontrolü, client/SSR/server derlemeleri ve sözdizimi/diff kontrolleri başarılı. Client/SSR çıktıları çalışan denetim sunucusunun dist dosyalarını etkilememek için /tmp altında oluşturuldu. Yeni ve izole localhost veritabanı kullanıldı; harici AI/e-posta ve canlı soru bankası kullanılmadı. Test PostgreSQL'i kapatıldı.

## QG-016 — İngilizce arayüzde Türkçe büyük harf dönüşümü

- Kaynak taramasında İngilizce kelimelere yazılmış hatalı İ bulunmadı; Türkçe içerikler ve İTÜ/Özgün gibi özel adlar korundu. Ana neden: i18n'nin Türkçe tarayıcı/tercih dilini HTML'e aktarması ve İngilizce arayüzün `uppercase` ile i→İ dönüşümünü miras almasıydı.
- İngilizce uygulama gövdesine, ortak sınav chrome'una ve soru içeriğine `lang=en` eklendi. Türkçe Özgün ekranı/raporu ve Türkçe SEO metinleri `lang=tr`; çevrilen analytics etiketi seçili dil ile işaretlenir. Özgün içindeki İngilizce soru, seçenek, bölüm ve Recording etiketleri kendi dilinde kalır. Dil seçimi, çeviri kaynakları, RTL ve kaynak metinler değiştirilmedi.
- İngilizce adaptif rapordaki “PDF İndir” düğmesi “Download PDF” olarak hizalandı.
- Yeni zorunlu tarayıcı senaryosu Türkçe tarayıcı ayarında 320/1280 px için SIGN IN/LISTENING/WRITING gibi İngilizce dönüşümleri, Türkçede İNGİLİZCE dönüşümünü, dil değişimini ve özel adların korunmasını doğrular. Bu bir transliterasyon veya kullanıcı/soru verisinin topluca değiştirilmesi değildir; migration gerekmez.

14 Ekim doğrulaması: **61 ilgili bileşen testi** geçti; 45 tarayıcı senaryosunun 43'ü ilk koşuda, kalan ikisi ayrı tekrar kontrollerinde geçti. İlk koşu eşzamanlı derleme altında iki zaman aşımı verdi. Fotoğraf sonrası soruyu bekleyen test, üç saniyelik geri sayım + sunucu onayı + geçiş için mevcut kamera testleriyle aynı 20 saniyelik hazırlık sınırına alındı; cevap kurtarma davranışı kontrolü korundu ve son koşu geçti. Yeni iki dil senaryosu ilk ve geniş koşuda başarılıydı. Son tip kontrolü ve üretim client derlemesi başarılı; diff kontrolü temiz. Canlı siteye dağıtım yapılmadı.

## QG-017 — speaking/writing AI puanlama hatalarının giderilmesi

- Gerçek, sentetik kayıtla önceki speaking servisi yaklaşık 59 saniyede geçerli puan döndürdü; kuyruk ise 30 saniyede başarısız sayıyordu. Sağlayıcının 20 saniyelik denemeleri ve üç yeniden denemesi kuyruk sınırından uzun yaşayabiliyordu. Son puanlama kayıtlarında da AI_SERVICE_UNAVAILABLE ve açık devre nedenleri görüldü; eski genel kayıtlar bütün tarihsel hataların kesin nedenini belirlemeye yetmez.
- Tek deneme 45 saniye, en fazla bir yeniden deneme ve en fazla 5 saniyelik yeniden deneme beklemesi için kuyruk sınırı 100 saniyeye hizalandı. Sağlayıcı daha uzun Retry-After isterse erken yeniden çağrı yapılmaz; bu işte yeniden denemeden insan incelemesine geçilir. Düşünme bütçesi 1024, çıktı bütçesi 4096 ile sınırlandı. İki ayrı puanlama geçişi ve uyuşmazlıkta insan incelemesi korunur.
- Gerçek writing çağrısında “Invalid AI score or confidence” ayrıca yeniden üretildi. Puan/güven için 0–1, rubrik için 0–10 aralıkları ve zorunlu boyutlar sağlayıcı yanıt şemasında açık hale getirildi. Geçerli CEFR etiketleri enum ile sınırlandı. Eksik, boş veya kesilmiş yanıt puan kabul edilmez; mevcut sıkı doğrulama korunur.
- Gemini istemcisi modül yüklenirken boş/eski anahtarı yakalamaz; secret yüklemesinden sonra çağrı anında oluşturulur, anahtar değişince yenilenir. Durum kontrolü OpenAI anahtarını bu Gemini puanlayıcısının çalışması için yeterli saymaz; anahtar kontrolünün gerçek sağlayıcı sağlık probu olmadığı belirtilir.
- Hata gövdesi/anahtar/aday metni yerine güvenli failureCode kategorileri; yeni puanlama kayıtlarına `scoringPolicyVersion=2026-10-14.1` eklenir. Başarısızlık ve uyuşmazlıkta kesin puan yine null kalır. Migration gerekmez; tarihsel insan puanları veya başarısız canlı cevaplar bu geliştirmede yeniden yazılmaz.
- `scripts/audits/ai-scoring-smoke.mjs`: yalnızca localhost `all_exams_` veritabanını ve açık `ALLOW_REAL_AI_SCORING_SMOKE=1` seçimini kabul eder. Operatör `B4SKILLS_AI_SMOKE_AUDIO_PATH` ile sentetik bir İngilizce WAV verir; `node --import tsx scripts/audits/ai-scoring-smoke.mjs` iki beceriyi gerçek sağlayıcıdan kalıcı Response kaydına kadar doğrular. Gerçek AI çağrısı yapar; olağan CI koşusuna eklenmedi.

Gerçek sağlayıcı doğrulaması: yeni orchestrator ile writing yaklaşık 6.9 saniyede iki geçişten geçti ve CEFR/discourse uyuşmazlığı nedeniyle incelemeye alındı; speaking yaklaşık 9.2 saniyede transcript ve otomatik puan üretti. Ayrı kuyruk/PostgreSQL koşusunda writing yaklaşık 8.2, speaking yaklaşık 8.8 saniyede ikişer geçiş ve AI puanı kaydetti; o örneklerde inceleme gerektiğinden kesin puan yayımlanmadı. Bunlar sentetik yanıtlarla teknik bütünlük kontrolleridir, bağımsız insan–AI puan uyumu veya psikometrik geçerlik çalışması değildir. Canlı veritabanına yalnızca hataları gruplamak için salt okunur sorgu yapıldı; aday cevabı veya sesi gerçek AI testlerinde kullanılmadı.


Son yerel doğrulama: **2326 genel test**, **62 odaklı AI/kuyruk/devre kesici testi** ve **39/39 gerçek HTTP/PostgreSQL senaryosu** geçti. Genel koşuda 68 atlama ve 2 todo ayrıca kayıtlıdır. Yeni regresyon, 59 saniyede gelen geçerli sonucun eski 30 saniyelik sınır gibi başarısız sayılmadığını doğrular. Son tip kontrolü, sunucu derlemesi ve betik/diff kontrolleri başarılı. İlk genel koşu inceleme ekranının gecikmiş POST testinde, istek başlamadan aşama değiştirildiğini yakaladı; test gerçek bekleyen isteğin kurulmasını bekleyecek şekilde düzeltildi ve genel koşu tekrar geçirildi. Gerçek AI kuyruk testinin ilk kurulum denemelerinde yanlış ItemType ve eksik speaking rubric/zaman fixture alanları doğrulama tarafından reddedildi; geçerli WRITING_PROMPT/SPEAKING_PROMPT ve görev alanlarıyla son koşu geçirildi. UI davranışı değiştirilmediğinden tarayıcı paketi tekrar çalıştırılmadı. Test PostgreSQL'i kapatıldı. Değişiklikler yereldir; canlı dağıtım ve tarihsel başarısız cevapların yeniden işlenmesi yapılmış sayılmaz.

## QG-018 — productive scoring status and task-sensitive review (2026-10-14)

First implementation of the scoring improvement plan:

- Admin full-analysis returns the central evidence-based scoring status, filtered review reason codes and safe failure category; pilot items are explicitly excluded.
- Writing/speaking ratings display lifecycle status instead of binary correctness. Final scores and AI proposals are separate, including genuine zero proposals. Held/stale scores are withheld in the table, drawer and CSV.
- Objective correctness metrics, skill/CEFR correctness charts and correctness filters exclude productive responses, pending ratings and pilot items. Response-time statistics still cover all administered responses.
- Speaking answer JSON is replaced with a recording label and on-demand native audio playback in details. Unsupported/malformed embedded audio displays an unavailable state. Playback accepts only supported embedded audio, not arbitrary remote URLs.
- Discourse/argument heuristics may hold only prompts explicitly requesting argumentative writing. Personal descriptions and notes retain the two-pass AI, confidence, task relevance and integrity gates. Unknown task types keep argument output advisory. This conservative prompt-based gate is an interim measure; it is not a validated task classifier or a replacement for author-reviewed, versioned rubrics.

Validation: 48 focused presentation, orchestrator, queue and DOM regression tests; full suite 2,368 passed (68 skipped, 2 todo); TypeScript and client/server production builds. Scoring policy version: `2026-10-14.2`. No migration, deployment, production regrading or model-provider calls are needed for this phase. Historical review holds require a separately audited regrading decision; changing presentation does not release them.

Next acceptance gates: (1) versioned age/task/level rubrics and applicability metadata, (2) double-blind expert reference ratings with adjudication and learner/prompt-separated holdout, (3) accuracy, repeatability, placement error and subgroup bias evaluation with confidence intervals, (4) empirically calibrated auto-score/review thresholds and model-change regression gates. Numeric publication thresholds are provisional research targets, not measured platform performance.

## QG-019 — task rubric and target CEFR reach the productive graders (2026-10-14)

Found: the provider accepted an optional target CEFR level, but the production background queue did not forward it. Authored task rubrics were also absent from the shared source-aware prompt.

Implemented: canonical CEFR validation without guessed defaults; authored rubric, task type, explicit age group and task length/time guidance in shared grading context. Initial adaptive dispatch, durable restart recovery, admin failure retry, diagnostic and public quick-check grading forward the item target to both AI passes. Admin retry queries now select the target column. Ensemble calls with no target use the ordinary unconditioned scorer rather than assuming B1. Background result metadata records target, task-context version and SHA-256 prompt hash under scoring policy `2026-10-14.3`.

Provider instructions distinguish task target from attained proficiency and the cross-level score scale, do not require arguments from personal notes, assess pronunciation by intelligibility, and forbid invented corrections. Source/rubric passages cannot accidentally activate argument-task heuristics. Author-only context is excluded from candidate prompt-copy checks; student-visible instruction/source copying is still checked.

Boundaries: existing CEFR descriptors and authored criteria are now delivered; they have not thereby become psychometrically validated rubrics. The task-context serializer accepts text/object rubrics up to 8,000 characters, omits invalid/oversized rubric values without truncation, and does not validate descriptor completeness or criterion weights. Author-reviewed applicability metadata, strict rubric admission validation, historical context snapshots and expert-rated calibration remain open. Prompt hashes support traceability, not historical prompt reconstruction. No production regrading or provider calls performed. No migration required.

Validation covers provider requests, both writing passes, queue provenance, target/rubric restart recovery, admin retry, synchronous productive grading, hidden-rubric copy regression and existing integrity gates. Full suite: 2,381 passed, 68 skipped, 2 todo (192 passed files, 6 skipped); 100 focused tests including review-UI timing rerun; final orchestrator rerun passed; server production build passed. Final TypeScript validation is part of the implementation handoff.

## QG-020 — structurally invalid productive rubrics withhold grades (2026-10-14)

Scoring policy `2026-10-14.4` introduces rubric admission before provider calls. Missing/blank, malformed, nonserializable and oversized (8,000 character limit) rubrics are held with stable RUBRIC_* reason codes. Named criteria, descriptor objects and legacy text/list criteria are supported; explicit weights must be finite, nonnegative, complete, matched to criterion names and have a positive total. Positive relative weights need not sum to 1 or 100. Validation is structural; it does not calibrate criterion weights, validate CEFR descriptors or establish expert approval.

Adaptive dispatch, recovery and admin retry carry authored rubric values into the queue. Holds write null final/AI scores and correctness, mark human review required, clear obsolete AI rating details and refresh the report without marking the provider unavailable. They do not invoke the model, retry as operational failures, overwrite human grades or count as zero ability evidence. Synchronous diagnostic/public productive grading likewise returns review_required with rubric reason codes. Diagnostic response metadata preserves these codes; admin details render understandable explanations. Shared prompt construction uses the same validator instead of a divergent serialization rule. Synthetic smoke fixtures supply a valid rubric.

Deployment behavior: productive items without structurally valid rubrics will require content/human review before automatic grading; historical grades are not automatically regraded. No database writes or external AI calls were made during implementation verification, and no migration is required. Existing historical rubric metadata is not expert-certified by this change. Catalogue-wide rubric repair, explicit author approval/version binding and the expert-reference evaluation set remain subsequent gates.

Verification: full suite 2,411 passed (68 skipped, 2 todo; 193 passed files, 6 skipped); focused queue/public/admin/rubric tests 73 passed before the additional named-weight regression; server production build passed. Final TypeScript verification is recorded in the handoff. These are software correctness checks, not measured agreement with expert raters.

## QG-021 — real rubric inventory and detailed criterion resolution (2026-10-14)

Read-only RepeatableRead audit of the configured database scanned 2,998 ACTIVE/PRETEST items and identified 574 productive tasks. All 574 passed structural admission; this is not expert validation. The initially inspected `rubric` field contained 568 text rubrics and 6 criterion lists. Expanded inventory found that all 574 also have `scoringRubric`: resolving that authored field yields 316 structured rubrics and 258 text rubrics. The previous scorer ignored these detailed criteria. Fifty-eight generic author notes contain the exact phrase “Assess near-native mastery”; flagged for editorial review.

Implemented a shared resolver used by prompt construction, synchronous grading, initial queue dispatch, recovery and retry. Explicit `scoringRubric` criteria take priority over general `rubric` notes; arrays are wrapped as criteria without changing descriptors, weights or maxScore. Malformed detailed criteria cannot silently fall back to a generic note. Authored maxScore must be positive and finite; explicit wordRange guidance is delivered. Generic author notes remain secondary context. Provider instructions require criterion-scale translation to the existing 0–10 response schema and explicitly reject native/near-native likeness as a C2 requirement. This corrects runtime instructions; existing item text remains unchanged and the editorial findings are still open.

Source for C2 interpretation: Council of Europe, CEFR, section 3.6, https://book.coe.int/en/attachment?id_attachment=1870 (C2 characterises precision, appropriateness and ease, not native-speaker competence). This change is not empirical calibration or evidence of improved expert-score agreement.

New repeatable command: `node --import tsx scripts/audit-productive-rubrics.ts` (`--strict` exits 2 for structural holds; editorial findings remain advisory). Transaction explicitly READ ONLY. Private reports under ignored `reports/item-evidence/` contain item references, shapes and issue codes, with no candidate data or answer keys. No production writes, model calls or migrations. Summary from the canonical-resolver audit: structural holds 0; text-only rubrics 258; native-likeness editorial flags 58. Snapshot is audit-time inventory, not a permanent release approval.

Versions: scoring `2026-10-14.5`, task context and rubric validation `2026-10-14.2`. Verification: full suite 2,416 passed (68 skipped, 2 todo); production server build passed. Final version checks and TypeScript recorded in handoff. Next: expert review of the 258 text rubrics and native-likeness notes, then independent reference scoring. Do not manufacture task-specific criteria or expert approval automatically.

## QG-022 — independent offline expert-reference evaluation (2026-10-14)

Added a strict, content-free reference dataset schema and an offline evaluator/CLI. Records require pseudonymous learner/prompt IDs, a rubric version, two distinct expert ratings, declared independent/AI-blind qualification protocol, model/policy versions, and ordered scoring repeats. Expert band disagreement or score delta above 0.15 requires a distinct third adjudicator. Development/holdout overlap by learner or prompt, duplicate responses/runs, out-of-range grades, numeric outage placeholders and raw candidate-content fields are rejected.

Metrics use the first predeclared auto-scored holdout run rather than cherry-picking repeats. Report includes MAE/RMSE/signed bias, explicitly rated ordinal-band QWK, original human band agreement, direction/severity of placement errors and boundary errors under declared provisional research cutoffs, and deterministic learner-cluster 95% MAE bootstrap intervals. Constant-band kappa is null. Review/unavailable outcomes stay in coverage denominators, not error metrics. Repeatability requires at least five complete auto-scored repeats and reports within-0.05 range rate. Skill/band coverage and subgroup suppression use distinct learners, not task counts. Provisional coverage target is 30 learners per skill/band; this does not establish validity. Reports never authorize release (`releaseApproved:false`).

Command and collection contract: `docs/quality/reference-scoring-contract.md`. CLI makes no database or provider calls and writes a new private output file with 0600 permissions. Existing monitor comments now identify numerical thresholds as provisional internal targets, not Cambridge/ETS standards; legacy drift-monitor APIs were not replaced by this offline evaluator.

Verification: general suite 2,431 passed (68 skipped, 2 todo; 194 passed files), server build passed, synthetic two-record CLI smoke produced a report with releaseApproved false. Final focused regression also covers inclusive floating-point boundary/adjudication thresholds. No real expert corpus was supplied or manufactured, no production scores changed, no migration required. Qualification/blinding are declared inputs, not independently verified; leakage checks cannot detect mislabeled prompt families; learner-only bootstrap does not quantify unseen-prompt uncertainty; subgroup statistics are descriptive. Independent corpus collection and psychometric review remain required before any accuracy or release-validity claim.

## QG-023 — paired model/policy regression comparison (2026-10-14)

Added offline baseline/candidate comparison on frozen reference evidence. Both datasets must independently pass the reference schema/holdout checks and have identical reference membership, labels, adjudication, learner/prompt IDs, rubric versions, partitions, subgroup labels, cutoff configuration and dataset ID. Model or policy identifier must differ. Reference order and expert-entry order do not affect pairing. Changed reference evidence is rejected rather than compared as if it were the same benchmark.

Paired MAE differences use first predeclared runs and learner-cluster bootstrap intervals, with separate writing/speaking checks and absolute candidate MAE/QWK limits. Severe ordinal-band mistakes, global auto coverage, previously-auto cases lost even when gains offset net coverage, and per-skill repeatability are guarded. Missing level coverage, insufficient paired learners, unresolved intervals, undefined kappa and incomplete repetitions generate explicit evidence gaps. Numerical limits are a frozen, versioned provisional research policy, not external assessment standards. Status is observed_regression, insufficient_evidence or within_provisional_limits; releaseApproved is always false. Reference-evaluation bootstrap now shares one tested implementation; evaluation version incremented to 2026-10-14.2.

Command: `node --import tsx scripts/evaluation/compare-scoring-models.ts baseline.json candidate.json output.json [--check]`. Creates a new 0600 file; no database/model calls or deployment action. Check mode returns 2 for observed regressions or insufficient evidence, 1 for invalid/mismatched input or output errors, and 0 within provisional limits. Exit 0 is not release authorization. Collection/comparison contract is documented in reference-scoring-contract.md.

Verification: 31 focused comparison/reference regressions passed, including complete synthetic 420-response coverage, reference tampering, sparse data, hidden skill deterioration, canceled net coverage losses, repeatability and deterministic paired intervals. Synthetic two-case CLI smoke correctly returned insufficient_evidence, releaseApproved false and exit 2 under --check. Production server build passed. General suite: 2,447 passed (68 skipped, 2 todo; 195 passed files, 6 skipped). Final TypeScript result is recorded in handoff. No real expert-score comparison was claimed, no live scores changed, no migration required. Subgroup fairness, genuinely blinded/qualified reference collection and independent release review remain open.

## QG-024 — scheduled anchor calibration cannot pass unresolved evidence (2026-10-14)

Found: the legacy live anchor path included held/rejected scores, used transcript scoring for missing audio, reported zero error on absent measurements, ignored advertised correlation/per-skill limits, accepted invalid concurrency (including a zero-step loop), and the runner returned success for an empty corpus.

Implemented pre-provider anchor admission (target, rubric, finite expert score, declared consensus metadata, recording format), duplicate-ID exclusion, exact finalized ai_auto eligibility, source-aware/rubric/target prompt forwarding, no speaking-text fallback, bounded integer concurrency 1–8, and per-skill metrics/gates. A constant/undersized corpus cannot pass; undefined measurements are null. Minimum 30 anchors per skill, MAE <= 0.08, RMSE <= 0.12 and Pearson >= 0.85 are provisional internal drift targets. Results record safe exclusion codes, evidence gaps, model/policy provenance and releaseApproved false; runtime exceptions do not store provider payloads. Only finalized genuine zero grades count as zero.

Runner independently checks counts, numerical validity and per-skill values; missing evidence/empty corpus exits 2, observed drift or operational failure exits 1, diagnostic success exits 0. Existing scheduled-workflow comments now describe this behavior without claiming release approval. Missing legacy anchor metadata requires corpus repair, not fabricated labels. validateModelVersion remains a diagnostic compatibility API and explicitly returns releaseApproved false.

Verification: 2,480 full-suite tests passed (68 skipped, 2 todo; 196 passed files); production server build passed. Regression tests cover held sources, audio absence, expert/rubric admission, duplicate IDs, concurrency, genuine zeros, constant/sparse corpora, a varied 60-anchor synthetic corpus and a speaking regression hidden by pooled MAE. Final TypeScript validation recorded in handoff. Provider and database are mocked; no live calibration, student regrading, database writes or migration performed.

Limits: declared rater count/QWK does not prove blinded/qualified raters; audio admission verifies format, not decoded sound; 30 anchors is not 30 independent learners or validated CEFR coverage. Legacy shared SystemConfig read/merge persistence is unchanged and needs a separate concurrency/persistence audit. Independent holdout comparison and assessment release review remain required.
