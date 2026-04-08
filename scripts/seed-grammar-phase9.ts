/**
 * PHASE 9 — Chapters 15 & 16
 * Topics: Inversion · Structural Parallelism · Auxiliary Structures (so/neither, tag questions)
 *         · Subjunctive · Finite vs Non-finite Clauses · Passive/Active Constructions
 *         · Clause Reduction with Infinitives
 * 5 questions per sub-topic
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const items = [
  // ── CH15 · INVERSION ─────────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['inversion', 'negative-adverbial'],
    content: {
      prompt: '"____ had we left the building when the fire alarm sounded." Which negative adverbial triggers inversion?',
      options: [
        { text: 'Hardly',       isCorrect: true,  rationale: '"Hardly" is a negative adverb; when fronted it triggers subject-auxiliary inversion ("Hardly had we left…").' },
        { text: 'After',        isCorrect: false, rationale: '"After" is a time subordinator; it does not trigger inversion.' },
        { text: 'Although',     isCorrect: false, rationale: '"Although" introduces a concessive clause; no inversion.' },
        { text: 'Because',      isCorrect: false, rationale: '"Because" introduces a reason clause; no inversion.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['inversion', 'only-fronting'],
    content: {
      prompt: '"Only after reading the full report ____ the board understand the implications." Complete with correct inversion.',
      options: [
        { text: 'did (Only after reading the full report did the board understand…)',  isCorrect: true,  rationale: '"Only" + adverbial fronted → subject-auxiliary inversion with "did".' },
        { text: 'the board did (no inversion)',                                        isCorrect: false, rationale: 'Inversion is required after a fronted "only"-phrase.' },
        { text: 'could (suggesting ability, not occurrence)',                          isCorrect: false, rationale: '"Could" changes the meaning to ability; "did" reflects a factual past event.' },
        { text: 'will (Only after reading … will the board understand)',               isCorrect: false, rationale: 'The past context requires "did".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['inversion', 'conditional'],
    content: {
      prompt: '"____ the CEO to resign, the share price would collapse." This is an inverted conditional. Which form is correct?',
      options: [
        { text: 'Were',    isCorrect: true,  rationale: '"Were + subject + to-infinitive" is the formal inversion of "if … were to …" (second conditional).' },
        { text: 'If',      isCorrect: false, rationale: 'The question asks for the inverted form (no "if").' },
        { text: 'Should',  isCorrect: false, rationale: '"Should the CEO resign" is an inverted first conditional (unlikely but possible), not a second conditional.' },
        { text: 'Had',     isCorrect: false, rationale: '"Had + subject + past participle" inverts a third conditional (unreal past), not a second conditional.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['inversion', 'place-adverbial'],
    content: {
      prompt: '"On the desk ____ a pile of unanswered correspondence." Which structure shows subject-verb inversion after a place adverbial?',
      options: [
        { text: 'lay (On the desk lay a pile…)',     isCorrect: true,  rationale: 'Place adverbials fronted for stylistic effect trigger inversion of subject and intransitive verb.' },
        { text: 'it lay (On the desk it lay…)',      isCorrect: false, rationale: 'The pronoun subject "it" prevents clean inversion and is unidiomatic here.' },
        { text: 'was lying it (it was lying)',       isCorrect: false, rationale: 'Progressive form with pronoun subject does not reflect the inversion pattern.' },
        { text: 'a pile lay (no inversion)',         isCorrect: false, rationale: 'The standard non-inverted order is grammatical but the question tests the inverted pattern.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['inversion', 'so-neither'],
    content: {
      prompt: '"The finance director approved the budget, and ____ the operations manager." What completes the agreeing auxiliary correctly?',
      options: [
        { text: 'so did',     isCorrect: true,  rationale: '"So + auxiliary + subject" = the same affirmative is true for the second subject.' },
        { text: 'neither did',isCorrect: false, rationale: '"Neither did" is used for agreeing with a negative statement.' },
        { text: 'so approved',isCorrect: false, rationale: 'The full verb is not repeated in this construction; the auxiliary is used.' },
        { text: 'too did so', isCorrect: false, rationale: '"Too" goes at the end ("the operations manager did too") and the word order "too did so" is ungrammatical.' },
      ],
    },
  },

  // ── CH15 · STRUCTURAL PARALLELISM AND TAG QUESTIONS ──────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['parallelism'],
    content: {
      prompt: '"She enjoys reading academic papers, attending conferences, and to discuss research with colleagues." What is the error?',
      options: [
        { text: 'Broken parallelism — "to discuss" should be "discussing" to match the gerund pattern.',  isCorrect: true,  rationale: 'Parallel structure requires the same grammatical form throughout a series.' },
        { text: '"Attending" should be changed to "to attend" to match "to discuss".',                   isCorrect: false, rationale: 'The series is predominantly gerund; the last element is the odd one out.' },
        { text: 'The sentence needs a semicolon after "papers".',                                        isCorrect: false, rationale: 'Punctuation is not the issue here.' },
        { text: '"Reading" is incorrect; a noun form is needed.',                                        isCorrect: false, rationale: '"Reading" as a gerund is correct; the problem is with "to discuss".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['tag-questions'],
    content: {
      prompt: '"She has submitted the final draft, ____?" Which tag question is correct?',
      options: [
        { text: 'hasn\'t she',  isCorrect: true,  rationale: 'Positive statement → negative tag; auxiliary "has" → "hasn\'t she".' },
        { text: 'has she',      isCorrect: false, rationale: 'A positive statement takes a negative tag.' },
        { text: 'didn\'t she',  isCorrect: false, rationale: 'Tag must echo the same auxiliary as the statement ("has", not "did").' },
        { text: 'doesn\'t she', isCorrect: false, rationale: '"Does" is the present simple auxiliary; "has" is the present perfect auxiliary here.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['tag-questions', 'negative-statement'],
    content: {
      prompt: '"Nobody called while I was out, ____?" Which is the correct tag?',
      options: [
        { text: 'did they',    isCorrect: true,  rationale: '"Nobody" = negative subject → positive tag; "nobody" → "they" as pronoun; past simple → "did".' },
        { text: 'didn\'t they',isCorrect: false, rationale: 'Negative subject ("nobody") requires a positive tag.' },
        { text: 'did he',      isCorrect: false, rationale: 'Indefinite pronoun "nobody" takes "they" as the referential pronoun in contemporary English.' },
        { text: 'hadn\'t they',isCorrect: false, rationale: 'The verb in the main clause is simple past ("called"), so "did" is the auxiliary for the tag.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['subjunctive', 'formal'],
    content: {
      prompt: '"The treaty stipulates that all parties ____ bound by the same obligations." Which form represents the formal mandative subjunctive?',
      options: [
        { text: 'be',       isCorrect: true,  rationale: 'Mandative subjunctive = base form ("be") regardless of subject, after verbs of stipulation/demand/requirement.' },
        { text: 'are',      isCorrect: false, rationale: '"Are" is present indicative; the subjunctive requires the base form.' },
        { text: 'should be',isCorrect: false, rationale: '"Should be" is the modal alternative; "be" is the pure subjunctive form.' },
        { text: 'shall be', isCorrect: false, rationale: '"Shall be" implies future obligation, not mandative subjunctive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['subjunctive', 'as-if'],
    content: {
      prompt: '"She speaks as though she ____ the chief architect of the policy." (present unreal) Which subjunctive form is correct?',
      options: [
        { text: 'were',   isCorrect: true,  rationale: '"As if/though + were" = unreal or hypothetical comparison in formal English.' },
        { text: 'is',     isCorrect: false, rationale: '"Is" would imply that she actually is the chief architect (factual interpretation).' },
        { text: 'was',    isCorrect: false, rationale: '"Was" is informal/spoken; formal grammar requires "were" in "as if/though" clauses.' },
        { text: 'had been',isCorrect: false, rationale: '"Had been" is past perfect, used for hypothetical comparisons about the past: "as though she had been the architect before".' },
      ],
    },
  },

  // ── CH16 · CLAUSE REDUCTION (FINITE → NON-FINITE/VERBLESS) ───────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['clause-reduction', 'infinitive'],
    content: {
      prompt: '"They are the first research team that has published on this topic." Reduce the relative clause to an infinitive phrase:',
      options: [
        { text: '"They are the first research team to publish on this topic."',          isCorrect: true,  rationale: 'Ordinal/superlative + noun + relative clause can be reduced to ordinal + noun + to-infinitive.' },
        { text: '"They are the first research team publishing on this topic."',          isCorrect: false, rationale: 'The present participle reduction is less natural after ordinals than the infinitive.' },
        { text: '"They are the first research team who published on this topic."',       isCorrect: false, rationale: 'This is not reduced; the relative pronoun is simply changed.' },
        { text: '"They are the first research team that published on this topic."',      isCorrect: false, rationale: 'Only the relative pronoun is changed, not the clause structure.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['clause-reduction', 'passive-to-participial'],
    content: {
      prompt: '"The regulations that have been revised must be implemented immediately." Reduce the relative clause:',
      options: [
        { text: '"The revised regulations must be implemented immediately."',              isCorrect: true,  rationale: 'Define relative clause with passive "have been revised" → pre-nominal adjective "revised".' },
        { text: '"The regulations revising must be implemented immediately."',             isCorrect: false, rationale: 'Active present participle changes the meaning (regulations don\'t do the revising).' },
        { text: '"The regulations that revised must be implemented immediately."',         isCorrect: false, rationale: 'Active relative "that revised" = the regulations did the revising — different meaning.' },
        { text: '"The regulations having been revised must be implemented immediately."',  isCorrect: false, rationale: 'Perfect passive participle is not the optimal reduction for a pre-nominal position.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['clause-reduction', 'verbless-clause'],
    content: {
      prompt: '"When she was young, she showed exceptional promise." Reduce the adverbial clause to a verbless (adjective) phrase:',
      options: [
        { text: '"Young, she showed exceptional promise."',             isCorrect: true,  rationale: 'Verbless clause: subject + be deleted when main and subordinate subjects are identical.' },
        { text: '"Being young, she showed exceptional promise."',       isCorrect: false, rationale: 'This is a participial phrase reduction, not a verbless one.' },
        { text: '"Having been young, she showed exceptional promise."', isCorrect: false, rationale: 'This perfect participial phrase changes the meaning.' },
        { text: '"She, young, showed exceptional promise."',            isCorrect: false, rationale: 'Postpositive adjective mid-sentence is not the idiomatic reduction pattern.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['clause-reduction', 'active-passive-choice'],
    content: {
      prompt: '"The research ____ by an independent panel is expected to be published next quarter." Which construction is correct?',
      options: [
        { text: 'conducted (passive participial phrase — reduces "that is conducted")',   isCorrect: true,  rationale: 'Passive participial phrase reduces a defining relative clause with passive voice.' },
        { text: 'conducting (active participial phrase)',                                 isCorrect: false, rationale: 'Active participle implies the research is conducting something itself — a category error.' },
        { text: 'to conduct (infinitive phrase)',                                         isCorrect: false, rationale: 'Infinitive phrase implies purpose, not description.' },
        { text: 'of conducting (gerund with preposition)',                               isCorrect: false, rationale: 'A gerund phrase does not function as a relative clause replacement here.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Phase 9 grammar items (${items.length} total)…`);
  let inserted = 0;
  for (const item of items) {
    await prisma.item.create({
      data: {
        type: 'MULTIPLE_CHOICE', skill: item.skill as any, cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty, discrimination: item.discrimination, guessing: item.guessing,
        tags: item.tags, status: 'ACTIVE', content: item.content,
      },
    });
    inserted++;
  }
  console.log(`✓ Phase 9 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
