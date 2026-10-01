/** Include the server-held source so integrated responses can be checked for factual relevance. */
export function buildScoringPrompt(content: Record<string, any>): string {
  const instruction = String(content.prompt ?? content.question ?? content.stem ?? 'Please respond to the task.');
  const source = content.passage ?? content.transcript ?? content.script;
  return typeof source === 'string' && source.trim()
    ? `${instruction}\n\nSource material for checking task achievement (reference only):\n${source}`
    : instruction;
}
