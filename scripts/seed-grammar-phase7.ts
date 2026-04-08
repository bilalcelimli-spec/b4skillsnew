/**
 * PHASE 7 — Chapters 11 & 12
 * Topics: -Ever Words · Correlative Conjunctions · Conditional Sentences (Types 0–3 + Mixed) · Wish Clauses
 * 5 questions per sub-topic
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const items = [
  // ── CH11 · -EVER WORDS (FREE RELATIVES / CONCESSIVE CLAUSES) ─────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['ever-words', 'whoever'],
    content: {
      prompt: '"____ breaks the confidentiality agreement will face immediate dismissal." Which -ever word is correct?',
      options: [
        { text: 'Whoever',  isCorrect: true,  rationale: '"Whoever" = any person who; the clause functions as the sentence subject.' },
        { text: 'Whatever', isCorrect: false, rationale: '"Whatever" refers to things, not people.' },
        { text: 'Whenever', isCorrect: false, rationale: '"Whenever" refers to time, not people.' },
        { text: 'Wherever', isCorrect: false, rationale: '"Wherever" refers to place, not people.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['ever-words', 'whichever'],
    content: {
      prompt: '"____ route you take, you will encounter heavy delays." The -ever clause means:',
      options: [
        { text: 'No matter which route.',   isCorrect: true,  rationale: '"Whichever" = no matter which; it introduces a concessive free relative.' },
        { text: 'Only one specific route.', isCorrect: false, rationale: '"Whichever" implies any selection from a set, not restriction to one.' },
        { text: 'Whenever you take a route.',isCorrect: false, rationale: '"Whenever" refers to time, not choice of route.' },
        { text: 'However you choose routes.',isCorrect: false, rationale: '"However" refers to manner/degree, not a choice of thing.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['ever-words', 'however'],
    content: {
      prompt: '"____ much they invest, the returns remain disappointing." Which -ever word modifies a degree expression?',
      options: [
        { text: 'However',  isCorrect: true,  rationale: '"However much" = no matter how much; "however" precedes adjectives/adverbs to express concessive degree.' },
        { text: 'Whatever', isCorrect: false, rationale: '"Whatever much" is ungrammatical; "whatever" modifies nouns, not adjectives.' },
        { text: 'Whoever',  isCorrect: false, rationale: '"Whoever" refers to people, not degree.' },
        { text: 'Wherever', isCorrect: false, rationale: '"Wherever" refers to place, not degree.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ['ever-words', 'whatever'],
    content: {
      prompt: '"____ the outcome, the team should maintain its composure." Which -ever word is correct?',
      options: [
        { text: 'Whatever',  isCorrect: true,  rationale: '"Whatever the outcome" = regardless of what the outcome is — refers to a thing/situation.' },
        { text: 'Whoever',   isCorrect: false, rationale: '"Whoever" refers to people; "outcome" is a thing.' },
        { text: 'Whichever', isCorrect: false, rationale: '"Whichever" implies a selection from alternatives; "outcome" is not one of a set here.' },
        { text: 'Whenever',  isCorrect: false, rationale: '"Whenever" refers to time.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['ever-words', 'wherever'],
    content: {
      prompt: '"____ she travelled for work, the company covered all expenses." What does "wherever" express here?',
      options: [
        { text: 'Any/every place — a free relative of place.',  isCorrect: true,  rationale: '"Wherever" = no matter where / in every place that.' },
        { text: 'A specific destination.',                     isCorrect: false, rationale: '"Wherever" is non-specific; it is general/universal.' },
        { text: 'Time of travel.',                             isCorrect: false, rationale: '"Whenever" refers to time.' },
        { text: 'The person who traveled.',                    isCorrect: false, rationale: '"Whoever" refers to person, not place.' },
      ],
    },
  },

  // ── CH11 · CORRELATIVE CONJUNCTIONS ─────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['correlative-conjunctions', 'both-and'],
    content: {
      prompt: '"____ the CEO ____ the board approved the merger." Which correlative pair is correct?',
      options: [
        { text: 'Both / and',         isCorrect: true,  rationale: '"Both … and …" connects two subjects; verb agrees with a plural subject.' },
        { text: 'Either / and',       isCorrect: false, rationale: '"Either … or …" is the correct pair — "either/and" is ungrammatical.' },
        { text: 'Neither / nor',      isCorrect: false, rationale: '"Neither … nor …" is negative; the sentence is affirmative.' },
        { text: 'Not only / also',    isCorrect: false, rationale: '"Not only … but also …" is the correct pair.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['correlative-conjunctions', 'neither-nor'],
    content: {
      prompt: '"Neither the director nor the managers ____ informed in advance." Which verb form is correct?',
      options: [
        { text: 'were (plural, proximity agreement with "managers")', isCorrect: true,  rationale: 'With "neither … nor", the verb agrees with the nearest subject (proximity rule): "managers" → "were".' },
        { text: 'was (singular, "neither" triggers singular)',        isCorrect: false, rationale: 'If the nearer noun were singular, "was" would be used; here "managers" is plural.' },
        { text: 'are (present for habitual meaning)',                 isCorrect: false, rationale: 'The context requires past tense.' },
        { text: 'have been (present perfect)',                        isCorrect: false, rationale: 'Nothing in the sentence signals a present-perfect context.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['correlative-conjunctions', 'not-only-but-also', 'fronting'],
    content: {
      prompt: '"Not only ____ we reduce costs, but we also improved quality." Which auxiliary restores correct word order after fronted "not only"?',
      options: [
        { text: 'did (Not only did we reduce…)',   isCorrect: true,  rationale: 'When "not only" is fronted, subject–auxiliary inversion is required: "Not only did we …".' },
        { text: 'we (Not only we reduce…)',        isCorrect: false, rationale: 'No inversion = ungrammatical after fronted "not only".' },
        { text: 'have (Not only have we reduce…)', isCorrect: false, rationale: '"Have" + base form is incorrect; should be "have reduced" with present perfect context.' },
        { text: 'can (Not only can we reduce…)',   isCorrect: false, rationale: '"Can" changes the modality to present ability, which is inconsistent with the past context.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ['correlative-conjunctions', 'either-or'],
    content: {
      prompt: '"____ you leave now ____ you face disciplinary action." Which correlative pair expresses alternatives?',
      options: [
        { text: 'Either / or',      isCorrect: true,  rationale: '"Either … or …" presents mutually exclusive alternatives.' },
        { text: 'Both / and',       isCorrect: false, rationale: '"Both … and …" is additive, not alternative.' },
        { text: 'Neither / nor',    isCorrect: false, rationale: '"Neither … nor …" is doubly negative.' },
        { text: 'Whether / or not', isCorrect: false, rationale: '"Whether … or not" is used in indirect questions or noun clauses, not for alternatives in main clauses this way.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['correlative-conjunctions', 'parallelism'],
    content: {
      prompt: '"Not only ____, but she also challenged the assumptions underlying the model." Which maintains parallel structure?',
      options: [
        { text: 'did she critique the data',              isCorrect: true,  rationale: 'Both clauses contain subject + verb + object, maintaining grammatical parallelism.' },
        { text: 'the critique of the data by her',        isCorrect: false, rationale: 'Nominalization breaks the verbal parallelism.' },
        { text: 'data was critiqued',                     isCorrect: false, rationale: 'Passive voice breaks the active parallel structure.' },
        { text: 'critiquing the data was her aim',        isCorrect: false, rationale: 'Gerund phrase as subject breaks the parallelism.' },
      ],
    },
  },

  // ── CH12 · CONDITIONAL SENTENCES (TYPES 0–3 + MIXED) ───────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['conditionals', 'zero-conditional'],
    content: {
      prompt: '"If you heat water to 100°C, it ____." Which form is correct for a zero conditional (scientific truth)?',
      options: [
        { text: 'boils (simple present)',          isCorrect: true,  rationale: 'Zero conditional: if + simple present → simple present (universal truth).' },
        { text: 'would boil (would + base)',       isCorrect: false, rationale: '"Would boil" is for hypothetical (second conditional), not general truths.' },
        { text: 'will have boiled (future perfect)',isCorrect: false, rationale: 'Future perfect is not used for zero conditional truths.' },
        { text: 'has boiled (present perfect)',    isCorrect: false, rationale: 'Present perfect is not the correct form for zero conditional.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['conditionals', 'first-conditional'],
    content: {
      prompt: '"If the funding is approved next month, we ____ hire additional staff." Which verb form is correct?',
      options: [
        { text: 'will',       isCorrect: true,  rationale: 'First conditional: if + present tense → will + base verb (real future possibility).' },
        { text: 'would',      isCorrect: false, rationale: '"Would" is for second conditional (hypothetical/unreal present/future).' },
        { text: 'should',     isCorrect: false, rationale: '"Should" would change the meaning to obligation or tentative suggestion.' },
        { text: 'have hired', isCorrect: false, rationale: 'Present perfect does not fit the future result clause.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['conditionals', 'second-conditional'],
    content: {
      prompt: '"If she ____ the director, she would restructure the entire department." Which verb form is correct?',
      options: [
        { text: 'were (If she were the director…)',  isCorrect: true,  rationale: 'Second conditional uses past subjunctive "were" for all persons; hypothetical present/future.' },
        { text: 'was',                               isCorrect: false, rationale: '"Was" is used informally; formal and exam English requires the subjunctive "were".' },
        { text: 'is',                                isCorrect: false, rationale: 'Present "is" would make it a first conditional (real possibility), but the context is hypothetical.' },
        { text: 'had been',                          isCorrect: false, rationale: '"Had been" is used in third conditional (unreal past).' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['conditionals', 'third-conditional'],
    content: {
      prompt: '"If they ____ the warning, the accident would have been avoided." Third conditional — choose the correct form.',
      options: [
        { text: 'had heeded',      isCorrect: true,  rationale: 'Third conditional: if + past perfect → would + have + past participle (unreal past).' },
        { text: 'heeded',          isCorrect: false, rationale: 'Simple past is used in second conditional, not third.' },
        { text: 'have heeded',     isCorrect: false, rationale: 'Present perfect is not used in the if-clause of a third conditional.' },
        { text: 'would have heeded',isCorrect: false, rationale: '"Would" does not appear in the if-clause of a conditional.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['conditionals', 'mixed-conditional'],
    content: {
      prompt: '"If she ____ (study) medicine twenty years ago, she would be a doctor now." This is a MIXED conditional. Which verb form is correct in the if-clause?',
      options: [
        { text: 'had studied',        isCorrect: true,  rationale: 'Mixed conditional: past unreal condition (had + pp) → present unreal result (would + base). The if-clause refers to the past.' },
        { text: 'studied',            isCorrect: false, rationale: 'Simple past is for second conditional (unreal present/future), not a past-to-present mixed form.' },
        { text: 'would have studied', isCorrect: false, rationale: '"Would" does not belong in the if-clause.' },
        { text: 'has studied',        isCorrect: false, rationale: 'Present perfect does not form the past-condition half of a mixed conditional.' },
      ],
    },
  },

  // ── CH12 · WISH CLAUSES ──────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['wish-clauses', 'present-wish'],
    content: {
      prompt: '"I wish I ____ speak three languages." (present unreal wish) Which form is correct?',
      options: [
        { text: 'could',   isCorrect: true,  rationale: '"Wish + could" expresses a present unreal wish about ability.' },
        { text: 'can',     isCorrect: false, rationale: '"Can" is the present indicative; wishes require back-shifted forms.' },
        { text: 'will',    isCorrect: false, rationale: '"Wish + will" expresses future want/annoyance, not present ability.' },
        { text: 'would',   isCorrect: false, rationale: '"Wish + would" complains about another person\'s behaviour or expresses future desire, not ability.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['wish-clauses', 'past-wish'],
    content: {
      prompt: '"She wishes she ____ more carefully before signing the contract." (regret about the past) Choose the correct form.',
      options: [
        { text: 'had read',    isCorrect: true,  rationale: '"Wish + past perfect" expresses regret about a past event.' },
        { text: 'read',        isCorrect: false, rationale: 'Simple past after "wish" refers to present/future unreality, not past regret.' },
        { text: 'would read',  isCorrect: false, rationale: '"Wish + would" is used for future wish or complaint, not past regret.' },
        { text: 'has read',    isCorrect: false, rationale: 'Present perfect is not the correct form for past-regret wish clauses.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['wish-clauses', 'annoyance-wish'],
    content: {
      prompt: '"I wish people ____ littering in the park." (expressing annoyance about a repeated behavior) Which form is correct?',
      options: [
        { text: 'would stop',  isCorrect: true,  rationale: '"Wish + would" expresses annoyance or a desire for change in another\'s behaviour.' },
        { text: 'stop',        isCorrect: false, rationale: 'Base form after "wish" is not standard.' },
        { text: 'stopped',     isCorrect: false, rationale: '"Wish + past simple" = present unreal wish, not complaint about others\' behaviour.' },
        { text: 'had stopped', isCorrect: false, rationale: '"Wish + past perfect" = past regret, not present annoyance.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['wish-clauses', 'if-only'],
    content: {
      prompt: '"If only the committee ____ her recommendation more seriously at the time!" Identify the structure and meaning.',
      options: [
        { text: '"Had taken" — past perfect expressing regret about the past.',      isCorrect: true,  rationale: '"If only + past perfect" = strong regret about what did not happen in the past.' },
        { text: '"Took" — simple past expressing present wish.',                    isCorrect: false, rationale: '"If only + simple past" = present unreal wish, not past regret.' },
        { text: '"Would take" — future wish expressing annoyance.',                 isCorrect: false, rationale: '"If only + would" = annoyance about current behaviour, not past regret.' },
        { text: '"Takes" — present to express a habitual wish.',                   isCorrect: false, rationale: '"If only + present" is non-standard; present unreal requires past back-shift.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['wish-clauses', 'subjunctive-were'],
    content: {
      prompt: '"I wish I ____ on a different continent right now." (present unreal with "be") Which form is required in formal English?',
      options: [
        { text: 'were',   isCorrect: true,  rationale: '"Wish + were" (subjunctive) is the formal standard for all subjects in present unreal wishes with "be".' },
        { text: 'was',    isCorrect: false, rationale: '"Was" is informal and accepted in spoken English but not in formal/exam contexts.' },
        { text: 'am',     isCorrect: false, rationale: 'Present indicative "am" does not express unreality.' },
        { text: 'be',     isCorrect: false, rationale: '"Be" is the base form; the back-shifted form "were" is required for present unreal wish.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Phase 7 grammar items (${items.length} total)…`);
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
  console.log(`✓ Phase 7 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
