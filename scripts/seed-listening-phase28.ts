/**
 * LISTENING — Phase 28: Gap-fill (+17 items)
 * 6 modules: A(B1x4) + B(B1x3) + C(B1x3) + D(A2x3) + E(A2x2) + F(A1x2) = 17
 * SEED_TAG: "seed-listening-phase28"
 * Distribution: B1=10, A2=5, A1=2
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SEED_TAG = "seed-listening-phase28";
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE   = process.env.FORCE   === "1";

// MODULE A: Community Volunteer Orientation — B1 (x4)
const MOD_A_ID    = "langschool-volunteer-orientation-b1";
const MOD_A_TITLE = "Community Volunteer Orientation";
const MOD_A_SCRIPT = `[Food bank orientation — Grace (coordinator, female adult), Sam (male adult), Priya (female adult)]

Grace: Welcome, both of you. I'm Grace, the volunteer coordinator. Today I'll explain how the food bank works and what your roles will be.
Sam: Thanks, Grace. I'm really looking forward to getting started.
Priya: Me too.
Grace: Great. So we're open three mornings a week — Tuesday, Thursday and Saturday. Volunteers arrive at eight-thirty and we close at midday.
Sam: And what will we actually be doing?
Grace: Mainly sorting donated food into categories — tins, dry goods, fresh produce — and packing boxes for families.
Priya: Is there any training?
Grace: Yes. You'll spend the first session with an experienced volunteer who will show you the system. It's quite straightforward.
Sam: What about the families who come to collect? Do we interact with them?
Grace: Yes, at the front desk. The most important thing is to be welcoming and non-judgmental. Some people find it difficult to ask for help.
Priya: Of course. Do we need to bring anything?
Grace: Just comfortable clothes and closed-toe shoes. We'll provide aprons and gloves.`;

const MOD_A_ITEMS = [
  {
    skill:'LISTENING', cefrLevel:'B1', difficulty:-0.4, discrimination:1.1, guessing:0.25,
    tags:['listening','langschool','b1','detail',MOD_A_ID,SEED_TAG],
    content:{
      moduleId:MOD_A_ID, productLine:'Language Schools', moduleTitle:MOD_A_TITLE,
      cefrBand:'B1', numberOfSpeakers:3, speakers:['Grace (coordinator, female adult)','Sam (male adult)','Priya (female adult)'],
      passage:MOD_A_SCRIPT, subskill:'detail', questionNumber:1,
      prompt:'On which days is the food bank open?',
      options:[
        {text:'Monday, Wednesday, Friday',   isCorrect:false, rationale:'These days are not mentioned.'},
        {text:'Tuesday, Thursday, Saturday', isCorrect:true,  rationale:'Grace says the food bank is open Tuesday, Thursday and Saturday.'},
        {text:'Monday, Thursday, Saturday',  isCorrect:false, rationale:'Monday is not mentioned; it is Tuesday.'},
        {text:'Tuesday, Wednesday, Friday',  isCorrect:false, rationale:'Wednesday and Friday are not mentioned.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'B1', difficulty:-0.3, discrimination:1.1, guessing:0.25,
    tags:['listening','langschool','b1','detail',MOD_A_ID,SEED_TAG],
    content:{
      moduleId:MOD_A_ID, productLine:'Language Schools', moduleTitle:MOD_A_TITLE,
      cefrBand:'B1', numberOfSpeakers:3, speakers:['Grace (coordinator, female adult)','Sam (male adult)','Priya (female adult)'],
      passage:MOD_A_SCRIPT, subskill:'detail', questionNumber:2,
      prompt:'What time do volunteers arrive at the food bank?',
      options:[
        {text:"Eight o'clock",  isCorrect:false, rationale:'The time is eight-thirty, not eight.'},
        {text:'Eight-thirty',   isCorrect:true,  rationale:'Grace says volunteers arrive at eight-thirty.'},
        {text:"Nine o'clock",   isCorrect:false, rationale:"Nine o'clock is not mentioned."},
        {text:'Nine-thirty',    isCorrect:false, rationale:'Nine-thirty is not mentioned.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'B1', difficulty:-0.2, discrimination:1.1, guessing:0.25,
    tags:['listening','langschool','b1','detail',MOD_A_ID,SEED_TAG],
    content:{
      moduleId:MOD_A_ID, productLine:'Language Schools', moduleTitle:MOD_A_TITLE,
      cefrBand:'B1', numberOfSpeakers:3, speakers:['Grace (coordinator, female adult)','Sam (male adult)','Priya (female adult)'],
      passage:MOD_A_SCRIPT, subskill:'detail', questionNumber:3,
      prompt:'What does Grace say is the most important thing when interacting with families at the front desk?',
      options:[
        {text:'Being efficient and fast',              isCorrect:false, rationale:'Speed is not mentioned.'},
        {text:'Checking their information carefully',  isCorrect:false, rationale:'Checking information is not stated.'},
        {text:'Being welcoming and non-judgmental',    isCorrect:true,  rationale:'Grace says the most important thing is to be welcoming and non-judgmental.'},
        {text:'Speaking quietly and calmly',           isCorrect:false, rationale:'Speaking quietly is not stated.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'B1', difficulty:-0.1, discrimination:1.1, guessing:0.25,
    tags:['listening','langschool','b1','detail',MOD_A_ID,SEED_TAG],
    content:{
      moduleId:MOD_A_ID, productLine:'Language Schools', moduleTitle:MOD_A_TITLE,
      cefrBand:'B1', numberOfSpeakers:3, speakers:['Grace (coordinator, female adult)','Sam (male adult)','Priya (female adult)'],
      passage:MOD_A_SCRIPT, subskill:'detail', questionNumber:4,
      prompt:'What equipment does the food bank provide for volunteers?',
      options:[
        {text:'Uniforms and name badges', isCorrect:false, rationale:'Uniforms are not mentioned.'},
        {text:'Aprons and gloves',        isCorrect:true,  rationale:'Grace says the food bank will provide aprons and gloves.'},
        {text:'Shoes and overalls',       isCorrect:false, rationale:'Volunteers must bring their own shoes.'},
        {text:'Bags and trolleys',        isCorrect:false, rationale:'Bags and trolleys are not mentioned.'},
      ],
    },
  },
];

// MODULE B: Looking for a Flatmate — B1 (x3)
const MOD_B_ID    = "langschool-flatmate-search-b1";
const MOD_B_TITLE = "Looking for a Flatmate";
const MOD_B_SCRIPT = `[Shared flat — Yuki (female adult) and Daniel (male adult)]

Yuki: So we need to find someone by the end of the month.
Daniel: I know. Let us think about what kind of person we are looking for.
Yuki: Obviously someone who pays rent on time. That is non-negotiable.
Daniel: Agreed. I would also prefer someone who works or studies — so they are out during the day. It is nice to have the place to yourself sometimes.
Yuki: Good point. What about pets?
Daniel: I would rather not have pets. My sister is allergic and she visits sometimes.
Yuki: OK, no pets. What about smoking?
Daniel: Absolutely not inside.
Yuki: What if they smoke outside?
Daniel: I suppose that is OK. I just do not want the smell in the flat.
Yuki: Fair enough. I was thinking we should advertise in the university housing group online.
Daniel: Good idea. We should put a photo of the room and mention it has its own bathroom. That is a big selling point.
Yuki: Definitely. Shall we do it this evening?
Daniel: Yes, let us.`;

const MOD_B_ITEMS = [
  {
    skill:'LISTENING', cefrLevel:'B1', difficulty:-0.1, discrimination:1.2, guessing:0.25,
    tags:['listening','langschool','b1','detail',MOD_B_ID,SEED_TAG],
    content:{
      moduleId:MOD_B_ID, productLine:'Language Schools', moduleTitle:MOD_B_TITLE,
      cefrBand:'B1', numberOfSpeakers:2, speakers:['Yuki (female adult)','Daniel (male adult)'],
      passage:MOD_B_SCRIPT, subskill:'detail', questionNumber:1,
      prompt:'Why does Daniel prefer a flatmate who works or studies?',
      options:[
        {text:'Because they will earn more money',                 isCorrect:false, rationale:'Earnings are not mentioned.'},
        {text:'So he can have the flat to himself during the day', isCorrect:true,  rationale:'Daniel says he likes having the place to himself during the day.'},
        {text:'Because they will be quieter at night',             isCorrect:false, rationale:'Night noise is not the reason given.'},
        {text:'So they can share household tasks',                 isCorrect:false, rationale:'Sharing tasks is not mentioned.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'B1', difficulty:0.0, discrimination:1.2, guessing:0.25,
    tags:['listening','langschool','b1','detail',MOD_B_ID,SEED_TAG],
    content:{
      moduleId:MOD_B_ID, productLine:'Language Schools', moduleTitle:MOD_B_TITLE,
      cefrBand:'B1', numberOfSpeakers:2, speakers:['Yuki (female adult)','Daniel (male adult)'],
      passage:MOD_B_SCRIPT, subskill:'detail', questionNumber:2,
      prompt:'Why does Daniel not want pets in the flat?',
      options:[
        {text:'He is afraid of animals',                        isCorrect:false, rationale:'Fear of animals is not mentioned.'},
        {text:'His sister is allergic and visits sometimes',    isCorrect:true,  rationale:'Daniel says his sister is allergic and visits sometimes.'},
        {text:'The landlord does not allow pets',               isCorrect:false, rationale:'The landlord is not mentioned.'},
        {text:'He thinks pets are too much work',               isCorrect:false, rationale:'Effort of keeping pets is not his stated reason.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'B1', difficulty:0.1, discrimination:1.2, guessing:0.25,
    tags:['listening','langschool','b1','inference',MOD_B_ID,SEED_TAG],
    content:{
      moduleId:MOD_B_ID, productLine:'Language Schools', moduleTitle:MOD_B_TITLE,
      cefrBand:'B1', numberOfSpeakers:2, speakers:['Yuki (female adult)','Daniel (male adult)'],
      passage:MOD_B_SCRIPT, subskill:'inference', questionNumber:3,
      prompt:'What feature of the room do they plan to highlight in the advertisement?',
      options:[
        {text:'It has a balcony',           isCorrect:false, rationale:'A balcony is not mentioned.'},
        {text:'It is the largest room',     isCorrect:false, rationale:'Room size is not discussed.'},
        {text:'It has its own bathroom',    isCorrect:true,  rationale:'Daniel says mentioning the private bathroom is a big selling point.'},
        {text:'It has a garden view',       isCorrect:false, rationale:'A garden view is not mentioned.'},
      ],
    },
  },
];

// MODULE C: University Course Advice — B1 (x3)
const MOD_C_ID    = "langschool-university-course-advice-b1";
const MOD_C_TITLE = "University Course Advice";
const MOD_C_SCRIPT = `[University office — Ms Regan (academic adviser, female adult), Tom (second-year student, male adult)]

Ms Regan: Come in, Tom. Have a seat. What can I help you with today?
Tom: Hi Ms Regan. I am trying to decide which optional modules to take next year and I am a bit confused.
Ms Regan: Let us have a look. You are in your second year of Business Management, correct?
Tom: Yes. I need to choose three optional modules from the list.
Ms Regan: I see you are interested in Marketing. That is a popular choice. Have you thought about Digital Marketing or Consumer Psychology?
Tom: I was leaning towards Consumer Psychology because it links to my dissertation idea.
Ms Regan: That is smart thinking. What is your dissertation on?
Tom: I want to look at how social media influencers affect young people buying decisions.
Ms Regan: Excellent. Then Consumer Psychology is the right choice. I would also recommend Research Methods — it will help with your dissertation methodology.
Tom: What is the third module?
Ms Regan: Look at Business Ethics. It is assessed by coursework only, no exam, which some students prefer.
Tom: That sounds good, actually. I am better at coursework than exams.
Ms Regan: Then that is your three. Shall I approve the selections now?
Tom: Yes please.`;

const MOD_C_ITEMS = [
  {
    skill:'LISTENING', cefrLevel:'B1', difficulty:0.0, discrimination:1.2, guessing:0.25,
    tags:['listening','langschool','b1','detail',MOD_C_ID,SEED_TAG],
    content:{
      moduleId:MOD_C_ID, productLine:'Language Schools', moduleTitle:MOD_C_TITLE,
      cefrBand:'B1', numberOfSpeakers:2, speakers:['Ms Regan (adviser, female adult)','Tom (student, male adult)'],
      passage:MOD_C_SCRIPT, subskill:'detail', questionNumber:1,
      prompt:'Why does Tom prefer Consumer Psychology over Digital Marketing?',
      options:[
        {text:'It has no exam',                     isCorrect:false, rationale:'Tom does not mention exams at this point.'},
        {text:'It links to his dissertation idea',  isCorrect:true,  rationale:'Tom says he prefers Consumer Psychology because it links to his dissertation idea.'},
        {text:'His friends recommended it',         isCorrect:false, rationale:'Friends are not mentioned.'},
        {text:'Ms Regan told him to take it',       isCorrect:false, rationale:'Tom expresses his preference before Ms Regan responds.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'B1', difficulty:0.05, discrimination:1.2, guessing:0.25,
    tags:['listening','langschool','b1','detail',MOD_C_ID,SEED_TAG],
    content:{
      moduleId:MOD_C_ID, productLine:'Language Schools', moduleTitle:MOD_C_TITLE,
      cefrBand:'B1', numberOfSpeakers:2, speakers:['Ms Regan (adviser, female adult)','Tom (student, male adult)'],
      passage:MOD_C_SCRIPT, subskill:'detail', questionNumber:2,
      prompt:"What is Tom's dissertation topic?",
      options:[
        {text:'Social media advertising regulations',                                    isCorrect:false, rationale:'Regulations are not his focus.'},
        {text:'How social media influencers affect young people buying decisions',        isCorrect:true,  rationale:'Tom states this directly.'},
        {text:'The growth of e-commerce in developing countries',                        isCorrect:false, rationale:'Developing countries are not mentioned.'},
        {text:'Consumer trust in online reviews',                                        isCorrect:false, rationale:'Online reviews are not his stated topic.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'B1', difficulty:0.1, discrimination:1.2, guessing:0.25,
    tags:['listening','langschool','b1','inference',MOD_C_ID,SEED_TAG],
    content:{
      moduleId:MOD_C_ID, productLine:'Language Schools', moduleTitle:MOD_C_TITLE,
      cefrBand:'B1', numberOfSpeakers:2, speakers:['Ms Regan (adviser, female adult)','Tom (student, male adult)'],
      passage:MOD_C_SCRIPT, subskill:'inference', questionNumber:3,
      prompt:'Why does Tom decide to take Business Ethics as his third module?',
      options:[
        {text:'It is assessed by coursework only with no exam',  isCorrect:true,  rationale:'Ms Regan notes it has no exam and Tom says he is better at coursework.'},
        {text:'It is a compulsory module for his degree',        isCorrect:false, rationale:'It is an optional module.'},
        {text:'It is taught by his favourite lecturer',         isCorrect:false, rationale:'The lecturer is not mentioned.'},
        {text:'It has the fewest contact hours',                isCorrect:false, rationale:'Contact hours are not discussed.'},
      ],
    },
  },
];

// MODULE D: Pharmacy Phone Enquiry — A2 (x3)
const MOD_D_ID    = "diagnostic-pharmacy-enquiry-a2";
const MOD_D_TITLE = "Pharmacy Phone Enquiry";
const MOD_D_SCRIPT = `[Phone call — Pharmacist (female adult), James Clark (male adult customer)]

Pharmacist: Good afternoon, Greenway Pharmacy. How can I help?
James: Hello. I would like to check if my prescription is ready to collect. My name is James Clark.
Pharmacist: One moment please. Yes, Mr Clark, your prescription is ready.
James: Great. What time do you close today?
Pharmacist: We close at six o clock this evening.
James: And are you open on Sundays?
Pharmacist: Yes, we are open on Sundays from ten until four.
James: Perfect. Can I also get a blood pressure check today?
Pharmacist: Of course. We offer that as a free service. Just come to the counter and ask.
James: Wonderful. Thank you very much.
Pharmacist: You are welcome. See you soon.`;

const MOD_D_ITEMS = [
  {
    skill:'LISTENING', cefrLevel:'A2', difficulty:-1.3, discrimination:1.1, guessing:0.25,
    tags:['listening','diagnostic','a2','detail',MOD_D_ID,SEED_TAG],
    content:{
      moduleId:MOD_D_ID, productLine:'Diagnostic', moduleTitle:MOD_D_TITLE,
      cefrBand:'A2', numberOfSpeakers:2, speakers:['Pharmacist (female adult)','James Clark (male adult)'],
      passage:MOD_D_SCRIPT, subskill:'detail', questionNumber:1,
      prompt:'Why does James call the pharmacy?',
      options:[
        {text:'To order a new medicine',                isCorrect:false, rationale:'James is checking an existing prescription, not ordering a new one.'},
        {text:'To check if his prescription is ready',  isCorrect:true,  rationale:'James says he would like to check if his prescription is ready to collect.'},
        {text:"To book a doctor's appointment",         isCorrect:false, rationale:'Booking a doctor is not mentioned.'},
        {text:'To ask about the price of medicine',     isCorrect:false, rationale:'Price is not his reason for calling.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'A2', difficulty:-1.2, discrimination:1.1, guessing:0.25,
    tags:['listening','diagnostic','a2','detail',MOD_D_ID,SEED_TAG],
    content:{
      moduleId:MOD_D_ID, productLine:'Diagnostic', moduleTitle:MOD_D_TITLE,
      cefrBand:'A2', numberOfSpeakers:2, speakers:['Pharmacist (female adult)','James Clark (male adult)'],
      passage:MOD_D_SCRIPT, subskill:'detail', questionNumber:2,
      prompt:'What time does the pharmacy close on Sundays?',
      options:[
        {text:"Four o'clock",   isCorrect:true,  rationale:'The pharmacist says the pharmacy is open on Sundays from ten until four.'},
        {text:"Five o'clock",   isCorrect:false, rationale:'Five is not mentioned.'},
        {text:"Six o'clock",    isCorrect:false, rationale:"Six o'clock is the weekday closing time, not Sunday."},
        {text:"Three o'clock",  isCorrect:false, rationale:'Three is not mentioned.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'A2', difficulty:-1.1, discrimination:1.1, guessing:0.25,
    tags:['listening','diagnostic','a2','detail',MOD_D_ID,SEED_TAG],
    content:{
      moduleId:MOD_D_ID, productLine:'Diagnostic', moduleTitle:MOD_D_TITLE,
      cefrBand:'A2', numberOfSpeakers:2, speakers:['Pharmacist (female adult)','James Clark (male adult)'],
      passage:MOD_D_SCRIPT, subskill:'detail', questionNumber:3,
      prompt:'How much does a blood pressure check cost at this pharmacy?',
      options:[
        {text:'It is free',   isCorrect:true,  rationale:'The pharmacist says they offer it as a free service.'},
        {text:'Five pounds',  isCorrect:false, rationale:'Five pounds is not mentioned.'},
        {text:'Three pounds', isCorrect:false, rationale:'Three pounds is not mentioned.'},
        {text:'Ten pounds',   isCorrect:false, rationale:'Ten pounds is not mentioned.'},
      ],
    },
  },
];

// MODULE E: Joining the Library — A2 (x2)
const MOD_E_ID    = "diagnostic-library-card-a2";
const MOD_E_TITLE = "Joining the Library";
const MOD_E_SCRIPT = `[Public library counter — Librarian (female adult), Sofia (female adult, new member)]

Librarian: Hello. How can I help you today?
Sofia: Hello. I would like to join the library and get a library card.
Librarian: Of course. Do you live or work in this area?
Sofia: Yes, I live in Parkside Road.
Librarian: Perfect. I just need some ID and proof of address.
Sofia: I have my passport and a recent bank statement. Is that OK?
Librarian: That is fine. Your card will be ready in a few minutes. You can borrow up to eight books at a time for three weeks.
Sofia: And what about DVDs?
Librarian: DVDs can be borrowed for one week, maximum two at a time.
Sofia: Is there a charge for borrowing?
Librarian: Books are free. DVDs cost one pound each per loan.
Sofia: That is very reasonable. Thank you.`;

const MOD_E_ITEMS = [
  {
    skill:'LISTENING', cefrLevel:'A2', difficulty:-1.4, discrimination:1.0, guessing:0.25,
    tags:['listening','diagnostic','a2','detail',MOD_E_ID,SEED_TAG],
    content:{
      moduleId:MOD_E_ID, productLine:'Diagnostic', moduleTitle:MOD_E_TITLE,
      cefrBand:'A2', numberOfSpeakers:2, speakers:['Librarian (female adult)','Sofia (female adult)'],
      passage:MOD_E_SCRIPT, subskill:'detail', questionNumber:1,
      prompt:'How many books can Sofia borrow at one time?',
      options:[
        {text:'Four',   isCorrect:false, rationale:'Four is not the stated number.'},
        {text:'Six',    isCorrect:false, rationale:'Six is not the stated number.'},
        {text:'Eight',  isCorrect:true,  rationale:'The librarian says Sofia can borrow up to eight books at a time.'},
        {text:'Ten',    isCorrect:false, rationale:'Ten is not the stated number.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'A2', difficulty:-1.3, discrimination:1.0, guessing:0.25,
    tags:['listening','diagnostic','a2','detail',MOD_E_ID,SEED_TAG],
    content:{
      moduleId:MOD_E_ID, productLine:'Diagnostic', moduleTitle:MOD_E_TITLE,
      cefrBand:'A2', numberOfSpeakers:2, speakers:['Librarian (female adult)','Sofia (female adult)'],
      passage:MOD_E_SCRIPT, subskill:'detail', questionNumber:2,
      prompt:'How much does it cost to borrow a DVD?',
      options:[
        {text:'It is free',   isCorrect:false, rationale:'Books are free; DVDs cost one pound.'},
        {text:'Fifty pence',  isCorrect:false, rationale:'Fifty pence is not mentioned.'},
        {text:'One pound',    isCorrect:true,  rationale:'The librarian says DVDs cost one pound each per loan.'},
        {text:'Two pounds',   isCorrect:false, rationale:'Two pounds is not mentioned.'},
      ],
    },
  },
];

// MODULE F: After-School Clubs — A1 (x2)
const MOD_F_ID    = "primary-after-school-clubs-a1";
const MOD_F_TITLE = "After-School Clubs";
const MOD_F_SCRIPT = `[Primary classroom — Mrs Day (teacher, female adult), Class (children)]

Mrs Day: OK, everyone. Listen carefully. We have three after-school clubs this term. On Monday we have Art Club. You can paint and draw pictures. On Wednesday we have Football Club. We play in the big field. On Friday we have Cooking Club. We make simple food together. The clubs start at three thirty and finish at four thirty. You need a letter from your parents to join.
Boy: What do we do in Cooking Club?
Mrs Day: We make things like sandwiches and fruit salad. It is fun!
Girl: I want to do Art Club!
Mrs Day: Wonderful. Remember — ask your parents tonight.`;

const MOD_F_ITEMS = [
  {
    skill:'LISTENING', cefrLevel:'A1', difficulty:-2.2, discrimination:1.0, guessing:0.25,
    tags:['listening','primary','a1','detail',MOD_F_ID,SEED_TAG],
    content:{
      moduleId:MOD_F_ID, productLine:'Primary', moduleTitle:MOD_F_TITLE,
      cefrBand:'A1', numberOfSpeakers:1, speakers:['Mrs Day (teacher, female adult)'],
      passage:MOD_F_SCRIPT, subskill:'detail', questionNumber:1,
      prompt:'When is Football Club?',
      options:[
        {text:'Monday',    isCorrect:false, rationale:'Monday is Art Club.'},
        {text:'Wednesday', isCorrect:true,  rationale:'Mrs Day says Football Club is on Wednesday.'},
        {text:'Friday',    isCorrect:false, rationale:'Friday is Cooking Club.'},
        {text:'Thursday',  isCorrect:false, rationale:'Thursday is not mentioned.'},
      ],
    },
  },
  {
    skill:'LISTENING', cefrLevel:'A1', difficulty:-2.0, discrimination:1.0, guessing:0.25,
    tags:['listening','primary','a1','detail',MOD_F_ID,SEED_TAG],
    content:{
      moduleId:MOD_F_ID, productLine:'Primary', moduleTitle:MOD_F_TITLE,
      cefrBand:'A1', numberOfSpeakers:1, speakers:['Mrs Day (teacher, female adult)'],
      passage:MOD_F_SCRIPT, subskill:'detail', questionNumber:2,
      prompt:'What time do the after-school clubs finish?',
      options:[
        {text:'Three thirty',  isCorrect:false, rationale:'Three thirty is when they start, not finish.'},
        {text:"Four o'clock",  isCorrect:false, rationale:"Four o'clock is not mentioned."},
        {text:'Four thirty',   isCorrect:true,  rationale:'Mrs Day says the clubs finish at four thirty.'},
        {text:"Five o'clock",  isCorrect:false, rationale:"Five o'clock is not mentioned."},
      ],
    },
  },
];

const ALL_ITEMS = [
  ...MOD_A_ITEMS,
  ...MOD_B_ITEMS,
  ...MOD_C_ITEMS,
  ...MOD_D_ITEMS,
  ...MOD_E_ITEMS,
  ...MOD_F_ITEMS,
];

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set."); process.exit(1); }

  if (DRY_RUN) {
    console.log(`DRY_RUN: would insert ${ALL_ITEMS.length} listening items`);
    const byLevel: Record<string,number> = {};
    for (const i of ALL_ITEMS) byLevel[i.cefrLevel] = (byLevel[i.cefrLevel]||0)+1;
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
  for (const item of ALL_ITEMS) {
    await prisma.item.create({
      data:{
        skill: item.skill as any,
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
  for (const i of ALL_ITEMS) totals[i.cefrLevel] = (totals[i.cefrLevel]||0)+1;
  console.log(`\nInserted ${inserted} listening items`);
  console.table(totals);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
