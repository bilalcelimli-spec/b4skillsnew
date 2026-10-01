export type ProductiveMode = "WRITING" | "SPEAKING";

/** Explicit task format takes priority over the source skill for integrated tasks. */
export function productiveModes(skill: string, type: string | undefined, content: Record<string, any>): ProductiveMode[] {
  if (skill === "LISTENING" || type === "INTEGRATED_TASK") {
    if (content.responseFormat === "spoken-or-written") return ["WRITING", "SPEAKING"];
    if (content.responseFormat === "spoken") return ["SPEAKING"];
    if (content.responseFormat === "written" || content.taskType === "productive") return ["WRITING"];
  }
  if (type !== "INTEGRATED_TASK" && (["MULTIPLE_CHOICE", "FILL_IN_BLANKS", "DRAG_DROP"].includes(type ?? "") ||
      (Array.isArray(content.options) && content.options.length > 0))) return [];
  return skill === "WRITING" || skill === "SPEAKING" ? [skill] : [];
}

export function productiveScoringMode(skill: string, type: string | undefined, content: Record<string, any>, value: unknown): ProductiveMode | null {
  const modes = productiveModes(skill, type, content);
  if (!modes.length) return null;
  const responseMode = typeof value === "string" ? "WRITING" : "SPEAKING";
  if (type !== "INTEGRATED_TASK" && (skill === "WRITING" || skill === "SPEAKING")) return skill;
  if (!modes.includes(responseMode)) throw new Error("Response format does not match the task");
  if (responseMode === "SPEAKING" && (!value || typeof value !== "object" ||
      typeof (value as any).audio !== "string" || typeof (value as any).mimeType !== "string")) {
    throw new Error("Invalid audio response");
  }
  return responseMode;
}
