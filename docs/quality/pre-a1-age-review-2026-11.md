# PRE_A1 ön deneme soruları — yaş uygunluğu incelemesi (22 Kasım 2026)

`npm run report:pretest-progress` 68 ön deneme sorusunun hiçbir ürün hattında sunulamadığını gösterdi. Bu sorular hiç yanıt toplayamıyor ve kalibre edilemiyor. Bu belge, 66'sının 7–10 yaş (Primary) için incelenmesini kaydeder. Kalan 2 soru C2 seviyesinde; onların sorunu yaşla değil ürün ve seviye eşleşmesiyle ilgili, aşağıda ayrıca not edildi.

Uygulama: `scripts/jobs/apply-pre-a1-age-review.ts`. Varsayılan olarak kuru çalışır; `--apply` ile tek bir transaction içinde yazar. Her değişiklik eski değerleri `metadata.ageReview.previous` altında saklar, böylece geri alınabilir.

## Neden sunulamıyorlardı?

- PRE_A1'i kapsayan tek ürün hattı Primary (7-10).
- Primary yalnızca kendi kaynağından (`primary` etiketi ya da `content.productLine`) gelen soruları alır. Genel havuza erişimi (`generalCoreAccess`) yoktur.
- Bu 64 soru `source:aig-expansion-2025` partisinden geliyor. `primary` etiketleri yok ve yaş alanları `UNIVERSAL` (bir kelime sorusunda `ADULT`).
- Sonuç: yaş alanı ne olursa olsun, Primary sorusu olarak işaretlenmedikçe hiçbir sınava giremezler.

## Karar ölçütleri

- **Onay (APPROVE).** Konu ve görsel 7–10 yaş için uygun, soru cevaplanabilir, tek doğru cevap var, örnek dil doğru.
  - `primary` etiketi eklenir ve yaş alanı `YOUNG_LEARNER` yapılır. Durum değişmez (PRETEST ya da ACTIVE + ön deneme), soru Primary oturumlarında puansız yer almaya başlar.
- **Revizyon (REVISE).** Soru bu hâliyle kullanılamaz.
  - Durum `REVIEW` yapılır ve gerekçe kaydedilir. Soru ön deneme havuzundan çıkar ve editoryal kuyrukta görünür.

## Sonuç: 53 onay, 13 revizyon

| Beceri | Onay | Revizyon | Not |
|---|---:|---:|---|
| Dilbilgisi | 43 | 1 | Aile, evcil hayvan, oyuncak ve ev konuları uygun. Biri birebir tekrar ("This ___ a pen."). |
| Konuşma | 6 | 11 | Aşağıdaki tabloya bakın. |
| Okuma | 2 | 1 | "What is green?" sorusunun iki savunulabilir cevabı var (park ve ağaçlar). |
| Kelime | 2 | 0 | Biri yazım düzeltmesiyle onaylandı. |

Onaylanan iki soruda küçük dil düzeltmesi yapılır:
- **Konuşma:** "Imagine you are at a new class." → "Imagine you are in a new class."
- **Kelime (`VOC-PA1-0015`):** "I sit on a ___. at school." → "I sit on a ___ at school."

### Revizyona giden konuşma soruları

| Soru | Gerekçe |
|---|---|
| `…jkcqhruy` | "What is this?" soruyor ama resim yok |
| `…kwetwqp0` | "What do you see?" soruyor ama resim yok |
| `…4gzoqgzw` | "Gördüğün" yiyecek ve içecekleri soruyor ama resim yok |
| `…00os49ux` | Arkadaşın gösterdiği resimlerden söz ediyor, resim yok |
| `…nt4rap4y` | İki resimden (şehir, kır) söz ediyor, resim yok |
| `…0ei66ayr` | "Which one do you like?" soruyor, seçilecek bir şey yok |
| `…yl3vg3eu` | Arkadaşın parkla ilgili soru soracağını söylüyor, sorular yok |
| `…jq5giaus` | Çocuklara bozuk İngilizce örnek veriyor ("What you like?") |
| `…fps3ymjw` | Resim, yetişkin masası stok fotoğrafı (kahve fincanı yanında not yazan el); çocuklara yönelik değil |
| `…fya8nqkw` | Aynı yetişkin masası fotoğrafı |
| `…u9srskv7` | Soru "bu kişi resim çiziyor" diyor, fotoğrafta yazı yazan biri var |

Bu üç resimli soru aynı görsel dosyasını kullanıyor (`1c76f89884fefb8b.jpg`).

## Kalite notu: dilbilgisi tekrarı

Onaylanan 43 dilbilgisi sorusunun büyük kısmı aynı hedefi ölçüyor: "This/He/She ___ a …" kalıbında `is`. Primary'deki PRE_A1 dilbilgisi ön deneme gösteriminin çoğu bu yakın sorulara gidecek.

- Kalibrasyon hızı için ilk turda bir alt küme seçilip gerisinin bekletilmesi düşünülebilir.
- Uzun vadede `am`/`are`, iyelik sıfatları ve çoğul gibi hedeflerle çeşitlendirmek gerekir.

## Kapsam dışı: 2 C2 sorusu

`SPK-C2-0009` (konuşma) ve `WRT-C2-0010` (yazma) yetişkin içerikli. `language-schools` etiketliler, ancak Language Schools profilinin CEFR aralığı C2'yi kapsamıyor. C2'yi kapsayan Academia ve Specialized ise bu etiketi kabul etmiyor. Bu ikisi için ürün ve seviye kararı gerekiyor; bu incelemede değiştirilmediler.
