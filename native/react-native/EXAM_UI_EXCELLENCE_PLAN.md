# Sınav arayüzü mükemmellik planı: tüm beceriler ve soru türleri

28 Ekim 2026 · iPad, macOS (ve aynı React Native kodu üzerinden Android)

Bu plan [EXAM_EXPERIENCE_ROADMAP.md](EXAM_EXPERIENCE_ROADMAP.md) ile [WEB_FEATURE_PARITY_ROADMAP.md](WEB_FEATURE_PARITY_ROADMAP.md)'nin yerine geçmez; onların sınav arayüzü bölümünü soru türü düzeyinde derinleştirir. Gözetim, kamera, Apple değerlendirme modu ve çıkış/devam kuralları o belgelerde kalır.

## 1 "Dünya standardı" ne demek: ölçülebilir hedef

"En üst seviye" bir his değil, beş boyutta kanıtlanabilir bir durumdur. Her boyutun kabul ölçütü pilotta ölçülür. Aşağıdakiler hedeftir, mevcut ürünün ölçülmüş sonucu değildir.

| Boyut | Ne anlama gelir | Kabul ölçütü |
| --- | --- | --- |
| **Ölçme geçerliği** | Arayüz, ölçülen beceriye ilgisiz zorluk eklemez (construct-irrelevant variance). Aday cihazla değil dille uğraşır. | Web, iPad ve Mac arasında soru düzeyinde mod/cihaz DIF analizi (`dif-analysis.ts`) anlamlı farklılık göstermez; arayüz kaynaklı yanıt hatası (yanlış seçim, kaybolan kayıt) pilotta ≤ %0,5 |
| **Erişilebilirlik** | WCAG 2.2 AA, native yazılıma WCAG2ICT ile uygulanır; onaylı uyarlamalar sınav tanımından gelir | VoiceOver, Tam Klavye Erişimi, büyük metin (en büyük erişilebilirlik boyutu) ve azaltılmış hareketle her soru türü bağımsız tamamlanır |
| **Veri bütünlüğü** | Gönderilen her yanıt, adayın ekranda gördüğü seçimle birebir aynıdır; hiçbir yanıt kaybolmaz veya iki kez kaydedilmez | Her etkileşim türü için golden fixture ve backend puanlayıcı sözleşme testi; hata senaryolarında sıfır kayıp, sıfır çift kayıt |
| **Kullanılabilirlik** | İlk kez gelen aday, yönerge okumadan ne yapacağını anlar; her ekranda tek ana eylem | Hedef yaş gruplarıyla pilotta yardımsız tamamlama ≥ %95; SUS ≥ 80; "ne yapacağımı bilemedim" geri bildirimi ≤ %2 |
| **Güvenilirlik ve performans** | Soru geçişi anlık hissettirir; çökme ve donma yok | Sonraki sorunun görünmesi (yanıt makbuzundan sonra, önbellekte) p95 < 300 ms; çökmesiz oturum ≥ %99,9; düşük kapasiteli desteklenen cihazda ölçülür |

Dayanak çerçeveler: AERA/APA/NCME *Standards for Educational and Psychological Testing* (2014, özellikle adalet ve uyarlama bölümleri), ITC/ATP *Guidelines for Technology-Based Assessment* (2022), W3C WCAG 2.2 ve WCAG2ICT, 1EdTech QTI 3 (etkileşim türleri ve PNP kişisel ihtiyaç profili), Apple Human Interface Guidelines. CEFR etiketi tek başına geçerlik kanıtı değildir; puan eşdeğerliği ve kalibrasyon ayrı kanıt ister.

## 2 Bugünkü durum (kaynak koddan)

Bankada 3.020 etkin/pretest soru var: Grammar 899, Reading 725, Vocabulary 583, Speaking 403, Listening 224, Writing 186 (`reports/active-item-content-audit.md`, 13 Ekim). Backend 6 soru türü tanımlar (`ItemType`): `MULTIPLE_CHOICE`, `FILL_IN_BLANKS`, `DRAG_DROP`, `SPEAKING_PROMPT`, `WRITING_PROMPT`, `INTEGRATED_TASK`.

