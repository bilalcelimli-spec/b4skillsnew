/**
 * SPEAKING — Phase 1: Foundation (A2 – C2)
 * 70 SPEAKING_PROMPT items scored 0–10 by Gemini AI (GRM model)
 *
 * Speaking prompt format:
 *   content.prompt          — Task instruction (shown to candidate)
 *   content.taskType        — monologue | dialogue | description | discussion | presentation | roleplay
 *   content.prepTime        — seconds (0 = no prep)
 *   content.responseTime    — max seconds for recording
 *   content.cefrDescriptor  — One-sentence CEFR descriptor
 *   content.scoringRubric   — 5 criteria
 *   content.sampleBullets   — Key points a strong response should cover (for rater guidance)
 *   content.productLine
 *
 * GRM scoring: 0–10 scale; score converted to theta via logistic link (see graded-response-model.ts)
 *
 * Seeding:
 *   npx tsx scripts/seed-speaking-phase1.ts
 *   DRY_RUN=1 npx tsx scripts/seed-speaking-phase1.ts
 *   FORCE=1 npx tsx scripts/seed-speaking-phase1.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { validateItemBatch, reportValidationResults } from './_validation-helper.js';

const prisma = new PrismaClient();
const SEED_TAG = "seed-speaking-phase1";

const RUBRIC = {
  A2: [
    { name: "Task Achievement",    maxScore: 2, descriptor: "Responds to simple prompts on familiar topics." },
    { name: "Grammar & Accuracy",  maxScore: 2, descriptor: "Uses simple structures; errors may be frequent but communication is possible." },
    { name: "Vocabulary",          maxScore: 2, descriptor: "Limited but adequate repertoire for basic interactions." },
    { name: "Fluency",             maxScore: 2, descriptor: "Can produce short utterances with pauses for planning." },
    { name: "Pronunciation",       maxScore: 2, descriptor: "Generally comprehensible; accent may require some effort to understand." },
  ],
  B1: [
    { name: "Task Achievement",    maxScore: 2, descriptor: "Maintains interaction on familiar topics; can express main points." },
    { name: "Grammar & Accuracy",  maxScore: 2, descriptor: "Sufficient accuracy to convey meaning; some errors in complex structures." },
    { name: "Vocabulary",          maxScore: 2, descriptor: "Sufficient vocabulary for most everyday topics." },
    { name: "Fluency",             maxScore: 2, descriptor: "Produces stretches of language with occasional hesitation." },
    { name: "Pronunciation",       maxScore: 2, descriptor: "Clearly intelligible despite a noticeable accent." },
  ],
  B2: [
    { name: "Task Achievement",    maxScore: 2, descriptor: "Develops arguments and opinions clearly; handles unexpected questions." },
    { name: "Grammar & Accuracy",  maxScore: 2, descriptor: "Good grammatical control; errors rare and non-impeding." },
    { name: "Vocabulary",          maxScore: 2, descriptor: "Good range; can vary formulations to express ideas." },
    { name: "Fluency",             maxScore: 2, descriptor: "Relatively smooth delivery; only occasional hesitation." },
    { name: "Pronunciation",       maxScore: 2, descriptor: "Clear pronunciation; accent does not impede communication." },
  ],
  C1: [
    { name: "Task Achievement",    maxScore: 2, descriptor: "Presents complex ideas fluently and precisely." },
    { name: "Grammar & Accuracy",  maxScore: 2, descriptor: "Consistently high accuracy; minor slips self-corrected." },
    { name: "Vocabulary",          maxScore: 2, descriptor: "Wide, precise vocabulary including idiomatic expressions." },
    { name: "Fluency",             maxScore: 2, descriptor: "Fluent, spontaneous delivery with natural rhythm." },
    { name: "Pronunciation",       maxScore: 2, descriptor: "Natural, effortless articulation; entirely clear to any listener." },
  ],
  C2: [
    { name: "Task Achievement",    maxScore: 2, descriptor: "Expresses ideas with precision, nuance and sophistication." },
    { name: "Grammar & Accuracy",  maxScore: 2, descriptor: "Maintains full grammatical control at all times." },
    { name: "Vocabulary",          maxScore: 2, descriptor: "Masterful, near-native lexical range." },
    { name: "Fluency",             maxScore: 2, descriptor: "Effortless, entirely natural flow." },
    { name: "Pronunciation",       maxScore: 2, descriptor: "Native-like prosody and articulation." },
  ],
};

const items = [
  // ════════════════════════════════════════════
  // A2 — 10 items
  // ════════════════════════════════════════════
  {
    cefrLevel: "A2", difficulty: -1.2, discrimination: 1.0,
    tags: ["speaking", "a2", "monologue", "personal", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 30, responseTime: 60, productLine: "Primary (7-10)",
      cefrDescriptor: "Can describe people and places in simple terms.",
      prompt: "Talk about your best friend. Tell me:\n• What their name is and how old they are\n• What they look like\n• What you like doing together",
      scoringRubric: RUBRIC.A2,
      sampleBullets: ["States friend's name", "Gives basic physical description", "Mentions at least one shared activity", "Uses present simple correctly"],
    },
  },
  {
    cefrLevel: "A2", difficulty: -1.1, discrimination: 1.0,
    tags: ["speaking", "a2", "monologue", "daily-routine", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 30, responseTime: 60, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can describe everyday routines using basic connectors.",
      prompt: "Describe your typical school day. Talk about:\n• What time you wake up and have breakfast\n• What lessons you have\n• What you do after school",
      scoringRubric: RUBRIC.A2,
      sampleBullets: ["Mentions times", "Lists 2+ subjects", "Describes after-school activity", "Uses sequencing words: first, then, after"],
    },
  },
  {
    cefrLevel: "A2", difficulty: -1.0, discrimination: 1.0,
    tags: ["speaking", "a2", "description", "place", "language-schools", SEED_TAG],
    content: {
      taskType: "description", prepTime: 30, responseTime: 75, productLine: "Language Schools",
      cefrDescriptor: "Can describe a place using basic spatial language.",
      prompt: "Describe your home to someone who has never visited. Include:\n• How many rooms there are and what they are\n• Your favourite room and why\n• Something special or unusual about your home",
      scoringRubric: RUBRIC.A2,
      sampleBullets: ["Names and numbers rooms", "Describes favourite room with reason", "Uses prepositions of place (in, on, next to)", "Gives at least one personal detail"],
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.9, discrimination: 1.0,
    tags: ["speaking", "a2", "monologue", "food-culture", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 30, responseTime: 75, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can express likes/dislikes and describe familiar topics.",
      prompt: "Talk about your favourite food or meal. Include:\n• What the food is and where it comes from\n• When you eat it\n• Why you like it",
      scoringRubric: RUBRIC.A2,
      sampleBullets: ["Identifies the food", "Gives origin or context", "Uses 'because' to explain preference", "Uses present simple"],
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.8, discrimination: 1.0,
    tags: ["speaking", "a2", "roleplay", "shopping", "language-schools", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 30, responseTime: 90, productLine: "Language Schools",
      cefrDescriptor: "Can handle simple transactional exchanges.",
      prompt: "Role play: You are in a shop. You want to buy a present for a friend. The examiner is the shop assistant.\n• Say what kind of present you are looking for\n• Ask about the price\n• Decide whether to buy it and explain your choice",
      scoringRubric: RUBRIC.A2,
      sampleBullets: ["Opens interaction politely", "Describes what they want", "Asks price correctly", "Makes a decision with brief reason"],
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.7, discrimination: 1.0,
    tags: ["speaking", "a2", "monologue", "past-event", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 30, responseTime: 90, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can narrate past events using simple past tense.",
      prompt: "Tell me about a holiday or trip you enjoyed. Include:\n• Where you went and who you went with\n• One thing you did that you enjoyed\n• One thing that was difficult or surprising",
      scoringRubric: RUBRIC.A2,
      sampleBullets: ["Uses past tense consistently", "Names place and people", "Describes at least one positive event", "Mentions contrast (difficult/surprising)"],
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.6, discrimination: 1.0,
    tags: ["speaking", "a2", "opinion", "technology", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 30, responseTime: 90, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can give simple opinions on familiar topics.",
      prompt: "Do you think it is good or bad for children to have smartphones? Give your opinion and two reasons.",
      scoringRubric: RUBRIC.A2,
      sampleBullets: ["States clear opinion", "Gives first reason with connector (because/so)", "Gives second reason", "Uses basic modal (can/can't/should)"],
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.5, discrimination: 1.0,
    tags: ["speaking", "a2", "comparison", "leisure", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 30, responseTime: 90, productLine: "Language Schools",
      cefrDescriptor: "Can make simple comparisons using comparative adjectives.",
      prompt: "Compare watching films at home with going to the cinema. Which do you prefer and why?",
      scoringRubric: RUBRIC.A2,
      sampleBullets: ["Uses comparative (better/more comfortable/bigger)", "Gives one advantage of each", "States preference with reason", "Uses 'but' or 'however' for contrast"],
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.4, discrimination: 1.0,
    tags: ["speaking", "a2", "description", "photo", "language-schools", SEED_TAG],
    content: {
      taskType: "description", prepTime: 45, responseTime: 90, productLine: "Language Schools",
      cefrDescriptor: "Can describe what they see in an image using basic structures.",
      prompt: "You will see a photo of a busy market scene. Describe what you can see:\n• What is in the photo (people, objects, place)\n• What people are doing\n• What you think about the atmosphere",
      scoringRubric: RUBRIC.A2,
      sampleBullets: ["Describes at least 3 elements", "Uses present continuous (are selling/are walking)", "Comments on atmosphere with adjective", "No significant gaps in the description"],
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.3, discrimination: 1.1,
    tags: ["speaking", "a2", "future-plans", "aspirations", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 30, responseTime: 90, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can talk about future intentions using 'going to'.",
      prompt: "What are your plans for after you finish school? Talk about:\n• What you would like to study or do for work\n• Where you would like to live\n• One dream or goal for the future",
      scoringRubric: RUBRIC.A2,
      sampleBullets: ["Uses 'going to' or 'would like to'", "Mentions study/work aspiration", "Names a place", "Expresses a personal goal"],
    },
  },

  // ════════════════════════════════════════════
  // B1 — 15 items
  // ════════════════════════════════════════════
  {
    cefrLevel: "B1", difficulty: -0.5, discrimination: 1.2,
    tags: ["speaking", "b1", "monologue", "opinion", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 120, productLine: "Language Schools",
      cefrDescriptor: "Can give an extended opinion on a familiar topic with reasons and examples.",
      prompt: "Do you think people today have too much stress in their lives? Talk about:\n• Whether you agree or disagree\n• Two causes of stress in modern life\n• One thing people can do to manage stress better",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["States position clearly", "Identifies two distinct causes (work/social media/etc.)", "Proposes a practical stress-reduction strategy", "Uses hedging (I think/I believe/it seems)"],
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.4, discrimination: 1.2,
    tags: ["speaking", "b1", "discussion", "environment", "junior", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 120, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can maintain a conversation on topics of interest expressing and supporting opinions.",
      prompt: "Discuss with the examiner: How much should schools do to teach students about environmental issues? Include:\n• Whether you think schools currently do enough\n• Two specific actions schools could take\n• Whether individuals or governments are more responsible for environmental problems",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Evaluates current school role", "Proposes 2 specific actions", "Discusses individual vs. collective responsibility", "Asks or responds to examiner's question"],
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.3, discrimination: 1.2,
    tags: ["speaking", "b1", "narrative", "personal", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 120, productLine: "Language Schools",
      cefrDescriptor: "Can narrate past events in detail with some narrative organisation.",
      prompt: "Tell me about a time when you had to deal with a challenge or difficulty (at school, at home, or in a hobby). Include:\n• What the challenge was\n• How you dealt with it\n• What you learned from the experience",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Clear narrative structure (past simple/continuous)", "Describes the problem specifically", "Explains coping strategy", "Reflects on lesson learned (past perfect or conditional useful)"],
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.2, discrimination: 1.2,
    tags: ["speaking", "b1", "description", "photo-comparison", "language-schools", SEED_TAG],
    content: {
      taskType: "description", prepTime: 60, responseTime: 120, productLine: "Language Schools",
      cefrDescriptor: "Can compare and contrast situations or images in some detail.",
      prompt: "You have two photos: one shows children playing outdoors; the other shows children playing video games at home. Compare the two photos and discuss:\n• What is similar and different about the two activities\n• What are the benefits of each?\n• Which environment do you think is better for children and why?",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Describes both photos briefly", "Uses comparative language (whereas/while/both)", "Identifies advantage of each", "Gives reasoned preference"],
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.1, discrimination: 1.2,
    tags: ["speaking", "b1", "roleplay", "hotel", "language-schools", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 60, responseTime: 120, productLine: "Language Schools",
      cefrDescriptor: "Can deal with most transactions when visiting a service provider.",
      prompt: "Role play: You are staying in a hotel. There are problems with your room (e.g., broken air conditioning, no hot water). The examiner is the hotel receptionist.\n• Explain the problems clearly\n• Ask for a solution\n• Negotiate if the first solution is not satisfactory",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Opens politely and identifies problems", "Uses 'could you/would it be possible'", "Reacts to receptionist's response", "Reaches a reasonable resolution"],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.0, discrimination: 1.2,
    tags: ["speaking", "b1", "opinion", "lifestyle", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 120, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can develop and express opinions on abstract topics.",
      prompt: "Some people say that learning a musical instrument should be compulsory in schools. Do you agree or disagree? Give at least three reasons for your view.",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["States clear position", "Gives 3 distinct reasons", "Uses connectors (furthermore/however/on the other hand)", "Maintains consistent position throughout"],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.1, discrimination: 1.2,
    tags: ["speaking", "b1", "presentation", "place", "language-schools", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 90, responseTime: 150, productLine: "Language Schools",
      cefrDescriptor: "Can give a short prepared presentation on a familiar topic.",
      prompt: "Give a short talk (1.5–2 minutes) recommending a place in your country or region to a foreign visitor. Cover:\n• The location and how to get there\n• The main attractions\n• The best time of year to visit and why",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Has clear structure (intro/main/conclusion)", "Gives practical visitor information", "Describes at least 2 attractions", "Recommends seasonal timing with reason"],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.2, discrimination: 1.2,
    tags: ["speaking", "b1", "discussion", "society", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 120, productLine: "Academia",
      cefrDescriptor: "Can discuss topical issues, expressing and defending opinions.",
      prompt: "Discuss with the examiner: Do you think it is a good idea for young people to take a gap year before university? Include your own view and respond to the examiner's opinions.",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["States own view clearly", "Responds to examiner's counterpoint", "Uses hedging (it depends/on the other hand)", "Gives concrete example"],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.25, discrimination: 1.2,
    tags: ["speaking", "b1", "monologue", "work-study", "corporate", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 120, productLine: "Corporate",
      cefrDescriptor: "Can describe professional experiences and express opinions on work-related topics.",
      prompt: "Describe your ideal work environment. Include:\n• Whether you prefer working alone or in a team\n• What kind of tasks you enjoy most\n• What is more important to you — salary or job satisfaction?",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Clearly describes work environment preference", "Explains what tasks they enjoy", "Gives reasoned view on salary vs satisfaction", "Uses 'I prefer' / 'I find it'"],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.3, discrimination: 1.2,
    tags: ["speaking", "b1", "problem-solving", "collaborative", "language-schools", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 120, productLine: "Language Schools",
      cefrDescriptor: "Can collaborate to solve a problem expressing agreement and polite disagreement.",
      prompt: "You and the examiner are organising an end-of-year school trip for 30 students (aged 14-15) with a budget of €1,500. Discuss and decide:\n• Type of trip (cultural, outdoor, etc.)\n• Where to go and how to get there\n• One main activity",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Makes suggestions using 'could/why don't we'", "Responds to examiner's suggestions", "Reaches a decision collaboratively", "Considers budget constraint"],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.35, discrimination: 1.2,
    tags: ["speaking", "b1", "opinion", "media-technology", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 120, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can express and develop opinions on media and technology.",
      prompt: "Do you think the internet has made our lives better or worse overall? Give a balanced answer and reach your own conclusion.",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Acknowledges both sides", "Uses discourse markers (on one hand/on the other/however)", "Reaches a clear personal conclusion", "Uses present perfect for general facts"],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.4, discrimination: 1.2,
    tags: ["speaking", "b1", "roleplay", "negotiation", "corporate", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 60, responseTime: 120, productLine: "Corporate",
      cefrDescriptor: "Can handle professional transactional exchanges with appropriate register.",
      prompt: "Role play: You are a new employee who wants to attend a training course next month, but your manager (the examiner) is concerned about the cost and your workload.\n• Explain why the course is important\n• Suggest a compromise\n• Respond to the manager's concerns",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Uses polite professional register", "Argues the case with reasons", "Proposes a compromise", "Handles objections without conflict"],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.45, discrimination: 1.2,
    tags: ["speaking", "b1", "narrative", "hypothetical", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 120, productLine: "Language Schools",
      cefrDescriptor: "Can talk about hypothetical situations and speculate.",
      prompt: "Imagine you won €10,000. What would you do with the money? Give details and explain your choices.",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Uses 'would' consistently", "Makes at least 2 distinct choices", "Explains motivations", "Shows awareness of hypothetical frame"],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.5, discrimination: 1.2,
    tags: ["speaking", "b1", "opinion", "culture-tradition", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 120, productLine: "Language Schools",
      cefrDescriptor: "Can discuss cultural customs and express views with supporting examples.",
      prompt: "In many countries, traditional customs and festivals are becoming less important to young people. Why do you think this is happening? Is it a problem?",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Gives 2 reasons for decline", "Evaluates whether it is a problem", "Uses present simple + present continuous contrast", "Refers to own cultural context"],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.5, discrimination: 1.2,
    tags: ["speaking", "b1", "presentation", "topic", "academia", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 90, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can give a structured 2-minute presentation on a topic of general interest.",
      prompt: "Give a 2-minute talk on ONE of the following topics. Choose ONE:\n1. The benefits of learning a second language\n2. How cities can become more sustainable\n3. The role of art and music in education",
      scoringRubric: RUBRIC.B1,
      sampleBullets: ["Clear introduction (states topic and structure)", "Covers 3 points", "Provides examples for at least 2 points", "Concludes clearly"],
    },
  },

  // ════════════════════════════════════════════
  // B2 — 15 items
  // ════════════════════════════════════════════
  {
    cefrLevel: "B2", difficulty: 0.4, discrimination: 1.3,
    tags: ["speaking", "b2", "discussion", "society", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can take an active part in discussion in familiar contexts, accounting for and sustaining views.",
      prompt: "Discuss with the examiner: 'Universities should teach all students practical life skills (cooking, finance, mental health) alongside academic subjects.' Do you agree? Defend your view and challenge the examiner's counterpoints.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["States and defends clear position", "Challenges examiner's view politely", "Uses discourse markers (I take your point / nevertheless / having said that)", "Acknowledges complexity"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.5, discrimination: 1.3,
    tags: ["speaking", "b2", "presentation", "professional", "corporate", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 90, responseTime: 180, productLine: "Corporate",
      cefrDescriptor: "Can present a clear, detailed case to a professional audience.",
      prompt: "You are presenting to your team at work. Present a proposal for improving team communication (e.g., fewer meetings, a new messaging tool, clearer email guidelines). Include:\n• The problem you have identified\n• Your proposed solution\n• Expected benefits and one potential challenge",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Identifies a specific problem with evidence", "Proposes a concrete solution", "Lists measurable benefits", "Acknowledges and responds to one challenge"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.6, discrimination: 1.3,
    tags: ["speaking", "b2", "argument", "ethics", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can develop a clear argument on a complex topic, holding their own in discussion.",
      prompt: "'Animals should have the same legal rights as humans.' Discuss this proposition with the examiner. Present your view, respond to counterarguments, and reach a conclusion.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Qualifies the proposition thoughtfully", "Distinguishes different types of rights", "Responds to at least one counterargument", "Reaches a nuanced conclusion"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.65, discrimination: 1.3,
    tags: ["speaking", "b2", "monologue", "cause-effect", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 150, productLine: "Language Schools",
      cefrDescriptor: "Can explain complex issues with cause-effect reasoning.",
      prompt: "Why do you think mental health problems are increasingly common among young people today? What could be done to address this? Give a detailed response with specific reasons and solutions.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Identifies 3 distinct causes", "Uses cause-effect language (consequently/as a result/this leads to)", "Proposes at least 2 solutions", "Maintains coherent argument throughout"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.7, discrimination: 1.3,
    tags: ["speaking", "b2", "description", "data", "corporate", SEED_TAG],
    content: {
      taskType: "description", prepTime: 60, responseTime: 150, productLine: "Corporate",
      cefrDescriptor: "Can describe and interpret data, trends and implications.",
      prompt: "You are presenting data to colleagues. A graph shows that your company's customer satisfaction scores fell sharply in Q2, then recovered partially in Q3. Describe the trend, suggest possible reasons, and recommend one action.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Accurately describes trend (fell sharply / partially recovered)", "Uses appropriate graph language (peak/decline/recovery)", "Proposes 2 plausible reasons", "Makes a specific recommendation"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.75, discrimination: 1.3,
    tags: ["speaking", "b2", "interview-style", "hypothetical", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can engage in extended interview-style discussions with well-developed responses.",
      prompt: "Imagine you are being interviewed for a university place. Answer the following questions:\n1. Why have you chosen this subject?\n2. What is the biggest challenge facing this field today?\n3. How have your experiences so far prepared you for university study?",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Gives substantive answer to each question", "Demonstrates knowledge of the field", "Links personal experience to future plans", "Speaks with appropriate formality"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.8, discrimination: 1.3,
    tags: ["speaking", "b2", "debate", "globalisation", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can hold a structured debate, developing and defending positions with sophistication.",
      prompt: "Debate with the examiner: 'English should become the world's only official language for international business and science.' Take a position and defend it, responding to the examiner's challenges.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Takes and maintains a clear position", "Uses data or examples as evidence", "Concedes minor points while holding main view", "Uses hedging and concession language appropriately"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.85, discrimination: 1.3,
    tags: ["speaking", "b2", "presentation", "cultural", "language-schools", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 90, responseTime: 180, productLine: "Language Schools",
      cefrDescriptor: "Can deliver a fluent, structured presentation with clear evidence and conclusion.",
      prompt: "Give a 2-minute presentation on: 'The most significant cultural change in your country in the last 20 years'. Include:\n• What has changed\n• Why it happened\n• Whether it has been positive or negative overall",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Identifies specific, significant change", "Explains 2 causes", "Evaluates impact with evidence or example", "Delivers clear conclusion"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.9, discrimination: 1.3,
    tags: ["speaking", "b2", "speculative", "future", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can speculate about future developments with sophisticated language.",
      prompt: "How do you think artificial intelligence will change education over the next 20 years? Consider both positive and negative developments and give your own prediction.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Uses future forms (will/might/could/is likely to)", "Identifies 2+ specific educational changes", "Acknowledges both benefits and risks", "Gives a reasoned personal prediction"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.95, discrimination: 1.3,
    tags: ["speaking", "b2", "problem-solving", "corporate", "professional", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 60, responseTime: 150, productLine: "Corporate",
      cefrDescriptor: "Can handle professionally complex situations requiring persuasion.",
      prompt: "Role play: You manage a small team. One of your best employees has told you they want to leave because they have received a better offer elsewhere. The examiner is the employee. You want to persuade them to stay by negotiating better terms.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Opens professionally and empathetically", "Explores employee's motivations", "Makes a concrete counter-offer", "Handles resistance without confrontation"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.0, discrimination: 1.3,
    tags: ["speaking", "b2", "discussion", "media", "language-schools", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Language Schools",
      cefrDescriptor: "Can discuss complex media and society topics fluently.",
      prompt: "Discuss with the examiner: Is the rise of citizen journalism (ordinary people reporting news via social media) a positive or negative development for society? Defend your view.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Acknowledges pros and cons of citizen journalism", "Distinguishes it from professional journalism", "Defends overall verdict with evidence", "Engages substantively with examiner's questions"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.05, discrimination: 1.3,
    tags: ["speaking", "b2", "presentation", "economics", "corporate", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 90, responseTime: 180, productLine: "Corporate",
      cefrDescriptor: "Can present a business case fluently with appropriate professional register.",
      prompt: "Present a short business case for expanding your company's operations into a new international market of your choice. Include:\n• Why this market is attractive\n• The main risks\n• Your recommendation",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Identifies market with data/rationale", "Names 2 specific risks", "Makes clear recommendation", "Uses appropriate business vocabulary (ROI/market share/etc.)"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.1, discrimination: 1.3,
    tags: ["speaking", "b2", "argument", "philosophy", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can discuss philosophical and ethical questions with developed reasoning.",
      prompt: "Discuss with the examiner: 'It is better to be honest and unpopular than popular but dishonest.' Explore the philosophical dimensions of this statement from multiple perspectives.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Defines key terms (honesty/popularity)", "Explores different contexts (personal/professional)", "Considers exceptions to the principle", "Reaches a philosophically coherent conclusion"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.15, discrimination: 1.3,
    tags: ["speaking", "b2", "description", "abstract-concept", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can explain abstract concepts clearly with supporting examples.",
      prompt: "Explain the concept of 'resilience' as applied to individuals. Why is it important, and can it be taught or developed? Give examples from your own experience or knowledge.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Defines resilience clearly", "Explains its importance with a reason", "Takes a position on teachability with justification", "Provides a concrete example"],
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.2, discrimination: 1.3,
    tags: ["speaking", "b2", "monologue", "social-change", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 150, productLine: "Language Schools",
      cefrDescriptor: "Can give a fluent, structured monologue on a complex social topic.",
      prompt: "To what extent do you think social media has changed what it means to be a community? Has it strengthened or weakened communities? Give a balanced, developed answer.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: ["Defines community", "Argues both strengthening and weakening effects", "Uses sophisticated connectors (conversely/in contrast/nevertheless)", "Reaches a nuanced conclusion"],
    },
  },

  // ════════════════════════════════════════════
  // C1 — 15 items
  // ════════════════════════════════════════════
  {
    cefrLevel: "C1", difficulty: 1.0, discrimination: 1.4,
    tags: ["speaking", "c1", "discussion", "law-ethics", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can express ideas fluently and spontaneously; discuss complex subjects with precision.",
      prompt: "Discuss with the examiner: 'The rule of law is the most important foundation of a democratic society.' Engage critically with this proposition, consider counterarguments, and reach a nuanced conclusion.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Interprets the proposition carefully", "Identifies at least 2 alternative foundations (e.g., free press/civil society)", "Acknowledges comparative strengths", "Demonstrates sophisticated use of hedging and qualifying language"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.1, discrimination: 1.4,
    tags: ["speaking", "c1", "presentation", "complex-topic", "academia", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 90, responseTime: 210, productLine: "Academia",
      cefrDescriptor: "Can present complex information clearly and effectively.",
      prompt: "Give a 3-minute academic presentation on the following: 'Has the digital revolution made democracy stronger or weaker?' Structure your argument with evidence, and invite one question at the end.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Has academic register throughout", "Presents structured argument with 3 points", "Uses evidence (research/statistics/examples)", "Handles Q&A naturally"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.2, discrimination: 1.4,
    tags: ["speaking", "c1", "monologue", "philosophy", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can develop complex lines of argument fluently.",
      prompt: "In your view, is it possible to be truly objective when writing history? Develop a substantive response drawing on what you know about historiography and the nature of evidence.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Defines objectivity in historical context", "References philosophical/historiographical concepts", "Discusses limitations of objectivity", "Reaches a measured, nuanced conclusion"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.3, discrimination: 1.4,
    tags: ["speaking", "c1", "discussion", "economics", "corporate", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 180, productLine: "Corporate",
      cefrDescriptor: "Can participate fluently in discussions on complex economic and social issues.",
      prompt: "Discuss with the examiner: 'Economic inequality is inevitable in a market economy and should be managed rather than eliminated.' Defend your view and respond to challenges.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Distinguishes inequality of opportunity from outcome", "Uses economic concepts fluently", "Engages with examiner's challenges substantively", "Sophisticated discourse markers (I grant you that / notwithstanding / it bears noting)"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.4, discrimination: 1.4,
    tags: ["speaking", "c1", "presentation", "research", "academia", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 90, responseTime: 210, productLine: "Academia",
      cefrDescriptor: "Can present and defend a well-developed position on a research topic.",
      prompt: "Present a 3-minute summary of a piece of research or a book that has significantly influenced your thinking. Explain:\n• What the core argument is\n• What evidence it uses\n• Why you found it compelling or flawed",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Clearly summarises core argument", "Explains evidentiary basis", "Critically evaluates strengths/weaknesses", "Uses academic vocabulary precisely"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.5, discrimination: 1.4,
    tags: ["speaking", "c1", "monologue", "ethics-technology", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can speak with facility about complex, abstract and professional topics.",
      prompt: "Should the development of advanced artificial general intelligence (AGI) be subject to an international moratorium? Develop a nuanced response considering technical, ethical and geopolitical dimensions.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Explains what AGI is and why it is distinct from current AI", "Addresses each of the three dimensions (technical/ethical/geopolitical)", "Considers both sides before concluding", "Uses sophisticated epistemic language (it is debatable whether/it could be argued/there is a compelling case for)"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.6, discrimination: 1.4,
    tags: ["speaking", "c1", "roleplay", "negotiation", "corporate", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 60, responseTime: 180, productLine: "Corporate",
      cefrDescriptor: "Can conduct negotiations in professional contexts with precision.",
      prompt: "Role play: You represent a tech company in a partnership negotiation with a large retail chain (the examiner). Your objective is to agree a 3-year exclusive distribution contract with favourable commission terms. The retailer wants a short-term pilot contract first.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Opens with strategic framing", "Identifies interests vs. positions (separates commitment from trial)", "Proposes creative compromise", "Uses diplomatic language under pressure"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.7, discrimination: 1.5,
    tags: ["speaking", "c1", "discussion", "cultural", "language-schools", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 180, productLine: "Language Schools",
      cefrDescriptor: "Can engage in sophisticated cultural discussions with nuanced expression.",
      prompt: "Discuss with the examiner: 'Translation is always an act of betrayal — something fundamental is always lost.' Do you agree? Engage with the implications for literature, diplomacy and cross-cultural understanding.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Engages with the metaphor ('traduttore, traditore')", "Considers literary vs. functional translation", "Discusses implications for international communication", "Reaches a qualified, nuanced verdict"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.75, discrimination: 1.5,
    tags: ["speaking", "c1", "monologue", "sciences", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can discuss scientific and research topics with appropriate precision.",
      prompt: "What are the most significant ethical challenges facing biomedical research today? Identify three distinct challenges and assess how the research community should respond.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Names three distinct ethical challenges (e.g., informed consent/genetic privacy/dual-use research)", "Assesses institutional vs. individual responsibility", "Proposes specific governance responses", "Demonstrates familiarity with bioethics concepts"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.8, discrimination: 1.5,
    tags: ["speaking", "c1", "presentation", "global-issue", "academia", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 90, responseTime: 210, productLine: "Academia",
      cefrDescriptor: "Can deliver a fluent, precise presentation on global issues.",
      prompt: "Give a 3-minute structured presentation on: 'The most underreported environmental crisis of the 21st century and what should be done about it.' Support your choice with evidence and conclude with a policy recommendation.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Identifies a specific, well-reasoned issue", "Explains why it is underreported", "Marshals evidence (statistics/expert opinion/case study)", "Makes a feasible, specific policy recommendation"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.9, discrimination: 1.5,
    tags: ["speaking", "c1", "discussion", "politics", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can discuss complex political ideas with sophistication.",
      prompt: "Discuss with the examiner: 'Populism is a symptom of democracy's failures rather than a threat to democracy.' Unpack this proposition critically.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Defines populism carefully", "Distinguishes symptom vs. threat framing", "Uses historical examples", "Engages examiner's counterpoints with precision"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.95, discrimination: 1.5,
    tags: ["speaking", "c1", "monologue", "language-identity", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can articulate complex ideas about identity and language with sophistication.",
      prompt: "Explore the proposition: 'The language you speak shapes the way you think.' What is the evidence for and against linguistic relativity (the Sapir-Whorf hypothesis), and what does it mean for multilingual individuals?",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Accurately explains the Sapir-Whorf hypothesis (strong vs. weak versions)", "References supporting evidence (colour perception/spatial cognition)", "Discusses counterevidence or limitations", "Reflects on multilingual cognitive experience"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 2.0, discrimination: 1.5,
    tags: ["speaking", "c1", "debate", "economics-ethics", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can defend complex positions under sustained challenge with precision.",
      prompt: "Debate with the examiner: 'Capitalism is inherently incompatible with environmental sustainability.' Defend a position and respond to the examiner's sustained counterarguments.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Frames the core tension between growth imperative and ecological limits", "Considers green capitalism arguments", "Holds position under challenge without capitulating without reason", "Uses conceptually precise vocabulary (externalities/discount rate/steady-state economy)"],
    },
  },
  {
    cefrLevel: "C1", difficulty: 2.0, discrimination: 1.5,
    tags: ["speaking", "c1", "roleplay", "crisis-comms", "corporate", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 90, responseTime: 210, productLine: "Corporate",
      cefrDescriptor: "Can handle complex professional scenarios requiring diplomacy and precision.",
      prompt: "Role play: You are the Communications Director of a major company. A data breach affecting 2 million customers has just been disclosed. You are facing a press conference (the examiner is the senior journalist). Handle:\n• Opening statement explaining what happened\n• Questions about the company's responsibility\n• Questions about what will be done",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Delivers composed, transparent opening statement", "Acknowledges responsibility proportionately", "Provides concrete action commitments", "Maintains professional tone under hostile questions"],
    },
  },

  {
    cefrLevel: "C1", difficulty: 2.0, discrimination: 1.5,
    tags: ["speaking", "c1", "monologue", "sociology", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can discuss sociological concepts fluently and with precision.",
      prompt: "In sociology, the concept of 'social capital' refers to the value derived from social networks and relationships. To what extent do you think digital social networks have increased or diminished social capital in contemporary society? Develop a substantive argument.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: ["Accurately defines Bourdieu/Putnam conception of social capital", "Distinguishes bonding vs bridging social capital", "Addresses digital transformation with evidence", "Reaches a balanced but clear conclusion"],
    },
  },

  // ════════════════════════════════════════════
  // C2 — 5 items
  // ════════════════════════════════════════════
  {
    cefrLevel: "C2", difficulty: 2.0, discrimination: 1.5,
    tags: ["speaking", "c2", "discussion", "philosophy", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 210, productLine: "Academia",
      cefrDescriptor: "Can express ideas with mastery, nuance and precision on any topic.",
      prompt: "Discuss with the examiner: 'The concept of progress is inherently Eurocentric and should be abandoned.' Engage philosophically and historically, addressing the strongest arguments on both sides.",
      scoringRubric: RUBRIC.C2,
      sampleBullets: ["Interrogates the concept of 'progress' itself", "Addresses philosophical and historical dimensions", "Demonstrates familiarity with post-colonial critique", "Reaches a sophisticated conclusion without false resolution"],
    },
  },
  {
    cefrLevel: "C2", difficulty: 2.2, discrimination: 1.5,
    tags: ["speaking", "c2", "presentation", "academic-mastery", "academia", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 120, responseTime: 240, productLine: "Academia",
      cefrDescriptor: "Can deliver a sophisticated, precise academic presentation and handle expert-level questions.",
      prompt: "Deliver a 4-minute academic mini-lecture on one of the following:\n(a) The philosophical implications of quantum mechanics for our understanding of causality\n(b) The political economy of climate inaction\n(c) Why narrative structure shapes memory formation\n\nHandle two follow-up questions from the examiner.",
      scoringRubric: RUBRIC.C2,
      sampleBullets: ["Selects and introduces topic with intellectual precision", "Develops 3 substantive points with evidence or reasoning", "Uses appropriate academic hedging and referencing conventions", "Handles Q&A with authority and nuance"],
    },
  },
  {
    cefrLevel: "C2", difficulty: 2.4, discrimination: 1.5,
    tags: ["speaking", "c2", "debate", "advanced", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 210, productLine: "Academia",
      cefrDescriptor: "Can sustain the most complex and demanding intellectual discussions.",
      prompt: "Debate with the examiner: 'The greatest intellectual challenge of the 21st century is not technological but ethical — specifically, how to govern technologies whose power exceeds our wisdom.' Defend and critically examine this proposition at the highest intellectual level.",
      scoringRubric: RUBRIC.C2,
      sampleBullets: ["Interrogates the distinction between technological and ethical challenges", "Draws on philosophy of technology (Jonas/Winner/Haraway or similar)", "Sustains argument across examiner's strongest challenges", "Demonstrates mastery-level vocabulary and register"],
    },
  },
  {
    cefrLevel: "C2", difficulty: 2.6, discrimination: 1.5,
    tags: ["speaking", "c2", "monologue", "meta-linguistic", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 90, responseTime: 240, productLine: "Academia",
      cefrDescriptor: "Can reflect on language itself with mastery and sophistication.",
      prompt: "Reflect on the following: 'Every language constructs a different world. To lose a language is therefore to lose an entire way of understanding reality.' Develop a sustained, sophisticated argument — drawing on linguistics, philosophy, anthropology or literature — that either supports, qualifies or challenges this proposition.",
      scoringRubric: RUBRIC.C2,
      sampleBullets: ["Engages with linguistic diversity / endangered languages / Sapir-Whorf", "References concrete examples from specific languages or linguistic phenomena", "Develops an original or sophisticated interpretive position", "Demonstrates complete mastery of academic spoken register"],
    },
  },
  {
    cefrLevel: "C2", difficulty: 2.8, discrimination: 1.5,
    tags: ["speaking", "c2", "roleplay", "mastery", "corporate", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 90, responseTime: 240, productLine: "Corporate",
      cefrDescriptor: "Can handle the most complex professional communication with total command.",
      prompt: "Role play: You are a senior diplomat representing a smaller nation in a multilateral climate negotiation. The examiner represents a major industrialised nation that is resisting binding emissions targets. Negotiate a compromise that your nation can accept, while managing the power asymmetry diplomatically.",
      scoringRubric: RUBRIC.C2,
      sampleBullets: ["Opens with strategic framing and rapport-building", "Identifies mutual interests beneath stated positions", "Uses diplomatic language of high precision (I would venture / it would be remiss of us not to acknowledge / with the greatest respect)", "Secures an acceptable compromise while managing power dynamics"],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set. Add it to .env");
    process.exit(1);
  }

  if (process.env.DRY_RUN === "1") {
    console.log(`DRY_RUN: would insert ${items.length} items`);
    const byLevel: Record<string, number> = {};
    for (const i of items) byLevel[i.cefrLevel] = (byLevel[i.cefrLevel] || 0) + 1;
    console.table(byLevel);
    return;
  }

  if (process.env.FORCE === "1") {
    const deleted = await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`🗑  Deleted ${deleted.count} existing items tagged [${SEED_TAG}]`);
  }

  const existing = await prisma.item.count({ where: { tags: { has: SEED_TAG } } });
  if (existing > 0 && process.env.FORCE !== "1") {
    console.log(`⚠️  ${existing} items already seeded. Use FORCE=1 to re-seed.`);
    return;
  }

  let inserted = 0;
  const { valid, invalid } = validateItemBatch(items);
  reportValidationResults(valid.length, invalid.length, invalid);
  if (invalid.length > 0) {
    console.error(`Cannot proceed: ${invalid.length} items failed validation`);
    process.exit(1);
  }
  for (const item of valid) {
    await prisma.item.create({
      data: {
        skill: "SPEAKING",
        cefrLevel: item.cefrLevel as any,
        type: "SPEAKING_PROMPT",
        status: "ACTIVE",
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: 0,
        tags: item.tags,
        content: item.content,
      },
    });
    inserted++;
  }

  const totals: Record<string, number> = {};
  for (const i of items) totals[i.cefrLevel] = (totals[i.cefrLevel] || 0) + 1;

  console.log(`\n✅  Inserted ${inserted} speaking items`);
  console.table(totals);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
