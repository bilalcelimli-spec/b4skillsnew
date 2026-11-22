import React, { useState, useEffect } from "react";
import { ChevronRight, Menu, X, Zap } from "lucide-react";
import { cn } from "../lib/utils";

/** Shared public header. Every button has one fixed destination so the
 *  header behaves the same on every public page. */
export const LOGIN_HREF = "/login";
export const EXAM_CODE_HREF = "/exam-code";

const SOLUTION_HREFS: Record<string, string> = {
  Academia: "/academia",
  Schools: "/schools",
  Corporates: "/corporate",
  "Language Schools": "/language-schools",
};

const MAIN_LINKS = [
  { label: "Technology & Pedagogy", href: "/#technology" },
  { label: "Methodology", href: "/methodology" },
  { label: "Research", href: "/research" },
  { label: "Pricing", href: "/pricing" },
] as const;

export const SiteNav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-300",
        // Solid magenta band, as on babilspeak: always opaque so it never disappears over a page hero.
        "bg-[#ad024c] text-white",
        scrolled ? "shadow-[0_6px_20px_rgb(42_10_25/0.25)] py-2" : "py-3"
      )}
      aria-label="Main navigation"
      lang="en"
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          {/* Wordmark in the logo's own gradient, lifted off the magenta band by a light ring. */}
          <div className="bg-[linear-gradient(100deg,#e0337a_0%,#f4532d_38%,#d81a5c_68%,#8a0f6e_100%)] ring-1 ring-white/35 shadow-[0_3px_0_rgb(110_3_49/0.6)] justify-center text-white font-extrabold text-xl px-3 py-1 -skew-x-6 rounded-md tracking-tight flex items-center">
            <span style={{ textShadow: "0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)" }}>
              b4skills
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden xl:flex items-center gap-1 2xl:gap-3 font-bold text-[15px] text-white">
          {/* Mega Menu - Solutions */}
          <div className="group h-16 flex items-center">
            <a
              href="/#solutions"
              className="hover:bg-white/15 group-hover:bg-white/15 focus-visible:bg-white/15 rounded-lg px-3 transition-colors flex items-center gap-1 min-h-11"
              aria-haspopup="menu"
            >
              Solutions
              <ChevronRight aria-hidden="true" size={14} className="group-hover:rotate-90 group-focus-within:rotate-90 transition-transform duration-300" />
            </a>

            {/* Mega Menu Dropdown */}
            <div className="absolute top-[70px] left-1/2 -translate-x-1/2 w-screen max-w-[1100px] px-6 lg:px-0 opacity-0 invisible translate-y-4 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto z-50">
              <div className="bg-white rounded-3xl overflow-hidden flex flex-col md:flex-row text-left shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(148,163,184,0.1)]">
                {/* Left */}
                <div className="md:w-[70%] p-10 bg-white">
                  <div className="mb-10">
                    <div className="uppercase tracking-[0.2em] text-[#ad024c] text-[10px] font-black border-b-2 border-[#ad024c] inline-block pb-1 mb-8">
                      Distributions
                    </div>
                    <div className="grid grid-cols-4 gap-8">
                      {["Academia", "Schools", "Corporates", "Language Schools"].map((type) => (
                        <a key={type} href={SOLUTION_HREFS[type]} className="group/item">
                          <h4 className="text-slate-400 font-bold mb-1 text-[11px] uppercase tracking-wider">b4skills for</h4>
                          <span className="flex flex-col font-black text-[22px] leading-tight text-slate-800 group-hover/item:text-[#ad024c] transition-colors">
                            {type}
                          </span>
                          <div className="h-0.5 w-0 bg-[#ad024c] mt-2 group-hover/item:w-full transition-all duration-300 opacity-50" />
                        </a>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="uppercase tracking-[0.2em] text-slate-400 text-[10px] font-black border-b-2 border-slate-200 inline-block pb-1 mb-6">
                      Assessments & Modules
                    </div>
                    <div className="grid grid-cols-2 gap-x-16 gap-y-5 mt-2">
                      {([
                        ["General English & Diagnostic", "/assessment"],
                        ["School Assessments", "/schools"],
                        ["Academic Assessment", "/academia"],
                        ["Business English", "/corporate"],
                      ] as [string, string][]).map(([item, href]) => (
                        <a
                          href={href}
                          key={item}
                          className="flex items-center justify-between text-slate-600 font-bold text-[14px] hover:text-[#ad024c] group/link transition-colors border-b border-transparent hover:border-slate-100 pb-1"
                        >
                          {item}
                          <ChevronRight
                            size={14}
                            className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-[#ad024c]"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="md:w-[30%] bg-[#fcf8fa] p-10 border-l border-slate-100 flex flex-col">
                  <div className="uppercase tracking-[0.2em] text-slate-900 text-[10px] font-black mb-8 border-b-2 border-slate-300 inline-block pb-1 w-fit">
                    Services
                  </div>
                  <div className="flex flex-col gap-6 flex-1">
                    {([
                      ["Custom Platform Dev.",       "/#contact"],
                      ["Administration Management",  "/schools"],
                      ["AI Assessment Analysis",     "/methodology"],
                    ] as [string, string][]).map(([svc, href]) => (
                      <a
                        key={svc}
                        href={href}
                        className="text-slate-700 font-bold text-[15px] hover:text-[#ad024c] transition-colors flex items-center gap-3"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> {svc}
                      </a>
                    ))}
                  </div>
                  <div className="mt-8 bg-slate-900 rounded-2xl p-6 relative overflow-hidden group/callout hover:bg-slate-800 transition-colors cursor-pointer border border-[#ad024c]/30 hover:border-[#ad024c] duration-300">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-[#ad024c] rounded-bl-full blur-2xl opacity-20 group-hover/callout:opacity-50 transition-opacity duration-500" />
                    <Zap size={20} className="text-[#ad024c] mb-3" />
                    <h4 className="text-white font-bold text-[15px] mb-1.5 line-clamp-1">Scale Instantly</h4>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed">
                      Connect LMS systems to our scalable IRT engine via API.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {MAIN_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:bg-white/15 rounded-lg px-3 transition-colors min-h-11 flex items-center"
            >
              {link.label}
            </a>
          ))}

          <div className="flex items-center gap-1 2xl:gap-2 h-16 ml-2">
            <a
              href={EXAM_CODE_HREF}
              className="hover:bg-white/15 rounded-lg px-3 min-h-11 flex items-center transition-colors"
              aria-label="Enter your exam code"
            >
              Enter Exam Code
            </a>
            <a
              href={LOGIN_HREF}
              className="hover:bg-white/15 rounded-lg px-3 min-h-11 flex items-center transition-colors"
              aria-label="Sign in as test taker"
            >
              Test Taker Login
            </a>
            <a
              href="/register"
              className="button-depth ml-2 rounded-xl px-5 min-h-11"
            >
              Get Started
            </a>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="xl:hidden p-2 text-white rounded-lg hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
          className="xl:hidden absolute top-full left-0 w-full max-h-[calc(100vh-4rem)] overflow-y-auto bg-white shadow-xl border-t border-slate-100 flex flex-col p-6 gap-6 font-medium text-slate-700"
        >
          <a href="/#solutions" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
          {MAIN_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <a href={EXAM_CODE_HREF} onClick={() => setMobileMenuOpen(false)} className="font-bold text-slate-800">Enter Exam Code</a>
          <a href={LOGIN_HREF} onClick={() => setMobileMenuOpen(false)} className="font-bold text-[#ad024c]">Test Taker Login</a>
          <a
            href="/register"
            onClick={() => setMobileMenuOpen(false)}
            className="button-depth w-full rounded-xl px-4 py-3"
          >
            Get Started
          </a>
        </div>
      )}
    </nav>
  );
};
