import React, { useContext } from "react";
import { COMPANY } from "../lib/site/company";
import { FooterConsentContext } from "./MarketingConsent";

const linkClass = "hover:text-[#9b276c] transition-colors";

/** Shared public footer. Its links mirror SiteNav so both name the same pages. */
export const SiteFooter: React.FC = () => {
  const consent = useContext(FooterConsentContext);
  return (
    <footer lang="en" className="bg-white border-t border-slate-200 py-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 pb-12">
        <div className="md:col-span-1">
          <a href="/" aria-label="b4skills home" className="bg-[#9b276c] text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight w-fit flex items-center mb-6">
            <span style={{ textShadow: "0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)" }}>
              b4skills
            </span>
          </a>
          <p className="text-[13px] leading-relaxed text-slate-600">
            The premier AI-powered, adaptive English language proficiency platform for schools, universities, and businesses.
          </p>
        </div>
        <div>
          <h4 className="text-slate-900 font-bold mb-4">Solutions</h4>
          <ul className="space-y-3 text-sm text-slate-600">
            <li><a href="/academia" className={linkClass}>b4skills for Academia</a></li>
            <li><a href="/schools" className={linkClass}>b4skills for Schools</a></li>
            <li><a href="/corporate" className={linkClass}>b4skills for Corporates</a></li>
            <li><a href="/language-schools" className={linkClass}>b4skills for Language Schools</a></li>
            <li><a href="/pricing" className={`${linkClass} font-medium`}>Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-slate-900 font-bold mb-4">Resources</h4>
          <ul className="space-y-3 text-sm text-slate-600">
            <li><a href="/#technology" className={linkClass}>Technology & Pedagogy</a></li>
            <li><a href="/methodology" className={linkClass}>Methodology</a></li>
            <li><a href="/research" className={linkClass}>Research</a></li>
            <li><a href="/cefr-levels" className={linkClass}>CEFR Levels Explained</a></li>
            <li><a href="/cefr-levels/exam-comparison" className={linkClass}>Exam Scores vs CEFR</a></li>
            <li><a href="/exam-code" className={linkClass}>Enter Exam Code</a></li>
            <li><a href="/login" className={linkClass}>Test Taker Login</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-slate-900 font-bold mb-4">Company</h4>
          <ul className="space-y-3 text-sm text-slate-600">
            <li><a href="/support" className={linkClass}>Contact & Support</a></li>
            <li><a href="/kvkk" className={linkClass}>KVKK Notice</a></li>
            <li><a href="/privacy" className={linkClass}>Privacy Policy</a></li>
            <li><a href="/terms" className={linkClass}>Terms of Service</a></li>
            <li><a href="/accessibility-statement" className={linkClass}>Accessibility</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-8">
        <div className="space-y-2"><p>&copy; {new Date().getFullYear()} {COMPANY.brand}</p><p>{COMPANY.address}</p><p>{COMPANY.taxOffice} · {COMPANY.taxNumber}</p></div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {consent}
          <span>IRT & AI-assisted scoring</span>
        </div>
      </div>
    </footer>
  );
};
