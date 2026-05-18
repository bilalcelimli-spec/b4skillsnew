/**
 * WRITING — Phase 1: Foundation (A2 – C2)
 * 70 WRITING_PROMPT items scored 0–10 by Gemini AI (GRM model)
 *
 * Content is a WRITING_PROMPT item format:
 *   content.prompt          — The writing task instruction shown to the candidate
 *   content.taskType        — email | essay | report | story | review | argument | summary | letter
 *   content.wordRange       — { min, max } target word count
 *   content.cefrDescriptor  — One-sentence CEFR-level descriptor for feedback context
 *   content.scoringRubric   — Array of 5 criteria objects (name, maxScore, descriptor)
 *   content.sampleAnswer    — Model answer for calibration
 *   content.productLine     — Primary | Junior Suite | 15-Min Diagnostic | Academia | Corporate | Language Schools
 *
 * Seeding:
 *   npx tsx scripts/seed-writing-phase1.ts
 *   DRY_RUN=1 npx tsx scripts/seed-writing-phase1.ts
 *   FORCE=1 npx tsx scripts/seed-writing-phase1.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { validateItemBatch, reportValidationResults } from './_validation-helper.js';

const prisma = new PrismaClient();
const SEED_TAG = "seed-writing-phase1";

const RUBRIC = {
  A2: [
    { name: "Task Achievement",       maxScore: 2, descriptor: "Writes simple connected text on familiar topics (e.g., personal emails, short messages)." },
    { name: "Grammar & Accuracy",     maxScore: 2, descriptor: "Uses basic sentence structures correctly most of the time." },
    { name: "Vocabulary",             maxScore: 2, descriptor: "Uses a basic repertoire of words adequate to convey simple information." },
    { name: "Coherence & Cohesion",   maxScore: 2, descriptor: "Links clauses with simple connectors (and, but, so)." },
    { name: "Communicative Effect",   maxScore: 2, descriptor: "The message would be understood by a sympathetic reader." },
  ],
  B1: [
    { name: "Task Achievement",       maxScore: 2, descriptor: "Writes straightforward connected text on familiar and mildly unfamiliar topics." },
    { name: "Grammar & Accuracy",     maxScore: 2, descriptor: "Uses a range of basic structures; errors do not impede communication." },
    { name: "Vocabulary",             maxScore: 2, descriptor: "Sufficient vocabulary to express ideas on everyday topics." },
    { name: "Coherence & Cohesion",   maxScore: 2, descriptor: "Uses a limited number of cohesive devices; text is generally clear." },
    { name: "Communicative Effect",   maxScore: 2, descriptor: "Intended audience would understand the text with minimal difficulty." },
  ],
  B2: [
    { name: "Task Achievement",       maxScore: 2, descriptor: "Writes detailed texts on a variety of subjects related to field of interest." },
    { name: "Grammar & Accuracy",     maxScore: 2, descriptor: "Shows good control of grammar; errors are rare and do not cause misunderstanding." },
    { name: "Vocabulary",             maxScore: 2, descriptor: "Uses a broad lexical repertoire; some inaccuracies but clearly communicates." },
    { name: "Coherence & Cohesion",   maxScore: 2, descriptor: "Uses varied cohesive devices with reasonable effectiveness." },
    { name: "Communicative Effect",   maxScore: 2, descriptor: "Clear and appropriate style for the intended audience." },
  ],
  C1: [
    { name: "Task Achievement",       maxScore: 2, descriptor: "Writes clear, well-structured, detailed texts on complex subjects." },
    { name: "Grammar & Accuracy",     maxScore: 2, descriptor: "High grammatical accuracy; occasional minor slips." },
    { name: "Vocabulary",             maxScore: 2, descriptor: "Good range of vocabulary; uses some idiomatic and nuanced expressions." },
    { name: "Coherence & Cohesion",   maxScore: 2, descriptor: "Wide variety of cohesive devices used flexibly and appropriately." },
    { name: "Communicative Effect",   maxScore: 2, descriptor: "Effective and appropriate register for purpose and audience." },
  ],
  C2: [
    { name: "Task Achievement",       maxScore: 2, descriptor: "Writes complex, sophisticated texts with nuance and precision." },
    { name: "Grammar & Accuracy",     maxScore: 2, descriptor: "Maintains consistent grammatical control across all structures." },
    { name: "Vocabulary",             maxScore: 2, descriptor: "Precise and sophisticated lexical choice; near-native range." },
    { name: "Coherence & Cohesion",   maxScore: 2, descriptor: "Masterful use of cohesive devices; text flows naturally." },
    { name: "Communicative Effect",   maxScore: 2, descriptor: "Entirely natural, accomplished register matching sophisticated audience." },
  ],
};

const items = [
  // ════════════════════════════════════════════
  // A2 — 10 items (difficulty −1.2 to −0.2)
  // ════════════════════════════════════════════
  {
    cefrLevel: "A2", difficulty: -1.2, discrimination: 1.0,
    tags: ["writing", "a2", "email", "informal", "primary", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 30, max: 50 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write simple personal messages about familiar topics.",
      prompt: "Write a short email to your friend. Tell them:\n• What you did yesterday\n• What your favourite subject at school is\n• What you want to do this weekend",
      scoringRubric: RUBRIC.A2,
      sampleAnswer: "Hi Sam! Yesterday I played football with my brother. It was very fun. My favourite subject is Art because I love drawing animals. This weekend I want to go to the park. See you soon! Alex",
    },
  },
  {
    cefrLevel: "A2", difficulty: -1.1, discrimination: 1.0,
    tags: ["writing", "a2", "postcard", "informal", "junior", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 40, max: 60 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write short simple notes and messages relating to everyday matters.",
      prompt: "Write a postcard to a family member from a place you visited. Include:\n• Where you are\n• The weather\n• One thing you have seen or done\n• A question for them",
      scoringRubric: RUBRIC.A2,
      sampleAnswer: "Dear Mum, I am in Rome! The weather is very sunny and warm. Yesterday we saw the Colosseum — it was huge and amazing. I ate ice cream every day! Is everything OK at home? Love, Mia",
    },
  },
  {
    cefrLevel: "A2", difficulty: -1.0, discrimination: 1.0,
    tags: ["writing", "a2", "description", "informal", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 40, max: 65 }, productLine: "Language Schools",
      cefrDescriptor: "Can describe everyday aspects of their environment such as people and places.",
      prompt: "Describe your bedroom to a new pen pal. Write about:\n• The size and main colours\n• What furniture is in the room\n• Your favourite thing in the room and why",
      scoringRubric: RUBRIC.A2,
      sampleAnswer: "My bedroom is small but cosy. The walls are light blue. I have a single bed, a desk, and a big bookshelf. My favourite thing is my bookshelf because I love reading. I have over fifty books on it. I spend a lot of time in my room studying and reading.",
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.9, discrimination: 1.0,
    tags: ["writing", "a2", "story", "informal", "junior", SEED_TAG],
    content: {
      taskType: "story", wordRange: { min: 50, max: 70 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write about past events using basic past tense structures.",
      prompt: "Write a short story about a day when something funny or unexpected happened. Include:\n• When and where it happened\n• What you were doing\n• What happened\n• How you felt",
      scoringRubric: RUBRIC.A2,
      sampleAnswer: "Last Saturday I went shopping with my mum. We were looking for new shoes when I saw my teacher in the shop. She was wearing a very funny hat. I laughed and she laughed too. It was really embarrassing but also very funny. I told all my friends about it the next day.",
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.8, discrimination: 1.0,
    tags: ["writing", "a2", "message", "informal", "primary", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 35, max: 55 }, productLine: "Primary (7-10)",
      cefrDescriptor: "Can write short simple notes and messages.",
      prompt: "Your English teacher asked you to write a message for the class noticeboard. Tell your classmates:\n• About a school trip next week\n• What they need to bring\n• Why it will be fun",
      scoringRubric: RUBRIC.A2,
      sampleAnswer: "Hello everyone! Next Friday we have a school trip to the Science Museum. Please bring a packed lunch, a water bottle, and your permission slip. I think it will be very interesting because we can do science experiments and see real rockets. Don't forget!",
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.7, discrimination: 1.0,
    tags: ["writing", "a2", "review", "informal", "language-schools", SEED_TAG],
    content: {
      taskType: "review", wordRange: { min: 45, max: 65 }, productLine: "Language Schools",
      cefrDescriptor: "Can give a short simple review of a familiar product or activity.",
      prompt: "Write a short review of a film or TV show you watched recently. Include:\n• The title and type (comedy, adventure, etc.)\n• What it is about (briefly)\n• What you liked or did not like\n• Would you recommend it? Why?",
      scoringRubric: RUBRIC.A2,
      sampleAnswer: "I watched 'The Lion King' last weekend. It is an animated adventure film about a young lion called Simba. I liked the songs and the animals were beautiful. The sad parts made me cry! I recommend it because it is exciting and has a great message about family. Children and adults will enjoy it.",
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.6, discrimination: 1.0,
    tags: ["writing", "a2", "instructions", "informal", "junior", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 50, max: 70 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write simple directions or instructions using sequencing words.",
      prompt: "A new student is joining your school next week. Write instructions to help them get from the school entrance to the library. Use words like: first, then, next, finally.",
      scoringRubric: RUBRIC.A2,
      sampleAnswer: "Welcome to our school! Here is how to get to the library. First, walk through the main entrance. Then, go straight ahead until you reach the stairs. Next, go up to the second floor. Turn left and walk to the end of the corridor. Finally, the library is the big room on your right. You can ask anyone if you get lost!",
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.5, discrimination: 1.1,
    tags: ["writing", "a2", "opinion", "informal", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 50, max: 70 }, productLine: "Language Schools",
      cefrDescriptor: "Can write brief accounts of events and activities and express simple opinions.",
      prompt: "Your school is thinking about having a school uniform. Write a short paragraph giving YOUR opinion. Include:\n• Whether you agree or disagree\n• Two reasons for your opinion\n• What you think students should wear instead (if you disagree)",
      scoringRubric: RUBRIC.A2,
      sampleAnswer: "I disagree with having a school uniform. I think students should wear their own clothes for two reasons. First, personal clothes are more comfortable and you can choose what you like. Second, uniforms are expensive and not all families can pay for them. I think students should wear clean and tidy clothes, but not a uniform.",
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.4, discrimination: 1.1,
    tags: ["writing", "a2", "complaint", "semi-formal", "junior", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 50, max: 75 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write simple semi-formal communications to request or complain.",
      prompt: "You ordered a birthday present online, but it arrived broken. Write a short email to the company. Include:\n• What you ordered and when\n• The problem\n• What you want the company to do",
      scoringRubric: RUBRIC.A2,
      sampleAnswer: "Dear Customer Service, I am writing about an order I made last Monday. I ordered a remote control car (order number 456) for my birthday. When it arrived yesterday, it was broken — the wheels did not move. I am very disappointed. Please send me a new one or give me my money back. Thank you. James",
    },
  },
  {
    cefrLevel: "A2", difficulty: -0.3, discrimination: 1.1,
    tags: ["writing", "a2", "comparison", "informal", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 55, max: 80 }, productLine: "Language Schools",
      cefrDescriptor: "Can make simple comparisons using basic comparative and superlative forms.",
      prompt: "Compare life in a big city to life in a small village. Write about:\n• One advantage of city life\n• One advantage of village life\n• Where you would prefer to live and why",
      scoringRubric: RUBRIC.A2,
      sampleAnswer: "Cities and villages are very different. One advantage of city life is that there are many shops, restaurants and entertainment options. However, village life is quieter and more peaceful, which is healthier. Personally, I prefer to live in a city because I like having things to do. But I also enjoy visiting the countryside for holidays.",
    },
  },

  // ════════════════════════════════════════════
  // B1 — 15 items (difficulty −0.5 to 0.5)
  // ════════════════════════════════════════════
  {
    cefrLevel: "B1", difficulty: -0.5, discrimination: 1.2,
    tags: ["writing", "b1", "email", "semi-formal", "language-schools", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 80, max: 120 }, productLine: "Language Schools",
      cefrDescriptor: "Can write personal letters describing experiences, feelings and events.",
      prompt: "You recently attended an English language summer camp. Write an email to a friend who is thinking of applying next year. Include:\n• What the camp was like (activities, accommodation)\n• What you learned\n• Whether you recommend it and why",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Hi Tom! I just got back from the English summer camp and wanted to tell you all about it. The camp was in Cornwall, near the sea. We stayed in small cabins and the food was really good. Every day we had English classes in the morning and activities like surfing, hiking and cooking in the afternoon. I learned a lot of useful vocabulary for everyday situations and my confidence speaking improved a lot. I really recommend it — the teachers were friendly and patient, and you make friends from all over the world. You should definitely apply! Let me know if you want more information.",
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.4, discrimination: 1.2,
    tags: ["writing", "b1", "story", "narrative", "junior", SEED_TAG],
    content: {
      taskType: "story", wordRange: { min: 100, max: 150 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write straightforward connected narratives about real or imagined events.",
      prompt: "Write a story beginning with the sentence: 'When I opened the door, I could not believe what I saw.' Include a clear beginning, middle and end. Use varied past tense forms.",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "When I opened the door, I could not believe what I saw. The entire living room was covered in colourful balloons and streamers. My family jumped out from behind the sofa and shouted 'Surprise!' I had completely forgotten it was my birthday.\n\nMy mum had been planning the party for weeks without me noticing. While I was at school, she had decorated the house and baked my favourite chocolate cake. All my closest friends were there too — even my cousin who lives in Manchester.\n\nWe spent the afternoon playing games, eating delicious food and laughing. It was the best surprise I had ever had. When everyone finally left, I told my mum it was the most perfect birthday she had ever organised.",
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.3, discrimination: 1.2,
    tags: ["writing", "b1", "review", "consumer", "language-schools", SEED_TAG],
    content: {
      taskType: "review", wordRange: { min: 100, max: 140 }, productLine: "Language Schools",
      cefrDescriptor: "Can give a detailed review giving personal views on a product or service.",
      prompt: "A travel website has asked for reviews of places to stay. Write a review of a hotel, hostel or holiday home you have stayed in. Include:\n• The location and type of accommodation\n• Positive and negative aspects\n• Who you would recommend it for",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "I stayed at the Blue Horizon Hotel in Lisbon last summer and overall it was a great experience. The hotel is located right in the city centre, which was very convenient for exploring the main sights on foot.\n\nOn the positive side, the rooms were spacious and modern with comfortable beds. The breakfast buffet was excellent — fresh fruit, pastries and eggs cooked to order. The staff were always helpful and spoke good English.\n\nHowever, the hotel was quite noisy at night due to the busy street outside. I would suggest asking for a room at the back of the building.\n\nI would recommend this hotel for couples and solo travellers who want to explore the city. Families with young children might find the noise problematic. Despite this, the excellent location makes it worth the price.",
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.2, discrimination: 1.2,
    tags: ["writing", "b1", "essay", "opinion", "junior", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 100, max: 140 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can express opinions and give reasons in connected text.",
      prompt: "Your school magazine is running a debate on social media. Write an article giving your opinion on the following question: 'Is social media good or bad for teenagers?' Give reasons for your view and acknowledge one opposing point.",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Social media is a topic that divides teenagers and adults alike. In my opinion, social media can be both beneficial and harmful, but overall I think it has more negative effects on teenagers.\n\nOn the one hand, social media helps young people stay connected with friends and family. It is also a useful tool for sharing information and finding communities with similar interests.\n\nHowever, research shows that teenagers who spend a lot of time on social media are more likely to feel anxious or depressed. Cyberbullying is also a serious problem that can have a devastating impact on mental health. Furthermore, social media can distract students from studying.\n\nIn conclusion, while social media has some benefits, I believe teenagers need clearer guidelines about how much time to spend online and should be educated about its risks.",
    },
  },
  {
    cefrLevel: "B1", difficulty: -0.1, discrimination: 1.2,
    tags: ["writing", "b1", "report", "school", "junior", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 100, max: 150 }, productLine: "Junior Suite (11-14)",
      cefrDescriptor: "Can write short simple reports with relevant information.",
      prompt: "Your school wants to improve the canteen. You have interviewed 20 students and found out:\n• 80% want more vegetarian options\n• 60% find the canteen too loud\n• 70% would like a dedicated study area near the canteen\nWrite a report for the head teacher summarising the findings and making two recommendations.",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Report: Student Views on the School Canteen\n\nIntroduction\nThis report presents findings from a survey of 20 students about the school canteen.\n\nKey Findings\nThe majority of students (80%) would like more vegetarian meal options. Many students also feel the canteen is too noisy — 60% of those surveyed mentioned this as a problem. In addition, 70% said they would appreciate a dedicated quiet area near the canteen for studying.\n\nRecommendations\nFirstly, I recommend introducing at least three vegetarian dishes per day to meet growing demand. Secondly, a quiet study zone with tables and soft seating could be created in the corner of the canteen to reduce overall noise levels.\n\nConclusion\nAddressing these two issues would significantly improve the canteen experience for the majority of students.",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.0, discrimination: 1.2,
    tags: ["writing", "b1", "letter", "formal", "language-schools", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 100, max: 150 }, productLine: "Language Schools",
      cefrDescriptor: "Can write formal letters using standard phrases.",
      prompt: "Write a letter to the editor of a local newspaper about a problem in your neighbourhood (e.g., litter, lack of green spaces, traffic). Include:\n• A clear description of the problem\n• The causes or effects\n• A practical solution you suggest",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Dear Editor,\n\nI am writing to draw attention to the serious litter problem in Riverside Park, which has been getting worse over the past year.\n\nThe park is used by hundreds of families and children every day, but there are too few bins and those that exist are often overflowing at weekends. As a result, plastic bags, bottles and food packaging are scattered across the paths and grass, which is both unpleasant and dangerous for wildlife.\n\nI believe the local council should install more bins and organise regular clean-up sessions involving local residents and schoolchildren. This would not only improve the appearance of the park but also teach young people about environmental responsibility.\n\nI sincerely hope the council will take action before the problem becomes worse.\n\nYours faithfully,\nA Concerned Resident",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.1, discrimination: 1.2,
    tags: ["writing", "b1", "description", "place", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 100, max: 140 }, productLine: "Language Schools",
      cefrDescriptor: "Can describe in some detail different aspects of a place including atmosphere.",
      prompt: "Describe a place you have visited that made a strong impression on you. Write about:\n• The location and setting\n• What makes it special (sights, sounds, atmosphere)\n• Why you would or would not return",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "One place that truly amazed me is the Grand Bazaar in Istanbul. It is one of the largest and oldest covered markets in the world, located in the heart of the city's historic centre.\n\nAs soon as you step inside, your senses are overwhelmed in the best possible way. Thousands of colourful textiles, ceramics, jewellery and spices are displayed in hundreds of small shops. The air is filled with the smell of fresh bread and sweet tea. Merchants call out to passers-by in dozens of languages, creating a lively, almost chaotic atmosphere.\n\nWhat struck me most was the sense of history — these winding corridors have been a centre of trade for over 500 years. I would absolutely return, mainly because I barely scratched the surface of everything on offer.",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.2, discrimination: 1.2,
    tags: ["writing", "b1", "argument", "persuasive", "academia", SEED_TAG],
    content: {
      taskType: "argument", wordRange: { min: 110, max: 155 }, productLine: "Academia",
      cefrDescriptor: "Can put forward an argument with supporting points.",
      prompt: "Do you think all school subjects should be taught in English, even in countries where English is not the first language? Write a discursive paragraph presenting BOTH sides and then giving your own opinion.",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Some educationalists argue that teaching all school subjects in English would prepare students better for a globalised world and improve their language skills. There is evidence that immersion programmes help learners acquire fluency more quickly. However, others strongly disagree, pointing out that learning complex subjects like maths or science in a second language can hinder comprehension and disadvantage children from less privileged backgrounds who have less English at home.\n\nPersonally, I believe a balanced approach is best. Core academic subjects should primarily be taught in the students' mother tongue to ensure deep understanding, while English should be taught as a distinct subject and used for specific activities or classes. This would improve English proficiency without sacrificing subject knowledge.",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.3, discrimination: 1.2,
    tags: ["writing", "b1", "summary", "informative", "academia", SEED_TAG],
    content: {
      taskType: "summary", wordRange: { min: 80, max: 120 }, productLine: "Academia",
      cefrDescriptor: "Can summarise and convey key points from a short text.",
      prompt: "Read this short extract and summarise it in your own words in 80–100 words:\n\n'Scientists have discovered that spending time in natural environments such as forests, parks or near water significantly reduces stress hormones in the human body. Studies show that even a 20-minute walk in a park can lower cortisol levels and improve mood. In Japan, the practice of Shinrin-yoku, or forest bathing, has been used as a health therapy for decades. Health authorities in some countries now prescribe time in nature as a treatment for mild depression and anxiety.'",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Research suggests that spending time in natural settings — such as parks, forests, or near water — has measurable health benefits. Even a brief 20-minute walk outdoors can reduce stress hormones and lift mood. In Japan, a practice called Shinrin-yoku, or forest bathing, has long been recognised as a therapeutic tool. Following this evidence, health authorities in several countries have begun formally recommending time spent in nature as a treatment for mild mental health conditions like anxiety and depression.",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.35, discrimination: 1.2,
    tags: ["writing", "b1", "email", "semi-formal", "corporate", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 100, max: 140 }, productLine: "Corporate",
      cefrDescriptor: "Can write clear messages in a semi-formal professional context.",
      prompt: "Your team manager has asked you to write an email to a client confirming a meeting. Include:\n• The date, time and format (in-person or video call)\n• What will be discussed\n• What the client needs to prepare or bring",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Dear Mr Hassan,\n\nThank you for your time on the phone today. I am writing to confirm our meeting on Thursday 14 March at 10:00 am. The meeting will take place via video conference — I will send you the link separately.\n\nDuring the meeting, we plan to present our proposal for the new marketing campaign, discuss your feedback on the draft materials, and agree on the next steps and timeline.\n\nTo make the most of our time together, it would be helpful if you could review the attached draft brochure before the call and prepare any questions or comments you may have.\n\nPlease do not hesitate to contact me if you need to reschedule or have any questions. We look forward to speaking with you.\n\nKind regards,\nLaura",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.4, discrimination: 1.2,
    tags: ["writing", "b1", "blog", "informal", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 110, max: 155 }, productLine: "Language Schools",
      cefrDescriptor: "Can produce cohesive text in an informal, engaging register.",
      prompt: "Write a blog post for a language learning website. Share your top three tips for learning a new language. Explain each tip briefly and give an example from your own experience.",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Learning a new language can feel overwhelming, but with the right approach it can also be hugely rewarding. Here are my three top tips based on my own experience.\n\n1. Practise a little every day. Rather than studying for three hours once a week, I spend 20–30 minutes every single day. This consistency helped my vocabulary grow much faster.\n\n2. Watch films and TV shows in your target language. I started watching Spanish Netflix series with subtitles. After a few months I didn't need them as much!\n\n3. Find a conversation partner. Talking to a native speaker was terrifying at first, but it improved my fluency faster than any textbook. Try language exchange apps.\n\nGood luck on your journey!",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.45, discrimination: 1.2,
    tags: ["writing", "b1", "report", "work", "corporate", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 110, max: 155 }, productLine: "Corporate",
      cefrDescriptor: "Can write basic professional reports with structured paragraphs.",
      prompt: "Write a short report about the results of a staff satisfaction survey at your company. Key findings:\n• 75% of staff feel the workload is too high\n• 60% want more flexible working hours\n• 80% are happy with their immediate manager\nMake two recommendations for improving staff wellbeing.",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Staff Satisfaction Survey — Summary Report\n\nThis report summarises the key findings from the recent staff satisfaction survey completed by all 40 employees.\n\nThe majority of respondents (75%) stated that their workload is currently too high, suggesting that current staffing levels may be insufficient. Additionally, 60% indicated a preference for more flexible working arrangements. On a positive note, 80% reported satisfaction with their immediate manager, which reflects well on our team leadership.\n\nBased on these findings, we recommend two immediate actions. First, management should review project timelines and consider hiring two additional staff members before Q3. Second, a flexible working pilot should be introduced, allowing staff to choose their start and finish times within an agreed core hours framework.",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.5, discrimination: 1.2,
    tags: ["writing", "b1", "argument", "environment", "academia", SEED_TAG],
    content: {
      taskType: "argument", wordRange: { min: 110, max: 160 }, productLine: "Academia",
      cefrDescriptor: "Can write clear arguments on topics of general interest with some development.",
      prompt: "Some people believe that individual actions (e.g., recycling, using less water) are the most effective way to tackle climate change. Others believe only government policies can make a real difference. Write a short essay presenting both views and your own conclusion.",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Climate change is one of the defining challenges of our era, and there is ongoing debate about the most effective way to address it. Some argue that individual responsibility is key — if everyone recycled, reduced their meat consumption and used public transport, emissions would fall significantly. These small, collective actions can add up to meaningful change.\n\nOn the other hand, critics point out that individual choices have limited impact compared to large-scale industrial pollution. Only strict government regulations, carbon taxes and investment in renewable energy can bring about the systemic change required.\n\nIn my view, both levels of action are necessary and complementary. Individuals should lead by example, but without strong government policy, personal efforts will never be sufficient. Real progress requires a combination of top-down legislation and bottom-up behavioural change.",
    },
  },
  {
    cefrLevel: "B1", difficulty: 0.5, discrimination: 1.2,
    tags: ["writing", "b1", "informal-letter", "giving-advice", "language-schools", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 100, max: 150 }, productLine: "Language Schools",
      cefrDescriptor: "Can write personal letters giving advice and expressing views.",
      prompt: "A friend has written to you saying they are very nervous about starting university next month. Write a reply giving them advice. Include:\n• Acknowledging their feelings\n• Two pieces of practical advice\n• Encouragement",
      scoringRubric: RUBRIC.B1,
      sampleAnswer: "Hi Marco,\n\nI was so glad you wrote! Starting university is a big step and it is completely normal to feel nervous — I felt exactly the same way last year.\n\nHere are two pieces of advice that really helped me. First, try to get involved in at least one club or society in your first week. It is the best way to meet people with similar interests and it immediately makes the campus feel smaller and friendlier. Second, do not be afraid to ask lecturers or tutors for help if you don't understand something — they really appreciate students who make an effort.\n\nRemember that nearly everyone around you is in the same situation, even if they don't show it. You're going to do brilliantly — I just know it!\n\nWrite soon and let me know how it goes!\n\nAll the best, Anna",
    },
  },

  // ════════════════════════════════════════════
  // B2 — 15 items (difficulty 0.4 to 1.2)
  // ════════════════════════════════════════════
  {
    cefrLevel: "B2", difficulty: 0.4, discrimination: 1.3,
    tags: ["writing", "b2", "essay", "opinion", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 150, max: 220 }, productLine: "Academia",
      cefrDescriptor: "Can write detailed essays giving reasons for a point of view on a topical issue.",
      prompt: "In many countries, university education is becoming increasingly expensive and student debt is rising. Discuss the advantages and disadvantages of free university education and give your own opinion.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "The question of whether university education should be free is one that provokes strong debate in many parts of the world. There are compelling arguments on both sides.\n\nThose in favour of free higher education argue that it promotes social mobility by allowing talented students from lower-income backgrounds to attend university without accumulating crippling debt. Countries such as Germany and Norway have demonstrated that free tertiary education is financially viable and produces highly skilled workforces.\n\nHowever, critics contend that free tuition places an enormous burden on taxpayers and may lead to a reduction in educational quality if institutions are underfunded. Furthermore, graduates who earn higher salaries are arguably best placed to repay their investment in education.\n\nIn my view, a hybrid model is most equitable. Tuition should be heavily subsidised for all students, with means-tested grants for those from lower-income families. This approach supports equal opportunity while ensuring universities have sustainable funding.\n\nUltimately, the goal should be to ensure that financial circumstances never prevent a qualified student from pursuing higher education.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.5, discrimination: 1.3,
    tags: ["writing", "b2", "report", "professional", "corporate", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 180, max: 240 }, productLine: "Corporate",
      cefrDescriptor: "Can write a clear professional report presenting and evaluating options.",
      prompt: "Your company is considering offering employees a four-day working week (without a pay cut) as a pilot scheme. Write a report for the management team covering:\n• Evidence from recent research on the four-day week\n• Potential benefits for the company\n• Potential challenges\n• Your recommendation",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Report: Feasibility of a Four-Day Working Week Pilot\nPrepared for: Senior Management Team\n\n1. Introduction\nThis report evaluates recent research on the four-day working week and assesses its suitability for introduction as a pilot scheme across our organisation.\n\n2. Evidence from Research\nA 2023 UK-wide pilot involving 61 companies found that productivity either improved or remained stable in 85% of organisations. Staff sickness and absenteeism fell by an average of 27%, and employee wellbeing scores increased significantly across all participating firms.\n\n3. Potential Benefits\nAdopting a four-day week could reduce operational costs through lower office energy consumption on Fridays. More significantly, it is likely to improve talent retention and attract higher-quality candidates, as the policy is highly valued by employees.\n\n4. Potential Challenges\nClient-facing teams may struggle to maintain service levels on a reduced schedule. Coordination with external partners in different time zones could also become more complex. Initial implementation will require careful restructuring of workflows.\n\n5. Recommendation\nWe recommend piloting the four-day week with one department for six months, tracking productivity metrics closely before any wider rollout decision.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.6, discrimination: 1.3,
    tags: ["writing", "b2", "letter", "formal-complaint", "language-schools", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 160, max: 220 }, productLine: "Language Schools",
      cefrDescriptor: "Can write formal letters to express complaint, request compensation or propose solutions.",
      prompt: "You attended a language school abroad last summer. You paid for a premium course but several aspects were disappointing. Write a formal letter of complaint to the school director. Mention:\n• Specific problems (at least three)\n• The effect these had on your learning\n• What you expect as a response (compensation, refund, apology)",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Dear Director,\n\nI am writing to express my serious dissatisfaction with the premium English course I attended at your school during July. I paid £1,800 for what was advertised as a small-group intensive programme with maximum 8 students per class, experienced teachers and a full social programme. Unfortunately, the reality fell considerably short of these promises.\n\nFirstly, my class contained 14 students, making individual feedback virtually impossible and slowing the pace of lessons considerably. Secondly, two of my teachers were recent graduates with limited teaching experience, which was evident from the poorly structured lessons. Finally, the promised afternoon excursions were cancelled on three separate occasions due to 'staffing issues', with no explanation or alternative offered.\n\nThese issues significantly undermined my learning experience. I had taken unpaid leave from work to attend this course and expected professional delivery.\n\nI therefore request a partial refund of 30% of the course fee, representing the proportion of services that were not delivered as advertised. Alternatively, I would welcome a complimentary place on a future course.\n\nI expect a response within 14 days.\n\nYours faithfully,\nSophie Laurent",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.65, discrimination: 1.3,
    tags: ["writing", "b2", "article", "magazine", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 170, max: 230 }, productLine: "Language Schools",
      cefrDescriptor: "Can write engaging articles on topics of interest expressing views clearly.",
      prompt: "Write an article for an international student magazine on the topic: 'Technology in the classroom: more harm than good?' Give a balanced view and conclude with your own opinion.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Swipe, tap, learn? Technology in today's classroom\n\nWalk into almost any modern classroom and you will find tablets, interactive whiteboards and online learning platforms. Technology is transforming education at a remarkable pace. But is this transformation entirely positive?\n\nAdvocates of educational technology argue that digital tools make learning more engaging, personalised and accessible. Adaptive software can identify a student's weaknesses and tailor exercises accordingly. Online resources open up learning possibilities for students in remote areas who might otherwise lack access to quality educational materials.\n\nCritics, however, raise legitimate concerns. Research suggests that students who take handwritten notes retain information more effectively than those who type. There is also growing evidence that constant digital distraction — from social media and games — reduces concentration spans in the classroom. Teachers, meanwhile, report spending significant time managing technology rather than teaching.\n\nIn my view, technology is neither inherently good nor bad in education — it is the quality of its implementation that matters. Used judiciously and purposefully, digital tools can genuinely enhance learning. Used without clear pedagogical intent, they become expensive distractions. The key is teacher training and thoughtful curriculum design.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.7, discrimination: 1.3,
    tags: ["writing", "b2", "essay", "problem-solution", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 180, max: 250 }, productLine: "Academia",
      cefrDescriptor: "Can write well-structured essays identifying problems and proposing solutions.",
      prompt: "Urban populations are growing rapidly, leading to problems such as housing shortages, traffic congestion and pollution. Write an essay identifying the key causes of urban overcrowding and proposing realistic solutions.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "As the global urban population is projected to reach 6.7 billion by 2050, the challenges of city overcrowding have become one of the defining policy issues of our time. Understanding the causes of this phenomenon is essential before viable solutions can be proposed.\n\nThe primary driver of urban growth is rural-to-urban migration, fuelled by the perception of greater economic opportunity, better healthcare and superior educational provision in cities. This influx, combined with declining birth rates in rural areas and technological displacement of agricultural workers, creates sustained population pressure in major urban centres.\n\nThe consequences are severe. House prices spiral beyond the reach of ordinary workers, forcing long commutes from peripheral areas. Traffic systems designed for smaller populations become chronically congested, and air quality deteriorates.\n\nAddressing these challenges requires a multi-pronged approach. Governments must invest in improving services and infrastructure in secondary cities and rural regions to reduce the pull of major metropolises. Simultaneously, cities should expand affordable social housing and prioritise sustainable public transport. Mixed-use zoning policies can reduce journey distances and revitalise neglected urban neighbourhoods.\n\nUltimately, making rural and smaller urban areas genuinely attractive places to live and work is the only long-term solution to unsustainable metropolitan growth.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.75, discrimination: 1.3,
    tags: ["writing", "b2", "review", "cultural", "language-schools", SEED_TAG],
    content: {
      taskType: "review", wordRange: { min: 170, max: 230 }, productLine: "Language Schools",
      cefrDescriptor: "Can write evaluative reviews combining description, analysis and personal response.",
      prompt: "Write a review of a book, film or exhibition for a cultural website. Your review should cover:\n• A brief description without spoiling the ending\n• An analysis of what makes it effective (or not)\n• A recommendation and target audience",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "The Power of the Dog — Film Review\n\nJane Campion's 2021 psychological drama The Power of the Dog is, quite simply, one of the most accomplished films of the decade. Set in 1920s Montana, it follows two rancher brothers — the brutal, intellectually complex Phil (Benedict Cumberbatch) and the gentle George (Jesse Plemons) — whose lives are upended when George marries a widowed innkeeper, Rose (Kirsten Dunst), bringing her sensitive teenage son Peter into their world.\n\nThe film works on multiple levels. On the surface, it is a slow-burning Western character study. Beneath, it is a meticulous examination of toxic masculinity, repressed desire and social performance. Campion's direction is assured, allowing tension to build almost imperceptibly through landscape and silence. Cumberbatch's performance is career-defining — his Phil is simultaneously menacing and pitiable.\n\nWhat sets the film apart is its extraordinary restraint. Nothing is overexplained. The final act delivers a revelation that recontextualises everything that preceded it, rewarding attentive viewers.\n\nThis is not a film for everyone — its pace demands patience. However, cinephiles and those who appreciate psychological complexity will find it deeply rewarding. Highly recommended.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.8, discrimination: 1.3,
    tags: ["writing", "b2", "argument", "ethical", "academia", SEED_TAG],
    content: {
      taskType: "argument", wordRange: { min: 190, max: 260 }, productLine: "Academia",
      cefrDescriptor: "Can write a well-reasoned argument on a complex issue acknowledging multiple perspectives.",
      prompt: "Is the use of artificial intelligence in hiring processes (e.g., CV screening, automated interviews) ethical and fair? Write a discursive essay presenting at least two perspectives and reaching a reasoned conclusion.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "The use of artificial intelligence in recruitment has grown rapidly over the past decade. Many large corporations now use algorithms to screen thousands of CVs and evaluate candidates via automated video interviews. Supporters claim this saves time, reduces unconscious human bias, and enables more data-driven decisions. Opponents argue it raises profound ethical concerns that have yet to be adequately addressed.\n\nFrom a pro-AI perspective, algorithms applied consistently to all candidates theoretically eliminate certain forms of human prejudice related to gender, ethnicity or social class. They can process applicant data far more efficiently than human HR teams, enabling companies to consider a wider talent pool.\n\nHowever, critics point out that AI systems are only as unbiased as the data on which they are trained. If historical hiring data reflects systemic inequalities — as it frequently does — then the algorithm will replicate and amplify these biases. Amazon's now-abandoned CV-screening tool famously penalised CVs that included the word 'women's', reflecting its training data from a male-dominated industry. Automated video interview tools have also been criticised for discriminating against candidates with unconventional speech patterns or non-white-majority names.\n\nIn conclusion, while AI has genuine potential to improve aspects of recruitment, its current implementations are insufficiently transparent, explainable, and audited. Any ethical use of AI in hiring must include rigorous independent bias testing, human oversight at each decision stage, and clear candidate notification and redress mechanisms.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.85, discrimination: 1.3,
    tags: ["writing", "b2", "email", "negotiation", "corporate", SEED_TAG],
    content: {
      taskType: "email", wordRange: { min: 170, max: 230 }, productLine: "Corporate",
      cefrDescriptor: "Can write professional emails to negotiate, propose solutions and build relationships.",
      prompt: "A key client has asked for a 20% discount on an upcoming contract renewal. Your manager has approved a maximum 10% discount. Write a professional email to the client:\n• Acknowledging their request\n• Explaining your counter-offer (10% + added value)\n• Proposing a call to discuss further\n• Maintaining a positive relationship",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Dear Mrs Bergmann,\n\nThank you for your message regarding the renewal of your contract with us. We genuinely value your continued partnership and appreciate you raising this matter directly.\n\nI have discussed your request with our management team. While we are unfortunately unable to offer the full 20% reduction, we are pleased to propose a 10% discount on the contract value, which represents a significant saving and reflects our appreciation of your long-standing loyalty.\n\nIn addition, we would like to strengthen this offer by including two additional benefits: priority customer support with a dedicated account manager, and access to our new premium analytics dashboard at no extra cost. Together, these additions represent considerable value beyond the financial discount.\n\nI believe this package reflects the strength of our partnership and our commitment to your continued success. I would welcome the opportunity to discuss this proposal in more detail over a call at your convenience. Please let me know your available times this week and I will arrange accordingly.\n\nOnce again, thank you for your trust in us. We look forward to many more years of working together.\n\nBest regards,\nJames",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.9, discrimination: 1.3,
    tags: ["writing", "b2", "essay", "comparative", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 200, max: 270 }, productLine: "Academia",
      cefrDescriptor: "Can write well-organised comparative essays with clear thesis and development.",
      prompt: "Compare the advantages and disadvantages of learning a language through formal classroom instruction versus self-study using digital tools (apps, online videos, language exchange platforms). Which approach do you consider more effective for adult learners?",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Language acquisition is a complex process, and there is ongoing debate among educators about the most effective approach for adult learners. Both formal classroom instruction and self-directed digital learning offer distinct advantages, and the optimal choice depends partly on the individual learner's goals, discipline and circumstances.\n\nFormal instruction provides structure, systematic progression and immediate expert feedback. A trained teacher can identify fossilised errors that a learner might not notice independently, and classroom interaction with peers builds communicative competence in an authentic social context. Research consistently shows that learners who receive formal instruction develop grammatical accuracy faster than those who learn entirely through exposure.\n\nDigital self-study, by contrast, offers unparalleled flexibility. Learners can work at their own pace, at any hour, and focus on areas most relevant to their specific needs. Platforms such as Duolingo and Babbel use gamification to maintain motivation, while conversation exchange apps provide access to native speakers worldwide — something classroom learners rarely experience during early stages.\n\nHowever, self-study without structured guidance can lead to ingrained errors and an unbalanced skill set — typically strong passive comprehension but weaker productive accuracy.\n\nFor most adult learners, a blended approach is demonstrably most effective: foundational grammar and skill-building within a structured course, supplemented by daily digital practice and regular conversation with native speakers. Neither method in isolation is sufficient; their combination harnesses the strengths of both.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 0.95, discrimination: 1.3,
    tags: ["writing", "b2", "proposal", "corporate", "professional", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 200, max: 270 }, productLine: "Corporate",
      cefrDescriptor: "Can produce detailed structured proposals with a clear purpose and supporting evidence.",
      prompt: "Your company wants to implement a corporate social responsibility (CSR) initiative. Write a proposal to senior management suggesting ONE specific CSR initiative. Include:\n• The proposed initiative and its objective\n• Evidence that it would benefit the company as well as the community\n• Implementation steps\n• How success would be measured",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Proposal: Digital Literacy Programme for Disadvantaged Youth\nSubmitted to: Senior Management Team\n\n1. Proposed Initiative\nI propose the establishment of a 12-week free digital literacy programme for unemployed young people aged 18–25 from disadvantaged backgrounds in our local community. The programme would be delivered at our corporate training centre on Saturday mornings, led by volunteer employees.\n\n2. Business Case\nBeyond the social benefit, this initiative offers significant value to the company. Research demonstrates that companies with active CSR programmes attract higher-quality job applicants and report 20–30% higher staff engagement scores. The initiative would also raise our local brand profile ahead of our planned regional expansion in 2025.\n\n3. Implementation Plan\nIn Phase 1 (months 1–2), we would partner with two local charities to identify and recruit 20 participants per cohort. In Phase 2 (months 3–4), volunteer employee trainers would be selected and trained. The first cohort would run from month 5 to 7, with a formal graduation event.\n\n4. Success Metrics\nWe will track the following KPIs: percentage of participants securing employment or further education within six months; employee volunteer satisfaction scores; and media coverage and LinkedIn engagement metrics.\n\nI am confident this initiative represents an excellent investment in both our community and our company's long-term reputation.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.0, discrimination: 1.3,
    tags: ["writing", "b2", "story", "creative", "language-schools", SEED_TAG],
    content: {
      taskType: "story", wordRange: { min: 200, max: 280 }, productLine: "Language Schools",
      cefrDescriptor: "Can write clear, detailed narratives with well-developed characters and plot.",
      prompt: "Write a short story with the title 'The Last Train'. Your story should include:\n• A clear narrative arc (beginning, development, turning point, resolution)\n• At least two well-described characters\n• A sense of atmosphere and place",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "The platform clock read 11:47 as Maria hurried down the deserted steps, her heels clicking against the cold concrete. The last train to Oxford left at 11:52 and she could not afford to miss it — again.\n\nAs she pushed through the barriers, breathless, she almost collided with an elderly man in a tweed coat who was standing quite still in the middle of the platform, peering at the departure board with evident confusion.\n\n'Excuse me,' Maria said, catching herself. 'Are you all right?'\n\nThe man turned, and she saw the bewilderment in his pale eyes. 'I'm trying to get to Oxford,' he said quietly. 'My daughter is expecting me.'\n\nMaria glanced at the board. The Oxford train was two platforms away — there were less than four minutes left. She took the man's arm without deliberating. 'Come on, then. Quick as you can.'\n\nThey ran, or something close to it, the old man surprisingly nimble. They tumbled through the doors of the train with seconds to spare. As it pulled away, Maria sat breathing hard across from her companion, who was smiling with what she could only describe as relief.\n\n'Thank you, dear,' he said. 'I was quite lost.'\n\n'So was I,' Maria thought — though she didn't say it aloud.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.05, discrimination: 1.3,
    tags: ["writing", "b2", "academic-essay", "social-issues", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 200, max: 280 }, productLine: "Academia",
      cefrDescriptor: "Can write a well-structured academic essay with clear argument and evidence.",
      prompt: "To what extent do you agree with the view that the media is primarily responsible for creating unrealistic body image expectations, particularly among young people? Write a discursive essay.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "The relationship between media portrayal and body image has been a subject of considerable academic research and public debate, particularly in an era of social media saturation. While the media undeniably plays a role in shaping body image perceptions among young people, to hold it solely responsible is an oversimplification of a multifactorial issue.\n\nThere is compelling evidence that media images — from heavily retouched fashion photography to algorithmically curated Instagram feeds — present narrow, unrealistic ideals of physical appearance. A 2021 study published in the Journal of Eating Disorders found a significant correlation between daily social media usage and body dissatisfaction in girls aged 13–17. Social comparison theory helps explain this: when young people repeatedly compare themselves to digitally altered images, their self-perception deteriorates.\n\nHowever, researchers caution against reducing the issue to a single cause. Family attitudes towards weight and appearance, peer group norms, cultural background and individual psychological resilience are all significant factors. Many young people who consume the same media content develop healthy body images, suggesting that media exposure alone is neither necessary nor sufficient to produce negative outcomes.\n\nFurthermore, the media landscape is not monolithic. Body-positive movements, diverse representation campaigns and algorithmic changes on platforms such as Instagram represent meaningful progress.\n\nIn conclusion, while the media bears significant responsibility and must continue to reform its practices, an effective response to body image issues requires a comprehensive approach encompassing education, family support, and mental health provision.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.1, discrimination: 1.3,
    tags: ["writing", "b2", "essay", "globalisation", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 200, max: 270 }, productLine: "Academia",
      cefrDescriptor: "Can write sophisticated discursive essays on abstract topics with clear structure.",
      prompt: "Has globalisation been more beneficial or harmful to developing nations? Write a balanced essay and give your own conclusion.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Globalisation — the increasing interconnectedness of national economies through trade, capital flows, technology transfer and cultural exchange — has generated heated debate about its distributional effects. The question of whether developing nations have been net beneficiaries or net losers is complex and varies enormously by context.\n\nProponents of globalisation point to the remarkable economic growth achieved by countries such as South Korea, Singapore and, more recently, Vietnam and Bangladesh, which leveraged global trade to lift millions out of poverty. Foreign direct investment brought technology, infrastructure and employment. Global supply chains created manufacturing jobs that, while imperfect, offered wages above subsistence level.\n\nCritics counter that globalisation has often exacerbated inequality both between and within nations. The financial liberalisation accompanying globalisation exposed developing economies to volatile capital flows, contributing to crises such as the 1997 Asian financial crash. Multinational corporations have frequently exploited weaker labour and environmental regulations to minimise costs rather than invest in local development. Meanwhile, agricultural subsidies in wealthy nations have undermined farmers in developing countries.\n\nIn my assessment, globalisation's effects are deeply uneven and context-dependent. Where states have maintained strategic development policies — as in East Asia — global integration has accelerated development. Where integration has been driven primarily by external actors without alignment to national development priorities, the outcomes have frequently been detrimental. The lesson is that globalisation is a powerful force that requires active management, not passive acceptance.",
    },
  },
  {
    cefrLevel: "B2", difficulty: 1.2, discrimination: 1.3,
    tags: ["writing", "b2", "cover-letter", "professional", "corporate", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 200, max: 280 }, productLine: "Corporate",
      cefrDescriptor: "Can write a persuasive, well-structured cover letter adapting tone to the professional context.",
      prompt: "Write a cover letter for the following job advertisement:\n\n'Marketing Manager – International Tech Start-up (London). We are looking for a creative, data-driven professional with 3+ years marketing experience. Strong communication skills and a track record of successful campaigns essential. Passion for technology an advantage.'\n\nYour letter should demonstrate relevant experience, enthusiasm and a strong fit with the role.",
      scoringRubric: RUBRIC.B2,
      sampleAnswer: "Dear Hiring Manager,\n\nI am writing to apply for the Marketing Manager position at your company. Having spent four years in digital marketing roles at two fast-growing technology firms, I believe I can make an immediate and meaningful contribution to your team.\n\nIn my current role at CloudSpark, I lead a three-person team responsible for all digital marketing activities. Over the past two years, I have developed and executed a multi-channel campaign strategy that increased qualified lead generation by 43% year-on-year. I work closely with data analytics tools — Google Analytics, HubSpot and Tableau — to evaluate campaign performance and optimise spend in real time. This data-driven approach has reduced our customer acquisition cost by 28% while maintaining conversion quality.\n\nI am genuinely passionate about technology. I follow emerging trends closely and believe that authentic brand storytelling, combined with rigorous data analysis, is what distinguishes successful start-up marketing. The opportunity to bring this approach to an international audience particularly excites me.\n\nI am a collaborative team player, comfortable operating in a fast-paced, ambiguous environment where priorities evolve quickly. I thrive on creative problem-solving and have a consistent record of delivering campaigns on time and within budget.\n\nI would welcome the opportunity to discuss how my skills and experience align with your vision. I am available for interview at any time convenient to you.\n\nThank you for your consideration.\n\nYours sincerely,\nAlex Morgan",
    },
  },

  // ════════════════════════════════════════════
  // C1 — 15 items (difficulty 1.0 to 2.0)
  // ════════════════════════════════════════════
  {
    cefrLevel: "C1", difficulty: 1.0, discrimination: 1.4,
    tags: ["writing", "c1", "essay", "academic", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 250, max: 350 }, productLine: "Academia",
      cefrDescriptor: "Can write clear, well-structured texts on complex subjects, controlling structure, connectors and cohesive devices.",
      prompt: "Critically evaluate the claim that 'a universal basic income (UBI) would solve poverty without creating a dependency culture'. Draw on economic and social arguments. Present a balanced analysis and reach a nuanced conclusion.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The proposal for a Universal Basic Income — an unconditional periodic cash payment made by the government to every citizen — has attracted growing attention from economists, policymakers and technologists, particularly in the context of automation-driven job displacement. Its proponents contend that UBI would eliminate the bureaucratic complexity of means-tested welfare, provide an income floor for all citizens, and liberate individuals to pursue more meaningful work and education. Critics, however, argue that it is prohibitively expensive and would create perverse incentive effects.\n\nThe evidence on labour supply effects is genuinely mixed. Finland's 2017–18 UBI pilot found no significant reduction in employment among recipients, while their wellbeing and trust in institutions improved meaningfully. Similar results emerged from trials in Namibia and Kenya. However, critics rightly note that short-term pilots in distinct socioeconomic contexts cannot definitively model the macro-level effects of a permanent, universal scheme.\n\nThe dependency culture argument, while politically resonant, is empirically weak. Research on unconditional cash transfers across multiple developing and developed contexts consistently shows that recipients — contrary to popular assumption — do not reduce work effort. The most significant behavioural shifts observed are towards better nutrition, investment in children's education, and reduced risky financial behaviour.\n\nThe more substantive challenge is fiscal. Funding a meaningful UBI for an entire adult population without regressive taxation requires either significant wealth redistribution or a substantial expansion of the tax base. Neither is politically straightforward.\n\nIn conclusion, UBI represents a bold and potentially transformative policy, but the dependency culture critique is empirically unfounded. The genuine challenges lie in fiscal architecture and political will, not human behaviour.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.1, discrimination: 1.4,
    tags: ["writing", "c1", "report", "professional", "corporate", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 280, max: 380 }, productLine: "Corporate",
      cefrDescriptor: "Can write formal professional texts with clear, structured argumentation and appropriate register.",
      prompt: "Write a formal business report for your organisation's board of directors on the topic: 'Should our company transition to fully remote working as the default model?' Include: executive summary, analysis of key benefits and risks, stakeholder considerations, and a recommendation.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Report: Strategic Assessment of Full Remote Working Transition\nPrepared for: Board of Directors | Date: January 2025\n\nExecutive Summary\nThis report assesses the strategic viability of transitioning to a fully remote working model as the company's default operating structure. Having analysed operational data, employee survey results and industry benchmarks, we conclude that a structured hybrid model — rather than full remote operation — best serves the company's strategic objectives.\n\nBenefits of Full Remote Working\nA fully remote model would enable significant reductions in real estate and overhead costs, estimated at £2.1m annually. Access to global talent pools would expand considerably, and research suggests remote workers report higher autonomy and job satisfaction. Carbon emissions from commuting would also be substantially reduced.\n\nRisks and Challenges\nHowever, full remote operation presents material risks. Our employee engagement survey reveals that 34% of staff report reduced sense of belonging when working remotely full-time, with disproportionate impact on junior employees and those from underrepresented groups. Collaborative innovation and spontaneous knowledge transfer — critical to our product development cycle — are demonstrably harder to replicate in distributed environments. Cybersecurity risks also increase with full remote operations.\n\nStakeholder Considerations\nClients across our financial services portfolio have expressed a preference for in-person relationship management at key relationship junctures. HR has flagged risks to onboarding quality if junior employees cannot access in-person mentoring.\n\nRecommendation\nThe Board is advised to adopt a structured hybrid model: employees work remotely three days per week, with two anchor days in the office for team collaboration. This preserves the cost and talent benefits of remote working while mitigating the risks identified above. A formal review should be scheduled for Q4 2025.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.2, discrimination: 1.4,
    tags: ["writing", "c1", "essay", "literature-culture", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 280, max: 380 }, productLine: "Academia",
      cefrDescriptor: "Can write clear, well-structured expositions on complex subjects integrating multiple sources.",
      prompt: "Discuss the view that literature serves primarily as a means of social and political critique rather than as pure entertainment or aesthetic pleasure. Support your argument with reference to at least two specific literary works.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The relationship between literature and society has been debated since antiquity, with critics ranging from those who view literary art as transcendent aesthetic experience to those who regard it primarily as a vehicle for social critique. While binary framings of this relationship are reductive, there are compelling grounds to argue that the most enduring works of literature derive their power precisely from their engagement with the social and political conditions of their time.\n\nGeorge Orwell's Nineteen Eighty-Four (1949) is perhaps the most celebrated example of explicitly political fiction in the twentieth-century canon. Orwell's dystopian imagining of totalitarian surveillance, linguistic manipulation through Newspeak, and the mechanisation of thought was rooted in his direct experience of Stalinist propaganda and fascist manipulation. The novel's enduring relevance — its lexical contributions to political discourse, including 'doublethink' and 'Big Brother' — demonstrates that literary critique can shape political vocabulary across generations.\n\nLess overtly polemical but equally grounded in social critique is Kazuo Ishiguro's Never Let Me Go (2005). Through the metaphor of cloned humans raised to provide organs, Ishiguro interrogates questions of complicity, institutional dehumanisation and the ethics of a society that exploits the vulnerable while maintaining cultivated ignorance. The novel functions simultaneously as a literary meditation on memory and loss, and as a precise instrument of ethical critique.\n\nHowever, to subordinate aesthetic pleasure entirely to political utility would be to flatten the complexity of literary experience. Great literature achieves its critical power partly through its formal and aesthetic qualities — its imagery, structure and language. The political and the aesthetic are not antithetical but mutually constitutive.\n\nIn conclusion, while literature cannot be reduced to mere didacticism, the most significant works are invariably those that illuminate the human condition in its social and political dimensions.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.3, discrimination: 1.4,
    tags: ["writing", "c1", "proposal", "academic", "academia", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 280, max: 380 }, productLine: "Academia",
      cefrDescriptor: "Can write formal proposals with sophisticated argumentation and appropriate academic register.",
      prompt: "Write an academic research proposal of approximately 300 words for the following topic: 'The psychological impact of social media algorithms on adolescent political radicalisation'. Include: research background, key research questions, proposed methodology, and expected contribution.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Research Proposal: Algorithmic Mediation and Adolescent Political Radicalisation\n\nBackground\nThe proliferation of algorithmically curated social media feeds has transformed the information environments of adolescents globally. Recommendation algorithms optimise for engagement, systematically amplifying emotionally provocative and ideologically extreme content. While significant scholarship has explored radicalisation in adult populations, the developmental vulnerability of adolescents — characterised by identity formation, heightened peer influence and incomplete prefrontal cortical development — suggests that algorithmic exposure may have disproportionate radicalising effects on this demographic.\n\nResearch Questions\nThis study addresses three primary questions: (1) To what extent does algorithmic content amplification expose adolescents to politically extreme content compared to organic social network exposure? (2) What psychological mechanisms mediate the relationship between algorithmic exposure and attitudinal radicalisation? (3) Are certain adolescent subgroups — differentiated by gender, socioeconomic status or pre-existing political identity — differentially susceptible to algorithmic radicalisation?\n\nMethodology\nThe study will employ a mixed-methods longitudinal design. A prospective cohort of 500 adolescents (aged 14–17) will be recruited from secondary schools across three UK cities. Quantitative analysis will combine passive digital trace data (content exposure metrics) with validated attitudinal instruments measuring political extremism at 0, 6 and 12 months. Qualitative focus groups will explore phenomenological dimensions of adolescents' own awareness of algorithmic influence.\n\nExpected Contribution\nThis research will generate the first longitudinal evidence base on the differential psychological impact of social media algorithms on adolescent political attitudes. Findings will directly inform evidence-based platform regulation policy and educational interventions aimed at developing algorithmic literacy in young people.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.4, discrimination: 1.4,
    tags: ["writing", "c1", "opinion-editorial", "contemporary", "language-schools", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 270, max: 360 }, productLine: "Language Schools",
      cefrDescriptor: "Can write persuasive opinion pieces with rhetorical sophistication.",
      prompt: "Write an opinion editorial for a national newspaper on the following: 'Mandatory national service — whether military or civilian — should be reintroduced for all school leavers.' Present a clear argument, engage with counterarguments, and conclude with a policy recommendation.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The fraying of social cohesion in liberal democracies has provoked renewed interest in mandatory national service as a potential remedy for the fragmentation of collective identity. I write as someone who was initially sceptical of this position, but who has come to believe — cautiously — that a well-designed civilian national service could deliver genuine social benefits.\n\nThe case against is familiar. Conscription constraints on individual liberty are prima facie incompatible with liberal values. Mandatory schemes are expensive to administer and historically associated with militarism. Critics also point out that poorly designed programmes can become bureaucratic box-ticking exercises yielding negligible social value.\n\nThese objections deserve serious engagement. Yet they are not unanswerable. A civilian model — in which young people choose from options including conservation work, healthcare assistance, educational mentoring or community development — need not constrain individual liberty more than compulsory education. Norway's successful civilian conscription system, which offers considerable individual choice within a mandatory framework, demonstrates that the liberty objection can be substantially mitigated.\n\nThe social case is compelling. Growing socioeconomic residential and educational segregation means that young people from different class and ethnic backgrounds rarely encounter one another in meaningful ways after the age of eighteen. A national service scheme would create structured settings for cross-class, cross-cultural interaction at a formative stage of identity development.\n\nMy recommendation is a twelve-month civilian national service programme offering meaningful choices, fair compensation and high-quality supervision. Such a scheme would cost approximately £3bn annually — a modest investment compared with the long-term social costs of deepening inequality and communal fragmentation.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.5, discrimination: 1.4,
    tags: ["writing", "c1", "critique", "academic", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 280, max: 370 }, productLine: "Academia",
      cefrDescriptor: "Can critically analyse a text or argument with precision and nuanced evaluation.",
      prompt: "Critically analyse the following argument:\n\n'Economic growth is the most effective solution to global poverty. History demonstrates that as countries grow wealthier, poverty rates inevitably decline. Policies that prioritise redistribution over growth are therefore counterproductive.'\n\nEvaluate the strengths and weaknesses of this argument, identifying any logical fallacies or oversimplifications.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The argument presented represents a version of 'trickle-down' economics that has been influential in shaping policy discourse since the 1980s. While it is not without empirical foundation, it contains several analytical weaknesses and an oversimplification that significantly undermine its prescriptive conclusions.\n\nThe argument's central empirical claim — that economic growth has historically reduced poverty rates — has substantial support. The extraordinary poverty reduction in East and Southeast Asia since the 1970s is in significant part attributable to export-led growth strategies. The World Bank's data broadly supports the view that per capita income growth is correlated with absolute poverty reduction.\n\nHowever, the argument commits a logical fallacy by conflating correlation with necessity. The claim that poverty 'inevitably' declines as countries grow richer is empirically false. Growth-poverty relationships are heavily mediated by distributional outcomes. Latin America experienced substantial economic growth in the 1990s and 2000s while maintaining extreme levels of inequality, with the majority of growth benefits captured by the highest income quintile. Sub-Saharan Africa presents similar patterns.\n\nThe binary opposition between growth and redistribution is a particularly problematic oversimplification. A substantial body of research — including from the IMF — finds that well-designed redistribution policies, such as progressive taxation, universal healthcare and education investment, actually strengthen the foundations for sustainable long-term growth by expanding human capital and increasing aggregate demand. These are not alternatives but complements.\n\nThe argument also exhibits selection bias in its historical evidence, foregrounding cases that confirm its thesis while neglecting counterexamples. A rigorous evaluation requires engagement with the full range of historical evidence.\n\nIn conclusion, while economic growth is a necessary component of poverty reduction, the deterministic and anti-redistributive conclusions drawn from this observation are analytically unsound.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.6, discrimination: 1.4,
    tags: ["writing", "c1", "creative", "narrative", "language-schools", SEED_TAG],
    content: {
      taskType: "story", wordRange: { min: 280, max: 380 }, productLine: "Language Schools",
      cefrDescriptor: "Can write creative texts with controlled use of narrative voice, structure and literary devices.",
      prompt: "Write a short piece of creative non-fiction (personal essay or memoir) about a moment that changed the way you saw the world. Use techniques such as specific detail, reflection, imagery and temporal shifts. The piece need not describe a dramatic event — small moments can carry great significance.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "My grandmother kept her entire past in a shoebox. Not her entire life, precisely — that was too large, too diffuse to contain. But the past that mattered: a sepia photograph of a woman who might have been her at sixteen, standing in a street I couldn't name; three letters tied with string that she never let me read; a small enamel brooch shaped like a swallow in flight.\n\nI found the box on the afternoon of her funeral, clearing the bedroom that still held the precise mix of lavender and age that I associated entirely with her. I was twenty-two and had never thought of her as having had a life before I arrived in it.\n\nThe photograph undid me. She was laughing — a full, unguarded laugh, directed at someone standing outside the frame. I had known her only as measured, careful, deliberate in her gestures. This girl in the photograph had not yet decided to become careful.\n\nI sat on the edge of the bed for a long time, holding the image. Outside, the world was ordinary: a car passed, a dog barked twice, someone's television murmured through the wall. I was thinking about all the photographs that would never exist — of myself at sixteen, before whatever had made me careful — and about how little we actually know of the people we think we know best.\n\nThe brooch was cold and small in my palm. I kept it. I don't know why, precisely. Perhaps because loss requires a physical correlative, something you can hold in a hand.\n\nI have thought about that afternoon many times since. It marked the moment I understood that intimacy is always partial.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.7, discrimination: 1.5,
    tags: ["writing", "c1", "policy-essay", "technology-society", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 300, max: 400 }, productLine: "Academia",
      cefrDescriptor: "Can write complex, nuanced essays integrating multiple disciplinary perspectives.",
      prompt: "To what extent should democratic governments regulate large technology companies? Consider arguments from the perspectives of economic efficiency, political freedom, national security and democratic accountability.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The regulatory question surrounding large technology companies — commonly referred to as 'Big Tech' — has emerged as one of the defining governance challenges of the twenty-first century. The platforms controlled by companies such as Meta, Alphabet, Apple and Amazon have become critical infrastructure for economic activity, democratic discourse and social interaction, yet they operate with a degree of power and opacity that sits uneasily with democratic principles.\n\nFrom an economic efficiency perspective, the case for significant regulatory intervention is grounded in the theory of natural monopoly and network effects. Once a platform achieves dominant market share, switching costs and data advantages create near-insurmountable entry barriers. The result — as the EU's Digital Markets Act (2022) was designed to address — is the suppression of innovation, rent extraction from both consumers and complementary businesses, and the elimination of nascent competition through acquisition. Antitrust intervention is therefore justified on classical liberal economic grounds.\n\nThe political freedom dimension presents more complex tensions. Free speech advocates caution that government content regulation risks creating state-sponsored censorship, particularly in political and authoritarian contexts. Yet the empirical record of unregulated platform speech has demonstrated that algorithmic amplification of disinformation, coordinated inauthentic behaviour, and hate speech represent serious threats to democratic deliberation. Framing the choice as one between free speech and regulation is a false dichotomy; transparency requirements, algorithmic auditing and liability frameworks can address harms without mandating content removal.\n\nNational security considerations have expanded the regulatory debate to encompass data sovereignty and critical infrastructure protection, as evidenced by US concerns about TikTok's Chinese ownership and the GDPR's restrictions on transatlantic data flows.\n\nIn conclusion, the appropriate degree of regulation depends on a careful, context-specific balancing of these competing values. The objective should not be to diminish innovation but to ensure that the extraordinary power these companies exercise over democratic societies is subject to proportionate democratic accountability.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.8, discrimination: 1.5,
    tags: ["writing", "c1", "synthesis", "research", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 300, max: 400 }, productLine: "Academia",
      cefrDescriptor: "Can synthesise information from multiple sources into a coherent, well-structured text.",
      prompt: "Using the perspectives below, write a synthesis essay on whether bilingualism offers cognitive advantages:\n\nSource A: 'Research by Bialystok et al. (2004) found that bilingual adults demonstrated better performance on executive function tasks, particularly those requiring inhibitory control.'\n\nSource B: 'A 2014 meta-analysis by Paap et al. found no consistent bilingual advantage in executive function across 83 studies, suggesting publication bias may have inflated earlier findings.'\n\nSource C: 'Health records from 648 dementia patients suggest bilingual patients showed symptom onset 4.3 years later on average than monolingual patients (Alladi et al., 2013).'",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The question of whether bilingualism confers measurable cognitive advantages has generated substantial research interest and equally substantial controversy over the past two decades. The evidence base, when examined holistically, reveals a picture of genuine complexity rather than straightforward confirmation of a 'bilingual advantage'.\n\nThe claim of cognitive benefits from bilingualism was popularised by Bialystok and colleagues' influential research (2004), which demonstrated superior inhibitory control in bilingual adults on executive function tasks. The theoretical mechanism proposed is intuitively plausible: managing two competing language systems requires constant selective attention and inhibitory control, which exercises the cognitive circuitry underlying executive function more generally. This 'cognitive reserve' hypothesis has been extended to neuroprotective claims, most notably the finding by Alladi et al. (2013) that bilingual dementia patients showed delayed symptom onset of approximately 4.3 years compared to monolinguals — a finding with significant potential public health implications if robust.\n\nHowever, Paap et al.'s comprehensive 2014 meta-analysis substantially complicates this narrative. Reviewing 83 studies, the authors found no consistent, replicable bilingual advantage in executive function, attributing earlier positive findings to a combination of publication bias, small sample sizes, and methodological inconsistency in defining and operationalising bilingualism. This critique has considerable force: 'bilingualism' encompasses an enormous range of proficiency levels, usage frequencies and language combinations, which earlier studies frequently conflated.\n\nA balanced reading of the evidence suggests that bilingualism may confer context-dependent cognitive benefits, but these are neither universal nor unconditional. Future research requires more rigorous methodology, pre-registration of studies to counter publication bias, and more precise operationalisation of the bilingualism variable.\n\nIn conclusion, the bilingual cognitive advantage hypothesis remains scientifically contested. Current evidence is suggestive but not conclusive, and should be interpreted with appropriate epistemic caution.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 1.9, discrimination: 1.5,
    tags: ["writing", "c1", "formal-letter", "advocacy", "academia", SEED_TAG],
    content: {
      taskType: "letter", wordRange: { min: 300, max: 400 }, productLine: "Academia",
      cefrDescriptor: "Can write formal letters in sophisticated register with precise argumentation.",
      prompt: "Write a formal letter to the Minister of Education of an imaginary country advocating for mandatory critical thinking and media literacy education from age 11. Your letter should include: the rationale for introducing this curriculum, evidence of its effectiveness, potential objections and your responses to them, and a specific policy recommendation.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Dear Minister,\n\nI write on behalf of the National Educators' Forum to advocate for the introduction of mandatory critical thinking and media literacy education across all secondary schools from Year 7. I believe this represents one of the most impactful educational investments your ministry could make, and I write to explain why.\n\nRationale\nWe are producing graduates who are technically literate but analytically underprepared. The information environment they will navigate — characterised by algorithmic curation, synthetic media, coordinated disinformation and commercial manipulation — requires cognitive competencies that traditional curricula do not systematically develop. Research by the Stanford History Education Group (2022) found that 82% of secondary school students could not distinguish a legitimate news article from branded content. This represents a civic emergency.\n\nEvidence of Effectiveness\nCountries that have invested in media literacy curricula demonstrate measurable outcomes. Finland — whose media literacy programme begins at age seven — consistently records among the lowest rates of susceptibility to political disinformation in Europe, according to the Reuters Institute's annual digital news reports. A controlled study in Estonia found that a 12-week critical thinking intervention reduced susceptibility to misinformation by 31% among 14-year-olds.\n\nAddressing Objections\nCritics may argue that the curriculum is already overcrowded. We would counter that critical thinking is not an additional subject but a pedagogical framework applicable across disciplines — in science lessons when evaluating evidence, in history when assessing source reliability, in citizenship education when analysing political claims. The investment required is primarily in teacher training rather than curriculum time.\n\nPolicy Recommendation\nWe recommend a phased five-year implementation: Year 1–2, teacher training programme; Year 3, pilot in 50 schools; Year 4–5, national rollout with annual independent evaluation.\n\nI would welcome the opportunity to discuss this proposal in person at your earliest convenience.\n\nYours faithfully,\nProfessor Hana Kova",
    },
  },
  {
    cefrLevel: "C1", difficulty: 2.0, discrimination: 1.5,
    tags: ["writing", "c1", "argumentative", "philosophy", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 300, max: 400 }, productLine: "Academia",
      cefrDescriptor: "Can write nuanced argumentative essays on abstract philosophical topics.",
      prompt: "Is it ever morally justified to restrict freedom of speech? Write an essay presenting a philosophically rigorous argument, drawing on at least one ethical framework and engaging with the strongest counterargument.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "The question of whether freedom of speech may be legitimately restricted touches on some of the deepest tensions in liberal political philosophy. While free expression is foundational to liberal democratic theory, I shall argue that it is not an absolute right and that certain restrictions can be justified through an appeal to harm principle liberalism, appropriately defined.\n\nThe dominant liberal framework for evaluating speech restrictions derives from John Stuart Mill's harm principle: liberty may only be legitimately constrained to prevent harm to others. On its face, this framework seems to offer strong protection for speech, since words are not actions. However, a century and a half of philosophical and empirical work has complicated this apparent dichotomy. Performative speech acts — incitement, threats, coordinated harassment campaigns — constitute harms that are both real and causally traceable to specific utterances. Mill himself acknowledged that the same opinion 'may justifiably be censured... in whatever way, so as to be seditious.' The harm principle does not, on careful reading, establish an absolute right to any speech in any context.\n\nThe strongest counterargument comes from epistemological liberalism: restricting speech presupposes that authorities can reliably distinguish harmful from non-harmful expression. History provides ample evidence that this capacity has been repeatedly abused — sedition laws targeting political dissidents, blasphemy laws suppressing religious minorities, obscenity laws aimed at marginalised communities. The chill effect of uncertain restrictions on controversial but valuable speech is also a genuine harm.\n\nThis objection is powerful but not decisive. The answer is not to abandon all restriction, but to design narrow, precisely targeted legal categories — incitement to imminent violence, targeted harassment, coordinated disinformation in electoral contexts — subject to rigorous due process and independent judicial oversight.\n\nIn conclusion, freedom of speech is a foundational liberal value that should be subject to restriction only in the most carefully defined circumstances, governed by transparent criteria and subject to meaningful democratic accountability. The existence of justified exceptions does not undermine the principle; it defines its appropriate scope.",
    },
  },
  {
    cefrLevel: "C1", difficulty: 2.0, discrimination: 1.5,
    tags: ["writing", "c1", "sustainability-report", "corporate", "professional", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 300, max: 400 }, productLine: "Corporate",
      cefrDescriptor: "Can write complex professional texts with sophisticated register and precise argumentation.",
      prompt: "You work for a multinational consumer goods company. Write a strategic briefing paper for the CEO on the business case for achieving net-zero carbon emissions by 2035 (10 years ahead of your legal obligation). Address: strategic rationale, stakeholder expectations, financial implications, implementation risks, and your recommendation.",
      scoringRubric: RUBRIC.C1,
      sampleAnswer: "Strategic Briefing: The Case for Accelerated Net-Zero Commitment (2035)\nFor: Chief Executive Officer | Prepared by: Corporate Strategy\n\n1. Strategic Rationale\nVoluntarily committing to net-zero carbon by 2035 — a full decade ahead of our regulatory obligation — would position the company as a sector leader at a moment of rapid transition in consumer preferences, investor expectations and regulatory trajectory. MSCI data indicates that companies demonstrating credible climate commitments have outperformed sector peers by an average of 18% over five-year periods in the past decade. The reputational premium attached to genuine rather than performative sustainability leadership is substantial and growing.\n\n2. Stakeholder Expectations\nMajor institutional investors representing approximately 43% of our current shareholder base are signatories to Net Zero Asset Managers Initiative and have explicitly communicated that portfolio alignment with 1.5°C pathways will influence future capital allocation decisions. Key retail distribution partners — including three of our five largest accounts — have announced supplier sustainability requirements effective from 2028. Consumer research commissioned in Q3 2024 shows that 58% of our core demographic (25–44) actively prefer brands demonstrably committed to climate action.\n\n3. Financial Implications\nTransitioning to net-zero by 2035 requires an estimated £380m capital investment in manufacturing decarbonisation, renewable energy procurement and supply chain engagement. However, avoided carbon pricing costs under projected regulatory scenarios are estimated at £210m by 2035. Renewable energy procurement locks in price certainty against volatile fossil fuel markets. Scenario modelling suggests full payback of the net-zero investment within 11 years.\n\n4. Implementation Risks\nThe primary risks are technical (hydrogen and electrification technologies in heavy manufacturing remain immature), supply chain (obtaining verified scope 3 emissions reductions from suppliers requires significant programme management capacity), and reputational (greenwashing allegations if commitments are not backed by credible, independently verified action plans).\n\n5. Recommendation\nWe recommend announcing a net-zero 2035 commitment at the Q2 investor day, underpinned by a Science Based Targets initiative (SBTi)-verified pathway, a £380m capital allocation approved at the September Board meeting, and a dedicated Net-Zero Programme Office reporting directly to the CEO.",
    },
  },

  // ════════════════════════════════════════════
  // C2 — 5 items (difficulty 2.0 to 2.8)
  // ════════════════════════════════════════════
  {
    cefrLevel: "C2", difficulty: 2.0, discrimination: 1.5,
    tags: ["writing", "c2", "literary-essay", "mastery", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 350, max: 500 }, productLine: "Academia",
      cefrDescriptor: "Can write fluent, spontaneously, in a way that is appropriate for any purpose; complex subject matter expressed with precision.",
      prompt: "Write a critical essay on the following proposition: 'The unreliable narrator is the definitive narrative device of the modernist novel because it enacts, rather than merely represents, the epistemological crisis that defines modernity.' Draw on specific textual analysis from at least two works.",
      scoringRubric: RUBRIC.C2,
      sampleAnswer: "To describe the unreliable narrator as merely a technique is to understate its significance in the modernist canon. It is, as the proposition suggests, an epistemological enactment — a formal solution to the problem that modernity had rendered problematic not just knowledge of the external world, but the very apparatus of knowing. Where the Victorian novel had largely trusted its narrators' perceptions and the reader's capacity to synthesise them, the modernist novel made the instability of that synthesis its defining formal concern.\n\nFord Madox Ford's The Good Soldier (1915) is perhaps the most systematically self-conscious deployment of unreliable narration in the English-language tradition. John Dowell's retrospective account of marital and romantic catastrophe is structured entirely around incomprehension — his own, and by extension, the reader's. 'Is all this digression or is it illumination?' Dowell asks. The question is not rhetorical. Ford constructs a narrator whose very reliability as a social performer — his extreme English reserve, his performative obliviousness — makes him constitutively unreliable as a narrator. The form embodies the epistemological condition it diagnoses: that the social codes through which middle-class Edwardian consciousness structured experience systematically occluded reality.\n\nDostoevsky's Notes from Underground (1864) — technically pre-modernist but foundational to the tradition — presents a different mode of unreliability. The Underground Man's narration is unreliable not through obliviousness but through excess of self-consciousness, a vertiginous awareness that immediately undermines every statement he makes. 'I am a sick man... I am a spiteful man. I am an unattractive man.' The qualifications begin before the confessions are completed. Here, unreliability enacts the Kantian crisis: the impossibility of the self-transparent subject that Enlightenment epistemology required.\n\nWhat unites these examples — and what distinguishes them from the merely eccentric narrator — is that their unreliability is not incidental to the text's meaning but constitutive of it. The form is the argument. By refusing the reader a stable point of epistemic orientation, these texts produce in the act of reading the disorientation they are about. This is the sense in which the unreliable narrator may most precisely be called the modernist form: it is not representation of epistemological crisis but its performance.\n\nThe objection that this characterisation overstates the case can be met by attending to what alternatives the modernist novel generated. Stream of consciousness narration — in Joyce, in Woolf — is less a solution to the epistemological crisis than a different formal response to it: rather than exposing the gap between reported consciousness and reality, it attempts to dissolve the gap by rendering consciousness directly. The unreliable narrator externalises and dramatises this gap; stream of consciousness internalises and naturalises it. Both are formal responses to the same underlying condition.",
    },
  },
  {
    cefrLevel: "C2", difficulty: 2.2, discrimination: 1.5,
    tags: ["writing", "c2", "academic-writing", "nuanced", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 350, max: 480 }, productLine: "Academia",
      cefrDescriptor: "Can write with exceptional control and nuance, handling the most complex subject matter with sophistication.",
      prompt: "Write a nuanced academic essay on: 'The concept of \\\"cultural appropriation\\\" confuses legitimate cultural exchange with exploitation, and its application in contemporary discourse has become counterproductive.' Engage philosophically and empirically with this proposition, acknowledging its partial validity while constructing a measured counterargument.",
      scoringRubric: RUBRIC.C2,
      sampleAnswer: "The debate surrounding cultural appropriation has become a site of ideological entrenchment, with critics of the concept frequently reducing it to a question of cultural isolationism, and its advocates sometimes deploying it with insufficient analytical precision. A philosophically rigorous treatment of the proposition requires both acknowledging what is valid in the critique and identifying what the critique elides.\n\nThe proposition's strongest point concerns the conceptual coherence of 'cultural appropriation' as an analytical category. Culture is not the property of bounded communities in any clear ownership sense. It evolves through contact, synthesis, borrowing and transformation; the history of virtually every aesthetic tradition is a history of cross-cultural influence. To speak of appropriation in terms that imply transgressed property rights is to import a legal metaphor that carries conceptual baggage largely inapplicable to cultural production. The Harlem Renaissance was itself deeply engaged with European modernism; jazz evolved through interaction between African, Caribbean and European traditions; English literature has been profoundly shaped by translation and appropriation from classical, French and colonial traditions. Cultural isolationism — even if philosophically coherent — would impoverish rather than protect cultural production.\n\nNevertheless, the proposition's conclusion — that the concept has become entirely counterproductive — overstates the case. The category that cultural appropriation discourse, at its most analytically careful, attempts to capture is real even if the terminology is imprecise: the differential power dynamics through which dominant cultural actors extract aesthetic and commercial value from marginalised communities while those communities simultaneously face discrimination for practising the same culture. The transformation of Native American ceremonial dress into festival costume, or the commercialisation of Black American musical idioms from which Black artists were systematically excluded under segregation, involves something morally meaningful that the framing of 'legitimate cultural exchange' tends to elide.\n\nThe productive analytical move is to distinguish: cultural exchange, which is genuinely reciprocal and acknowledged; cultural influence, which involves adaptation with awareness of origins; and cultural extraction, which involves commercial exploitation without acknowledgement or reciprocity, typically from less to more powerful cultural actors. It is the last category that moral concern should be focused upon, and against which the concept of appropriation, more carefully deployed, retains genuine critical utility.\n\nThe proposition is therefore right to resist the most expansive applications of appropriation discourse, which can slide into an essentialism about cultural ownership incompatible with how culture actually functions. But it is wrong to conclude that all applications are counterproductive. The concept, disciplined and analytically refined, remains an important tool for identifying genuine exploitation within asymmetric cultural relationships.",
    },
  },
  {
    cefrLevel: "C2", difficulty: 2.4, discrimination: 1.5,
    tags: ["writing", "c2", "creative-prose", "mastery", "language-schools", SEED_TAG],
    content: {
      taskType: "story", wordRange: { min: 350, max: 500 }, productLine: "Language Schools",
      cefrDescriptor: "Can write creative texts of any genre with total command of style, register and language.",
      prompt: "Write a piece of short fiction exploring the theme of 'translation' — this may be understood literally (between languages) or figuratively (between cultures, generations, selves, or states of being). Your piece should demonstrate mastery of craft: controlled prose style, purposeful structure, and precise deployment of literary devices.",
      scoringRubric: RUBRIC.C2,
      sampleAnswer: "The Approximation\n\nMy mother speaks in a language that does not have a word for loneliness. I discovered this at forty-three, reading an article in a linguistics journal someone had left on a train seat, and felt retrospectively the full weight of my childhood.\n\nShe had tried, I understood now. Yalnızlık, she might have said — aloneness, separateness. Sıkıntı — a tightening in the chest, a restlessness without object. Gurbet — the specific grief of living far from where you began. But not loneliness, which assumes the presence of others and their insufficient warmth. There is no single Turkish word for being among people and unreached by them.\n\nShe had come to London in 1974 and constructed an English self around English absences. Some words she refused entirely — grief, rather than üzüntü, was a space she would not enter in a borrowed language. Others she adopted so thoroughly that they acquired, through her usage, new connotations I did not discover until I heard her first-language speakers use them: coffee was kahve, always, but melancholy was something flatter and more specific in Turkish than the English allowed.\n\nI grew up in the gap between her silences and did not know it. I thought her affective register was simply smaller than mine, that she felt less. I understand now that she felt in a different geometry.\n\nThere is a word in Japanese: amae. The comfortable dependence of a child on a parent. There is no English equivalent. There is a word in Portuguese: saudade. A longing for something you may never have had. There is a word in Danish: hygge. A quality of warmth in a room.\n\nAnd there is a state my mother entered when she thought no one was watching — sitting at the kitchen table after we had gone to school, holding a glass of tea she no longer drank — for which there is, in either of our languages, no adequate account.",
    },
  },
  {
    cefrLevel: "C2", difficulty: 2.6, discrimination: 1.5,
    tags: ["writing", "c2", "academic-critique", "philosophy-of-science", "academia", SEED_TAG],
    content: {
      taskType: "essay", wordRange: { min: 380, max: 520 }, productLine: "Academia",
      cefrDescriptor: "Can write with total precision and sophistication on the most complex and abstract subjects.",
      prompt: "Evaluate Karl Popper's claim that falsifiability is the demarcation criterion that distinguishes science from non-science. In your essay, assess: (1) the logical structure and appeal of the criterion; (2) the most serious objections to it (including the Duhem-Quine thesis); (3) whether any alternative or modified demarcation criterion is more satisfactory; and (4) whether demarcation matters practically for science policy and education.",
      scoringRubric: RUBRIC.C2,
      sampleAnswer: "Karl Popper's falsifiability criterion remains the most widely cited answer to the demarcation problem — the question of what distinguishes scientific from non-scientific inquiry — and its intuitive appeal is considerable. Popper's central argument is that a theory is scientific not because it can be confirmed by evidence (any sufficiently creative theory can find confirming instances) but because it makes predictions that could, in principle, be shown to be false. A theory that cannot be falsified tells us nothing empirically meaningful about the world.\n\nThe logical structure of this argument is elegant and its historical motivation clear. Popper was struck by the apparent irrefutability of Marxist historical theory and Freudian psychoanalysis — both capable, in the hands of their practitioners, of explaining any possible outcome, thus explaining nothing. By contrast, Einstein's general relativity made precise, testable predictions — notably the bending of light around gravitational masses — that could have been falsified by observation, and were not. For Popper, this asymmetry captured something real about the difference between empirical science and pseudoscience.\n\nYet the criterion faces serious objections. The Duhem-Quine thesis presents the most technically demanding challenge. When a scientific test appears to falsify a theory, the logically available response is not to reject the theory itself but to revise any of the numerous auxiliary hypotheses that accompanied it in generating the prediction. Astronomers did not abandon Newtonian mechanics when Uranus failed to follow its predicted orbit; they posited an unobserved planet (Neptune) whose gravitational effects would explain the discrepancy — and were vindicated. Any individual experiment, on this account, tests a conjunction of hypotheses, and falsification is always logically distributed across this conjunction. Popper's clean asymmetry between falsifiable science and unfalsifiable non-science dissolves into a messier web of holistic inference.\n\nLakatos attempted to salvage Popper through his concept of 'research programmes', distinguishing a 'hard core' of central theoretical commitments from a 'protective belt' of auxiliary hypotheses that can be revised. A programme is progressive (scientific) if it generates novel predictions that are confirmed; degenerative if it merely accommodates anomalies retrospectively. This modification has considerable descriptive power but reintroduces the confirmation dimension that Popper sought to eliminate, and it requires wisdom about what counts as 'novel' versus 'retrospective'.\n\nPractically, the question of demarcation matters greatly for science policy and education. Courts must decide whether intelligent design warrants inclusion in science curricula (Kitzmiller v. Dover, 2005, essentially applied a falsifiability criterion). Research funding bodies must distinguish evidence-based from speculative investment. These decisions require some operational demarcation criterion. A pluralistic, pragmatic position — treating falsifiability as a useful heuristic rather than a logical boundary condition, alongside criteria of explanatory power, novel prediction and progressive research development — is likely more defensible than any single necessary and sufficient condition.\n\nThe demarcation problem, in short, may not admit of a clean philosophical solution, but it demands our continued engagement. Popper's criterion, properly qualified and supplemented, remains an indispensable starting point for anyone who takes seriously the question of what good empirical inquiry looks like.",
    },
  },
  {
    cefrLevel: "C2", difficulty: 2.8, discrimination: 1.5,
    tags: ["writing", "c2", "policy-analysis", "mastery", "corporate", SEED_TAG],
    content: {
      taskType: "report", wordRange: { min: 400, max: 550 }, productLine: "Corporate",
      cefrDescriptor: "Can write with complete mastery; total command of register, argument and expression.",
      prompt: "You are a senior policy advisor to the Secretary-General of an international organisation. Write a confidential analytical memorandum on the following: 'The proliferation of large language model AI threatens to undermine the epistemic foundations of democratic deliberation. Assess this proposition and recommend a coordinated international regulatory response.' The memorandum should exhibit: analytical rigour, awareness of competing interests, feasibility constraints, and diplomatic sensitivity.",
      scoringRubric: RUBRIC.C2,
      sampleAnswer: "CONFIDENTIAL MEMORANDUM\nTo: Secretary-General\nFrom: Office of Strategic Policy Analysis\nRe: Epistemic Risks of Large Language Model Proliferation — Assessment and Regulatory Recommendation\n\nExecutive Assessment\nThe proposition that large language model (LLM) proliferation threatens the epistemic foundations of democratic deliberation merits serious engagement. The assessment below concludes that while the concern is analytically well-founded, the appropriate regulatory response must navigate significant legal, geopolitical and empirical uncertainties. A targeted, graduated approach is recommended over comprehensive regulation.\n\nAnalytical Assessment of the Epistemic Threat\nDemocratic deliberation depends on shared epistemic infrastructure: a broadly shared informational reality, capacities for distinguishing reliable from unreliable information, and trust in the institutions through which contested claims are adjudicated. LLMs present threats along each of these dimensions.\n\nFirst, the synthetic generation of persuasive text at unprecedented scale and low cost has fundamentally altered the asymmetries that previously constrained disinformation operations. The marginal cost of producing thousands of contextually calibrated, locally targeted, linguistically fluent disinformation narratives is now effectively zero for well-resourced state and non-state actors. Electoral processes in fragile democracies — already vulnerable to foreign influence operations — face a qualitatively new level of threat.\n\nSecond, the deployment of conversational AI systems as primary information intermediaries for growing segments of the population raises concerns about epistemic homogenisation, filter-bubble entrenchment, and the erosion of direct engagement with primary sources. Research on the political economy of attention suggests that AI-mediated information architectures may systematically distort political epistemology in ways that current regulatory frameworks are ill-equipped to address.\n\nThird, and most structurally significant, LLM capabilities create conditions in which the costs of producing compelling but fictitious text approach zero while the costs of verification remain high and humanly intensive. This asymmetry — if unaddressed — risks systematically degrading the shared epistemic conditions for meaningful democratic discourse.\n\nLimitations of the Proposition\nIt should be acknowledged that the proposition's alarmist formulation risks overstating the novelty of the challenge. Democratic deliberation has survived previous information revolutions — the printing press, radio, television, the internet — each of which generated similar concerns. LLMs represent a quantitative acceleration of existing disinformation capabilities rather than a qualitative rupture, and the proposition's epistemic framing may obscure the degree to which the underlying vulnerabilities are political and institutional rather than technological.\n\nRegulatory Recommendation\nA coordinated international response is warranted but must be calibrated to avoid both regulatory capture by incumbent technology interests and collateral damage to legitimate AI applications in healthcare, education and scientific research.\n\nThis office recommends a three-tiered framework for member state adoption: (1) mandatory disclosure requirements for AI-generated content in political communications and electoral contexts, enforced at platform level with independent technical audit; (2) a multilateral AI Safety Institute modelled on IAEA mechanisms, with advisory mandate over high-capability foundation models above defined parameter thresholds; (3) investment in publicly funded media literacy programmes and AI detection infrastructure, prioritising deployment in democratic fragility contexts.\n\nConsulting with member states on this framework should proceed through existing multilateral mechanisms, given the sensitivity around national sovereignty dimensions of AI governance. The Secretary-General will wish to be aware that the United States, China and EU member states currently hold divergent positions on AI governance architecture, and any international initiative will require careful diplomatic positioning relative to these competing frameworks.",
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set. Add it to .env");
    process.exit(1);
  }

  if (process.env.DRY_RUN === "1") {
    console.log(`DRY_RUN: would insert ${items.length} items`);
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
  const { valid, invalid } = validateItemBatch(items);
  reportValidationResults(valid.length, invalid.length, invalid);
  if (invalid.length > 0) {
    console.error(`Cannot proceed: ${invalid.length} items failed validation`);
    process.exit(1);
  }
  for (const item of valid) {
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
