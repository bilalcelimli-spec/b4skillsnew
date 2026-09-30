/** Grade index-based matching and ordering without exposing keys to candidates. */
export function scoreStructuredResponse(content: Record<string, any>, value: unknown): number {
  const count = content.draggableItems?.length;
  if (!Number.isInteger(count) || count < 1 || !value || typeof value !== "object") {
    throw new Error("Invalid structured response");
  }
  const response = value as Record<string, any>;
  const validIndex = (index: unknown): index is number =>
    Number.isInteger(index) && (index as number) >= 0 && (index as number) < count;
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
  throw new Error("Unsupported structured item configuration");
}
