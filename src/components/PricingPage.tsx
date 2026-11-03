import React, { useState } from "react";
import { Check, Zap, Building2, GraduationCap } from "lucide-react";
import { cn } from "../lib/utils";
import { SiteNav } from "./SiteNav";
import { FreemiumTestWidget } from "./FreemiumTestWidget";
import { SiteFooter } from "./SiteFooter";

import { PURCHASE_PLANS } from "../lib/payments/purchase-policy";

interface PricingPageProps {
  onBack?: () => void;
  onStart?: () => void;
}

interface Plan {
  name: string;
  badge?: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  priceId?: string;
}

const B2C_PLANS: Plan[] = [
  {
    name: "Quick Check",
    price: "Free",
    period: "",
    description: "Get a provisional CEFR estimate in about 20–30 minutes. No account required.",
    features: [
      "20–30 minute adaptive placement",
      "Provisional CEFR estimate (A1–C2)",
      "12–24 questions across six skill areas",
      "Instant objectively scored results",
    ],
    cta: "Start Free",
  },

];

const B2B_PLANS: Plan[] = [
  {
    name: "Team Starter",
    price: "€9",
    period: "per learner / test",
    description: "For small teams and language schools testing up to 50 people.",
    features: [
      "Full adaptive four-skills assessment",
      "Teacher dashboard (classes & assignments)",
      "Class-level CEFR analytics",
      "CSV export",
      "Email delivery of certificates",
      "Up to 50 assessments / month",
    ],
    cta: "Start Trial",
  },
  {
    name: "Institution",
    badge: "Best Value",
    price: "€6",
    period: "per learner / test",
    description: "For universities, language schools, and mid-size corporates.",
    features: [
      "Everything in Team Starter",
      "Institutional dashboard & heatmaps",
      "Bulk student import (CSV / SIS)",
      "CEFR cohort comparison across branches",
      "Webhook & LMS grade passback",
      "SSO (Google, Microsoft, SAML)",
      "Priority support SLA",
      "Up to 500 assessments / month",
    ],
    cta: "Contact Sales",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Unlimited scale with white-labelling and dedicated psychometric support.",
    features: [
      "Everything in Institution",
      "Unlimited assessments",
      "White-label branding & domain",
      "Custom CEFR cut-score standard setting",
      "Dedicated customer success manager",
      "On-premise deployment option",
      "SLA 99.9% uptime",
      "Psychometric reporting & audit",
    ],
    cta: "Talk to Us",
  },
];

const FAQ = [
  {
    q: "How does b4skills score Writing and Speaking?",
    a: "Full Assessment writing and speaking responses use AI-assisted scoring against CEFR-based rubrics. Providers and review requirements depend on the assessment configuration. The free Quick Check does not evaluate open writing or speaking responses.",
  },
  {
    q: "Is the CEFR level official?",
    a: "b4skills produces an adaptive computer-based assessment aligned to the CEFR framework and Companion Volume. The CEFR level is a standardised estimate — it is not an official qualification like IELTS or Cambridge, and acceptance is decided by each receiving institution.",
  },
  {
    q: "How long does scoring take?",
    a: "Grammar, vocabulary, reading, and listening are scored instantly. AI writing and speaking scoring completes within 10–30 minutes. Human review, when triggered, adds up to 24 hours.",
  },
  {
    q: "Can I use b4skills for high-stakes placement?",
    a: "Suitability must be established by the receiving institution. Independent validation is still in progress; high-stakes decisions require additional evidence, human review, and an institution-level standard-setting process.",
  },
  {
    q: "Can credits expire?",
    a: "Purchased credits are valid for 12 months from the date of purchase. Enterprise contracts set custom expiry terms.",
  },
];

