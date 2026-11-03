import React from "react";
import { COMPANY } from "../lib/site/company";

export const SiteFooter: React.FC = () => (
  <footer className="bg-white border-t border-slate-200 py-16">
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 pb-12">
      <div className="md:col-span-1">
        <div className="bg-[#9b276c] text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight w-fit flex items-center mb-6">
          <span style={{ textShadow: "0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)" }}>
            b4skills
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-slate-600">
          The premier AI-powered, adaptive English language proficiency platform for schools, universities, and businesses.
        </p>
      </div>
      <div>
        <h4 className="text-slate-900 font-bold mb-4">Assessment Solutions</h4>
        <ul className="space-y-3 text-sm text-slate-600">
          <li><a href="/schools" className="hover:text-[#9b276c] transition-colors">For Schools</a></li>
          <li><a href="/academia" className="hover:text-[#9b276c] transition-colors">Academic Testing</a></li>
          <li><a href="/corporate" className="hover:text-[#9b276c] transition-colors">General & Business English</a></li>
          <li><a href="/pricing" className="hover:text-[#9b276c] transition-colors font-medium">Pricing</a></li>
        </ul>
      </div>
      <div>
        <h4 className="text-slate-900 font-bold mb-4">Resources</h4>
        <ul className="space-y-3 text-sm text-slate-600">
          <li><a href="/methodology" className="hover:text-[#9b276c] transition-colors">Assessment Methodology</a></li>
          <li><a href="/research" className="hover:text-[#9b276c] transition-colors">Validity Research</a></li>
          <li><a href="/support" className="hover:text-[#9b276c] transition-colors">Support</a></li>
        </ul>
      </div>
      <div>
        <h4 className="text-slate-900 font-bold mb-4">Company</h4>
        <ul className="space-y-3 text-sm text-slate-600">
          <li><a href="/support" className="hover:text-[#9b276c] transition-colors">Contact Us</a></li>
          <li><a href="/kvkk" className="hover:text-[#9b276c] transition-colors">KVKK Notice</a></li>
          <li><a href="/refund-policy" className="hover:text-[#9b276c] transition-colors">Refund & Withdrawal</a></li>
          <li><a href="/sales-terms" className="hover:text-[#9b276c] transition-colors">Purchase Information</a></li>
          <li><a href="/privacy" className="hover:text-[#9b276c] transition-colors">Privacy Policy</a></li>
          <li><a href="/terms" className="hover:text-[#9b276c] transition-colors">Terms of Service</a></li>
          <li><a href="/accessibility-statement" className="hover:text-[#9b276c] transition-colors">Accessibility</a></li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-8">
      <div className="space-y-2"><p>&copy; {new Date().getFullYear()} {COMPANY.brand} · {COMPANY.legalName}</p><p>{COMPANY.address}</p><p>{COMPANY.taxOffice} · {COMPANY.taxNumber}</p></div>
      <div className="flex gap-4 mt-4 md:mt-0">
        <span>IRT & AI-assisted scoring</span>
      </div>
    </div>
  </footer>
);
