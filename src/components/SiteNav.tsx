import React, { useState, useEffect } from "react";
import { Button } from "./ui/Button";
import { ChevronRight, Menu, X, Zap } from "lucide-react";
import { cn } from "../lib/utils";

interface SiteNavProps {
  onStart: () => void;
  onCodeEntry?: () => void;
}

const SOLUTION_HREFS: Record<string, string> = {
  Academia: "/academia",
  Schools: "/schools",
  Corporates: "/corporate",
  "Language Schools": "/language-schools",
};

export const SiteNav: React.FC<SiteNavProps> = ({ onStart, onCodeEntry }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-300",
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm py-4" : "bg-transparent py-6"
      )}
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="bg-[#9b276c] justify-center text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight flex items-center">
            <span style={{ textShadow: "0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)" }}>
              b4skills
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-700">
          {/* Mega Menu - Solutions */}
          <div className="group h-16 flex items-center">
            <a
              href="/#solutions"
              className="hover:text-[#9b276c] transition-colors flex items-center gap-1 group-hover:text-[#9b276c] py-4"
            >
              Solutions
              <ChevronRight size={14} className="group-hover:rotate-90 transition-transform duration-300" />
            </a>

            {/* Mega Menu Dropdown */}
            <div className="absolute top-[70px] left-1/2 -translate-x-1/2 w-screen max-w-[1100px] px-6 lg:px-0 opacity-0 invisible translate-y-4 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto z-50">
              <div className="bg-white rounded-3xl overflow-hidden flex flex-col md:flex-row text-left shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(148,163,184,0.1)]">
                {/* Left */}
                <div className="md:w-[70%] p-10 bg-white">
                  <div className="mb-10">
                    <div className="uppercase tracking-[0.2em] text-[#9b276c] text-[10px] font-black border-b-2 border-[#9b276c] inline-block pb-1 mb-8">
                      Distributions
                    </div>
                    <div className="grid grid-cols-4 gap-8">
                      {["Academia", "Schools", "Corporates", "Language Schools"].map((type) => (
                        <a key={type} href={SOLUTION_HREFS[type]} className="group/item">
                          <h4 className="text-slate-400 font-bold mb-1 text-[11px] uppercase tracking-wider">b4skills for</h4>
                          <span className="flex flex-col font-black text-[22px] leading-tight text-slate-800 group-hover/item:text-[#9b276c] transition-colors">
                            {type}
                          </span>
                          <div className="h-0.5 w-0 bg-[#9b276c] mt-2 group-hover/item:w-full transition-all duration-300 opacity-50" />
                        </a>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="uppercase tracking-[0.2em] text-slate-400 text-[10px] font-black border-b-2 border-slate-200 inline-block pb-1 mb-6">
                      Assessments & Modules
                    </div>
                    <div className="grid grid-cols-2 gap-x-16 gap-y-5 mt-2">
                      {[
                        "b4skills Diagnostic",
                        "b4skills Career Context",
                        "Early Years (Ages 7-10)",
                        "Video & Writing Interviews",
                        "Junior Suite (Ages 11-15)",
                        "General English Adaptive",
                        "Academic Admissions (C1+)",
                        "Business English Core",
                      ].map((item) => (
                        <a
                          href="#unavailable"
                          key={item}
                          className="flex items-center justify-between text-slate-600 font-bold text-[14px] hover:text-[#9b276c] group/link transition-colors border-b border-transparent hover:border-slate-100 pb-1"
                        >
                          {item}
                          <ChevronRight
                            size={14}
                            className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-[#9b276c]"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="md:w-[30%] bg-[#FAFAFA] p-10 border-l border-slate-100 flex flex-col">
                  <div className="uppercase tracking-[0.2em] text-slate-900 text-[10px] font-black mb-8 border-b-2 border-slate-300 inline-block pb-1 w-fit">
                    Services
                  </div>
                  <div className="flex flex-col gap-6 flex-1">
                    {["Custom Platform Dev.", "Administration Management", "AI Assessment Analysis"].map((svc) => (
                      <a
                        key={svc}
                        href="#unavailable"
                        className="text-slate-700 font-bold text-[15px] hover:text-[#9b276c] transition-colors flex items-center gap-3"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> {svc}
                      </a>
                    ))}
                  </div>
                  <div className="mt-8 bg-slate-900 rounded-2xl p-6 relative overflow-hidden group/callout hover:bg-slate-800 transition-colors cursor-pointer border border-[#9b276c]/30 hover:border-[#9b276c] duration-300">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-[#9b276c] rounded-bl-full blur-2xl opacity-20 group-hover/callout:opacity-50 transition-opacity duration-500" />
                    <Zap size={20} className="text-[#9b276c] mb-3" />
                    <h4 className="text-white font-bold text-[15px] mb-1.5 line-clamp-1">Scale Instantly</h4>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed">
                      Connect LMS systems to our scalable IRT engine via API.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <a href="/#technology" className="hover:text-slate-900 transition-colors h-16 flex items-center">
            Technology & Pedagogy
          </a>
          <a href="/#research" className="hover:text-slate-900 transition-colors h-16 flex items-center">
            Research
          </a>

          <div className="flex items-center gap-6 h-16">
            <a href="/methodology" className="text-slate-600 hover:text-[#9b276c] font-bold transition-colors">
              Methodology
            </a>
            <a href="/pricing" className="text-slate-600 hover:text-[#9b276c] font-bold transition-colors">
              Pricing
            </a>
            {onCodeEntry && (
              <button
                onClick={onCodeEntry}
                className="text-slate-600 hover:text-slate-900 font-bold transition-colors"
                aria-label="Enter your exam code"
              >
                Enter Exam Code
              </button>
            )}
            <button
              onClick={onStart}
              className="text-slate-900 font-bold border-b-2 border-[#9b276c] hover:bg-[#9b276c] hover:text-white px-2 py-1 transition-all rounded"
              aria-label="Sign in as test taker"
            >
              Test Taker Login
            </button>
            <Button onClick={onStart} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6">
              Get Started
            </Button>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-slate-900"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="site-mobile-menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          id="site-mobile-menu"
          className="md:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-slate-100 flex flex-col p-6 gap-6 font-medium text-slate-700"
          role="menu"
        >
          <a href="/#solutions" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
          <a href="/#technology" onClick={() => setMobileMenuOpen(false)}>Technology & Pedagogy</a>
          <a href="/#research" onClick={() => setMobileMenuOpen(false)}>Research</a>
          {onCodeEntry && (
            <button onClick={onCodeEntry} className="text-left font-bold text-slate-800">Enter Exam Code</button>
          )}
          <button onClick={onStart} className="text-left font-bold text-indigo-600">Test Taker Login</button>
          <Button onClick={onStart} className="bg-slate-900 text-white w-full rounded-full">Get Started</Button>
        </div>
      )}
    </nav>
  );
};
