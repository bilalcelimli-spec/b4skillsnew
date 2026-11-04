/** Audio models do not guarantee structured output. Never salvage partial JSON or log speech. */
export function parseSpeakingScore(content: string): unknown {
  const text = content.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(text);
  try {
    const value: unknown = JSON.parse(fenced ? fenced[1] : text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    // JSON.parse messages may quote the candidate transcript; keep errors content-free.
    throw new Error('Invalid AI speaking response format');
  }
}
