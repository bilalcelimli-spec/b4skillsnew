import React from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '../lib/utils';

export const SECTION_LABELS: Record<string, string> = {
  VOCABULARY: 'Vocabulary', GRAMMAR: 'Grammar', LISTENING: 'Listening',
  READING: 'Reading', WRITING: 'Writing', SPEAKING: 'Speaking',
};
export const SECTION_COLORS: Record<string, string> = {
  VOCABULARY: 'bg-pink-500', GRAMMAR: 'bg-violet-500', LISTENING: 'bg-cyan-500',
  READING: 'bg-blue-500', WRITING: 'bg-emerald-500', SPEAKING: 'bg-amber-500',
};

export function AssessmentHeader({ children }: { children: React.ReactNode }) {
  return <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-wrap sticky top-0 z-10">
    <div className="flex min-w-0 items-center gap-2 sm:gap-6">
      <div className="bg-[#9b276c] justify-center text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight flex items-center">
        <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)' }}>b4skills</span>
      </div>
      <div className="h-8 w-px bg-slate-100 hidden md:block" />
      <div className="hidden sm:block"><LanguageSwitcher /></div>
    </div>
    <div className="flex flex-wrap w-full sm:w-auto min-w-0 items-center justify-between gap-2 sm:gap-6">{children}</div>
  </header>;
}

export function AssessmentSections({ order, index, counts }: { order: readonly string[]; index: number; counts: Record<string, number> }) {
  return <nav className="bg-white border-b border-slate-100 px-3 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto" aria-label="Test section progress">
    {order.map((skill, i) => <div key={skill} className="flex items-center gap-1.5 shrink-0">
      <div aria-current={i === index ? 'step' : undefined} className={cn(
        'flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition-all',
        i <= index ? `${SECTION_COLORS[skill] ?? 'bg-slate-500'} text-white ${i < index ? 'opacity-70' : 'shadow-sm'}` : 'bg-slate-100 text-slate-400',
      )}>
        {SECTION_LABELS[skill] ?? skill}
        {!!counts[skill] && <span className={cn('ml-1 px-1 rounded text-[9px] font-black leading-none', i <= index ? 'bg-white/30' : 'bg-slate-200 text-slate-500')}>{counts[skill]}</span>}
      </div>
      {i < order.length - 1 && <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />}
    </div>)}
  </nav>;
}

export function AssessmentFooter({ sessionId, connection = 'Connected to Adaptive Engine', detail = 'Real-time Psychometric Sync' }: { sessionId?: string | null; connection?: string; detail?: string }) {
  return <footer className="bg-white border-t border-slate-200 px-4 sm:px-8 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap min-w-0 items-center gap-4">
      <div className="flex items-center gap-2 text-xs text-slate-500"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />{connection}</div>
      <div className="hidden sm:block h-4 w-px bg-slate-200" />
      <div className="text-xs text-slate-500 font-mono break-all" aria-label="Exam ID">Exam ID: {sessionId ?? 'Preparing…'}</div>
    </div>
    <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Activity size={12} />{detail}</div>
  </footer>;
}