| Tür / alt tür | Web (`ItemRenderer`, `StructuredResponse`) | Native (`ItemScreen`) | Ana boşluk |
| --- | --- | --- | --- |
| Çoktan seçmeli | Var; 1–9 tuş kısayolu | Var | Klavye gezinmesi, seçenek karıştırma sözleşmesi testi, uzun seçenek düzeni |
| Boşluk doldurma (yazarak / kelime bankası / dinleyerek) | Var | Var (tek/çok boşluk) | Kelime bankası dokun-yerleştir, dinleme cloze'u, metin içi odak sırası |
| Sürükle-bırak: seçim (`selection`) | Var (onay kutusu) | **Yok** | Tamamı |
| Sürükle-bırak: eşleştirme (`matching`) | Var (açılır liste) | **Yok** | Tamamı; gerçek sürükleme + dokun-yerleştir |
| Sürükle-bırak: yerleştirme (`placement`) | Var (açılır liste) | **Yok** | Tamamı |
| Sürükle-bırak: sıralama (`ordering`) | Var (yukarı/aşağı) | **Yok** | Tamamı |
| Yazma | Var | Var (düz editör) | Taslak koruma, süre uyarıları, sınav modunda yazım düzeltme politikası |
| Konuşma | Var; `prepTime`/`responseTime` okunuyor | Var ama **hazırlık süresi yok, her soruda sabit 180 sn** | Hazırlık–kayıt durum makinesi, soru bazlı süre, yükleme makbuzu |
| Dinleme | Var; tekrar hakkı istemcide sabit 2 | Var; tekrar hakkı istemcide sabit 2 | **Tekrar hakkı sunucuda uygulanmıyor**; soru bazlı politika yok |
| Entegre görev | Var (kaynak + yazılı/sözlü yanıt) | **Yok** | Aşamalı görev oynatıcısı |
| Okuma metni | Var (yan yana) | Var (geniş ekranda yan yana) | Okuma araçları, kaydırma konumu koruma |

Doğrulanmış iki sözleşme sorunu:
- **Süre alanları tutarsız.** Sorularda `responseTime`, `maxTime`, `responseTimeSec`, `timeLimitSeconds` alanları birlikte kullanılıyor. `item-evidence-audit.ts` bunu `RESPONSE_LIMIT_CONFLICT` olarak işaretliyor; web `responseTime ?? maxTime` okuyor, native hiçbirini okumuyor.
- **Dinleme hakkı yalnızca istemcide.** `MAX_PLAYS = 2` iki istemcide de sabit kodlu; `video-items.ts`'deki sayaç bellek içi ve ana akışa bağlı değil. Uygulama yeniden açılınca hak sıfırlanır.

## 3 Temel karar: tek görev sözleşmesi

Dünya standardındaki her sınav platformu aynı ilkeye dayanır: arayüz soruyu tahmin etmez, soru kendini tanımlar. Bugün native `responseMode()` türü `skill + type + alanların varlığından` çıkarıyor; web de benzer sezgisel kurallar kullanıyor. Bu, yeni bir alt tür eklendiğinde iki istemcide farklı davranışa ve sessiz hatalara yol açar.

**`TaskSpec v1`**, backend'in her soru için döndürdüğü, sürümlü ve doğrulanmış tek tanımdır:

