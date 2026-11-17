/**
 * Indicative external-test alignments for the post-exam report and certificate.
 *
 * Single source of truth. Every row is a published CEFR alignment by the test
 * owner, keyed by the b4skills overall CEFR level. Nothing here is a score
 * concordance with b4skills: a candidate never "has" an IELTS, TOEFL or PTE
 * score. The mapping is CEFR level → the range of that test's scores that its
 * owner places at the same CEFR level. Display text must say so.
 *
 * Sources (checked 2026-11-17):
 *  - IELTS: "IELTS and the CEFR", ielts.org (chart: C2 8.5–9, C1 7–8 with 8 borderline,
 *    B2 5.5–6.5, B1 4–5 with 5 borderline; IELTS reports no alignment below band 4).
 *  - TOEFL iBT: Papageorgiou, Li, Gu & Barton (ETS, April 2026), "A banded score scale
 *    for the TOEFL iBT test", Table 7 (1–6 band → CEFR) and Table 6 (1–6 band → legacy
 *    0–120 total). The 0–120 ranges below are the totals that Table 6 assigns to the
 *    bands of each CEFR level (e.g. B2 = bands 4–4.5 = totals 72–94).
 *  - PTE Academic: Pearson, "PTE Academic Institution Score Guide" (July 2025), Appendix:
 *    10–29 A1 or below, 30–42 A2, 43–58 B1, 59–75 B2, 76–84 C1, 85–90 C2.
 *  - Cambridge English Qualifications (young learners and "for Schools"): the level is part
 *    of each qualification's name (Pre A1 Starters, A1 Movers, A2 Flyers, A2 Key for Schools,
 *    B1 Preliminary for Schools, B2 First for Schools), cambridgeenglish.org.
 *
 * Do not add rows from third-party blogs, and do not interpolate scores from theta.
 */
import type { CefrLevel } from '../cefr/cefr-framework.js';

export type EquivalenceLocale = 'en' | 'tr';
export type EquivalenceAudience = 'adult' | 'young_learner';
export type ExternalTest = 'IELTS' | 'TOEFL_IBT' | 'PTE_ACADEMIC' | 'CAMBRIDGE_YL';

export interface EquivalenceSource {
  test: ExternalTest;
  name: string;
  publisher: string;
  title: string;
  /** 'YYYY-MM' publication month, or 'YYYY-MM-DD' access date when the page is undated. */
  date: string;
  dateKind: 'published' | 'accessed';
  url: string;
}

export const EQUIVALENCE_SOURCES: Record<ExternalTest, EquivalenceSource> = {
  IELTS: {
    test: 'IELTS', name: 'IELTS Academic', publisher: 'IELTS (British Council, IDP, Cambridge University Press & Assessment)',
    title: 'IELTS and the CEFR', date: '2026-11-17', dateKind: 'accessed',
    url: 'https://ielts.org/organisations/ielts-for-organisations/compare-ielts/ielts-and-the-cefr',
  },
  TOEFL_IBT: {
    test: 'TOEFL_IBT', name: 'TOEFL iBT', publisher: 'ETS',
    title: 'A banded score scale for the TOEFL iBT test: Rationale, development, and score linking (Tables 6–7)', date: '2026-04', dateKind: 'published',
    url: 'https://www.ets.org/content/dam/ets-org/pdfs/toefl/score-scale-update-2026.pdf',
  },
  PTE_ACADEMIC: {
    test: 'PTE_ACADEMIC', name: 'PTE Academic', publisher: 'Pearson',
    title: 'PTE Academic Institution Score Guide, Appendix', date: '2025-07', dateKind: 'published',
    url: 'https://www.pearsonpte.com/ctf-assets/yqwtwibiobs4/5DRw75hgULAIPO8L65PBE9/0fc1aff4b40d058de93511fed70ee26c/pte-academic-institution-score-guide-nov-2024-v2.pdf',
  },
  CAMBRIDGE_YL: {
    test: 'CAMBRIDGE_YL', name: 'Cambridge English Qualifications', publisher: 'Cambridge University Press & Assessment',
    title: 'Cambridge English Qualifications for young learners and for schools (CEFR level stated in each qualification name)', date: '2026-11-17', dateKind: 'accessed',
    url: 'https://www.cambridgeenglish.org/exams-and-tests/qualifications/',
  },
};

