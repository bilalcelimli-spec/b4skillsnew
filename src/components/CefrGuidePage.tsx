import React, { useEffect } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Ear, MessageCircle, PenLine } from "lucide-react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import {
  GUIDE_SECTION_PATHS, guideForPath, guideLangForPath, guidesFor, levelGuidePath, neighbours,
  type GuideLang, type GuideLevel, type LevelGuide,
} from "../lib/site/cefr-guides";
import { EXAM_ALIGNMENTS, EXAM_ALIGNMENT_CHECKED, GUIDED_LEARNING_HOURS, GUIDED_LEARNING_HOURS_SOURCE, alignmentFor, type ExamAlignment } from "../lib/site/cefr-exam-alignments";
import { seoPageFor } from "../lib/site/seo-pages";

const SKILL_ICON = { Reading: BookOpen, Listening: Ear, Speaking: MessageCircle, Writing: PenLine } as const;

/** Every interface string on the guide pages, per language. */
const UI = {
  en: {
    quickCheckHref: "/english-level-test",
    sectionName: "CEFR levels",
    guideKicker: "CEFR guide",
    skill: { Reading: "Reading", Listening: "Listening", Speaking: "Speaking", Writing: "Writing" },
    ctaTitle: "Not sure which level you are?",
    ctaText: "The free b4skills Quick Check is an adaptive test of about 20–30 minutes that gives a provisional CEFR estimate. No account required.",
    ctaButton: "Take the free test",
    faq: "Frequently asked questions",
    updated: (date: string) => `Last updated ${date} · b4skills editorial team · Level descriptions are our own summary of the CEFR, published by the Council of Europe.`,
    levelTitle: (l: string) => `What is ${l} level English?`,
    canDo: (l: string) => `What ${l.startsWith("A") ? "an" : "a"} ${l} learner can do`,
    language: (l: string) => `Grammar and vocabulary at ${l}`,
    goodFor: (l: string) => `What ${l} English is enough for`,
    limits: (l: string) => `What is still hard at ${l}`,
    examsTitle: (l: string) => `${l} in other English exams`,
    examsText: (l: string) => `These are the score ranges each exam owner publishes for ${l}. They are not b4skills equivalents.`,
    examsLink: "Full comparison and sources",
    examCol: "Exam",
    rangeCol: (l: string) => `Published ${l} range`,
    hoursTitle: (l: string) => `How long does it take to reach ${l}?`,
    hours: (l: string, h: string) => <>Cambridge English suggests about <strong>{h} guided learning hours</strong> in total, counted from complete beginner, to reach {l}, and roughly 200 hours to move up one level. These are guidelines only: your first language, how much you practise outside class and the intensity of study all change the figure.</>,
    hoursSource: "Source: Cambridge English",
    nextTitle: (l: string, n?: string) => (n ? `How to move from ${l} to ${n}` : `Staying at ${l}`),
    otherLevels: "Other levels",
    levelLink: (l: string) => `${l} level`,
    hubTitle: "CEFR levels explained: A1 to C2",
    hubIntro: "The Common European Framework of Reference for Languages (CEFR) describes language ability on six levels, from A1 for beginners to C2 for highly proficient users. It is published by the Council of Europe and used by schools, universities, employers and exam boards worldwide to describe what a learner can do in a language.",
    glance: "The six levels at a glance",
    readGuide: (l: string) => `Read the ${l} guide`,
    groupsTitle: "How the CEFR groups the levels",
    groups: <><strong>A1 and A2 (basic user)</strong> cover simple, everyday communication on familiar topics. <strong>B1 and B2 (independent user)</strong> describe learners who can manage on their own, from familiar situations at B1 to complex and abstract topics at B2. <strong>C1 and C2 (proficient user)</strong> describe fluent, precise use for demanding academic and professional purposes.</>,
    plus: "The CEFR's 2020 Companion Volume also describes a Pre-A1 band for learners who are just beginning, and \"plus\" levels (such as B1+) that sit between the main levels.",
    scoreNote: (link: React.ReactNode) => <>A CEFR level describes what someone can do, not a test score. Each exam decides how its own scores relate to the levels. Our {link} lists the ranges that IELTS, TOEFL, Cambridge and other exam owners publish.</>,
    comparisonLinkText: "exam comparison",
    compTitle: "English exam scores and CEFR levels",
    compIntro: "How IELTS, TOEFL iBT, Cambridge English and other exams report CEFR levels, using each exam owner's own published alignment. Scores from different exams are not interchangeable; check which test and score an institution accepts.",
    compCaption: "Published CEFR score ranges by exam",
    notesTitle: "Notes and sources",
    checked: (d: string) => `Sources checked ${d}. "—" means the owner does not publish a range for that level.`,
    fitTitle: "Where b4skills fits",
    fit: "b4skills reports a CEFR level estimate from an adaptive test. No validated concordance between b4skills and the exams above is claimed, and a b4skills result is not an official qualification. Each receiving institution decides which results it accepts.",
  },
  tr: {
    quickCheckHref: "/ingilizce-seviye-testi",
    sectionName: "CEFR seviyeleri",
    guideKicker: "CEFR rehberi",
    skill: { Reading: "Okuma", Listening: "Dinleme", Speaking: "Konuşma", Writing: "Yazma" },
    ctaTitle: "Hangi seviyede olduğunuzdan emin değil misiniz?",
    ctaText: "Ücretsiz b4skills Quick Check, yaklaşık 20–30 dakikalık adaptif bir testtir ve size geçici bir CEFR tahmini verir. Hesap açmanız gerekmez.",
    ctaButton: "Ücretsiz testi çözün",
    faq: "Sıkça sorulan sorular",
    updated: (date: string) => `Son güncelleme ${date} · b4skills editör ekibi · Seviye açıklamaları, Council of Europe tarafından yayımlanan CEFR'in kendi özetimizdir.`,
    levelTitle: (l: string) => `${l} seviyesi nedir?`,
    canDo: (l: string) => `${l} seviyesindeki bir öğrenci neler yapabilir?`,
    language: (l: string) => `${l} seviyesinde dilbilgisi ve kelime`,
    goodFor: (l: string) => `${l} İngilizce neye yeter?`,
    limits: (l: string) => `${l} seviyesinde hâlâ zor olanlar`,
    examsTitle: (l: string) => `Diğer İngilizce sınavlarında ${l}`,
    examsText: (l: string) => `Bunlar her sınav sahibinin ${l} için yayımladığı puan aralıklarıdır; b4skills karşılıkları değildir.`,
    examsLink: "Tam karşılaştırma ve kaynaklar",
    examCol: "Sınav",
    rangeCol: (l: string) => `Yayımlanan ${l} aralığı`,
    hoursTitle: (l: string) => `${l} seviyesine ulaşmak ne kadar sürer?`,
    hours: (l: string, h: string) => <>Cambridge English, sıfırdan başlayan biri için {l} seviyesine ulaşmanın toplamda yaklaşık <strong>{h} rehberli öğrenme saati</strong> sürdüğünü, bir seviye atlamanın ise kabaca 200 saat aldığını belirtir. Bunlar yalnızca yol gösterici rakamlardır: anadiliniz, ders dışında ne kadar pratik yaptığınız ve çalışmanın yoğunluğu süreyi değiştirir.</>,
    hoursSource: "Kaynak: Cambridge English",
    nextTitle: (l: string, n?: string) => (n ? `${l} seviyesinden ${n} seviyesine nasıl geçilir?` : `${l} seviyesini korumak`),
    otherLevels: "Diğer seviyeler",
    levelLink: (l: string) => `${l} seviyesi`,
    hubTitle: "CEFR seviyeleri: A1'den C2'ye",
    hubIntro: "Diller İçin Avrupa Ortak Başvuru Metni (CEFR), dil yeterliliğini başlangıç seviyesi A1'den üst düzey kullanıcıları tanımlayan C2'ye kadar altı seviyede tanımlar. Council of Europe tarafından yayımlanır; okullar, üniversiteler, işverenler ve sınav kurumları tarafından dünya genelinde bir kişinin dilde neler yapabildiğini anlatmak için kullanılır.",
    glance: "Altı seviyeye genel bakış",
    readGuide: (l: string) => `${l} rehberini okuyun`,
    groupsTitle: "CEFR seviyeleri nasıl gruplar?",
    groups: <><strong>A1 ve A2 (temel kullanıcı)</strong>, tanıdık konularda basit günlük iletişimi kapsar. <strong>B1 ve B2 (bağımsız kullanıcı)</strong>, B1'de tanıdık durumlardan B2'de karmaşık ve soyut konulara kadar kendi başına idare edebilen öğrencileri tanımlar. <strong>C1 ve C2 (yetkin kullanıcı)</strong>, zorlu akademik ve profesyonel amaçlar için akıcı ve kesin kullanımı tanımlar.</>,
    plus: "CEFR'in 2020 Companion Volume yayını ayrıca yeni başlayanlar için Pre-A1 bandını ve ana seviyelerin arasında kalan \"artı\" seviyeleri (B1+ gibi) tanımlar.",
    scoreNote: (link: React.ReactNode) => <>CEFR seviyesi bir sınav puanı değil, kişinin neler yapabildiğinin tanımıdır. Her sınav kendi puanlarının seviyelerle ilişkisini kendisi belirler. {link} sayfamız IELTS, TOEFL, Cambridge ve diğer sınav sahiplerinin yayımladığı aralıkları listeler.</>,
    comparisonLinkText: "Sınav karşılaştırma",
    compTitle: "İngilizce sınav puanları ve CEFR seviyeleri",
    compIntro: "IELTS, TOEFL iBT, Cambridge English ve diğer sınavların CEFR seviyelerini, her sınav sahibinin kendi yayımladığı eşleştirmeye göre nasıl raporladığı. Farklı sınavların puanları birbirinin yerine geçmez; bir kurumun hangi sınavı ve puanı kabul ettiğini kontrol edin.",
    compCaption: "Sınavlara göre yayımlanan CEFR puan aralıkları",
    notesTitle: "Notlar ve kaynaklar",
    checked: (d: string) => `Kaynaklar ${d} tarihinde kontrol edildi. "—", sınav sahibinin o seviye için aralık yayımlamadığı anlamına gelir.`,
    fitTitle: "b4skills nerede duruyor?",
    fit: "b4skills, adaptif bir testten CEFR seviye tahmini raporlar. b4skills ile yukarıdaki sınavlar arasında doğrulanmış bir denklik iddia edilmez ve b4skills sonucu resmi bir yeterlilik belgesi değildir. Hangi sonuçları kabul edeceğine her kurum kendisi karar verir.",
  },
} as const;

