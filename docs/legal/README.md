# Hukuki metin taslakları (E2)

2 Kasım 2026. App Store yayın engeli **E2** için ([APP_STORE_RELEASE_ROADMAP.md](../../native/react-native/APP_STORE_RELEASE_ROADMAP.md)). **Hiçbiri yayımlanmadı ve hukuki inceleme görmedi.** Metinler koddaki gerçek davranıştan yazıldı; bilinmeyenler işaretli.

| Dosya | İçerik | Yayın adresi (hedef) |
| --- | --- | --- |
| [PRIVACY_POLICY.tr.md](PRIVACY_POLICY.tr.md) | Gizlilik politikası + KVKK aydınlatma metni | `b4skills.com/privacy` |
| [PRIVACY_POLICY.en.md](PRIVACY_POLICY.en.md) | İngilizce gizlilik politikası (App Store Connect'teki Privacy Policy URL) | `b4skills.com/en/privacy` veya dil seçimli aynı sayfa |
| [TERMS.tr.md](TERMS.tr.md) | Kullanım koşulları (İngilizcesi onaydan sonra) | `b4skills.com/terms` |
| [SUPPORT.md](SUPPORT.md) | Destek sayfası, tr + en | `b4skills.com/support` |

Arapça çeviriler, uygulama Arapça arayüz sunduğu için onaydan sonra eklenmeli.

## Senin doldurman gerekenler (`[[DOLDUR]]`)

1. Şirketin tam ticari unvanı, açık adresi, MERSİS/vergi numarası.
2. Gizlilik e-postası (`privacy@b4skills.com` gerçekten çalışıyor mu?) ve destek yanıt süresi.
3. Barındırma bölgeleri: Render, Supabase, AWS S3 (Avrupa mı, ABD mi?).
4. AI sağlayıcıları (Gemini, OpenAI, Anthropic): veri işleme sözleşmesi, eğitimde kullanmama ayarı, sağlayıcı tarafında saklama süresi.
5. Yurt dışı aktarım dayanağı: KVKK standart sözleşmeleri ve Kurul'a bildirim; AB için SCC.
6. Stripe, Resend, Sentry için bölge ve Sentry saklama süresi.
7. Vergi kayıtları için saklama süresinin doğrulanması.
8. Bireysel satın alımlarda cayma hakkı ve iade kuralı; itiraz yolu ve süresi; yetkili mahkeme.
9. Web'de hesap silme yolu (web arayüzünde düğme henüz yok; sunucu ucu PR #78'de hazır).

## Karar gerekenler (`[[KARAR]]`)

| Karar | Neden önemli | Koddaki durum |
| --- | --- | --- |
| Başlangıç fotoğrafı kimlik doğrulamada kullanılacak mı? | Kullanılırsa biyometrik/özel nitelikli veri değerlendirmesi ve açık rıza gerekebilir | Bugün yalnız saklanıyor ve kuruma gösteriliyor; eşleştirme yok |
| Çocuklar: Seçenek A (native'de 13 yaş altı yok) mı, B (veli onayı) mı? | App Store 1.3/5.1.4, KVKK, COPPA | Yaş sorulmuyor, veli onayı akışı yok |
| Hesap silmede yazılı yanıtlar da silinsin mi? | Kimliksiz bile kişisel bilgi içerebilir | Bugün kimliksiz kalıyor |
| Blokzincir sertifika kaydı (Polygon) açık mı? | Zincire yazılan özet silinemez | `BLOCKCHAIN_ENABLED` ile isteğe bağlı |
| AB'de hizmet: AB temsilcisi, veri koruma görevlisi | GDPR md. 27/37 | — |
| App Store'da özel EULA mı, Apple standart EULA'sı mı? | App Store Connect alanı | — |
| Sorumluluk üst sınırı | Koşullar | — |

## Verilen kararlar — saklama süreleri (2 Kasım 2026)

| Veri | Süre | Süre sonunda |
| --- | --- | --- |
| Sınav yanıtları ve sonuçları | Sınav tarihinden 2 yıl (sertifika geçerliliğiyle aynı) | Kimlik ayrılır, yalnız anonim kalır |
| Konuşma ses kayıtları | 30 gün | Ses silinir; puan ve AI geri bildirimi kalır (döküm zaten saklanmıyor: `scoring-queue.ts`) |
| Kamera fotoğrafları (web kareleri, web kimlik fotoğrafı, iPad/Mac başlangıç fotoğrafı) | 7 gün; kurum en fazla 30 güne çıkarabilir | Silinir |

Bu süreler politikaya ve koşullara işlendi. Uygulayan iş PR #82'de (`npm run job -- data-retention`; varsayılan kuru çalıştırma, `RETENTION_APPLY=1` uygular). Süreler tek kaynakta: `src/lib/compliance/retention-policy.ts`. Açık inceleme görevi olan seste kural: görev kapanana kadar bekle, en geç 60 gün.

Canlıya almadan önce:

1. PR #78, ardından #82 birleşsin.
2. Üretimde kuru çalıştırma yapılıp sayılar incelensin. İlk gerçek koşu 2 yıldan eski tüm oturumları kimliksizleştirir ve 30 günden eski tüm sesleri siler.
3. İş haftalık takvime (GitHub Actions veya cron) bağlansın; bu henüz yapılmadı.

**Risk:** 30 günlük ses süresi, insan puanlama kuyruğu veya itirazlar 30 günü aşarsa sesin incelemeden önce silinmesine yol açabilir. Kuyruğun gerçek bekleme süresi ölçülmeli.

## Koddan doğrulananlar (metnin dayanağı)

- Kamera: yüz sayımı cihazda; tek yüz görününce başlangıç fotoğrafı otomatik çekilip gönderiliyor (`native/react-native/src/proctoring/useExamMonitor.ts`); web'de olay anında kamera karesi (`/api/proctoring/screenshot`); gözetim kurum kapatmadıkça açık (`src/lib/proctoring/native-evidence.ts`, varsayılan `enabled: true, retentionDays: 7`).
- Ses: konuşma yanıtı yanıt kaydının içinde base64 olarak tutuluyor; puanlama için AI sağlayıcısına gidiyor.
- Hizmet sağlayıcılar: ortam değişkenlerinden (Render, Supabase, AWS, Gemini, OpenAI, Anthropic, Stripe, Resend, Sentry, Redis).
- Sentry: `sendDefaultPii: false`; web'de yalnız hata anında, metin ve medya maskeli oturum kaydı (`src/main.tsx`).
- Hesap silme kapsamı: `src/lib/compliance/account-deletion.ts` (PR #78).
- Çerezler: `accessToken`, `refreshToken` (httpOnly). Başka çerez veya analitik **taranmadı**.

## Yayın için kalan teknik iş

0. iPad/Mac'te "Hesabımı sil" bugün yalnız Çıkış yap penceresinin içinde. Apple incelemesinde bulunması kolay olsun diye ayrı bir "Hesap" girişi düşünülmeli.

1. Onaylanan metinleri web'de `/privacy`, `/terms`, `/support` sayfaları olarak yayımlamak (bugün altbilgide `mailto:` bağlantıları var: `src/components/SiteFooter.tsx`).
2. iPad/Mac uygulamasında giriş ekranına ve Hesap sayfasına bu bağlantıları eklemek.
3. App Store Connect: Privacy Policy URL, Support URL; App Privacy formunu bu metinle tutarlı doldurmak.
4. Saklama kararları verildikten sonra süreleri koda bağlamak (silme işleri).
