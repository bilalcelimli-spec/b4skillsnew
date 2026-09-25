import React from "react";
import { Clock, Mic, Camera, BookOpen, Headphones, PenLine, MessageSquare, ShieldCheck, XCircle, Wifi } from "lucide-react";

interface PreTestBriefingProps {
  productLine?: string;
  onStart: () => void;
  onCancel: () => void;
}

const PRODUCT_DURATIONS: Record<string, string> = {
  "General English":    "25–35 min",
  "15-Min Diagnostic":  "15 min",
  "Academia":           "30–40 min",
  "Corporate":          "25–35 min",
  "Primary":            "20–25 min",
  "Junior":             "20–25 min",
  "Language School":    "25–35 min",
  "Specialized":        "30–40 min",
};

const PRODUCT_SKILLS: Record<string, string[]> = {
  "15-Min Diagnostic": ["Reading", "Listening", "Grammar"],
  "Primary":           ["Reading", "Listening", "Grammar", "Vocabulary"],
  "Junior":            ["Reading", "Listening", "Grammar", "Vocabulary"],
};

const DEFAULT_SKILLS = ["Reading", "Listening", "Writing", "Speaking", "Grammar", "Vocabulary"];

const SKILL_ICONS: Record<string, React.ReactNode> = {
  Reading:    <BookOpen size={14} />,
  Listening:  <Headphones size={14} />,
  Writing:    <PenLine size={14} />,
  Speaking:   <MessageSquare size={14} />,
  Grammar:    <BookOpen size={14} />,
  Vocabulary: <BookOpen size={14} />,
};

const NEEDS_MIC     = (pl?: string) => !["15-Min Diagnostic","Primary","Junior"].includes(pl ?? "");
const NEEDS_CAMERA  = (pl?: string) => !["15-Min Diagnostic","Primary","Junior"].includes(pl ?? "");

export const PreTestBriefing: React.FC<PreTestBriefingProps> = ({ productLine, onStart, onCancel }) => {
  const duration = PRODUCT_DURATIONS[productLine ?? "General English"] ?? "25–35 min";
  const skills   = PRODUCT_SKILLS[productLine ?? "General English"] ?? DEFAULT_SKILLS;
  const needsMic    = NEEDS_MIC(productLine);
  const needsCamera = NEEDS_CAMERA(productLine);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1">B4Skills Adaptive Assessment</p>
              <h1 className="text-xl font-black">{productLine ?? "General English"}</h1>
            </div>
            <button onClick={onCancel} className="text-indigo-200 hover:text-white transition-colors" aria-label="Cancel">
              <XCircle size={22} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Duration + skills overview */}
          <div className="flex items-start gap-4">
            <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-indigo-500" />
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Duration</span>
              </div>
              <p className="text-2xl font-black text-indigo-700">{duration}</p>
              <p className="text-xs text-indigo-400 mt-0.5">Adaptive — stops early when confident</p>
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
                Multiple-choice, gap-fill, ordering and matching tasks for reading and listening
              </li>
              {skills.includes("Writing") && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-400 font-bold">→</span>
                  Short writing tasks scored by AI within 48 hours
                </li>
              )}
              {skills.includes("Speaking") && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-400 font-bold">→</span>
                  Spoken responses recorded and scored by AI within 48 hours
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-indigo-400 font-bold">→</span>
                The test adapts difficulty as you go — there is no fixed number of questions
              </li>
            </ul>
          </div>

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
              Do not refresh or close the tab during the test. If disconnected, your progress is saved and you can resume within 30 minutes. Results and certificate will be issued after all sections are scored.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
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
