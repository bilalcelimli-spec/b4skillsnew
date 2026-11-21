/**
 * Turkish CEFR level guides (/cefr-seviyeleri/…). Written for Turkish
 * readers in our own words, not translated sentence by sentence and not
 * copied from the Council of Europe's descriptor scales (which need
 * permission to reproduce). Same structure and facts as the English guides.
 * Skill keys stay in English; the page translates the labels.
 */
import type { LevelGuide } from "./cefr-guides";

export const LEVEL_GUIDES_TR: readonly LevelGuide[] = [
  {
    lang: "tr",
    level: "A1",
    slug: "a1",
    band: "Temel kullanıcı",
    nickname: "Başlangıç",
    answer:
      "A1, altı CEFR seviyesinin ilkidir. A1 seviyesinde günlük hayatta sık kullanılan kelimeleri ve kalıp ifadeleri bilirsiniz: kendinizi tanıtabilir, kendinizle ilgili basit soruları yanıtlayabilir ve çok tanıdık konulardaki yavaş, kısa konuşmaları anlayabilirsiniz. Konuşma ancak karşınızdaki kişi sabırlı davranıp size yardımcı olursa ilerler.",
    canDo: [
      { skill: "Reading", points: ["Tabelalarda, etiketlerde ve basit formlarda tanıdık isimleri, kelimeleri ve çok kısa cümleleri seçebilirsiniz.", "Kısa bir metinde bir isim, sayı, fiyat veya saat bulabilirsiniz."] },
      { skill: "Listening", points: ["Kendiniz, aileniz ve yakın çevreniz hakkında çok yavaş ve net söylenen cümleleri takip edebilirsiniz.", "Sayılar, yön tarifleri ve saatler gibi basit bilgileri yakalayabilirsiniz."] },
      { skill: "Speaking", points: ["Ezberlenmiş kalıplarla kim olduğunuzu, nerede yaşadığınızı ve ne iş yaptığınızı söyleyebilirsiniz.", "Tanıdık konularda basit sorular sorup yanıtlayabilirsiniz; duraksamalar ve yardım normaldir."] },
      { skill: "Writing", points: ["Bir formu adınız, uyruğunuz ve adresinizle doldurabilirsiniz.", "Kalıp ifadelerle kısa bir kartpostal veya mesaj yazabilirsiniz."] },
    ],
    language: [
      "be ve have fiillerinin geniş zamanı ve birkaç yaygın fiil.",
      "Şahıs zamirleri, iyelik sıfatları (my, your), this/that, çoğul isimler.",
      "Temel soru kelimeleri (what, where, how old) ve there is / there are.",
      "Sayılar, günler, aylar, renkler, aile üyeleri, yiyecekler ve günlük eşyalar.",
    ],
    goodFor: ["İnsanları selamlamak ve temel kişisel bilgileri paylaşmak.", "Çok basit alışveriş yapmak, sipariş vermek ve fiyat sormak.", "Seyahat ederken tabelaları ve basit duyuruları okumak."],
    limits: ["Karşınızdaki hızlı konuşursa ya da bilmediğiniz kelimeler kullanırsa konuşma çabucak kopar.", "Cümleler esnek dilbilgisinden çok ezberlenmiş kalıplara dayanır."],
    nextSteps: [
      "Sık kullanılan kelimeleri küçük konu grupları halinde öğrenin (ev, iş, alışveriş, seyahat) ve her birini kısa cümlelerde kullanın.",
      "Başlangıç seviyesine uygun hazırlanmış dinleme kayıtlarını her gün, on dakika bile olsa dinleyin.",
      "Ne olduğunu ve neler yapabildiğinizi anlatmak için past simple ve can/can't yapılarını çalışın; ikisi de A2'nin temel dilidir.",
    ],
    faq: [
      { q: "A1, 'hiç İngilizce bilmemek' ile aynı şey mi?", a: "Hayır. A1, tahmin edilebilir birkaç günlük durumu idare edebildiğiniz anlamına gelir. Bunun altındaki öğrenciler bazen Pre-A1 olarak tanımlanır." },
      { q: "A1 İngilizce ile yurt dışına seyahat edebilir miyim?", a: "Selamlaşmak veya sipariş vermek gibi çok basit ve tahmin edilebilir durumları idare edebilirsiniz; ancak beklenmedik her şey için karşınızdakinin sabrına, jestlere veya bir sözlüğe ihtiyacınız olur." },
    ],
  },
  {
    lang: "tr",
    level: "A2",
    slug: "a2",
    band: "Temel kullanıcı",
    nickname: "Temel",
    answer:
      "A2, ikinci CEFR seviyesidir. A2 seviyesinde alışveriş, ulaşım, aileniz, işiniz veya yaşadığınız yer gibi rutin günlük konuşmaları kısa cümlelerle idare edebilir, bu konulardaki basit ve net mesajları anlayabilirsiniz.",
    canDo: [
      { skill: "Reading", points: ["Kişisel mesajlar, menüler, tarifeler ve ilanlar gibi kısa ve basit metinleri anlayabilirsiniz.", "Günlük materyallerde aradığınız belirli bilgiyi bulabilirsiniz."] },
      { skill: "Listening", points: ["Kısa ve net anonsların, mesajların ana fikrini anlayabilirsiniz.", "İnsanlar net konuştuğunda tanıdık konulardaki günlük konuşmaları takip edebilirsiniz."] },
      { skill: "Speaking", points: ["Geçmişinizi, günlük rutininizi, işinizi veya okulunuzu basit ifadelerle anlatabilirsiniz.", "Kısa sosyal konuşmaları yürütebilir, randevu ayarlayabilir, mağazada veya toplu taşımada bir şey isteyebilirsiniz."] },
      { skill: "Writing", points: ["Kısa notlar ve basit kişisel mesajlar yazabilirsiniz.", "Basit cümleleri and, but ve because ile bağlayabilirsiniz."] },
    ],
    language: [
      "Past simple (düzenli ve yaygın düzensiz fiiller) ve planlar için going to.",
      "Karşılaştırma ve üstünlük yapıları, sıklık zarfları, sayılabilen ve sayılamayan isimler.",
      "Yetenek, zorunluluk ve rica için can, could, have to, would like.",
      "Günlük rutin, iş, seyahat, sağlık, alışveriş ve boş zaman kelimeleri.",
    ],
    goodFor: ["Günlük seyahat: rezervasyon yapmak, yol sormak, otelde basit bir sorunu çözmek.", "İş arkadaşları veya komşularla kısa, rutin konuşmalar.", "İşte basit talimatları ve formları anlamak."],
    limits: ["Fikirleri ya da gerekçeleri bir iki cümlenin ötesinde açıklamak.", "Anadili İngilizce olan kişiler arasındaki konuşmaları, filmleri veya haberleri takip etmek."],
    nextSteps: [
      "Geçmiş olayları ve gelecek planlarınızı kısa hikâyeler halinde anlatmayı çalışın; birbirine bağlı anlatım B1'e geçişin ana adımıdır.",
      "Seviyenizin biraz üstündeki kademeli okuma kitaplarıyla okuma hızınızı ve kelime bilginizi geliştirin.",
      "Present perfect (I've been, I've never …) ve first conditional (If it rains, we'll …) yapılarını kullanmaya başlayın.",
    ],
    faq: [
      { q: "A2 İngilizce ile çalışabilir miyim?", a: "A2 genellikle tahmin edilebilir dille yürüyen basit ve rutin işler için yeterlidir. İngilizce toplantı, yazışma veya müşteriyle iletişim içeren pozisyonların çoğu B1 veya üstünü bekler." },
      { q: "Hangi Cambridge sınavı A2 seviyesindedir?", a: "Cambridge'in A2 Key (KET) sınavı A2'yi ölçmek için tasarlanmıştır. Diğer sınavların A2'yi nasıl raporladığını sınav karşılaştırma tablosunda görebilirsiniz." },
    ],
  },
  {
    lang: "tr",
    level: "B1",
    slug: "b1",
    band: "Bağımsız kullanıcı",
    nickname: "Orta",
    answer:
      "B1, İngilizcede kendi başınıza idare etmeye başladığınız seviyedir. B1 seviyesinde insanlar tanıdık konular hakkında net konuştuğunda ana fikirleri takip eder, seyahatte karşılaşacağınız çoğu durumu yardım almadan çözer, deneyimlerinizi, planlarınızı ve görüşlerinizi kısa gerekçelerle anlatabilirsiniz.",
    canDo: [
      { skill: "Reading", points: ["Sık kullanılan İngilizceyle yazılmış günlük metinleri, e-postaları ve mektupları okuyabilirsiniz.", "Tanıdık konulardaki anlaşılır yazılarda ana fikri ve düşünce akışını izleyebilirsiniz."] },
      { skill: "Listening", points: ["İş, okul veya boş zamanla ilgili net konuşmaların ana noktalarını takip edebilirsiniz.", "Yavaş ve net anlatıldığında güncel konulardaki pek çok radyo veya TV programının genel fikrini anlayabilirsiniz."] },
      { skill: "Speaking", points: ["Tanıdık konulardaki sohbetlere hazırlıksız katılabilirsiniz.", "Bir olayı anlatabilir, bir film veya kitabı özetleyebilir, görüş ve planlarınızı kısa gerekçelerle açıklayabilirsiniz."] },
      { skill: "Writing", points: ["Tanıdık konularda birbirine bağlı basit metinler yazabilirsiniz.", "Deneyimlerinizi ve izlenimlerinizi anlatan kişisel e-postalar yazabilirsiniz."] },
    ],
    language: [
      "Present perfect ile past simple farkı, past continuous, used to.",
      "First ve second conditional, will ile going to farkı, basit edilgen yapılar.",
      "İlgi cümlecikleri (who, which, that) ve bağlaçlar (however, although, so).",
      "İş, eğitim, duygular, medya ve çevre ile ilgili kelimeler.",
    ],
    goodFor: ["İngilizce konuşulan bir ülkede bağımsız seyahat ve günlük yaşam.", "Basit e-postalar ve telefon görüşmeleri dahil rutin iş iletişimi.", "Tanıdık konulardaki eğitimleri veya dersleri takip etmek."],
    limits: ["Soyut veya yabancı olduğunuz konuları derinlemesine tartışmak.", "Hızlı konuşmayı, belirgin aksanları, mizahı ve deyimleri anlamak.", "Resmi metinleri tutarlı ve uygun bir üslupla yazmak."],
    nextSteps: [
      "Görüş bildirip savunmayı çalışın: bir görüş, bir gerekçe ve bir örnek verin, ardından karşı bir argümana cevap verin.",
      "Doğal hızdaki gerçek içerikleri (podcast, röportaj) önce transkriptle dinleyin.",
      "Bağlaç çeşitliliğinizi artırın; third conditional ve dolaylı anlatımı öğrenin.",
    ],
    faq: [
      { q: "B1 'akıcı' İngilizce mi?", a: "Genellikle hayır. B1 öğrencileri tanıdık konularda bağımsız iletişim kurar, ama hâlâ kelime arar ve ifadelerini basitleştirir. Akıcı ve doğal sohbet çoğu kişi için B2 ve üzeri anlamına gelir." },
      { q: "B1 vize veya iş için yeterli mi?", a: "Bazı göç ve iş başvuruları B1'i asgari şart olarak koyar, ancak gereklilikler ülkeye, kuruma ve pozisyona göre değişir. Kabul edilen seviyeyi ve sınavları her zaman ilgili kurumdan kontrol edin." },
    ],
  },
  {
    lang: "tr",
    level: "B2",
    slug: "b2",
    band: "Bağımsız kullanıcı",
    nickname: "Orta üstü",
    answer:
      "B2, orta üstü seviyedir. B2 seviyesinde iki taraf da fazla zorlanmadan doğal sohbetler yürütebilir, kendi alanınızdaki teknik konular dahil karmaşık metin ve konuşmaların ana fikirlerini anlayabilir, bir görüşü artı ve eksilerini tartarak savunabilirsiniz.",
    canDo: [
      { skill: "Reading", points: ["Yazarın bir tavır aldığı güncel konulardaki makale ve raporları okuyabilirsiniz.", "Kendi alanınızdaki uzmanlık metinlerinin çoğunu, ara sıra sözlük kullanarak anlayabilirsiniz."] },
      { skill: "Listening", points: ["Uzun konuşmaları, dersleri ve tanıdık konulardaki oldukça karmaşık tartışmaları takip edebilirsiniz.", "Haberleri, belgeselleri ve standart İngilizcedeki çoğu filmi izleyip iyi anlayabilirsiniz."] },
      { skill: "Speaking", points: ["Akıcı konuşanlarla, iki tarafın da yavaşlamasına veya basitleştirmesine gerek kalmadan rahatça konuşabilirsiniz.", "Açık ve ayrıntılı anlatımlar yapabilir, bir görüşü savunabilirsiniz."] },
      { skill: "Writing", points: ["Bir konunun lehinde ve aleyhinde gerekçeler sunan açık, ayrıntılı kompozisyonlar veya raporlar yazabilirsiniz.", "Resmi ve gayriresmi e-postaları uygun bir üslupla yazabilirsiniz."] },
    ],
    language: [
      "Past perfect ve future continuous dahil tüm anlatı zamanları.",
      "Third ve mixed conditional, dilek ve pişmanlık yapıları, geniş edilgen yapı yelpazesi.",
      "Dolaylı anlatım ve tahmin bildiren modal yapılar (must have, might have).",
      "Eşdizimler, yaygın phrasal verb'ler ve iş ile eğitim alanında konu kelimeleri.",
    ],
    goodFor: ["İngilizce eğitim veren pek çok lisans programı B2'yi olağan giriş seviyesi olarak belirler.", "İngilizce profesyonel çalışma: tanıdık konularda toplantı, sunum, rapor ve müzakere.", "Akıcı konuşanlarla rahatça sosyalleşmek."],
    limits: ["Çok hızlı, argo veya kültüre özgü göndermelerle dolu dil.", "Yabancı ya da çok soyut konularda kesin ve ince ayrımlı ifade.", "Karmaşık yapılarda hiç hata yapmadan uzun akademik metinler yazmak."],
    nextSteps: [
      "Konfor alanınızın dışındaki konularda okuyup dinleyin; yazarların tavrını nasıl belirttiğine dikkat edin (arguably, it could be said that …).",
      "Uzun metinleri ve dersleri kısaca özetlemeyi çalışın; bu, C1'in temel becerilerinden biridir.",
      "Karmaşık cümlelerde doğruluk üzerine çalışın: vurgu için devrik yapılar, cleft cümleler, ileri bağlaçlar.",
    ],
    faq: [
      { q: "B2 üniversite için yeterli mi?", a: "Pek çok üniversite lisans eğitimi için B2, bazı lisansüstü veya dil ağırlıklı programlar için C1 ister ve bunu genellikle belirli bir sınavla belgelemenizi bekler. Kesin şartı ve kabul edilen sınavları üniversitenin kendi kabul sayfasından kontrol edin." },
      { q: "B2'nin B1'den farkı nedir?", a: "B1 öğrencileri tanıdık durumları idare eder; B2 öğrencileri soyut ve karmaşık konuları tartışabilir, doğal konuşmayı takip edebilir ve bir görüşü akıcı biçimde savunabilir. Bu geçiş genellikle birkaç yüz saatlik çalışma ve pratik gerektirir." },
    ],
  },
  {
    lang: "tr",
    level: "C1",
    slug: "c1",
    band: "Yetkin kullanıcı",
    nickname: "İleri",
    answer:
      "C1, ileri seviyedir. C1 seviyesinde uzun ve zorlu metinleri okuyup söylenenin yanında ima edileni de yakalar, kelime aramadan akıcı konuşur ve İngilizceyi eğitimde, işte ve sosyal hayatta duruma göre üslubunuzu ayarlayarak güvenle kullanırsınız.",
    canDo: [
      { skill: "Reading", points: ["Uzun ve karmaşık bilgilendirici ve edebi metinleri anlayabilir, üslup farklarını fark edebilirsiniz.", "Alanınızın dışında olsa bile uzmanlık makalelerini ve teknik talimatları okuyabilirsiniz."] },
      { skill: "Listening", points: ["Konudan sapan ya da yapısı belirgin olmayan uzun konuşma ve tartışmaları takip edebilirsiniz.", "İngilizce film ve dizileri altyazısız, deyimlerin önemli bir kısmını da anlayarak izleyebilirsiniz."] },
      { skill: "Speaking", points: ["Belirgin biçimde kelime aramadan akıcı ve net ifade edebilirsiniz.", "İngilizceyi toplantılarda, müzakerelerde ve akademik tartışmalarda etkili kullanabilirsiniz."] },
      { skill: "Writing", points: ["Karmaşık konularda açık, iyi kurgulanmış ve ayrıntılı metinler yazabilirsiniz.", "Okura uygun bir üslup seçer, fikirleri güçlü bağlantılarla düzenlersiniz."] },
    ],
    language: [
      "Vurgu için devrik yapı ve öne alma, cleft cümleler, isimleştirme.",
      "İnce ayrımlı kiplik ve temkinli ifade (it would appear that, to some extent).",
      "Geniş deyim ve phrasal verb dağarcığı, resmi ve gayriresmi üslup.",
      "Kesin akademik ve profesyonel kelime bilgisi.",
    ],
    goodFor: ["İngilizce lisansüstü eğitim ve akademik yazım.", "İngilizce yürütülen üst düzey ve müşteriyle doğrudan çalışan pozisyonlar.", "Tartışma programları dahil neredeyse her türlü medyayı takip etmek."],
    limits: ["İnce mizah, kelime oyunları ve çok yöresel ya da uzmanlık gerektiren deyimler.", "Her bağlamda, özellikle zaman baskısı altında yazarken anadil düzeyinde kesinlik."],
    nextSteps: [
      "Nadiren kullandığınız türlerde (edebiyat, köşe yazıları, hukuki veya bilimsel metinler) okuyun ve üsluplarını taklit edin.",
      "Uzun yazılarınız için yalnızca doğruluk değil, kesinlik ve özlülük üzerine de geri bildirim alın.",
      "Farklı aksanlarda, hızlı söz alışverişi olan doğaçlama konuşmaları dinleyin.",
    ],
    faq: [
      { q: "C1, anadil seviyesi ile aynı mı?", a: "Hayır. C1 yüksek bir yeterliliktir ve pek çok C1 kullanıcısı tamamen İngilizce çalışır ve okur; ancak CEFR 'anadili İngilizce olan kişi'yi bir seviye olarak kullanmaz. En kesin ve esnek kullanımı C2 tanımlar." },
      { q: "Hangi sınavlar C1 için tasarlanmıştır?", a: "Cambridge'in C1 Advanced sınavı C1 için tasarlanmıştır; diğer pek çok sınav da bir C1 puan aralığı yayımlar. Sınav sahiplerinin yayımladığı aralıkları karşılaştırma tablosunda görebilirsiniz." },
    ],
  },
  {
    lang: "tr",
    level: "C2",
    slug: "c2",
    band: "Yetkin kullanıcı",
    nickname: "Üst düzey yeterlilik",
    answer:
      "C2, en yüksek CEFR seviyesidir. C2 seviyesinde duyduğunuz ya da okuduğunuz hemen her şeyi zorlanmadan anlar, farklı kaynaklardaki bilgileri derleyip açık bir özet çıkarır ve karmaşık konularda bile ince anlam farklarını kesin ve doğal biçimde ifade edersiniz.",
    canDo: [
      { skill: "Reading", points: ["Soyut ve karmaşık yazılar dahil hemen her tür İngilizce metni rahatça okuyabilirsiniz.", "İma edilen anlamı, ironiyi ve üslup etkilerini yakalayabilirsiniz."] },
      { skill: "Listening", points: ["Canlı ya da kayıtlı her türlü konuşmayı tam doğal hızında takip edebilirsiniz.", "Uzmanlık gerektiren dersleri ve tartışmaları kolayca izleyebilirsiniz."] },
      { skill: "Speaking", points: ["Her sohbete kolayca katılır, deyimsel ve gündelik dili doğal biçimde kullanırsınız.", "İnce anlam farklarını aktarır, aksaklıkları karşınızdakinin fark etmeyeceği kadar akıcı biçimde düzeltirsiniz."] },
      { skill: "Writing", points: ["Karmaşık raporları, makaleleri ve eleştirileri uygun ve etkili bir üslupla yazabilirsiniz.", "Profesyonel veya edebi çalışmaları özetleyip eleştirebilirsiniz."] },
    ],
    language: [
      "Nadir yapılar dahil tüm dilbilgisi yelpazesinde tutarlı hâkimiyet.",
      "Deyimsel ve gündelik dilin doğal ve yerinde kullanımı.",
      "İnce anlam ve üslup ayrımları için kesin kelime seçimi.",
    ],
    goodFor: ["İngilizce öğretmenliği, çeviri veya editörlük dahil her türlü akademik ve profesyonel bağlam.", "Kesinlik ve nüansın önemli olduğu çok talepkâr pozisyonlar."],
    limits: ["Çok uzmanlaşmış alanlar, tıpkı anadili İngilizce olanlar için olduğu gibi, yine konu bilgisi gerektirir."],
    nextSteps: [
      "Seviyenizi alanınızdaki zorlu okuma ve yazma çalışmalarıyla koruyun.",
      "İhtiyaç duyduğunuz alana özgü üsluplara (hukuk, tıp, edebiyat) odaklanın.",
    ],
    faq: [
      { q: "C2'ye ihtiyacım var mı?", a: "Nadiren. Çok az üniversite veya işveren C2 ister; bu seviye daha çok öğretmen, çevirmen ve editör gibi dil profesyonelleri için önemlidir." },
      { q: "C2 anadil seviyesi mi?", a: "CEFR anadili İngilizce olan kişiyi bilerek ölçüt olarak kullanmaz. C2 kesin, esnek ve yerinde kullanımı tanımlar; resmi akademik yazımda pek çok anadil kullanıcısı C2'ye ulaşmaz." },
    ],
  },
];