type Strings = (typeof UI)[GuideLang];

const examLabel = (exam: ExamAlignment, lang: GuideLang) => (lang === "tr" ? exam.tr.exam : exam.exam);

const Hero: React.FC<{ t: Strings; hub: string; kicker: string; title: string; children?: React.ReactNode }> = ({ t, hub, kicker, title, children }) => (
  <section className="bg-gradient-to-br from-[#24101a] via-[#1e1b4b] to-[#ad024c] text-white pt-32 pb-16 px-6">
    <div className="max-w-3xl mx-auto">
      <nav aria-label="Breadcrumb" className="text-sm text-white/60 mb-6">
        <a href="/" className="hover:text-white">b4skills</a>
        <span aria-hidden="true"> / </span>
        <a href={hub} className="hover:text-white">{t.sectionName}</a>
      </nav>
      <p className="text-xs font-black tracking-[0.25em] uppercase text-indigo-300 mb-3">{kicker}</p>
      <h1 className="text-4xl md:text-5xl font-black leading-tight">{title}</h1>
      {children}
    </div>
  </section>
);

const QuickCheckCta: React.FC<{ t: Strings }> = ({ t }) => (
  <aside className="rounded-2xl bg-slate-900 text-white p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between">
    <div>
      <h2 className="text-xl font-black mb-2">{t.ctaTitle}</h2>
      <p className="text-sm text-white/70 max-w-md">{t.ctaText}</p>
    </div>
    <a href={t.quickCheckHref} className="inline-flex items-center gap-2 bg-[#ad024c] hover:bg-[#8a003b] text-white font-bold rounded-full px-6 py-3 whitespace-nowrap">
      {t.ctaButton} <ArrowRight size={16} aria-hidden="true" />
    </a>
  </aside>
);

