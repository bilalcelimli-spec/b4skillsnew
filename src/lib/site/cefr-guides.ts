/**
 * Content for the public CEFR level guides (/cefr-levels, /cefr-levels/a1 …
 * /cefr-levels/c2). Written in plain language, in our own words. The Council
 * of Europe's descriptor scales are copyright and need permission to
 * reproduce, so their wording must not be copied here. Exam score alignments are
 * the exam owners' own published tables (see cefr-exam-alignments.ts); they
 * are not a b4skills concordance claim.
 */

export type GuideLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface LevelGuide {
  level: GuideLevel;
  slug: string;
  /** "Basic user", "Independent user", "Proficient user" (CEFR bands). */
  band: string;
  /** Common English name for the level. */
  nickname: string;
  /** Two or three sentences that answer "What is X level English?" directly. */
  answer: string;
  canDo: { skill: "Reading" | "Listening" | "Speaking" | "Writing"; points: string[] }[];
  /** Grammar and vocabulary learners usually control at this level. */
  language: string[];
  /** What the level is typically enough for. */
  goodFor: string[];
  /** What usually still causes difficulty. */
  limits: string[];
  /** Practical advice for reaching the next level. */
  nextSteps: string[];
  faq: { q: string; a: string }[];
}

export const LEVEL_GUIDES: readonly LevelGuide[] = [
  {
    level: "A1",
    slug: "a1",
    band: "Basic user",
    nickname: "Beginner",
    answer:
      "A1 is the first of the six CEFR levels. At A1 you know a small set of everyday words and set phrases: you can say who you are, answer simple questions about yourself and understand short, slow speech on very familiar things. Conversation works only when the other person is patient and helps.",
    canDo: [
      { skill: "Reading", points: ["Pick out familiar names, words and very short sentences on signs, labels and simple forms.", "Find a name, a number, a price or a time in a short text."] },
      { skill: "Listening", points: ["Follow very slow, clear speech about yourself, your family and your immediate surroundings.", "Catch simple instructions such as numbers, directions and times."] },
      { skill: "Speaking", points: ["Say who you are, where you live and what you do, using memorised phrases.", "Ask and answer simple questions about familiar topics, with pauses and help."] },
      { skill: "Writing", points: ["Fill in a form with your name, nationality and address.", "Write a short postcard or message with fixed expressions."] },
    ],
    language: [
      "Present simple of be and have, and a few common verbs.",
      "Personal pronouns, possessives (my, your), this/that, plurals.",
      "Basic question words (what, where, how old) and there is / there are.",
      "Numbers, days, months, colours, family members, food and everyday objects.",
    ],
    goodFor: ["Greeting people and exchanging basic personal information.", "Very simple shopping, ordering and asking for prices.", "Reading signs and simple notices when travelling."],
    limits: ["Conversations break down quickly if the speaker is fast or uses unfamiliar words.", "Sentences rely on memorised chunks rather than flexible grammar."],
    nextSteps: [
      "Learn high-frequency words in small topic groups (home, work, shopping, travel) and use them in short sentences.",
      "Listen to graded audio made for beginners every day, even for ten minutes.",
      "Practise past simple and can/can't so you can talk about what happened and what you are able to do — both are core A2 language.",
    ],
    faq: [
      { q: "Is A1 the same as 'no English'?", a: "No. A1 already means you can handle a few predictable everyday exchanges. Learners below that are sometimes described as Pre-A1." },
      { q: "Can I travel with A1 English?", a: "You can manage very simple, predictable situations such as greeting people or ordering, but you will need patience from the other person and gestures or a phrasebook for anything unexpected." },
    ],
  },
  {
    level: "A2",
    slug: "a2",
    band: "Basic user",
    nickname: "Elementary",
    answer:
      "A2 is the second CEFR level. At A2 you can get through routine, everyday exchanges — shopping, transport, talking about your family, work or town — using short sentences, and you can follow simple, clear messages on these topics.",
    canDo: [
      { skill: "Reading", points: ["Understand short, simple texts such as personal messages, menus, timetables and adverts.", "Find specific, predictable information in everyday material."] },
      { skill: "Listening", points: ["Understand the main point of short, clear announcements and messages.", "Follow everyday conversations on familiar topics when people speak clearly."] },
      { skill: "Speaking", points: ["Describe your background, routine, job or studies in simple terms.", "Handle short social exchanges, make arrangements and ask for things in shops and on transport."] },
      { skill: "Writing", points: ["Write short notes and simple personal messages.", "Link simple sentences with and, but and because."] },
    ],
    language: [
      "Past simple (regular and common irregular verbs) and going to for plans.",
      "Comparatives and superlatives, adverbs of frequency, countable and uncountable nouns.",
      "Can, could, have to, would like for ability, obligation and requests.",
      "Vocabulary for daily routines, work, travel, health, shopping and free time.",
    ],
    goodFor: ["Everyday travel: booking, asking for directions, simple problems at a hotel.", "Short, routine conversations with colleagues or neighbours.", "Understanding simple instructions and forms at work."],
    limits: ["Explaining opinions or reasons beyond a sentence or two.", "Following conversations between native speakers, films or the news."],
    nextSteps: [
      "Practise telling short stories about past events and future plans — connected narration is the main step to B1.",
      "Read graded readers a little above your level to build reading speed and vocabulary.",
      "Start using the present perfect (I've been, I've never …) and first conditional (If it rains, we'll …).",
    ],
    faq: [
      { q: "Is A2 enough to work in English?", a: "A2 is usually enough for simple, routine tasks with predictable language. Most roles that involve meetings, writing or customer contact in English expect B1 or higher." },
      { q: "Which Cambridge exam is A2?", a: "Cambridge's A2 Key (KET) is designed to test A2. See the exam comparison table for how other exams report A2." },
    ],
  },
  {
    level: "B1",
    slug: "b1",
    band: "Independent user",
    nickname: "Intermediate",
    answer:
      "B1 is the level where you start to manage in English on your own. At B1 you follow the main ideas when people speak clearly about familiar subjects, cope with most travel situations without help, and can talk about your experiences, plans and opinions and briefly say why.",
    canDo: [
      { skill: "Reading", points: ["Read everyday texts, emails and letters written in common, high-frequency English.", "Follow the main line of argument in straightforward articles on familiar topics."] },
      { skill: "Listening", points: ["Follow the main points of clear speech about work, school or leisure.", "Understand the gist of many radio or TV programmes on current affairs when delivered slowly and clearly."] },
      { skill: "Speaking", points: ["Take part in conversations on familiar topics without preparation.", "Tell a story, describe a film or book, and give short reasons for opinions and plans."] },
      { skill: "Writing", points: ["Write simple connected text on familiar topics.", "Write personal emails describing experiences and impressions."] },
    ],
    language: [
      "Present perfect vs. past simple, past continuous, used to.",
      "First and second conditionals, will vs. going to, simple passive forms.",
      "Relative clauses (who, which, that) and linking words (however, although, so).",
      "Vocabulary for work, education, feelings, the media and the environment.",
    ],
    goodFor: ["Independent travel and everyday life in an English-speaking country.", "Routine work communication, including simple emails and phone calls.", "Following training sessions or classes on familiar topics."],
    limits: ["Discussing abstract or unfamiliar topics in depth.", "Understanding fast speech, strong accents, humour and idioms.", "Writing formal texts with a consistent, appropriate tone."],
    nextSteps: [
      "Practise giving and defending opinions: give a view, a reason and an example, then respond to a counter-argument.",
      "Listen to authentic material (podcasts, interviews) at natural speed, with transcripts at first.",
      "Widen your range of linking words and learn third conditional and reported speech.",
    ],
    faq: [
      { q: "Is B1 'fluent'?", a: "Not usually. B1 learners communicate independently on familiar topics but still search for words and simplify. Most people describe fluent, natural conversation as B2 or above." },
      { q: "Is B1 enough for a visa or a job?", a: "Some immigration and employment routes set B1 as a minimum, but requirements differ by country, institution and role. Always check the exact level and the accepted tests with the organisation itself." },
    ],
  },
  {
    level: "B2",
    slug: "b2",
    band: "Independent user",
    nickname: "Upper intermediate",
    answer:
      "B2 is the upper intermediate level. At B2 you can hold natural conversations without much effort on either side, understand the main ideas of complex texts and talks — including technical ones in your own field — and argue for a position by weighing its pros and cons.",
    canDo: [
      { skill: "Reading", points: ["Read articles and reports on current issues where writers take a position.", "Understand most specialist material in your own field, using a dictionary occasionally."] },
      { skill: "Listening", points: ["Follow extended speech and lectures, and fairly complex arguments on familiar topics.", "Watch the news, documentaries and most films in standard English and follow them well."] },
      { skill: "Speaking", points: ["Talk with fluent speakers comfortably, without either side having to slow down or simplify much.", "Present clear, detailed descriptions and argue a point of view."] },
      { skill: "Writing", points: ["Write clear, detailed essays or reports giving reasons for and against a position.", "Write formal and informal emails with an appropriate tone."] },
    ],
    language: [
      "Full range of narrative tenses, including past perfect and future continuous.",
      "Third and mixed conditionals, wishes and regrets, a wide range of passive forms.",
      "Reported speech, modal verbs for speculation (must have, might have).",
      "Collocations, common phrasal verbs and topic vocabulary for work and study.",
    ],
    goodFor: ["Many undergraduate programmes taught in English set B2 as their usual entry level.", "Professional work in English: meetings, presentations, reports and negotiation on familiar topics.", "Socialising comfortably with fluent speakers."],
    limits: ["Very fast, colloquial or culturally loaded language.", "Precise, nuanced expression in unfamiliar or highly abstract topics.", "Producing long academic texts without some errors in complex structures."],
    nextSteps: [
      "Read and listen widely beyond your comfort topics and note how writers signal stance (arguably, it could be said that …).",
      "Practise summarising long texts and lectures concisely — a core C1 skill.",
      "Work on accuracy in complex sentences: inversion for emphasis, cleft sentences, advanced linking.",
    ],
    faq: [
      { q: "Is B2 good enough for university?", a: "Many universities ask for B2 for undergraduate study and C1 for some postgraduate or language-heavy programmes, usually proven with a specific test. Check the exact requirement and accepted tests on the university's own admissions page." },
      { q: "How is B2 different from B1?", a: "B1 learners manage familiar situations; B2 learners can discuss abstract and complex topics, follow natural speech and argue a position with fluency. The jump usually takes several hundred hours of study and practice." },
    ],
  },
  {
    level: "C1",
    slug: "c1",
    band: "Proficient user",
    nickname: "Advanced",
    answer:
      "C1 is the advanced level. At C1 you read long, demanding texts and pick up what is implied as well as what is said, speak fluently without searching for words, and use English confidently for study, work and social life, adjusting your style to the situation.",
    canDo: [
      { skill: "Reading", points: ["Understand long, complex factual and literary texts and notice differences in style.", "Read specialised articles and technical instructions, even outside your field."] },
      { skill: "Listening", points: ["Follow long talks and discussions even when they wander or the structure is not signposted.", "Enjoy films and TV series in English without subtitles, including a good deal of idiom."] },
      { skill: "Speaking", points: ["Express yourself fluently and precisely without obvious searching for words.", "Use English effectively in meetings, negotiations and academic discussion."] },
      { skill: "Writing", points: ["Write clear, well-structured, detailed texts on complex subjects.", "Choose a style that suits the reader, and organise ideas with confident linking."] },
    ],
    language: [
      "Inversion and fronting for emphasis, cleft sentences, nominalisation.",
      "Nuanced modality and hedging (it would appear that, to some extent).",
      "Wide range of idioms, phrasal verbs and formal/informal register.",
      "Precise academic and professional vocabulary.",
    ],
    goodFor: ["Postgraduate study and academic writing in English.", "Senior professional roles and client-facing work in English.", "Following almost any media, including discussion programmes."],
    limits: ["Subtle humour, wordplay and very regional or specialised idiom.", "Native-like precision in every context, especially in writing under time pressure."],
    nextSteps: [
      "Read widely in genres you rarely use (literature, opinion columns, legal or scientific writing) and imitate their style.",
      "Get feedback on long writing for precision and concision, not just accuracy.",
      "Listen to unscripted speech with varied accents and fast turn-taking.",
    ],
    faq: [
      { q: "Is C1 the same as native level?", a: "No. C1 is high proficiency, and many C1 users work and study fully in English, but the CEFR does not use 'native speaker' as a level. C2 describes the most precise and flexible use." },
      { q: "Which exams are designed for C1?", a: "Cambridge's C1 Advanced is designed for C1, and many other exams report a C1 score range. See the exam comparison table for the owners' published ranges." },
    ],
  },
  {
    level: "C2",
    slug: "c2",
    band: "Proficient user",
    nickname: "Proficiency",
    answer:
      "C2 is the highest CEFR level. At C2 you understand almost anything you hear or read without effort, can pull together information from several sources into a clear summary, and express fine shades of meaning precisely and naturally, even on complex subjects.",
    canDo: [
      { skill: "Reading", points: ["Read almost any kind of English text comfortably, including abstract and complex writing.", "Pick up implied meaning, irony and stylistic effects."] },
      { skill: "Listening", points: ["Follow any spoken English, live or recorded, at full natural speed.", "Follow specialist lectures and debates with ease."] },
      { skill: "Speaking", points: ["Join any conversation with ease and use idiomatic, informal language naturally.", "Convey fine shades of meaning and repair difficulties so smoothly that others hardly notice."] },
      { skill: "Writing", points: ["Write complex reports, articles and reviews in an appropriate, effective style.", "Summarise and critique professional or literary work."] },
    ],
    language: [
      "Consistent control of the full grammatical range, including rare structures.",
      "Idiomatic and colloquial language used naturally and appropriately.",
      "Precise vocabulary for fine distinctions of meaning and register.",
    ],
    goodFor: ["Any academic or professional context, including teaching, translation or editing in English.", "Highly demanding roles where precision and nuance matter."],
    limits: ["Very specialised domains still require subject knowledge, just as for native speakers."],
    nextSteps: [
      "Maintain the level through demanding reading and writing in your field.",
      "Focus on domain-specific registers you need (legal, medical, literary).",
    ],
    faq: [
      { q: "Do I need C2?", a: "Rarely. Few universities or employers require C2; it is mostly relevant for language professionals such as teachers, translators and editors." },
      { q: "Is C2 a native speaker level?", a: "The CEFR deliberately does not use the native speaker as a benchmark. C2 describes precise, flexible and appropriate use — many native speakers would not reach C2 in formal academic writing." },
    ],
  },
];

export const CEFR_GUIDE_HUB_PATH = "/cefr-levels";
export const CEFR_EXAM_COMPARISON_PATH = "/cefr-levels/exam-comparison";
export const levelGuidePath = (guide: Pick<LevelGuide, "slug">) => `${CEFR_GUIDE_HUB_PATH}/${guide.slug}`;
export const CEFR_GUIDE_PATHS: readonly string[] = [CEFR_GUIDE_HUB_PATH, ...LEVEL_GUIDES.map(levelGuidePath), CEFR_EXAM_COMPARISON_PATH];

export function guideForPath(path: string): LevelGuide | undefined {
  return LEVEL_GUIDES.find((guide) => levelGuidePath(guide) === path);
}

export function neighbours(guide: LevelGuide): { previous?: LevelGuide; next?: LevelGuide } {
  const i = LEVEL_GUIDES.indexOf(guide);
  return { previous: LEVEL_GUIDES[i - 1], next: LEVEL_GUIDES[i + 1] };
}
