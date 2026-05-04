/**
 * VOCABULARY — Phase 2: Expansion (+300 items, A1–C2)
 *
 * Focus on closing the B2–C2 gap (currently only 65 items for those levels).
 * Distribution: A1=30, A2=40, B1=50, B2=70, C1=70, C2=40 = 300
 *
 * Content is self-contained (no external data file).
 * Uses same MULTIPLE_CHOICE format as seed-vocab-200-sota.ts
 *
 *   npx tsx scripts/seed-vocab-phase2.ts
 *   DRY_RUN=1 npx tsx scripts/seed-vocab-phase2.ts
 *   FORCE=1 npx tsx scripts/seed-vocab-phase2.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SEED_TAG = "seed-vocab-phase2";

type Item = {
  cefrLevel: string;
  b: number;
  a: number;
  tags: string[];
  prompt: string;
  correct: string;
  wrong: [string, string, string];
};

// ─── A1 ─────────────────────────────────────────────────────────
const A1: Item[] = [
  { cefrLevel:"A1", b:-2.7, a:0.9, tags:["vocabulary","a1","daily-life","junior",SEED_TAG], prompt:"I drink ___ every morning. It is hot and brown.", correct:"coffee", wrong:["hammer","garden","ticket"] },
  { cefrLevel:"A1", b:-2.6, a:0.9, tags:["vocabulary","a1","colours","primary",SEED_TAG], prompt:"The sky is ___ on a sunny day.", correct:"blue", wrong:["heavy","fast","quiet"] },
  { cefrLevel:"A1", b:-2.5, a:0.9, tags:["vocabulary","a1","numbers","primary",SEED_TAG], prompt:"A week has ___ days.", correct:"seven", wrong:["twelve","four","nine"] },
  { cefrLevel:"A1", b:-2.4, a:0.9, tags:["vocabulary","a1","family","junior",SEED_TAG], prompt:"My mother's mother is my ___.", correct:"grandmother", wrong:["daughter","neighbour","cousin"] },
  { cefrLevel:"A1", b:-2.3, a:0.9, tags:["vocabulary","a1","food","primary",SEED_TAG], prompt:"We eat ___ and chips at the fish restaurant.", correct:"fish", wrong:["clock","paper","brush"] },
  { cefrLevel:"A1", b:-2.2, a:0.9, tags:["vocabulary","a1","clothes","junior",SEED_TAG], prompt:"When it is cold, I wear a ___ to keep warm.", correct:"jacket", wrong:["bucket","mirror","stamp"] },
  { cefrLevel:"A1", b:-2.1, a:0.9, tags:["vocabulary","a1","animals","primary",SEED_TAG], prompt:"A ___ says 'meow' and catches mice.", correct:"cat", wrong:["train","cloud","river"] },
  { cefrLevel:"A1", b:-2.0, a:0.9, tags:["vocabulary","a1","transport","junior",SEED_TAG], prompt:"We fly in a ___ to go to another country.", correct:"plane", wrong:["forest","candle","needle"] },
  { cefrLevel:"A1", b:-1.9, a:0.9, tags:["vocabulary","a1","house","primary",SEED_TAG], prompt:"We sleep in a ___.", correct:"bedroom", wrong:["kitchen","garden","office"] },
  { cefrLevel:"A1", b:-1.8, a:0.9, tags:["vocabulary","a1","verbs","junior",SEED_TAG], prompt:"I ___ my teeth every morning and evening.", correct:"brush", wrong:["drive","carry","paint"] },
  { cefrLevel:"A1", b:-1.7, a:0.9, tags:["vocabulary","a1","weather","junior",SEED_TAG], prompt:"When it ___ outside, I use an umbrella.", correct:"rains", wrong:["shines","freezes","blows"] },
  { cefrLevel:"A1", b:-1.6, a:0.9, tags:["vocabulary","a1","school","primary",SEED_TAG], prompt:"We use a ___ to write on the board.", correct:"chalk", wrong:["scissors","stapler","eraser"] },
  { cefrLevel:"A1", b:-1.5, a:1.0, tags:["vocabulary","a1","time","junior",SEED_TAG], prompt:"The opposite of 'morning' is ___.", correct:"evening", wrong:["minute","winter","Tuesday"] },
  { cefrLevel:"A1", b:-1.4, a:1.0, tags:["vocabulary","a1","verbs","primary",SEED_TAG], prompt:"Can you ___ that word, please? I cannot understand it.", correct:"repeat", wrong:["forget","replace","return"] },
  { cefrLevel:"A1", b:-1.3, a:1.0, tags:["vocabulary","a1","places","junior",SEED_TAG], prompt:"We go to a ___ to borrow books for free.", correct:"library", wrong:["factory","harbour","stadium"] },
  { cefrLevel:"A1", b:-1.2, a:1.0, tags:["vocabulary","a1","adjectives","junior",SEED_TAG], prompt:"This bag is very ___; I cannot lift it alone.", correct:"heavy", wrong:["empty","dirty","early"] },
  { cefrLevel:"A1", b:-1.1, a:1.0, tags:["vocabulary","a1","verbs","junior",SEED_TAG], prompt:"Please ___ the door; it is cold outside.", correct:"close", wrong:["break","paint","cross"] },
  { cefrLevel:"A1", b:-1.0, a:1.0, tags:["vocabulary","a1","sports","junior",SEED_TAG], prompt:"In ___, players kick a ball into a goal.", correct:"football", wrong:["tennis","cricket","chess"] },
  { cefrLevel:"A1", b:-0.9, a:1.0, tags:["vocabulary","a1","body","primary",SEED_TAG], prompt:"We use our ___ to hear sounds.", correct:"ears", wrong:["fingers","knees","shoulders"] },
  { cefrLevel:"A1", b:-0.8, a:1.0, tags:["vocabulary","a1","money","junior",SEED_TAG], prompt:"You give ___ to buy things in a shop.", correct:"money", wrong:["advice","energy","effort"] },
  { cefrLevel:"A1", b:-2.6, a:0.9, tags:["vocabulary","a1","daily-life","language-schools",SEED_TAG], prompt:"I ___ my alarm clock at 7 a.m. every day.", correct:"set", wrong:["turn","call","read"] },
  { cefrLevel:"A1", b:-2.5, a:0.9, tags:["vocabulary","a1","adjectives","language-schools",SEED_TAG], prompt:"The opposite of 'cheap' is ___.", correct:"expensive", wrong:["slow","heavy","quiet"] },
  { cefrLevel:"A1", b:-2.4, a:0.9, tags:["vocabulary","a1","verbs","language-schools",SEED_TAG], prompt:"I ___ TV for two hours after school.", correct:"watch", wrong:["write","listen","speak"] },
  { cefrLevel:"A1", b:-2.3, a:0.9, tags:["vocabulary","a1","places","language-schools",SEED_TAG], prompt:"We go to a ___ to see a doctor.", correct:"hospital", wrong:["theatre","airport","museum"] },
  { cefrLevel:"A1", b:-2.2, a:0.9, tags:["vocabulary","a1","food","language-schools",SEED_TAG], prompt:"At a restaurant, you ask for the ___ to see what food is available.", correct:"menu", wrong:["receipt","invoice","label"] },
  { cefrLevel:"A1", b:-2.1, a:0.9, tags:["vocabulary","a1","transport","language-schools",SEED_TAG], prompt:"A ___ takes you from one floor to another in a building.", correct:"lift", wrong:["bridge","tunnel","path"] },
  { cefrLevel:"A1", b:-2.0, a:0.9, tags:["vocabulary","a1","home","language-schools",SEED_TAG], prompt:"We use a ___ to cook food.", correct:"oven", wrong:["wardrobe","curtain","carpet"] },
  { cefrLevel:"A1", b:-1.9, a:0.9, tags:["vocabulary","a1","adjectives","language-schools",SEED_TAG], prompt:"The opposite of 'right' is ___.", correct:"wrong", wrong:["light","late","slow"] },
  { cefrLevel:"A1", b:-1.8, a:0.9, tags:["vocabulary","a1","verbs","language-schools",SEED_TAG], prompt:"She ___ her keys and cannot find them.", correct:"lost", wrong:["took","kept","lent"] },
  { cefrLevel:"A1", b:-1.7, a:1.0, tags:["vocabulary","a1","shopping","language-schools",SEED_TAG], prompt:"The shop is ___ on Sundays. You cannot go there.", correct:"closed", wrong:["busy","small","cheap"] },
];

// ─── A2 ─────────────────────────────────────────────────────────
const A2: Item[] = [
  { cefrLevel:"A2", b:-1.6, a:1.1, tags:["vocabulary","a2","jobs","language-schools",SEED_TAG], prompt:"A ___ designs buildings.", correct:"architect", wrong:["surgeon","economist","magistrate"] },
  { cefrLevel:"A2", b:-1.5, a:1.1, tags:["vocabulary","a2","travel","language-schools",SEED_TAG], prompt:"You need a ___ to travel to another country.", correct:"passport", wrong:["receipt","invoice","contract"] },
  { cefrLevel:"A2", b:-1.4, a:1.1, tags:["vocabulary","a2","health","junior",SEED_TAG], prompt:"I have a ___ and my throat hurts.", correct:"sore", wrong:["happy","heavy","bright"] },
  { cefrLevel:"A2", b:-1.3, a:1.1, tags:["vocabulary","a2","adjectives","junior",SEED_TAG], prompt:"The weather is ___ today — not warm, not cold.", correct:"mild", wrong:["harsh","steep","dense"] },
  { cefrLevel:"A2", b:-1.2, a:1.1, tags:["vocabulary","a2","verbs","language-schools",SEED_TAG], prompt:"She ___ her homework before dinner every evening.", correct:"completes", wrong:["ignores","delays","avoids"] },
  { cefrLevel:"A2", b:-1.1, a:1.1, tags:["vocabulary","a2","technology","junior",SEED_TAG], prompt:"I ___ a photo with my phone and sent it to a friend.", correct:"took", wrong:["drew","painted","printed"] },
  { cefrLevel:"A2", b:-1.0, a:1.1, tags:["vocabulary","a2","environment","junior",SEED_TAG], prompt:"Plastic is bad for the environment because it does not ___ quickly.", correct:"decompose", wrong:["evaporate","dissolve","multiply"] },
  { cefrLevel:"A2", b:-0.9, a:1.1, tags:["vocabulary","a2","shopping","language-schools",SEED_TAG], prompt:"The shop gave me a ___ for 20% off my next purchase.", correct:"discount", wrong:["surcharge","deposit","premium"] },
  { cefrLevel:"A2", b:-0.8, a:1.1, tags:["vocabulary","a2","education","junior",SEED_TAG], prompt:"She studies very hard and always ___ well in her exams.", correct:"performs", wrong:["produces","invests","directs"] },
  { cefrLevel:"A2", b:-0.7, a:1.1, tags:["vocabulary","a2","free-time","junior",SEED_TAG], prompt:"I enjoy reading ___ about space and science.", correct:"magazines", wrong:["contracts","manuals","invoices"] },
  { cefrLevel:"A2", b:-0.6, a:1.1, tags:["vocabulary","a2","house","language-schools",SEED_TAG], prompt:"Please ___ the dishes after dinner.", correct:"wash", wrong:["boil","freeze","peel"] },
  { cefrLevel:"A2", b:-0.5, a:1.1, tags:["vocabulary","a2","verbs","language-schools",SEED_TAG], prompt:"He ___ to learn English by watching films.", correct:"decided", wrong:["refused","avoided","struggled"] },
  { cefrLevel:"A2", b:-0.4, a:1.1, tags:["vocabulary","a2","adjectives","language-schools",SEED_TAG], prompt:"The room was so ___ that I could not see my hand in front of my face.", correct:"dark", wrong:["loud","crowded","distant"] },
  { cefrLevel:"A2", b:-0.3, a:1.1, tags:["vocabulary","a2","people","junior",SEED_TAG], prompt:"A ___ person gives to charity and helps others.", correct:"generous", wrong:["curious","stubborn","creative"] },
  { cefrLevel:"A2", b:-0.2, a:1.1, tags:["vocabulary","a2","verbs","language-schools",SEED_TAG], prompt:"Could you ___ me if there is a bank near here?", correct:"tell", wrong:["teach","show","guide"] },
  { cefrLevel:"A2", b:-1.5, a:1.1, tags:["vocabulary","a2","communication","language-schools",SEED_TAG], prompt:"He sent a ___ to his friend to say he would be late.", correct:"message", wrong:["headline","caption","invoice"] },
  { cefrLevel:"A2", b:-1.4, a:1.1, tags:["vocabulary","a2","food","language-schools",SEED_TAG], prompt:"The cake was too ___; I could not eat it all.", correct:"sweet", wrong:["bitter","salty","spicy"] },
  { cefrLevel:"A2", b:-1.3, a:1.1, tags:["vocabulary","a2","city","language-schools",SEED_TAG], prompt:"There is a long ___ at the bus stop. Many people are waiting.", correct:"queue", wrong:["crowd","group","team"] },
  { cefrLevel:"A2", b:-1.2, a:1.1, tags:["vocabulary","a2","sport","junior",SEED_TAG], prompt:"She runs very ___; she wins every race at school.", correct:"fast", wrong:["high","long","far"] },
  { cefrLevel:"A2", b:-1.1, a:1.1, tags:["vocabulary","a2","verbs","junior",SEED_TAG], prompt:"I ___ my bike every weekend in the park.", correct:"ride", wrong:["drive","pilot","steer"] },
  { cefrLevel:"A2", b:-1.0, a:1.1, tags:["vocabulary","a2","time","language-schools",SEED_TAG], prompt:"The meeting is ___ for 3 p.m. this afternoon.", correct:"scheduled", wrong:["postponed","completed","extended"] },
  { cefrLevel:"A2", b:-0.9, a:1.1, tags:["vocabulary","a2","nature","junior",SEED_TAG], prompt:"The ___ of the river is very fast after heavy rain.", correct:"current", wrong:["surface","bottom","depth"] },
  { cefrLevel:"A2", b:-0.8, a:1.1, tags:["vocabulary","a2","adjectives","language-schools",SEED_TAG], prompt:"The hotel room was ___ and comfortable, and I slept well.", correct:"quiet", wrong:["modern","spacious","elegant"] },
  { cefrLevel:"A2", b:-0.7, a:1.1, tags:["vocabulary","a2","verbs","language-schools",SEED_TAG], prompt:"Please ___ the form with your name and address.", correct:"complete", wrong:["sign","staple","return"] },
  { cefrLevel:"A2", b:-0.6, a:1.1, tags:["vocabulary","a2","society","junior",SEED_TAG], prompt:"People who do not have a home are ___.", correct:"homeless", wrong:["jobless","hopeless","childless"] },
  { cefrLevel:"A2", b:-0.5, a:1.1, tags:["vocabulary","a2","verbs","junior",SEED_TAG], prompt:"I need to ___ my phone; the battery is almost empty.", correct:"charge", wrong:["update","restart","repair"] },
  { cefrLevel:"A2", b:-0.4, a:1.1, tags:["vocabulary","a2","education","language-schools",SEED_TAG], prompt:"The ___ explains the meaning of a word.", correct:"definition", wrong:["translation","example","synonym"] },
  { cefrLevel:"A2", b:-0.3, a:1.1, tags:["vocabulary","a2","health","language-schools",SEED_TAG], prompt:"You should drink plenty of water to stay ___.", correct:"hydrated", wrong:["warm","active","rested"] },
  { cefrLevel:"A2", b:-0.2, a:1.1, tags:["vocabulary","a2","services","language-schools",SEED_TAG], prompt:"The ___ delivers letters and parcels to your house.", correct:"postman", wrong:["mechanic","plumber","electrician"] },
  { cefrLevel:"A2", b:-0.1, a:1.1, tags:["vocabulary","a2","verbs","language-schools",SEED_TAG], prompt:"The shop will ___ you if the product is faulty.", correct:"refund", wrong:["replace","discount","cancel"] },
  { cefrLevel:"A2", b:0.0, a:1.1, tags:["vocabulary","a2","media","junior",SEED_TAG], prompt:"A ___ is a programme that gives information about events happening now.", correct:"news bulletin", wrong:["documentary","sitcom","quiz show"] },
  { cefrLevel:"A2", b:0.1, a:1.1, tags:["vocabulary","a2","work","language-schools",SEED_TAG], prompt:"She applied for the ___ and was invited to an interview.", correct:"job", wrong:["task","chore","duty"] },
  { cefrLevel:"A2", b:-1.6, a:1.1, tags:["vocabulary","a2","verbs","language-schools",SEED_TAG], prompt:"The bus ___ at the corner and I got on.", correct:"stopped", wrong:["parked","landed","docked"] },
  { cefrLevel:"A2", b:-1.5, a:1.1, tags:["vocabulary","a2","adjectives","language-schools",SEED_TAG], prompt:"This mountain path is very ___ and dangerous in winter.", correct:"steep", wrong:["damp","hollow","faint"] },
  { cefrLevel:"A2", b:-1.4, a:1.1, tags:["vocabulary","a2","emotions","junior",SEED_TAG], prompt:"I felt very ___ when my team won the match.", correct:"proud", wrong:["ashamed","bored","anxious"] },
  { cefrLevel:"A2", b:-1.3, a:1.1, tags:["vocabulary","a2","school","junior",SEED_TAG], prompt:"The ___ period starts at 1 p.m. and students eat in the canteen.", correct:"lunch", wrong:["sports","study","assembly"] },
  { cefrLevel:"A2", b:-1.2, a:1.1, tags:["vocabulary","a2","place","language-schools",SEED_TAG], prompt:"We keep our car in a ___.", correct:"garage", wrong:["basement","attic","balcony"] },
  { cefrLevel:"A2", b:-1.1, a:1.1, tags:["vocabulary","a2","hobbies","junior",SEED_TAG], prompt:"She plays the ___ and performs in the school orchestra.", correct:"violin", wrong:["trumpet","xylophone","accordion"] },
  { cefrLevel:"A2", b:-1.0, a:1.1, tags:["vocabulary","a2","verbs","language-schools",SEED_TAG], prompt:"He ___ the accident to the police immediately.", correct:"reported", wrong:["noticed","revealed","observed"] },
  { cefrLevel:"A2", b:-0.9, a:1.1, tags:["vocabulary","a2","environment","junior",SEED_TAG], prompt:"We should ___ paper, glass, and plastic to protect the environment.", correct:"recycle", wrong:["consume","produce","export"] },
];

// ─── B1 ─────────────────────────────────────────────────────────
const B1: Item[] = [
  { cefrLevel:"B1", b:-0.5, a:1.2, tags:["vocabulary","b1","communication","language-schools",SEED_TAG], prompt:"She made a ___ remark that upset everyone in the room.", correct:"sarcastic", wrong:["sincere","enthusiastic","modest"] },
  { cefrLevel:"B1", b:-0.4, a:1.2, tags:["vocabulary","b1","work","corporate",SEED_TAG], prompt:"The manager ___ the new sales strategy to the team.", correct:"presented", wrong:["promoted","recruited","evaluated"] },
  { cefrLevel:"B1", b:-0.3, a:1.2, tags:["vocabulary","b1","environment","academia",SEED_TAG], prompt:"Factories must reduce the ___ they release into the atmosphere.", correct:"emissions", wrong:["resources","substances","materials"] },
  { cefrLevel:"B1", b:-0.2, a:1.2, tags:["vocabulary","b1","travel","language-schools",SEED_TAG], prompt:"The airline asked passengers to ___ their bags at the check-in desk.", correct:"check in", wrong:["sort out","fill in","hand over"] },
  { cefrLevel:"B1", b:-0.1, a:1.2, tags:["vocabulary","b1","society","academia",SEED_TAG], prompt:"A ___ is someone who comes to live permanently in a new country.", correct:"immigrant", wrong:["tourist","diplomat","refugee"] },
  { cefrLevel:"B1", b:0.0, a:1.2, tags:["vocabulary","b1","education","academia",SEED_TAG], prompt:"The professor gave the students detailed ___ on their essays.", correct:"feedback", wrong:["reference","comment","citation"] },
  { cefrLevel:"B1", b:0.1, a:1.2, tags:["vocabulary","b1","technology","junior",SEED_TAG], prompt:"You need to ___ the software to get the latest security features.", correct:"update", wrong:["restart","delete","install"] },
  { cefrLevel:"B1", b:0.2, a:1.2, tags:["vocabulary","b1","health","language-schools",SEED_TAG], prompt:"Regular exercise can ___ the risk of heart disease.", correct:"reduce", wrong:["increase","trigger","ignore"] },
  { cefrLevel:"B1", b:0.3, a:1.2, tags:["vocabulary","b1","work","corporate",SEED_TAG], prompt:"She was ___ for her excellent performance and given a bonus.", correct:"rewarded", wrong:["assessed","recognised","promoted"] },
  { cefrLevel:"B1", b:0.4, a:1.2, tags:["vocabulary","b1","society","academia",SEED_TAG], prompt:"The government plans to ___ its policy on renewable energy.", correct:"reform", wrong:["abolish","debate","ignore"] },
  { cefrLevel:"B1", b:0.5, a:1.2, tags:["vocabulary","b1","communication","language-schools",SEED_TAG], prompt:"Please ___ me of the time and place of the meeting.", correct:"remind", wrong:["notify","warn","advise"] },
  { cefrLevel:"B1", b:0.5, a:1.2, tags:["vocabulary","b1","environment","academia",SEED_TAG], prompt:"The city has introduced ___ transport options such as electric buses.", correct:"sustainable", wrong:["affordable","accessible","efficient"] },
  { cefrLevel:"B1", b:0.4, a:1.2, tags:["vocabulary","b1","business","corporate",SEED_TAG], prompt:"The two companies signed a ___ to share resources and expertise.", correct:"partnership", wrong:["contract","merger","franchise"] },
  { cefrLevel:"B1", b:0.3, a:1.2, tags:["vocabulary","b1","media","junior",SEED_TAG], prompt:"The article was ___ with photographs and charts.", correct:"illustrated", wrong:["equipped","supplied","described"] },
  { cefrLevel:"B1", b:0.2, a:1.2, tags:["vocabulary","b1","psychology","academia",SEED_TAG], prompt:"She felt ___ after working sixteen hours without a break.", correct:"exhausted", wrong:["focused","motivated","prepared"] },
  { cefrLevel:"B1", b:0.1, a:1.2, tags:["vocabulary","b1","writing","academia",SEED_TAG], prompt:"A good essay should have a clear ___ statement at the beginning.", correct:"thesis", wrong:["topic","summary","conclusion"] },
  { cefrLevel:"B1", b:0.0, a:1.2, tags:["vocabulary","b1","verbs","language-schools",SEED_TAG], prompt:"He ___ to finish the project before the deadline.", correct:"managed", wrong:["refused","failed","planned"] },
  { cefrLevel:"B1", b:-0.1, a:1.2, tags:["vocabulary","b1","economics","corporate",SEED_TAG], prompt:"When supply falls and demand stays the same, prices ___.", correct:"rise", wrong:["stabilise","drop","vary"] },
  { cefrLevel:"B1", b:-0.2, a:1.2, tags:["vocabulary","b1","law","academia",SEED_TAG], prompt:"Breaking the speed limit is ___ by law.", correct:"prohibited", wrong:["discouraged","regulated","monitored"] },
  { cefrLevel:"B1", b:-0.3, a:1.2, tags:["vocabulary","b1","adjectives","language-schools",SEED_TAG], prompt:"The instructions were ___, so I did not understand what to do.", correct:"vague", wrong:["detailed","complex","strict"] },
  { cefrLevel:"B1", b:0.5, a:1.2, tags:["vocabulary","b1","prepositions","language-schools",SEED_TAG], prompt:"She is very good ___ playing the piano.", correct:"at", wrong:["in","for","with"] },
  { cefrLevel:"B1", b:0.4, a:1.2, tags:["vocabulary","b1","phrasal-verbs","language-schools",SEED_TAG], prompt:"The meeting was ___ because the manager was ill.", correct:"called off", wrong:["put aside","taken over","broken up"] },
  { cefrLevel:"B1", b:0.3, a:1.2, tags:["vocabulary","b1","education","academia",SEED_TAG], prompt:"Students are expected to ___ to class discussions by sharing ideas.", correct:"contribute", wrong:["respond","submit","present"] },
  { cefrLevel:"B1", b:0.2, a:1.2, tags:["vocabulary","b1","health","language-schools",SEED_TAG], prompt:"The doctor said rest was ___ for a quick recovery.", correct:"essential", wrong:["optional","recommended","helpful"] },
  { cefrLevel:"B1", b:0.1, a:1.2, tags:["vocabulary","b1","social","junior",SEED_TAG], prompt:"It is important to ___ a balance between studying and relaxing.", correct:"maintain", wrong:["create","find","build"] },
  { cefrLevel:"B1", b:0.0, a:1.2, tags:["vocabulary","b1","work","corporate",SEED_TAG], prompt:"The company set a ___ of 500 new customers by the end of the year.", correct:"target", wrong:["quota","limit","budget"] },
  { cefrLevel:"B1", b:-0.1, a:1.2, tags:["vocabulary","b1","environment","academia",SEED_TAG], prompt:"Solar and wind power are examples of ___ energy sources.", correct:"renewable", wrong:["nuclear","fossil","synthetic"] },
  { cefrLevel:"B1", b:-0.2, a:1.2, tags:["vocabulary","b1","communication","corporate",SEED_TAG], prompt:"She ___ the report carefully before sending it to the director.", correct:"proofread", wrong:["reviewed","composed","submitted"] },
  { cefrLevel:"B1", b:-0.3, a:1.2, tags:["vocabulary","b1","society","academia",SEED_TAG], prompt:"The new policy aims to ___ inequality between rich and poor.", correct:"reduce", wrong:["monitor","debate","review"] },
  { cefrLevel:"B1", b:-0.4, a:1.2, tags:["vocabulary","b1","collocations","language-schools",SEED_TAG], prompt:"She ___ a risk by investing all her savings in one company.", correct:"took", wrong:["made","ran","got"] },
  { cefrLevel:"B1", b:-0.5, a:1.2, tags:["vocabulary","b1","verbs","language-schools",SEED_TAG], prompt:"We need to ___ our resources carefully to avoid waste.", correct:"manage", wrong:["spend","use","apply"] },
  { cefrLevel:"B1", b:0.1, a:1.2, tags:["vocabulary","b1","science","academia",SEED_TAG], prompt:"Scientists ___ an experiment to test their hypothesis.", correct:"conduct", wrong:["perform","execute","run"] },
  { cefrLevel:"B1", b:0.2, a:1.2, tags:["vocabulary","b1","travel","language-schools",SEED_TAG], prompt:"The city is a popular ___ for tourists from around the world.", correct:"destination", wrong:["location","attraction","region"] },
  { cefrLevel:"B1", b:0.3, a:1.2, tags:["vocabulary","b1","adjectives","language-schools",SEED_TAG], prompt:"The report was ___ and included many examples and statistics.", correct:"comprehensive", wrong:["concise","complex","systematic"] },
  { cefrLevel:"B1", b:0.4, a:1.2, tags:["vocabulary","b1","phrasal-verbs","language-schools",SEED_TAG], prompt:"She ___ her old hobby of painting after many years.", correct:"took up", wrong:["went on","kept up","gave in"] },
  { cefrLevel:"B1", b:0.5, a:1.2, tags:["vocabulary","b1","society","academia",SEED_TAG], prompt:"A ___ is a formal system of rules that govern behaviour.", correct:"regulation", wrong:["tradition","convention","standard"] },
  { cefrLevel:"B1", b:0.4, a:1.2, tags:["vocabulary","b1","psychology","academia",SEED_TAG], prompt:"Teenagers often ___ pressure from friends to behave in certain ways.", correct:"face", wrong:["avoid","ignore","resist"] },
  { cefrLevel:"B1", b:0.3, a:1.2, tags:["vocabulary","b1","prepositions","language-schools",SEED_TAG], prompt:"The results depend ___ how much effort you put in.", correct:"on", wrong:["from","of","by"] },
  { cefrLevel:"B1", b:0.2, a:1.2, tags:["vocabulary","b1","collocations","corporate",SEED_TAG], prompt:"We need to ___ a decision about the new project by Friday.", correct:"make", wrong:["take","do","get"] },
  { cefrLevel:"B1", b:0.1, a:1.2, tags:["vocabulary","b1","verbs","language-schools",SEED_TAG], prompt:"The committee will ___ all applications and select the best candidates.", correct:"review", wrong:["revise","reject","report"] },
  { cefrLevel:"B1", b:0.0, a:1.2, tags:["vocabulary","b1","media","academia",SEED_TAG], prompt:"The journalist ___ the story over six months before publishing it.", correct:"investigated", wrong:["broadcast","produced","published"] },
  { cefrLevel:"B1", b:-0.1, a:1.2, tags:["vocabulary","b1","science","academia",SEED_TAG], prompt:"A ___ is a possible explanation for an observation that can be tested.", correct:"hypothesis", wrong:["theory","fact","argument"] },
  { cefrLevel:"B1", b:-0.2, a:1.2, tags:["vocabulary","b1","collocations","language-schools",SEED_TAG], prompt:"She ___ a complaint about the noisy neighbours to the council.", correct:"made", wrong:["raised","filed","submitted"] },
  { cefrLevel:"B1", b:-0.3, a:1.2, tags:["vocabulary","b1","verbs","language-schools",SEED_TAG], prompt:"You should ___ your essay for spelling mistakes before you hand it in.", correct:"check", wrong:["correct","edit","revise"] },
  { cefrLevel:"B1", b:-0.4, a:1.2, tags:["vocabulary","b1","adjectives","academia",SEED_TAG], prompt:"The relationship between poverty and crime is ___; many factors are involved.", correct:"complex", wrong:["obvious","direct","clear"] },
  { cefrLevel:"B1", b:-0.5, a:1.2, tags:["vocabulary","b1","politics","academia",SEED_TAG], prompt:"Citizens have a ___ to vote in elections.", correct:"right", wrong:["duty","option","privilege"] },
  { cefrLevel:"B1", b:0.0, a:1.2, tags:["vocabulary","b1","business","corporate",SEED_TAG], prompt:"The ___ shows the financial situation of the company at a specific date.", correct:"balance sheet", wrong:["income statement","cash flow","business plan"] },
  { cefrLevel:"B1", b:0.1, a:1.2, tags:["vocabulary","b1","idioms","language-schools",SEED_TAG], prompt:"When the project was too much for him alone, his colleague offered to ___.", correct:"lend a hand", wrong:["turn the tables","lose the plot","miss the point"] },
  { cefrLevel:"B1", b:0.2, a:1.2, tags:["vocabulary","b1","verbs","academic",SEED_TAG], prompt:"The new law will ___ the way businesses handle customer data.", correct:"affect", wrong:["effect","inspect","correct"] },
  { cefrLevel:"B1", b:0.3, a:1.2, tags:["vocabulary","b1","adjectives","language-schools",SEED_TAG], prompt:"The documentary gave a very ___ view of how the food industry works.", correct:"realistic", wrong:["positive","limited","optimistic"] },
];

// ─── B2 ─────────────────────────────────────────────────────────
const B2: Item[] = [
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","law","academia",SEED_TAG], prompt:"The defendant was found ___ of all charges and released.", correct:"acquitted", wrong:["convicted","charged","indicted"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","economics","corporate",SEED_TAG], prompt:"A prolonged economic decline across multiple sectors is known as a ___.", correct:"recession", wrong:["depression","stagflation","deflation"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","science","academia",SEED_TAG], prompt:"The ___ of the experiment supported the original hypothesis.", correct:"findings", wrong:["symptoms","proposals","variables"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","psychology","academia",SEED_TAG], prompt:"He showed ___ behaviour, unable to control his anger in public.", correct:"impulsive", wrong:["compulsive","reflexive","defensive"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","politics","academia",SEED_TAG], prompt:"The opposition party ___ a vote of no confidence in the government.", correct:"called for", wrong:["stood for","fought for","voted for"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","literature","academia",SEED_TAG], prompt:"The ___ of the novel is a young woman struggling to find her identity.", correct:"protagonist", wrong:["antagonist","narrator","archetype"] },
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","business","corporate",SEED_TAG], prompt:"The company's new product line has the ___ to capture a significant market share.", correct:"potential", wrong:["tendency","likelihood","advantage"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","collocations","language-schools",SEED_TAG], prompt:"The CEO took ___ for the financial losses and resigned.", correct:"responsibility", wrong:["accountability","blame","credit"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","environment","academia",SEED_TAG], prompt:"The ___ of biodiversity threatens entire food chains.", correct:"erosion", wrong:["reduction","depletion","destruction"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","communication","corporate",SEED_TAG], prompt:"She was skilled at ___ complex technical information to non-specialist audiences.", correct:"conveying", wrong:["translating","distributing","illustrating"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","adjectives","academia",SEED_TAG], prompt:"The study produced ___ results that contradicted previous research.", correct:"inconclusive", wrong:["controversial","preliminary","definitive"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","verbs","academia",SEED_TAG], prompt:"The government plans to ___ a new set of regulations next year.", correct:"implement", wrong:["propose","review","draft"] },
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","collocations","corporate",SEED_TAG], prompt:"We need to ___ a compromise that satisfies both parties.", correct:"reach", wrong:["make","achieve","find"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","academic-writing","academia",SEED_TAG], prompt:"This essay will ___ to what extent globalisation has increased inequality.", correct:"examine", wrong:["analyse","investigate","establish"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","idioms","language-schools",SEED_TAG], prompt:"After months of delay, the project has finally ___.", correct:"got off the ground", wrong:["hit the wall","lost its footing","run its course"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","medicine","academia",SEED_TAG], prompt:"The doctor recommended a course of ___ to fight the bacterial infection.", correct:"antibiotics", wrong:["antihistamines","analgesics","antioxidants"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","society","academia",SEED_TAG], prompt:"The ___ of wealth within a country is measured by the Gini coefficient.", correct:"distribution", wrong:["allocation","accumulation","concentration"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","arts","academia",SEED_TAG], prompt:"The painting was praised for its subtle use of light and ___.", correct:"perspective", wrong:["proportion","dimension","symmetry"] },
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","academic-vocabulary","academia",SEED_TAG], prompt:"The author ___ that increased automation will lead to widespread unemployment.", correct:"argues", wrong:["claims","insists","suggests"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","business","corporate",SEED_TAG], prompt:"The firm decided to ___ its operations and focus on its core business.", correct:"streamline", wrong:["diversify","expand","restructure"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","word-formation","language-schools",SEED_TAG], prompt:"The ___ of the policy will take years to fully evaluate.", correct:"effectiveness", wrong:["efficiency","significance","relevance"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","collocations","academia",SEED_TAG], prompt:"The research ___ that caffeine improves short-term memory.", correct:"indicates", wrong:["proves","confirms","establishes"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","phrasal-verbs","language-schools",SEED_TAG], prompt:"The government must ___ corruption if it wants to restore public trust.", correct:"crack down on", wrong:["put up with","take part in","stand up to"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","adjectives","academia",SEED_TAG], prompt:"The scientist presented a ___ argument for the existence of dark matter.", correct:"compelling", wrong:["plausible","theoretical","provocative"] },
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","ethics","academia",SEED_TAG], prompt:"Medical researchers must obtain ___ consent from participants before conducting experiments.", correct:"informed", wrong:["written","formal","explicit"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","collocations","corporate",SEED_TAG], prompt:"The marketing team ___ on a bold new advertising campaign.", correct:"embarked", wrong:["launched","started","commenced"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","grammar-in-context","language-schools",SEED_TAG], prompt:"The project was ___ to be completed within six months.", correct:"expected", wrong:["supposed","planned","intended"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","collocations","language-schools",SEED_TAG], prompt:"She ___ a strong impression during the job interview.", correct:"made", wrong:["gave","left","showed"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","technology","academia",SEED_TAG], prompt:"Algorithms that learn from data without explicit programming are called ___ learning systems.", correct:"machine", wrong:["deep","neural","digital"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","society","academia",SEED_TAG], prompt:"The ___ gap between different generations leads to misunderstanding and conflict.", correct:"generational", wrong:["cultural","ideological","political"] },
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","verbs","academia",SEED_TAG], prompt:"Researchers must ___ their findings to the broader scientific community.", correct:"disseminate", wrong:["document","validate","present"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","collocations","language-schools",SEED_TAG], prompt:"The charity ___ awareness of the issue through a national campaign.", correct:"raised", wrong:["spread","increased","gained"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","adjectives","academia",SEED_TAG], prompt:"The treaty was ___ by all member states and came into force immediately.", correct:"ratified", wrong:["signed","endorsed","acknowledged"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","economics","corporate",SEED_TAG], prompt:"An increase in the money supply without corresponding growth can lead to ___.", correct:"inflation", wrong:["deflation","stagnation","devaluation"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","phrasal-verbs","language-schools",SEED_TAG], prompt:"The committee ___ the proposal after a lengthy debate.", correct:"turned down", wrong:["put off","set back","drew up"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","register","language-schools",SEED_TAG], prompt:"In formal writing, 'get' is often replaced by more ___ synonyms such as 'obtain' or 'acquire'.", correct:"formal", wrong:["technical","academic","specific"] },
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","word-building","language-schools",SEED_TAG], prompt:"The suffix '-ify' creates a verb from an adjective. 'Intense' becomes ___.", correct:"intensify", wrong:["intensely","intensity","intensive"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","collocations","academia",SEED_TAG], prompt:"The policy has had a profound ___ on public health outcomes.", correct:"impact", wrong:["result","effect","consequence"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","geography","academia",SEED_TAG], prompt:"The ___ population of the world now exceeds 55% and continues to grow.", correct:"urban", wrong:["rural","suburban","coastal"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","psychology","academia",SEED_TAG], prompt:"___ bias causes people to seek information that confirms their existing beliefs.", correct:"Confirmation", wrong:["Selection","Projection","Attribution"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","media","academia",SEED_TAG], prompt:"When a news organisation publishes a correction, it ___ an earlier inaccuracy.", correct:"retracts", wrong:["revises","edits","contests"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","academic-writing","academia",SEED_TAG], prompt:"___ to the argument above, critics contend that economic growth alone cannot reduce inequality.", correct:"Contrary", wrong:["According","Referring","Owing"] },
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","idioms","language-schools",SEED_TAG], prompt:"When discussions about salaries were ___, the employee asked for a raise.", correct:"broached", wrong:["raised","initiated","commenced"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","collocations","corporate",SEED_TAG], prompt:"The company ___ a partnership with a local charity to improve its corporate image.", correct:"forged", wrong:["built","created","formed"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","health","academia",SEED_TAG], prompt:"A ___ study follows participants over a long period of time.", correct:"longitudinal", wrong:["quantitative","qualitative","cross-sectional"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","collocations","language-schools",SEED_TAG], prompt:"She ___ a conclusion based on the evidence she had gathered.", correct:"drew", wrong:["made","formed","reached"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","adjectives","academia",SEED_TAG], prompt:"The report was ___ in its recommendations, stopping short of calling for major reforms.", correct:"cautious", wrong:["tentative","moderate","reserved"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","etymology","academia",SEED_TAG], prompt:"The word 'philanthropy' comes from Greek roots meaning 'love of ___'.", correct:"humanity", wrong:["knowledge","virtue","beauty"] },
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","register","corporate",SEED_TAG], prompt:"'I regret to inform you that your application has been unsuccessful' is an example of ___ language.", correct:"formal", wrong:["technical","bureaucratic","legalistic"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","collocations","academia",SEED_TAG], prompt:"Scientists have failed to ___ a direct link between the two phenomena.", correct:"establish", wrong:["prove","confirm","demonstrate"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","verbs","language-schools",SEED_TAG], prompt:"The police were unable to ___ the suspect's whereabouts on the night of the crime.", correct:"verify", wrong:["confirm","establish","identify"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","collocations","academia",SEED_TAG], prompt:"The new tax will ___ a significant burden on small businesses.", correct:"impose", wrong:["place","create","cause"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","technology","academia",SEED_TAG], prompt:"Blockchain technology ensures that records are ___ and cannot be altered without detection.", correct:"immutable", wrong:["encrypted","secure","transparent"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","sociology","academia",SEED_TAG], prompt:"Social ___ refers to the movement of individuals between different levels of the social hierarchy.", correct:"mobility", wrong:["inequality","stratification","integration"] },
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","phrasal-verbs","language-schools",SEED_TAG], prompt:"The economy ___ during the pandemic as consumer spending collapsed.", correct:"contracted", wrong:["collapsed","stagnated","declined"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","collocations","corporate",SEED_TAG], prompt:"The new strategy aims to ___ customer retention by improving after-sales service.", correct:"boost", wrong:["maintain","ensure","guarantee"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","word-formation","language-schools",SEED_TAG], prompt:"The prefix 'mis-' means 'wrongly'. 'To ___ information' means to give false or incorrect data.", correct:"misrepresent", wrong:["misunderstand","mislead","misinform"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","academic-reading","academia",SEED_TAG], prompt:"___ evidence is drawn from specific cases rather than from general statistics.", correct:"Anecdotal", wrong:["Empirical","Statistical","Quantitative"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","verbs","academia",SEED_TAG], prompt:"The discovery ___ our understanding of early human migration.", correct:"transformed", wrong:["challenged","shaped","influenced"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","collocations","language-schools",SEED_TAG], prompt:"She ___ her fears and delivered the presentation with confidence.", correct:"overcame", wrong:["suppressed","controlled","managed"] },
  { cefrLevel:"B2", b:0.5, a:1.3, tags:["vocabulary","b2","business","corporate",SEED_TAG], prompt:"The shareholders voted to ___ the proposed merger.", correct:"approve", wrong:["authorise","endorse","confirm"] },
  { cefrLevel:"B2", b:0.6, a:1.3, tags:["vocabulary","b2","adjectives","academia",SEED_TAG], prompt:"The ethical implications of the research were ___; experts disagreed strongly.", correct:"contentious", wrong:["ambiguous","complex","problematic"] },
  { cefrLevel:"B2", b:0.7, a:1.3, tags:["vocabulary","b2","collocations","language-schools",SEED_TAG], prompt:"The government ___ a committee to investigate the causes of the disaster.", correct:"appointed", wrong:["created","formed","established"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","phrasal-verbs","language-schools",SEED_TAG], prompt:"She ___ the report and identified several key trends.", correct:"went through", wrong:["looked over","set aside","ran through"] },
  { cefrLevel:"B2", b:0.9, a:1.3, tags:["vocabulary","b2","arts","academia",SEED_TAG], prompt:"The director's use of close-up shots was intended to ___ the audience's emotional response.", correct:"heighten", wrong:["provoke","direct","influence"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","economics","academia",SEED_TAG], prompt:"When a country spends more than it earns, it runs a budget ___.", correct:"deficit", wrong:["surplus","shortfall","imbalance"] },
  { cefrLevel:"B2", b:1.1, a:1.3, tags:["vocabulary","b2","statistics","academia",SEED_TAG], prompt:"A result is considered statistically ___ when the probability of it occurring by chance is very low.", correct:"significant", wrong:["meaningful","robust","reliable"] },
  { cefrLevel:"B2", b:1.2, a:1.3, tags:["vocabulary","b2","collocations","language-schools",SEED_TAG], prompt:"The negotiators failed to ___ an agreement after two days of talks.", correct:"reach", wrong:["achieve","conclude","find"] },
  { cefrLevel:"B2", b:1.0, a:1.3, tags:["vocabulary","b2","academic-writing","academia",SEED_TAG], prompt:"A well-structured paragraph begins with a ___ sentence that states the main idea.", correct:"topic", wrong:["thesis","transition","concluding"] },
  { cefrLevel:"B2", b:0.8, a:1.3, tags:["vocabulary","b2","society","academia",SEED_TAG], prompt:"The law aims to prevent ___ discrimination against employees based on age, gender or race.", correct:"unlawful", wrong:["unfair","systematic","institutional"] },
];


// ─── C1 ─────────────────────────────────────────────────────────
const C1: Item[] = [
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","academic","academia",SEED_TAG], prompt:"The study yielded ___ results, meaning different conclusions could be drawn from the same data.", correct:"ambiguous", wrong:["inconclusive","contradictory","speculative"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","law","academia",SEED_TAG], prompt:"The lawyer argued that the evidence was inadmissible because it had been obtained ___.", correct:"coercively", wrong:["fraudulently","surreptitiously","unlawfully"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","philosophy","academia",SEED_TAG], prompt:"A ___ argument is one that, if its premises are true, guarantees the truth of its conclusion.", correct:"deductive", wrong:["inductive","abductive","analogical"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","economics","academia",SEED_TAG], prompt:"___ economics examines optimal decision-making by individuals and firms, rather than aggregate phenomena.", correct:"Microeconomics", wrong:["Macroeconomics","Behavioural economics","Econometrics"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","collocations","corporate",SEED_TAG], prompt:"The legal team carried out ___ due diligence before the acquisition.", correct:"exhaustive", wrong:["comprehensive","rigorous","meticulous"] },
  { cefrLevel:"C1", b:1.5, a:1.4, tags:["vocabulary","c1","rhetoric","academia",SEED_TAG], prompt:"Appealing to the audience's emotions rather than logic is known as a(n) ___ appeal.", correct:"pathetic", wrong:["ethical","logical","emotional"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","science","academia",SEED_TAG], prompt:"In a controlled experiment, the variable that is deliberately changed is the ___ variable.", correct:"independent", wrong:["dependent","controlled","extraneous"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","language","academia",SEED_TAG], prompt:"The study of the historical development of languages is known as ___.", correct:"etymology", wrong:["phonology","morphology","semantics"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","politics","academia",SEED_TAG], prompt:"A political system in which power is held by a small elite group is called ___.", correct:"oligarchy", wrong:["plutocracy","autocracy","technocracy"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","collocations","language-schools",SEED_TAG], prompt:"The new policy ___ a precedent for how similar cases will be handled in future.", correct:"set", wrong:["established","created","made"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","psychology","academia",SEED_TAG], prompt:"___ dissonance occurs when a person holds two contradictory beliefs simultaneously.", correct:"Cognitive", wrong:["Emotional","Psychological","Behavioural"] },
  { cefrLevel:"C1", b:1.5, a:1.4, tags:["vocabulary","c1","literature","academia",SEED_TAG], prompt:"A ___ is a recurring symbol, motif, or character type in literature and mythology.", correct:"archetype", wrong:["allegory","motif","trope"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","biology","academia",SEED_TAG], prompt:"The process by which plants convert light energy into chemical energy is called ___.", correct:"photosynthesis", wrong:["respiration","transpiration","osmosis"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","linguistics","academia",SEED_TAG], prompt:"___ refers to the system of rules that govern the structure of sentences in a language.", correct:"Syntax", wrong:["Morphology","Pragmatics","Semantics"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","economics","academia",SEED_TAG], prompt:"The ___ is the additional cost incurred by producing one more unit of a good or service.", correct:"marginal cost", wrong:["average cost","fixed cost","opportunity cost"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","sociology","academia",SEED_TAG], prompt:"___ norms are unwritten but widely understood rules that govern social behaviour.", correct:"Implicit", wrong:["Cultural","Institutional","Behavioural"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","verbs","academia",SEED_TAG], prompt:"The authors ___ the argument from first principles rather than relying on prior literature.", correct:"derived", wrong:["constructed","formulated","developed"] },
  { cefrLevel:"C1", b:1.5, a:1.4, tags:["vocabulary","c1","collocations","corporate",SEED_TAG], prompt:"The board ___ the whistleblower's concerns and launched an internal investigation.", correct:"heeded", wrong:["raised","addressed","dismissed"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","collocations","academia",SEED_TAG], prompt:"The paper ___ the limitations of its own methodology in the discussion section.", correct:"acknowledged", wrong:["disclosed","identified","assessed"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","physics","academia",SEED_TAG], prompt:"The ___ principle states that matter and energy can be neither created nor destroyed.", correct:"conservation", wrong:["equivalence","uncertainty","relativity"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","political-science","academia",SEED_TAG], prompt:"A ___ state is one in which political power is exercised exclusively by a single centralised authority.", correct:"unitary", wrong:["federal","confederal","devolved"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","media","academia",SEED_TAG], prompt:"___ journalism involves exposing wrongdoing in government, business, or public life.", correct:"Investigative", wrong:["Advocacy","Citizen","Narrative"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","collocations","language-schools",SEED_TAG], prompt:"The two concepts are often conflated, but they are ___ distinct.", correct:"fundamentally", wrong:["essentially","broadly","largely"] },
  { cefrLevel:"C1", b:1.5, a:1.4, tags:["vocabulary","c1","medicine","academia",SEED_TAG], prompt:"A ___ trial is a research design in which participants are randomly assigned to treatment or control groups.", correct:"randomised controlled", wrong:["double-blind","longitudinal","observational"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","ethics","academia",SEED_TAG], prompt:"___ ethics holds that the morality of an action is determined solely by its consequences.", correct:"Consequentialist", wrong:["Deontological","Virtue","Contractarian"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","collocations","academia",SEED_TAG], prompt:"The researchers ___ a strong correlation between sleep deprivation and cognitive decline.", correct:"observed", wrong:["reported","identified","documented"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","history","academia",SEED_TAG], prompt:"The ___ interpretation of history focuses on the role of economic forces in shaping events.", correct:"materialist", wrong:["revisionist","structuralist","postmodern"] },
  { cefrLevel:"C1", b:1.3, a:1.5, tags:["vocabulary","c1","verbs","corporate",SEED_TAG], prompt:"The CEO sought to ___ investor confidence following the quarterly loss.", correct:"restore", wrong:["strengthen","reinforce","rebuild"] },
  { cefrLevel:"C1", b:1.4, a:1.5, tags:["vocabulary","c1","word-formation","language-schools",SEED_TAG], prompt:"'Enfranchise' means to grant voting rights. Its antonym ___ means to remove those rights.", correct:"disenfranchise", wrong:["disempower","dispossess","deprive"] },
  { cefrLevel:"C1", b:1.5, a:1.5, tags:["vocabulary","c1","social-science","academia",SEED_TAG], prompt:"In sociology, ___ refers to the shared values, beliefs and norms transmitted across generations.", correct:"cultural capital", wrong:["social capital","symbolic capital","human capital"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","collocations","language-schools",SEED_TAG], prompt:"The results ___ the need for further investigation into the long-term effects.", correct:"underscore", wrong:["support","confirm","highlight"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","logic","academia",SEED_TAG], prompt:"Assuming the conclusion is true in order to prove it is known as ___.", correct:"circular reasoning", wrong:["straw man","false dichotomy","ad hominem"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","science","academia",SEED_TAG], prompt:"A theory that cannot, even in principle, be tested and falsified is ___, according to Popper.", correct:"unfalsifiable", wrong:["unprovable","speculative","metaphysical"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","adjectives","academia",SEED_TAG], prompt:"The ___ nature of the data means results cannot be generalised beyond this specific sample.", correct:"idiosyncratic", wrong:["anomalous","atypical","irregular"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","economics","academia",SEED_TAG], prompt:"When firms in an oligopoly secretly agree on prices, this is called ___.", correct:"collusion", wrong:["monopolisation","cartelisation","price-fixing"] },
  { cefrLevel:"C1", b:1.5, a:1.4, tags:["vocabulary","c1","psychology","academia",SEED_TAG], prompt:"___ attribution theory explains how individuals interpret their own and others' behaviour.", correct:"Causal", wrong:["Dispositional","Situational","Motivational"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","arts","academia",SEED_TAG], prompt:"The ___ movement in art rejected realism in favour of subjective emotional expression.", correct:"Expressionist", wrong:["Impressionist","Surrealist","Cubist"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","collocations","corporate",SEED_TAG], prompt:"The audit revealed several ___ in the company's financial reporting procedures.", correct:"discrepancies", wrong:["inconsistencies","irregularities","anomalies"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","verbs","academia",SEED_TAG], prompt:"The author ___ the argument that technological determinism oversimplifies social change.", correct:"refutes", wrong:["challenges","contests","dismisses"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","collocations","language-schools",SEED_TAG], prompt:"The policy was ___ designed to benefit specific corporate interests.", correct:"deliberately", wrong:["intentionally","consciously","strategically"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","register","corporate",SEED_TAG], prompt:"The legal document ___ all parties from liability in the event of a natural disaster.", correct:"indemnifies", wrong:["protects","exempts","absolves"] },
  { cefrLevel:"C1", b:1.5, a:1.4, tags:["vocabulary","c1","linguistics","academia",SEED_TAG], prompt:"___ refers to the way in which context shapes the meaning of utterances beyond their literal content.", correct:"Pragmatics", wrong:["Semiotics","Discourse analysis","Rhetoric"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","collocations","academia",SEED_TAG], prompt:"Her research sought to ___ the prevailing view that industrialisation caused environmental decline.", correct:"problematise", wrong:["contest","challenge","question"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","medicine","academia",SEED_TAG], prompt:"The drug's ___ effects include nausea and dizziness.", correct:"adverse", wrong:["secondary","side","incidental"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","philosophy","academia",SEED_TAG], prompt:"Kant's ___ imperative demands that we act only according to principles we could will to be universal laws.", correct:"categorical", wrong:["practical","hypothetical","moral"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","economics","academia",SEED_TAG], prompt:"In economics, goods that are ___ in consumption cannot be used by more than one person simultaneously.", correct:"rival", wrong:["excludable","private","scarce"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","verbs","language-schools",SEED_TAG], prompt:"The prosecutor sought to ___ the witness's account by showing contradictions in their statements.", correct:"discredit", wrong:["impeach","challenge","contradict"] },
  { cefrLevel:"C1", b:1.5, a:1.4, tags:["vocabulary","c1","word-formation","academia",SEED_TAG], prompt:"'Hegemony' refers to ___ dominance — the ability of a group to shape the beliefs of others.", correct:"cultural or ideological", wrong:["political or military","economic or financial","legal or institutional"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","collocations","academia",SEED_TAG], prompt:"The study ___ that socioeconomic status is a strong predictor of educational attainment.", correct:"demonstrates", wrong:["shows","reveals","suggests"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","adjectives","academia",SEED_TAG], prompt:"The committee reached a ___ decision after weeks of negotiation, with all members in agreement.", correct:"unanimous", wrong:["collective","consensual","comprehensive"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","biology","academia",SEED_TAG], prompt:"___ refers to the stability of a species' genetic composition across generations in the absence of evolutionary forces.", correct:"Genetic equilibrium", wrong:["Natural selection","Genetic drift","Speciation"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","political-theory","academia",SEED_TAG], prompt:"___ theory holds that the state is justified insofar as it represents the rational agreement of free individuals.", correct:"Social contract", wrong:["Normative","Pluralist","Elitist"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","collocations","corporate",SEED_TAG], prompt:"The audit ___ several areas where internal controls could be strengthened.", correct:"flagged", wrong:["identified","highlighted","pinpointed"] },
  { cefrLevel:"C1", b:1.5, a:1.4, tags:["vocabulary","c1","literary-theory","academia",SEED_TAG], prompt:"The ___ fallacy is the error of judging a text by what the author intended rather than what the text actually says.", correct:"intentional", wrong:["pathetic","affective","biographical"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","business-strategy","corporate",SEED_TAG], prompt:"A company with a ___ advantage has capabilities or assets that competitors cannot easily replicate.", correct:"sustainable competitive", wrong:["first-mover","distinctive","strategic"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","media-studies","academia",SEED_TAG], prompt:"The ___ frame in news media presents events as the personal success or failure of political leaders.", correct:"strategy", wrong:["issue","conflict","human interest"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","collocations","language-schools",SEED_TAG], prompt:"The findings ___ the need for a comprehensive review of the current guidelines.", correct:"warrant", wrong:["justify","support","necessitate"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","chemistry","academia",SEED_TAG], prompt:"In chemistry, a ___ is a substance that speeds up a chemical reaction without being consumed in the process.", correct:"catalyst", wrong:["reagent","reactant","inhibitor"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","rhetorical-devices","academia",SEED_TAG], prompt:"The repetition of a word or phrase at the beginning of successive clauses is called ___.", correct:"anaphora", wrong:["epistrophe","chiasmus","asyndeton"] },
  { cefrLevel:"C1", b:1.5, a:1.4, tags:["vocabulary","c1","collocations","academia",SEED_TAG], prompt:"The paper ___ the assumption that higher GDP necessarily correlates with greater wellbeing.", correct:"interrogates", wrong:["questions","challenges","contests"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","economics","academia",SEED_TAG], prompt:"The ___ cost of an action is the value of the next best alternative foregone.", correct:"opportunity", wrong:["marginal","sunk","fixed"] },
  { cefrLevel:"C1", b:1.1, a:1.4, tags:["vocabulary","c1","political-economy","academia",SEED_TAG], prompt:"The concept of the ___ refers to the invisible boundaries that prevent women from advancing to top positions in organisations.", correct:"glass ceiling", wrong:["pay gap","old boys' network","bamboo ceiling"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","collocations","language-schools",SEED_TAG], prompt:"The debate ___ unresolved after three rounds of negotiation.", correct:"remained", wrong:["stayed","continued","stood"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","philosophy-of-science","academia",SEED_TAG], prompt:"Popper argued that scientific theories must be ___, meaning they could theoretically be shown to be false.", correct:"falsifiable", wrong:["verifiable","testable","reproducible"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","history","academia",SEED_TAG], prompt:"The ___ period in Western history typically refers to the late medieval era characterised by cultural and intellectual transformation.", correct:"Renaissance", wrong:["Reformation","Enlightenment","Baroque"] },
  { cefrLevel:"C1", b:1.5, a:1.4, tags:["vocabulary","c1","collocations","corporate",SEED_TAG], prompt:"The merger was subject to ___ scrutiny from the competition authority.", correct:"regulatory", wrong:["legal","financial","public"] },
  { cefrLevel:"C1", b:1.0, a:1.4, tags:["vocabulary","c1","adjectives","academia",SEED_TAG], prompt:"The relationship between the two variables is ___ — as one increases, the other decreases.", correct:"inverse", wrong:["indirect","negative","opposite"] },
  { cefrLevel:"C1", b:1.2, a:1.4, tags:["vocabulary","c1","collocations","academia",SEED_TAG], prompt:"The government's austerity measures drew widespread ___ from economists and civil society groups.", correct:"criticism", wrong:["opposition","condemnation","resistance"] },
  { cefrLevel:"C1", b:1.3, a:1.4, tags:["vocabulary","c1","verbs","corporate",SEED_TAG], prompt:"The new regulation will ___ companies to publish their environmental impact data annually.", correct:"oblige", wrong:["force","compel","require"] },
  { cefrLevel:"C1", b:1.4, a:1.4, tags:["vocabulary","c1","linguistics","academia",SEED_TAG], prompt:"A ___ is a unit of meaning that cannot be broken down into smaller meaningful parts (e.g., 'un-' in 'unhappy').", correct:"morpheme", wrong:["phoneme","lexeme","grapheme"] },
];

// ─── C2 ─────────────────────────────────────────────────────────
const C2: Item[] = [
  { cefrLevel:"C2", b:1.5, a:1.5, tags:["vocabulary","c2","philosophy","academia",SEED_TAG], prompt:"___ is the philosophical doctrine that reality is fundamentally composed of mental rather than material substances.", correct:"Idealism", wrong:["Materialism","Dualism","Phenomenalism"] },
  { cefrLevel:"C2", b:1.6, a:1.5, tags:["vocabulary","c2","linguistics","academia",SEED_TAG], prompt:"The ___ hypothesis proposes that the particular language you speak shapes the categories available to your thought.", correct:"Sapir-Whorf", wrong:["Chomsky-Saussure","Grice-Searle","Labov-Trudgill"] },
  { cefrLevel:"C2", b:1.7, a:1.5, tags:["vocabulary","c2","economics","academia",SEED_TAG], prompt:"In game theory, a ___ equilibrium is a set of strategies such that no player benefits from changing strategy unilaterally.", correct:"Nash", wrong:["Pareto","Stackelberg","minimax"] },
  { cefrLevel:"C2", b:1.8, a:1.5, tags:["vocabulary","c2","biology","academia",SEED_TAG], prompt:"___ describes the phenomenon whereby a single gene influences multiple, apparently unrelated phenotypic traits.", correct:"Pleiotropy", wrong:["Epistasis","Polygeny","Penetrance"] },
  { cefrLevel:"C2", b:1.9, a:1.5, tags:["vocabulary","c2","rhetoric","academia",SEED_TAG], prompt:"The deliberate omission of conjunctions between a series of related clauses is known as ___.", correct:"asyndeton", wrong:["polysyndeton","anaphora","chiasmus"] },
  { cefrLevel:"C2", b:2.0, a:1.5, tags:["vocabulary","c2","philosophy-of-mind","academia",SEED_TAG], prompt:"Chalmers' ___ problem asks why there is subjective experience at all, rather than merely information processing.", correct:"hard", wrong:["easy","explanatory","binding"] },
  { cefrLevel:"C2", b:2.0, a:1.5, tags:["vocabulary","c2","law","academia",SEED_TAG], prompt:"The doctrine of ___ prevents a party from asserting a legal right that is inconsistent with its previous conduct.", correct:"estoppel", wrong:["novation","subrogation","rectification"] },
  { cefrLevel:"C2", b:1.9, a:1.5, tags:["vocabulary","c2","literary-theory","academia",SEED_TAG], prompt:"In Derrida's deconstruction, ___ refers to the ceaseless deferral of meaning across signs.", correct:"différance", wrong:["logocentrism","supplement","trace"] },
  { cefrLevel:"C2", b:1.8, a:1.5, tags:["vocabulary","c2","economics","academia",SEED_TAG], prompt:"Keynes' concept of the ___ propensity to consume describes the fraction of additional income spent rather than saved.", correct:"marginal", wrong:["average","aggregate","effective"] },
  { cefrLevel:"C2", b:1.7, a:1.5, tags:["vocabulary","c2","physics","academia",SEED_TAG], prompt:"Heisenberg's ___ principle states that the position and momentum of a particle cannot both be precisely measured simultaneously.", correct:"uncertainty", wrong:["complementarity","superposition","entanglement"] },
  { cefrLevel:"C2", b:1.6, a:1.5, tags:["vocabulary","c2","political-theory","academia",SEED_TAG], prompt:"Rawls' difference principle holds that social inequalities are just only if they benefit the ___.", correct:"least advantaged members of society", wrong:["greatest number of people","those who contribute most","those born into poverty"] },
  { cefrLevel:"C2", b:1.5, a:1.5, tags:["vocabulary","c2","sociology","academia",SEED_TAG], prompt:"Bourdieu uses ___ to describe the dispositions, habits and tastes that individuals internalise through socialisation.", correct:"habitus", wrong:["doxa","field","symbolic capital"] },
  { cefrLevel:"C2", b:2.0, a:1.5, tags:["vocabulary","c2","medicine","academia",SEED_TAG], prompt:"A ___ is an agent that causes cancer by permanently mutating DNA.", correct:"carcinogen", wrong:["mutagen","pathogen","teratogen"] },
  { cefrLevel:"C2", b:1.9, a:1.5, tags:["vocabulary","c2","philosophy","academia",SEED_TAG], prompt:"The problem of ___ asks how conscious mental states can arise from or interact with physical brain states.", correct:"mind-body interaction", wrong:["free will","personal identity","other minds"] },
  { cefrLevel:"C2", b:1.8, a:1.5, tags:["vocabulary","c2","economics","academia",SEED_TAG], prompt:"The ___ problem in public economics arises when those who benefit from a good do not contribute to its cost.", correct:"free-rider", wrong:["principal-agent","public goods","externality"] },
  { cefrLevel:"C2", b:1.7, a:1.5, tags:["vocabulary","c2","computer-science","academia",SEED_TAG], prompt:"A ___ attack exploits software vulnerabilities present but unknown to the vendor, giving attackers a 'zero-day' advantage.", correct:"zero-day exploit", wrong:["brute force attack","SQL injection","phishing attack"] },
  { cefrLevel:"C2", b:1.6, a:1.5, tags:["vocabulary","c2","literary-criticism","academia",SEED_TAG], prompt:"The ___ fallacy, identified by Wimsatt and Beardsley, is the error of evaluating literature by its emotional effect on the reader.", correct:"affective", wrong:["intentional","biographical","genetic"] },
  { cefrLevel:"C2", b:2.0, a:1.5, tags:["vocabulary","c2","linguistics","academia",SEED_TAG], prompt:"___ refers to the principle that speakers cooperate to make their contributions relevant, truthful, clear and appropriately informative.", correct:"Grice's maxims", wrong:["speech act theory","relevance theory","politeness theory"] },
  { cefrLevel:"C2", b:1.9, a:1.5, tags:["vocabulary","c2","history","academia",SEED_TAG], prompt:"The ___ thesis proposes that the spirit of Protestantism — particularly Calvinist asceticism — was a significant cause of modern capitalism.", correct:"Weber's Protestant ethic", wrong:["Marx's base-superstructure","Durkheim's anomie","Tocqueville's tyranny of the majority"] },
  { cefrLevel:"C2", b:1.8, a:1.5, tags:["vocabulary","c2","epistemology","academia",SEED_TAG], prompt:"The ___ regress problem in epistemology asks what justifies the beliefs that justify other beliefs.", correct:"justification", wrong:["sceptical","infinite","foundationalist"] },
  { cefrLevel:"C2", b:1.7, a:1.5, tags:["vocabulary","c2","physics","academia",SEED_TAG], prompt:"In quantum mechanics, the ___ interpretation holds that the wave function represents only an observer's knowledge, not physical reality.", correct:"Copenhagen", wrong:["Many-worlds","Pilot wave","Relational"] },
  { cefrLevel:"C2", b:1.6, a:1.5, tags:["vocabulary","c2","law","academia",SEED_TAG], prompt:"___ jurisdiction allows courts to hear a case regardless of where the crime occurred if it involves serious international offences.", correct:"Universal", wrong:["Extraterritorial","Concurrent","Exclusive"] },
  { cefrLevel:"C2", b:2.0, a:1.5, tags:["vocabulary","c2","rhetoric","academia",SEED_TAG], prompt:"Antanaclasis is a rhetorical device involving the ___ of the same word in two different senses.", correct:"repetition", wrong:["contrast","substitution","inversion"] },
  { cefrLevel:"C2", b:1.9, a:1.5, tags:["vocabulary","c2","political-science","academia",SEED_TAG], prompt:"___ theory in international relations holds that states are primarily motivated by the desire to maintain or increase power relative to other states.", correct:"Realist", wrong:["Liberal institutionalist","Constructivist","Normative"] },
  { cefrLevel:"C2", b:1.8, a:1.5, tags:["vocabulary","c2","philosophy","academia",SEED_TAG], prompt:"The ___ problem asks whether we can ever have knowledge of the external world, given that all our evidence is ultimately perceptual.", correct:"scepticism about the external world", wrong:["problem of induction","paradox of the heap","Gettier problem"] },
  { cefrLevel:"C2", b:1.5, a:1.5, tags:["vocabulary","c2","biology","academia",SEED_TAG], prompt:"___ refers to molecular changes in gene expression that do not involve changes to the underlying DNA sequence.", correct:"Epigenetics", wrong:["Genomics","Proteomics","Transcriptomics"] },
  { cefrLevel:"C2", b:1.6, a:1.5, tags:["vocabulary","c2","sociology","academia",SEED_TAG], prompt:"Foucault's concept of ___ describes dispersed mechanisms of power operating through institutions, knowledge and discourse.", correct:"governmentality", wrong:["biopower","discipline","surveillance"] },
  { cefrLevel:"C2", b:1.7, a:1.5, tags:["vocabulary","c2","economics","academia",SEED_TAG], prompt:"A ___ good is both non-excludable (cannot prevent anyone from using it) and non-rival (one person's use does not reduce availability).", correct:"pure public", wrong:["club","common-pool","merit"] },
  { cefrLevel:"C2", b:1.8, a:1.5, tags:["vocabulary","c2","literary-theory","academia",SEED_TAG], prompt:"Bakhtin's concept of ___ refers to the existence of multiple, often conflicting voices and perspectives within a single text.", correct:"polyphony", wrong:["dialogism","heteroglossia","carnivalesque"] },
  { cefrLevel:"C2", b:2.0, a:1.5, tags:["vocabulary","c2","neuroscience","academia",SEED_TAG], prompt:"___ plasticity refers to the brain's ability to reorganise its structure and function in response to experience and injury.", correct:"Synaptic", wrong:["Neural", "Cortical","Functional"] },
  { cefrLevel:"C2", b:1.9, a:1.5, tags:["vocabulary","c2","philosophy-of-science","academia",SEED_TAG], prompt:"Kuhn argued that science progresses through ___ shifts rather than gradual accumulation of knowledge.", correct:"paradigm", wrong:["theoretical","epistemic","conceptual"] },
  { cefrLevel:"C2", b:1.7, a:1.5, tags:["vocabulary","c2","political-philosophy","academia",SEED_TAG], prompt:"Isaiah Berlin distinguished between ___ liberty (freedom from external constraints) and ___ liberty (freedom to achieve self-realisation).", correct:"negative and positive", wrong:["formal and substantive","civil and political","natural and artificial"] },
  { cefrLevel:"C2", b:1.6, a:1.5, tags:["vocabulary","c2","linguistics","academia",SEED_TAG], prompt:"In speech act theory, an ___ act is the action performed by uttering a sentence (e.g., promising, warning, asserting).", correct:"illocutionary", wrong:["locutionary","perlocutionary","propositional"] },
  { cefrLevel:"C2", b:2.0, a:1.5, tags:["vocabulary","c2","logic","academia",SEED_TAG], prompt:"In modal logic, a proposition is ___ possible if it is true in at least one possible world.", correct:"logically", wrong:["empirically","nomologically","metaphysically"] },
  { cefrLevel:"C2", b:1.5, a:1.5, tags:["vocabulary","c2","ethics","academia",SEED_TAG], prompt:"The doctrine of ___ states that performing a good action is permissible even if a harmful side-effect is foreseen, provided the harm is not intended as a means.", correct:"double effect", wrong:["lesser evil","supererogation","precautionary principle"] },
  { cefrLevel:"C2", b:1.8, a:1.5, tags:["vocabulary","c2","mathematics","academia",SEED_TAG], prompt:"Gödel's ___ theorem proves that in any sufficiently complex formal system, there exist true statements that cannot be proved within that system.", correct:"incompleteness", wrong:["decidability","completeness","consistency"] },
  { cefrLevel:"C2", b:1.7, a:1.5, tags:["vocabulary","c2","collocations","academia",SEED_TAG], prompt:"The paper ___ the conventional assumption and proposes an entirely different explanatory framework.", correct:"subverts", wrong:["contests","challenges","undermines"] },
  { cefrLevel:"C2", b:1.6, a:1.5, tags:["vocabulary","c2","economics","academia",SEED_TAG], prompt:"In behavioural economics, ___ refers to the tendency to prefer avoiding losses over acquiring equivalent gains.", correct:"loss aversion", wrong:["risk aversion","hyperbolic discounting","anchoring"] },
  { cefrLevel:"C2", b:1.5, a:1.5, tags:["vocabulary","c2","history-of-ideas","academia",SEED_TAG], prompt:"The ___ movement in 18th-century Europe championed reason, science and individual liberty against tradition and religious authority.", correct:"Enlightenment", wrong:["Romanticism","Positivism","Idealism"] },
  { cefrLevel:"C2", b:1.9, a:1.5, tags:["vocabulary","c2","rhetoric-of-science","academia",SEED_TAG], prompt:"Scientists use ___ hedging language (e.g., 'it appears', 'may suggest') to signal appropriate epistemic uncertainty.", correct:"epistemic", wrong:["formal","academic","cautionary"] },
];

// ─── helpers ────────────────────────────────────────────────────
function rotateOptions(correct: string, wrong: [string, string, string], pos: number) {
  const all = [correct, wrong[0], wrong[1], wrong[2]];
  const slot = pos % 4;
  return [0, 1, 2, 3].map((ui) => {
    const src = (ui - slot + 4) % 4;
    return {
      text: all[src]!,
      isCorrect: src === 0,
      rationale: src === 0 ? "Correct answer." : "Plausible distractor in this context.",
    };
  });
}

async function main() {
  if (!process.env.DATABASE_URL) { console.error("❌ DATABASE_URL not set"); process.exit(1); }

  const all = [...A1, ...A2, ...B1, ...B2, ...C1, ...C2];

  if (process.env.DRY_RUN === "1") {
    const counts: Record<string, number> = {};
    for (const i of all) counts[i.cefrLevel] = (counts[i.cefrLevel] || 0) + 1;
    console.log(`DRY_RUN: would insert ${all.length} vocabulary items`);
    console.table(counts);
    return;
  }

  if (process.env.FORCE === "1") {
    const del = await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`🗑  Deleted ${del.count} existing [${SEED_TAG}] items`);
  }

  const existing = await prisma.item.count({ where: { tags: { has: SEED_TAG } } });
  if (existing > 0 && process.env.FORCE !== "1") {
    console.log(`⚠️  ${existing} items already seeded. Use FORCE=1 to re-seed.`);
    return;
  }

  let pos = 0;
  for (const item of all) {
    await prisma.item.create({
      data: {
        skill: "VOCABULARY",
        cefrLevel: item.cefrLevel as any,
        type: "MULTIPLE_CHOICE",
        status: "ACTIVE",
        difficulty: item.b,
        discrimination: item.a,
        guessing: 0.25,
        tags: item.tags,
        content: {
          prompt: item.prompt,
          options: rotateOptions(item.correct, item.wrong, pos),
        },
      },
    });
    pos++;
  }

  const counts: Record<string, number> = {};
  for (const i of all) counts[i.cefrLevel] = (counts[i.cefrLevel] || 0) + 1;
  console.log(`\n✅  Inserted ${all.length} vocabulary items`);
  console.table(counts);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