```ts
type TaskSpec = {
  version: 1;
  interaction:
    | { kind: 'choice'; options: Option[]; select: 1 }
    | { kind: 'multiSelect'; options: Option[]; select: number }
    | { kind: 'gapText'; segments: Segment[]; gaps: Gap[]; bank?: Option[]; reuse: boolean }
    | { kind: 'match'; rows: Option[]; targets: Option[]; reuse: boolean }
    | { kind: 'place'; slots: Slot[]; bank: Option[] }
    | { kind: 'order'; items: Option[] }
    | { kind: 'extendedText'; minWords?: number; maxWords?: number; limitIsHard: boolean }
    | { kind: 'speak'; prepSeconds: number; responseSeconds: number; attempts: number }
    | { kind: 'stages'; stages: Stage[] }; // entegre görev: oku → dinle → hazırlan → yanıtla
  stimulus?: { passage?: RichText; audio?: MediaRef; image?: MediaRef };
  policy: { maxPlays?: number; tools: ToolName[]; navigation: 'forwardOnly' | 'review' };
  accessibility: { altText?: string; audioDescription?: string };
};
```

- Backend `metadata`'dan `TaskSpec` üretir; tek dönüştürücü tek yerde durur ve iki istemci aynı tanımı kullanır. Mevcut `metadata` alanları geriye dönük okunur, yeni sorular doğrudan `TaskSpec` ile yazılır.
- Süre: tek alan (`responseSeconds`). Bankadaki `RESPONSE_LIMIT_CONFLICT` bulguları içerik ekibiyle kapatılır.
- Yanıt kodlaması (`ResponseCodec`) her `kind` için tek ve test edilmiştir; puanlayıcı aynı şemayı doğrular.
- Yapı QTI 3 etkileşim türleriyle bire bir eşlenir (`choiceInteraction`, `gapMatchInteraction`, `matchInteraction`, `orderInteraction`, `extendedTextInteraction`); tam QTI içe/dışa aktarım ayrı karardır ama yol açık kalır.

**İçerik ön uçuşu (preflight).** Her ACTIVE/PRETEST soru `TaskSpec`'e dönüştürülür ve doğrulanır. Dönüşmeyen veya istemcinin desteklemediği soru sınava girmez; bu aday sınavın ortasında değil, yayın öncesi raporda görünür. Hedef: bankanın %100'ü iki istemcide de çizilebilir. Bu rapor IQS toplu işine (`iqs:batch`) eklenir.

## 4 Ortak sınav kabuğu (`ExamShell`)

Her soru türü aynı kabuğun içinde çalışır; aday kabuğu bir kez öğrenir.

**Bölgeler.** Üst şerit: bölüm adı, sunucu süresi, bağlantı ve kayıt durumu, araçlar, yardım. Gövde: uyaran (metin/ses/görsel) ve yanıt alanı. Alt şerit: tek ana eylem ("Yanıtı gönder") ve gerekirse ikincil eylem. Geniş ekranda uyaran ve yanıt yan yana, bağımsız kaydırılır; dar ekranda tek sütun ve uyarana "Metne dön" bağlantısı.

**Durum dili.** Her yanıt dört durumdan birindedir ve adaya açıkça söylenir: *taslak* (cihazda) → *gönderiliyor* → *kaydedildi* (yalnızca sunucu makbuzu gelince) → *belirsiz* (bağlantı koptu, doğrulanıyor). "Kaydedildi" makbuzdan önce asla yazılmaz.

**İlerleme.** Uyarlanabilir sınavda soru sayısı kesin değildir; sahte yüzde gösterilmez. Gösterilen: bölüm adı, bölümdeki konum (sunucu biliyorsa) ve kalan süre.

**Süre.** Kaynak her zaman sunucunun bitiş zamanıdır. 5 dk, 1 dk ve 10 sn uyarıları hem görsel hem sesli/VoiceOver duyurusudur; azaltılmış harekette yanıp sönme yoktur. Süre dolunca yarım yanıtın ne olacağı (gönderilir mi, boş mu sayılır) politikadan gelir ve adaya önceden söylenir.

**Araçlar** (yalnızca politika izin verirse görünür, yoksa hiç görünmez):

