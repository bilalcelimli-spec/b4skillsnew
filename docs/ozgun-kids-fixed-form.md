# Özgün Kids Form A

Bu sınav, verilen 20 sayfalık öğrenci kitapçığındaki 96 soruyu sabit sırayla uygular. Adaptif soru bankasına veya IRT kalibrasyonuna eklenmez. Kaynak kitapçık ve yedi ses dosyası `public/assessments/ozgun-kids/form-a-v1` altında özgün baytlarıyla saklanır. Dosya özetleri ve süreleri `src/lib/fixed-forms/ozgun-kids-provenance.json` içindedir.

## Yönetici akışı

1. Kurumun **Exam Code Manager** ekranında **Özgün Kids — Form A (96 soru)** ürününü seçin.
2. Öğrenci kitapçığını ve 1–96 sıralı cevap anahtarını inceleyin. Anahtar 96 adet A/B/C/D olmalıdır. Gerekli düzeltmeleri yapın, doğrulama durumunu seçin ve kaydedin.
3. Kod adedini belirleyip **Generate Codes** ile tek kullanımlık sınav kodlarını üretin.
4. Aday, mevcut kodla kayıt/giriş akışında kodu kullanır. Kendisine bu sınav atanır. Aynı kodla tekrar açma veya eşzamanlı istek yeni bir deneme oluşturmaz; mevcut deneme açılır.
5. Adayın sonuçları geçmiş sınavlar ekranında, kurum yöneticisinin sonuçları oturum inceleme ekranında bulunur. **Yazdır** ile tarayıcıdan PDF olarak kaydedilebilir.

**Cevap anahtarı:** Kullanıcının paylaştığı 96 cevap, kitapçık sırasına göre esas anahtar olarak tanımlıdır ve önceki içerik aktarımıyla birebir eşleşir. Yeni kurumların varsayılan anahtarı doğrulanmış kabul edilir. Önceden kaydedilen kurum ayarları ve denemelerin değişmez anahtar sürümleri korunur. Yönetici anahtarı düzenlerse doğrulama durumu tekrar kaldırılır. Her denemenin anahtarı ve doğrulama durumu oturum oluşturulurken sabitlenir; sonraki kurum ayarları geçmiş denemeleri değiştirmez.

## Geçici kur önerileri ve kanıt kümeleri

Kullanıcının sağladığı ilk uygulama kuralları `ozgun-kids-placement.ts` içinde sürümlüdür. Bunlar pilot verisiyle doğrulanmış CEFR sınırları değildir. Sistem hiçbir sonuçta otomatik yerleştirme yapmaz; kesin genel CEFR, IRT puanı, Writing/Speaking sonucu veya yeterlilik sertifikası üretmez. Bir kura adaylık, o düzeyin yeterliğinin tamamlandığı anlamına gelmez.

| Toplam | Geçici öneri | Karardan önce |
| --- | --- | --- |
| 0–23 | Başlangıç / A1 | Temel anlama ve yönerge takibini bireysel görevle kontrol et |
| 24–39 | A2 kur adayı | A1 kümesinde güçlü kanıt |
| 40–55 | B1 kur adayı | A1 ve A2 kümelerinde güçlü kanıt |
| 56–71 | B2 kur adayı | A1, A2, B1 kümelerinde güçlü kanıt |
| 72–85 | C1 kur adayı | A1–B2 kümelerinde güçlü kanıt ve ek konuşma/yazma |
| 86–96 | C2 için ileri değerlendirme adayı | C1/C2 kümelerini ayrı incele; kapsamlı değerlendirme olmadan C2 kararı verme |

| Hedef | Grammar | Vocabulary | Reading | Listening |
| --- | --- | --- | --- | --- |
| A1 | 1–4 | 25–28 | 49–52 | 73–76 |
| A2 | 5–8 | 29–32 | 53–56 | 77–80 |
| B1 | 9–12 | 33–36 | 57–60 | 81–84 |
| B2 | 13–16 | 37–40 | 61–64 | 85–88 |
| C1 | 17–20 | 41–44 | 65–68 | 89–92 |
| C2 | 21–24 | 45–48 | 69–72 | 93–96 |

Her küme 16 sorudur. **12–16/16 ve her bölüm en az 2/4:** güçlü, bölümlere yayılmış kanıt. **8–11/16:** kısmi/sınırda. **0–7/16:** yeterli kanıt yok. **12–16/16 ancak bir bölüm 0–1/4:** dengesiz performans; zayıf alanda ek değerlendirme. Bu küçük kümeler kesin beceri seviyesi vermez.

Raporda koşula bağlı inceleme uyarıları gösterilir:

