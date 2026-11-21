type Level = "PRE_A1" | "A1" | "A2" | "B1" | "B2";
type Product = "primary" | "junior";
type Choice = readonly [text: string, rationale: string];
export type Choices = readonly [Choice, Choice, Choice, Choice];

export interface WaveItem {
  itemCode: string;
  productLine: Product;
  cefrLevel: Level;
  skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "GRAMMAR" | "VOCABULARY";
  type: "MULTIPLE_CHOICE" | "WRITING_PROMPT" | "SPEAKING_PROMPT" | "FILL_IN_BLANKS";
  genre: string;
  topic: string;
  subskill: string;
  construct: string;
  evidenceStatement: string;
  descriptorRef: string;
  content: Record<string, string | number | string[] | object>;
  rejectedAnswer?: string;
  readingSetId?: string;
}

export interface Specification {
  number: string;
  wave?: "01" | "02" | "03" | "04" | "05" | "06" | "07";
  productLine: Product;
  level: Level;
  genre: string;
  topic: string;
  subskill: string;
  construct: string;
  evidence: string;
}

export function item(
  spec: Specification,
  skill: WaveItem["skill"],
  type: WaveItem["type"],
  scale: string,
  content: WaveItem["content"],
): WaveItem {
  const prefix = spec.productLine === "primary" ? "PRI" : "JUN";
  return {
    itemCode: `${prefix}-${skill.slice(0, 3)}-${spec.level}-W${spec.wave ?? "01"}-${spec.number}`,
    productLine: spec.productLine,
    cefrLevel: spec.level,
    skill,
    type,
    genre: spec.genre,
    topic: spec.topic,
    subskill: spec.subskill,
    construct: spec.construct,
    evidenceStatement: spec.evidence,
    descriptorRef: `CEFR Companion Volume (2020) · ${scale} · ${spec.level.replace("PRE_A1", "Pre-A1")}`,
    content: { ...content, productLine: spec.productLine },
  };
}

export function productiveRubric(version: string, dimensions: Record<string, string>) {
  return {
    version,
    scale: {
      0: "On a usable response, no assessable evidence for this criterion.",
      1: "Isolated or substantially unclear evidence.",
      2: "Partial evidence with a consequential omission or loss of clarity.",
      3: "Clear evidence with minor limitations.",
      4: "Complete, clear evidence for this task at the target level.",
    },
    criteria: Object.entries(dimensions).map(([name, descriptor]) => ({ name, descriptor, maxScore: 4 })),
  };
}

export function choiceKey(correctIndex: number, choices: Choices) {
  return {
    options: choices.map(([text, rationale], index) => ({
      id: String.fromCharCode(65 + index), text, rationale, isCorrect: index === correctIndex,
    })),
    correctIndex,
    correctAnswer: String.fromCharCode(65 + correctIndex),
  };
}

export function objective(
  spec: Specification,
  scale: string,
  source: string,
  prompt: string,
  correctIndex: number,
  choices: Choices,
  speakers?: [string, string],
): WaveItem {
  const stimulus = speakers
    ? { ttsScript: source, transcript: source, numberOfSpeakers: speakers.length, speakers }
    : { passage: source };
  return item(spec, speakers ? "LISTENING" : "READING", "MULTIPLE_CHOICE", scale, {
    ...stimulus,
    prompt,
    ...choiceKey(correctIndex, choices),
  });
}
