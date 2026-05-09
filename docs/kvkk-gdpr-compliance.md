# KVKK & GDPR Veri Koruma Uyumluluk Belgesi

**Belge Versiyonu:** 1.0  
**Son Güncelleme:** 2026-05-09  
**Veri Sorumlusu:** B4Skills (b4skills platformunu işleten tüzel kişi)  
**İlgili Mevzuat:** 6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) · AB GDPR (2016/679) · Children's Online Privacy Protection Act (COPPA, 13 yaş altı kullanıcılar için)

---

## 1. Kapsam ve Amaç

Bu belge, B4Skills adaptif İngilizce değerlendirme platformunda işlenen kişisel verilerin KVKK ve GDPR kapsamındaki varlık envanterini, işleme amaçlarını, dayanaklarını ve teknik/idari tedbirleri tanımlar. Platform; bireysel kullanıcılara, kurumsal müşterilere (B2B) ve öğrencilere (B2C) hizmet vermektedir.

---

## 2. Kişisel Veri Envanteri (VERBIS Kategorileri)

| Kategori | Veri Türü | Kişiler | İşleme Amacı | Hukuki Dayanak |
|---|---|---|---|---|
| **Kimlik** | Ad, soyad, e-posta | Kullanıcı, Öğrenci | Hesap oluşturma, kimlik doğrulama | KVKK m.5/2(c) – sözleşmenin ifası |
| **Kimlik (Hassas)** | Yaş / doğum yılı | Öğrenci | COPPA uyumu, yaş grubuna uygun içerik | KVKK m.6 + açık rıza |
| **Değerlendirme** | Sınav yanıtları, ses kayıtları, puan, CEFR seviyesi | Öğrenci | Adaptif test ve yeterlik ölçümü | Sözleşmenin ifası |
| **Biyometrik (Ses)** | Konuşma ses dosyaları (WAV/MP3) | Öğrenci | Yapay zeka ile konuşma puanlama (Whisper ASR) | Açık rıza (KVKK m.6/2) |
| **Davranışsal** | Yanıt süresi (latencyMs), oturum meta-verisi | Öğrenci | RT-IRT modeli; hile/kopya tespiti | Meşru menfaat (KVKK m.5/2(f)) |
| **Teknik** | IP adresi, tarayıcı parmak izi, User-Agent | Kullanıcı | Güvenlik, hile önleme | Meşru menfaat |
| **Kurumsal** | Organizasyon adı, faturalandırma bilgisi | Kurum Admini | Sözleşme yönetimi | Sözleşmenin ifası |
| **Finansal** | Stripe ödeme meta-verisi (kart son 4 hane) | Kullanıcı | Abonelik yönetimi | Yasal yükümlülük |

> **Not:** Ses kayıtları ve davranışsal veriler KVKK m.6 kapsamında özel nitelikli kişisel veri sayılabilir; bu veriler için açık, bilgilendirici ve tek amaçlı rıza alınır.

---

## 3. Veri Saklama Süreleri

| Veri Kategorisi | Saklama Süresi | Silme/Anonimleştirme Tetikleyicisi |
|---|---|---|
| Hesap bilgileri | Hesap silinene kadar + 3 yıl | Kullanıcı silme talebi (GDPR Art.17 / KVKK m.11) |
| Sınav oturumları ve yanıtlar | 5 yıl | Saklama süresi sonu otomatik silme |
| Ses kayıtları | 90 gün (puanlama sonrası) | Puanlama tamamlandıktan 90 gün sonra |
| Yanıt süresi verileri | 2 yıl | Saklama süresi sonu otomatik silme |
| IP adresi / teknik günlükler | 1 yıl | Rolling log rotation |
| Stripe ödeme meta-verisi | 7 yıl | Vergi mevzuatı zorunluluğu |
| IRT kalibrasyonu için anonimleştirilmiş test verisi | Süresiz | Geri bağlanamaz anonimleştirme sonrası |

---

## 4. Teknik Güvenlik Tedbirleri

### 4.1 Şifreleme
- **Aktarımda:** TLS 1.3 (tüm API uç noktaları, Helmet.js ile zorunlu kılınmıştır)
- **Durağan halde:** Veritabanı disk şifreleme (PostgreSQL + AES-256 — host sağlayıcı seviyesi)
- **Parolalar:** bcrypt (cost=12) ile hash

### 4.2 Erişim Kontrolü
- JWT tabanlı kimlik doğrulama (`jsonwebtoken`, HS256/RS256)
- Rol tabanlı yetkilendirme: `SUPER_ADMIN`, `ORG_ADMIN`, `ASSESSMENT_DIRECTOR`, `CONTENT_ADMIN`, `PROCTORING_OFFICER`, `STUDENT`
- Çok kiracılı mimari: her sorgu `organizationId` filtresi ile çalışır; kiracı çapraz erişimi mümkün değildir

### 4.3 Denetim İzi
- Sınav oturumu her yanıt adımında kayıt altına alınır (`Response` tablosu)
- Yönetici işlemleri Sentry ile izlenir
- Madde emekli işlemleri `RetirementAuditLog` tablosunda saklanır

### 4.4 Veri Minimizasyonu
- Öğrencilere sunulan API yanıtları yalnızca gerekli alanları içerir
- Ses dosyaları puanlama servisi dışındaki bileşenlerle paylaşılmaz
- RT-IRT için saklanan `latencyMs` kişiyle ilişkilendirilemez biçimde toplanabilir

---

## 5. İlgili Kişi Hakları (KVKK m.11 / GDPR Art.15-22)

Platform, aşağıdaki hakları desteklemektedir:

