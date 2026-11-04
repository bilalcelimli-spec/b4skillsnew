import React from 'react';
import { SiteNav } from './SiteNav';
import { SiteFooter } from './SiteFooter';
import { REFUND_SECTIONS, SALES_SECTIONS } from '../lib/payments/purchase-policy';
import { COMPANY } from '../lib/site/company';

export type LegalPageKind = 'privacy' | 'kvkk' | 'terms' | 'support' | 'refund' | 'sales';
const CONTENT: Record<LegalPageKind, { title: string; sections: ReadonlyArray<readonly [string, string]> }> = {
  refund: { title: 'İade ve Cayma Politikası', sections: REFUND_SECTIONS },
  sales: { title: 'Ön Bilgilendirme ve Mesafeli Satış Koşulları', sections: SALES_SECTIONS },
  privacy: {
    title: 'Gizlilik Politikası / Privacy Policy',
    sections: [
      ['Kapsam / Scope', 'Bu metin b4skills web sitesi ve değerlendirme uygulamalarındaki veri işleme faaliyetlerini açıklar. Bireysel hesap ve hizmet işlemlerinde veri sorumlusu Bilal Çelimli’dir. Kurumun belirlediği amaçlarla yapılan sınavlarda kurumun aydınlatma metni de geçerlidir; veri sorumlusu ve veri işleyen rolleri ilgili hizmete göre belirlenir.'],
      ['İşlenen veriler / Data processed', 'Kimlik ve iletişim bilgileri, hesap bilgileri, kurum/sınıf bilgileri, sınav yanıtları, yanıt süreleri, sonuçlar ve teknik günlükler işlenebilir. Konuşma sorularında ses yanıtı, gözetimli sınavlarda başlangıç fotoğrafı, web kamera olay kareleri ve uygulamadan ayrılma gibi gözetim olayları toplanabilir. Kapsam sınavın yapılandırmasına bağlıdır.'],
      ['Amaçlar / Purposes', 'Veriler hesabı ve sınavı sunmak, yanıtları puanlamak, sonuçları katılımcıya ve yetkili kurumuna ulaştırmak, destek sağlamak, hizmet güvenliğini ve ölçme kalitesini değerlendirmek için işlenir. Ödeme işlemleri kullanılıyorsa tutar ve işlem durumu ödeme sağlayıcısından alınır.'],
      ['AI destekli puanlama / AI-assisted scoring', 'Tam değerlendirmede yazılı ve sesli yanıtlar, görev metni ve değerlendirme ölçütleri puanlama için OpenAI’a gönderilir. Adınız ve e-posta adresiniz puanlama isteğine eklenmez; ancak yanıtınızda bu bilgileri söylerseniz veya yazarsanız yanıtla birlikte aktarılabilir. Ses, puanlama için metne dönüştürülebilir. Sonuçlara itiraz edebilir ve insan incelemesi isteyebilirsiniz. Serbest metninize gereksiz kişisel veya hassas bilgi eklemeyin. Ücretsiz Quick Check’te açık yazma ve konuşma yanıtları değerlendirilmez.'],
      ['Çocuklar ve veli kontrolü / Children and guardians', 'Yaş grubu beyanı alınır. 18 yaş altındaki adaylar ve çocuk sınavlarına atanmış hesaplar için veli onayı ve kurum tarafından veli yetkisinin doğrulanması gerekir. Veli adı, e-posta adresi, yakınlık beyanı, onay zamanı ve kurum kontrol kaydının referansı işlenir; kimlik belgesi kopyası bu akışta istenmez. Sağlayıcı ve aktarım hazırlıkları tamamlanmadan çocuk sınavı açılmaz. Veli kişisel yönetim bağlantısından onayını geri çekebilir; yeni sınav ve bekleyen AI puanlama işlemleri durdurulur. Daha önce tamamlanmış işlemlere ilişkin silme talepleri iletişim kanalından iletilir.'],
      ['Alıcılar / Recipients', 'Sınavı düzenleyen kurumun yetkili kullanıcıları sonuçlara ve yapılandırmaya bağlı gözetim kayıtlarına erişebilir. Barındırma, veritabanı/depolama, AI puanlama, ödeme, e-posta ve hata izleme sağlayıcıları hizmetin sunulması için veri işleyebilir. Yetkili makamlarla paylaşım kanuni yükümlülük kapsamında yapılabilir.'],
      ['Çerezler ve güvenlik / Cookies and security', 'Oturumun sürdürülmesi için accessToken ve refreshToken kimlik doğrulama çerezleri kullanılır. Parolalar tek yönlü özet olarak saklanır. Kamera izni, kişisel veri işleme için gerekli hukuki bilgilendirme veya rızanın yerine geçmez.'],
      ['Saklama ve silme / Retention and deletion', 'Veri kategorisine göre saklama ve silme işlemleri uygulanır. Hesap silme, sonuçların kimlikten ayrılması ve medya silme kapsamları farklı olabilir. İlgili kayıtlarınızın süresi ve silinmesi hakkında aşağıdaki iletişim kanalından bilgi ve başvuru talep edebilirsiniz. Taslak incelemesinde üretimde etkin saklama işleri ve sağlayıcı tarafındaki süreler ayrıca doğrulanacaktır.'],
      ['Yurt dışına aktarım / International transfers', 'AI ve altyapı hizmetleri yurt dışında veri işlemeyi gerektirebilir. Kullanılan bölgeler, sağlayıcı sözleşmeleri ve aktarım mekanizmaları bu taslak için henüz doğrulanmamıştır. Bu sayfa, tamamlanmış bir KVKK/GDPR aktarım uyumu beyanı değildir.'],
      ['Haklar ve iletişim / Rights and contact', 'Verilerinize erişim, yanlışlıkların düzeltilmesi, koşulları oluştuğunda silinmesi ve sonuca insan incelemesi talebinizi aşağıdaki adrese iletebilirsiniz. KVKK kapsamındaki haklar ve başvuru ayrıntıları /kvkk sayfasındadır. Kurumsal sınavlarda kurumunuzla da iletişime geçebilirsiniz.'],
    ],
  },
  kvkk: {
    title: 'KVKK Aydınlatma Metni',
    sections: [
      ['Veri sorumlusu', 'Bireysel hizmetlerde veri sorumlusu Bilal Çelimli’dir. Kurum tarafından düzenlenen sınavlarda ilgili kurumun veri sorumlusu olarak yaptığı bilgilendirme de dikkate alınmalıdır. İletişim ve adres bilgileri aşağıdadır.'],
      ['Toplama yöntemi ve amaçlar', 'Veriler web/uygulama formları, kurumun ilettiği kayıtlar, sınav yanıtları, izin verilmiş mikrofon/kamera kullanımı ve teknik günlükler yoluyla elektronik ortamda toplanır. Hesap açılması, sınavın sunulması, puanlama, raporlama, destek, güvenlik ve faturalama amaçlarıyla işlenir. Veri kategorileri /privacy sayfasında açıklanmıştır.'],
      ['Hukuki sebepler', 'İlgili işleme için gerekli olduğu ölçüde KVKK madde 5/2-c kapsamında sözleşmenin kurulması veya ifası, 5/2-ç kapsamında hukuki yükümlülükler, 5/2-e kapsamında bir hakkın tesisi, kullanılması veya korunması ve temel haklara zarar vermemek koşuluyla 5/2-f kapsamında meşru menfaat değerlendirilir. Açık rızaya dayanan ek işlemler için ayrı bilgilendirme ve rıza gerekir. Bu taslakta işlem bazındaki hukuki sebep envanteri ve gözetim kapsamı henüz nihai olarak doğrulanmamıştır.'],
      ['Aktarım', 'Veriler sınavı düzenleyen kurumun yetkili kullanıcılarına, hizmetin sunulması için gerekli altyapı, AI puanlama, ödeme ve iletişim sağlayıcılarına ve kanunen yetkili makamlara ilgili amaçlarla aktarılabilir. Yurt dışı bölgeleri ve KVKK madde 9 kapsamındaki aktarım dayanakları doğrulanmadan bu taslak nihai aktarım aydınlatması sayılmaz.'],
      ['KVKK madde 11 kapsamındaki haklarınız', 'Kişisel verilerinizin işlenip işlenmediğini öğrenme; işlenmişse bilgi isteme; işleme amacını ve amaca uygun kullanımını öğrenme; yurt içi/yurt dışı alıcıları bilme; eksik veya yanlış verilerin düzeltilmesini isteme; kanuni şartlarda silme veya yok etme isteme; düzeltme/silmenin alıcılara bildirilmesini isteme; münhasıran otomatik analizle aleyhinize doğan sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarınız vardır.'],
      ['Başvuru', 'Başvurunuzu aşağıdaki adrese yazılı olarak veya mevzuatın izin verdiği diğer yollarla iletebilirsiniz. Destek e-postasından başvuru yöntemi hakkında bilgi alabilirsiniz; kimlik doğrulama için gerekenin ötesinde belge göndermeyin. Başvurular en geç 30 gün içinde sonuçlandırılır; mevzuatın izin verdiği maliyetler dışında ücretsizdir.'],
    ],
  },
  terms: {
    title: 'Kullanım Koşulları / Terms of Service',
    sections: [
      ['Hizmet sağlayıcı', 'b4skills, aşağıda bilgileri bulunan Bilal Çelimli tarafından sunulan bir İngilizce değerlendirme hizmetidir. Bu koşullar hizmetin kullanımını açıklar; kurumsal sözleşme varsa ayrıca uygulanır.'],
      ['Sonuçların anlamı', 'Sonuçlar CEFR-aligned seviye tahminleridir. CEFR adına verilmiş resmî bir yeterlilik veya akreditasyon iddiası taşımaz. Bir sertifikanın doğrulanması b4skills kaydının durumunu gösterir; başka bir kurumun kabulünü garanti etmez. Ücretsiz testin açık yazma ve konuşma yanıtları değerlendirilmez.'],
      ['Hesap ve sınav kuralları', 'Hesabınıza ve sınav kodunuza ilişkin bilgileri koruyun, size tahsis edilmeyen hesabı veya kodu kullanmayın. Yetkisiz yardım, soru paylaşımı ve hizmet güvenliğini aşmaya yönelik işlemler yasaktır. Gözetim sinyalleri tek başına usulsüzlüğün kanıtı sayılmaz; itiraz ve insan incelemesi talebi iletişim kanalından iletilebilir.'],
      ['Satın alma ve tüketici hakları', 'Ücret, kapsam, ödeme ve geçerlilik bilgileri satın alma öncesinde açıkça sunulmalıdır. İade ve cayma koşulları /refund-policy sayfasında, ön bilgilendirme ve mesafeli satış koşulları /sales-terms sayfasında yer alır. Satın alma işlemlerinde sipariş belgenizdeki sürüm uygulanır. Emredici tüketici hakları, ayıplı hizmete ilişkin haklar ve uygulanabilir cayma hakları saklıdır. Nihai ön bilgilendirme ve mesafeli satış şartları tamamlanmadan bu taslak onların yerine kullanılamaz.'],
      ['Gizlilik ve destek', 'Veri işleme bilgileri /privacy ve /kvkk sayfalarındadır. Teknik sorunlar, puan itirazları ve hesap talepleri için aşağıdaki iletişim kanalını kullanabilirsiniz.'],
    ],
  },
  support: {
    title: 'İletişim ve Destek / Contact & Support',
    sections: [
      ['Bize ulaşın / Contact us', 'Sınav erişimi, teknik sorunlar, puan incelemesi, hesap/veri talepleri ve kurumsal hizmetler için hello@b4skills.com adresine yazabilirsiniz. Sipariş veya sınav kimliğini ve sorunun kısa açıklamasını ekleyin; parolanızı veya kart bilgilerinizi göndermeyin.'],
      ['Sertifika doğrulama / Certificate verification', 'Sertifika kimliğini /verify sayfasına girerek kaydın durumunu kontrol edebilirsiniz.'],
    ],
  },
};
export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const content = CONTENT[kind];
  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <SiteNav onStart={() => { window.location.href = '/assessment'; }} />
    <main lang="tr" className="max-w-4xl mx-auto px-6 pt-32 pb-20">
      <h1 className="text-3xl font-bold mb-4">{content.title}</h1>
      {['privacy', 'kvkk', 'terms'].includes(kind) && <p className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 text-sm" role="note">İnceleme taslağı · 4 Kasım 2026. Şirket bilgileri sağlanan vergi belgesinden alınmıştır. Veri işleme ve aktarım ayrıntıları ile ticari koşulların incelemesi tamamlanmadan nihai hukuki metin olarak yayımlanmamalıdır.</p>}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 mb-8 space-y-2">
        <p className="font-semibold">{COMPANY.legalName} · {COMPANY.brand}</p>
        <p>{COMPANY.address}</p><p>Telefon: <a href="tel:+905465411417" className="underline">{COMPANY.phone}</a></p><p>{COMPANY.taxOffice} · Vergi no: {COMPANY.taxNumber}</p>
        <a className="underline text-[#9b276c]" href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>
      </div>
      {kind === 'refund' && <p className="mb-8 text-sm"><a href="https://support.apple.com/tr-tr/118223" className="underline" target="_blank" rel="noopener noreferrer">Apple üzerinden yapılan satın almalarda iade başvurusu</a></p>}
      <div className="space-y-8">{content.sections.map(([heading, body]) => <section key={heading}><h2 className="text-xl font-bold mb-3">{heading}</h2><p className="leading-7 whitespace-pre-line">{body}</p></section>)}</div>
      <nav aria-label="Hukuki ve iletişim sayfaları" className="flex flex-wrap gap-5 mt-12 underline text-sm"><a href="/privacy">Gizlilik</a><a href="/kvkk">KVKK</a><a href="/terms">Kullanım koşulları</a><a href="/refund-policy">İade ve cayma</a><a href="/sales-terms">Satış koşulları</a><a href="/support">Destek</a></nav>
    </main><SiteFooter />
  </div>;
}
