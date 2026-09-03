import React, { useState, useEffect } from "react";
import { ArrowLeft, BrainCircuit, ShieldCheck, Users, BarChart3, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  onBack?: () => void;
}

const SECTIONS = [
  {
    id: "cat",
    icon: <BrainCircuit size={22} className="text-[#9b276c]" />,
    title: "Computerised Adaptive Testing (CAT)",
    body: `B4Skills uses a psychometrically rigorous CAT engine built on Item Response Theory (IRT). Rather than giving every candidate the same fixed test, the engine selects the next question based on the candidate's estimated ability (θ) after each response.

The engine uses a three-parameter logistic model (3PL) to characterise each item by its difficulty (b), discrimination (a), and guessing probability (c). Ability is estimated using Expected A Posteriori (EAP) integration over a Gaussian prior, updated after every response. Item selection maximises Fisher Information at the current θ estimate, choosing the most informative item from the active bank.

Testing stops when the Standard Error of Measurement (SEM) falls below the threshold defined for each product line, or when the maximum item count is reached. This means high-ability candidates converge faster than low-ability ones — the test is as short as it needs to be, no longer.`,
  },
  {
    id: "cefr",
    title: "CEFR Alignment",
    icon: <BarChart3 size={22} className="text-[#9b276c]" />,
    body: `All items are calibrated against the Common European Framework of Reference for Languages (CEFR) and the Council of Europe Companion Volume. Items are piloted as unscored pretests embedded in live sessions; those with ≥ 200 responses and an Item Quality Score (IQS) ≥ 65 are promoted to the active bank.

CEFR θ thresholds are derived from standard-setting exercises and anchored against externally validated items: PRE_A1 < −4.0 θ, A1 < −2.5, A2 < −1.0, B1 < 0.5, B2 < 2.0, C1 < 3.5, C2 ≥ 3.5. These thresholds flow through every score report and certificate.

A Multistage Test (MST) routing layer is applied to Writing and Speaking sections, where adaptive routing is based on the incoming θ estimate from the preceding MC sections.`,
  },
  {
    id: "ai-scoring",
    title: "AI Scoring & Human Review",
    icon: <ShieldCheck size={22} className="text-[#9b276c]" />,
    body: `Writing and Speaking responses are scored by a multi-model ensemble: Gemini, Claude, and GPT-4 each produce independent scores against CEFR-anchored rubrics across dimensions including task achievement, grammatical range and accuracy, lexical resource, coherence, and (for speaking) pronunciation and fluency.

Scores are aggregated using a weighted blend calibrated to inter-rater reliability data. Any response where the ensemble disagrees by more than one CEFR sub-band, or where confidence falls below the threshold for the current product line, is queued for human review by a certified examiner.

Speaking audio is first transcribed by OpenAI Whisper; acoustic features (speech rate, pause frequency, filler-word density, intonation diversity) are extracted from the transcript and blended with LLM fluency scores using Samejima's Graded Response Model (GRM) for polytomous scoring.`,
  },
  {
    id: "fairness",
    title: "Fairness & Bias Monitoring",
    icon: <Users size={22} className="text-[#9b276c]" />,
    body: `B4Skills applies the Mantel-Haenszel procedure to screen for Differential Item Functioning (DIF) across gender, L1 background, and age groups. Items flagged for DIF at the C level are immediately removed from the active bank pending review.

Exposure control uses a Sympson-Hetter probabilistic procedure to prevent over-exposure of high-information items, which could compromise security and inflate measurement error for subsequent cohorts.

Person-fit is assessed using the Lz statistic after each session. Aberrant response patterns (e.g., systematic misfit suggesting inattention or collusion) are flagged for examiner review and may trigger a hold on certificate issuance.`,
  },
  {
    id: "validity",
    title: "Score Validity & Certificates",
    icon: <CheckCircle2 size={22} className="text-[#9b276c]" />,
    body: `B4Skills certificates include the candidate's overall CEFR level, sub-band θ scores for each of the four skills, and a QR code linking to the verifiable record at b4skills.com/verify. Certificates are valid for two years from the date of issue.

Classification consistency and accuracy (Pc and Pa) are computed using the Lee, Brennan & Ferdous method for each product line and reported in the annual technical manual.

B4Skills is not an official CEFR qualification (such as IELTS or Cambridge). It is an adaptive computer-based assessment aligned to the CEFR framework, designed for placement, screening, and diagnostic purposes. For high-stakes contexts, B4Skills recommends pairing results with an institution-level standard-setting process.`,
  },
];

const FAQ_ITEMS = [
  {
    q: "Why does my result differ from my previous IELTS or Cambridge score?",
    a: "Different assessments measure proficiency through different tasks, rubrics, and stakes conditions. B4Skills is adaptive and computer-delivered, which can surface different strengths than timed paper-based exams. CEFR levels across tests are broadly comparable but not identical.",
  },
  {
    q: "How are items created and reviewed?",
    a: "Items are authored by trained item writers and AI-assisted generation (with human review). All items pass an editorial review before piloting, and the IQS psychometric quality screen before activation.",
  },
  {
    q: "What is θ (theta) and why does my report show it?",
    a: "θ is the latent ability estimate from IRT. Unlike a percentage score, θ is on an interval scale with a known measurement error (SEM), making it more informative for placement and longitudinal tracking. Your CEFR level is derived from your θ using the standard-setting thresholds described above.",
  },
  {
    q: "Who can access my results?",
    a: "Only you and, if you were assessed under an institutional licence, the authorised administrators of your organisation. B4Skills never sells personal data. See our Privacy Policy for full details.",
  },
];

export const MethodologyPage: React.FC<Props> = ({ onBack }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Assessment Methodology — B4Skills";
    let desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!desc) { desc = document.createElement("meta"); desc.name = "description"; document.head.appendChild(desc); }
    desc.content = "How B4Skills works: adaptive CAT engine, IRT 3PL, CEFR alignment, AI multi-model scoring, DIF fairness monitoring, and certificate validation.";
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800">
      {onBack && (
        <button
          onClick={onBack}
          className="fixed top-5 left-5 z-40 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-200 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
      )}

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#9b276c] text-white py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-black tracking-[0.25em] uppercase text-indigo-300 mb-4">Transparency</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">Assessment Methodology</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            How B4Skills measures English proficiency — the psychometrics, AI, and fairness safeguards behind every score.
          </p>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      {/* Content sections */}
      <section className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        {SECTIONS.map((s) => (
          <article key={s.id} id={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-5">
              {s.icon}
              <h2 className="text-xl font-black text-slate-900">{s.title}</h2>
            </div>
            <div className="space-y-4">
              {s.body.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm text-slate-600 leading-relaxed">{para.trim()}</p>
              ))}
            </div>
          </article>
        ))}
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-black text-center text-slate-900 mb-8">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                {item.q}
                <ChevronDown
                  size={16}
                  className={cn("ml-4 text-slate-400 transition-transform", openFaq === i && "rotate-180")}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