export const PricingPage: React.FC<PricingPageProps> = ({ onBack, onStart }) => {
  const [showFreeTest, setShowFreeTest] = useState(false);
  const [tab, setTab] = useState<"individual" | "institution">("individual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans = tab === "individual" ? B2C_PLANS : B2B_PLANS;

  const handleCta = (plan: Plan) => {
    if (plan.cta === "Contact Sales" || plan.price === "Custom") {
      window.location.href = `mailto:hello@b4skills.com?subject=${encodeURIComponent(`${plan.name} Plan Enquiry`)}`;
    } else if (plan.price === "Free") {
      setShowFreeTest(true);
    } else if (plan.name === "Full Assessment" || plan.name === "Pro Bundle") {
      window.location.href = `/checkout?plan=${plan.name === "Pro Bundle" ? "pro-bundle" : "full-assessment"}`;
    } else {
      window.location.href = "mailto:hello@b4skills.com?subject=Institutional%20plan%20enquiry";
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800">

      {showFreeTest && <FreemiumTestWidget onClose={() => setShowFreeTest(false)} onSignup={() => { setShowFreeTest(false); onStart?.(); }} />}

      {/* ── Shared Nav ─── */}
      <SiteNav onStart={onStart ?? (() => {})} />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#9b276c] text-white pt-36 pb-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #6366f1 0%, transparent 60%), radial-gradient(circle at 70% 50%, #9b276c 0%, transparent 60%)" }} />
        <div className="relative max-w-3xl mx-auto">
          <p className="text-xs font-black tracking-[0.25em] uppercase text-indigo-300 mb-4">Transparent Pricing</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
            Know your level.<br />Understand your skills.
          </h1>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
            Adaptive, psychometrically rigorous English assessment. Pay per test or unlock cohort intelligence at scale.
          </p>

          {/* Tab switcher */}
          <div className="inline-flex bg-white/10 rounded-full p-1 gap-1" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "individual"}
              onClick={() => setTab("individual")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-bold transition-all",
                tab === "individual" ? "bg-white text-slate-900" : "text-white/70 hover:text-white"
              )}
            >
              <Zap size={14} className="inline mr-1 -mt-0.5" />Individual
            </button>
            <button
              role="tab"
              aria-selected={tab === "institution"}
              onClick={() => setTab("institution")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-bold transition-all",
                tab === "institution" ? "bg-white text-slate-900" : "text-white/70 hover:text-white"
              )}
            >
              <Building2 size={14} className="inline mr-1 -mt-0.5" />Institution
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className={cn(
          "grid gap-6",
          plans.length === 1 ? "max-w-md mx-auto" : plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
        )}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-2xl border p-8 flex flex-col gap-4",
                plan.highlighted
                  ? "border-indigo-500 bg-white shadow-xl shadow-indigo-100 ring-1 ring-indigo-500"
                  : "border-slate-200 bg-white shadow-sm"
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-6 bg-[#9b276c] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  {plan.period && <span className="text-sm text-slate-500">{plan.period}</span>}
                </div>
                <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
              </div>
              <ul className="flex-1 space-y-2" aria-label={`${plan.name} features`}>
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCta(plan)}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm transition-colors",
                  plan.highlighted
                    ? "bg-[#9b276c] hover:bg-[#7d1f56] text-white"
                    : "bg-slate-900 hover:bg-slate-700 text-white"
                )}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Institution note */}
        {tab === "institution" && (
          <p className="text-center text-sm text-slate-500 mt-8">
            <GraduationCap size={14} className="inline mr-1 -mt-0.5" />
            All institutional plans include a 14-day free pilot with up to 20 assessments.
            <a href="mailto:hello@b4skills.com" className="ml-2 text-indigo-600 hover:underline font-medium">Contact us</a> to get started.
          </p>
        )}
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-black text-center text-slate-900 mb-8">Common questions</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                {item.q}
                <span className="ml-4 text-slate-400 text-lg leading-none">
                  {openFaq === i ? "−" : "+"}
                </span>
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

      {/* ── Footer ─── */}
      <p className="px-6 py-6 text-center text-sm text-slate-600">Individual paid checkout is not available on this website. Apple In-App Purchase is not enabled. Review our <a href="/refund-policy" className="underline">refund and withdrawal policy</a> and <a href="/sales-terms" className="underline">purchase information</a>.</p>
      <SiteFooter />
    </div>
  );
};
