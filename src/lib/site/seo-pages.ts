/**
 * Single source of truth for every public page that search engines and AI
 * assistants should understand. server.ts builds the <head> tags, sitemap,
 * feed, robots.txt and llms.txt from this list (see seo-head.ts).
 *
 * `updated` is the date the page's visible content last changed. Change it
 * only when the page content changes: search engines stop trusting
 * sitemap dates that move on every request.
 */

export type SeoLang = "en" | "tr";
import { LANDING_CONTENT } from "./seo-landing-content";
import { CEFR_EXAM_COMPARISON_PATH, CEFR_GUIDE_HUB_PATH, GUIDE_SECTION_PATHS, LEVEL_GUIDES, LEVEL_GUIDES_TR, guideAlternates, levelGuidePath, neighbours } from "./cefr-guides";

export type SeoKind = "home" | "test" | "solution" | "info" | "guide" | "legal" | "utility";

export interface SeoPage {
  path: string;
  title: string;
  description: string;
  lang: SeoLang;
  kind: SeoKind;
  /** YYYY-MM-DD of the last visible content change. */
  updated: string;
  /** false → noindex and left out of the sitemap, feed and llms.txt. */
  indexable: boolean;
  /** Short name for breadcrumbs and llms.txt. */
  name: string;
  /** Parent page path for breadcrumbs (defaults to home). */
  parent?: string;
  /** One plain sentence for llms.txt and the feed. */
  summary?: string;
  /** Same content in another language (hreflang). */
  alternates?: Partial<Record<SeoLang, string>>;
  /** File under /og/ (1200×630 PNG); defaults to the generic image. */
  ogImage?: string;
  priority?: number;
  changefreq?: "weekly" | "monthly" | "yearly";
  /** Page-specific JSON-LD in addition to the generated entities. */
  jsonLd?: object[];
}

/** Visible FAQ on a page, as schema.org FAQPage (only for questions the page shows). */
const faqLd = (items: readonly { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
});

const GUIDES_UPDATED = "2026-11-21";

const CEFR_GUIDE_PAGES_EN: SeoPage[] = [
  {
    path: CEFR_GUIDE_HUB_PATH,
    name: "CEFR Levels Explained",
    title: "CEFR Levels Explained: A1, A2, B1, B2, C1, C2 | b4skills",
    description: "What each CEFR English level means, from A1 beginner to C2 proficiency: what learners can do, typical grammar and vocabulary, and how exams report each level.",
    summary: "Plain-language guide to the six CEFR levels (A1–C2): what learners can do at each level and how the levels are grouped.",
    lang: "en", kind: "guide", updated: GUIDES_UPDATED, indexable: true, priority: 0.8, changefreq: "monthly", ogImage: "cefr-levels.png",
  },
  ...LEVEL_GUIDES.map((guide): SeoPage => {
    const { next } = neighbours(guide);
    return {
      path: levelGuidePath(guide),
      parent: CEFR_GUIDE_HUB_PATH,
      name: `${guide.level} level English`,
      title: `What Is ${guide.level} Level English? CEFR ${guide.level} Explained | b4skills`,
      description: `CEFR ${guide.level} (${guide.nickname.toLowerCase()}) explained: what learners can do in reading, listening, speaking and writing, typical grammar, exam score ranges${next ? ` and how to reach ${next.level}` : ""}.`,
      summary: guide.answer,
      lang: "en", kind: "guide", updated: GUIDES_UPDATED, indexable: true, priority: 0.7, changefreq: "monthly", ogImage: `cefr-${guide.slug}.png`,
      jsonLd: [faqLd(guide.faq)],
    };
  }),
  {
    path: CEFR_EXAM_COMPARISON_PATH,
    parent: CEFR_GUIDE_HUB_PATH,
    name: "English exam scores and CEFR levels",
    title: "IELTS, TOEFL and Cambridge Scores vs CEFR Levels | b4skills",
    description: "How IELTS, TOEFL iBT (old and new score scales), Cambridge English and Duolingo scores relate to CEFR levels A1–C2, using each exam owner's own published alignment, with sources.",
    summary: "Table of the CEFR score ranges that IELTS, TOEFL iBT, Cambridge English and Duolingo publish, with links to each owner's source.",
    lang: "en", kind: "guide", updated: GUIDES_UPDATED, indexable: true, priority: 0.8, changefreq: "monthly", ogImage: "cefr-exam-comparison.png",
  },
];

