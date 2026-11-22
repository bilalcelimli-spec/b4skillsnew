/**
 * Monologue rewrites for the speaking items whose prompt assumed an
 * examiner, interlocutor or partner (found 2026-11-22). Data for
 * apply-speaking-monologue-rewrite.ts.
 *
 * Each entry keeps the item's CEFR level, topic, prepTime and responseTime.
 * Only the fields listed in `content` change. Prompts no longer state a
 * speaking duration, because the on-screen timer already shows
 * responseTime (several old prompts said "2–3 minutes" against a 90-second
 * limit). Items are keyed by id, because five have no itemCode.
 *
 * Conventions:
 * - An imagined listener is fine ("Tell your friend Alex…", "Speak to the
 *   shop assistant…") as long as nobody has to answer back. A question the
 *   listener asks is printed in the prompt.
 * - Negotiations and interviews become one-way formats a real person
 *   records: a voice message, an opening statement, a recorded pitch.
 *   "Respond to the examiner's challenges" becomes "anticipate and answer
 *   the strongest objection".
 * - Picture tasks lose their "[EXAMINER: show …]" stage directions; the
 *   picture is already attached as imageUrl. Three had no picture attached
 *   and are rewritten so they need none.
 */

export interface MonologueRewrite {
  /** Item.id. */
  id: string;
  /** For the report only; null for the five generated items with no code. */
  itemCode: string | null;
  note: string;
  /** Content fields set by the rewrite. */
  content: Record<string, unknown>;
  /** Content keys removed (stale for the new task). */
  drop?: string[];
}

const PRE_A1_RUBRIC = "Assess basic intelligibility and ability to name simple objects/actions. Grammar errors acceptable.";

// Official CEFR production descriptors (Sustained monologue / Addressing audiences).
const B1_ARGUMENT = "Can develop an argument well enough to be followed without difficulty most of the time.";
const B1_REASONS = "Can briefly give reasons and explanations for opinions, plans and actions.";
const B2_ARGUMENT = "Can develop a clear argument, expanding and supporting points of view with subsidiary points and relevant examples.";
const C1_TALK = "Can give a clear, well-structured talk on a complex subject, expanding and supporting points of view with subsidiary points, reasons and relevant examples.";

/** The four B1 junior items share an analytic rubric; only the interaction band changes. */
function juniorRubric() {
  return {
    grammar: "The candidate uses a range of simple grammatical structures with reasonable accuracy. Basic errors may occur, but they generally do not impede communication.",
    organisation: "The candidate uses simple cohesive devices (e.g., 'and', 'but', 'because', 'so', 'then') to link ideas and statements. The message has a clear opening, main points and a close, though some hesitations for planning may occur.",
    taskFulfilment: "The candidate addresses all parts of the prompt, expresses their ideas clearly, and engages with the scenario to achieve the communicative purpose.",
    lexicalResource: "The candidate uses a sufficient range of vocabulary for the topic, allowing for clear expression of ideas and opinions. Some repetition or circumlocution may be present.",
    communicativeEffectiveness: "The candidate conveys the message to the friend adequately and would be understood without effort. They take the friend's known view into account and keep the message focused on its purpose.",
  };
}

