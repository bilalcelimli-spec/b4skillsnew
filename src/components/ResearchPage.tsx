/**
 * Research & Validity — /research
 *
 * Public page presenting b4skills' psychometric validity evidence:
 * concurrent validity data, methodology references, and links to
 * the admin concurrent-validity submission form for researchers.
 */

import React, { useEffect, useState } from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { FlaskConical, BookOpen, TrendingUp, Users, CheckCircle2, ExternalLink, BarChart3, AlertCircle } from "lucide-react";

interface Props {
  onStart?: () => void;
  onCodeEntry?: () => void;
}

interface ValidityRow {
  externalTest: string;
  n: number;
  pearsonR: number;
  spearmanRho: number;
  exactCefrAgreement: number;
  adjacentCefrAgreement: number;
  blandAltmanMeanDiff: number;
  blandAltmanLoA: { lower: number; upper: number };
}

interface SummaryData {
  lastUpdated: string;
  totalPairs: number;
  tests: ValidityRow[];
}

const DISPLAY_NAMES: Record<string, string> = {
  IELTS: "IELTS Academic",
  TOEFL_IBT: "TOEFL iBT",
  CAMBRIDGE_FCE: "Cambridge B2 First",
  CAMBRIDGE_CAE: "Cambridge C1 Advanced",
  TOEIC: "TOEIC",
  DUOLINGO: "Duolingo English Test",
};

function rBar(r: number): React.ReactNode {
  const pct = Math.round(r * 100);
  const color = r >= 0.85 ? "bg-emerald-500" : r >= 0.70 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-grow bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-10 text-right">{r.toFixed(3)}</span>
    </div>
  );
}

