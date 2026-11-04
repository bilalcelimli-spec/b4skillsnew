# Saklama ve silme işletim belgesi

4 Kasım 2026 · Politika kimliği `2026-11-04-retention-v1`. Bu belge hazırlanan uygulamayı ve işletim talimatını tarif eder; üretimde etkin olduğunun kanıtı aşağıdaki doğrulama kaydıdır. Hesap silme yetkisi, kurum yöneticisi yetkileri ve kişisel veri hakları birbirinden ayrıdır.

## Süreler ve kapsam

| Kayıt | Süre / başlangıç | Süre sonunda işlem |
| --- | --- | --- |
| Ses ve açıkça envantere alınmış eski yanıt dosyaları | Yanıttan itibaren 30 gün; açık puanlama/insan incelemesi varsa en çok 60 gün | Ses içeren yanıtın içeriği/metaverisi ve inceleme kopyası silinir; dosya kalıcı silme kuyruğuna alınır. Gerekirse alıntı içerebilen rapor ayrıntısı kaldırılır. |
| Kamera/gözetim fotoğrafı | Çekim/kayıt tarihinden itibaren varsayılan 7 gün; geçerli kurum ayarı 1–30 gün | Özel dosya silme kuyruğu; olay yalnız süre sonu işaretini tutar |
| Sınav yanıtları ve sonuçları | Tamamlanma tarihinden iki yıl; tamamlanmamış oturum için oluşturulmadan iki yıl | Oturum, yanıt, rapor, insan puanlama, gözetim ve geri bildirim kayıtları silinir. Bağlı sertifika ve paylaşım erişimi sona erer. |
| Hesap silme talebi | Kimlik/parola ve açık talep doğrulandıktan sonra | Hesap bilgileri, veli verileri ve bağlı değerlendirmeler temizlenir; dosya silme teyidi ayrı izlenir. |
| İmha kayıtları | En az 3 yıl; daha uzun zorunluluk varsa ayrıca kayıt | Yanıt/ses içeriği tutulmaz; işlem kimliği, kapsam, zaman, sonuç ve geri yükleme eşleştirme kimliği sınırlı yetkiyle korunur |
| Yedek, dış sağlayıcı günlükleri ve hukuken gerekli ödeme kayıtları | Sağlayıcı/işlem bazında doğrulanacak ayrı süre | İşletim dışı erişim sınırı, belgelenmiş süre sonu silme ve gerekiyorsa alıcıya silme talebi |

İki yıl, 30/60 gün ve 7/30 gün hizmetin belirlediği sürelerdir; her birinin kanunda aynen zorunlu tutulduğu ileri sürülmez. Hesap kimliğinin başka bir kimlikle değiştirilmesi anonimleştirme diye sunulmaz. Ham yanıtlar ve sonuçları kimliksiz araştırma amacıyla süresiz tutan eski yaklaşım kullanılmaz.

## Silme mekanizması

Veritabanı temizliği ile `ErasureObject` dosya silme kaydı aynı işlem içinde kaydedilir. Dosya hizmeti çalışmazsa silme niyeti kaybolmaz. İşçi, başarısız işlemi artan aralıklarla yeniden dener; başarılı işlemden sonra dosya adresi kayıttan kaldırılır. Kullanıcıya ait içerik günlük mesajına yazılmaz. Tamamlanan imha için `ErasureLedger`, operasyonun sayısal sonucu için `RetentionRun` tutulur.

Puanlama ve insan incelemesi, silinmiş içerik üzerine yeniden yorum yazmamalıdır. Veritabanı kontrolleri ve oturum kilitleri bu yarışı engeller. Silme başlamadan dış sağlayıcıya gönderilmiş bir isteğin geri alınabildiği iddia edilmez; bu durum sağlayıcı silme prosedürü/ZDR kapsamıyla ele alınır.

Eski `artifactUrl` kayıtları yalnız `LEGACY_RESPONSE_BUCKETS` içinde açıkça izinli, bize ait bucket eşleştirmesiyle silinir. Tanınmayan bir URL'nin referansı sessizce kaybedilmez; kayıt hata olarak kalır ve envanter tamamlanır. Rastgele dış URL çağrılmaz.

## İşletime alma

1. Önce mevcut yedek ve geri dönüş planını, migration 015 ve 016'yı ve test çıktısını doğrulayın. Migration üretime bu belgeyle otomatik uygulanmış değildir.
2. `RETENTION_APPLY_ENABLED` kapalıyken `npx tsx scripts/jobs/retention.ts` ile kuru çalışma yapın. Sonuç kişisel içerik değil kategori sayısı, bekleyen/korunan kayıt ve hata bilgisidir. Sayfalama tamamlanmadan toplam envanter tamamlandı sayılmaz.
3. Eski dosya sağlayıcısı/bucket eşleştirmesi, hukukî muhafaza kayıtları ve beklenmedik büyüklükteki silme kapsamını inceleyin. Hatalı ya da tanınmayan kayıtlar silinmez.
4. Doğrulanan üretim sürümünde sunucu ayarını ve zamanlanmış iş ayarını etkinleştirin. HTTP uygulama çağrısı ayrıca politika kimliğini ister. Kimliksiz veya kurum yöneticisi çağrısı küresel silmeyi açmaz.
5. Zamanlanmış iş saatlik çalışır. Tamamlanmamış dosya silmesi veya satır hatası başarılı sıfır sonuç olarak gizlenmez. Sorunu çözün, yeniden çalıştırın ve bekleyen işlerin sıfırlandığını doğrulayın.

