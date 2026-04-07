export type ItemType = 'READING' | 'LISTENING' | 'GRAMMAR' | 'VOCABULARY' | 'SPEAKING' | 'WRITING';

export interface TestItem {
  id: string;
  type: ItemType;
  difficulty: number; // 1 (Easy) to 5 (Hard)
  content: {
    prompt: string;
    passage?: string;
    options?: string[]; // Optional for Speaking/Writing
    correctIndex?: number; // Optional for Speaking/Writing
    audioUrl?: string;
    minWords?: number; // For Writing
    maxTime?: number; // For Speaking (seconds)
  };
}

export const mockItems: TestItem[] = [
  // ... existing items ...
  {
    id: "r1",
    type: "READING",
    difficulty: 1,
    content: {
      passage: "The cat sat on the mat. It was a sunny afternoon.",
      prompt: "Where did the cat sit?",
      options: ["On the chair", "On the mat", "In the garden", "Under the table"],
      correctIndex: 1
    }
  },
  {
    id: "r2",
    type: "READING",
    difficulty: 3,
    content: {
      passage: "Despite the economic downturn, the tech sector showed remarkable resilience, largely due to the rapid adoption of remote work tools.",
      prompt: "Why did the tech sector remain strong?",
      options: ["Lower taxes", "Remote work tools", "Government subsidies", "Increased exports"],
      correctIndex: 1
    }
  },
  {
    id: "g1",
    type: "GRAMMAR",
    difficulty: 2,
    content: {
      prompt: "Choose the correct form: She ____ to the store yesterday.",
      options: ["go", "goes", "went", "gone"],
      correctIndex: 2
    }
  },
  {
    id: "g2",
    type: "GRAMMAR",
    difficulty: 4,
    content: {
      prompt: "If I ____ you, I would have taken the offer.",
      options: ["was", "am", "had been", "were"],
      correctIndex: 2
    }
  },
  // LISTENING
  {
    id: "l1",
    type: "LISTENING",
    difficulty: 2,
    content: {
      prompt: "Listen to the audio and answer: What is the speaker's main concern?",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      options: ["The weather", "The traffic", "The deadline", "The budget"],
      correctIndex: 2
    }
  },
  {
    id: "l2",
    type: "LISTENING",
    difficulty: 4,
    content: {
      prompt: "Based on the conversation, what will the woman do next?",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      options: ["Call her manager", "Go to the bank", "Cancel the meeting", "Order lunch"],
      correctIndex: 0
    }
  },
  // VOCABULARY
  {
    id: "v1",
    type: "VOCABULARY",
    difficulty: 3,
    content: {
      prompt: "What is the closest synonym for 'Resilient'?",
      options: ["Fragile", "Tough", "Quiet", "Fast"],
      correctIndex: 1
    }
  },
  {
    id: "v2",
    type: "VOCABULARY",
    difficulty: 5,
    content: {
      prompt: "Which word best describes someone who is 'extremely careful and precise'?",
      options: ["Meticulous", "Gregarious", "Ephemeral", "Ambivalent"],
      correctIndex: 0
    }
  },
  // SPEAKING
  {
    id: "s1",
    type: "SPEAKING",
    difficulty: 2,
    content: {
      prompt: "Describe your favorite hobby and why you enjoy it.",
      maxTime: 60
    }
  },
  {
    id: "s2",
    type: "SPEAKING",
    difficulty: 4,
    content: {
      prompt: "Discuss the impact of social media on modern communication. Is it more positive or negative?",
      maxTime: 90
    }
  },
  {
    id: "s3",
    type: "SPEAKING",
    difficulty: 1,
    content: {
      prompt: "Introduce yourself and talk about your daily routine.",
      maxTime: 45
    }
  },
  {
    id: "s4",
    type: "SPEAKING",
    difficulty: 5,
    content: {
      prompt: "Analyze the ethical implications of artificial intelligence in the workplace. What are the potential risks and benefits?",
      maxTime: 120
    }
  },
  // WRITING
  {
    id: "w1",
    type: "WRITING",
    difficulty: 3,
    content: {
      prompt: "Write a short essay (150-200 words) about the importance of learning a second language in today's globalized world.",
      minWords: 150
    }
  },
  {
    id: "w2",
    type: "WRITING",
    difficulty: 2,
    content: {
      prompt: "Write a letter to a friend describing a recent trip you took. Include details about the location, activities, and your overall experience.",
      minWords: 100
    }
  },
  {
    id: "w3",
    type: "WRITING",
    difficulty: 4,
    content: {
      prompt: "Write a persuasive essay arguing for or against the implementation of a four-day work week. Support your position with clear reasons and examples.",
      minWords: 250
    }
  }
];
