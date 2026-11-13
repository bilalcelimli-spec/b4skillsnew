import { COMPANY } from '../site/company';

export const PURCHASE_POLICY_VERSION = '2026-11-04.2';
export const DAY_MS = 86_400_000;
export const PURCHASE_PLANS = {
  'full-assessment': { id: 'full-assessment', name: 'Full Assessment', amount: 1900, currency: 'EUR', credits: 1 },
  'pro-bundle': { id: 'pro-bundle', name: 'Pro Bundle', amount: 4900, currency: 'EUR', credits: 3 },
} as const;
export type PurchasePlanId = keyof typeof PURCHASE_PLANS;
export const PURCHASE_SCOPE = 'Full Assessment: Reading, Listening, Writing ve Speaking içeren adaptif değerlendirme, beceri raporu ve b4skills sertifikası. Tahmini sınav süresi 45–60 dakikadır; sonuç, gerekli puanlama ve insan incelemesi tamamlandığında sunulur. Sertifika kabulüne her kurum kendisi karar verir. Pro Bundle aynı hizmet için üç ayrı sınav hakkı içerir.';
export const REFUND_SECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['Kapsam ve satın alma kanalı', 'Bu politika, b4skills tarafından doğrudan tahsil edilen ödemeler için geçerlidir. Bu sitede ücretli bireysel satış şu anda kapalıdır. Apple üzerinden yapılan satın almalarda ödeme ve iade işlemleri Apple’ın kanalları üzerinden yürütülür; bu politika Apple adına iade taahhüdü oluşturmaz. Apple uygulama içi satın alma henüz etkin değildir. Zorunlu tüketici hakları saklıdır.'],
  ['Başlatılmamış sınav', 'Satın alma tarihinden itibaren 14 gün içinde gerekçesiz tam iade talep edebilirsiniz.'],
  ['Sınav paketleri', 'Aynı süre içinde kullanılmamış haklar, ödenen paket bedeline orantılı olarak iade edilir. 49 € tutarındaki üçlü pakette bir sınav kullanılmışsa kalan iki hak için 32,67 € iade edilir. Kullanılan sınava ilişkin zorunlu haklar ayrıca saklıdır.'],
  ['Başlatılmış sınav', 'Cayma hakkının sona ermesine ilişkin istisna ancak gerekli ön bilgilendirme ve geçerli onay koşulları sağlanmışsa uygulanır. Sınava giriş tek başına otomatik hak kaybı sayılmaz. Erken ifa onayı yalnız başlatılan sınava ilişkindir; paketinizdeki kullanılmamış hakları kapsamaz.'],
  ['Platform kaynaklı arıza', 'Hizmet platform kaynaklı arıza nedeniyle tamamlanamıyorsa ücretsiz tekrar veya ilgili sınav bedelinin iadesini seçebilirsiniz.'],
  ['İade yöntemi', 'İade, bildirimden itibaren en geç 14 gün içinde aynı ödeme yöntemiyle, işlem ücreti kesilmeden yapılır.'],
  ['Başvuru ve haklar', 'Sipariş bilgileriyle hello@b4skills.com adresine yazabilirsiniz. Cayma bildirimini aşağıdaki işletme adresine yazılı olarak da iletebilirsiniz. Gerekçe veya zorunlu bir form aranmaz. Zorunlu tüketici hakları ve ayıplı hizmetten doğan haklar saklıdır.'],
] as const;
export const EARLY_START_REQUEST = 'Satın aldığım bu sınav hizmetinin 14 günlük cayma süresi dolmadan, şimdi başlatılmasını açıkça talep ediyorum.';
export const EARLY_START_ACKNOWLEDGEMENT = 'Gerekli ön bilgilendirme ve geçerli onay koşulları sağlanmışsa, bu talebim üzerine ifasına başlanan sınav için cayma hakkı istisnasının uygulanabileceğini anladım. Kullanılmamış paket haklarım ve ayıplı hizmetten doğan haklarım saklıdır.';
export const PURCHASE_ACKNOWLEDGEMENT = 'Sipariş özetini, ön bilgilendirmeyi, mesafeli satış koşullarını ve iade/cayma politikasını okudum ve kabul ediyorum. Ödemenin seçtiğim tutarda ödeme yükümlülüğü doğurduğunu biliyorum.';
export const SALES_SECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['Sağlayıcı ve iletişim', `${COMPANY.legalName} · ${COMPANY.brand}. ${COMPANY.address}. ${COMPANY.taxOffice}, vergi no ${COMPANY.taxNumber}. E-posta: ${COMPANY.contactEmail}. Telefon: ${COMPANY.phone}.`],
  ['Hizmet kapsamı', PURCHASE_SCOPE],
  ['Fiyat ve ödeme', 'Bu web sitesinde ücretli bireysel satın alma ve kartla ödeme sunulmamaktadır. Burada bir ödeme yükümlülüğü doğuran sipariş oluşturulmaz. Kurumsal değerlendirmeler için hizmet kapsamı ve bedel ayrı teklif ve sözleşmeyle belirlenir. Apple uygulama içi satın alma henüz etkin değildir; bu sayfa App Store ürün veya fiyat teklifi oluşturmaz.'],
  ['Sunum ve geçerlilik', 'Ödeme doğrulandıktan sonra sınav hakları hesabınıza tanımlanır ve ödeme tarihinden itibaren 12 ay kullanılabilir. Satın alma sınavı kendiliğinden başlatmaz. 14 günlük süre dolmadan başlamak isterseniz ayrı, önceden seçili olmayan onaylar alınır; onay vermeden süre sonunu bekleyebilirsiniz.'],
  ['Cayma ve iade', REFUND_SECTIONS.map(([heading, body]) => `${heading}: ${body}`).join('\n\n')],
  ['Sorunlar ve uyuşmazlıklar', 'Sipariş kimliğinizle e-posta, telefon veya posta yoluyla bize ulaşabilirsiniz. Tüketici, uyuşmazlığın niteliğine ve yürürlükteki parasal sınırlara göre tüketici hakem heyetlerine veya gerekli başvuru usulleriyle tüketici mahkemelerine başvurabilir. Kanundan doğan başvuru yolları ve haklar bu sözleşmeyle sınırlandırılmaz.'],
] as const;
export interface PurchaseSnapshot {
  version: string;
  acceptedAt: string;
  plan: { id: PurchasePlanId; name: string; amount: number; currency: string; credits: number };
  supplier: typeof COMPANY;
  sections: ReadonlyArray<readonly [string, string]>;
  acknowledgement: string;
  earlyStartRequest: string;
  earlyStartAcknowledgement: string;
}
export function purchaseSnapshot(planId: PurchasePlanId, acceptedAt: string): PurchaseSnapshot {
  return { version: PURCHASE_POLICY_VERSION, acceptedAt, plan: PURCHASE_PLANS[planId], supplier: COMPANY,
    sections: SALES_SECTIONS, acknowledgement: PURCHASE_ACKNOWLEDGEMENT, earlyStartRequest: EARLY_START_REQUEST,
    earlyStartAcknowledgement: EARLY_START_ACKNOWLEDGEMENT };
}
export function withdrawalEndsAt(completedAt: Date) { return new Date(completedAt.getTime() + 14 * DAY_MS); }
export function purchaseReceiptText(snapshot: PurchaseSnapshot, orderId: string, completedAt?: string | null) {
  return [`b4skills — Sipariş ve ön bilgilendirme belgesi`, `Sipariş: ${orderId}`, `Metin sürümü: ${snapshot.version}`,
    `Onay zamanı: ${snapshot.acceptedAt}`, `Ödeme zamanı: ${completedAt ?? 'Henüz doğrulanmadı'}`,
    `Paket: ${snapshot.plan.name} · ${snapshot.plan.credits} sınav · ${(snapshot.plan.amount / 100).toFixed(2)} EUR`,
    ...snapshot.sections.map(([title, body]) => `${title}\n${body}`), snapshot.acknowledgement].join('\n\n');
}
