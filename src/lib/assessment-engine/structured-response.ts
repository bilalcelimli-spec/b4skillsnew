/** Grade index-based matching and ordering without exposing keys to candidates. */
export function scoreStructuredResponse(content: Record<string, any>, value: unknown): number {
  const items = content.draggableItems ?? content.wordBank;
  const count = items?.length;
  if (!Number.isInteger(count) || count < 1 || !value || typeof value !== "object") {
    throw new Error("Invalid structured response");
  }
  const response = value as Record<string, any>;
  const validIndex = (index: unknown): index is number =>
    Number.isInteger(index) && (index as number) >= 0 && (index as number) < count;
  if (Array.isArray(content.correctSequence)) {
    const placements = response.placements;
    const expected = content.correctSequence;
    if (response.kind !== "placement" || !Array.isArray(placements) || placements.length !== expected.length ||
        !placements.every(validIndex) || new Set(placements).size !== placements.length) throw new Error("Invalid placement response");
    return placements.every((index, position) => items[index] === expected[position]) ? 1 : 0;
  }
  if (content.correctMapping) {
    const targets = content.dropZones?.length;
    const mapping = response.mapping;
    if (response.kind !== "matching" || !targets || !mapping || Array.isArray(mapping) || typeof mapping !== "object" ||
        Object.keys(mapping).length !== targets ||
        !Array.from({ length: targets }, (_, i) => i).every(i => validIndex(mapping[String(i)])) ||
        new Set(Object.values(mapping)).size !== targets) throw new Error("Invalid matching response");
    return Array.from({ length: targets }, (_, i) => i)
      .every(i => mapping[String(i)] === content.correctMapping[String(i)]) ? 1 : 0;
  }
  if (Array.isArray(content.correctOrder)) {
    const order = response.order;
    if (response.kind !== "ordering" || !Array.isArray(order) || order.length !== count ||
        !order.every(validIndex) || new Set(order).size !== count) throw new Error("Invalid ordering response");
    return order.every((index, position) => index === content.correctOrder[position]) ? 1 : 0;
  }
  if (Array.isArray(content.correctAnswers) && Number.isInteger(content.selectCount)) {
    const selected = response.selected;
    const k = content.selectCount as number;
    if (response.kind !== "selection" || !Array.isArray(selected) || selected.length !== k ||
        !selected.every(validIndex) || new Set(selected).size !== k) throw new Error("Invalid selection response");
    const key = new Set<number>(content.correctAnswers);
    return selected.every((index: number) => key.has(index)) ? 1 : 0;
  }
  throw new Error("Unsupported structured item configuration");
}