Komutlar yalnız hedef ortamın doğru bağlantısıyla çalıştırılır. Test bağlantısı ile üretim bağlantısı birbirinin yerine kullanılmaz. Kuru çalışma hiçbir silme kaydı oluşturmaz ve dosya silme çağrısı yapmaz.

## Hukuki muhafaza

Oturum metaverisindeki `retentionHold` için `reference`, `owner`, `until` gerekir. Referans delilin kendisini değil kısıtlı dosyanın kimliğini gösterir. Aktif veya bozuk muhafaza kaydı otomatik silmeyi durdurur ve inceleme sayısına girer. Süresi dolan kayıt normal politikaya döner. Geçerli bir muhafaza nedeniyle hesap silme tamamlanamıyorsa ilgili kişi kapsam ve inceleme kanalı hakkında bilgilendirilir; genel/süresiz engel yaratılmaz.

## Yedek ve geri yükleme

Canlı veritabanındaki silme, sağlayıcının eski yedeklerini anında yok ettiği anlamına gelmez. Üretim için şu kayıtlar zorunludur: sağlayıcı, proje/bucket, yedek türü, en eski geri dönüş noktası, azami saklama, erişim sahipleri, otomatik süre sonu temizleme ve test tarihi. S3 için silme kodu sürümleri ve silme işaretlerini de temizler; sürüm listeleme/silme yetkisi yoksa işlem hata verip kuyrukta kalır. Object Lock, bağımsız yedekler ve çoğaltılmış kopyalar ayrıca doğrulanır.

Silme kayıtlarını yedekle aynı hata alanı dışında koruyun. Geri yüklenen ortam önce ağ erişimi ve işleyicileri kapalı tutar. Korunan silme defteri geri yüklenir; kullanıcı/oturum/yanıt/medya hedefleri yeniden temizlenir. Bekleyen özel dosya silmeleri yeniden çalıştırılır. Sentetik olarak önceden silinmiş bir kaydın geri gelmediği test edilmeden ortam kullanıcı trafiğine açılmaz. Henüz gerçek sağlayıcı yedeği üzerinde geri yükleme testi yapıldığı iddia edilmez.

## Alıcı kopyaları ve hak talepleri

OpenAI, e-posta/hata izleme sağlayıcısı, dışa aktarım dosyası, kurumun indirdiği rapor ve destek yazışması canlı değerlendirme tablolarından ayrı kopyalardır. Her biri için alıcı, veri kapsamı, talep tarihi, işlem numarası, teyit/istisna ve kapanış tarihi kaydedilir. Kamuya açık depoda aday adı, e-posta, ses veya cevap içeriği tutulmaz. Bir dış alıcıya bildirim veya e-posta bu belge hazırlanırken gönderilmemiştir.

Başvuru kaydı: `[TALEP NO]`, doğrulama yöntemi `[ASGARİ GEREKLİ YÖNTEM]`, kapsam `[KATEGORİLER]`, alıcılar `[LİSTE]`, işlem/teyit tarihleri `[TARİHLER]`, varsa muhafaza nedeni ve bitişi `[KAYIT]`. Yanıt, hangi kayıtların silindiğini ve hangi kopyaların hangi nedenle beklediğini ayrı anlatır; "her yerden anında silindi" denmez.

## Kanıt dosyası

Kod ve testler: bu dalın sürüm kimliği, migration doğrulaması, gerçek PostgreSQL silme/geri deneme/ayrı kurum testleri, puanlama yarış testleri ve gizlilik akışı testleri. Üretim kapanışı için ek olarak gerçek zamanlanmış iş sonucu, depolama yokluk teyidi, yedek yapılandırması ve geri yükleme test kaydı gerekir.

[KVKK yönetmeliği](https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK) imha işlemlerinin kaydını ve bu kayıtların en az üç yıl saklanmasını düzenler. Otomatik işin daha sık çalışması, gerçek silmenin tamamlandığının ayrıca izlenmesi gereğini kaldırmaz.

## Silme defteri araçları

- Özel bir dosyaya dışa aktarma: `npx tsx scripts/jobs/erasure-ledger.ts --export /private/erasure-ledger.json`. Dosya yeni oluşturulur; var olan dosya ezilmez ve dosya yetkisi 0600'dür.
- Yalıtılmış geri yükleme ortamında tekrar uygulama: `RESTORE_ERASURE_REPLAY=true npx tsx scripts/jobs/erasure-ledger.ts --replay /private/erasure-ledger.json`.
- Dosya aday içeriği taşımasa da hedef kimlikleri içerdiğinden erişimi sınırlı tutulur; depoya veya herkese açık dosya paylaşımına konulmaz. Otomatik işten sonra defterin ayrı hata alanında güncel kopyasının tutulması işletim sorumlusunun görevidir.

Yerel test kanıtı (4 Kasım 2026): geçici PostgreSQL üzerinde 9 saklama/silme/geri yükleme testi, 3 kamera yükleme kurtarma testi; genel pakette 2.614 başarılı test; ek puanlama ve operasyon güvenlik senaryoları başarılı. Ayrıntılı kapsam ve atlanan testler [yayın hazırlığı kaydında](../CHILD_SAFETY_READINESS.md). Gerçek sağlayıcı yedekleri veya üretim dosyaları bu testlerde kullanılmadı.
