import React, { useState, useEffect } from "react";
import { BrainCircuit, ShieldCheck, Users, BarChart3, CheckCircle2, ChevronDown, BookOpen, Sliders } from "lucide-react";
import { cn } from "../lib/utils";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

interface Props {
  onBack?: () => void;
  onStart?: () => void;
}

const SECTIONS = [
  {
    id: "cat",
    icon: <BrainCircuit size={22} className="text-[#9b276c]" />,
    title: "Computerised Adaptive Testing (CAT)",
    body: `The adaptive engine selects questions using the current ability estimate (θ), item information, skill coverage and exposure constraints. Objective items use IRT parameters for discrimination, difficulty and guessing. EAP estimation updates ability as scored evidence becomes available.

Testing stops according to each product’s precision targets, section coverage and item limits. A test can reach its item limit without achieving its target SEM. Reported precision must be read alongside the result.`,
  },
  {
    id: "cefr",
    title: "CEFR Alignment",
    icon: <BarChart3 size={22} className="text-[#9b276c]" />,
    body: `b4skills reports levels aligned to the CEFR using configured θ thresholds and CEFR-based task descriptors. Alignment is an intended interpretation of the assessment, not certification or endorsement by the Council of Europe.

Active item status does not by itself establish empirical calibration. Parameters and level thresholds may be provisional. Independent standard-setting and external validity evidence must be demonstrated separately; current evidence is shown on the Research page.`,
  },
  {
    id: "ai-scoring",
    title: "AI Scoring & Human Review",
    icon: <ShieldCheck size={22} className="text-[#9b276c]" />,
    body: `Full assessments support AI-assisted scoring of writing and speaking against CEFR-based rubrics. Assessment scoring uses OpenAI. Speaking audio may be transcribed before evaluation.

Responses requiring review are held for human assessment rather than treated as final scored evidence. We do not claim a published human–AI agreement coefficient. The free Quick Check does not evaluate open writing or speaking responses; its level is a provisional estimate from objectively scored responses.`,
  },
  {
    id: "fairness",
    title: "Fairness & Bias Monitoring",
    icon: <Users size={22} className="text-[#9b276c]" />,
    body: `The platform includes tools for item analysis, exposure control, person-fit checks and Mantel-Haenszel DIF screening. These tools can support item review when sufficient response and demographic data are available.

Their presence does not establish that a study has been completed or that an assessment is free of bias. Monitoring signals require contextual review and should not be treated as proof of misconduct.`,
  },
  {
    id: "item-types",
    title: "Question Types & Constructs",
    icon: <BookOpen size={22} className="text-[#9b276c]" />,
    body: `Reading and listening tasks use selected-response or structured formats to assess comprehension. Grammar and vocabulary tasks assess language use. Writing and speaking tasks collect constructed responses where supported by the assessment configuration.

Question counts, task formats and scored skill coverage vary by product. The free Quick Check includes six skill areas, but open writing and speaking responses are not evaluated or included in its provisional level.`,
  },
  {
    id: "rubrics",
    title: "AI Scoring Rubric Dimensions",
    icon: <Sliders size={22} className="text-[#9b276c]" />,
    body: `AI-assisted writing and speaking scoring uses CEFR-based rubric dimensions such as task achievement, grammatical range and accuracy, lexical resource, coherence, and speaking fluency where supported.

Dimensions, weights, providers and review thresholds depend on the scoring configuration. Model agreement is not a substitute for independent validation against human ratings; no numerical agreement claim is made here.`,
  },
  {
    id: "concordance",
    title: "External Score Concordance",
    icon: <BarChart3 size={22} className="text-[#9b276c]" />,
    body: `No independently validated conversion between b4skills scores and IELTS, TOEFL, Cambridge or Pearson scores is claimed. Sharing a CEFR label does not make scores interchangeable or establish equivalent admission requirements.

Any external score references are contextual only. The receiving institution decides which assessments and evidence it accepts. Current paired external-test observations, including an insufficient or empty sample, are disclosed on the Research page.`,
  },
  {
    id: "validity",
    title: "Score Validity & Certificates",
    icon: <CheckCircle2 size={22} className="text-[#9b276c]" />,
    body: `b4skills issues its own assessment reports and certificates. Certificate status can be checked using the verification page; verification establishes the status of a b4skills record, not accreditation or acceptance by another institution.

Reliability and validity are separate questions. The Research page distinguishes descriptive IRT marginal reliability from Cronbach alpha and does not infer reliability from item discrimination.

Independent validation remains in progress. Decisions with substantial consequences require additional evidence, appropriate human review and an institution’s own standard-setting process.`,
  },
];

const FAQ_ITEMS = [
  {
    q: "Why does my result differ from my previous IELTS or Cambridge score?",
    a: "Different assessments measure proficiency through different tasks, rubrics, and stakes conditions. b4skills is adaptive and computer-delivered, which can surface different strengths than timed paper-based exams. CEFR levels across tests are broadly comparable but not identical.",
  },
  {
    q: "How are items created and reviewed?",
    a: "Items are authored by trained item writers and AI-assisted generation (with human review). Review and calibration evidence must be checked for the relevant items; active status alone does not establish empirical calibration.",
  },
  {
    q: "What is θ (theta) and why does my report show it?",
    a: "θ is the latent ability estimate from IRT. Unlike a percentage score, θ is on an interval scale with a known measurement error (SEM), making it more informative for placement and longitudinal tracking. Your CEFR level is derived from your θ using the configured thresholds described above.",
  },
  {
    q: "Who can access my results?",
    a: "Only you and, if you were assessed under an institutional licence, the authorised administrators of your organisation. b4skills never sells personal data. See our Privacy Policy for full details.",
  },
  {
    q: "How does the AI scoring compare to human raters?",
    a: "No independently validated human–AI agreement coefficient is published here. AI-assisted results should be interpreted with the applicable review status and the evidence on the Research page.",
  },
  {
    q: "Are b4skills IELTS / TOEFL equivalents official?",
    a: "No. No validated b4skills concordance study is claimed. External score references are contextual only. IELTS, TOEFL iBT, and Cambridge exams are independently administered and their scores cannot be guaranteed to be interchangeable with b4skills results.",
  },
];

export const MethodologyPage: React.FC<Props> = ({ onBack, onStart }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Assessment Methodology — b4skills";
    let desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!desc) { desc = document.createElement("meta"); desc.name = "description"; document.head.appendChild(desc); }
    desc.content = "How b4skills works: adaptive CAT engine, IRT 3PL, CEFR alignment, AI multi-model scoring, DIF fairness monitoring, and certificate validation.";
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800">
      <SiteNav onStart={onStart ?? onBack ?? (() => window.location.assign("/"))} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#9b276c] text-white pt-32 pb-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-black tracking-[0.25em] uppercase text-indigo-300 mb-4">Transparency</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">Assessment Methodology</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            How b4skills measures English proficiency — the psychometrics, AI, and fairness safeguards behind every score.
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
      <SiteFooter />
    </div>
  );
};
