/** Interim conservative gate until versioned, author-reviewed task rubrics are available.
 * Descriptions, notes and personal messages must not be held for missing argument structure.
 * Unknown task types keep the AI/integrity gates, but argument heuristics remain advisory.
 */
export function requiresArgumentStructure(prompt: string): boolean {
  const instruction = prompt.split(/\n\n(?:Source material for checking task achievement|Task assessment context)/)[0];
  return /\b(advantages? and disadvantages?|pros and cons|argumentative|argue (?:for|against)|to what extent|agree or disagree)\b/i.test(instruction) ||
    /\bdiscuss\b[\s\S]*\b(views?|opinions?|advantages?|disadvantages?)\b/i.test(instruction);
}
