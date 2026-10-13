# B4Skills sınav kalite matrisi

Güncelleme: 13 Ekim 2026. Sorumlular aşağıda rol olarak atanmıştır; insan ataması henüz yapılmamıştır.

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
