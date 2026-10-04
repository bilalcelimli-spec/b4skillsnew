import React, { useState } from "react";
import { normalizeBlankScaffold } from "../lib/assessment-engine/blank-response";

interface Props {
  content: Record<string, any>;
  disabled?: boolean;
  onResponse: (value: unknown) => void;
}

/** Stable original indexes are sent to the server regardless of display order. */
export function StructuredResponse({ content, disabled, onResponse }: Props) {
  const items: string[] = content.draggableItems ?? content.wordBank ?? [];
  const scaffold = content.stimulus || content.scaffold || content.passage || "";
  const slotCount = (normalizeBlankScaffold(scaffold).match(/___/g) ?? []).length;
  const placement = !content.dropZones?.length && slotCount > 0;
  const zones: string[] = content.dropZones?.length ? content.dropZones : (placement ? Array.from({ length: slotCount }, (_, i) => `Blank ${i + 1}`) : []);
  const matching = zones.length > 0;
  const selectCount: number = Number.isInteger(content.selectCount) ? content.selectCount : 0;
  const selection = selectCount > 0 && !content.dropZones?.length;
  const [selected, setSelected] = useState<number[]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [order, setOrder] = useState(() => items.map((_, i) => i).reverse());
  if (!items.length) return <p role="alert">This question could not be loaded. Please contact support.</p>;
  const complete = selection ? selected.length === selectCount : !matching || zones.every((_, i) => mapping[String(i)] !== undefined);
  const move = (position: number, delta: number) => {
    setOrder(previous => {
      const next = [...previous];
      [next[position], next[position + delta]] = [next[position + delta], next[position]];
      return next;
    });
  };
  if (selection) {
    const toggle = (index: number) => setSelected(previous =>
      previous.includes(index) ? previous.filter(i => i !== index) : previous.length < selectCount ? [...previous, index] : previous);
    return (
      <section className="space-y-5" aria-label="Selection task">
        <fieldset className="space-y-3">
          <legend className="text-xl font-bold whitespace-pre-line">{content.prompt}</legend>
          <p className="text-sm text-slate-600" id="selection-hint">Choose exactly {selectCount} answers. {selected.length} of {selectCount} chosen.</p>
          {scaffold && <div className="p-4 rounded-xl bg-slate-50 whitespace-pre-line break-words">{scaffold}</div>}
          {items.map((text, index) => {
            const checked = selected.includes(index);
            const blocked = !checked && selected.length >= selectCount;
            return (
              <label key={index} className={`flex items-start gap-3 p-4 border rounded-xl min-h-11 ${checked ? "border-indigo-600 bg-indigo-50" : "border-slate-200"} ${blocked ? "opacity-60" : ""}`}>
                <input type="checkbox" className="mt-1 h-5 w-5" aria-describedby="selection-hint" checked={checked} disabled={disabled || blocked} onChange={() => toggle(index)} />
                <span className="flex-1 min-w-0">{text}</span>
              </label>
            );
          })}
        </fieldset>
        <button type="button" disabled={disabled || !complete} className="w-full min-h-12 p-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50" onClick={() => onResponse({ kind: "selection", selected: [...selected].sort((a, b) => a - b) })}>
          Confirm Answer
        </button>
      </section>
    );
  }
  return (
    <section className="space-y-5" aria-label={placement ? "Word placement task" : matching ? "Matching task" : "Ordering task"}>
      <h3 className="text-xl font-bold whitespace-pre-line">{content.prompt}</h3>
      <p className="text-sm text-slate-600">
        {placement ? "Choose a word for each blank. Each word can be used once; some words may not be needed." : matching ? "Choose one answer for each row. Each answer can be used once." : "Use Move up and Move down to arrange the sentences, then confirm your answer."}
      </p>
      {scaffold && <div className="p-4 rounded-xl bg-slate-50 whitespace-pre-line break-words">{scaffold}</div>}
      {matching ? zones.map((zone, i) => (
        <label key={i} className="grid gap-2 sm:grid-cols-2 items-center p-4 border border-slate-200 rounded-xl">
          <span className="font-semibold">{zone}</span>
          <select
            className="w-full min-w-0 min-h-11 rounded-lg border border-slate-300 p-2 bg-white"
            disabled={disabled}
            value={mapping[String(i)] ?? ""}
            onChange={event => setMapping(previous => {
              const next = { ...previous };
              if (event.target.value === "") delete next[String(i)];
              else next[String(i)] = Number(event.target.value);
              return next;
            })}
          >
            <option value="">Choose an answer</option>
            {[...items.keys()].reverse().map(index => (
              <option key={index} value={index} disabled={Object.entries(mapping).some(([target, answer]) => target !== String(i) && answer === index)}>
                {items[index]}
              </option>
            ))}
          </select>
        </label>
      )) : (
        <ol className="space-y-3">
          {order.map((index, position) => (
            <li key={index} className="flex flex-wrap items-center gap-3 p-4 border border-slate-200 rounded-xl">
              <span className="flex-1 min-w-0">{position + 1}. {items[index]}</span>
              <div className="flex gap-2">
                <button type="button" className="min-h-11 px-3 border rounded-lg" aria-label={`Move ${items[index]} up`} disabled={disabled || position === 0} onClick={() => move(position, -1)}>↑</button>
                <button type="button" className="min-h-11 px-3 border rounded-lg" aria-label={`Move ${items[index]} down`} disabled={disabled || position === order.length - 1} onClick={() => move(position, 1)}>↓</button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <button type="button" disabled={disabled || !complete} className="w-full min-h-12 p-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50" onClick={() => onResponse(placement ? { kind: "placement", placements: zones.map((_, i) => mapping[String(i)]) } : matching ? { kind: "matching", mapping } : { kind: "ordering", order })}>
        Confirm Answer
      </button>
    </section>
  );
}
