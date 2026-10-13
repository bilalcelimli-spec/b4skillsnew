# Sürüme bağlı soru inceleme sözleşmesi

13 Ekim 2026. Bu sözleşme uzmanların soru içeriğini incelemesine aittir; öğrencilerin writing/speaking puanlanması veya CEFR geçerlik çalışması değildir.

## Kayıt ve gönderim

`GET /api/items?stage=...` her soru için `version`, `pipelineStage` ve `reviewContentHash` döndürür. İstemci gördüğü üç değeri `POST /api/items/:id/review` gövdesinde `expectedVersion`, `expectedStage`, `expectedContentHash` olarak gönderir. Alanlar zorunludur; eski açık istemciler yenilenmelidir. `reviewType` LANGUAGE_REVIEW, CEFR_REVIEW, FAIRNESS_REVIEW veya MODERATION olmalıdır.

Boyutlar 0–100 tamsayıdır; sıfır geçerlidir. Uygulanmayan boyutlar null/eksik olabilir. `cefrFitLabel`: BELOW_TARGET, TARGET_FIT, ABOVE_TARGET, UNCERTAIN veya null. `notes` ve `stageTarget` null olabilir; revizyon/reddetme kararında hedef null/eksik olmalıdır. APPROVE hedefi geçerli sonraki aşamaya eşit olmalıdır.

Sunucu incelemeciyi oturumdaki kullanıcıdan alır; istemciden reviewerId kabul etmez. Soru satırı kilitlenip sürüm, özet ve aşama yeniden kontrol edilir. Uyuşmazlık 409 döndürür ve kayıt/aşama değişikliği oluşturmaz. Kayıt ve aşama geçişi aynı transaction içindedir; aşama yazımı hata verirse inceleme kaydı da geri alınır. Tekrarlanan bir ilerletme isteği iki aşama ilerletemez.

## İçerik özeti

SHA-256 girdisi `b4skills-item-review-v1` şema adı, soru türü, beceri, CEFR etiketi, content, tags, construct, subskill, descriptorRef, evidenceStatement, ageSuitability, culturalLoad, englishVariant, register, genre, topic, provenance ve securityClass alanlarıdır. Nesne anahtarları sıralanır; dizi sırası korunur. Eksik bağlam alanları null, eksik tags boş dizi olarak normalleştirilir. Sürüm ayrıca karşılaştırılır; aynı içerikli yeni sürüm eski sürüm onayı sayılmaz.

Özet ses/görsel URL'lerini content içinde kapsar; uzak medya dosyasının gerçek byte içeriğini doğrulamaz. Gerçek sesin insan tarafından dinlenmesi, kullanım hakkı, uzman niteliği, bağımsızlık, pilot ve kalibrasyon kanıtları ayrıca gerekir.

## Yetki ve aşamalar

- LANGUAGE_REVIEWER: dil incelemesi.
- CEFR_REVIEWER: CEFR incelemesi.
- MODERATOR: fairness ve moderation incelemesi.
- SUPER_ADMIN, ASSESSMENT_DIRECTOR, CONTENT_ADMIN: bu incelemelerde yönetici yetkisi.
- ITEM_WRITER: uzman onayı vermez; EDITING aşamasındaki revizyonu LANGUAGE_REVIEW aşamasına yeniden gönderir. LIVE veya başka bir aşama gönderimi 403; aynı revizyonu tekrar ilerletme 409 alır.

İnceleme yolu taslak/editing → dil → CEFR → fairness → moderation → APPROVED_FOR_PILOT sırasını uygular. Revizyon EDITING'e, ret FLAGGED'a döner. Bu yol soruyu ACTIVE yapmaz, pilot/kalibrasyon sonucu üretmez. Yetkili yöneticilerin ayrı pipeline işlemleri bu sözleşmedeki uzman onaylarının yerine kanıt sayılmaz; tüm yayın/aktivasyon yollarının tek yayın kapısında birleştirilmesi ayrı iştir.

## Geçmiş ve denetim

Migration `010_item_review_snapshot`, ItemReview'a nullable itemVersion/contentHash alanlarını ekler. Mevcut kayıtların sürümü/özeti geriye dönük doldurulmaz; geçmiş boyut puanları yeniden ölçeklenmez. Yeni sunucu bu kolonları kullanmadan önce migration uygulanmalıdır. Uygulamanın mevcut migration dağıtım yolu kullanılır; bu çalışma canlı veritabanına migration uygulamaz.

Salt okunur `audit:item-evidence` raporu 1.1 sözleşmesinde `reviewContentHash` üretir. İki farklı kullanıcıdan güncel sürüm/özet için onay aranır. Aynı kişinin tekrarları ikinci uzman sayılmaz. İncelemeci ve inceleme türü başına en son karar kullanılır; güncel bir revizyon/ret itirazı ayrıca işaretlenir. Bu teknik kontrol gerçek uzman bağımsızlığı veya onaylanmış psikometrik geçerlik iddiası değildir. Audit kararı bu kayıtlarla otomatik yayın onayına dönüşmez.
