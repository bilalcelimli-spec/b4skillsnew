/** Shared parsing for editorial checks and synthesis; never infer audible voices from text. */
export function parseSpeakerTurn(line: string): { speaker: string; utterance: string } | null {
  const normalized = line.trim().replace(/^\[([^\]\n]+)\]:\s*/, '$1: ');
  const match = normalized.match(/^((?:Speaker\s+[A-Z])|(?:[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,3})):\s+(\S.*)$/);
  // Worksheet fields such as "Wearing: green ____" are not speakers.
  return match && (!/_{2,}/.test(match[2]) || /^Speaker\s+[A-Z]$/.test(match[1]))
    ? { speaker: match[1], utterance: match[2] } : null;
}
export function speakerLabels(script: string): string[] {
  return [...new Set(script.split(/\r?\n/).flatMap(line => {
    const turn = parseSpeakerTurn(line);
    return turn ? [turn.speaker] : [];
  }))];
}
export function normalizeSpeakerLabels(script: string): string {
  return script.split(/\r?\n/).map(line => {
    const turn = parseSpeakerTurn(line);
    return turn ? `${turn.speaker}: ${turn.utterance}` : line;
  }).join('\n');
}

/** Legacy generators appended candidate note-taking scaffolds to the dialogue. */
export function stripListeningWorksheet(script: string): string {
  const marker = /(?:^|\n|\[pause\]\s*)Notes about [^:\n]+:\s*(?:\r?\n)/im.exec(script);
  if (!marker || !/_{2,}/.test(script.slice(marker.index))) return script;
  return script.slice(0, marker.index).trim();
}
