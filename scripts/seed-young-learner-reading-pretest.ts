#!/usr/bin/env tsx
/**
 * Curated Reading Question Pack (32 items) for:
 *   - Primary (7-10): 16 items (6 PRE_A1, 5 A1, 5 A2)
 *   - Secondary / Junior Suite (11-14): 16 items (2 A1, 5 A2, 4 B1, 5 B2)
 *
 * Designed to close, once calibrated, the remaining live (ACTIVE) minimum capacity gaps documented in
 * docs/quality/young-learner-expansion-plan-2026-11.md §16 and
 * docs/quality/young-learner-reading-items-2026-11.md.
 *
 * Items are seeded as PRETEST (isPretest, pipeline stage PILOT): they are
 * embedded unscored for calibration and become ACTIVE only when a calibrated
 * parameter version is published (calibration-policy.ts gates).
 *
 * Usage:
 *   npx tsx scripts/seed-young-learner-reading-pretest.ts            # dry-run + full structural/age-gate validation
 *   npx tsx scripts/seed-young-learner-reading-pretest.ts --apply    # upsert into database as PRETEST (embedded unscored until calibrated)
 */

import "dotenv/config";
import { validateItemStructure } from "../src/lib/validation/item-schema.js";
import { ageContextViolations, unanchoredNames } from "../src/lib/content-factory/age-context.js";

export interface YoungLearnerReadingSeed {
  itemCode: string;
  productLine: "primary" | "junior";
  ageSuitability: "YOUNG_LEARNER" | "TEEN";
  cefrLevel: "PRE_A1" | "A1" | "A2" | "B1" | "B2";
  type: "MULTIPLE_CHOICE" | "DRAG_DROP";
  subskill: string;
  genre: string;
  topic: string;
  difficulty: number;
  discrimination: number;
  guessing: number;
  construct: string;
  evidenceStatement: string;
  content: Record<string, any>;
}

const mcq = (
  productLine: "primary" | "junior",
  passage: string,
  question: string,
  options: Array<{ text: string; isCorrect: boolean; rationale: string }>,
) => {
  const correct = options.find((o) => o.isCorrect);
  return {
    productLine,
    passage,
    question,
    prompt: question,
    stem: question,
    options: options.map((o, idx) => ({ id: ["A", "B", "C", "D"][idx], ...o })),
    correctAnswer: correct?.text ?? "",
  };
};