| Araç | Not |
| --- | --- |
| Yazı boyutu ve satır aralığı | Sistem Dynamic Type ile birlikte; okuma metninde ayrı kontrol |
| Yüksek kontrast / renk teması | Marka renkleri korunur, kontrast oranı ≥ 7:1 (AAA) seçeneği |
| Vurgulayıcı | Okuma metninde; soru değişince silinmez, sınav bitince silinir |
| Satır odak çubuğu | Okuma güçlüğü uyarlaması |
| Not defteri | Yalnızca politikada; puanlanmaz, sınav bitince silinir |
| Seçenek eleme (üstünü çizme) | Çoktan seçmelide; seçimi değiştirmez |

**Klavye ve odak.** Her ekranın tanımlı bir odak sırası vardır: başlık → uyaran → yanıt → gönder. Soru açılınca odak başlığa, hatada hata metnine gider. Kısayollar: 1–9 / A–I seçenek, Space seç, Enter gönder (onaylı), ⌘/Ctrl+↑↓ uyaranla yanıt arasında geçiş, ? klavye yardımı. Mac'te Tam Klavye Erişimi, iPad'de donanım klavyesiyle aynı harita.

**Dil ve yön.** Arayüz metinleri `i18n` (tr, en, ar) üzerinden gelir; Arapça arayüzde düzen sağdan sola döner ama **İngilizce soru içeriği her zaman soldan sağadır**. Bu ayrım tüm bileşenlerde test edilir.

## 5 Beceri ve soru türüne göre tasarım

Her tür için: etkileşim, durumlar, kenar durumlar ve kabul testi.

### 5.1 Çoktan seçmeli (Grammar, Vocabulary, Reading, Listening)

- Tüm satır dokunma/tıklama hedefi, en az 44 pt yükseklik; seçenek metni asla kesilmez.
- Seçim yalnız renkle değil, harf rozeti + onay simgesi + VoiceOver "seçili" durumuyla anlatılır.
- Seçenek karıştırma sunucuda yapılır; istemci gelen sırayı korur, gönderdiği değer görüntülenen seçeneğe karşılık gelir. **Sözleşme testi:** her karıştırılmış sıra için gönderilen değer, puanlayıcının doğru kabul ettiği seçenekle eşleşir.
- Çoklu seçim (`multiSelect`): "2 seçenek seçin" sayacı; sınıra ulaşınca diğerleri devre dışı ve nedeni duyurulur.
- Kabul: 2–6 seçenek, 1 ve 300 karakter uzunluklar, büyük metinde, VoiceOver ve klavyeyle eşdeğer tamamlama.

### 5.2 Okuma

- Geniş ekranda metin solda, soru sağda; ikisi bağımsız kaydırılır ve aynı metne bağlı soru değişince metnin kaydırma konumu korunur.
- Satır uzunluğu 60–80 karakter; serif metin yazı tipi, ayarlanabilir boyut.
- Paragraf numaraları ("Paragraf 3'e göre…" soruları için) ve paragrafa atlama.
- Metin kopyalanamaz ve sözlük/çeviri menüsü kapatılır (sınav modunda), çünkü bunlar ölçülen beceriyi değiştirir.
- Kabul: 1.500 sözcüklük metin, iPad mini dikey ve Mac'te en dar pencere, en büyük yazı boyutu; kaydırma konumu soru geçişinde korunur.

### 5.3 Dinleme

Durum makinesi (sunucu politikasıyla):

```
hazır → [Dinle] → yükleniyor → çalıyor → bitti ─┐
            ↑                  │ hata            │ hak kaldıysa
            └──── yeniden dene ┘ (hak düşmez)    └→ hazır
```

