import React, { useEffect } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Ear, MessageCircle, PenLine } from "lucide-react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import {
  CEFR_EXAM_COMPARISON_PATH, CEFR_GUIDE_HUB_PATH, LEVEL_GUIDES, guideForPath, levelGuidePath, neighbours,
  type GuideLevel, type LevelGuide,
} from "../lib/site/cefr-guides";
import { EXAM_ALIGNMENTS, EXAM_ALIGNMENT_CHECKED, GUIDED_LEARNING_HOURS, GUIDED_LEARNING_HOURS_SOURCE, alignmentFor } from "../lib/site/cefr-exam-alignments";
import { seoPageFor } from "../lib/site/seo-pages";

const SKILL_ICON = { Reading: BookOpen, Listening: Ear, Speaking: MessageCircle, Writing: PenLine } as const;
const QUICK_CHECK_HREF = "/english-level-test";

const Hero: React.FC<{ kicker: string; title: string; children?: React.ReactNode }> = ({ kicker, title, children }) => (
  <section className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#9b276c] text-white pt-32 pb-16 px-6">
    <div className="max-w-3xl mx-auto">
      <nav aria-label="Breadcrumb" className="text-sm text-white/60 mb-6">
        <a href="/" className="hover:text-white">b4skills</a>
        <span aria-hidden="true"> / </span>
        <a href={CEFR_GUIDE_HUB_PATH} className="hover:text-white">CEFR levels</a>
      </nav>
      <p className="text-xs font-black tracking-[0.25em] uppercase text-indigo-300 mb-3">{kicker}</p>
      <h1 className="text-4xl md:text-5xl font-black leading-tight">{title}</h1>
      {children}
    </div>
  </section>
);

const QuickCheckCta: React.FC = () => (
  <aside className="rounded-2xl bg-slate-900 text-white p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between">
    <div>
      <h2 className="text-xl font-black mb-2">Not sure which level you are?</h2>
      <p className="text-sm text-white/70 max-w-md">
        The free b4skills Quick Check is an adaptive test of about 20–30 minutes that gives a provisional CEFR estimate. No account required.
      </p>
    </div>
    <a href={QUICK_CHECK_HREF} className="inline-flex items-center gap-2 bg-[#9b276c] hover:bg-[#7d1f57] text-white font-bold rounded-full px-6 py-3 whitespace-nowrap">
      Take the free test <ArrowRight size={16} aria-hidden="true" />
    </a>
  </aside>
);

const Faq: React.FC<{ items: { q: string; a: string }[] }> = ({ items }) => (
  <section aria-labelledby="faq">
    <h2 id="faq" className="text-2xl font-black text-slate-900 mb-4">Frequently asked questions</h2>
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.q} className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-2">{item.q}</h3>
          <p className="text-slate-600 leading-relaxed">{item.a}</p>
        </div>
      ))}
    </div>
  </section>
);

const List: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <section>
    <h2 className="text-2xl font-black text-slate-900 mb-4">{title}</h2>
    <ul className="list-disc pl-6 space-y-2 text-slate-700 leading-relaxed">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  </section>
);

const Updated: React.FC<{ path: string }> = ({ path }) => {
  const page = seoPageFor(path);
  return page ? <p className="text-xs text-slate-500">Last updated {page.updated} · b4skills editorial team · Level descriptions are our own summary of the CEFR, published by the Council of Europe.</p> : null;
};

