/**
 * PHASE 2 — Chapter 3
 * Topics: All twelve English tenses + Sequence of Tenses
 * 5 questions per tense/topic
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const items = [
  // ── PRESENT CONTINUOUS ──────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['tenses', 'present-continuous'],
    content: {
      prompt: '"She ____ a novel at the moment." Choose the correct form.',
      options: [
        { text: 'is writing',   isCorrect: true,  rationale: 'Present continuous expresses an activity in progress at the moment of speaking.' },
        { text: 'writes',       isCorrect: false, rationale: 'Simple present denotes habit or general truth, not current progression.' },
        { text: 'has written',  isCorrect: false, rationale: 'Present perfect indicates completed action with present relevance.' },
        { text: 'wrote',        isCorrect: false, rationale: 'Past simple places the action in the past.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['tenses', 'present-continuous', 'stative-dynamic'],
    content: {
      prompt: 'Which sentence is INCORRECT because of misuse of the present continuous?',
      options: [
        { text: 'She is knowing the answer.',      isCorrect: true,  rationale: '"Know" is a stative verb; the progressive form is ungrammatical in standard English.' },
        { text: 'She is reading the report.',      isCorrect: false, rationale: '"Read" is dynamic — progressive is correct.' },
        { text: 'She is being rude today.',        isCorrect: false, rationale: '"Be" can be used in the progressive when describing temporary behaviour.' },
        { text: 'She is always losing her keys.',  isCorrect: false, rationale: 'Progressive + frequency adverb is used for irritating habits.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'present-continuous', 'future-arrangement'],
    content: {
      prompt: '"We ____ the team tomorrow at 9 a.m." (arrangement already made) Select the best form.',
      options: [
        { text: 'are meeting',   isCorrect: true,  rationale: 'Present continuous expresses a fixed future arrangement.' },
        { text: 'will meet',     isCorrect: false, rationale: '"Will" is for spontaneous decisions; "are meeting" signals a prior plan.' },
        { text: 'meet',          isCorrect: false, rationale: 'Simple present for future is used for timetables, not personal arrangements.' },
        { text: 'had met',       isCorrect: false, rationale: 'Past perfect is inappropriate for a future event.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'present-continuous', 'always-irritating'],
    content: {
      prompt: 'Which sentence best conveys IRRITATION or criticism?',
      options: [
        { text: 'He is always borrowing money without paying it back.',   isCorrect: true,  rationale: '"Always" + present continuous expresses the speaker\'s annoyance at a repeated habit.' },
        { text: 'He always borrows money without paying it back.',        isCorrect: false, rationale: 'Simple present states the fact neutrally without emotional charge.' },
        { text: 'He has always borrowed money without paying it back.',   isCorrect: false, rationale: 'Present perfect with "always" describes life-long behaviour, not irritation.' },
        { text: 'He was always borrowing money without paying it back.',  isCorrect: false, rationale: 'Past continuous + always = past irritation, not present.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'present-continuous', 'changing-situation'],
    content: {
      prompt: '"Global temperatures ____ at an alarming rate." Which form best signals a changing trend?',
      options: [
        { text: 'are rising',   isCorrect: true,  rationale: 'Present continuous can mark a gradual change in progress.' },
        { text: 'rise',         isCorrect: false, rationale: 'Simple present would be a general scientific law, not an ongoing trend.' },
        { text: 'have risen',   isCorrect: false, rationale: 'Present perfect indicates a result up to now, not the ongoing change.' },
        { text: 'rose',         isCorrect: false, rationale: 'Past simple places the action in the past.' },
      ],
    },
  },

  // ── SIMPLE PRESENT ──────────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -1.4, discrimination: 0.9, guessing: 0.25,
    tags: ['tenses', 'simple-present'],
    content: {
      prompt: '"Water ____ at 100°C at sea level." Choose the correct form.',
      options: [
        { text: 'boils',       isCorrect: true,  rationale: 'Simple present expresses a scientific fact/general truth.' },
        { text: 'is boiling',  isCorrect: false, rationale: 'Progressive implies a temporary on-going action, not a permanent truth.' },
        { text: 'boiled',      isCorrect: false, rationale: 'Past simple incorrectly situates the truth in the past.' },
        { text: 'will boil',   isCorrect: false, rationale: '"Will" is for predictions, not permanent truths.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.0, guessing: 0.25,
    tags: ['tenses', 'simple-present', 'directive'],
    content: {
      prompt: '"The bus ____ the central station at 7:45." (timetable) Which form is correct?',
      options: [
        { text: 'leaves',       isCorrect: true,  rationale: 'Simple present is used for scheduled future events on timetables.' },
        { text: 'is leaving',   isCorrect: false, rationale: 'Present continuous is for personal arrangements, not timetables.' },
        { text: 'will leave',   isCorrect: false, rationale: '"Will" is for predictions/spontaneous decisions, not set timetables.' },
        { text: 'has left',     isCorrect: false, rationale: 'Present perfect refers to a past action with present relevance.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'simple-present', 'historic-present'],
    content: {
      prompt: '"Napoleon marches into Moscow and finds the city abandoned." This use of the present tense is called:',
      options: [
        { text: 'Historic present (narrative present)',  isCorrect: true,  rationale: 'The historic present vividly recounts past events as if occurring now.' },
        { text: 'Present continuous for future',         isCorrect: false, rationale: 'No progressive form is used.' },
        { text: 'Timeless present for general truths',  isCorrect: false, rationale: 'This is not a general truth; it is a specific historical event.' },
        { text: 'Habitual present',                     isCorrect: false, rationale: 'Habitual present describes repeated actions, not single past events.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'simple-present', 'conditional'],
    content: {
      prompt: '"If you heat ice, it ____." Which form completes a Type-0 conditional?',
      options: [
        { text: 'melts',       isCorrect: true,  rationale: 'Type-0 conditional uses simple present in both clauses for universal truths.' },
        { text: 'will melt',   isCorrect: false, rationale: '"Will melt" is for Type-1 conditionals expressing future possibility.' },
        { text: 'would melt',  isCorrect: false, rationale: '"Would melt" belongs to Type-2 hypothetical conditionals.' },
        { text: 'melted',      isCorrect: false, rationale: 'Past simple is used in the if-clause of Type-2, not the result clause.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'simple-present', 'performative'],
    content: {
      prompt: '"I hereby declare the session open." The verb "declare" here exemplifies a:',
      options: [
        { text: 'Performative use of the simple present',  isCorrect: true,  rationale: 'Performative verbs accomplish an action in the very utterance of the sentence.' },
        { text: 'Stative present describing a state',      isCorrect: false, rationale: 'Stative presents describe permanent states, not speech acts.' },
        { text: 'Historic present',                         isCorrect: false, rationale: 'Historic present narrates past events.' },
        { text: 'Habitual present',                         isCorrect: false, rationale: 'Habitual present describes regular repeated actions.' },
      ],
    },
  },

  // ── SIMPLE PAST ─────────────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    tags: ['tenses', 'simple-past'],
    content: {
      prompt: '"She ____ the report before she left the office." Choose the correct form.',
      options: [
        { text: 'finished',         isCorrect: true,  rationale: 'Simple past is appropriate for a completed action at a specific past time.' },
        { text: 'had finished',     isCorrect: false, rationale: 'Past perfect would stress that it was completed before another past reference, which is possible but the simpler tense is preferred here.' },
        { text: 'has finished',     isCorrect: false, rationale: 'Present perfect cannot be used with a past time reference.' },
        { text: 'was finishing',    isCorrect: false, rationale: 'Past continuous emphasises an on-going activity, not a completed one.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['tenses', 'simple-past', 'used-to'],
    content: {
      prompt: '"We ____ visit our grandparents every Sunday when we were children." Which is most natural?',
      options: [
        { text: 'used to',   isCorrect: true,  rationale: '"Used to" expresses a discontinued past habit.' },
        { text: 'would',     isCorrect: false, rationale: '"Would" can express past habits but requires prior context; "used to" is more natural for first mention.' },
        { text: 'did',       isCorrect: false, rationale: '"Did visit" is emphatic simple past, not a habitual form.' },
        { text: 'were',      isCorrect: false, rationale: '"Were visiting" is past continuous, not habitual.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'simple-past', 'narrative'],
    content: {
      prompt: 'In a narrative of sequential past events, which tense is predominantly used?',
      options: [
        { text: 'Simple past',            isCorrect: true,  rationale: 'Simple past chains events in temporal order in narrative.' },
        { text: 'Past continuous',        isCorrect: false, rationale: 'Past continuous provides background setting, not the main narrative chain.' },
        { text: 'Past perfect',           isCorrect: false, rationale: 'Past perfect signals prior events, not the main narrative sequence.' },
        { text: 'Present perfect',        isCorrect: false, rationale: 'Present perfect connects past to present; it does not sequence narrative events.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'simple-past', 'reporting'],
    content: {
      prompt: '"I am tired," she said. In reported speech at B2 level, this becomes:',
      options: [
        { text: 'She said she was tired.',           isCorrect: true,  rationale: 'Backshift: present simple → past simple in reported speech.' },
        { text: 'She said she is tired.',            isCorrect: false, rationale: 'Backshift rule requires changing to past tense.' },
        { text: 'She said she has been tired.',      isCorrect: false, rationale: 'Present perfect is the backshift of present perfect, not simple present.' },
        { text: 'She told she was tired.',           isCorrect: false, rationale: '"Tell" requires an indirect object: "She told me she was tired."' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'simple-past', 'irregular'],
    content: {
      prompt: 'Which sentence contains an INCORRECT past simple form?',
      options: [
        { text: 'She lied down on the sofa and slept.',   isCorrect: true,  rationale: '"Lied down" is wrong; the correct past of "lie (recline)" is "lay".' },
        { text: 'She lay down on the sofa and slept.',    isCorrect: false, rationale: '"Lay" is the correct simple past of "lie (recline)".' },
        { text: 'He laid the book on the table.',         isCorrect: false, rationale: '"Laid" is the correct past of "lay (place)" — both forms are present here correctly.' },
        { text: 'The hen laid three eggs.',               isCorrect: false, rationale: '"Laid" is the correct past of "lay (produce eggs)".' },
      ],
    },
  },

  // ── PAST CONTINUOUS ─────────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['tenses', 'past-continuous'],
    content: {
      prompt: '"When she called, I ____ dinner." Which form best expresses the interrupted activity?',
      options: [
        { text: 'was cooking',  isCorrect: true,  rationale: 'Past continuous expresses an ongoing action interrupted by a simple-past event.' },
        { text: 'cooked',       isCorrect: false, rationale: 'Simple past would imply two sequential completed actions.' },
        { text: 'had cooked',   isCorrect: false, rationale: 'Past perfect implies the cooking was completed before the call.' },
        { text: 'cook',         isCorrect: false, rationale: 'Present form cannot describe a past interrupted action.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['tenses', 'past-continuous', 'parallel-actions'],
    content: {
      prompt: '"While she was writing the report, her colleague ____ the data." Which form best shows TWO actions in progress simultaneously?',
      options: [
        { text: 'was analysing',   isCorrect: true,  rationale: 'Two past continuous verbs show parallel ongoing actions at the same time.' },
        { text: 'analysed',        isCorrect: false, rationale: 'Simple past would imply the analysis was completed at a point, not running in parallel.' },
        { text: 'had analysed',    isCorrect: false, rationale: 'Past perfect would indicate the analysis was completed before the writing.' },
        { text: 'analyses',        isCorrect: false, rationale: 'Present tense is inconsistent with the past narrative.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'past-continuous', 'background'],
    content: {
      prompt: 'In "It was a cold winter evening. Snow was falling gently and children were playing in the street," the past continuous verbs primarily:',
      options: [
        { text: 'Set the scene (background) for a narrative.',  isCorrect: true,  rationale: 'Past continuous creates background atmosphere, not the main events.' },
        { text: 'Describe the main events of the story.',       isCorrect: false, rationale: 'Main events are expressed with simple past.' },
        { text: 'Indicate habits in the past.',                 isCorrect: false, rationale: '"Used to" or simple past with frequency adverbs are used for past habits.' },
        { text: 'Express interrupted actions.',                 isCorrect: false, rationale: 'No interruption is present — they are background descriptions.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'past-continuous', 'irritation'],
    content: {
      prompt: '"He was constantly interrupting the presentation with irrelevant questions." The past continuous + "constantly" here expresses:',
      options: [
        { text: 'Criticism or annoyance about a past repeated behaviour.',  isCorrect: true,  rationale: 'Past continuous + frequency adverbs like "constantly/always" express past irritation.' },
        { text: 'A single prolonged action in the past.',                   isCorrect: false, rationale: '"Constantly" suggests repetition, not a single prolonged event.' },
        { text: 'A past habit that no longer exists.',                      isCorrect: false, rationale: '"Used to" or "would" are the standard forms for past habits.' },
        { text: 'An action interrupted by another.',                        isCorrect: false, rationale: 'There is no interrupting event in this sentence.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'past-continuous', 'future-in-past'],
    content: {
      prompt: '"She was leaving for Paris the following morning." In this sentence, "was leaving" expresses:',
      options: [
        { text: 'A planned future event viewed from a past moment.',   isCorrect: true,  rationale: 'Past continuous can express a future arrangement as seen from a past perspective.' },
        { text: 'An interrupted past action.',                         isCorrect: false, rationale: 'No interruption is present.' },
        { text: 'A past abandoned plan.',                              isCorrect: false, rationale: '"Was going to" typically expresses an abandoned plan, not present continuous.' },
        { text: 'A background setting for a narrative.',               isCorrect: false, rationale: 'The sentence focuses on a planned event, not background atmosphere.' },
      ],
    },
  },

  // ── PRESENT PERFECT ─────────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['tenses', 'present-perfect'],
    content: {
      prompt: '"____ you ever ____ sushi?" Complete with the correct form.',
      options: [
        { text: 'Have / tried',   isCorrect: true,  rationale: 'Present perfect is used for life experiences up to now.' },
        { text: 'Did / try',      isCorrect: false, rationale: 'Simple past requires a specific past time reference.' },
        { text: 'Have / try',     isCorrect: false, rationale: '"Try" is the base form; past participle "tried" is needed.' },
        { text: 'Are / trying',   isCorrect: false, rationale: 'Present continuous expresses a current activity, not a life experience.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'present-perfect', 'since-for'],
    content: {
      prompt: '"She has worked here ____ 2019." Which time expression is correct?',
      options: [
        { text: 'since',  isCorrect: true,  rationale: '"Since" introduces the starting point of a period continuing to the present.' },
        { text: 'for',    isCorrect: false, rationale: '"For" introduces the duration, not the starting point ("for five years").' },
        { text: 'ago',    isCorrect: false, rationale: '"Ago" is used with simple past, not present perfect.' },
        { text: 'during', isCorrect: false, rationale: '"During" introduces a period, not a starting point.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'present-perfect', 'hot-news'],
    content: {
      prompt: '"The president has just signed the peace treaty." This present perfect use is called:',
      options: [
        { text: 'Hot news — a recent event with current relevance.',   isCorrect: true,  rationale: '"Just" + present perfect announces a very recent event.' },
        { text: 'Experiential — a life experience.',                   isCorrect: false, rationale: 'Experiential use focuses on whether someone has done something in their lifetime.' },
        { text: 'Continuative — an action still in progress.',         isCorrect: false, rationale: 'Continuative use is marked by "since" or "for" and an ongoing state/action.' },
        { text: 'Resultative — the result of a past action.',          isCorrect: false, rationale: '"Just signed" emphasises recentness, not a resulting state presently visible.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'present-perfect', 'american-british'],
    content: {
      prompt: 'In American English, "Did you eat yet?" is acceptable. In British English, the preferred form is:',
      options: [
        { text: 'Have you eaten yet?',  isCorrect: true,  rationale: 'British English uses present perfect with "yet" for recent past with present relevance.' },
        { text: 'Have you eat yet?',    isCorrect: false, rationale: '"Eat" is not the past participle; "eaten" is required.' },
        { text: 'Did you eaten yet?',   isCorrect: false, rationale: 'Mixing past auxiliary "did" with past participle is ungrammatical.' },
        { text: 'Do you eat yet?',      isCorrect: false, rationale: 'Simple present is incorrect for a reference to a recent completed action.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'present-perfect', 'resultative'],
    content: {
      prompt: '"Someone has broken the window." The focus of this present perfect is on:',
      options: [
        { text: 'The present state: the window is broken now.',             isCorrect: true,  rationale: 'Resultative present perfect stresses the current result of a past action.' },
        { text: 'The specific time the window was broken.',                 isCorrect: false, rationale: 'Simple past is used when the time is specified or focused.' },
        { text: 'The doer\'s life experience of breaking windows.',        isCorrect: false, rationale: 'Experiential use focuses on personal experience, not a present result.' },
        { text: 'A hot-news announcement of a very recent event.',         isCorrect: false, rationale: '"Just" or "just now" typically marks hot-news use.' },
      ],
    },
  },

  // ── PRESENT PERFECT CONTINUOUS ───────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ['tenses', 'present-perfect-continuous'],
    content: {
      prompt: '"She looks exhausted. She ____ all night." Choose the most natural form.',
      options: [
        { text: 'has been studying',   isCorrect: true,  rationale: 'Present perfect continuous stresses the duration of an activity leading to a present result.' },
        { text: 'has studied',         isCorrect: false, rationale: 'Present perfect simple emphasises completion/result, not the ongoing duration.' },
        { text: 'was studying',        isCorrect: false, rationale: 'Past continuous does not connect to the present state "looks exhausted".' },
        { text: 'had been studying',   isCorrect: false, rationale: 'Past perfect continuous is for duration before a past reference point, not the present.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'present-perfect-continuous', 'simple-vs-continuous'],
    content: {
      prompt: '"I have written three reports today." vs "I have been writing reports all morning." What is the PRIMARY difference?',
      options: [
        { text: 'Simple stresses completion/number; continuous stresses duration/ongoing activity.',  isCorrect: true,  rationale: 'Present perfect simple = countable result; continuous = emphasis on time span.' },
        { text: 'Both forms are completely interchangeable.',                                          isCorrect: false, rationale: 'They differ in focus: result vs. duration.' },
        { text: 'Simple is more formal; continuous is colloquial only.',                              isCorrect: false, rationale: 'Both are used in formal and informal registers.' },
        { text: 'Continuous implies the reports are not finished; simple implies they are.',          isCorrect: false, rationale: 'While often true, this is not the primary grammatical distinction.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'present-perfect-continuous', 'cause-effect'],
    content: {
      prompt: '"Your eyes are red. ____ you ____?" Which form best explains the present evidence?',
      options: [
        { text: 'Have / been crying',  isCorrect: true,  rationale: 'PPC is perfect for explaining visible present evidence by a recent continuous activity.' },
        { text: 'Did / cry',           isCorrect: false, rationale: 'Simple past focuses on a completed event, not a present state.' },
        { text: 'Have / cried',        isCorrect: false, rationale: 'Present perfect simple is possible but PPC is more natural for evidence of duration.' },
        { text: 'Are / crying',        isCorrect: false, rationale: 'Present continuous means the action is happening now, which contradicts "eyes are red" as a result.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'present-perfect-continuous', 'temporary'],
    content: {
      prompt: '"She has been living in Berlin since 2020." The present perfect continuous here expresses:',
      options: [
        { text: 'A situation that started in the past and continues to the present, with a sense of temporariness.',  isCorrect: true,  rationale: 'PPC + "since" expresses ongoing duration with an implication the situation may not be permanent.' },
        { text: 'A situation that has now ended.',                                                                     isCorrect: false, rationale: 'If ended, past perfect continuous or simple past would be used.' },
        { text: 'A permanent state requiring simple present.',                                                        isCorrect: false, rationale: 'Permanent states use simple present, not PPC.' },
        { text: 'A future plan from the present perspective.',                                                        isCorrect: false, rationale: 'No future meaning is implied here.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['tenses', 'present-perfect-continuous', 'stative-restriction'],
    content: {
      prompt: 'Which sentence is UNGRAMMATICAL due to misuse of the present perfect continuous?',
      options: [
        { text: 'She has been believing in miracles for years.',   isCorrect: true,  rationale: '"Believe" is stative; progressive forms (including PPC) are normally ungrammatical.' },
        { text: 'She has been hoping for good news for days.',     isCorrect: false, rationale: '"Hope" can be used progressively in certain contexts.' },
        { text: 'He has been working on the thesis for months.',   isCorrect: false, rationale: '"Work" is dynamic — PPC is fully grammatical.' },
        { text: 'They have been training intensively this week.',  isCorrect: false, rationale: '"Train" is dynamic — PPC is correct.' },
      ],
    },
  },

  // ── PAST PERFECT ────────────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['tenses', 'past-perfect'],
    content: {
      prompt: '"By the time the fire brigade arrived, the building ____ completely." Choose the most appropriate form.',
      options: [
        { text: 'had collapsed',   isCorrect: true,  rationale: 'Past perfect indicates the collapse was completed before the arrival (another past event).' },
        { text: 'collapsed',       isCorrect: false, rationale: 'Simple past would suggest the events happened at the same time or in sequence at the same level.' },
        { text: 'has collapsed',   isCorrect: false, rationale: 'Present perfect cannot be used for a purely past context with a past time reference.' },
        { text: 'was collapsing',  isCorrect: false, rationale: 'Past continuous would imply the collapse was in progress at the moment of arrival, not completed before it.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'past-perfect', 'reported-speech'],
    content: {
      prompt: '"She told me that she ____ the project before the deadline." (She actually finished it.)  Choose the correct backshifted form.',
      options: [
        { text: 'had finished',    isCorrect: true,  rationale: 'Present perfect "has finished" backshifts to past perfect in reported speech.' },
        { text: 'has finished',    isCorrect: false, rationale: 'No backshift applied — required in traditional reported speech with past reporting verb.' },
        { text: 'finished',        isCorrect: false, rationale: 'Simple past is the backshift of simple present, not present perfect.' },
        { text: 'would finish',    isCorrect: false, rationale: '"Would finish" is the backshift of "will finish" (future).' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'past-perfect', 'third-conditional'],
    content: {
      prompt: '"If they ____ the contract, we would have proceeded." Complete the third-conditional if-clause.',
      options: [
        { text: 'had signed',      isCorrect: true,  rationale: 'Third conditional: if + past perfect → would + have + V3.' },
        { text: 'would have signed',isCorrect: false, rationale: '"Would have" belongs in the result clause, not the if-clause.' },
        { text: 'signed',          isCorrect: false, rationale: 'Simple past is used in the if-clause of second conditional, not third.' },
        { text: 'have signed',     isCorrect: false, rationale: 'Present perfect is not used in third-conditional if-clauses.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'past-perfect', 'narrative-optional'],
    content: {
      prompt: 'In which sentence can the past perfect be OMITTED without creating ambiguity?',
      options: [
        { text: '"After she finished dinner, she went for a walk." (Simple past throughout)',       isCorrect: true,  rationale: '"After" already signals the temporal sequence; past perfect is optional.' },
        { text: '"She had already left when they arrived." (no "after" or "before")',              isCorrect: false, rationale: 'Without a time conjunction, past perfect is essential to signal prior completion.' },
        { text: '"It turned out they had been lying all along."',                                  isCorrect: false, rationale: 'Removing past perfect changes the meaning significantly here.' },
        { text: '"She realised she had forgotten her keys only after boarding the train."',        isCorrect: false, rationale: 'The past perfect is necessary here; omitting it creates ambiguity.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['tenses', 'past-perfect', 'unreal-past'],
    content: {
      prompt: '"I wish I had taken his advice." The past perfect after "wish" expresses:',
      options: [
        { text: 'Regret about a past situation that cannot be changed.',  isCorrect: true,  rationale: 'Wish + past perfect = regret/counterfactual about the past.' },
        { text: 'A real possibility that still exists.',                  isCorrect: false, rationale: 'Past perfect after "wish" implies the situation is now irreversible.' },
        { text: 'A habitual past action.',                                isCorrect: false, rationale: '"Would" + base form after "wish" expresses hypothetical present habits.' },
        { text: 'An expectation about the future.',                       isCorrect: false, rationale: 'Future expectations after "wish" use present simple: "I wish it were/was different."' },
      ],
    },
  },

  // ── PAST PERFECT CONTINUOUS ──────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'past-perfect-continuous'],
    content: {
      prompt: '"She was exhausted because she ____ for twelve hours." Which form best expresses the cause?',
      options: [
        { text: 'had been driving',   isCorrect: true,  rationale: 'PPC stresses an extended activity before a past reference point explaining a past state.' },
        { text: 'drove',              isCorrect: false, rationale: 'Simple past does not convey the duration leading to the exhaustion.' },
        { text: 'has been driving',   isCorrect: false, rationale: 'Present perfect continuous refers to the present, not a past state.' },
        { text: 'was driving',        isCorrect: false, rationale: 'Past continuous stresses ongoing at a moment, not duration leading to a past result.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'past-perfect-continuous'],
    content: {
      prompt: '"They ____ in Paris for six months before they found an apartment." What is the correct form?',
      options: [
        { text: 'had been living',   isCorrect: true,  rationale: 'PPC + duration + "before" + simple past = textbook past perfect continuous usage.' },
        { text: 'have been living',  isCorrect: false, rationale: 'PPC is required; present perfect continuous is not used for events before a past point.' },
        { text: 'were living',       isCorrect: false, rationale: 'Past continuous does not express duration before a past completion point.' },
        { text: 'had lived',         isCorrect: false, rationale: 'Past perfect simple is possible but less emphatic about duration than PPC.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'past-perfect-continuous'],
    content: {
      prompt: '"The ground was wet. It ____ all morning." (before a specific past time) Which is most natural?',
      options: [
        { text: 'had been raining',  isCorrect: true,  rationale: 'PPC explains present evidence in the past — parallel to PPC in present context.' },
        { text: 'had rained',        isCorrect: false, rationale: 'PP simple is possible but PPC is preferred when explaining a visible past result via duration.' },
        { text: 'was raining',       isCorrect: false, rationale: 'Past continuous does not connect the activity to a past result state.' },
        { text: 'rained',            isCorrect: false, rationale: 'Simple past does not convey duration or cause of the wet ground.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'past-perfect-continuous', 'third-conditional'],
    content: {
      prompt: '"If he ____ properly, he wouldn\'t have failed the exam." Fill in with the past perfect continuous.',
      options: [
        { text: 'had been studying',    isCorrect: true,  rationale: 'PPC in the if-clause of a Type-3 conditional stresses duration of the unfulfilled condition.' },
        { text: 'had studied',          isCorrect: false, rationale: 'Past perfect simple is grammatically acceptable, but PPC stresses that extended study was lacking.' },
        { text: 'was studying',         isCorrect: false, rationale: 'Past continuous is not used in Type-3 conditional if-clauses.' },
        { text: 'would have been studying', isCorrect: false, rationale: '"Would have" belongs in the result clause.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['tenses', 'past-perfect-continuous', 'distancing'],
    content: {
      prompt: '"I had been hoping you would reconsider." The past perfect continuous here serves to:',
      options: [
        { text: 'Distance the speaker from the present, making the request more tentative/polite.',  isCorrect: true,  rationale: 'PPC can be used for polite distancing — similar to the distancing use of past simple in requests.' },
        { text: 'Express a regret about a completed past activity.',                                 isCorrect: false, rationale: 'A regret meaning would be more explicit: "I had hoped you would…"' },
        { text: 'Show that the hoping took place before another past event.',                        isCorrect: false, rationale: 'No other past event is given to establish a prior-past relationship.' },
        { text: 'Indicate an interrupted past activity.',                                            isCorrect: false, rationale: 'No interrupting event is mentioned.' },
      ],
    },
  },

  // ── SIMPLE FUTURE ────────────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['tenses', 'simple-future', 'will'],
    content: {
      prompt: '"It\'s getting dark. I ____ turn on the lights." (spontaneous decision) Choose the correct form.',
      options: [
        { text: 'will',          isCorrect: true,  rationale: '"Will" expresses a spontaneous decision made at the moment of speaking.' },
        { text: 'am going to',   isCorrect: false, rationale: '"Going to" is for pre-planned intentions, not spontaneous decisions.' },
        { text: 'am turning on', isCorrect: false, rationale: 'Present continuous is for pre-arranged future events.' },
        { text: 'turn',          isCorrect: false, rationale: 'Simple present for future is limited to timetables, not personal decisions.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.1, guessing: 0.25,
    tags: ['tenses', 'going-to-future'],
    content: {
      prompt: '"Look at those clouds. It ____ rain." (prediction from present evidence) Choose the best form.',
      options: [
        { text: 'is going to',  isCorrect: true,  rationale: '"Going to" is used for predictions based on visible present evidence.' },
        { text: 'will',         isCorrect: false, rationale: '"Will" is for general predictions without present evidence.' },
        { text: 'is raining',   isCorrect: false, rationale: 'Present continuous describes a current action, not a prediction.' },
        { text: 'rains',        isCorrect: false, rationale: 'Simple present for future is limited to scheduled events.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'will-going-to-contrast'],
    content: {
      prompt: 'Which sentence uses WILL/GOING TO correctly to show a PRE-PLANNED intention?',
      options: [
        { text: '"I am going to apply for the scholarship — I\'ve already filled in the form."',   isCorrect: true,  rationale: '"Going to" + prior action confirms a pre-planned intention.' },
        { text: '"I will apply for the scholarship — I just decided right now."',                  isCorrect: false, rationale: '"Will" is correct but the sentence describes a spontaneous decision, not a prior plan.' },
        { text: '"I will not apply for the scholarship no matter what."',                          isCorrect: false, rationale: '"Will" here is a strong refusal/determination, not a plan.' },
        { text: '"I won\'t be applying — I have never considered it."',                           isCorrect: false, rationale: 'This is a firm refusal, not a pre-planned intention.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'simple-future', 'future-in-past'],
    content: {
      prompt: '"She knew she ____ face the consequences." (future as seen from a past moment) Choose the correct form.',
      options: [
        { text: 'would',         isCorrect: true,  rationale: '"Would" is the future-in-the-past (backshift of "will").' },
        { text: 'will',          isCorrect: false, rationale: '"Will" is for future from a present perspective, not from a past one.' },
        { text: 'is going to',   isCorrect: false, rationale: '"Going to" is not backshifted; "was going to" would be needed.' },
        { text: 'has to',        isCorrect: false, rationale: '"Has to" is obligation, not future.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'simple-future', 'modal-will'],
    content: {
      prompt: '"That will be the postman." The modal "will" here expresses:',
      options: [
        { text: 'Logical deduction/probability about a present situation.',  isCorrect: true,  rationale: '"Will" can express confident present deduction, equivalent to "must be".' },
        { text: 'A spontaneous decision.',                                   isCorrect: false, rationale: 'No decision is being made.' },
        { text: 'A future prediction.',                                      isCorrect: false, rationale: 'The speaker is referring to the present (who is at the door now).' },
        { text: 'A habitual action in the present.',                         isCorrect: false, rationale: 'Habitual "will" would be: "He will leave his shoes at the door."' },
      ],
    },
  },

  // ── FUTURE CONTINUOUS ────────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'future-continuous'],
    content: {
      prompt: '"This time next week, I ____ on a beach in Thailand." Which form is correct?',
      options: [
        { text: 'will be lying',   isCorrect: true,  rationale: 'Future continuous = action in progress at a specific future point in time.' },
        { text: 'will lie',        isCorrect: false, rationale: 'Future simple does not convey ongoing activity at a specified future moment.' },
        { text: 'am going to lie', isCorrect: false, rationale: '"Going to" does not include the sense of ongoing activity at a future moment.' },
        { text: 'have been lying', isCorrect: false, rationale: 'Present perfect continuous refers to a period leading to the present.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'future-continuous', 'polite-enquiry'],
    content: {
      prompt: '"Will you be using the printer this afternoon?" This future continuous is used to:',
      options: [
        { text: 'Make a polite enquiry without imposing.',                   isCorrect: true,  rationale: 'Future continuous inquiry asks about plans neutrally, avoiding implication of obligation.' },
        { text: 'Express a spontaneous decision.',                           isCorrect: false, rationale: '"Will be using" signals a question about existing plans, not a spontaneous decision.' },
        { text: 'Indicate that the action will be in progress and complete by a future time.',  isCorrect: false, rationale: 'That would be future perfect.' },
        { text: 'Describe a future habitual action.',                        isCorrect: false, rationale: 'Future simple or "will" + always/usually is used for habitual future actions.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'future-continuous', 'expected-trend'],
    content: {
      prompt: '"The population of the city will be growing rapidly over the next decade." This form emphasises:',
      options: [
        { text: 'A continuous trend expected to be in progress throughout the future period.',   isCorrect: true,  rationale: 'Future continuous stresses ongoing development/trend across a future time span.' },
        { text: 'A completed growth by the end of the decade.',                                 isCorrect: false, rationale: 'Future perfect would be used for completion by a future deadline.' },
        { text: 'A spontaneous decision about future policy.',                                  isCorrect: false, rationale: '"Will" for spontaneous decisions is in simple form, not continuous.' },
        { text: 'A planned arrangement already confirmed.',                                     isCorrect: false, rationale: 'Present continuous or "going to" is used for confirmed personal plans.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['tenses', 'future-continuous', 'future-perfect-contrast'],
    content: {
      prompt: 'Choose the sentence where FUTURE CONTINUOUS, not future perfect, is the correct choice.',
      options: [
        { text: '"At 8 p.m. tomorrow I will be watching the match."',                    isCorrect: true,  rationale: 'Future continuous = activity in progress at a future moment.' },
        { text: '"By 8 p.m. tomorrow I will have watched the match."',                  isCorrect: false, rationale: 'Future perfect = completed before a future deadline.' },
        { text: '"By the time you arrive, I will have cooked dinner."',                 isCorrect: false, rationale: 'Future perfect is correct here — before another future event.' },
        { text: '"She will have submitted her thesis by the end of the month."',        isCorrect: false, rationale: 'Future perfect is correct — completed before a future deadline.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'future-continuous', 'natural-consequence'],
    content: {
      prompt: '"Don\'t worry — they will be expecting us at the hotel." "Will be expecting" is used because:',
      options: [
        { text: 'It presents the future action as a natural expected course of events, not a deliberate decision.',  isCorrect: true,  rationale: 'Future continuous can present future events as inevitable/expected, softening any imposition.' },
        { text: 'It stresses the completion of the expecting before arrival.',                                       isCorrect: false, rationale: 'Completion before a future time is future perfect.' },
        { text: 'It requests information about a plan.',                                                            isCorrect: false, rationale: 'This is a statement, not a question.' },
        { text: 'It emphasises the spontaneous nature of their expectation.',                                       isCorrect: false, rationale: '"Will" (simple) is for spontaneous intent, not future continuous.' },
      ],
    },
  },

  // ── FUTURE PERFECT ───────────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'future-perfect'],
    content: {
      prompt: '"By the end of the year, the company ____ 500 employees." Which form is correct?',
      options: [
        { text: 'will have hired',   isCorrect: true,  rationale: 'Future perfect = action completed before a specific future deadline.' },
        { text: 'will hire',         isCorrect: false, rationale: 'Future simple does not convey completion before a future point.' },
        { text: 'is hiring',         isCorrect: false, rationale: 'Present continuous is for current arrangements, not future completion.' },
        { text: 'has hired',         isCorrect: false, rationale: 'Present perfect is for past actions with present relevance, not future completion.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'future-perfect'],
    content: {
      prompt: '"She will have been working here for ten years next month." This combines future perfect with:',
      options: [
        { text: 'A duration expression (for + period), making it future perfect continuous in meaning.',   isCorrect: true,  rationale: '"Will have been working" (future perfect continuous) = duration up to a future point.' },
        { text: 'A timetable reference, making it a scheduled action.',                                   isCorrect: false, rationale: 'Timetabled futures use simple present, not future perfect.' },
        { text: 'A prediction based on present evidence.',                                                isCorrect: false, rationale: '"Going to" expresses evidence-based predictions.' },
        { text: 'A spontaneous decision about future employment.',                                        isCorrect: false, rationale: '"Will" (simple) is used for spontaneous decisions.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'future-perfect'],
    content: {
      prompt: '"By the time this series ends, the writers will have introduced over forty characters." The future perfect signals:',
      options: [
        { text: 'Cumulative completion before a future reference point.',  isCorrect: true,  rationale: 'Future perfect: total accumulated result (forty characters) before a specified future moment (series end).' },
        { text: 'An action in progress at a future moment.',               isCorrect: false, rationale: 'Future continuous is for actions in progress at a future moment.' },
        { text: 'A past action with present relevance.',                   isCorrect: false, rationale: 'Present perfect is for past actions connecting to the present.' },
        { text: 'A habitual action in the future.',                        isCorrect: false, rationale: 'Future habits use "will + always/usually".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['tenses', 'future-perfect', 'deduction'],
    content: {
      prompt: '"You will have heard the news by now." "Will have heard" here expresses:',
      options: [
        { text: 'Logical deduction/assumption about a completed event in the recent past.',  isCorrect: true,  rationale: 'Future perfect can express confident inference that something has already happened.' },
        { text: 'A future event that will be completed by a specified future time.',         isCorrect: false, rationale: 'That is the standard future-perfect use, but here the action is presumed already completed.' },
        { text: 'A promise about the future.',                                               isCorrect: false, rationale: '"Will" for promises uses simple future form.' },
        { text: 'A criticism of the listener\'s ignorance.',                                isCorrect: false, rationale: 'No negative judgment is inherent; it is an assumption/inference.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'future-perfect'],
    content: {
      prompt: 'Which time expression is typically associated with the future perfect tense?',
      options: [
        { text: 'by the time',   isCorrect: true,  rationale: '"By the time" + a future reference point triggers future perfect for the action to be completed first.' },
        { text: 'since',         isCorrect: false, rationale: '"Since" is associated with present perfect and past perfect for duration from a starting point.' },
        { text: 'at the moment', isCorrect: false, rationale: '"At the moment" accompanies present continuous.' },
        { text: 'last week',     isCorrect: false, rationale: '"Last week" is a simple-past time expression.' },
      ],
    },
  },

  // ── FUTURE PERFECT CONTINUOUS ─────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'future-perfect-continuous'],
    content: {
      prompt: '"By December, she ____ on this project for two full years." Which is correct?',
      options: [
        { text: 'will have been working',   isCorrect: true,  rationale: 'Future perfect continuous = duration of an ongoing activity leading up to a future point.' },
        { text: 'will have worked',         isCorrect: false, rationale: 'Future perfect simple stresses completion, not the ongoing duration.' },
        { text: 'will be working',          isCorrect: false, rationale: 'Future continuous stresses activity in progress at a future moment, not completed duration.' },
        { text: 'will work',                isCorrect: false, rationale: 'Future simple does not convey duration.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['tenses', 'future-perfect-continuous'],
    content: {
      prompt: '"You look exhausted. By the time the conference ends, you will have been presenting for six hours!" This sentence primarily emphasises:',
      options: [
        { text: 'The length of uninterrupted effort leading to a future endpoint.',   isCorrect: true,  rationale: 'FPC stresses the duration of continuous activity before a future reference point.' },
        { text: 'The completion of all presentations before the conference ends.',    isCorrect: false, rationale: 'Completion emphasis without duration focus = future perfect simple.' },
        { text: 'A planned series of presentations on a timetable.',                  isCorrect: false, rationale: 'Timetable reference uses simple present.' },
        { text: 'A spontaneous prediction about the speaker\'s fatigue.',            isCorrect: false, rationale: '"Will" in simple future expresses spontaneous predictions, not FPC.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.5, guessing: 0.20,
    tags: ['tenses', 'future-perfect-continuous'],
    content: {
      prompt: 'Which sentence correctly uses FUTURE PERFECT CONTINUOUS, not another tense?',
      options: [
        { text: '"By the end of his career, he will have been teaching for forty years."',           isCorrect: true,  rationale: 'Duration (forty years) leading to a future endpoint (end of career) = FPC.' },
        { text: '"He will have taught thousands of students by the end of his career."',             isCorrect: false, rationale: 'Future perfect simple — stresses number/result, not duration.' },
        { text: '"He will be teaching a class at this time next year."',                             isCorrect: false, rationale: 'Future continuous — activity in progress at a future moment.' },
        { text: '"He will teach the advanced group from next semester."',                            isCorrect: false, rationale: 'Future simple — scheduled arrangement.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'future-perfect-continuous', 'stative'],
    content: {
      prompt: 'Why is the following sentence INCORRECT? "By tomorrow, she will have been knowing him for a year."',
      options: [
        { text: '"Know" is a stative verb and cannot be used in any perfect continuous form.',  isCorrect: true,  rationale: 'Stative verbs like "know" do not take progressive aspects.' },
        { text: 'The time expression "by tomorrow" requires simple future.',                    isCorrect: false, rationale: '"By tomorrow" is compatible with future perfect (continuous), not simple future.' },
        { text: '"Will have been" is not a valid tense form in English.',                       isCorrect: false, rationale: '"Will have been + -ing" is a valid future perfect continuous form.' },
        { text: 'The duration "for a year" requires present perfect continuous instead.',      isCorrect: false, rationale: 'Duration + future endpoint requires future perfect continuous, not PPC.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C2', difficulty: 1.3, discrimination: 1.6, guessing: 0.20,
    tags: ['tenses', 'future-perfect-continuous'],
    content: {
      prompt: '"By retirement, she will have been correcting exam papers for three decades — a remarkable feat of endurance." Which function does the FPC serve here beyond temporal meaning?',
      options: [
        { text: 'Rhetorical emphasis on the cumulative, heroic nature of sustained effort.',  isCorrect: true,  rationale: 'FPC can be used stylistically to dramatise the weight and extent of an ongoing endeavour.' },
        { text: 'A polite enquiry about future plans.',                                       isCorrect: false, rationale: 'Polite enquiry is a function of future continuous in question form.' },
        { text: 'A scientific law stated for future reference.',                              isCorrect: false, rationale: 'Scientific laws use simple present tense.' },
        { text: 'A conditional result in a type-3 structure.',                               isCorrect: false, rationale: 'Type-3 conditionals use past perfect + would have + V3.' },
      ],
    },
  },

  // ── SEQUENCE OF TENSES ───────────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['tenses', 'sequence-of-tenses', 'reported-speech'],
    content: {
      prompt: '"We will finish the project," he promised. In reported speech, this becomes:',
      options: [
        { text: 'He promised that they would finish the project.',   isCorrect: true,  rationale: '"Will" backshifts to "would" when the reporting verb is in the past.' },
        { text: 'He promised that they will finish the project.',    isCorrect: false, rationale: 'Backshift is required with a past reporting verb.' },
        { text: 'He promised that they finished the project.',       isCorrect: false, rationale: '"Finished" (past simple) is the backshift of simple present, not "will".' },
        { text: 'He promised that they have finished the project.',  isCorrect: false, rationale: 'Present perfect does not backshift "will".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['tenses', 'sequence-of-tenses'],
    content: {
      prompt: '"She said she ____ the results the following day." Which form observes the sequence of tenses?',
      options: [
        { text: 'would announce',   isCorrect: true,  rationale: '"would + base" is the past-tense backshift of future "will + base".' },
        { text: 'will announce',    isCorrect: false, rationale: '"Will" must be backshifted to "would" after a past reporting verb.' },
        { text: 'announced',        isCorrect: false, rationale: 'Simple past backshifts simple present, not future.' },
        { text: 'has announced',    isCorrect: false, rationale: '"Has announced" is present perfect; backshift would give "had announced".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'sequence-of-tenses', 'permanent-truth'],
    content: {
      prompt: '"The teacher told the students that light ____ faster than sound." Which form is correct?',
      options: [
        { text: 'travels (no backshift for permanent truths)',  isCorrect: true,  rationale: 'Permanent scientific truths are not backshifted — simple present is retained.' },
        { text: 'travelled',                                    isCorrect: false, rationale: 'Backshift does not apply to universal truths.' },
        { text: 'would travel',                                 isCorrect: false, rationale: '"Would" backshift implies the truth might change — incorrect for scientific facts.' },
        { text: 'has travelled',                                isCorrect: false, rationale: 'Present perfect is inappropriate for a permanent law.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['tenses', 'sequence-of-tenses', 'no-backshift'],
    content: {
      prompt: '"She confirmed that she ____ the report by today\'s meeting." (still in the future) No backshift is needed when:',
      options: [
        { text: 'The situation reported is still true or future at the time of reporting.',  isCorrect: true,  rationale: 'When the reported fact remains future/true, backshift is optional.' },
        { text: 'The reporting verb is in the present tense.',                              isCorrect: false, rationale: 'Backshift is also optional when the fact is still valid, regardless of reporting tense.' },
        { text: 'The sentence contains an adverb of time.',                                isCorrect: false, rationale: 'Time adverbs alone do not exempt a sentence from backshift rules.' },
        { text: 'The verb is irregular.',                                                  isCorrect: false, rationale: 'Regularity/irregularity has no bearing on the sequence of tenses rule.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['tenses', 'sequence-of-tenses', 'tense-comparison'],
    content: {
      prompt: 'Which sentence VIOLATES the standard sequence of tenses rule?',
      options: [
        { text: '"He claimed that he will solve the problem tomorrow."',        isCorrect: true,  rationale: '"Claimed" (past) + "will" (no backshift) violates sequence of tenses; should be "would".' },
        { text: '"He claimed that he would solve the problem the next day."',   isCorrect: false, rationale: 'Correct application: "will" → "would".' },
        { text: '"She insisted that the Earth is round."',                      isCorrect: false, rationale: 'Correct — permanent truth is not backshifted.' },
        { text: '"They believed they had made the right decision."',            isCorrect: false, rationale: 'Correct backshift: "have made" → "had made".' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Phase 2 grammar items (${items.length} total)…`);
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

  console.log(`✓ Phase 2 complete — ${inserted} items inserted.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
