/**
 * "--only" filter for generation scripts, without building a RegExp from CLI
 * input (CodeQL js/regex-injection). Parts are separated by "|"; a part
 * matches as a substring, "^part" as a prefix, "part$" as a suffix,
 * "^part$" exactly. Same spellings the scripts' docs already use.
 */
export function makeCellFilter(spec: string | undefined): ((label: string) => boolean) | undefined {
  if (!spec) return undefined;
  const parts = spec.split("|").map((p) => p.trim()).filter(Boolean).map((p) => ({
    start: p.startsWith("^"), end: p.endsWith("$"), text: p.replace(/^\^/, "").replace(/\$$/, ""),
  }));
  return (label: string) => parts.some(({ start, end, text }) =>
    start && end ? label === text : start ? label.startsWith(text) : end ? label.endsWith(text) : label.includes(text));
}
