import React from 'react';
import { cn } from '../lib/utils';

/** Shared choice controls for fixed and adaptive assessments. */
export function MultipleChoiceOptions({ options, selected, onSelect, disabled, labelledBy = 'item-prompt' }: {
  options: string[];
  selected: number | null;
  onSelect: (index: number) => void;
  disabled?: boolean;
  labelledBy?: string;
}) {
  return <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby={labelledBy}>
    {options.map((text, index) => <button key={index} role="radio" aria-checked={selected === index}
      disabled={disabled} onClick={() => onSelect(index)} aria-label={`Option ${String.fromCharCode(65 + index)}: ${text}`}
      className={cn('w-full min-w-0 text-left p-3 sm:p-5 rounded-2xl border-2 transition-all group focus:ring-4 focus:ring-indigo-100 outline-none',
        selected === index ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50',
        'disabled:opacity-50 disabled:cursor-not-allowed')}>
      <div className="flex items-center gap-4">
        <div aria-hidden="true" className={cn('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-xs transition-colors border',
          selected === index ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 border-slate-100')}>
          {String.fromCharCode(65 + index)}
        </div>
        <span className="min-w-0 break-words whitespace-pre-wrap font-medium text-slate-700 text-base leading-relaxed">{text}</span>
        <span className="ml-auto text-[10px] font-mono text-slate-300 select-none" aria-hidden="true">{index + 1}</span>
      </div>
    </button>)}
  </div>;
}
