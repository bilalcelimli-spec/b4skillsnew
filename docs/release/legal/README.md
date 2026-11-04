# B4Skills sözleşme ve veri aktarımı dosyası

4 Kasım 2026 · Sürüm 1 · Hazırlanmış çalışma ve müzakere belgeleri; imzalanmış sözleşme veya tamamlanmış aktarım bildirimi değildir.

Bu dosya B4Skills'in kurumlara sunduğu İngilizce değerlendirme hizmetinin veri işleme, saklama, silme ve yurt dışı aktarım hazırlığını bir araya getirir. Kodun hazırlanması ile üretimde devreye alınması ayrı durumlardır. Sağlayıcıların kullanıcı hesabına uygulanan sözleşme ve bölge ayarları görülmeden tamamlandığı yazılmaz.

Güncel hesap ve test durumu için [son doğrulama kaydı](RELEASE_EVIDENCE_2026_11_04.md) esas alınır. ZDR şu an doğrulanmadı; kullanıcı imzalı aktarım belgelerinin henüz olmadığını teyit etti. [OpenAI talep metni](OPENAI_ZDR_REQUEST_EN.txt) hazırdır, gönderilmemiştir.

## Belgeler

1. [Kurum ile veri işleme sözleşmesi](INSTITUTION_DPA_TR.md): Bilal Çelimli bilgileri doldurulmuş, kurum tarafı ve imza alanları açık olan sözleşme taslağı.
2. [Aktarım ekleri ve sağlayıcı kayıtları](TRANSFER_ANNEXES_TR.md): OpenAI, Render, Supabase ve kullanılması doğrulanacak diğer alıcılar için aktarım kapsamı; KVKK SS-2/SS-3 seçimi ve bildirim dosyası.
3. [Saklama ve silme işletim belgesi](RETENTION_RUNBOOK_TR.md): süreler, kalıcı silme kuyruğu, hukuki muhafaza, yedek geri yükleme, dış alıcılar ve test kanıtları.
4. `official/`: KVKK sitesinden alınan değiştirilmemiş SS-2 ve SS-3 formları; kaynak ve dosya özetleri `sources.json` içindedir. Ek çalışma belgesi bu resmî formların yerine geçmez.

## Tamamlama sırası

- Kurumsal hizmet için kurumun unvanı, adresi, veri koruma irtibatı, yetkili imzacısı ve sözleşme süresini doldurun. Kurum talimatıyla işlenen veriler ile B4Skills'in kendi hesap, güvenlik ve yasal kayıt işlemlerini ayırın.
- Her sağlayıcının hesap/fatura üzerindeki sözleşme tarafını, hizmet bölgesini, uygulanabilir DPA sürümünü ve alt işleyen listesini özel kurum arşivine alın. Erişim anahtarları, parolalar, aday kayıtları veya imza örnekleri bu depoya konulmaz.
- Önceki kullanıcı ZDR teyidi hesap ekranında doğrulanamadı; ZDR onayı halen bekliyor. Üretim proje kimliği ve metin/ses uçlarının onay kapsamıyla eşleştirilmesi gerekir. `store:false` bu onayın yerine geçmez.
- Aktarımın gerçek rollerine uygun resmî standart sözleşme modülünü seçin; ek çalışma belgesindeki bilgileri yalnız izin verilen alanlara aktarın. Ana standart hükümleri yeniden yazmayın. İmza yetkileri ve varsa gerekli tercüme/onay belgelerini tamamlayın.
- Son imza tarihinden başlayan beş iş günlük bildirim süresini kaydedin; bildirimi ve alındısını ayrı muhafaza edin. Bu dosya herhangi bir bildirim yapmaz.
- Saklama işi, geçiş ve kuru çalışma sonuçları doğrulandıktan sonra işletime alınır. Yedek ömrü, dış alıcıların silme süreleri ve erişim yetkileri doğrulanmadan "tüm kopyalar silindi" beyanı verilmez.

## Mevcut kanıt durumu

| Konu | Durum |
| --- | --- |
| İçeriklerin kullanım/dağıtım hakları | Kullanıcı tarafından teyit edildi; lisans belgeleri özel arşivde tutulmalı |
| OpenAI ZDR | Doğrulanmadı; sağlayıcı onayı ve üretim proje/uç eşleştirmesi bekliyor |
| OpenAI DPA | Resmî 1 Ocak 2026 yürürlük tarihli metin incelendi; hesap sözleşmesi eşleştirmesi bekliyor |
| Supabase DPA | Resmî 1 Ağustos 2026 sürümünün hizmet sözleşmesine dahil olduğu açıklanıyor; hesap eşleştirmesi bekliyor |
| Render DPA | Resmî DPA sayfası bulundu; bu araştırmada sözleşme gövdesi alınamadı, uygulanabilir nüsha istenmeli |
| Resend | Resmî DPA ve ülkeye özgü ek şartları incelendi; ülkeye özgü sözleşme değişiklikleri Enterprise planı gerektirebiliyor |
| Sentry | Etkinlik/hesap bölgesi doğrulanacak; hukuki bölümden hesaba uygulanan DPA alınmalı |
| KVKK standart sözleşmeleri | Resmî formlar ve ek hazırlığı hazır; karşı taraf kabulü, imzalar ve bildirim tamamlanmadı |
| Üretim saklama/silme | Uygulama ve yerel testler hazır; devreye alma ayrı doğrulama gerektiriyor |

## Kaynaklar

- [KVKK standart sözleşmeler](https://www.kvkk.gov.tr/Icerik/7929/Standart-Sozlesmeler)
- [KVKK silme, yok etme ve anonimleştirme yönetmeliği](https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK)
- [OpenAI DPA](https://openai.com/policies/data-processing-addendum/)
- [Supabase DPA](https://supabase.com/legal/customer-resources/data-processing-addendum)
- [Render DPA](https://render.com/dpa)
- [Resend DPA](https://resend.com/legal/dpa) ve [ülkeye özgü ekler](https://resend.com/security/gdpr)
- [Sentry ülkeye özgü sözleşme yaklaşımı](https://www.sentry.help/en/articles/17590170-can-we-propose-changes-to-sentry-s-dpa-or-execute-standard-contractual-clauses-not-included-in-the-dpa)