const TR = GUIDE_SECTION_PATHS.tr;

const CEFR_GUIDE_PAGES_TR: SeoPage[] = [
  {
    path: TR.hub,
    name: "CEFR Seviyeleri",
    title: "CEFR Seviyeleri Nedir? A1, A2, B1, B2, C1, C2 Açıklaması | b4skills",
    description: "A1 başlangıçtan C2 üst düzey yeterliliğe kadar her CEFR İngilizce seviyesinin anlamı: öğrencilerin neler yapabildiği, tipik dilbilgisi ve kelime bilgisi, sınavların her seviyeyi nasıl raporladığı.",
    summary: "Altı CEFR seviyesine (A1–C2) Türkçe rehber: her seviyede neler yapılabildiği ve seviyelerin nasıl gruplandığı.",
    lang: "tr", kind: "guide", updated: GUIDES_UPDATED, indexable: true, priority: 0.8, changefreq: "monthly", ogImage: "cefr-seviyeleri.png",
  },
  ...LEVEL_GUIDES_TR.map((guide): SeoPage => {
    const { next } = neighbours(guide);
    return {
      path: levelGuidePath(guide),
      parent: TR.hub,
      name: `${guide.level} seviyesi`,
      title: `${guide.level} Seviyesi Nedir? CEFR ${guide.level} İngilizce Seviyesi | b4skills`,
      description: `CEFR ${guide.level} (${guide.nickname.toLocaleLowerCase("tr")}) İngilizce seviyesi: okuma, dinleme, konuşma ve yazmada neler yapılabildiği, tipik dilbilgisi, sınav puan aralıkları${next ? ` ve ${next.level} seviyesine nasıl geçileceği` : ""}.`,
      summary: guide.answer,
      lang: "tr", kind: "guide", updated: GUIDES_UPDATED, indexable: true, priority: 0.7, changefreq: "monthly", ogImage: `cefr-seviyesi-${guide.slug}.png`,
      jsonLd: [faqLd(guide.faq)],
    };
  }),
  {
    path: TR.comparison,
    parent: TR.hub,
    name: "Sınav puanları ve CEFR",
    title: "IELTS, TOEFL ve Cambridge Puanlarının CEFR Karşılığı | b4skills",
    description: "IELTS, TOEFL iBT (eski ve yeni puan ölçeği), Cambridge English ve Duolingo puanlarının A1–C2 CEFR seviyelerine karşılığı; her sınav sahibinin kendi yayımladığı eşleştirme ve kaynakları.",
    summary: "IELTS, TOEFL iBT, Cambridge English ve Duolingo'nun yayımladığı CEFR puan aralıkları tablosu, kaynak bağlantılarıyla.",
    lang: "tr", kind: "guide", updated: GUIDES_UPDATED, indexable: true, priority: 0.8, changefreq: "monthly", ogImage: "cefr-sinav-karsilastirma.png",
  },
];

/** Every guide page, each paired with its other-language version for hreflang. */
const CEFR_GUIDE_PAGES: SeoPage[] = [...CEFR_GUIDE_PAGES_EN, ...CEFR_GUIDE_PAGES_TR].map((page) => ({ ...page, alternates: guideAlternates(page.path) }));

