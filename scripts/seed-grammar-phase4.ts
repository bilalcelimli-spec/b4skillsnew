/**
 * PHASE 4 — Chapter 6
 * Topics: Gerunds (functions, time reference, verbs + gerund) ·
 *         Infinitives (uses, structures, time reference, verbs + infinitive,
 *         verbs needing special attention, be + to-infinitive)
 * 5 questions per sub-topic
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const items = [
  // ── GERUNDS — FUNCTIONS ──────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['gerunds', 'functions', 'subject'],
    content: {
      prompt: '"____ a second language opens many professional doors." Which form correctly fills the subject slot?',
      options: [
        { text: 'Learning',    isCorrect: true,  rationale: 'A gerund phrase ("Learning a second language") functions as the subject of the sentence.' },
        { text: 'To learn',    isCorrect: false, rationale: 'A to-infinitive can also be a subject, but the gerund is more natural in subject position without "It is...".' },
        { text: 'Learn',       isCorrect: false, rationale: 'The base form cannot function as a subject.' },
        { text: 'Learned',     isCorrect: false, rationale: 'The past participle cannot head a noun phrase subject.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['gerunds', 'functions', 'object-of-preposition'],
    content: {
      prompt: '"She was praised ____ her innovative thinking." Which preposition + gerund is correct?',
      options: [
        { text: 'for demonstrating',   isCorrect: true,  rationale: '"Praised for" + gerund — the preposition "for" requires a gerund, not an infinitive.' },
        { text: 'for to demonstrate',  isCorrect: false, rationale: '"For" cannot be followed by a to-infinitive in this structure.' },
        { text: 'for demonstrate',     isCorrect: false, rationale: 'The base form cannot follow a preposition.' },
        { text: 'for demonstrated',    isCorrect: false, rationale: 'Past participle cannot follow a preposition as a nominal.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['gerunds', 'functions', 'subject-complement'],
    content: {
      prompt: '"His greatest achievement is ____ the summit at the age of sixty." Which form is grammatically correct?',
      options: [
        { text: 'having climbed',  isCorrect: true,  rationale: 'Gerund (or perfect gerund) as subject complement after the linking verb "is".' },
        { text: 'to have climbed', isCorrect: false, rationale: 'Though possible, the gerund is more natural as a subject complement when the subject is also a gerund or noun.' },
        { text: 'he climbed',      isCorrect: false, rationale: 'A finite clause would require "that he climbed" or similar.' },
        { text: 'climbed',         isCorrect: false, rationale: 'The bare past participle cannot head a subject complement noun phrase here.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['gerunds', 'functions', 'appositive'],
    content: {
      prompt: 'In "Her hobby, collecting vintage stamps, has become an obsession," what function does "collecting vintage stamps" serve?',
      options: [
        { text: 'Appositive — it renames and explains "her hobby".',  isCorrect: true,  rationale: 'A gerund phrase in apposition renames the noun it follows.' },
        { text: 'Subject complement — it describes the hobby.',       isCorrect: false, rationale: 'Appositives rename rather than describe through a linking verb.' },
        { text: 'Direct object — it is what she has become.',         isCorrect: false, rationale: '"Has become an obsession" has its own object; the gerund is an appositive.' },
        { text: 'Adverbial — it explains how she became obsessed.',   isCorrect: false, rationale: 'Appositives are nominal, not adverbial.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['gerunds', 'functions', 'possessive-subject'],
    content: {
      prompt: '"____ leaving so abruptly surprised us all." Which possessive subject of the gerund is formall correct?',
      options: [
        { text: "His",    isCorrect: true,  rationale: 'In formal writing, a possessive adjective precedes a gerund when it is the logical subject.' },
        { text: "Him",    isCorrect: false, rationale: '"Him leaving" is acceptable in informal English but not formal written English.' },
        { text: "He",     isCorrect: false, rationale: 'The subject pronoun cannot precede a gerund as its possessive subject.' },
        { text: "Himself",isCorrect: false, rationale: 'Reflexive pronouns are not used as gerund subjects.' },
      ],
    },
  },

  // ── GERUNDS — TIME REFERENCE ─────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['gerunds', 'time-reference', 'perfect-gerund'],
    content: {
      prompt: '"She denied ____ the classified file before it was leaked." Which form signals that the action occurred BEFORE the main verb?',
      options: [
        { text: 'having accessed',  isCorrect: true,  rationale: 'Perfect gerund (having + V3) shows the gerund action preceded the main verb action.' },
        { text: 'accessing',        isCorrect: false, rationale: 'Simple gerund implies the action is simultaneous with or relative to the main verb, not clearly prior.' },
        { text: 'to have accessed', isCorrect: false, rationale: '"Deny" does not take a to-infinitive complement.' },
        { text: 'accessed',         isCorrect: false, rationale: 'Past participle alone cannot function as a gerund complement.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['gerunds', 'time-reference'],
    content: {
      prompt: '"She regrets ____ the offer at the time." (action simultaneous with/prior to "regretting") Which form is best?',
      options: [
        { text: 'not having accepted',  isCorrect: true,  rationale: 'Perfect gerund stresses that the non-acceptance happened before the present regret; "not" negates the gerund.' },
        { text: 'not accepting',        isCorrect: false, rationale: 'Simple gerund is possible but less precise about sequence.' },
        { text: 'not to accept',        isCorrect: false, rationale: '"Regret" + to-infinitive refers to a present/future regrettable action, such as delivering bad news ("I regret to inform you…").' },
        { text: 'not accepted',         isCorrect: false, rationale: 'Bare past participle cannot serve as a gerund complement.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['gerunds', 'time-reference', 'passive-gerund'],
    content: {
      prompt: '"She resented ____ without adequate recognition." Which passive gerund form is correct?',
      options: [
        { text: 'being treated',         isCorrect: true,  rationale: '"Being + V3" = passive gerund for simultaneous passive action.' },
        { text: 'having been treated',   isCorrect: false, rationale: 'Perfect passive gerund would emphasise that the treatment occurred before the resentment.' },
        { text: 'being treat',           isCorrect: false, rationale: 'The past participle "treated" is required, not the base form.' },
        { text: 'to be treated',         isCorrect: false, rationale: '"Resent" does not take a to-infinitive complement.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['gerunds', 'time-reference', 'remember-forget'],
    content: {
      prompt: '"I remember ____ the manuscript in 1998." Which form indicates a remembered past event?',
      options: [
        { text: 'reading',         isCorrect: true,  rationale: '"Remember + gerund" = recall a past action that happened.' },
        { text: 'to read',         isCorrect: false, rationale: '"Remember + to-infinitive" = remember to do something in the future.' },
        { text: 'having read',     isCorrect: false, rationale: '"Having read" is also grammatically possible and emphasises prior completion, but "reading" is the standard choice with "remember".' },
        { text: 'being read',      isCorrect: false, rationale: 'Passive gerund would mean someone else did the reading.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['gerunds', 'time-reference', 'stop-try'],
    content: {
      prompt: '"He stopped ____ to listen to the street musician." What does "stopped + to-infinitive" mean vs "stopped + gerund"?',
      options: [
        { text: '"Stopped to listen" = paused in order to listen; "stopped listening" = ceased the act of listening.',  isCorrect: true,  rationale: 'Stop + to-inf = purpose (he stopped whatever he was doing in order to listen); stop + gerund = cessation.' },
        { text: '"Stopped to listen" = ceased listening; "stopped listening" = began listening.',          isCorrect: false, rationale: 'The meanings are reversed.' },
        { text: 'Both forms are completely synonymous.',                                                   isCorrect: false, rationale: 'They have distinct and opposite meanings.' },
        { text: '"Stopped to listen" is informal; "stopped listening" is formal.',                        isCorrect: false, rationale: 'The distinction is semantic, not formal/informal.' },
      ],
    },
  },

  // ── GERUNDS — VERBS FOLLOWED BY THE GERUND ──────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['gerunds', 'verbs-followed-by-gerund'],
    content: {
      prompt: '"She avoided ____ any commitments that weekend." Which form is correct?',
      options: [
        { text: 'making',     isCorrect: true,  rationale: '"Avoid" only takes a gerund complement.' },
        { text: 'to make',    isCorrect: false, rationale: '"Avoid" cannot take a to-infinitive (*"avoid to make" is ungrammatical).' },
        { text: 'make',       isCorrect: false, rationale: 'The base form cannot follow "avoid" as a direct complement.' },
        { text: 'made',       isCorrect: false, rationale: 'Past participle cannot serve as a complement to "avoid".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.0, guessing: 0.25,
    tags: ['gerunds', 'verbs-followed-by-gerund'],
    content: {
      prompt: 'Which of the following verbs CANNOT be followed by a gerund?',
      options: [
        { text: 'hope',     isCorrect: true,  rationale: '"Hope" takes only a to-infinitive: "I hope to see you." *"I hope seeing you" is ungrammatical.' },
        { text: 'enjoy',    isCorrect: false, rationale: '"Enjoy" takes only a gerund.' },
        { text: 'finish',   isCorrect: false, rationale: '"Finish" takes only a gerund.' },
        { text: 'consider', isCorrect: false, rationale: '"Consider" takes a gerund.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['gerunds', 'verbs-followed-by-gerund'],
    content: {
      prompt: '"They practised ____ their lines for hours before opening night." Correct form?',
      options: [
        { text: 'delivering',   isCorrect: true,  rationale: '"Practise" (British English) takes a gerund complement.' },
        { text: 'to deliver',   isCorrect: false, rationale: '"Practise" is not followed by a to-infinitive.' },
        { text: 'deliver',      isCorrect: false, rationale: 'Base form cannot follow "practise" here.' },
        { text: 'delivered',    isCorrect: false, rationale: 'Past participle is not a standard complement of "practise".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['gerunds', 'verbs-followed-by-gerund', 'preposition'],
    content: {
      prompt: '"She is looking forward ____ her results." Complete correctly.',
      options: [
        { text: 'to receiving',   isCorrect: true,  rationale: '"Look forward to" contains the preposition "to" which must be followed by a gerund (not an infinitive).' },
        { text: 'to receive',     isCorrect: false, rationale: '"To" in "look forward to" is a preposition, not an infinitive marker.' },
        { text: 'for receiving',  isCorrect: false, rationale: 'The correct collocation is "look forward to", not "look forward for".' },
        { text: 'receiving',      isCorrect: false, rationale: 'The preposition "to" must be explicitly included.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['gerunds', 'verbs-followed-by-gerund', 'go-on'],
    content: {
      prompt: '"She finished the introduction and went on ____ the methodology chapter." What does "go on + gerund" mean vs "go on + infinitive"?',
      options: [
        { text: '"Go on + gerund" = continue the same activity; "go on + infinitive" = move on to a new activity.',  isCorrect: true,  rationale: '"Go on writing" = keep writing; "go on to write" = write as the next step.' },
        { text: '"Go on + gerund" = stop then restart; "go on + infinitive" = continue without pause.',              isCorrect: false, rationale: 'The meanings are reversed.' },
        { text: 'Both forms mean the same: continue an activity.',                                                   isCorrect: false, rationale: 'They have distinct meanings.' },
        { text: '"Go on + gerund" = past action; "go on + infinitive" = future action.',                            isCorrect: false, rationale: 'The distinction is about continuity vs next step, not tense.' },
      ],
    },
  },

  // ── INFINITIVES — USES ───────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['infinitives', 'uses', 'purpose'],
    content: {
      prompt: '"She called the office ____ an appointment." Which infinitive of purpose is correct?',
      options: [
        { text: 'to book',           isCorrect: true,  rationale: 'To-infinitive expresses purpose — equivalent to "in order to book".' },
        { text: 'for booking',       isCorrect: false, rationale: '"For + gerund" expresses purpose informally but is less standard than to-infinitive.' },
        { text: 'for to book',       isCorrect: false, rationale: '"For to" is archaic and ungrammatical in modern standard English.' },
        { text: 'booking',           isCorrect: false, rationale: 'A plain gerund does not express purpose unless preceded by "for".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['infinitives', 'uses', 'adjective-modification'],
    content: {
      prompt: '"This is a difficult problem ____ without specialist knowledge." Which form is correct?',
      options: [
        { text: 'to solve',    isCorrect: true,  rationale: 'To-infinitive as a post-modifier of an adjective: "difficult to solve" (tough-movement).' },
        { text: 'solving',     isCorrect: false, rationale: 'A gerund here would require a different sentence structure.' },
        { text: 'solved',      isCorrect: false, rationale: 'A past participle would give a passive meaning without the right syntactic structure.' },
        { text: 'that solves', isCorrect: false, rationale: 'A relative clause would change the meaning: "a problem that solves…"' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['infinitives', 'uses', 'result'],
    content: {
      prompt: '"He was so exhausted ____ the ceremony." Which structure expresses result?',
      options: [
        { text: 'as to sleep through',      isCorrect: true,  rationale: '"So + adj + as to + infinitive" expresses result (he slept through as a result of exhaustion).' },
        { text: 'that sleep through',       isCorrect: false, rationale: '"So … that" requires a full clause: "so exhausted that he slept through".' },
        { text: 'to sleep through',         isCorrect: false, rationale: 'To-infinitive alone after "so exhausted" is not the standard result structure.' },
        { text: 'enough to sleep through',  isCorrect: false, rationale: '"Enough to" follows adjectives of sufficiency, not "so + adj".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['infinitives', 'uses', 'comment'],
    content: {
      prompt: '"To be frank, his reasoning is flawed." The to-infinitive here functions as a:',
      options: [
        { text: 'Sentence (comment) adverbial expressing the speaker\'s attitude.',  isCorrect: true,  rationale: '"To be frank / to be honest" are fixed comment infinitives — they act as sentence adverbials.' },
        { text: 'Complement of the linking verb.',                                   isCorrect: false, rationale: '"His reasoning is flawed" already has its own complement.' },
        { text: 'Subject of the main verb.',                                         isCorrect: false, rationale: 'The subject is "his reasoning".' },
        { text: 'Adverb of purpose modifying "is".',                                isCorrect: false, rationale: '"To be frank" is a metalinguistic comment, not a purpose adverbial of a state verb.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['infinitives', 'uses', 'only-to'],
    content: {
      prompt: '"She worked for decades on the vaccine, only ____ her results dismissed." What structure is illustrated?',
      options: [
        { text: 'only to have — infinitive of disappointing result',  isCorrect: true,  rationale: '"Only to + infinitive" expresses unexpected, frustrating outcome after effort.' },
        { text: 'only to be — passive infinitive of concession',      isCorrect: false, rationale: '"Only to be dismissed" is grammatical but changes the meaning slightly; the focus requires the active perfect infinitive.' },
        { text: 'only to dismiss — active infinitive of purpose',     isCorrect: false, rationale: '"Only to dismiss" would mean she intended to dismiss her own results.' },
        { text: 'only for — followed by gerund',                      isCorrect: false, rationale: '"Only for dismissing" is not a standard structure in this context.' },
      ],
    },
  },

  // ── INFINITIVES — STRUCTURES + TO-INFINITIVE ─────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['infinitives', 'structures-with-to'],
    content: {
      prompt: '"He is ____ to present the keynote speech." Which structure signals obligation or arrangement?',
      options: [
        { text: 'to',      isCorrect: true,  rationale: '"Be + to-infinitive" expresses scheduled/arranged future actions or authoritative obligations.' },
        { text: 'going',   isCorrect: false, rationale: '"Going to" expresses intention/prediction; here "is to" signals formal arrangement.' },
        { text: 'about',   isCorrect: false, rationale: '"About to" signals imminent action, not a formal arrangement.' },
        { text: 'due',     isCorrect: false, rationale: '"Due to" signals expected scheduling; "is to" is the formal arrangement form here.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['infinitives', 'structures-with-to', 'too-enough'],
    content: {
      prompt: '"The suitcase is ____ heavy ____ carry on the flight." Complete with the correct structure.',
      options: [
        { text: 'too / to',      isCorrect: true,  rationale: '"Too + adj + to-infinitive" = the degree prevents the action.' },
        { text: 'so / that',     isCorrect: false, rationale: '"So heavy that" requires a full clause: "so heavy that you can\'t carry it".' },
        { text: 'enough / to',   isCorrect: false, rationale: '"Enough to" follows after the adjective for sufficiency: "light enough to carry".' },
        { text: 'very / to',     isCorrect: false, rationale: '"Very" is an intensifier, not a degree word that triggers to-infinitive result.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['infinitives', 'structures-with-to', 'for-NP'],
    content: {
      prompt: '"It is essential ____ all applicants to provide proof of identity." What structure introduces the logical subject of a to-infinitive?',
      options: [
        { text: 'for',   isCorrect: true,  rationale: '"For + NP + to-infinitive" introduces the logical subject of the infinitive phrase.' },
        { text: 'that',  isCorrect: false, rationale: '"It is essential that all applicants provide…" uses a that-clause with subjunctive, not a for-to structure.' },
        { text: 'of',    isCorrect: false, rationale: '"For + NP" is the correct preposition before the infinitive subject in this construction.' },
        { text: 'by',    isCorrect: false, rationale: '"By + V-ing" expresses means/method, not the subject of an infinitive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['infinitives', 'time-reference', 'perfect-infinitive'],
    content: {
      prompt: '"She seems ____ the meeting." (The meeting already occurred.) Which perfect infinitive form is correct?',
      options: [
        { text: 'to have forgotten',   isCorrect: true,  rationale: 'Perfect infinitive with "seem" = the forgotten action occurred before "seems" (present).' },
        { text: 'to forget',           isCorrect: false, rationale: 'Simple infinitive implies simultaneous or future forgetting, not a past event.' },
        { text: 'having forgotten',    isCorrect: false, rationale: 'Perfect gerund, not infinitive — "seem" takes a to-infinitive.' },
        { text: 'forgotten',           isCorrect: false, rationale: 'Bare past participle cannot follow "seems" directly.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['infinitives', 'time-reference', 'passive-infinitive'],
    content: {
      prompt: '"The suspects are believed ____ the country before the arrest warrant was issued." Choose the passive perfect infinitive.',
      options: [
        { text: 'to have left',        isCorrect: true,  rationale: 'Active perfect infinitive is used because "the suspects" are the agents of leaving.' },
        { text: 'to have been left',   isCorrect: false, rationale: 'Passive perfect infinitive would mean someone left the suspects, not that they left.' },
        { text: 'to be leaving',       isCorrect: false, rationale: 'Progressive infinitive implies current departure, not past departure.' },
        { text: 'to leave',            isCorrect: false, rationale: 'Simple infinitive does not convey that the leaving preceded the warrant.' },
      ],
    },
  },

  // ── INFINITIVES — VERBS TAKING INFINITIVE / SPECIAL ATTENTION ────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ['infinitives', 'verbs-taking-infinitive'],
    content: {
      prompt: '"He agreed ____ the proposal by Monday." Correct form?',
      options: [
        { text: 'to submit',   isCorrect: true,  rationale: '"Agree" takes only a to-infinitive complement.' },
        { text: 'submitting',  isCorrect: false, rationale: '"Agree" is not followed by a gerund (*"agreed submitting" is ungrammatical).' },
        { text: 'submit',      isCorrect: false, rationale: 'Base form without "to" is not standard after "agree".' },
        { text: 'submission',  isCorrect: false, rationale: 'A noun complement does not capture the same meaning.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['infinitives', 'verbs-special-attention', 'mean'],
    content: {
      prompt: '"Mean + infinitive" vs "mean + gerund": choose the sentence where "mean" = "entail/involve".',
      options: [
        { text: '"Accepting the offer means relocating to Berlin."',            isCorrect: true,  rationale: '"Mean + gerund" = entail/involve. "Accepting the offer entails relocating."' },
        { text: '"She means to apologise for her comments."',                   isCorrect: false, rationale: '"Mean + to-infinitive" = intend. She intends to apologise.' },
        { text: '"He did not mean to upset anyone."',                           isCorrect: false, rationale: '"Mean + to-infinitive" = intend (negative).' },
        { text: '"I mean to finish this chapter today."',                       isCorrect: false, rationale: '"Mean + to-infinitive" = intend.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['infinitives', 'verbs-special-attention', 'forget'],
    content: {
      prompt: 'Which sentence uses "forget" with the TO-INFINITIVE correctly?',
      options: [
        { text: '"Don\'t forget to lock the door when you leave."',           isCorrect: true,  rationale: '"Forget + to-infinitive" = forget to do something in the future (or at the relevant time).' },
        { text: '"I\'ll never forget meeting her for the first time."',       isCorrect: false, rationale: '"Forget + gerund" = forget a past memory/experience.' },
        { text: '"I forgot writing the email — I found it in my drafts."',    isCorrect: false, rationale: '"Forgot + gerund" = cannot remember that one wrote it (past memory).' },
        { text: '"She forgot having sent the attachment."',                   isCorrect: false, rationale: '"Forgot + perfect gerund" = past remembered event — not the to-infinitive use.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['infinitives', 'be-to-infinitive'],
    content: {
      prompt: '"If the summit ____ succeed, all parties must compromise." Which "be + to-infinitive" conditional is correct?',
      options: [
        { text: 'is to',    isCorrect: true,  rationale: '"If + is to + infinitive" expresses a condition for a future outcome — formal conditional register.' },
        { text: 'will be',  isCorrect: false, rationale: '"Will" is not used in the if-clause of standard conditionals.' },
        { text: 'is going', isCorrect: false, rationale: '"Is going to" in an if-clause is unusual and less formal.' },
        { text: 'was to',   isCorrect: false, rationale: '"Was to" in an if-clause refers to a hypothetical past arrangement, not a general condition.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['infinitives', 'be-to-infinitive', 'reported-speech'],
    content: {
      prompt: '"She was to have delivered the report by noon." This structure indicates:',
      options: [
        { text: 'An arrangement in the past that was not fulfilled.',  isCorrect: true,  rationale: '"Was to have + V3" = past arrangement or expectation that was not carried out.' },
        { text: 'A current obligation to deliver the report.',         isCorrect: false, rationale: '"Is to deliver" would express a current obligation.' },
        { text: 'A past habitual action of delivering reports.',       isCorrect: false, rationale: '"Used to deliver" expresses past habits.' },
        { text: 'A future plan as seen from the present.',             isCorrect: false, rationale: '"Is to + infinitive" (without "have") expresses future arrangements.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Phase 4 grammar items (${items.length} total)…`);
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
  console.log(`✓ Phase 4 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
