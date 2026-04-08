/**
 * PHASE 3 — Chapters 4 & 5
 * Topics: Modal Auxiliaries · Perfect Infinitives with Modals ·
 *         The Passive Voice · The Causative Form
 * 5 questions per sub-topic
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const items = [
  // ── CH4 · MODAL AUXILIARIES — CORE MEANINGS ─────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['modals', 'ability'],
    content: {
      prompt: '"She ____ speak four languages fluently." (present ability) Choose the correct modal.',
      options: [
        { text: 'can',    isCorrect: true,  rationale: '"Can" expresses present ability.' },
        { text: 'could',  isCorrect: false, rationale: '"Could" expresses past ability or polite possibility, not general present ability.' },
        { text: 'may',    isCorrect: false, rationale: '"May" expresses permission or possibility, not ability.' },
        { text: 'must',   isCorrect: false, rationale: '"Must" expresses obligation or strong deduction.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['modals', 'obligation-necessity'],
    content: {
      prompt: '"You ____ submit the form by Friday — it is mandatory." Which modal best expresses strong obligation?',
      options: [
        { text: 'must',       isCorrect: true,  rationale: '"Must" expresses strong internal/external obligation; here an external rule.' },
        { text: 'should',     isCorrect: false, rationale: '"Should" expresses advice or mild obligation, not a strict rule.' },
        { text: 'might',      isCorrect: false, rationale: '"Might" expresses weak possibility.' },
        { text: 'would',      isCorrect: false, rationale: '"Would" expresses conditionals, habits, or future-in-the-past.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['modals', 'deduction-present'],
    content: {
      prompt: '"Her office light is on at midnight. She ____ be working late." Which modal expresses a confident deduction?',
      options: [
        { text: 'must',    isCorrect: true,  rationale: '"Must" expresses a logical, confident deduction about the present.' },
        { text: 'can',     isCorrect: false, rationale: '"Can" expresses ability or possibility, not confident deduction.' },
        { text: 'may',     isCorrect: false, rationale: '"May" expresses weak possibility (less certain than "must").' },
        { text: 'will',    isCorrect: false, rationale: '"Will" for deduction is used for present logical inference in certain registers, but "must" is the standard choice.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['modals', 'prohibition-absence-necessity'],
    content: {
      prompt: '"You ____ wear a tie; it is not required." Which modal correctly expresses ABSENCE of obligation?',
      options: [
        { text: "don't have to",  isCorrect: true,  rationale: '"Don\'t have to" = no obligation; wearing is optional.' },
        { text: "mustn't",        isCorrect: false, rationale: '"Mustn\'t" = prohibition (it is forbidden). Completely different meaning.' },
        { text: "couldn't",       isCorrect: false, rationale: '"Couldn\'t" = past inability or impossibility.' },
        { text: "may not",        isCorrect: false, rationale: '"May not" = prohibition or weak negative permission.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['modals', 'will-habit'],
    content: {
      prompt: '"He will sit for hours staring out of the window." The modal "will" here expresses:',
      options: [
        { text: 'A characteristic habit or typical behaviour in the present.',  isCorrect: true,  rationale: '"Will" can describe habitual or characteristic present behaviour.' },
        { text: 'A spontaneous future decision.',                               isCorrect: false, rationale: 'Spontaneous decisions use "will" in reference to the future, not for habitual present.' },
        { text: 'A logical deduction about the present.',                       isCorrect: false, rationale: 'Deductive "will" uses different sentence structures (e.g., "That will be the postman").' },
        { text: 'An obligation imposed by an external authority.',              isCorrect: false, rationale: '"Must" or "have to" express obligation.' },
      ],
    },
  },

  // ── CH4 · PERFECT INFINITIVES WITH MODALS ──────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['modals', 'perfect-infinitive', 'past-deduction'],
    content: {
      prompt: '"She isn\'t here yet. She ____ missed the train." Choose the modal that expresses a logical deduction about the past.',
      options: [
        { text: 'must have',    isCorrect: true,  rationale: '"Must have + V3" = confident deduction about a past event.' },
        { text: 'should have',  isCorrect: false, rationale: '"Should have" = past unfulfilled advice/obligation, not deduction.' },
        { text: 'could have',   isCorrect: false, rationale: '"Could have" = past possibility, not confident deduction.' },
        { text: 'would have',   isCorrect: false, rationale: '"Would have" = conditional result, not deduction.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['modals', 'perfect-infinitive', 'criticism'],
    content: {
      prompt: '"You ____ told me about the change in schedule!" Which form best expresses criticism for a failed past obligation?',
      options: [
        { text: 'should have',   isCorrect: true,  rationale: '"Should have + V3" expresses that an ideal past action did not occur — criticism or regret.' },
        { text: 'must have',     isCorrect: false, rationale: '"Must have" is positive deduction about the past — not criticism of omission.' },
        { text: 'can have',      isCorrect: false, rationale: '"Can have" is used only in negative/question forms for past possibility.' },
        { text: 'would have',    isCorrect: false, rationale: '"Would have" is the conditional result, not a criticism of an unfulfilled duty.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['modals', 'perfect-infinitive', 'past-possibility'],
    content: {
      prompt: '"He ____ taken a different route — we\'ll never know." Which modal expresses an unrealised past possibility?',
      options: [
        { text: 'could have',    isCorrect: true,  rationale: '"Could have + V3" = a possibility in the past that did not happen.' },
        { text: 'must have',     isCorrect: false, rationale: '"Must have" implies the deduction is almost certain.' },
        { text: 'should have',   isCorrect: false, rationale: '"Should have" expresses a past obligation/expectation that was not met.' },
        { text: 'may have',      isCorrect: false, rationale: '"May have" expresses uncertainty about something that might have happened; "could have" focuses on unrealised potential.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['modals', 'perfect-infinitive', 'negative-deduction'],
    content: {
      prompt: '"He left at 6am. He ____ arrived by now." (Negative deduction: it\'s impossible.) Choose the correct form.',
      options: [
        { text: "can't have arrived",     isCorrect: true,  rationale: '"Can\'t have + V3" expresses near-certain negative deduction about the past.' },
        { text: "shouldn't have arrived", isCorrect: false, rationale: '"Shouldn\'t have" = it was wrong to arrive, not that it\'s impossible.' },
        { text: "won't have arrived",     isCorrect: false, rationale: '"Won\'t have" is future perfect, not negative past deduction.' },
        { text: "mustn't have arrived",   isCorrect: false, rationale: '"Mustn\'t have" is not standard; "can\'t have" is the correct negative past deduction form.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['modals', 'perfect-infinitive', 'needn\'t-have'],
    content: {
      prompt: '"You ____ brought flowers — the host had plenty." Which form expresses that an action was unnecessary but was done?',
      options: [
        { text: "needn't have brought",    isCorrect: true,  rationale: '"Needn\'t have + V3" = the action was performed but was unnecessary.' },
        { text: "didn't need to bring",    isCorrect: false, rationale: '"Didn\'t need to" = no obligation existed; implies the action may or may not have happened.' },
        { text: "shouldn't have brought",  isCorrect: false, rationale: '"Shouldn\'t have" = it was wrong to do it (mild criticism), not merely unnecessary.' },
        { text: "mustn't have brought",    isCorrect: false, rationale: 'Not a standard modal perfect form in this context.' },
      ],
    },
  },

  // ── CH5 · THE PASSIVE VOICE ─────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['passive-voice', 'formation'],
    content: {
      prompt: '"The new bridge ____ last year." Complete with the correct passive form.',
      options: [
        { text: 'was built',       isCorrect: true,  rationale: 'Past passive: was/were + past participle.' },
        { text: 'is built',        isCorrect: false, rationale: 'Present passive does not match "last year".' },
        { text: 'has been built',  isCorrect: false, rationale: 'Present perfect passive is for recent/unspecified past, not "last year".' },
        { text: 'had built',       isCorrect: false, rationale: '"Had built" is active past perfect, not passive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ['passive-voice', 'agent'],
    content: {
      prompt: '"The novel was written ____ a young author." Which preposition introduces the agent?',
      options: [
        { text: 'by',    isCorrect: true,  rationale: '"By" introduces the agent in passive constructions.' },
        { text: 'from',  isCorrect: false, rationale: '"From" is not used to introduce agents in the passive.' },
        { text: 'with',  isCorrect: false, rationale: '"With" introduces the instrument, not the agent.' },
        { text: 'of',    isCorrect: false, rationale: '"Of" is not used as a passive agent marker in this structure.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['passive-voice', 'use', 'style'],
    content: {
      prompt: 'Which is the MAIN reason for preferring the passive in academic writing?',
      options: [
        { text: 'To foreground the action/result rather than the agent, creating an objective tone.',  isCorrect: true,  rationale: 'The passive shifts focus from doer to action/result, which suits impersonal academic style.' },
        { text: 'To make sentences shorter and simpler.',                                              isCorrect: false, rationale: 'Passive constructions are often longer than active equivalents.' },
        { text: 'To avoid using the verb "be".',                                                      isCorrect: false, rationale: 'The passive is formed with "be" + past participle.' },
        { text: 'To indicate that the action is repeated.',                                           isCorrect: false, rationale: 'Frequency is expressed by adverbs, not the passive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['passive-voice', 'modal-passive'],
    content: {
      prompt: '"The findings ____ be interpreted with caution." Which modal passive is correct?',
      options: [
        { text: 'should be interpreted',   isCorrect: true,  rationale: '"Should be + V3" = modal passive with obligation/advice.' },
        { text: 'should interpreted',      isCorrect: false, rationale: '"Be" is mandatory in modal passive constructions.' },
        { text: 'should have interpreted', isCorrect: false, rationale: '"Should have interpreted" = past unfulfilled obligation, not present advice.' },
        { text: 'should be interpreting',  isCorrect: false, rationale: '"Should be + -ing" is modal progressive, not passive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['passive-voice', 'personal-impersonal'],
    content: {
      prompt: '"It is claimed that the site dates back to the Bronze Age." The impersonal passive can be rephrased as:',
      options: [
        { text: 'The site is claimed to date back to the Bronze Age.',   isCorrect: true,  rationale: 'Impersonal "It is V-ed that…" → Personal passive "Subject is V-ed to + infinitive".' },
        { text: 'The site claims to date back to the Bronze Age.',       isCorrect: false, rationale: 'Active form with the site as agent — changes meaning.' },
        { text: 'They claim the site dates back to the Bronze Age.',     isCorrect: false, rationale: 'Active construction with indefinite "they" — a correct alternative but not a passive rephrasing.' },
        { text: 'Claiming the site dates back to the Bronze Age.',       isCorrect: false, rationale: 'Gerund phrase — changes grammatical structure entirely.' },
      ],
    },
  },

  // ── CH5 · THE CAUSATIVE FORM ────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['causative', 'have'],
    content: {
      prompt: '"She ____ her hair cut at the salon every month." Choose the correct causative form.',
      options: [
        { text: 'has',     isCorrect: true,  rationale: '"Have + object + past participle" = standard causative (service done for subject).' },
        { text: 'gets',    isCorrect: false, rationale: '"Get + object + past participle" is a valid alternative but "has" is the standard answer here.' },
        { text: 'makes',   isCorrect: false, rationale: '"Make + object + base form" is factitive causative, not a service causative.' },
        { text: 'does',    isCorrect: false, rationale: '"Do + object" is not a standard causative structure.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['causative', 'get-vs-have'],
    content: {
      prompt: '"I ____ my car repaired after the accident." Which causative is more colloquial?',
      options: [
        { text: 'got',   isCorrect: true,  rationale: '"Get + object + past participle" is the informal/colloquial causative equivalent of "have".' },
        { text: 'had',   isCorrect: false, rationale: '"Had" is the formal/neutral causative.' },
        { text: 'made',  isCorrect: false, rationale: '"Made" requires a bare infinitive (not past participle) and implies compulsion.' },
        { text: 'let',   isCorrect: false, rationale: '"Let" + object + bare infinitive = permission, not repair service.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['causative', 'make-let'],
    content: {
      prompt: '"The general ____ the soldiers march for ten miles." Choose the correct causative expressing compulsion.',
      options: [
        { text: 'made',    isCorrect: true,  rationale: '"Make + object + bare infinitive" expresses compulsion or force.' },
        { text: 'let',     isCorrect: false, rationale: '"Let" expresses permission, not compulsion.' },
        { text: 'had',     isCorrect: false, rationale: '"Have" causative uses a base form for active or past participle for passive — here the passive would not fit.' },
        { text: 'allowed', isCorrect: false, rationale: '"Allow" takes a to-infinitive and implies permission, not compulsion.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['causative', 'negative-experience'],
    content: {
      prompt: '"She had her laptop stolen at the conference." This causative structure conveys:',
      options: [
        { text: 'An unpleasant experience suffered by the subject (not intentional).',  isCorrect: true,  rationale: '"Have + object + past participle" can express an unwanted event when context implies it.' },
        { text: 'An arranged service performed for the subject.',                       isCorrect: false, rationale: 'Service causative implies intention; theft is involuntary.' },
        { text: 'That the subject made someone steal the laptop.',                      isCorrect: false, rationale: 'That would be compulsion causative: "made someone steal".' },
        { text: 'That the subject repaired the laptop.',                                isCorrect: false, rationale: 'No repair meaning is present in the sentence.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['causative', 'active-passive-comparison'],
    content: {
      prompt: 'What is the difference between "She made him apologise" and "She had him apologise"?',
      options: [
        { text: '"Made" implies force/compulsion; "had" implies arrangement/direction without explicit force.',  isCorrect: true,  rationale: '"Make" = coerce; "have" = instruct/arrange, often in an authoritative but non-coercive way.' },
        { text: 'They are completely synonymous.',                                                              isCorrect: false, rationale: 'There is a subtle but important distinction in degree of compulsion.' },
        { text: '"Had" implies the apology was in the past; "made" implies it is in the present.',             isCorrect: false, rationale: 'Both can be used in any tense; the distinction is semantic, not temporal.' },
        { text: '"Made" is formal; "had" is informal.',                                                        isCorrect: false, rationale: '"Have" is actually considered more formal than "make" in this context.' },
      ],
    },
  },

  // ── CH5 · ACTIVE VS PASSIVE VS CAUSATIVE COMPARISON ──────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['passive-voice', 'causative', 'active-comparison'],
    content: {
      prompt: 'Choose the sentence where ACTIVE voice is PREFERRED over passive.',
      options: [
        { text: '"Einstein developed the theory of relativity."',                   isCorrect: true,  rationale: 'Active is preferred when the agent is known, important, and deserves emphasis.' },
        { text: '"Mistakes were made."',                                            isCorrect: false, rationale: 'Passive is preferred here to avoid specifying the agent.' },
        { text: '"The suspect was arrested at dawn."',                              isCorrect: false, rationale: 'Passive is appropriate when the action matters more than the agent (police).' },
        { text: '"The results are presented in Table 3."',                          isCorrect: false, rationale: 'Passive is standard in academic writing to focus on the data.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['passive-voice', 'causative', 'active-comparison'],
    content: {
      prompt: '"She is having her apartment renovated." This sentence is best described as a:',
      options: [
        { text: 'Causative construction — she arranges for others to do the renovation.',  isCorrect: true,  rationale: '"Have + object + past participle" in present continuous = ongoing causative arrangement.' },
        { text: 'Passive construction — she is being renovated.',                          isCorrect: false, rationale: '"She" is not the object undergoing renovation; her apartment is.' },
        { text: 'Active construction — she is doing the renovating herself.',              isCorrect: false, rationale: 'The causative implies someone else is performing the renovation.' },
        { text: 'Progressive passive — at this moment, the renovation is being done to her.', isCorrect: false, rationale: 'Passive would be "Her apartment is being renovated."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['passive-voice', 'causative', 'active-comparison'],
    content: {
      prompt: 'Which sentence is an example of the DOUBLE PASSIVE (a causative passive)?',
      options: [
        { text: 'The documents were had checked by the committee.',                                   isCorrect: false, rationale: '"Were had checked" is ungrammatical.' },
        { text: 'She was made to sign the documents.',                                                isCorrect: true,  rationale: '"Make" causative in passive: "She was made to + infinitive" — the causee is the subject.' },
        { text: 'The documents had been signed.',                                                     isCorrect: false, rationale: 'Simple passive past perfect — not a causative passive.' },
        { text: 'The committee had the documents signed.',                                            isCorrect: false, rationale: 'This is an active causative where the committee is the causer.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['passive-voice', 'causative', 'active-comparison'],
    content: {
      prompt: '"The CEO had the merger approved by the board." Which transformation correctly turns this into a passive?',
      options: [
        { text: 'The merger was had approved by the board.',          isCorrect: false, rationale: '"Was had approved" is ungrammatical.' },
        { text: 'The merger was approved by the board at the CEO\'s direction.', isCorrect: true,  rationale: 'The passive focuses on the merger; the causative relationship is implied contextually.' },
        { text: 'The board was had to approve the merger.',           isCorrect: false, rationale: 'Ungrammatical structure.' },
        { text: 'The CEO approved the merger was had.',               isCorrect: false, rationale: 'Completely ungrammatical.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['passive-voice', 'causative', 'active-comparison'],
    content: {
      prompt: 'In a formal report, which formulation is grammatically preferable when the agent is unknown?',
      options: [
        { text: '"The data were collected over a three-year period."',             isCorrect: true,  rationale: 'Passive without a by-phrase is standard when the agent is unknown or irrelevant in formal writing.' },
        { text: '"Someone collected the data over a three-year period."',          isCorrect: false, rationale: '"Someone" is informal and vague; passive is preferred in academic/formal registers.' },
        { text: '"They collected the data over a three-year period."',             isCorrect: false, rationale: 'Generic "they" is more informal; passive is conventional in reports.' },
        { text: '"We are having the data collected over a three-year period."',   isCorrect: false, rationale: 'Causative progressive implies arrangement, not the reporting of a methodology.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Phase 3 grammar items (${items.length} total)…`);
  let inserted = 0;

  for (const item of items) {
    await prisma.item.create({
      data: {
        type:           'MULTIPLE_CHOICE',
        skill:          item.skill as any,
        cefrLevel:      item.cefrLevel as any,
        difficulty:     item.difficulty,
        discrimination: item.discrimination,
        guessing:       item.guessing,
        tags:           item.tags,
        status:         'ACTIVE',
        content:        item.content,
      },
    });
    inserted++;
  }

  console.log(`✓ Phase 3 complete — ${inserted} items inserted.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
