/**
 * LISTENING PHASE 27 — B1/A2 Gap-fill
 * Modules: 4 passages × 5 MC items = 20 items
 * SEED_TAG: "seed-listening-phase27"
 * Distribution: B1=15, A2=5
 *
 * Module A — B1: "Community Garden Meeting" (neighbourhood discussion)
 * Module B — B1: "Job Interview — Customer Support" (workplace)
 * Module C — B1: "Travel Documentary Excerpt" (holiday / life-skills)
 * Module D — A2: "Booking a Restaurant" (everyday phone call)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { installCreateGuard } from "./_validation-helper.js";
installCreateGuard(prisma, "seed-listening-phase27");

const SEED_TAG = "seed-listening-phase27";
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE   = process.env.FORCE   === "1";

// ─── MODULE A: Community Garden Meeting — B1 ─────────────────────────────
const MOD_A_ID    = "langschool-community-garden-b1";
const MOD_A_TITLE = "Community Garden — Neighbourhood Planning Meeting";
const MOD_A_SCRIPT = `[Neighbourhood meeting — Chair: Sandra (female adult, local resident); Members: Tom (male adult) and Aisha (female adult)]

Sandra: Right, let's get started. As you all know, we've had a proposal from the council to convert the old car park on Hill Street into a community garden. I want to hear your views.

Tom: I think it's a great idea. The area really needs more green space. At the moment, kids have nowhere safe to play outdoors, and a garden would fix that.

Aisha: I agree with Tom in principle, but I have some practical concerns. Who is going to manage it? Community gardens need regular maintenance — watering, weeding, keeping it tidy. If the council just creates the space and then walks away, it will turn into an eyesore within a year.

Sandra: That's a fair point. The proposal does mention a volunteer group, but it's not clear how many people have committed.

Tom: I'd be happy to help out. I can give up a Saturday morning once a month.

Aisha: Me too, but I think we need a proper structure — someone in charge, a rota, a small budget for tools and plants.

Sandra: Okay, so the main concerns are management and funding. I'll take those back to the council. One more thing — the car park is used by the supermarket on weekdays. We need to agree on opening hours that don't disrupt that.

Tom: What about keeping the back section as parking? That way we keep the supermarket happy and still get most of the garden.

Aisha: That sounds like a reasonable compromise to me.`;

const MOD_A_ITEMS = [
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'topic', MOD_A_ID],
    content: {
      moduleId: MOD_A_ID, productLine: 'Language Schools', moduleTitle: MOD_A_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 3,
      speakers: ['Sandra (chair, female adult)', 'Tom (male adult)', 'Aisha (female adult)'],
      passage: MOD_A_SCRIPT,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What is the council\'s proposal that the meeting is discussing?',
      options: [
        { text: 'Converting a car park into a community garden',  isCorrect: true,  rationale: 'Sandra: "we\'ve had a proposal from the council to convert the old car park on Hill Street into a community garden."' },
        { text: 'Building a new car park on Hill Street',         isCorrect: false, rationale: 'The proposal is to replace a car park, not build one.' },
        { text: 'Closing the supermarket on weekdays',           isCorrect: false, rationale: 'The supermarket issue is secondary; the main proposal is the garden.' },
        { text: 'Creating a children\'s play area in the park',  isCorrect: false, rationale: 'Tom mentions children, but the proposal is for a community garden, not specifically a play area.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'aisha-concern', MOD_A_ID],
    content: {
      moduleId: MOD_A_ID, productLine: 'Language Schools', moduleTitle: MOD_A_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 3,
      speakers: ['Sandra (chair, female adult)', 'Tom (male adult)', 'Aisha (female adult)'],
      passage: MOD_A_SCRIPT,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What is Aisha\'s main concern about the community garden proposal?',
      options: [
        { text: 'Who will manage and maintain it',                          isCorrect: true,  rationale: 'Aisha: "Community gardens need regular maintenance… If the council just creates the space and then walks away, it will turn into an eyesore."' },
        { text: 'The cost to local residents',                              isCorrect: false, rationale: 'Cost to residents is not Aisha\'s concern — she mentions a budget for tools but not personal cost.' },
        { text: 'The noise it will create for nearby residents',            isCorrect: false, rationale: 'Noise is not mentioned.' },
        { text: 'Whether the location is safe for children',               isCorrect: false, rationale: 'Safety for children is Tom\'s argument for the garden, not Aisha\'s concern.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'tom-volunteer', MOD_A_ID],
    content: {
      moduleId: MOD_A_ID, productLine: 'Language Schools', moduleTitle: MOD_A_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 3,
      speakers: ['Sandra (chair, female adult)', 'Tom (male adult)', 'Aisha (female adult)'],
      passage: MOD_A_SCRIPT,
      subskill: 'detail', questionNumber: 3,
      prompt: 'How often does Tom say he is willing to volunteer?',
      options: [
        { text: 'Once a month on a Saturday morning',  isCorrect: true,  rationale: 'Tom: "I can give up a Saturday morning once a month."' },
        { text: 'Every week on a Saturday',            isCorrect: false, rationale: 'Tom says once a month, not every week.' },
        { text: 'Twice a month in the evenings',       isCorrect: false, rationale: 'Evenings are not mentioned; Tom specifies Saturday mornings once a month.' },
        { text: 'Every weekend during summer',         isCorrect: false, rationale: 'Tom does not mention seasons or weekends generally — just Saturday morning once a month.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'inference', 'compromise', MOD_A_ID],
    content: {
      moduleId: MOD_A_ID, productLine: 'Language Schools', moduleTitle: MOD_A_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 3,
      speakers: ['Sandra (chair, female adult)', 'Tom (male adult)', 'Aisha (female adult)'],
      passage: MOD_A_SCRIPT,
      subskill: 'inference', questionNumber: 4,
      prompt: 'What compromise does Tom suggest regarding the supermarket?',
      options: [
        { text: 'Keep the back section as parking so the supermarket can still use it',          isCorrect: true,  rationale: 'Tom: "What about keeping the back section as parking? That way we keep the supermarket happy and still get most of the garden."' },
        { text: 'Limit the garden to weekends when the supermarket is closed',                   isCorrect: false, rationale: 'A weekend-only restriction is not Tom\'s suggestion.' },
        { text: 'Ask the supermarket to fund the community garden in exchange for parking rights', isCorrect: false, rationale: 'Funding by the supermarket is not proposed.' },
        { text: 'Move the garden to a different location near the supermarket',                  isCorrect: false, rationale: 'Moving the location is not suggested; the compromise is dividing the current site.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'inference', 'main-issues', MOD_A_ID],
    content: {
      moduleId: MOD_A_ID, productLine: 'Language Schools', moduleTitle: MOD_A_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 3,
      speakers: ['Sandra (chair, female adult)', 'Tom (male adult)', 'Aisha (female adult)'],
      passage: MOD_A_SCRIPT,
      subskill: 'inference', questionNumber: 5,
      prompt: 'Which two issues does Sandra say she will report back to the council?',
      options: [
        { text: 'Management and funding',                         isCorrect: true,  rationale: 'Sandra: "the main concerns are management and funding. I\'ll take those back to the council."' },
        { text: 'Parking and opening hours',                     isCorrect: false, rationale: 'Parking and opening hours are also discussed, but Sandra specifically names management and funding as the items to report.' },
        { text: 'Volunteer recruitment and safety concerns',      isCorrect: false, rationale: 'Volunteer recruitment is part of management, but Sandra summarises the issue as "management and funding."' },
        { text: 'The supermarket\'s views and the council\'s budget', isCorrect: false, rationale: 'The supermarket views are not the items Sandra flags to report back.' },
      ],
    },
  },
];

// ─── MODULE B: Job Interview — Customer Support — B1 ────────────────────
const MOD_B_ID    = "langschool-job-interview-customer-support-b1";
const MOD_B_TITLE = "Job Interview — Customer Support Role";
const MOD_B_SCRIPT = `[Job interview — Interviewer: Callum (male adult, HR) and Candidate: Rosa (female adult)]

Callum: Good morning, Rosa. Thank you for coming in. I'd like to start by asking you why you're interested in this customer support role.

Rosa: Good morning. I've been working in retail for three years, so I'm used to helping customers and solving problems quickly. I enjoy it. I find that most customer issues can be solved if you listen carefully and stay calm.

Callum: That's a good approach. Can you give me an example of a difficult customer situation you handled well?

Rosa: Yes. Last year, a customer came to the shop very angry because she had received the wrong item in an online order. She was quite rude at first. I let her explain the whole situation without interrupting, then I apologised and arranged a replacement to be delivered the next day. By the end, she was actually quite grateful and left positive feedback for the store.

Callum: That's impressive. What do you think is the most important skill for customer support?

Rosa: Patience, definitely. And the ability to stay positive even when the customer is frustrated. You can't take it personally.

Callum: One last question. This role involves some shift work, including occasional Saturdays. Is that something you can manage?

Rosa: Yes, that's fine. I've worked weekends in my current job, so I'm used to it.

Callum: Excellent. We'll be in touch within the week.`;

const MOD_B_ITEMS = [
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'background', MOD_B_ID],
    content: {
      moduleId: MOD_B_ID, productLine: 'Language Schools', moduleTitle: MOD_B_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 2,
      speakers: ['Callum (HR, male adult)', 'Rosa (candidate, female adult)'],
      passage: MOD_B_SCRIPT,
      subskill: 'detail', questionNumber: 1,
      prompt: 'How long has Rosa been working in retail?',
      options: [
        { text: 'Three years', isCorrect: true,  rationale: 'Rosa: "I\'ve been working in retail for three years."' },
        { text: 'Two years',   isCorrect: false, rationale: 'Rosa says three years, not two.' },
        { text: 'Five years',  isCorrect: false, rationale: 'Five years is not mentioned.' },
        { text: 'One year',    isCorrect: false, rationale: 'One year is not what Rosa says.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'difficult-customer', MOD_B_ID],
    content: {
      moduleId: MOD_B_ID, productLine: 'Language Schools', moduleTitle: MOD_B_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 2,
      speakers: ['Callum (HR, male adult)', 'Rosa (candidate, female adult)'],
      passage: MOD_B_SCRIPT,
      subskill: 'detail', questionNumber: 2,
      prompt: 'Why was the customer angry in Rosa\'s example?',
      options: [
        { text: 'She received the wrong item in an online order', isCorrect: true,  rationale: 'Rosa: "a customer came to the shop very angry because she had received the wrong item in an online order."' },
        { text: 'Her order was delivered a week late',            isCorrect: false, rationale: 'Late delivery is not mentioned as the reason for the customer\'s anger.' },
        { text: 'She was charged the wrong price',               isCorrect: false, rationale: 'Pricing error is not described.' },
        { text: 'The item she bought was faulty',                isCorrect: false, rationale: 'A fault in the product is not the issue — the wrong item was delivered.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'resolution', MOD_B_ID],
    content: {
      moduleId: MOD_B_ID, productLine: 'Language Schools', moduleTitle: MOD_B_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 2,
      speakers: ['Callum (HR, male adult)', 'Rosa (candidate, female adult)'],
      passage: MOD_B_SCRIPT,
      subskill: 'detail', questionNumber: 3,
      prompt: 'How did Rosa resolve the difficult customer situation?',
      options: [
        { text: 'She listened, apologised, and arranged a next-day replacement delivery', isCorrect: true,  rationale: 'Rosa: "I let her explain… without interrupting, then I apologised and arranged a replacement to be delivered the next day."' },
        { text: 'She offered the customer a full refund',                                isCorrect: false, rationale: 'A refund is not mentioned; Rosa arranged a replacement.' },
        { text: 'She escalated the complaint to a manager',                              isCorrect: false, rationale: 'No escalation to a manager is mentioned.' },
        { text: 'She gave the customer a discount on a future purchase',                 isCorrect: false, rationale: 'A discount is not the resolution described.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'key-skill', MOD_B_ID],
    content: {
      moduleId: MOD_B_ID, productLine: 'Language Schools', moduleTitle: MOD_B_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 2,
      speakers: ['Callum (HR, male adult)', 'Rosa (candidate, female adult)'],
      passage: MOD_B_SCRIPT,
      subskill: 'detail', questionNumber: 4,
      prompt: 'What does Rosa say is the most important skill for customer support?',
      options: [
        { text: 'Patience and staying positive',        isCorrect: true,  rationale: 'Rosa: "Patience, definitely. And the ability to stay positive even when the customer is frustrated."' },
        { text: 'Technical product knowledge',          isCorrect: false, rationale: 'Technical knowledge is not mentioned.' },
        { text: 'Fast typing and computer skills',      isCorrect: false, rationale: 'Computer skills are not discussed.' },
        { text: 'The ability to speak multiple languages', isCorrect: false, rationale: 'Language skills are not raised in the interview.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'inference', 'shift-work', MOD_B_ID],
    content: {
      moduleId: MOD_B_ID, productLine: 'Language Schools', moduleTitle: MOD_B_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 2,
      speakers: ['Callum (HR, male adult)', 'Rosa (candidate, female adult)'],
      passage: MOD_B_SCRIPT,
      subskill: 'inference', questionNumber: 5,
      prompt: 'Why is Rosa comfortable with the shift work requirements?',
      options: [
        { text: 'She already works weekends in her current job', isCorrect: true,  rationale: 'Rosa: "I\'ve worked weekends in my current job, so I\'m used to it."' },
        { text: 'She has no other commitments at weekends',      isCorrect: false, rationale: 'Rosa cites existing experience, not absence of other commitments.' },
        { text: 'She prefers working at weekends to weekdays',   isCorrect: false, rationale: 'A preference for weekends is not stated.' },
        { text: 'She was specifically looking for a job with weekend shifts', isCorrect: false, rationale: 'Rosa does not say she sought out weekend work.' },
      ],
    },
  },
];

// ─── MODULE C: Travel Documentary — B1 ───────────────────────────────────
const MOD_C_ID    = "langschool-travel-documentary-b1";
const MOD_C_TITLE = "Travel Documentary — Hidden Gems of Portugal";
const MOD_C_SCRIPT = `[Narrator: female adult — travel documentary]

Portugal is often associated with Lisbon and the Algarve coast, but some of its most beautiful places are far less visited. Today we explore three of them.

First, the town of Évora in the Alentejo region. Évora is a UNESCO World Heritage Site, famous for its well-preserved Roman temple and its medieval city walls. The town is compact enough to explore on foot in a day. One word of warning: summer temperatures here can exceed forty degrees Celsius, so the best time to visit is spring or autumn.

Second, the Douro Valley. Best known for producing port wine, the Douro Valley offers dramatic hillside vineyards terraced along the river. A popular way to experience the region is by boat — a two-day river cruise from Porto allows you to stop at wine estates and small villages that have no road access.

Third, the island of São Miguel in the Azores. The Azores are a group of nine volcanic islands in the Atlantic, roughly one and a half hours by plane from Lisbon. São Miguel is the largest island and is famous for its calderas — ancient volcanic craters now filled with lakes of vivid blue and green. The island also has natural hot springs, and you can cook food in geothermal ground pools, a local tradition called cozido das Furnas.`;

const MOD_C_ITEMS = [
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'evora', MOD_C_ID],
    content: {
      moduleId: MOD_C_ID, productLine: 'Language Schools', moduleTitle: MOD_C_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 1, speakers: ['Narrator (female adult)'],
      passage: MOD_C_SCRIPT,
      subskill: 'detail', questionNumber: 1,
      prompt: 'Why is Évora described as a UNESCO World Heritage Site?',
      options: [
        { text: 'For its well-preserved Roman temple and medieval city walls', isCorrect: true,  rationale: '"Évora is a UNESCO World Heritage Site, famous for its well-preserved Roman temple and its medieval city walls."' },
        { text: 'For its natural volcanic craters and hot springs',            isCorrect: false, rationale: 'Volcanic craters and hot springs describe São Miguel in the Azores.' },
        { text: 'For its hillside vineyards and port wine production',         isCorrect: false, rationale: 'Vineyards and port wine describe the Douro Valley.' },
        { text: 'For its beaches and coastal scenery',                         isCorrect: false, rationale: 'Coastal scenery is associated with the Algarve, mentioned only briefly.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'best-season', MOD_C_ID],
    content: {
      moduleId: MOD_C_ID, productLine: 'Language Schools', moduleTitle: MOD_C_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 1, speakers: ['Narrator (female adult)'],
      passage: MOD_C_SCRIPT,
      subskill: 'detail', questionNumber: 2,
      prompt: 'When does the narrator recommend visiting Évora?',
      options: [
        { text: 'Spring or autumn',     isCorrect: true,  rationale: '"The best time to visit is spring or autumn" — because summer temperatures exceed 40°C.' },
        { text: 'Summer, for the heat', isCorrect: false, rationale: 'The narrator warns that summer is too hot.' },
        { text: 'Winter for fewer tourists', isCorrect: false, rationale: 'Winter is not recommended; spring and autumn are.' },
        { text: 'Any time of year',         isCorrect: false, rationale: 'The narrator specifically advises against summer.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'douro-boat', MOD_C_ID],
    content: {
      moduleId: MOD_C_ID, productLine: 'Language Schools', moduleTitle: MOD_C_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 1, speakers: ['Narrator (female adult)'],
      passage: MOD_C_SCRIPT,
      subskill: 'detail', questionNumber: 3,
      prompt: 'Why does the narrator suggest a boat as a good way to experience the Douro Valley?',
      options: [
        { text: 'Some wine estates and villages have no road access',             isCorrect: true,  rationale: '"A two-day river cruise… allows you to stop at wine estates and small villages that have no road access."' },
        { text: 'It is cheaper than renting a car',                              isCorrect: false, rationale: 'Cost comparison is not mentioned.' },
        { text: 'The river views are better than the views from the hillsides',  isCorrect: false, rationale: 'This comparison is not made.' },
        { text: 'Boats are the only available form of transport in the region',  isCorrect: false, rationale: 'The narrator says some villages have no road access — not that boats are the only transport in the region generally.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'detail', 'azores-flight', MOD_C_ID],
    content: {
      moduleId: MOD_C_ID, productLine: 'Language Schools', moduleTitle: MOD_C_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 1, speakers: ['Narrator (female adult)'],
      passage: MOD_C_SCRIPT,
      subskill: 'detail', questionNumber: 4,
      prompt: 'How long is the flight from Lisbon to the Azores?',
      options: [
        { text: 'About one and a half hours',  isCorrect: true,  rationale: '"roughly one and a half hours by plane from Lisbon."' },
        { text: 'About three hours',           isCorrect: false, rationale: 'Three hours is not the flight time stated.' },
        { text: 'About forty-five minutes',    isCorrect: false, rationale: 'Forty-five minutes is too short.' },
        { text: 'About two and a half hours',  isCorrect: false, rationale: 'Two and a half hours is not the stated duration.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'langschool', 'b1', 'inference', 'cozido-furnas', MOD_C_ID],
    content: {
      moduleId: MOD_C_ID, productLine: 'Language Schools', moduleTitle: MOD_C_TITLE,
      cefrBand: 'B1', numberOfSpeakers: 1, speakers: ['Narrator (female adult)'],
      passage: MOD_C_SCRIPT,
      subskill: 'inference', questionNumber: 5,
      prompt: 'What is "cozido das Furnas"?',
      options: [
        { text: 'A local tradition of cooking food in geothermal ground pools', isCorrect: true,  rationale: '"you can cook food in geothermal ground pools, a local tradition called cozido das Furnas."' },
        { text: 'A type of volcanic crater lake on São Miguel',                 isCorrect: false, rationale: 'Volcanic crater lakes are called calderas; cozido das Furnas is a culinary tradition.' },
        { text: 'A natural hot spring resort on the island',                    isCorrect: false, rationale: 'The hot springs are mentioned separately; cozido das Furnas is the cooking tradition.' },
        { text: 'A boat festival held annually in the Douro Valley',           isCorrect: false, rationale: 'This describes a different region; cozido das Furnas is on São Miguel.' },
      ],
    },
  },
];

// ─── MODULE D: Booking a Restaurant — A2 ─────────────────────────────────
const MOD_D_ID    = "diagnostic-booking-restaurant-a2";
const MOD_D_TITLE = "Booking a Restaurant — Phone Call";
const MOD_D_SCRIPT = `[Phone call — Restaurant staff: Marco (male adult) and Customer: Lily (female adult)]

Marco: Good evening, La Piazza restaurant. How can I help you?

Lily: Hello. I'd like to make a reservation for Saturday evening, please.

Marco: Of course. How many people is the booking for?

Lily: It's for four people.

Marco: And what time would you like?

Lily: Is seven thirty available?

Marco: Let me check. Yes, seven thirty is free on Saturday. Can I take your name, please?

Lily: It's Lily Chen. That's C-H-E-N.

Marco: Thank you, Ms Chen. And could I take a phone number in case we need to contact you?

Lily: Yes, it's 0779 452 3810.

Marco: Perfect. So that's a table for four at seven thirty on Saturday, in the name of Chen. Is there anything else I can help you with?

Lily: Yes, actually. One of my guests is vegetarian. Do you have vegetarian options on the menu?

Marco: Yes, we have several vegetarian dishes. I can also let the kitchen know when you arrive.

Lily: That's great, thank you.

Marco: You're welcome. We look forward to seeing you on Saturday.`;

const MOD_D_ITEMS = [
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'a2', 'detail', 'booking-time', MOD_D_ID],
    content: {
      moduleId: MOD_D_ID, productLine: '15-Min Diagnostic', moduleTitle: MOD_D_TITLE,
      cefrBand: 'A2', numberOfSpeakers: 2,
      speakers: ['Marco (restaurant staff, male adult)', 'Lily (customer, female adult)'],
      passage: MOD_D_SCRIPT,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What time does Lily book the table for?',
      options: [
        { text: 'Seven thirty',  isCorrect: true,  rationale: 'Lily asks: "Is seven thirty available?" and Marco confirms it is free.' },
        { text: 'Eight o\'clock', isCorrect: false, rationale: 'Eight o\'clock is not requested.' },
        { text: 'Seven o\'clock', isCorrect: false, rationale: 'Seven o\'clock is not the requested time.' },
        { text: 'Nine o\'clock', isCorrect: false, rationale: 'Nine o\'clock is not mentioned.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'a2', 'detail', 'group-size', MOD_D_ID],
    content: {
      moduleId: MOD_D_ID, productLine: '15-Min Diagnostic', moduleTitle: MOD_D_TITLE,
      cefrBand: 'A2', numberOfSpeakers: 2,
      speakers: ['Marco (restaurant staff, male adult)', 'Lily (customer, female adult)'],
      passage: MOD_D_SCRIPT,
      subskill: 'detail', questionNumber: 2,
      prompt: 'How many people is the reservation for?',
      options: [
        { text: 'Four',  isCorrect: true,  rationale: 'Lily: "It\'s for four people."' },
        { text: 'Two',   isCorrect: false, rationale: 'Two people is not what Lily says.' },
        { text: 'Six',   isCorrect: false, rationale: 'Six is not mentioned.' },
        { text: 'Three', isCorrect: false, rationale: 'Three is not the number Lily gives.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'a2', 'detail', 'dietary-request', MOD_D_ID],
    content: {
      moduleId: MOD_D_ID, productLine: '15-Min Diagnostic', moduleTitle: MOD_D_TITLE,
      cefrBand: 'A2', numberOfSpeakers: 2,
      speakers: ['Marco (restaurant staff, male adult)', 'Lily (customer, female adult)'],
      passage: MOD_D_SCRIPT,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What special request does Lily make about the food?',
      options: [
        { text: 'One guest is vegetarian',          isCorrect: true,  rationale: 'Lily: "One of my guests is vegetarian. Do you have vegetarian options?"' },
        { text: 'One guest is allergic to nuts',    isCorrect: false, rationale: 'A nut allergy is not mentioned.' },
        { text: 'She wants a birthday cake for the table', isCorrect: false, rationale: 'A birthday cake is not requested.' },
        { text: 'She wants a quiet table away from other guests', isCorrect: false, rationale: 'A seating preference is not raised.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'a2', 'detail', 'name-spelling', MOD_D_ID],
    content: {
      moduleId: MOD_D_ID, productLine: '15-Min Diagnostic', moduleTitle: MOD_D_TITLE,
      cefrBand: 'A2', numberOfSpeakers: 2,
      speakers: ['Marco (restaurant staff, male adult)', 'Lily (customer, female adult)'],
      passage: MOD_D_SCRIPT,
      subskill: 'detail', questionNumber: 4,
      prompt: 'Under what name is the reservation made?',
      options: [
        { text: 'Chen',   isCorrect: true,  rationale: 'Lily: "It\'s Lily Chen. That\'s C-H-E-N." Marco confirms "in the name of Chen."' },
        { text: 'Chang',  isCorrect: false, rationale: '"Chang" is not the name given.' },
        { text: 'Cheng',  isCorrect: false, rationale: '"Cheng" is a different spelling.' },
        { text: 'Chan',   isCorrect: false, rationale: '"Chan" is not the name spelled out.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'A2', difficulty: -0.8, discrimination: 1.0, guessing: 0.25,
    tags: ['listening', 'diagnostic', 'a2', 'inference', 'marco-offer', MOD_D_ID],
    content: {
      moduleId: MOD_D_ID, productLine: '15-Min Diagnostic', moduleTitle: MOD_D_TITLE,
      cefrBand: 'A2', numberOfSpeakers: 2,
      speakers: ['Marco (restaurant staff, male adult)', 'Lily (customer, female adult)'],
      passage: MOD_D_SCRIPT,
      subskill: 'inference', questionNumber: 5,
      prompt: 'What does Marco offer to do about the vegetarian guest?',
      options: [
        { text: 'Let the kitchen know when they arrive',             isCorrect: true,  rationale: 'Marco: "I can also let the kitchen know when you arrive."' },
        { text: 'Prepare a special menu in advance',                 isCorrect: false, rationale: 'Marco does not offer a special advance menu — only to inform the kitchen upon arrival.' },
        { text: 'Email a list of vegetarian dishes before Saturday', isCorrect: false, rationale: 'Marco does not offer to email anything.' },
        { text: 'Reserve a separate area for the group',             isCorrect: false, rationale: 'A separate seating area is not mentioned.' },
      ],
    },
  },
];

const ALL_ITEMS = [...MOD_A_ITEMS, ...MOD_B_ITEMS, ...MOD_C_ITEMS, ...MOD_D_ITEMS];

async function main() {
  if (!FORCE) {
    const existing = await prisma.item.findFirst({ where: { tags: { has: SEED_TAG } } });
    if (existing) {
      console.log(`⚠️  SEED_TAG "${SEED_TAG}" already present — skipping. Use FORCE=1 to re-seed.`);
      return;
    }
  } else {
    const deleted = await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`🗑  Deleted ${deleted.count} existing items tagged "${SEED_TAG}".`);
  }

  const byLevel: Record<string, number> = {};
  if (DRY_RUN) {
    for (const item of ALL_ITEMS) {
      byLevel[item.cefrLevel] = (byLevel[item.cefrLevel] ?? 0) + 1;
    }
    console.log(`DRY_RUN: would insert ${ALL_ITEMS.length} listening items`);
    console.table(byLevel);
    return;
  }

  let inserted = 0;
  for (const item of ALL_ITEMS) {
    const tags = [...item.tags, SEED_TAG];
    await prisma.item.create({
      data: {
        type: 'MULTIPLE_CHOICE',
        skill: item.skill as any,
        cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: item.guessing,
        tags,
        status: 'ACTIVE',
        content: item.content,
      },
    });
    inserted++;
    byLevel[item.cefrLevel] = (byLevel[item.cefrLevel] ?? 0) + 1;
  }

  console.log(`✅  Inserted ${inserted} listening items`);
  console.table(byLevel);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
