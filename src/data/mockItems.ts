export type ItemType =
  | "READING"
  | "LISTENING"
  | "GRAMMAR"
  | "VOCABULARY"
  | "SPEAKING"
  | "WRITING"
  | "IMAGE_DESCRIPTION"
  | "FILL_IN_BLANKS"
  | "INTEGRATED_TASK";

export interface TestItem {
  id: string;
  type: ItemType;
  /** Optional sub-skill label (e.g. listening variant of a fill-in task). */
  skill?: string;
  difficulty: number; // 1 (Easy) to 5 (Hard)
  content: {
    prompt: string;
    passage?: string;
    options?: (string | { text?: string; imageUrl?: string; isCorrect?: boolean })[];
    correctIndex?: number;
    correctAnswer?: string;
    audioUrl?: string;
    imageUrl?: string;
    minWords?: number;
    maxTime?: number;
    type?: string;
  };
}

/** In-app fallback only; production item bank is loaded from the API / database. */
export const mockItems: TestItem[] = [];
