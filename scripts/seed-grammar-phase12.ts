/**
 * GRAMMAR PHASE 12 — Gap-fill
 * SEED_TAG: "seed-grammar-phase12"
 * Distribution: B1=25, B2=25, C1=30, C2=16 = 96 items
 * New topics: wish/if-only, indirect speech, causatives, prep+gerund,
 *   relative clauses, linkers, passives (B1);
 *   mixed conditionals, reported speech, concession, quantifiers,
 *   nominal wh-clauses, participle clauses, complex prepositions (B2);
 *   subjunctive, concession, register, collocation, apposition,
 *   cohesion, it-extraposition, nominalisation (C1);
 *   were-to conditionals, scope of negation, modal remoteness,
 *   rhetoric/parallelism, gradability, absolute clauses (C2)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SEED_TAG = "seed-grammar-phase12";
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE   = process.env.FORCE   === "1";

type Opt  = { text: string; isCorrect: boolean; rationale: string };
type Item = {
  cefrLevel: string; difficulty: number;
  discrimination: number; guessing: number; tags: string[];
  content: { prompt: string; options: Opt[] };
};

const items: Item[] = [
  // ── B1 (25 items) ──────────────────────────────────────────────────────────

  // wish / if only (3)
  { cefrLevel:"B1", difficulty:-0.5, discrimination:1.1, guessing:0.25,
    tags:["wish","if-only","present-wish",SEED_TAG],
    content:{ prompt:"\"I wish I ___ a car.\" (Present wish about a current lack)",
      options:[
        {text:"had",        isCorrect:true,  rationale:"\"Wish + past simple\" expresses a wish about present reality. \"Had\" is the correct form."},
        {text:"have",       isCorrect:false, rationale:"\"Wish + present simple\" is ungrammatical — the past form must follow wish for present wishes."},
        {text:"would have", isCorrect:false, rationale:"\"Would have\" is used in third conditional — not for present wishes."},
        {text:"could have", isCorrect:false, rationale:"\"Could have\" expresses a past unfulfilled ability, not a present wish."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.4, discrimination:1.1, guessing:0.25,
    tags:["wish","past-regret",SEED_TAG],
    content:{ prompt:"\"She wishes she ___ more time abroad when she was young.\" (Regret about the past)",
      options:[
        {text:"had spent",   isCorrect:true,  rationale:"\"Wish + past perfect\" expresses regret about a past event that cannot be changed."},
        {text:"spent",       isCorrect:false, rationale:"\"Wish + simple past\" is used for present wishes, not past regrets."},
        {text:"would spend", isCorrect:false, rationale:"\"Would spend\" after wish expresses desire for change in behaviour, not a past regret."},
        {text:"has spent",   isCorrect:false, rationale:"Present perfect after wish is ungrammatical."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.3, discrimination:1.1, guessing:0.25,
    tags:["if-only","future-wish",SEED_TAG],
    content:{ prompt:"\"If only they ___ stop making so much noise!\" (A wish about someone else's annoying habit)",
      options:[
        {text:"would", isCorrect:true,  rationale:"\"If only + would + infinitive\" expresses a wish for someone else to change behaviour."},
        {text:"will",  isCorrect:false, rationale:"\"Will\" does not create the hypothetical distancing needed."},
        {text:"could", isCorrect:false, rationale:"\"Could\" focuses on ability; \"would\" focuses on willingness/habit."},
        {text:"had",   isCorrect:false, rationale:"\"Had\" would make it a past regret wish."},
      ]}},

  // Indirect (reported) speech (4)
  { cefrLevel:"B1", difficulty:-0.5, discrimination:1.1, guessing:0.25,
    tags:["reported-speech","tense-backshift",SEED_TAG],
    content:{ prompt:"\"I am tired,\" she said. → She said she ___ tired.",
      options:[
        {text:"was",      isCorrect:true,  rationale:"Tense backshift: present simple → past simple in reported speech."},
        {text:"is",       isCorrect:false, rationale:"No backshift — not standard in reported speech with a past reporting verb."},
        {text:"has been", isCorrect:false, rationale:"Present perfect would backshift to past perfect, not present perfect."},
        {text:"were",     isCorrect:false, rationale:"\"Were\" would require a plural or subjunctive context."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.4, discrimination:1.1, guessing:0.25,
    tags:["reported-speech","question-reporting",SEED_TAG],
    content:{ prompt:"\"Where do you live?\" he asked her. → He asked her where she ___.",
      options:[
        {text:"lived",     isCorrect:true,  rationale:"Reported questions use statement word order and tense backshift: \"where she lived.\""},
        {text:"did live",  isCorrect:false, rationale:"Auxiliary \"did\" is not used in reported questions."},
        {text:"was living", isCorrect:false, rationale:"Present simple backshifts to past simple, not past continuous."},
        {text:"lives",     isCorrect:false, rationale:"No backshift — incorrect with past reporting verb."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.3, discrimination:1.1, guessing:0.25,
    tags:["reported-speech","reporting-verbs",SEED_TAG],
    content:{ prompt:"\"Please send me the report.\" → He ___ her to send him the report.",
      options:[
        {text:"asked",     isCorrect:true,  rationale:"\"Ask + object + to-infinitive\" is the standard structure for reporting a request."},
        {text:"told",      isCorrect:false, rationale:"\"Tell + object + to-infinitive\" reports an instruction, not typically a polite request with \"please.\""},
        {text:"said",      isCorrect:false, rationale:"\"Say\" cannot take an object + infinitive."},
        {text:"requested", isCorrect:false, rationale:"\"Requested + object + to-infinitive\" is possible but unusual in everyday speech."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.2, discrimination:1.2, guessing:0.25,
    tags:["reported-speech","modal-backshift",SEED_TAG],
    content:{ prompt:"\"I will call you tomorrow.\" → She said she ___ call me the next day.",
      options:[
        {text:"would", isCorrect:true,  rationale:"\"Will\" backshifts to \"would\" in reported speech."},
        {text:"will",  isCorrect:false, rationale:"\"Will\" is incorrect after a past reporting verb."},
        {text:"could", isCorrect:false, rationale:"\"Would\" is the backshifted form of \"will\"; \"could\" backshifts from \"can.\""},
        {text:"shall", isCorrect:false, rationale:"\"Shall\" is not the backshift of \"will\" in standard reported speech."},
      ]}},

  // make / let / have / get (causatives) (3)
  { cefrLevel:"B1", difficulty:-0.3, discrimination:1.1, guessing:0.25,
    tags:["causatives","make-let",SEED_TAG],
    content:{ prompt:"\"The film ___ me cry.\" (The film caused an involuntary emotional response.)",
      options:[
        {text:"made", isCorrect:true,  rationale:"\"Make + object + bare infinitive\" expresses involuntary or forced causation."},
        {text:"let",  isCorrect:false, rationale:"\"Let\" expresses permission, not involuntary emotional response."},
        {text:"had",  isCorrect:false, rationale:"\"Have\" + object in causative requires a past participle, not a bare infinitive."},
        {text:"got",  isCorrect:false, rationale:"\"Get + object + to-infinitive\" (not bare infinitive) expresses persuasion."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.2, discrimination:1.1, guessing:0.25,
    tags:["causatives","get",SEED_TAG],
    content:{ prompt:"\"She ___ her brother to fix the shelves.\" (She persuaded him.)",
      options:[
        {text:"got",  isCorrect:true,  rationale:"\"Get + object + to-infinitive\" expresses persuasion."},
        {text:"made", isCorrect:false, rationale:"\"Made\" takes a bare infinitive and implies compulsion."},
        {text:"let",  isCorrect:false, rationale:"\"Let\" expresses permission: \"she let him fix\" = she allowed him."},
        {text:"had",  isCorrect:false, rationale:"\"Had\" + object + bare infinitive is the causative, not + to-infinitive."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.1, discrimination:1.2, guessing:0.25,
    tags:["causatives","have",SEED_TAG],
    content:{ prompt:"\"I ___ my hair cut at the salon.\" (I arranged for someone to cut it.)",
      options:[
        {text:"had",  isCorrect:true,  rationale:"\"Have + object + past participle\" is the standard causative for arranged services."},
        {text:"got",  isCorrect:false, rationale:"\"Got my hair cut\" is also correct (informal), but \"had\" is the primary formal answer."},
        {text:"made", isCorrect:false, rationale:"\"Made + object + bare infinitive\" is compulsion, not arrangement."},
        {text:"let",  isCorrect:false, rationale:"\"Let + object + bare infinitive\" expresses permission."},
      ]}},

  // Prepositions + gerund (2)
  { cefrLevel:"B1", difficulty:-0.4, discrimination:1.1, guessing:0.25,
    tags:["prepositions","gerund",SEED_TAG],
    content:{ prompt:"\"She insisted ___ paying for everyone at the table.\"",
      options:[
        {text:"on",  isCorrect:true,  rationale:"\"Insist on + gerund\" is the fixed collocation."},
        {text:"in",  isCorrect:false, rationale:"\"Insist in\" is not standard."},
        {text:"for", isCorrect:false, rationale:"\"Insist for\" is ungrammatical."},
        {text:"to",  isCorrect:false, rationale:"\"Insist to\" is ungrammatical."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.3, discrimination:1.1, guessing:0.25,
    tags:["prepositions","gerund",SEED_TAG],
    content:{ prompt:"\"He succeeded ___ passing the exam on his third attempt.\"",
      options:[
        {text:"in",  isCorrect:true,  rationale:"\"Succeed in + gerund\" is the fixed collocation."},
        {text:"at",  isCorrect:false, rationale:"\"Succeed at\" is not standard; \"be good at\" uses \"at.\""},
        {text:"to",  isCorrect:false, rationale:"\"Succeed to\" means to take over a position (e.g., throne)."},
        {text:"for", isCorrect:false, rationale:"\"Succeed for\" is ungrammatical."},
      ]}},

  // Relative clauses (3)
  { cefrLevel:"B1", difficulty:-0.3, discrimination:1.1, guessing:0.25,
    tags:["relative-clauses","restrictive",SEED_TAG],
    content:{ prompt:"\"The laptop ___ I bought last year has broken.\" (Defining/restrictive)",
      options:[
        {text:"that",  isCorrect:true,  rationale:"\"That\" is preferred in restrictive (defining) clauses."},
        {text:"which", isCorrect:false, rationale:"\"Which\" can be used in restrictive clauses but is more formal; \"that\" is preferred here."},
        {text:"who",   isCorrect:false, rationale:"\"Who\" is for people, not things."},
        {text:"whom",  isCorrect:false, rationale:"\"Whom\" is for people (object)."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.2, discrimination:1.1, guessing:0.25,
    tags:["relative-clauses","non-restrictive",SEED_TAG],
    content:{ prompt:"\"My car, ___ I bought in 2019, still runs perfectly.\" (Non-restrictive)",
      options:[
        {text:"which", isCorrect:true,  rationale:"Non-restrictive clauses use \"which\" (not \"that\") with commas."},
        {text:"that",  isCorrect:false, rationale:"\"That\" cannot be used in non-restrictive relative clauses."},
        {text:"who",   isCorrect:false, rationale:"\"Who\" is for people."},
        {text:"what",  isCorrect:false, rationale:"\"What\" does not introduce relative clauses."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.1, discrimination:1.2, guessing:0.25,
    tags:["relative-clauses","whose-possessive",SEED_TAG],
    content:{ prompt:"\"The author ___ novel I read last week is speaking tonight.\" (Possessive)",
      options:[
        {text:"whose",  isCorrect:true,  rationale:"\"Whose\" expresses possession in relative clauses."},
        {text:"who",    isCorrect:false, rationale:"\"Who\" is a subject pronoun; it cannot express possession."},
        {text:"which",  isCorrect:false, rationale:"\"Which\" cannot express possession directly."},
        {text:"who's",  isCorrect:false, rationale:"\"Who's\" is a contraction of \"who is\" — cannot show possession."},
      ]}},

  // Linking adverbials (3)
  { cefrLevel:"B1", difficulty:-0.4, discrimination:1.1, guessing:0.25,
    tags:["discourse-markers","addition",SEED_TAG],
    content:{ prompt:"\"The hotel has a pool. ___, it has a gym and a spa.\" (Addition)",
      options:[
        {text:"Furthermore",  isCorrect:true,  rationale:"\"Furthermore\" adds a further point."},
        {text:"However",      isCorrect:false, rationale:"\"However\" introduces a contrast."},
        {text:"Therefore",    isCorrect:false, rationale:"\"Therefore\" introduces a result."},
        {text:"Nevertheless", isCorrect:false, rationale:"\"Nevertheless\" introduces a concession."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.3, discrimination:1.1, guessing:0.25,
    tags:["discourse-markers","contrast",SEED_TAG],
    content:{ prompt:"\"___ it rained heavily, the match continued.\" Which is most natural?",
      options:[
        {text:"Although",  isCorrect:true,  rationale:"\"Although\" introduces a concessive clause."},
        {text:"However",   isCorrect:false, rationale:"\"However\" is an adverb, not a subordinating conjunction."},
        {text:"Despite",   isCorrect:false, rationale:"\"Despite\" takes a noun phrase: \"Despite the heavy rain…\""},
        {text:"Even so",   isCorrect:false, rationale:"\"Even so\" is a sentence connector, not a subordinating conjunction."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.2, discrimination:1.1, guessing:0.25,
    tags:["discourse-markers","result",SEED_TAG],
    content:{ prompt:"\"The bridge was damaged. ___, the road was closed for repairs.\" (Result)",
      options:[
        {text:"As a result",     isCorrect:true,  rationale:"\"As a result\" introduces a logical consequence."},
        {text:"In addition",     isCorrect:false, rationale:"\"In addition\" adds information."},
        {text:"On the contrary", isCorrect:false, rationale:"\"On the contrary\" introduces contrast."},
        {text:"In spite of this", isCorrect:false, rationale:"\"In spite of this\" introduces concession."},
      ]}},

  // Conditional: second conditional + wish vs real (3)
  { cefrLevel:"B1", difficulty:-0.4, discrimination:1.1, guessing:0.25,
    tags:["conditionals","second-conditional",SEED_TAG],
    content:{ prompt:"\"If I ___ you, I would accept the job offer.\" (Hypothetical advice)",
      options:[
        {text:"were",  isCorrect:true,  rationale:"\"If I were you\" is the standard second conditional for giving hypothetical advice — \"were\" is used with all persons."},
        {text:"was",   isCorrect:false, rationale:"\"Was\" is acceptable informally but \"were\" is the standard form in this fixed expression."},
        {text:"am",    isCorrect:false, rationale:"\"Am\" is present indicative — not a hypothetical conditional form."},
        {text:"would be", isCorrect:false, rationale:"\"Would\" goes in the result clause, not the condition clause."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.3, discrimination:1.1, guessing:0.25,
    tags:["conditionals","zero-conditional",SEED_TAG],
    content:{ prompt:"\"If you heat water to 100°C, it ___. \" (Zero conditional — scientific truth)",
      options:[
        {text:"boils",       isCorrect:true,  rationale:"Zero conditional uses present simple in both clauses for universal/scientific truths."},
        {text:"would boil",  isCorrect:false, rationale:"\"Would boil\" is second conditional — for hypothetical scenarios, not universal facts."},
        {text:"will boil",   isCorrect:false, rationale:"\"Will boil\" is first conditional — suitable for likely situations, not universal truths."},
        {text:"boiled",      isCorrect:false, rationale:"Past tense is not used in zero conditional for present/universal truths."},
      ]}},
  { cefrLevel:"B1", difficulty:-0.2, discrimination:1.1, guessing:0.25,
    tags:["conditionals","first-conditional",SEED_TAG],
    content:{ prompt:"\"If it ___ tomorrow, we will cancel the picnic.\" (Real future possibility)",
      options:[
        {text:"rains",      isCorrect:true,  rationale:"First conditional: present simple in the if-clause, will + infinitive in the result clause."},
        {text:"will rain",  isCorrect:false, rationale:"\"Will\" is not used in the if-clause of a first conditional."},
        {text:"rained",     isCorrect:false, rationale:"Past simple in the if-clause creates a second conditional (hypothetical), not a real future possibility."},
        {text:"had rained", isCorrect:false, rationale:"Past perfect creates a third conditional (past counterfactual)."},
      ]}},

  // Compound nouns and noun phrases (2)
  { cefrLevel:"B1", difficulty:-0.3, discrimination:1.1, guessing:0.25,
    tags:["noun-phrases","compound-nouns",SEED_TAG],
    content:{ prompt:"Which compound noun is correctly formed?",
      options:[
        {text:"a two-year-old child",    isCorrect:true,  rationale:"Compound modifier before a noun is hyphenated: \"two-year-old\" (adjective phrase modifying \"child\")."},
        {text:"a child of two years old", isCorrect:false, rationale:"This is a prepositional phrase expansion — not the compound adjective form."},
        {text:"a two years old child",   isCorrect:false, rationale:"No hyphenation and incorrect plural — \"two-year-old\" takes singular \"year\" when hyphenated."},
        {text:"a two years child",       isCorrect:false, rationale:"Incomplete and incorrect compound structure."},
      ]}},

  // Passive (2)
  { cefrLevel:"B1", difficulty:-0.3, discrimination:1.1, guessing:0.25,
    tags:["passive","be-passive",SEED_TAG],
    content:{ prompt:"\"The windows ___ cleaned every week by the building staff.\"",
      options:[
        {text:"are",      isCorrect:true,  rationale:"\"Are + past participle\" is the present simple passive for a regular action."},
        {text:"have",     isCorrect:false, rationale:"\"Have cleaned\" is active voice."},
        {text:"is being", isCorrect:false, rationale:"\"Is being cleaned\" implies the action is happening right now."},
        {text:"get",      isCorrect:false, rationale:"\"Get cleaned\" (informal passive) is less standard with \"every week.\""},
      ]}},
  { cefrLevel:"B1", difficulty:-0.1, discrimination:1.1, guessing:0.25,
    tags:["passive","get-passive",SEED_TAG],
    content:{ prompt:"\"His phone ___ stolen on the bus yesterday.\" (Informal passive; misfortune)",
      options:[
        {text:"got",     isCorrect:true,  rationale:"\"Get + past participle\" is an informal passive often used for unfortunate events."},
        {text:"was",     isCorrect:false, rationale:"\"Was stolen\" is also grammatically correct, but \"got\" is the specifically informal form."},
        {text:"has got", isCorrect:false, rationale:"\"Has got stolen\" is non-standard."},
        {text:"had",     isCorrect:false, rationale:"\"Had stolen\" would be causative — opposite meaning."},
      ]}},

  { cefrLevel:"B1", difficulty:0.0, discrimination:1.1, guessing:0.25,
    tags:["reported-speech","tense-backshift",SEED_TAG],
    content:{ prompt:"She said she ___ to the cinema the night before.",
      options:[
        {text:"had gone",  isCorrect:true,  rationale:"Reported speech requires backshift: simple past → past perfect."},
        {text:"went",      isCorrect:false, rationale:"\"Went\" is the direct speech form; backshift is required in reported speech."},
        {text:"has gone",  isCorrect:false, rationale:"Present perfect does not backshift correctly here."},
        {text:"would go",  isCorrect:false, rationale:"\"Would go\" indicates future-in-past, not a past completed action."},
      ]}},

  // ── B2 (25 items) ──────────────────────────────────────────────────────────

  // Mixed conditionals (4)
  { cefrLevel:"B2", difficulty:0.3, discrimination:1.2, guessing:0.25,
    tags:["mixed-conditionals","past-condition-present-result",SEED_TAG],
    content:{ prompt:"\"If she had studied harder at school, she ___ a doctor now.\" (Past cause → present result)",
      options:[
        {text:"would be",        isCorrect:true,  rationale:"Mixed conditional: past unreal condition (had + pp) → present unreal result (would + bare infinitive)."},
        {text:"would have been", isCorrect:false, rationale:"\"Would have been\" gives a past result — incorrect when the result is present."},
        {text:"had been",        isCorrect:false, rationale:"Past perfect is the condition form, not the result form."},
        {text:"might have been", isCorrect:false, rationale:"\"Might have been\" gives a past speculative result."},
      ]}},
  { cefrLevel:"B2", difficulty:0.4, discrimination:1.2, guessing:0.25,
    tags:["mixed-conditionals","present-condition-past-result",SEED_TAG],
    content:{ prompt:"\"If he were more ambitious, he ___ for that promotion last year.\" (Present trait → past missed opportunity)",
      options:[
        {text:"would have applied", isCorrect:true,  rationale:"Mixed conditional: present unreal condition (were) → past unreal result (would have + pp)."},
        {text:"would apply",        isCorrect:false, rationale:"\"Would apply\" gives a present/future result."},
        {text:"had applied",        isCorrect:false, rationale:"Past perfect is used in the condition clause, not the result clause."},
        {text:"applied",            isCorrect:false, rationale:"Simple past without a modal is not a conditional result clause."},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.2, guessing:0.25,
    tags:["mixed-conditionals","identification",SEED_TAG],
    content:{ prompt:"Which sentence is a mixed conditional?",
      options:[
        {text:"If I had taken the job, I would be living in Tokyo now.",       isCorrect:true,  rationale:"Past condition (had taken) + present result (would be living): classic mixed conditional."},
        {text:"If I take the job, I will move to Tokyo.",                      isCorrect:false, rationale:"First conditional: real present/future scenario."},
        {text:"If I had taken the job, I would have moved to Tokyo.",          isCorrect:false, rationale:"Pure third conditional — not mixed."},
        {text:"If I were taking the job, I would be moving to Tokyo.",         isCorrect:false, rationale:"Both present/hypothetical — second conditional variant."},
      ]}},
  { cefrLevel:"B2", difficulty:0.6, discrimination:1.2, guessing:0.25,
    tags:["mixed-conditionals","modal-variation",SEED_TAG],
    content:{ prompt:"\"If they had signed the contract, we ___ to expand the team now.\"",
      options:[
        {text:"might be able",       isCorrect:true,  rationale:"Mixed conditional with \"might\" for possibility: past condition → present uncertain result."},
        {text:"would have been able", isCorrect:false, rationale:"\"Would have been able\" = past result — but \"now\" signals present."},
        {text:"could have been",     isCorrect:false, rationale:"\"Could have been\" is a past speculation."},
        {text:"should be",           isCorrect:false, rationale:"\"Should be\" implies present expectation/obligation."},
      ]}},

  // Reported speech: complex shifts (3)
  { cefrLevel:"B2", difficulty:0.3, discrimination:1.2, guessing:0.25,
    tags:["reported-speech","past-perfect-backshift",SEED_TAG],
    content:{ prompt:"\"I have already finished,\" he said. → He said he ___ already ___.",
      options:[
        {text:"had / finished",       isCorrect:true,  rationale:"Present perfect (have finished) backshifts to past perfect (had finished)."},
        {text:"has / finished",       isCorrect:false, rationale:"\"Has\" is not backshifted — incorrect with past reporting verb."},
        {text:"had / been finishing", isCorrect:false, rationale:"Past perfect continuous — incorrect backshift of present perfect simple."},
        {text:"was / finishing",      isCorrect:false, rationale:"Past continuous is the backshift of present continuous, not present perfect."},
      ]}},
  { cefrLevel:"B2", difficulty:0.4, discrimination:1.2, guessing:0.25,
    tags:["reported-speech","no-backshift",SEED_TAG],
    content:{ prompt:"\"The sun rises in the east,\" the teacher said. → The teacher said the sun ___ in the east. (Timeless truth)",
      options:[
        {text:"rises",    isCorrect:true,  rationale:"Timeless truths do not require tense backshift."},
        {text:"rose",     isCorrect:false, rationale:"Backshift is optional for permanent truths; applying it could imply it is no longer true."},
        {text:"would rise", isCorrect:false, rationale:"Modal backshift is inappropriate for timeless statements."},
        {text:"had risen", isCorrect:false, rationale:"Past perfect implies prior completion — wrong for a universal truth."},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.2, guessing:0.25,
    tags:["reported-speech","reporting-verbs-patterns",SEED_TAG],
    content:{ prompt:"\"You should consider the long-term risks,\" the adviser said to us. Which correctly reports this?",
      options:[
        {text:"The adviser urged us to consider the long-term risks.",       isCorrect:true,  rationale:"\"Urge + object + to-infinitive\" correctly reports a strong recommendation."},
        {text:"The adviser said us to consider the long-term risks.",        isCorrect:false, rationale:"\"Say\" cannot take an indirect object + to-infinitive."},
        {text:"The adviser explained us to consider the long-term risks.",   isCorrect:false, rationale:"\"Explain\" cannot take an indirect object + to-infinitive."},
        {text:"The adviser admitted us to consider the long-term risks.",    isCorrect:false, rationale:"\"Admit\" means to confess — not appropriate here."},
      ]}},

  // Concession and contrast (3)
  { cefrLevel:"B2", difficulty:0.3, discrimination:1.2, guessing:0.25,
    tags:["concession","despite",SEED_TAG],
    content:{ prompt:"\"___ the long delays, the project was completed under budget.\"",
      options:[
        {text:"Despite",   isCorrect:true,  rationale:"\"Despite + noun phrase\" is a preposition expressing concession."},
        {text:"Although",  isCorrect:false, rationale:"\"Although\" requires a finite clause."},
        {text:"However",   isCorrect:false, rationale:"\"However\" is an adverb, not a preposition."},
        {text:"Whereas",   isCorrect:false, rationale:"\"Whereas\" expresses contrast between two clauses."},
      ]}},
  { cefrLevel:"B2", difficulty:0.4, discrimination:1.2, guessing:0.25,
    tags:["concession","even-though",SEED_TAG],
    content:{ prompt:"\"___ she had very little experience, she performed exceptionally in the interview.\"",
      options:[
        {text:"Even though",  isCorrect:true,  rationale:"\"Even though\" introduces a strong concessive clause."},
        {text:"In spite of",  isCorrect:false, rationale:"\"In spite of\" takes a noun phrase or gerund."},
        {text:"Nevertheless", isCorrect:false, rationale:"\"Nevertheless\" is a sentence connector."},
        {text:"Regardless",   isCorrect:false, rationale:"\"Regardless\" requires \"of\": \"Regardless of her experience…\""},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.2, guessing:0.25,
    tags:["concession","while-whereas",SEED_TAG],
    content:{ prompt:"\"___ London is famous for its museums, Paris is known for its cuisine.\" (Parallel contrast)",
      options:[
        {text:"While",   isCorrect:true,  rationale:"\"While\" can introduce a contrast clause for parallel structures."},
        {text:"Despite", isCorrect:false, rationale:"\"Despite\" requires a noun phrase."},
        {text:"However", isCorrect:false, rationale:"\"However\" is a connector between sentences."},
        {text:"Still",   isCorrect:false, rationale:"\"Still\" adds emphasis, not a direct parallel contrast."},
      ]}},

  // Quantifiers (3)
  { cefrLevel:"B2", difficulty:0.4, discrimination:1.2, guessing:0.25,
    tags:["quantifiers","many-much-few",SEED_TAG],
    content:{ prompt:"\"___ research has been done, but ___ definitive conclusions have been reached.\" (Correct pair)",
      options:[
        {text:"Much / few",    isCorrect:true,  rationale:"\"Much\" with uncountable (research), \"few\" with countable plural (conclusions)."},
        {text:"Many / little", isCorrect:false, rationale:"\"Many\" is for countable nouns, \"little\" for uncountable — reversed."},
        {text:"Much / little", isCorrect:false, rationale:"\"Little\" is for uncountable nouns; \"conclusions\" is countable."},
        {text:"Many / few",    isCorrect:false, rationale:"\"Many\" is for countable nouns; \"research\" is uncountable."},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.2, guessing:0.25,
    tags:["quantifiers","a-large-number",SEED_TAG],
    content:{ prompt:"\"___ the participants reported feeling more confident after the programme.\"",
      options:[
        {text:"A large number of", isCorrect:true,  rationale:"\"A large number of + countable plural\" is formal for academic writing."},
        {text:"Much",              isCorrect:false, rationale:"\"Much\" is for uncountable nouns."},
        {text:"A great deal of",   isCorrect:false, rationale:"\"A great deal of\" is used with uncountable nouns."},
        {text:"Plenty",            isCorrect:false, rationale:"\"Plenty\" requires \"of\" and is less formal."},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.3, guessing:0.25,
    tags:["quantifiers","none","subject-agreement",SEED_TAG],
    content:{ prompt:"\"___ of the evidence ___ conclusive.\" (Formal agreement)",
      options:[
        {text:"None / is",    isCorrect:true,  rationale:"\"None of + uncountable\" takes singular verb in formal writing."},
        {text:"None / are",   isCorrect:false, rationale:"\"Are\" is used informally with countable plurals, not uncountable."},
        {text:"No / is",      isCorrect:false, rationale:"\"No evidence is conclusive\" is correct but does not match \"of the\" structure."},
        {text:"Neither / is", isCorrect:false, rationale:"\"Neither\" is used for exactly two items."},
      ]}},

  // Nominal wh-clauses (3)
  { cefrLevel:"B2", difficulty:0.4, discrimination:1.2, guessing:0.25,
    tags:["nominal-clauses","wh-clause",SEED_TAG],
    content:{ prompt:"\"___ surprised everyone was how quickly the situation resolved itself.\"",
      options:[
        {text:"What",  isCorrect:true,  rationale:"\"What + clause\" functions as a nominal subject clause."},
        {text:"Which", isCorrect:false, rationale:"\"Which\" introduces a relative clause referring to a prior noun."},
        {text:"That",  isCorrect:false, rationale:"\"That\" introduces a nominal clause only after certain verbs."},
        {text:"How",   isCorrect:false, rationale:"\"How\" could work but changes the focus to manner."},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.2, guessing:0.25,
    tags:["nominal-clauses","whether",SEED_TAG],
    content:{ prompt:"\"The committee is still debating ___ to adopt the new policy.\"",
      options:[
        {text:"whether", isCorrect:true,  rationale:"\"Whether + to-infinitive\" introduces an indirect question about a choice."},
        {text:"if",      isCorrect:false, rationale:"\"If + to-infinitive\" is not standard; \"whether\" is required before infinitive clauses."},
        {text:"that",    isCorrect:false, rationale:"\"That + to-infinitive\" is not used for indirect decision questions."},
        {text:"which",   isCorrect:false, rationale:"\"Which to adopt\" would be possible if specific options were mentioned, but \"whether\" is needed for a binary decision."},
      ]}},
  { cefrLevel:"B2", difficulty:0.6, discrimination:1.3, guessing:0.25,
    tags:["nominal-clauses","whoever","free-relative",SEED_TAG],
    content:{ prompt:"\"___ arrives first should set up the equipment.\" (Free relative clause as subject)",
      options:[
        {text:"Whoever",  isCorrect:true,  rationale:"\"Whoever + clause\" functions as a noun phrase meaning \"the person who…\""},
        {text:"Who",      isCorrect:false, rationale:"\"Who\" introduces a relative clause needing an antecedent."},
        {text:"Anyone",   isCorrect:false, rationale:"\"Anyone who arrives first\" works but requires restructuring."},
        {text:"Whomever", isCorrect:false, rationale:"\"Whomever\" is the object form; subject requires \"whoever.\""},
      ]}},

  // Participle clauses (4)
  { cefrLevel:"B2", difficulty:0.4, discrimination:1.2, guessing:0.25,
    tags:["participle-clauses","present-participle",SEED_TAG],
    content:{ prompt:"\"___ the report, she noticed several inconsistencies.\" (Same-time action)",
      options:[
        {text:"Reading",       isCorrect:true,  rationale:"Present participle clause: simultaneous actions sharing the same subject."},
        {text:"Having read",   isCorrect:false, rationale:"\"Having read\" indicates the reading was completed before noticing."},
        {text:"When she reads", isCorrect:false, rationale:"A finite clause — not the targeted participial form."},
        {text:"To read",       isCorrect:false, rationale:"Infinitive of purpose — different meaning."},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.2, guessing:0.25,
    tags:["participle-clauses","perfect-participle",SEED_TAG],
    content:{ prompt:"\"___ all the necessary paperwork, she finally submitted her application.\" (Prior completion)",
      options:[
        {text:"Having completed", isCorrect:true,  rationale:"\"Having + past participle\" shows completing the paperwork happened before submitting."},
        {text:"Completing",       isCorrect:false, rationale:"Present participle implies simultaneous action."},
        {text:"After completing", isCorrect:false, rationale:"A full subordinate clause — not the participial form targeted."},
        {text:"To complete",      isCorrect:false, rationale:"Infinitive of purpose — different meaning."},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.3, guessing:0.25,
    tags:["participle-clauses","passive-participle",SEED_TAG],
    content:{ prompt:"\"___ in 1889, the building is now a listed heritage site.\" (Passive, prior action)",
      options:[
        {text:"Built",        isCorrect:true,  rationale:"\"Built in 1889\" is a reduced passive participial clause."},
        {text:"Having built", isCorrect:false, rationale:"Active perfect participle — would mean the building built something else."},
        {text:"Building",     isCorrect:false, rationale:"Present active participle — incorrect for a passive prior state."},
        {text:"Being built",  isCorrect:false, rationale:"\"Being built\" implies current construction."},
      ]}},
  { cefrLevel:"B2", difficulty:0.6, discrimination:1.3, guessing:0.25,
    tags:["participle-clauses","dangling-participle",SEED_TAG],
    content:{ prompt:"Which sentence contains a dangling participle?",
      options:[
        {text:"Walking along the beach, the sunset was breathtaking.",             isCorrect:true,  rationale:"\"Walking\" has no logical subject — the sunset was not walking. This is a dangling participle."},
        {text:"Having read the instructions, she assembled the furniture easily.", isCorrect:false, rationale:"Correct: \"she\" is the subject of both clauses."},
        {text:"Feeling tired, he went to bed early.",                              isCorrect:false, rationale:"Correct: \"he\" is the subject of both clauses."},
        {text:"Exhausted by the heat, they stopped for water.",                    isCorrect:false, rationale:"Correct: \"they\" is the subject of both clauses."},
      ]}},

  // Complex prepositions (3)
  { cefrLevel:"B2", difficulty:0.4, discrimination:1.2, guessing:0.25,
    tags:["complex-prepositions","formal",SEED_TAG],
    content:{ prompt:"\"___ the adverse weather conditions, the event was postponed.\" (Formal reason)",
      options:[
        {text:"In view of",  isCorrect:true,  rationale:"\"In view of\" is a formal complex preposition expressing reason based on circumstances."},
        {text:"Because",     isCorrect:false, rationale:"\"Because\" is a conjunction — requires a finite clause."},
        {text:"Owing that",  isCorrect:false, rationale:"\"Owing to\" (not \"owing that\") is the correct form."},
        {text:"As much as",  isCorrect:false, rationale:"\"As much as\" introduces concession, not cause."},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.2, guessing:0.25,
    tags:["complex-prepositions","purpose",SEED_TAG],
    content:{ prompt:"\"The fund was established ___ supporting local arts organisations.\"",
      options:[
        {text:"with a view to",  isCorrect:true,  rationale:"\"With a view to + gerund\" is a formal purpose expression."},
        {text:"in order to",     isCorrect:false, rationale:"\"In order to\" takes a bare infinitive, not a gerund."},
        {text:"so as for",       isCorrect:false, rationale:"\"So as for\" is not a standard expression."},
        {text:"with the aim to", isCorrect:false, rationale:"\"With the aim to\" is non-standard; correct is \"with the aim of + gerund.\""},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.2, guessing:0.25,
    tags:["complex-prepositions","concession",SEED_TAG],
    content:{ prompt:"\"___ all the criticism the proposal received, it was approved unanimously.\"",
      options:[
        {text:"Notwithstanding", isCorrect:true,  rationale:"\"Notwithstanding\" is a formal preposition meaning \"despite.\""},
        {text:"Regardless",      isCorrect:false, rationale:"\"Regardless\" requires \"of\"."},
        {text:"Instead of",      isCorrect:false, rationale:"\"Instead of\" expresses substitution."},
        {text:"On account of",   isCorrect:false, rationale:"\"On account of\" introduces reason, not concession."},
      ]}},

  // Passive with modal (2 extra B2)
  { cefrLevel:"B2", difficulty:0.4, discrimination:1.2, guessing:0.25,
    tags:["passive","modal-passive",SEED_TAG],
    content:{ prompt:"\"The final decision ___ made by the board of directors.\" (Future passive obligation)",
      options:[
        {text:"must be",    isCorrect:true,  rationale:"\"Must be + past participle\" is the modal passive expressing obligation/necessity."},
        {text:"must have",  isCorrect:false, rationale:"\"Must have\" is used for past deduction, not future obligation."},
        {text:"should make", isCorrect:false, rationale:"Active voice — the subject \"decision\" cannot make itself."},
        {text:"ought make",  isCorrect:false, rationale:"\"Ought\" requires \"to\": \"ought to be made.\""},
      ]}},
  { cefrLevel:"B2", difficulty:0.5, discrimination:1.2, guessing:0.25,
    tags:["passive","continuous-passive",SEED_TAG],
    content:{ prompt:"\"The bridge ___ repaired when the accident occurred.\" (Past continuous passive)",
      options:[
        {text:"was being", isCorrect:true,  rationale:"\"Was being + past participle\" is the past continuous passive — the repair was in progress."},
        {text:"had been",  isCorrect:false, rationale:"\"Had been repaired\" is past perfect passive — implies completed repair before accident."},
        {text:"was been",  isCorrect:false, rationale:"\"Was been\" is ungrammatical."},
        {text:"being",     isCorrect:false, rationale:"\"Being repaired\" alone is a participial phrase, not a finite past clause."},
      ]}},

  // ── C1 (30 items) ──────────────────────────────────────────────────────────

  // Subjunctive mood (5)
  { cefrLevel:"C1", difficulty:1.0, discrimination:1.4, guessing:0.25,
    tags:["subjunctive","mandative",SEED_TAG],
    content:{ prompt:"\"The committee recommended that the proposal ___ reviewed before the vote.\" (Mandative subjunctive)",
      options:[
        {text:"be",        isCorrect:true,  rationale:"Mandative subjunctive: recommend that + subject + base form (be)."},
        {text:"is",        isCorrect:false, rationale:"\"Is\" is the indicative form — mandative subjunctive requires the base form."},
        {text:"was",       isCorrect:false, rationale:"\"Was\" is past indicative — incorrect in the mandative subjunctive."},
        {text:"should be", isCorrect:false, rationale:"\"Should be\" is a modal alternative (less formal), not the bare subjunctive form."},
      ]}},
  { cefrLevel:"C1", difficulty:1.0, discrimination:1.4, guessing:0.25,
    tags:["subjunctive","suggest",SEED_TAG],
    content:{ prompt:"\"The doctor suggested that he ___ his diet immediately.\" (Mandative subjunctive)",
      options:[
        {text:"change",      isCorrect:true,  rationale:"\"Suggest that + subject + base form\" is the mandative subjunctive."},
        {text:"changes",     isCorrect:false, rationale:"\"Changes\" (indicative) — subjunctive requires uninflected base form."},
        {text:"would change", isCorrect:false, rationale:"Modal + infinitive is not the bare subjunctive form."},
        {text:"changed",     isCorrect:false, rationale:"Past tense is not used for present mandative subjunctive."},
      ]}},
  { cefrLevel:"C1", difficulty:1.1, discrimination:1.4, guessing:0.25,
    tags:["subjunctive","if-were-formal",SEED_TAG],
    content:{ prompt:"\"If she ___ to resign, the board would face a significant challenge.\" (Formal hypothetical)",
      options:[
        {text:"were",  isCorrect:true,  rationale:"\"Were\" is the past subjunctive for formal hypothetical conditionals."},
        {text:"was",   isCorrect:false, rationale:"\"Was\" is indicative — \"were\" is required in formal hypothetical conditionals."},
        {text:"would", isCorrect:false, rationale:"\"Would\" goes in the result clause, not the condition clause."},
        {text:"is",    isCorrect:false, rationale:"\"Is\" is present indicative — used in real conditionals."},
      ]}},
  { cefrLevel:"C1", difficulty:1.1, discrimination:1.4, guessing:0.25,
    tags:["subjunctive","as-if-were",SEED_TAG],
    content:{ prompt:"\"She spoke ___ she were the CEO, though she was only a junior employee.\"",
      options:[
        {text:"as if",    isCorrect:true,  rationale:"\"As if + past subjunctive (were)\" expresses an unreal manner comparison."},
        {text:"as",       isCorrect:false, rationale:"\"As\" alone introduces a real comparison — different meaning."},
        {text:"as though", isCorrect:false, rationale:"\"As though\" is synonymous with \"as if\" — but only one answer is marked correct here."},
        {text:"like",     isCorrect:false, rationale:"\"Like\" + clause is non-standard in formal written English."},
      ]}},
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["subjunctive","it-is-essential",SEED_TAG],
    content:{ prompt:"\"It is essential that every participant ___ a signed consent form.\" (Mandative)",
      options:[
        {text:"submit",    isCorrect:true,  rationale:"After \"It is essential that,\" the mandative subjunctive base form is used."},
        {text:"submits",   isCorrect:false, rationale:"\"Submits\" is indicative — incorrect in the mandative subjunctive."},
        {text:"submitted", isCorrect:false, rationale:"Past form — not used for present mandative subjunctive."},
        {text:"would submit", isCorrect:false, rationale:"Modal form — a possible alternative but not the targeted subjunctive."},
      ]}},

  // Complex concession (4)
  { cefrLevel:"C1", difficulty:1.0, discrimination:1.4, guessing:0.25,
    tags:["concession","however-adjective-fronting",SEED_TAG],
    content:{ prompt:"\"___ the arguments may be, we cannot accept the conclusion without evidence.\"",
      options:[
        {text:"However compelling", isCorrect:true,  rationale:"\"However + adjective + subject + verb\" is an adjective-fronting concessive structure."},
        {text:"Although compelling", isCorrect:false, rationale:"\"Although compelling\" needs a full clause: \"Although the arguments are compelling.\""},
        {text:"Despite compelling",  isCorrect:false, rationale:"\"Despite compelling arguments\" — noun phrase, does not fit this blank."},
        {text:"Much as compelling",  isCorrect:false, rationale:"\"Much as\" requires a full clause without the fronted adjective pattern."},
      ]}},
  { cefrLevel:"C1", difficulty:1.1, discrimination:1.4, guessing:0.25,
    tags:["concession","much-as",SEED_TAG],
    content:{ prompt:"\"___ I admire his dedication, I cannot overlook the errors in his work.\"",
      options:[
        {text:"Much as",  isCorrect:true,  rationale:"\"Much as + clause\" is a formal concessive structure meaning \"even though.\""},
        {text:"However",  isCorrect:false, rationale:"\"However\" followed by \"I admire\" is not a well-formed concessive here."},
        {text:"Despite",  isCorrect:false, rationale:"\"Despite\" is a preposition and cannot be followed by a subject + verb clause."},
        {text:"Even if",  isCorrect:false, rationale:"\"Even if\" introduces a conditional concession (hypothetical) — the admiration is real."},
      ]}},
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["concession","albeit",SEED_TAG],
    content:{ prompt:"\"The initiative produced results, ___ modest ones.\" (Formal concessive before noun phrase)",
      options:[
        {text:"albeit",   isCorrect:true,  rationale:"\"Albeit\" is a formal concessive adverb used before adjectives or noun phrases."},
        {text:"although", isCorrect:false, rationale:"\"Although\" requires a full finite clause."},
        {text:"despite",  isCorrect:false, rationale:"\"Despite modest ones\" is less idiomatic than \"albeit\" in this elliptical construction."},
        {text:"however",  isCorrect:false, rationale:"\"However\" requires adjective + subject + verb, or a full clause."},
      ]}},
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["concession","for-all",SEED_TAG],
    content:{ prompt:"\"___ its flaws, the report makes a significant contribution to the debate.\"",
      options:[
        {text:"For all",      isCorrect:true,  rationale:"\"For all + noun phrase\" is a formal concessive expression meaning \"in spite of.\""},
        {text:"Despite of",   isCorrect:false, rationale:"\"Despite of\" is ungrammatical — it is simply \"despite.\""},
        {text:"By virtue of", isCorrect:false, rationale:"\"By virtue of\" expresses reason/cause, not concession."},
        {text:"On the basis of", isCorrect:false, rationale:"\"On the basis of\" expresses grounds, not concession."},
      ]}},

  // Register and formality (3)
  { cefrLevel:"C1", difficulty:1.1, discrimination:1.4, guessing:0.25,
    tags:["register","formal-academic",SEED_TAG],
    content:{ prompt:"Which version is the most appropriate for a formal academic essay?",
      options:[
        {text:"This study seeks to examine the correlation between the two variables.",  isCorrect:true,  rationale:"Formal register: \"seeks to examine,\" precise vocabulary, no contractions."},
        {text:"This study is going to look at how the two variables are connected.",     isCorrect:false, rationale:"\"Going to\" and \"look at\" are informal."},
        {text:"We'll be checking out the link between the two things we're studying.",  isCorrect:false, rationale:"Contractions and colloquialisms are inappropriate in academic writing."},
        {text:"Here we will check how these two variables connect up.",                 isCorrect:false, rationale:"\"Check how\" and \"connect up\" are informal."},
      ]}},
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["register","hedging","epistemic-modal",SEED_TAG],
    content:{ prompt:"\"It ___ be argued that the data supports an alternative interpretation.\" (Hedged academic claim)",
      options:[
        {text:"could",  isCorrect:true,  rationale:"\"Could be argued\" hedges the claim as one possible interpretation."},
        {text:"must",   isCorrect:false, rationale:"\"Must be argued\" implies strong obligation — too assertive."},
        {text:"should", isCorrect:false, rationale:"\"Should be argued\" implies this ought to be made — evaluative, not a hedge."},
        {text:"will",   isCorrect:false, rationale:"\"Will be argued\" implies certainty about future discussion."},
      ]}},
  { cefrLevel:"C1", difficulty:1.3, discrimination:1.4, guessing:0.25,
    tags:["register","nominalisation",SEED_TAG],
    content:{ prompt:"Which sentence uses nominalisation to achieve academic register?",
      options:[
        {text:"An investigation into the causes of the decline was conducted by researchers.", isCorrect:true,  rationale:"\"Investigation\" and \"decline\" are nominalisations creating formal, dense academic prose."},
        {text:"The researchers investigated why things declined.",                             isCorrect:false, rationale:"Uses verbs and vague \"things\" — less academic."},
        {text:"They checked out why the numbers went down.",                                   isCorrect:false, rationale:"Colloquial idioms."},
        {text:"They had a look at the reason things got worse.",                               isCorrect:false, rationale:"Informal idioms."},
      ]}},

  // Lexical collocation (4)
  { cefrLevel:"C1", difficulty:1.1, discrimination:1.4, guessing:0.25,
    tags:["collocation","verb-noun",SEED_TAG],
    content:{ prompt:"\"The negotiations ___ a significant breakthrough last week.\" Which verb collocates?",
      options:[
        {text:"yielded",   isCorrect:true,  rationale:"\"Yield a breakthrough/result\" is a strong formal collocation."},
        {text:"made",      isCorrect:false, rationale:"\"Make a breakthrough\" is also correct but \"yielded\" is more advanced/formal."},
        {text:"did",       isCorrect:false, rationale:"\"Do a breakthrough\" is unidiomatic."},
        {text:"gave",      isCorrect:false, rationale:"\"Give a breakthrough\" is not a standard collocation."},
      ]}},
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["collocation","adjective-noun",SEED_TAG],
    content:{ prompt:"\"Her speech had a ___ impact on public opinion.\" (Very strong and deep effect)",
      options:[
        {text:"profound", isCorrect:true,  rationale:"\"Profound impact\" means deep and far-reaching."},
        {text:"heavy",    isCorrect:false, rationale:"\"Heavy impact\" is used physically — not standard with \"impact on opinion.\""},
        {text:"strong",   isCorrect:false, rationale:"\"Strong impact\" is possible but less precise than \"profound.\""},
        {text:"big",      isCorrect:false, rationale:"\"Big impact\" is informal."},
      ]}},
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["collocation","preposition-patterns",SEED_TAG],
    content:{ prompt:"\"The policy was ___ sharp criticism from opposition politicians.\"",
      options:[
        {text:"subjected to", isCorrect:true,  rationale:"\"Subject something to criticism/scrutiny\" is a standard formal collocation."},
        {text:"faced with",   isCorrect:false, rationale:"\"Faced with\" would require restructuring."},
        {text:"given to",     isCorrect:false, rationale:"\"Given to\" means inclined to do something habitually."},
        {text:"put under",    isCorrect:false, rationale:"\"Put under scrutiny\" is idiomatic but not \"put under criticism.\""},
      ]}},
  { cefrLevel:"C1", difficulty:1.3, discrimination:1.4, guessing:0.25,
    tags:["collocation","fixed-phrase","academic",SEED_TAG],
    content:{ prompt:"\"The study ___ important questions about data privacy in digital environments.\"",
      options:[
        {text:"raises",   isCorrect:true,  rationale:"\"Raise questions/concerns/issues\" is a key academic collocation."},
        {text:"lifts",    isCorrect:false, rationale:"\"Lift questions\" is not idiomatic."},
        {text:"asks",     isCorrect:false, rationale:"\"Ask questions\" requires a human subject."},
        {text:"produces", isCorrect:false, rationale:"\"Produce questions\" is not a standard collocation."},
      ]}},

  // Apposition and post-modification (3)
  { cefrLevel:"C1", difficulty:1.1, discrimination:1.4, guessing:0.25,
    tags:["apposition","noun-phrase",SEED_TAG],
    content:{ prompt:"\"The Prime Minister, ___ of the Conservative Party, announced the new policy.\" (Appositive)",
      options:[
        {text:"leader",        isCorrect:true,  rationale:"A noun phrase in apposition re-identifies the subject — standard appositive construction."},
        {text:"who is leader", isCorrect:false, rationale:"\"Who is leader\" introduces a relative clause, not a noun phrase appositive."},
        {text:"being leader",  isCorrect:false, rationale:"\"Being leader\" introduces a participial clause."},
        {text:"as leader",     isCorrect:false, rationale:"\"As leader\" is a prepositional phrase — not apposition."},
      ]}},
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["post-modification","infinitive",SEED_TAG],
    content:{ prompt:"Which noun phrase has the correct post-modification?",
      options:[
        {text:"the decision to relocate the headquarters to Dublin",    isCorrect:true,  rationale:"\"The decision to + infinitive\" — standard infinitive post-modification of abstract nouns."},
        {text:"the decision of relocating the headquarters to Dublin",  isCorrect:false, rationale:"\"Decision of + gerund\" is non-standard; correct is \"decision to\" or \"decision about.\""},
        {text:"the deciding to relocate the headquarters to Dublin",    isCorrect:false, rationale:"\"Deciding\" as head noun requires different structure."},
        {text:"the decision for relocating the headquarters to Dublin", isCorrect:false, rationale:"\"Decision for + gerund\" is not standard."},
      ]}},
  { cefrLevel:"C1", difficulty:1.3, discrimination:1.4, guessing:0.25,
    tags:["post-modification","reduced-relative",SEED_TAG],
    content:{ prompt:"\"The candidates ___ for the final round will be notified by email.\" (Reduced relative)",
      options:[
        {text:"selected",        isCorrect:true,  rationale:"\"Candidates selected for…\" is a reduced passive relative clause (\"who were selected\")."},
        {text:"who are selecting", isCorrect:false, rationale:"Active clause — candidates do not select themselves."},
        {text:"selecting",       isCorrect:false, rationale:"Active participle implies candidates are selecting others."},
        {text:"select",          isCorrect:false, rationale:"Bare verb is not used in reduced relative clauses."},
      ]}},

  // Cohesion and reference (3)
  { cefrLevel:"C1", difficulty:1.1, discrimination:1.4, guessing:0.25,
    tags:["cohesion","anaphoric-reference",SEED_TAG],
    content:{ prompt:"\"The government announced new funding for education. ___ move was widely welcomed by teachers.\" (Anaphora)",
      options:[
        {text:"This",   isCorrect:true,  rationale:"\"This\" refers anaphorically to the announcement — a common cohesion device."},
        {text:"Their",  isCorrect:false, rationale:"\"Their move\" works but is possessive — \"this\" is a cleaner anaphoric demonstrative."},
        {text:"Such a", isCorrect:false, rationale:"\"Such a move\" evaluates or categorises — slightly different function."},
        {text:"A",      isCorrect:false, rationale:"\"A move\" is indefinite — does not signal anaphoric reference."},
      ]}},
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["cohesion","lexical-reiteration",SEED_TAG],
    content:{ prompt:"\"The scientists discovered a new protein. The ___ was found to block viral replication.\" (Lexical chain — superordinate noun)",
      options:[
        {text:"substance", isCorrect:true,  rationale:"\"Substance\" is a superordinate lexical reiteration of \"protein,\" maintaining cohesion."},
        {text:"one",       isCorrect:false, rationale:"\"One\" is a general substitute but less lexically precise in academic text."},
        {text:"thing",     isCorrect:false, rationale:"\"Thing\" is too vague for academic register."},
        {text:"it",        isCorrect:false, rationale:"\"It\" works for reference but the question targets lexical reiteration."},
      ]}},
  { cefrLevel:"C1", difficulty:1.3, discrimination:1.4, guessing:0.25,
    tags:["cohesion","ellipsis",SEED_TAG],
    content:{ prompt:"\"The report could have been more thorough, and the presentation ___ too.\" (VP ellipsis)",
      options:[
        {text:"could have been", isCorrect:true,  rationale:"Full VP ellipsis: \"the presentation could have been [more thorough] too.\""},
        {text:"could",          isCorrect:false, rationale:"Partial auxiliary alone does not fully recover the VP in formal writing."},
        {text:"was",            isCorrect:false, rationale:"\"Was\" changes tense and modal meaning."},
        {text:"had been",       isCorrect:false, rationale:"\"Had been\" changes aspect."},
      ]}},

  // It-extraposition (3)
  { cefrLevel:"C1", difficulty:1.1, discrimination:1.4, guessing:0.25,
    tags:["extraposition","it-that-clause",SEED_TAG],
    content:{ prompt:"\"___ widely accepted that the policy needs revision.\" (Extraposition with passive)",
      options:[
        {text:"It is",    isCorrect:true,  rationale:"\"It is + adjective/passive + that-clause\" is extraposition."},
        {text:"This is",  isCorrect:false, rationale:"\"This is\" changes reference function."},
        {text:"There is", isCorrect:false, rationale:"\"There is\" introduces existential sentences."},
        {text:"That is",  isCorrect:false, rationale:"\"That is widely accepted that…\" is ungrammatical."},
      ]}},
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["extraposition","it-adjective-infinitive",SEED_TAG],
    content:{ prompt:"\"___ difficult to predict the long-term effects of this intervention.\"",
      options:[
        {text:"It is",    isCorrect:true,  rationale:"\"It is + adjective + to-infinitive\" — extraposition delays the real subject."},
        {text:"This is",  isCorrect:false, rationale:"\"This is difficult to predict\" changes meaning: \"this\" = a specific referent."},
        {text:"There is", isCorrect:false, rationale:"\"There is difficult\" is ungrammatical."},
        {text:"To",       isCorrect:false, rationale:"\"To predict…is difficult\" reverses the sentence (no extraposition)."},
      ]}},
  { cefrLevel:"C1", difficulty:1.3, discrimination:1.4, guessing:0.25,
    tags:["extraposition","it-worth",SEED_TAG],
    content:{ prompt:"\"___ worth bearing in mind that correlation does not imply causation.\"",
      options:[
        {text:"It is",   isCorrect:true,  rationale:"\"It is worth + gerund\" is an idiomatic extraposition structure common in academic writing."},
        {text:"This is", isCorrect:false, rationale:"\"This is worth bearing in mind\" — valid but \"it\" is the conventional extraposition marker."},
        {text:"That is", isCorrect:false, rationale:"\"That is worth bearing in mind that…\" — double \"that\" is ungrammatical."},
        {text:"What is", isCorrect:false, rationale:"\"What is worth bearing in mind is that…\" is a different (pseudo-cleft) structure."},
      ]}},

  // Advanced nominalisation (2)
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["nominalisation","deverbal",SEED_TAG],
    content:{ prompt:"The committee approved the plan. → The committee's ___ of the plan had significant consequences.",
      options:[
        {text:"approval",   isCorrect:true,  rationale:"\"Approval\" (deverbal nominalisation from \"approve\") converts the verbal action into a noun phrase."},
        {text:"approving",  isCorrect:false, rationale:"\"Approving\" is a gerund — also nominalised, but \"approval\" is the standard deverbal noun form."},
        {text:"approve",    isCorrect:false, rationale:"\"Approve\" is the base verb form."},
        {text:"approvance", isCorrect:false, rationale:"\"Approvance\" is not a standard English noun form."},
      ]}},
  { cefrLevel:"C1", difficulty:1.3, discrimination:1.4, guessing:0.25,
    tags:["nominalisation","deadjectival",SEED_TAG],
    content:{ prompt:"\"The situation is complex. → The ___ of the situation requires careful analysis.\"",
      options:[
        {text:"complexity",   isCorrect:true,  rationale:"\"Complexity\" is the deadjectival nominalisation from \"complex.\""},
        {text:"complexness",  isCorrect:false, rationale:"\"Complexness\" is not standard; \"complexity\" is preferred."},
        {text:"complication", isCorrect:false, rationale:"\"Complication\" implies a problem/obstacle, not the state of being complex."},
        {text:"complex",      isCorrect:false, rationale:"\"Complex\" is the adjective — cannot function as a noun here."},
      ]}},

  // Parallel structures and comparative (3 extra C1)
  { cefrLevel:"C1", difficulty:1.1, discrimination:1.4, guessing:0.25,
    tags:["parallel-structures","coordination",SEED_TAG],
    content:{ prompt:"Which sentence is grammatically parallel?",
      options:[
        {text:"She is intelligent, articulate, and highly motivated.",              isCorrect:true,  rationale:"Three coordinated adjectives in parallel structure."},
        {text:"She is intelligent, articulate, and has high motivation.",            isCorrect:false, rationale:"Mixes adjective (intelligent), adjective (articulate), and VP (has motivation) — non-parallel."},
        {text:"She is intelligent, has articulate speech, and highly motivated.",   isCorrect:false, rationale:"Mixed structures — adjective, VP, adjective."},
        {text:"She has intelligence, she speaks articulately, and motivation.",      isCorrect:false, rationale:"Mixes NP, VP, and bare NP — non-parallel."},
      ]}},
  { cefrLevel:"C1", difficulty:1.2, discrimination:1.4, guessing:0.25,
    tags:["comparative","as-as","formal",SEED_TAG],
    content:{ prompt:"\"The results were ___ conclusive ___ the team had hoped.\" (As…as comparative)",
      options:[
        {text:"as / as",      isCorrect:true,  rationale:"\"As + adjective + as\" is the standard equality comparison structure."},
        {text:"so / as",      isCorrect:false, rationale:"\"So…as\" is used in negative comparisons: \"not so conclusive as.\""},
        {text:"more / than",  isCorrect:false, rationale:"\"More…than\" is the structure for inequality comparisons, not equality."},
        {text:"such / as",    isCorrect:false, rationale:"\"Such…as\" introduces examples or relative clauses, not degree comparisons."},
      ]}},
  { cefrLevel:"C1", difficulty:1.3, discrimination:1.4, guessing:0.25,
    tags:["discourse-markers","academic-signposting",SEED_TAG],
    content:{ prompt:"\"___ this evidence, it can be concluded that the intervention was effective.\" (Drawing on evidence)",
      options:[
        {text:"On the basis of",  isCorrect:true,  rationale:"\"On the basis of + noun phrase\" is a formal signposting expression introducing evidence for a conclusion."},
        {text:"On behalf of",     isCorrect:false, rationale:"\"On behalf of\" means acting as a representative — not related to evidence."},
        {text:"By means of",      isCorrect:false, rationale:"\"By means of\" describes the method or instrument used."},
        {text:"In the light of",  isCorrect:false, rationale:"\"In the light of\" is also correct here but was not the targeted answer."},
      ]}},

  // ── C2 (16 items) ──────────────────────────────────────────────────────────

  // Were-to conditionals (3)
  { cefrLevel:"C2", difficulty:1.5, discrimination:1.5, guessing:0.25,
    tags:["conditionals","were-to","formal-hypothetical",SEED_TAG],
    content:{ prompt:"\"___ the company to collapse, thousands of jobs would be at risk.\" (Inverted formal hypothetical)",
      options:[
        {text:"Were",   isCorrect:true,  rationale:"\"Were + subject + to-infinitive\" is an inverted formal conditional for remote hypotheticals."},
        {text:"Should", isCorrect:false, rationale:"\"Should the company collapse\" is the inverted form with \"should\" — a different structure."},
        {text:"Had",    isCorrect:false, rationale:"\"Had the company collapsed\" is the inverted third conditional (past fact)."},
        {text:"If",     isCorrect:false, rationale:"\"If\" introduces a standard conditional without inversion."},
      ]}},
  { cefrLevel:"C2", difficulty:1.6, discrimination:1.5, guessing:0.25,
    tags:["conditionals","were-to","inverted",SEED_TAG],
    content:{ prompt:"Which sentence uses the inverted \"were…to\" conditional correctly?",
      options:[
        {text:"Were the negotiations to fail, the parties would resort to arbitration.",      isCorrect:true,  rationale:"\"Were + subject + to-infinitive\" is the formal inverted conditional."},
        {text:"If the negotiations failed, the parties would resort to arbitration.",         isCorrect:false, rationale:"Standard second conditional — not the inverted form."},
        {text:"If the negotiations were to fail, the parties would resort to arbitration.",   isCorrect:false, rationale:"\"Were to fail\" in standard \"if\" clause — correct but not inverted."},
        {text:"Should the negotiations fail, the parties would resort to arbitration.",       isCorrect:false, rationale:"Inverted with \"should\" — a different formal pattern."},
      ]}},
  { cefrLevel:"C2", difficulty:1.7, discrimination:1.5, guessing:0.25,
    tags:["conditionals","inverted-past","had-been",SEED_TAG],
    content:{ prompt:"\"Had the treaty ___ signed, the war might have been averted.\" (Inverted third conditional)",
      options:[
        {text:"been",   isCorrect:true,  rationale:"\"Had + subject + been + pp\" is the inverted past counterfactual passive conditional."},
        {text:"be",     isCorrect:false, rationale:"\"Be\" is the present subjunctive — not used in past counterfactual (had…) structures."},
        {text:"was",    isCorrect:false, rationale:"\"Was\" is past indicative — \"had been\" is required."},
        {text:"being",  isCorrect:false, rationale:"\"Being\" is a continuous/participial form."},
      ]}},

  // Scope of negation (3)
  { cefrLevel:"C2", difficulty:1.5, discrimination:1.5, guessing:0.25,
    tags:["negation","scope","not-all",SEED_TAG],
    content:{ prompt:"\"Not all the participants agreed with the conclusion.\" What does this mean?",
      options:[
        {text:"Some participants agreed and some did not.",             isCorrect:true,  rationale:"\"Not all\" = partial negation: some agreed, some did not."},
        {text:"None of the participants agreed with the conclusion.",   isCorrect:false, rationale:"\"Not all\" is partial negation — it does not mean \"none.\""},
        {text:"All the participants disagreed with the conclusion.",    isCorrect:false, rationale:"\"Not all\" means partial disagreement, not total."},
        {text:"Most participants agreed, but not all details were correct.", isCorrect:false, rationale:"Misconstrues the scope — \"not all\" applies to participants."},
      ]}},
  { cefrLevel:"C2", difficulty:1.6, discrimination:1.5, guessing:0.25,
    tags:["negation","scope","only",SEED_TAG],
    content:{ prompt:"Compare: (A) \"Only the director approved the budget.\" (B) \"The director only approved the budget.\" How do they differ?",
      options:[
        {text:"(A) says no one else approved it; (B) says approval was all the director did.", isCorrect:true,  rationale:"\"Only\" in (A) has scope over the subject; in (B) it modifies the verb."},
        {text:"They have identical meaning.",                                                   isCorrect:false, rationale:"Placement of \"only\" changes scope and meaning significantly."},
        {text:"(A) is grammatically incorrect; (B) is standard.",                              isCorrect:false, rationale:"Both are grammatical — they differ in focus."},
        {text:"(A) applies to a specific budget; (B) implies approval was unexpected.",        isCorrect:false, rationale:"Neither implies unexpectedness — scope of \"only\" is the key difference."},
      ]}},
  { cefrLevel:"C2", difficulty:1.7, discrimination:1.5, guessing:0.25,
    tags:["negation","double-negation","rhetorical",SEED_TAG],
    content:{ prompt:"\"There is not a scientist who does not recognise the importance of peer review.\" What rhetorical effect does the double negative create?",
      options:[
        {text:"A stronger, more emphatic assertion that all scientists recognise its importance.",  isCorrect:true,  rationale:"Double negation = universal affirmative — used for rhetorical emphasis."},
        {text:"Ambiguity about whether scientists value peer review.",                             isCorrect:false, rationale:"Double negation resolves to a strong positive, not ambiguity."},
        {text:"A weakened claim through hedging.",                                                isCorrect:false, rationale:"Double negation intensifies, not weakens."},
        {text:"A grammatical error — double negatives are always non-standard.",                  isCorrect:false, rationale:"Double negatives for rhetorical emphasis are standard in formal English."},
      ]}},

  // Modal remoteness (3)
  { cefrLevel:"C2", difficulty:1.5, discrimination:1.5, guessing:0.25,
    tags:["modality","modal-remoteness","hedging",SEED_TAG],
    content:{ prompt:"\"The evidence ___ suggest that the original hypothesis was flawed.\" (Maximum epistemic hedging)",
      options:[
        {text:"would appear to",  isCorrect:true,  rationale:"\"Would appear to\" layers three hedging devices: modal remoteness, perceptual verb, infinitive."},
        {text:"appears to",       isCorrect:false, rationale:"\"Appears to\" hedges but lacks modal remoteness."},
        {text:"seems to",         isCorrect:false, rationale:"Similar to \"appears to\" — hedges but not maximally remote."},
        {text:"must",             isCorrect:false, rationale:"\"Must\" expresses certainty — the opposite of maximum hedging."},
      ]}},
  { cefrLevel:"C2", difficulty:1.6, discrimination:1.5, guessing:0.25,
    tags:["modality","dare","semi-modal",SEED_TAG],
    content:{ prompt:"\"She ___ not speak above a whisper in the library.\" (Semi-modal in formal/literary context)",
      options:[
        {text:"dare",   isCorrect:true,  rationale:"\"Dare not\" used as a semi-modal (without \"to\") is a formal/literary construction."},
        {text:"dares",  isCorrect:false, rationale:"\"Dares not\" is non-standard; the semi-modal \"dare not\" takes no third-person -s."},
        {text:"needs",  isCorrect:false, rationale:"\"Needs not\" is the semi-modal form of \"need\" — possible but \"dare not\" fits better."},
        {text:"can",    isCorrect:false, rationale:"\"Cannot speak\" expresses ability/permission, not the nuance of daring."},
      ]}},
  { cefrLevel:"C2", difficulty:1.7, discrimination:1.5, guessing:0.25,
    tags:["modality","might-well","epistemic",SEED_TAG],
    content:{ prompt:"\"The manuscript ___ well have been lost in the fire.\" What nuance does \"might well\" add?",
      options:[
        {text:"Strengthens possibility — quite likely though still uncertain.",  isCorrect:true,  rationale:"\"Might well\" is an intensified epistemic possibility — stronger than plain \"might.\""},
        {text:"Weakens the claim, making it more hypothetical.",                 isCorrect:false, rationale:"\"Might well\" intensifies, not weakens."},
        {text:"Equivalent in meaning to plain \"might.\"",                       isCorrect:false, rationale:"\"Might well\" adds \"well\" which increases likelihood."},
        {text:"Introduces a concessive meaning.",                                isCorrect:false, rationale:"\"Might well\" does not introduce concession."},
      ]}},

  // Rhetorical parallelism (3)
  { cefrLevel:"C2", difficulty:1.5, discrimination:1.5, guessing:0.25,
    tags:["rhetoric","anaphora",SEED_TAG],
    content:{ prompt:"\"We shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields.\" This demonstrates:",
      options:[
        {text:"Anaphora — repetition of an identical phrase at the start of successive clauses.", isCorrect:true,  rationale:"Anaphora is the rhetorical figure for beginning-repetition in successive clauses."},
        {text:"Epistrophe — repetition at the end of successive clauses.",                        isCorrect:false, rationale:"Epistrophe is end-repetition. This is beginning-repetition."},
        {text:"Chiasmus — reversal of syntactic structure across clauses.",                        isCorrect:false, rationale:"Chiasmus reverses order (A-B / B-A). No reversal here."},
        {text:"Syllepsis — one word governs two clauses with different meanings.",                 isCorrect:false, rationale:"Syllepsis involves a word used in two senses simultaneously."},
      ]}},
  { cefrLevel:"C2", difficulty:1.6, discrimination:1.5, guessing:0.25,
    tags:["rhetoric","parallelism","grammar",SEED_TAG],
    content:{ prompt:"Which sentence maintains strict grammatical parallelism?",
      options:[
        {text:"The plan requires identifying risks, allocating resources, and monitoring progress.",                   isCorrect:true,  rationale:"Three gerunds — perfect parallel structure."},
        {text:"The plan requires identifying risks, to allocate resources, and monitoring progress.",                 isCorrect:false, rationale:"Mixed forms (gerund, infinitive, gerund) — not parallel."},
        {text:"The plan requires that we identify risks, resources should be allocated, and to monitor progress.",    isCorrect:false, rationale:"Three different clause types — non-parallel."},
        {text:"The plan requires identifying risks, that resources be allocated, and progress should be monitored.", isCorrect:false, rationale:"Mixed structures — non-parallel."},
      ]}},
  { cefrLevel:"C2", difficulty:1.7, discrimination:1.5, guessing:0.25,
    tags:["rhetoric","periodic-sentence",SEED_TAG],
    content:{ prompt:"A periodic sentence is one where:",
      options:[
        {text:"The main clause is delayed until the end, with subordinate material front-loaded for suspense.", isCorrect:true,  rationale:"A periodic sentence builds to its main point at the end."},
        {text:"The main clause comes first and subordinate clauses follow.",                                    isCorrect:false, rationale:"This describes a \"loose\" or cumulative sentence."},
        {text:"It contains exactly one independent and one dependent clause.",                                  isCorrect:false, rationale:"This defines a complex sentence by structure, not rhetorical form."},
        {text:"The same clause is repeated at intervals throughout the paragraph.",                             isCorrect:false, rationale:"This describes anaphora or refrain."},
      ]}},

  // Gradability (2)
  { cefrLevel:"C2", difficulty:1.5, discrimination:1.5, guessing:0.25,
    tags:["gradability","ungradable",SEED_TAG],
    content:{ prompt:"Which pairing of adjective and degree adverb is grammatically non-standard?",
      options:[
        {text:"\"very furious\"",       isCorrect:true,  rationale:"\"Furious\" is extreme/ungradable — cannot be intensified with \"very.\" Use \"absolutely furious.\""},
        {text:"\"absolutely furious\"", isCorrect:false, rationale:"\"Absolutely\" is the correct amplifier for extreme adjectives."},
        {text:"\"slightly warm\"",      isCorrect:false, rationale:"\"Warm\" is gradable; \"slightly warm\" is standard."},
        {text:"\"completely empty\"",   isCorrect:false, rationale:"\"Completely empty\" is idiomatic."},
      ]}},
  { cefrLevel:"C2", difficulty:1.6, discrimination:1.5, guessing:0.25,
    tags:["gradability","classifying-adjective",SEED_TAG],
    content:{ prompt:"Which sentence is grammatically odd because it treats a classifying adjective as gradable?",
      options:[
        {text:"\"The discovery was quite unique to this region.\"", isCorrect:true,  rationale:"\"Unique\" is absolute/classifying — either unique or not; \"quite unique\" is non-standard."},
        {text:"\"The meeting was rather formal.\"",                 isCorrect:false, rationale:"\"Formal\" is gradable; \"rather formal\" is standard."},
        {text:"\"The room felt absolutely enormous.\"",            isCorrect:false, rationale:"\"Absolutely enormous\" amplifies an extreme adjective correctly."},
        {text:"\"Her response was slightly evasive.\"",            isCorrect:false, rationale:"\"Evasive\" is gradable; \"slightly evasive\" is standard."},
      ]}},

  // Absolute clauses and stance adverbs (2)
  { cefrLevel:"C2", difficulty:1.6, discrimination:1.5, guessing:0.25,
    tags:["adverbials","absolute-clause",SEED_TAG],
    content:{ prompt:"\"The report having been filed, the auditors left for the weekend.\" What structure does the opening phrase exemplify?",
      options:[
        {text:"An absolute clause: a noun phrase + participle with its own subject, distinct from the main clause.", isCorrect:true,  rationale:"\"The report having been filed\" is an absolute clause — it has its own subject (\"the report\") separate from the matrix subject."},
        {text:"A dangling participle: the participle lacks a proper subject.",                                       isCorrect:false, rationale:"An absolute clause has its own expressed subject; it is not dangling."},
        {text:"A reduced relative clause modifying \"report.\"",                                                    isCorrect:false, rationale:"A relative clause modifies a noun within the main clause."},
        {text:"An inverted conditional: \"if the report had been filed.\"",                                         isCorrect:false, rationale:"An absolute clause is not a conditional."},
      ]}},
  { cefrLevel:"C2", difficulty:1.7, discrimination:1.5, guessing:0.25,
    tags:["adverbials","stance-adverb",SEED_TAG],
    content:{ prompt:"\"Unsurprisingly, the study confirmed what most practitioners already suspected.\" The adverb \"unsurprisingly\" is best described as:",
      options:[
        {text:"A stance adverb: signals the speaker's attitude to the truth of the proposition.", isCorrect:true,  rationale:"Stance adverbs (frankly, unsurprisingly, arguably) express the speaker's evaluation."},
        {text:"A manner adverb: describes how the study confirmed the finding.",                  isCorrect:false, rationale:"A manner adverb modifies the verb action. \"Unsurprisingly\" evaluates, not describes manner."},
        {text:"A frequency adverb: indicates how often the confirmation happens.",               isCorrect:false, rationale:"Frequency adverbs (often, rarely) express how often."},
        {text:"A focusing adverb: highlights the subject of the sentence.",                      isCorrect:false, rationale:"Focusing adverbs (only, even, also) highlight particular elements."},
      ]}},
];

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set."); process.exit(1); }

  if (DRY_RUN) {
    console.log(`DRY_RUN: would insert ${items.length} grammar items`);
    const byLevel: Record<string,number> = {};
    for (const i of items) byLevel[i.cefrLevel] = (byLevel[i.cefrLevel]||0)+1;
    console.table(byLevel);
    return;
  }

  if (FORCE) {
    const del = await prisma.item.deleteMany({ where:{ tags:{ has:SEED_TAG } } });
    console.log(`Deleted ${del.count} items tagged [${SEED_TAG}]`);
  }

  const existing = await prisma.item.count({ where:{ tags:{ has:SEED_TAG } } });
  if (existing > 0 && !FORCE) { console.log(`${existing} items already seeded. Use FORCE=1.`); return; }

  let inserted = 0;
  for (const item of items) {
    await prisma.item.create({
      data:{
        skill: "GRAMMAR" as any,
        cefrLevel: item.cefrLevel as any,
        type: "MULTIPLE_CHOICE" as any,
        status: "ACTIVE",
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: item.guessing,
        tags: item.tags,
        content: item.content,
      },
    });
    inserted++;
  }

  const totals: Record<string,number> = {};
  for (const i of items) totals[i.cefrLevel] = (totals[i.cefrLevel]||0)+1;
  console.log(`\nInserted ${inserted} grammar items`);
  console.table(totals);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
