/**
 * C1/C2 Speaking & Writing Expansion Seed
 *
 * Targeted seed for the two constructed-response skills at the upper end
 * of the CEFR scale. Each prompt is calibrated to Cambridge CAE (C1) or
 * Cambridge CPE (C2) / IELTS 7–9 standards.
 *
 *   C1 SPEAKING  — 14 prompts across monologue, comparative, speculative
 *   C1 WRITING   — 14 prompts across essay, report, proposal, article, review
 *   C2 SPEAKING  — 10 prompts (extends seed-c2-comprehensive.ts)
 *   C2 WRITING   — 8 prompts  (extends seed-c2-comprehensive.ts)
 *
 *   TOTAL: 46 ACTIVE items
 *
 * IRT params:
 *   C1 b ≈ 1.4–1.8   C2 b ≈ 2.3–2.7
 *   a  ≈ 1.3–1.8     c  = 0.0 (constructed response)
 *
 * Usage:
 *   npx tsx scripts/seed-speaking-writing-c1c2.ts
 *   DRY_RUN=1 npx tsx scripts/seed-speaking-writing-c1c2.ts
 *   FORCE=1   npx tsx scripts/seed-speaking-writing-c1c2.ts  # re-seed
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma  = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE   = process.env.FORCE === "1";
const SEED_TAG = "seed-speaking-writing-c1c2-2026";

// ─────────────────────────────────────────────────────────────────────────────
// RUBRICS
// ─────────────────────────────────────────────────────────────────────────────

function writingRubric(level: "C1" | "C2") {
  const maxScore = level === "C2" ? 5 : 5;
  return {
    criteria: [
      { name: "Content & Task Achievement",   maxScore, descriptor: level === "C1"
        ? "Addresses all parts of the task effectively; arguments well developed, relevant examples."
        : "Sophisticated, comprehensive response; original insights; all aspects fully addressed." },
      { name: "Coherence & Cohesion",         maxScore, descriptor: level === "C1"
        ? "Well-organised argument; cohesive devices used accurately and varied."
        : "Flawlessly structured argument; seamless cohesion; exemplary paragraphing." },
      { name: "Lexical Resource",             maxScore, descriptor: level === "C1"
        ? "Wide range of C1 vocabulary, precise collocations, formal register maintained. Minor errors."
        : "Full C2 range including academic collocations, idioms, nuanced register. Near error-free." },
      { name: "Grammatical Range & Accuracy", maxScore, descriptor: level === "C1"
        ? "Good range of C1 structures; complex sentences, passive, modals. Occasional errors."
        : "Full C2 range: inversion, clefts, mixed conditionals, nominalizations. Near error-free." },
    ],
    scale: "0–5 per criterion (total 20)",
    cefrBenchmark: level,
    scoringGuide: `Calibrate against Cambridge ${level === "C1" ? "CAE" : "CPE"} Writing Mark Scheme 2024.`,
  };
}

function speakingRubric(level: "C1" | "C2") {
  return {
    criteria: [
      { name: "Grammatical Range & Accuracy",  maxScore: 5, descriptor: level === "C1"
        ? "Wide range of complex structures. Errors are minor and self-corrected."
        : "Full C2 range with near-native flexibility. Rare slips only." },
      { name: "Lexical Resource",              maxScore: 5, descriptor: level === "C1"
        ? "Precise, wide C1 vocabulary; appropriate register; occasional awkwardness."
        : "C2 precision: idiomatic, nuanced, contextually appropriate. No perceptible gaps." },
      { name: "Fluency & Coherence",           maxScore: 5, descriptor: level === "C1"
        ? "Speaks at length; minor hesitation; ideas well-linked."
        : "Natural, sustained discourse; prosodic signals for discourse structure." },
      { name: "Pronunciation",                 maxScore: 5, descriptor: level === "C1"
        ? "Generally clear; accent may be noticeable but doesn't impede understanding."
        : "Clear and natural; stress and intonation used expressively." },
      { name: "Interactive Communication",     maxScore: 5, descriptor: level === "C1"
        ? "Initiates and develops topics; responds with detail and engagement."
        : "Builds on interlocutor's points seamlessly; manages discourse expertly." },
    ],
    scale: "0–5 per criterion (total 25)",
    cefrBenchmark: level,
    scoringGuide: `Calibrate against Cambridge ${level === "C1" ? "CAE" : "CPE"} Speaking Mark Scheme 2024.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// C1 SPEAKING PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const c1Speaking = [
  {
    taskType: "monologue",
    timeLimitSeconds: 120,
    difficulty: 1.5,
    prompt: "Describe and evaluate two contrasting approaches to reducing inequality in modern societies: redistributive taxation and investment in education and opportunity. Which do you consider more effective and why? Speak for approximately 2 minutes.",
    tags: ["speaking", "c1", "monologue", "economics", "inequality", SEED_TAG],
  },
  {
    taskType: "speculative",
    timeLimitSeconds: 120,
    difficulty: 1.6,
    prompt: "Imagine that within ten years, most entry-level office and administrative jobs have been automated. Speak for 2 minutes exploring what governments, businesses, and individuals should do to adapt — and what the human cost might be if they fail to.",
    tags: ["speaking", "c1", "speculative", "automation", "future_of_work", SEED_TAG],
  },
  {
    taskType: "comparative",
    timeLimitSeconds: 120,
    difficulty: 1.5,
    prompt: "Compare how two different generations — for example, those who grew up before widespread internet access and those who grew up with smartphones — relate to privacy and personal data. Speak for 2 minutes exploring why these differences exist and what they mean for policy.",
    tags: ["speaking", "c1", "comparative", "privacy", "technology", SEED_TAG],
  },
  {
    taskType: "opinion",
    timeLimitSeconds: 120,
    difficulty: 1.5,
    prompt: "Some people argue that universities have become too focused on employability at the expense of genuine intellectual development. To what extent do you agree? Speak for 2 minutes, giving specific examples to support your view.",
    tags: ["speaking", "c1", "opinion", "education", "higher_education", SEED_TAG],
  },
  {
    taskType: "analytical",
    timeLimitSeconds: 120,
    difficulty: 1.6,
    prompt: "Analyse the long-term effects that globalisation has had on cultural identity. In your answer, consider both the opportunities it creates and the risks it poses. Speak for 2 minutes.",
    tags: ["speaking", "c1", "analytical", "globalisation", "cultural_identity", SEED_TAG],
  },
  {
    taskType: "discussion_prompt",
    timeLimitSeconds: 120,
    difficulty: 1.4,
    prompt: "Is the widespread availability of information online making people better informed citizens, or is it enabling misinformation and polarisation? Speak for 2 minutes, considering evidence on both sides.",
    tags: ["speaking", "c1", "discussion", "media_literacy", "information", SEED_TAG],
  },
  {
    taskType: "speculative",
    timeLimitSeconds: 120,
    difficulty: 1.6,
    prompt: "A city is considering replacing all car-based transport infrastructure with cycle lanes, pedestrian zones, and expanded public transport within 15 years. Speak for 2 minutes discussing the potential benefits and the realistic challenges such a transition would face.",
    tags: ["speaking", "c1", "speculative", "urban_planning", "transport", SEED_TAG],
  },
  {
    taskType: "opinion",
    timeLimitSeconds: 120,
    difficulty: 1.5,
    prompt: "Some critics argue that the way environmental issues are communicated — through fear and crisis language — is counterproductive. Do you agree? Speak for 2 minutes, presenting and evaluating the different approaches to climate communication.",
    tags: ["speaking", "c1", "opinion", "climate", "communication", SEED_TAG],
  },
  {
    taskType: "monologue",
    timeLimitSeconds: 120,
    difficulty: 1.5,
    prompt: "To what extent should public figures — politicians, celebrities, executives — be expected to sacrifice their right to a private life? Speak for 2 minutes exploring the tension between public interest and personal privacy.",
    tags: ["speaking", "c1", "monologue", "privacy", "public_life", SEED_TAG],
  },
  {
    taskType: "comparative",
    timeLimitSeconds: 120,
    difficulty: 1.6,
    prompt: "Compare market-based approaches (carbon pricing, emissions trading) and regulatory approaches (standards, bans) to reducing carbon emissions. Which is more appropriate for addressing climate change in the short to medium term? Speak for 2 minutes.",
    tags: ["speaking", "c1", "comparative", "climate_policy", "economics", SEED_TAG],
  },
  {
    taskType: "analytical",
    timeLimitSeconds: 120,
    difficulty: 1.7,
    prompt: "Analyse how social media has changed the nature of political campaigns. Consider both the opportunities for direct engagement and the risks of echo chambers and disinformation. Speak for 2 minutes.",
    tags: ["speaking", "c1", "analytical", "politics", "social_media", SEED_TAG],
  },
  {
    taskType: "opinion",
    timeLimitSeconds: 120,
    difficulty: 1.5,
    prompt: "'Remote work has done more to reshape urban life than any planning policy in the last 50 years.' Speak for 2 minutes evaluating this claim, with reference to housing markets, commuting patterns, and city-centre economies.",
    tags: ["speaking", "c1", "opinion", "remote_work", "urbanism", SEED_TAG],
  },
  {
    taskType: "speculative",
    timeLimitSeconds: 120,
    difficulty: 1.6,
    prompt: "Consider the rise of 'longevity medicine' — interventions that could significantly extend healthy human lifespan. Speak for 2 minutes discussing the economic, social, and ethical implications, including who would have access and what the consequences would be.",
    tags: ["speaking", "c1", "speculative", "longevity", "ethics", SEED_TAG],
  },
  {
    taskType: "discussion_prompt",
    timeLimitSeconds: 120,
    difficulty: 1.5,
    prompt: "Is it possible for a for-profit company to be genuinely ethical, or does the logic of shareholder capitalism always ultimately override social and environmental responsibility? Speak for 2 minutes with specific examples.",
    tags: ["speaking", "c1", "discussion", "business_ethics", "capitalism", SEED_TAG],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// C1 WRITING PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const c1Writing = [
  {
    taskType: "essay",
    wordRange: { min: 220, max: 320 },
    difficulty: 1.5,
    prompt: "Some argue that technology has made modern workplaces less humane — increasing surveillance, accelerating workloads, and eroding the boundaries between work and personal life. Others believe it has given workers unprecedented flexibility and autonomy.\n\nWrite an essay in which you discuss both views and reach a considered conclusion, using specific examples.",
    tags: ["writing", "c1", "essay", "technology", "workplace", SEED_TAG],
  },
  {
    taskType: "report",
    wordRange: { min: 220, max: 320 },
    difficulty: 1.6,
    prompt: "You have been asked by your company director to write a report analysing staff satisfaction data collected in a recent employee survey. The data indicates low satisfaction with communication from senior leadership, inadequate professional development opportunities, and concerns about work-life balance.\n\nYour report should analyse the key issues, explain their likely causes, and make specific recommendations for improvement.",
    tags: ["writing", "c1", "report", "workplace", "hr", SEED_TAG],
  },
  {
    taskType: "proposal",
    wordRange: { min: 240, max: 340 },
    difficulty: 1.6,
    prompt: "Your local authority is inviting proposals for community projects that address social isolation among elderly residents. Write a proposal for a project you believe would be effective, describing what it would involve, who would benefit, how it would be funded, and how its success would be measured.",
    tags: ["writing", "c1", "proposal", "community", "social_welfare", SEED_TAG],
  },
  {
    taskType: "article",
    wordRange: { min: 220, max: 320 },
    difficulty: 1.5,
    prompt: "Write an article for a broadsheet newspaper's education supplement arguing that financial literacy — understanding debt, investment, budgeting and taxation — should be a compulsory part of school education in all countries. Use specific arguments and examples.",
    tags: ["writing", "c1", "article", "education", "financial_literacy", SEED_TAG],
  },
  {
    taskType: "review",
    wordRange: { min: 200, max: 300 },
    difficulty: 1.5,
    prompt: "Write a review for a cultural magazine of a documentary film (real or imagined) that examines the social and environmental consequences of fast fashion. Your review should assess the film's argument, its evidence, its visual approach, and its likely impact on audiences.",
    tags: ["writing", "c1", "review", "film", "environment", SEED_TAG],
  },
  {
    taskType: "essay",
    wordRange: { min: 220, max: 320 },
    difficulty: 1.6,
    prompt: "'The most important skill any young person can develop is the ability to learn how to learn, rather than to master any specific subject.' To what extent do you agree with this view?\n\nWrite a well-structured essay with a clear argument and supporting examples.",
    tags: ["writing", "c1", "essay", "education", "metacognition", SEED_TAG],
  },
  {
    taskType: "report",
    wordRange: { min: 240, max: 340 },
    difficulty: 1.6,
    prompt: "You have been asked to write a report for a city council on the feasibility of introducing a congestion charge in the city centre. Your report should: describe the problem the charge aims to address; evaluate the evidence from cities that have already introduced such a scheme; assess the potential benefits and drawbacks for your city; and make a recommendation.",
    tags: ["writing", "c1", "report", "transport", "urban_planning", SEED_TAG],
  },
  {
    taskType: "article",
    wordRange: { min: 220, max: 320 },
    difficulty: 1.5,
    prompt: "Write an article for an online magazine arguing that the way competitive sport is taught and organised in schools needs fundamental reform — focusing less on competition and winning, and more on physical literacy, collaboration, and lifelong participation.",
    tags: ["writing", "c1", "article", "sport", "education", SEED_TAG],
  },
  {
    taskType: "formal_letter",
    wordRange: { min: 220, max: 320 },
    difficulty: 1.6,
    prompt: "You have read an opinion piece in a respected journal arguing that urban green spaces should be sold to developers to fund public services in financially pressed cities. Write a formal letter to the editor strongly disagreeing, presenting a well-reasoned argument for the social, environmental, and economic value of urban parks and green spaces.",
    tags: ["writing", "c1", "formal_letter", "environment", "urban_planning", SEED_TAG],
  },
  {
    taskType: "essay",
    wordRange: { min: 220, max: 320 },
    difficulty: 1.5,
    prompt: "It has been argued that the rise of streaming platforms has democratised access to culture but has simultaneously undermined the economic viability of creative work. Do the benefits of digital distribution outweigh its costs for artists and cultural industries?\n\nWrite a balanced essay presenting both sides and reaching a reasoned conclusion.",
    tags: ["writing", "c1", "essay", "culture", "digital_economy", SEED_TAG],
  },
  {
    taskType: "proposal",
    wordRange: { min: 240, max: 340 },
    difficulty: 1.7,
    prompt: "Your university is considering introducing a compulsory module on digital ethics and AI literacy for all undergraduate students. Write a proposal to the Academic Board justifying this initiative, describing the content you would include, explaining how it relates to students' future careers, and addressing likely objections.",
    tags: ["writing", "c1", "proposal", "education", "ai_ethics", SEED_TAG],
  },
  {
    taskType: "review",
    wordRange: { min: 200, max: 300 },
    difficulty: 1.5,
    prompt: "Write a review for a travel and culture magazine of a city you know well, aimed at first-time visitors who want to understand not just the tourist attractions but the city's character, contradictions, and contemporary challenges. Your review should be honest, specific, and insightful.",
    tags: ["writing", "c1", "review", "travel", "culture", SEED_TAG],
  },
  {
    taskType: "essay",
    wordRange: { min: 220, max: 320 },
    difficulty: 1.6,
    prompt: "Some argue that the criminal justice system should focus primarily on rehabilitation rather than punishment. Others maintain that deterrence and public protection must be the priority.\n\nWrite an essay in which you discuss the arguments on both sides and present your own well-supported view.",
    tags: ["writing", "c1", "essay", "criminal_justice", "ethics", SEED_TAG],
  },
  {
    taskType: "article",
    wordRange: { min: 220, max: 320 },
    difficulty: 1.6,
    prompt: "Write an article for a business magazine arguing that diversity and inclusion initiatives in large organisations are too often performative rather than substantive. Explain what genuine progress would look like, drawing on specific examples of practices that have proved effective.",
    tags: ["writing", "c1", "article", "diversity", "organisations", SEED_TAG],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// C2 SPEAKING PROMPTS (supplementary — extends seed-c2-comprehensive.ts)
// ─────────────────────────────────────────────────────────────────────────────

const c2SpeakingExtra = [
  {
    taskType: "monologue",
    timeLimitSeconds: 150,
    difficulty: 2.5,
    prompt: "Critically evaluate the claim that social media has fundamentally altered the nature of political discourse — not merely its form but its epistemological foundations. To what extent do you agree, and what are the implications for democratic theory? Speak for 2–3 minutes.",
    tags: ["speaking", "c2", "monologue", "political_epistemology", "social_media", SEED_TAG],
  },
  {
    taskType: "speculative",
    timeLimitSeconds: 150,
    difficulty: 2.6,
    prompt: "Philosophers disagree about whether personal identity is grounded in psychological continuity or physical continuity. Consider the implications of this debate for legal and medical ethics — for example, in cases of severe amnesia, organ donation, or the treatment of criminal responsibility. Speak for 2–3 minutes.",
    tags: ["speaking", "c2", "speculative", "philosophy_of_mind", "ethics", SEED_TAG],
  },
  {
    taskType: "analytical",
    timeLimitSeconds: 150,
    difficulty: 2.6,
    prompt: "Analyse the concept of 'cognitive diversity' in organisations. What is its theoretical basis, what does the empirical evidence say about its effects on decision quality, and what barriers exist to achieving it in practice? Speak for 2–3 minutes.",
    tags: ["speaking", "c2", "analytical", "organisational_psychology", SEED_TAG],
  },
  {
    taskType: "opinion",
    timeLimitSeconds: 150,
    difficulty: 2.5,
    prompt: "The philosopher Derek Parfit argued that personal identity is not what matters in survival — what matters is psychological continuity and connectedness, whether or not it involves strict identity. Assess the plausibility of this view and its consequences for our moral practices around punishment, reward, and gratitude. Speak for 2–3 minutes.",
    tags: ["speaking", "c2", "opinion", "philosophy", "personal_identity", SEED_TAG],
  },
  {
    taskType: "discussion_prompt",
    timeLimitSeconds: 150,
    difficulty: 2.5,
    prompt: "Is the liberal international order — based on multilateral institutions, free trade, and democratic norms — in irreversible decline, or is it undergoing a necessary transformation? Speak for 2–3 minutes presenting a nuanced assessment, drawing on recent geopolitical developments.",
    tags: ["speaking", "c2", "discussion", "international_relations", "geopolitics", SEED_TAG],
  },
  {
    taskType: "speculative",
    timeLimitSeconds: 150,
    difficulty: 2.7,
    prompt: "Consider the concept of 'epistemic injustice' — the harm done to individuals when they are treated as less credible than they deserve, or when they lack the conceptual resources to understand their own experience. Speak for 2–3 minutes discussing where this phenomenon manifests in contemporary institutions and what should be done about it.",
    tags: ["speaking", "c2", "speculative", "epistemology", "social_justice", SEED_TAG],
  },
  {
    taskType: "monologue",
    timeLimitSeconds: 150,
    difficulty: 2.6,
    prompt: "The literary critic Frank Kermode argued that human beings are fundamentally 'sense-making' creatures who impose narrative order on the randomness of experience. To what extent do you find this account convincing, and what are its implications for how we evaluate the truth-claims of journalism, history, and biography? Speak for 2–3 minutes.",
    tags: ["speaking", "c2", "monologue", "literary_theory", "epistemology", SEED_TAG],
  },
  {
    taskType: "comparative",
    timeLimitSeconds: 150,
    difficulty: 2.5,
    prompt: "Compare the utilitarian and Kantian approaches to the ethics of whistleblowing. Under which framework is whistleblowing most clearly justified — and which framework better captures what actually makes such decisions morally difficult? Speak for 2–3 minutes.",
    tags: ["speaking", "c2", "comparative", "ethics", "whistleblowing", SEED_TAG],
  },
  {
    taskType: "analytical",
    timeLimitSeconds: 150,
    difficulty: 2.5,
    prompt: "Analyse the relationship between economic growth and environmental sustainability. Do you believe a transition to a 'post-growth' or 'degrowth' economy is both necessary and feasible, or are green-growth strategies sufficient? Speak for 2–3 minutes.",
    tags: ["speaking", "c2", "analytical", "economics", "environment", SEED_TAG],
  },
  {
    taskType: "opinion",
    timeLimitSeconds: 150,
    difficulty: 2.6,
    prompt: "'The history of science is not a story of the steady accumulation of truth but of repeated revolutions in which whole frameworks of understanding are overthrown.' Critically evaluate this claim, drawing on at least two examples from the history of science. Speak for 2–3 minutes.",
    tags: ["speaking", "c2", "opinion", "philosophy_of_science", SEED_TAG],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// C2 WRITING PROMPTS (supplementary — extends seed-c2-comprehensive.ts)
// ─────────────────────────────────────────────────────────────────────────────

const c2WritingExtra = [
  {
    taskType: "essay",
    wordRange: { min: 280, max: 400 },
    difficulty: 2.6,
    prompt: "Critically evaluate the claim that a universal basic income would be both economically and socially beneficial. In your essay, consider the theoretical arguments for and against, engage with the empirical evidence from pilot programmes, and arrive at a clear and justified conclusion.",
    tags: ["writing", "c2", "essay", "economics", "ubi", SEED_TAG],
  },
  {
    taskType: "proposal",
    wordRange: { min: 300, max: 420 },
    difficulty: 2.6,
    prompt: "You have been asked to submit a proposal to an independent research committee for a study into the long-term impact of widespread remote work on urban economies and city-centre ecosystems. Your proposal should: justify the research question; outline a methodology; address potential methodological limitations; explain the expected contribution to policy and academic understanding.",
    tags: ["writing", "c2", "proposal", "remote_work", "urban_economics", SEED_TAG],
  },
  {
    taskType: "essay",
    wordRange: { min: 280, max: 400 },
    difficulty: 2.7,
    prompt: "The philosopher John Rawls argued that just institutions should be designed behind a 'veil of ignorance' — without knowing one's own place in society. Critically assess this thought experiment as a basis for designing social policy, considering both its philosophical strengths and its practical limitations.",
    tags: ["writing", "c2", "essay", "political_philosophy", "rawls", SEED_TAG],
  },
  {
    taskType: "article",
    wordRange: { min: 280, max: 400 },
    difficulty: 2.5,
    prompt: "Write a scholarly article for a generalist intellectual magazine arguing that the dominant discourse on 'digital transformation' in organisations systematically underestimates the human, cultural, and political dimensions of technology adoption — and that this has significant consequences for policy and practice.",
    tags: ["writing", "c2", "article", "technology", "organisations", SEED_TAG],
  },
  {
    taskType: "essay",
    wordRange: { min: 280, max: 400 },
    difficulty: 2.8,
    prompt: "Is there a meaningful distinction between 'natural' and 'artificial' that has genuine moral or normative significance? Discuss with reference to at least two domains — for example, medicine, reproduction, agriculture, or environmental management.",
    tags: ["writing", "c2", "essay", "philosophy", "nature_vs_artifice", SEED_TAG],
  },
  {
    taskType: "review",
    wordRange: { min: 260, max: 380 },
    difficulty: 2.5,
    prompt: "Write a critical academic review of a recently published non-fiction book (real or imagined) that makes a revisionist argument about a significant historical event or period. Your review should: summarise the book's central thesis; evaluate the quality and use of evidence; assess the originality of the argument; and consider its significance to the field.",
    tags: ["writing", "c2", "review", "academic", "historiography", SEED_TAG],
  },
  {
    taskType: "essay",
    wordRange: { min: 280, max: 400 },
    difficulty: 2.7,
    prompt: "Some political theorists argue that liberal democracy is structurally incapable of responding effectively to long-term, slow-moving crises such as climate change, because it is institutionally biased toward short electoral cycles and visible, immediate harms. Critically evaluate this argument.",
    tags: ["writing", "c2", "essay", "political_theory", "democracy", "climate", SEED_TAG],
  },
  {
    taskType: "article",
    wordRange: { min: 280, max: 400 },
    difficulty: 2.6,
    prompt: "Write an article for an academic journal arguing that the concept of 'cultural appropriation' — while identifying a real and important phenomenon — has been applied in public discourse in ways that are philosophically incoherent and that obstruct rather than advance cross-cultural understanding. Develop a nuanced and well-supported argument.",
    tags: ["writing", "c2", "article", "cultural_theory", "ethics", SEED_TAG],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  LinguAdapt — C1/C2 Speaking & Writing Expansion Seed");
  console.log("=".repeat(70));
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`  Tag:  ${SEED_TAG}\n`);

  if (!FORCE) {
    const existing = await prisma.item.count({ where: { tags: { has: SEED_TAG } } });
    if (existing > 0) {
      console.log(`  [SKIP] ${existing} items already tagged '${SEED_TAG}'. Use FORCE=1 to re-seed.\n`);
      await prisma.$disconnect();
      return;
    }
  }

  let saved = 0;

  // ── C1 Speaking ───────────────────────────────────────────────────────────
  console.log(`► C1 SPEAKING (${c1Speaking.length} prompts)`);
  for (const s of c1Speaking) {
    if (DRY_RUN) { console.log(`  [DRY] C1 Speaking: ${s.taskType} — ${s.prompt.slice(0, 60)}...`); saved++; continue; }
    await prisma.item.create({
      data: {
        type: "SPEAKING_PROMPT" as any,
        skill: "SPEAKING" as any,
        cefrLevel: "C1" as any,
        discrimination: 1.5, difficulty: s.difficulty, guessing: 0.0,
        status: "ACTIVE" as any, isPretest: false,
        content: {
          taskType: s.taskType,
          prompt: s.prompt,
          timeLimitSeconds: s.timeLimitSeconds,
          scoringRubric: speakingRubric("C1"),
        } as any,
        tags: s.tags,
        metadata: { source: "human-authored", standard: "Cambridge CAE Speaking Mark Scheme 2024", seedScript: SEED_TAG } as any,
      },
    });
    saved++;
  }
  console.log(`  Saved ${c1Speaking.length} C1 speaking items\n`);

  // ── C1 Writing ────────────────────────────────────────────────────────────
  console.log(`► C1 WRITING (${c1Writing.length} prompts)`);
  for (const w of c1Writing) {
    if (DRY_RUN) { console.log(`  [DRY] C1 Writing: ${w.taskType} — ${w.prompt.slice(0, 60)}...`); saved++; continue; }
    await prisma.item.create({
      data: {
        type: "WRITING_PROMPT" as any,
        skill: "WRITING" as any,
        cefrLevel: "C1" as any,
        discrimination: 1.5, difficulty: w.difficulty, guessing: 0.0,
        status: "ACTIVE" as any, isPretest: false,
        content: {
          taskType: w.taskType,
          prompt: w.prompt,
          wordRange: w.wordRange,
          scoringRubric: writingRubric("C1"),
          timeLimitMinutes: 40,
        } as any,
        tags: w.tags,
        metadata: { source: "human-authored", standard: "Cambridge CAE Writing Mark Scheme 2024", seedScript: SEED_TAG } as any,
      },
    });
    saved++;
  }
  console.log(`  Saved ${c1Writing.length} C1 writing items\n`);

  // ── C2 Speaking (extra) ───────────────────────────────────────────────────
  console.log(`► C2 SPEAKING EXTRA (${c2SpeakingExtra.length} prompts)`);
  for (const s of c2SpeakingExtra) {
    if (DRY_RUN) { console.log(`  [DRY] C2 Speaking: ${s.taskType} — ${s.prompt.slice(0, 60)}...`); saved++; continue; }
    await prisma.item.create({
      data: {
        type: "SPEAKING_PROMPT" as any,
        skill: "SPEAKING" as any,
        cefrLevel: "C2" as any,
        discrimination: 1.6, difficulty: s.difficulty, guessing: 0.0,
        status: "ACTIVE" as any, isPretest: false,
        content: {
          taskType: s.taskType,
          prompt: s.prompt,
          timeLimitSeconds: s.timeLimitSeconds,
          scoringRubric: speakingRubric("C2"),
        } as any,
        tags: s.tags,
        metadata: { source: "human-authored", standard: "Cambridge CPE Speaking Mark Scheme 2024", seedScript: SEED_TAG } as any,
      },
    });
    saved++;
  }
  console.log(`  Saved ${c2SpeakingExtra.length} C2 speaking items\n`);

  // ── C2 Writing (extra) ────────────────────────────────────────────────────
  console.log(`► C2 WRITING EXTRA (${c2WritingExtra.length} prompts)`);
  for (const w of c2WritingExtra) {
    if (DRY_RUN) { console.log(`  [DRY] C2 Writing: ${w.taskType} — ${w.prompt.slice(0, 60)}...`); saved++; continue; }
    await prisma.item.create({
      data: {
        type: "WRITING_PROMPT" as any,
        skill: "WRITING" as any,
        cefrLevel: "C2" as any,
        discrimination: 1.6, difficulty: w.difficulty, guessing: 0.0,
        status: "ACTIVE" as any, isPretest: false,
        content: {
          taskType: w.taskType,
          prompt: w.prompt,
          wordRange: w.wordRange,
          scoringRubric: writingRubric("C2"),
          timeLimitMinutes: 45,
        } as any,
        tags: w.tags,
        metadata: { source: "human-authored", standard: "Cambridge CPE Writing Mark Scheme 2024", seedScript: SEED_TAG } as any,
      },
    });
    saved++;
  }
  console.log(`  Saved ${c2WritingExtra.length} C2 writing items\n`);

  console.log("=".repeat(70));
  console.log(`  TOTAL SAVED: ${saved} items`);
  console.log(`    C1 Speaking: ${c1Speaking.length}`);
  console.log(`    C1 Writing:  ${c1Writing.length}`);
  console.log(`    C2 Speaking: ${c2SpeakingExtra.length}`);
  console.log(`    C2 Writing:  ${c2WritingExtra.length}`);
  console.log("=".repeat(70) + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[FATAL]", err);
  await prisma.$disconnect();
  process.exit(1);
});
