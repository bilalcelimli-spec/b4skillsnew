import React, { useState } from "react";

interface Props {
  content: Record<string, any>;
  disabled?: boolean;
  onResponse: (value: unknown) => void;
}

/** Stable original indexes are sent to the server regardless of display order. */
export function StructuredResponse({ content, disabled, onResponse }: Props) {
  const items: string[] = content.draggableItems ?? [];
  const zones: string[] = content.dropZones ?? [];
  const matching = zones.length > 0;
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [order, setOrder] = useState(() => items.map((_, i) => i).reverse());
  if (!items.length) return <p role="alert">This question could not be loaded. Please contact support.</p>;
  const complete = !matching || zones.every((_, i) => mapping[String(i)] !== undefined);
  const move = (position: number, delta: number) => {
    setOrder(previous => {
      const next = [...previous];
      [next[position], next[position + delta]] = [next[position + delta], next[position]];
      return next;
    });
  };
  return (
    <section className="space-y-5" aria-label={matching ? "Matching task" : "Ordering task"}>
      <h3 className="text-xl font-bold whitespace-pre-line">{content.prompt}</h3>
      <p className="text-sm text-slate-600">
        {matching ? "Choose one answer for each row. Each answer can be used once." : "Use Move up and Move down to arrange the sentences, then confirm your answer."}
      </p>
      {content.passage && <div className="p-4 rounded-xl bg-slate-50 whitespace-pre-line">{content.passage}</div>}
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
      <button type="button" disabled={disabled || !complete} className="w-full min-h-12 p-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50" onClick={() => onResponse(matching ? { kind: "matching", mapping } : { kind: "ordering", order })}>
        Confirm Answer
      </button>
    </section>
  );
}
