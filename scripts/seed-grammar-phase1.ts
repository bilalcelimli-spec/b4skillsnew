/**
 * PHASE 1 — Chapters 1 & 2
 * Topics: Basic Sentence Structure (Subject/Verb/Object/Complement, Verb Patterns)
 *         Determiners · Nouns · Pronouns · Articles · Agreement
 * 5 questions per sub-topic = ~50 items
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const items = [
  // ── CHAPTER 1 · SECTION I-A  THE SUBJECT ────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['sentence-structure', 'subject'],
    content: {
      prompt: 'Identify the subject in the following sentence: "The old professor with grey hair teaches linguistics."',
      options: [
        { text: 'The old professor with grey hair', isCorrect: true,  rationale: 'The entire noun phrase functions as the simple subject head plus its modifiers.' },
        { text: 'teaches linguistics',              isCorrect: false, rationale: 'This is the predicate (verb + object).' },
        { text: 'grey hair',                        isCorrect: false, rationale: 'This is part of a prepositional phrase modifying "professor".' },
        { text: 'linguistics',                      isCorrect: false, rationale: 'This is the direct object.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['sentence-structure', 'subject'],
    content: {
      prompt: 'Which sentence contains a CLAUSAL subject?',
      options: [
        { text: 'That she resigned surprised everyone.',         isCorrect: true,  rationale: '"That she resigned" is a nominal clause acting as subject.' },
        { text: 'The news surprised everyone.',                  isCorrect: false, rationale: 'Simple noun phrase subject.' },
        { text: 'Her resignation surprised everyone.',           isCorrect: false, rationale: 'Noun phrase with gerund-derived noun.' },
        { text: 'Everyone was surprised by the resignation.',    isCorrect: false, rationale: 'Passive construction; "everyone" is a pronoun subject.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['sentence-structure', 'subject', 'extraposition'],
    content: {
      prompt: 'In the sentence "It is essential that students attend every lecture," what is the grammatical subject?',
      options: [
        { text: 'It',                                     isCorrect: true,  rationale: '"It" is the dummy/extraposed subject; the real subject is the that-clause.' },
        { text: 'students',                               isCorrect: false, rationale: '"Students" is the subject of the embedded clause, not of the main verb.' },
        { text: 'that students attend every lecture',     isCorrect: false, rationale: 'This is the logical subject but has been extraposed; the formal subject is "it".' },
        { text: 'essential',                              isCorrect: false, rationale: 'This is the predicate adjective.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.6, discrimination: 1.0, guessing: 0.25,
    tags: ['sentence-structure', 'subject'],
    content: {
      prompt: 'Which of the following acts as an INFINITIVE PHRASE subject?',
      options: [
        { text: 'To master a second language requires dedication.',  isCorrect: true,  rationale: '"To master a second language" is an infinitive phrase in subject position.' },
        { text: 'She wants to master a second language.',            isCorrect: false, rationale: 'The infinitive here is the object of "wants".' },
        { text: 'Mastering a language is rewarding.',                isCorrect: false, rationale: '"Mastering" is a gerund phrase subject, not an infinitive.' },
        { text: 'The language is difficult to master.',              isCorrect: false, rationale: 'The infinitive modifies the adjective "difficult".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.4, guessing: 0.25,
    tags: ['sentence-structure', 'subject', 'there-construction'],
    content: {
      prompt: 'In "There are three candidates shortlisted for the position," the NOTIONAL subject is:',
      options: [
        { text: 'three candidates',        isCorrect: true,  rationale: '"Three candidates" is the notional/logical subject; "there" is the existential placeholder.' },
        { text: 'there',                   isCorrect: false, rationale: '"There" is the dummy subject, not the notional one.' },
        { text: 'the position',            isCorrect: false, rationale: 'This is part of a prepositional phrase modifying "candidates".' },
        { text: 'shortlisted',             isCorrect: false, rationale: 'This is a past participial modifier.' },
      ],
    },
  },

  // ── CHAPTER 1 · SECTION I-B  THE VERB ────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['sentence-structure', 'verb'],
    content: {
      prompt: 'Which sentence contains a TRANSITIVE verb used intransitively?',
      options: [
        { text: 'The chef has been cooking all morning.',            isCorrect: true,  rationale: '"Cook" is normally transitive but used here without an object — intransitive use.' },
        { text: 'She cooked a magnificent three-course meal.',       isCorrect: false, rationale: '"Cook" takes the object "a meal" — transitive use.' },
        { text: 'The pot is boiling.',                               isCorrect: false, rationale: '"Boil" here is intransitive by typical usage.' },
        { text: 'He ate the entire pizza.',                          isCorrect: false, rationale: '"Ate" takes the direct object "the entire pizza".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['sentence-structure', 'verb', 'linking'],
    content: {
      prompt: 'In "The milk turned sour overnight," the verb "turned" functions as a:',
      options: [
        { text: 'Linking verb connecting subject to a subject complement', isCorrect: true,  rationale: '"Turned" = "became"; "sour" is the adjective subject complement.' },
        { text: 'Transitive verb with a direct object',                    isCorrect: false, rationale: '"Sour" is an adjective, not a noun object.' },
        { text: 'Phrasal verb indicating direction',                       isCorrect: false, rationale: 'Directional "turn" requires an adverb particle.' },
        { text: 'Auxiliary verb in a passive construction',                isCorrect: false, rationale: 'There is no past participle following it to form a passive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['sentence-structure', 'verb', 'complex-transitive'],
    content: {
      prompt: 'Identify the verb pattern in: "The board elected her chairperson."',
      options: [
        { text: 'S + V + O + OC  (Subject + Verb + Object + Object Complement)', isCorrect: true,  rationale: '"Her" = direct object; "chairperson" = object complement (equated with the object).' },
        { text: 'S + V + IO + DO  (Subject + Verb + Indirect Object + Direct Object)', isCorrect: false, rationale: 'An IO + DO pattern requires two distinct NPs where IO is a recipient.' },
        { text: 'S + V + C  (Subject + Verb + Subject Complement)',                   isCorrect: false, rationale: 'No object is present in this pattern.' },
        { text: 'S + V + O  (Subject + Verb + Direct Object)',                         isCorrect: false, rationale: '"Chairperson" cannot be omitted without changing meaning — it is a complement, not merely optional.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.0, guessing: 0.25,
    tags: ['sentence-structure', 'verb'],
    content: {
      prompt: 'Which verb is DITRANSITIVE (takes both an indirect and a direct object)?',
      options: [
        { text: 'She handed the inspector a dossier.',         isCorrect: true,  rationale: '"Handed" takes "the inspector" (IO) and "a dossier" (DO).' },
        { text: 'She placed the dossier on the desk.',         isCorrect: false, rationale: '"Placed" takes a DO and a prepositional phrase, not an IO.' },
        { text: 'She read the dossier carefully.',             isCorrect: false, rationale: '"Read" here takes only a DO.' },
        { text: 'She seemed surprised by the dossier.',        isCorrect: false, rationale: '"Seemed" is a linking verb.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['sentence-structure', 'verb', 'copular'],
    content: {
      prompt: 'Which of the following verbs CANNOT function as a copular (linking) verb?',
      options: [
        { text: 'demolish',  isCorrect: true,  rationale: '"Demolish" is an action transitive verb and cannot link subject to complement.' },
        { text: 'remain',    isCorrect: false, rationale: '"Remain" can be copular, e.g., "She remained calm."' },
        { text: 'appear',    isCorrect: false, rationale: '"Appear" can be copular, e.g., "He appears tired."' },
        { text: 'grow',      isCorrect: false, rationale: '"Grow" can be copular, e.g., "It grew dark."' },
      ],
    },
  },

  // ── CHAPTER 1 · SECTION I-C  THE OBJECT ──────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['sentence-structure', 'object', 'direct-object'],
    content: {
      prompt: 'Which sentence contains a CLAUSAL direct object?',
      options: [
        { text: 'She admitted that she had made an error.',   isCorrect: true,  rationale: '"that she had made an error" is a noun clause functioning as DO.' },
        { text: 'She admitted her error reluctantly.',        isCorrect: false, rationale: '"her error" is a noun phrase DO.' },
        { text: 'She was admitted to the programme.',         isCorrect: false, rationale: 'Passive — "she" is the subject.' },
        { text: 'Admitting errors is difficult.',             isCorrect: false, rationale: '"Admitting errors" is the subject.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['sentence-structure', 'object', 'retained-object'],
    content: {
      prompt: 'In the passive sentence "He was given a second chance," "a second chance" is called a:',
      options: [
        { text: 'Retained object',     isCorrect: true,  rationale: 'When a ditransitive verb is passivised with the IO as subject, the remaining DO is the "retained object".' },
        { text: 'Subject complement',  isCorrect: false, rationale: 'A subject complement follows a linking verb and describes the subject.' },
        { text: 'Indirect object',     isCorrect: false, rationale: '"He" is the indirect object promoted to subject; "a second chance" remains.' },
        { text: 'Object complement',   isCorrect: false, rationale: 'Object complement equates with or modifies the DO; it is not a separate object.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.0, guessing: 0.25,
    tags: ['sentence-structure', 'object'],
    content: {
      prompt: 'Choose the sentence in which the underlined element is an INDIRECT OBJECT.',
      options: [
        { text: 'She read [her daughter] a bedtime story.',    isCorrect: true,  rationale: '"Her daughter" is the recipient (IO); "a bedtime story" is the DO.' },
        { text: 'She read [the story] to her daughter.',       isCorrect: false, rationale: '"The story" is the DO; "her daughter" is in a prepositional phrase.' },
        { text: 'She read [slowly] to the class.',             isCorrect: false, rationale: '"Slowly" is an adverb.' },
        { text: '[She] read a bedtime story.',                 isCorrect: false, rationale: '"She" is the subject.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['sentence-structure', 'object'],
    content: {
      prompt: 'Which sentence correctly identifies the direct object as a GERUND PHRASE?',
      options: [
        { text: 'He regrets having missed the deadline.',           isCorrect: true,  rationale: '"Having missed the deadline" is a gerund phrase serving as DO of "regrets".' },
        { text: 'He regrets the missed deadline.',                  isCorrect: false, rationale: '"The missed deadline" is a noun phrase DO.' },
        { text: 'He regrets that he missed the deadline.',          isCorrect: false, rationale: 'The DO here is a that-clause.' },
        { text: 'He deeply regrets his behaviour.',                 isCorrect: false, rationale: '"His behaviour" is a noun phrase DO.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['sentence-structure', 'object', 'cognate-object'],
    content: {
      prompt: 'In "She dreamed a strange dream," the noun "dream" is an example of a:',
      options: [
        { text: 'Cognate object',      isCorrect: true,  rationale: 'A cognate object is etymologically related to the verb and adds semantic weight.' },
        { text: 'Retained object',     isCorrect: false, rationale: 'Retained objects appear in passive constructions.' },
        { text: 'Fake/dummy object',   isCorrect: false, rationale: 'Dummy objects are semantically empty placeholders like "it".' },
        { text: 'Object complement',   isCorrect: false, rationale: 'An OC equates with or modifies the direct object.' },
      ],
    },
  },

  // ── CHAPTER 1 · SECTION I-D  THE COMPLEMENT ─────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['sentence-structure', 'complement', 'subject-complement'],
    content: {
      prompt: 'Which sentence contains a NOUN PHRASE as subject complement?',
      options: [
        { text: 'He became the youngest director in the company\'s history.', isCorrect: true,  rationale: '"The youngest director in the company\'s history" is a NP subject complement after "became".' },
        { text: 'He seemed extremely confident.',                              isCorrect: false, rationale: '"Extremely confident" is an adjective phrase complement.' },
        { text: 'He felt that he deserved the role.',                          isCorrect: false, rationale: '"That he deserved the role" is a clausal complement.' },
        { text: 'He was appointed to the board.',                              isCorrect: false, rationale: 'Passive construction; "to the board" is a prepositional phrase.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['sentence-structure', 'complement', 'object-complement'],
    content: {
      prompt: 'Identify the OBJECT COMPLEMENT in: "The committee found the proposal unacceptable."',
      options: [
        { text: 'unacceptable',       isCorrect: true,  rationale: '"Unacceptable" is an adjective equating with and modifying the DO "the proposal".' },
        { text: 'the proposal',       isCorrect: false, rationale: '"The proposal" is the direct object.' },
        { text: 'the committee',      isCorrect: false, rationale: '"The committee" is the subject.' },
        { text: 'found',              isCorrect: false, rationale: '"Found" is a complex-transitive verb.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['sentence-structure', 'complement'],
    content: {
      prompt: 'In "They painted the walls blue," what grammatical role does "blue" play?',
      options: [
        { text: 'Object complement describing the result state of the object', isCorrect: true,  rationale: '"Blue" is a resultative adjective functioning as an object complement.' },
        { text: 'Adverb modifying "painted"',                                  isCorrect: false, rationale: 'Adjectives, not adverbs, serve as object complements.' },
        { text: 'Direct object',                                                isCorrect: false, rationale: '"The walls" is the direct object.' },
        { text: 'Subject complement',                                           isCorrect: false, rationale: 'Subject complements follow linking verbs and describe the subject.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['sentence-structure', 'complement', 'bare-infinitive'],
    content: {
      prompt: 'Which sentence contains an OBJECT COMPLEMENT in the form of a bare infinitive?',
      options: [
        { text: 'We watched the astronaut float weightlessly.',       isCorrect: true,  rationale: '"Float weightlessly" is a bare infinitive phrase serving as OC after a perception verb.' },
        { text: 'We encouraged the astronaut to float.',              isCorrect: false, rationale: '"To float" is a to-infinitive object complement.' },
        { text: 'The astronaut appeared to float.',                   isCorrect: false, rationale: '"To float" is an infinitive after a linking verb.' },
        { text: 'The astronaut enjoyed floating.',                    isCorrect: false, rationale: '"Floating" is a gerund DO.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['sentence-structure', 'complement'],
    content: {
      prompt: 'Which of the following is NOT a valid subject complement structure?',
      options: [
        { text: 'S + linking verb + adverb of manner (e.g., "She seems quickly.")', isCorrect: true,  rationale: 'Adverbs of manner cannot function as subject complements; adjectives or NPs can.' },
        { text: 'S + linking verb + adjective phrase',                               isCorrect: false, rationale: 'Standard and grammatical subject complement structure.' },
        { text: 'S + linking verb + noun phrase',                                    isCorrect: false, rationale: 'Standard subject complement structure.' },
        { text: 'S + linking verb + prepositional phrase',                           isCorrect: false, rationale: '"She is in a hurry" — PP subject complements are grammatical.' },
      ],
    },
  },

  // ── CHAPTER 1 · SECTION II  VERB PATTERNS ───────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['verb-patterns'],
    content: {
      prompt: 'Which verb ALWAYS requires a to-infinitive complement (never a gerund)?',
      options: [
        { text: 'refuse',  isCorrect: true,  rationale: '"Refuse" only takes a to-infinitive: "She refused to sign." *"She refused signing" is ungrammatical.' },
        { text: 'enjoy',   isCorrect: false, rationale: '"Enjoy" only takes a gerund: "She enjoyed signing." Never a to-infinitive.' },
        { text: 'love',    isCorrect: false, rationale: '"Love" accepts both in many varieties.' },
        { text: 'suggest', isCorrect: false, rationale: '"Suggest" takes a gerund or that-clause, not a to-infinitive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['verb-patterns'],
    content: {
      prompt: 'Choose the grammatically CORRECT sentence with respect to verb pattern:',
      options: [
        { text: 'He advised her to take a gap year.',                    isCorrect: true,  rationale: '"Advise" follows the S+V+O+to-infinitive pattern.' },
        { text: 'He advised her taking a gap year.',                     isCorrect: false, rationale: '"Advise" does not take a gerund after an object.' },
        { text: 'He advised that she takes a gap year.',                 isCorrect: false, rationale: '"Advise" in a that-clause requires the subjunctive: "…she take."' },
        { text: 'He advised to take a gap year.',                        isCorrect: false, rationale: '"Advise" must have an object before the infinitive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ['verb-patterns'],
    content: {
      prompt: '"I heard the fire alarm ____." Which form correctly completes this perception-verb pattern?',
      options: [
        { text: 'go off',        isCorrect: true,  rationale: 'Perception verbs take bare infinitive or -ing. "Go off" (bare infinitive) describes the complete event.' },
        { text: 'to go off',     isCorrect: false, rationale: 'To-infinitives are not used after perception verbs in this pattern.' },
        { text: 'gone off',      isCorrect: false, rationale: 'Past participle is used in passive perception constructions, not with the bare-infinitive pattern.' },
        { text: 'that it go off',isCorrect: false, rationale: 'That-clauses do not follow perception verbs with this meaning.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['verb-patterns', 'complex-object'],
    content: {
      prompt: 'Which verb pattern is illustrated in: "She had her assistant reschedule all meetings"?',
      options: [
        { text: 'Causative: have + object + bare infinitive',              isCorrect: true,  rationale: '"Have" as a causative takes an object followed by a bare infinitive.' },
        { text: 'Causative: have + object + past participle',              isCorrect: false, rationale: '"Have + object + past participle" indicates something done to the object (e.g., "have it rescheduled").' },
        { text: 'Perception verb: object + bare infinitive',               isCorrect: false, rationale: '"Have" in this usage is causative, not a perception verb.' },
        { text: 'Factitive: make + object + base form',                    isCorrect: false, rationale: '"Make" is the factitive causative; this sentence uses "have".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['verb-patterns', 'catenative'],
    content: {
      prompt: 'In "He seemed to have forgotten his password," the verb "seemed" is best described as:',
      options: [
        { text: 'A catenative (semi-auxiliary) taking a to-infinitive complement',  isCorrect: true,  rationale: '"Seem" is a raising/catenative verb that takes a to-infinitive, here in perfect form.' },
        { text: 'A modal auxiliary requiring a bare infinitive',                     isCorrect: false, rationale: 'Modals take bare infinitives; "seemed" takes a to-infinitive.' },
        { text: 'A complex-transitive verb with OC',                                isCorrect: false, rationale: 'Complex-transitive verbs require an internal object.' },
        { text: 'A linking verb taking a past-participial complement',              isCorrect: false, rationale: '"To have forgotten" is a perfect infinitive, not a past participle complement.' },
      ],
    },
  },

  // ── CHAPTER 2 · SECTION I-A  GENERAL DETERMINERS ─────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['determiners', 'general'],
    content: {
      prompt: 'Choose the correct determiner: "She earns ____ money than her colleague."',
      options: [
        { text: 'less',   isCorrect: true,  rationale: '"Money" is an uncountable noun; "less" is the comparative determiner for uncountables.' },
        { text: 'fewer',  isCorrect: false, rationale: '"Fewer" is used with count nouns.' },
        { text: 'little', isCorrect: false, rationale: '"Little" is a non-comparative determiner meaning "not much".' },
        { text: 'small',  isCorrect: false, rationale: '"Small" is an adjective, not a determiner in this context.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.0, guessing: 0.25,
    tags: ['determiners', 'general'],
    content: {
      prompt: '"____ students passed the exam — only three out of thirty." Which determiner fits best?',
      options: [
        { text: 'Few',    isCorrect: true,  rationale: '"Few" (without "a") implies a small, insufficient number with a negative connotation.' },
        { text: 'A few',  isCorrect: false, rationale: '"A few" has a positive connotation — "some, at least".' },
        { text: 'Little', isCorrect: false, rationale: '"Little" is used with uncountable nouns.' },
        { text: 'Some',   isCorrect: false, rationale: '"Some" is neutral and does not convey a sense of insufficiency.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['determiners', 'each-every'],
    content: {
      prompt: 'Which sentence uses EACH correctly (not EVERY)?',
      options: [
        { text: 'Each of the five contestants was given a unique challenge.',   isCorrect: true,  rationale: '"Each of + plural NP" is a standard pattern; "every of" is ungrammatical.' },
        { text: 'Each student in the school must wear a uniform.',              isCorrect: false, rationale: 'Both "each" and "every" work here; this does not demonstrate a uniquely "each" pattern.' },
        { text: 'Every one of the reports needs revision.',                     isCorrect: false, rationale: 'This uses "every one", not "each of".' },
        { text: 'Every single item was checked twice.',                         isCorrect: false, rationale: '"Every single" is an emphatic pattern, not uniquely requiring "each".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['determiners', 'pre-determiners'],
    content: {
      prompt: 'Which phrase illustrates a PRE-DETERMINER correctly?',
      options: [
        { text: 'twice the amount',    isCorrect: true,  rationale: '"Twice" is a multiplier pre-determiner preceding the determiner "the".' },
        { text: 'the twice amount',    isCorrect: false, rationale: 'Pre-determiners precede, not follow, the central determiner.' },
        { text: 'half an amount',      isCorrect: false, rationale: 'Though "half" can be a pre-determiner, "half an amount" is not standard; "half the amount" is.' },
        { text: 'all of some answers', isCorrect: false, rationale: '"Some" as the central determiner cannot follow the pre-determiner "all of" in standard grammar.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['determiners', 'post-determiners', 'ordinals'],
    content: {
      prompt: 'In "The first three chapters present the theoretical framework," ordinal "first" functions as a:',
      options: [
        { text: 'Post-determiner ordering the noun after the central determiner "the"',   isCorrect: true,  rationale: 'Ordinals like "first", "second" act as post-determiners, following central determiners.' },
        { text: 'Pre-determiner preceding both "the" and "three"',                        isCorrect: false, rationale: '"First" follows "the", so it cannot be a pre-determiner.' },
        { text: 'Adjective modifying "chapters"',                                         isCorrect: false, rationale: 'Ordinals hold determiner function in this position, not purely adjectival.' },
        { text: 'Central determiner replacing the article "the"',                         isCorrect: false, rationale: '"The" is still present; "first" comes after it as a post-determiner.' },
      ],
    },
  },

  // ── CHAPTER 2 · SECTION I-E  ARTICLES ───────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['articles', 'determiners'],
    content: {
      prompt: 'Choose the correct article usage: "She is ____ honest person with ____ integrity."',
      options: [
        { text: 'an / — (no article)',   isCorrect: true,  rationale: '"An" before vowel sound "honest"; "integrity" is abstract uncountable — no article needed.' },
        { text: 'a / an',                isCorrect: false, rationale: '"Honest" starts with a vowel sound, so "a" is incorrect; "an integrity" is unnatural.' },
        { text: 'a / the',               isCorrect: false, rationale: '"A honest" is incorrect; "the integrity" implies specific integrity.' },
        { text: 'an / the',              isCorrect: false, rationale: '"The integrity" implies specific previously mentioned integrity, which is not the case here.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['articles', 'generic-reference'],
    content: {
      prompt: 'Which sentence uses the article for GENERIC REFERENCE correctly?',
      options: [
        { text: 'The dolphin is widely regarded as one of the most intelligent animals.',  isCorrect: true,  rationale: '"The dolphin" here refers generically to the species.' },
        { text: 'A dolphin is in the bay.',                                                isCorrect: false, rationale: '"A dolphin" here refers to a specific individual, not generic.' },
        { text: 'Dolphin can communicate via sonar.',                                      isCorrect: false, rationale: 'Zero article with count singular nouns is not standard for generic reference (unlike uncountable nouns).' },
        { text: 'The dolphins are intelligent.',                                           isCorrect: false, rationale: '"The dolphins" might be interpreted as specific dolphins already mentioned.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['articles', 'zero-article'],
    content: {
      prompt: 'Which phrase requires ZERO article?',
      options: [
        { text: 'go to bed (to sleep)',              isCorrect: true,  rationale: 'Idiomatic zero-article: "go to bed" means to sleep, not to a specific bed.' },
        { text: 'go to the bed (to pick up a book)', isCorrect: false, rationale: '"The bed" with a specific referent requires the definite article.' },
        { text: 'go to a bed (in the showroom)',     isCorrect: false, rationale: '"A bed" introduces a new countable referent.' },
        { text: 'go to the hospital ward',           isCorrect: false, rationale: 'Specific institution reference requires an article.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['articles', 'unique-reference'],
    content: {
      prompt: 'Why is the definite article used in "The moon orbits the Earth"?',
      options: [
        { text: 'The nouns refer to unique entities — there is only one moon and one Earth.',  isCorrect: true,  rationale: 'Unique referents take "the" regardless of prior mention.' },
        { text: 'The nouns were previously mentioned in the text.',                            isCorrect: false, rationale: 'Uniqueness, not prior mention, drives the article choice here.' },
        { text: 'The nouns are abstract concepts requiring a definite marker.',                isCorrect: false, rationale: '"Moon" and "Earth" are concrete, not abstract.' },
        { text: 'Scientific nouns always require "the".',                                      isCorrect: false, rationale: 'Not all scientific nouns take "the" (e.g., "oxygen", "gravity").' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['articles', 'institutional'],
    content: {
      prompt: 'In which pair is the article usage BOTH correct?',
      options: [
        { text: 'She is in hospital (UK) / She is in the hospital (US)',          isCorrect: true,  rationale: 'UK variety uses zero article for the institution; US variety uses "the".' },
        { text: 'She went to the prison to visit / She is in prison (as inmate)', isCorrect: false, rationale: 'Only the second is fully correct per standard grammar; the first needs checking.' },
        { text: 'He is at school / He is at the school (both meaning studying)',  isCorrect: false, rationale: '"At the school" refers to a location, not institutional purpose.' },
        { text: 'They are at sea / They are at the sea (both = on the ocean)',    isCorrect: false, rationale: '"At the sea" typically means at the seaside, not on the ocean.' },
      ],
    },
  },

  // ── CHAPTER 2 · SECTION II  NOUNS ───────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['nouns', 'count-noncount'],
    content: {
      prompt: '"____ news is good news." Which form is correct?',
      options: [
        { text: 'No',    isCorrect: true,  rationale: '"News" is an uncountable noun; "no" is the correct determiner with a singular uncountable.' },
        { text: 'Any',   isCorrect: false, rationale: '"Any news is good news" changes the meaning to a conditional/universal generalisation.' },
        { text: 'Some',  isCorrect: false, rationale: '"Some news is good news" is not the idiomatic proverb.' },
        { text: 'A',     isCorrect: false, rationale: '"News" is uncountable; indefinite article "a" cannot precede it.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['nouns', 'collective'],
    content: {
      prompt: 'Which sentence treats a collective noun with PLURAL verb agreement (British convention)?',
      options: [
        { text: 'The committee have voted to postpone the decision.',  isCorrect: true,  rationale: 'In British English, collective nouns like "committee" can take plural verbs.' },
        { text: 'The committee has voted to postpone the decision.',   isCorrect: false, rationale: 'Singular agreement is standard in American English.' },
        { text: 'The committees has voted unanimously.',               isCorrect: false, rationale: '"Committees" is plural — "has" is incorrect.' },
        { text: 'The staff is distributed across ten offices.',        isCorrect: false, rationale: 'This is singular agreement with a collective.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['nouns', 'irregular-plural'],
    content: {
      prompt: 'Which noun forms its plural IRREGULARLY?',
      options: [
        { text: 'criterion → criteria',    isCorrect: true,  rationale: 'Latin-origin noun with irregular plural (second-declension neuter).' },
        { text: 'café → cafés',            isCorrect: false, rationale: 'Regular plural (adds -s).' },
        { text: 'echo → echoes',           isCorrect: false, rationale: 'Regular plural for nouns ending in -o (adds -es).' },
        { text: 'belief → beliefs',        isCorrect: false, rationale: 'Regular plural for nouns ending in -f (adds -s, not -ves).' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['nouns', 'nominalization'],
    content: {
      prompt: 'Which nominalization correctly derives a noun from the verb "investigate"?',
      options: [
        { text: 'investigation',  isCorrect: true,  rationale: 'Standard -tion nominalization of "investigate".' },
        { text: 'investigatement',isCorrect: false, rationale: 'Not a standard English formation.' },
        { text: 'investigacy',    isCorrect: false, rationale: 'Not a standard English formation.' },
        { text: 'investigature',  isCorrect: false, rationale: 'Not a standard English formation.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.3, guessing: 0.25,
    tags: ['nouns', 'genitive'],
    content: {
      prompt: 'Which genitive phrase is grammatically preferred for INANIMATE nouns?',
      options: [
        { text: 'the roof of the building',    isCorrect: true,  rationale: 'Of-genitive is standard for inanimate nouns.' },
        { text: 'the building\'s roof',        isCorrect: false, rationale: 'Possessive -s is possible but less conventional with inanimate nouns in formal writing.' },
        { text: 'the roof\'s of the building', isCorrect: false, rationale: 'Ungrammatical double genitive.' },
        { text: 'the buildings roof',          isCorrect: false, rationale: 'Missing apostrophe — not standard.' },
      ],
    },
  },

  // ── CHAPTER 2 · SECTION III  AGREEMENT ──────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['agreement', 'subject-verb'],
    content: {
      prompt: '"Neither the manager nor the employees ____ informed about the merger." Choose the correct verb.',
      options: [
        { text: 'were',  isCorrect: true,  rationale: 'With "neither…nor", the verb agrees with the closer subject "employees" (plural).' },
        { text: 'was',   isCorrect: false, rationale: '"Was" would agree with the singular "manager", but the closer NP is "employees".' },
        { text: 'are',   isCorrect: false, rationale: 'Present tense is inconsistent with the narrative past context implied.' },
        { text: 'have',  isCorrect: false, rationale: '"Have informed" would require "been" to be past passive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['agreement', 'subject-verb', 'inverted'],
    content: {
      prompt: '"There ____ a number of issues that need addressing." Select the correct form.',
      options: [
        { text: 'are',  isCorrect: true,  rationale: '"A number of" acts as a quantifier over a plural noun "issues" — plural verb.' },
        { text: 'is',   isCorrect: false, rationale: '"The number of issues is…" takes singular, but "a number of issues are…" is standard.' },
        { text: 'was',  isCorrect: false, rationale: 'Past tense shifts meaning; present is appropriate here.' },
        { text: 'were', isCorrect: false, rationale: 'Past plural changes tense without reason.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['agreement', 'pronoun-antecedent'],
    content: {
      prompt: '"Every delegate must submit ____ proposal by Friday." Which pronoun is preferred in formal, gender-neutral writing?',
      options: [
        { text: 'their',   isCorrect: true,  rationale: 'Singular "their" is widely accepted as a gender-neutral third-person singular pronoun.' },
        { text: 'his',     isCorrect: false, rationale: 'Gender-specific and non-inclusive in modern formal usage.' },
        { text: 'his/her', isCorrect: false, rationale: 'Technically correct but stylistically awkward; "their" is now preferred.' },
        { text: 'its',     isCorrect: false, rationale: '"Its" refers to non-human entities; using it for people is inappropriate.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['agreement', 'notional-agreement'],
    content: {
      prompt: '"Two weeks is a long time to wait." Why does the verb take singular agreement?',
      options: [
        { text: 'The subject is a single unit of time, not a count of individual weeks.',  isCorrect: true,  rationale: 'Notional agreement: "two weeks" is perceived as a single unit.' },
        { text: '"Weeks" is always singular.',                                             isCorrect: false, rationale: '"Weeks" is morphologically plural.' },
        { text: 'The verb must agree with the complement "a long time".',                 isCorrect: false, rationale: 'Verbs agree with subjects, not complements.' },
        { text: 'Time expressions are invariably uncountable.',                           isCorrect: false, rationale: 'Many time expressions are countable.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['agreement', 'relative-clause'],
    content: {
      prompt: '"She is one of those teachers who ____ genuinely inspire students." Which verb is correct?',
      options: [
        { text: 'genuinely inspire  (plural)',   isCorrect: true,  rationale: 'The relative clause modifies "teachers" (plural antecedent), not "one".' },
        { text: 'genuinely inspires (singular)', isCorrect: false, rationale: '"Inspires" would agree with "one", but the relative pronoun refers to "teachers".' },
        { text: 'genuinely inspired (past)',     isCorrect: false, rationale: 'Past tense is not justified here.' },
        { text: 'genuinely inspiring',           isCorrect: false, rationale: '"Inspiring" is a participial form, not a finite verb.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Phase 1 grammar items (${items.length} total)…`);
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

  console.log(`✓ Phase 1 complete — ${inserted} items inserted.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