const Faq: React.FC<{ t: Strings; items: { q: string; a: string }[] }> = ({ t, items }) => (
  <section aria-labelledby="faq">
    <h2 id="faq" className="text-2xl font-black text-slate-900 mb-4">{t.faq}</h2>
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

const Updated: React.FC<{ t: Strings; path: string }> = ({ t, path }) => {
  const page = seoPageFor(path);
  return page ? <p className="text-xs text-slate-500">{t.updated(page.updated)}</p> : null;
};

const ExamRows: React.FC<{ t: Strings; lang: GuideLang; level: GuideLevel }> = ({ t, lang, level }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm bg-white rounded-2xl border border-slate-100">
      <caption className="sr-only">{t.rangeCol(level)}</caption>
      <thead><tr className="text-left text-slate-500"><th className="p-4">{t.examCol}</th><th className="p-4">{t.rangeCol(level)}</th></tr></thead>
      <tbody>
        {EXAM_ALIGNMENTS.map((exam) => (
          <tr key={exam.exam} className="border-t border-slate-100">
            <td className="p-4 font-bold text-slate-900">{examLabel(exam, lang)}</td>
            <td className="p-4 text-slate-700">{alignmentFor(exam, level)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const LevelGuideView: React.FC<{ guide: LevelGuide }> = ({ guide }) => {
  const lang = guide.lang;
  const t = UI[lang];
  const sections = GUIDE_SECTION_PATHS[lang];
  const { previous, next } = neighbours(guide);
  const path = levelGuidePath(guide);
  return (
    <>
      <Hero t={t} hub={sections.hub} kicker={`CEFR ${guide.level} · ${guide.band}`} title={t.levelTitle(guide.level)}>
        <p className="text-lg text-white/80 mt-6 leading-relaxed">{guide.answer}</p>
      </Hero>
      <main className="max-w-3xl mx-auto px-6 py-14 space-y-12">
        <Updated t={t} path={path} />
        <section>
          <h2 className="text-2xl font-black text-slate-900 mb-4">{t.canDo(guide.level)}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {guide.canDo.map(({ skill, points }) => {
              const Icon = SKILL_ICON[skill];
              return (
                <div key={skill} className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-3"><Icon size={18} className="text-[#ad024c]" aria-hidden="true" />{t.skill[skill]}</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 leading-relaxed">{points.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
              );
            })}
          </div>
        </section>
        <List title={t.language(guide.level)} items={guide.language} />
        <List title={t.goodFor(guide.level)} items={guide.goodFor} />
        <List title={t.limits(guide.level)} items={guide.limits} />
        <section>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{t.examsTitle(guide.level)}</h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            {t.examsText(guide.level)}{" "}
            <a href={sections.comparison} className="text-[#ad024c] underline">{t.examsLink}</a>.
          </p>
          <ExamRows t={t} lang={lang} level={guide.level} />
        </section>
        <section>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{t.hoursTitle(guide.level)}</h2>
          <p className="text-slate-700 leading-relaxed">
            {t.hours(guide.level, GUIDED_LEARNING_HOURS[guide.level])}{" "}
            <a href={GUIDED_LEARNING_HOURS_SOURCE} className="text-[#ad024c] underline" rel="noopener" target="_blank">{t.hoursSource}</a>
          </p>
        </section>
        <List title={t.nextTitle(guide.level, next?.level)} items={guide.nextSteps} />
        <Faq t={t} items={guide.faq} />
        <QuickCheckCta t={t} />
        <nav aria-label={t.otherLevels} className="flex justify-between gap-4 text-sm font-bold">
          {previous ? <a href={levelGuidePath(previous)} className="inline-flex items-center gap-2 text-[#ad024c]"><ArrowLeft size={16} aria-hidden="true" />{t.levelLink(previous.level)}</a> : <span />}
          {next ? <a href={levelGuidePath(next)} className="inline-flex items-center gap-2 text-[#ad024c]">{t.levelLink(next.level)}<ArrowRight size={16} aria-hidden="true" /></a> : <span />}
        </nav>
      </main>
    </>
  );
};

const HubView: React.FC<{ lang: GuideLang }> = ({ lang }) => {
  const t = UI[lang];
  const sections = GUIDE_SECTION_PATHS[lang];
  return (
    <>
      <Hero t={t} hub={sections.hub} kicker={t.guideKicker} title={t.hubTitle}>
        <p className="text-lg text-white/80 mt-6 leading-relaxed">{t.hubIntro}</p>
      </Hero>
      <main className="max-w-3xl mx-auto px-6 py-14 space-y-12">
        <Updated t={t} path={sections.hub} />
        <section>
          <h2 className="text-2xl font-black text-slate-900 mb-4">{t.glance}</h2>
          <div className="space-y-3">
            {guidesFor(lang).map((guide) => (
              <a key={guide.level} href={levelGuidePath(guide)} className="group block bg-white rounded-2xl border border-slate-100 p-6 hover:border-[#ad024c]">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-2xl font-black text-[#ad024c]">{guide.level}</span>
                  <span className="font-bold text-slate-900">{guide.nickname}</span>
                  <span className="text-xs uppercase tracking-wider text-slate-400">{guide.band}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{guide.answer}</p>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-[#ad024c] mt-3">{t.readGuide(guide.level)} <ArrowRight size={14} aria-hidden="true" /></span>
              </a>
            ))}
          </div>
        </section>
        <section className="space-y-4 text-slate-700 leading-relaxed">
          <h2 className="text-2xl font-black text-slate-900">{t.groupsTitle}</h2>
          <p>{t.groups}</p>
          <p>{t.plus}</p>
          <p>{t.scoreNote(<a href={sections.comparison} className="text-[#ad024c] underline">{t.comparisonLinkText}</a>)}</p>
        </section>
        <QuickCheckCta t={t} />
      </main>
    </>
  );
};

const ComparisonView: React.FC<{ lang: GuideLang }> = ({ lang }) => {
  const t = UI[lang];
  const sections = GUIDE_SECTION_PATHS[lang];
  return (
    <>
      <Hero t={t} hub={sections.hub} kicker={t.guideKicker} title={t.compTitle}>
        <p className="text-lg text-white/80 mt-6 leading-relaxed">{t.compIntro}</p>
      </Hero>
      <main className="max-w-5xl mx-auto px-6 py-14 space-y-10">
        <Updated t={t} path={sections.comparison} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-2xl border border-slate-100">
            <caption className="sr-only">{t.compCaption}</caption>
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-4">CEFR</th>
                {EXAM_ALIGNMENTS.map((exam) => <th key={exam.exam} className="p-4">{examLabel(exam, lang)}<span className="block font-normal text-xs">{lang === "tr" ? exam.tr.scale : exam.scale}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {[...guidesFor(lang)].reverse().map((guide) => (
                <tr key={guide.level} className="border-t border-slate-100">
                  <th scope="row" className="p-4 text-left"><a href={levelGuidePath(guide)} className="font-black text-[#ad024c]">{guide.level}</a></th>
                  {EXAM_ALIGNMENTS.map((exam) => <td key={exam.exam} className="p-4 text-slate-700">{alignmentFor(exam, guide.level)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">{t.notesTitle}</h2>
          <ul className="space-y-4 text-sm text-slate-700 leading-relaxed">
            {EXAM_ALIGNMENTS.map((exam) => (
              <li key={exam.exam} className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="font-bold text-slate-900">{examLabel(exam, lang)} <span className="font-normal text-slate-500">({exam.owner})</span></p>
                <p className="mt-1">{lang === "tr" ? exam.tr.note : exam.note}</p>
                <p className="mt-2"><a href={exam.sourceUrl} lang="en" className="text-[#ad024c] underline" rel="noopener" target="_blank">{exam.sourceName}</a></p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">{t.checked(EXAM_ALIGNMENT_CHECKED)}</p>
        </section>
        <section className="space-y-3 text-slate-700 leading-relaxed max-w-3xl">
          <h2 className="text-2xl font-black text-slate-900">{t.fitTitle}</h2>
          <p>{t.fit}</p>
        </section>
        <QuickCheckCta t={t} />
      </main>
    </>
  );
};

/** Renders the CEFR guide section in English (/cefr-levels/…) or Turkish (/cefr-seviyeleri/…). */
export const CefrGuidePage: React.FC<{ path: string }> = ({ path }) => {
  const lang = guideLangForPath(path) ?? "en";
  const guide = guideForPath(path);
  useEffect(() => {
    const page = seoPageFor(path);
    if (page) document.title = page.title;
  }, [path]);
  return (
    <div lang={lang} className="min-h-screen bg-[#fcf8fa] font-sans text-slate-800">
      <SiteNav />
      {guide ? <LevelGuideView guide={guide} /> : path === GUIDE_SECTION_PATHS[lang].comparison ? <ComparisonView lang={lang} /> : <HubView lang={lang} />}
      <SiteFooter />
    </div>
  );
};
