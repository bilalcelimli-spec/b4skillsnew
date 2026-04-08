/**
 * PHASE 6 — Chapters 9 & 10
 * Topics: Relative (Adjective) Clauses · Noun Clauses
 * 5 questions per sub-topic
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const items = [
  // ── CH9 · RELATIVE CLAUSES — FORMATION ───────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['relative-clauses', 'formation'],
    content: {
      prompt: '"The scientist ____ discovered the compound was awarded the prize." Which relative pronoun is correct (subject role)?',
      options: [
        { text: 'who',   isCorrect: true,  rationale: '"Who" refers to a person and functions as the subject of the relative clause.' },
        { text: 'which', isCorrect: false, rationale: '"Which" refers to things/animals, not people.' },
        { text: 'whom',  isCorrect: false, rationale: '"Whom" occupies object position in the relative clause, not subject position.' },
        { text: 'whose', isCorrect: false, rationale: '"Whose" marks possession, not subject function.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['relative-clauses', 'formation', 'object'],
    content: {
      prompt: '"The candidate ____ they interviewed yesterday withdrew the application." What can replace the blank (object relative)?',
      options: [
        { text: 'whom / that / (zero)',  isCorrect: true,  rationale: '"Whom" (formal), "that" (neutral), or zero relative pronoun are all acceptable for objects.' },
        { text: 'who only',              isCorrect: false, rationale: '"Who" is possible informally but "whom" is standard in the object position in formal English.' },
        { text: 'which',                 isCorrect: false, rationale: '"Which" refers to things, not people.' },
        { text: 'whose',                 isCorrect: false, rationale: '"Whose" signals possession, not object function.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['relative-clauses', 'whose', 'possession'],
    content: {
      prompt: '"The company ____ revenue had tripled attracted several investors." Which relative pronoun shows possession?',
      options: [
        { text: 'whose',  isCorrect: true,  rationale: '"Whose" signals possession and can refer to people, organizations, and things.' },
        { text: 'which',  isCorrect: false, rationale: '"Which" cannot signal possession without a preposition.' },
        { text: 'that',   isCorrect: false, rationale: '"That" cannot be used in non-defining clauses or to show possession in this structure.' },
        { text: 'of which',isCorrect: false,rationale: '"…the revenue of which had tripled" is grammatical but more complex; "whose" is more natural.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['relative-clauses', 'preposition-stranding'],
    content: {
      prompt: '"This is the project ____ she has dedicated three years." Which is formal and correct?',
      options: [
        { text: 'to which',           isCorrect: true,  rationale: '"To which she has dedicated…" — fronted preposition is formal/written.' },
        { text: 'which … to',         isCorrect: false, rationale: '"The project which she has dedicated three years to" — stranded preposition is informal.' },
        { text: 'that',               isCorrect: false, rationale: '"That" cannot follow a fronted preposition; only "which" or "whom" can.' },
        { text: 'whom',               isCorrect: false, rationale: '"Whom" refers to people; "which" refers to things.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['relative-clauses', 'what-clause'],
    content: {
      prompt: '"____ surprised everyone was the speed of the recovery." Which choice correctly introduces a nominal relative clause?',
      options: [
        { text: 'What',   isCorrect: true,  rationale: '"What" = "the thing that"; the whole clause functions as the subject.' },
        { text: 'Which',  isCorrect: false, rationale: '"Which" would need a prior antecedent; it does not introduce a free relative clause in subject position.' },
        { text: 'That',   isCorrect: false, rationale: '"That surprised everyone…" is a defining relative clause, not a nominal relative filling the subject slot here.' },
        { text: 'Who',    isCorrect: false, rationale: '"Who" refers to people; "the speed of recovery" is a thing.' },
      ],
    },
  },

  // ── CH9 · DEFINING VS NON-DEFINING RELATIVE CLAUSES ─────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['relative-clauses', 'defining', 'non-defining'],
    content: {
      prompt: 'Which sentence contains a NON-DEFINING relative clause?',
      options: [
        { text: '"Dr Patel, who chairs the committee, resigned yesterday."', isCorrect: true,  rationale: 'Commas around "who chairs the committee" mark it as non-defining — additional, non-essential information.' },
        { text: '"The researcher who led the study won an award."',          isCorrect: false, rationale: 'No commas = defining clause; it identifies which researcher.' },
        { text: '"The students that pass the test will proceed."',           isCorrect: false, rationale: '"That" signals a defining clause; commas absent.' },
        { text: '"A concept that is often misunderstood is entropy."',       isCorrect: false, rationale: 'Defining clause — identifies which concept.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['relative-clauses', 'non-defining', 'that-restriction'],
    content: {
      prompt: '"My colleague, ____ you met last year, has been promoted." Why is "that" INCORRECT here?',
      options: [
        { text: '"That" cannot be used in non-defining relative clauses.',      isCorrect: true,  rationale: '"That" is only used in defining relative clauses; non-defining clauses require "who/whom/which/whose".' },
        { text: '"That" cannot refer to people.',                               isCorrect: false, rationale: '"That" can informally refer to people in defining clauses.' },
        { text: '"That" requires a preposition before it.',                    isCorrect: false, rationale: 'Preposition + "that" is in fact impossible; preposition + "which/whom" is the rule.' },
        { text: '"That" can only begin subordinate clauses, not main clauses.',isCorrect: false, rationale: 'Irrelevant here; the issue is defining vs non-defining.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['relative-clauses', 'reduction'],
    content: {
      prompt: '"The report ____ submitted last week contained several errors." How was the relative clause reduced?',
      options: [
        { text: 'A passive participial phrase replaced "that was submitted".',  isCorrect: true,  rationale: 'Defining relative clauses with be + past participle can be reduced to a past participial phrase.' },
        { text: 'The relative pronoun was replaced by "that".',                isCorrect: false, rationale: 'The relative pronoun was deleted, not replaced by "that".' },
        { text: 'The active present participle was used.',                     isCorrect: false, rationale: 'Active participle ("submitting") would change meaning.' },
        { text: 'The clause became a non-defining relative clause.',           isCorrect: false, rationale: 'Reduction and non-defining clauses are independent features.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['relative-clauses', 'non-defining', 'sentence-relative'],
    content: {
      prompt: '"She completed the project ahead of schedule, ____ impressed the client greatly." What does the relative pronoun refer to?',
      options: [
        { text: 'The entire preceding clause (sentence relative).',      isCorrect: true,  rationale: '"Which" here is a sentence (connective) relative referring to the whole proposition.' },
        { text: 'The compound noun "project schedule".',                 isCorrect: false, rationale: '"Which" cannot logically refer only to the schedule here.' },
        { text: '"The project" as the antecedent.',                      isCorrect: false, rationale: 'The impressive fact was completing it early — this refers to the whole event.' },
        { text: '"She" as the person who is impressive.',                isCorrect: false, rationale: 'The relative clause takes the proposition as its antecedent, not the person.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.95, discrimination: 1.5, guessing: 0.25,
    tags: ['relative-clauses', 'cleft', 'it-cleft'],
    content: {
      prompt: '"It was the revised methodology ____ produced the breakthrough results." Which relative marker is correct in an it-cleft?',
      options: [
        { text: 'that',  isCorrect: true,  rationale: 'In it-clefts, "that" (or zero for informal) follows the focused element.' },
        { text: 'which', isCorrect: false, rationale: '"Which" is not standard in it-cleft constructions.' },
        { text: 'who',   isCorrect: false, rationale: '"Who" refers to persons; "the revised methodology" is a thing.' },
        { text: 'what',  isCorrect: false, rationale: '"What" introduces wh-clefts ("What produced the results was…"), not it-clefts.' },
      ],
    },
  },

  // ── CH10 · NOUN CLAUSES — STRUCTURE AND FUNCTION ────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['noun-clauses', 'that-clause', 'subject'],
    content: {
      prompt: '"____ the experiment succeeded surprised the research team." Which subordinator introduces the noun clause subject?',
      options: [
        { text: 'That',    isCorrect: true,  rationale: '"That" introduces a noun clause used as the subject of "surprised".' },
        { text: 'What',    isCorrect: false, rationale: '"What succeeded surprised…" is also grammatical but changes meaning (what = the thing that). "That it succeeded" is more natural with the specific content.' },
        { text: 'Whether', isCorrect: false, rationale: '"Whether" implies uncertainty; by "succeeded" the outcome was known.' },
        { text: 'If',      isCorrect: false, rationale: '"If" clauses as subjects are non-standard; "whether" is used instead.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['noun-clauses', 'whether-if'],
    content: {
      prompt: '"The auditors debated ____ the figures had been manipulated." Which is CORRECT?',
      options: [
        { text: 'whether',   isCorrect: true,  rationale: '"Whether" introduces an indirect question (debate requires two possibilities).' },
        { text: 'if',        isCorrect: false, rationale: '"If" can introduce indirect questions in object position but is less formal; after "debate" "whether" is preferred.' },
        { text: 'that',      isCorrect: false, rationale: '"That" introduces a statement-of-fact, not a question.' },
        { text: 'what',      isCorrect: false, rationale: '"What" introduces a wh-question; the issue here is yes/no, not what.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['noun-clauses', 'wh-clause', 'indirect-question'],
    content: {
      prompt: '"The supervisor asked where ____ the report." Which word order is correct for an indirect question?',
      options: [
        { text: 'she had filed (where she had filed)',          isCorrect: true,  rationale: 'Indirect questions use statement word order (subject + verb), not question order.' },
        { text: 'had she filed (where had she filed)',          isCorrect: false, rationale: 'Inverted question word order is used in direct questions, not indirect ones.' },
        { text: 'did she file (where did she file)',            isCorrect: false, rationale: 'Auxiliary "did" is not used in indirect questions.' },
        { text: 'so she filed (where so she filed)',            isCorrect: false, rationale: 'Ungrammatical construction.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['noun-clauses', 'subjunctive', 'mandative'],
    content: {
      prompt: '"The committee recommended that the proposal ____ reviewed before implementation." Which verb form represents the mandative subjunctive?',
      options: [
        { text: 'be',      isCorrect: true,  rationale: 'After verbs of recommendation/demand/suggestion, the mandative subjunctive uses the base form: "be reviewed".' },
        { text: 'is',      isCorrect: false, rationale: '"Is" is the indicative; the subjunctive requires the base form without -s.' },
        { text: 'was',     isCorrect: false, rationale: '"Was" is past indicative, not subjunctive.' },
        { text: 'should be',isCorrect: false, rationale: '"Should be" is the modal alternative to the subjunctive, acceptable in British English but "be" is the subjunctive form.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['noun-clauses', 'reduction', 'infinitive'],
    content: {
      prompt: '"She requested that we should present our findings early." Reduce this noun clause to an infinitive phrase:',
      options: [
        { text: '"She requested us to present our findings early."',         isCorrect: true,  rationale: 'Noun clauses after object + request can be reduced to object + to-infinitive.' },
        { text: '"She requested to present our findings early."',           isCorrect: false, rationale: 'Omitting "us" implies she would present, not we.' },
        { text: '"She requested our presenting of findings early."',        isCorrect: false, rationale: 'This gerund construction is not idiomatic here.' },
        { text: '"She requested that to present was early."',               isCorrect: false, rationale: 'Ungrammatical restructuring.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Phase 6 grammar items (${items.length} total)…`);
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
  console.log(`✓ Phase 6 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
