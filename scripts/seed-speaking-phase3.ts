/**
 * SPEAKING — Phase 3: Early Learners (PRE_A1 + A1)
 * 30 SPEAKING_PROMPT items scored 0–6 (PRE_A1) or 0–10 (A1) by Gemini AI (GRM model)
 *
 * Distribution: PRE_A1 = 15 items, A1 = 15 items
 * Product lines: Primary (7-10), Junior Suite (11-14), Language Schools
 *
 * PRE_A1 tasks: label/name, point-and-say, single-word / short phrase responses,
 *               count, repeat-and-respond, picture description (single item)
 * A1 tasks:     monologue (1-2 sentences), picture description, simple questions,
 *               describe daily objects, short answer, roleplay (greetings/introductions)
 *
 *   npx tsx scripts/seed-speaking-phase3.ts
 *   DRY_RUN=1 npx tsx scripts/seed-speaking-phase3.ts
 *   FORCE=1 npx tsx scripts/seed-speaking-phase3.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
import { validateOrExit } from "./_validation-helper.js";
const SEED_TAG = "seed-speaking-phase3";

// ─── Rubrics ──────────────────────────────────────────────────────────────────

const RUBRIC_PRE_A1 = [
  { name: "Task Attempt",          maxScore: 1, descriptor: "Makes a recognisable attempt to respond to the prompt." },
  { name: "Comprehensibility",     maxScore: 1, descriptor: "At least one element is understandable in context." },
  { name: "Vocabulary Use",        maxScore: 1, descriptor: "Produces at least one relevant word/phrase from the target list." },
  { name: "Pronunciation",         maxScore: 1, descriptor: "Pronunciation of target word(s) is close enough to be identified." },
  { name: "Confidence / Fluency",  maxScore: 1, descriptor: "Responds without excessive hesitation (allowing for age-appropriate pausing)." },
  { name: "Non-verbal Engagement", maxScore: 1, descriptor: "Shows understanding through nodding, pointing, or physical response (multi-modal task types only)." },
];

const RUBRIC_A1 = [
  { name: "Task Achievement",    maxScore: 2, descriptor: "Responds to the prompt with relevant content about very familiar topics." },
  { name: "Grammar & Accuracy",  maxScore: 2, descriptor: "Uses memorised phrases and simple present-tense structures; errors expected but message is clear." },
  { name: "Vocabulary",          maxScore: 2, descriptor: "Uses a small set of familiar, high-frequency words accurately." },
  { name: "Fluency",             maxScore: 2, descriptor: "Produces short isolated phrases with clear pausing; responds within the time frame." },
  { name: "Pronunciation",       maxScore: 2, descriptor: "Pronunciation is mostly comprehensible; a sympathetic listener can understand." },
];

// ─── Items ─────────────────────────────────────────────────────────────────────

const items = [

  // ══════════════════════════════════════════════════════════
  //  PRE_A1 — 15 items  (difficulty –3.0 to –2.0)
  // ══════════════════════════════════════════════════════════

  // 1. Greetings & Name
  {
    cefrLevel: "PRE_A1", difficulty: -3.0, discrimination: 0.8, guessing: 0.0,
    tags: ["speaking", "pre_a1", "greetings", "personal", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 0, responseTime: 30, productLine: "Primary (7-10)",
      cefrDescriptor: "Can say hello and give their name when asked.",
      prompt: "Say hello to the examiner and tell them your name.\nExample: 'Hello! My name is ___.'",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Produces a greeting (hello / hi)",
        "States their name clearly",
        "Uses 'My name is…' or equivalent",
      ],
    },
  },

  // 2. Numbers 1-10
  {
    cefrLevel: "PRE_A1", difficulty: -2.9, discrimination: 0.8, guessing: 0.0,
    tags: ["speaking", "pre_a1", "numbers", "counting", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 0, responseTime: 30, productLine: "Primary (7-10)",
      cefrDescriptor: "Can count objects up to ten and say the numbers aloud.",
      prompt: "Count from one to ten. Say: 'One, two, three…' all the way to ten!",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Produces the sequence 1–10 in order",
        "Numbers are recognisable in English",
        "No major omissions",
      ],
    },
  },

  // 3. Colours
  {
    cefrLevel: "PRE_A1", difficulty: -2.9, discrimination: 0.8, guessing: 0.0,
    tags: ["speaking", "pre_a1", "colours", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "description", prepTime: 5, responseTime: 30, productLine: "Primary (7-10)",
      cefrDescriptor: "Can name basic colours when shown a picture.",
      prompt: "Look at the picture. What colours can you see? Say the colours.\n[EXAMINER: show a picture with red, blue, yellow, green objects]",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Names at least two colours correctly",
        "Attempts all four target colours",
        "Colours are pronounced understandably",
      ],
    },
  },

  // 4. Animals
  {
    cefrLevel: "PRE_A1", difficulty: -2.8, discrimination: 0.8, guessing: 0.0,
    tags: ["speaking", "pre_a1", "animals", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "description", prepTime: 5, responseTime: 45, productLine: "Primary (7-10)",
      cefrDescriptor: "Can name familiar animals from a picture.",
      prompt: "Look at the picture. Name the animals you can see.\n[EXAMINER: show a picture with a dog, cat, bird, and fish]",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Names at least two animals",
        "Attempts all four animals",
        "Animal names are recognisable",
      ],
    },
  },

  // 5. Family members
  {
    cefrLevel: "PRE_A1", difficulty: -2.8, discrimination: 0.8, guessing: 0.0,
    tags: ["speaking", "pre_a1", "family", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 5, responseTime: 45, productLine: "Primary (7-10)",
      cefrDescriptor: "Can name family members (mum, dad, brother, sister).",
      prompt: "Tell me about your family. Who is in your family?\nYou can say: 'I have a mum / dad / brother / sister / …'",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Names at least one family member",
        "Uses 'I have' structure or equivalent",
        "Names are pronounced recognisably",
      ],
    },
  },

  // 6. Classroom objects
  {
    cefrLevel: "PRE_A1", difficulty: -2.7, discrimination: 0.8, guessing: 0.0,
    tags: ["speaking", "pre_a1", "classroom", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "description", prepTime: 5, responseTime: 45, productLine: "Primary (7-10)",
      cefrDescriptor: "Can name common classroom objects (pen, book, bag, ruler).",
      prompt: "Look at the things on the table. Say the name of each one.\n[EXAMINER: place or point to: a pen, a book, a bag, a ruler]",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Names at least two objects correctly",
        "Uses 'a' or 'the' before at least one noun",
        "Names are recognisable",
      ],
    },
  },

  // 7. Age
  {
    cefrLevel: "PRE_A1", difficulty: -2.7, discrimination: 0.8, guessing: 0.0,
    tags: ["speaking", "pre_a1", "personal", "age", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 0, responseTime: 20, productLine: "Primary (7-10)",
      cefrDescriptor: "Can state their age when asked.",
      prompt: "How old are you? Tell me your age.\nYou can say: 'I am ___ years old.'",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Produces a number (their age)",
        "Uses 'I am' or equivalent",
        "Statement is clear",
      ],
    },
  },

  // 8. Likes: food
  {
    cefrLevel: "PRE_A1", difficulty: -2.6, discrimination: 0.9, guessing: 0.0,
    tags: ["speaking", "pre_a1", "food", "likes", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 5, responseTime: 30, productLine: "Primary (7-10)",
      cefrDescriptor: "Can say what food they like using 'I like ___.'",
      prompt: "What food do you like? Tell me one or two foods you like.\nYou can say: 'I like ___.' or 'I like ___ and ___.'",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Names at least one food item",
        "Uses 'I like' structure",
        "Food names are recognisable",
      ],
    },
  },

  // 9. Colours on clothing
  {
    cefrLevel: "PRE_A1", difficulty: -2.6, discrimination: 0.9, guessing: 0.0,
    tags: ["speaking", "pre_a1", "clothing", "colours", "primary", SEED_TAG],
    content: {
      taskType: "description", prepTime: 5, responseTime: 30, productLine: "Primary (7-10)",
      cefrDescriptor: "Can describe the colour of an item of clothing.",
      prompt: "Look at the examiner's top / your own t-shirt. What colour is it?\nSay: 'It is ___.' or '___ is ___.'",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Names the correct colour",
        "Uses 'It is' or points + names",
        "Colour is understandable",
      ],
    },
  },

  // 10. Body parts
  {
    cefrLevel: "PRE_A1", difficulty: -2.5, discrimination: 0.9, guessing: 0.0,
    tags: ["speaking", "pre_a1", "body-parts", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "description", prepTime: 5, responseTime: 45, productLine: "Primary (7-10)",
      cefrDescriptor: "Can name basic body parts (head, hands, eyes, nose).",
      prompt: "I will point to a part of my body. You say the word in English!\n[EXAMINER: point to head, hand, eye, nose in turn]",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Names at least two body parts correctly",
        "Responds to physical cues",
        "Names are recognisable",
      ],
    },
  },

  // 11. Weather
  {
    cefrLevel: "PRE_A1", difficulty: -2.5, discrimination: 0.9, guessing: 0.0,
    tags: ["speaking", "pre_a1", "weather", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "description", prepTime: 5, responseTime: 30, productLine: "Primary (7-10)",
      cefrDescriptor: "Can describe weather using one-word or two-word answers (sunny, rainy, cold).",
      prompt: "Look at the picture. What is the weather like?\n[EXAMINER: show a picture of sunny weather]\nSay one or two words to describe it.",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Produces at least one weather word",
        "Word matches the picture",
        "Word is recognisable",
      ],
    },
  },

  // 12. Favourite colour
  {
    cefrLevel: "PRE_A1", difficulty: -2.4, discrimination: 0.9, guessing: 0.0,
    tags: ["speaking", "pre_a1", "colours", "personal", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 0, responseTime: 20, productLine: "Language Schools",
      cefrDescriptor: "Can say what their favourite colour is.",
      prompt: "What is your favourite colour? Say: 'My favourite colour is ___.'",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Names a colour",
        "Uses 'My favourite colour is' or equivalent",
        "Clear and understandable",
      ],
    },
  },

  // 13. Numbers in a picture (point-and-count)
  {
    cefrLevel: "PRE_A1", difficulty: -2.4, discrimination: 0.9, guessing: 0.0,
    tags: ["speaking", "pre_a1", "numbers", "description", "primary", SEED_TAG],
    content: {
      taskType: "description", prepTime: 5, responseTime: 30, productLine: "Primary (7-10)",
      cefrDescriptor: "Can count objects in a picture and say how many there are.",
      prompt: "Look at the picture. How many cats are there?\n[EXAMINER: show a picture with 3 cats]\nSay: 'There are ___ cats.'",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Produces the correct number (3)",
        "Uses 'there are' or equivalent",
        "Number is clear",
      ],
    },
  },

  // 14. Greetings roleplay
  {
    cefrLevel: "PRE_A1", difficulty: -2.3, discrimination: 0.9, guessing: 0.0,
    tags: ["speaking", "pre_a1", "greetings", "roleplay", "junior", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 5, responseTime: 45, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can greet someone and respond to simple greeting questions.",
      prompt: "I will say hello. You say hello back and answer my question!\nExaminer: 'Hello! How are you today?'\nYou: Say hello and tell me how you are.",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Returns greeting",
        "Gives a state-of-being response (fine / good / OK)",
        "Interaction is recognisable as a greeting exchange",
      ],
    },
  },

  // 15. Likes: sport
  {
    cefrLevel: "PRE_A1", difficulty: -2.0, discrimination: 0.9, guessing: 0.0,
    tags: ["speaking", "pre_a1", "sport", "likes", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 5, responseTime: 30, productLine: "Primary (7-10)",
      cefrDescriptor: "Can say which sport or game they like using 'I like ___.'",
      prompt: "Tell me about a sport or game you like.\nSay: 'I like ___.' or 'I like playing ___.'",
      scoringRubric: RUBRIC_PRE_A1,
      sampleBullets: [
        "Names a sport or game",
        "Uses 'I like' structure",
        "Sport/game is recognisable",
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  //  A1 — 15 items  (difficulty –2.0 to –1.0)
  // ══════════════════════════════════════════════════════════

  // 16. Self-introduction
  {
    cefrLevel: "A1", difficulty: -2.0, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "personal", "introduction", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 15, responseTime: 45, productLine: "Primary (7-10)",
      cefrDescriptor: "Can introduce themselves using simple sentences (name, age, school).",
      prompt: "Introduce yourself to a new classmate. Tell them:\n• Your name\n• How old you are\n• Where you go to school",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "States name",
        "States age using 'I am ___ years old'",
        "Names their school",
        "Uses at least two complete sentences",
      ],
    },
  },

  // 17. My pet
  {
    cefrLevel: "A1", difficulty: -1.9, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "animals", "personal", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 15, responseTime: 60, productLine: "Primary (7-10)",
      cefrDescriptor: "Can describe a pet or a favourite animal using simple sentences.",
      prompt: "Tell me about your pet or your favourite animal. Say:\n• What animal it is\n• What it looks like (colour, size)\n• What it eats or what you do together",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Names the animal",
        "Gives one physical description",
        "Mentions food or an activity",
        "Uses present simple (has, eats, is)",
      ],
    },
  },

  // 18. My home
  {
    cefrLevel: "A1", difficulty: -1.9, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "home", "description", "language-schools", SEED_TAG],
    content: {
      taskType: "description", prepTime: 15, responseTime: 60, productLine: "Language Schools",
      cefrDescriptor: "Can describe where they live using simple present-tense sentences.",
      prompt: "Tell me about where you live. Say:\n• What type of home it is (house/flat)\n• How many rooms it has\n• Your favourite room",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "States type of home",
        "Gives a number of rooms",
        "Names a favourite room",
        "Uses 'It has' or 'There are'",
      ],
    },
  },

  // 19. Describing a picture (school scene)
  {
    cefrLevel: "A1", difficulty: -1.8, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "picture-description", "school", "primary", SEED_TAG],
    content: {
      taskType: "description", prepTime: 15, responseTime: 60, productLine: "Primary (7-10)",
      cefrDescriptor: "Can describe a simple picture using 'There is / There are' and basic adjectives.",
      prompt: "Look at the picture of a classroom.\n[EXAMINER: show a classroom scene with children, desks, a board]\nTell me what you can see. Say at least three things.",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Uses 'There is' or 'There are' at least once",
        "Names three different objects or people",
        "Uses at least one adjective (big, small, red, etc.)",
        "Sentences are intelligible",
      ],
    },
  },

  // 20. Daily routine
  {
    cefrLevel: "A1", difficulty: -1.8, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "daily-routine", "monologue", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 15, responseTime: 60, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can describe their morning routine using simple present-tense verbs.",
      prompt: "Tell me about your morning. What do you do before you go to school?\nTalk about at least two things you do every morning.",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Names at least two morning activities (wake up, eat breakfast, brush teeth, etc.)",
        "Uses present simple (I wake up, I eat, I go)",
        "Uses a time word (at seven, in the morning, first, then)",
        "Response is 2+ sentences",
      ],
    },
  },

  // 21. Favourite season
  {
    cefrLevel: "A1", difficulty: -1.7, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "weather", "opinion", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 15, responseTime: 60, productLine: "Language Schools",
      cefrDescriptor: "Can state a preference and give a simple reason.",
      prompt: "What is your favourite season? Tell me:\n• Which season you like best\n• One reason why you like it\n• One thing you do in that season",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Names a season (spring / summer / autumn / winter)",
        "Gives a reason using 'because'",
        "Mentions at least one seasonal activity",
        "3+ sentences attempted",
      ],
    },
  },

  // 22. Telling the time
  {
    cefrLevel: "A1", difficulty: -1.7, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "time", "vocabulary", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 10, responseTime: 45, productLine: "Primary (7-10)",
      cefrDescriptor: "Can say what time it is on an analogue clock face.",
      prompt: "Look at the clock picture.\n[EXAMINER: show a clock face showing 3:00]\nWhat time is it? Tell me.",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Says 'three o'clock' or 'it's three'",
        "Uses 'It is' or 'It's'",
        "Time is correct",
      ],
    },
  },

  // 23. My school bag
  {
    cefrLevel: "A1", difficulty: -1.6, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "classroom", "description", "primary", SEED_TAG],
    content: {
      taskType: "description", prepTime: 15, responseTime: 60, productLine: "Primary (7-10)",
      cefrDescriptor: "Can describe items in their school bag using 'I have' and basic nouns.",
      prompt: "Tell me what is in your school bag today. Say at least three things.\nUse: 'I have a ___ and a ___' or 'In my bag there is…'",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Names at least three items",
        "Uses 'I have' or 'There is/are'",
        "Items are relevant and recognisable school objects",
        "2+ sentences",
      ],
    },
  },

  // 24. Weekend activities
  {
    cefrLevel: "A1", difficulty: -1.6, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "leisure", "monologue", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 15, responseTime: 60, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can describe what they do at weekends in simple sentences.",
      prompt: "Tell me about your weekend. What do you usually do on Saturday and Sunday?\nTalk about at least two activities.",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Names at least two weekend activities",
        "Uses frequency adverbs (usually, sometimes, always) or day references (on Saturday)",
        "Uses present simple",
        "3+ sentences",
      ],
    },
  },

  // 25. Asking for information (roleplay: at a shop)
  {
    cefrLevel: "A1", difficulty: -1.5, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "roleplay", "shopping", "language-schools", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 15, responseTime: 75, productLine: "Language Schools",
      cefrDescriptor: "Can ask simple questions in a shop to find out price and availability.",
      prompt: "You are in a bookshop. The examiner is the shop assistant.\nYou want to buy a book for a friend who is 8 years old.\n• Say what you are looking for\n• Ask how much it costs\n• Say thank you and goodbye",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Opens interaction appropriately (excuse me / hello)",
        "Asks for a children's book",
        "Uses 'How much is it?' or 'How much does it cost?'",
        "Closes interaction politely",
      ],
    },
  },

  // 26. My best subject
  {
    cefrLevel: "A1", difficulty: -1.5, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "school", "opinion", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 15, responseTime: 60, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can express a simple preference for a school subject and give one reason.",
      prompt: "What is your favourite school subject? Tell me:\n• Which subject you like most\n• Why you like it\n• What you do in that class",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Names a school subject",
        "Uses 'I like ___ because…'",
        "Describes one activity in the class",
        "3+ sentences",
      ],
    },
  },

  // 27. Describing a friend
  {
    cefrLevel: "A1", difficulty: -1.4, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "personal", "description", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 20, responseTime: 75, productLine: "Language Schools",
      cefrDescriptor: "Can describe a person's appearance and personality in simple sentences.",
      prompt: "Tell me about a friend. Describe:\n• What they look like (hair, eyes, height)\n• One thing about their personality (funny, kind, quiet…)\n• One thing you do together",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Gives at least one physical description (hair colour, height)",
        "Uses one personality adjective",
        "Mentions a shared activity",
        "Uses 'He/She has / is' correctly",
      ],
    },
  },

  // 28. Food I like and don't like
  {
    cefrLevel: "A1", difficulty: -1.3, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "food", "likes-dislikes", "primary", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 15, responseTime: 60, productLine: "Primary (7-10)",
      cefrDescriptor: "Can say what food they like and do not like using simple sentences.",
      prompt: "Tell me about food. Say:\n• Two foods you like\n• One food you do not like\n• What your favourite meal is",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Names two liked foods",
        "Names one disliked food with 'I don't like'",
        "Names a favourite meal",
        "4+ utterances",
      ],
    },
  },

  // 29. My town or city
  {
    cefrLevel: "A1", difficulty: -1.2, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "places", "description", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 20, responseTime: 75, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can describe their local area using simple sentences about places.",
      prompt: "Tell me about the place where you live. Say:\n• The name of the city or town\n• One place you like to go there (park, shop, café)\n• One thing that is good about living there",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "Names the place they live",
        "Names a local place or attraction",
        "States something positive",
        "3+ sentences",
      ],
    },
  },

  // 30. How I go to school
  {
    cefrLevel: "A1", difficulty: -1.0, discrimination: 1.0, guessing: 0.0,
    tags: ["speaking", "a1", "transport", "monologue", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 20, responseTime: 75, productLine: "Language Schools",
      cefrDescriptor: "Can describe how they travel to school using simple sentences.",
      prompt: "Tell me how you get to school every day. Include:\n• How you travel (bus, car, on foot, bike)\n• How long it takes\n• Something you see or do on the way",
      scoringRubric: RUBRIC_A1,
      sampleBullets: [
        "States mode of transport",
        "Gives a time duration ('It takes ___ minutes')",
        "Mentions something on the journey",
        "3+ sentences using present simple",
      ],
    },
  },
];

// ─── Seed ──────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.DRY_RUN === "1") {
    console.log(`DRY_RUN: would insert ${items.length} SPEAKING items`);
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
  const validItems = validateOrExit(items, "seed-speaking-phase3");
  for (const item of validItems) {
    await prisma.item.create({
      data: {
        type: "SPEAKING_PROMPT",
        skill: "SPEAKING",
        cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: item.guessing,
        tags: [...item.tags],
        status: "ACTIVE",
        content: item.content as any,
      },
    });
    n++;
  }

  const pre_a1Count = items.filter(i => i.cefrLevel === "PRE_A1").length;
  const a1Count     = items.filter(i => i.cefrLevel === "A1").length;
  console.log(`Seed complete: ${n} SPEAKING items (PRE_A1: ${pre_a1Count}, A1: ${a1Count}) — ${SEED_TAG}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