- Toplam önerisi ile gerekli alt kümeler uyuşmazsa eksik alan için yeni görev istenir.
- Eşiğe yakınlık, kullanıcının 54–57 örneğine uygun olarak yeni bandın alt sınırı `b` için `b−2` ile `b+1` arasındaki dört tam puandır. İki komşu kur için ek değerlendirme istenir.
- En yüksek ve düşük bölüm arasındaki fark en az 6 ise düşük bölüm ayrıca incelenir.
- A1 kanıtı yeterince güçlü değilse “A1 altı” sonucu verilmez; yönerge, sınav deneyimi ve temel anlama kontrol edilir.
- C1/C2 adaylığı konuşma/yazma ve daha kapsamlı okuma/dinleme ile doğrulanmalıdır.
- Her rapor ilk iki haftada ders içi performansla kur uygunluğunun yeniden değerlendirilmesini hatırlatır.

Örnek: 60/96, A1/A2/B1 güçlü ve B2 kısmi → **B2 kur adayı**. Dinleme puanı diğerlerinden belirgin düşükse ek dinleme değerlendirmesi gerekir.

## Aday akışı ve süreler

| Bölüm | Sorular | Süre |
| --- | --- | --- |
| Grammar | 1–24 | 20 dk |
| Vocabulary | 25–48 | 15 dk |
| Reading | 49–72 | 35 dk |
| Listening | 73–96 | 32 dk |

Kitapçıktaki 105 dakika, üç dakikalık genel açıklamayı içerir. Açıklama ekranından **Sınavı başlat** seçildiğinde 102 dakikalık bölüm süreleri başlar. Her bölüme ait 24 soru arasında gezinilebilir; kapatılan bölüme geri dönülemez. Cevaplar ayrı ayrı sunucuda kaydedilir. Başarısız kayıtlar gösterilir ve tekrar denenebilir; kaydedilmeyen cevap varken bölüm bitirilemez.

Süreler sunucu tarafından tutulur. Çıkış, yenileme veya bağlantı kesilmesi süreyi durdurmaz. Yeniden açmada geçen tüm bölümler atlanır. Süre dışındaki cevaplar puana eklenmez. Süresi bitmiş bir oturum ilk durum/rapor isteğinde tamamlanır.

Listening, `Listening_Tam_Sinav.mp3` dosyasını bir kez oynatır. Konuşmaların iki kez dinlenmesi ve cevap araları dosyanın içinde hazırdır. Sunucuda kayıt başlangıcı bir kez tutulur; yenileme veya tekrar devam etme aynı zaman çizelgesinden sürer. Toplu kayıt yaklaşık 29:34 sürer ve 32 dakikalık bölüme sığar. Aday dinleme düğmesine bastığında oynatma başlar; tarayıcı ses izni gerektirir. Altı ayrı kayıt kaynak bütünlüğü için ayrıca saklanır.

Her doğru 1, yanlış/boş 0 puandır. Toplam /96 ve dört ayrı /24 sonuç; doğru, yanlış, boş ve yüzdeler gösterilir. Güvenlik incelemesindeki oturumlar ayrıca işaretlenir.

## Teknik sınırlar ve doğrulama

- Kurum ayarı ve değişmez anahtar sürümü mevcut `SystemConfig`; cevaplar ve ham rapor mevcut `Session.metadata` alanında tutulur. Yeni veritabanı migration gerekmez.
- `/api/fixed-forms/ozgun-kids/config` yalnız yönetici rollerine açıktır. Aday işlemleri oturum sahipliğini ve kurum sınırını denetler. Veritabanı yoksa demo puanı üretmek yerine 503 döner.
- Öğrenci kitapçığının indirme yolu Express üzerinde yönetici yetkisi ister. Sesler standart sınav medyası olarak sunulur. Soru içeriği ve cevap anahtarı üretim istemci paketine eklenmez; API yalnız açık bölümün sorularını verir.
- PDF aktarımı: `scripts/fixed-forms/import-ozgun-kids.py <kaynak.pdf> src/lib/fixed-forms/ozgun-kids-form-a.json` (`pdfplumber` gerektirir).
- İçerik/puanlama, API yetkileri ve cevap kayıt testleri normal Vitest kapsamındadır. PostgreSQL testleri yalnız açıkça seçilen yerel test veritabanında `B4SKILLS_ARBITRATION_DB_TEST=1 npx vitest run test/ozgun-kids-db.test.ts` ile çalışır; üretim `DATABASE_URL` kullanılmaz. Bağlantı adresi test dosyasındadır.
- `npm run test:item-renderer -- ozgun-kids-renderer.spec.ts` yönetici kod üretimini, dört bölümün aday akışını ve 320/1280 px görünümünü kontrollü API yanıtlarıyla doğrular. Gerçek PostgreSQL testleri kod/oturum kilitlerini, anahtar sürümünü ve puanlamayı ayrıca sınar.
- Üretim derlemesi de geçici yerel PostgreSQL ile çalıştırılarak gerçek JWT/kod üretimi/kod kullanımı, aday yetkileri, oturum sürdürme, dört bölümün tamamlanması ve ham rapor uçtan uca doğrulandı. Kitapçık yetkileri ve MP3 byte-range yanıtı bu gerçek sunucu üzerinde kontrol edildi; üretim veritabanında işlem yapılmadı.
