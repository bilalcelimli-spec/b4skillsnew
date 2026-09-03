import React, { useEffect } from "react";
import { ArrowRight, CheckCircle2, Star, Zap, GraduationCap, Building2 } from "lucide-react";
import { cn } from "../lib/utils";

export type SeoVariant =
  | "english-level-test"
  | "ingilizce-seviye-testi"
  | "cefr-english-test"
  | "english-assessment-for-universities"
  | "english-assessment-for-companies";

interface Props {
  variant: SeoVariant;
  onStart: () => void;
}

const META: Record<SeoVariant, { title: string; description: string; h1: string; sub: string; keywords: string; icon: React.ReactNode; audience: string; bullets: string[] }> = {
  "english-level-test": {
    title: "Free English Level Test — CEFR A1 to C2 | B4Skills",
    description: "Take a free adaptive English level test and get your official CEFR level in under 15 minutes. Instant results, no account required.",
    h1: "Free English Level Test",
    sub: "Find your CEFR level — A1 to C2 — in 15 minutes with our adaptive assessment engine.",
    keywords: "english level test, free english test, cefr test, english proficiency test",
    icon: <Zap size={28} className="text-[#9b276c]" />,
    audience: "Individuals",
    bullets: [
      "Adaptive CAT engine — no two tests are identical",
      "CEFR level (A1–C2) in under 15 minutes",
      "Reading, Listening, Writing & Speaking",
      "Instant results — no signup required for Quick Check",
      "Powered by IRT 3PL psychometrics",
    ],
  },
  "ingilizce-seviye-testi": {
    title: "İngilizce Seviye Testi — CEFR A1-C2 | B4Skills",
    description: "Ücretsiz adaptif İngilizce seviye testiyle CEFR seviyenizi (A1–C2) 15 dakikada öğrenin. Anında sonuç, kayıt gerektirmez.",
    h1: "İngilizce Seviye Testi",
    sub: "CEFR A1'den C2'ye adaptif sınav motoruyla 15 dakikada İngilizce seviyenizi keşfedin.",
    keywords: "ingilizce seviye testi, cefr testi, ingilizce sınav, b4skills",
    icon: <Star size={28} className="text-[#9b276c]" />,
    audience: "Bireyler",
    bullets: [
      "Adaptif CAT motoru — her sınav benzersiz",
      "15 dakikada CEFR seviyesi (A1–C2)",
      "Okuma, Dinleme, Yazma ve Konuşma",
      "Quick Check için kayıt gerekmez",
      "IRT 3PL psikometrik altyapı",
    ],
  },
  "cefr-english-test": {
    title: "CEFR English Test — Adaptive Assessment | B4Skills",
    description: "Certified CEFR-aligned adaptive English test. Get a verifiable CEFR certificate (A1–C2) with QR code validation. Accepted by universities and employers worldwide.",
    h1: "CEFR English Test",
    sub: "A fully adaptive, psychometrically rigorous assessment aligned to the Common European Framework of Reference.",
    keywords: "cefr english test, cefr assessment, cefr certificate, cefr level test online",
    icon: <CheckCircle2 size={28} className="text-[#9b276c]" />,
    audience: "Learners & Institutions",
    bullets: [
      "Aligned to CEFR & Council of Europe Companion Volume",
      "QR-verifiable CEFR certificate (PDF)",
      "4-skill adaptive assessment (R/L/W/S)",
      "Multi-model AI scoring (Gemini + Claude + GPT-4)",
      "Human review for borderline cases",
    ],
  },
  "english-assessment-for-universities": {
    title: "English Assessment for Universities — CEFR Placement | B4Skills",
    description: "Adaptive English placement and proficiency testing for universities. CEFR-aligned, bulk import, LMS integration, and cohort analytics for language centres.",
    h1: "English Assessment for Universities",
    sub: "Adaptive CEFR placement testing built for language centres, EAP departments, and admissions teams.",
    keywords: "english assessment universities, english placement test university, cefr university, english proficiency test higher education",
    icon: <GraduationCap size={28} className="text-[#9b276c]" />,
    audience: "Universities & Language Centres",
    bullets: [
      "Adaptive placement in 15–60 minutes per student",
      "Bulk student import (CSV / SIS integration)",
      "LMS grade passback (Moodle, Canvas, Blackboard)",
      "Cohort CEFR heatmaps and skill gap reports",
      "SSO via Google, Microsoft, or SAML",
      "14-day free pilot — up to 20 assessments",
    ],
  },
  "english-assessment-for-companies": {
    title: "English Assessment for Companies — Corporate Proficiency Test | B4Skills",
    description: "Fast, reliable English proficiency testing for HR teams and L&D departments. CEFR-aligned assessment, bulk testing, and workforce skill analytics.",
    h1: "English Assessment for Companies",
    sub: "Screen, place, and develop English skills across your workforce with adaptive CEFR-aligned assessments.",
    keywords: "english assessment companies, corporate english test, workforce english proficiency, english screening hr",
    icon: <Building2 size={28} className="text-[#9b276c]" />,
    audience: "HR & L&D Teams",
    bullets: [
      "Pre-hire English screening in under 60 minutes",
      "CEFR certificate for visa and compliance filing",
      "Team-level skill gap dashboards",
      "Webhook & API integration with ATS/HRIS",
      "Volume pricing from €6/assessment",
      "White-label branding option",
    ],
  },
};

const SOCIAL_PROOF = [
  { stat: "50k+", label: "Assessments Completed" },
  { stat: "A1–C2", label: "Full CEFR Coverage" },
  { stat: "99.2%", label: "Uptime SLA" },
  { stat: "< 15 min", label: "Quick Check Duration" },
];

export const SeoLandingPage: React.FC<Props> = ({ variant, onStart }) => {
  const m = META[variant];

  useEffect(() => {
    document.title = m.title;
    let desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!desc) {
      desc = document.createElement("meta");
      desc.name = "description";
      document.head.appendChild(desc);
    }
    desc.content = m.description;

    let kw = document.querySelector<HTMLMetaElement>('meta[name="keywords"]');
    if (!kw) {
      kw = document.createElement("meta");
      kw.name = "keywords";
      document.head.appendChild(kw);
    }
    kw.content = m.keywords;
  }, [variant]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#9b276c] text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white/80 mb-6">
            {m.icon}
            <span>{m.audience}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">{m.h1}</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">{m.sub}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#9b276c] hover:bg-[#7d1f56] text-white font-black rounded-2xl transition-colors text-sm"
            >
              Start Free <ArrowRight size={16} />
            </button>
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20 transition-colors text-sm"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {SOCIAL_PROOF.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-slate-900">{s.stat}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature bullets */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-black text-slate-900 mb-8 text-center">What You Get</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {m.bullets.map((b) => (
            <div key={b} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-500" />
              <span className="text-sm font-medium text-slate-700">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-black mb-4">{m.h1}</h2>
        <p className="text-white/60 mb-8 max-w-md mx-auto text-sm">{m.sub}</p>
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#9b276c] hover:bg-[#7d1f56] text-white font-black rounded-2xl transition-colors text-sm"
        >
          Get Started Free <ArrowRight size={16} />
        </button>
      </section>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: m.h1,
            description: m.description,
            url: `https://b4skills.com/${variant}`,
            publisher: {
              "@type": "Organization",
              name: "B4Skills",
              url: "https://b4skills.com",
            },
          }),
        }}
      />
    </div>
  );
};
