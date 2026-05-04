/**
 * READING PHASE 7 — ACADEMIA / SPECIALIZED
 * Module: "The Language of Silence: What We Don't Say"
 * CEFR: C1 | Academic & postgraduate | ~360 words | Academic text (linguistics)
 * 6 questions: implicit_meaning ×1, text_organization ×2, lexical_choice ×1, author_stance ×1, inference ×1
 *
 * SOTA notes:
 * - Academic text: canonical C1 genre (journal-style linguistic analysis).
 * - Questions require tracking discourse organisation, not just propositional content.
 * - IRT b-params: +1.2 → +1.8 (C1 range).
 * - Distractors exploit: plausible paraphrase of wrong claim, paragraph attribution error.
 *
 *   npx tsx scripts/seed-reading-phase7.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MODULE_ID    = "academia-reading-language-silence";
const PRODUCT_LINE = "ACADEMIA";
const MODULE_TITLE = "The Language of Silence: What We Don't Say";
const CEFR_BAND    = "C1";

const PASSAGE = `Language is commonly conceived as the vehicle by which meaning is transmitted between speakers. Yet a persistent and underexplored dimension of communication is its negative space: the meaning carried not by what is said, but by what is withheld, paused, or conspicuously absent.

Linguists distinguish between two primary categories of communicative silence. 'Unmarked' silences are contextually expected — the pause between conversational turns, for instance — and carry no special semantic load. 'Marked' silences, by contrast, are pragmatically significant precisely because they deviate from expectation. A politician's failure to deny an allegation, a therapist's strategic pause, or an employee's silence when asked a direct question by a manager each constitute communicative acts as meaningful as any utterance.

The interpretation of marked silence is, however, profoundly context-dependent. The same pause that signals hesitation in one culture may function as a sign of deep respect in another. Cross-cultural misreading of silence is a well-documented source of communicative failure, particularly in high-stakes institutional contexts such as legal proceedings or international negotiations, where participants may share a language but not its pragmatic conventions.

What makes silence particularly challenging to study is its paradoxical nature: it is simultaneously ubiquitous and invisible to standard linguistic analysis. Corpus linguistics, for instance, works with transcribed spoken or written data — by definition, a record of what was produced. Silence leaves no trace in a corpus. Researchers who wish to study what was not said must therefore rely on other methodologies: ethnographic observation, discourse analysis of co-participants' responses, or experimental pragmatics.

The scholarly attention now directed at silence reflects a broader shift in linguistics: a move away from sentence-level grammar and towards the study of communication as a social, embedded, and inherently incomplete process. Silence is not a gap in language; it is a constituent of it.`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR C1 — dense nominal groups, academic hedging, complex connectors, metalinguistic vocabulary.
✓ Text type (academic linguistic analysis) authentic C1 genre.
✓ Q1 (implicit_meaning) — negative space / absence as communication; requires conceptual grasp.
✓ Q2 (text_organization) — function of paragraph 2 (taxonomy introduction).
✓ Q3 (text_organization) — why paragraph 4 discusses corpus linguistics (methodological challenge).
✓ Q4 (lexical_choice) — "pragmatically significant" in context.
✓ Q5 (author_stance) — writer's view on silence as a linguistic object.
✓ Q6 (inference) — implication of cross-cultural variation for legal/diplomatic settings.
✓ ~360 words; C1 timed reading (12–15 min).
HUMAN REVIEW: Ensure Q3 (text_organization) does not over-reward metalinguistic knowledge — confirm it's inferrable from context.
`;

const items = [
  // Q1 — Implicit meaning: the article's core concept
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.2, discrimination: 1.3, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "linguistics", "c1", "implicit_meaning", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 360, textType: "academic text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "implicit_meaning", questionNumber: 1,
      prompt: "What does the phrase 'negative space' in the first paragraph imply about silence?",
      options: [
        { text: "Silence is a negative phenomenon that impairs communication.",        isCorrect: false, rationale: "'Negative space' is a structural metaphor (from visual art), not a value judgement; the article treats silence as communicatively meaningful." },
        { text: "Silence is the communicative equivalent of the absent or unsaid — a meaningful absence.", isCorrect: true, rationale: "Borrowed from visual arts, 'negative space' denotes the area defined by what is absent; here it frames silence as meaning carried by what is withheld." },
        { text: "Communication can only convey negative emotions through silence.",     isCorrect: false, rationale: "No claim about emotional valence is made; 'negative' refers to absence, not negativity in an emotional sense." },
        { text: "Silence is defined by the absence of words alone.",                  isCorrect: false, rationale: "The article broadens silence to include pauses, withholding, and conspicuous absence — not only the absence of words." },
      ],
    },
  },
  // Q2 — Text organization: paragraph 2 function
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.3, discrimination: 1.3, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "linguistics", "c1", "text_organization", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 360, textType: "academic text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "text_organization", questionNumber: 2,
      prompt: "What is the primary function of the second paragraph?",
      options: [
        { text: "To argue that all types of silence are equally meaningful.",        isCorrect: false, rationale: "The paragraph explicitly distinguishes between silences of different significance — the opposite of treating them as equal." },
        { text: "To introduce a typology of silence and identify which type is communicatively significant.", isCorrect: true, rationale: "The paragraph defines 'unmarked' and 'marked' silences, then focuses attention on marked silence as the pragmatically meaningful category." },
        { text: "To describe the cultural variation in interpreting silence.",       isCorrect: false, rationale: "Cultural variation is the subject of paragraph 3; paragraph 2 introduces the typology." },
        { text: "To review previous scholarly research on silence in linguistics.", isCorrect: false, rationale: "Literature review is not the function of paragraph 2; it introduces a conceptual framework." },
      ],
    },
  },
  // Q3 — Text organization: why paragraph 4 discusses corpus linguistics
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.4, discrimination: 1.35, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "linguistics", "c1", "text_organization", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 360, textType: "academic text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "text_organization", questionNumber: 3,
      prompt: "Why does the writer refer to corpus linguistics in the fourth paragraph?",
      options: [
        { text: "To recommend corpus linguistics as the best method for studying silence.",               isCorrect: false, rationale: "The opposite — corpus linguistics is cited as an example of a method that cannot capture silence because it records only what was produced." },
        { text: "To illustrate the methodological challenge: standard data capture cannot record what is absent.", isCorrect: true, rationale: "Corpus linguistics is used as a concrete example of why silence 'leaves no trace' in conventional data — highlighting the methodological problem." },
        { text: "To criticise linguists who use transcription-based research.",                           isCorrect: false, rationale: "No criticism of researchers is implied; the point is structural, about the limitations of the data type." },
        { text: "To show that corpus linguistics has recently begun to study silence.",                   isCorrect: false, rationale: "The writer says silence leaves no trace in a corpus — implying corpus linguistics has not and cannot easily study silence." },
      ],
    },
  },
  // Q4 — Lexical choice: "pragmatically significant"
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.5, discrimination: 1.35, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "linguistics", "c1", "lexical_choice", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 360, textType: "academic text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "lexical_choice", questionNumber: 4,
      prompt: "What does 'pragmatically significant' mean in the context of paragraph 2?",
      options: [
        { text: "Practically important for everyday tasks.",                                    isCorrect: false, rationale: "'Pragmatically' here is a linguistic term (related to pragmatics — the study of meaning in context), not the general adjective 'practical'." },
        { text: "Carrying communicative meaning determined by the context of use.",             isCorrect: true,  rationale: "In linguistics, pragmatic significance refers to meaning that arises from context rather than the semantic content of words alone — here, the silence's meaning is context-given." },
        { text: "Significant only in written language, not spoken interaction.",               isCorrect: false, rationale: "All the examples in the paragraph (politicians, therapists, employees) are from spoken/interactive contexts." },
        { text: "Easily measurable through standard linguistic research methods.",             isCorrect: false, rationale: "The article later argues silence is methodologically difficult to study — the opposite of easily measurable." },
      ],
    },
  },
  // Q5 — Author's stance
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.6, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "linguistics", "c1", "author_stance", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 360, textType: "academic text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "author_stance", questionNumber: 5,
      prompt: "Which statement best captures the writer's stance on silence as a linguistic phenomenon?",
      options: [
        { text: "Silence is peripheral to language and should be studied as a separate discipline.",          isCorrect: false, rationale: "The writer argues silence is 'a constituent of language' — integral, not peripheral." },
        { text: "Silence is a genuine, constitutive element of language and communication.",                  isCorrect: true,  rationale: "The final sentence states explicitly: 'Silence is not a gap in language; it is a constituent of it.' — a clear claim of structural integration." },
        { text: "Silence is too ambiguous to be studied scientifically.",                                     isCorrect: false, rationale: "The writer acknowledges methodological challenges but proposes alternative methods — not giving up on scientific study." },
        { text: "The study of silence is important only in cross-cultural contexts.",                         isCorrect: false, rationale: "Cross-cultural contexts are one application; the writer's stance is broader, framing silence as universal to all communication." },
      ],
    },
  },
  // Q6 — Inference: cross-cultural implications
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.8, discrimination: 1.4, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "academia", "linguistics", "c1", "inference", MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, wordCount: 360, textType: "academic text",
      passage: PASSAGE, qualityNotes: QUALITY_NOTES,
      subskill: "inference", questionNumber: 6,
      prompt: "What can be inferred about cross-cultural misreading of silence in legal or diplomatic settings?",
      options: [
        { text: "Participants in legal proceedings always interpret silence as an admission of guilt.",      isCorrect: false, rationale: "The article notes cultural variation — the same silence can carry different meanings; no universal interpretation is claimed." },
        { text: "Sharing a common language may be insufficient to prevent serious miscommunication if pragmatic conventions differ.", isCorrect: true, rationale: "The article specifies participants 'may share a language but not its pragmatic conventions' — implying shared language does not guarantee shared interpretation of silence." },
        { text: "Legal proceedings are the context most studied by silence researchers.",                    isCorrect: false, rationale: "Legal proceedings are one example; no claim is made that they are the primary research context." },
        { text: "Cross-cultural miscommunication through silence only occurs in formal institutional contexts.", isCorrect: false, rationale: "The article highlights formal contexts as high-stakes, but does not restrict misreading of silence to formal settings." },
      ],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
  const existing = await prisma.item.findFirst({ where: { tags: { has: MODULE_ID } } });
  if (existing && process.env.FORCE !== "1") { console.log(`Module ${MODULE_ID} already seeded.`); return; }
  if (existing && process.env.FORCE === "1") { await prisma.item.deleteMany({ where: { tags: { has: MODULE_ID } } }); }
  let created = 0;
  for (const item of items) {
    await prisma.item.create({
      data: {
        type: "MULTIPLE_CHOICE", skill: item.skill as any, cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty, discrimination: item.discrimination, guessing: item.guessing,
        status: "ACTIVE", tags: item.tags, content: item.content,
      },
    });
    created++;
  }
  console.log(`✓ ${MODULE_TITLE}: ${created} items seeded (CEFR ${CEFR_BAND}).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