export const ResearchPage: React.FC<Props> = ({ onStart, onCodeEntry }) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/research/concurrent-validity/summary")
      .then((r) => r.json())
      .then((d) => { setSummary(d); setLoading(false); })
      .catch(() => { setError("Data temporarily unavailable."); setLoading(false); });
  }, []);

  const hasSufficientData = summary && summary.tests.some((t) => t.n >= 30);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteNav onStart={onStart ?? (() => {})} onCodeEntry={onCodeEntry ?? (() => {})} />

      <main className="flex-grow">
        {/* Hero */}
        <section className="pt-32 pb-16 px-6 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest mb-6">
            <FlaskConical size={13} />
            Validity & Research
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-5">
            Psychometric Validity<br className="hidden md:block" /> Evidence
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
            Rigorous psychometric evidence is the foundation of any trustworthy assessment platform.
            This page presents b4skills' ongoing concurrent validity research — how our adaptive
            CEFR scores correlate with gold-standard external tests.
          </p>
        </section>

        {/* Concurrent Validity Data */}
        <section className="py-12 px-6 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <BarChart3 size={22} className="text-indigo-500" />
            Concurrent Validity
          </h2>
          <p className="text-slate-500 text-sm mb-6 max-w-2xl">
            Pearson r and Spearman ρ between b4skills θ estimates and criterion scores.
            Industry benchmark for high-stakes certification: <strong>r ≥ 0.85</strong> (IELTS/TOEFL).
          </p>

          {loading && (
            <div className="flex items-center gap-3 text-slate-400 py-8">
              <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
              Loading validity data…
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {summary && !hasSufficientData && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
              <FlaskConical size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700 mb-1">Data collection in progress</p>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                We are currently collecting concurrent validity pairs with n ≥ 30 per external test.
                Results will appear here once we reach the minimum threshold for reporting.
              </p>
              <p className="text-xs text-slate-400 mt-4">
                {summary.totalPairs} pair{summary.totalPairs !== 1 ? "s" : ""} collected so far.
                Are you a researcher? <a href="mailto:research@b4skills.com" className="text-indigo-600 hover:underline">Contact us</a>.
              </p>
            </div>
          )}

          {summary && hasSufficientData && (
            <>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="text-left px-5 py-3">External Test</th>
                      <th className="text-right px-4 py-3">n</th>
                      <th className="px-4 py-3 min-w-[160px]">Pearson r</th>
                      <th className="text-right px-4 py-3">Spearman ρ</th>
                      <th className="text-right px-4 py-3">CEFR exact</th>
                      <th className="text-right px-4 py-3">CEFR ±1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.tests
                      .filter((t) => t.n >= 30)
                      .map((row) => (
                        <tr key={row.externalTest} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-800">
                            {DISPLAY_NAMES[row.externalTest] ?? row.externalTest}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.n}</td>
                          <td className="px-4 py-3">{rBar(row.pearsonR)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.spearmanRho.toFixed(3)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600">{(row.exactCefrAgreement * 100).toFixed(1)}%</td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600">{(row.adjacentCefrAgreement * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Last updated: {summary.lastUpdated}. n = number of concurrent validity pairs.
                Only tests with n ≥ 30 are shown. Bland-Altman limits of agreement available on request.
              </p>
            </>
          )}
        </section>

        {/* Methodology overview */}
        <section className="py-12 bg-slate-50">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2">
              <BookOpen size={22} className="text-indigo-500" />
              Psychometric Framework
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <TrendingUp size={20} className="text-indigo-500" />,
                  title: "Item Response Theory (3PL)",
                  body: "Every item is calibrated under the three-parameter logistic model. Discrimination (a), difficulty (b), and pseudo-guessing (c) parameters are estimated via marginal maximum likelihood using ≥ 200 responses per item.",
                },
                {
                  icon: <BarChart3 size={20} className="text-indigo-500" />,
                  title: "CAT — EAP θ Estimation",
                  body: "The adaptive engine uses Expected A Posteriori (EAP) θ estimation with a normal N(0,1) prior. Item selection maximises Fisher information at the current θ estimate. Sessions terminate when SEM ≤ 0.30.",
                },
                {
                  icon: <CheckCircle2 size={20} className="text-indigo-500" />,
                  title: "CEFR Alignment",
                  body: "Cut scores are anchored to the CEFR via a standard-setting study using the Bookmark method. Provisional thresholds are reviewed against concurrent validity evidence and updated when n ≥ 200 per level boundary.",
                },
                {
                  icon: <Users size={20} className="text-indigo-500" />,
                  title: "DIF & Fairness Analysis",
                  body: "Differential Item Functioning (DIF) is monitored using the Mantel-Haenszel statistic across gender, age group, and L1 language. Items flagged for DIF are reviewed and retired if bias is confirmed.",
                },
                {
                  icon: <FlaskConical size={20} className="text-indigo-500" />,
                  title: "AI Scoring Governance",
                  body: "Open-ended responses (Writing & Speaking) are scored by a multi-rater ensemble (Gemini, GPT-4, Claude). Low-confidence outputs are escalated to a human examiner queue. Inter-rater reliability (QWK) is monitored monthly.",
                },
                {
                  icon: <BookOpen size={20} className="text-indigo-500" />,
                  title: "Concurrent Validity Design",
                  body: "Concurrent validity pairs require the external test to be taken within ±30 days of the b4skills assessment. Both self-reported and verified (official document) data sources are tracked separately in all analyses.",
                },
              ].map(({ icon, title, body }) => (
                <div key={title} className="bg-white rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    {icon}
                    <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* References */}
        <section className="py-12 px-6 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BookOpen size={22} className="text-indigo-500" />
            Key References
          </h2>
          <ul className="space-y-3 text-sm text-slate-600">
            {[
              "Baker, F. B., & Kim, S. H. (2004). Item Response Theory: Parameter Estimation Techniques (2nd ed.). Marcel Dekker.",
              "Bland, J. M., & Altman, D. G. (1986). Statistical methods for assessing agreement between two methods of clinical measurement. The Lancet, 327, 307–310.",
              "Council of Europe. (2001). Common European Framework of Reference for Languages: Learning, Teaching, Assessment. Cambridge University Press.",
              "Kane, M. T. (2013). Validating the interpretations and uses of test scores. Journal of Educational Measurement, 50(1), 1–73.",
              "Lord, F. M. (1980). Applications of Item Response Theory to Practical Testing Problems. Lawrence Erlbaum.",
              "Reckase, M. D. (2009). Multidimensional Item Response Theory. Springer.",
              "Wainer, H. (Ed.). (2000). Computerized Adaptive Testing: A Primer (2nd ed.). Lawrence Erlbaum.",
            ].map((ref) => (
              <li key={ref} className="pl-4 border-l-2 border-slate-200 leading-relaxed">{ref}</li>
            ))}
          </ul>
        </section>

        {/* Researcher CTA */}
        <section className="py-16 px-6 bg-indigo-600">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Collaborate with Us</h2>
            <p className="text-indigo-200 mb-6 text-sm leading-relaxed max-w-xl mx-auto">
              We are actively seeking university partners for concurrent validity studies. If your institution
              can provide IELTS/TOEFL/Cambridge scores alongside b4skills assessments, we would like to hear from you.
            </p>
            <a
              href="mailto:research@b4skills.com"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm"
            >
              <ExternalLink size={16} />
              research@b4skills.com
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};