export const SEO_PAGES: readonly SeoPage[] = [
  {
    path: "/",
    name: "Home",
    title: "b4skills — Adaptive English Assessment Platform",
    description: "Adaptive CEFR English assessment for individuals, schools, universities and companies. Reading, listening, writing and speaking with AI-assisted scoring.",
    summary: "Adaptive, CEFR-aligned English assessment platform for individuals, schools, universities, language schools and companies.",
    lang: "en", kind: "home", updated: "2026-11-21", indexable: true, priority: 1.0, changefreq: "weekly", ogImage: "home.png",
  },
  {
    path: "/english-level-test",
    name: "Free English Level Test",
    title: "Free English Level Test — CEFR A1 to C2 | b4skills",
    description: "Take a free adaptive English level test and get your provisional CEFR estimate in about 20–30 minutes. Instant results, no account required.",
    summary: "Free adaptive English placement test (Quick Check) that gives a provisional CEFR estimate (A1–C2) in about 20–30 minutes, without an account.",
    lang: "en", kind: "test", updated: "2026-11-21", indexable: true, priority: 0.9, changefreq: "monthly", ogImage: "english-level-test.png",
    jsonLd: [faqLd(LANDING_CONTENT["english-level-test"].faq)],
    alternates: { en: "/english-level-test", tr: "/ingilizce-seviye-testi" },
  },
  {
    path: "/ingilizce-seviye-testi",
    name: "İngilizce Seviye Testi",
    title: "İngilizce Seviye Testi — CEFR A1-C2 | b4skills",
    description: "Ücretsiz adaptif İngilizce seviye testiyle CEFR seviyenizi (A1–C2) yaklaşık 20–30 dakikada öğrenin. Anında sonuç, kayıt gerektirmez.",
    summary: "Ücretsiz adaptif İngilizce seviye testi: yaklaşık 20–30 dakikada, hesap açmadan geçici bir CEFR (A1–C2) tahmini verir.",
    lang: "tr", kind: "test", updated: "2026-11-21", indexable: true, priority: 0.9, changefreq: "monthly", ogImage: "ingilizce-seviye-testi.png",
    jsonLd: [faqLd(LANDING_CONTENT["ingilizce-seviye-testi"].faq)],
    alternates: { en: "/english-level-test", tr: "/ingilizce-seviye-testi" },
  },
  {
    path: "/cefr-english-test",
    name: "CEFR English Test",
    title: "CEFR English Test — Adaptive Assessment | b4skills",
    description: "CEFR-aligned adaptive English test with a QR-verifiable b4skills certificate. Acceptance is decided by each receiving institution.",
    summary: "Full adaptive four-skills English assessment aligned to the CEFR, with a QR-verifiable certificate; acceptance is decided by each receiving institution.",
    lang: "en", kind: "test", updated: "2026-11-21", indexable: true, priority: 0.8, changefreq: "monthly", ogImage: "cefr-english-test.png",
    jsonLd: [faqLd(LANDING_CONTENT["cefr-english-test"].faq)],
  },
  {
    path: "/english-assessment-for-universities",
    name: "English Assessment for Universities",
    title: "English Assessment for Universities — b4skills",
    description: "Adaptive CEFR placement for universities: bulk import, LMS integration and cohort analytics. 14-day free pilot.",
    summary: "Adaptive CEFR placement and proficiency testing for university language centres and admissions teams.",
    lang: "en", kind: "solution", updated: "2026-11-21", indexable: true, priority: 0.8, changefreq: "monthly", ogImage: "universities.png",
    jsonLd: [faqLd(LANDING_CONTENT["english-assessment-for-universities"].faq)],
  },
  {
    path: "/english-assessment-for-companies",
    name: "English Assessment for Companies",
    title: "English Assessment for Companies — b4skills",
    description: "Fast, reliable English proficiency testing for HR teams. CEFR-aligned, bulk testing and workforce skill analytics.",
    summary: "CEFR-aligned English screening and workforce skill analytics for HR and L&D teams.",
    lang: "en", kind: "solution", updated: "2026-11-21", indexable: true, priority: 0.8, changefreq: "monthly", ogImage: "companies.png",
    jsonLd: [faqLd(LANDING_CONTENT["english-assessment-for-companies"].faq)],
  },
  {
    path: "/schools",
    name: "For Schools",
    title: "English Assessment for Schools — b4skills",
    description: "Adaptive CEFR English testing for primary and secondary schools. Class management, teacher dashboards and cohort analytics.",
    summary: "Adaptive CEFR English testing for primary and secondary schools, with teacher dashboards and class analytics.",
    lang: "en", kind: "solution", updated: "2026-11-21", indexable: true, priority: 0.7, changefreq: "monthly", ogImage: "schools.png",
  },
  {
    path: "/academia",
    name: "For Academia",
    title: "English Assessment for Academia — b4skills",
    description: "EAP placement and proficiency testing for universities and research institutions. CEFR-aligned with LMS integration.",
    summary: "EAP placement and proficiency testing for universities and research institutions.",
    lang: "en", kind: "solution", updated: "2026-11-21", indexable: true, priority: 0.7, changefreq: "monthly", ogImage: "academia.png",
  },
  {
    path: "/corporate",
    name: "For Corporates",
    title: "Corporate English Assessment — b4skills",
    description: "Screen, place and develop English skills across your workforce. CEFR-aligned assessment with ATS/HRIS integration.",
    summary: "Workforce English screening and development with CEFR-aligned assessment and ATS/HRIS integration.",
    lang: "en", kind: "solution", updated: "2026-11-21", indexable: true, priority: 0.7, changefreq: "monthly", ogImage: "corporate.png",
  },
  {
    path: "/language-schools",
    name: "For Language Schools",
    title: "English Assessment for Language Schools — b4skills",
    description: "Adaptive CEFR placement and progress testing for language schools. Group analysis and institutional dashboard.",
    summary: "Adaptive CEFR placement and progress testing for language schools.",
    lang: "en", kind: "solution", updated: "2026-11-21", indexable: true, priority: 0.7, changefreq: "monthly", ogImage: "language-schools.png",
  },
  {
    path: "/pricing",
    name: "Pricing",
    title: "Pricing — b4skills English Assessment",
    description: "Free Quick Check for individuals and institutional plans for teams, schools and enterprises. Individual paid checkout is not available on this website.",
    summary: "Free Quick Check for individuals and institutional plans; institutional terms are agreed per contract.",
    lang: "en", kind: "info", updated: "2026-11-21", indexable: true, priority: 0.7, changefreq: "monthly", ogImage: "pricing.png",
  },
  {
    path: "/methodology",
    name: "Methodology",
    title: "Assessment Methodology — b4skills",
    description: "How b4skills works: computer-adaptive testing, IRT, CEFR alignment, AI-assisted scoring with human review, DIF fairness monitoring and certificate verification.",
    summary: "How the assessment works: computer-adaptive testing, item response theory, CEFR alignment, AI-assisted scoring with human review and fairness monitoring.",
    lang: "en", kind: "info", updated: "2026-11-21", indexable: true, priority: 0.6, changefreq: "monthly", ogImage: "methodology.png",
  },
  {
    path: "/research",
    name: "Validity Research",
    title: "Validity Research — b4skills",
    description: "The b4skills validity research programme: how results are compared with external exams, IRT and adaptive test design, DIF fairness checks and AI scoring evaluation. Figures are published as data are collected.",
    summary: "Validity research programme: external-exam comparison method, IRT and adaptive design, fairness checks and AI scoring evaluation; figures are published as data are collected.",
    lang: "en", kind: "info", updated: "2026-11-21", indexable: true, priority: 0.6, changefreq: "monthly", ogImage: "research.png",
  },
  {
    path: "/accessibility-statement",
    name: "Accessibility",
    title: "Accessibility Statement — b4skills",
    description: "b4skills WCAG 2.1 AA accessibility commitment, known limitations, accommodation requests and contact information.",
    summary: "Accessibility commitment, known limitations and how to request accommodations.",
    lang: "en", kind: "info", updated: "2026-11-21", indexable: true, priority: 0.4, changefreq: "yearly",
  },
  {
    path: "/verify",
    name: "Verify a Certificate",
    title: "Verify a Certificate — b4skills",
    description: "Check the status and details of a certificate issued by b4skills using its certificate ID.",
    summary: "Public page for checking a b4skills certificate by its ID.",
    lang: "en", kind: "utility", updated: "2026-11-04", indexable: true, priority: 0.5, changefreq: "yearly",
  },
  {
    path: "/support",
    name: "İletişim ve Destek",
    title: "İletişim ve Destek — b4skills",
    description: "b4skills işletme bilgileri, teknik destek ve başvuru kanalı.",
    summary: "İletişim, teknik destek ve işletme bilgileri.",
    lang: "tr", kind: "legal", updated: "2026-11-21", indexable: true, priority: 0.4, changefreq: "yearly",
  },
  {
    path: "/refund-policy",
    name: "İade ve Cayma Politikası",
    title: "İade ve Cayma Politikası — b4skills",
    description: "14 günlük cayma, paket iadeleri ve teknik sorunlarda iade koşulları.",
    lang: "tr", kind: "legal", updated: "2026-11-21", indexable: true, priority: 0.3, changefreq: "yearly",
  },
  {
    path: "/sales-terms",
    name: "Ön Bilgilendirme ve Mesafeli Satış Koşulları",
    title: "Ön Bilgilendirme ve Mesafeli Satış Koşulları — b4skills",
    description: "İşletme bilgileri, hizmet kapsamı, ödeme ve cayma koşulları.",
    lang: "tr", kind: "legal", updated: "2026-11-21", indexable: true, priority: 0.3, changefreq: "yearly",
  },
  // Kept out of search results: drafts under review and transactional pages.
  { path: "/privacy", name: "Gizlilik Politikası", title: "Gizlilik Politikası — b4skills", description: "b4skills veri işleme bilgileri ve gizlilik politikası inceleme taslağı.", lang: "tr", kind: "legal", updated: "2026-11-21", indexable: false },
  { path: "/kvkk", name: "KVKK Aydınlatma Metni", title: "KVKK Aydınlatma Metni — b4skills", description: "Veri sorumlusu bilgileri, ilgili kişi hakları ve KVKK aydınlatma metni inceleme taslağı.", lang: "tr", kind: "legal", updated: "2026-11-21", indexable: false },
  { path: "/terms", name: "Kullanım Koşulları", title: "Kullanım Koşulları — b4skills", description: "b4skills kullanım koşulları inceleme taslağı.", lang: "tr", kind: "legal", updated: "2026-11-21", indexable: false },
  { path: "/checkout", name: "Satın Alma", title: "Satın Alma — b4skills", description: "Sipariş özeti ve satın alma ön bilgilendirmesi.", lang: "tr", kind: "utility", updated: "2026-11-21", indexable: false },
  { path: "/payment/success", name: "Ödeme Durumu", title: "Ödeme Durumu — b4skills", description: "Siparişinizin ödeme durumunu kontrol edin.", lang: "tr", kind: "utility", updated: "2026-11-21", indexable: false },
  { path: "/payment/cancel", name: "Ödeme İptal Edildi", title: "Ödeme İptal Edildi — b4skills", description: "Ödemeniz tamamlanmadı.", lang: "tr", kind: "utility", updated: "2026-11-21", indexable: false },
  ...CEFR_GUIDE_PAGES,
];

const BY_PATH = new Map(SEO_PAGES.map((page) => [page.path, page]));

export function seoPageFor(path: string): SeoPage | undefined {
  return BY_PATH.get(path);
}

/**
 * Public paths that must never be indexed even though they render publicly:
 * personal certificates and shared reports carry candidate names, and the
 * sign-in and code pages are not useful search results.
 */
export function isPrivatePublicPath(path: string): boolean {
  return /^\/(verify|share)\/.+/.test(path)
    || ["/login", "/register", "/exam-code", "/reset-password", "/verify-email", "/guardian-verification", "/guardian-consent"].includes(path);
}
