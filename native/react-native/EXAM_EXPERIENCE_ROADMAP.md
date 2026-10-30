# B4Skills iPad ve macOS sınav deneyimi yol haritası

Hedef, adayın cihazla uğraşmadan dil becerisini gösterebildiği, her soru türünü doğru sunan ve bağlantı hatasında yanıt kaybetmeyen bir sınav uygulamasıdır. Görsel kalite, erişilebilirlik, ölçme geçerliği ve işlem güvenilirliği birlikte geliştirilecektir. İlk öncelik soru ve sınav politikalarının backend ile ortak bir sözleşmeye bağlanmasıdır.

Bu plan iPad ve macOS içindir. Mevcut marka logosu, mürdüm `#9B276C`, koyu lacivert `#0F172A` ve sarı `#FDE047` korunur. Sarı renk vurgu için kullanılır; uzun metin ve ana yanıt alanları yüksek kontrastlı, sakin yüzeylerde kalır.

## Mevcut kapsam

Uygulama çoktan seçmeli, tek/çok boşluk doldurma, yazma ve konuşma sorularını gösteriyor. Dinlemede medya zorunlu; dinleme transkripti adaydan gizleniyor. Sürükle bırak ve entegre görevler henüz desteklenmiyor. Sonuçlar backend’in geçici puanlarını gösteriyor.

Web özellikleri, gözetmenlik ve Apple güvenli değerlendirme modu için ayrıntılı kapsam: [Web özelliklerini tamamlama planı](WEB_FEATURE_PARITY_ROADMAP.md).

Soru türü düzeyinde etkileşim tasarımı, `TaskSpec` sözleşmesi, kabul ölçütleri ve aşamalı plan: [Sınav arayüzü mükemmellik planı](EXAM_UI_EXCELLENCE_PLAN.md).

Sınav kataloğu dokuz profil içeriyor: Primary (7–10), Junior Suite (11–14), Rapid Diagnostic, Express Assessment, General English, Academia, Corporate, Language Schools ve Specialized / Integrated Skills. `15-Min Diagnostic` ve `Express Assessment (30-Min)` teknik anahtarları ekrandaki süre sözü olarak kullanılmamalı; görünür ad ve süre backend profilinden gelmeli. Özgün Kids sabit formu ayrı bir akış ve endpoint kullanıyor; mevcut native uygulama bu kodu tüketmeden web’e yönlendiriyor.

## Tasarım ve ölçme ilkeleri

Aday her an hangi bölümde olduğunu, ne yapması gerektiğini, yanıtının kaydedilip kaydedilmediğini ve bir sonraki eylemi anlamalıdır. Her soruda tek belirgin ana eylem bulunur. Soru açılırken odak başlığa, hatada hata açıklamasına taşınır; yanıt gönderimi açıkça duyurulur. Gerçek sunucu onayı gelmeden “kaydedildi” yazılmaz.

Uyarlanabilir sınavda geri dönme, soru atlama, yanıt değiştirme ve bölüm gezinmesi yalnızca sunucu politikasının izin verdiği ölçüde açılır. Adaya kesin olmayan soru sayısından kesin tamamlanma yüzdesi üretilmez. Süre sınırı, ek süre, ara verme ve devam kuralları sunucudan gelir; cihaz saati karar vermez. Sabit formda ise izin verilen soru haritası, işaretleme, gözden geçirme ve bölüm teslimi sunulur.