- **Tekrar hakkı sunucuda.** `policy.maxPlays` sorudan gelir; her başlatma sunucuya bildirilir ve sunucu sayar. Uygulama yeniden açılınca hak sıfırlanmaz. Teknik hata (404, zaman aşımı, kesinti) hakkı tüketmez; bu da sunucuya bildirilir.
- Ses ilk çaldığı anda hak düşer, butona basınca değil.
- Önceden okuma süresi (politika varsa): "Soruları okumak için 30 saniyeniz var" sayacı, ardından otomatik başlama.
- Transkript, `ttsScript` ve cevap anahtarı istemciye hiç gelmez (bugün web bunu istemcide süzüyor; hedef sunucuda süzmek).
- Ses seviyesi kontrolü ve sınav öncesi hoparlör testi; Bluetooth kulaklık değişimi ve kesintide oynatma durur, hak tüketilmez.
- Görme engelli adaya sesli betimleme, işitme engelli aday için dinleme bölümünün **uyarlaması** (transkript değil, ayrı onaylı form) ölçme politikasıdır; arayüz bunu yalnızca politika söylerse açar.
- Kabul: çevrimdışı, yavaş ağ (3G profili), 404, yeniden açılış ve iki cihazdan aynı oturum senaryolarında hak sayımı sunucuyla tutarlı.

### 5.4 Boşluk doldurma (Grammar, Vocabulary, Listening cloze)

- Boşluklar metnin içinde, numaralı ve metin akışını bozmadan; her biri ayrı odak durağı, Tab ile sırayla.
- Kelime bankası varsa: **dokun → yerleştir** (önce kelime, sonra boşluk) birincil; sürükleme ikincil; klavyede Enter ile yerleştir. Yeniden kullanım (`reuse`) kapalıysa kullanılan kelime soluk ve devre dışı, geri alınabilir.
- Serbest yazımda: otomatik büyük harf, otomatik düzeltme ve tahmin klavyesi kapalı; Türkçe klavye ve Unicode (ör. kesme işareti varyantları) normalize edilir ve bu kural puanlayıcıyla aynıdır.
- Boş bırakılan boşluk göndermeden önce gösterilir ("2 boşluk boş"); izin verilip verilmediği politikadan.
- Kabul: 1–10 boşluk, satır sonuna düşen boşluk, en büyük yazı boyutu, ekran klavyesi açıkken gönder düğmesine erişim.

### 5.5 Sürükle-bırak ailesi (bugün native'de yok)

Dört alt tür; hepsi aynı üç giriş yöntemini eşdeğer destekler: **dokun-yerleştir, sürükle, klavye**. Sürükleme hiçbir zaman tek yol değildir (WCAG 2.5.7).

| Alt tür | Etkileşim | VoiceOver | Yanıt |
| --- | --- | --- | --- |
| Seçim | Kartları işaretle, sayaç | "Seçildi, 3'ten 2'si" | `{ kind: 'selection', selected: number[] }` |
| Eşleştirme | Sol satır → sağ hedef; çizgi veya rozetle bağlantı | Özel eylem: "Eşleştir…", hedef listesi | `{ kind: 'matching', mapping }` |
| Yerleştirme | Bankadan metin içi yuvaya | "Yuva 2: boş" / "Yuva 2: *went*" | `{ kind: 'placement', placements }` |
| Sıralama | Kartları sürükle veya yukarı/aşağı | Özel eylem: "Yukarı taşı", yeni konum duyurusu | `{ kind: 'ordering', order }` |

