/**
 * WRITING — Phase 3: Early Learners (PRE_A1 + A1)
 * 30 WRITING_PROMPT items scored 0–6 (PRE_A1) or 0–10 (A1) by Gemini AI (GRM model)
 *
 * Distribution: PRE_A1 = 15 items, A1 = 15 items
 * Product lines: Primary (7-10), Junior Suite (11-14), Language Schools
 *
 * PRE_A1 tasks: copy-and-label, match-and-write, guided sentence completion,
 *               write a number/colour/name, short caption writing
 * A1 tasks:     guided messages (30-50 words), simple descriptions,
 *               short emails to friends, note-writing, captions with sentences
 *
 *   npx tsx scripts/seed-writing-phase3.ts
 *   DRY_RUN=1 npx tsx scripts/seed-writing-phase3.ts
 *   FORCE=1 npx tsx scripts/seed-writing-phase3.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
import { validateOrExit } from "./_validation-helper.js";
const SEED_TAG = "seed-writing-phase3";

// ─── Rubrics ──────────────────────────────────────────────────────────────────

const RUBRIC_PRE_A1 = [
  { name: "Task Attempt",      maxScore: 1, descriptor: "Makes a recognisable attempt to write something for the given task." },
  { name: "Legibility",        maxScore: 1, descriptor: "Writing is legible and can be deciphered (letters formed recognisably)." },
  { name: "Relevant Content",  maxScore: 1, descriptor: "At least one piece of information matches the task requirement." },
  { name: "Vocabulary",        maxScore: 1, descriptor: "At least one correctly spelled high-frequency word is present." },
  { name: "Sentence Attempt",  maxScore: 1, descriptor: "Attempts a word, phrase, or simple sentence structure." },
  { name: "Accuracy",          maxScore: 1, descriptor: "Target word(s) are spelled correctly or closely enough to be recognised." },
];

const RUBRIC_A1 = [
  { name: "Task Achievement",     maxScore: 2, descriptor: "Writes the requested information; all bullet points or prompts are addressed." },
  { name: "Grammar & Accuracy",   maxScore: 2, descriptor: "Uses simple sentence structures with mostly correct grammar; errors do not impede understanding." },
  { name: "Vocabulary",           maxScore: 2, descriptor: "Uses relevant high-frequency words; spelling is mostly correct for core vocabulary." },
  { name: "Coherence",            maxScore: 2, descriptor: "Text is organised in a recognisable way; basic connectors (and, but, because) used." },
  { name: "Communicative Effect", maxScore: 2, descriptor: "A sympathetic reader could understand the message without significant difficulty." },
];

// ─── Items ─────────────────────────────────────────────────────────────────────

const items = [

  // ══════════════════════════════════════════════════════════
  //  PRE_A1 — 15 items  (difficulty –3.2 to –2.2)
  // ══════════════════════════════════════════════════════════

  // 1. Write your name
  {
    cefrLevel: "PRE_A1", difficulty: -3.2, discrimination: 0.8,
    tags: ["writing", "pre_a1", "personal", "name", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 1, max: 5 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write their own name.",
      prompt: "Write your first name here:\n\n___________________________",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "[Candidate's own name]",
    },
  },

  // 2. Write numbers 1–5
  {
    cefrLevel: "PRE_A1", difficulty: -3.1, discrimination: 0.8,
    tags: ["writing", "pre_a1", "numbers", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 5, max: 10 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write numbers 1 to 5 in words.",
      prompt: "Write the words for these numbers:\n1 → ___________\n2 → ___________\n3 → ___________\n4 → ___________\n5 → ___________",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "one / two / three / four / five",
    },
  },

  // 3. Colour the label
  {
    cefrLevel: "PRE_A1", difficulty: -3.1, discrimination: 0.8,
    tags: ["writing", "pre_a1", "colours", "label", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 1, max: 4 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write the name of a colour when shown a coloured object.",
      prompt: "Look at the pictures. Write the correct colour word under each picture.\n[Picture 1: a red apple] → ___________\n[Picture 2: a blue sky] → ___________\n[Picture 3: a yellow sun] → ___________",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "red / blue / yellow",
    },
  },

  // 4. Animal names
  {
    cefrLevel: "PRE_A1", difficulty: -3.0, discrimination: 0.8,
    tags: ["writing", "pre_a1", "animals", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 1, max: 4 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write the name of common animals (cat, dog, bird, fish).",
      prompt: "Look at the pictures. Write the correct animal word.\n[Picture 1: a cat] → ___________\n[Picture 2: a dog] → ___________\n[Picture 3: a bird] → ___________",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "cat / dog / bird",
    },
  },

  // 5. Write your age
  {
    cefrLevel: "PRE_A1", difficulty: -3.0, discrimination: 0.8,
    tags: ["writing", "pre_a1", "personal", "age", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 3, max: 6 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can complete the sentence 'I am ___ years old.'",
      prompt: "Complete the sentence:\nI am ___________ years old.",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "I am 8 years old.",
    },
  },

  // 6. Family labels
  {
    cefrLevel: "PRE_A1", difficulty: -2.9, discrimination: 0.9,
    tags: ["writing", "pre_a1", "family", "label", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 1, max: 4 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write family words: mum, dad, brother, sister.",
      prompt: "Look at the pictures of a family. Write the correct word.\n[Picture 1: a woman (mother)] → ___________\n[Picture 2: a man (father)] → ___________\n[Picture 3: a girl (sister)] → ___________",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "mum / dad / sister",
    },
  },

  // 7. Complete: 'I like ___'
  {
    cefrLevel: "PRE_A1", difficulty: -2.9, discrimination: 0.9,
    tags: ["writing", "pre_a1", "likes", "sentence-completion", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 3, max: 8 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can complete the sentence 'I like ___' with a word or phrase.",
      prompt: "Complete these sentences about yourself:\nI like ___________________________.\nI do not like ___________________________.",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "I like pizza. / I do not like broccoli.",
    },
  },

  // 8. Days of the week (write three)
  {
    cefrLevel: "PRE_A1", difficulty: -2.8, discrimination: 0.9,
    tags: ["writing", "pre_a1", "days", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 3, max: 10 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write the names of at least three days of the week.",
      prompt: "Write any THREE days of the week:\n1. ___________________________\n2. ___________________________\n3. ___________________________",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "Monday / Wednesday / Friday",
    },
  },

  // 9. Write a word for each picture (classroom objects)
  {
    cefrLevel: "PRE_A1", difficulty: -2.8, discrimination: 0.9,
    tags: ["writing", "pre_a1", "classroom", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 1, max: 4 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can label common classroom objects (pen, book, ruler, bag).",
      prompt: "Write the correct word for each picture.\n[Picture 1: a pencil] → ___________\n[Picture 2: a book] → ___________\n[Picture 3: a ruler] → ___________\n[Picture 4: a bag] → ___________",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "pencil / book / ruler / bag",
    },
  },

  // 10. My favourite colour sentence
  {
    cefrLevel: "PRE_A1", difficulty: -2.7, discrimination: 0.9,
    tags: ["writing", "pre_a1", "colours", "sentence", "language-schools", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 5, max: 8 }, productLine: "Language Schools",
      cefrDescriptor: "Can write a simple sentence about their favourite colour.",
      prompt: "Write a sentence about your favourite colour.\nExample: My favourite colour is blue.",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "My favourite colour is green.",
    },
  },

  // 11. Write the missing letter
  {
    cefrLevel: "PRE_A1", difficulty: -2.7, discrimination: 0.9,
    tags: ["writing", "pre_a1", "spelling", "phonics", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 4, max: 8 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can complete simple words by writing the missing letter.",
      prompt: "Write the missing letter in each word:\nc_t (a cat)\nd_g (a dog)\nb_s (a bus)\nb_ok (a book)",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "cat / dog / bus / book (a/o/u/o)",
    },
  },

  // 12. Copy and answer: Is this a ___?
  {
    cefrLevel: "PRE_A1", difficulty: -2.6, discrimination: 0.9,
    tags: ["writing", "pre_a1", "yes-no", "animals", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 1, max: 5 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write 'Yes' or 'No' to answer a simple question about a picture.",
      prompt: "Look at the picture and write YES or NO.\n[Picture: a cat]\nIs this a cat? ___________\nIs this a dog? ___________\nIs this an animal? ___________",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "Yes / No / Yes",
    },
  },

  // 13. Write weather words
  {
    cefrLevel: "PRE_A1", difficulty: -2.5, discrimination: 0.9,
    tags: ["writing", "pre_a1", "weather", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 3, max: 9 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write basic weather words (sunny, rainy, cold, hot).",
      prompt: "Look at each weather picture. Write the correct weather word.\n[Picture 1: sun shining] → ___________\n[Picture 2: rain falling] → ___________\n[Picture 3: snow] → ___________",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "sunny / rainy / snowy",
    },
  },

  // 14. 'This is my ___' caption
  {
    cefrLevel: "PRE_A1", difficulty: -2.4, discrimination: 0.9,
    tags: ["writing", "pre_a1", "personal", "caption", "language-schools", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 4, max: 10 }, productLine: "Language Schools",
      cefrDescriptor: "Can write a simple caption using 'This is my ___.'",
      prompt: "Draw or imagine a picture of something you like.\nWrite a sentence about it: This is my _________________________.",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "This is my dog. / This is my bike.",
    },
  },

  // 15. Write the missing word in a sentence
  {
    cefrLevel: "PRE_A1", difficulty: -2.2, discrimination: 0.9,
    tags: ["writing", "pre_a1", "grammar", "sentence-completion", "language-schools", SEED_TAG],
    content: {
      taskType: "label", wordRange: { min: 4, max: 16 }, productLine: "Language Schools",
      cefrDescriptor: "Can supply a missing word in a simple sentence.",
      prompt: "Write the missing word (is / am / are) in each sentence:\n1. I ___ eight years old.\n2. She ___ my teacher.\n3. We ___ in the classroom.",
      scoringRubric: RUBRIC_PRE_A1,
      sampleAnswer: "am / is / are",
    },
  },

  // ══════════════════════════════════════════════════════════
  //  A1 — 15 items  (difficulty –2.0 to –0.8)
  // ══════════════════════════════════════════════════════════

  // 16. Write an email to a friend about your pet
  {
    cefrLevel: "A1", difficulty: -2.0, discrimination: 1.0,
    tags: ["writing", "a1", "email", "animals", "primary", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 25, max: 45 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write a short, simple email to a friend about a familiar topic.",
      prompt: "Write a short email to your friend about your pet (real or imaginary).\nTell them:\n• What pet you have\n• What its name and colour are\n• One thing you do with your pet",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "Hi Tom! I have a dog. Her name is Bella and she is brown. I walk Bella in the park every day. She is very funny. See you soon! Anna",
    },
  },

  // 17. Message about your birthday
  {
    cefrLevel: "A1", difficulty: -1.9, discrimination: 1.0,
    tags: ["writing", "a1", "message", "personal", "primary", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 25, max: 45 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write a short message about a personal event.",
      prompt: "Write a short message to your friend about your birthday.\nSay:\n• When your birthday is\n• How old you will be\n• What you want to do on your birthday",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "Hi! My birthday is on Saturday. I will be nine years old. I want to go to a pizza restaurant with my family. I am very excited! See you at school!",
    },
  },

  // 18. Describe your bedroom
  {
    cefrLevel: "A1", difficulty: -1.9, discrimination: 1.0,
    tags: ["writing", "a1", "description", "home", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 30, max: 50 }, productLine: "Language Schools",
      cefrDescriptor: "Can write a short description of a familiar place.",
      prompt: "Write a short description of your bedroom.\nInclude:\n• The colour of the walls\n• Two pieces of furniture\n• Your favourite thing in the room",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "My bedroom is small. The walls are white. I have a bed and a bookshelf. My favourite thing is my bookshelf because I love books. I also have a big window with a view of the garden.",
    },
  },

  // 19. Note to a classmate
  {
    cefrLevel: "A1", difficulty: -1.8, discrimination: 1.0,
    tags: ["writing", "a1", "note", "school", "primary", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 20, max: 40 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write a simple note to communicate basic information.",
      prompt: "Write a short note to your classmate. Tell them:\n• That you cannot come to school tomorrow\n• Why you cannot come\n• One thing you want them to do for you",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "Hi Max! I cannot come to school tomorrow because I am sick. Please tell the teacher. Can you write down the homework for me? Thank you! Leo",
    },
  },

  // 20. Write about your family
  {
    cefrLevel: "A1", difficulty: -1.8, discrimination: 1.0,
    tags: ["writing", "a1", "family", "description", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 30, max: 50 }, productLine: "Language Schools",
      cefrDescriptor: "Can write simple sentences about family members.",
      prompt: "Write about your family.\nSay:\n• How many people are in your family\n• The names of two family members\n• One thing you do together as a family",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "There are four people in my family: me, my mum, my dad, and my sister. My sister is called Laura. We always have dinner together and watch films on Friday evenings. I love my family.",
    },
  },

  // 21. A postcard from a trip
  {
    cefrLevel: "A1", difficulty: -1.7, discrimination: 1.0,
    tags: ["writing", "a1", "postcard", "holiday", "junior", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 30, max: 50 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write a short postcard message using simple past and present.",
      prompt: "Write a short postcard to a friend from a holiday.\nSay:\n• Where you are\n• The weather\n• One thing you saw or did\n• A greeting at the end",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "Hi Sam! I am in Paris with my family. The weather is warm and sunny. Yesterday we visited a big museum and saw lots of paintings. It was amazing! See you soon! Maria",
    },
  },

  // 22. My favourite food
  {
    cefrLevel: "A1", difficulty: -1.7, discrimination: 1.0,
    tags: ["writing", "a1", "food", "description", "primary", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 30, max: 50 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write a short paragraph about a favourite food.",
      prompt: "Write about your favourite food.\nSay:\n• What the food is\n• When you eat it\n• Why you like it",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "My favourite food is pizza. I eat it on Saturdays with my family. I like pizza because it is delicious and I can choose my favourite toppings. My favourite is cheese and tomato pizza.",
    },
  },

  // 23. An invitation to a party
  {
    cefrLevel: "A1", difficulty: -1.6, discrimination: 1.0,
    tags: ["writing", "a1", "invitation", "social", "junior", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 30, max: 50 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write a simple invitation giving basic details.",
      prompt: "Write an invitation to your birthday party.\nInclude:\n• The date and time\n• The place\n• What guests should bring or wear",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "Hello! Please come to my birthday party on Saturday at 3 o'clock. It is at my house at 12 Oak Street. Please wear something green because it is a colour party! We will have pizza and music. Hope to see you there! Jake",
    },
  },

  // 24. Write about your school day
  {
    cefrLevel: "A1", difficulty: -1.6, discrimination: 1.0,
    tags: ["writing", "a1", "school", "daily-routine", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 35, max: 55 }, productLine: "Language Schools",
      cefrDescriptor: "Can describe a typical school day in simple sentences.",
      prompt: "Write about a typical school day.\nSay:\n• What time school starts\n• Two subjects you study\n• What you do at lunch\n• What time school finishes",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "School starts at nine o'clock. In the morning I have English and Maths. At lunch I eat in the canteen with my friends. I have Science in the afternoon. School finishes at three thirty. I go home by bus.",
    },
  },

  // 25. Write about a sport you play
  {
    cefrLevel: "A1", difficulty: -1.5, discrimination: 1.0,
    tags: ["writing", "a1", "sport", "description", "junior", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 30, max: 50 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write about a sport or physical activity they enjoy.",
      prompt: "Write about a sport or activity you play.\nSay:\n• What sport it is\n• When and where you play\n• Why you like it",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "I play football every Tuesday after school. We play in the park near my house. I like football because it is fun and I can play with my friends. My team is called the Blue Tigers.",
    },
  },

  // 26. Thank-you note
  {
    cefrLevel: "A1", difficulty: -1.5, discrimination: 1.0,
    tags: ["writing", "a1", "note", "social", "primary", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 25, max: 45 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write a short thank-you message.",
      prompt: "Write a short thank-you note to your grandparent.\nSay:\n• What you are thanking them for\n• Why you liked the gift or visit\n• A nice ending",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "Dear Grandma, Thank you very much for the book you gave me for my birthday. It is about animals and I love it. I read it every night. I hope to see you soon. Love, Lily",
    },
  },

  // 27. Describe your favourite toy or object
  {
    cefrLevel: "A1", difficulty: -1.4, discrimination: 1.0,
    tags: ["writing", "a1", "description", "personal", "primary", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 35, max: 55 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write a simple description of an object using basic adjectives.",
      prompt: "Write about your favourite toy or object.\nSay:\n• What it is and what it looks like\n• Where you got it\n• Why it is special to you",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "My favourite toy is a small blue robot. My uncle gave it to me on my seventh birthday. It has red eyes and it can walk and make funny sounds. I like it because it is very cool. I play with it every weekend.",
    },
  },

  // 28. Write about your weekend
  {
    cefrLevel: "A1", difficulty: -1.3, discrimination: 1.0,
    tags: ["writing", "a1", "weekend", "narrative", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 35, max: 55 }, productLine: "Language Schools",
      cefrDescriptor: "Can write about past events using simple past tense.",
      prompt: "Write about what you did last weekend.\nSay:\n• One thing you did on Saturday\n• One thing you did on Sunday\n• How you felt",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "Last weekend was fun. On Saturday I went to the swimming pool with my friends. We swam for two hours and ate ice cream. On Sunday I stayed at home and watched a film. I was very happy because I love swimming.",
    },
  },

  // 29. Write an advert for a lost pet
  {
    cefrLevel: "A1", difficulty: -1.2, discrimination: 1.0,
    tags: ["writing", "a1", "notice", "animals", "junior", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 30, max: 50 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write a simple notice with key information.",
      prompt: "Write a short 'Lost Pet' notice.\nInclude:\n• The type of animal and its name\n• What it looks like\n• Your phone number or address where people can contact you",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "LOST CAT! His name is Whiskers. He is a small orange cat with white feet. Last seen near Green Street on Tuesday. If you see him, please call 07700 900 456. Thank you so much!",
    },
  },

  // 30. Write a weather report
  {
    cefrLevel: "A1", difficulty: -0.8, discrimination: 1.0,
    tags: ["writing", "a1", "weather", "functional", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 30, max: 50 }, productLine: "Language Schools",
      cefrDescriptor: "Can write a short, simple text about the weather and its effects.",
      prompt: "Write a short weather report for today.\nSay:\n• What the weather is like today\n• The temperature (hot / cold / warm)\n• What people can do because of the weather",
      scoringRubric: RUBRIC_A1,
      sampleAnswer: "Today the weather is sunny and warm. The temperature is about 22 degrees. It is a good day to go to the park or have a picnic. Please drink water and wear sunscreen. Enjoy the sunshine!",
    },
  },
];

// ─── Seed ──────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.DRY_RUN === "1") {
    console.log(`DRY_RUN: would insert ${items.length} WRITING items`);
    process.exit(0);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const existing = await prisma.item.count({ where: { tags: { has: SEED_TAG } } });
  if (existing > 0 && !process.env.FORCE) {
    console.log(`Skip: ${existing} items already tagged ${SEED_TAG}. Set FORCE=1 to re-seed.`);
    return;
  }
  if (process.env.FORCE && existing > 0) {
    await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`Removed ${existing} previous ${SEED_TAG} items.`);
  }

  let n = 0;
  const validItems = validateOrExit(items, "seed-writing-phase3");
  for (const item of validItems) {
    await prisma.item.create({
      data: {
        type: "WRITING_PROMPT",
        skill: "WRITING",
        cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: 0.0,
        tags: [...item.tags],
        status: "ACTIVE",
        content: item.content as any,
      },
    });
    n++;
  }

  const pre_a1Count = items.filter(i => i.cefrLevel === "PRE_A1").length;
  const a1Count     = items.filter(i => i.cefrLevel === "A1").length;
  console.log(`Seed complete: ${n} WRITING items (PRE_A1: ${pre_a1Count}, A1: ${a1Count}) — ${SEED_TAG}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