Erişilebilirlik için WCAG 2.2 AA hedefleri native yazılıma WCAG2ICT rehberiyle uygulanır; bu rehber tek başına sertifika değildir. Sürükleme için dokunarak seçme ve yerleştirme alternatifi, görünür klavye odağı ve tutarlı yardım sağlanır. iPad’de en az 44×44 pt etkileşim alanı ürün hedefidir; bu değer WCAG’nin CSS piksel eşiğiyle aynı ölçü değildir. [W3C WCAG2ICT](https://www.w3.org/WAI/standards-guidelines/wcag/non-web-ict/), [W3C yeni etkileşim ölçütleri](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), [Apple düğme rehberi](https://developer.apple.com/design/human-interface-guidelines/buttons)

CEFR beceri tanımlayıcıları görev tasarımı ve rapor dili için temel alınır. CEFR etiketi tek başına sınavın kalibre, eşdeğer veya geçerli olduğunu kanıtlamaz. Dinleme transkripti, sözcük açıklaması, yazım yardımı ve kayıt tekrar hakkı gibi destekler ölçülen beceriyi değiştirebilir; sınav politikasına ve onaylı uyarlamalara göre açılır. [Avrupa Konseyi CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions)

## Soru türlerine göre hedef deneyim

| Tür | Aday deneyimi | Teslim ve kabul ölçütü |
| --- | --- | --- |
| Çoktan seçmeli | Tüm satırı seçilebilen seçenekler; harf, metin ve seçim işareti; klavyede yön tuşları ve Space; uzun seçenekler kesilmez | Backend’in karıştırılmış sırası korunur. Gönderilen indeks görüntülenen seçenekle eşleşir; seçim yalnız renkle anlatılmaz. |
| Okuma | Geniş pencerede metin ve soru yan yana; dar pencerede düzenli tek sütun; bağımsız kaydırma, okunabilir satır uzunluğu | Pencere boyutu ve yön değişiminde yanıt ve okuma konumu korunur. Vurgu/not araçları yalnız politika izin verirse açılır. |
| Dinleme | Yükleniyor, oynuyor, durdu ve hata durumları; anlaşılır hak sayacı; cihaz kontrolü | Ses başlamadan hak azalmaz. Teknik hata hakkı tüketmez. Transcript ve cevap anahtarı görünmez. Tekrar hakkı ve durdurma kuralı sunucudan gelir. |
| Boşluk doldurma | Metin içinde numaralı alanlar; klavyede sıralı odak; cevap bankası varsa dokunarak seçim | Tek ve çok boşluk, boş yanıt, Türkçe klavye ve Unicode için örnekler; yanıt dizisinin/sözlüğünün backend puanlayıcısıyla sözleşme testi. |
| Eşleştirme ve sıralama | Sürükleme yanında seç ve yerleştir, yukarı/aşağı taşı; ekran okuyucuya yeni konum duyurusu | `matching.mapping`, `ordering.order`, `placement.placements` ayrı şemalarla kodlanır. Eksik ve yinelenen eşleşme kuralları görevden gelir. |
| Yazma | Görev, kaynak ve editör; yerinde sözcük sayısı; saklanan taslak; klavyenin kapatmadığı teslim düğmesi | Alt/üst sözcük sınırının uyarı mı engel mi olduğu politikada tanımlanır. Otomatik düzeltme, yapıştırma ve yardım araçları sınav moduna bağlıdır. |
| Konuşma | Mikrofon kontrolü; hazırlık ve cevap süreleri; kayıt, bitirme, önizleme ve yeniden kayıt politikası; ses seviyesi | İzin reddi, cihaz değişimi, kesinti ve süre sonu yönetilir. Kaydın sunucuda saklandığı doğrulanmadan dosya silinmez; sessizlik kontrolü adayı açıklamayla yönlendirir. |
| Entegre görev | Oku/dinle/hazırlan/yanıtla aşamaları; gerektiğinde kaynak paneli; yazılı ve sözlü yanıt türleri ayrı | Aşama geçişleri, kaynağa geri erişim ve süreler sunucudan gelir. Aynı kaynakla birden çok yanıt ilişkilendirilir; kısmi teslimin durumu açıklanır. |

İçerik taşıma için QTI 3’ün etkileşim ve erişilebilirlik yaklaşımı referans alınır. İlk aşama, backend ile uyumlu sürümlü bir görev şemasıdır; tam QTI içe/dışa aktarımı daha sonraki bir ürün kararıdır. [1EdTech QTI uygulama rehberi](https://www.imsglobal.org/spec/qti/v3p0/impl)

## Sınav profillerine göre davranış

| Profil | Ekran ve içerik uyarlaması | Korunacak sınav kuralı |
| --- | --- | --- |
| Primary ve Junior Suite | Yaşa uygun kısa yönergeler, örnek görev, büyük hedefler, sade bölüm geçişleri; sınav içinde ödül ve dikkat dağıtan animasyon yok | Yardım çocuğun ölçülen becerisine ipucu vermez; yaş grupları ayrı kullanılabilirlik pilotuna girer. |
| Rapid Diagnostic ve Express | Kısa hazırlık, açık kapsam ve süre aralığı, az geçiş | Kısa taramanın kapsamı ve geçici sonuçları tam yeterlik değerlendirmesi gibi sunulmaz. |
| General English ve Language Schools | Dengeli beceri bölümleri ve kurumun belirlediği sıra; kuruma uygun hazırlık | Uyarlanabilir seçim ve durma kararları sunucuda kalır; aynı oturum kimliğiyle devam edilir. |
| Academia | Uzun metin, akademik yazma ve kaynaklı görevler; rahat kaynak/editör düzeni | Kaynak erişimi, not alma ve rubrik sınav tanımına bağlıdır. |
| Corporate | İş iletişimi senaryoları, görev amacı ve beklenen yanıt biçimi | Marka veya meslek bağlamı dil puanına ilgisiz avantaj sağlamamalı; içerik uzmanı incelemesi gerekir. |
| Specialized / Integrated Skills | Aşamalı görev oynatıcısı ve kaynak yönetimi | Çoklu beceri kanıtları birlikte tutulur; her parça ayrı teslim durumuna sahiptir. |
| Özgün Kids sabit form | Soru haritası, izinli gezinme, bölüm teslimi ve cevap özeti | Mevcut fixed-form servisine bağlanır; adaptive `/next` akışına zorlanmaz. Yayına kadar web yönlendirmesi sürer. |

## Uygulama mimarisi

`ExamShell`, bölüm başlığı, bağlantı durumu, politika açıklaması ve teslim alanını yönetir. `ItemRenderer` görev şemasına göre uygun bileşeni seçer. `ResponseCodec` görünür yanıtı backend’in beklediği değere dönüştürür. `ExamPolicy` gezinme, araçlar, süre, kayıt ve medya izinlerini sunucunun yetenek sözleşmesinden okur. Desteklenmeyen görev, sınav başlamadan tespit edilir; aday sınavın ortasında çıkmaz sokağa girmez.

`DraftStore` taslakları oturum ve soru kimliğiyle cihazda korur. Metin ve ses için saklama süresi, şifreleme, çıkışta temizleme ve sunucu onayından sonra silme kuralları tanımlanır. Ağ hatasındaki bir POST körlemesine tekrarlanmaz; işlem kimliği ve sunucu makbuzuyla uzlaştırılır. Sınavın çevrimdışı devamı yalnız sunucu süre ve güvenlik politikasının açıkça izin verdiği kapsamda desteklenir.

Mac düzeni gerçek pencere `onLayout` ölçüsüne göre hesaplanır; ekran genişliği pencere genişliği kabul edilmez. iPad Split View, Stage Manager, dikey/yatay yön, donanım klavyesi ve ekran klavyesi ayrı test edilir. VoiceOver, Tam Klavye Erişimi, büyütülmüş metin ve azaltılmış hareket aynı aday yolculuğunda doğrulanır. [Apple erişilebilirlik rehberi](https://developer.apple.com/design/human-interface-guidelines/accessibility)

## Teslim aşamaları ve çıkış koşulları

Süreler bir React Native geliştirici, bir backend geliştirici, bir QA ve kısmi tasarım/ölçme uzmanı katkısı varsayımıyla tahmindir. Her aşama, öncekinin çıkış koşulu sağlanınca ilerler.

| Aşama | Tahmini süre | Teslim | Çıkış koşulu |
| --- | --- | --- | --- |
| Güvenilirlik temeli | 1 hafta | Başlatma ve teslim makbuzları, kurtarma durumları, taslak koruma, medya hata yönetimi, hata senaryosu testleri | Tekrar ve eşzamanlı istekte tek kredi; kayıp yanıtta çift kayıt yok; süre sonunda sonuçlara erişim; her iki platformda aynı davranış. |
| Sözleşme ve erişilebilir sınav kabuğu | 2 hafta | Sürümlü görev/politika şeması, yetenek kontrolü, pencereye uyum, klavye/VoiceOver düzeni, sunucu süre göstergesi | Desteklenmeyen göreve sınav öncesi açıklama; büyük metinde ana eylem erişilebilir; ekran okuyucuyla girişten sonuca bağımsız tamamlama. |
| Soru türlerinin tamamlanması | 3 hafta | Boşluk, eşleştirme, sıralama, yerleştirme ve entegre görevler; geliştirilmiş yazma/konuşma | Her enum ve her yanıt kodlaması için golden fixture ve backend sözleşme testi; dokunma, fare ve klavye ile eşdeğer tamamlama. |
| Profil uyarlamaları ve pilot | 2 hafta | Çocuk/yetişkin profilleri, sabit form, onaylı erişilebilirlik uyarlamaları, açıklayıcı sonuçlar | Her profil için iPad ve Mac tam sınav; hedef yaş gruplarıyla pilot; kritik açık yok; ölçme uzmanının görev ve rapor onayı. |

## Yayın öncesi doğrulama

Test matrisi altı soru enumunu, altı beceriyi, dokuz uyarlanabilir profili ve sabit formu kapsar. Her kombinasyonun sunulabilirliği açıkça belirtilir; anlamsız kombinasyonlar test sayısını büyütmek için üretilmez. API, durum makinesi, bileşen, native ses köprüsü ve gerçek cihaz testleri farklı katmanlarda tutulur.

Hata senaryoları: sunucuda kayıt sonrası yanıt kaybı; kayıt öncesi ağ kaybı; son kredide eşzamanlı başlatma; uygulama yeniden açılışı; erişim belirteci süresi; sınav süresi bitişi; ses 404/timeout/kesinti; mikrofon izni reddi; kayıt sırasında arka plana geçiş; pencere daralması; klavye açılması; aynı oturumun ikinci cihazdan ilerletilmesi.

Ürün kabul hedefleri, pilotta ölçülmek üzere: kritik kurtarma testlerinde sıfır taslak kaybı ve sıfır çift kredi, desteklenen görevlerde yardım almadan en az %95 tamamlama, ana eylemlerde en az 44 pt hedef, büyük metinde kesilmeyen içerik ve tekilleştirilmiş hata raporları. Çökmesiz oturum oranı için başlangıç hedefi %99,9’dur; performans ve süre hedefleri düşük kapasiteli desteklenen cihazlarda ölçülüp sürüm kapısına bağlanır. Bunlar mevcut ürünün ölçülmüş sonuçları değildir.

Pilot sonuçları yaş grubu, cihaz, erişilebilirlik ihtiyacı ve sınav profiline göre incelenir. Görsel kalite ve düşük hata oranı, puanların ölçme geçerliğinin yerine geçmez; puan eşdeğerliği, kalibrasyon ve değerlendiriciler arası tutarlılık ayrı kanıt gerektirir.
