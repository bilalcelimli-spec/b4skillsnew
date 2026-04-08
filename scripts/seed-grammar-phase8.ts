/**
 * PHASE 8 — Chapters 13 & 14
 * Topics: Adverbial Clauses (all types) · Participial Phrases (-ing, -ed, perfect, idiomatic)
 * 5 questions per sub-topic
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const items = [
  // ── CH13 · ADVERBIAL CLAUSES OF TIME ────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['adverbial-clauses', 'time'],
    content: {
      prompt: '"____ she graduates, she will apply to several law firms." Which time subordinator is correct?',
      options: [
        { text: 'Once',   isCorrect: true,  rationale: '"Once" = as soon as/after; signals immediate sequence after the condition is met.' },
        { text: 'While',  isCorrect: false, rationale: '"While" indicates simultaneous or background actions, not sequence.' },
        { text: 'Since',  isCorrect: false, rationale: '"Since" marks a start point for duration, not a future sequence.' },
        { text: 'Until',  isCorrect: false, rationale: '"Until" = up to the point in time; implies delay, not immediate sequence after.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['adverbial-clauses', 'time', 'no-will-in-adverbial'],
    content: {
      prompt: '"We will begin the audit ____ all the documents are received." Which form is correct in the time clause?',
      options: [
        { text: 'when … are received (present, not future)',       isCorrect: true,  rationale: 'In adverbial time clauses, the present tense replaces will/future.' },
        { text: 'when … will be received (future passive)',        isCorrect: false, rationale: '"Will" cannot appear in the subordinate time clause.' },
        { text: 'when … are going to be received',                isCorrect: false, rationale: '"Going to" is also not used in time subordinate clauses.' },
        { text: 'when … shall be received',                       isCorrect: false, rationale: '"Shall" in the time clause is also non-standard in modern English.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['adverbial-clauses', 'time', 'past-duration'],
    content: {
      prompt: '"____ she had been working there for a year, she was promoted." Which subordinator expresses duration up to a past point?',
      options: [
        { text: 'By the time',   isCorrect: true,  rationale: '"By the time … had been working" = at/before a past deadline (past perfect used).' },
        { text: 'As soon as',    isCorrect: false, rationale: '"As soon as" marks immediate sequence, not duration.' },
        { text: 'In case',       isCorrect: false, rationale: '"In case" signals precaution, not time.' },
        { text: 'Whereas',       isCorrect: false, rationale: '"Whereas" signals contrast, not time duration.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ['adverbial-clauses', 'time', 'while-when'],
    content: {
      prompt: '"____ the manager was presenting, her phone rang." Which time subordinator is best for a background ongoing action?',
      options: [
        { text: 'While',  isCorrect: true,  rationale: '"While" + past continuous = ongoing background action interrupted by a shorter event.' },
        { text: 'When',   isCorrect: false, rationale: '"When" is more natural with the shorter event: "When her phone rang, …".' },
        { text: 'Before', isCorrect: false, rationale: '"Before" signals prior sequence, not simultaneity.' },
        { text: 'After',  isCorrect: false, rationale: '"After" signals subsequent sequence, not background.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['adverbial-clauses', 'time', 'hardly-when'],
    content: {
      prompt: '"____ she had sat down ____ the alarm went off." Which correlative time structure is correct?',
      options: [
        { text: 'Hardly / when',    isCorrect: true,  rationale: '"Hardly … when …" = no sooner than; expresses an almost immediate sequence.' },
        { text: 'Barely / than',    isCorrect: false, rationale: '"Barely … than" is nonstandard; "no sooner … than" is the paired structure.' },
        { text: 'Scarcely / that',  isCorrect: false, rationale: '"Scarcely … when/before" is the correct pairing, not "that".' },
        { text: 'Hardly / that',    isCorrect: false, rationale: '"Hardly … when/before" is the standard pairing.' },
      ],
    },
  },

  // ── CH13 · ADVERBIAL CLAUSES OF REASON, CONCESSION, PURPOSE, RESULT ─────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['adverbial-clauses', 'reason'],
    content: {
      prompt: '"____ the roads were icy, the bus service was cancelled." Which subordinator of reason is correct?',
      options: [
        { text: 'Because',  isCorrect: true,  rationale: '"Because" directly introduces a reason clause and can begin a sentence.' },
        { text: 'Although', isCorrect: false, rationale: '"Although" signals concession/contrast, not reason.' },
        { text: 'So that',  isCorrect: false, rationale: '"So that" introduces purpose/result, not reason.' },
        { text: 'Even if',  isCorrect: false, rationale: '"Even if" introduces a hypothetical concessive, not a reason.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['adverbial-clauses', 'concession'],
    content: {
      prompt: '"____ the project faced numerous setbacks, the team delivered on time." Which subordinator signals concession?',
      options: [
        { text: 'Although',  isCorrect: true,  rationale: '"Although" = despite the fact that; signals that the main clause is surprising given the subordinate clause.' },
        { text: 'Because',   isCorrect: false, rationale: '"Because" signals cause, not concession.' },
        { text: 'Unless',    isCorrect: false, rationale: '"Unless" signals negative condition, not concession.' },
        { text: 'As long as',isCorrect: false, rationale: '"As long as" signals positive condition.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['adverbial-clauses', 'purpose'],
    content: {
      prompt: '"She saved all correspondence ____ she could provide evidence later." Which purpose subordinator is correct?',
      options: [
        { text: 'so that',    isCorrect: true,  rationale: '"So that" + modal (could) is the standard purpose clause.' },
        { text: 'because',    isCorrect: false, rationale: '"Because" gives a reason that already exists; "so that" looks forward to a goal.' },
        { text: 'although',   isCorrect: false, rationale: '"Although" signals concession.' },
        { text: 'in case',    isCorrect: false, rationale: '"In case" = precaution/possibility; "so that" = intended result.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['adverbial-clauses', 'result'],
    content: {
      prompt: '"The evidence was ____ compelling ____ the jury reached a verdict within two hours." Which result structure is correct?',
      options: [
        { text: 'so / that',       isCorrect: true,  rationale: '"So + adjective + that" introduces a result clause.' },
        { text: 'such / that',     isCorrect: false, rationale: '"Such + noun phrase + that" — here the complement is an adjective, not a noun phrase.' },
        { text: 'too / to',        isCorrect: false, rationale: '"Too … to …" signals excess preventing action, not factual result.' },
        { text: 'very / that',     isCorrect: false, rationale: '"Very" does not introduce result clauses; "so … that" does.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['adverbial-clauses', 'concession', 'even-though'],
    content: {
      prompt: '"____ she may have had reservations, she signed the agreement." Which choice expresses strong concession with a possible truth?',
      options: [
        { text: 'Even though',  isCorrect: true,  rationale: '"Even though" = although (with stronger concessive force); accepts the truth of the subordinate clause.' },
        { text: 'Even if',      isCorrect: false, rationale: '"Even if" = even in the hypothetical case that; implies doubt about the truth.' },
        { text: 'Whereas',      isCorrect: false, rationale: '"Whereas" signals a stark contrast, not concession.' },
        { text: 'Provided that',isCorrect: false, rationale: '"Provided that" introduces a condition, not concession.' },
      ],
    },
  },

  // ── CH14 · PARTICIPIAL PHRASES ───────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['participial-phrases', 'active-participle'],
    content: {
      prompt: '"____ through the data, the analyst discovered a significant anomaly." Which active participial form is correct (simultaneous action)?',
      options: [
        { text: 'Searching (present participle)',          isCorrect: true,  rationale: 'Present (-ing) participle = action simultaneous with the main verb; same subject implied.' },
        { text: 'Having searched (perfect participle)',    isCorrect: false, rationale: '"Having searched" suggests the participial action completed BEFORE the main action.' },
        { text: 'Searched (past participle)',              isCorrect: false, rationale: 'Past participle forms passive participial phrases, not active simultaneous ones.' },
        { text: 'To search (to-infinitive)',               isCorrect: false, rationale: 'Infinitive phrase implies purpose, not simultaneity.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['participial-phrases', 'passive-participle'],
    content: {
      prompt: '"____ for budgetary mismanagement, the director resigned immediately." Which passive participial phrase is correct?',
      options: [
        { text: 'Criticised',          isCorrect: true,  rationale: 'Past/passive participle forms a passive participial phrase; the subject of the main clause (the director) was criticised.' },
        { text: 'Criticising',         isCorrect: false, rationale: 'Active -ing participle = the subject did the criticising, which is illogical.' },
        { text: 'Having criticised',   isCorrect: false, rationale: 'Perfect active participle — would mean the director criticised someone else first.' },
        { text: 'Being criticised',    isCorrect: false, rationale: '"Being criticised" is also passive but suggests the criticism is ongoing/simultaneous, which is slightly different.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['participial-phrases', 'perfect-participle'],
    content: {
      prompt: '"____ the negotiations, the delegate returned to the capital." Which participial phrase shows the action occurred BEFORE the main verb?',
      options: [
        { text: 'Having concluded',   isCorrect: true,  rationale: '"Having + past participle" = perfect participle, signals prior completion before the main action.' },
        { text: 'Concluding',         isCorrect: false, rationale: 'Present participle shows simultaneity, not prior completion.' },
        { text: 'Concluded',          isCorrect: false, rationale: 'Bare past participle is passive; "Having concluded" is the active perfect form.' },
        { text: 'To conclude',        isCorrect: false, rationale: 'Infinitive expresses purpose, not completed prior action.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['participial-phrases', 'dangling-participle'],
    content: {
      prompt: '"Walking to the office, the thunderstorm began." Why is this sentence grammatically problematic?',
      options: [
        { text: 'Dangling participle — "walking" implies the thunderstorm was walking.',     isCorrect: true,  rationale: 'The subject of the main clause must be the implied subject of the participial phrase.' },
        { text: 'The present participle cannot be used with storms.',                        isCorrect: false, rationale: 'The error is a structural/logical mismatch, not a lexical restriction.' },
        { text: 'A time clause would be grammatically clearer.',                            isCorrect: false, rationale: 'This is a solution, not the grammatical problem label.' },
        { text: 'The sentence needs a perfect participle.',                                 isCorrect: false, rationale: 'The issue is subject mismatch, not tense of the participle.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['participial-phrases', 'absolute-construction'],
    content: {
      prompt: '"The meeting having ended, the delegates dispersed quickly." The underlined phrase is an:',
      options: [
        { text: 'Absolute (nominative absolute) construction — the subject of the participle differs from the main subject.', isCorrect: true,  rationale: 'Absolute constructions have their own subject ("The meeting"), distinct from the main clause subject ("delegates").' },
        { text: 'Dangling participle, because subjects differ.',                                                              isCorrect: false, rationale: 'In absolute constructions, a different subject is grammatically correct and expected.' },
        { text: 'Subordinate time clause equivalent to "after the meeting ended".',                                           isCorrect: false, rationale: 'Though semantically similar, the grammatical label is "absolute construction".' },
        { text: 'Non-defining relative clause reduced form.',                                                                 isCorrect: false, rationale: 'Absolute constructions are not relative clause reductions.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Phase 8 grammar items (${items.length} total)…`);
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
  console.log(`✓ Phase 8 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
