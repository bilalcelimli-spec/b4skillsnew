/**
 * SPEAKING — Phase 2: Gap-fill (B1 – C2)
 * +40 SPEAKING_PROMPT items scored 0–10 by Gemini AI (GRM model)
 * SEED_TAG: "seed-speaking-phase2"
 *
 * Distribution: B1=5, B2=15, C1=15, C2=5
 * Topics distinct from Phase 1:
 *   B1:  travel advice, giving directions, problem at work, describing a film/book, planning a celebration
 *   B2:  technology debate, environmental policy, cultural comparison, workplace scenario,
 *        health & lifestyle, explaining a process, responding to feedback, tourism pitch,
 *        media & advertising, scientific discovery, negotiation, future predictions,
 *        dilemma discussion, persuasive recommendation, reflecting on failure
 *   C1:  academic seminar turn, policy argument, abstract concept explanation,
 *        historical counterfactual, systemic risk analysis, ethical framework application,
 *        intellectual autobiography, complex analogy, leadership scenario,
 *        cross-cultural business negotiation, speculative hypothesis, literature appreciation,
 *        philosophical dispute, research justification, crisis communication
 *   C2:  philosophical proof critique, extemporaneous commentary on ambiguous prompt,
 *        nuanced position defence under questioning, complex irony and register shifts,
 *        scholarly synthesis under time pressure
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
import { validateOrExit } from "./_validation-helper.js";
const SEED_TAG = "seed-speaking-phase2";

const RUBRIC = {
  B1: [
    { name: "Task Achievement",   maxScore: 2, descriptor: "Maintains interaction on familiar topics; can express main points." },
    { name: "Grammar & Accuracy", maxScore: 2, descriptor: "Sufficient accuracy to convey meaning; some errors in complex structures." },
    { name: "Vocabulary",         maxScore: 2, descriptor: "Sufficient vocabulary for most everyday topics." },
    { name: "Fluency",            maxScore: 2, descriptor: "Produces stretches of language with occasional hesitation." },
    { name: "Pronunciation",      maxScore: 2, descriptor: "Clearly intelligible despite a noticeable accent." },
  ],
  B2: [
    { name: "Task Achievement",   maxScore: 2, descriptor: "Develops arguments and opinions clearly; handles unexpected questions." },
    { name: "Grammar & Accuracy", maxScore: 2, descriptor: "Good grammatical control; errors rare and non-impeding." },
    { name: "Vocabulary",         maxScore: 2, descriptor: "Good range; can vary formulations to express ideas." },
    { name: "Fluency",            maxScore: 2, descriptor: "Relatively smooth delivery; only occasional hesitation." },
    { name: "Pronunciation",      maxScore: 2, descriptor: "Clear pronunciation; accent does not impede communication." },
  ],
  C1: [
    { name: "Task Achievement",   maxScore: 2, descriptor: "Presents complex ideas fluently and precisely." },
    { name: "Grammar & Accuracy", maxScore: 2, descriptor: "Consistently high accuracy; minor slips self-corrected." },
    { name: "Vocabulary",         maxScore: 2, descriptor: "Wide, precise vocabulary including idiomatic expressions." },
    { name: "Fluency",            maxScore: 2, descriptor: "Fluent, spontaneous delivery with natural rhythm." },
    { name: "Pronunciation",      maxScore: 2, descriptor: "Natural, effortless articulation; entirely clear to any listener." },
  ],
  C2: [
    { name: "Task Achievement",   maxScore: 2, descriptor: "Expresses ideas with precision, nuance and sophistication." },
    { name: "Grammar & Accuracy", maxScore: 2, descriptor: "Maintains full grammatical control at all times." },
    { name: "Vocabulary",         maxScore: 2, descriptor: "Masterful, near-native lexical range." },
    { name: "Fluency",            maxScore: 2, descriptor: "Effortless, entirely natural flow." },
    { name: "Pronunciation",      maxScore: 2, descriptor: "Native-like prosody and articulation." },
  ],
};

const items = [
  // ═══════════════════════════════════════
  // B1 — 5 items (difficulty −0.5 to 0.2)
  // ═══════════════════════════════════════
  {
    cefrLevel: "B1", difficulty: -0.5, discrimination: 1.1,
    tags: ["speaking", "b1", "monologue", "travel", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 45, responseTime: 90, productLine: "Language Schools",
      cefrDescriptor: "Can give straightforward advice on a familiar topic.",
      prompt: "A friend is planning to visit your country or city for the first time. Give them three pieces of advice for the visit. Include:\n• The best time of year to visit and why\n• One place they must see\n• A practical tip (e.g., transport, money, food)",
      scoringRubric: RUBRIC.B1,
      sampleBullets: [
        "States and justifies best season",
        "Recommends a specific place with reason",
        "Gives clear practical advice",
        "Uses modal verbs: should, must, I recommend",
      ],
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.3, discrimination: 1.1,
    tags: ["speaking", "b1", "description", "film-book", "junior", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 45, responseTime: 90, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can describe and give a personal response to a narrative.",
      prompt: "Tell me about a film or book you have enjoyed recently. Include:\n• What it is about (brief plot summary without spoilers)\n• Your favourite part and why\n• Whether you would recommend it and who for",
      scoringRubric: RUBRIC.B1,
      sampleBullets: [
        "Gives a clear summary of the plot",
        "Identifies a favourite element with reasoning",
        "Makes a specific recommendation",
        "Uses past and present tenses appropriately",
      ],
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.1, discrimination: 1.2,
    tags: ["speaking", "b1", "roleplay", "problem-work", "corporate", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 45, responseTime: 120, productLine: "Corporate",
      cefrDescriptor: "Can communicate in simple workplace situations.",
      prompt: "Role play: You are calling a colleague to explain a problem with a shared project. The examiner is your colleague.\n• Explain what the problem is\n• Say what you have already tried to do\n• Suggest a next step or ask for help",
      scoringRubric: RUBRIC.B1,
      sampleBullets: [
        "States problem clearly",
        "Describes action already taken",
        "Proposes or requests next action",
        "Uses appropriate phone/professional register",
      ],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.0, discrimination: 1.2,
    tags: ["speaking", "b1", "discussion", "celebrations", "language-schools", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 45, responseTime: 120, productLine: "Language Schools",
      cefrDescriptor: "Can participate in discussions about familiar planning topics.",
      prompt: "You are helping to plan a surprise birthday party for a friend. Discuss with the examiner:\n• Where you should hold the party (home or a venue) — give reasons\n• What kind of entertainment or activity would be best\n• How you would keep it a surprise",
      scoringRubric: RUBRIC.B1,
      sampleBullets: [
        "Justifies choice of venue",
        "Suggests entertainment idea with reasons",
        "Gives practical suggestion for keeping surprise",
        "Responds to examiner's input",
      ],
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.2, discrimination: 1.2,
    tags: ["speaking", "b1", "monologue", "directions", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 30, responseTime: 90, productLine: "Language Schools",
      cefrDescriptor: "Can give simple directions and explain routes clearly.",
      prompt: "A visitor to your city asks how to get from the central train station to a famous landmark (e.g., a museum, park, or stadium). Give clear directions on foot. Include:\n• The starting point and general direction\n• Key landmarks or turns\n• Approximate time on foot",
      scoringRubric: RUBRIC.B1,
      sampleBullets: [
        "Uses directional language (turn left/right, go straight, past)",
        "Mentions at least two landmarks or street features",
        "Gives approximate walking time",
        "Instructions are logically sequenced",
      ],
    },
  },

  // ═══════════════════════════════════════════
  // B2 — 15 items (difficulty 0.3 to 1.3)
  // ═══════════════════════════════════════════
  {
    cefrLevel: "B2", difficulty: 0.3, discrimination: 1.3,
    tags: ["speaking", "b2", "discussion", "technology", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can develop and sustain an argument on a familiar complex topic.",
      prompt: "Discuss the following statement with the examiner: 'Smartphones have done more harm than good to society.' Share your view, consider both sides, and respond to the examiner's counter-arguments.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "Gives a clear initial position with reasons",
        "Acknowledges the opposing view",
        "Responds directly to examiner's challenge",
        "Uses hedging/agreement language",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.4, discrimination: 1.3,
    tags: ["speaking", "b2", "presentation", "environment", "academia", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can present a viewpoint on a current issue with clear reasoning.",
      prompt: "Give a short presentation (approximately 2 minutes) on what you think is the single most effective action individuals can take to address climate change. Structure your answer clearly: introduce your choice, explain why it is more effective than alternatives, and conclude with a recommendation.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "States a clear, specific action",
        "Justifies with at least one concrete reason",
        "Addresses why alternatives are less effective",
        "Delivers a clear concluding recommendation",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.5, discrimination: 1.3,
    tags: ["speaking", "b2", "discussion", "cultural-comparison", "language-schools", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Language Schools",
      cefrDescriptor: "Can discuss cultural similarities and differences with appropriate language.",
      prompt: "Compare attitudes to work–life balance in your country with those in another country you know about. Discuss:\n• Key differences in working hours, holidays or workplace culture\n• Which approach you personally think is healthier and why\n• Whether one approach could be adopted by the other country",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "Names and contrasts two specific national contexts",
        "Gives at least one concrete cultural example",
        "Expresses and justifies a personal view",
        "Addresses feasibility of cultural transfer",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.55, discrimination: 1.3,
    tags: ["speaking", "b2", "roleplay", "workplace-feedback", "corporate", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 60, responseTime: 150, productLine: "Corporate",
      cefrDescriptor: "Can handle complex interpersonal workplace scenarios diplomatically.",
      prompt: "Role play: You are a team leader giving feedback to a team member whose recent work has been below standard. The examiner is the team member.\n• Acknowledge something they did well\n• Raise the specific performance issue clearly and constructively\n• Agree on an action plan together",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "Opens with positive feedback",
        "Raises issue clearly but diplomatically",
        "Proposes concrete improvement action",
        "Invites team member's input",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.6, discrimination: 1.3,
    tags: ["speaking", "b2", "monologue", "health-lifestyle", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 150, productLine: "Language Schools",
      cefrDescriptor: "Can speak clearly on health and personal development topics.",
      prompt: "Talk about a habit or lifestyle change you have made that has had a positive impact on your wellbeing. Include:\n• What the change was and why you decided to make it\n• The main challenges you faced\n• The benefits you have noticed",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "Describes the specific habit/change",
        "Explains motivation",
        "Names at least one specific challenge",
        "Identifies concrete benefit(s)",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.65, discrimination: 1.3,
    tags: ["speaking", "b2", "presentation", "process-explanation", "corporate", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 60, responseTime: 150, productLine: "Corporate",
      cefrDescriptor: "Can explain a professional process clearly and in an organised way.",
      prompt: "Explain a process you know well from your work or studies (e.g., how to plan a project, how to conduct a survey, how a system works). Organise your explanation clearly with stages. Avoid jargon and make it understandable to a non-specialist.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "Names the process and gives an overview",
        "Describes at least 3 clear stages in sequence",
        "Uses appropriate signposting language",
        "Avoids or explains any technical terms",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.7, discrimination: 1.3,
    tags: ["speaking", "b2", "discussion", "media-advertising", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can critically evaluate media practices in a structured discussion.",
      prompt: "Discuss whether advertising aimed at children under twelve should be banned. Give your view, consider the main counter-argument, and respond to the examiner's questions.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "States a clear position with reasoning",
        "Engages with the main counter-argument",
        "Responds to examiner's follow-up",
        "Uses discourse markers (on the other hand, having said that)",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.75, discrimination: 1.3,
    tags: ["speaking", "b2", "discussion", "tourism-pitch", "corporate", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 60, responseTime: 150, productLine: "Corporate",
      cefrDescriptor: "Can present a persuasive case for a recommendation.",
      prompt: "You work for a tourism board. Pitch a destination (real or fictional) to a travel journalist. In approximately 2 minutes:\n• Describe what makes the destination unique\n• Give two specific attractions or experiences\n• Explain why it is ideal for a particular type of traveller",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "Names a distinctive feature of the destination",
        "Describes two specific attractions in some detail",
        "Identifies a target traveller type",
        "Maintains persuasive, professional register",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.8, discrimination: 1.3,
    tags: ["speaking", "b2", "discussion", "scientific-discovery", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can discuss scientific or factual topics in a structured way.",
      prompt: "You have read that scientists have developed a pill that could significantly extend the average human lifespan to 150 years. Discuss with the examiner:\n• What you think the main benefits of this would be\n• What social problems it might create\n• Whether you think it should be made available to everyone",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "Identifies at least two genuine benefits",
        "Raises at least one credible social problem",
        "Takes and justifies a position on access",
        "Responds to examiner's challenges",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.85, discrimination: 1.3,
    tags: ["speaking", "b2", "roleplay", "negotiation", "corporate", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 60, responseTime: 150, productLine: "Corporate",
      cefrDescriptor: "Can negotiate effectively in professional contexts.",
      prompt: "Role play: You are negotiating a freelance contract with a client (the examiner). You want a higher fee than they have offered.\n• State clearly what you are asking for and why\n• Listen to their constraints and respond\n• Try to reach a compromise both can accept",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "States position and justification clearly",
        "Listens and paraphrases the other party's constraints",
        "Proposes a compromise or alternative",
        "Maintains professional, constructive register",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.9, discrimination: 1.3,
    tags: ["speaking", "b2", "monologue", "future-predictions", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 150, productLine: "Language Schools",
      cefrDescriptor: "Can speculate about the future using appropriate modal forms.",
      prompt: "Describe what you think the world of work will look like in 30 years. Consider:\n• How technology will change the types of jobs available\n• How the location and structure of work may change\n• What skills will be most valuable",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "Makes at least two specific predictions about jobs",
        "Addresses location/structure of work",
        "Names specific skills for the future",
        "Uses future forms appropriately (will, may, is likely to)",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.95, discrimination: 1.3,
    tags: ["speaking", "b2", "discussion", "dilemma", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can reason through ethical dilemmas and defend choices clearly.",
      prompt: "Discuss this ethical dilemma with the examiner: A doctor has access to a life-saving drug. There are ten doses left and eleven critically ill patients. One patient is a retired scientist who once made important discoveries; the others are ordinary members of the public. Should the doctor give priority to the scientist? Give your view and respond to challenges.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "States a position and basic reasoning",
        "Engages with the counter-argument",
        "Applies a principle (fairness, utility, need) consistently",
        "Handles examiner's challenges without losing thread",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.0, discrimination: 1.3,
    tags: ["speaking", "b2", "monologue", "reflection-failure", "language-schools", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 150, productLine: "Language Schools",
      cefrDescriptor: "Can reflect on personal experience with honesty and insight.",
      prompt: "Talk about a time when you failed at something or made a significant mistake. Include:\n• What happened and what went wrong\n• How you felt at the time and immediately afterwards\n• What you learned from it and how it changed your approach",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "Describes the event clearly",
        "Expresses emotional reaction authentically",
        "Identifies a specific lesson or change in behaviour",
        "Uses past tenses accurately throughout",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.1, discrimination: 1.3,
    tags: ["speaking", "b2", "presentation", "persuasive-recommendation", "corporate", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 60, responseTime: 150, productLine: "Corporate",
      cefrDescriptor: "Can deliver a persuasive business recommendation clearly.",
      prompt: "Your manager has asked you to recommend one of two approaches to a business challenge (you can invent the context):\n• Option A: A cheaper, faster approach with higher risk\n• Option B: A more expensive, slower approach with lower risk\nPresent your recommendation with clear reasoning and anticipate one objection.",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "States recommendation clearly upfront",
        "Gives at least two supporting reasons",
        "Anticipates and addresses one objection",
        "Uses professional, clear language",
      ],
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.2, discrimination: 1.3,
    tags: ["speaking", "b2", "discussion", "social-policy", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 60, responseTime: 150, productLine: "Academia",
      cefrDescriptor: "Can discuss social policy questions with clear argumentation.",
      prompt: "Discuss whether wealthy nations should take in more refugees. Consider:\n• The humanitarian and legal arguments for accepting more\n• The practical and political arguments some governments use to justify limits\n• Your own view on what an ethical refugee policy would look like",
      scoringRubric: RUBRIC.B2,
      sampleBullets: [
        "Articulates the humanitarian case clearly",
        "Represents the opposing argument fairly",
        "States a personal position with justification",
        "Engages with examiner's probing questions",
      ],
    },
  },

  // ══════════════════════════════════════════
  // C1 — 15 items (difficulty 1.0 to 1.8)
  // ══════════════════════════════════════════
  {
    cefrLevel: "C1", difficulty: 1.0, discrimination: 1.4,
    tags: ["speaking", "c1", "discussion", "academic-seminar", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can participate fluently and precisely in academic discussions.",
      prompt: "Discuss with the examiner: some scholars argue that the scientific method is insufficient for answering ethical questions. Do you agree? Engage with the strongest version of both sides and arrive at a considered position.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Identifies what the scientific method offers",
        "Articulates the is/ought problem or similar objection",
        "Considers whether empirical ethics (Singer etc.) complicates the claim",
        "Arrives at a nuanced, non-simplistic conclusion",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.05, discrimination: 1.4,
    tags: ["speaking", "c1", "presentation", "policy-argument", "academia", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can present a sustained, coherent argument on a complex policy issue.",
      prompt: "Present your position on whether universal basic income (UBI) should be introduced nationally. Your presentation should: define UBI briefly, make the strongest version of the case for it, address the most significant objection, and reach a clear recommendation.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Defines UBI clearly and precisely",
        "Presents the strongest 2–3 arguments for UBI",
        "Engages with a genuine, strong objection",
        "Reaches a clear, justified recommendation",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.1, discrimination: 1.4,
    tags: ["speaking", "c1", "monologue", "abstract-concept", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can explain abstract concepts clearly with examples and qualification.",
      prompt: "Explain the concept of 'cognitive dissonance' to someone who has not encountered it before. Include: a clear definition, at least two everyday examples, and an explanation of how people typically resolve it.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Defines cognitive dissonance accurately",
        "Gives two concrete, relatable examples",
        "Explains resolution mechanisms (rationalisation, behaviour change)",
        "Uses hedging/qualification appropriately",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.15, discrimination: 1.4,
    tags: ["speaking", "c1", "discussion", "historical-counterfactual", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can engage in speculative historical and analytical discussion.",
      prompt: "Discuss this counterfactual with the examiner: 'If the printing press had not been invented in the fifteenth century, would the Reformation and the Scientific Revolution have occurred?' Consider what the printing press actually contributed, what alternative mechanisms existed, and how much weight to place on contingency versus structural forces in history.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Identifies specific ways the press enabled the Reformation/Scientific Revolution",
        "Considers alternative communication channels that existed",
        "Engages with contingency vs structuralism in historiography",
        "Reaches a qualified, not oversimplified, conclusion",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.2, discrimination: 1.4,
    tags: ["speaking", "c1", "discussion", "systemic-risk", "corporate", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 75, responseTime: 180, productLine: "Corporate",
      cefrDescriptor: "Can analyse systemic risks with precision in professional contexts.",
      prompt: "Discuss with the examiner: in what ways does the increasing concentration of global tech infrastructure in a small number of companies (e.g., cloud services, payment systems, communication platforms) represent a systemic risk? What regulatory responses would be most appropriate, and what are the trade-offs?",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Identifies specific dimensions of systemic risk (resilience, political, economic)",
        "Distinguishes between types of concentration",
        "Proposes at least two regulatory approaches",
        "Acknowledges trade-offs (innovation, global competitiveness)",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.25, discrimination: 1.4,
    tags: ["speaking", "c1", "monologue", "ethical-framework", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can apply ethical frameworks precisely and evaluate their strengths.",
      prompt: "Apply one ethical framework (utilitarian, deontological, or virtue ethics) to evaluate the ethics of self-driving car algorithms that must be programmed to make decisions in unavoidable accident scenarios. Explain the framework, apply it to the scenario, and identify where the framework's limitations become apparent.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Names and explains the framework accurately",
        "Applies it specifically to the trolley-problem scenario for autonomous vehicles",
        "Identifies a genuine limitation or objection",
        "Maintains precise, academic register",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.3, discrimination: 1.4,
    tags: ["speaking", "c1", "monologue", "intellectual-autobiography", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can give a sustained, reflective personal account with intellectual depth.",
      prompt: "Talk about an idea, book, or intellectual encounter that significantly changed how you think about something. Describe: what the idea was, how it changed your previous understanding, and whether you now have any reservations about it.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Identifies a specific idea/text/encounter",
        "Articulates the prior understanding clearly",
        "Explains the shift in thinking with precision",
        "Shows appropriate intellectual self-questioning",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.35, discrimination: 1.4,
    tags: ["speaking", "c1", "presentation", "complex-analogy", "academia", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can use analogy and metaphor precisely to explain complex phenomena.",
      prompt: "Explain one complex phenomenon from science, economics or society using an extended analogy. The analogy should clarify the concept for a non-specialist, but you should also explicitly acknowledge where the analogy breaks down.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "States the phenomenon to be explained",
        "Develops an extended, appropriate analogy",
        "Identifies where the analogy holds and where it breaks down",
        "Explains the concept accurately beyond the analogy",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.4, discrimination: 1.4,
    tags: ["speaking", "c1", "roleplay", "leadership-scenario", "corporate", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 75, responseTime: 180, productLine: "Corporate",
      cefrDescriptor: "Can handle complex leadership communication scenarios with sophistication.",
      prompt: "Role play: You are a senior manager who must inform your team (examiner plays a team member) that the company is undergoing restructuring that may involve redundancies, though no final decisions have been made. You must communicate honestly, acknowledge uncertainty, maintain morale, and invite questions.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Communicates the situation honestly without overstating certainty",
        "Acknowledges the emotional impact explicitly",
        "Outlines what is and is not yet known",
        "Handles the team member's concern without deflection",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.45, discrimination: 1.4,
    tags: ["speaking", "c1", "discussion", "cross-cultural-negotiation", "corporate", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 75, responseTime: 180, productLine: "Corporate",
      cefrDescriptor: "Can discuss cross-cultural business communication with nuance.",
      prompt: "Discuss with the examiner: to what extent should international business professionals adapt their communication style to match the cultural norms of their partners, and at what point does such adaptation become problematic or inauthentic?",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Identifies specific cultural dimensions (high/low context, direct/indirect, etc.)",
        "Gives practical examples of appropriate adaptation",
        "Identifies where adaptation may compromise values or authenticity",
        "Arrives at a nuanced, context-sensitive position",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.5, discrimination: 1.4,
    tags: ["speaking", "c1", "monologue", "speculative-hypothesis", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can develop and evaluate speculative hypotheses with academic rigour.",
      prompt: "Develop and evaluate the following speculative hypothesis: 'The internet has fundamentally changed not just how humans communicate but how humans think.' What would we need to observe to confirm or disconfirm this claim, and what is your current assessment of the evidence?",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Interprets the claim precisely — distinguishes communication from cognition",
        "Identifies what would constitute confirming evidence",
        "Reviews relevant evidence (distraction, memory, attention spans, etc.)",
        "Reaches a qualified, evidence-anchored conclusion",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.55, discrimination: 1.4,
    tags: ["speaking", "c1", "discussion", "literature-appreciation", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can discuss literary and cultural works analytically.",
      prompt: "Discuss with the examiner: can a novel or work of literature change the world? Use at least one specific example to support your view, and engage with the argument that art's social impact is typically overstated.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Gives a specific example of literature with documented social impact",
        "Analyses how the work produced that impact",
        "Engages with the sceptical view fairly",
        "Arrives at a measured, original conclusion",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.6, discrimination: 1.4,
    tags: ["speaking", "c1", "discussion", "philosophical-dispute", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can engage in philosophical argumentation with precision and clarity.",
      prompt: "Discuss with the examiner the claim that 'there is no such thing as a selfless act.' Defend your position against the examiner's counter-examples and respond to the question of whether the framing of the claim is itself philosophically coherent.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "States and explains an initial position",
        "Responds to counter-examples without retreat or inconsistency",
        "Interrogates the framing (psychological egoism, definitional collapse)",
        "Maintains philosophical precision throughout",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.7, discrimination: 1.4,
    tags: ["speaking", "c1", "presentation", "research-justification", "academia", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 75, responseTime: 180, productLine: "Academia",
      cefrDescriptor: "Can justify research proposals with academic rigour.",
      prompt: "You are presenting a research proposal to a funding committee (the examiner plays a sceptical panel member). Propose a research question in any field you know well, justify why it is worth investigating, describe your methodology, and respond to the committee's challenges about feasibility and significance.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "States a clear, researchable question",
        "Justifies its significance convincingly",
        "Describes a methodologically coherent approach",
        "Handles the examiner's challenge without becoming defensive",
      ],
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.8, discrimination: 1.4,
    tags: ["speaking", "c1", "roleplay", "crisis-communication", "corporate", SEED_TAG],
    content: {
      taskType: "roleplay", prepTime: 75, responseTime: 180, productLine: "Corporate",
      cefrDescriptor: "Can manage high-stakes communication crises with precision and composure.",
      prompt: "Role play: You are the communications director of a company. A journalist (the examiner) is calling about reports that your company's product has been linked to several health incidents. You must respond professionally: acknowledge the seriousness, avoid speculation, commit to transparency, protect the company's reputation, and avoid saying anything legally compromising.",
      scoringRubric: RUBRIC.C1,
      sampleBullets: [
        "Acknowledges the seriousness without admitting liability",
        "Commits to a specific transparency action (investigation, statement)",
        "Avoids speculation or false reassurance",
        "Maintains composure and professional register under pressure",
      ],
    },
  },

  // ═════════════════════════════════════════
  // C2 — 5 items (difficulty 1.5 to 2.0)
  // ═════════════════════════════════════════
  {
    cefrLevel: "C2", difficulty: 1.5, discrimination: 1.5,
    tags: ["speaking", "c2", "discussion", "philosophical-proof", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 90, responseTime: 210, productLine: "Academia",
      cefrDescriptor: "Can engage in highly sophisticated philosophical discourse with full linguistic mastery.",
      prompt: "Discuss with the examiner: Descartes' cogito ('I think, therefore I am') is sometimes claimed to be the one indubitable philosophical foundation. Is it? Consider objections (Lichtenberg's grammar objection, Hume's bundle theory, the privacy of consciousness problem) and arrive at your own assessment.",
      scoringRubric: RUBRIC.C2,
      sampleBullets: [
        "Articulates the cogito argument precisely",
        "Presents at least two serious objections with accuracy",
        "Responds to examiner's extensions",
        "Arrives at an original, nuanced position",
        "Maintains fully fluent, precise philosophical register",
      ],
    },
  },
  {
    cefrLevel: "C2", difficulty: 1.6, discrimination: 1.5,
    tags: ["speaking", "c2", "monologue", "extemporaneous", "academia", SEED_TAG],
    content: {
      taskType: "monologue", prepTime: 60, responseTime: 210, productLine: "Academia",
      cefrDescriptor: "Can speak extemporaneously on abstract prompts with depth and precision.",
      prompt: "Without preparation beyond one minute, speak for three minutes on the following: 'All maps lie.' Your response should be analytically rigorous, deploy precise language, and move beyond the obvious without losing coherence.",
      scoringRubric: RUBRIC.C2,
      sampleBullets: [
        "Moves beyond the literal to discuss representation, projection, power",
        "References specific examples (Mercator, political borders, mental maps)",
        "Develops an original analytical thread",
        "Maintains coherence and momentum throughout",
        "Deploys precise, varied vocabulary",
      ],
    },
  },
  {
    cefrLevel: "C2", difficulty: 1.7, discrimination: 1.5,
    tags: ["speaking", "c2", "discussion", "position-defence", "academia", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 90, responseTime: 210, productLine: "Academia",
      cefrDescriptor: "Can defend complex intellectual positions under sustained questioning.",
      prompt: "Defend the following position under sustained examiner questioning: 'Democracy is not merely the best available form of government; it is the only form consistent with human dignity.' The examiner will press you on non-liberal democracies, technocracy, epistocracy, the performance gap between democracies and benevolent autocracies, and the concept of dignity itself.",
      scoringRubric: RUBRIC.C2,
      sampleBullets: [
        "Articulates the dignity-based argument precisely",
        "Handles each examiner challenge without contradiction",
        "Distinguishes between procedural and substantive democracy",
        "Maintains a coherent position while acknowledging complexity",
        "Uses sophisticated hedging and qualification appropriately",
      ],
    },
  },
  {
    cefrLevel: "C2", difficulty: 1.8, discrimination: 1.5,
    tags: ["speaking", "c2", "discussion", "irony-register", "language-schools", SEED_TAG],
    content: {
      taskType: "discussion", prepTime: 90, responseTime: 210, productLine: "Language Schools",
      cefrDescriptor: "Can exploit irony, register-shifting and implicature at a sophisticated level.",
      prompt: "Discuss with the examiner the following proposition, which should be taken as sincerely meant even though it sounds paradoxical: 'The most honest thing a politician can do is to lie skillfully.' In your discussion, deploy irony, intellectual humour and register-shifting where appropriate, and bring the discussion to a philosophically coherent conclusion.",
      scoringRubric: RUBRIC.C2,
      sampleBullets: [
        "Opens by unpacking the paradox with precision",
        "Deploys irony or register shift in a controlled way",
        "Engages with the serious underlying claim (political communication, Plato's noble lie)",
        "Maintains coherence while exploiting rhetorical register",
        "Reaches a genuinely reflective conclusion",
      ],
    },
  },
  {
    cefrLevel: "C2", difficulty: 2.0, discrimination: 1.5,
    tags: ["speaking", "c2", "presentation", "scholarly-synthesis", "academia", SEED_TAG],
    content: {
      taskType: "presentation", prepTime: 90, responseTime: 210, productLine: "Academia",
      cefrDescriptor: "Can synthesise complex academic material under time pressure with mastery.",
      prompt: "You have two minutes to prepare and then four minutes to present a synthesis of the following claim: 'The twentieth century's two most consequential ideas were evolution by natural selection and the unconscious.' Your presentation should: contextualise the claim, evaluate the scope of each idea's influence across multiple domains, consider what 'consequential' means epistemologically, and arrive at a position on whether the claim is defensible, excessive, or otherwise in need of qualification.",
      scoringRubric: RUBRIC.C2,
      sampleBullets: [
        "Contextualises both ideas in their historical and disciplinary settings",
        "Traces influence across at least two domains per idea",
        "Problematises 'consequential' as a concept",
        "Takes and defends a position on the claim",
        "Maintains fluency and precision throughout without loss of coherence",
      ],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set. Add it to .env");
    process.exit(1);
  }

  if (process.env.DRY_RUN === "1") {
    console.log(`DRY_RUN: would insert ${items.length} speaking items`);
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
  const validItems = validateOrExit(items, "seed-speaking-phase2");
  for (const item of validItems) {
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