| Hak | Uygulama Yöntemi | Yanıt Süresi |
|---|---|---|
| Bilgi edinme / erişim | `GET /api/gdpr/export` (JSON export) | 30 gün |
| Düzeltme | Hesap ayarları sayfası veya destek talebi | 15 iş günü |
| Silme ("unutulma hakkı") | `POST /api/gdpr/delete-account` | 30 gün |
| Kısıtlama | Destek talebi | 30 gün |
| Veri taşınabilirliği | JSON export (standart format) | 30 gün |
| İtiraz | Destek talebi + DPO incelemesi | 30 gün |

> **Teknik Uygulama:** `src/lib/compliance/gdpr-data-service.ts` modülü tüm kişisel veri dışa aktarma, anonimleştirme ve silme işlemlerini yönetir.

---

## 6. Veri İşleyenler (Alt İşleyiciler)

| İşleyici | Hizmet | Veri Kategorisi | Sözleşme |
|---|---|---|---|
| **Google Cloud (Gemini API)** | Yapay zeka puanlama | Öğrenci yanıt metni | Google DPA + SCCs |
| **Google Cloud (Text-to-Speech)** | Soru sesi üretme | Yalnızca soru metni (kişisel veri yok) | Google DPA |
| **Stripe** | Ödeme işleme | Finansal meta-veri | Stripe DPA |
| **Sentry** | Hata izleme | Hata yığın izleri, IP | Sentry DPA |
| **Fly.io / Render** | Barındırma | Tüm kategoriler | SOC2 Type II + DPA |
| **Redis (ioredis)** | Oturum önbelleği | JWT payload, oturum durumu | Self-hosted veya barındırma DPA |

---

## 7. Uluslararası Veri Transferleri

Google Gemini API ve Sentry için veriler AB/Türkiye dışına aktarılabilir. Bu transferler:
- AB–ABD Veri Gizliliği Çerçevesi (DPF) kapsamında veya
- Standart Sözleşme Maddeleri (SCCs, 2021 versiyonu) aracılığıyla

gerçekleştirilmektedir. Gemini puanlama istekleri, minimum gerekli metin ile gerçekleştirilir; öğrenci kimlik bilgileri dahil edilmez.

---

## 8. Ses Verisi ve Biyometrik Veri Özel Hükümleri

Konuşma değerlendirmesi sırasında:
1. Kullanıcıya açık bir rıza ekranı gösterilir (Türkçe ve İngilizce)
2. Ses kaydı yalnızca sunucuya şifreli aktarım ile gönderilir
3. Konuşma metni (Whisper ASR transkripti) ile birlikte saklanır
4. 90 gün sonra ses dosyası silinir; anonimleştirilmiş puan veri analizi için tutulabilir
5. Kullanıcı rızasını geri çekebilir; bu durumda henüz silinmemiş ses kayıtları 7 iş günü içinde kaldırılır

---

## 9. Çocuk Verisi (COPPA / KVKK m.9)

Platform, 7–18 yaş arası öğrencilere hizmet verebilir. 13 yaşın altındaki kullanıcılar için:
- Ebeveyn/vasi onayı gereklidir (kurumsal sözleşme aracılığıyla veya bireysel kayıt formunda)
- Reklamcılık amacıyla hiçbir veri işlenmez
- Profil oluşturma devre dışıdır

---

## 10. Veri Koruma Görevlisi (DPO) ve İletişim

| Rol | İletişim |
|---|---|
| Veri Sorumlusu | [şirket e-posta adresi] |
| Veri Koruma Görevlisi (DPO) | dpo@[domain] |
| KVKK Başvurusu | kvkk@[domain] veya posta yoluyla |
| GDPR Başvurusu | gdpr@[domain] |

Veri sahibi başvuruları platform üzerinden (`/ayarlar/gizlilik`) veya e-posta ile yapılabilir. Başvurular kimlik doğrulamasının ardından işleme alınır.

---

## 11. Veri İhlali Bildirim Prosedürü

1. **Tespit:** Sentry alarmı veya manuel tespitte güvenlik ekibi uyarılır
2. **72 saat:** KVKK'ya (ve GDPR kapsamında ilgili DPA'ya) bildirim
3. **İlgili kişi bildirimi:** Yüksek risk içeren ihlallerde etkilenen kullanıcılara e-posta
4. **Olay kaydı:** Tüm ihlaller `security-incidents` tablosunda belgelenir

---

## 12. Teknik Uygulamalara Referanslar

| Modül | Dosya | Açıklama |
|---|---|---|
| GDPR Veri Servisi | `src/lib/compliance/gdpr-data-service.ts` | Export, silme, anonimleştirme |
| Skor Bütünlüğü | `src/lib/scoring/response-integrity.ts` | Veri minimizasyonu — yalnızca anlamlı veri saklanır |
| Fraud Tespiti | `src/lib/ai/fraud-detection.ts` | Davranışsal analiz (meşru menfaat) |
| Maruz Kalma Deposu | `src/lib/assessment-engine/exposure-store.ts` | Test istatistikleri — kişisel veri içermez |
| Whisper ASR Yedek | `src/lib/ai/asr-fallback.ts` | Ses → metin dönüşümü |

---

## 13. Gözden Geçirme Takvimi

Bu belge her 12 ayda bir veya aşağıdaki durumlarda gözden geçirilir:
- Yeni bir kişisel veri kategorisi işlemeye başlandığında
- Yeni bir alt işleyici eklediğinde
- KVKK/GDPR mevzuatında değişiklik olduğunda
- Ciddi bir veri ihlali yaşandığında

**Sonraki Planlı Gözden Geçirme:** 2027-05-09