/** null = the test owner publishes no alignment at this CEFR level. */
interface Row { IELTS: string | null; TOEFL_BAND: string | null; TOEFL_LEGACY: string | null; PTE: string | null; CAMBRIDGE_YL: string }

export const EQUIVALENCE_TABLE: Record<CefrLevel, Row> = {
  PRE_A1: { IELTS: null,      TOEFL_BAND: null,      TOEFL_LEGACY: null,     PTE: null,    CAMBRIDGE_YL: 'Pre A1 Starters' },
  A1:     { IELTS: null,      TOEFL_BAND: '1–1.5',   TOEFL_LEGACY: '0–23',   PTE: '10–29', CAMBRIDGE_YL: 'A1 Movers' },
  A2:     { IELTS: null,      TOEFL_BAND: '2–2.5',   TOEFL_LEGACY: '24–43',  PTE: '30–42', CAMBRIDGE_YL: 'A2 Flyers · A2 Key for Schools' },
  B1:     { IELTS: '4.0–5.0', TOEFL_BAND: '3–3.5',   TOEFL_LEGACY: '44–71',  PTE: '43–58', CAMBRIDGE_YL: 'B1 Preliminary for Schools' },
  B2:     { IELTS: '5.5–6.5', TOEFL_BAND: '4–4.5',   TOEFL_LEGACY: '72–94',  PTE: '59–75', CAMBRIDGE_YL: 'B2 First for Schools' },
  C1:     { IELTS: '7.0–8.0', TOEFL_BAND: '5–5.5',   TOEFL_LEGACY: '95–113', PTE: '76–84', CAMBRIDGE_YL: 'C1 Advanced' },
  C2:     { IELTS: '8.5–9.0', TOEFL_BAND: '6',       TOEFL_LEGACY: '114–120', PTE: '85–90', CAMBRIDGE_YL: 'C2 Proficiency' },
};

/** Bands the test owner itself marks as borderline between two CEFR levels. */
export const IELTS_BORDERLINE_NOTE = { en: 'IELTS marks band 8.0 as borderline C1/C2 and band 5.0 as borderline B1/B2.', tr: 'IELTS, 8.0 bandını C1/C2, 5.0 bandını B1/B2 sınırında kabul eder.' };

export interface EquivalenceRow {
  test: ExternalTest;
  label: string;
  /** Display range, or null when the owner publishes no alignment at this level. */
  range: string | null;
  scale: string;
  secondary?: string | null;
  note?: string;
}

export interface EquivalenceBlock {
  audience: EquivalenceAudience;
  cefr: CefrLevel;
  rows: EquivalenceRow[];
  disclaimer: string;
  sources: EquivalenceSource[];
}

