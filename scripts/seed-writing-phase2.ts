/**
 * WRITING — Phase 2: Gap-fill (B1 – C2)
 * +45 WRITING_PROMPT items scored 0–10 by Gemini AI (GRM model)
 * SEED_TAG: "seed-writing-phase2"
 *
 * Distribution: B1=10, B2=15, C1=15, C2=5
 * Targets NOT duplicated from Phase 1:
 *   B1:  formal application letter, informal advice email, product review, narrative (diary),
 *        discursive paragraph, problem–solution essay, short story continuation,
 *        text message/note, job enquiry letter, environmental campaign poster text
 *   B2:  academic essay (two-sides), proposal, business email, creative description,
 *        comparative analysis, letter to authority, journalistic article, debate speech,
 *        film/book analysis, memo
 *   C1:  critical essay, analytical report, formal proposal, opinion column,
 *        abstract/executive summary, rhetorical speech, literary analysis,
 *        problem–solution report, reflective journal, academic argument
 *   C2:  scholarly argumentative essay, policy brief, literary critique,
 *        satirical piece, epistolary short fiction
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SEED_TAG = "seed-writing-phase2";

const RUBRIC = {
  B1: [
    { name: "Task Achievement",     maxScore: 2, descriptor: "Writes straightforward connected text on familiar and mildly unfamiliar topics." },
    { name: "Grammar & Accuracy",   maxScore: 2, descriptor: "Uses a range of basic structures; errors do not impede communication." },
    { name: "Vocabulary",           maxScore: 2, descriptor: "Sufficient vocabulary to express ideas on everyday topics." },
    { name: "Coherence & Cohesion", maxScore: 2, descriptor: "Uses a limited number of cohesive devices; text is generally clear." },
    { name: "Communicative Effect", maxScore: 2, descriptor: "Intended audience would understand the text with minimal difficulty." },
  ],
  B2: [
    { name: "Task Achievement",     maxScore: 2, descriptor: "Writes detailed texts on a variety of subjects related to field of interest." },
    { name: "Grammar & Accuracy",   maxScore: 2, descriptor: "Shows good control of grammar; errors are rare and do not cause misunderstanding." },
    { name: "Vocabulary",           maxScore: 2, descriptor: "Uses a broad lexical repertoire; some inaccuracies but clearly communicates." },
    { name: "Coherence & Cohesion", maxScore: 2, descriptor: "Uses varied cohesive devices with reasonable effectiveness." },
    { name: "Communicative Effect", maxScore: 2, descriptor: "Clear and appropriate style for the intended audience." },
  ],
  C1: [
    { name: "Task Achievement",     maxScore: 2, descriptor: "Writes clear, well-structured, detailed texts on complex subjects." },
    { name: "Grammar & Accuracy",   maxScore: 2, descriptor: "High grammatical accuracy; occasional minor slips." },
    { name: "Vocabulary",           maxScore: 2, descriptor: "Good range of vocabulary; uses some idiomatic and nuanced expressions." },
    { name: "Coherence & Cohesion", maxScore: 2, descriptor: "Wide variety of cohesive devices used flexibly and appropriately." },
    { name: "Communicative Effect", maxScore: 2, descriptor: "Effective and appropriate register for purpose and audience." },
  ],
  C2: [
    { name: "Task Achievement",     maxScore: 2, descriptor: "Writes complex, sophisticated texts with nuance and precision." },
    { name: "Grammar & Accuracy",   maxScore: 2, descriptor: "Maintains consistent grammatical control across all structures." },
    { name: "Vocabulary",           maxScore: 2, descriptor: "Precise and sophisticated lexical choice; near-native range." },
    { name: "Coherence & Cohesion", maxScore: 2, descriptor: "Masterful use of cohesive devices; text flows naturally." },
    { name: "Communicative Effect", maxScore: 2, descriptor: "Entirely natural, accomplished register matching sophisticated audience." },
  ],
};

const items = [
  // ═══════════════════════════════════════
  // B1 — 10 items (difficulty −0.5 to 0.5)
  // ═══════════════════════════════════════
  {
    cefrLevel: "B1", difficulty: -0.5, discrimination: 1.1,
    tags: ["writing", "b1", "application-letter", "formal", "language-schools", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 100, max: 150 }, productLine: "Language Schools",
      cefrDescriptor: "Can write straightforward formal letters for practical purposes.",
      prompt: "Write a formal letter to apply for a part-time job in a café. Include:\n• Why you are writing\n• Your relevant experience or skills\n• Your availability\n• A polite closing sentence",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Dear Sir / Madam,\n\nI am writing to apply for the part-time barista position advertised on your website last week.\n\nI have six months of experience working as a kitchen assistant at a local restaurant, where I developed good customer service and teamwork skills. I enjoy working in a fast-paced environment and I am reliable and punctual.\n\nI am available to work on Saturdays and Sundays, as well as Monday and Wednesday evenings. I am also flexible during school holidays.\n\nI would welcome the opportunity to discuss my application further at a time that suits you. Please find my contact details below.\n\nYours faithfully,\nJamie Park",
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.4, discrimination: 1.1,
    tags: ["writing", "b1", "email", "informal-advice", "junior", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 100, max: 145 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can give advice clearly and simply in informal written communication.",
      prompt: "Your younger cousin is about to start secondary school and is worried about making friends. Write an email giving them advice. Include:\n• Acknowledgement of their feelings\n• Two specific pieces of advice\n• Encouragement to be themselves",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Hi Leo,\n\nDon't worry — feeling nervous about starting a new school is completely normal! I felt exactly the same way when I started.\n\nHere's my best advice. First, try joining a club or sports team in your first week. It's much easier to make friends when you're doing something together and you instantly have something in common. Second, be kind and say hello to the people sitting near you in class. Most people are also looking for friends and will appreciate a friendly face.\n\nMost importantly, just be yourself — you're brilliant and the right friends will see that. Secondary school can be really fun once you settle in.\n\nGood luck! Write and tell me how it goes.\n\nLove, Priya",
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.3, discrimination: 1.2,
    tags: ["writing", "b1", "product-review", "online", "language-schools", SEED_TAG],
    content: {
      taskType: "review", wordRange: { min: 100, max: 145 }, productLine: "Language Schools",
      cefrDescriptor: "Can write a structured review evaluating a product or service.",
      prompt: "Write an online review of a product you recently bought (e.g., a phone, book, sports item, or app). Include:\n• What the product is and why you bought it\n• What you liked and what could be improved\n• A rating out of five and a recommendation",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Review: Study Planner App — 4/5 stars\n\nI downloaded this app last month to help me organise my revision schedule before my exams. The main reason I chose it was the positive reviews and the fact that it was free.\n\nWhat I liked most was the weekly calendar view, which lets you colour-code different subjects. The reminders are also very helpful — I never miss a study session now. The app is straightforward to use, even for someone who is not very tech-savvy.\n\nHowever, the free version has limited features. For example, you cannot set goals or track your progress without paying for the premium version, which seems a bit restrictive.\n\nOverall, I would give it four out of five stars. It is an excellent free tool for students who need help staying organised, though serious students may want to upgrade.",
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.2, discrimination: 1.2,
    tags: ["writing", "b1", "diary", "narrative", "junior", SEED_TAG],
    content: {
      taskType: "story", wordRange: { min: 100, max: 150 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write diary entries describing events and expressing personal reactions.",
      prompt: "Write a diary entry about a day when something went wrong but turned out better than expected. Use the past tense. Include:\n• What went wrong at the start\n• How the situation developed\n• Why the day ended up being positive or memorable",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Thursday 6th March\n\nWhat a day! It started terribly — I missed the bus to school and had to ring my dad to pick me up. He was not happy. I arrived twenty minutes late for my history test and was convinced I had failed.\n\nBut then something unexpected happened. Because I was the last one to start, I was also the last one to finish — and I realised I had answered all the questions much more calmly than I usually do. Mrs Robinson later told me I got the highest mark in the class.\n\nWhen I got home, Dad was in a much better mood and made my favourite pasta for dinner as a way of saying sorry for being cross this morning. Sometimes things have a funny way of working out.",
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.1, discrimination: 1.2,
    tags: ["writing", "b1", "discursive", "technology", "academia", SEED_TAG],
    content: {
      taskType: "argument", wordRange: { min: 110, max: 155 }, productLine: "Academia",
      cefrDescriptor: "Can write discursive texts presenting both sides of an issue.",
      prompt: "Your teacher has asked you to write a discursive paragraph on the following topic: 'Should smartphones be allowed in secondary school classrooms?' Present one argument for, one argument against, and give your own view.",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "The question of whether smartphones should be permitted in secondary school classrooms divides teachers, parents and students. On the one hand, smartphones can be valuable learning tools — students can quickly look up information, access e-books and use language learning apps during class. In a well-managed classroom, they could enhance lessons rather than distract from them.\n\nOn the other hand, the potential for distraction is significant. Research has shown that even the presence of a phone on a desk can reduce concentration, as students are tempted to check notifications. Many teachers report spending valuable lesson time managing phone-related disruptions.\n\nPersonally, I believe smartphones should be permitted for specific, teacher-directed activities but not for general use. A clear policy that students understand and agree to would help strike the right balance.",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.0, discrimination: 1.2,
    tags: ["writing", "b1", "problem-solution", "environment", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 110, max: 155 }, productLine: "Academia",
      cefrDescriptor: "Can write problem–solution texts identifying causes and suggesting practical steps.",
      prompt: "Write a short problem–solution essay about food waste in schools. Include:\n• A description of the problem and its effects\n• Two practical solutions schools could adopt\n• A brief conclusion",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Food waste is a serious problem in many schools. A large proportion of meals prepared in school canteens is thrown away uneaten every day. This not only wastes money but also contributes to unnecessary greenhouse gas emissions when food decomposes in landfill sites.\n\nThere are two practical steps schools could take. First, canteens could introduce a 'smart tray' system that tracks which meals are left unfinished and uses the data to adjust portion sizes and menus accordingly. This would reduce waste while also improving student satisfaction. Second, uneaten but safe food could be donated to local food banks or community kitchens rather than being discarded.\n\nIn conclusion, reducing food waste in schools requires both better data and a culture of responsibility. These small changes could have a real and immediate impact on both the environment and the community.",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.1, discrimination: 1.2,
    tags: ["writing", "b1", "story-continuation", "narrative", "language-schools", SEED_TAG],
    content: {
      taskType: "story", wordRange: { min: 110, max: 160 }, productLine: "Language Schools",
      cefrDescriptor: "Can write engaging narrative continuations with a clear structure.",
      prompt: "Continue this story in 110–150 words:\n\n'The train had just pulled out of the station when Maria realised she had left her bag on the platform. Inside it was everything — her passport, her phone, her tickets, and all her cash. She stared out of the window as the platform disappeared from view...'",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "She tried not to panic. She thought quickly. The next stop was only twenty minutes away — perhaps there was still hope.\n\nShe approached the train conductor and explained what had happened in a mixture of Spanish and English. He listened carefully and nodded.\n\n'I will radio ahead to the station,' he said. 'Sometimes bags are handed in to the lost property office immediately.'\n\nFor the next twenty minutes Maria sat rigid with anxiety. When the train finally stopped, the conductor appeared with a wide smile — and her bag.\n\nA kind railway worker had spotted it on the platform and handed it straight to the station manager. Everything was still inside.\n\nMaria thanked them both so many times that they laughed. She had never been so grateful for the honesty of strangers.",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.2, discrimination: 1.2,
    tags: ["writing", "b1", "formal-enquiry", "job", "corporate", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 100, max: 150 }, productLine: "Corporate",
      cefrDescriptor: "Can write formal enquiry letters using appropriate conventions.",
      prompt: "You are looking for a work experience placement at a local business. Write a formal letter to enquire about opportunities. Include:\n• Your purpose in writing\n• Information about yourself and your interests\n• What you hope to gain from the experience\n• A polite request for a reply",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Dear Sir / Madam,\n\nI am writing to enquire whether your company offers work experience placements for secondary school students.\n\nI am 16 years old and currently studying my GCSEs, with a particular interest in business and digital marketing. I am enthusiastic, hardworking and quick to learn new skills. Outside school, I help manage the social media account for a local youth group, which has given me some basic experience in content creation.\n\nI am hoping to gain a greater understanding of how a professional business operates, particularly the marketing and communications side. A placement with your organisation would be invaluable in helping me decide on my future career path.\n\nI would be grateful for any available opportunities during the Easter or summer holidays. Please do not hesitate to contact me at the email address below.\n\nYours faithfully,\nChloe Barker",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.35, discrimination: 1.2,
    tags: ["writing", "b1", "campaign-text", "persuasive", "junior", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 90, max: 130 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write simple persuasive texts aimed at a specific audience.",
      prompt: "Your school is launching an environmental campaign. Write the text for a poster encouraging students to use less single-use plastic. Make it engaging and include:\n• A catchy headline\n• Three specific actions students can take\n• A positive, motivating final message",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "SAY NO TO PLASTIC — IT'S EASIER THAN YOU THINK!\n\nDid you know that every year, 8 million tonnes of plastic enter our oceans? You can be part of the solution.\n\nHere are three simple things you can do starting today:\n✅ Bring a reusable water bottle to school instead of buying single-use plastic ones.\n✅ Use a reusable lunch box or cloth bag instead of cling film or plastic bags.\n✅ Refuse plastic straws — carry a metal or bamboo one if you need one.\n\nSmall actions add up to big change. One school, hundreds of students, thousands of plastic items saved every year.\n\nTogether, we CAN make a difference. Start today!",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.45, discrimination: 1.2,
    tags: ["writing", "b1", "informal-email", "planning-trip", "language-schools", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 110, max: 155 }, productLine: "Language Schools",
      cefrDescriptor: "Can write clear informal messages to organise events and make arrangements.",
      prompt: "Write an email to a group of friends proposing a day trip. Include:\n• Where you want to go and why\n• When you suggest going\n• What you plan to do there\n• A request for their thoughts and availability",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Hi everyone!\n\nI've been thinking it would be great to organise a day trip before the summer ends. How about visiting Brighton? It's only about an hour from London by train and there's loads to do there.\n\nI was thinking Saturday the 20th would work well since most of us are free that weekend. We could take the morning train to avoid the crowds.\n\nOnce we're there, we could walk along the seafront, visit the Royal Pavilion (the entrance fee is only £14), grab fish and chips on the beach, and maybe check out the shops in the Lanes. In the evening, there are some great little restaurants before we head back.\n\nWhat do you all think? Let me know if the date works for you. We can sort out the train tickets together once everyone confirms.\n\nLet me know! Nadia",
    },
  },

  // ═══════════════════════════════════════════
  // B2 — 15 items (difficulty 0.4 to 1.2)
  // ═══════════════════════════════════════════
  {
    cefrLevel: "B2", difficulty: 0.4, discrimination: 1.3,
    tags: ["writing", "b2", "academic-essay", "two-sides", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 180, max: 240 }, productLine: "Academia",
      cefrDescriptor: "Can write detailed, structured essays giving reasons for a point of view.",
      prompt: "Discuss the advantages and disadvantages of remote working (working from home) for both employees and employers. Give your own conclusion about whether it should be a permanent feature of modern workplaces.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Remote working, once a marginal practice, has become mainstream following the COVID-19 pandemic. It offers compelling benefits but also raises significant challenges for both employees and organisations.\n\nFor employees, the ability to work from home eliminates commuting time and costs, improves work–life balance and gives greater autonomy. Many workers report higher job satisfaction and productivity when working remotely. For employers, remote working can reduce office overheads and broaden the talent pool, since recruitment is no longer limited by geography.\n\nHowever, remote working is not without drawbacks. Employees often report feelings of isolation and difficulty separating work from home life. Collaboration and creativity can suffer when teams are not physically together. For employers, managing performance and maintaining company culture at a distance presents considerable challenges.\n\nIn my view, a hybrid model — combining office presence with flexible home working — is likely the most sustainable approach. It preserves the collaborative benefits of in-person work while offering the autonomy employees have come to value. A one-size-fits-all policy is unlikely to serve all roles and industries equally well.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.5, discrimination: 1.3,
    tags: ["writing", "b2", "proposal", "school-project", "academia", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 190, max: 250 }, productLine: "Academia",
      cefrDescriptor: "Can write a well-structured proposal outlining a project or initiative.",
      prompt: "Write a proposal for a school project to reduce the school's carbon footprint. Include:\n• Introduction and aim of the proposal\n• Three specific initiatives with brief justification\n• Expected outcomes\n• A call to action",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Proposal: Green School Initiative — Reducing Our Carbon Footprint\n\nIntroduction\nThis proposal sets out a practical plan to reduce our school's carbon footprint by 20% within two academic years. It is submitted for consideration by the school's senior leadership team.\n\nProposed Initiatives\n1. Solar Panels on the Main Building Roof\nInstalling solar panels would reduce dependency on mains electricity and could generate up to 30% of the school's energy needs. Several local secondary schools have already implemented similar schemes with support from government grants.\n\n2. A Whole-School Recycling Programme\nCurrently the school has only general waste bins. Introducing clearly labelled recycling stations for paper, plastic and food waste would significantly reduce landfill contributions.\n\n3. Promoting Sustainable Transport\nA cycle-to-school initiative, including secure cycle storage and a 'walking bus' for younger students, would reduce car journeys and improve student health.\n\nExpected Outcomes\nImplementing all three initiatives would reduce the school's annual carbon emissions by an estimated 18–25 tonnes and demonstrate environmental leadership within the community.\n\nConclusion\nWe urge the leadership team to approve this proposal and invite student representatives to sit on a Green Committee to oversee implementation.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.6, discrimination: 1.3,
    tags: ["writing", "b2", "business-email", "professional", "corporate", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 160, max: 220 }, productLine: "Corporate",
      cefrDescriptor: "Can write clear, detailed professional emails managing complex workplace situations.",
      prompt: "You are a project manager. A key supplier has informed you that they will be unable to deliver an order on time, which will delay your project. Write a professional email to your senior manager:\n• Explaining the situation clearly\n• Summarising the impact on the project\n• Proposing two solutions\n• Requesting a brief meeting to discuss",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Dear Sarah,\n\nI am writing to inform you of an unexpected development that is likely to affect the delivery timeline of the Horizon project.\n\nWe received confirmation this morning from NovaTech — our primary component supplier — that a production fault at their plant means they will be unable to fulfil our order by the agreed deadline of 14 November. The revised delivery date they have proposed is 2 December, which would push our product launch back by approximately three weeks.\n\nThis delay has two key implications: the pre-launch marketing campaign, which is already in motion, would need to be paused, and our Q4 revenue projections would be affected.\n\nI have identified two potential ways forward. First, we could source an alternative supplier at higher cost to meet the original deadline. Second, we could accept the NovaTech delay and adjust the campaign timeline, which would be more cost-effective but require communication with the marketing team and client.\n\nCould we arrange a brief call tomorrow morning to discuss which option is preferable? I am available from 9:00 to 11:00 am.\n\nKind regards,\nDaniel Marsh",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.65, discrimination: 1.3,
    tags: ["writing", "b2", "descriptive", "creative", "language-schools", SEED_TAG],
    content: {
      taskType: "story", wordRange: { min: 170, max: 230 }, productLine: "Language Schools",
      cefrDescriptor: "Can write vivid, creative descriptions using varied vocabulary and sensory detail.",
      prompt: "Write a descriptive piece about a city you know well or have invented, as it appears just before dawn. Focus on:\n• The sights, sounds and atmosphere\n• The contrast between night and early morning\n• Use of varied vocabulary and imagery",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "The city holds its breath in that narrow hour before dawn. The streets, still wet from the night's rain, reflect the amber glow of the streetlamps in long, wavering columns across the tarmac.\n\nA few figures move along the pavements — delivery workers in high-visibility jackets, a night shift nurse walking briskly towards the hospital entrance, a fox that stops to assess me with knowing, amber eyes before disappearing beneath a parked van.\n\nThe sounds are different at this hour. There is no traffic roar, only an occasional distant engine and the irregular percussion of a pigeon adjusting its footing on a window ledge. Somewhere, a bakery has already started its ovens — the smell of bread drifts warm and incongruous through the cold air.\n\nThen, almost imperceptibly, the sky at the eastern edge of the rooftops begins to pale from black to deep indigo, and the birds — starting with a single wren somewhere in the park — begin their morning negotiations. The city is waking up, reluctantly, as it always does.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.7, discrimination: 1.3,
    tags: ["writing", "b2", "comparative-analysis", "media", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 190, max: 250 }, productLine: "Academia",
      cefrDescriptor: "Can write clear, detailed analytical texts comparing different viewpoints or phenomena.",
      prompt: "Compare the way news is consumed by young people today versus twenty years ago. Discuss:\n• Changes in the formats and platforms used\n• The impact on depth of understanding and attention spans\n• Whether these changes are broadly positive or negative",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "The way young people access and consume news has undergone a dramatic transformation over the past two decades. In the early 2000s, most young people relied on television news broadcasts, newspapers and, increasingly, online news websites for information. Today, news is predominantly consumed through social media platforms such as Instagram, TikTok and Twitter, where stories are condensed into brief clips, headlines and posts.\n\nThis shift brings both advantages and disadvantages. On the positive side, news is now more immediate and accessible than ever. Young people can receive breaking news instantly and are exposed to a wider range of international perspectives. The interactive nature of social media also allows citizens to participate in public discourse in ways that were previously impossible.\n\nHowever, there is growing evidence that the fragmented, rapid-fire nature of social media news is undermining depth of engagement. Short-form content rarely provides sufficient context for complex issues, and algorithms tend to serve users content that confirms existing beliefs, limiting exposure to diverse viewpoints. The collapse of local newspaper industries has also resulted in reduced investigative journalism.\n\nOverall, while digitalisation has democratised access to information, it has come at a cost to depth and nuance. Media literacy education is now more essential than ever to equip young people to navigate this landscape critically.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.75, discrimination: 1.3,
    tags: ["writing", "b2", "formal-letter", "authority", "language-schools", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 170, max: 230 }, productLine: "Language Schools",
      cefrDescriptor: "Can write formal, persuasive letters to authorities using appropriate register.",
      prompt: "Write a formal letter to the mayor of your town proposing a new community facility (e.g., a youth centre, an outdoor gym, a public library). Include:\n• What you are proposing and why it is needed\n• Evidence to support your case\n• How it would benefit the community\n• A request for a formal response",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Dear Mayor Thompson,\n\nI am writing on behalf of a group of local residents to propose the development of a youth centre on the site of the disused community hall on Bridge Street.\n\nThe need for such a facility is urgent. At present, young people aged 11–18 in this area have virtually no safe, supervised spaces to spend their free time. The nearest youth facility is over six kilometres away, making it inaccessible for many families without cars. This vacuum has contributed to a rise in anti-social behaviour incidents, as documented in the council's own data for the past three years.\n\nA well-equipped youth centre offering sports facilities, arts activities and homework support would address this gap directly. Evidence from comparable centres in neighbouring boroughs shows reductions in youth crime rates of up to 35% within two years of opening.\n\nThe proposal would benefit not only young people but the whole community: reducing pressure on public services, improving safety and fostering community cohesion.\n\nI respectfully request a formal response to this proposal within 21 days, and would welcome the opportunity to present the full business case at a council meeting.\n\nYours sincerely,\nRebecca Osei",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.8, discrimination: 1.3,
    tags: ["writing", "b2", "journalistic-article", "opinion", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 180, max: 240 }, productLine: "Academia",
      cefrDescriptor: "Can write clear, engaging journalistic articles expressing reasoned views.",
      prompt: "Write an opinion article for a quality newspaper on the following topic: 'Artificial intelligence will make many professional jobs obsolete within a generation.' Present the argument, concede one counter-point, and give your own conclusion.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "The AI Disruption: Threat or Opportunity?\n\nFor decades, economists reassured us that while machines might replace manual labour, they would leave the professional classes untouched. That reassurance now rings hollow. The latest generation of artificial intelligence is not simply automating assembly lines — it is drafting contracts, diagnosing medical conditions and writing code with a competence that would have seemed improbable five years ago.\n\nThe legal, medical and financial sectors, long assumed to be protected by the complexity of their work, are already experiencing the early tremors of disruption. Studies estimate that up to 40% of tasks currently performed by lawyers and accountants could be automated by AI within the next decade.\n\nIt would be naive, however, to ignore the counter-argument. New technologies have historically created jobs even as they destroyed others. The introduction of computers did not eliminate office work — it transformed it. AI may similarly generate entirely new categories of employment we cannot yet envision.\n\nNevertheless, the pace of current AI development is categorically different from previous technological revolutions. The question is not whether disruption will occur but how quickly, and whether our education and social protection systems are prepared to respond. This generation owes the next one some honest answers.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.85, discrimination: 1.3,
    tags: ["writing", "b2", "debate-speech", "persuasive", "academia", SEED_TAG],
    content: {
      taskType: "argument", wordRange: { min: 180, max: 240 }, productLine: "Academia",
      cefrDescriptor: "Can write persuasive speeches for formal debate contexts with supporting evidence.",
      prompt: "Write a two-minute debate speech arguing FOR the following motion: 'This house believes that all zoos should be closed.' Structure your speech with an opening statement, three main arguments with supporting points, and a strong conclusion.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Thank you, Chair. I stand in full support of the motion before us today.\n\nThe zoo, as an institution, is a relic of colonial-era thinking — a belief that wild animals exist for human entertainment and that confining them for public display can somehow be justified on educational or conservation grounds. I intend to show you why that justification simply does not hold.\n\nFirst and foremost, zoos cause measurable psychological harm to highly intelligent animals. Elephants, great apes and cetaceans are neurologically complex beings with extensive social needs and natural roaming ranges measured in hundreds of kilometres. No enclosure, however large, can replicate that. The stereotypic behaviours we see — repetitive swaying, bar-biting, circling — are the unmistakable symptoms of chronic stress.\n\nSecondly, the conservation argument is largely a fig leaf. Fewer than 1% of zoo-held animals are classified as endangered, and successful reintroduction programmes are extraordinarily rare. The vast majority of zoo funding goes towards visitor experience, not habitat preservation.\n\nThirdly, the educational value of seeing a bored, traumatised animal pacing behind glass is questionable at best. Natural history documentaries, virtual reality experiences and genuine wildlife sanctuaries offer far richer and more honest learning opportunities.\n\nClose the zoos. Fund the sanctuaries. Let the wild be wild.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.9, discrimination: 1.3,
    tags: ["writing", "b2", "analytical-essay", "literature", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 180, max: 240 }, productLine: "Academia",
      cefrDescriptor: "Can write analytical texts examining themes in literary or cultural works.",
      prompt: "Choose a novel, film or play you know well. Write an analytical essay exploring how the central character changes over the course of the story. Include:\n• A brief introduction identifying the character and work\n• Two or three key moments of change with analysis\n• A conclusion about what the character's journey represents",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "The Transformation of Atticus Finch: Moral Courage Under Pressure\n\nHarper Lee's To Kill a Mockingbird follows Atticus Finch, a small-town lawyer in 1930s Alabama, who accepts the unpopular task of defending a Black man falsely accused of raping a white woman. Through the eyes of his daughter Scout, we observe a man who holds firm to his principles in the face of community hostility — but who is ultimately unable to change the world he inhabits.\n\nAt the novel's opening, Atticus appears almost saintly: calm, rational and consistent. He tells his children that you must 'climb into someone's skin and walk around in it' before judging them. This empathy is his defining quality. It is tested severely when the trial verdict is delivered: despite overwhelming evidence in his client's favour, the jury convicts Tom Robinson. This moment marks a quiet but profound shift — not in Atticus's values, but in his awareness of the limitations of justice within a deeply prejudiced society.\n\nIn the aftermath, Atticus retreats somewhat from his idealism. He comforts his daughter with the assertion that 'most people are nice when you finally see them', yet the reader senses his own conviction has been tested.\n\nAtticus's journey suggests that moral courage is insufficient without systemic change — a profoundly modern message.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.95, discrimination: 1.3,
    tags: ["writing", "b2", "memo", "internal-communication", "corporate", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 160, max: 210 }, productLine: "Corporate",
      cefrDescriptor: "Can write clear, well-structured internal business communications.",
      prompt: "Write an internal memo to all staff at your company announcing a new hybrid working policy. Include:\n• The purpose of the memo\n• The key details of the new policy (days in office, process for exceptions)\n• What staff should do next\n• A positive closing statement",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "INTERNAL MEMORANDUM\n\nTO:     All Staff\nFROM:   HR Department\nDATE:   15 September\nSUBJECT: New Hybrid Working Policy — Effective 1 October\n\nFollowing an extensive review and staff survey conducted over the summer, we are pleased to announce a new hybrid working policy that will take effect from Monday 1 October.\n\nUnder the new policy, all permanent employees will be required to work from the office on a minimum of three days per week, with the remaining two days at their discretion. Core office hours during in-office days will be 9:30 am to 3:30 pm to facilitate collaboration.\n\nExceptions — for example, for employees with accessibility requirements or caring responsibilities — may be applied for through the HR portal by 22 September. All requests will be handled confidentially and assessed within five working days.\n\nAll staff are asked to confirm their preferred in-office days via the new scheduling tool (link below) by Friday 26 September.\n\nWe believe this policy reflects the best of what we have learned over the past two years and will support both productivity and wellbeing. Thank you for your continued flexibility and commitment.\n\nHR Department",
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.0, discrimination: 1.3,
    tags: ["writing", "b2", "essay", "globalisation", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 190, max: 250 }, productLine: "Academia",
      cefrDescriptor: "Can write detailed, well-organised essays on complex academic topics.",
      prompt: "To what extent does globalisation benefit developing countries? Discuss, using specific examples where relevant, and give your own assessment.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Globalisation — the increasing economic, cultural and political interdependence of nations — has transformed the developing world in ways that are both profound and deeply contested. Its benefits are real but unevenly distributed, and its costs are often borne most heavily by those it purports to help.\n\nThe economic case for globalisation rests primarily on trade liberalisation and foreign direct investment. Countries such as South Korea, Taiwan and, more recently, Bangladesh and Ethiopia have experienced significant economic growth through integration into global supply chains. Millions have been lifted out of extreme poverty as a direct result of export-led industrialisation.\n\nHowever, the benefits are far from universal. Critics point out that globalisation has frequently served the interests of multinational corporations and wealthy nations at the expense of local industries, which struggle to compete against heavily subsidised foreign products. The suppression of wages in export processing zones and the environmental degradation associated with rapid industrialisation represent significant social costs.\n\nFurthermore, cultural globalisation — the spread of Western consumer culture — raises legitimate concerns about the erosion of local traditions and languages.\n\nMy assessment is that globalisation can be a powerful force for development, but only when accompanied by robust regulatory frameworks, fair trade agreements and genuine technology transfer. Without these conditions, the promise of development remains unevenly fulfilled.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.05, discrimination: 1.3,
    tags: ["writing", "b2", "review", "cultural", "language-schools", SEED_TAG],
    content: {
      taskType: "review", wordRange: { min: 170, max: 230 }, productLine: "Language Schools",
      cefrDescriptor: "Can write well-developed reviews of cultural events or productions.",
      prompt: "Write a review of a live event you attended (concert, theatre, sporting event, exhibition) for a cultural magazine. Include:\n• A clear description of the event and venue\n• Analysis of the highlights and any weaknesses\n• Who you would recommend it to and why",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "National Theatre's 'The Lehman Trilogy' — A Monument to Ambition\n★★★★★\n\nTo watch The Lehman Trilogy is to witness theatre at its most ambitious and intellectually satisfying. Sam Mendes' production, currently in its third West End run at the National Theatre's Lyttleton stage, condenses 163 years of American financial history into three and a half gripping hours.\n\nAt its heart is a deceptively simple staging: three actors — the extraordinarily versatile Simon Russell Beale, Adam Godley and Ben Miles — play every character across seven generations of a banking dynasty, rotating rapidly between narration, dialogue and physical transformation. The set, a rotating glass office suspended above a raw stage floor, serves as metaphor and machine simultaneously.\n\nThe production's greatest achievement is making complex financial concepts — arbitrage, leveraging, derivatives — viscerally engaging by keeping human consequence at the centre of every scene. The 2008 financial collapse, when it finally arrives, feels genuinely tragic rather than merely historical.\n\nIf the production has a weakness, it is the occasional tendency towards didacticism in the final act, where the themes are stated rather than shown.\n\nThis is essential viewing for anyone interested in theatre, history or modern capitalism. It demands attention, but rewards it generously.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.1, discrimination: 1.3,
    tags: ["writing", "b2", "essay", "technology-ethics", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 190, max: 250 }, productLine: "Academia",
      cefrDescriptor: "Can write well-reasoned academic essays engaging with ethical dimensions of issues.",
      prompt: "Should governments have the right to access citizens' personal data in the interests of national security? Write a balanced essay presenting both sides of the argument and giving your own clearly argued conclusion.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "The tension between individual privacy and collective security is one of the defining ethical debates of the digital age. As governments acquire ever more sophisticated data-collection capabilities, the question of how far surveillance should extend in the name of national security has become both urgent and contested.\n\nProponents of state data access argue that in an era of international terrorism, organised crime and cyberattacks, intelligence agencies require access to digital communications to identify threats before they materialise. They point to concrete cases where surveillance data has directly prevented attacks, saving lives that no abstract principle of privacy could have protected.\n\nOpponents counter that mass surveillance fundamentally undermines the civil liberties upon which liberal democracies are founded. The disclosure by Edward Snowden in 2013 revealed that intelligence programmes had extended far beyond their stated targets, collecting data on millions of ordinary citizens who posed no threat whatsoever. Once such infrastructure exists, the history of authoritarian states demonstrates that it can easily be repurposed for political repression.\n\nIn my view, the case for limited, targeted surveillance with robust judicial oversight is defensible; mass data collection without individualised suspicion is not. The solution lies not in choosing between privacy and security but in demanding legal frameworks that protect both — a challenge that democratic societies have thus far failed to meet adequately.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.2, discrimination: 1.3,
    tags: ["writing", "b2", "formal-report", "urban-planning", "corporate", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 200, max: 260 }, productLine: "Corporate",
      cefrDescriptor: "Can write detailed formal reports with clearly organised sections and recommendations.",
      prompt: "You work for a city planning consultancy. Write a formal report for the city council evaluating a proposal to pedestrianise (ban cars from) the historic city centre. Cover:\n• Introduction and background\n• Arguments in favour\n• Arguments against\n• Recommendations and proposed next steps",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Report: Pedestrianisation of the Historic City Centre — Feasibility Assessment\nPrepared by: Urban Planning Associates | Date: October 2024\n\n1. Introduction\nThis report evaluates the proposal to create a pedestrian-only zone across the historic city centre, an area of approximately 1.2 square kilometres bounded by Castle Street, North Lane, Market Road and the riverside.\n\n2. Arguments in Favour\nPedestrian zones have been shown to increase retail footfall by 20–40% in comparable European cities. Air quality improvements would have measurable public health benefits, and the reduction of traffic noise would significantly enhance the area's attractiveness as a tourist and cultural destination. Several European case studies — notably Lyon's presqu'île and Copenhagen's Strøget — demonstrate sustained economic and social benefits following pedestrianisation.\n\n3. Arguments Against\nLocal traders and residents have expressed concerns about delivery access and parking. Business owners in adjacent streets fear reduced customer access by car may reduce trade, particularly for those catering to elderly and disabled customers. The existing public transport infrastructure may be insufficient to absorb the displaced car journeys without significant investment.\n\n4. Recommendations\nWe recommend a phased pilot pedestrianisation of the central square and two main streets during a six-month trial period, with access maintained for delivery vehicles before 10:00 am. Simultaneously, a dedicated consultation process with traders and an impact assessment should be initiated before any permanent decision is taken.",
    },
  },

  {
    cefrLevel: "B2", difficulty: 1.15, discrimination: 1.3,
    tags: ["writing", "b2", "summary", "academic", "academia", SEED_TAG],
    content: {
      taskType: "summary", wordRange: { min: 160, max: 220 }, productLine: "Academia",
      cefrDescriptor: "Can write clear, organised academic summaries of complex source material.",
      prompt: "Summarise the following passage in 150–180 words, using your own words as far as possible and preserving the key arguments:\n\n'The concept of social capital — the networks of relationships and norms of reciprocity that enable collective action — has been extensively theorised by scholars including Robert Putnam, Pierre Bourdieu and James Coleman. Putnam distinguishes between 'bonding' social capital, which strengthens ties within homogeneous groups, and 'bridging' social capital, which builds connections across different social groups. Critics of the social capital framework argue that it risks naturalising inequality by attributing social disadvantage to deficits in community cohesion rather than to structural factors such as economic inequality, discrimination and unequal access to resources. Bourdieu's formulation, by contrast, situates social capital explicitly within a theory of social reproduction, in which access to networks is unevenly distributed along class lines and serves to perpetuate rather than overcome social stratification.'",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Social capital refers to the social networks and norms of mutual trust that allow groups to act collectively. Robert Putnam has identified two types: bonding social capital, which consolidates ties within similar groups, and bridging social capital, which connects people across social differences. Both Putnam and other theorists, including James Coleman and Pierre Bourdieu, have explored how these networks function.\n\nHowever, the concept has attracted criticism. Some scholars argue that it risks misidentifying the causes of social disadvantage by framing it as a lack of community cohesion, thereby diverting attention from structural causes such as economic inequality and discrimination. Bourdieu's approach is notably more critical: for him, social capital is not distributed equally but is concentrated among privileged classes, and access to networks actively reinforces rather than alleviates existing social hierarchies. His formulation thus connects social capital explicitly to processes of social reproduction.",
    },
  },

  // ══════════════════════════════════════════
  // C1 — 15 items (difficulty 1.0 to 1.8)
  // ══════════════════════════════════════════
  {
    cefrLevel: "C1", difficulty: 1.0, discrimination: 1.4,
    tags: ["writing", "c1", "critical-essay", "ethics", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 250, max: 320 }, productLine: "Academia",
      cefrDescriptor: "Can write clear, well-structured critical essays on complex subjects.",
      prompt: "Critically examine the claim that 'all art is political.' Draw on at least two examples from literature, film or visual art, and consider both sides of the argument before arriving at a nuanced conclusion.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The proposition that all art is political is one that has provoked intense debate among critics, artists and philosophers for centuries. At its most expansive, the claim implies that every creative act — even the most apparently apolitical — carries ideological weight, whether through what it represents, what it omits or the social conditions that enabled its production. A more restrictive reading limits the claim to art that consciously engages with power, injustice or social organisation.\n\nThe case for the broader claim is persuasively made by examining works often thought of as 'purely aesthetic'. Jane Austen's novels, long praised primarily for their wit and psychological acuity, have been compellingly reread as sustained explorations of patriarchal property relations and the limited agency available to women within the marriage market. Their apparent social conservatism is itself, critics argue, a political position. Similarly, a still life by Chardin, however formally exquisite, encodes bourgeois values of domestic comfort and material stability in ways that are far from ideologically neutral.\n\nNevertheless, the argument risks overextension. To claim that a Bach fugue or an abstract expressionist canvas carries determinate political meaning is to dissolve the category of the aesthetic into the political entirely, potentially impoverishing both. The value of art lies partly in its resistance to reduction — its capacity to produce experiences, emotions and forms of attention that exceed any single interpretive frame.\n\nA defensible position is that all art is produced within political conditions and that those conditions inevitably leave traces; but this is not the same as claiming that all art is primarily or irreducibly political in its meaning or effect.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.05, discrimination: 1.4,
    tags: ["writing", "c1", "analytical-report", "corporate-strategy", "corporate", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 250, max: 330 }, productLine: "Corporate",
      cefrDescriptor: "Can write detailed analytical reports evaluating complex business situations.",
      prompt: "Your company has experienced a significant decline in customer satisfaction scores over the past year. As head of customer experience, write an analytical report for the board of directors that:\n• Analyses the likely causes of the decline using hypothetical data\n• Identifies the two most significant root causes\n• Proposes a structured improvement plan with measurable targets\n• Outlines risks and mitigation strategies",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Customer Satisfaction Decline — Root Cause Analysis and Recovery Plan\nPrepared for: Board of Directors | Author: Head of Customer Experience | Date: Q4 2024\n\nExecutive Summary\nCustomer satisfaction scores (NPS) have declined from +42 to +11 over the past twelve months, a fall that warrants urgent structural intervention. This report identifies the two primary causal factors and proposes a twelve-month recovery plan.\n\n1. Analysis of Causes\nInternal data and a sample of 400 customer feedback submissions identify two dominant themes: (a) extended resolution times following the migration to the new CRM platform (average resolution time increased by 37%), and (b) a measurable decline in first-contact resolution rates following the Q2 outsourcing of Tier 1 support functions.\n\n2. Root Causes\nThe CRM migration was under-resourced in its training phase, resulting in agent unfamiliarity that persists eight months post-implementation. The outsourcing decision, while cost-effective in the short term, introduced quality variance that has not been adequately managed through KPI oversight.\n\n3. Recovery Plan\nImmediate (0–3 months): Intensive CRM retraining programme for all customer-facing agents; revised SLA targets for the outsourced partner.\nMedium-term (3–9 months): Implementation of real-time quality monitoring; introduction of specialist escalation pathways.\nTarget: NPS recovery to +35 within twelve months, measured monthly.\n\n4. Risk Mitigation\nPrincipal risk: cost overrun on retraining initiative. Mitigation: phased rollout prioritising highest-volume teams. Secondary risk: partner resistance to revised SLAs. Mitigation: contractual review with performance penalties.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.1, discrimination: 1.4,
    tags: ["writing", "c1", "formal-proposal", "public-policy", "academia", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 240, max: 310 }, productLine: "Academia",
      cefrDescriptor: "Can write well-structured formal proposals with developed argumentation.",
      prompt: "Write a formal proposal to a national government education committee recommending the introduction of 'financial literacy' as a compulsory subject in secondary schools. Include:\n• Evidence of need\n• Proposed curriculum outline\n• Implementation considerations\n• Expected outcomes",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Proposal: Introduction of Compulsory Financial Literacy in Secondary Education\n\n1. Evidence of Need\nRecent surveys indicate that fewer than 30% of UK adults can correctly interpret a standard interest rate calculation, and over 40% of 25–34 year-olds report having taken on high-interest debt they did not fully understand. The financial decisions made in early adulthood — student loans, credit cards, mortgages — have lifelong consequences, yet schools currently provide no systematic framework for understanding them.\n\n2. Proposed Curriculum Outline\nA one-hour-per-week module for Years 9–11 covering: budgeting and personal finance management; understanding credit, debt and interest; pension basics and long-term saving; consumer rights and financial fraud awareness; and critical evaluation of financial products and advertising.\n\n3. Implementation Considerations\nInitial implementation would require teacher training (estimated cost: £28M nationally over two years), curriculum development coordinated with existing Citizenship and Mathematics frameworks, and an examination component integrated into GCSE assessment.\n\nPartnership with regulated financial education bodies (e.g., the Money and Pensions Service) would ensure content quality and impartiality.\n\n4. Expected Outcomes\nLongitudinal studies from countries with established financial education programmes — notably the Netherlands and Australia — show measurable improvements in household debt management and retirement preparedness among cohorts who received structured financial education. A ten-year impact model projects a reduction in over-indebtedness rates of 12–18% among beneficiary cohorts.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.15, discrimination: 1.4,
    tags: ["writing", "c1", "opinion-column", "journalism", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 240, max: 310 }, productLine: "Academia",
      cefrDescriptor: "Can write sophisticated opinion pieces with clear argumentative structure and stylistic control.",
      prompt: "Write an opinion column for a quality newspaper arguing that universities have become too focused on employability at the expense of intellectual exploration. Use a clear argumentative structure, specific examples, and a distinctive authorial voice.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The University as Career Centre\n\nSomewhere between the Bologna Process and the birth of the NSS, the British university quietly changed its self-understanding. Once it aspired to produce educated human beings — people capable of critical thought, equipped to interrogate the assumptions of their age and contributing to a civilisational conversation stretching back millennia. Today it produces graduates. And graduates, as every vice-chancellor now knows, must be employable.\n\nThis is not an irrational development. Universities cost a great deal. Students take on significant debt. The question of what that debt will buy is entirely reasonable. But something important has been lost in the transaction, and it is not merely aesthetic.\n\nWhen degree programmes are audited for 'skills transferability' and humanities departments justify their existence by pointing to graduates working in consultancy, something intellectually corrosive is happening. The value of studying ancient history or moral philosophy or medieval literature is not contingent on its utility in the labour market. Its value lies in the encounter itself — in being confronted with ways of thinking and seeing that challenge the assumptions one arrives with.\n\nThe crisis, if crisis it is, is partly one of confidence: a failure by universities to articulate why education matters on its own terms. The solution is not to reverse the widening of access — that would be indefensible — but to refuse the reduction of higher education to credentialing.\n\nA society that cannot think carefully about itself is not well served by a system optimised to produce employable graduates. It is served by educated citizens.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.2, discrimination: 1.4,
    tags: ["writing", "c1", "executive-summary", "research", "corporate", SEED_TAG],
    content: {
      taskType: "summary", wordRange: { min: 200, max: 270 }, productLine: "Corporate",
      cefrDescriptor: "Can write clear, precise summaries of complex information for specialist audiences.",
      prompt: "You have conducted a six-month research project on employee burnout in the financial services sector. Write an executive summary of your findings (200–250 words) for senior stakeholders. Include:\n• Purpose and scope of the research\n• Three key findings with supporting data\n• Main recommendations\n• A concluding statement on urgency",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Executive Summary: Employee Burnout in Financial Services — A Six-Month Study\n\nPurpose and Scope\nThis study examined the prevalence, causes and consequences of occupational burnout among 1,240 financial services professionals across twelve UK organisations between January and June 2024. Participants ranged from graduate trainees to senior management.\n\nKey Findings\n1. Prevalence: 58% of respondents met the clinical threshold for burnout (Maslach Burnout Inventory, ≥4 dimensions affected), a rate 22 percentage points above the cross-sector average for UK professional services.\n\n2. Primary drivers: Structural overtime (reported by 71% of respondents as 'expected' rather than 'exceptional'), low psychological safety — defined as the ability to raise concerns without career risk — and inadequate manager training in mental health awareness were identified as the three most significant causal factors.\n\n3. Organisational cost: Participating firms reported average burnout-related costs of £34,000 per affected employee annually (comprising absenteeism, presenteeism and replacement costs), implying a sector-wide annual cost exceeding £1.2 billion.\n\nRecommendations\nOrganisations should implement mandatory manager training in psychological safety frameworks, establish enforceable overtime limits and introduce quarterly wellbeing assessments.\n\nConclusion\nThe data indicates a sector-wide crisis demanding immediate structural intervention. Incremental wellbeing initiatives are insufficient; systemic change in working culture is required.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.25, discrimination: 1.4,
    tags: ["writing", "c1", "rhetorical-speech", "persuasive", "academia", SEED_TAG],
    content: {
      taskType: "argument", wordRange: { min: 240, max: 310 }, productLine: "Academia",
      cefrDescriptor: "Can write sophisticated persuasive speeches deploying rhetorical devices effectively.",
      prompt: "Write a formal speech to be delivered at a national education conference arguing that standardised testing is fundamentally incompatible with genuine learning. Your speech should deploy at least two rhetorical devices (e.g., anaphora, rhetorical question, tricolon, contrast) and maintain a consistent, authoritative register throughout.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Honoured colleagues, distinguished educators, and anyone brave enough to have sat through one more conference on attainment gaps —\n\nI want to talk to you today about a convenient fiction: the idea that standardised testing measures what it claims to measure, and that what it claims to measure is learning.\n\nAsk any teacher. Ask them what their students needed last November — more time to read, to wonder, to fail productively in the way that all learning requires. Ask them what they got instead: more hours of past-paper practice, more anxiety, more narrowing of the curriculum to what can be reliably scored by a mark scheme.\n\nWe have built an education system organised around measurement. We measure because we want accountability. We want accountability because we want evidence. We want evidence because we do not quite trust teachers, students or learning itself. And in pursuit of that evidence, we have gradually made it harder to do the very things we are supposedly measuring.\n\nThe problem is not testing per se. Feedback is essential to learning. Diagnostic assessment, well-designed, can be transformative. The problem is high-stakes, standardised, comparative testing deployed as the primary instrument of educational accountability.\n\nWhen the test becomes the curriculum, when teaching to the test is not a failure of professional ethics but a rational institutional response, when we celebrate rising scores that correlate with nothing beyond the ability to pass that particular test — we have not created accountability. We have created a sophisticated simulation of it.\n\nLearning is messier than data. It is time our systems honoured that fact.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.3, discrimination: 1.4,
    tags: ["writing", "c1", "literary-analysis", "poetry", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 240, max: 320 }, productLine: "Academia",
      cefrDescriptor: "Can write nuanced literary analyses engaging with form, language and theme.",
      prompt: "Choose a poem you know well. Write an analytical essay examining how the poet uses language, structure and/or form to convey a central idea or emotion. Support your analysis with close reference to specific words and phrases.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Wilfred Owen's 'Dulce et Decorum Est' — The Grammar of Atrocity\n\nWilfred Owen's 'Dulce et Decorum Est' (1917) is among the most viscerally effective poems of the First World War, its power deriving not merely from its horrifying content but from the way Owen mobilises the formal resources of language — rhythm, syntax, imagery and direct address — to construct an act of witness that is also an accusation.\n\nThe poem opens with an extended simile that is deliberately anti-heroic: soldiers are 'bent double, like old beggars under sacks'. The comparison is systematically degrading, stripping the soldiers of the martial dignity that pro-war rhetoric required. Owen's diction throughout the first stanza is dominated by the language of exhaustion and privation — 'cursing', 'limped', 'blood-shod', 'all lame; all blind' — an anaphoric accumulation that enacts the numbness it describes.\n\nThe explosion into the gas attack — 'Gas! Gas! Quick, boys!' — ruptures the poem's established rhythm with an abruptness that formally replicates the shock it describes. The shift to the present continuous ('guttering, choking, drowning') creates an appalling immediacy that the past tense would have distanced.\n\nThe poem's most disturbing technical move is its apostrophe in the final section. Owen turns from his traumatic memory to address 'my friend' directly — a deliberately intimate form of attack on Jessie Pope and, by extension, all civilian cheerleaders for the war. The Latin tag that closes the poem is thus rendered not consolatory but corrosive: the sweetness and decency of dying for one's country exposed as 'the old Lie'.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.35, discrimination: 1.4,
    tags: ["writing", "c1", "problem-solution-report", "urban", "academia", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 250, max: 320 }, productLine: "Academia",
      cefrDescriptor: "Can write complex problem–solution reports with sophisticated analysis.",
      prompt: "Write a problem–solution report examining urban loneliness as a public health crisis. Include:\n• A precise definition and evidence of the scale of the problem\n• Analysis of structural causes (not just individual factors)\n• Three policy-level solutions with evaluation\n• A conclusion acknowledging the complexity",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Urban Loneliness as a Public Health Crisis: Causes and Policy Responses\n\n1. Defining the Problem\nLoneliness — defined clinically as the subjective experience of insufficient social connection — is distinct from objective social isolation, though the two frequently co-occur. According to the Campaign to End Loneliness (2023), 3.83 million UK adults report chronic loneliness, with urban populations demonstrating rates 30% higher than rural equivalents despite higher population density. The health implications are well-established: chronic loneliness is associated with a 26% increase in all-cause mortality, comparable in effect to smoking fifteen cigarettes per day.\n\n2. Structural Causes\nUrban loneliness is misunderstood when analysed primarily at the individual level. Structural drivers include: declining investment in community infrastructure (libraries, community centres, affordable third spaces); housing policies that prioritise individual occupancy over communal living arrangements; urban design that privileges car transit over walkable, incidental social contact; and precarious employment patterns that erode the stable institutional communities — workplaces, churches, civic organisations — through which social connection was historically organised.\n\n3. Policy Solutions\nFirst, mandatory 'social infrastructure' requirements in planning law, similar to existing green space requirements, would ensure new developments include communal spaces designed for incidental human contact. Second, a national social prescribing programme — linking GP surgeries to community activities — has demonstrated efficacy in pilot studies and merits nationwide scaling. Third, investment in affordable shared housing models (co-housing, community land trusts) would address the housing dimension directly.\n\n4. Conclusion\nUrban loneliness is not a personal failing but a structural condition requiring structural responses. The solutions proposed here are neither novel nor untested — the principal barrier is political will.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.4, discrimination: 1.4,
    tags: ["writing", "c1", "reflective-journal", "professional-development", "corporate", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 230, max: 300 }, productLine: "Corporate",
      cefrDescriptor: "Can write insightful reflective texts examining professional experience with critical depth.",
      prompt: "Write a structured reflective journal entry about a significant professional challenge you faced (real or hypothetical). Use Gibbs' Reflective Cycle or a similar framework:\n• Description of the situation\n• Your feelings and initial reactions\n• Evaluation of what went well and badly\n• Analysis of causes\n• Conclusion about what you have learned\n• Action plan",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Reflective Journal — Managing a Team Through Organisational Restructuring\n\nDescription\nIn March, I was asked to manage the transition of my seven-person communications team through a departmental restructuring that resulted in two redundancies. I had four weeks to conduct consultations, make recommendations to HR, and maintain team morale and productivity throughout the process.\n\nFeelings\nI found the situation profoundly uncomfortable. I had never been in a position where I held, even indirectly, a degree of influence over colleagues' employment. The gap between my institutional role and my personal discomfort with the process created a tension I had not anticipated.\n\nEvaluation\nWhat went well: I maintained regular, honest communication with the team, neither overpromising certainty nor withholding information. The team's productivity, measured by project delivery metrics, declined only marginally during the four-week period. What went poorly: I underestimated the informal support needs of the individuals most at risk, focusing too heavily on process compliance at the expense of pastoral attention.\n\nAnalysis\nThe difficulty arose from conflating my managerial and pastoral roles. In prioritising procedural correctness — necessary as it was — I neglected the more ambiguous relational dimensions of leadership that this situation demanded.\n\nConclusion\nI learned that effective leadership in difficult circumstances requires comfort with role ambiguity and a higher tolerance for difficult conversations than I had previously had.\n\nAction Plan\nI will seek mentoring from a senior colleague with restructuring experience and undertake structured training in trauma-informed management practice before the next performance cycle.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.45, discrimination: 1.4,
    tags: ["writing", "c1", "academic-argument", "philosophy-of-mind", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 250, max: 320 }, productLine: "Academia",
      cefrDescriptor: "Can write sophisticated academic arguments engaging with abstract concepts.",
      prompt: "Write an academic essay responding to the following claim: 'Consciousness cannot be reduced to physical processes in the brain.' Present the strongest version of the materialist counterargument, then explain why you think the claim is either convincing or unconvincing.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The proposition that consciousness resists reduction to physical brain processes — what David Chalmers termed the 'hard problem' — represents one of the most persistently contentious claims in contemporary philosophy of mind. A serious evaluation requires first giving the materialist position its strongest possible formulation.\n\nThe materialist can point to compelling evidence. Neuroscience has demonstrated that every subjective state — every mood, perception, memory and intention — correlates with, and can be influenced by, identifiable neural activity. Lesion studies demonstrate that damage to specific brain regions produces predictable and specific alterations in conscious experience. Psychopharmacology demonstrates that the chemical manipulation of neural pathways reliably produces changes in the qualitative texture of experience. If consciousness were genuinely non-physical, these intimate correlations would be extraordinarily puzzling.\n\nFurthermore, the materialist can invoke parsimony. Positing an additional non-physical substance or property to explain consciousness violates Occam's razor when a physical account may eventually suffice.\n\nNevertheless, the hard problem retains its force. The explanatory gap between a third-person description of neural correlates and the first-person fact of what it is like to experience redness or pain does not appear to close merely by adding neurological detail. As Joseph Levine observed, even a complete functional account of pain processing leaves untouched the question of why that processing is accompanied by any subjective quality at all.\n\nI find the hard problem compelling not because it establishes dualism, which faces its own insuperable difficulties, but because it identifies a genuine explanatory inadequacy in current materialist frameworks that cannot honestly be dissolved by redescription.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.5, discrimination: 1.4,
    tags: ["writing", "c1", "creative-essay", "identity", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 250, max: 320 }, productLine: "Language Schools",
      cefrDescriptor: "Can write sophisticated creative-analytical texts blending personal voice with critical insight.",
      prompt: "Write an essay exploring what it means to be bilingual or multilingual in the contemporary world. Draw on personal experience and/or wider observation. Your essay should balance personal voice with analytical insight, and conclude with a reflection on language and identity.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The Language You Dream In\n\nThere is a question people ask bilinguals that seems simple but never quite is: which language do you think in? The question assumes a tidy interior architecture — a single room where thought lives, with a well-organised bilingual filing system along one wall. The reality, as anyone who has grown up between languages will recognise, is far stranger and more interesting than that.\n\nI grew up speaking Turkish at home and English everywhere else. For most of my childhood, I experienced this as a kind of distributed self — the Turkish self was warmer, more direct, better at expressing things that English, with its comfortable emotional distance, could not quite reach. The English self was more analytical, more attuned to irony. Each language, I came to understand, carried not just different words but different postures towards the world.\n\nThis is not merely a subjective impression. Cognitive linguists have documented genuine differences in how language shapes perception: the presence or absence of gendered nouns, the granularity of a language's colour vocabulary, the degree to which a language grammaticalises distinctions of time or agency. The Sapir-Whorf hypothesis in its strong form — that language determines thought — is rightly contested, but its weaker cousin, that language inflects thought, seems difficult to deny experientially.\n\nWhat this means for identity is both exhilarating and occasionally vertiginous. The bilingual person does not simply have access to two vocabularies; she has access to two different relationships with experience. Whether this constitutes a doubled self or a richer unified one is a question I am still answering — differently, depending on which language I am using.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.55, discrimination: 1.4,
    tags: ["writing", "c1", "essay", "democracy-media", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 250, max: 320 }, productLine: "Academia",
      cefrDescriptor: "Can write sophisticated analytical essays on complex socio-political topics.",
      prompt: "To what extent has the rise of social media undermined democratic discourse? Draw on specific examples (real events, platforms or case studies) to support your argument, and consider whether the problems are inherent to social media or a function of how it has been implemented.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The relationship between social media and democratic health is one of the most consequential and contested questions of our political moment. The dominant narrative — that platforms such as Facebook, Twitter and YouTube have systematically eroded democratic discourse through algorithmic amplification of outrage, disinformation and political polarisation — has considerable empirical support but requires careful qualification.\n\nThe evidence for harm is substantial. The use of micro-targeted political advertising in the 2016 US presidential election and the Brexit referendum demonstrated the vulnerability of democratic processes to data-driven manipulation at scale. Cambridge Analytica's exploitation of Facebook user data to profile and target psychographically distinct voter segments represented a qualitatively new form of democratic interference. More structurally, the internal logic of engagement-maximising algorithms has been shown — including in leaked Facebook documents — to preferentially amplify emotionally inflammatory content, creating incentive structures that reward extremism.\n\nYet the deterministic version of this critique overclaims. Social media has also enabled the organisation of democratic resistance movements — the Arab Spring, Black Lives Matter, #MeToo — that could not have achieved such rapid mobilisation through legacy media. The platforms are not inherently anti-democratic; they are designed to maximise engagement, and democratic discourse has proved less engaging than conflict.\n\nThis distinction matters because it suggests the problem is architectural rather than essential: structural choices made by profit-motivated corporations operating within inadequate regulatory frameworks. The solution, therefore, is regulatory — algorithm transparency requirements, data portability obligations, platform liability reform — rather than the wholesale abandonment of digital public spheres.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.6, discrimination: 1.4,
    tags: ["writing", "c1", "argumentative", "bioethics", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 260, max: 330 }, productLine: "Academia",
      cefrDescriptor: "Can write complex argumentative essays on ethically contested topics.",
      prompt: "Write a critical essay arguing for or against the following claim: 'The state has no legitimate interest in regulating individuals' end-of-life choices.' Consider philosophical, legal and policy dimensions.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The question of whether the state may legitimately intervene in an individual's decision about the manner and timing of their own death sits at the intersection of political philosophy, medical ethics and human rights law. I will argue that the state's interest in this domain is real but strictly circumscribed — and that current legal frameworks in most jurisdictions exceed what that circumscription permits.\n\nThe most compelling argument for a zone of non-interference is derived from liberal autonomy principles: if there is any domain over which individual sovereignty is inviolable, it is one's own body and one's own death. John Stuart Mill's harm principle — that the only legitimate basis for societal constraint of individual action is the prevention of harm to others — suggests that a competent adult's decision to end their life, however tragic, harms no one but themselves. The state's paternalistic refusal to respect this choice is, on Millian grounds, a form of unwarranted coercion.\n\nProponents of state regulation typically cite three countervailing interests: protecting the vulnerable from coercion by relatives or healthcare providers; maintaining the integrity of the medical profession; and preserving the sanctity of life as a social value. None of these arguments is negligible, but each is answerable. Jurisdictions with well-regulated assisted dying frameworks — the Netherlands, Oregon, Switzerland — demonstrate that robust procedural safeguards can effectively address coercion risks without blanket prohibition.\n\nThe sanctity of life argument, while carrying moral weight, cannot be the basis for state compulsion in a pluralist society where citizens hold irreconcilably different views about its application. The state's legitimate interest is in ensuring that end-of-life decisions are genuinely autonomous and fully informed — not in substituting its own judgement for that of the individual.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.65, discrimination: 1.4,
    tags: ["writing", "c1", "letter", "open-letter", "academia", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 250, max: 320 }, productLine: "Academia",
      cefrDescriptor: "Can write sophisticated open letters deploying rhetorical strategies for effect.",
      prompt: "Write an open letter to the next generation on behalf of your own generation, acknowledging what has been left undone or done poorly, and articulating what you hope for. The letter should be genuinely reflective, rhetorically accomplished and stylistically distinctive.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "To Those Who Come After,\n\nWe owe you an explanation, if not quite an apology. Apologies, when they come from the powerful, have a way of substituting feeling for responsibility — and we have, in many respects, been quite powerful.\n\nWe inherited a world in better shape than any that had existed before it: lower rates of violent conflict, greater access to medicine, rising living standards across much of the globe. This is not nothing. We did not invent these conditions, but we benefited from them enormously, and it would be dishonest not to acknowledge the starting position.\n\nWhat we did with that inheritance is harder to defend. We understood — we genuinely understood, the science was unambiguous — that the way we were living was incompatible with the stability of the physical systems on which all life depends. We understood this for decades. We debated it, wrote about it, marched about it, and then, for the most part, continued as before. The gap between our stated values and our actual choices will puzzle historians, if there are still historians.\n\nWe were not monsters. Most of us were simply ordinary — caught in systems not of our individual making, responsive to incentives that rewarded short-term thinking and punished patience. This is an explanation. It is not an excuse.\n\nWhat I hope for you is not that you forgive us — you are under no obligation to — but that you take from our failure the one useful thing it offers: a very clear demonstration of what deferred action costs. The question worth your entire attention is not what went wrong but what you are prepared to do differently.\n\nYou are not starting from zero. Neither, regrettably, are you starting from where you should have been.\n\nWith love, and with guilt,\nA member of the generation that knew",
    },
  },

  {
    cefrLevel: "C1", difficulty: 1.7, discrimination: 1.4,
    tags: ["writing", "c1", "essay", "science-society", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 260, max: 330 }, productLine: "Academia",
      cefrDescriptor: "Can write complex analytical essays engaging with the interface between science and public discourse.",
      prompt: "Write an essay examining why scientific consensus on issues such as climate change, vaccination and evolution is so often contested in public discourse, despite overwhelming expert agreement. Consider the roles of media, politics, psychology and institutional trust. Arrive at a considered conclusion about what, if anything, can be done.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The paradox at the heart of contemporary public life is that we inhabit the most scientifically literate civilisation in human history and simultaneously the one in which scientific consensus is most actively contested in the political arena. Understanding this paradox requires attending to several converging dynamics rather than reducing it to any single explanation.\n\nThe epistemological conditions that sustain scientific consensus — peer review, replication, the slow accretion of corroborating evidence across independent research programmes — are structurally ill-suited to a media environment organised around novelty, conflict and brevity. A finding that confirms the consensus generates no story; an outlier finding, however methodologically marginal, generates headlines. The result is a systematic distortion of the public's perception of scientific uncertainty.\n\nThis distortion has been deliberately exploited by industrial interests for decades. The tobacco industry's strategy of manufacturing doubt about the link between smoking and cancer — extensively documented by historians of science Naomi Oreskes and Erik Conway — established a template subsequently deployed by fossil fuel corporations to delay action on climate change. The creation of apparent scientific controversy where little genuine controversy existed proved extraordinarily effective at paralysing policy responses.\n\nThe psychological dimension is equally important. Dan Kahan's work on 'cultural cognition' demonstrates that individuals' assessment of scientific evidence is not straightforwardly rational but is filtered through cultural identity and group belonging. For many communities, accepting climate science or vaccine safety is experienced as an identity threat rather than a factual question, making evidence-based persuasion ineffective and potentially counterproductive.\n\nThe implication is that restoring productive public engagement with scientific consensus requires not simply more science communication — though that matters — but the rebuilding of the institutional trust structures through which scientific authority is legitimately established and communicated. This is a political and cultural project as much as an epistemic one, and it is unlikely to succeed without confronting the vested interests that have profited from its erosion.",
    },
  },

  // ═════════════════════════════════════════
  // C2 — 5 items (difficulty 1.5 to 2.0)
  // ═════════════════════════════════════════
  {
    cefrLevel: "C2", difficulty: 1.5, discrimination: 1.5,
    tags: ["writing", "c2", "scholarly-essay", "epistemology", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 320, max: 420 }, productLine: "Academia",
      cefrDescriptor: "Can write clear, smoothly flowing, complex texts in an appropriate style.",
      prompt: "Write a scholarly argumentative essay on the following question: 'Is objectivity in journalism possible, or is it an ideological construct that serves to obscure the perspectives embedded in all reporting?' Engage with at least two theoretical frameworks and arrive at a nuanced, original conclusion.",
      scoringRubric: RUBRIC.C2,
      sampleAnswer: "The Epistemology of Objectivity: Journalism's Useful Illusion\n\nThe norm of objectivity occupies an unusual position in the sociology of journalism: it is simultaneously the profession's most cherished self-understanding and, in the view of many media scholars, its most consequential fiction. The question of whether objectivity in news reporting is possible, or whether it functions as an ideological construct that naturalises particular perspectives while rendering others invisible, has generated a substantial critical literature that resists resolution but repays examination.\n\nThe liberal-rationalist defence of journalistic objectivity — articulated in its most sophisticated form by Michael Schudson's historical account of the 'objectivity norm' — holds that while perfect objectivity may be unattainable, the aspiration serves as a regulative ideal: a commitment to procedural standards (source verification, balance, the separation of news and opinion) that, while imperfect, constrain the worst forms of partisan distortion. On this view, objectivity is not a metaphysical claim about access to unmediated reality but a set of professional practices that increase the likelihood of accurate, fair reporting.\n\nThe constructivist critique, most influentially developed through Stuart Hall's encoding/decoding model and the Glasgow Media Group's empirical studies of broadcast news, challenges this from a different direction. News, on this analysis, is not a transparent window onto events but a representation produced within ideological conditions. The choice of which events to cover, which sources to cite as authoritative, which conflicts to naturalise and which to render visible — these are structurally shaped decisions, even when no individual journalist is acting in bad faith. The 'balanced' interview in which trade union representatives are routinely asked to respond to economists, rather than vice versa, encodes an epistemological hierarchy that the objectivity norm simultaneously relies upon and conceals.\n\nThe poststructuralist extension of this argument — that all meaning is perspectivally produced and that the claim to objective representation is therefore always a form of power — risks collapsing into a relativism that makes journalism (and indeed the critique of journalism) impossible. This is not a merely academic objection: if all perspectives are equally partial, the distinction between investigative journalism and propaganda dissolves.\n\nA defensible resolution lies between these positions. Journalism cannot achieve a view from nowhere — and the pretence that it can serves, as the constructivists argue, to obscure the perspectives it does embody. But this does not mean that all representations are equally distorted or that procedural rigour is without value. What it requires is a more intellectually honest account of objectivity: one that acknowledges perspectival constraints openly, subjects them to scrutiny, and treats transparency about method as a more credible epistemic virtue than the impossible claim to neutrality.",
    },
  },
  {
    cefrLevel: "C2", difficulty: 1.6, discrimination: 1.5,
    tags: ["writing", "c2", "policy-brief", "climate", "academia", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 300, max: 400 }, productLine: "Academia",
      cefrDescriptor: "Can write precise, nuanced policy documents deploying specialist register with complete control.",
      prompt: "Write a policy brief for a government minister on the following question: 'Should developed nations provide direct financial reparations to developing nations most affected by climate change?' The brief should be concise, evidenced, balanced, and conclude with a clear policy recommendation with justification.",
      scoringRubric: RUBRIC.C2,
      sampleAnswer: "Policy Brief: Climate Finance and the Question of Reparative Justice\nPrepared for the Secretary of State for Foreign, Commonwealth & Development Affairs\n\nKey Question\nShould the UK commit to direct reparative financial transfers to nations bearing disproportionate costs of climate change despite having contributed minimally to cumulative greenhouse gas emissions?\n\nBackground\nThe science is unambiguous: small island states, sub-Saharan African nations and South Asian countries face the most severe climate impacts — sea level rise, extreme weather intensification, agricultural disruption — while historically having contributed negligibly to atmospheric carbon concentrations. The G7 nations, conversely, are responsible for approximately 60% of cumulative emissions since industrialisation.\n\nThe COP27 agreement (2022) established a 'Loss and Damage' fund, representing the first formal multilateral acknowledgement of this asymmetry. However, the fund remains substantially undercapitalised, and the question of whether contributions should be understood as aid (voluntary, developmental) or reparations (obligatory, compensatory) remains politically unresolved.\n\nArguments in Favour\nThe moral case for reparative framing is considerable. Nations that extracted developmental advantage from activities that imposed uncompensated costs on others have a prima facie obligation to remedy those costs — a principle well-established in domestic tort law. Formalising this obligation would, moreover, strengthen multilateral climate agreements by addressing the developing world's legitimate grievance that existing frameworks ask them to bear the costs of others' emissions.\n\nArguments Against\nOpponents raise three objections of varying force. First, the attribution of specific harms to specific historical emitters involves methodological complexities that may resist legal formalisation. Second, framing contributions as reparations carries domestic political costs that may limit their quantum. Third, some economists argue that climate finance is better channelled through adaptation and mitigation investment than through direct transfers, which may lack conditionality.\n\nRecommendation\nThe UK should adopt an 'obligation-based' framing for its Loss and Damage contributions — distinguishing them explicitly from development aid in official communications — and commit to a minimum annual contribution of £1.5 billion, indexed to GDP growth. This position reflects the strongest defensible version of our international legal and moral obligations while remaining attentive to domestic fiscal constraints and maximising multilateral leverage.",
    },
  },
  {
    cefrLevel: "C2", difficulty: 1.7, discrimination: 1.5,
    tags: ["writing", "c2", "literary-critique", "modernism", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 320, max: 420 }, productLine: "Academia",
      cefrDescriptor: "Can write sophisticated, fluid literary criticism demonstrating mastery of analytical register.",
      prompt: "Write a literary critical essay examining how a modernist writer of your choice (e.g., Woolf, Joyce, Kafka, Beckett, Borges) uses narrative technique or formal innovation to embody a philosophical or psychological theme. Your essay should make an original argument, not merely summarise.",
      scoringRubric: RUBRIC.C2,
      sampleAnswer: "The Dissolution of Interiority: Stream of Consciousness as Epistemological Crisis in Virginia Woolf's Mrs Dalloway\n\nThe assumption that Virginia Woolf's celebrated deployment of stream of consciousness technique represents an unmediated access to inner life — a kind of literary psychology — is, on closer examination, less a description of her method than a misreading of its implications. In Mrs Dalloway (1925), Woolf uses the apparent intimacy of free indirect discourse not to secure the reader's confident knowledge of her characters' consciousness but to enact, at the level of form, an epistemological crisis about the possibility of such knowledge.\n\nThe novel's technique operates through constant, barely signalled transitions between one consciousness and another, between interior and exterior, between past and present, with a fluidity that deliberately complicates the reader's orientation. Clarissa Dalloway moves from a present-tense sensory perception of the June morning ('What a lark! What a plunge!') to a memory of Sally Seton at Bourton, to a reflection on the nature of self across time — all within a few sentences, without paragraph breaks or explicit temporal markers. The formal effect is not revelation but a kind of productive vertigo.\n\nCrucially, Woolf's handling of Septimus Smith — whose traumatised consciousness runs in parallel with Clarissa's without their ever meeting — develops the novel's implicit argument that consciousness is fundamentally inaccessible from without. The two streams of subjectivity never converge; each character remains enclosed within their own perceptual world. The narrative technique enacts rather than resolves this isolation: the free indirect discourse that seems to give us Septimus's inner life simultaneously forecloses certainty about it.\n\nThis reading reframes what has sometimes been interpreted as Woolfian solipsism as something more philosophically rigorous: a formal embodiment of the post-Cartesian problem of other minds. The novel is not celebrating the richness of inner life; it is examining — with both beauty and anxiety — the irreducible opacity between one consciousness and another, and the fragile, temporary bridges that art, memory and love attempt to build across it.",
    },
  },
  {
    cefrLevel: "C2", difficulty: 1.8, discrimination: 1.5,
    tags: ["writing", "c2", "satirical-piece", "social-critique", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 280, max: 380 }, productLine: "Language Schools",
      cefrDescriptor: "Can write sophisticated creative texts deploying irony, satire and register-switching with full control.",
      prompt: "Write a satirical piece in the tradition of Jonathan Swift, George Orwell or Evelyn Waugh, targeting a contemporary social phenomenon (e.g., wellness culture, productivity culture, social media performance, corporate jargon). Your piece should be recognisably satirical in intent, controlled in register, and avoid mere mockery in favour of a substantive critique.",
      scoringRubric: RUBRIC.C2,
      sampleAnswer: "A Guide to Authentic Living™: The Complete Wellbeing Protocol for the Discerning Modern Person\n\nCongratulations. You are feeling overwhelmed, undersourced and sensorially overstimulated — which means you are ready to begin your journey.\n\nFirst, a note on language. From this point forward, you will not have problems. You will have 'challenges', 'growth edges' and, when things are going particularly badly, 'opportunities to practise'. This is not euphemism. It is neuroscience. Or possibly quantum mechanics. The important thing is that it has been mentioned on a podcast.\n\nYour mornings will require restructuring. The five-thirty wake-up is non-negotiable. This is not because four-thirty or six-thirty would serve you less well — no serious study has compared them — but because five-thirty is the time at which the founders of three successful technology companies reportedly awoke before acquiring, respectively, a private jet, a contentious social platform and a legal dispute. Correlation is not causation, but correlation is, frankly, enough to sell a book.\n\nYou will meditate for twenty-two minutes. Not twenty. Not twenty-five. Twenty-two is the number at which the app subscription tier currently defaults, and there is no reason to question this. You will feel a sense of centred, present-moment awareness. You will then immediately check your phone to see whether anyone has responded to the photograph you posted of your matcha latte, which you captioned 'stillness'.\n\nIn the evening, you will journal. Not to process your actual experience — that would risk encountering it — but to identify three things you are grateful for. Research confirms that gratitude journalling improves wellbeing, though the same research, less frequently cited, notes that the effect sizes are modest and the methodologies heterogeneous. Heterogeneity is a growth edge.\n\nYou will, finally, sleep. But not before reviewing your HRV score, your sleep debt index, your circadian alignment percentile and the proprietary composite metric that synthesises these into a single number between one and a hundred. Tonight it is sixty-three. Whether this is good or bad is unclear. But it is trackable, which is the contemporary equivalent of understood.\n\nYou are doing incredibly well. Keep going. We will check in again tomorrow morning, at five-thirty, when we will reassess your journey.",
    },
  },
  {
    cefrLevel: "C2", difficulty: 2.0, discrimination: 1.5,
    tags: ["writing", "c2", "epistolary-fiction", "creative", "language-schools", SEED_TAG],
    content: {
      taskType: "story", wordRange: { min: 280, max: 380 }, productLine: "Language Schools",
      cefrDescriptor: "Can write accomplished creative prose demonstrating full command of narrative technique and register.",
      prompt: "Write a piece of epistolary short fiction (a story told entirely through letters, emails or messages) in which the relationship between two characters changes significantly over the course of the correspondence. The form itself — what is written, what is withheld, how tone shifts — should be as important as the content. The story should be complete and emotionally resonant.",
      scoringRubric: RUBRIC.C2,
      sampleAnswer: "---\n\nFrom: e.marchetti@globallaw.com\nTo: s.varma@brightday.co.uk\nDate: 3 September\nSubject: Contract amendment — clause 12b\n\nDear Ms Varma,\n\nPlease find attached the revised clause 12b as discussed. Kindly confirm receipt and return a signed copy at your earliest convenience.\n\nYours sincerely,\nElena Marchetti\n\n---\n\nFrom: s.varma@brightday.co.uk\nTo: e.marchetti@globallaw.com\nDate: 3 September\nSubject: RE: Contract amendment — clause 12b\n\nDear Ms Marchetti,\n\nReceived — and I see you've changed 'reasonable endeavours' back to 'best endeavours'. I thought we agreed on Tuesday.\n\nS. Varma\n\n---\n\nFrom: e.marchetti@globallaw.com\nTo: s.varma@brightday.co.uk\nDate: 4 September\nSubject: RE: RE: Contract amendment\n\nDear Ms Varma,\n\nYou thought correctly. My client overruled me. The short version is that he is wrong and I have told him so, twice, in writing. The contract version currently stands. I'm sorry.\n\nElena\n\n---\n\nFrom: s.varma@brightday.co.uk\nTo: e.marchetti@globallaw.com\nDate: 4 September\n\nElena — can I call you Elena? — does your client ever actually read your advice, or just the bills?\n\nSona\n\n---\n\nFrom: e.marchetti@globallaw.com\nTo: s.varma@brightday.co.uk\nDate: 5 September\n\nSona. Occasionally the bills. Never the advice. This is, as far as I can tell, universal law.\n\nElena\n\n---\n\nFrom: s.varma@brightday.co.uk\nTo: e.marchetti@globallaw.com\nDate: 12 November\n\nElena —\n\nForgive the out-of-the-blue. I was just told our deal fell through — nothing to do with clause 12b, some financing thing on their end. I don't know why I'm writing to you about it rather than anyone who actually works for me. Probably because you're the only person in the whole transaction who seemed to find any of it faintly absurd.\n\nSona\n\n---\n\nFrom: e.marchetti@globallaw.com\nTo: s.varma@brightday.co.uk\nDate: 12 November\n\nI'm sorry about the deal. I'm not sorry about this email.\n\nElena\n\n---\n\nFrom: s.varma@brightday.co.uk\nTo: e.marchetti@globallaw.com\nDate: 28 February\n\nElena —\n\nI know this is irregular and possibly entirely unwelcome, but: London? I'll be there Thursday. Coffee, if you're free, for approximately the same reasons I wrote to you in November — which I've been thinking about rather more than is probably sensible.\n\nSona\n\n---\n\nFrom: e.marchetti@globallaw.com\nTo: s.varma@brightday.co.uk\nDate: 28 February\n\nThursday at three. The place near Liverpool Street where they know what they're doing with an espresso. I'll book it.\n\nElena\n\nP.S. It is entirely welcome.",
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set. Add it to .env");
    process.exit(1);
  }

  if (process.env.DRY_RUN === "1") {
    console.log(`DRY_RUN: would insert ${items.length} writing items`);
    const byLevel: Record<string, number> = {};
    for (const i of items) byLevel[i.cefrLevel] = (byLevel[i.cefrLevel] || 0) + 1;
    console.table(byLevel);
    return;
  }

  if (process.env.FORCE === "1") {
    const deleted = await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`🗑  Deleted ${deleted.count} existing items tagged [${SEED_TAG}]`);
  }

  const existing = await prisma.item.count({ where: { tags: { has: SEED_TAG } } });
  if (existing > 0 && process.env.FORCE !== "1") {
    console.log(`⚠️  ${existing} items already seeded. Use FORCE=1 to re-seed.`);
    return;
  }

  let inserted = 0;
  for (const item of items) {
    await prisma.item.create({
      data: {
        skill: "WRITING",
        cefrLevel: item.cefrLevel as any,
        type: "WRITING_PROMPT",
        status: "ACTIVE",
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: 0,
        tags: item.tags,
        content: item.content,
      },
    });
    inserted++;
  }

  const totals: Record<string, number> = {};
  for (const i of items) totals[i.cefrLevel] = (totals[i.cefrLevel] || 0) + 1;

  console.log(`\n✅  Inserted ${inserted} writing items`);
  console.table(totals);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