export const YOUNG_LEARNER_READING_SEEDS: YoungLearnerReadingSeed[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PRIMARY (7-10) — PRE_A1 (6 items)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    itemCode: "PRI-REA-PREA1-2611-01",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "PRE_A1",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "narrative",
    topic: "family",
    difficulty: -2.2,
    discrimination: 1.15,
    guessing: 0.25,
    construct: "Locating a concrete colour attribute in a short familiar description",
    evidenceStatement: "Candidate distinguishes the colour linked to the target pet from three other colour-noun pairs in the text.",
    content: mcq(
      "primary",
      "Hi! My name is Mia. I have a big brown dog and a small white cat. My brother Leo has a green bird in his room. Today we are looking for our yellow ball in the garden.",
      "What colour is the cat?",
      [
        { text: "Brown", isCorrect: false, rationale: "Brown describes Mia's big dog, not her cat." },
        { text: "White", isCorrect: true, rationale: "The text explicitly says Mia has a small white cat." },
        { text: "Green", isCorrect: false, rationale: "Green describes Leo's bird, not the cat." },
        { text: "Yellow", isCorrect: false, rationale: "Yellow describes the ball in the garden, not the cat." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-PREA1-2611-02",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "PRE_A1",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "message",
    topic: "school",
    difficulty: -2.15,
    discrimination: 1.18,
    guessing: 0.25,
    construct: "Understanding basic prepositions of place in a classroom context",
    evidenceStatement: "Candidate identifies the location of the red book among four prepositional phrases present in the text.",
    content: mcq(
      "primary",
      "Look at Kenji's school desk. His blue pencil is next to the ruler. His red book is inside his bag, and his orange rubber is under the chair. His black pen is on the notebook.",
      "Where is Kenji's red book?",
      [
        { text: "Next to the ruler", isCorrect: false, rationale: "The blue pencil is next to the ruler, not the red book." },
        { text: "Inside his bag", isCorrect: true, rationale: "The text states that his red book is inside his bag." },
        { text: "Under the chair", isCorrect: false, rationale: "The orange rubber is under the chair, not the red book." },
        { text: "On the notebook", isCorrect: false, rationale: "The black pen is on the notebook, not the red book." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-PREA1-2611-03",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "PRE_A1",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "narrative",
    topic: "food",
    difficulty: -2.1,
    discrimination: 1.2,
    guessing: 0.25,
    construct: "Identifying affirmative vs negative statements about everyday food items",
    evidenceStatement: "Candidate tracks which food item Hana actually eats when negation ('does not want soup') is present.",
    content: mcq(
      "primary",
      "It is lunch time at home. Amara eats warm soup and bread. Her sister Hana does not want soup today; she eats pasta with cheese. Their dad drinks apple juice and eats a banana.",
      "What does Hana eat for lunch?",
      [
        { text: "Soup and bread", isCorrect: false, rationale: "Amara eats soup and bread, while Hana does not want soup." },
        { text: "Pasta with cheese", isCorrect: true, rationale: "The text says Hana eats pasta with cheese." },
        { text: "Apple juice", isCorrect: false, rationale: "Their dad drinks apple juice; Hana does not eat it." },
        { text: "A banana", isCorrect: false, rationale: "Their dad eats a banana, not Hana." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-PREA1-2611-04",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "PRE_A1",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "notice",
    topic: "toys",
    difficulty: -2.05,
    discrimination: 1.15,
    guessing: 0.25,
    construct: "Matching an object to its location in a short descriptive notice",
    evidenceStatement: "Candidate locates which toy is inside the big basket.",
    content: mcq(
      "primary",
      "Welcome to Toby's Toy Box! The toy train is on the top shelf. The teddy bear is in the big basket by the door. The red kite is behind the door, and the drum is on the mat.",
      "What is in the big basket?",
      [
        { text: "The toy train", isCorrect: false, rationale: "The toy train is on the top shelf, not in the basket." },
        { text: "The teddy bear", isCorrect: true, rationale: "The text states the teddy bear is in the big basket by the door." },
        { text: "The red kite", isCorrect: false, rationale: "The red kite is behind the door, not in the basket." },
        { text: "The drum", isCorrect: false, rationale: "The drum is on the mat, not in the basket." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-PREA1-2611-05",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "PRE_A1",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "narrative",
    topic: "clothes",
    difficulty: -2.0,
    discrimination: 1.2,
    guessing: 0.25,
    construct: "Distinguishing actions with clothing items in a short narrative",
    evidenceStatement: "Candidate identifies which item of clothing Omar gives to his sister.",
    content: mcq(
      "primary",
      "It is cold and sunny this morning. Omar puts on his purple coat and his grey boots. He leaves his yellow hat on the table and gives his green scarf to his sister Fatima.",
      "What does Omar give to his sister?",
      [
        { text: "His purple coat", isCorrect: false, rationale: "Omar puts on his purple coat himself." },
        { text: "His grey boots", isCorrect: false, rationale: "Omar puts on his grey boots himself." },
        { text: "His yellow hat", isCorrect: false, rationale: "Omar leaves his yellow hat on the table." },
        { text: "His green scarf", isCorrect: true, rationale: "The text says Omar gives his green scarf to his sister Fatima." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-PREA1-2611-06",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "PRE_A1",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "message",
    topic: "sports",
    difficulty: -1.95,
    discrimination: 1.18,
    guessing: 0.25,
    construct: "Matching a character to an action in a park scene text",
    evidenceStatement: "Candidate identifies which of the four named friends is kicking a football.",
    content: mcq(
      "primary",
      "In the park, four friends play games. Sofia rides her new bike on the path. Ravi kicks a football on the grass. Yuna flies a kite, and Dario sits on a bench and draws a tree.",
      "Who is kicking a football?",
      [
        { text: "Sofia", isCorrect: false, rationale: "Sofia is riding her new bike on the path." },
        { text: "Ravi", isCorrect: true, rationale: "The text explicitly says Ravi kicks a football on the grass." },
        { text: "Yuna", isCorrect: false, rationale: "Yuna is flying a kite in the park." },
        { text: "Dario", isCorrect: false, rationale: "Dario is sitting on a bench and drawing a tree." },
      ],
    ),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. PRIMARY (7-10) — A1 (5 items)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    itemCode: "PRI-REA-A1-2611-01",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A1",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "notice",
    topic: "school",
    difficulty: -1.5,
    discrimination: 1.22,
    guessing: 0.25,
    construct: "Extracting required items from a primary school club notice",
    evidenceStatement: "Candidate distinguishes what children must bring from materials provided by the club.",
    content: mcq(
      "primary",
      "SCHOOL ART CLUB. Come and paint animals with Miss Rosa! We meet every Wednesday after lessons in Room 4. On Monday, Room 4 is for the Music Club, and on Friday it is for the Chess Club. Please bring an old shirt and a pencil. We have paper, brushes, and paint for everyone.",
      "What do children need to bring to the Art Club?",
      [
        { text: "Brushes and paint", isCorrect: false, rationale: "The notice says the club already has brushes and paint for everyone." },
        { text: "White paper", isCorrect: false, rationale: "The club provides paper for everyone." },
        { text: "An old shirt and a pencil", isCorrect: true, rationale: "The notice explicitly asks children to bring an old shirt and a pencil." },
        { text: "A chess board", isCorrect: false, rationale: "Chess Club meets on Friday; no chess board is requested for Art Club." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-A1-2611-02",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A1",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "message",
    topic: "family",
    difficulty: -1.4,
    discrimination: 1.25,
    guessing: 0.25,
    construct: "Following positive and negative household instructions in a family note",
    evidenceStatement: "Candidate identifies the task Elias must perform before three o'clock while ruling out completed or negated tasks.",
    content: mcq(
      "primary",
      "Hi Elias, Mum and I are at the supermarket now. Your grandma is coming to our house at four o'clock. Before three o'clock, please put your clean shoes in the cupboard and feed the fish in the living room. Don't water the garden plants because Dad watered them this morning. See you soon, Nadia",
      "What must Elias do before three o'clock?",
      [
        { text: "Go to the supermarket", isCorrect: false, rationale: "Mum and Nadia are already at the supermarket." },
        { text: "Water the garden plants", isCorrect: false, rationale: "Nadia tells him not to water the plants because Dad already did." },
        { text: "Feed the fish in the living room", isCorrect: true, rationale: "Nadia asks Elias to put his shoes away and feed the fish before three o'clock." },
        { text: "Meet Grandma at the bus stop", isCorrect: false, rationale: "The message only says Grandma is coming to the house at four o'clock." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-A1-2611-03",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A1",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "narrative",
    topic: "animals",
    difficulty: -1.35,
    discrimination: 1.22,
    guessing: 0.25,
    construct: "Understanding simple cause and sequence in a past-tense story",
    evidenceStatement: "Candidate identifies why Kwame could not ride the brown horse at the farm.",
    content: mcq(
      "primary",
      "Last Saturday, Priya went to Sunrise Farm with her cousin Kwame. First, they gave carrots to three grey donkeys. Then a farmer showed them five baby ducks by the pond. Kwame wanted to ride a brown horse, but it was sleeping in the barn, so they watched the sheep instead.",
      "Why didn't Kwame ride the brown horse?",
      [
        { text: "It was eating carrots by the fence.", isCorrect: false, rationale: "Priya and Kwame gave carrots to the grey donkeys, not the horse." },
        { text: "It was swimming near the pond.", isCorrect: false, rationale: "The baby ducks were by the pond, not the horse." },
        { text: "It was sleeping in the barn.", isCorrect: true, rationale: "The text states that Kwame wanted to ride the brown horse, but it was sleeping in the barn." },
        { text: "It was running with the sheep.", isCorrect: false, rationale: "They watched the sheep because the horse was sleeping." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-A1-2611-04",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A1",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "notice",
    topic: "sports",
    difficulty: -1.3,
    discrimination: 1.24,
    guessing: 0.25,
    construct: "Understanding rules and age restrictions on a public pool sign",
    evidenceStatement: "Candidate identifies the rule that applies to all swimmers.",
    content: mcq(
      "primary",
      "SUNNY TOWN SWIMMING POOL. Small pool (ages 5 to 8): Open 9:00 a.m. to 12:00 p.m. Big pool (ages 9 and older): Open 10:00 a.m. to 4:00 p.m. Everyone must wear a blue or yellow swim cap in the water. Food and juice are only allowed at the picnic tables outside.",
      "What rule must all swimmers follow at Sunny Town Swimming Pool?",
      [
        { text: "Arrive before nine o'clock in the morning.", isCorrect: false, rationale: "The big pool opens at 10:00 a.m., and swimmers do not have to arrive before 9:00." },
        { text: "Wear a swim cap when they are in the water.", isCorrect: true, rationale: "The notice says everyone must wear a blue or yellow swim cap in the water." },
        { text: "Swim in the small pool if they are nine years old.", isCorrect: false, rationale: "Nine-year-olds use the big pool, while the small pool is for ages 5 to 8." },
        { text: "Keep their food and juice next to the pool.", isCorrect: false, rationale: "Food and juice are only allowed at the picnic tables outside." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-A1-2611-05",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A1",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "email",
    topic: "family",
    difficulty: -1.2,
    discrimination: 1.2,
    guessing: 0.25,
    construct: "Extracting key detail from a short personal invitation reply",
    evidenceStatement: "Candidate distinguishes the cake Leila actually made from the flavour Soren's brother dislikes.",
    content: mcq(
      "primary",
      "Dear Soren, Thank you for inviting me to your birthday party on Sunday! My mum can drive me to your house at two o'clock, right after my swimming lesson finishes at one. I made a chocolate cake with strawberries for you because I know your brother doesn't like lemon cake. Best wishes, Leila",
      "What is Leila bringing to Soren's birthday party?",
      [
        { text: "A lemon cake", isCorrect: false, rationale: "Leila says Soren's brother doesn't like lemon cake, so she did not make that." },
        { text: "A chocolate cake with strawberries", isCorrect: true, rationale: "Leila writes that she made a chocolate cake with strawberries for Soren." },
        { text: "A new swimming towel", isCorrect: false, rationale: "She mentions her swimming lesson at one o'clock, not bringing a towel as a gift." },
        { text: "A box of sandwiches", isCorrect: false, rationale: "Sandwiches are never mentioned in the email." },
      ],
    ),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PRIMARY (7-10) — A2 (5 items)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    itemCode: "PRI-REA-A2-2611-01",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "narrative",
    topic: "school",
    difficulty: -0.75,
    discrimination: 1.25,
    guessing: 0.25,
    construct: "Tracking chronological sequence of events when a plan changes",
    evidenceStatement: "Candidate identifies the immediate next action after the characters find the space room closed.",
    content: mcq(
      "primary",
      "Yesterday, Class 4B visited the City Science Museum. The teacher, Mr Jonas, told everyone to stay in pairs. Elif and Aiko went to the space room first because they wanted to see the moon rocks. However, the space room was closed until eleven o'clock for cleaning. Instead, they watched a short film about ocean animals and then built a small paper bridge in the invention corner. At eleven thirty, they finally saw the moon rocks before eating lunch on the bus.",
      "What did Elif and Aiko do right after they found the space room closed?",
      [
        { text: "They ate their lunch on the school bus.", isCorrect: false, rationale: "They ate lunch on the bus after seeing the moon rocks at 11:30." },
        { text: "They built a small paper bridge in the invention corner.", isCorrect: false, rationale: "They built the paper bridge after watching the film about ocean animals." },
        { text: "They watched a short film about ocean animals.", isCorrect: true, rationale: "The text says that instead of entering the closed space room, they watched a short film about ocean animals first and then built a bridge." },
        { text: "They waited outside the space room door until eleven thirty.", isCorrect: false, rationale: "They did not wait by the door; they went to watch a film and visit the invention corner." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-A2-2611-02",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "CAUSE_EFFECT_INFERENCE",
    genre: "email",
    topic: "holidays",
    difficulty: -0.65,
    discrimination: 1.28,
    guessing: 0.25,
    construct: "Identifying the cause of a schedule change in a holiday email",
    evidenceStatement: "Candidate links windy weather and rough water to the decision to do a forest treasure hunt instead of canoeing.",
    content: mcq(
      "primary",
      "Hi Mateo, We arrived at Pine Lake Camp on Tuesday evening. Our cabin is right next to the forest, and we can hear owls at night! On Wednesday morning, we planned to go canoeing on the lake, but the wind was too strong and the water was rough. Our guide, Finn, took us on a forest treasure hunt with compasses instead. Today the weather is calm and sunny, so we are finally taking the canoes out after breakfast. Write soon, Zara",
      "Why did Zara's group go on a forest treasure hunt on Wednesday morning?",
      [
        { text: "Because they lost their paddles near the cabin on Tuesday night.", isCorrect: false, rationale: "Paddles are not mentioned; the change of plan was due to windy weather." },
        { text: "Because strong wind made the lake unsafe for canoeing.", isCorrect: true, rationale: "The email explains that the wind was too strong and the water was rough, so Finn took them on a treasure hunt instead." },
        { text: "Because the guide wanted to teach them about owls in the forest.", isCorrect: false, rationale: "Zara hears owls at night near the cabin, not during the Wednesday morning hunt." },
        { text: "Because the canoes were only available after Thursday breakfast.", isCorrect: false, rationale: "They planned to canoe on Wednesday, and only postponed it because of the wind." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-A2-2611-03",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "notice",
    topic: "school",
    difficulty: -0.6,
    discrimination: 1.25,
    guessing: 0.25,
    construct: "Locating specific procedural requirements in a multi-bullet school notice",
    evidenceStatement: "Candidate identifies the reading diary requirement needed to record each finished book.",
    content: mcq(
      "primary",
      "GREENWOOD PRIMARY LIBRARY — SUMMER READING CHALLENGE. Read six books between 1 June and 15 July to win a gold star badge! You can borrow up to two storybooks and one comic book at the same time. Keep each book for up to ten days. For every book you finish, write three sentences about your favourite character in your reading diary and show it to Mrs Esther at the front desk. All books must come back to the library by Friday, 17 July.",
      "How do students get credit for finishing a book in the challenge?",
      [
        { text: "By returning all six books on the same day in July.", isCorrect: false, rationale: "Students borrow up to three books at a time and return everything by 17 July." },
        { text: "By drawing a picture of the book cover for their classroom wall.", isCorrect: false, rationale: "Drawing a book cover is not mentioned in the rules." },
        { text: "By writing three sentences in their reading diary and showing Mrs Esther.", isCorrect: true, rationale: "The notice states that for every book finished, students must write three sentences about their favourite character in their reading diary and show it to Mrs Esther." },
        { text: "By reading two comic books and one storybook every ten days.", isCorrect: false, rationale: "Students can borrow up to two storybooks and one comic book, not two comics." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-A2-2611-04",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "MAIN_IDEA",
    genre: "narrative",
    topic: "nature",
    difficulty: -0.5,
    discrimination: 1.26,
    guessing: 0.25,
    construct: "Drawing the main lesson from a short cause-and-effect story",
    evidenceStatement: "Candidate connects the fourth pot's growth after moving from a dark corner into the sun with plants needing sunlight.",
    content: mcq(
      "primary",
      "In March, Kofi's grandfather gave him a small packet of sunflower seeds. Kofi planted them in four pots on his balcony and watered them every evening. After two weeks, tiny green leaves appeared, except in the fourth pot, which stood in the dark corner behind a box. Kofi moved that pot into the sunshine next to the others. By June, all four plants had tall stems and bright yellow flowers taller than Kofi's head.",
      "What did Kofi learn from growing his sunflowers?",
      [
        { text: "Sunflower seeds only grow if you water them twice a day.", isCorrect: false, rationale: "Kofi watered them once every evening, and they grew well." },
        { text: "Young plants need sunlight as well as water to grow well.", isCorrect: true, rationale: "The fourth pot did not sprout in the dark corner until Kofi moved it into the sunshine alongside the watered pots." },
        { text: "Sunflowers grow much faster inside a dark room than on a balcony.", isCorrect: false, rationale: "The pot in the dark corner did not grow until moved into the sun." },
        { text: "Four seeds are too many to plant in the month of March.", isCorrect: false, rationale: "All four seeds planted in March grew into tall flowers by June." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-A2-2611-05",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "message",
    topic: "weekend",
    difficulty: -0.45,
    discrimination: 1.24,
    guessing: 0.25,
    construct: "Tracking participant roles in a family weekend schedule",
    evidenceStatement: "Candidate distinguishes who goes to the train station from who stays home to tidy.",
    content: mcq(
      "primary",
      "Saturday Family Plan — From Mum. Morning: Grandpa is arriving by train at 10:15. Dad and Luca are meeting him at the station, while Ines helps me tidy the guest bedroom. Afternoon: We are all having lunch at Harbor Cafe at 12:30. If it doesn't rain at 2:30, we will walk to the botanical garden. If it rains, we will visit the indoor aquarium next to the harbour instead.",
      "Who is going to the train station on Saturday morning?",
      [
        { text: "Mum and Ines", isCorrect: false, rationale: "Mum and Ines are staying home to tidy the guest bedroom." },
        { text: "Dad and Luca", isCorrect: true, rationale: "The note clearly states that Dad and Luca are meeting Grandpa at the station." },
        { text: "Ines and Luca", isCorrect: false, rationale: "Luca goes with Dad to the station, while Ines helps Mum at home." },
        { text: "Grandpa and Mum", isCorrect: false, rationale: "Grandpa is arriving on the train, and Mum is tidying the guest room." },
      ],
    ),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SECONDARY / JUNIOR SUITE (11-14) — A1 (2 items)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    itemCode: "JUN-REA-A1-2611-01",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "A1",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "notice",
    topic: "school clubs",
    difficulty: -1.35,
    discrimination: 1.22,
    guessing: 0.25,
    construct: "Identifying registration instructions on a secondary school notice",
    evidenceStatement: "Candidate locates the sign-up action required before Wednesday lunchtime.",
    content: mcq(
      "junior",
      "AFTER-SCHOOL DRAMA CLUB. Do you want to act or help with stage lights for our winter play? First meeting: Thursday at 3:45 p.m. in the Main Hall. (Note: Room 12 is closed this week for painting.) Sign your name on the list outside Mr Rafael's classroom before Wednesday lunchtime. No acting experience needed!",
      "What must students do before Wednesday lunchtime if they want to join?",
      [
        { text: "Go to Room 12 to meet Mr Rafael.", isCorrect: false, rationale: "Room 12 is closed for painting, and the meeting is on Thursday in the Main Hall." },
        { text: "Write their name on the list outside Mr Rafael's classroom.", isCorrect: true, rationale: "The notice instructs students to sign their name on the list outside Mr Rafael's classroom before Wednesday lunchtime." },
        { text: "Practise a short scene from the winter play.", isCorrect: false, rationale: "The notice says no acting experience is needed and doesn't ask for a scene." },
        { text: "Check the stage lights in the Main Hall.", isCorrect: false, rationale: "Helping with stage lights is one of the club activities, not a registration requirement before Wednesday." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-A1-2611-02",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "A1",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "message",
    topic: "free time",
    difficulty: -1.25,
    discrimination: 1.24,
    guessing: 0.25,
    construct: "Understanding a request and its reason in a short text message between teenagers",
    evidenceStatement: "Candidate identifies that Hiro remembered his helmet but left his knee pads at home.",
    content: mcq(
      "junior",
      "Hey Selin, Are you still coming to the skate park at 4:30? Hiro and I are leaving the library at 4:00. My bike has a flat tyre, so we're taking the Number 7 bus instead of cycling. Can you bring your spare knee pads for Hiro? He remembered his helmet, but he left his pads at home. — Oskar",
      "Why does Oskar ask Selin to bring knee pads?",
      [
        { text: "Because Oskar forgot both his helmet and his pads at the library.", isCorrect: false, rationale: "It is Hiro who left his pads at home, and Hiro remembered his helmet." },
        { text: "Because Hiro left his own knee pads at home.", isCorrect: true, rationale: "Oskar writes that Hiro remembered his helmet, but left his knee pads at home." },
        { text: "Because Selin needs them to ride Oskar's bicycle.", isCorrect: false, rationale: "Oskar's bike has a flat tyre, so they are taking the bus." },
        { text: "Because the skate park sells helmets but not knee pads.", isCorrect: false, rationale: "Buying gear at the skate park is never mentioned." },
      ],
    ),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SECONDARY / JUNIOR SUITE (11-14) — A2 (5 items)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    itemCode: "JUN-REA-A2-2611-01",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "notice",
    topic: "the library",
    difficulty: -0.7,
    discrimination: 1.25,
    guessing: 0.25,
    construct: "Understanding time-dependent rules in a secondary school library notice",
    evidenceStatement: "Candidate identifies how computer use downstairs changes after 4:30 p.m.",
    content: mcq(
      "junior",
      "OAKRIDGE SECONDARY LIBRARY — STUDY WEEK HOURS. From Monday 12 May to Friday 16 May, the library will stay open until 5:30 p.m. instead of closing at 4:00 p.m. Quiet Study Area (Upstairs): For individual homework only. No talking or group projects. Computer Tables (Downstairs): Open for group science presentations until 4:30 p.m. After 4:30 p.m., computers are reserved for printing study notes. Please show your student card at the desk if you stay after 4:00 p.m.",
      "What changes downstairs in the library after 4:30 p.m. during study week?",
      [
        { text: "Students can start working on group science presentations.", isCorrect: false, rationale: "Group science presentations are allowed until 4:30 p.m., not after." },
        { text: "The downstairs area closes while the upstairs stays open.", isCorrect: false, rationale: "The entire library stays open until 5:30 p.m." },
        { text: "The computers can only be used for printing study notes.", isCorrect: true, rationale: "The notice states that after 4:30 p.m., computers downstairs are reserved for printing study notes." },
        { text: "Students no longer need to show their student cards at the desk.", isCorrect: false, rationale: "Anyone staying after 4:00 p.m. must show their student card." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-A2-2611-02",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "email",
    topic: "sport",
    difficulty: -0.6,
    discrimination: 1.26,
    guessing: 0.25,
    construct: "Extracting logistical arrangements and reasons from a team email",
    evidenceStatement: "Candidate links the Elm Street drop-off instruction to the main car park closure for a weekend market.",
    content: mcq(
      "junior",
      "Subject: Saturday Inter-School Swimming Meet. Dear Team, Please arrive at Northside Sports Centre by 8:15 a.m. this Saturday. Our coach, Ms Ingrid, will hand out team caps at the entrance before warm-up starts at 8:30. Remember that the main car park is closed for a weekend market, so ask your parents to drop you off on Elm Street behind the tennis courts. Also, pack a warm tracksuit because the spectator benches are quite cool between races. — Thandi (Team Captain)",
      "Why should swimmers be dropped off on Elm Street on Saturday?",
      [
        { text: "Because the entrance near the tennis courts opens earlier than the main door.", isCorrect: false, rationale: "Opening times of different doors are not mentioned." },
        { text: "Because the main car park is being used for a weekend market.", isCorrect: true, rationale: "The email explicitly states that the main car park is closed for a weekend market." },
        { text: "Because Ms Ingrid is giving out team caps behind the tennis courts.", isCorrect: false, rationale: "Ms Ingrid will hand out caps at the entrance of the sports centre." },
        { text: "Because warm-up races are taking place on Elm Street at 8:15 a.m.", isCorrect: false, rationale: "Warm-up starts in the pool at 8:30 a.m." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-A2-2611-03",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "INFERENCE",
    genre: "message",
    topic: "music",
    difficulty: -0.55,
    discrimination: 1.28,
    guessing: 0.25,
    construct: "Identifying the communicative purpose of a group chat announcement",
    evidenceStatement: "Candidate recognises that Arnav's message relocates rehearsal to the small gym rather than cancelling it.",
    content: mcq(
      "junior",
      "Band Group Chat — Message from Arnav: Everyone, Mr Tobias just told me the music room has a leaky roof after last night's storm, so the caretakers are fixing it this afternoon. Don't pack up your instruments yet, though! Mrs Mei says we can use the small gym from 3:30 to 4:45 as long as we carry the drum kit back to the storage cupboard before the basketball team arrives at 5:00.",
      "Why is Arnav sending this message to the band members?",
      [
        { text: "To cancel today's band rehearsal until the roof is repaired next week.", isCorrect: false, rationale: "He tells them not to pack up because rehearsal is still happening in another room." },
        { text: "To let them know rehearsal is moving to the small gym today.", isCorrect: true, rationale: "Because the music room roof is being fixed, he informs them they will rehearse in the small gym from 3:30 to 4:45." },
        { text: "To ask who can stay after 5:00 p.m. to play basketball with the team.", isCorrect: false, rationale: "They must clear out before the basketball team arrives at 5:00." },
        { text: "To remind them to leave the drum kit in the music room during the storm.", isCorrect: false, rationale: "The storm was last night, and the drum kit must be put in the storage cupboard after rehearsal." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-A2-2611-04",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "email",
    topic: "holidays",
    difficulty: -0.5,
    discrimination: 1.25,
    guessing: 0.25,
    construct: "Following a problem-and-solution sequence in a travel email",
    evidenceStatement: "Candidate identifies how the family responded to the long queue at the Railway Museum.",
    content: mcq(
      "junior",
      "Hi Amina, My family and I are spending three days in York with my uncle Santiago. On our first day, we walked along the old city walls in the morning. My brother Emeka wanted to visit the Railway Museum right after lunch, but the queue outside was enormous. Instead, Uncle Santiago took us on a river boat tour, and we booked museum tickets online for tomorrow at 9:30 a.m. so we can go straight in when it opens! See you on Monday, Noor",
      "How did Noor's family solve the problem at the Railway Museum?",
      [
        { text: "They waited in the long queue for two hours after lunch.", isCorrect: false, rationale: "They did not wait in the queue; they went on a river boat tour instead." },
        { text: "They decided to walk along the old city walls instead of visiting it.", isCorrect: false, rationale: "They walked along the city walls in the morning, before going to the museum." },
        { text: "They went on a boat tour and booked early morning tickets online for the next day.", isCorrect: true, rationale: "Because the queue was huge, they took a river boat tour and booked online tickets for 9:30 a.m. tomorrow." },
        { text: "They asked Uncle Santiago to drive them to a smaller museum outside York.", isCorrect: false, rationale: "They still plan to visit the Railway Museum the next morning." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-A2-2611-05",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "TEXT_FUNCTION",
    genre: "notice",
    topic: "school",
    difficulty: -0.4,
    discrimination: 1.25,
    guessing: 0.25,
    construct: "Matching a practical problem to the correct station on an event poster",
    evidenceStatement: "Candidate maps a broken school bag strap to Table B ('Sewing torn backpacks').",
    content: mcq(
      "junior",
      "YEAR 8 REPAIR AND SWAP FAIR — THIS SATURDAY! Have you got board games with missing pieces, or a bicycle lamp that needs a new wire? Bring them to the school courtyard between 10:00 and 1:00! Table A (Science Club): Simple electronics and bike light repairs. Table B (Art Club): Sewing torn backpacks and decorating cloth bags. Table C (Swap Zone): Trade books and puzzles you have already finished for a different one (up to 3 items per student).",
      "Which table should a student visit if the strap on their school bag is broken?",
      [
        { text: "Table A, before 10:00 a.m.", isCorrect: false, rationale: "Table A repairs electronics and bike lights, and the fair starts at 10:00." },
        { text: "Table B, where the Art Club repairs backpacks.", isCorrect: true, rationale: "Table B handles sewing torn backpacks and decorating cloth bags." },
        { text: "Table C, to exchange it for three new textbooks.", isCorrect: false, rationale: "Table C is for trading books and puzzles, not school bags." },
        { text: "Both Table A and Table C at 1:00 p.m.", isCorrect: false, rationale: "Neither Table A nor Table C repairs torn backpacks." },
      ],
    ),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SECONDARY / JUNIOR SUITE (11-14) — B1 (4 items)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    itemCode: "JUN-REA-B1-2611-01",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B1",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "article",
    topic: "hobbies",
    difficulty: 0.15,
    discrimination: 1.3,
    guessing: 0.25,
    construct: "Identifying underlying causes in a school newspaper feature article",
    evidenceStatement: "Candidate extracts the two reasons commercial seed packets did not suit students (cost and excessive quantity for small balconies).",
    content: mcq(
      "junior",
      "Why Our School Started a Seed Library — By Marcus, Year 9 Student Reporter. Two years ago, our biology teacher, Ms Ayesha, noticed that half the vegetable beds behind the school gym were empty. Many students wanted to try growing food at home, too, but packets of seeds at the garden centre cost more than they expected, and each packet contained far more seeds than one family could use on a small balcony. Last autumn, our Eco-Club built a wooden cabinet near the main entrance and filled it with small paper envelopes. Each envelope holds just ten seeds — such as cherry tomatoes, basil, or dwarf beans — donated by local gardeners. Students take an envelope for free in spring. In return, when their plants produce vegetables in late summer, they dry a few seeds from their best plant and bring them back to the cabinet for next year's students.",
      "According to Marcus, why were commercially sold seed packets unsuitable for many students?",
      [
        { text: "They only contained vegetables that needed a large school greenhouse.", isCorrect: false, rationale: "The article mentions small balconies and vegetable beds behind the gym, not greenhouses." },
        { text: "They were expensive and held more seeds than one household needed.", isCorrect: true, rationale: "The first paragraph explains that seed packets cost more than students expected and contained far more seeds than one family could use." },
        { text: "Local garden centres refused to sell seeds to students under fourteen.", isCorrect: false, rationale: "Age restrictions at garden centres are never mentioned." },
        { text: "The seeds from garden centres could not be dried and saved for the following year.", isCorrect: false, rationale: "Saving seeds is how the school seed library works, not a flaw of commercial seeds." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-B1-2611-02",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B1",
    type: "MULTIPLE_CHOICE",
    subskill: "CAUSE_EFFECT_INFERENCE",
    genre: "blog",
    topic: "cooking",
    difficulty: 0.2,
    discrimination: 1.3,
    guessing: 0.25,
    construct: "Tracing a shift in attitude across paragraphs in a reflective blog post",
    evidenceStatement: "Candidate connects Lena's change of mind to her successfully cooking a family meal using the foundational skills.",
    content: mcq(
      "junior",
      "My First Term in Teen Kitchen Club — By Lena. When I signed up for the Thursday cooking class, I hoped we would bake fancy three-layer cakes every week. During the first month, however, Chef Tariq didn't let us touch the ovens at all. We spent four sessions learning how to chop onions safely, measure spices accurately, and prepare simple vegetable stir-fries in a single pan. I privately thought it was dull and almost quit in week three to join the photography club with my friend Chidi. Looking back now, I'm glad I stayed. Last weekend, my parents came home late from visiting my aunt, and I managed to cook a hot vegetable curry for the whole family in twenty-five minutes without burning anything or making a mess. Even my older brother Daniel asked for a second bowl!",
      "What made Lena change her mind about Chef Tariq's early lessons?",
      [
        { text: "Chef Tariq finally allowed the class to bake three-layer cakes in week four.", isCorrect: false, rationale: "She says they spent the first four sessions on chopping, spices, and stir-fries, not baking cakes." },
        { text: "Her friend Chidi told her that the photography club was much more difficult.", isCorrect: false, rationale: "Chidi is only mentioned as being in the photography club; he says nothing about its difficulty." },
        { text: "She realised those basic skills enabled her to cook a real meal for her family at home.", isCorrect: true, rationale: "In the second paragraph, she says she is glad she stayed because she successfully cooked a hot vegetable curry for her family in 25 minutes." },
        { text: "Her brother Daniel promised to wash the dishes whenever she cooked dinner.", isCorrect: false, rationale: "Daniel asked for a second bowl of curry, not to wash the dishes." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-B1-2611-03",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B1",
    type: "MULTIPLE_CHOICE",
    subskill: "INFERENCE",
    genre: "article",
    topic: "animals",
    difficulty: 0.25,
    discrimination: 1.32,
    guessing: 0.25,
    construct: "Understanding the rationale behind a scientific observation method",
    evidenceStatement: "Candidate explains why footprint tunnels are preferred over torchlight searches for nocturnal hedgehogs.",
    content: mcq(
      "junior",
      "Tracking Urban Hedgehogs. Every May, volunteers from Hillside Youth Nature Group help wildlife biologists count hedgehogs in town parks. Because hedgehogs look for beetles and worms after dark, searching for them with torches rarely works well and often frightens the animals into hiding under thick bushes. Instead, the teenagers place low plastic tunnels along wooden fences in the evening. Inside each tunnel, they put a small dish of meat-flavoured pet food between two strips of harmless vegetable charcoal and white paper tape. When a hedgehog walks through the tunnel to eat, its paws step on the charcoal and leave clear footprints on the paper strips. By checking the tunnels at dawn, students can tell whether hedgehogs visited an area without ever disturbing them.",
      "Why do the youth volunteers use footprint tunnels rather than torches to survey hedgehogs?",
      [
        { text: "Torches attract beetles and worms away from the park paths at night.", isCorrect: false, rationale: "Hedgehogs eat beetles and worms after dark; torches do not lure insects away." },
        { text: "Tunnels allow the team to detect hedgehogs at night without scaring them away.", isCorrect: true, rationale: "The text states that searching with torches rarely works and frightens the animals into hiding, whereas tunnels record footprints without disturbing them." },
        { text: "Biologists do not allow students under fifteen to enter town parks after sunset.", isCorrect: false, rationale: "The teenagers place the tunnels in the evening and check them at dawn; no age ban is mentioned." },
        { text: "Charcoal footprints show the exact age and weight of every hedgehog in the park.", isCorrect: false, rationale: "The text only says the footprints tell whether hedgehogs visited an area." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-B1-2611-04",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B1",
    type: "MULTIPLE_CHOICE",
    subskill: "WRITER_ATTITUDE",
    genre: "review",
    topic: "science",
    difficulty: 0.35,
    discrimination: 1.32,
    guessing: 0.25,
    construct: "Recognising balanced evaluation (praise plus minor criticism) in a review",
    evidenceStatement: "Candidate synthesises the reviewer's enthusiasm for the hands-on exhibits with his single complaint about noise near the headphones.",
    content: mcq(
      "junior",
      "Review: The Interactive Sound Exhibition at the City Museum — By Tobias, Age 13. Most museum exhibitions I have visited with my school consist of glass cases and long printed labels that nobody finishes reading. The new Waves and Voices exhibition on the second floor of the City Museum is a refreshing exception. From the moment you walk through the entrance tunnel, you are encouraged to tap giant metal tubes, whisper across curved dishes twenty metres apart, and watch coloured sand jump into geometric patterns on a vibrating speaker plate. My only complaint is that the headphone stations in the final room were placed too close to the giant drum experiment, making it hard to hear the quiet whale recordings when a large school group was in the hall. Apart from that minor layout flaw, it is easily the best way to spend a rainy Saturday afternoon.",
      "What is Tobias's overall opinion of the Waves and Voices exhibition?",
      [
        { text: "He thinks it has too many long printed labels compared with other museums.", isCorrect: false, rationale: "He contrasts this exhibition favourably against typical museums that have glass cases and long labels." },
        { text: "He is enthusiastic about its hands-on activities despite one noisy area.", isCorrect: true, rationale: "He calls it a refreshing exception full of interactive experiments and complains only that the headphone stations were too close to the giant drum." },
        { text: "He believes the museum should replace the giant drum experiment with more whale recordings.", isCorrect: false, rationale: "He critiques the placement and distance between the stations, not the drum experiment itself." },
        { text: "He recommends visiting only on weekdays when school groups are not allowed inside.", isCorrect: false, rationale: "He explicitly calls it the best way to spend a rainy Saturday afternoon." },
      ],
    ),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SECONDARY / JUNIOR SUITE (11-14) — B2 (5 items: 4 MCQ + 1 DRAG_DROP)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    itemCode: "JUN-REA-B2-2611-01",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B2",
    type: "MULTIPLE_CHOICE",
    subskill: "WRITER_ATTITUDE",
    genre: "review",
    topic: "films and books",
    difficulty: 0.9,
    discrimination: 1.35,
    guessing: 0.25,
    construct: "Distinguishing nuanced literary praise from criticism in a book review",
    evidenceStatement: "Candidate identifies that the reviewer praises how historical navigation details drive the plot suspense, while criticising the final bakery coincidence.",
    content: mcq(
      "junior",
      "Book Review: The Compass Maker's Apprentice by H. V. Lindqvist — Reviewed by Malia, Year 10. Many historical adventure novels written for young readers make the mistake of treating the past merely as a costume drama: characters wear cloaks and travel by horse, yet they think and speak exactly like twenty-first-century teenagers. To Lindqvist's credit, The Compass Maker's Apprentice avoids this trap entirely. Set in a windswept Baltic port in 1740, the story follows fourteen-year-old Soren as he learns to grind lenses and magnetise needles for sea captains. The technical details of navigation never feel like a history lesson pasted onto the page; instead, they drive the suspense when a forged sea chart puts his sister's ship in danger. Where the novel falters slightly is in its final fifty pages. After building tension patiently for ten chapters, Lindqvist resolves the harbour mystery with an implausible coincidence involving an overheard conversation at a bakery. Even so, the vivid sense of place makes the book hard to put down.",
      "What does Malia praise most about Lindqvist's writing in The Compass Maker's Apprentice?",
      [
        { text: "How the author uses modern teenage dialogue to make the 1740 setting easy to understand.", isCorrect: false, rationale: "Malia criticises other novels for doing that and praises Lindqvist for avoiding that trap." },
        { text: "The way historical craftsmanship is woven naturally into the plot's tension.", isCorrect: true, rationale: "Malia notes that the technical details of navigation never feel pasted on, but instead drive the suspense of the story." },
        { text: "The clever twist at the bakery that solves the harbour mystery in the final chapters.", isCorrect: false, rationale: "She criticises the bakery coincidence in the final fifty pages as implausible." },
        { text: "The detailed maps of Baltic sea routes printed at the start of every chapter.", isCorrect: false, rationale: "A forged sea chart is part of the story, not chapter illustrations." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-B2-2611-02",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B2",
    type: "MULTIPLE_CHOICE",
    subskill: "INFERENCE",
    genre: "blog",
    topic: "technology",
    difficulty: 0.95,
    discrimination: 1.35,
    guessing: 0.25,
    construct: "Inferring psychological cause-and-effect from an account of a design process",
    evidenceStatement: "Candidate infers from 'because redrawing a paper card takes ten seconds, nobody felt defensive' that low time investment reduced resistance to discarding weak ideas.",
    content: mcq(
      "junior",
      "What Happened When Our Coding Club Tried an Analogue Week — By Kenji, Coding Club President. When our mentor, Ms Rosa, challenged our twelve-member coding club to design our next puzzle game without touching a keyboard for five days, half the room groaned. Usually, we open our laptops the minute we sit down and begin tweaking colours or animations before we have even agreed on what the player is supposed to achieve. Armed only with index cards, coloured markers, and dice, we were forced to simulate every rule by hand across a classroom table. By Wednesday, something unexpected happened: we discovered three major flaws in our scoring system that would normally have taken us weeks of programming to notice. Because redrawing a paper card takes ten seconds, nobody felt defensive about throwing away a bad idea. When we finally opened our laptops the following Monday, we wrote cleaner code in two afternoons than we typically produce in a month.",
      "What can be inferred about why the paper-card phase made the students more willing to discard weak ideas?",
      [
        { text: "Ms Rosa awarded extra points to teams that threw away the largest number of index cards.", isCorrect: false, rationale: "No points or competition from Ms Rosa are mentioned." },
        { text: "Students had invested very little time in creating each paper prototype compared with coding it.", isCorrect: true, rationale: "Kenji notes that because redrawing a paper card takes ten seconds, nobody felt defensive about throwing away a bad idea, unlike when they spend weeks programming." },
        { text: "The twelve members voted anonymously on each card so nobody knew whose idea was rejected.", isCorrect: false, rationale: "Anonymous voting is never mentioned in the text." },
        { text: "The game's graphics and animations were already finished before the five-day challenge began.", isCorrect: false, rationale: "They had not touched their laptops for this new game before the five-day challenge." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-B2-2611-03",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B2",
    type: "MULTIPLE_CHOICE",
    subskill: "STANCE",
    genre: "opinion",
    topic: "homework",
    difficulty: 1.05,
    discrimination: 1.35,
    guessing: 0.25,
    construct: "Identifying an author's middle-ground argument against two polarised positions",
    evidenceStatement: "Candidate recognises that Elif rejects both extremes and proposes subject-specific differentiation between brief practice and three-week inquiry projects.",
    content: mcq(
      "junior",
      "Should Schools Replace Daily Homework with Longer Term Projects? — Opinion Column by Elif, School Newspaper Editor. Whenever the debate over homework resurfaces at student council meetings, the choices are usually framed as two extremes: either keep the nightly stream of twenty-minute worksheets, or abolish take-home tasks altogether. Both positions miss the real issue. Short reinforcement exercises have genuine value in subjects like mathematics or foreign languages, where practising a new structure the same evening helps lock it into memory. The problem arises when six different teachers assign short tasks on the same Tuesday, leaving students switching rapidly between surface-level checklists without ever exploring a topic in depth. A far more sensible reform would be to keep brief practice in skill-based subjects while replacing routine worksheets in history, science, and literature with a single, well-guided inquiry project every three weeks. That way, independent study becomes a chance to think deeply rather than a nightly race against the clock.",
      "Which statement best summarises Elif's position on school homework?",
      [
        { text: "All nightly homework should be abolished so students have more time for student council activities.", isCorrect: false, rationale: "Elif explicitly rejects abolishing homework altogether as an extreme that misses the real issue." },
        { text: "Homework format should match the subject, combining short skill practice with periodic deep projects.", isCorrect: true, rationale: "She argues for keeping brief practice in skill-based subjects like maths and languages while replacing routine worksheets in history, science, and literature with three-week inquiry projects." },
        { text: "Mathematics and language teachers should switch from daily exercises to three-week group essays.", isCorrect: false, rationale: "She specifically defends short nightly exercises in mathematics and foreign languages." },
        { text: "Teachers should assign worksheets only on Tuesdays so the rest of the week remains free.", isCorrect: false, rationale: "She cites Tuesday as an example of when six uncoordinated tasks pile up, not as a proposal." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-B2-2611-04",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B2",
    type: "MULTIPLE_CHOICE",
    subskill: "MEANING_FROM_CONTEXT",
    genre: "article",
    topic: "environment",
    difficulty: 1.1,
    discrimination: 1.34,
    guessing: 0.25,
    construct: "Interpreting idiomatic phrase meaning ('at odds') from surrounding discourse evidence",
    evidenceStatement: "Candidate uses the contrast between past glare problems and downward-shielded LEDs to interpret 'do not have to be at odds' as compatibility.",
    content: mcq(
      "junior",
      "The Quiet Return of Night-Sky Reserves. For decades, installing brighter street lamps was seen as an unmistakable sign of civic progress. Yet astronomers and ecologists have long pointed out that poorly shielded lights scatter much of their glare upwards into the clouds rather than onto the pavement below. This artificial glow disrupts nocturnal insects, confuses migrating songbirds, and washes out all but the brightest stars for young stargazers. Recently, however, several coastal towns have proven that dark skies and public safety do not have to be at odds. By fitting warm-toned LED fixtures with simple metal hoods that direct light strictly downwards — and dimming park lamps late at night when paths are empty — these towns have cut energy bills by a third while restoring a clear view of the Milky Way within months.",
      "In the second paragraph, what does the writer mean by saying that dark skies and public safety 'do not have to be at odds'?",
      [
        { text: "Towns must choose carefully between protecting migrating birds and lighting pavements at night.", isCorrect: false, rationale: "The writer argues the opposite — that towns do not have to choose one at the expense of the other." },
        { text: "Protecting the night sky and keeping streets safe can be achieved at the same time.", isCorrect: true, rationale: "'At odds' means in conflict; the paragraph explains how downward-hooded warm LEDs keep pavements lit safely while restoring a clear view of the Milky Way." },
        { text: "Coastal towns have much lower crime rates than inland cities with bright street lamps.", isCorrect: false, rationale: "Crime rates between coastal and inland towns are never compared." },
        { text: "Astronomers and town engineers still disagree strongly about the cost of LED hoods.", isCorrect: false, rationale: "The paragraph shows that the solution succeeded and even cut energy bills by a third." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-B2-2611-05",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B2",
    type: "DRAG_DROP",
    subskill: "SYNTHESIS",
    genre: "article",
    topic: "science",
    difficulty: 1.15,
    discrimination: 1.38,
    guessing: 0.1,
    construct: "Cross-text synthesis and attitude/experience matching across four speakers",
    evidenceStatement: "Candidate matches four students' science fair reflections to abstracted summaries while rejecting two plausible lexical distractors.",
    content: {
      productLine: "junior",
      format: "MATCHING",
      passage: [
        "Four Teenagers Talk About Their Science Fair Projects",
        "Speaker A — Dario: I built a solar-powered water heater out of black garden hose and an old window frame. At first I expected the afternoon sun to give the highest temperature, but my sensor logs showed that wind speed cooled the glass far more than cloud cover did. Shielding the box from the breeze doubled its efficiency.",
        "Speaker B — Yuna: My partner and I tested whether background music helps Year 7 students memorise vocabulary lists. The hardest part wasn't running the memory tests — it was making sure all three groups studied in rooms with identical lighting and time of day so our results would actually be fair.",
        "Speaker C — Kwame: I wanted to compare biodegradable plant pots made from pressed oat husks with standard plastic ones. Halfway through the six-week trial, two of my oat pots cracked because I watered them from above instead of using a tray underneath. That mistake actually gave me my best finding about how the material behaves.",
        "Speaker D — Ingrid: I programmed a simple microphone sensor to measure noise levels in our school canteen. Everyone assumed Mondays were the loudest, yet the data clearly showed that rainy days — when nobody could go outside after eating — pushed the decibel average up by nearly forty percent.",
      ].join("\n\n"),
      prompt: "Match each student with what they discovered or experienced during the science fair project. Two statements are not used.",
      question: "Match each student with what they discovered or experienced during the science fair project. Two statements are not used.",
      stem: "Match each student with what they discovered or experienced during the science fair project. Two statements are not used.",
      dropZones: [
        "Dario (Speaker A)",
        "Yuna (Speaker B)",
        "Kwame (Speaker C)",
        "Ingrid (Speaker D)",
      ],
      draggableItems: [
        "An accidental procedural error led to the most useful observation.",
        "Expensive laboratory sensors broke down halfway through the six-week experiment.",
        "An environmental factor other than sunlight had the biggest effect on performance.",
        "Students remembered more words when they listened to fast instrumental music.",
        "Controlling external conditions across test groups was the main challenge.",
        "Weather conditions disproved a popular assumption about which days were loudest.",
      ],
      correctMapping: {
        "0": 2,
        "1": 4,
        "2": 0,
        "3": 5,
      },
    },
  },
  {
    itemCode: "PRI-REA-PREA1-2611-07",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "PRE_A1",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "narrative",
    topic: "animals",
    difficulty: -1.9,
    discrimination: 1.18,
    guessing: 0.25,
    construct: "Matching an animal to its location in a short zoo description",
    evidenceStatement: "Candidate identifies which of the four animals is in the blue water.",
    content: mcq(
      "primary",
      "At the zoo, Chidi sees four animals. The tall giraffe eats green leaves from a tree. The monkey holds a yellow banana. The hippo sleeps in the blue water, and the parrot sits on a brown branch.",
      "Which animal is in the blue water?",
      [
        { text: "The giraffe", isCorrect: false, rationale: "The giraffe is eating green leaves from a tree." },
        { text: "The monkey", isCorrect: false, rationale: "The monkey is holding a yellow banana." },
        { text: "The hippo", isCorrect: true, rationale: "The text states that the hippo sleeps in the blue water." },
        { text: "The parrot", isCorrect: false, rationale: "The parrot sits on a brown branch." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-PREA1-2611-08",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "PRE_A1",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "message",
    topic: "home",
    difficulty: -1.85,
    discrimination: 1.18,
    guessing: 0.25,
    construct: "Locating household objects using prepositional phrases",
    evidenceStatement: "Candidate locates Yuki's green umbrella among four room/place locations.",
    content: mcq(
      "primary",
      "Welcome to Yuki's house! Her red bike is in the garden. Her school bag is on the kitchen chair. Her green umbrella is by the front door, and her guitars are in the bedroom.",
      "Where is Yuki's green umbrella?",
      [
        { text: "In the garden", isCorrect: false, rationale: "Her red bike is in the garden, not the umbrella." },
        { text: "On the kitchen chair", isCorrect: false, rationale: "Her school bag is on the kitchen chair." },
        { text: "By the front door", isCorrect: true, rationale: "The text says her green umbrella is by the front door." },
        { text: "In the bedroom", isCorrect: false, rationale: "Her guitars are in the bedroom." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-A2-2611-06",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "SPECIFIC_INFORMATION",
    genre: "notice",
    topic: "sports",
    difficulty: -0.4,
    discrimination: 1.25,
    guessing: 0.25,
    construct: "Extracting equipment borrowing instructions from a children's sports notice",
    evidenceStatement: "Candidate identifies the blue tent near the gate as the place to borrow a tennis racket.",
    content: mcq(
      "primary",
      "JUNIOR TENNIS DAY AT PARKSIDE COURTS. Saturday 20 June — For children aged 7 to 10! 9:30 a.m.: Beginners' games on Court 1 with Coach Rosa. 11:00 a.m.: Short matches on Court 2 for players who took lessons last term. Please wear white sports shoes on the courts. If you do not have a tennis racket, you can borrow one for free at the blue tent near the gate. Bring your own water bottle!",
      "Where can a child get a tennis racket on Junior Tennis Day?",
      [
        { text: "On Court 1 from Coach Rosa at 9:30 a.m.", isCorrect: false, rationale: "Coach Rosa runs beginners' games on Court 1, not racket lending." },
        { text: "On Court 2 after the short matches finish.", isCorrect: false, rationale: "Court 2 is for 11:00 a.m. matches." },
        { text: "At the blue tent near the gate.", isCorrect: true, rationale: "The notice states that children without a racket can borrow one for free at the blue tent near the gate." },
        { text: "At the sports shoe shop next to the park.", isCorrect: false, rationale: "No shoe shop is mentioned in the notice." },
      ],
    ),
  },
  {
    itemCode: "PRI-REA-A2-2611-07",
    productLine: "primary",
    ageSuitability: "YOUNG_LEARNER",
    cefrLevel: "A2",
    type: "MULTIPLE_CHOICE",
    subskill: "EXPLICIT_DETAIL",
    genre: "narrative",
    topic: "school",
    difficulty: -0.35,
    discrimination: 1.25,
    guessing: 0.25,
    construct: "Understanding cause and effect in a classroom craft narrative",
    evidenceStatement: "Candidate identifies the lack of green cloth in the art box as the reason Tariq made a space robot instead of a dragon.",
    content: mcq(
      "primary",
      "On Friday afternoon, Class 3A made puppets for their puppet theatre show. Tariq wanted to make a green dragon, but there was no green cloth left in the art box. His friend Mei gave him a piece of silver paper, so Tariq made a shiny space robot instead. Meanwhile, Mei sewed a brown owl with big yellow eyes, and Daniel painted a cardboard castle for the stage background.",
      "Why did Tariq make a space robot instead of a dragon?",
      [
        { text: "Because Daniel needed the dragon for the cardboard castle.", isCorrect: false, rationale: "Daniel painted the castle background; he didn't use a dragon." },
        { text: "Because all the green cloth in the art box was gone.", isCorrect: true, rationale: "The text states there was no green cloth left in the art box, so he used silver paper from Mei to make a robot." },
        { text: "Because Mei asked him to make a robot to go with her owl.", isCorrect: false, rationale: "Mei gave him silver paper, and sewed a brown owl for herself." },
        { text: "Because the teacher said dragons were too difficult to sew.", isCorrect: false, rationale: "The teacher is not mentioned in the passage." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-B2-2611-06",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B2",
    type: "MULTIPLE_CHOICE",
    subskill: "CAUSE_EFFECT_INFERENCE",
    genre: "article",
    topic: "nature",
    difficulty: 1.18,
    discrimination: 1.35,
    guessing: 0.25,
    construct: "Tracing unintended environmental consequences in a science article",
    evidenceStatement: "Candidate identifies that straightened channels caused storm water from the entire valley to arrive at downstream town bridges simultaneously.",
    content: mcq(
      "junior",
      "Why Rewinding a River Helps Prevent Flooding Downstream. In the nineteenth century, engineers straightened dozens of winding streams across northern valleys so that rainwater would rush out of farmland as quickly as possible. While those concrete-lined channels kept upper fields dry after moderate showers, they created an unforeseen hazard for towns further down the valley: during heavy autumn storms, all the water arrived at the town bridges at the exact same moment. Over the past five years, youth conservation volunteers and hydrologists have helped restore several streams to their original curving paths. By re-establishing shallow bends, pebble banks, and marshy meadows alongside the water, the restoration slows the current down and lets excess rain spread harmlessly across uninhabited grassland for a few hours. Early monitoring shows that peak water levels at downstream bridges have dropped by almost a quarter during major storms.",
      "Why did nineteenth-century river straightening increase flood risk for downstream towns?",
      [
        { text: "Concrete channels blocked rainwater from leaving the upper farmland after moderate showers.", isCorrect: false, rationale: "The channels drained the upper fields quickly; they did not block rainwater there." },
        { text: "Straight channels forced storm water from the whole valley to reach town bridges simultaneously.", isCorrect: true, rationale: "The first paragraph explains that straightening caused all the storm water to arrive at downstream town bridges at the exact same moment." },
        { text: "Pebble banks and marshy meadows built in the nineteenth century collapsed during autumn storms.", isCorrect: false, rationale: "Pebble banks and meadows are part of the modern restoration, not nineteenth-century engineering." },
        { text: "Towns built new bridges that were a quarter narrower than the original river channels.", isCorrect: false, rationale: "Peak water levels dropped by a quarter after restoration; bridge width is not mentioned." },
      ],
    ),
  },
  {
    itemCode: "JUN-REA-B2-2611-07",
    productLine: "junior",
    ageSuitability: "TEEN",
    cefrLevel: "B2",
    type: "MULTIPLE_CHOICE",
    subskill: "IMPLIED_MEANING",
    genre: "review",
    topic: "music",
    difficulty: 1.22,
    discrimination: 1.36,
    guessing: 0.25,
    construct: "Inferring artistic rationale from a concert review",
    evidenceStatement: "Candidate infers that playing lesser-known suites freed the orchestra from note-for-note comparison with famous soundtrack recordings.",
    content: mcq(
      "junior",
      "Concert Review: The Regional Youth Orchestra at Civic Hall — By Nadia, Year 10 Music Columnist. Performing film soundtracks live is trickier than it looks: because audiences already know every melody by heart from the cinema, even a slight hesitation in tempo stands out immediately. Rather than playing it safe with a predictable programme of blockbuster themes, conductor Mr Jonas and the sixty teenagers of the Regional Youth Orchestra opened Saturday's concert with three lesser-known suites for strings and percussion from animated short films. That bold choice paid off handsomely. Freed from the pressure of imitating famous recordings note for note, the percussion section played with infectious energy, and fourteen-year-old flautist Aiko delivered a solo of remarkable warmth in the second piece. Only in the final encore — a well-known space-adventure march added at the last minute — did the brass section sound slightly hurried, a minor blemish on an otherwise memorable evening.",
      "What does Nadia suggest was the main advantage of opening the concert with lesser-known film suites?",
      [
        { text: "The sixty musicians had not had enough rehearsal time to learn famous blockbuster themes.", isCorrect: false, rationale: "Only the final encore was added at the last minute; the opening suites were a deliberate artistic choice." },
        { text: "The orchestra could play more expressively because listeners were not comparing every bar to a familiar recording.", isCorrect: true, rationale: "Nadia notes that audiences know famous soundtracks by heart, and opening with lesser-known suites freed the players from the pressure of imitating famous recordings note for note." },
        { text: "Short animated film suites do not require a brass section or a conductor on stage.", isCorrect: false, rationale: "Mr Jonas conducted the orchestra, and the brass section was present." },
        { text: "The audience in Civic Hall preferred space-adventure marches to string and percussion music.", isCorrect: false, rationale: "Nadia praises the string and percussion suites and notes the space-adventure march was the only piece that sounded hurried." },
      ],
    ),
  },
];

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  let failures = 0;

  for (const item of YOUNG_LEARNER_READING_SEEDS) {
    const structErrors = validateItemStructure("READING", item.content);
    const ageHits = ageContextViolations(item.content, item.ageSuitability);
    const unanchored = unanchoredNames(item.content);
    if (structErrors.length || ageHits.length || unanchored.length) {
      failures++;
      console.error(`❌ ${item.itemCode}:`, { structErrors, ageHits, unanchored });
    }
  }

  const byGroup = YOUNG_LEARNER_READING_SEEDS.reduce<Record<string, number>>((acc, it) => {
    const key = `${it.productLine}/${it.cefrLevel}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Validated ${YOUNG_LEARNER_READING_SEEDS.length} items (${failures} failures):`, byGroup);
  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  if (!apply) {
    console.log("Dry run complete (0 errors). Pass --apply to upsert into database as PRETEST (embedded unscored until calibrated).");
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const now = new Date().toISOString();
    let upserted = 0;
    for (const item of YOUNG_LEARNER_READING_SEEDS) {
      const tags = ["READING", item.cefrLevel, item.subskill, item.genre, item.topic, item.productLine];
      const metadata = {
        paramSource: "prior",
        paramClassifiedAt: now,
        provisionalActivation: {
          policyVersion: "yl-reading-pack-2026-11-21",
          mode: "active",
          reviewBypassed: false,
          paramsSource: "CEFR_PRIOR",
          calibrationPending: true,
          activatedAt: now,
        },
      };
      await db.item.upsert({
        where: { itemCode: item.itemCode },
        update: {
          type: item.type as any,
          skill: "READING" as any,
          cefrLevel: item.cefrLevel as any,
          difficulty: item.difficulty,
          discrimination: item.discrimination,
          guessing: item.guessing,
          content: item.content as any,
          tags,
          status: "PRETEST" as any,
          isPretest: true,
          pipelineStage: "PILOT" as any,
          subskill: item.subskill,
          genre: item.genre,
          topic: item.topic,
          construct: item.construct,
          evidenceStatement: item.evidenceStatement,
          ageSuitability: item.ageSuitability as any,
          culturalLoad: "LOW",
          englishVariant: "INTERNATIONAL",
          metadata: metadata as any,
        },
        create: {
          itemCode: item.itemCode,
          type: item.type as any,
          skill: "READING" as any,
          cefrLevel: item.cefrLevel as any,
          difficulty: item.difficulty,
          discrimination: item.discrimination,
          guessing: item.guessing,
          content: item.content as any,
          tags,
          status: "PRETEST" as any,
          isPretest: true,
          pipelineStage: "PILOT" as any,
          subskill: item.subskill,
          genre: item.genre,
          topic: item.topic,
          construct: item.construct,
          evidenceStatement: item.evidenceStatement,
          ageSuitability: item.ageSuitability as any,
          culturalLoad: "LOW",
          englishVariant: "INTERNATIONAL",
          securityClass: "ASSESSMENT",
          provenance: "ORIGINAL_AI_ASSISTED",
          metadata: metadata as any,
        },
      });
      upserted++;
    }
    console.log(`✅ Upserted ${upserted} PRETEST reading items into database.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