const ExamRows: React.FC<{ level: GuideLevel }> = ({ level }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm bg-white rounded-2xl border border-slate-100">
      <caption className="sr-only">Published {level} score ranges by exam</caption>
      <thead><tr className="text-left text-slate-500"><th className="p-4">Exam</th><th className="p-4">Published {level} range</th></tr></thead>
      <tbody>
        {EXAM_ALIGNMENTS.map((exam) => (
          <tr key={exam.exam} className="border-t border-slate-100">
            <td className="p-4 font-bold text-slate-900">{exam.exam}</td>
            <td className="p-4 text-slate-700">{alignmentFor(exam, level)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const LevelGuideView: React.FC<{ guide: LevelGuide }> = ({ guide }) => {
  const { previous, next } = neighbours(guide);
  const path = levelGuidePath(guide);
  return (
    <>
      <Hero kicker={`CEFR ${guide.level} · ${guide.band}`} title={`What is ${guide.level} level English?`}>
        <p className="text-lg text-white/80 mt-6 leading-relaxed">{guide.answer}</p>
      </Hero>
      <main className="max-w-3xl mx-auto px-6 py-14 space-y-12">
        <Updated path={path} />
        <section>
          <h2 className="text-2xl font-black text-slate-900 mb-4">What {guide.level.startsWith("A") ? "an" : "a"} {guide.level} learner can do</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {guide.canDo.map(({ skill, points }) => {
              const Icon = SKILL_ICON[skill];
              return (
                <div key={skill} className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-3"><Icon size={18} className="text-[#9b276c]" aria-hidden="true" />{skill}</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 leading-relaxed">{points.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
              );
            })}
          </div>
        </section>
        <List title={`Grammar and vocabulary at ${guide.level}`} items={guide.language} />
        <List title={`What ${guide.level} English is enough for`} items={guide.goodFor} />
        <List title={`What is still hard at ${guide.level}`} items={guide.limits} />
        <section>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{guide.level} in other English exams</h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            These are the score ranges each exam owner publishes for {guide.level}. They are not b4skills equivalents.{" "}
            <a href={CEFR_EXAM_COMPARISON_PATH} className="text-[#9b276c] underline">Full comparison and sources</a>.
          </p>
          <ExamRows level={guide.level} />
        </section>
        <section>
          <h2 className="text-2xl font-black text-slate-900 mb-2">How long does it take to reach {guide.level}?</h2>
          <p className="text-slate-700 leading-relaxed">
            Cambridge English suggests about <strong>{GUIDED_LEARNING_HOURS[guide.level]} guided learning hours</strong> in total, counted from complete beginner, to reach {guide.level}, and roughly 200 hours to move up one level. These are guidelines only: your first language, how much you practise outside class and the intensity of study all change the figure.{" "}
            <a href={GUIDED_LEARNING_HOURS_SOURCE} className="text-[#9b276c] underline" rel="noopener" target="_blank">Source: Cambridge English</a>
          </p>
        </section>
        <List title={next ? `How to move from ${guide.level} to ${next.level}` : `Staying at ${guide.level}`} items={guide.nextSteps} />
        <Faq items={guide.faq} />
        <QuickCheckCta />
        <nav aria-label="Other levels" className="flex justify-between gap-4 text-sm font-bold">
          {previous ? <a href={levelGuidePath(previous)} className="inline-flex items-center gap-2 text-[#9b276c]"><ArrowLeft size={16} aria-hidden="true" />{previous.level} level</a> : <span />}
          {next ? <a href={levelGuidePath(next)} className="inline-flex items-center gap-2 text-[#9b276c]">{next.level} level<ArrowRight size={16} aria-hidden="true" /></a> : <span />}
        </nav>
      </main>
    </>
  );
};

const HubView: React.FC = () => (
  <>
    <Hero kicker="CEFR guide" title="CEFR levels explained: A1 to C2">
      <p className="text-lg text-white/80 mt-6 leading-relaxed">
        The Common European Framework of Reference for Languages (CEFR) describes language ability on six levels, from A1 for beginners to C2 for highly proficient users. It is published by the Council of Europe and used by schools, universities, employers and exam boards worldwide to describe what a learner can do in a language.
      </p>
    </Hero>
    <main className="max-w-3xl mx-auto px-6 py-14 space-y-12">
      <Updated path={CEFR_GUIDE_HUB_PATH} />
      <section>
        <h2 className="text-2xl font-black text-slate-900 mb-4">The six levels at a glance</h2>
        <div className="space-y-3">
          {LEVEL_GUIDES.map((guide) => (
            <a key={guide.level} href={levelGuidePath(guide)} className="group block bg-white rounded-2xl border border-slate-100 p-6 hover:border-[#9b276c]">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-2xl font-black text-[#9b276c]">{guide.level}</span>
                <span className="font-bold text-slate-900">{guide.nickname}</span>
                <span className="text-xs uppercase tracking-wider text-slate-400">{guide.band}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{guide.answer}</p>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-[#9b276c] mt-3">Read the {guide.level} guide <ArrowRight size={14} aria-hidden="true" /></span>
            </a>
          ))}
        </div>
      </section>
      <section className="space-y-4 text-slate-700 leading-relaxed">
        <h2 className="text-2xl font-black text-slate-900">How the CEFR groups the levels</h2>
        <p><strong>A1 and A2 (basic user)</strong> cover simple, everyday communication on familiar topics. <strong>B1 and B2 (independent user)</strong> describe learners who can manage on their own, from familiar situations at B1 to complex and abstract topics at B2. <strong>C1 and C2 (proficient user)</strong> describe fluent, precise use for demanding academic and professional purposes.</p>
        <p>The CEFR's 2020 Companion Volume also describes a Pre-A1 band for learners who are just beginning, and "plus" levels (such as B1+) that sit between the main levels.</p>
        <p>A CEFR level describes what someone can do, not a test score. Each exam decides how its own scores relate to the levels. Our <a href={CEFR_EXAM_COMPARISON_PATH} className="text-[#9b276c] underline">exam comparison</a> lists the ranges that IELTS, TOEFL, Cambridge and other exam owners publish.</p>
      </section>
      <QuickCheckCta />
    </main>
  </>
);

const ComparisonView: React.FC = () => (
  <>
    <Hero kicker="CEFR guide" title="English exam scores and CEFR levels">
      <p className="text-lg text-white/80 mt-6 leading-relaxed">
        How IELTS, TOEFL iBT, Cambridge English and other exams report CEFR levels, using each exam owner's own published alignment. Scores from different exams are not interchangeable; check which test and score an institution accepts.
      </p>
    </Hero>
    <main className="max-w-5xl mx-auto px-6 py-14 space-y-10">
      <Updated path={CEFR_EXAM_COMPARISON_PATH} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-2xl border border-slate-100">
          <caption className="sr-only">Published CEFR score ranges by exam</caption>
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-4">CEFR</th>
              {EXAM_ALIGNMENTS.map((exam) => <th key={exam.exam} className="p-4">{exam.exam}<span className="block font-normal text-xs">{exam.scale}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {[...LEVEL_GUIDES].reverse().map((guide) => (
              <tr key={guide.level} className="border-t border-slate-100">
                <th scope="row" className="p-4 text-left"><a href={levelGuidePath(guide)} className="font-black text-[#9b276c]">{guide.level}</a></th>
                {EXAM_ALIGNMENTS.map((exam) => <td key={exam.exam} className="p-4 text-slate-700">{alignmentFor(exam, guide.level)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="space-y-4">
        <h2 className="text-2xl font-black text-slate-900">Notes and sources</h2>
        <ul className="space-y-4 text-sm text-slate-700 leading-relaxed">
          {EXAM_ALIGNMENTS.map((exam) => (
            <li key={exam.exam} className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="font-bold text-slate-900">{exam.exam} <span className="font-normal text-slate-500">({exam.owner})</span></p>
              <p className="mt-1">{exam.note}</p>
              <p className="mt-2"><a href={exam.sourceUrl} className="text-[#9b276c] underline" rel="noopener" target="_blank">{exam.sourceName}</a></p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">Sources checked {EXAM_ALIGNMENT_CHECKED}. "—" means the owner does not publish a range for that level.</p>
      </section>
      <section className="space-y-3 text-slate-700 leading-relaxed max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900">Where b4skills fits</h2>
        <p>b4skills reports a CEFR level estimate from an adaptive test. No validated concordance between b4skills and the exams above is claimed, and a b4skills result is not an official qualification. Each receiving institution decides which results it accepts.</p>
      </section>
      <QuickCheckCta />
    </main>
  </>
);

/** Renders /cefr-levels, /cefr-levels/<level> and /cefr-levels/exam-comparison. */
export const CefrGuidePage: React.FC<{ path: string }> = ({ path }) => {
  const guide = guideForPath(path);
  useEffect(() => {
    const page = seoPageFor(path);
    if (page) document.title = page.title;
  }, [path]);
  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800">
      <SiteNav />
      {guide ? <LevelGuideView guide={guide} /> : path === CEFR_EXAM_COMPARISON_PATH ? <ComparisonView /> : <HubView />}
      <SiteFooter />
    </div>
  );
};
