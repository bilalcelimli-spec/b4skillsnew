# Yurt dışı aktarım ekleri ve sağlayıcı dosyası

4 Kasım 2026 · Taslak. Aşağıdaki metinler resmî standart sözleşmenin yerine geçen yeni hükümler değildir; izin verilen taraf/seçim/ek alanlarına aktarılacak çalışma bilgileridir. Karşı taraf kabulü, yetki belgeleri, imzalar ve bildirim henüz tamamlanmamıştır.

## A. Doğru rol ve modül

- B4Skills'in kendi belirlediği hesap/hizmet işlemleri için yurt dışındaki işleyene aktarımı: gerçek roller bu şekildeyse **SS-2** (veri sorumlusu → veri işleyen).
- Kurumun belirlediği sınav için B4Skills'in veri işleyen sıfatıyla yabancı alt işleyene aktarımı: kurumun belgelenmiş talimatı/yetkilendirmesi ve gerçek roller uygunsa **SS-3** (veri işleyen → veri işleyen).
- Sağlayıcının kendi bağımsız amaçları için aldığı hesap/faturalama/uygun kullanım verileri bu sınıflamaya otomatik eklenmez. Ayrı veri sorumlusu rolü varsa ilgili akışın dayanağı ve gerekirse SS-1/SS-4 ayrıca değerlendirilir.
- Bir sözleşme bütün sağlayıcıları ve bütün rolleri kendiliğinden kapsamaz. Her alıcı tüzel kişi ve işleme zinciri eşleştirilir.

