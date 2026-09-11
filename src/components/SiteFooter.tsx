import React from "react";

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
          <li><a href="mailto:hello@b4skills.com" className="hover:text-[#9b276c] transition-colors">Support</a></li>
          <li><a href="/pricing" className="hover:text-[#9b276c] transition-colors">Pricing</a></li>
        </ul>
      </div>
      <div>
        <h4 className="text-slate-900 font-bold mb-4">Company</h4>
        <ul className="space-y-3 text-sm text-slate-600">
          <li><a href="mailto:hello@b4skills.com" className="hover:text-[#9b276c] transition-colors">Contact Us</a></li>
          <li><a href="mailto:privacy@b4skills.com" className="hover:text-[#9b276c] transition-colors">Privacy Policy</a></li>
          <li><a href="mailto:hello@b4skills.com" className="hover:text-[#9b276c] transition-colors">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-8">
      <p>&copy; {new Date().getFullYear()} b4skills Inc. All rights reserved.</p>
      <div className="flex gap-4 mt-4 md:mt-0">
        <span>Powered by IRT & Gemini AI</span>
      </div>
    </div>
  </footer>
);