export const MONOLOGUE_REWRITES: readonly MonologueRewrite[] = [
  // ── Generated items with no itemCode ────────────────────────────────────
  {
    id: "cmp0bygma006onuc6yaemlg0a",
    itemCode: null,
    note: "examiner points at pictures → candidate names family members unaided; unverified stock photo removed",
    drop: ["imageUrl"],
    content: {
      taskType: "monologue",
      prompt: "Who is in your family? Say the people in your family.\nExample: 'My mother.'",
      rubric: "PRE_A1 guided response: the candidate names family members with isolated words or very short phrases (e.g. 'my mother', 'a brother'). Assess whether the words are recognisable and relevant; grammatical accuracy is not expected at this level.",
      sampleBullets: ["Names at least two family members (mother, father, brother, sister, baby…)", "Uses 'my' or 'This is my…' at least once", "Words are recognisable"],
      cefrDescriptor: "Can name family members using isolated words.",
    },
  },
  {
    id: "cmp0bky0z0065nuc6k6u2ey4z",
    itemCode: null,
    note: "examiner starts a conversation → candidate answers Mr Smith's printed questions",
    content: {
      taskType: "monologue",
      prompt: "Meet Mr Smith. He says: 'Hello. I am Mr Smith. What is your name? Do you like to walk? Do you like to run?'\n\nAnswer Mr Smith.\nFirst, say your name.\nThen, say if you like to walk or run. You can use 'yes' or 'no' and simple words.",
      sampleBullets: ["Says their name (e.g. 'My name is Sam' or 'Sam')", "Says if they like walking or running ('Yes, I like walk', 'Run')", "Words are recognisable"],
      cefrDescriptor: "Can give their name and say simply what they like.",
    },
  },
  {
    id: "cmp0arhyu0053nuc6g27mli6g",
    itemCode: null,
    note: "examiner starts the conversation → candidate answers a friend's printed question",
    content: {
      taskType: "monologue",
      prompt: "You are talking to a new friend from your English class. Your friend asks: 'What technology do you use?'\n\nAnswer your friend. Talk about:\n*   What technology you use (e.g., a phone, a computer, a TV).\n*   What you do with it (e.g., call friends, play games, watch films).\n*   If you like it and why (e.g., 'I like my phone because it is useful.').",
      rubric: "A1 guided monologue: the candidate answers a friend's question about the technology they use, in simple present sentences with basic vocabulary (phone, computer, TV; call, play, watch) and a simple reason with 'because'. Assess whether all three points are covered intelligibly.",
      sampleBullets: ["Names at least one piece of technology they use", "Says what they do with it (call, play, watch…)", "Says if they like it and gives a reason with 'because'", "Simple present sentences are intelligible"],
      cefrDescriptor: "Can describe simply what they use and why they like it.",
    },
  },
  {
    id: "cmp0a7alj0049nuc6taau7m9p",
    itemCode: null,
    note: "discussion with an interlocutor at a seminar → short talk at the seminar",
    content: {
      taskType: "monologue",
      prompt: "You are giving a short talk at an international cultural exchange seminar. Describe a cultural tradition from any part of the world that you find particularly fascinating. Go beyond outlining its practices: explain its cultural, social or historical significance, how it has evolved, its impact on the community, and the contemporary challenges or adaptations it faces. Close by explaining what the tradition reveals about the community that keeps it alive.",
      rubric: "C1 long-turn monologue. Assess the integration of sub-themes, the development of particular points to an appropriate conclusion, precise vocabulary for abstract ideas (e.g. 'inherent significance', 'contemporary challenges'), hedging and discourse markers, and a coherent structure from description to evaluation.",
      sampleBullets: ["Introduces the tradition and its practices concisely", "Explains its cultural, social or historical significance", "Traces how it has evolved and its impact on the community", "Discusses contemporary challenges or adaptations with qualification", "Rounds off with a reasoned conclusion"],
      cefrDescriptor: C1_TALK,
    },
  },
  {
    id: "cmp0a1c0s003znuc674tel073",
    itemCode: null,
    note: "live interview with follow-up questions → recorded video answer for the application",
    content: {
      taskType: "monologue",
      prompt: "You are applying for a senior leadership position at a multinational technology firm known for its innovative culture and commitment to employee well-being. As part of the application, you record a video answer to this question: 'What, in your view, constitutes an ideal workplace?'\n\nYou should consider:\n*   The organisational culture and values that would foster peak performance and job satisfaction.\n*   The ideal physical or virtual environment, and how it might support both collaboration and individual focus.\n*   The leadership style and team dynamics that would best promote creativity and accountability.\n*   Opportunities for professional development and meaningful contribution.\n*   Any philosophical principles or ethical considerations you consider essential.\n\nQualify your statements, anticipate at least one objection to your view, and justify your choices with reasoned arguments.",
      rubric: "C1 recorded interview answer (monologue). Assess how the candidate delineates specific aspects, qualifies assertions with caveats, anticipates and answers an objection, uses hedging, and relates the factors to one another (e.g. collaboration versus individual innovation), with academic vocabulary and advanced discourse markers.",
      sampleBullets: ["Sets out a clear overall vision of the ideal workplace", "Develops culture, environment and leadership with specific detail", "Relates factors to each other (e.g. collaboration vs individual focus)", "Anticipates an objection and answers it", "Qualifies claims with hedging and reaches a reasoned conclusion"],
      cefrDescriptor: C1_TALK,
    },
  },

  // ── Primary and Language Schools, A1–A2 ─────────────────────────────────
  {
    id: "cmoukeeyt000inu2jqpwgg9py",
    itemCode: "SPE-A1-0062",
    note: "examiner stage direction removed; the picture is attached",
    content: { prompt: "Look at the picture of a classroom.\nTell me what you can see. Say at least three things." },
  },
  {
    id: "cmoukef2x000lnu2jxsgfe5lk",
    itemCode: "SPE-A1-0065",
    note: "examiner shows a clock (no picture attached) → candidate says the times of their own day",
    content: {
      taskType: "monologue",
      prompt: "What time do you do these things? Say the times.\n• get up\n• go to school\n• go to bed\nExample: 'I get up at seven o'clock.'",
      sampleBullets: ["Says at least two times (e.g. 'seven o'clock', 'half past eight')", "Uses 'I … at …' or 'It's …'", "Times are clear and recognisable"],
      cefrDescriptor: "Can say the time of daily activities using simple expressions (seven o'clock, half past eight).",
    },
  },
  {
    id: "cmoukef96000onu2j9slhc989",
    itemCode: "SPE-A1-0068",
    note: "examiner plays the shop assistant → candidate speaks to an imagined shop assistant",
    content: {
      taskType: "monologue",
      prompt: "You are in a bookshop. You want to buy a book for a friend who is 8 years old. Speak to the shop assistant:\n• Say what you are looking for\n• Ask how much it costs\n• Say thank you and goodbye",
      sampleBullets: ["Opens politely (excuse me / hello)", "Says they want a book for an 8-year-old friend", "Uses 'How much is it?' or 'How much does it cost?'", "Closes politely (thank you / goodbye)"],
      cefrDescriptor: "Can ask for things in a shop and ask the price using simple phrases.",
    },
  },
  {
    id: "cmp07v9jx000lnuc68605b4gm",
    itemCode: "SPE-A2-0059-MVX1NDS2",
    note: "interlocutor's opening line → candidate answers Alex's printed question",
    content: {
      taskType: "monologue",
      prompt: "Your friend Alex is thinking about buying a new mobile phone or a laptop, but is not sure which one. Alex asks you: 'What kind of technology do you use every day?'\n\nAnswer Alex:\n*   Talk about some technology you use every day (e.g., your phone, computer or tablet).\n*   Say what you like and don't like about it.\n*   Give Alex some simple advice about buying a new phone or laptop.\nLink your ideas with words like 'and', 'but' and 'because'.",
      rubric: "A2 guided monologue: the candidate describes their own use of technology, says what they like and dislike, and gives simple advice with 'should'. Vocabulary (phone, computer, laptop, tablet, use, like, buy) and grammar (simple present, 'should') are within A2. Assess coverage of the three points and the use of simple connectors (and, but, because).",
      sampleBullets: ["Names technology they use every day and what for", "Says at least one thing they like and one they don't like", "Gives simple advice (e.g. 'You should buy…')", "Links ideas with and / but / because"],
      cefrDescriptor: "Can describe everyday habits and give simple advice, linking ideas with simple connectors.",
    },
  },

  // ── B1 generated role plays ─────────────────────────────────────────────
  {
    id: "cmp08kck4001pnuc66qqjm16y",
    itemCode: "SPE-B1-0061-MVX1NF7B",
    note: "conversation the examiner starts → answer to a friend's printed question",
    content: {
      taskType: "monologue",
      prompt: "Your friend is curious about how technology affects your daily life. Your friend asks you: 'Tell me about a piece of technology you use and how it has changed things for you.'\n\nIn your answer, you should:\n*   Describe the technology you use.\n*   Explain how it has changed your daily routine or habits.\n*   Say whether these changes are positive or negative, and why.",
      rubric: "B1 sustained monologue: description, explanation and opinion with justification on a familiar topic. Assess whether the candidate covers all three points, links them with connectors, and supports the opinion with reasons and examples from personal experience.",
      sampleBullets: ["Describes a specific piece of technology", "Explains at least one change to routine or habits", "Gives an opinion on the changes with a reason", "Links ideas with connectors (because, so, however)"],
      cefrDescriptor: B1_REASONS,
    },
  },
  {
    id: "cmp08kcmg001qnuc6imho9awk",
    itemCode: "SPE-B1-0061-MVX1NF8C",
    note: "conversation the examiner starts → candidate tells a friend about new technology",
    content: {
      taskType: "monologue",
      prompt: "Your friend is curious about a new piece of technology you have recently started using, or are planning to use (e.g., a new app, a smart device, an e-reader). Tell your friend about it:\n1.  **Describe** the technology and what it does.\n2.  **Explain** why you decided to use it.\n3.  **Talk about** the positive effects it has had, or could have, on your daily life.\n4.  **Mention** any challenges or drawbacks you have noticed or expect.\n5.  **Give your overall opinion** and say whether you would recommend it.",
      rubric: "B1 sustained monologue: the candidate describes a familiar technology and its impact, using B1 vocabulary for technology and daily life (e.g. affect, benefit, challenge, provide) with connectors and hedging. Assess coverage of the five points and how clearly they are linked into one account.",
      sampleBullets: ["Describes the technology and what it does", "Explains why they chose it", "Gives at least one positive effect on daily life", "Mentions a drawback or challenge", "Gives an overall opinion or recommendation"],
      cefrDescriptor: B1_REASONS,
    },
  },
  {
    id: "cmp08kco3001rnuc6dz3hktcn",
    itemCode: "SPE-B1-0061-MVX1NF9I",
    note: "conversation with the examiner as a friend → opinion given in answer to a friend's question",
    content: {
      taskType: "monologue",
      prompt: "A friend has asked for your opinion: 'Has technology made our lives better or worse?' Give your answer. Cover these points:\n\n*   One or two ways technology makes your life easier (e.g., communication, finding information, shopping).\n*   A specific piece of technology you use often, and why it is useful.\n*   One or two negative aspects or challenges of technology (e.g., too much screen time, privacy concerns).\n*   Your overall opinion on technology's role in society.",
      rubric: "B1 sustained monologue: the candidate expresses opinions with justifications and examples about the impact of technology, using B1 discourse markers (for example, however, in my opinion) and some hedging. Assess coverage of the four points and a clear overall opinion.",
      sampleBullets: ["Gives one or two ways technology makes life easier", "Describes a specific piece of technology and why it is useful", "Gives one or two negative aspects", "States an overall opinion, linked with discourse markers"],
      cefrDescriptor: B1_REASONS,
    },
  },
  {
    id: "cmp08q4dh001ynuc6h2ssfn6c",
    itemCode: "SPE-B1-0061-MVX1NFIM",
    note: "interlocutor plays Alex with a script → voice message to Alex",
    content: {
      taskType: "monologue",
      prompt: "Your friend Alex has heard about a new local community project that will offer free after-school classes to help students with their studies. Alex has asked what you think. Leave Alex a voice message with your opinion:\n\n*   Say what you think of the project, and why education is important for people and for society.\n*   Suggest one or two ideas to encourage more students to take part.\n*   Mention a difficulty the project might face, and how it could be dealt with.",
      sampleBullets: ["Gives an opinion on the project with a reason", "Explains why education matters for people and society", "Suggests at least one idea to increase participation", "Names a likely difficulty and a way to deal with it"],
      cefrDescriptor: B1_REASONS,
    },
  },
  {
    id: "cmp08q4gn001znuc6ummhpx7y",
    itemCode: "SPE-B1-0061-MVX1NFJP",
    note: "examiner plays Alex with opposing views → candidate answers Alex's stated view",
    content: {
      taskType: "monologue",
      prompt: "You recently read an article about the different roles education plays in a person's life and in society. Your friend Alex thinks that school should mainly prepare young people for a job. Tell Alex what you think the main purposes of education are:\n\n*   Explain what you believe are the most important reasons for education, and give clear reasons.\n*   Say whether you agree or disagree with Alex's view that school is mainly for getting a job, and explain why.\n*   Suggest what key skills or knowledge education should help young people develop for their future.",
      sampleBullets: ["States the main purposes of education with reasons", "Agrees or disagrees with Alex's view and explains why", "Suggests key skills or knowledge for the future", "Uses connectors and some hedging (I think, it depends)"],
      cefrDescriptor: B1_ARGUMENT,
    },
  },
  {
    id: "cmp08q4j20020nuc6ienf2sop",
    itemCode: "SPE-B1-0061-MVX1NFKT",
    note: "examiner plays Alex → candidate persuades Alex in one turn",
    content: {
      taskType: "monologue",
      prompt: "Your friend Alex has heard about a new community project. It offers free workshops and tutoring for young people in your local area, with practical skills and academic support. Alex is interested but wonders if it's really necessary, as schools already exist.\n\n**Persuade Alex:**\n1. Explain why you think education, especially learning practical skills, is important for young people.\n2. Describe the benefits this project could bring to the community.\n3. Suggest one or two ways the project could be even more successful.",
      sampleBullets: ["Explains why practical skills matter for young people", "Answers Alex's doubt that schools are enough", "Describes at least two benefits for the community", "Suggests a way to make the project more successful"],
      cefrDescriptor: B1_ARGUMENT,
    },
  },
  {
    id: "cmp08u2uo0027nuc6dv3hrp3v",
    itemCode: "SPE-B1-0061-MVX1NFTX",
    note: "manager (the examiner) discusses remote work → voice message the manager asked for",
    content: {
      taskType: "monologue",
      prompt: "Your company is deciding whether to make working from home a permanent option for staff. Your manager has asked everyone to record a short voice message with their views. Record yours:\n1. Say whether you think working from home should be a permanent option.\n2. Give reasons, mentioning both advantages and disadvantages.\n3. Suggest some ideas for how remote work could be managed well in the future.",
      rubric: "B1 sustained monologue on a familiar adult topic (remote work): opinion, reasons covering advantages and disadvantages, and basic suggestions. Vocabulary and grammar within B1 (e.g. 'permanent option', 'benefits', 'challenges'). Assess coverage of the three points and use of connectors (however, on the other hand) and hedging (I think… because, it seems to me).",
      sampleBullets: ["States a clear opinion on permanent remote work", "Gives at least one advantage and one disadvantage", "Suggests at least one way to manage remote work", "Uses connectors and hedging appropriately"],
      cefrDescriptor: B1_REASONS,
    },
  },
  {
    id: "cmp089p4x0019nuc665brov9y",
    itemCode: "SPE-B1-0066",
    note: "Alex (the examiner) asks follow-up questions → candidate describes the routine to Alex",
    content: {
      taskType: "monologue",
      prompt: "Your friend Alex is interested in how you stay active.\n\n**Your task**: Describe your typical daily or weekly exercise routine to Alex. Explain what kind of exercise you do, how often, and why you choose those activities. Mention any benefits you feel from exercising, and any challenges you face or changes you would like to make.",
      sampleBullets: ["Describes the type and frequency of exercise", "Explains why they choose those activities", "Mentions at least one benefit they feel", "Mentions a challenge or a change they would like to make"],
      cefrDescriptor: "Can give a straightforward description of a familiar routine, with reasons.",
    },
  },

  // ── B1 junior: peer discussions → voice message to the friend ───────────
  {
    id: "cmwjmuoxg001ouvwpsrocz09r",
    itemCode: "SPE-B1-0072",
    note: "discussion with Chidi → voice message to Chidi",
    content: {
      taskType: "monologue",
      prompt: "You are Yuna. You and your friend Chidi are in the school drama club. Your club leader has asked the members for ideas for a fun free-time activity the whole club can do together next month. You want to suggest an outdoor picnic with games, but Chidi thinks a movie night at school would be better. Leave Chidi a voice message about the choice.\n\nIn your message, you should:\n- Explain why you think your idea is a good choice.\n- Say what you think about Chidi's idea of a movie night.\n- Suggest one activity, or a way of choosing, that you could both agree on.",
      rubric: juniorRubric(),
      purpose: "To argue for a free-time activity for the club and propose a way to agree on one.",
      contextNote: "The candidate presents an idea, responds to a friend's known counter-suggestion and proposes a way to agree, all in one recorded message. This tests the ability to link ideas and organise a longer turn at B1 level.",
      sampleBullets: ["Explains why the picnic is a good choice", "Gives an opinion on Chidi's movie-night idea", "Proposes a decision or a compromise", "Links ideas with simple connectors (because, but, so)"],
      cefrDescriptor: B1_ARGUMENT,
    },
  },
  {
    id: "cmwjmurri001puvwpuepvvmzk",
    itemCode: "SPE-B1-0073",
    note: "discussion with Ravi → voice message to Ravi",
    content: {
      taskType: "monologue",
      prompt: "You are Malia. You have just returned from a short cycling trip with your friend Ravi, and you both enjoyed it a lot. Now you are planning another, longer trip during the school holidays. Ravi suggests a trip to the mountains, but you are worried about the steep hills and prefer a coastal route. Leave Ravi a voice message about where to go next.\n\nIn your message, you should:\n- Talk about what you liked or didn't like about the last trip.\n- Suggest your preferred route and explain why it's a good idea.\n- Say what you think about Ravi's idea of the mountains.\n- Suggest a final plan you think you would both enjoy.",
      rubric: juniorRubric(),
      purpose: "To argue for a route for the next cycling trip.",
      contextNote: "The candidate links a past experience to future plans, expresses a preference and responds to a friend's known suggestion in one recorded message. It encourages comparative and contrasting language and the sequencing of arguments in a longer turn.",
      sampleBullets: ["Comments on the last trip (likes or dislikes)", "Suggests the coastal route with reasons", "Gives an opinion on the mountain idea", "Proposes a final plan, linking ideas clearly"],
      cefrDescriptor: B1_ARGUMENT,
    },
  },
  {
    id: "cmwjmut28001quvwppjtqh1wp",
    itemCode: "SPE-B1-0074",
    note: "discussion with Dario → encouraging voice message to Dario",
    content: {
      taskType: "monologue",
      prompt: "You are Fatima. After a recent school swimming competition, where you performed well, your friend Dario has told you he is disappointed with his results and is thinking about quitting the swimming club. You want to encourage him to stay. Leave Dario a voice message.\n\nIn your message, you should:\n- Say that you understand how he feels.\n- Share your own experience or thoughts about competitions.\n- Give reasons why he should continue swimming.\n- Encourage him to keep going.",
      rubric: juniorRubric(),
      purpose: "To encourage a disappointed friend to continue a hobby.",
      contextNote: "This task involves showing empathy, giving advice and persuading in one recorded message. It requires linking ideas to build a convincing and supportive argument, testing discourse management in a more emotionally nuanced context.",
      sampleBullets: ["Acknowledges Dario's feelings", "Shares a personal experience or thought about competitions", "Gives at least two reasons to continue", "Ends with encouragement"],
      cefrDescriptor: B1_ARGUMENT,
    },
  },
  {
    id: "cmwjmuugs001ruvwpqbdcth60",
    itemCode: "SPE-B1-0075",
    note: "discussion with Yuna → voice message to Yuna recommending one activity",
    content: {
      taskType: "monologue",
      prompt: "Imagine you are Chidi. You and your friend Yuna are part of the 'Community Action' club at your local youth centre. Your club leader has asked members for ideas for a free-time activity to help other teenagers in the community relax and have fun after school. You think teaching a simple craft like making friendship bracelets would be great, but Yuna wants to organise a board game tournament. Leave Yuna a voice message about which activity to propose.\n\nIn your message, you should:\n- Explain your idea for the activity and why it would be helpful.\n- Say what you think about Yuna's board game idea.\n- Compare both ideas and talk about their advantages and disadvantages.\n- Say which activity you think the club should propose to the club leader, and why.",
      rubric: juniorRubric(),
      purpose: "To compare two activity ideas and recommend one for the community project.",
      contextNote: "The candidate compares and contrasts two ideas, presents pros and cons and recommends one in a single longer turn, using simple comparative linking words and structures.",
      sampleBullets: ["Explains the bracelet idea and why it helps", "Gives an opinion on the board game idea", "Compares advantages and disadvantages of both", "Recommends one activity with a reason"],
      cefrDescriptor: B1_ARGUMENT,
    },
  },

  // ── B2 / C1 generated role plays ────────────────────────────────────────
  {
    id: "cmp095c5g002onuc6a0rxhgnc",
    itemCode: "SPE-B2-0071-MVX1NGDA",
    note: "friend (the examiner) asks about the fair → answer to the friend's printed question",
    content: {
      taskType: "monologue",
      prompt: "A friend missed the recent 'Riverside Community Arts & Crafts Fair' and asks you: 'So, tell me about the fair. I heard it was quite a big event this year. What was it like?'\n\n**Your task**: Describe the event, explain what you enjoyed or found interesting, and say which aspects could be improved. Try to persuade your friend to attend next year.",
      rubric: "B2 monologue combining description, evaluation, speculation and persuasion. Assess whether the candidate elaborates beyond description, uses B2 grammar such as conditionals and complex sentences, shows a varied lexical resource, and ends with a persuasive case for attending next year.",
      sampleBullets: ["Describes the event with relevant detail", "Explains what they enjoyed or found interesting", "Identifies aspects to improve and how", "Persuades the friend to attend next year"],
      cefrDescriptor: B2_ARGUMENT,
    },
  },
  {
    id: "cmp09urro003pnuc6ednmmj3x",
    itemCode: "SPE-C1-0085-MVX1NHKI",
    note: "meeting with a council official played by the examiner → recorded statement for the council",
    content: {
      taskType: "monologue",
      prompt: "You are Sam, a lead volunteer for the 'Harmony Festival', a significant annual community event. A local council official is reviewing the festival's impact before deciding on future support, and has asked you for a recorded statement. In your statement:\n\n1.  **Delineate** the festival's primary objectives and briefly describe its most recent edition.\n2.  **Evaluate** its overall success, with concrete examples and, where appropriate, supporting details or hypothetical scenarios.\n3.  **Discuss** any challenges or unforeseen issues that arose during the event, and how they were addressed or mitigated.\n4.  **Propose** strategies for enhancing its reach, impact and long-term sustainability, anticipating the council's likely concerns and answering them.\n\nUse nuanced language, qualify your statements with appropriate hedging, and formulate hypotheses about future outcomes.",
      rubric: "C1 formal monologue: evaluation, analysis and strategic proposal rather than description. Assess hedging ('It is arguably the case that…'), qualification ('Notwithstanding the logistical complexities…'), concession, hypotheses about future outcomes, persuasive anticipation of the council's concerns, and C1 vocabulary such as 'delineate', 'mitigate' and 'sustainability'.",
      sampleBullets: ["Delineates objectives and the latest edition concisely", "Evaluates success with concrete examples", "Explains challenges and how they were mitigated", "Proposes strategies and pre-empts the council's concerns", "Hedges and qualifies claims appropriately"],
      cefrDescriptor: C1_TALK,
    },
  },
  {
    id: "cmp09urvl003rnuc6m71g412s",
    itemCode: "SPE-C1-0085-MVX1NHND",
    note: "debrief led with a colleague (the examiner) → spoken review opening the debrief",
    content: {
      taskType: "monologue",
      prompt: "You are a Senior Project Manager for the local council, responsible for reviewing major community initiatives. You have been asked to open the debriefing meeting on the recently concluded 'Sustainable Futures Festival', a large-scale community event that promoted environmental awareness and local innovation, with a short spoken review.\n\nIn your review, you should:\n1.  **Delineate** the key objectives of the festival and evaluate the extent to which they were met, supporting your assessment with reasoned arguments and relevant examples or observations.\n2.  Explain the **inherent** challenges encountered during planning and execution, and how these might have affected the overall success, **albeit** without negating its positive aspects.\n3.  Propose concrete recommendations for future festivals that would **engender** greater community engagement and positive long-term effects on civic participation and the local economy.",
      rubric: "C1 formal, analytical monologue that moves beyond description to evaluation, problem-solving and hypothesising. The vocabulary (delineate, inherent, albeit, engender) is targeted at C1. Assess sophisticated grammatical structures, discourse markers and hedging typical of C1, and a clear structure from evaluation to recommendations.",
      sampleBullets: ["Delineates objectives and evaluates how far they were met", "Explains challenges and their effect without dismissing the successes", "Proposes concrete, justified recommendations", "Uses C1 hedging and discourse markers throughout"],
      cefrDescriptor: C1_TALK,
    },
  },

  // ── PRE_A1 Primary / Junior ─────────────────────────────────────────────
  {
    id: "cmoukee4e0000nu2j4189c4fx",
    itemCode: "SPE-PRE_A1-0047",
    note: "say hello to the examiner → say hello",
    content: {
      prompt: "Say hello and tell us your name.\nExample: 'Hello! My name is ___.'",
      cefrDescriptor: "Can say hello and give their name.",
    },
  },
  {
    id: "cmoukeels000anu2ji7a311zs",
    itemCode: "SPE-PRE_A1-0047-MVX1N3MY",
    note: "examiner stage direction removed; the picture is attached",
    content: { prompt: "Look at the picture. What is the weather like?\nSay one or two words to describe it." },
  },
  {
    id: "cmoukeeom000cnu2jspik1vjj",
    itemCode: "SPE-PRE_A1-0047-MVX1N3PR",
    note: "examiner stage direction removed; answer no longer assumes the picture shows three cats",
    content: {
      prompt: "Look at the picture. How many cats can you see?\nSay: 'I can see ___.'",
      sampleBullets: ["Says the number of cats in the picture", "Uses 'I can see…' or 'There is/are…'", "Number is clear"],
    },
  },
  {
    id: "cmoukeeq2000dnu2j28nhv6mo",
    itemCode: "SPE-PRE_A1-0047-MVX1N3R7",
    note: "examiner greets the candidate → candidate replies to a printed greeting",
    content: {
      taskType: "monologue",
      prompt: "Someone says to you: 'Hello! How are you today?'\nSay hello back and say how you are.",
      sampleBullets: ["Returns the greeting (hello / hi)", "Says how they are (fine / good / OK)", "Response is recognisable as a reply to a greeting"],
      cefrDescriptor: "Can reply to a simple greeting and say how they are.",
    },
  },
  {
    id: "cmoukee8p0002nu2j9wo7knzq",
    itemCode: "SPE-PRE_A1-0049",
    note: "examiner stage direction removed; the picture is attached",
    content: { prompt: "Look at the picture. What colours can you see? Say the colours." },
  },
  {
    id: "cmoukeea30003nu2j8lb0l5lc",
    itemCode: "SPE-PRE_A1-0050",
    note: "examiner stage direction removed; the picture is attached",
    content: { prompt: "Look at the picture. Name the animals you can see." },
  },
  {
    id: "cmoukeeeh0005nu2jimxup3wb",
    itemCode: "SPE-PRE_A1-0052",
    note: "examiner points at objects (no picture attached) → candidate names things in their school bag",
    content: {
      taskType: "monologue",
      prompt: "What is in your school bag? Say four things.\nExample: 'a pen'",
      sampleBullets: ["Names at least two school objects correctly (book, ruler, pencil…)", "Uses 'a' or 'the' before at least one noun", "Names are recognisable"],
    },
  },
  {
    id: "cmoukeeiv0008nu2j8kots4fa",
    itemCode: "SPE-PRE_A1-0055",
    note: "look at the examiner's top → look at your own clothes",
    content: {
      prompt: "Look at your clothes. What colour is your T-shirt or top?\nSay: 'It is ___.'",
      sampleBullets: ["Names a colour", "Uses 'It is…' or 'My T-shirt is…'", "Colour is understandable"],
    },
  },
  {
    id: "cmoukeek90009nu2jbohlyicx",
    itemCode: "SPE-PRE_A1-0056",
    note: "examiner points at body parts (no picture attached) → candidate names body parts unaided",
    content: {
      taskType: "monologue",
      prompt: "Say four parts of your body in English.\nExample: 'my head'",
      rubric: PRE_A1_RUBRIC,
      sampleBullets: ["Names at least two body parts correctly (hand, eye, nose, leg…)", "Attempts four body parts", "Names are recognisable"],
    },
  },

  // ── Seed items, A2–B1 ───────────────────────────────────────────────────
  {
    id: "cmorsvo0r0004nuf787hmqi3s",
    itemCode: "SPK-A2-0005",
    note: "examiner plays the shop assistant → imagined assistant; the price is given so the decision needs no reply",
    content: {
      taskType: "monologue",
      prompt: "Role play: You are in a shop. You want to buy a present for a friend. The shop assistant shows you a present that costs 25 euros. Speak to the shop assistant:\n• Say what kind of present you are looking for\n• Ask about the price\n• Say whether you will buy it at 25 euros, and explain your choice",
      sampleBullets: ["Opens politely (hello / excuse me)", "Describes what kind of present they want", "Asks the price correctly", "Says whether they will buy it, with a brief reason"],
      cefrDescriptor: "Can ask for things in a shop and give a simple reason for a choice.",
    },
  },
  {
    id: "cmorsvocc000bnuf71bownhb3",
    itemCode: "SPK-B1-0002",
    note: "discussion with the examiner → short opinion talk",
    content: {
      taskType: "monologue",
      prompt: "Give your opinion in a short talk: How much should schools do to teach students about environmental issues? Include:\n• Whether you think schools currently do enough\n• Two specific actions schools could take\n• Whether individuals or governments are more responsible for environmental problems",
      sampleBullets: ["Evaluates current school role", "Proposes 2 specific actions", "Discusses individual vs. collective responsibility", "Supports each opinion with a reason or example"],
      cefrDescriptor: B1_REASONS,
    },
  },
  {
    id: "cmorsvogv000enuf72nmm28li",
    itemCode: "SPK-B1-0005",
    note: "negotiation with the examiner as receptionist → voice message to the hotel manager",
    content: {
      taskType: "monologue",
      prompt: "Role play: You are staying in a hotel. There are problems with your room (e.g., broken air conditioning, no hot water). The reception desk is busy, so you leave a voice message for the hotel manager.\n• Explain the problems clearly\n• Say what you would like the hotel to do\n• Say what you would accept if that is not possible (e.g., a different room or a discount)",
      sampleBullets: ["Opens politely and identifies the problems", "Uses 'could you / would it be possible'", "States the solution they want", "Offers an acceptable alternative"],
      cefrDescriptor: "Can explain a problem and make a polite complaint to a service provider.",
    },
  },
  {
    id: "cmorsvooc000hnuf7oo4zk0x9",
    itemCode: "SPK-B1-0008",
    note: "discussion with the examiner's opinions → short talk that explains the other side",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk: Do you think it is a good idea for young people to take a gap year before university? Give your own view, explain the main argument on the other side, and say why you still hold your view.",
      sampleBullets: ["States own view clearly", "Explains the main opposing argument", "Uses hedging (it depends / on the other hand)", "Gives a concrete example"],
      cefrDescriptor: B1_ARGUMENT,
    },
  },
  {
    id: "cmorsvor8000jnuf73zzh7rj5",
    itemCode: "SPK-B1-0010",
    note: "joint decision with the examiner → plan presented to the other organisers",
    content: {
      taskType: "monologue",
      prompt: "You are organising an end-of-year school trip for 30 students (aged 14-15) with a budget of €1,500. Present your plan to the other organisers:\n• Type of trip (cultural, outdoor, etc.)\n• Where to go and how to get there\n• One main activity\nExplain how your plan fits the budget.",
      sampleBullets: ["Proposes a type of trip with reasons", "Says where to go and how to travel", "Suggests one main activity", "Considers the budget constraint"],
      cefrDescriptor: "Can explain a plan and give reasons for choices in a practical situation.",
    },
  },
  {
    id: "cmorsvou1000lnuf7ypr8vjq6",
    itemCode: "SPK-B1-0012",
    note: "negotiation with the manager (the examiner) → voice message that answers the manager's known concerns",
    content: {
      taskType: "monologue",
      prompt: "Role play: You are a new employee. You want to attend a training course next month, but your manager is concerned about the cost and your workload. Leave your manager a voice message:\n• Explain why the course is important\n• Answer the concerns about cost and workload\n• Suggest a compromise",
      sampleBullets: ["Uses polite professional register", "Argues the case with reasons", "Addresses the cost and workload concerns", "Proposes a compromise"],
      cefrDescriptor: "Can make a simple case for a request at work, with appropriate register.",
    },
  },
  {
    id: "cmos4ie8p0002nu5kwab4t7vy",
    itemCode: "SPK-B1-0018",
    note: "phone call with the examiner as colleague → voicemail to the colleague",
    content: {
      taskType: "monologue",
      prompt: "Role play: You need to tell a colleague about a problem with a shared project. Your colleague does not answer the phone, so you leave a voicemail.\n• Explain what the problem is\n• Say what you have already tried to do\n• Suggest a next step or ask for help",
    },
  },
  {
    id: "cmos4iea80003nu5kjvn1on92",
    itemCode: "SPK-B1-0019",
    note: "discussion with the examiner → ideas told to the other party planners",
    content: {
      taskType: "monologue",
      prompt: "You are helping to plan a surprise birthday party for a friend. Tell the other people planning the party your ideas:\n• Where you should hold the party (home or a venue) — give reasons\n• What kind of entertainment or activity would be best\n• How you would keep it a surprise",
      sampleBullets: ["Justifies choice of venue", "Suggests entertainment idea with reasons", "Gives practical suggestion for keeping surprise", "Links ideas with connectors (because, so, also)"],
      cefrDescriptor: "Can explain a plan and give reasons for choices on a familiar topic.",
    },
  },

  // ── Seed items, B2 ──────────────────────────────────────────────────────
  {
    id: "cmorsvp1b000pnuf76aal3kxs",
    itemCode: "SPK-B2-0001",
    note: "discussion challenging the examiner → talk that answers the strongest objection",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this statement: 'Universities should teach all students practical life skills (cooking, finance, mental health) alongside academic subjects.' Do you agree? Defend your view, and answer the strongest objection to it.",
      sampleBullets: ["States and defends a clear position", "Presents and answers the strongest objection fairly", "Uses discourse markers (admittedly / nevertheless / having said that)", "Acknowledges complexity"],
      cefrDescriptor: B2_ARGUMENT,
    },
  },
  {
    id: "cmorsvp48000rnuf7butqp9tb",
    itemCode: "SPK-B2-0003",
    note: "discussion with the examiner → argued talk with a counterargument",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this proposition: 'Animals should have the same legal rights as humans.' Present your view, deal with at least one counterargument, and reach a conclusion.",
      sampleBullets: ["Qualifies the proposition thoughtfully", "Distinguishes different types of rights", "Addresses at least one counterargument", "Reaches a nuanced conclusion"],
      cefrDescriptor: B2_ARGUMENT,
    },
  },
  {
    id: "cmorsvp9y000vnuf7eg7pp1t2",
    itemCode: "SPK-B2-0007",
    note: "debate with the examiner → argued talk that deals with the arguments against",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this proposition: 'English should become the world's only official language for international business and science.' Take a position and defend it, dealing with the strongest arguments against it.",
      cefrDescriptor: "Can develop an argument systematically, giving reasons for and against a point of view.",
    },
  },
  {
    id: "cmorsvpfv000ynuf7a6w3sexw",
    itemCode: "SPK-B2-0010",
    note: "negotiation with the examiner as the employee → video message to the employee",
    content: {
      taskType: "monologue",
      prompt: "Role play: You manage a small team. One of your best employees, Maya, has told you she wants to leave because she has received a better offer elsewhere. Before she makes her final decision, you record a video message for her. Persuade her to stay: show that you understand her reasons, offer better terms, and explain why staying would be good for her career.",
      sampleBullets: ["Opens professionally and empathetically", "Acknowledges the employee's likely motivations", "Makes a concrete counter-offer", "Anticipates an objection and answers it without pressure"],
    },
  },
  {
    id: "cmorsvphb000znuf7laxrxofc",
    itemCode: "SPK-B2-0011",
    note: "discussion with the examiner → opinion talk",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk: Is the rise of citizen journalism (ordinary people reporting news via social media) a positive or negative development for society? Defend your view.",
      sampleBullets: ["Acknowledges pros and cons of citizen journalism", "Distinguishes it from professional journalism", "Defends overall verdict with evidence", "Anticipates and answers an objection to the verdict"],
      cefrDescriptor: "Can develop a clear argument on media and society topics, supporting views with relevant examples.",
    },
  },
  {
    id: "cmorsvpk90011nuf72vau8vt4",
    itemCode: "SPK-B2-0013",
    note: "discussion with the examiner → talk exploring the statement",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this statement: 'It is better to be honest and unpopular than popular but dishonest.' Explore its philosophical dimensions from multiple perspectives.",
      cefrDescriptor: "Can develop a clear argument on philosophical and ethical questions with developed reasoning.",
    },
  },
  {
    id: "cmos4ieda0005nu5kf8pcza1b",
    itemCode: "SPK-B2-0016",
    note: "discussion with the examiner's counter-arguments → talk that answers the strongest counter-argument",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this statement: 'Smartphones have done more harm than good to society.' Share your view, consider both sides, and answer the strongest counter-argument.",
      sampleBullets: ["Gives a clear initial position with reasons", "Acknowledges the opposing view", "Answers the strongest counter-argument directly", "Uses hedging/concession language"],
    },
  },
  {
    id: "cmos4iehx0008nu5k1hkhdp7g",
    itemCode: "SPK-B2-0019",
    note: "feedback meeting with the examiner as team member → feedback given as the meeting opens",
    content: {
      taskType: "monologue",
      prompt: "Role play: You are a team leader about to give feedback to a team member whose recent work has been below standard. Give the feedback as you would at the start of the meeting:\n• Acknowledge something they did well\n• Raise the specific performance issue clearly and constructively\n• Propose an action plan and invite their ideas on it",
      sampleBullets: ["Opens with positive feedback", "Raises the issue clearly but diplomatically", "Proposes a concrete improvement plan", "Invites the team member's input"],
    },
  },
  {
    id: "cmos4ieov000bnu5k6bp1yof5",
    itemCode: "SPK-B2-0022",
    note: "examiner's questions → talk that weighs the main counter-argument",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk: should advertising aimed at children under twelve be banned? Give your view, consider the main counter-argument, and explain why your view still holds.",
      sampleBullets: ["States a clear position with reasoning", "Engages with the main counter-argument", "Explains why the view holds despite it", "Uses discourse markers (on the other hand, having said that)"],
      cefrDescriptor: "Can critically evaluate media practices in a structured argument.",
    },
  },
  {
    id: "cmos4ierz000dnu5kzgo2gssw",
    itemCode: "SPK-B2-0024",
    note: "discussion with the examiner → structured talk",
    content: {
      taskType: "monologue",
      prompt: "You have read that scientists have developed a pill that could significantly extend the average human lifespan to 150 years. Give a short talk:\n• What you think the main benefits of this would be\n• What social problems it might create\n• Whether you think it should be made available to everyone",
      sampleBullets: ["Identifies at least two genuine benefits", "Raises at least one credible social problem", "Takes and justifies a position on access", "Anticipates an objection to that position"],
      cefrDescriptor: "Can give a clear, structured talk on a scientific or factual topic, with reasons and examples.",
    },
  },
  {
    id: "cmos4ieth000enu5kdwcs3c98",
    itemCode: "SPK-B2-0025",
    note: "negotiation with the examiner as client → voice message answering the client's stated constraint",
    content: {
      taskType: "monologue",
      prompt: "Role play: You are negotiating a freelance contract. The client has offered a lower fee than you want, explaining that their budget is limited this year. Record a voice message to the client:\n• State clearly what you are asking for and why\n• Show that you understand their budget constraint\n• Propose a compromise you could both accept",
      sampleBullets: ["States position and justification clearly", "Acknowledges and paraphrases the client's budget constraint", "Proposes a compromise or alternative", "Maintains professional, constructive register"],
      cefrDescriptor: "Can put a case and propose a compromise in professional contexts.",
    },
  },
  {
    id: "cmos4iewp000gnu5kvz6s77vt",
    itemCode: "SPK-B2-0027",
    note: "discussion with the examiner → talk that deals with the strongest objection",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this ethical dilemma: A doctor has access to a life-saving drug. There are ten doses left and eleven critically ill patients. One patient is a retired scientist who once made important discoveries; the others are ordinary members of the public. Should the doctor give priority to the scientist? Give your view and deal with the strongest objection to it.",
      sampleBullets: ["States a position and basic reasoning", "Engages with the counter-argument", "Applies a principle (fairness, utility, need) consistently", "Answers the strongest objection without losing the thread"],
    },
  },

  // ── Seed items, C1 ──────────────────────────────────────────────────────
  {
    id: "cmorsvpog0014nuf7b6515dse",
    itemCode: "SPK-C1-0001",
    note: "discussion with the examiner → long-turn talk",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this proposition: 'The rule of law is the most important foundation of a democratic society.' Engage critically with it, consider counterarguments, and reach a nuanced conclusion.",
      cefrDescriptor: C1_TALK,
    },
  },
  {
    id: "cmorsvpue0017nuf79to869oi",
    itemCode: "SPK-C1-0004",
    note: "discussion with the examiner's challenges → talk that anticipates the strongest challenges",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this proposition: 'Economic inequality is inevitable in a market economy and should be managed rather than eliminated.' Defend your view and anticipate the strongest challenges to it.",
      sampleBullets: ["Distinguishes inequality of opportunity from outcome", "Uses economic concepts fluently", "Anticipates serious challenges and answers them substantively", "Sophisticated discourse markers (I grant that / notwithstanding / it bears noting)"],
      cefrDescriptor: "Can develop an argument on complex economic and social issues fluently, with precise reasoning.",
    },
  },
  {
    id: "cmorsvpyp001anuf7dxwxxq0k",
    itemCode: "SPK-C1-0007",
    note: "negotiation with the examiner as retailer → opening proposal at the negotiation",
    content: {
      taskType: "monologue",
      prompt: "Role play: You represent a tech company seeking a partnership with a large retail chain. Your objective is a 3-year exclusive distribution contract with favourable commission terms; the retailer has said it wants a short-term pilot contract first. Present your company's proposal at the start of the negotiation meeting, taking the retailer's position into account.",
      sampleBullets: ["Opens with strategic framing", "Identifies interests vs. positions (separates commitment from trial)", "Proposes a creative compromise", "Uses diplomatic, persuasive language"],
      cefrDescriptor: "Can present a negotiating position in professional contexts with precision.",
    },
  },
  {
    id: "cmorsvq06001bnuf7wq159bnl",
    itemCode: "SPK-C1-0008",
    note: "discussion with the examiner → long-turn talk",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this statement: 'Translation is always an act of betrayal — something fundamental is always lost.' Do you agree? Consider the implications for literature, diplomacy and cross-cultural understanding.",
      cefrDescriptor: "Can give a nuanced, well-structured talk on a complex cultural subject.",
    },
  },
  {
    id: "cmorsvq4h001enuf7o1rvqzzc",
    itemCode: "SPK-C1-0011",
    note: "discussion with the examiner → talk that considers the strongest objections",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this proposition: 'Populism is a symptom of democracy's failures rather than a threat to democracy.' Unpack it critically, considering the strongest objections to your view.",
      sampleBullets: ["Defines populism carefully", "Distinguishes symptom vs. threat framing", "Uses historical examples", "Anticipates counterpoints and answers them precisely"],
      cefrDescriptor: "Can give a clear, well-structured talk on complex political ideas.",
    },
  },
  {
    id: "cmorsvq8v001gnuf7kzebs6x7",
    itemCode: "SPK-C1-0013",
    note: "debate under the examiner's counterarguments → talk that sets out and answers the counterarguments",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this proposition: 'Capitalism is inherently incompatible with environmental sustainability.' Defend a position, and set out and answer the strongest counterarguments.",
      sampleBullets: ["Frames the core tension between growth imperative and ecological limits", "Considers green capitalism arguments", "Answers the strongest counterarguments without giving up the position without reason", "Uses conceptually precise vocabulary (externalities/discount rate/steady-state economy)"],
      cefrDescriptor: "Can defend a complex position, answering counterarguments with precision.",
    },
  },
  {
    id: "cmorsvqa9001hnuf7u0dc2vpf",
    itemCode: "SPK-C1-0014",
    note: "press conference with the examiner as journalist → opening statement that anticipates the hard questions",
    content: {
      taskType: "monologue",
      prompt: "Role play: You are the Communications Director of a major company. A data breach affecting 2 million customers has just been disclosed. Deliver your opening statement at the press conference:\n• Explain what happened\n• Address the company's responsibility\n• Explain what will be done\nAnticipate the hardest questions journalists are likely to ask, and answer them in your statement.",
      sampleBullets: ["Delivers a composed, transparent opening statement", "Acknowledges responsibility proportionately", "Provides concrete action commitments", "Answers the likely hostile questions in a professional tone"],
    },
  },
  {
    id: "cmos4if4t000knu5kxs69m457",
    itemCode: "SPK-C1-0016",
    note: "discussion with the examiner → long-turn academic talk",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this claim: some scholars argue that the scientific method is insufficient for answering ethical questions. Do you agree? Engage with the strongest version of both sides and arrive at a considered position.",
      cefrDescriptor: C1_TALK,
    },
  },
  {
    id: "cmos4if9e000nnu5k5poetufb",
    itemCode: "SPK-C1-0019",
    note: "counterfactual discussed with the examiner → speculative talk",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this counterfactual: 'If the printing press had not been invented in the fifteenth century, would the Reformation and the Scientific Revolution have occurred?' Consider what the printing press actually contributed, what alternative mechanisms existed, and how much weight to place on contingency versus structural forces in history.",
      cefrDescriptor: "Can give a speculative, analytical talk on a historical question.",
    },
  },
  {
    id: "cmos4ifbd000onu5kphre1i3y",
    itemCode: "SPK-C1-0020",
    note: "discussion with the examiner → analytical talk",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this question: in what ways does the increasing concentration of global tech infrastructure in a small number of companies (e.g., cloud services, payment systems, communication platforms) represent a systemic risk? What regulatory responses would be most appropriate, and what are the trade-offs?",
    },
  },
  {
    id: "cmos4ifjk000snu5knx4ifcwu",
    itemCode: "SPK-C1-0024",
    note: "announcement with the examiner as team member → announcement at the team meeting",
    content: {
      taskType: "monologue",
      prompt: "Role play: You are a senior manager. The company is undergoing a restructuring that may involve redundancies, though no final decisions have been made. Make the announcement to your team at the start of a team meeting. Communicate honestly, acknowledge uncertainty, maintain morale, and tell the team how they can raise their questions.",
      sampleBullets: ["Communicates the situation honestly without overstating certainty", "Acknowledges the emotional impact explicitly", "Outlines what is and is not yet known", "Addresses the team's likely concerns without deflection"],
    },
  },
  {
    id: "cmos4ifl5000tnu5k3japhxpi",
    itemCode: "SPK-C1-0025",
    note: "discussion with the examiner → analytical talk",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this question: to what extent should international business professionals adapt their communication style to match the cultural norms of their partners, and at what point does such adaptation become problematic or inauthentic?",
      cefrDescriptor: "Can give a nuanced talk on cross-cultural business communication.",
    },
  },
  {
    id: "cmos4ifo9000vnu5k66vtmgj4",
    itemCode: "SPK-C1-0027",
    note: "discussion with the examiner → analytical talk",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on this question: can a novel or work of literature change the world? Use at least one specific example to support your view, and engage with the argument that art's social impact is typically overstated.",
      cefrDescriptor: "Can give an analytical talk on literary and cultural works.",
    },
  },
  {
    id: "cmos4ifpr000wnu5k3t99g3g5",
    itemCode: "SPK-C1-0028",
    note: "defence against the examiner's counter-examples → talk that deals with the strongest counter-examples",
    content: {
      taskType: "monologue",
      prompt: "Give a short talk on the claim that 'there is no such thing as a selfless act.' Defend your position against the strongest counter-examples you can think of, and consider whether the framing of the claim is itself philosophically coherent.",
      sampleBullets: ["States and explains an initial position", "Deals with counter-examples without retreat or inconsistency", "Interrogates the framing (psychological egoism, definitional collapse)", "Maintains philosophical precision throughout"],
    },
  },
  {
    id: "cmos4ifrb000xnu5kxdu8wkhk",
    itemCode: "SPK-C1-0029",
    note: "pitch to the examiner as a sceptical panel member → recorded pitch that addresses the committee's likely doubts",
    content: {
      prompt: "You are presenting a research proposal to a funding committee in a recorded pitch. Propose a research question in any field you know well, justify why it is worth investigating, describe your methodology, and address the committee's likely doubts about feasibility and significance.",
      sampleBullets: ["States a clear, researchable question", "Justifies its significance convincingly", "Describes a methodologically coherent approach", "Addresses doubts about feasibility and significance without becoming defensive"],
    },
  },
  {
    id: "cmos4ifuz000ynu5k9dbi5k3i",
    itemCode: "SPK-C1-0030",
    note: "call with the examiner as journalist → recorded statement for the journalist",
    content: {
      taskType: "monologue",
      prompt: "Role play: You are the communications director of a company. Reports have linked your company's product to several health incidents, and a journalist has asked for a comment. Record your spoken statement for the journalist: acknowledge the seriousness, avoid speculation, commit to transparency, protect the company's reputation, and avoid saying anything legally compromising.",
    },
  },

  // ── Seed items, C2 (SPK-C2-0009 is rewritten in apply-c2-academia-rewrite.ts) ──
  {
    id: "cmorsvqd4001jnuf7i3c6n3jv",
    itemCode: "SPK-C2-0001",
    note: "discussion with the examiner → long-turn talk",
    content: {
      taskType: "monologue",
      prompt: "Give a talk on this proposition: 'The concept of progress is inherently Eurocentric and should be abandoned.' Engage philosophically and historically, addressing the strongest arguments on both sides.",
    },
  },
  {
    id: "cmorsvqei001knuf7k71wt00e",
    itemCode: "SPK-C2-0002",
    note: "examiner's follow-up questions → lecture that raises and answers two expert questions",
    content: {
      prompt: "Deliver a 4-minute academic mini-lecture on one of the following:\n(a) The philosophical implications of quantum mechanics for our understanding of causality\n(b) The political economy of climate inaction\n(c) Why narrative structure shapes memory formation\n\nEnd by raising two questions an expert audience would be likely to ask, and answer them.",
      sampleBullets: ["Selects and introduces topic with intellectual precision", "Develops 3 substantive points with evidence or reasoning", "Uses appropriate academic hedging and referencing conventions", "Raises and answers two expert-level questions with authority and nuance"],
      cefrDescriptor: "Can deliver a sophisticated, precise academic presentation and anticipate expert-level questions.",
    },
  },
  {
    id: "cmorsvqfw001lnuf75561v2t4",
    itemCode: "SPK-C2-0003",
    note: "debate with the examiner → talk that sets out and answers the strongest objections",
    content: {
      taskType: "monologue",
      prompt: "Give a talk on this proposition: 'The greatest intellectual challenge of the 21st century is not technological but ethical — specifically, how to govern technologies whose power exceeds our wisdom.' Defend and critically examine it at the highest intellectual level, setting out the strongest objections and answering them.",
      sampleBullets: ["Interrogates the distinction between technological and ethical challenges", "Draws on philosophy of technology (Jonas/Winner/Haraway or similar)", "Sustains the argument against the strongest objections", "Demonstrates mastery-level vocabulary and register"],
      cefrDescriptor: "Can present a complex, demanding intellectual argument with sustained coherence.",
    },
  },
  {
    id: "cmorsvqiq001nnuf7jtdwf1lx",
    itemCode: "SPK-C2-0005",
    note: "negotiation with the examiner as a major nation → statement to the plenary session",
    content: {
      taskType: "monologue",
      prompt: "Role play: You are a senior diplomat representing a smaller nation at a multilateral climate negotiation. A major industrialised nation is resisting binding emissions targets. Deliver your statement to the plenary session: propose a compromise your nation can accept, and manage the power asymmetry diplomatically.",
      sampleBullets: ["Opens with strategic framing and rapport-building", "Identifies mutual interests beneath stated positions", "Uses diplomatic language of high precision (I would venture / it would be remiss of us not to acknowledge / with the greatest respect)", "Proposes an acceptable compromise while managing power dynamics"],
    },
  },
  {
    id: "cmos4ifwh000znu5kapcp9neo",
    itemCode: "SPK-C2-0006",
    note: "discussion with the examiner's extensions → talk that extends and answers the objections",
    content: {
      taskType: "monologue",
      prompt: "Give a talk on this question: Descartes' cogito ('I think, therefore I am') is sometimes claimed to be the one indubitable philosophical foundation. Is it? Consider objections (Lichtenberg's grammar objection, Hume's bundle theory, the privacy of consciousness problem) and arrive at your own assessment.",
      sampleBullets: ["Articulates the cogito argument precisely", "Presents at least two serious objections with accuracy", "Considers how the objections could be pressed further and answers them", "Arrives at an original, nuanced position", "Maintains fully fluent, precise philosophical register"],
    },
  },
  {
    id: "cmos4ifzk0011nu5kuv4jpvx0",
    itemCode: "SPK-C2-0008",
    note: "defence under the examiner's questioning → extended talk that addresses the listed challenges",
    content: {
      taskType: "monologue",
      prompt: "Defend the following position in an extended talk: 'Democracy is not merely the best available form of government; it is the only form consistent with human dignity.' Address the strongest challenges to it: non-liberal democracies, technocracy, epistocracy, the performance gap between democracies and benevolent autocracies, and the concept of dignity itself.",
      sampleBullets: ["Articulates the dignity-based argument precisely", "Addresses each challenge without contradiction", "Distinguishes between procedural and substantive democracy", "Maintains a coherent position while acknowledging complexity", "Uses sophisticated hedging and qualification appropriately"],
      cefrDescriptor: "Can defend a complex intellectual position against the strongest objections in an extended talk.",
    },
  },

  // ── Pretest items found only by REPLY_EXPECTED (follow-up, 2026-11-22) ──
  {
    id: "cmp0bky4e0067nuc6ilgezmyf",
    itemCode: null,
    note: "friend will ask unseen questions → candidate answers the friend's printed questions",
    content: {
      taskType: "monologue",
      prompt: "You meet a new friend. Your friend says: 'Hello! What is your name? Do you like to walk? Do you like to run?'\n\nAnswer your friend.\nSay your name.\nSay 'yes' or 'no' about walking.\nSay 'yes' or 'no' about running.",
      rubric: "PRE_A1 guided response on physical activity, simplified to 'walk' and 'run' as the CEFR can-do statements allow at this level (isolated words and phrases, giving own name). The friend's three questions are printed in the prompt. Assess whether the candidate gives their name and answers both questions recognisably; grammatical accuracy is not expected.",
      sampleBullets: ["Says their name (e.g. 'My name is Sam' or 'Sam')", "Answers about walking ('Yes' / 'No' / 'I like walk')", "Answers about running", "Words are recognisable"],
      cefrDescriptor: "Can give their name and say simply what they like.",
    },
  },
  {
    id: "cmp0anep7004wnuc6vfoteop2",
    itemCode: null,
    note: "neighbour starts the conversation → candidate answers the neighbour's printed question",
    content: {
      taskType: "monologue",
      prompt: "A new person lives near you. This person wants to know about a market. The market is near your home. It is small. It happens every week.\n\nThis person asks you: 'Hello! I'm new here. Is there a good market near us?'\n\nNow, tell this person about the market. In your answer, you should:\n*   say where the market is.\n*   say when the market happens.\n*   say what people can buy there.\n*   say if you like the market, and why.",
      rubric: "A1 guided monologue: the candidate gives simple information about a familiar place in answer to a printed question. The bullet points guide the candidate to enough content for assessment without complex sentence structures. Assess coverage of the four points (where, when, what to buy, opinion with a simple reason) with A1 vocabulary (market, home, buy, like).",
      sampleBullets: ["Says where the market is", "Says when it happens (e.g. 'every Saturday')", "Names things people can buy there", "Says if they like it, with a simple reason"],
      cefrDescriptor: "Can describe a familiar place simply and say why they like it.",
    },
  },
  {
    id: "cmp0avnlk0059nuc64r4uoidd",
    itemCode: null,
    note: "candidate starts a conversation with Alex → voice message to Alex",
    content: {
      taskType: "monologue",
      prompt: "There is too much rubbish in your street. Leave your friend Alex a voice message about the problem.\nSay where the rubbish is.\nSay how you feel about it.",
      rubric: "A1 short monologue: the topic 'environmental challenges' is made concrete and observable ('too much rubbish in my street'), so candidates can describe a problem in their immediate environment and say how they feel with simple phrases. Assess whether both points are covered intelligibly.",
      sampleBullets: ["Says where the rubbish is (e.g. 'in my street', 'near the park')", "Says how they feel ('I am sad', 'I don't like it')", "Uses simple sentences that are intelligible"],
      cefrDescriptor: "Can describe a simple problem in their surroundings and say how they feel.",
    },
  },
  {
    id: "cmp081ht9000vnuc64lj46mmq",
    itemCode: "SPE-A2-0059-MVX1NED7",
    note: "conversation with Alex, asking Alex questions → voice message to Alex",
    content: {
      taskType: "monologue",
      prompt: "Your friend Alex has told you they are thinking about going back to study something new. Leave Alex a voice message about learning.\n\nIn your message, you should:\n*   Talk about your own school experience. What did you like and dislike?\n*   Explain why you think learning new things is important for people's lives and future jobs.\n*   Wish Alex good luck with their plans.",
      rubric: "A2 guided monologue: the candidate uses the simple past for school experiences, the present simple for opinions, and basic connectors such as 'because' and 'so' for reasons. Vocabulary within the NGSL top 1000 and Oxford 2000. Assess coverage of the three points and how clearly the ideas are linked.",
      sampleBullets: ["Describes their own school experience with likes and dislikes (past simple)", "Gives at least one reason why learning matters for life or jobs", "Links ideas with because / so", "Closes the message appropriately (e.g. good luck)"],
      distractorRationale: {
        "Weak Performance Indicators": "A weaker performance at A2 might include:\n*   **Grammar:** Frequent use of present simple instead of past simple for past experiences (e.g., 'I like my teacher' instead of 'I liked my teacher'). Difficulty forming simple comparative sentences (e.g., 'more interesting').\n*   **Vocabulary:** Limited vocabulary, relying heavily on repetition or very general words. Difficulty finding words for concepts like 'important', 'future', or 'job'.\n*   **Fluency & Coherence:** Long pauses, frequent self-correction, or an inability to connect ideas beyond simple 'and'. Difficulty expanding on ideas beyond very short, simple sentences.\n*   **Task coverage:** Leaves out one of the points, or talks only about school without saying why learning matters.\n*   **Pronunciation:** Unintelligible words or phrases that make it difficult for the listener to understand the message, even with effort.",
      },
      cefrDescriptor: "Can describe past experiences simply and give reasons for an opinion.",
    },
  },
  {
    id: "cmp07v9vf000nnuc65e7bcinb",
    itemCode: "SPE-A2-0059-MVX1NDV5",
    note: "Alex starts the conversation and the candidate asks Alex back → answer to Alex's printed question",
    content: {
      taskType: "monologue",
      prompt: "Your friend Alex is thinking about buying a new smartphone or tablet and wants to know how it could help in daily life. Alex asks you: 'Hi! I'm thinking about getting a new phone or tablet. How do you use technology every day? Do you think it's helpful?'\n\nAnswer Alex:\n*   Tell Alex how you use technology (e.g., your phone, computer, or tablet) every day, and two ways it helps you.\n*   Say what is good about technology and one bad thing.\n*   Give Alex one idea for using a new phone or tablet.",
      rubric: "A2 guided monologue: simple description, explanation and opinion on a familiar topic. Assess whether the candidate describes daily use, gives two ways technology helps, names good points and one bad point, and offers an idea for Alex, with simple connectors.",
      sampleBullets: ["Describes daily use of technology", "Gives two ways it helps", "Names a good point and one bad point", "Suggests one idea for Alex's new device"],
      cefrDescriptor: "Can describe everyday habits and give simple reasons and advice.",
    },
  },
  {
    id: "cmp089oyk0018nuc64jno3jqi",
    itemCode: "SPE-B1-0065",
    note: "follow-up questions from Alex → answer covers the likely follow-up points",
    content: {
      taskType: "monologue",
      prompt: "Your new colleague Alex is interested in staying active and healthy, and asks you what you do or would like to do.\n\n**Your task:**\n1.  Describe a typical exercise routine you have, or one you would like to have.\n2.  Explain:\n    *   What kind of activities you do (or would like to do).\n    *   When you usually do them.\n    *   Why you think regular activity is important for health.\n3.  Give Alex one piece of advice for starting a routine.",
      rubric: "B1 sustained monologue: description of a routine, reasons and advice. Vocabulary within the NGSL top 2000 and Oxford 3000; present simple for routines, 'because' clauses for justification, basic modals for advice. Assess coverage of the points and use of B1 discourse markers such as 'I think… because', 'in my opinion' and 'for example'.",
      sampleBullets: ["Describes the activities in a routine", "Says when they do them", "Explains why regular activity matters for health", "Gives Alex a piece of advice"],
      cefrDescriptor: B1_REASONS,
    },
  },
  {
    id: "cmp09a26q002wnuc6lj3hl9xt",
    itemCode: "SPE-B2-0071-MVX1NGMO",
    note: "career advisor starts a discussion → answer to the advisor's printed question",
    content: {
      taskType: "monologue",
      prompt: "Imagine you are meeting a career advisor, Alex, who wants to understand your preferences in detail to help you find the best opportunities.\n\nAlex asks you: 'First, tell me what your ideal workplace would be like. Please describe the kind of environment, culture, and team that would motivate you most. Then, could you explain why these elements are important for your professional development and job satisfaction?'\n\nAnswer Alex's question.",
    },
  },
  {
    id: "cmp09urtt003qnuc6nmxzbamy",
    itemCode: "SPE-C1-0085-MVX1NHLZ",
    note: "conversation with Dr Reed → recorded statement for the Fund",
    content: {
      taskType: "monologue",
      prompt: "You are a dedicated community organiser. Dr. Evelyn Reed, a senior representative of the 'Global Community Initiatives Fund', wants to understand how grassroots events contribute to local development and social cohesion, and has asked you for a recorded statement.\n\nDescribe a significant community event that recently took place in your local area. Do not just recount the activities; you should:\n1.  **Delineate** the event's primary objectives and how far they were achieved.\n2.  **Elucidate** the broader impact on the community, perhaps touching upon aspects such as social capital, economic benefits, or cultural enrichment.\n3.  **Articulate** any unforeseen challenges or limitations encountered during its planning and execution, and how these were addressed or mitigated.\n4.  **Propose** how the insights garnered from this event could be leveraged for future community endeavours, potentially seeking the Fund's support for similar initiatives.",
      rubric: "C1 formal monologue that moves beyond description to analysis, evaluation and future planning. The verbs (delineate, elucidate, articulate, propose) and abstract concepts (social capital, cultural enrichment, insights garnered) call for sophisticated oral production and precise meaning. The statement to a funding body calls for a formal register and a persuasive close.",
      sampleBullets: ["Delineates objectives and how far they were met", "Elucidates the wider community impact", "Explains challenges and how they were mitigated", "Proposes future use of the insights and makes a case for the Fund's support"],
      cefrDescriptor: C1_TALK,
    },
  },
  {
    id: "cmp09pbao003knuc6lvdfujnp",
    itemCode: "SPE-C1-0093",
    note: "mentor discussion with follow-up questions → reflective talk for the mentor",
    content: {
      taskType: "monologue",
      prompt: "Your mentor, Dr. Anya Sharma, has asked you to record a short reflection on a challenging skill you aspire to acquire in the next few years, your motivations, and the broader implications of such an endeavour.\n\nIn your reflection, you should:\n1.  **Delineate** the specific, sophisticated skill you aim to master, explaining its inherent complexity and scope.\n2.  **Articulate** your intrinsic motivations for pursuing this particular skill, perhaps touching upon how it aligns with your long-term vision.\n3.  **Explain** the potential benefits this acquisition could **give rise to**, both for your personal growth and professional trajectory, acknowledging any **caveats** or limitations.\n4.  **Propose** a pragmatic approach or methodology for its acquisition, **despite** the anticipated difficulties, and **conjecture** about the time commitment involved.",
      rubric: "C1 reflective monologue. Assess sophisticated discourse, hedging, nuanced argumentation and the integration of sub-themes; the articulation of abstract ideas, justification of positions and a pragmatic plan, reflecting the C1 can-do statements for sustained monologue.",
      sampleBullets: ["Delineates the skill and its complexity", "Articulates intrinsic motivations", "Weighs benefits with caveats", "Proposes a pragmatic approach and conjectures about the time involved"],
      cefrDescriptor: C1_TALK,
    },
  },
  {
    id: "cmp0b4qai005jnuc60izl0rxo",
    itemCode: null,
    note: "panel presentation with follow-up questions → presentation that anticipates the panel's questions",
    content: {
      taskType: "presentation",
      prompt: "You are presenting at a panel session titled 'The Pursuit of Mastery: Beyond Utilitarian Acquisition'. Your role is to present a skill you aspire to learn, not merely for its pragmatic utility, but for its potential to fundamentally reshape your cognitive framework, intellectual disposition, or engagement with the world.\n\nIn your presentation, you should:\n1.  **Identify** a specific, complex skill (e.g., advanced theoretical physics, classical Latin rhetoric, abstract algorithmic composition, master craftsmanship, complex musical composition, intricate traditional storytelling, complex software architecture).\n2.  **Articulate** the profound intellectual or personal motivations underpinning this aspiration, going beyond superficial interest.\n3.  **Elucidate** the inherent difficulties and protracted commitment required, perhaps contrasting it with more readily attainable proficiencies.\n4.  **Conjecture** on the anticipated transformative effects of achieving mastery for your worldview, problem-solving approaches, or capacity for nuanced understanding.\n5.  **Engage** with the idea of 'mastery' itself: what does it truly entail in this domain, and how might progress towards it be measured?",
      sampleBullets: ["Identifies a complex skill precisely", "Articulates motivations beyond utility", "Elucidates the difficulty and commitment involved", "Conjectures on transformative effects", "Interrogates what mastery means and how progress could be measured"],
      cefrDescriptor: "Can present a complex topic with mastery, nuance and precision, reformulating ideas to convey finer shades of meaning.",
    },
  },
];
