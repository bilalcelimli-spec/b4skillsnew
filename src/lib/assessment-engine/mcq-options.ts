// ── OPTION SHUFFLING ──────────────────────────────────────────────────────────
/**
 * Seeded LCG PRNG (not cryptographic — used only for deterministic option
 * ordering so the server can reproduce the same shuffle at scoring time
 * without persisting extra state).
 */
function seededRng(seed: string): () => number {
  // FNV-1a 32-bit hash to convert string seed to numeric
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 0x100000000;
  };
}

export function seededFisherYates<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  const rng = seededRng(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles MCQ options for a (sessionId, itemId) pair and returns:
 * - shuffledOptions: options array with re-labelled positional ids (A/B/C/D)
 * - newCorrectAnswer: the letter the correct option received after shuffle
 *
 * Returns null for non-MCQ items or items without the expected format.
 */
export function shuffleMcqOptions(
  options: unknown[],
  correctAnswer: string,
  sessionId: string,
  itemId: string,
): { shuffledOptions: { id: string; text: string }[]; newCorrectAnswer: string } | null {
  if (!Array.isArray(options) || options.length === 0) return null;
  if (!/^[A-Da-d]$/.test(correctAnswer)) return null;
  const hasIdText = options.every(
    (o) => typeof o === "object" && o !== null && typeof (o as any).id === "string" && typeof (o as any).text === "string",
  );
  if (!hasIdText) return null;

  const seed = `${sessionId}:${itemId}`;
  const shuffled = seededFisherYates(options as { id: string; text: string }[], seed);
  const LABELS = ["A", "B", "C", "D"];
  const originalCorrectId = correctAnswer.toUpperCase();
  const newCorrectIndex = shuffled.findIndex((o) => o.id.toUpperCase() === originalCorrectId);
  if (newCorrectIndex === -1) return null;

  const shuffledOptions = shuffled.map((o, i) => ({ ...o, id: LABELS[i] }));
  return { shuffledOptions, newCorrectAnswer: LABELS[newCorrectIndex] };
}
// ─────────────────────────────────────────────────────────────────────────────
