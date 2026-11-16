import React from 'react';
import { cn } from '../lib/utils';
import { optionImage, optionText, type DisplayOption } from '../lib/assessment-engine/option-presentation';

/** Shared choice controls for fixed and adaptive assessments. */
export function MultipleChoiceOptions({ options, selected, onSelect, disabled, labelledBy = 'item-prompt' }: {
  options: DisplayOption[];
  selected: number | null;
  onSelect: (index: number) => void;
  disabled?: boolean;
  labelledBy?: string;
}) {
  // Picture options ("choose the right picture"): a grid of image cards, letter badge, optional caption.
  if (options.some((option) => optionImage(option))) {
    return <div className={cn('grid gap-3', options.length === 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}
      role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((option, index) => {
        const src = optionImage(option);
        const caption = optionText(option);
        const alt = (typeof option === 'string' ? '' : option.imageAlt) || caption || `Picture ${String.fromCharCode(65 + index)}`;
        return <button key={index} role="radio" aria-checked={selected === index} disabled={disabled} onClick={() => onSelect(index)}
          aria-label={`Option ${String.fromCharCode(65 + index)}: ${alt}`}
          className={cn('relative min-w-0 p-2 sm:p-3 rounded-2xl border-2 bg-white transition-all focus:ring-4 focus:ring-indigo-100 outline-none',
            selected === index ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200',
            'disabled:opacity-50 disabled:cursor-not-allowed')}>
          <span aria-hidden="true" className={cn('absolute top-2 left-2 w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border',
            selected === index ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/90 text-slate-500 border-slate-200')}>
            {String.fromCharCode(65 + index)}
          </span>
          {src
            ? <img src={src} alt="" className="w-full aspect-square object-contain rounded-xl bg-slate-50" draggable={false} />
            : <div className="w-full aspect-square rounded-xl bg-slate-100" />}
          {caption && <span className="mt-2 block break-words font-medium text-slate-700 text-base">{caption}</span>}
        </button>;
      })}
    </div>;
  }

  return <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby={labelledBy}>
    {options.map((option, index) => <button key={index} role="radio" aria-checked={selected === index}
      disabled={disabled} onClick={() => onSelect(index)} aria-label={`Option ${String.fromCharCode(65 + index)}: ${optionText(option)}`}
      className={cn('w-full min-w-0 text-left p-3 sm:p-5 rounded-2xl border-2 transition-all group focus:ring-4 focus:ring-indigo-100 outline-none',
        selected === index ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50',
        'disabled:opacity-50 disabled:cursor-not-allowed')}>
      <div className="flex items-center gap-4">
        <div aria-hidden="true" className={cn('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-xs transition-colors border',
          selected === index ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 border-slate-100')}>
          {String.fromCharCode(65 + index)}
        </div>
        <span className="min-w-0 break-words whitespace-pre-wrap font-medium text-slate-700 text-base leading-relaxed">{optionText(option)}</span>
        <span className="ml-auto text-[10px] font-mono text-slate-300 select-none" aria-hidden="true">{index + 1}</span>
      </div>
    </button>)}
  </div>;
}
