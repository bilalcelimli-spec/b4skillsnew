/**
 * Accessibility Statement — /accessibility-statement
 *
 * Public page documenting b4skills' WCAG 2.1 AA commitment,
 * known limitations, and contact process for accessibility requests.
 */

import React from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

interface Props {
  onStart?: () => void;
  onCodeEntry?: () => void;
  onBack?: () => void;
}

const LAST_REVIEWED = "September 2026";
const CONTACT_EMAIL = "accessibility@b4skills.com";

export const AccessibilityStatementPage: React.FC<Props> = ({ onStart, onCodeEntry }) => (
  <div className="min-h-screen bg-white flex flex-col">
    <SiteNav onStart={onStart ?? (() => {})} onCodeEntry={onCodeEntry ?? (() => {})} />

    <main className="flex-grow max-w-3xl mx-auto px-6 py-24 w-full">
      <header className="mb-12">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest mb-4">
          Accessibility
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4">Accessibility Statement</h1>
        <p className="text-slate-500 text-sm">
          Last reviewed: <strong>{LAST_REVIEWED}</strong>
        </p>
      </header>

      <div className="prose prose-slate max-w-none text-slate-700 space-y-8">

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Our commitment</h2>
          <p>
            b4skills is committed to ensuring digital accessibility for people with disabilities.
            We continually improve the user experience for everyone and apply relevant accessibility standards.
          </p>
          <p>
            We aim to conform to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>.
            These guidelines explain how to make web content more accessible to people with disabilities.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Conformance status</h2>
          <p>
            b4skills is <strong>partially conformant</strong> with WCAG 2.1 Level AA. Partially conformant
            means that some parts of the content do not fully conform to the accessibility standard.
            We are actively working to address known issues.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Known limitations</h2>
          <p>Despite our best efforts to ensure accessibility, there may be some limitations:</p>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li>
              <strong>Audio recording (Speaking tasks):</strong> The microphone interface relies on browser
              MediaRecorder support. Users who cannot use audio input may request an alternative speaking
              assessment format by contacting our support team.
            </li>
            <li>
              <strong>Timed assessments:</strong> All adaptive tests include per-item timing to preserve
              psychometric validity. Extended time accommodations are available upon request for candidates
              with documented disabilities.
            </li>
            <li>
              <strong>Score report charts:</strong> Sub-score radar charts and trend visualisations include
              descriptive text equivalents but may not fully convey data to screen reader users in all
              configurations. We are improving ARIA table fallbacks.
            </li>
            <li>
              <strong>PDF certificates:</strong> Downloadable certificates are currently not tagged PDFs.
              A tagged, screen-reader-compatible version is available on request.
            </li>
            <li>
              <strong>Complex drag-and-drop items:</strong> A small subset of grammar item types uses
              drag-and-drop interactions. Keyboard-only equivalents exist for all such items.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">What we have done</h2>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li>All form inputs carry visible labels and descriptive ARIA attributes.</li>
            <li>Colour contrast ratios meet WCAG 2.1 AA minimums (4.5:1 for body text, 3:1 for large text).</li>
            <li>Focus indicators are visible on all interactive controls.</li>
            <li>The assessment engine supports keyboard-only navigation for all multiple-choice item types.</li>
            <li>Error messages identify the field in error and describe the problem.</li>
            <li>The platform respects <code>prefers-reduced-motion</code> — animations are suppressed when requested.</li>
            <li>Session timeout warnings give candidates at least 30 seconds to extend their session.</li>
            <li>All images carry descriptive <code>alt</code> attributes or are marked decorative.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Accommodation requests</h2>
          <p>
            We provide reasonable accommodations for test-takers with disabilities. Accommodations may include:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Extended time (typically 50% or 100% additional time)</li>
            <li>Alternative format for speaking tasks (written response)</li>
            <li>Screen-reader-compatible assessment mode</li>
            <li>Tagged PDF score report</li>
          </ul>
          <p className="mt-3">
            To request an accommodation, contact{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#9b276c] font-semibold hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            at least 5 business days before your planned assessment date.
            Include your name, the type of accommodation requested, and any supporting documentation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Feedback and contact</h2>
          <p>
            We welcome feedback on the accessibility of b4skills. If you experience any accessibility
            barriers or have suggestions for improvement, please contact us:
          </p>
          <address className="not-italic text-sm bg-slate-50 rounded-xl p-5 mt-3 space-y-1">
            <p><strong>b4skills Accessibility Team</strong></p>
            <p>
              Email:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#9b276c] hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>We aim to respond to accessibility feedback within <strong>3 business days</strong>.</p>
          </address>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Technical specifications</h2>
          <p className="text-sm">
            Accessibility of b4skills relies on the following technologies to work with particular
            combinations of web browsers and assistive technologies:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>HTML5</li>
            <li>CSS (custom properties, flexbox, grid)</li>
            <li>WAI-ARIA 1.2</li>
            <li>JavaScript (React 18)</li>
          </ul>
          <p className="mt-3 text-sm">
            These technologies are relied upon for conformance with the accessibility standards used.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Assessment approach</h2>
          <p className="text-sm">
            b4skills assessed the accessibility of this platform using the following approaches:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Self-evaluation against WCAG 2.1 success criteria</li>
            <li>Automated testing using axe-core and Lighthouse</li>
            <li>Manual keyboard-only navigation testing</li>
            <li>Screen reader testing with NVDA (Windows) and VoiceOver (macOS/iOS)</li>
          </ul>
          <p className="mt-3 text-sm text-slate-500">
            An independent third-party audit is planned for Q1 2027. Results will be published on this page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Enforcement procedure</h2>
          <p className="text-sm">
            If you are not satisfied with our response to your accessibility feedback, you may contact the
            relevant national equality or human rights body in your jurisdiction.
          </p>
        </section>

      </div>
    </main>

    <SiteFooter />
  </div>
);