- Sürüklerken hedef bölgeler büyür ve vurgulanır; bırakma yeri her zaman öngörülebilir; geri al (⌘Z / sallama değil, görünür düğme).
- iPad'de Apple Pencil ve trackpad ile, Mac'te fare ile sürükleme; dokunma toleransı 44 pt.
- Başlangıç sırası sunucudan karıştırılmış gelir; istemci kendi karıştırmasını yapmaz (web'de `order` başlangıçta ters çevriliyor; bu sözleşmeye alınmalı).
- Kabul: her alt tür için golden fixture + puanlayıcı sözleşme testi; üç giriş yöntemiyle aynı yanıtın üretildiği eşdeğerlik testi; 2–8 öğe.

### 5.6 Yazma

- Editör: geniş, sakin yüzey; sözcük sayacı her zaman görünür; alt/üst sınır yaklaşırken uyarı, sınırın engel mi uyarı mı olduğu (`limitIsHard`) politikadan.
- Sınav modunda: otomatik düzeltme, yazım denetimi, tahmin, dikte ve Apple Intelligence yazma araçları kapalı (bunlar ölçülen beceriyi değiştirir). Yapıştırma politikası: varsayılan kapalı, kurum açabilir.
- Taslak her 5 sn ve her duraklamada şifreli olarak cihaza kaydedilir; uygulama kapanıp açılınca geri gelir; sunucu makbuzu gelince silinir.
- Görev ve kaynak metin editörün yanında (geniş ekran) veya üstünde katlanabilir panelde.
- Süre bitince yazılan metin gönderilir (politika varsayılanı) ve aday bunu sınavdan önce bilir.
- Kabul: 500 sözcük, Türkçe ve İngilizce klavye, donanım klavyesi, ekran klavyesi açıkken gönder düğmesi görünür, çökme sonrası taslak geri gelir.

### 5.7 Konuşma

Durum makinesi (sorudan gelen süreler):

```
yönerge → mikrofon hazır mı? → hazırlık (prepSeconds, geri sayım)
        → bip + kayıt (responseSeconds, seviye göstergesi, kalan süre)
        → otomatik bitiş veya "Bitir" → [dinle/yeniden kaydet: politika] → yükleniyor (%) → kaydedildi
```

- **Hazırlık ve cevap süreleri sorudan.** Bugünkü sabit 180 sn kaldırılır.
- Kayıt başlamadan mikrofon seviyesi kontrolü; 3 sn sessizlikte "Sizi duyamıyoruz" uyarısı (kaydı durdurmadan).
- Yeniden kayıt hakkı (`attempts`) politikadan; varsayılan 1 (yüksek riskli sınavlarda yeniden kayıt yok).
- Yükleme ilerlemesi ve makbuzu; makbuz gelmeden dosya silinmez; kesintide dosya şifreli kuyrukta bekler ve aynı kimlikle yeniden gönderilir (sunucu tekilleştirir).
- Kesinti (telefon, Siri, Bluetooth değişimi, arka plana geçiş): kayıt durur, alınan kısım korunur, adaya ne olduğu ve hakkının durumu söylenir.
- Kabul: fiziksel iPad ve Mac mikrofonu, izin reddi, kayıt sırasında arka plana geçiş, düşük bant genişliğinde 120 sn kaydın yüklenmesi.

### 5.8 Entegre görev (bugün native'de yok)

- Aşama çubuğu: *Oku → Dinle → Hazırlan → Yanıtla*; aday hangi aşamada olduğunu ve sonrakini görür.
- Her aşamanın süresi ve geri dönülebilirliği sunucudan (`stages`); okuma metni yanıt aşamasında açık kalabilir veya kalamaz, politika belirler.
- Yanıt aşaması yazılı (5.6) veya sözlü (5.7) bileşeni olduğu gibi kullanır; yeni bileşen yazılmaz.
- Kısmi teslim (ör. dinleme bitti, yanıt yok) durumu açıkça raporlanır.
- Kabul: Academia ve Specialized profilinde uçtan uca; aşama geçişinde kaynak ve taslak korunur.

## 6 Erişilebilirlik ve uyarlamalar

- **Kişisel ihtiyaç profili (QTI PNP benzeri).** Kurum, adaya onaylı uyarlamaları sunucuda atar: ek süre (×1,25 / ×1,5 / ×2), büyük metin, yüksek kontrast, satır odak, mola hakkı, ekran okuyucu modu. Uygulama profili okur; aday kendi kendine ölçmeyi değiştiren bir uyarlama açamaz.
- **Hangi destek hangi beceride serbest:** metin seslendirme yönergelerde serbest, okuma metninde yasak (okumayı dinlemeye çevirir). Sözlük hiçbir bölümde yok. Bu tablo ölçme uzmanınca onaylanıp politikaya yazılır.
- **Ekran okuyucu senaryoları** her tür için yazılı test olarak tutulur (Accessibility Inspector + VoiceOver elle doğrulama); sürükle-bırak için özel eylemler.
- **Hareket ve dikkat:** azaltılmış harekette tüm geçişler anında; sınav sırasında kutlama, rozet, konfeti yok (çocuk profilleri dahil).
- **Renk:** hiçbir bilgi yalnız renkle verilmez; seçim, hata, süre uyarısı simge + metinle de anlatılır.

## 7 Ölçme güvenceleri

- **Mod eşdeğerliği.** Pilotta aynı soru web, iPad ve Mac'te; soru düzeyinde Mantel-Haenszel DIF (`batch-dif-detection.ts`) cihaz/mod değişkeniyle çalıştırılır. Anlamlı DIF gösteren etkileşim türü düzeltilene kadar o cihazda kullanılmaz.
- **Yanıt süresi.** `latencyMs` soru görünür olduğu andan gönderime kadar ölçülür; uygulama arka plandayken geçen süre ayrıca işaretlenir. `person-fit` ve hızlı-tahmin analizleri bu veriye dayanır.
- **İstemci puanlamaz.** Doğru cevap, transkript, rubrik istemciye gelmez; sunucuda süzülür.
- **Sabit form ve uyarlanabilir akış ayrı.** Geri dönme, işaretleme ve gözden geçirme yalnızca sabit formda (`navigation: 'review'`).

## 8 Kalite mühendisliği

| Katman | Ne test edilir | Araç |
| --- | --- | --- |
| Sözleşme | Her `TaskSpec.kind` için `metadata → TaskSpec` dönüşümü ve `ResponseCodec → puanlayıcı` | Jest + backend vitest, paylaşılan golden fixture'lar |
| Bileşen | Her durum (boş, kısmi, tam, hata, devre dışı), her giriş yöntemi | React Native Testing Library |
| Görsel | iPad mini dikey → 13" yatay, Mac en dar/en geniş pencere, en küçük/en büyük yazı, tr/en/ar | Görsel regresyon anlık görüntüleri |
| Erişilebilirlik | Etiket, rol, durum, odak sırası, kontrast | Otomatik denetim + VoiceOver betikleri |
| Uçtan uca | Her profil için tam sınav, gerçek veritabanı | Mevcut `live-smoke`, `real-database-smoke` genişletilerek |
| Hata | Ağ kesintisi, makbuz kaybı, süre bitişi, izin reddi, arka plan | Mevcut `fault-server.mjs` |
| Saha | Gerçek adaylarla, yaş gruplarına göre | Kullanılabilirlik pilotu (bölüm 9, aşama 6) |

**Bankanın tamamı her yayında taranır:** 3.020 sorunun hepsi `TaskSpec`'e dönüştürülür, iki istemcide çizilir, anlık görüntüsü alınır. Çizilemeyen tek soru yayını durdurur.

## 9 Aşamalı plan

Varsayım: 2 React Native geliştirici, 1 backend geliştirici, 1 QA; tasarım ve ölçme uzmanı yarı zamanlı. Süreler tahmindir; kapasite değişirse yeniden hesaplanır.

| Aşama | Süre | Teslim | Çıkış koşulu |
| --- | --- | --- | --- |
| **0 Envanter ve sözleşme** | 1 hafta | `TaskSpec v1` şeması; `metadata → TaskSpec` dönüştürücüsü; bankanın tamamı için çizilebilirlik raporu; süre alanı çakışmalarının listesi | Her ACTIVE sorunun `kind`'ı belli; dönüşmeyenler içerik ekibine atanmış |
| **1 Sınav kabuğu** | 2 hafta | `ExamShell`, durum dili, sunucu süresi ve uyarıları, klavye haritası, araç çubuğu iskeleti, i18n/RTL ayrımı | Mevcut 4 tür yeni kabukta; VoiceOver ve klavyeyle girişten sonuca bağımsız tamamlama |
| **2 Dinleme ve konuşma** | 2 hafta | Sunucu tarafı dinleme hakkı (backend); dinleme durum makinesi; konuşma hazırlık–kayıt makinesi, soru bazlı süre, yükleme makbuzu ve kuyruk | Yeniden açılışta hak korunuyor; teknik hata hakkı tüketmiyor; sabit 180 sn kalktı |
| **3 Yapılandırılmış etkileşimler** | 2–3 hafta | Sürükle-bırak dört alt tür, kelime bankalı boşluk, üç giriş yöntemi | Her alt tür golden fixture + puanlayıcı testi; üç yöntemle eşdeğer yanıt |
| **4 Yazma ve entegre görev** | 2 hafta | Şifreli taslak, sınav modunda yazım araçları kapalı, aşamalı entegre oynatıcı | Çökme sonrası taslak geri geliyor; entegre görev Academia/Specialized'da uçtan uca |
| **5 Araçlar ve uyarlamalar** | 1–2 hafta | Vurgulayıcı, satır odak, yazı boyutu, kontrast, ek süre, PNP okuma | Ölçme uzmanı onaylı destek tablosu politikada; her uyarlama her türde test edildi |
| **6 Pilot ve mod eşdeğerliği** | 3–4 hafta (aşama 4'ten itibaren paralel) | Hedef yaş gruplarıyla kullanılabilirlik çalışması; web/iPad/Mac DIF analizi; performans ölçümü | Bölüm 1'deki tüm kabul ölçütleri ölçülmüş ve sağlanmış |

Toplam yaklaşık **13–16 hafta**. Aşama 2'deki sunucu tarafı dinleme hakkı ve aşama 0'daki içerik düzeltmeleri kritik yoldadır.

## 10 Sizin kararınız gereken konular

Bunlar teknik değil ölçme ve ürün kararlarıdır; plan varsayılanları önerir, kesinleştirmeyi siz veya ölçme uzmanı yapar.

1. **Konuşmada yeniden kayıt:** varsayılan öneri 1 deneme (yeniden kayıt yok). Pratik modunda serbest.
2. **Dinleme tekrarı:** profil bazında mı (ör. Primary 2, Academia 1) yoksa soru bazında mı?
3. **Yazmada sözcük sınırı:** üst sınır engel mi, uyarı mı? Alt sınırın altında gönderim serbest mi?
4. **Yazmada yapıştırma:** varsayılan kapalı öneriliyor; kurumlar açabilsin mi?
5. **Okuma araçları:** vurgulayıcı ve not defteri hangi profillerde açık?
6. **Uyarlanabilir sınavda geri dönüş:** önerilen: yok (motorun varsayımı bu). Onaylıyor musunuz?
7. **Android:** aynı plana dahil mi, iPad/Mac sonrası mı?

## 11 İlk sprint (aşama 0) iş listesi

1. `TaskSpec v1` Zod şemasını `src/lib/security/schemas/` altında yaz; web ve native aynı paketi kullanacak şekilde dışa aktar.
2. `metadata → TaskSpec` dönüştürücüsünü sunucuda yaz; mevcut `ItemRenderer`/`StructuredResponse`/`responseMode` sezgilerini tek yere taşı.
3. `scripts/verify-renderability.ts`: 3.020 sorunun hepsini dönüştür; tür dağılımı, dönüşmeyenler ve `RESPONSE_LIMIT_CONFLICT` listesini rapora yaz (`reports/renderability.md`).
4. Her `kind` için en az 3 golden fixture (kolay, kenar durum, en büyük) ve puanlayıcı sözleşme testleri.
5. Dinleme hakkı için backend tasarımı: `POST /api/sessions/:id/items/:itemId/plays` (başlat, bitti, teknik hata), oturuma bağlı sayaç.
6. Bölüm 10'daki 7 kararı ölçme uzmanıyla kapat ve politikaya yaz.
