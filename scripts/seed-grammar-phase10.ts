/**
 * PHASE 10 — Chapters 17, 18 & 19
 * Topics: Sentence Connectors · Prepositions & Prepositional Phrases · Sentence Variety
 * 5 questions per sub-topic
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const items = [
  // ── CH17 · SENTENCE CONNECTORS — CAUSE & EFFECT ─────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['sentence-connectors', 'cause-effect'],
    content: {
      prompt: '"The factory was operating at maximum capacity; ____, output still failed to meet demand." Which connector signals effect/result?',
      options: [
        { text: 'nevertheless',  isCorrect: false, rationale: '"Nevertheless" signals concessive contrast (result is unexpected), not a direct causal result.' },
        { text: 'consequently',  isCorrect: true,  rationale: '"Consequently" signals that the second clause is the direct result of the first.' },
        { text: 'alternatively', isCorrect: false, rationale: '"Alternatively" signals a different option, not a result.' },
        { text: 'similarly',     isCorrect: false, rationale: '"Similarly" signals likeness/comparison.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['sentence-connectors', 'addition'],
    content: {
      prompt: '"The policy reduces emissions; ____, it creates jobs in the renewable energy sector." Which connector adds information?',
      options: [
        { text: 'furthermore',   isCorrect: true,  rationale: '"Furthermore" adds a point that reinforces or supplements the preceding one.' },
        { text: 'however',       isCorrect: false, rationale: '"However" signals contrast, not addition.' },
        { text: 'in contrast',   isCorrect: false, rationale: '"In contrast" signals opposition.' },
        { text: 'for instance',  isCorrect: false, rationale: '"For instance" introduces an example, not additional parallel information.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['sentence-connectors', 'contrast'],
    content: {
      prompt: '"The methodology was rigorous; ____, the sample size was too small to generalise." Which connector signals contrast/concession?',
      options: [
        { text: 'however',        isCorrect: true,  rationale: '"However" is the standard contrast/concessive connector between two clauses.' },
        { text: 'therefore',      isCorrect: false, rationale: '"Therefore" signals result.' },
        { text: 'furthermore',    isCorrect: false, rationale: '"Furthermore" signals addition.' },
        { text: 'for example',    isCorrect: false, rationale: '"For example" introduces an illustration.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['sentence-connectors', 'concessive'],
    content: {
      prompt: '"The budget was approved. ____, the implementation phase has been delayed." Which connector signals an unexpected contrast ("in spite of this")?',
      options: [
        { text: 'Nevertheless',   isCorrect: true,  rationale: '"Nevertheless" = in spite of this; the second statement is unexpected given the first.' },
        { text: 'Consequently',   isCorrect: false, rationale: '"Consequently" signals expected result.' },
        { text: 'Additionally',   isCorrect: false, rationale: '"Additionally" is an additive connector.' },
        { text: 'Similarly',      isCorrect: false, rationale: '"Similarly" is a comparative connector.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['sentence-connectors', 'condition'],
    content: {
      prompt: '"The data must be validated first; ____, the model cannot be deployed." Which connector expresses "if not" / negative condition?',
      options: [
        { text: 'otherwise',   isCorrect: true,  rationale: '"Otherwise" = if not / in the other case; signals a negative conditional consequence.' },
        { text: 'moreover',    isCorrect: false, rationale: '"Moreover" adds information, not a conditional consequence.' },
        { text: 'hence',       isCorrect: false, rationale: '"Hence" signals result of a positive fact, not a negative condition.' },
        { text: 'namely',      isCorrect: false, rationale: '"Namely" introduces a specification or restatement.' },
      ],
    },
  },

  // ── CH18 · PREPOSITIONS AND PREPOSITIONAL PHRASES ────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['prepositions', 'time'],
    content: {
      prompt: '"The conference will be held ____ the third week ____ November." Which prepositions are correct?',
      options: [
        { text: 'in / of',    isCorrect: true,  rationale: '"In" is used before week/month references; "of" links the week to the month: "in the third week of November".' },
        { text: 'on / of',    isCorrect: false, rationale: '"On" is used for specific dates/days, not weeks.' },
        { text: 'at / in',    isCorrect: false, rationale: '"At" denotes precise times (at noon), not periods.' },
        { text: 'during / at',isCorrect: false, rationale: '"During" can precede the noun phrase but "at" before the month is wrong.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['prepositions', 'adjective-preposition'],
    content: {
      prompt: '"The committee was deeply concerned ____ the rise in antibiotic resistance." Which preposition follows "concerned"?',
      options: [
        { text: 'about',  isCorrect: true,  rationale: '"Concerned about" = worried about; "about" collocates with concern relating to an issue.' },
        { text: 'with',   isCorrect: false, rationale: '"Concerned with" = involved with/dealing with — a different meaning.' },
        { text: 'for',    isCorrect: false, rationale: '"Concerned for" = worried about someone\'s welfare, not a general issue.' },
        { text: 'in',     isCorrect: false, rationale: '"Concerned in" is archaic/rare (involved in a matter).' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['prepositions', 'verb-preposition'],
    content: {
      prompt: '"The committee is currently looking ____ a sustainable solution to the waste problem." Which preposition is correct?',
      options: [
        { text: 'for (looking for = searching for)',     isCorrect: true,  rationale: '"Look for" = search for/seek.' },
        { text: 'at (looking at = examining)',           isCorrect: false, rationale: '"Look at" = direct one\'s gaze / examine — possible but changes the meaning to "examining a solution" rather than seeking one.' },
        { text: 'into (looking into = investigating)',   isCorrect: false, rationale: '"Look into" = investigate — possible in context but the answer with "for" aligns with a search for a solution.' },
        { text: 'after (looking after = caring for)',   isCorrect: false, rationale: '"Look after" = take care of — unrelated meaning.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['prepositions', 'idiomatic'],
    content: {
      prompt: '"____ long last, the arbitration panel reached a binding verdict." Which idiomatic prepositional phrase correctly signals the end of a long wait?',
      options: [
        { text: 'At',    isCorrect: true,  rationale: '"At long last" = finally, after a long time — an idiomatic prepositional phrase.' },
        { text: 'In',    isCorrect: false, rationale: '"In long last" is not a standard idiom.' },
        { text: 'For',   isCorrect: false, rationale: '"For long last" is not idiomatic.' },
        { text: 'After', isCorrect: false, rationale: '"After long last" is not a fixed idiom (though "after all this time" is).' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['prepositions', 'noun-preposition'],
    content: {
      prompt: '"There is a clear need ____ transparency in the procurement process." Which preposition follows "need" as a noun?',
      options: [
        { text: 'for',   isCorrect: true,  rationale: '"A need for" = the noun collocation; "for" indicates the purpose/requirement.' },
        { text: 'of',    isCorrect: false, rationale: '"A need of" is archaic; modern English uses "a need for".' },
        { text: 'to',    isCorrect: false, rationale: '"Need to" is used with verbs (need to do), not nouns (a need to transparency is ungrammatical).' },
        { text: 'in',    isCorrect: false, rationale: '"A need in" is not a standard collocation.' },
      ],
    },
  },

  // ── CH19 · SENTENCE VARIETY — ADDITION AND CAUSE-EFFECT ─────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['sentence-variety', 'addition', 'in-addition-to'],
    content: {
      prompt: '"____ managing the team, she also presented the quarterly results." Which phrase signals addition with a gerund?',
      options: [
        { text: 'In addition to',   isCorrect: true,  rationale: '"In addition to" is a prepositional phrase that takes a gerund: "In addition to managing".' },
        { text: 'In addition',      isCorrect: false, rationale: '"In addition" is a connector used between clauses, not followed directly by a gerund phrase.' },
        { text: 'Besides',          isCorrect: false, rationale: '"Besides managing" is also grammatically correct but the question targets "in addition to".' },
        { text: 'Furthermore',      isCorrect: false, rationale: '"Furthermore" is a clause connector; it cannot precede a gerund phrase.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['sentence-variety', 'cause-effect', 'due-to'],
    content: {
      prompt: '"____ the prolonged drought, crop yields fell sharply this year." Which cause expression is correct before a noun phrase?',
      options: [
        { text: 'Due to',      isCorrect: true,  rationale: '"Due to" precedes a noun phrase to signal cause: "Due to the drought".' },
        { text: 'Because',     isCorrect: false, rationale: '"Because" introduces a finite clause, not a noun phrase.' },
        { text: 'Since',       isCorrect: false, rationale: '"Since" introduces a finite clause when used causally, not a noun phrase.' },
        { text: 'So',          isCorrect: false, rationale: '"So" signals result, not cause.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['sentence-variety', 'concessive', 'despite'],
    content: {
      prompt: '"____ the economic downturn, the company maintained its workforce." Which preposition signals concession before a noun phrase?',
      options: [
        { text: 'Despite',       isCorrect: true,  rationale: '"Despite" + noun phrase = concessive preposition; no "of" follows.' },
        { text: 'In spite',      isCorrect: false, rationale: '"In spite" must be followed by "of": "In spite of the downturn".' },
        { text: 'Although',      isCorrect: false, rationale: '"Although" introduces a finite clause, not a noun phrase.' },
        { text: 'However',       isCorrect: false, rationale: '"However" is a connector, not a preposition preceding a noun phrase.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['sentence-variety', 'purpose', 'in-order-to'],
    content: {
      prompt: '"She restructured the entire department ____ improve cross-functional communication." Which purpose expression is most formal?',
      options: [
        { text: 'in order to',   isCorrect: true,  rationale: '"In order to" is the more formal and explicit purpose expression, preferred in academic/professional writing.' },
        { text: 'to',            isCorrect: false, rationale: '"To" (bare infinitive of purpose) is correct but less formal than "in order to".' },
        { text: 'so as to',      isCorrect: false, rationale: '"So as to" is also formal but slightly less common than "in order to" in contemporary professional writing.' },
        { text: 'for',           isCorrect: false, rationale: '"For" purpose precedes a noun, not an infinitive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['sentence-variety', 'contrast', 'while-whereas'],
    content: {
      prompt: '"____ traditional models rely on historical averages, adaptive models recalibrate in real time." Which subordinator best emphasises structural contrast?',
      options: [
        { text: 'Whereas',   isCorrect: true,  rationale: '"Whereas" signals a stark, explicit contrast between two parallel states — preferred for structural contrast in academic writing.' },
        { text: 'While',     isCorrect: false, rationale: '"While" can signal contrast but also simultaneity; "whereas" is more precise for contrast only.' },
        { text: 'Although',  isCorrect: false, rationale: '"Although" introduces concession, implying one fact is unexpected given the other; "whereas" is a direct contrast.' },
        { text: 'Because',   isCorrect: false, rationale: '"Because" introduces cause, not contrast.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Phase 10 grammar items (${items.length} total)…`);
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
  console.log(`✓ Phase 10 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