[Resmî modüller](https://www.kvkk.gov.tr/Icerik/7929/Standart-Sozlesmeler). Seçime bırakılmayan standart maddeler değiştirilmez. İmzaya gidecek nüshada kaynak formun bütün maddeleri ve tamamlanmış ekler bulunur.

## B. Veri aktaran taraf bilgileri

Ad/unvan: **Bilal Çelimli (B4Skills)**.

Adres: **Esentepe Mah. Tuna Cad. Güral İş Merkezi No: 110-112 İç Kapı No: 11, Nilüfer / Bursa, Türkiye**.

İrtibat: **Bilal Çelimli, hizmet sağlayıcı; hello@b4skills.com; +90 546 541 14 17**.

İmzalayan: **Bilal Çelimli** veya yetkisi ayrıca belgelenecek temsilci. İmza ve tarih: **[İMZALANMADI]**.

SS-3 kapsamında veri sorumlusu kurum: **[KURUM UNVANI, ADRESİ, İRTİBATI, TALİMAT/YETKİLENDİRME REFERANSI]**. Henüz bir kurum adına bu yetkilendirmenin bulunduğu varsayılmaz.

Veri alıcısı taraf bilgileri: aşağıdaki sağlayıcı satırından, hesaba uygulanan sözleşme/fatura ve karşı taraf teyidiyle alınır. Adres, imzacı ve yetki dayanağı bilinmeyen alanlar tahmin edilmez.

## C. Ek I için aktarım kapsamları

| Alıcı / hizmet | Veri kategorileri ve kişiler | Amaç, nitelik, sıklık | Süre ve açık kanıt |
| --- | --- | --- | --- |
| OpenAI API; resmî DPA'da Türkiye'deki müşteri için belirtilen taraf OpenAI OpCo, LLC; gerçek hesap sözleşmesiyle teyit edilecek | Yetişkin veya izinli çocuk adayın yazılı yanıtı, ses kaydı, görev/rubrik ve üretilen değerlendirme; yanıta gömülü kişisel bilgi olabilir. Ad/e-posta ayrı alan olarak gönderilmez. | İngilizce yazma/konuşma değerlendirmesi ve transkripsiyon; istek bazlı analiz, hizmet kullanıldıkça tekrarlanan aktarım. Reklam/eğitim talimatı yok. | ZDR kullanıcı tarafından teyitli. Üretim proje kimliği, kullanılan uçlar, istisnalar ve işleme bölgesi hesap kaydıyla eşleştirilecek. `store:false` ayrıca gönderilir. |
| Render; sözleşme tarafı/adresi karşı taraftan teyit edilecek | Uygulama istekleri, hesap/oturum bilgileri, yanıt ve sesin işlenme sırasında bellekteki kopyası, günlükler | Uygulamanın barındırılması, erişim ve güvenlik; sürekli hizmet | Frankfurt hizmet bölgesi önceki işletim incelemesinde görüldü; güncel hesap ayarı, günlük saklama ve destek/alt işleyen bölgeleri teyit edilecek. |
| Supabase; resmî DPA'da Supabase Pte. Ltd; hesap tarafıyla eşleştirilecek | Hesap/veli kayıtları, yanıt, sonuç, puan, kurum ve gözetim verileri; yapılandırılmışsa özel dosya depolaması | Veritabanı ve depolama, yedekleme, kurtarma; sürekli hizmet | Yerel bağlantı Avrupa merkezi bölgesini gösteriyor; üretim proje/bölge, depolama sağlayıcısı ve yedek ömrü ayrıca teyit edilecek. Bölge tek başına erişimin yalnız o ülkede olduğunu kanıtlamaz. |
| Resend / Plus Five Five, Inc.; hesap sözleşmesiyle teyit edilecek | Veli/adaya ait teslim adresi, işlemsel e-posta içeriği ve tek kullanımlık bağlantı; teslim bilgileri | Doğrulama, parola ve veli bildirim e-postaları; olay bazlı, tekrarlanan aktarım | Kullanılan e-posta saklama süresi, izleme ayarları ve alt işleyenler hesap üzerinden kayıt altına alınacak. Açılma/tıklama takibi gerekli değildir; kapalı tutulmalı. |
| Sentry; yalnız üretimde etkinse, taraf/bölge teyit edilecek | Azaltılmış teknik hata/işlem bilgileri; kimlik ve istek içeriği ayıklanmalı | Hata tespiti ve güvenlik; olay bazlı aktarım | Veli uçlarının hata gönderimi engelleniyor. Genel günlükler, örnek olaylar, saklama ayarı ve veri silme yolu ayrıca incelenecek; gereksiz aday yanıtı/ses/bağlantı tokeni gönderilmez. |
| AWS S3; yalnız gerçekten etkin veya eski aday dosyası bulunuyorsa | Özel kamera/kimlik fotoğrafları ve açıkça envantere alınmış eski yanıt dosyaları | Özel depolama ve silme; işlem bazlı/sürekli | Etkin sağlayıcı/bucket/bölge, sürümlendirme, yedek ve lifecycle kayıtları teyit edilecek. Supabase kullanılıyor diye eski S3 kopyaları yok sayılmaz. |

**İşlemenin dayanağı:** Hesap/hizmetin ifası, kurum talimatıyla değerlendirme ve güvenlik işlemleri için uygulanabilir KVKK m.5 şartı, işlem bazında envanterde gösterilir. Çocuk, isteğe bağlı kamera ve üçüncü taraf AI paylaşımında gerekli bilgilendirme/izin ayrıca kaydedilir. Bu çalışma bütün işlemlerin aynı hukuki sebebe dayandığını kabul etmez. Düzenli aktarım, arızi aktarım istisnasına dayandırılmaz.

**Özel nitelikli veri:** Böyle veri istenmez; serbest yanıtta tesadüfen yer alması olasılığı vardır. Erişim azaltma, gereksiz içeriği silme ve ayrı işleme şartını değerlendirme uygulanır. Fotoğraf/ses üzerinde biyometrik kimliklendirme bu kapsamda yetkilendirilmez.

**Sonraki aktarımlar:** Sağlayıcının tarihli alt işleyen listesi, hizmet/bölge ayrımı ve değişiklik bildirim yolu dosyaya eklenir. Bir bağlantı vermek karşı tarafın üstlendiği resmî ekin doldurulmasının yerine geçmez.

## D. Ek II için teknik ve idari tedbirler

| Tedbir | B4Skills tarafındaki uygulama / sınır | Sağlayıcıdan istenecek kanıt |
| --- | --- | --- |
| Erişim | Kurum/rol kontrolü, kimlik doğrulama, özel dosya uçları; hesap silmede oturum erişimi kapanır | Destek erişimi, MFA, yetki gözden geçirme ve erişim günlükleri |
| Veri azaltma | AI isteğine ad/e-posta ayrı alanı konulmaz; veli için kimlik kopyası toplanmaz | İşlenen alanlar ve hizmet telemetrisi; bağımsız amaçlar |
| Gizlilik | HTTPS; sunucu anahtarları istemciye verilmez; özel depolama | Disk/yedek şifreleme, anahtar yönetimi ve veri bölgeleri |
| Saklama/silme | Sürümlü süreler, kalıcı dosya silme kuyruğu, silme kaydı; test sonucu üretim kanıtından ayrı | Silme API/iş akışı, yedek ömrü, S3 eski sürümler, hukuki istisnalar |
| Çocuklar | Yaş grubu, veli onayı, kurum yetki doğrulaması; sağlayıcı hazırlığı tamamlanana kadar kapalı | Kullanım koşullarındaki yaş sınırları, ZDR proje/uç kapsamı |
| Olay/hak talebi | hello@b4skills.com; kayıt, kapsam kontrolü ve yetkili kişi incelemesi | Olay bildirim irtibatı, işlem süresi ve veri sahibi başvurusu desteği |

Bu tedbirler bağımsız sertifikasyon iddiası değildir. Kodda hazır olan ama üretimde kurulmamış tedbir, imzalı ekte "etkin" olarak gösterilmez.

## E. Ek III ve sözleşme seçenekleri

Alt işleyen yetkilendirmesi, değişiklik ön bildirimi, bildirim yükümlüsünün seçimi ve ek süre alanları gerçek hizmet sözleşmesiyle eşleştirilecek. Önerilen operasyonel bildirim sorumlusu Bilal Çelimli'dir; karşı taraf ve gerekiyorsa veri sorumlusu kurum bunu onaylamalıdır. Sağlayıcının standart koşullarından farklı süreler kabul edilmiş sayılmaz.

Her alıcı için imza dosyası:

- Hesap/abonelik kimliği ve doğru sözleşme tarafı; imzacı yetki belgesi.
- Türkçe resmî form, seçilen modül ve tüm doldurulmuş ekler.
- Veri sorumlusu kurumun SS-3 için talimat/yetkilendirmesi.
- Gerekli tercüme ve resmî belge teyitleri; özel arşivde saklama.
- Tarafların imza tarihleri; son imza tarihi ve beş iş günlük bildirim son günü.
- Kuruma bildirim kanalı, bildirim numarası/alındı ve değişiklik takip kaydı.

Bildirim kaydı: son imza **[YOK]**; son gün **[HENÜZ HESAPLANAMAZ]**; bildirim/alındı **[YAPILMADI]**. [Resmî bildirim modülü](https://standartsozlesme.kvkk.gov.tr/).

## F. Sağlayıcıya iletilebilecek belge talebi

Aşağıdaki metin hazırlanmıştır; gönderilmemiştir. Sağlayıcının hesabımıza ait resmî destek veya hukuk kanalı üzerinden kullanılmalıdır.

> We operate B4Skills, an English assessment service based in Türkiye, including institution-authorized assessments for minors. Please confirm the contracting entity, applicable DPA version, processing/support locations, current subprocessors, service-specific retention and backup deletion process for our account. We are preparing Türkiye KVKK cross-border transfer documentation. Please confirm whether you can execute the unchanged official Turkish standard contract with completed annexes for our actual controller/processor roles, and provide your authorized signatory details and authority documentation. For OpenAI, please also confirm the exact production project and text/audio endpoints covered by our approved Zero Data Retention configuration. No candidate records or credentials are attached to this request.

Resend, ülkeye özgü sözleşme değişiklikleri için Enterprise planını şart koşabildiğini açıklıyor. Sentry'nin ülkeye özgü maddeler yaklaşımı da ayrıca incelenmeli. Bir sağlayıcının SS imzalayacağını varsaymayın; kabul edilmezse uygun başka mekanizma veya veri/sağlayıcı mimarisi değişikliği ayrıca değerlendirilmeden aktarımı açmayın.
