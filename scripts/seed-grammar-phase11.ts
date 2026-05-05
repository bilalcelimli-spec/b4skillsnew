/**
 * GRAMMAR PHASE 11 — Gap-fill
 * Topics: Adjective Order, Comparatives, Time Clauses, Embedded Questions,
 *   Narrative Tenses, Gerund/Infinitive, Articles, Modals, Inversion,
 *   Fronting, Complex Passives, Mixed Conditionals, Reduced Relatives,
 *   Formal Conjunctions, Hedging, Ellipsis, Aspect, Nominalisation,
 *   Discourse Markers, Cleft, Absolute Constructions, Focus Particles
 * SEED_TAG: "seed-grammar-phase11"
 * Distribution: B1=30, B2=30, C1=25, C2=15 = 100 items
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SEED_TAG = "seed-grammar-phase11";
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE   = process.env.FORCE   === "1";

type Opt  = { text: string; isCorrect: boolean; rationale: string };
type Item = {
  skill: string; cefrLevel: string; difficulty: number;
  discrimination: number; guessing: number; tags: string[];
  content: { prompt: string; options: Opt[] };
};

const items: Item[] = [
  // ── B1 (30 items) ────────────────────────────────────────────────────────

  // Adjective order (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['adjective-order', 'opinion-size-colour-material'],
    content: {
      prompt: 'Choose the correct adjective order: "She wore a ___ dress."',
      options: [
        { text: 'beautiful long red silk', isCorrect: true,  rationale: 'Correct order: opinion (beautiful) → size (long) → colour (red) → material (silk).' },
        { text: 'red beautiful long silk', isCorrect: false, rationale: 'Colour precedes opinion; incorrect.' },
        { text: 'silk long beautiful red', isCorrect: false, rationale: 'Material must follow other adjectives.' },
        { text: 'long red beautiful silk', isCorrect: false, rationale: 'Opinion adjective must come first.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['adjective-order', 'size-age-origin-material'],
    content: {
      prompt: 'Which is the correct adjective sequence?',
      options: [
        { text: 'a small old Italian stone church',    isCorrect: true,  rationale: 'Size (small) → age (old) → origin (Italian) → material (stone).' },
        { text: 'an Italian old small stone church',   isCorrect: false, rationale: 'Origin should not precede age or size.' },
        { text: 'a stone small Italian old church',    isCorrect: false, rationale: 'Material must follow origin, not lead.' },
        { text: 'an old Italian small stone church',   isCorrect: false, rationale: 'Size should precede age.' },
      ],
    },
  },

  // Comparative: the more…the more (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['comparative', 'parallel-increase'],
    content: {
      prompt: '"___ you practise, ___ confident you become." Complete the parallel comparative.',
      options: [
        { text: 'The more / the more', isCorrect: true,  rationale: '"The more…the more" expresses a proportional relationship between two increasing qualities.' },
        { text: 'More / more',         isCorrect: false, rationale: 'The definite article is required.' },
        { text: 'The more / more',     isCorrect: false, rationale: 'Both halves require "the more."' },
        { text: 'Most / most',         isCorrect: false, rationale: 'Superlatives cannot form this parallel comparison.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['comparative', 'parallel-increase'],
    content: {
      prompt: '"___ often you review your notes, ___ easily you will remember them."',
      options: [
        { text: 'The more / the more',  isCorrect: true,  rationale: 'Both comparative adverbials need "the" in this proportional structure.' },
        { text: 'More / more',          isCorrect: false, rationale: '"The" is required before each comparative.' },
        { text: 'The oftener / the easier', isCorrect: false, rationale: '"Oftener" is archaic; the modern form is "the more often."' },
        { text: 'Most often / most easily', isCorrect: false, rationale: 'Superlatives do not form proportional parallel structures.' },
      ],
    },
  },

  // Time clauses + future (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['time-clauses', 'future-reference'],
    content: {
      prompt: '"I will call you as soon as I ___ home." Which form is correct?',
      options: [
        { text: 'get',        isCorrect: true,  rationale: 'Future time clauses use the present simple, not "will."' },
        { text: 'will get',   isCorrect: false, rationale: '"Will" is not used in time clauses after as soon as, when, before, after, until.' },
        { text: 'am getting', isCorrect: false, rationale: 'Present continuous is not standard for future time clauses with "as soon as."' },
        { text: 'got',        isCorrect: false, rationale: 'Past simple cannot refer to a future event.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['time-clauses', 'future-reference'],
    content: {
      prompt: '"Please wait until the light ___ green."',
      options: [
        { text: 'turns',      isCorrect: true,  rationale: '"Until" in future time clauses takes the present simple.' },
        { text: 'will turn',  isCorrect: false, rationale: '"Will" is not used in time clauses with until, when, etc.' },
        { text: 'has turned', isCorrect: false, rationale: 'Present perfect is not standard here.' },
        { text: 'turned',     isCorrect: false, rationale: 'Past simple is incorrect for a future event.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['time-clauses', 'future-perfect'],
    content: {
      prompt: '"By the time you arrive, we ___ already ___ dinner." Which future perfect is correct?',
      options: [
        { text: 'will have / finished', isCorrect: true,  rationale: '"By the time + present simple" → future perfect in the main clause shows completion before a future point.' },
        { text: 'will / finish',        isCorrect: false, rationale: 'Simple future does not show completion before a future time point.' },
        { text: 'have / finished',      isCorrect: false, rationale: 'Present perfect cannot refer to a future action.' },
        { text: 'had / finished',       isCorrect: false, rationale: 'Past perfect is for actions before a past point, not a future one.' },
      ],
    },
  },

  // Whether vs if (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['whether-vs-if', 'embedded-questions'],
    content: {
      prompt: '"I am not sure ___ to accept the offer." Which word is grammatically required here?',
      options: [
        { text: 'whether', isCorrect: true,  rationale: '"Whether + to-infinitive" is the only grammatical form. "If + infinitive" is ungrammatical.' },
        { text: 'if',      isCorrect: false, rationale: '"If" cannot be followed directly by a to-infinitive; "whether" is required.' },
        { text: 'what',    isCorrect: false, rationale: '"What to do" would ask about the action taken, not the decision about acceptance.' },
        { text: 'when',    isCorrect: false, rationale: '"When" addresses timing, not the uncertainty of whether to act.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['whether-vs-if', 'embedded-questions'],
    content: {
      prompt: '"Could you tell me ___ the office is open on Saturdays?"',
      options: [
        { text: 'whether',  isCorrect: true,  rationale: '"Whether" is the preferred formal form for embedded yes/no questions. "If" is also possible informally.' },
        { text: 'that',     isCorrect: false, rationale: '"That" introduces a reported statement, not a yes/no question.' },
        { text: 'what',     isCorrect: false, rationale: '"What" introduces a WH-question, not a yes/no enquiry.' },
        { text: 'which',    isCorrect: false, rationale: '"Which" introduces a restricted-choice question, not an open yes/no one.' },
      ],
    },
  },

  // Narrative tenses (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['narrative-tenses', 'past-perfect'],
    content: {
      prompt: '"When I arrived, she ___ already ___." Which tense shows completion before arrival?',
      options: [
        { text: 'had / left',  isCorrect: true,  rationale: 'Past perfect (had + past participle) shows her leaving occurred before my arrival.' },
        { text: 'has / left',  isCorrect: false, rationale: 'Present perfect cannot refer to past narrative sequence.' },
        { text: 'was / leaving', isCorrect: false, rationale: 'Past continuous shows an ongoing action, not prior completion.' },
        { text: 'left',        isCorrect: false, rationale: 'Simple past does not mark sequence as clearly as past perfect here.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['narrative-tenses', 'past-continuous'],
    content: {
      prompt: '"I ___ a book when the phone rang." Which tense best expresses the interrupted activity?',
      options: [
        { text: 'was reading',       isCorrect: true,  rationale: 'Past continuous shows the longer ongoing activity interrupted by the shorter past simple event.' },
        { text: 'read',              isCorrect: false, rationale: 'Simple past implies two sequential completed actions, not one interrupting another.' },
        { text: 'had been reading',  isCorrect: false, rationale: 'Past perfect continuous emphasises duration before a past point; it does not naturally pair with "when" for interruption.' },
        { text: 'have been reading', isCorrect: false, rationale: 'Present perfect continuous is incorrect in a completed past narrative.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['narrative-tenses', 'past-perfect'],
    content: {
      prompt: '"She looked exactly ___ I had remembered her." Which conjunction introduces the manner comparison?',
      options: [
        { text: 'as',  isCorrect: true,  rationale: '"As I had remembered" is a comparative clause of manner. "As" is the correct formal conjunction.' },
        { text: 'like', isCorrect: false, rationale: '"Like" + clause is non-standard in formal written English.' },
        { text: 'how',  isCorrect: false, rationale: '"How" turns the clause into a noun clause, not a manner comparison.' },
        { text: 'that', isCorrect: false, rationale: '"That" does not introduce manner comparisons.' },
      ],
    },
  },

  // Gerund vs infinitive — meaning-change pairs (4)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['verb-patterns', 'gerund-infinitive', 'meaning-change', 'stop'],
    content: {
      prompt: '"She stopped ___ her phone mid-meeting." The phone-checking was interrupted.',
      options: [
        { text: 'checking',      isCorrect: true,  rationale: '"Stop + -ing" means to cease an ongoing activity.' },
        { text: 'to check',      isCorrect: false, rationale: '"Stop to check" means she stopped (other activity) in order to check — not cessation of phone-checking.' },
        { text: 'check',         isCorrect: false, rationale: 'Bare infinitive is not used with "stopped" in this sense.' },
        { text: 'having checked', isCorrect: false, rationale: 'Perfect gerund is not used with "stop" to signal simple cessation.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['verb-patterns', 'gerund-infinitive', 'meaning-change', 'remember'],
    content: {
      prompt: '"I remember ___ her at the conference two years ago." The action is a past memory.',
      options: [
        { text: 'meeting',    isCorrect: true,  rationale: '"Remember + -ing" refers to a memory of a past event.' },
        { text: 'to meet',    isCorrect: false, rationale: '"Remember + to-infinitive" means to remember a future duty — not a past memory.' },
        { text: 'having met', isCorrect: false, rationale: 'Grammatically possible, but the simple gerund is the standard form here.' },
        { text: 'meet',       isCorrect: false, rationale: 'Bare infinitive is not used after "remember."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['verb-patterns', 'gerund-infinitive', 'meaning-change', 'try'],
    content: {
      prompt: '"They tried ___ the engine with a new part." (Experimenting with a solution.)',
      options: [
        { text: 'replacing',   isCorrect: true,  rationale: '"Try + -ing" means to experiment with an action as a possible solution.' },
        { text: 'to replace',  isCorrect: false, rationale: '"Try + to-infinitive" means to make effort at something difficult — context is experimentation, not difficulty.' },
        { text: 'replace',     isCorrect: false, rationale: 'Bare infinitive is not used after "tried" in this sense.' },
        { text: 'having replaced', isCorrect: false, rationale: 'Perfect gerund refers to a completed past action, not an experimental attempt.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['verb-patterns', 'gerund-infinitive', 'meaning-change', 'regret'],
    content: {
      prompt: '"I regret ___ you that your application has been unsuccessful." (Formal announcement.)',
      options: [
        { text: 'to inform',   isCorrect: true,  rationale: '"Regret + to-infinitive" is used to express regret about something one is about to say.' },
        { text: 'informing',   isCorrect: false, rationale: '"Regret + -ing" refers to past actions one is sorry about, not a present announcement.' },
        { text: 'having informed', isCorrect: false, rationale: 'Perfect gerund would imply the action is already completed and regretted.' },
        { text: 'inform',      isCorrect: false, rationale: 'Bare infinitive is not used after "regret."' },
      ],
    },
  },

  // Articles (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['articles', 'abstract-nouns', 'zero-article'],
    content: {
      prompt: '"___ beauty is in the eye of the beholder." Which article is appropriate?',
      options: [
        { text: 'Zero article',  isCorrect: true,  rationale: 'Abstract nouns in a general sense take zero article: "Beauty is…"' },
        { text: 'The',           isCorrect: false, rationale: '"The beauty" refers to a specific beauty, not the concept in general.' },
        { text: 'A',             isCorrect: false, rationale: '"A beauty" means a beautiful person or thing.' },
        { text: 'Some',          isCorrect: false, rationale: '"Some beauty" refers to a quantity, changing the meaning.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['articles', 'generic-reference', 'singular-countable'],
    content: {
      prompt: '"___ lion is known as the king of the jungle." Which article makes a generic statement?',
      options: [
        { text: 'The',      isCorrect: true,  rationale: '"The + singular countable noun" is used for a generic statement about a whole species in formal/written English.' },
        { text: 'A',        isCorrect: false, rationale: '"A lion" makes a non-specific individual reference, less formal for a generic claim.' },
        { text: 'No article', isCorrect: false, rationale: 'Zero article + singular countable noun is ungrammatical ("Lion is…").' },
        { text: 'An',       isCorrect: false, rationale: '"An" is used before vowel sounds; "lion" begins with a consonant.' },
      ],
    },
  },

  // Past modals for deduction (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['modals', 'past-deduction', 'must-have'],
    content: {
      prompt: '"She looks exhausted. She ___ worked through the night." (Certain deduction)',
      options: [
        { text: 'must have',   isCorrect: true,  rationale: '"Must have + past participle" expresses a certain logical deduction based on evidence.' },
        { text: 'should have', isCorrect: false, rationale: '"Should have" expresses an unfulfilled obligation, not a deduction.' },
        { text: 'might have',  isCorrect: false, rationale: '"Might have" expresses possibility, not certainty.' },
        { text: 'could have',  isCorrect: false, rationale: '"Could have" expresses unfulfilled ability or possibility, not certainty.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['modals', 'past-deduction', 'cant-have'],
    content: {
      prompt: '"He ___ left early — his coat is still here." (Impossible deduction)',
      options: [
        { text: "can't have",    isCorrect: true,  rationale: '"Can\'t have + past participle" expresses certainty that something did NOT happen.' },
        { text: "mustn't have",  isCorrect: false, rationale: 'Not a standard negative past deduction form.' },
        { text: "shouldn't have", isCorrect: false, rationale: '"Shouldn\'t have" expresses retrospective criticism, not logical impossibility.' },
        { text: "mightn't have", isCorrect: false, rationale: '"Mightn\'t have" expresses weak possibility of non-occurrence.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['modals', 'past-deduction', 'may-might'],
    content: {
      prompt: '"I am not sure, but she ___ taken the wrong bus." (Uncertain past possibility)',
      options: [
        { text: 'may have',    isCorrect: true,  rationale: '"May have + past participle" expresses an uncertain possibility about a past event.' },
        { text: 'must have',   isCorrect: false, rationale: '"Must have" indicates certainty, not uncertainty.' },
        { text: "can't have",  isCorrect: false, rationale: '"Can\'t have" means it is impossible.' },
        { text: 'should have', isCorrect: false, rationale: '"Should have" implies an obligation not met.' },
      ],
    },
  },

  // Used to vs would (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['used-to', 'past-states'],
    content: {
      prompt: '"___ live in Paris before moving to London." Which is correct for a past state?',
      options: [
        { text: 'I used to',    isCorrect: true,  rationale: '"Used to + infinitive" describes past states or repeated habits that no longer continue.' },
        { text: 'I would',      isCorrect: false, rationale: '"Would" can express repeated past actions but NOT past states. "I would live" is ungrammatical as a state.' },
        { text: 'I was used to', isCorrect: false, rationale: '"Be used to + -ing" means to be accustomed to something.' },
        { text: 'I am used to', isCorrect: false, rationale: 'Present tense; refers to current familiarity, not a past state.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['used-to', 'would-for-habits'],
    content: {
      prompt: 'Which sentence correctly uses "would" for a repeated past action (not a state)?',
      options: [
        { text: 'We would cycle to the lake every summer.',  isCorrect: true,  rationale: '"Would + infinitive" is correct for repeated past actions (cycling = action). It cannot be used for past states.' },
        { text: 'She would know the answer every time.',     isCorrect: false, rationale: '"Know" is a stative verb; "would know" is grammatically unacceptable for a past habit.' },
        { text: 'He would live near the school then.',       isCorrect: false, rationale: '"Live" as a state cannot take "would" for a past habit.' },
        { text: 'They would be very tired after work.',      isCorrect: false, rationale: '"Be tired" is a state; "would be tired" is not used for past habits.' },
      ],
    },
  },

  // so / such (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['degree', 'so-such', 'result-clause'],
    content: {
      prompt: '"It was ___ a fascinating talk that everyone stayed extra time."',
      options: [
        { text: 'such',  isCorrect: true,  rationale: '"Such + a/an + adjective + noun" — "such a fascinating talk" is correct before a noun phrase.' },
        { text: 'so',    isCorrect: false, rationale: '"So + adjective" is correct without a noun ("so fascinating"), but not before a noun phrase.' },
        { text: 'too',   isCorrect: false, rationale: '"Too" implies excess with a negative connotation.' },
        { text: 'very',  isCorrect: false, rationale: '"Very" cannot introduce a result clause with "that."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['degree', 'so-such', 'result-clause'],
    content: {
      prompt: '"The test was ___ difficult that half the class failed."',
      options: [
        { text: 'so',   isCorrect: true,  rationale: '"So + adjective + that" is correct when a standalone adjective precedes "that."' },
        { text: 'such', isCorrect: false, rationale: '"Such" requires a noun after the adjective: "such a difficult test." Without a noun, use "so."' },
        { text: 'too',  isCorrect: false, rationale: '"Too" does not naturally introduce a result clause with "that."' },
        { text: 'very', isCorrect: false, rationale: '"Very difficult" does not lead into a "that" result clause.' },
      ],
    },
  },

  // too / enough (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['degree', 'too-enough'],
    content: {
      prompt: '"This coffee is ___ hot ___ drink." Fill in the correct structure.',
      options: [
        { text: 'too / to',    isCorrect: true,  rationale: '"Too + adjective + to-infinitive" expresses excess preventing an action.' },
        { text: 'so / that',   isCorrect: false, rationale: '"So hot that I can\'t drink it" is correct but requires a full clause, not a bare infinitive.' },
        { text: 'enough / to', isCorrect: false, rationale: '"Enough" follows the adjective: "hot enough to drink" means sufficiently hot — the opposite meaning.' },
        { text: 'very / to',   isCorrect: false, rationale: '"Very + adjective + to-infinitive" is not a standard degree structure.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['degree', 'too-enough'],
    content: {
      prompt: '"She is ___ experienced ___ lead the team." (She has sufficient experience.)',
      options: [
        { text: 'experienced enough / to',  isCorrect: true,  rationale: '"Adjective + enough + to-infinitive" expresses that a quality has reached a sufficient level.' },
        { text: 'too experienced / to',     isCorrect: false, rationale: '"Too experienced to lead" would imply her experience is excessive — the opposite meaning.' },
        { text: 'enough experienced / to',  isCorrect: false, rationale: '"Enough" follows the adjective it modifies: "experienced enough," not "enough experienced."' },
        { text: 'very experienced / for',   isCorrect: false, rationale: '"Very experienced for" is not a grammatical degree structure; "enough to" is required.' },
      ],
    },
  },

  // Purpose clauses (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['purpose', 'in-order-to', 'so-that'],
    content: {
      prompt: '"She whispered ___ not wake the baby." Which purpose structure is correct?',
      options: [
        { text: 'so as to',      isCorrect: true,  rationale: '"So as not to + infinitive" expresses negative purpose. "So as to" is a formal purpose connector.' },
        { text: 'in order that', isCorrect: false, rationale: '"In order that" requires a subject + finite verb: "in order that she would not wake…"' },
        { text: 'for to',        isCorrect: false, rationale: '"For to" is dialectal/archaic and not standard.' },
        { text: 'because',       isCorrect: false, rationale: '"Because" introduces a reason, not a purpose.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['purpose', 'so-that', 'modal'],
    content: {
      prompt: '"He saved money ___ he could travel after graduation." Which purpose clause is correct?',
      options: [
        { text: 'so that',  isCorrect: true,  rationale: '"So that + subject + modal/auxiliary" expresses purpose with a finite clause.' },
        { text: 'so as to', isCorrect: false, rationale: '"So as to" requires the same subject in both clauses and takes an infinitive, not a full clause.' },
        { text: 'in order', isCorrect: false, rationale: '"In order" needs "to + infinitive" or "that + clause"; "in order he could" is incomplete.' },
        { text: 'because',  isCorrect: false, rationale: '"Because" introduces a reason (past cause), not a purpose.' },
      ],
    },
  },

  // Tag questions (1)
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['tag-questions', 'auxiliary-agreement'],
    content: {
      prompt: '"She has finished the project, ___?" Which tag question is correct?',
      options: [
        { text: "hasn't she",  isCorrect: true,  rationale: 'Positive statement → negative tag using the same auxiliary: "has" → "hasn\'t she."' },
        { text: "didn't she",  isCorrect: false, rationale: '"Did" is the auxiliary for past simple, not present perfect.' },
        { text: "isn't she",   isCorrect: false, rationale: '"Is" is the auxiliary for present simple/continuous, not present perfect.' },
        { text: "doesn't she", isCorrect: false, rationale: '"Does" is the auxiliary for present simple, not present perfect.' },
      ],
    },
  },

  // ── B2 (30 items) ────────────────────────────────────────────────────────

  // Inversion after negative adverbials (6)
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['inversion', 'negative-adverbials', 'rarely'],
    content: {
      prompt: '"Rarely ___ such a clear explanation of the theory." Which inverted form is correct?',
      options: [
        { text: 'have I heard',   isCorrect: true,  rationale: 'After "rarely" at clause-initial position, subject-auxiliary inversion is required: "Rarely have I heard…"' },
        { text: 'I have heard',   isCorrect: false, rationale: 'Standard word order — inversion is obligatory after initial "rarely."' },
        { text: 'I heard',        isCorrect: false, rationale: 'No inversion; simple past is also incorrect here.' },
        { text: 'have heard I',   isCorrect: false, rationale: 'Inversion places auxiliary before subject: "have I," not "have heard I."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['inversion', 'negative-adverbials', 'not-only'],
    content: {
      prompt: '"Not only ___ she improve her grades, but she also won a scholarship."',
      options: [
        { text: 'did',     isCorrect: true,  rationale: '"Not only + auxiliary + subject" is required: "Not only did she improve…"' },
        { text: 'she did', isCorrect: false, rationale: 'Subject must follow the auxiliary in inversion.' },
        { text: 'has',     isCorrect: false, rationale: '"Has" would form present perfect; past context requires "did."' },
        { text: 'was',     isCorrect: false, rationale: '"Was" requires a different predicate structure.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['inversion', 'negative-adverbials', 'never'],
    content: {
      prompt: '"Never ___ I faced such a difficult decision in my career."',
      options: [
        { text: 'have',  isCorrect: true,  rationale: '"Never have I faced" — present perfect inversion after "never": auxiliary precedes subject.' },
        { text: 'had',   isCorrect: false, rationale: '"Never had I faced" would be valid in a past narrative context, but present perfect is natural for a career reflection.' },
        { text: 'did',   isCorrect: false, rationale: '"Never did I face" requires simple past "face," not "faced."' },
        { text: 'was',   isCorrect: false, rationale: '"Was" does not pair with "faced" as a perfect auxiliary.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['inversion', 'negative-adverbials', 'hardly-when'],
    content: {
      prompt: '"Hardly ___ the meeting started when the fire alarm went off."',
      options: [
        { text: 'had',  isCorrect: true,  rationale: '"Hardly had + subject + past participle + when" is the standard past perfect inversion structure.' },
        { text: 'did',  isCorrect: false, rationale: '"Hardly did" is not the correct form for the "hardly…when" pattern.' },
        { text: 'has',  isCorrect: false, rationale: 'Present perfect is inappropriate for this past narrative.' },
        { text: 'was',  isCorrect: false, rationale: '"Hardly was the meeting started" is non-standard.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['inversion', 'only-after'],
    content: {
      prompt: '"Only after reading the report ___ the full implications."',
      options: [
        { text: 'did we understand', isCorrect: true,  rationale: '"Only after + phrase" triggers inversion in the main clause: "Only after… did we understand."' },
        { text: 'we understood',     isCorrect: false, rationale: 'Inversion is obligatory after "only after."' },
        { text: 'understood we',     isCorrect: false, rationale: 'Inversion = auxiliary + subject: "did we understand," not "understood we."' },
        { text: 'we did understand', isCorrect: false, rationale: 'Emphatic "did" without inversion is incorrect here.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['inversion', 'so-adjective-inversion'],
    content: {
      prompt: '"So ___ that no one questioned the results." Complete the inverted structure.',
      options: [
        { text: 'thorough was the analysis',  isCorrect: true,  rationale: '"So + adjective + was/be + subject" — "So thorough was the analysis that…"' },
        { text: 'thorough the analysis was',  isCorrect: false, rationale: 'The verb follows the adjective in this inversion pattern, not the subject.' },
        { text: 'was the analysis thorough',  isCorrect: false, rationale: 'Incorrect word order for the "so + adj + be + NP" pattern.' },
        { text: 'the analysis was thorough',  isCorrect: false, rationale: 'Normal word order — no inversion.' },
      ],
    },
  },

  // Fronting and topicalisation (4)
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['fronting', 'it-cleft'],
    content: {
      prompt: '"___ the committee opposed — it was the timeline, not the budget."',
      options: [
        { text: 'It was the timeline that', isCorrect: true,  rationale: 'An it-cleft fronts the timeline for contrast with "not the budget."' },
        { text: 'The timeline which',        isCorrect: false, rationale: '"The timeline which" starts a relative clause, not a cleft.' },
        { text: 'What the timeline',         isCorrect: false, rationale: 'A pseudo-cleft would be "What the committee opposed was the timeline" — restructured differently.' },
        { text: 'That the timeline',         isCorrect: false, rationale: '"That" does not function as a fronting structure for emphasis here.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['fronting', 'pseudo-cleft', 'wh-cleft'],
    content: {
      prompt: '"___ is to renegotiate the contract." (Emphasising the required action)',
      options: [
        { text: 'What we need to do', isCorrect: true,  rationale: '"What + clause + be + complement" is a pseudo-cleft emphasising the complement.' },
        { text: 'Which we need to do', isCorrect: false, rationale: '"Which" cannot open a wh-cleft.' },
        { text: 'That we need to do',  isCorrect: false, rationale: '"That" introduces a nominal clause but not a pseudo-cleft here.' },
        { text: 'How we need to do it', isCorrect: false, rationale: '"How" shifts focus to manner, not the action itself.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['fronting', 'object-fronting'],
    content: {
      prompt: '"___ we simply do not have." (Fronting the object "Resources" for emphasis)',
      options: [
        { text: 'Resources',              isCorrect: true,  rationale: 'Object fronting moves "Resources" to clause-initial position for emphasis: "Resources, we simply do not have."' },
        { text: 'It is resources that',   isCorrect: false, rationale: 'An it-cleft — correct but a different structure from simple object fronting.' },
        { text: 'Having resources',       isCorrect: false, rationale: 'Fronting a gerund changes the grammatical subject.' },
        { text: 'Resources that',         isCorrect: false, rationale: 'Adding "that" creates an incomplete relative clause.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['fronting', 'adverbial-inversion', 'directional'],
    content: {
      prompt: '"Down ___ the market." (Directional adverb inversion; fill with subject + verb)',
      options: [
        { text: 'came the price',    isCorrect: true,  rationale: '"Down came the price" — after an initial directional adverb, verb-subject inversion applies with noun subjects.' },
        { text: 'the price came',    isCorrect: false, rationale: 'No inversion — standard word order after a fronted directional adverb.' },
        { text: 'it came the price', isCorrect: false, rationale: 'Pronoun subjects do not invert: "Down it came" is possible, but this sentence has a noun phrase subject.' },
        { text: 'did the price come', isCorrect: false, rationale: '"Did"-inversion is for questions or after negative adverbials, not directional adverbs.' },
      ],
    },
  },

  // Complex passives (4)
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['passive', 'causative-have'],
    content: {
      prompt: '"She ___ her roof repaired last month." (She arranged for someone else to do it.)',
      options: [
        { text: 'had', isCorrect: true,  rationale: '"Have + object + past participle" is the causative construction.' },
        { text: 'got', isCorrect: false, rationale: '"Got her roof repaired" is also causative (informal), but "had" is the standard written form.' },
        { text: 'made', isCorrect: false, rationale: '"Make + object + bare infinitive" — "made the roof be repaired" is unnatural.' },
        { text: 'let',  isCorrect: false, rationale: '"Let" expresses permission, not arrangement.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['passive', 'passive-infinitive', 'reporting-passive'],
    content: {
      prompt: '"It ___ that the economy will recover next year." (Impersonal passive reporting)',
      options: [
        { text: 'is widely believed', isCorrect: true,  rationale: '"It is + past participle + that-clause" is the impersonal passive reporting structure.' },
        { text: 'widely believes',    isCorrect: false, rationale: 'Active form with no specified subject — ungrammatical with "It."' },
        { text: 'has widely been',    isCorrect: false, rationale: 'Incomplete — needs a past participle complement.' },
        { text: 'is widely believing', isCorrect: false, rationale: '"Believe" is stative and cannot normally be used in the continuous.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['passive', 'expectation-passive'],
    content: {
      prompt: '"The new policy ___ implemented by the end of Q3." (Future expectation, passive)',
      options: [
        { text: 'is expected to be', isCorrect: true,  rationale: '"Is expected to be + past participle" is the passive infinitive for future expectations.' },
        { text: 'expects to be',     isCorrect: false, rationale: 'Policies do not have expectations — active voice is inappropriate here.' },
        { text: 'is expecting to be', isCorrect: false, rationale: '"Is expecting" (continuous active) cannot be used with an inanimate subject.' },
        { text: 'has been expected to be', isCorrect: false, rationale: 'Present perfect passive is overly complex for a straightforward future expectation.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['passive', 'double-object-passive'],
    content: {
      prompt: '"She was given a promotion." Which active transformation is correct?',
      options: [
        { text: 'They gave her a promotion.',     isCorrect: true,  rationale: 'The indirect object "her" becomes the passive subject; the active restores the agent and original order.' },
        { text: 'A promotion was given her.',     isCorrect: false, rationale: '"Given her" without "to" is archaic; the standard is "given to her" or making "her" the passive subject.' },
        { text: 'Her a promotion was given.',     isCorrect: false, rationale: 'Incorrect word order.' },
        { text: 'They were given a promotion to her.', isCorrect: false, rationale: '"To her" is redundant and changes the meaning.' },
      ],
    },
  },

  // Mixed conditionals (4)
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['conditionals', 'mixed-conditional', 'past-to-present'],
    content: {
      prompt: '"If I ___ harder at university, I would be in a better position now." (Past action → present result)',
      options: [
        { text: 'had studied', isCorrect: true,  rationale: '"If + past perfect" + "would + bare infinitive" links a past event to a present result.' },
        { text: 'studied',     isCorrect: false, rationale: 'Past simple forms a type 2 conditional (hypothetical present/future), not a past → present mix.' },
        { text: 'have studied', isCorrect: false, rationale: 'Present perfect in the if-clause is not standard for this pattern.' },
        { text: 'would have studied', isCorrect: false, rationale: '"Would have" does not appear in the if-clause.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['conditionals', 'mixed-conditional', 'present-to-past'],
    content: {
      prompt: '"If she were more organised, she ___ lost the documents yesterday." (Present character → past result)',
      options: [
        { text: "wouldn't have", isCorrect: true,  rationale: '"If + past simple" (present hypothetical) + "would not have + past participle" (past result) — reversed mixed conditional.' },
        { text: "wouldn't",      isCorrect: false, rationale: '"Wouldn\'t" alone gives a present/future result, not a past one.' },
        { text: "hadn't",        isCorrect: false, rationale: '"Hadn\'t" in the main clause would form a type 3, but the if-clause uses past simple.' },
        { text: "didn't",        isCorrect: false, rationale: '"Didn\'t" in the main clause suggests a factual past statement, not a hypothetical.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['conditionals', 'inverted-conditional', 'should'],
    content: {
      prompt: '"___ you need further assistance, please contact our support team." (Formal inverted conditional)',
      options: [
        { text: 'Should',  isCorrect: true,  rationale: '"Should + subject" is a formal inverted conditional = "If you should need."' },
        { text: 'Were',    isCorrect: false, rationale: '"Were you to need" is valid, but "were you need" without "to" is ungrammatical.' },
        { text: 'Would',   isCorrect: false, rationale: '"Would" is not used for inverted conditionals of this type.' },
        { text: 'Had',     isCorrect: false, rationale: '"Had you needed" forms a past hypothetical (type 3); the context is a future possibility.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['conditionals', 'inverted-conditional', 'were-to'],
    content: {
      prompt: '"___ the project to be cancelled, the team would need to find other work." (Formal hypothetical)',
      options: [
        { text: 'Were',    isCorrect: true,  rationale: '"Were + subject + to-infinitive" is a formal inverted conditional = "If the project were to be cancelled."' },
        { text: 'Should',  isCorrect: false, rationale: '"Should the project be cancelled" is also possible but uses "should," not "were to be."' },
        { text: 'Had',     isCorrect: false, rationale: '"Had the project been cancelled" is a past type 3 hypothetical, not a present/future one.' },
        { text: 'Would',   isCorrect: false, rationale: '"Would" does not form inverted conditionals.' },
      ],
    },
  },

  // Reduced relative clauses (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['relative-clause', 'reduced-relative', 'passive-participle'],
    content: {
      prompt: '"The report ___ yesterday contains important new data." (Reduce "that was submitted")',
      options: [
        { text: 'submitted',   isCorrect: true,  rationale: 'Reduced passive relative: "that was submitted" → "submitted." Past participle is used.' },
        { text: 'submitting',  isCorrect: false, rationale: 'Active present participle implies the report performs the action — incorrect.' },
        { text: 'that submitted', isCorrect: false, rationale: 'Active relative "that submitted" implies the report did the submitting.' },
        { text: 'which is submitted', isCorrect: false, rationale: 'A full relative clause, not a reduced one.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['relative-clause', 'reduced-relative', 'active-participle'],
    content: {
      prompt: '"Scientists ___ in the Arctic discovered a new mineral." (Reduce "who are working")',
      options: [
        { text: 'working',       isCorrect: true,  rationale: 'Active present participle "working" reduces "who are working."' },
        { text: 'worked',        isCorrect: false, rationale: 'Past participle "worked" would imply a passive ("scientists who were worked") — unnatural.' },
        { text: 'who are working', isCorrect: false, rationale: 'This is the full relative clause, not the reduced form.' },
        { text: 'having worked', isCorrect: false, rationale: 'Perfect participle implies prior completion — a different meaning.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['relative-clause', 'non-defining', 'sentential-relative'],
    content: {
      prompt: '"She resigned, ___ surprised everyone." (Relative referring to the whole event)',
      options: [
        { text: 'which', isCorrect: true,  rationale: '"Which" can refer to an entire preceding proposition in a non-defining relative clause.' },
        { text: 'that',  isCorrect: false, rationale: '"That" is only used in defining relative clauses and cannot refer to a whole clause.' },
        { text: 'what',  isCorrect: false, rationale: '"What" introduces a nominal clause and cannot link to a preceding proposition.' },
        { text: 'who',   isCorrect: false, rationale: '"Who" refers to people, not events.' },
      ],
    },
  },

  // Formal conjunctions (4)
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['conjunctions', 'concession', 'albeit'],
    content: {
      prompt: '"The project was completed on time, ___ at considerable cost."',
      options: [
        { text: 'albeit',   isCorrect: true,  rationale: '"Albeit" = "even though" — introduces a concession before a noun or adjective phrase.' },
        { text: 'although', isCorrect: false, rationale: '"Although" needs a full clause (subject + verb) and cannot precede a noun phrase alone.' },
        { text: 'despite',  isCorrect: false, rationale: '"Despite" is possible but less idiomatic here than "albeit" as a parenthetical phrase opener.' },
        { text: 'even so',  isCorrect: false, rationale: '"Even so" introduces a new contrasting clause, not a parenthetical phrase.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['conjunctions', 'result', 'thereby'],
    content: {
      prompt: '"The company underinvested in R&D, ___ falling behind its competitors."',
      options: [
        { text: 'thereby',    isCorrect: true,  rationale: '"Thereby + -ing" formally links a cause to its consequence: "as a result of which."' },
        { text: 'hence',      isCorrect: false, rationale: '"Hence" introduces a clause or noun, not a participial phrase directly.' },
        { text: 'accordingly', isCorrect: false, rationale: '"Accordingly" introduces a following clause, not a participle phrase.' },
        { text: 'therefore',  isCorrect: false, rationale: '"Therefore" introduces a full clause: "therefore it fell behind." It cannot precede a participle phrase here.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['conjunctions', 'concession', 'notwithstanding'],
    content: {
      prompt: '"___ the obvious risks, the expedition proceeded as planned." (Formal concessive preposition)',
      options: [
        { text: 'Notwithstanding', isCorrect: true,  rationale: '"Notwithstanding" = "in spite of" — a formal preposition before a noun phrase.' },
        { text: 'Nevertheless',   isCorrect: false, rationale: '"Nevertheless" is an adverb introducing a new clause, not a preposition before a noun phrase.' },
        { text: 'Whilst',         isCorrect: false, rationale: '"Whilst" requires a full clause.' },
        { text: 'Albeit',         isCorrect: false, rationale: '"Albeit" before a plain noun phrase is less natural than "notwithstanding."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['conjunctions', 'formal', 'inasmuch-as'],
    content: {
      prompt: '"___ the contract specifies a fixed price, the client has no grounds for additional claims."',
      options: [
        { text: 'Inasmuch as', isCorrect: true,  rationale: '"Inasmuch as" = "because/to the extent that" — a formal conjunction introducing a reason.' },
        { text: 'Whereas',     isCorrect: false, rationale: '"Whereas" introduces a contrast, not a reason.' },
        { text: 'Provided that', isCorrect: false, rationale: '"Provided that" introduces a condition.' },
        { text: 'Albeit',      isCorrect: false, rationale: '"Albeit" introduces a concession with a reduced phrase, not a full reason clause.' },
      ],
    },
  },

  // Participial causal clause (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['participle-clause', 'causal', 'having-done'],
    content: {
      prompt: '"___ the data, the team submitted their final report." (Prior completion → main action)',
      options: [
        { text: 'Having analysed',      isCorrect: true,  rationale: '"Having + past participle" is a perfect participial clause showing prior completion, same subject as the main clause.' },
        { text: 'Analysing',            isCorrect: false, rationale: 'Present participle "analysing" implies simultaneity, not prior completion.' },
        { text: 'After they analysed',  isCorrect: false, rationale: 'A finite subordinate clause — not a reduced participial clause.' },
        { text: 'To have analysed',     isCorrect: false, rationale: 'A perfect infinitive is not used as a participial clause opener here.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['participle-clause', 'simultaneous', 'comma-clause'],
    content: {
      prompt: '"___ quietly, she entered the room without disturbing anyone." (Simultaneous action)',
      options: [
        { text: 'Walking', isCorrect: true,  rationale: 'Present participial clause "walking quietly" expresses an action simultaneous with "she entered."' },
        { text: 'Walked',  isCorrect: false, rationale: 'Past simple cannot function as a participial clause opener.' },
        { text: 'Having walked', isCorrect: false, rationale: '"Having walked" implies prior completion, not simultaneity.' },
        { text: 'Walk',    isCorrect: false, rationale: 'Bare infinitive cannot open a participial clause.' },
      ],
    },
  },

  // Reporting passive with raise/believe (1)
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['passive', 'raised-object', 'reporting-passive'],
    content: {
      prompt: '"The company ___ to have underreported its emissions." (Subject raised from that-clause)',
      options: [
        { text: 'is believed',    isCorrect: true,  rationale: '"Subject + is/are + past participle + to-infinitive" is the raised-subject reporting passive: "It is believed that the company underreported" → "The company is believed to have underreported."' },
        { text: 'is believing',   isCorrect: false, rationale: '"Believe" is stative and cannot be used in the continuous.' },
        { text: 'believes',       isCorrect: false, rationale: 'Active "believes" requires a specific agent subject.' },
        { text: 'was believed to being', isCorrect: false, rationale: '"To being" is not a grammatical form; "to have + past participle" is required for a past infinitive.' },
      ],
    },
  },

  // Mandative subjunctive at B2 (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['subjunctive', 'mandative', 'formal'],
    content: {
      prompt: '"The committee recommends that the policy ___ reviewed immediately."',
      options: [
        { text: 'be',      isCorrect: true,  rationale: 'The mandative subjunctive uses the base form (infinitive) — "be," not "is."' },
        { text: 'is',      isCorrect: false, rationale: 'Indicative "is" is used in informal speech; formal writing requires the subjunctive "be."' },
        { text: 'should be', isCorrect: false, rationale: '"Should be" is a British semi-formal alternative but not the mandative subjunctive.' },
        { text: 'will be',  isCorrect: false, rationale: '"Will be" expresses future prediction, not mandative recommendation.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['subjunctive', 'mandative', 'demand'],
    content: {
      prompt: '"The contract demands that the contractor ___ all work by June 30."',
      options: [
        { text: 'complete',    isCorrect: true,  rationale: 'Mandative subjunctive: base form "complete" (no "-s") is required after "demands that."' },
        { text: 'completes',   isCorrect: false, rationale: 'Third-person "-s" is not added in the mandative subjunctive.' },
        { text: 'will complete', isCorrect: false, rationale: '"Will complete" expresses intention/prediction, not mandative force.' },
        { text: 'is completing', isCorrect: false, rationale: 'Continuous form is not used in the mandative subjunctive.' },
      ],
    },
  },

  // ── C1 (25 items) ────────────────────────────────────────────────────────

  // Hedging language (5)
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.3, guessing: 0.20,
    tags: ['hedging', 'academic-language', 'it-would-appear'],
    content: {
      prompt: '"___ that further research is needed before any firm conclusions can be drawn."',
      options: [
        { text: 'It would appear',  isCorrect: true,  rationale: '"It would appear that" is a standard hedging device in academic writing.' },
        { text: 'It is obvious',    isCorrect: false, rationale: '"It is obvious" is a strong assertion that undermines hedging.' },
        { text: 'It is clear',      isCorrect: false, rationale: '"It is clear" asserts certainty — inappropriate for cautious claims.' },
        { text: 'It must be said',  isCorrect: false, rationale: '"It must be said" introduces emphasis or obligation, not epistemic uncertainty.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.3, guessing: 0.20,
    tags: ['hedging', 'academic-language', 'tend-to'],
    content: {
      prompt: '"The results ___ to support the hypothesis, although further replication is needed."',
      options: [
        { text: 'tend',        isCorrect: true,  rationale: '"Tend to" hedges by indicating general tendency rather than absolute proof.' },
        { text: 'prove',       isCorrect: false, rationale: '"Prove" asserts strong certainty — too direct for the hedged register.' },
        { text: 'confirm',     isCorrect: false, rationale: '"Confirm" implies definitive support, contradicting the concession.' },
        { text: 'demonstrate', isCorrect: false, rationale: '"Demonstrate" is more assertive than "tend to support."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.4, guessing: 0.20,
    tags: ['hedging', 'epistemic-modality'],
    content: {
      prompt: '"There ___ a connection between these two variables, though causation has not been established."',
      options: [
        { text: 'may well be',    isCorrect: true,  rationale: '"May well be" suggests a reasonable but uncertain possibility — appropriate for a correlational finding.' },
        { text: 'definitely is',  isCorrect: false, rationale: 'Certainty directly contradicts "though causation has not been established."' },
        { text: 'inevitably is',  isCorrect: false, rationale: '"Inevitably" implies a forced logical outcome, not uncertainty.' },
        { text: 'evidently is',   isCorrect: false, rationale: '"Evidently" expresses apparent certainty — too strong.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['hedging', 'distancing', 'impersonal-passive'],
    content: {
      prompt: '"___ that digital technologies are reshaping cognitive patterns." (Distancing the claim from the author)',
      options: [
        { text: 'It has been argued',     isCorrect: true,  rationale: 'The impersonal passive presents an argument without the author fully endorsing it.' },
        { text: 'I argue',               isCorrect: false, rationale: 'First-person direct claim — no distancing.' },
        { text: 'Clearly,',              isCorrect: false, rationale: '"Clearly" is an assertive boosting device, not a hedge.' },
        { text: 'It goes without saying', isCorrect: false, rationale: 'An assertive phrase implying self-evidence — the opposite of hedging.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['hedging', 'approximation', 'appeared-to-be'],
    content: {
      prompt: '"The intervention ___ effective for roughly half of the participants."',
      options: [
        { text: 'appeared to be', isCorrect: true,  rationale: '"Appeared to be" hedges by suggesting a perceptual inference, combining naturally with approximation.' },
        { text: 'was proven',     isCorrect: false, rationale: '"Was proven" asserts certainty, mismatching the approximation.' },
        { text: 'certainly was',  isCorrect: false, rationale: '"Certainly" boosts certainty, contradicting the hedged approximation.' },
        { text: 'must have been', isCorrect: false, rationale: '"Must have been" is a deductive modal, not an academic hedging form for reporting.' },
      ],
    },
  },

  // Ellipsis and substitution (4)
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.3, guessing: 0.20,
    tags: ['ellipsis', 'substitution', 'do-so'],
    content: {
      prompt: '"She wanted to submit the report early, and she ___ the following day."',
      options: [
        { text: 'did so',   isCorrect: true,  rationale: '"Do so" substitutes for a previously mentioned verb phrase, avoiding repetition.' },
        { text: 'did it',   isCorrect: false, rationale: '"Did it" is possible colloquially; "did so" is the formal anaphoric substitute.' },
        { text: 'made it',  isCorrect: false, rationale: '"Made it" changes the meaning to "succeeded/arrived."' },
        { text: 'done so',  isCorrect: false, rationale: '"Done so" requires a perfect auxiliary: "she had done so." Simple past requires "did so."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.3, guessing: 0.20,
    tags: ['ellipsis', 'verb-phrase-ellipsis'],
    content: {
      prompt: '"He said he would call, but he ___." (Omitting the repeated verb phrase)',
      options: [
        { text: "didn't",        isCorrect: true,  rationale: 'Verb phrase ellipsis retains the auxiliary and omits the repeated main verb: "didn\'t [call]."' },
        { text: "didn't call it", isCorrect: false, rationale: '"Call it" changes the meaning.' },
        { text: "hasn't",        isCorrect: false, rationale: '"Hasn\'t" switches tense, creating inconsistency.' },
        { text: "wouldn't",      isCorrect: false, rationale: '"Wouldn\'t" implies refusal, not mere failure to call.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['substitution', 'one-ones'],
    content: {
      prompt: '"I have two reports to write. The urgent ___ will take all afternoon."',
      options: [
        { text: 'one',  isCorrect: true,  rationale: '"One" substitutes for a previously mentioned count noun while allowing modification.' },
        { text: 'it',   isCorrect: false, rationale: '"It" is a pronoun referring to a specific entity; "the urgent it" is ungrammatical.' },
        { text: 'that', isCorrect: false, rationale: '"That" as a substitute before an adjective is ungrammatical.' },
        { text: 'ones', isCorrect: false, rationale: '"Ones" is plural; "the urgent one" refers to a single report.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.3, discrimination: 1.4, guessing: 0.20,
    tags: ['ellipsis', 'auxiliary-ellipsis', 'so-neither'],
    content: {
      prompt: '"He missed the deadline, and ___ did his colleague." (Agreement: both missed)',
      options: [
        { text: 'so',    isCorrect: true,  rationale: '"So + inverted auxiliary + subject" agrees with an affirmative: "so did his colleague" = his colleague also missed.' },
        { text: 'neither', isCorrect: false, rationale: '"Neither did his colleague" would mean his colleague also did NOT do something — for negative agreement.' },
        { text: 'nor',   isCorrect: false, rationale: '"Nor" is used for negative addition; it requires a negative context.' },
        { text: 'such',  isCorrect: false, rationale: '"Such" does not form auxiliary agreement structures.' },
      ],
    },
  },

  // Aspect in academic writing (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.3, guessing: 0.20,
    tags: ['aspect', 'stative-verb', 'academic-prose'],
    content: {
      prompt: '"The data ___ a consistent upward trend." (Formal academic reporting)',
      options: [
        { text: 'show',         isCorrect: true,  rationale: 'Simple present is standard in academic writing for stative verbs like "show," "indicate," and "suggest," which resist the progressive.' },
        { text: 'are showing',  isCorrect: false, rationale: '"Are showing" implies a temporary developing action — stative "show" is not normally used in the progressive.' },
        { text: 'have shown',   isCorrect: false, rationale: 'Present perfect is possible but simple present is more direct for describing current evidence.' },
        { text: 'showed',       isCorrect: false, rationale: 'Past simple suggests the trend no longer holds.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.3, guessing: 0.20,
    tags: ['aspect', 'present-perfect-vs-past', 'academic-relevance'],
    content: {
      prompt: '"Researchers ___ this hypothesis in numerous studies over the past decade." (Past work, current relevance)',
      options: [
        { text: 'have examined',  isCorrect: true,  rationale: 'Present perfect links work spanning a period up to the present — appropriate for ongoing relevance.' },
        { text: 'examined',       isCorrect: false, rationale: 'Past simple cuts the connection to the present; "over the past decade" implies continued relevance.' },
        { text: 'are examining',  isCorrect: false, rationale: 'Present continuous implies the research is happening now, not over the past decade.' },
        { text: 'had examined',   isCorrect: false, rationale: 'Past perfect requires a prior past anchor point.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['aspect', 'perfect-progressive', 'ongoing-research'],
    content: {
      prompt: '"Since 2015, the team ___ the long-term effects of urban noise on sleep." (Still ongoing)',
      options: [
        { text: 'has been investigating', isCorrect: true,  rationale: 'Present perfect continuous emphasises duration from a past point to the present — ideal for still-continuing research.' },
        { text: 'has investigated',       isCorrect: false, rationale: '"Has investigated" (perfect simple) emphasises completion, implying the research may be finished.' },
        { text: 'investigated',           isCorrect: false, rationale: 'Past simple places the research at a completed past point.' },
        { text: 'was investigating',      isCorrect: false, rationale: 'Past continuous refers to an activity in progress at a specific past time.' },
      ],
    },
  },

  // Complex modal forms (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.3, guessing: 0.20,
    tags: ['modals', 'modal-perfect', 'should-have', 'passive'],
    content: {
      prompt: '"The audit ___ conducted before the merger, not after." (Unfulfilled obligation)',
      options: [
        { text: 'should have been', isCorrect: true,  rationale: '"Should have been + past participle" (passive modal perfect) expresses an obligation that was not fulfilled.' },
        { text: 'should be',        isCorrect: false, rationale: '"Should be" is present/future obligation, not retrospective criticism.' },
        { text: 'must have been',   isCorrect: false, rationale: '"Must have been" is a logical deduction, not an unfulfilled obligation.' },
        { text: 'would have been',  isCorrect: false, rationale: '"Would have been" appears in conditional main clauses, not as standalone obligation.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['modals', 'neednt-have', 'unnecessary-action'],
    content: {
      prompt: '"You ___ prepared three copies — one would have been enough." (Done, but unnecessary)',
      options: [
        { text: "needn't have prepared", isCorrect: true,  rationale: '"Needn\'t have + past participle" means the action was done but was unnecessary.' },
        { text: "didn't need to prepare", isCorrect: false, rationale: '"Didn\'t need to" implies no necessity and does not confirm the action was taken.' },
        { text: "shouldn't have prepared", isCorrect: false, rationale: '"Shouldn\'t have" implies the action was wrong, a stronger criticism than mere wastefulness.' },
        { text: "couldn't have prepared",  isCorrect: false, rationale: '"Couldn\'t have" means the action was impossible — contradicting the implication that it was done.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.3, discrimination: 1.4, guessing: 0.20,
    tags: ['modals', 'modal-stacking', 'ability-future'],
    content: {
      prompt: '"By next year, she ___ complete the certification programme." (Future ability/possibility)',
      options: [
        { text: 'will be able to', isCorrect: true,  rationale: '"Will be able to" is the future form of "can" — two modals cannot be stacked directly in English.' },
        { text: 'must can',        isCorrect: false, rationale: 'Double modal stacking is ungrammatical in standard English.' },
        { text: 'should can',      isCorrect: false, rationale: '"Should can" is ungrammatical; "should be able to" is the correct form.' },
        { text: 'might would',     isCorrect: false, rationale: 'Double modals are non-standard in formal English.' },
      ],
    },
  },

  // Discourse markers in academic prose (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.3, guessing: 0.20,
    tags: ['discourse-markers', 'that-said', 'concession'],
    content: {
      prompt: '"The intervention showed promising results. ___, the sample size was insufficient for general conclusions."',
      options: [
        { text: 'That said,',     isCorrect: true,  rationale: '"That said" concedes the previous point before introducing a limitation.' },
        { text: 'Moreover,',      isCorrect: false, rationale: '"Moreover" adds a supporting point, not a concession.' },
        { text: 'In conclusion,', isCorrect: false, rationale: '"In conclusion" signals the final summary.' },
        { text: 'For instance,',  isCorrect: false, rationale: '"For instance" introduces an example, not a contrasting qualification.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.3, guessing: 0.20,
    tags: ['discourse-markers', 'more-specifically', 'elaboration'],
    content: {
      prompt: '"The policy was effective. ___, it reduced costs and improved outcomes simultaneously."',
      options: [
        { text: 'More specifically,', isCorrect: true,  rationale: '"More specifically" narrows and elaborates on the preceding claim.' },
        { text: 'In contrast,',       isCorrect: false, rationale: '"In contrast" signals opposition, not elaboration.' },
        { text: 'On the other hand,', isCorrect: false, rationale: '"On the other hand" signals a comparison contrast.' },
        { text: 'All in all,',        isCorrect: false, rationale: '"All in all" signals a summary conclusion.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['discourse-markers', 'arguably', 'critical-stance'],
    content: {
      prompt: '"___, the authors draw a parallel that, while useful, may oversimplify the relationship." (Critical evaluation)',
      options: [
        { text: 'Arguably,',    isCorrect: true,  rationale: '"Arguably" is a stance marker for presenting a debatable or critical evaluation.' },
        { text: 'Crucially,',   isCorrect: false, rationale: '"Crucially" signals high importance, not critical evaluation.' },
        { text: 'Similarly,',   isCorrect: false, rationale: '"Similarly" introduces a comparison.' },
        { text: 'Fortunately,', isCorrect: false, rationale: '"Fortunately" expresses approval — the opposite of critical scrutiny.' },
      ],
    },
  },

  // Nominalisation (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['nominalisation', 'academic-style'],
    content: {
      prompt: '"The government decided to increase taxes." Which nominalised version is most formal?',
      options: [
        { text: "The government's decision to increase taxes",      isCorrect: true,  rationale: 'Nominalisation converts "decided" → "decision," creating a denser, more impersonal academic style.' },
        { text: 'The government deciding to increase taxes',        isCorrect: false, rationale: 'A gerund participial phrase — retains verb-like properties, not a full nominal form.' },
        { text: 'That the government increased taxes',             isCorrect: false, rationale: 'A nominal that-clause retains a finite verb — not nominalisation.' },
        { text: 'The government tax increase decision-making',     isCorrect: false, rationale: 'Awkward stacking — not the target nominalisation of "decided."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.3, discrimination: 1.4, guessing: 0.20,
    tags: ['nominalisation', 'lexical-density'],
    content: {
      prompt: '"Because they failed to communicate, the project collapsed." Which is most fully nominalised?',
      options: [
        { text: 'The failure to communicate resulted in the collapse of the project.', isCorrect: true,  rationale: '"Failure to communicate" and "collapse of the project" are nominalisations — maximum lexical density and formality.' },
        { text: 'They failing to communicate made the project collapse.',              isCorrect: false, rationale: '"They failing" is non-standard; possessive is required ("their failing"), and the structure is less formal.' },
        { text: 'Since communication failed, so too did the project.',                isCorrect: false, rationale: 'Partially nominalised but retains finite verbs and the informal "so too did."' },
        { text: 'The project collapsed because of their failure to communicate.',     isCorrect: false, rationale: '"Failure to communicate" is nominalised, but the main clause retains a finite verb — less fully nominalised.' },
      ],
    },
  },

  // Anticipatory it (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.3, guessing: 0.20,
    tags: ['anticipatory-it', 'extraposition', 'formal'],
    content: {
      prompt: '"___ that the proposal had been withdrawn without explanation." (Formal subject extraposition)',
      options: [
        { text: 'It was surprising',      isCorrect: true,  rationale: '"It + be + adjective + that-clause" is the extraposition pattern: anticipatory "it" fronts while the real subject is deferred.' },
        { text: 'This was surprising',    isCorrect: false, rationale: '"This" as subject requires "this proposal" etc.; "this that…" is ungrammatical as extraposition.' },
        { text: 'That it was surprising', isCorrect: false, rationale: '"That it was surprising" reverses the structure; the that-clause should follow, not precede.' },
        { text: 'The surprise being',     isCorrect: false, rationale: 'A nominal absolute, not the anticipatory "it" structure.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['anticipatory-it', 'raised-subject'],
    content: {
      prompt: '"___ to be easy to predict which firms will benefit most from the policy." (Formal report language)',
      options: [
        { text: 'It appears',         isCorrect: true,  rationale: '"It appears + to-infinitive" is the raised-subject construction with anticipatory "it," standard in formal written English.' },
        { text: 'There appears',      isCorrect: false, rationale: '"There appears to be" introduces an existential subject, not an anticipatory subject before an infinitive clause.' },
        { text: 'Which appears',      isCorrect: false, rationale: '"Which appears" would require an antecedent noun and makes the sentence incomplete.' },
        { text: 'This seems',         isCorrect: false, rationale: '"This seems" requires a specific referent; "it seems" is the correct anticipatory form.' },
      ],
    },
  },

  // Wh-exclamatives and comment clauses (2)
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.3, guessing: 0.20,
    tags: ['wh-exclamative', 'exclamation', 'c1'],
    content: {
      prompt: '"___ progress has been made in such a short time!" Which exclamative structure is correct?',
      options: [
        { text: 'What remarkable',   isCorrect: true,  rationale: '"What + adjective + noun" forms a wh-exclamative: "What remarkable progress has been made!"' },
        { text: 'How remarkable',    isCorrect: false, rationale: '"How + adjective" exclaims about a quality without a noun: "How remarkable!" but not "How remarkable progress."' },
        { text: 'Such remarkable',   isCorrect: false, rationale: '"Such remarkable progress" is not a free exclamative; it would need a copula: "Such remarkable progress has been made" is possible but less natural as an exclamative than "What remarkable progress."' },
        { text: 'So remarkable',     isCorrect: false, rationale: '"So + adjective" exclaims about degree but requires "that" for a result clause, not a standalone exclamative.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['comment-clause', 'parenthetical', 'c1'],
    content: {
      prompt: '"The committee approved the plan, ___, after two hours of debate." Which comment clause expresses unexpected ease?',
      options: [
        { text: 'surprisingly enough', isCorrect: true,  rationale: '"Surprisingly enough" is a parenthetical comment clause expressing the speaker\'s attitude of surprise — a characteristic evaluative comment clause.' },
        { text: 'as a result',         isCorrect: false, rationale: '"As a result" is a result connector, not a comment on the speaker\'s attitude.' },
        { text: 'as it happens',       isCorrect: false, rationale: '"As it happens" is a comment clause expressing coincidence or incidental fact, not surprise.' },
        { text: 'after all',           isCorrect: false, rationale: '"After all" implies the outcome was expected given previous evidence — expressing inevitability, not surprise.' },
      ],
    },
  },
  // Passive with complex modal + raise (1)
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.3, discrimination: 1.4, guessing: 0.20,
    tags: ['passive', 'complex-passive', 'raise-construction', 'c1'],
    content: {
      prompt: '"Several errors ___ to have been introduced during the editing process." (Passive + perfect infinitive)',
      options: [
        { text: 'appear',       isCorrect: true,  rationale: '"Subject + appear + to have been + past participle" is the raised-subject structure with a perfect passive infinitive, standard in formal reporting.' },
        { text: 'are appeared', isCorrect: false, rationale: '"Appear" is intransitive and cannot be passivised.' },
        { text: 'seem being',   isCorrect: false, rationale: '"Seem being" is not grammatical; the raised construction requires a to-infinitive.' },
        { text: 'were appeared', isCorrect: false, rationale: '"Appear" cannot be used in the passive — it is an intransitive verb.' },
      ],
    },
  },

  // ── C2 (15 items) ────────────────────────────────────────────────────────

  // Negative comparison with "as...as" (1)
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.5, discrimination: 1.4, guessing: 0.15,
    tags: ['comparison', 'negative-as-as', 'not-so-as', 'c2'],
    content: {
      prompt: '"The results were not ___ conclusive ___ the team had hoped." Which negative comparison is standard?',
      options: [
        { text: 'as / as',   isCorrect: true,  rationale: '"Not as…as" is the standard form for negative comparison in contemporary formal English.' },
        { text: 'so / as',   isCorrect: false, rationale: '"Not so…as" is a grammatically valid but archaic/formal form; "not as…as" is preferred in modern usage.' },
        { text: 'such / as', isCorrect: false, rationale: '"Such…as" forms a different comparison structure and does not match negative equality.' },
        { text: 'more / than', isCorrect: false, rationale: '"More…than" expresses superiority, not negative equality.' },
      ],
    },
  },
  // Conditional with "but for" (1)
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.6, discrimination: 1.4, guessing: 0.15,
    tags: ['conditionals', 'but-for', 'counterfactual', 'c2'],
    content: {
      prompt: '"___ her quick intervention, the situation would have escalated." Which structure expresses a counterfactual condition?',
      options: [
        { text: 'But for',         isCorrect: true,  rationale: '"But for + noun phrase" = "If it had not been for" — a formal counterfactual structure equivalent to a type 3 conditional.' },
        { text: 'Because of',      isCorrect: false, rationale: '"Because of" introduces a factual reason, not a counterfactual condition.' },
        { text: 'Apart from',      isCorrect: false, rationale: '"Apart from" expresses exclusion, not a counterfactual condition.' },
        { text: 'Had it not been', isCorrect: false, rationale: '"Had it not been for" is also correct but it uses inverted form with "it," not a direct NP.' },
      ],
    },
  },
  // Appositive relative clause (1)
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.7, discrimination: 1.5, guessing: 0.15,
    tags: ['relative-clause', 'appositive', 'non-defining', 'c2'],
    content: {
      prompt: '"The board\'s final decision, ___ came as a surprise to most observers, was to delay the merger." Which form is correct?',
      options: [
        { text: 'which', isCorrect: true,  rationale: '"Which" introduces a non-defining (appositive) relative clause adding supplementary information about the noun. Commas mark it as non-defining.' },
        { text: 'that',  isCorrect: false, rationale: '"That" is used in defining relative clauses; it cannot be used in non-defining clauses between commas.' },
        { text: 'what',  isCorrect: false, rationale: '"What" introduces a nominal clause and cannot function as a relative pronoun in this construction.' },
        { text: 'it',    isCorrect: false, rationale: '"It" is a personal pronoun and cannot introduce a relative clause.' },
      ],
    },
  },

  // Advanced cleft structures (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.5, discrimination: 1.4, guessing: 0.15,
    tags: ['cleft', 'wh-cleft-reverse', 'c2'],
    content: {
      prompt: '"___ was the most surprising finding." (Wh-cleft with the focused element as complement)',
      options: [
        { text: 'What the researchers discovered',     isCorrect: true,  rationale: '"What + clause" as subject followed by "was" and the focused complement is the reverse pseudo-cleft structure.' },
        { text: 'It was what the researchers discovered that', isCorrect: false, rationale: 'An it-cleft with a wh-clause focus is grammatically unusual; this is not the standard form.' },
        { text: 'That the researchers discovered',     isCorrect: false, rationale: '"That" introduces a nominal clause but requires a fully specified discovery to be grammatically complete.' },
        { text: 'What did the researchers discover',   isCorrect: false, rationale: 'Interrogative word order — not a declarative cleft.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.6, discrimination: 1.4, guessing: 0.15,
    tags: ['cleft', 'it-cleft', 'relative-pronoun', 'c2'],
    content: {
      prompt: '"It is the long-term consequences ___ policymakers have consistently underestimated."',
      options: [
        { text: 'that',  isCorrect: true,  rationale: '"That" is the canonical relative pronoun in it-cleft constructions: "It is [X] that..."' },
        { text: 'which', isCorrect: false, rationale: '"Which" is possible in non-defining relative clauses but "that" is preferred in it-clefts.' },
        { text: 'what',  isCorrect: false, rationale: '"What" introduces pseudo-clefts, not it-clefts.' },
        { text: 'who',   isCorrect: false, rationale: '"Who" is for people; "consequences" requires "that."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.7, discrimination: 1.5, guessing: 0.15,
    tags: ['cleft', 'all-cleft', 'restriction', 'c2'],
    content: {
      prompt: '"___ I am asking is that you consider the proposal carefully." (Limiting/restricting focus)',
      options: [
        { text: 'All',       isCorrect: true,  rationale: '"All + relative clause + be + complement" is the "all-cleft" — a restricting focus structure: "All I am asking is…"' },
        { text: 'What only', isCorrect: false, rationale: '"What only I am asking" inverts word order incorrectly.' },
        { text: 'It is all', isCorrect: false, rationale: '"It is all I am asking" is an it-cleft variant — grammatically different from the all-cleft.' },
        { text: 'Which',     isCorrect: false, rationale: '"Which I am asking is" is ungrammatical as a subject opener.' },
      ],
    },
  },

  // Absolute constructions (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.6, discrimination: 1.4, guessing: 0.15,
    tags: ['absolute-construction', 'noun-phrase-being', 'c2'],
    content: {
      prompt: '"___ complete, the team moved on to the testing phase." (Simultaneous condition)',
      options: [
        { text: 'The prototype being',          isCorrect: true,  rationale: '"NP + being + adjective/participle" forms an absolute participial phrase.' },
        { text: 'With the prototype being',     isCorrect: false, rationale: '"With + NP + participle" is a with-absolute — a prepositional variant, not a pure absolute.' },
        { text: 'The prototype is',             isCorrect: false, rationale: 'A finite clause cannot stand as an absolute modifier.' },
        { text: 'Being the prototype complete', isCorrect: false, rationale: 'The noun phrase must precede "being."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.7, discrimination: 1.5, guessing: 0.15,
    tags: ['absolute-construction', 'perfect-passive-absolute', 'c2'],
    content: {
      prompt: '"___ decided, the announcement was made to the press." (Prior completion, passive)',
      options: [
        { text: 'The matter having been',   isCorrect: true,  rationale: '"NP + having been + past participle" is a perfect passive absolute showing completion before the main action.' },
        { text: 'Having decided the matter', isCorrect: false, rationale: 'No explicit subject — this is a dangling participle.' },
        { text: 'The matter decided',       isCorrect: false, rationale: '"The matter decided" is a simple absolute — grammatically possible but less precise for prior completion.' },
        { text: 'When the matter was',      isCorrect: false, rationale: 'A finite time clause, not an absolute construction.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.8, discrimination: 1.5, guessing: 0.15,
    tags: ['absolute-construction', 'literary-style', 'function', 'c2'],
    content: {
      prompt: '"Her voice barely audible, she delivered the verdict." What grammatical function does "her voice barely audible" serve?',
      options: [
        { text: 'An absolute phrase modifying the whole main clause',  isCorrect: true,  rationale: '"Her voice barely audible" is an absolute phrase (NP + adjective predicate, no finite verb) modifying the entire main clause.' },
        { text: 'A dangling modifier with no logical subject',         isCorrect: false, rationale: 'The absolute has its own subject ("her voice") — it is not dangling.' },
        { text: 'A non-defining relative clause',                      isCorrect: false, rationale: 'A relative clause requires a relative pronoun and a finite verb — neither is present.' },
        { text: 'A predicative adjective modifying "she"',            isCorrect: false, rationale: '"Audible" predicates of "her voice," not "she."' },
      ],
    },
  },

  // Register and formal style (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.6, discrimination: 1.4, guessing: 0.15,
    tags: ['register', 'performative-adverb', 'formal', 'c2'],
    content: {
      prompt: '"The committee ___ requests that all submissions arrive by Friday." (Formal official announcement)',
      options: [
        { text: 'hereby',    isCorrect: true,  rationale: '"Hereby" is a formal performative adverb used in official, legal, and institutional announcements.' },
        { text: 'really',    isCorrect: false, rationale: '"Really" is an informal intensifier — incompatible with formal institutional language.' },
        { text: 'literally', isCorrect: false, rationale: '"Literally" is used for non-metaphorical emphasis, not formal performatives.' },
        { text: 'basically', isCorrect: false, rationale: '"Basically" is colloquial and incompatible with formal official register.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.7, discrimination: 1.5, guessing: 0.15,
    tags: ['subjunctive', 'mandative', 'c2', 'demands-that'],
    content: {
      prompt: '"The proposal demands that every candidate ___ a portfolio before the interview." (Formal mandative subjunctive)',
      options: [
        { text: 'submit',        isCorrect: true,  rationale: 'Mandative subjunctive uses the base form — "submit," never "submits" — after verbs of demand/requirement.' },
        { text: 'submits',       isCorrect: false, rationale: 'Third-person "-s" is not added in the mandative subjunctive.' },
        { text: 'should submit', isCorrect: false, rationale: '"Should submit" is a British semi-formal alternative; the target here is the bare-form subjunctive.' },
        { text: 'will submit',   isCorrect: false, rationale: '"Will submit" expresses future prediction, not mandative obligation.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.8, discrimination: 1.5, guessing: 0.15,
    tags: ['complex-syntax', 'embedding', 'relative-within-relative', 'c2'],
    content: {
      prompt: 'Which sentence contains a doubly-embedded structure (a nominal clause inside a relative clause)?',
      options: [
        { text: 'The researcher whose findings challenged what had long been assumed published a landmark paper.', isCorrect: true, rationale: '"whose findings challenged" is a relative clause; "what had long been assumed" is a nominal wh-clause embedded within it — double embedding.' },
        { text: 'She asked whether the report was ready.',                     isCorrect: false, rationale: 'Contains only a single embedded interrogative — no relative clause.' },
        { text: 'The results confirmed the hypothesis.',                       isCorrect: false, rationale: 'Simple transitive clause — no embedding.' },
        { text: 'We learned that he had been present.',                        isCorrect: false, rationale: 'Single nominal that-clause — no relative clause and no embedded interrogative.' },
      ],
    },
  },

  // Focus particles (3)
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.5, discrimination: 1.4, guessing: 0.15,
    tags: ['focus-particles', 'only', 'exclusive-restriction', 'c2'],
    content: {
      prompt: '"___ the director voted against the motion." (Exclusive: no one else voted against)',
      options: [
        { text: 'Only',   isCorrect: true,  rationale: '"Only" restricts the predicate to a single entity — exclusively the director voted against.' },
        { text: 'Even',   isCorrect: false, rationale: '"Even" is a scalar particle implying surprise at the extreme end of a scale, not strict exclusivity.' },
        { text: 'Just',   isCorrect: false, rationale: '"Just" can imply exclusivity but also minimisation; "only" is more precise here.' },
        { text: 'Merely', isCorrect: false, rationale: '"Merely" implies minimisation of the action, not restriction of the agent.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.6, discrimination: 1.4, guessing: 0.15,
    tags: ['focus-particles', 'even', 'scalar-implicature', 'c2'],
    content: {
      prompt: '"___ the CEO did not know about the breach." (Scalar surprise: CEO = highest on the expected-to-know scale)',
      options: [
        { text: 'Even', isCorrect: true,  rationale: '"Even" triggers scalar implicature: if even the CEO (highest on the scale) did not know, no one did.' },
        { text: 'Only', isCorrect: false, rationale: '"Only the CEO did not know" implies everyone else did — opposite direction.' },
        { text: 'Just', isCorrect: false, rationale: '"Just" might imply minimisation rather than scalar surprise.' },
        { text: 'Rather', isCorrect: false, rationale: '"Rather" expresses degree or contrast, not scalar focus.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.7, discrimination: 1.5, guessing: 0.15,
    tags: ['focus-particles', 'scope-ambiguity', 'position-sensitivity', 'c2'],
    content: {
      prompt: '"She only told the manager about the error." vs "She told only the manager about the error." What is the key semantic difference?',
      options: [
        { text: '(A) She merely told (did nothing more than tell); (B) She told no one else', isCorrect: true,  rationale: 'In (A), "only" modifies the verb — she did nothing beyond telling. In (B), "only the manager" restricts the recipient. Position of "only" determines scope.' },
        { text: 'Both have identical meaning',                                   isCorrect: false, rationale: 'The position of "only" changes its semantic scope.' },
        { text: '(A) is more emphatic; (B) is weaker',                          isCorrect: false, rationale: 'Emphasis is not the distinction — scope of restriction is.' },
        { text: '(B) is ungrammatical because "only" must precede the verb',    isCorrect: false, rationale: '"Only" can appear before any constituent it restricts; both sentences are grammatical.' },
      ],
    },
  },
];

async function main() {
  if (!FORCE) {
    const existing = await prisma.item.findFirst({
      where: { tags: { has: SEED_TAG } },
    });
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
    for (const item of items) {
      byLevel[item.cefrLevel] = (byLevel[item.cefrLevel] ?? 0) + 1;
    }
    console.log(`DRY_RUN: would insert ${items.length} grammar items`);
    console.table(byLevel);
    return;
  }

  let inserted = 0;
  for (const item of items) {
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

  console.log(`✅  Inserted ${inserted} grammar items`);
  console.table(byLevel);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
