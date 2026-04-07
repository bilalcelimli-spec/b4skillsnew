export type StudioItemStatus = 'Draft' | 'Linguistic Review' | 'Age & Bias Review' | 'Psychometric Ready' | 'Pilot' | 'Published' | 'Flagged';
export type ProductLine = 'Primary (7-10)' | 'Junior Suite (11-14)' | '15-Min Diagnostic' | 'Academia' | 'Corporate' | 'Language Schools';

export interface StudioItem {
  id: string;
  productLine: ProductLine;
  skill: 'Reading' | 'Listening' | 'Grammar' | 'Vocabulary' | 'Speaking' | 'Writing';
  subSkill: string;
  cefrLevel: string; // A1, A2, B1, B2, C1, C2
  status: StudioItemStatus;
  irt: { diff: number; disc: number; guess: number }; // b, a, c parameters
  content: {
    passage?: string;
    prompt: string;
    options?: { text: string; rationale: string; isCorrect: boolean }[];
    rubric?: string; // For speaking/writing
  };
  metrics?: { facility: number; ptBiserial: number; exposure: number };
}

export const studioItems: StudioItem[] = [
  // ─── PRIMARY (7-10) ────────────────────────────────────────────────────────
  {
    id: "PRM-1001",
    productLine: "Primary (7-10)",
    skill: "Vocabulary",
    subSkill: "Everyday Objects",
    cefrLevel: "A1",
    status: "Published",
    irt: { diff: -2.1, disc: 1.2, guess: 0.25 },
    content: {
        passage: "[Image of a bright red apple on a desk]",
        prompt: "What is this?",
        options: [
            { text: "It is a banana.", rationale: "Visual mismatch; common distractor.", isCorrect: false },
            { text: "It is an apple.", rationale: "Correct identification of the visual.", isCorrect: true },
            { text: "It is a book.", rationale: "Semantic distractor related to 'desk' context.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.85, ptBiserial: 0.35, exposure: 0.12 }
  },
  {
    id: "PRM-1002",
    productLine: "Primary (7-10)",
    skill: "Reading",
    subSkill: "Short Sentences",
    cefrLevel: "A2",
    status: "Published",
    irt: { diff: -1.5, disc: 1.1, guess: 0.2 },
    content: {
        passage: "Tom has a big dog. The dog is black and likes to run. It plays in the park every day.",
        prompt: "Where does the dog play?",
        options: [
            { text: "in the house", rationale: "Incorrect location.", isCorrect: false },
            { text: "in the park", rationale: "Key explicitly stated in sentence 3.", isCorrect: true },
            { text: "in the school", rationale: "Familiar setting for children, but not in text.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.72, ptBiserial: 0.40, exposure: 0.15 }
  },
  {
    id: "PRM-1003",
    productLine: "Primary (7-10)",
    skill: "Listening",
    subSkill: "Basic Instructions",
    cefrLevel: "A1",
    status: "Linguistic Review",
    irt: { diff: -2.5, disc: 0.9, guess: 0.33 },
    content: {
        passage: "[Audio: 'Please open your book and look at the picture.']",
        prompt: "What does the teacher want you to do?",
        options: [
            { text: "Close the door.", rationale: "Wrong action verb.", isCorrect: false },
            { text: "Open the book.", rationale: "Direct match to the audio instruction.", isCorrect: true },
            { text: "Draw a picture.", rationale: "Uses the word 'picture' from audio as a distractor.", isCorrect: false }
        ]
    }
  },
  {
    id: "PRM-1004",
    productLine: "Primary (7-10)",
    skill: "Speaking",
    subSkill: "Simple Descriptions",
    cefrLevel: "A2",
    status: "Published",
    irt: { diff: -1.0, disc: 1.0, guess: 0.0 },
    content: {
        passage: "[Image of a family eating breakfast]",
        prompt: "Look at the picture. Tell me three things you see.",
        rubric: "1 pt for each identifiable noun/action in English. Max 3 pts."
    },
    metrics: { facility: 0.65, ptBiserial: 0.45, exposure: 0.08 }
  },

  // ─── JUNIOR SUITE (11-14) ──────────────────────────────────────────────────
  {
    id: "JUN-2001",
    productLine: "Junior Suite (11-14)",
    skill: "Grammar",
    subSkill: "Past Continuous vs Past Simple",
    cefrLevel: "B1",
    status: "Published",
    irt: { diff: 0.2, disc: 1.4, guess: 0.25 },
    content: {
        prompt: "I __________ homework when the phone __________ rings.",
        options: [
            { text: "did / was ringing", rationale: "Reversed aspect rules.", isCorrect: false },
            { text: "was doing / rang", rationale: "Correct: interrupted continuous past action.", isCorrect: true },
            { text: "do / rang", rationale: "Tense mismatch in main clause.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.55, ptBiserial: 0.52, exposure: 0.09 }
  },
  {
    id: "JUN-2002",
    productLine: "Junior Suite (11-14)",
    skill: "Reading",
    subSkill: "Scanning for Specific Info",
    cefrLevel: "A2",
    status: "Published",
    irt: { diff: -0.5, disc: 1.1, guess: 0.25 },
    content: {
        passage: "Welcome to the Robotics Club! Meetings are on Tuesdays at 4:00 PM in Room 12. Only students from Grade 8 can join. Bring your own laptop.",
        prompt: "Who is allowed to join the club?",
        options: [
            { text: "Anyone with a laptop.", rationale: "Laptops are required, but not the only condition.", isCorrect: false },
            { text: "Grade 8 students.", rationale: "Explicitly stated restriction.", isCorrect: true },
            { text: "Students in Room 12.", rationale: "Confuses location with audience.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.68, ptBiserial: 0.38, exposure: 0.18 }
  },
  {
    id: "JUN-2003",
    productLine: "Junior Suite (11-14)",
    skill: "Writing",
    subSkill: "Informal Email",
    cefrLevel: "B1",
    status: "Psychometric Ready",
    irt: { diff: 0.5, disc: 1.3, guess: 0.0 },
    content: {
        prompt: "Write an email to your friend organizing a trip to the cinema this weekend. Suggest a film, a time to meet, and where outside the cinema you will wait. (50-80 words).",
        rubric: "Task achievement (all 3 points covered), Informal register, B1 syntax."
    }
  },
  {
    id: "JUN-2004",
    productLine: "Junior Suite (11-14)",
    skill: "Vocabulary",
    subSkill: "Phrasal Verbs (School Context)",
    cefrLevel: "B2",
    status: "Flagged",
    irt: { diff: 1.1, disc: 0.12, guess: 0.25 },
    content: {
        prompt: "If you don't understand the math problem, you should __________ the teacher.",
        options: [
            { text: "look out", rationale: "Incorrect meaning (warning).", isCorrect: false },
            { text: "ask out", rationale: "Incorrect meaning (dating). Highly selected distractor.", isCorrect: false },
            { text: "ask", rationale: "Correct, but no phrasal verb needed. Item is flawed.", isCorrect: true }
        ]
    },
    metrics: { facility: 0.22, ptBiserial: 0.12, exposure: 0.05 }
  },

  // ─── 15-MIN DIAGNOSTIC ─────────────────────────────────────────────────────
  {
    id: "DIAG-3001",
    productLine: "15-Min Diagnostic",
    skill: "Grammar",
    subSkill: "Conditionals (Mixed)",
    cefrLevel: "C1",
    status: "Published",
    irt: { diff: 2.1, disc: 1.9, guess: 0.25 },
    content: {
        prompt: "Had the company invested earlier, they __________ bankruptcy today.",
        options: [
            { text: "would not be facing", rationale: "Correct: Mixed conditional (past condition, present result).", isCorrect: true },
            { text: "will not face", rationale: "Incorrect tense sequence.", isCorrect: false },
            { text: "would not have faced", rationale: "Standard 3rd conditional, ignores 'today'.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.35, ptBiserial: 0.65, exposure: 0.14 } // High discrimination item
  },
  {
    id: "DIAG-3002",
    productLine: "15-Min Diagnostic",
    skill: "Vocabulary",
    subSkill: "Collocations",
    cefrLevel: "B2",
    status: "Published",
    irt: { diff: 0.8, disc: 1.7, guess: 0.25 },
    content: {
        prompt: "The government has decided to __________ severe restrictions on water usage.",
        options: [
            { text: "force", rationale: "Semantic fit, wrong collocation.", isCorrect: false },
            { text: "impose", rationale: "Correct standard collocation with restrictions.", isCorrect: true },
            { text: "apply", rationale: "Plausible but less idiomatic.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.48, ptBiserial: 0.58, exposure: 0.12 }
  },
  {
    id: "DIAG-3003",
    productLine: "15-Min Diagnostic",
    skill: "Reading",
    subSkill: "Inference",
    cefrLevel: "B1",
    status: "Published",
    irt: { diff: -0.1, disc: 1.5, guess: 0.25 },
    content: {
        passage: "Sarah looked at the dark clouds gathering over the hills. She sighed, put down her picnic basket, and reached for her umbrella instead.",
        prompt: "What can be inferred about Sarah's plans?",
        options: [
            { text: "She is going to the hills.", rationale: "Misreads location description.", isCorrect: false },
            { text: "She is cancelling her picnic.", rationale: "Logical inference from putting down the basket and taking an umbrella.", isCorrect: true },
            { text: "She hates rainy weather.", rationale: "Assumption not supported by text.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.62, ptBiserial: 0.50, exposure: 0.15 }
  },
  {
    id: "DIAG-3004",
    productLine: "15-Min Diagnostic",
    skill: "Grammar",
    subSkill: "Present Perfect",
    cefrLevel: "A2",
    status: "Published",
    irt: { diff: -1.2, disc: 1.3, guess: 0.25 },
    content: {
        prompt: "She __________ in London since 2015.",
        options: [
            { text: "lives", rationale: "Present simple, incorrectly pairs with 'since'.", isCorrect: false },
            { text: "has lived", rationale: "Correct aspect for unfinished period starting in past.", isCorrect: true },
            { text: "lived", rationale: "Past simple, implies she doesn't live there anymore.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.70, ptBiserial: 0.48, exposure: 0.11 }
  },

  // ─── ACADEMIA ──────────────────────────────────────────────────────────────
  {
    id: "ACA-4001",
    productLine: "Academia",
    skill: "Reading",
    subSkill: "Academic Argumentation",
    cefrLevel: "C1",
    status: "Published",
    irt: { diff: 1.9, disc: 1.6, guess: 0.25 },
    content: {
        passage: "While proponents of the neoclassical synthesis argue that market equilibria are inherently self-correcting via price flexibility, Keynesian heterodoxy objects that nominal wage stickiness systematically obstructs rapid full-employment recovery, demanding fiscal intervention.",
        prompt: "What is the primary Keynesian objection mentioned in the text?",
        options: [
            { text: "Markets perfectly self-correct through flexible prices.", rationale: "This is the neoclassical view, not the objection.", isCorrect: false },
            { text: "Wages do not adjust downward quickly enough to restore employment.", rationale: "Paraphrase of 'nominal wage stickiness systematically obstructs rapid full-employment recovery'.", isCorrect: true },
            { text: "Fiscal intervention causes wage stickiness.", rationale: "Inverts cause and effect; intervention is the solution, not the cause.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.38, ptBiserial: 0.61, exposure: 0.08 }
  },
  {
    id: "ACA-4002",
    productLine: "Academia",
    skill: "Listening",
    subSkill: "Lecture Comprehension (Pragmatics)",
    cefrLevel: "B2",
    status: "Age & Bias Review",
    irt: { diff: 1.2, disc: 1.4, guess: 0.33 },
    content: {
        passage: "[Audio: Professor says: 'Now, moving on to photosynthesis... well, actually, let's step back for a moment and verify we all grasp cellular respiration first.']",
        prompt: "Why does the professor change the topic?",
        options: [
            { text: "Because photosynthesis is too complex.", rationale: "Not stated in the utterance.", isCorrect: false },
            { text: "To ensure a foundational concept is understood before proceeding.", rationale: "Correct inference regarding verifying cellular respiration.", isCorrect: true },
            { text: "Because he forgot the notes on photosynthesis.", rationale: "No evidence of forgetting.", isCorrect: false }
        ]
    }
  },
  {
    id: "ACA-4003",
    productLine: "Academia",
    skill: "Writing",
    subSkill: "Data Synthesis (Task 1)",
    cefrLevel: "B2",
    status: "Draft",
    irt: { diff: 1.0, disc: 1.2, guess: 0.0 },
    content: {
        passage: "[Graph showing renewable energy adoption vs fossil fuel decline from 2000-2020]",
        prompt: "Summarise the main trends depicted in the graph, making comparisons where relevant. (150 words)",
        rubric: "Task achievement (key data points covered), Coherence & Cohesion, Lexical Resource (academic trends vocab), Grammatical Range."
    }
  },
  {
    id: "ACA-4004",
    productLine: "Academia",
    skill: "Vocabulary",
    subSkill: "Academic Word List (AWL)",
    cefrLevel: "C2",
    status: "Published",
    irt: { diff: 2.8, disc: 1.8, guess: 0.25 },
    content: {
        prompt: "The researcher's hypothesis was considered entirely __________ to the phenomenon under investigation, leading the peer-review panel to reject the paper.",
        options: [
            { text: "tangential", rationale: "Provides exact meaning of 'irrelevant/peripheral' fitting the extreme academic context.", isCorrect: true },
            { text: "intrinsic", rationale: "Opposite meaning (essential/inherent).", isCorrect: false },
            { text: "concurrent", rationale: "Means happening at the same time; mathematically wrong semantic link.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.25, ptBiserial: 0.68, exposure: 0.05 }
  },

  // ─── CORPORATE ─────────────────────────────────────────────────────────────
  {
    id: "CORP-5001",
    productLine: "Corporate",
    skill: "Reading",
    subSkill: "Business Memos (Polysemy)",
    cefrLevel: "B2",
    status: "Published",
    irt: { diff: 0.7, disc: 1.5, guess: 0.25 },
    content: {
        passage: "To all staff: Please be advised that the Q3 margins were significantly impacted by overhead attrition. We need to streamline our operational wings immediately. The board will float a new strategy on Monday.",
        prompt: "What does management intend to do according to the memo?",
        options: [
            { text: "Hire more staff for the operational wings.", rationale: "Contradicts 'streamline' (reduce/make efficient).", isCorrect: false },
            { text: "Make operational departments more efficient.", rationale: "Correct translation of corporate jargon 'streamline'.", isCorrect: true },
            { text: "Increase the overhead budget.", rationale: "Overhead attrition caused the problem; they won't increase it.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.52, ptBiserial: 0.55, exposure: 0.17 }
  },
  {
    id: "CORP-5002",
    productLine: "Corporate",
    skill: "Listening",
    subSkill: "Customer Service (Nuance)",
    cefrLevel: "B1",
    status: "Published",
    irt: { diff: 0.1, disc: 1.3, guess: 0.33 },
    content: {
        passage: "[Audio: Client says: 'I'm not exactly furious about the delay, but I'd appreciate it if someone could actually track the shipment rather than giving me automated replies.']",
        prompt: "What is the client's current attitude?",
        options: [
            { text: "Extremely angry and demanding a refund.", rationale: "Explicitly states 'not exactly furious'.", isCorrect: false },
            { text: "Frustrated by the lack of personalized assistance.", rationale: "Correct inference regarding 'automated replies'.", isCorrect: true },
            { text: "Satisfied but requesting a tracking number.", rationale: "Misses the negative nuance completely.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.62, ptBiserial: 0.44, exposure: 0.19 }
  },
  {
    id: "CORP-5003",
    productLine: "Corporate",
    skill: "Grammar",
    subSkill: "Indirect Directives (Polite register)",
    cefrLevel: "C1",
    status: "Pilot",
    irt: { diff: 1.6, disc: 1.5, guess: 0.25 },
    content: {
        prompt: "I was __________ if you could perhaps send the invoice by end of day?",
        options: [
            { text: "wondering", rationale: "Correct: standard C1 polite corporate hedging.", isCorrect: true },
            { text: "asking", rationale: "Too direct for the structure 'if you could perhaps'.", isCorrect: false },
            { text: "hoping", rationale: "Requires 'that', not 'if'.", isCorrect: false }
        ]
    }
  },
  {
    id: "CORP-5004",
    productLine: "Corporate",
    skill: "Speaking",
    subSkill: "Pitching & Negotiation",
    cefrLevel: "B2",
    status: "Published",
    irt: { diff: 1.1, disc: 1.2, guess: 0 },
    content: {
        prompt: "You are speaking to an enterprise client whose trial period ends tomorrow. They are hesitant about the price. Leave a 60-second voicemail highlighting two key ROI metrics and offering a 10% extension discount.",
        rubric: "Business Register, Persuasive Language, Fluency."
    },
    metrics: { facility: 0.45, ptBiserial: 0.48, exposure: 0.04 }
  },

  // ─── LANGUAGE SCHOOLS ──────────────────────────────────────────────────────
  {
    id: "LS-6001",
    productLine: "Language Schools",
    skill: "Grammar",
    subSkill: "Definite vs Zero Article",
    cefrLevel: "A2",
    status: "Flagged",
    irt: { diff: -0.8, disc: 0.15, guess: 0.25 },
    content: {
        prompt: "I love __________ music.",
        options: [
            { text: "the", rationale: "Refers to specific music, not general.", isCorrect: false },
            { text: "a", rationale: "Uncountable noun error.", isCorrect: false },
            { text: "-", rationale: "Zero article for general uncountable nouns.", isCorrect: true }
        ]
    },
    metrics: { facility: 0.25, ptBiserial: 0.12, exposure: 0.21 } // Flagged due to poor biserial
  },
  {
    id: "LS-6002",
    productLine: "Language Schools",
    skill: "Vocabulary",
    subSkill: "Adjective Modifiers",
    cefrLevel: "B1",
    status: "Published",
    irt: { diff: 0.3, disc: 1.4, guess: 0.25 },
    content: {
        prompt: "I was absolutely __________ when I heard the terrible news.",
        options: [
            { text: "sad", rationale: "Ungradable modifier 'absolutely' cannot pair with gradable 'sad'.", isCorrect: false },
            { text: "devastated", rationale: "Correct: Extreme adjective matching extreme modifier.", isCorrect: true },
            { text: "upset", rationale: "Gradable adjective.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.58, ptBiserial: 0.46, exposure: 0.11 }
  },
  {
    id: "LS-6003",
    productLine: "Language Schools",
    skill: "Listening",
    subSkill: "Detail Extraction (Dates/Numbers)",
    cefrLevel: "A1",
    status: "Published",
    irt: { diff: -1.9, disc: 1.0, guess: 0.33 },
    content: {
        passage: "[Audio: 'The train to Manchester leaves at a quarter to four from platform 9.']",
        prompt: "What time does the train leave?",
        options: [
            { text: "4:15", rationale: "Confuses 'quarter to' with 'quarter past'.", isCorrect: false },
            { text: "3:45", rationale: "Correct translation of 'quarter to four'.", isCorrect: true },
            { text: "4:45", rationale: "Misses the base hour.", isCorrect: false }
        ]
    },
    metrics: { facility: 0.78, ptBiserial: 0.36, exposure: 0.18 }
  },
  {
    id: "LS-6004",
    productLine: "Language Schools",
    skill: "Reading",
    subSkill: "Author Intention",
    cefrLevel: "C2",
    status: "Psychometric Ready",
    irt: { diff: 2.9, disc: 1.7, guess: 0.25 },
    content: {
        passage: "To dismiss the mayor's infrastructural overhaul as a mere vanity project is to tragically conflate political expediency with what was, in truth, an inescapable municipal imperative.",
        prompt: "What is the author's stance on the mayor's infrastructural overhaul?",
        options: [
            { text: "It was a politically motivated vanity project.", rationale: "Picks up distractors in the text directly.", isCorrect: false },
            { text: "It was a necessary action for the city.", rationale: "Correct interpretation of 'inescapable municipal imperative'.", isCorrect: true },
            { text: "It was handled poorly despite being necessary.", rationale: "Invents critique not present in text.", isCorrect: false }
        ]
    }
  }
];