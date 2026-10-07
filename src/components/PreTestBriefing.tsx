import React from "react";
import { Clock, Mic, Camera, BookOpen, Headphones, PenLine, MessageSquare, ShieldCheck, XCircle, Wifi } from "lucide-react";
import { RubricPreview } from "./RubricPanel.js";
import { OZGUN_PRODUCT, OZGUN_SECTIONS, OZGUN_TITLE } from "../lib/fixed-forms/ozgun-kids";
import { getProfile } from "../lib/product-lines/profiles.js";

interface PreTestBriefingProps {
  productLine?: string;
  onStart: () => void;
  onCancel: () => void;
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
  Reading:    <BookOpen size={14} />,
  Listening:  <Headphones size={14} />,
  Writing:    <PenLine size={14} />,
  Speaking:   <MessageSquare size={14} />,
  Grammar:    <BookOpen size={14} />,
  Vocabulary: <BookOpen size={14} />,
};

export const PreTestBriefing: React.FC<PreTestBriefingProps> = ({ productLine, onStart, onCancel }) => {
  const profile = getProfile(productLine);
  const fixed = productLine === OZGUN_PRODUCT;
  const title = fixed ? OZGUN_TITLE : profile.displayName ?? profile.name;
  const duration = fixed ? "105 min" : `${profile.estimatedDurationMin[0]}–${profile.estimatedDurationMin[1]} min`;
  const skills = (fixed ? OZGUN_SECTIONS.map(section => section.skill) : profile.sectionOrder).map((skill) => skill.charAt(0) + skill.slice(1).toLowerCase());
  const needsMic = skills.includes("Speaking");
  const needsCamera = true;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-white shadow-2xl w-full sm:max-w-xl min-h-[100dvh] sm:min-h-0 sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pre-test-briefing-title"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 sm:px-6 py-4 sm:py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1">B4Skills Assessment</p>
              <h1 id="pre-test-briefing-title" className="text-xl font-black">{title}</h1>
            </div>
            <button onClick={onCancel} className="text-indigo-200 hover:text-white transition-colors" aria-label="Cancel">
              <XCircle size={22} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-5">
          {/* Duration + skills overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-indigo-500" />
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Duration</span>
              </div>
              <p className="text-2xl font-black text-indigo-700">{duration}</p>
              <p className="text-xs text-indigo-400 mt-0.5">{fixed ? "96 questions · 4 timed sections" : "Adaptive — stops early when confident"}</p>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Skills Tested</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map(sk => (
                  <span key={sk} className="flex items-center gap-1 text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {SKILL_ICONS[sk]} {sk}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Question types */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">What to Expect</p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-indigo-400 font-bold">→</span>
                {fixed ? "Choose A, B, C or D for each question. Correct: 1 point; wrong or blank: 0 points." : "Multiple-choice, gap-fill, ordering and matching tasks for reading and listening"}
              </li>
              {skills.includes("Writing") && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-400 font-bold">→</span>
                  Short writing tasks scored by AI across 6 dimensions within 48 hours
                </li>
              )}
              {skills.includes("Speaking") && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-400 font-bold">→</span>
                  Spoken responses recorded and scored by AI across 7 dimensions within 48 hours
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-indigo-400 font-bold">→</span>
                {fixed ? "Sections close when their time ends or you finish them. Closed sections cannot be revisited." : "The test adapts difficulty as you go — there is no fixed number of questions"}
              </li>
            </ul>
            {fixed && <div className="mt-3 space-y-2 text-sm text-slate-600">
              <ul className="space-y-1">{OZGUN_SECTIONS.map(section => <li key={section.skill}>{section.label}: {section.first}–{section.last} · {section.minutes} min</li>)}</ul>
              <p>The listening recording plays once and contains each conversation twice. Do not use dictionaries or translation tools.</p>
              <p>Writing and Speaking are not assessed. Results provide provisional course guidance, not a general CEFR certificate.</p>
            </div>}
          </div>

          {/* Rubric transparency — Writing */}
          {skills.includes("Writing") && (
            <RubricPreview skill="writing" />
          )}

          {/* Rubric transparency — Speaking */}
          {skills.includes("Speaking") && (
            <RubricPreview skill="speaking" />
          )}

          {/* Technical requirements */}
          {(needsMic || needsCamera) && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Technical Requirements</p>
              <div className="flex flex-wrap gap-3 text-xs font-medium text-amber-800">
                {needsMic && (
                  <span className="flex items-center gap-1.5 bg-white border border-amber-200 px-2.5 py-1 rounded-full">
                    <Mic size={13} className="text-amber-600" /> Microphone required
                  </span>
                )}
                {needsCamera && (
                  <span className="flex items-center gap-1.5 bg-white border border-amber-200 px-2.5 py-1 rounded-full">
                    <Camera size={13} className="text-amber-600" /> Camera required (proctoring)
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-white border border-amber-200 px-2.5 py-1 rounded-full">
                  <Wifi size={13} className="text-amber-600" /> Stable internet connection
                </span>
              </div>
            </div>
          )}

          {/* Policies */}
          <div className="flex items-start gap-2 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              {fixed ? "Submitted answers are saved. Leaving or disconnecting does not pause section timers. Resume the same attempt while time remains. Preparation does not start the exam timer." : "Do not refresh or close the tab during the test. If disconnected, your progress is saved and you can resume within 30 minutes. Results and certificate will be issued after all sections are scored."}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 bg-white px-5 sm:px-6 py-4 sm:py-5 flex gap-3 shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.5)]">
          <button
            onClick={onCancel}
            className="flex-1 border border-slate-200 text-slate-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors shadow-sm"
          >
            I'm Ready — Start Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreTestBriefing;
