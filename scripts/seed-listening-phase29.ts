/**
 * LISTENING — Phase 29: SOTA Expansion (6 new modules)
 *
 * Modules:
 *   1. PRE_A1  "My Favourite Animal"          — child monologue      (5 Qs)
 *   2. PRE_A1  "At the Shop"                  — simple transaction   (5 Qs)
 *   3. A1      "After School"                 — two-friend dialogue  (5 Qs)
 *   4. B1      "The Job Interview"            — workplace dialogue   (5 Qs)
 *   5. C1      "The Crisis of Expertise"      — academic lecture     (5 Qs)
 *   6. C2      "A Debate on Linguistic Relativity" — panel discussion (5 Qs)
 *
 * All modules carry content.ttsScript for Gemini TTS audio generation.
 * Run: npx tsx scripts/generate-listening-audio-gemini.ts
 *
 *   npx tsx scripts/seed-listening-phase29.ts
 *   DRY_RUN=1 npx tsx scripts/seed-listening-phase29.ts
 *   FORCE=1 npx tsx scripts/seed-listening-phase29.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { installCreateGuard } from "./_validation-helper.js";
installCreateGuard(prisma, "seed-listening-phase29");
const SEED_TAG = "seed-listening-phase29";

// ══════════════════════════════════════════════════════════════════════════════
//  MODULE 1 — PRE_A1: "My Favourite Animal"
// ══════════════════════════════════════════════════════════════════════════════
const M1 = {
  id: "primary-listening-my-animal",
  title: "My Favourite Animal",
  cefr: "PRE_A1",
  line: "PRIMARY",
  dur: 40,
  ttsSettings: { languageCode: "en-US", voiceName: "Aoede", speakingRate: 0.78, pitch: 1.0, audioEncoding: "WAV" },
  humanScript: `[Maya — child, female, age 7]

My name is Maya. My favourite animal is a rabbit.
Rabbits are white and soft.
I have a rabbit. His name is Snowy.
Snowy eats carrots and lettuce.
I love Snowy!`,
  ttsScript: `My name is Maya. My favourite animal is a rabbit.
Rabbits are white and soft.
I have a rabbit. His name is Snowy.
Snowy eats carrots and lettuce.
I love Snowy.`,
  items: [
    {
      subskill: "detail", qn: 1, b: -2.8, a: 0.8, c: 0.25,
      prompt: "What is Maya's favourite animal?",
      opts: [
        { text: "A cat",      ok: false, r: "Maya does not mention a cat." },
        { text: "A rabbit",   ok: true,  r: "Maya says 'My favourite animal is a rabbit.'" },
        { text: "A dog",      ok: false, r: "A dog is not mentioned." },
        { text: "A fish",     ok: false, r: "A fish is not mentioned." },
      ],
    },
    {
      subskill: "detail", qn: 2, b: -2.7, a: 0.8, c: 0.25,
      prompt: "What colour are rabbits, according to Maya?",
      opts: [
        { text: "Brown",  ok: false, r: "Brown is not mentioned." },
        { text: "Grey",   ok: false, r: "Grey is not mentioned." },
        { text: "White",  ok: true,  r: "Maya says 'Rabbits are white and soft.'" },
        { text: "Black",  ok: false, r: "Black is not mentioned." },
      ],
    },
    {
      subskill: "detail", qn: 3, b: -2.6, a: 0.8, c: 0.25,
      prompt: "What is the name of Maya's rabbit?",
      opts: [
        { text: "Fluffy", ok: false, r: "Fluffy is not the name given." },
        { text: "Bunny",  ok: false, r: "Bunny is not the name given." },
        { text: "Snowy",  ok: true,  r: "Maya says 'His name is Snowy.'" },
        { text: "Cotton", ok: false, r: "Cotton is not the name given." },
      ],
    },
    {
      subskill: "detail", qn: 4, b: -2.5, a: 0.8, c: 0.25,
      prompt: "What does Snowy eat?",
      opts: [
        { text: "Apples and grass",    ok: false, r: "Not mentioned." },
        { text: "Bread and milk",      ok: false, r: "Not mentioned." },
        { text: "Fish and rice",       ok: false, r: "Not mentioned." },
        { text: "Carrots and lettuce", ok: true,  r: "Maya says 'Snowy eats carrots and lettuce.'" },
      ],
    },
    {
      subskill: "gist", qn: 5, b: -2.4, a: 0.8, c: 0.25,
      prompt: "What is Maya mainly talking about?",
      opts: [
        { text: "Her school",         ok: false, r: "School is not mentioned." },
        { text: "A cartoon rabbit",   ok: false, r: "Snowy is Maya's real pet." },
        { text: "A zoo she visited",  ok: false, r: "No zoo is mentioned." },
        { text: "Her favourite pet",  ok: true,  r: "Maya describes her rabbit and says it is her favourite animal." },
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
//  MODULE 2 — PRE_A1: "At the Shop"
// ══════════════════════════════════════════════════════════════════════════════
const M2 = {
  id: "primary-listening-at-the-shop",
  title: "At the Shop",
  cefr: "PRE_A1",
  line: "PRIMARY",
  dur: 42,
  ttsSettings: { languageCode: "en-US", voiceName: "Aoede", speakingRate: 0.80, pitch: 0.5, audioEncoding: "WAV" },
  humanScript: `[Shop Assistant — adult female | Tom — child, male, age 7]

Shop Assistant: Hello! What would you like?
Tom: Hello! I want an apple, please.
Shop Assistant: One apple. Here you are!
Tom: Thank you. How much is it?
Shop Assistant: It is fifty pence.
Tom: Thank you. Goodbye!
Shop Assistant: Goodbye!`,
  ttsScript: `Hello. What would you like?
Hello. I want an apple, please.
One apple. Here you are.
Thank you. How much is it?
It is fifty pence.
Thank you. Goodbye.
Goodbye.`,
  items: [
    {
      subskill: "detail", qn: 1, b: -2.8, a: 0.8, c: 0.25,
      prompt: "What does Tom want to buy?",
      opts: [
        { text: "A banana", ok: false, r: "Tom asks for an apple, not a banana." },
        { text: "An apple",  ok: true,  r: "Tom says 'I want an apple, please.'" },
        { text: "An orange", ok: false, r: "An orange is not mentioned." },
        { text: "A biscuit", ok: false, r: "A biscuit is not mentioned." },
      ],
    },
    {
      subskill: "detail", qn: 2, b: -2.7, a: 0.8, c: 0.25,
      prompt: "How much does the apple cost?",
      opts: [
        { text: "Twenty pence",  ok: false, r: "Twenty pence is not said." },
        { text: "One pound",     ok: false, r: "One pound is not said." },
        { text: "Fifty pence",   ok: true,  r: "The assistant says 'It is fifty pence.'" },
        { text: "Ten pence",     ok: false, r: "Ten pence is not said." },
      ],
    },
    {
      subskill: "detail", qn: 3, b: -2.6, a: 0.8, c: 0.25,
      prompt: "What does Tom say when he gets the apple?",
      opts: [
        { text: "Sorry",        ok: false, r: "Tom does not say sorry in this exchange." },
        { text: "Thank you",    ok: true,  r: "Tom says 'Thank you' after receiving the apple." },
        { text: "No thank you", ok: false, r: "Tom is accepting the apple, not refusing it." },
        { text: "Please",       ok: false, r: "Please is used in Tom's request, not after receiving the item." },
      ],
    },
    {
      subskill: "detail", qn: 4, b: -2.5, a: 0.8, c: 0.25,
      prompt: "Who is working in the shop?",
      opts: [
        { text: "A child",         ok: false, r: "Tom is the child customer; the assistant is an adult." },
        { text: "A man",           ok: false, r: "The shop assistant is described as a female adult." },
        { text: "An adult woman",  ok: true,  r: "The shop assistant is an adult female voice." },
        { text: "Tom's teacher",   ok: false, r: "No teacher is mentioned." },
      ],
    },
    {
      subskill: "gist", qn: 5, b: -2.4, a: 0.8, c: 0.25,
      prompt: "What is happening in this conversation?",
      opts: [
        { text: "Tom is at school",                ok: false, r: "The setting is a shop, not school." },
        { text: "Tom is buying something at a shop", ok: true,  r: "Tom asks for an apple, pays 50p, and leaves the shop." },
        { text: "Tom is talking to his mum",        ok: false, r: "The other person is a shop assistant, not Tom's mum." },
        { text: "Tom is ordering food at a café",   ok: false, r: "The context is a shop purchase, not a café order." },
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
//  MODULE 3 — A1: "After School"
// ══════════════════════════════════════════════════════════════════════════════
const M3 = {
  id: "primary-listening-after-school",
  title: "After School",
  cefr: "A1",
  line: "PRIMARY",
  dur: 55,
  ttsSettings: { languageCode: "en-US", voiceName: "Puck", speakingRate: 0.84, pitch: 0.5, audioEncoding: "WAV" },
  humanScript: `[Sam — child, male, age 10 | Lily — child, female, age 10]

Sam: Hey Lily! What are you doing after school today?
Lily: I have football practice at four o'clock. What about you?
Sam: I am going to the library. I need a book for my science project.
Lily: Cool! What is your project about?
Sam: It is about planets. I want to find a book about Mars.
Lily: I have a book about space at home. You can borrow it!
Sam: Really? That is great! Can I come to your house after your practice?
Lily: Yes! Practice finishes at five. Come at five thirty.
Sam: Perfect. See you then!`,
  ttsScript: `Hey Lily. What are you doing after school today?
I have football practice at four o'clock. What about you?
I am going to the library. I need a book for my science project.
Cool. What is your project about?
It is about planets. I want to find a book about Mars.
I have a book about space at home. You can borrow it.
Really? That is great. Can I come to your house after your practice?
Yes. Practice finishes at five. Come at five thirty.
Perfect. See you then.`,
  items: [
    {
      subskill: "detail", qn: 1, b: -1.6, a: 1.0, c: 0.25,
      prompt: "What does Lily do after school today?",
      opts: [
        { text: "Goes to the library",     ok: false, r: "Sam goes to the library, not Lily." },
        { text: "Does a science project",  ok: false, r: "The science project is Sam's task." },
        { text: "Has football practice",   ok: true,  r: "Lily says 'I have football practice at four o'clock.'" },
        { text: "Visits a friend's house", ok: false, r: "Sam plans to visit Lily after practice, not the other way." },
      ],
    },
    {
      subskill: "detail", qn: 2, b: -1.5, a: 1.0, c: 0.25,
      prompt: "What is Sam's science project about?",
      opts: [
        { text: "Animals",  ok: false, r: "Animals are not mentioned." },
        { text: "Planets",  ok: true,  r: "Sam says 'It is about planets.'" },
        { text: "Oceans",   ok: false, r: "Oceans are not mentioned." },
        { text: "Weather",  ok: false, r: "Weather is not mentioned." },
      ],
    },
    {
      subskill: "detail", qn: 3, b: -1.4, a: 1.0, c: 0.25,
      prompt: "Which planet does Sam want to read about?",
      opts: [
        { text: "Jupiter", ok: false, r: "Jupiter is not mentioned." },
        { text: "Venus",   ok: false, r: "Venus is not mentioned." },
        { text: "Saturn",  ok: false, r: "Saturn is not mentioned." },
        { text: "Mars",    ok: true,  r: "Sam says 'I want to find a book about Mars.'" },
      ],
    },
    {
      subskill: "detail", qn: 4, b: -1.3, a: 1.0, c: 0.25,
      prompt: "What time does Sam plan to arrive at Lily's house?",
      opts: [
        { text: "At four o'clock",     ok: false, r: "Four o'clock is when football practice starts." },
        { text: "At five o'clock",     ok: false, r: "Five o'clock is when practice ends, not when Sam arrives." },
        { text: "At five thirty",      ok: true,  r: "Lily says 'Come at five thirty.'" },
        { text: "At six o'clock",      ok: false, r: "Six o'clock is not mentioned." },
      ],
    },
    {
      subskill: "inference", qn: 5, b: -1.2, a: 1.0, c: 0.25,
      prompt: "Why is Sam going to Lily's house?",
      opts: [
        { text: "To have dinner with Lily's family",          ok: false, r: "Dinner is not mentioned." },
        { text: "To do football practice with Lily",          ok: false, r: "Sam is not doing football practice." },
        { text: "To borrow a book about space",               ok: true,  r: "Lily offers to lend Sam a book about space for the science project." },
        { text: "To return a book he borrowed before",        ok: false, r: "Sam has not previously borrowed anything; he is borrowing for the first time." },
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
//  MODULE 4 — B1: "The Job Interview"
// ══════════════════════════════════════════════════════════════════════════════
const M4 = {
  id: "corporate-listening-job-interview",
  title: "The Job Interview",
  cefr: "B1",
  line: "Corporate",
  dur: 105,
  ttsSettings: { languageCode: "en-US", voiceName: "Orus", speakingRate: 0.92, pitch: 0.0, audioEncoding: "WAV" },
  humanScript: `[Interviewer — HR Manager, female adult | Candidate — male adult, named Alex]

Interviewer: Good morning, Alex. Thank you for coming in today.
Alex: Good morning. It is a pleasure to be here.
Interviewer: Can you start by telling me a little about yourself and your current role?
Alex: Of course. I currently work as a customer service team leader at a retail company. I have been in that role for three years. Before that, I was a sales assistant for two years.
Interviewer: And why are you interested in this position at our company?
Alex: I have researched your company and I am impressed by your focus on sustainable practices. I would like to develop my career in an environment that matches my values. I also believe my experience managing a team of eight people would be valuable here.
Interviewer: That sounds relevant. Can you give me an example of how you handled a difficult situation with a customer?
Alex: Certainly. Last year, a customer complained that an order had arrived damaged. I apologised sincerely, arranged a replacement within 24 hours, and followed up to make sure they were satisfied. The customer later left a positive review.
Interviewer: Excellent. Do you have any questions for us?
Alex: Yes. Could you tell me more about the training opportunities available for new team members?
Interviewer: Absolutely. We offer a structured three-month induction and access to online learning courses throughout the year. We will send you full details.
Alex: That is very encouraging. Thank you.`,
  ttsScript: `Good morning, Alex. Thank you for coming in today.
Good morning. It is a pleasure to be here.
Can you start by telling me a little about yourself and your current role?
Of course. I currently work as a customer service team leader at a retail company. I have been in that role for three years. Before that, I was a sales assistant for two years.
And why are you interested in this position at our company?
I have researched your company and I am impressed by your focus on sustainable practices. I would like to develop my career in an environment that matches my values. I also believe my experience managing a team of eight people would be valuable here.
That sounds relevant. Can you give me an example of how you handled a difficult situation with a customer?
Certainly. Last year, a customer complained that an order had arrived damaged. I apologised sincerely, arranged a replacement within 24 hours, and followed up to make sure they were satisfied. The customer later left a positive review.
Excellent. Do you have any questions for us?
Yes. Could you tell me more about the training opportunities available for new team members?
Absolutely. We offer a structured three-month induction and access to online learning courses throughout the year. We will send you full details.
That is very encouraging. Thank you.`,
  items: [
    {
      subskill: "detail", qn: 1, b: -0.2, a: 1.1, c: 0.25,
      prompt: "How long has Alex been in his current role?",
      opts: [
        { text: "One year",    ok: false, r: "One year is not the duration given." },
        { text: "Two years",   ok: false, r: "Two years was his previous role as sales assistant." },
        { text: "Three years", ok: true,  r: "Alex says 'I have been in that role for three years.'" },
        { text: "Five years",  ok: false, r: "Five years is not mentioned." },
      ],
    },
    {
      subskill: "detail", qn: 2, b: -0.1, a: 1.1, c: 0.25,
      prompt: "Why does Alex want to work at this company?",
      opts: [
        { text: "The company pays more than his current employer.",            ok: false, r: "Salary is not mentioned." },
        { text: "He admires the company's focus on sustainable practices.",   ok: true,  r: "Alex says 'I am impressed by your focus on sustainable practices.'" },
        { text: "The office is closer to his home.",                          ok: false, r: "Location is not mentioned." },
        { text: "A friend recommended the company to him.",                   ok: false, r: "No recommendation is mentioned." },
      ],
    },
    {
      subskill: "detail", qn: 3, b: 0.1, a: 1.1, c: 0.25,
      prompt: "What did Alex do when a customer received a damaged order?",
      opts: [
        { text: "Offered a discount on the next order",   ok: false, r: "A discount is not mentioned." },
        { text: "Arranged a replacement within 24 hours", ok: true,  r: "Alex says he 'arranged a replacement within 24 hours.'" },
        { text: "Sent the customer a gift voucher",       ok: false, r: "A voucher is not mentioned." },
        { text: "Asked his manager to deal with it",      ok: false, r: "Alex handled the situation himself." },
      ],
    },
    {
      subskill: "detail", qn: 4, b: 0.2, a: 1.1, c: 0.25,
      prompt: "What question does Alex ask the interviewer?",
      opts: [
        { text: "About the starting salary",                          ok: false, r: "Salary is not asked about." },
        { text: "About training opportunities for new team members",  ok: true,  r: "Alex asks 'Could you tell me more about the training opportunities available for new team members?'" },
        { text: "About holiday entitlement",                          ok: false, r: "Holiday entitlement is not asked about." },
        { text: "About when he would start",                          ok: false, r: "A start date is not asked about." },
      ],
    },
    {
      subskill: "inference", qn: 5, b: 0.4, a: 1.1, c: 0.25,
      prompt: "How does Alex most likely feel at the end of the interview?",
      opts: [
        { text: "Disappointed by the training offer",  ok: false, r: "Alex says the training information is 'very encouraging.'" },
        { text: "Confused about the job requirements", ok: false, r: "Alex appears confident and well-prepared throughout." },
        { text: "Optimistic and encouraged",           ok: true,  r: "Alex says 'That is very encouraging' after hearing about training." },
        { text: "Nervous about his lack of experience", ok: false, r: "Alex demonstrates relevant experience and appears confident." },
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
//  MODULE 5 — C1: "The Crisis of Expertise"
// ══════════════════════════════════════════════════════════════════════════════
const M5 = {
  id: "academia-listening-crisis-expertise",
  title: "The Crisis of Expertise",
  cefr: "C1",
  line: "Academia",
  dur: 155,
  ttsSettings: { languageCode: "en-US", voiceName: "Fenrir", speakingRate: 0.90, pitch: 0.0, audioEncoding: "WAV" },
  humanScript: `[Lecturer — Professor of Science Communication, female adult]

Good afternoon, everyone. Today I want to explore what some scholars are calling the 'crisis of expertise' — the apparent erosion of public trust in specialists across fields as diverse as medicine, economics, and environmental science.

The first thing to note is that this is not purely a recent phenomenon. Distrust of elites has deep historical roots. What is new is the structural context in which that distrust now operates: decentralised media, filter bubbles, and the capacity for misinformation to achieve viral reach within hours.

Now, a common response to this crisis is to blame the public — to see declining deference to experts as a form of irrationality. I want to push back against that interpretation. Research in epistemology and science communication suggests that citizens often have perfectly legitimate reasons to be cautious. When experts disagree among themselves — as they visibly did during the early stages of the pandemic — and when institutional conflicts of interest are documented, scepticism is not irrational. It is arguably a rational response to genuine uncertainty.

The challenge, then, is not to restore blind deference, but to build what Philip Kitcher calls 'well-ordered science' — a system in which diverse public values genuinely shape the questions scientists pursue, and in which transparency about uncertainty is treated as a professional virtue rather than a liability.

I'll open for questions in about ten minutes. Before I do, I want to leave you with this provocation: perhaps the real crisis is not that the public trusts experts too little — it is that we have not yet designed institutions worthy of that trust.`,
  ttsScript: `Good afternoon, everyone. Today I want to explore what some scholars are calling the crisis of expertise — the apparent erosion of public trust in specialists across fields as diverse as medicine, economics, and environmental science.

The first thing to note is that this is not purely a recent phenomenon. Distrust of elites has deep historical roots. What is new is the structural context in which that distrust now operates: decentralised media, filter bubbles, and the capacity for misinformation to achieve viral reach within hours.

Now, a common response to this crisis is to blame the public — to see declining deference to experts as a form of irrationality. I want to push back against that interpretation. Research in epistemology and science communication suggests that citizens often have perfectly legitimate reasons to be cautious. When experts disagree among themselves — as they visibly did during the early stages of the pandemic — and when institutional conflicts of interest are documented, scepticism is not irrational. It is arguably a rational response to genuine uncertainty.

The challenge, then, is not to restore blind deference, but to build what Philip Kitcher calls well-ordered science — a system in which diverse public values genuinely shape the questions scientists pursue, and in which transparency about uncertainty is treated as a professional virtue rather than a liability.

I will open for questions in about ten minutes. Before I do, I want to leave you with this provocation: perhaps the real crisis is not that the public trusts experts too little — it is that we have not yet designed institutions worthy of that trust.`,
  items: [
    {
      subskill: "gist", qn: 1, b: 1.4, a: 1.25, c: 0.2,
      prompt: "What is the main argument the lecturer makes about public scepticism of experts?",
      opts: [
        { text: "It is a new and unprecedented social problem.",                                 ok: false, r: "The lecturer explicitly says distrust of elites has 'deep historical roots.'" },
        { text: "It is entirely caused by social media misinformation.",                         ok: false, r: "The lecturer identifies social media as a structural factor but not the sole cause." },
        { text: "It can be a rational response to genuine uncertainty and institutional flaws.", ok: true,  r: "The lecturer argues scepticism is 'arguably a rational response to genuine uncertainty' when experts disagree and conflicts of interest exist." },
        { text: "It should be addressed by better public education programmes.",                 ok: false, r: "Education is not proposed as the solution; institutional redesign is." },
      ],
    },
    {
      subskill: "detail", qn: 2, b: 1.5, a: 1.25, c: 0.2,
      prompt: "According to the lecturer, what is new about the current crisis of expertise?",
      opts: [
        { text: "The number of experts has declined sharply.",                                 ok: false, r: "Declining expert numbers are not mentioned." },
        { text: "The public is less educated than in previous generations.",                    ok: false, r: "Educational levels are not discussed." },
        { text: "Governments are refusing to fund scientific research.",                        ok: false, r: "Government funding is not mentioned." },
        { text: "The structural context — decentralised media and viral misinformation.",        ok: true,  r: "The lecturer says 'What is new is the structural context in which that distrust now operates.'" },
      ],
    },
    {
      subskill: "vocabulary-in-context", qn: 3, b: 1.6, a: 1.3, c: 0.2,
      prompt: "In the lecture, 'deference' to experts most likely means:",
      opts: [
        { text: "Respectful submission to expert authority",                   ok: true,  r: "'Blind deference' and 'declining deference' both suggest the act of submitting to or trusting authority." },
        { text: "Critical examination of expert claims",                       ok: false, r: "This describes the opposite of deference — scepticism." },
        { text: "The process by which experts are selected",                   ok: false, r: "Deference refers to public attitudes, not selection processes." },
        { text: "Formal academic qualifications held by an expert",            ok: false, r: "Qualifications are not what 'deference' refers to here." },
      ],
    },
    {
      subskill: "inference", qn: 4, b: 1.7, a: 1.3, c: 0.2,
      prompt: "What does the lecturer imply by 'institutions worthy of that trust'?",
      opts: [
        { text: "Institutions that pay scientists higher salaries.",                              ok: false, r: "Salaries are not mentioned." },
        { text: "Institutions that are transparent, accountable, and serve public values.",       ok: true,  r: "The lecturer's vision of 'well-ordered science' — transparent, value-shaped, accountable — defines what would make institutions trustworthy." },
        { text: "Institutions that publish all findings in popular media.",                        ok: false, r: "Media publishing is not the measure of institutional trustworthiness proposed." },
        { text: "Institutions that agree on all major scientific questions.",                      ok: false, r: "The lecturer acknowledges expert disagreement as inevitable; consensus is not the criterion." },
      ],
    },
    {
      subskill: "detail", qn: 5, b: 1.8, a: 1.35, c: 0.2,
      prompt: "Whose concept does the lecturer draw on to describe an ideal science system?",
      opts: [
        { text: "Karl Popper",       ok: false, r: "Popper is not mentioned in the lecture." },
        { text: "Philip Kitcher",    ok: true,  r: "The lecturer references 'what Philip Kitcher calls well-ordered science.'" },
        { text: "Thomas Kuhn",       ok: false, r: "Kuhn is not mentioned." },
        { text: "Jürgen Habermas",   ok: false, r: "Habermas is not mentioned." },
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
//  MODULE 6 — C2: "A Debate on Linguistic Relativity"
// ══════════════════════════════════════════════════════════════════════════════
const M6 = {
  id: "specialized-listening-linguistic-relativity",
  title: "A Debate on Linguistic Relativity",
  cefr: "C2",
  line: "Specialized / Integrated Skills",
  dur: 175,
  ttsSettings: { languageCode: "en-US", voiceName: "Umbriel", speakingRate: 0.92, pitch: 0.0, audioEncoding: "WAV" },
  humanScript: `[Dr Chen — cognitive linguist, female | Prof. Marchetti — philosopher of mind, male]

Dr Chen: The strong version of linguistic relativity — the Sapir-Whorf hypothesis in its most radical form — may well be untenable. But the claim that language shapes certain aspects of perception and categorisation has substantial empirical support, particularly in domains such as colour discrimination and spatial reasoning.

Prof. Marchetti: I would grant that, but I think the direction of causation is more ambiguous than your framing suggests. When Korean speakers process the distinction between kkita and nehta more rapidly than English speakers categorising similar spatial relationships, are we observing language shaping cognition, or pre-existing cognitive dispositions that happened to be grammaticalised in Korean?

Dr Chen: That is a fair methodological concern. But consider the evidence from time-space metaphors. Mandarin speakers, who frequently use vertical metaphors for time, show measurably different priming effects in temporal reasoning tasks compared to English speakers. The behavioural signature is there, even under paradigms that control for linguistic framing during the task itself.

Prof. Marchetti: Granted. But I would insist on a more deflationary reading. Language may modulate attention allocation — acting as a kind of cognitive tool that foregrounds certain distinctions — without constituting the underlying conceptual structure. The difference matters enormously for what we conclude about the universality of concepts.

Dr Chen: I think we are actually closer in position than the debate format implies. The interesting question is not whether language determines thought in some strong causal sense, but how language, culture, and cognition interact in a system of mutual constraint and facilitation.

Prof. Marchetti: On that, I think we can agree.`,
  ttsScript: `The strong version of linguistic relativity — the Sapir-Whorf hypothesis in its most radical form — may well be untenable. But the claim that language shapes certain aspects of perception and categorisation has substantial empirical support, particularly in domains such as colour discrimination and spatial reasoning.

I would grant that, but I think the direction of causation is more ambiguous than your framing suggests. When Korean speakers process the distinction between spatial categories more rapidly than English speakers, are we observing language shaping cognition, or pre-existing cognitive dispositions that happened to be grammaticalised in Korean?

That is a fair methodological concern. But consider the evidence from time-space metaphors. Mandarin speakers, who frequently use vertical metaphors for time, show measurably different priming effects in temporal reasoning tasks compared to English speakers. The behavioural signature is there, even under paradigms that control for linguistic framing during the task itself.

Granted. But I would insist on a more deflationary reading. Language may modulate attention allocation — acting as a kind of cognitive tool that foregrounds certain distinctions — without constituting the underlying conceptual structure. The difference matters enormously for what we conclude about the universality of concepts.

I think we are actually closer in position than the debate format implies. The interesting question is not whether language determines thought in some strong causal sense, but how language, culture, and cognition interact in a system of mutual constraint and facilitation.

On that, I think we can agree.`,
  items: [
    {
      subskill: "gist", qn: 1, b: 2.0, a: 1.4, c: 0.15,
      prompt: "What is Dr Chen's opening position?",
      opts: [
        { text: "That the strong Sapir-Whorf hypothesis is fully supported by evidence.", ok: false, r: "Dr Chen concedes the strong form 'may well be untenable.'" },
        { text: "That language has no measurable effect on perception.",                  ok: false, r: "Dr Chen argues the opposite — there is 'substantial empirical support.'" },
        { text: "That while the strong form is questionable, language does shape aspects of perception.", ok: true, r: "Dr Chen accepts the strong form may be untenable but defends a weaker form with empirical backing." },
        { text: "That colour discrimination is entirely cultural, not linguistic.",        ok: false, r: "Dr Chen cites colour discrimination as one domain of evidence, not as a purely cultural effect." },
      ],
    },
    {
      subskill: "inference", qn: 2, b: 2.1, a: 1.4, c: 0.15,
      prompt: "What is the core methodological objection Prof. Marchetti raises?",
      opts: [
        { text: "The studies cited by Dr Chen use unreliable instruments.",                          ok: false, r: "Marchetti does not dispute the instruments; he questions the causal interpretation." },
        { text: "It is unclear whether language causes the cognitive differences or merely reflects them.", ok: true, r: "Marchetti asks whether findings show 'language shaping cognition, or pre-existing cognitive dispositions that happened to be grammaticalised.'" },
        { text: "The Korean and Mandarin data sets are too small to be generalisable.",               ok: false, r: "Sample size is not raised as a concern." },
        { text: "Colour and spatial reasoning are too simple to draw broad conclusions from.",        ok: false, r: "Marchetti does not dismiss the domains; he questions the direction of causation." },
      ],
    },
    {
      subskill: "detail", qn: 3, b: 2.1, a: 1.4, c: 0.15,
      prompt: "What evidence does Dr Chen give concerning Mandarin speakers?",
      opts: [
        { text: "They categorise colours faster than English speakers.",                              ok: false, r: "Colour categorisation is mentioned in passing; the Mandarin evidence concerns time." },
        { text: "They use vertical metaphors for time and show different temporal reasoning effects.", ok: true,  r: "Dr Chen says 'Mandarin speakers, who frequently use vertical metaphors for time, show measurably different priming effects in temporal reasoning tasks.'" },
        { text: "They have larger working memory capacity for spatial tasks.",                         ok: false, r: "Working memory capacity is not discussed." },
        { text: "They outperform Korean speakers on all linguistic relativity tests.",                ok: false, r: "No comparison between Mandarin and Korean speakers is made." },
      ],
    },
    {
      subskill: "vocabulary-in-context", qn: 4, b: 2.2, a: 1.4, c: 0.15,
      prompt: "When Prof. Marchetti calls for a 'deflationary reading', he means:",
      opts: [
        { text: "Dismissing the research as methodologically unsound.",                         ok: false, r: "Marchetti does not reject the data; he reinterprets it." },
        { text: "A more modest, limited interpretation of what the evidence shows.",            ok: true,  r: "A 'deflationary reading' typically means interpreting findings in a less strong, more cautious way — language as tool rather than structure." },
        { text: "Reducing funding for linguistic relativity research.",                          ok: false, r: "'Deflationary' here is an epistemic term, not a budgetary one." },
        { text: "Accepting that language and thought are completely separate.",                  ok: false, r: "Marchetti accepts language modulates cognition; he just doesn't think it 'constitutes' conceptual structure." },
      ],
    },
    {
      subskill: "inference", qn: 5, b: 2.3, a: 1.4, c: 0.15,
      prompt: "What does the final exchange suggest about the speakers' actual positions?",
      opts: [
        { text: "They disagree fundamentally and the debate remains unresolved.",          ok: false, r: "Both speakers agree on the framing of the 'interesting question' at the end." },
        { text: "Dr Chen has conceded to Prof. Marchetti's view.",                         ok: false, r: "Dr Chen maintains her empirical claims; she reframes rather than concedes." },
        { text: "They are more closely aligned than the adversarial format suggested.",    ok: true,  r: "Dr Chen says 'we are actually closer in position than the debate format implies'; Marchetti agrees." },
        { text: "They will need a third expert to resolve their disagreement.",            ok: false, r: "No third expert is mentioned; they reach a point of agreement themselves." },
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
//  Seed
// ══════════════════════════════════════════════════════════════════════════════

const MODULES = [M1, M2, M3, M4, M5, M6];

async function main() {
  if (process.env.DRY_RUN === "1") {
    const total = MODULES.reduce((s, m) => s + m.items.length, 0);
    console.log(`DRY_RUN: would insert ${total} LISTENING items across ${MODULES.length} modules`);
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

  let totalCreated = 0;
  for (const mod of MODULES) {
    for (const qi of mod.items) {
      // Rotate key position across questions
      const slot = (qi.qn - 1) % 4;
      const opts = qi.opts.map((o, ui) => {
        const srcIdx = qi.opts.findIndex(x => x.ok);
        const rotated: typeof qi.opts = [];
        for (let i = 0; i < 4; i++) {
          const src = (i - slot + 4) % 4;
          rotated.push(qi.opts[src]);
        }
        return rotated;
      })[0];
      // Build rotated options
      const rotatedOpts = [];
      for (let i = 0; i < 4; i++) {
        const src = (i - slot + 4) % 4;
        rotatedOpts.push({
          text: qi.opts[src].text,
          isCorrect: qi.opts[src].ok,
          rationale: qi.opts[src].r,
        });
      }

      await prisma.item.create({
        data: {
          type: "MULTIPLE_CHOICE",
          skill: "LISTENING",
          cefrLevel: mod.cefr as any,
          difficulty: qi.b,
          discrimination: qi.a,
          guessing: qi.c,
          tags: ["listening", mod.cefr.toLowerCase().replace("_", "_"), mod.id, SEED_TAG],
          status: "ACTIVE",
          content: {
            moduleId: mod.id,
            productLine: mod.line,
            moduleTitle: mod.title,
            cefrBand: mod.cefr,
            estimatedDurationSeconds: mod.dur,
            numberOfSpeakers: mod.humanScript.match(/^\[/gm)?.length ?? 1,
            passage: mod.humanScript,
            ttsScript: mod.ttsScript,
            ttsSettings: mod.ttsSettings,
            subskill: qi.subskill,
            questionNumber: qi.qn,
            prompt: qi.prompt,
            options: rotatedOpts,
          } as any,
        },
      });
      totalCreated++;
    }
  }

  console.log(`Seed complete: ${totalCreated} LISTENING items across ${MODULES.length} modules — ${SEED_TAG}`);
  const byLevel = ["PRE_A1", "A1", "B1", "C1", "C2"].map(l => {
    const cnt = MODULES.filter(m => m.cefr === l).reduce((s, m) => s + m.items.length, 0);
    return `${l}: ${cnt}`;
  }).join(", ");
  console.log(`  Distribution: ${byLevel}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
