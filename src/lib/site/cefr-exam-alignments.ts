/**
 * CEFR alignments published by the exam owners themselves, checked against
 * their own pages on EXAM_ALIGNMENT_CHECKED. These are context for readers,
 * not a b4skills concordance (see the Methodology FAQ). Re-check the sources
 * before changing a number, and update EXAM_ALIGNMENT_CHECKED.
 *
 * Pearson publishes the PTE Academic alignment only as a chart with
 * overlapping ranges, so PTE is left out until a numeric table exists.
 */
import type { GuideLevel } from "./cefr-guides";

export const EXAM_ALIGNMENT_CHECKED = "2026-11-21";

export interface ExamAlignment {
  exam: string;
  owner: string;
  scale: string;
  byLevel: Partial<Record<GuideLevel, string>>;
  note: string;
  /** Turkish label, scale and note for /cefr-seviyeleri. */
  tr: { exam: string; scale: string; note: string };
  sourceName: string;
  sourceUrl: string;
}

/** "—" when the owner publishes no range for that level. */
export function alignmentFor(exam: ExamAlignment, level: GuideLevel): string {
  return exam.byLevel[level] ?? "—";
}

export const EXAM_ALIGNMENTS: readonly ExamAlignment[] = [
  {
    exam: "IELTS",
    tr: { exam: "IELTS", scale: "Genel bant 0–9", note: "IELTS bu eşleşmeyi kesin bir denklik olarak değil, araştırmaya dayalı bir rehber olarak ve yalnızca genel bant için yayımlar. Bant 5, B1/B2 sınırında; bant 8, C1/C2 sınırındadır. IELTS A1 ve A2 seviyelerini raporlamaz." },
    owner: "IELTS partners (British Council, IDP, Cambridge)",
    scale: "Overall band 0–9",
    byLevel: { B1: "4.0–5.0", B2: "5.5–6.5", C1: "7.0–8.0", C2: "8.5–9.0" },
    note: "IELTS publishes this as research-based guidance, not an exact equivalence, and for overall bands only. Band 5 sits on the B1/B2 border and band 8 on the C1/C2 border. IELTS does not report A1 or A2.",
    sourceName: "IELTS — IELTS and the CEFR",
    sourceUrl: "https://ielts.org/organisations/ielts-for-organisations/compare-ielts/ielts-and-the-cefr",
  },
  {
    exam: "TOEFL iBT (from Jan 2026)",
    tr: { exam: "TOEFL iBT (Ocak 2026'dan itibaren)", scale: "Bant 1–6", note: "21 Ocak 2026'dan bu yana TOEFL iBT her bölümü ve genel puanı yarım bantlarla, CEFR ile hizalanmış 1–6 ölçeğinde raporlar. Aynı bant, her bölümde aynı CEFR seviyesini gösterir." },
    owner: "ETS",
    scale: "Band 1–6",
    byLevel: { A1: "1.0–1.5", A2: "2.0–2.5", B1: "3.0–3.5", B2: "4.0–4.5", C1: "5.0–5.5", C2: "6.0" },
    note: "Since 21 January 2026 TOEFL iBT reports each section and the overall score on a CEFR-aligned 1–6 scale in half bands. The same band means the same CEFR level in every section.",
    sourceName: "ETS — TOEFL iBT score scale update",
    sourceUrl: "https://toeflaccess.ets.org/help/en/articles/11758616-toefl-ibt-score-scale-update-what-you-need-to-know",
  },
  {
    exam: "TOEFL iBT (before 2026)",
    tr: { exam: "TOEFL iBT (2026 öncesi)", scale: "Toplam 0–120", note: "21 Ocak 2026'dan önce girilen sınavlar 0–120 ölçeğini kullanır ve bu puanlar iki yıl geçerlidir. ETS, B1–C2 için asgari toplam puanları yayımlar; en yüksek puanlar için muhtemel seviyeyi C2 olarak tanımlar." },
    owner: "ETS",
    scale: "Total 0–120",
    byLevel: { B1: "42–71", B2: "72–94", C1: "95–113", C2: "114–120" },
    note: "Tests taken before 21 January 2026 used the 0–120 scale; those scores remain valid for two years. ETS publishes minimum totals for B1 to C2 and describes C2 as the likely level for the top scores.",
    sourceName: "ETS — Compare TOEFL iBT scores to the CEFR",
    sourceUrl: "https://www.in.ets.org/toefl/score-users/ibt/compare-scores.html",
  },
  {
    exam: "Cambridge English",
    tr: { exam: "Cambridge English", scale: "Cambridge English Scale", note: "Cambridge English sınavları sonuçları, Cambridge'in CEFR'yi tamamlayacak şekilde tasarladığı Cambridge English Scale üzerinde raporlar. A2 Key, B1 Preliminary, B2 First, C1 Advanced ve C2 Proficiency adlarındaki seviyeyi hedefler; güçlü sonuçlar bir üst seviyede raporlanabilir." },
    owner: "Cambridge University Press & Assessment",
    scale: "Cambridge English Scale",
    byLevel: { A1: "100–119", A2: "120–139", B1: "140–159", B2: "160–179", C1: "180–199", C2: "200–230" },
    note: "Cambridge English Qualifications report results on the Cambridge English Scale, which Cambridge designs to complement the CEFR. A2 Key, B1 Preliminary, B2 First, C1 Advanced and C2 Proficiency each target the level in their name, and strong results can be reported one level higher.",
    sourceName: "Cambridge English — Results for Cambridge English Qualifications",
    sourceUrl: "https://www.cambridgeenglish.org/exams-and-tests/qualifications/results/",
  },
  {
    exam: "Duolingo English Test",
    tr: { exam: "Duolingo English Test", scale: "Puan 10–160", note: "Duolingo, B1–C2 için dış uzmanlarca incelenmiş bir hizalama çalışması yayımlar. A1 ve A2 için aralık yayımlamaz." },
    owner: "Duolingo",
    scale: "Score 10–160",
    byLevel: { B1: "60–95", B2: "100–125", C1: "130–150", C2: "155–160" },
    note: "Duolingo reports an externally reviewed alignment study for B1 to C2. It does not publish A1 or A2 ranges.",
    sourceName: "Duolingo English Test — DET aligned with the CEFR",
    sourceUrl: "https://blog.englishtest.duolingo.com/duolingo-test-aligned-with-cefr/",
  },
];

/**
 * Cumulative guided learning hours from complete beginner, as published by
 * Cambridge English ("a guideline only"; about 200 hours per level step).
 */
export const GUIDED_LEARNING_HOURS: Record<GuideLevel, string> = {
  A1: "90–100", A2: "180–200", B1: "350–400", B2: "500–600", C1: "700–800", C2: "1,000–1,200",
};
export const GUIDED_LEARNING_HOURS_SOURCE = "https://support.cambridgeenglish.org/hc/en-gb/articles/202838506-Guided-learning-hours";