const T = {
  en: {
    notReported: 'No published alignment at this level',
    ieltsScale: 'Overall band (0–9)', toeflScale: 'Total, 2026 scale (1–6)', toeflLegacy: 'legacy 0–120 total', pteScale: 'Overall score (10–90)',
    ylScale: 'Qualification at the same CEFR level', ylLabel: 'Cambridge English (young learners / for Schools)',
    disclaimerAdult: 'Indicative alignment only, not an official score. Each range is what the test owner itself places at the same CEFR level as this result; b4skills has not run a concordance study with these tests. Receiving institutions set their own score requirements.',
    disclaimerYL: 'Indicative only: the named qualification targets the same CEFR level. This is not a Cambridge result and does not predict a pass. IELTS, TOEFL iBT and PTE Academic are adult tests and are not shown for this age group.',
  },
  tr: {
    notReported: 'Bu seviye için yayımlanmış eşleme yok',
    ieltsScale: 'Genel band (0–9)', toeflScale: 'Toplam, 2026 ölçeği (1–6)', toeflLegacy: 'eski 0–120 toplam', pteScale: 'Genel puan (10–90)',
    ylScale: 'Aynı CEFR seviyesindeki sınav', ylLabel: 'Cambridge English (küçük yaş / for Schools)',
    disclaimerAdult: 'Yalnızca yaklaşık bir karşılıktır; resmî puan değildir. Her aralık, sınavın sahibinin bu sonuçla aynı CEFR seviyesine yerleştirdiği puanlardır; b4skills bu sınavlarla bir eşdeğerlik (concordance) çalışması yapmamıştır. Kabul eden kurumlar kendi puan şartlarını belirler.',
    disclaimerYL: 'Yalnızca yol göstericidir: adı geçen sınav aynı CEFR seviyesini hedefler. Bu bir Cambridge sonucu değildir ve sınavı geçmeyi öngörmez. IELTS, TOEFL iBT ve PTE Academic yetişkin sınavlarıdır; bu yaş grubu için gösterilmez.',
  },
} as const;

/** Profiles for children (Primary 7-10, Junior 11-14) use age-appropriate wording. */
export function audienceForProfile(profile: { reportTemplate?: string; ageRange?: [number, number] } | null | undefined): EquivalenceAudience {
  if (!profile) return 'adult';
  if (profile.reportTemplate === 'yle' || profile.reportTemplate === 'toefl_junior') return 'young_learner';
  return profile.ageRange && profile.ageRange[1] <= 14 ? 'young_learner' : 'adult';
}

/**
 * Equivalence block for a reported overall CEFR level. Returns null when no
 * final level exists — never derive an alignment from a provisional result.
 */
export function externalEquivalences(cefr: CefrLevel | null, audience: EquivalenceAudience, locale: EquivalenceLocale = 'en'): EquivalenceBlock | null {
  if (!cefr || !Object.hasOwn(EQUIVALENCE_TABLE, cefr)) return null;
  const row = EQUIVALENCE_TABLE[cefr];
  const t = T[locale];
  if (audience === 'young_learner') {
    return {
      audience, cefr, disclaimer: t.disclaimerYL, sources: [EQUIVALENCE_SOURCES.CAMBRIDGE_YL],
      rows: [{ test: 'CAMBRIDGE_YL', label: t.ylLabel, range: row.CAMBRIDGE_YL, scale: t.ylScale }],
    };
  }
  return {
    audience, cefr, disclaimer: t.disclaimerAdult,
    sources: [EQUIVALENCE_SOURCES.IELTS, EQUIVALENCE_SOURCES.TOEFL_IBT, EQUIVALENCE_SOURCES.PTE_ACADEMIC],
    rows: [
      { test: 'IELTS', label: 'IELTS Academic', range: row.IELTS, scale: t.ieltsScale,
        note: cefr === 'B1' || cefr === 'B2' || cefr === 'C1' || cefr === 'C2' ? IELTS_BORDERLINE_NOTE[locale] : undefined },
      { test: 'TOEFL_IBT', label: 'TOEFL iBT', range: row.TOEFL_BAND, scale: t.toeflScale,
        secondary: row.TOEFL_LEGACY ? `${t.toeflLegacy}: ${row.TOEFL_LEGACY}` : null },
      { test: 'PTE_ACADEMIC', label: 'PTE Academic', range: row.PTE, scale: t.pteScale },
    ],
  };
}

export const NOT_REPORTED_LABEL = { en: T.en.notReported, tr: T.tr.notReported };

export function formatSourceDate(source: EquivalenceSource, locale: EquivalenceLocale): string {
  if (source.dateKind === 'accessed') return `${locale === 'tr' ? 'erişim' : 'accessed'} ${source.date}`;
  const [y, m] = source.date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
