/**
 * READING — Phase 4: Expansion (142 items, A2–C2)
 *
 * 20 passages × 6–7 questions each.
 * Distribution added: A2=12, B1=24, B2=42+7=49, C1=35, C2=21 = 141 approx
 *
 *   npx tsx scripts/seed-reading-phase4.ts
 *   DRY_RUN=1 npx tsx scripts/seed-reading-phase4.ts
 *   FORCE=1 npx tsx scripts/seed-reading-phase4.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { validateItemBatch, reportValidationResults } from "./_validation-helper.js";

const prisma = new PrismaClient();
const SEED_TAG = "seed-reading-phase4";

type Opt = { text: string; isCorrect: boolean; rationale: string };
type ReadingItem = {
  cefrLevel: string;
  b: number;
  a: number;
  c: number;
  tags: string[];
  passageId: string;
  passage: string;
  question: string;
  options: Opt[];
};

function q(
  passageId: string,
  passage: string,
  cefrLevel: string,
  b: number,
  a: number,
  c: number,
  tags: string[],
  question: string,
  correctText: string,
  correctRationale: string,
  wrongs: [string, string, string]
): ReadingItem {
  const options: Opt[] = [
    { text: correctText, isCorrect: true, rationale: correctRationale },
    { text: wrongs[0], isCorrect: false, rationale: "Plausible distractor." },
    { text: wrongs[1], isCorrect: false, rationale: "Plausible distractor." },
    { text: wrongs[2], isCorrect: false, rationale: "Plausible distractor." },
  ];
  return { cefrLevel, b, a, c, tags: [...tags, SEED_TAG], passageId, passage, question, options };
}

// ══════════════════════════════════════════════════════════════
// P01 — A2 (6 items) School Library
// ══════════════════════════════════════════════════════════════
const P01_TEXT = `The school library at Westfield Academy is open every day from 8 a.m. to 5 p.m. Students can borrow up to four books at a time and keep them for two weeks. If a student wants to keep a book for longer, they can renew it once by speaking to the librarian or using the school website.

The library also has thirty computers that students can use to do research. These computers are available on a first-come, first-served basis, which means students cannot book them in advance.

Every Thursday lunchtime, the library runs a reading club where students share their favourite books and discuss them. Membership of the reading club is free, and any student can join. Last year, over eighty students participated, and the club won an award from the local council.`;

const P01 = [
  q("ph4-P01","","A2",-1.4,1.1,0.20,["reading","a2","detail","junior"],"What is the maximum number of books a student can borrow at one time?","Four","The passage states students can borrow up to four books at a time.",["Two","Six","Eight"]),
  q("ph4-P01","","A2",-1.3,1.1,0.20,["reading","a2","detail","junior"],"How can a student renew a borrowed book?","By speaking to the librarian or using the school website","The passage explicitly states both renewal options.",["By emailing a teacher","By returning it and borrowing it again","By visiting the school office"]),
  q("ph4-P01","","A2",-1.2,1.1,0.20,["reading","a2","vocabulary","junior"],"What does 'first-come, first-served' mean for the computers?","Students who arrive first get to use the computers","The passage clarifies computers cannot be booked in advance, so arrival order determines access.",["Students take turns","Older students have priority","Students with homework get priority"]),
  q("ph4-P01","","A2",-1.1,1.1,0.20,["reading","a2","detail","junior"],"When does the reading club meet?","Every Thursday lunchtime","The passage states 'every Thursday lunchtime'.",["Every Monday morning","Every Wednesday afternoon","Every Friday evening"]),
  q("ph4-P01","","A2",-1.0,1.1,0.20,["reading","a2","inference","junior"],"Which statement about the reading club is TRUE?","Students join for free and can discuss their favourite books","The passage says membership is free and students share and discuss books.",["Only top students can join","Students must pay a small fee","The club meets every day"]),
  q("ph4-P01","","A2",-0.9,1.1,0.20,["reading","a2","main-idea","junior"],"What is the main purpose of this text?","To inform students about the library's services and activities","The text describes rules, facilities, and events at the school library.",["To persuade students to read more","To compare libraries","To advertise the school"]),
];
P01[0].passage = P01_TEXT;

// ══════════════════════════════════════════════════════════════
// P02 — A2 (6 items) Healthy Eating at School
// ══════════════════════════════════════════════════════════════
const P02_TEXT = `Many schools around the world are changing the food they serve to students. In the past, canteens often sold chips, burgers, and fizzy drinks. Now, many schools offer fresh salads, fruit, wholegrain sandwiches, and water.

Research shows that students who eat healthily are better able to concentrate in lessons and perform well in tests. Teachers at Greenhill School noticed that after changing the canteen menu, students were more focused and less tired in the afternoons.

Some students were unhappy at first because they missed their favourite foods. However, after a few weeks, most of them said they actually preferred the new food and felt more energetic.

Parents have also reacted positively. In a recent survey, 78% of parents said they supported the changes.`;

const P02 = [
  q("ph4-P02","","A2",-1.4,1.1,0.20,["reading","a2","detail","language-schools"],"What did school canteens often sell in the past?","Chips, burgers, and fizzy drinks","The second sentence explicitly lists these items.",["Salads, fruit, and water","Wholegrain sandwiches","Healthy soups"]),
  q("ph4-P02","","A2",-1.3,1.1,0.20,["reading","a2","inference","language-schools"],"Why did teachers at Greenhill School notice an improvement?","Because students were eating healthier food","The text links the menu change to improved focus.",["Because classes became shorter","Because students had more exercise","Because the school bought new computers"]),
  q("ph4-P02","","A2",-1.2,1.1,0.20,["reading","a2","vocabulary","language-schools"],"What does 'energetic' most likely mean?","Having a lot of energy and feeling active","Context shows students felt better and less tired after eating well.",["Feeling sad and tired","Being very clever","Feeling nervous"]),
  q("ph4-P02","","A2",-1.1,1.1,0.20,["reading","a2","detail","language-schools"],"What percentage of parents supported the menu changes?","78%","The text states this figure directly.",["65%","82%","50%"]),
  q("ph4-P02","","A2",-1.0,1.1,0.20,["reading","a2","inference","language-schools"],"How did most students feel about the new food after a few weeks?","They preferred it and felt more energetic","The text says 'most of them said they actually preferred the new food'.",["They were still unhappy","They demanded the old menu back","They only ate it because teachers told them to"]),
  q("ph4-P02","","A2",-0.9,1.1,0.20,["reading","a2","main-idea","language-schools"],"What is the passage mainly about?","How schools are improving students' health by changing canteen food","The whole passage describes this change and its effects.",["Why students dislike healthy food","How to cook healthy meals","Problems with school funding"]),
];
P02[0].passage = P02_TEXT;

// ══════════════════════════════════════════════════════════════
// P03 — B1 (6 items) Remote Work
// ══════════════════════════════════════════════════════════════
const P03_TEXT = `Remote work — also known as working from home or telecommuting — has grown dramatically in recent years. A survey carried out in 2023 found that around 30% of workers in developed countries now work remotely at least part of the time.

Proponents argue that it reduces commuting time, increases flexibility, and can improve work-life balance. Many employees report feeling less stressed and more productive when working from home.

However, critics point out several disadvantages. Working alone can lead to feelings of isolation and disconnection from colleagues. Some managers also worry that employees are harder to supervise remotely, which can affect overall team performance.

Most experts agree that a hybrid model — combining remote and office-based work — offers the best of both worlds. This approach allows employees to enjoy flexibility while maintaining the social and collaborative benefits of working in an office.`;

const P03 = [
  q("ph4-P03","","B1",-0.4,1.2,0.20,["reading","b1","detail","language-schools"],"What percentage of workers in developed countries worked remotely at least part of the time in 2023?","Around 30%","The text directly states this figure.",["Around 10%","Around 50%","Around 70%"]),
  q("ph4-P03","","B1",-0.3,1.2,0.20,["reading","b1","vocabulary","language-schools"],"What does 'proponents' mean?","People who support or are in favour of something","Proponents argue for the advantages of remote work.",["People who research something","People who manage something","People who criticise something"]),
  q("ph4-P03","","B1",-0.2,1.2,0.20,["reading","b1","detail","corporate"],"Which of the following is given as a disadvantage of remote work?","Feelings of isolation from colleagues","The text explicitly mentions this as a drawback.",["Longer commuting times","Reduced flexibility","Higher costs"]),
  q("ph4-P03","","B1",-0.1,1.2,0.20,["reading","b1","inference","corporate"],"Why do some managers worry about remote work?","Because it is more difficult to supervise employees","The text says managers worry employees are 'harder to supervise remotely'.",["Because employees earn more","Because remote work requires expensive equipment","Because employees work more hours"]),
  q("ph4-P03","","B1",0.0,1.2,0.20,["reading","b1","inference","language-schools"],"What does a 'hybrid model' of work combine?","Remote work and office-based work","The passage defines the hybrid model as combining these two approaches.",["Part-time and full-time work","Freelance and employed work","Domestic and international work"]),
  q("ph4-P03","","B1",0.1,1.2,0.20,["reading","b1","main-idea","language-schools"],"What is the overall message of this text?","Remote work has both benefits and drawbacks, and a hybrid approach may be ideal","The text presents arguments for and against, then recommends a hybrid model.",["Remote work is always better","Office work is more productive","Remote work has caused serious social problems"]),
];
P03[0].passage = P03_TEXT;

// ══════════════════════════════════════════════════════════════
// P04 — B1 (6 items) Urban Gardening
// ══════════════════════════════════════════════════════════════
const P04_TEXT = `Urban gardening is the practice of growing plants, vegetables, and herbs in city environments. It takes place on balconies, rooftops, community plots, and even inside buildings using hydroponic systems that require no soil.

The movement has gained momentum as more people have become concerned about food security, sustainability, and mental health. Gardening in cities helps reduce the distance food must travel from farm to table, which lowers carbon emissions. It also provides green spaces in otherwise concrete-dominated environments, which has been shown to reduce stress.

Community gardens have social benefits beyond food production. They bring together people of different ages and backgrounds, fostering a sense of belonging. In one study from Berlin, participants reported a significant improvement in social connectedness.

Despite these advantages, urban gardening faces challenges. Land in cities is expensive and limited. Pollution can contaminate soil, and not all buildings are structurally suitable for rooftop growing. Nevertheless, many city governments are now actively supporting urban farming through grants and planning policies.`;

const P04 = [
  q("ph4-P04","","B1",-0.5,1.2,0.20,["reading","b1","vocabulary","language-schools"],"What is a 'hydroponic system'?","A method of growing plants without soil","The passage defines it as a system that 'requires no soil'.",["A system that recycles water","A type of greenhouse","A method of composting"]),
  q("ph4-P04","","B1",-0.4,1.2,0.20,["reading","b1","detail","language-schools"],"According to the passage, how does urban gardening help the environment?","It reduces the distance food travels, lowering carbon emissions","The text explicitly states this environmental benefit.",["It eliminates the need for pesticides","It produces energy from plant waste","It cleans polluted air"]),
  q("ph4-P04","","B1",-0.3,1.2,0.20,["reading","b1","inference","language-schools"],"What does the Berlin study suggest about community gardens?","They help people feel more socially connected","The study showed 'significant improvement in social connectedness'.",["They produce more food than commercial farms","They reduce crime","They are more affordable than shops"]),
  q("ph4-P04","","B1",-0.2,1.2,0.20,["reading","b1","detail","language-schools"],"Which of the following is mentioned as a challenge for urban gardening?","Soil contamination from pollution","The passage mentions 'pollution can contaminate soil'.",["Lack of interest from young people","Insufficient sunlight","High cost of hydroponic equipment"]),
  q("ph4-P04","","B1",-0.1,1.2,0.20,["reading","b1","inference","language-schools"],"What does 'gained momentum' suggest about urban gardening?","It has become increasingly popular","'Gained momentum' means it has grown in speed and popularity.",["It has faced increasing opposition","It has declined in importance","It has become highly commercialised"]),
  q("ph4-P04","","B1",0.0,1.2,0.20,["reading","b1","main-idea","language-schools"],"What is the passage mainly arguing?","Urban gardening offers environmental, social, and health benefits despite practical difficulties","The passage covers multiple benefits and then acknowledges challenges.",["Urban gardening should replace traditional farming","City governments should ban development on green spaces","Community gardens cause problems in cities"]),
];
P04[0].passage = P04_TEXT;

// ══════════════════════════════════════════════════════════════
// P05 — B1 (6 items) Sleep and Academic Performance
// ══════════════════════════════════════════════════════════════
const P05_TEXT = `Sleep plays a crucial role in learning and memory. During sleep, the brain consolidates information absorbed during the day, moving it from short-term to long-term memory. Research suggests that students who consistently sleep between eight and ten hours per night perform significantly better in exams.

Despite this, many teenagers and university students are chronically sleep-deprived. Common causes include late-night screen use, academic pressure, and irregular sleep schedules. A 2022 study found that 60% of university students in the UK reported sleeping fewer than seven hours on weeknights.

The consequences extend beyond poor exam results. Sleep deprivation has been linked to increased anxiety, difficulty concentrating, impaired decision-making, and weakened immune function. Some researchers argue that smartphones have worsened the situation by disrupting the melatonin cycle, which regulates the body's sleep-wake rhythms.

Experts recommend creating a consistent bedtime routine, reducing screen time in the hour before sleep, and keeping the bedroom cool and dark.`;

const P05 = [
  q("ph4-P05","","B1",-0.3,1.2,0.20,["reading","b1","detail","academia"],"What happens to information in the brain during sleep?","It is moved from short-term to long-term memory","The text explicitly describes this process.",["It is completely forgotten","It is processed into new ideas","It is transmitted to the body"]),
  q("ph4-P05","","B1",-0.2,1.2,0.20,["reading","b1","detail","academia"],"According to the 2022 study, what percentage of UK university students slept fewer than seven hours on weeknights?","60%","The passage states this figure directly.",["40%","75%","50%"]),
  q("ph4-P05","","B1",-0.1,1.2,0.20,["reading","b1","vocabulary","academia"],"What does 'chronically sleep-deprived' mean?","Regularly not getting enough sleep over a long period","'Chronically' means over a long period; 'sleep-deprived' means lacking adequate sleep.",["Occasionally staying up late","Sleeping at different times each night","Having trouble falling asleep once"]),
  q("ph4-P05","","B1",0.0,1.2,0.20,["reading","b1","inference","academia"],"Why do some researchers think smartphones have worsened sleep problems?","Because they disrupt the melatonin cycle that controls sleep","The text says smartphones disrupt the melatonin cycle that regulates sleep-wake rhythms.",["Because they cause students to study less","Because they produce noise","Because they increase academic pressure"]),
  q("ph4-P05","","B1",0.1,1.2,0.20,["reading","b1","detail","junior"],"Which of the following is NOT listed as a recommended way to improve sleep?","Taking a nap during the day","The text recommends a consistent routine, less screen time, and a cool dark room — not napping.",["Creating a consistent bedtime routine","Reducing screen time before sleep","Keeping the bedroom cool and dark"]),
  q("ph4-P05","","B1",0.2,1.2,0.20,["reading","b1","main-idea","academia"],"What is the main argument of this passage?","Insufficient sleep seriously harms students' learning and health, and the problem is widespread","The text explains sleep's learning role, documents the scale of deprivation, and outlines consequences.",["Students should study less to sleep more","Smartphones are the sole cause of poor academic results","Parents are responsible for ensuring children sleep well"]),
];
P05[0].passage = P05_TEXT;

// ══════════════════════════════════════════════════════════════
// P06 — B1 (6 items) Digital Literacy
// ══════════════════════════════════════════════════════════════
const P06_TEXT = `Digital literacy refers to the ability to use, evaluate, and create information using digital technologies. It goes beyond simply knowing how to operate a device; it involves understanding how to find reliable information, identify misinformation, protect personal data, and communicate effectively in digital environments.

As the internet has become central to daily life, digital literacy has become as essential as reading and writing. Employers increasingly expect workers to be confident with spreadsheets, cloud software, and online communication tools. Schools are therefore under pressure to integrate digital skills into the curriculum from an early age.

However, digital literacy education faces significant obstacles. Teachers often lack adequate training, and equipment in schools can be outdated. Furthermore, students from lower-income families may have limited access to devices and reliable internet at home, creating what researchers call the 'digital divide'.

Addressing this divide requires coordinated efforts from governments, schools, and private technology companies. Without such intervention, the gap between digitally literate and excluded populations is likely to widen.`;

const P06 = [
  q("ph4-P06","","B1",-0.4,1.2,0.20,["reading","b1","vocabulary","language-schools"],"According to the passage, what does digital literacy involve beyond knowing how to use a device?","Finding reliable information, identifying misinformation, and communicating effectively online","The passage lists these skills as part of digital literacy.",["Programming computers and creating apps","Writing code and designing websites","Using social media effectively"]),
  q("ph4-P06","","B1",-0.3,1.2,0.20,["reading","b1","detail","language-schools"],"Why are schools under pressure to integrate digital skills into the curriculum?","Because employers expect workers to be confident with digital tools","The text explains this connection directly.",["Because digital skills are tested in national exams","Because students demand to use technology in class","Because digital tools replace traditional textbooks"]),
  q("ph4-P06","","B1",-0.2,1.2,0.20,["reading","b1","vocabulary","academia"],"What does the phrase 'digital divide' mean?","The gap between those who have digital access and those who do not","Researchers use this term to describe unequal access to devices and the internet.",["The difference between online and offline learning","The gap between young and old technology users","The difference between professional and personal technology use"]),
  q("ph4-P06","","B1",-0.1,1.2,0.20,["reading","b1","detail","academia"],"Which of the following is mentioned as an obstacle to digital literacy education?","Teachers lacking adequate training","The passage explicitly mentions this challenge.",["Students preferring traditional learning","High cost of internet access for schools","Lack of digital literacy standards worldwide"]),
  q("ph4-P06","","B1",0.0,1.2,0.20,["reading","b1","inference","language-schools"],"What does the author suggest will happen if the digital divide is not addressed?","The gap between digitally literate and excluded populations will grow wider","The final sentence states this outcome directly.",["Technology companies will stop supporting schools","Governments will reduce education spending","Digital literacy will become less important"]),
  q("ph4-P06","","B1",0.1,1.2,0.20,["reading","b1","main-idea","language-schools"],"What is the writer's main concern?","That unequal access to digital skills threatens social equality","The passage describes the digital divide and warns about widening inequality.",["That digital technology is replacing traditional skills","That social media is harmful to young people","That technology companies have too much power"]),
];
P06[0].passage = P06_TEXT;

// ══════════════════════════════════════════════════════════════
// P07 — B2 (7 items) Microplastics
// ══════════════════════════════════════════════════════════════
const P07_TEXT = `Microplastics — plastic particles smaller than five millimetres — have permeated virtually every marine environment on Earth. They originate from a range of sources: the breakdown of larger plastic debris, synthetic fibres shed during laundry, cosmetic microbeads, and industrial pellets known as nurdles. Once released into waterways, they are almost impossible to remove at scale.

The ecological consequences are profound. Marine organisms from plankton to whales ingest microplastics, which can cause physical blockage of digestive systems and introduce toxic compounds into biological tissues. These toxins — including persistent organic pollutants that adsorb to plastic surfaces — accumulate through the food chain in a process known as biomagnification, ultimately reaching human consumers of seafood.

Recent studies have detected microplastics in human blood, lung tissue, and placental samples, raising urgent questions about long-term health implications. Preliminary evidence associates plastic particle exposure with inflammatory responses and potential endocrine disruption, though causal relationships remain difficult to establish given the complexity of confounding variables.

Policy responses have been slow. Several countries have banned single-use plastics and cosmetic microbeads, but global coordination remains insufficient. Researchers argue that meaningful progress requires binding international agreements, investment in biodegradable alternatives, and redesigning waste management systems to prevent primary plastic leakage into ecosystems.`;

const P07 = [
  q("ph4-P07","","B2",0.5,1.3,0.15,["reading","b2","vocabulary","academia"],"What does 'permeated' mean as used in the first sentence?","Spread throughout and penetrated","'Permeated' means spread into and through something completely.",["Contaminated severely","Accumulated rapidly","Damaged permanently"]),
  q("ph4-P07","","B2",0.6,1.3,0.15,["reading","b2","detail","academia"],"What is 'biomagnification'?","The accumulation of toxins through the food chain","The passage defines biomagnification as the accumulation of toxic compounds through the food chain.",["The breakdown of plastic into smaller particles","The process by which organisms filter microplastics","The spread of microplastics through ocean currents"]),
  q("ph4-P07","","B2",0.7,1.3,0.15,["reading","b2","inference","academia"],"Why is it difficult to establish that microplastic exposure causes health problems?","Because there are many confounding variables that complicate the evidence","The passage states 'causal relationships remain difficult to establish given the complexity of confounding variables'.",["Because humans are rarely exposed to microplastics","Because research into this area is prohibited","Because microplastics leave the body quickly"]),
  q("ph4-P07","","B2",0.8,1.3,0.15,["reading","b2","detail","academia"],"Which of the following sources of microplastics is mentioned in the passage?","Synthetic fibres shed during laundry","The passage explicitly lists this as one of the sources.",["Decomposing natural materials","Exhaust fumes from vehicles","Agricultural fertilisers"]),
  q("ph4-P07","","B2",0.9,1.3,0.15,["reading","b2","inference","academia"],"What does the author imply about current policy responses to microplastic pollution?","They are inadequate and lack the international coordination needed","The passage says responses 'have been slow' and global coordination 'remains insufficient'.",["They have successfully reduced plastic waste","They are well-funded but poorly implemented","They focus too heavily on industrial sources"]),
  q("ph4-P07","","B2",1.0,1.3,0.15,["reading","b2","vocabulary","academia"],"The passage uses the word 'adsorb'. Based on context, what does this mean?","Stick to the surface of a material","Persistent organic pollutants 'adsorb to plastic surfaces', meaning they attach to the surface.",["Break down over time","React chemically with","Dissolve into"]),
  q("ph4-P07","","B2",1.1,1.3,0.15,["reading","b2","main-idea","academia"],"What is the central argument of the passage?","Microplastics pose serious ecological and health risks that current policies are failing to address adequately","The passage covers sources, ecological damage, health risks, and inadequate policy responses.",["The ocean must be cleaned within ten years","Microplastics primarily affect marine rather than human health","The plastics industry should fund all environmental clean-up"]),
];
P07[0].passage = P07_TEXT;

// ══════════════════════════════════════════════════════════════
// P08 — B2 (7 items) The Gig Economy
// ══════════════════════════════════════════════════════════════
const P08_TEXT = `The gig economy describes labour markets characterised by short-term, flexible, and freelance work rather than permanent employment. Platforms such as ride-hailing apps, food delivery services, and freelance marketplaces have enabled this model by connecting workers with customers digitally, bypassing traditional employment relationships.

For some workers, particularly those seeking supplementary income or greater autonomy, the gig economy offers genuine advantages: flexible hours, the ability to work for multiple clients simultaneously, and freedom from bureaucratic workplace constraints. However, critics argue that flexibility often comes at a significant cost. Gig workers typically lack access to statutory employment rights such as paid leave, sick pay, pension contributions, and protection from unfair dismissal.

The legal status of gig workers has become highly contested. Courts in several jurisdictions have ruled that platform workers deserve greater protections. In 2021, the UK Supreme Court determined that Uber drivers should be classified as workers rather than self-employed contractors, entitling them to minimum wage and holiday pay.

Proponents of stricter regulation argue that the current model externalises labour costs onto workers and the state. Opponents counter that imposing employment obligations on platforms will raise costs for consumers and reduce work opportunities. Finding a regulatory balance that protects vulnerable workers without stifling innovation remains the central policy challenge.`;

const P08 = [
  q("ph4-P08","","B2",0.5,1.3,0.15,["reading","b2","vocabulary","corporate"],"What does 'externalises labour costs' mean?","Shifts costs that employers would normally bear onto workers or taxpayers","Externalising costs means transferring them to others — workers and the state.",["Reduces the total costs of production","Calculates labour costs more accurately","Moves manufacturing abroad to reduce wages"]),
  q("ph4-P08","","B2",0.6,1.3,0.15,["reading","b2","detail","corporate"],"What did the UK Supreme Court decide in 2021?","That Uber drivers should be classified as workers, not self-employed","The passage states this ruling directly.",["That food delivery platforms must provide insurance","That all gig workers are entitled to full employment rights","That ride-hailing apps must obtain special licences"]),
  q("ph4-P08","","B2",0.7,1.3,0.15,["reading","b2","detail","language-schools"],"Which of the following is listed as an advantage of gig work for some workers?","Flexible hours and the ability to work for multiple clients","The passage explicitly lists these as advantages.",["Access to pension contributions and sick pay","Job security and career progression","Regular income and permanent contracts"]),
  q("ph4-P08","","B2",0.8,1.3,0.15,["reading","b2","inference","corporate"],"What concern do opponents of stricter regulation raise?","That new obligations would increase consumer costs and reduce job opportunities","The passage states opponents argue this would 'raise costs for consumers and reduce work opportunities'.",["That workers would leave platforms","That regulation would benefit large corporations","That courts would be unable to enforce new rules"]),
  q("ph4-P08","","B2",0.9,1.3,0.15,["reading","b2","vocabulary","language-schools"],"What does 'contested' mean as used in the passage?","Disputed or argued about","The legal status is 'highly contested' — subject to significant disagreement.",["Clearly defined and established","Recently changed","Widely accepted"]),
  q("ph4-P08","","B2",1.0,1.3,0.15,["reading","b2","inference","corporate"],"What can be inferred about digital platforms in the gig economy?","They allow employers to avoid traditional employment responsibilities","By 'bypassing traditional employment relationships', platforms avoid obligations that come with standard contracts.",["They provide better training than traditional employers","They primarily employ highly skilled professionals","They are regulated more strictly than other businesses"]),
  q("ph4-P08","","B2",1.1,1.3,0.15,["reading","b2","main-idea","corporate"],"Which statement best summarises the passage?","The gig economy offers flexibility but raises serious questions about workers' rights and the appropriate regulatory response","The text presents both advantages and disadvantages, then focuses on the regulatory challenge.",["Gig work is beneficial for the economy","Courts have successfully resolved disputes about gig worker status","The gig economy will eventually replace traditional employment"]),
];
P08[0].passage = P08_TEXT;

// ══════════════════════════════════════════════════════════════
// P09 — B2 (7 items) AI in Healthcare
// ══════════════════════════════════════════════════════════════
const P09_TEXT = `Artificial intelligence is transforming healthcare by analysing vast datasets to detect patterns that human clinicians may miss. Machine learning algorithms trained on millions of medical images have demonstrated diagnostic accuracy comparable to — and in some cases exceeding — that of experienced specialists. In diabetic retinopathy screening, AI systems have achieved sensitivity rates above 90%, reducing the burden on ophthalmologists and enabling earlier intervention.

Beyond diagnostics, AI is being applied to drug discovery, personalised treatment planning, and hospital operations. Natural language processing tools extract clinically relevant information from unstructured patient records, while predictive models flag patients at high risk of readmission or deterioration.

Nevertheless, the deployment of AI in clinical settings raises important ethical and practical concerns. Algorithmic bias — arising when training data does not adequately represent diverse patient populations — can produce discriminatory outcomes. A 2019 study found that an AI system used in US hospitals systematically underestimated the medical needs of Black patients because it used health costs as a proxy for need.

Data privacy is another significant consideration. AI systems require large, often sensitive datasets, and there is ongoing debate about who owns patient data and how securely it can be stored across healthcare networks.

Regulators and health systems must therefore develop robust governance frameworks to ensure that AI deployment enhances equity and safety rather than entrenching existing disparities.`;

const P09 = [
  q("ph4-P09","","B2",0.5,1.3,0.15,["reading","b2","detail","academia"],"In diabetic retinopathy screening, what achievement is attributed to AI?","Achieving sensitivity rates above 90%","The passage states AI systems achieved 'sensitivity rates above 90%' in this area.",["Replacing all ophthalmologists in clinics","Reducing treatment costs by over half","Diagnosing conditions previously undetectable"]),
  q("ph4-P09","","B2",0.6,1.3,0.15,["reading","b2","vocabulary","academia"],"What does 'algorithmic bias' refer to?","When AI systems produce unfair outcomes because training data does not represent all groups equally","The passage defines this as arising when training data fails to represent diverse populations.",["When AI systems make random errors","When AI systems are deliberately programmed to favour certain groups","When AI systems process data more slowly for some patients"]),
  q("ph4-P09","","B2",0.7,1.3,0.15,["reading","b2","detail","academia"],"What flaw was found in the 2019 US hospital AI study?","It underestimated Black patients' medical needs because it used health costs as a proxy for need","The passage describes this specific finding directly.",["It incorrectly predicted readmission rates","It failed to process non-English records","It was less accurate than human doctors"]),
  q("ph4-P09","","B2",0.8,1.3,0.15,["reading","b2","inference","corporate"],"What is implied by using 'health costs as a proxy for need'?","Patients with lower historical healthcare spending were assumed to be healthier, regardless of actual need","Using costs as a proxy means spending patterns were used to estimate health needs, disadvantaging those who received less care.",["AI systems are programmed to favour patients with insurance","Hospital administrators set AI training criteria","AI cannot measure patient satisfaction"]),
  q("ph4-P09","","B2",0.9,1.3,0.15,["reading","b2","detail","academia"],"Which application of AI beyond diagnostics is mentioned?","Extracting relevant information from unstructured patient records","The passage mentions natural language processing tools doing this.",["Performing remote surgical procedures","Replacing hospital receptionists","Prescribing medication directly"]),
  q("ph4-P09","","B2",1.0,1.3,0.15,["reading","b2","inference","academia"],"What does the author suggest regulators need to do?","Create governance frameworks ensuring AI improves equity and safety","The final sentence calls for 'robust governance frameworks to ensure that AI deployment enhances equity and safety'.",["Ban AI from clinical environments","Require all hospitals to adopt AI within five years","Transfer control of AI development to healthcare professionals"]),
  q("ph4-P09","","B2",1.1,1.3,0.15,["reading","b2","main-idea","academia"],"What is the primary concern raised about AI in healthcare?","That AI's potential benefits could be undermined by bias, privacy risks, and inadequate governance","The passage describes benefits but focuses on bias, privacy, and the need for governance.",["That AI cannot match the accuracy of human clinicians","That healthcare data is insufficient to train AI effectively","That AI is being developed too slowly"]),
];
P09[0].passage = P09_TEXT;

// ══════════════════════════════════════════════════════════════
// P10 — B2 (7 items) Confirmation Bias and Social Media
// ══════════════════════════════════════════════════════════════
const P10_TEXT = `Social media platforms have fundamentally altered how people consume and share information. One of the most significant psychological mechanisms driving this is confirmation bias — the tendency to seek out, interpret, and remember information that confirms one's pre-existing beliefs while discounting contradictory evidence.

Recommendation algorithms amplify this tendency. By optimising for engagement — typically measured through clicks, shares, and viewing time — platforms preferentially surface content that provokes strong emotional reactions and reinforces existing viewpoints. Critics argue that this creates 'filter bubbles', within which users are increasingly exposed only to perspectives aligned with their own, fragmenting shared public discourse and making political polarisation more severe.

Empirical research presents a more nuanced picture. A comprehensive 2023 meta-analysis found that while algorithmic curation does reduce exposure to cross-cutting political content, the effect size is modest. The researchers concluded that social media exacerbates but does not cause political polarisation, which has structural roots in socioeconomic inequality and geographic self-sorting.

Defenders of current platform models argue that users have individual agency and can choose to follow diverse sources. Furthermore, social media has facilitated unprecedented access to minority viewpoints and has given marginalised communities a voice they previously lacked. The debate, therefore, is not simply about algorithms but about broader questions of media literacy, democratic participation, and the responsibilities of technology companies.`;

const P10 = [
  q("ph4-P10","","B2",0.5,1.3,0.15,["reading","b2","vocabulary","academia"],"What is 'confirmation bias'?","The tendency to seek and accept information that supports beliefs one already holds","The passage defines confirmation bias as seeking, interpreting, and remembering confirming information.",["The tendency to change one's opinion when shown new evidence","The tendency to share information without verifying it","The tendency to believe all information found online"]),
  q("ph4-P10","","B2",0.6,1.3,0.15,["reading","b2","detail","academia"],"What does 'optimising for engagement' mean?","Designing the algorithm to maximise user clicks, shares, and viewing time","The passage states engagement is 'typically measured through clicks, shares, and viewing time'.",["Ensuring the most accurate content reaches users","Removing harmful content automatically","Encouraging users to create their own content"]),
  q("ph4-P10","","B2",0.7,1.3,0.15,["reading","b2","vocabulary","language-schools"],"What is a 'filter bubble'?","An environment in which users mainly see content that agrees with their existing views","The passage describes filter bubbles as environments where users are 'exposed only to perspectives aligned with their own'.",["A tool that blocks advertising","A setting that removes offensive content","A feature that limits screen time"]),
  q("ph4-P10","","B2",0.8,1.3,0.15,["reading","b2","detail","academia"],"What does the 2023 meta-analysis conclude about social media and political polarisation?","Social media worsens but does not cause polarisation, which has deeper structural roots","The passage states researchers 'concluded that social media exacerbates but does not cause political polarisation'.",["Social media is the primary driver of polarisation","Algorithmic curation has no measurable effect","Polarisation is decreasing due to greater access to information"]),
  q("ph4-P10","","B2",0.9,1.3,0.15,["reading","b2","inference","academia"],"What does the word 'nuanced' suggest about the empirical research?","The research presents a complex picture that does not simply confirm or deny the filter bubble theory","'Nuanced' implies complexity and subtlety beyond straightforward claims.",["The research is preliminary","The research strongly supports the filter bubble theory","The research period was too short"]),
  q("ph4-P10","","B2",1.0,1.3,0.15,["reading","b2","detail","language-schools"],"What positive effect of social media do defenders mention?","It has given marginalised communities a voice they previously lacked","The passage states social media 'has given marginalised communities a voice they previously lacked'.",["It has eliminated the spread of misinformation","It has replaced traditional media entirely","It has reduced the influence of political parties"]),
  q("ph4-P10","","B2",1.1,1.3,0.15,["reading","b2","main-idea","academia"],"What is the main point of this passage?","The relationship between social media and polarisation is complex, and solutions require attention to broader social and media literacy issues","The passage presents multiple perspectives and concludes the issue is broader than just algorithms.",["Social media companies should be banned from using recommendation algorithms","Confirmation bias is the sole cause of political extremism","Individuals should be legally required to follow diverse news sources"]),
];
P10[0].passage = P10_TEXT;

// ══════════════════════════════════════════════════════════════
// P11 — B2 (7 items) Behavioural Economics
// ══════════════════════════════════════════════════════════════
const P11_TEXT = `Classical economics assumes that individuals make rational, self-interested decisions by carefully weighing costs and benefits. Behavioural economics challenges this assumption, drawing on insights from psychology to demonstrate that human decision-making is systematically influenced by cognitive biases, heuristics, and emotional factors.

One of the most robust findings is loss aversion: people experience the pain of losing something approximately twice as intensely as the pleasure of gaining an equivalent amount. This asymmetry helps explain why individuals often hold failing investments too long, avoid beneficial risks, and respond more strongly to the framing of a message as a loss than as an equivalent gain.

Closely related is the status quo bias — the tendency to prefer the current state of affairs over change, even when change would be objectively advantageous. Policymakers have exploited this tendency through 'nudge' interventions, most famously by changing the default option in pension enrolment from opt-in to opt-out. In the UK, this simple change increased pension participation from around 50% to over 90%.

Behavioural economics has also revealed the power of social norms. When people are told that most of their neighbours have already paid their taxes or reduced their energy consumption, compliance and conservation rates increase significantly.

Critics, however, argue that nudge policies are paternalistic and undermine individual autonomy. They also question whether insights from laboratory experiments generalise to real-world, high-stakes decisions.`;

const P11 = [
  q("ph4-P11","","B2",0.5,1.3,0.15,["reading","b2","vocabulary","academia"],"What do 'heuristics' most likely mean in this context?","Mental shortcuts that simplify decision-making","Heuristics are cognitive shortcuts used to make quick decisions, contrasted here with fully rational analysis.",["Emotional reactions to risk","Logical rules for financial planning","Unconscious physical responses"]),
  q("ph4-P11","","B2",0.6,1.3,0.15,["reading","b2","detail","academia"],"How does loss aversion explain investment behaviour?","People hold failing investments too long to avoid the pain of realising a loss","The passage explicitly states loss aversion helps explain why 'individuals often hold failing investments too long'.",["People invest more money after a loss","People prefer shares to bonds","People avoid all investment when the market is uncertain"]),
  q("ph4-P11","","B2",0.7,1.3,0.15,["reading","b2","detail","corporate"],"What was the result of changing pension enrolment from opt-in to opt-out in the UK?","Pension participation increased from around 50% to over 90%","The passage states this directly.",["The government saved money on pension administration","More people chose to retire earlier","Employers began contributing more"]),
  q("ph4-P11","","B2",0.8,1.3,0.15,["reading","b2","vocabulary","corporate"],"What does the passage suggest 'status quo bias' means?","A preference for keeping things as they are, even when change would be beneficial","The passage defines it as preferring 'the current state of affairs over change, even when change would be objectively advantageous'.",["A tendency to follow the most popular trend","A preference for gradual rather than sudden change","A resistance to being influenced by other people"]),
  q("ph4-P11","","B2",0.9,1.3,0.15,["reading","b2","inference","academia"],"Why does the author mention neighbours' tax payment behaviour?","To illustrate how social norms can influence individual compliance","The example shows how informing people about others' behaviour increases compliance.",["To show that taxes are more effective than other policy tools","To suggest that governments should publish tax records","To argue that peer pressure is a form of coercion"]),
  q("ph4-P11","","B2",1.0,1.3,0.15,["reading","b2","detail","academia"],"What is the main criticism of nudge policies mentioned?","That they are paternalistic and limit individual freedom of choice","Critics argue nudge policies are 'paternalistic and undermine individual autonomy'.",["That they are too expensive","That they only work in laboratory settings","That they benefit wealthy citizens more"]),
  q("ph4-P11","","B2",1.1,1.3,0.15,["reading","b2","main-idea","academia"],"What is the central claim of behavioural economics as described?","Human decision-making is systematically irrational due to predictable cognitive and emotional biases","The passage argues that behaviour deviates from classical rational models in systematic, predictable ways.",["People are incapable of making good financial decisions without expert help","Governments should control people's choices","Classical economics provides a complete model of human behaviour"]),
];
P11[0].passage = P11_TEXT;

// ══════════════════════════════════════════════════════════════
// P12 — B2 (7 items) Income Inequality
// ══════════════════════════════════════════════════════════════
const P12_TEXT = `Income inequality has been rising in most developed economies since the 1980s. The Gini coefficient — the standard measure of income distribution — has increased significantly in countries such as the United States, the United Kingdom, and Germany, even as overall living standards have improved.

Economists debate the causes. Technological change, particularly automation and digitalisation, is frequently cited as a driver, as it raises demand for high-skilled workers while displacing routine, middle-income jobs — a phenomenon known as 'labour market polarisation'. Globalisation has also played a role: the offshoring of manufacturing to lower-wage countries has compressed wages in developed economies.

The consequences of sustained inequality extend beyond economics. Research by epidemiologists Richard Wilkinson and Kate Pickett found that more unequal societies tend to have higher rates of mental illness, lower social trust, reduced educational mobility, and shorter life expectancy across the income spectrum. Their work suggests that inequality is damaging not only for the poor but for the entire social fabric.

Policy responses have included progressive taxation, expansion of social transfers, investment in education, and minimum wage legislation. However, economists differ on their effectiveness. Supply-side advocates argue that redistribution reduces incentives for investment, while Keynesian economists contend that reducing inequality boosts aggregate demand and thus overall economic performance.`;

const P12 = [
  q("ph4-P12","","B2",0.5,1.3,0.15,["reading","b2","vocabulary","academia"],"What does the Gini coefficient measure?","The distribution of income within a society","The passage describes it as 'the standard measure of income distribution'.",["A country's total economic output","The gap between rich and poor countries","Government spending on social welfare"]),
  q("ph4-P12","","B2",0.6,1.3,0.15,["reading","b2","vocabulary","academia"],"What is 'labour market polarisation'?","A process in which automation increases demand for high-skilled jobs while destroying middle-income ones","The passage defines this phenomenon directly.",["The migration of workers between industries","The growing gap between public and private sector wages","The decline of trade unions"]),
  q("ph4-P12","","B2",0.7,1.3,0.15,["reading","b2","detail","academia"],"According to Wilkinson and Pickett, which is associated with greater inequality?","Higher rates of mental illness and lower social trust","These are explicitly listed in the passage.",["Lower rates of crime","Greater political participation","Higher educational achievement overall"]),
  q("ph4-P12","","B2",0.8,1.3,0.15,["reading","b2","inference","academia"],"What does 'the entire social fabric' suggest?","That inequality harms social cohesion and wellbeing for everyone, not just the poorest","The phrase implies inequality damages the broader social structure.",["That society is becoming more individualistic","That economic growth alone determines social outcomes","That wealthy people benefit from reducing poverty"]),
  q("ph4-P12","","B2",0.9,1.3,0.15,["reading","b2","detail","academia"],"What argument do supply-side economists make about redistribution?","That redistribution reduces incentives for investment","The passage states supply-side advocates 'argue that redistribution reduces incentives for investment'.",["That redistribution increases government debt","That redistribution benefits mainly the wealthy","That minimum wage laws cause unemployment"]),
  q("ph4-P12","","B2",1.0,1.3,0.15,["reading","b2","inference","academia"],"What can be inferred about the Keynesian perspective on reducing inequality?","That reducing inequality increases spending and ultimately benefits the overall economy","Keynesian economists argue that reducing inequality 'boosts aggregate demand and thus overall economic performance'.",["That redistribution policies are always unpopular","That tax cuts are the most effective way to reduce inequality","That inequality has no long-term effect on economic growth"]),
  q("ph4-P12","","B2",1.1,1.3,0.15,["reading","b2","main-idea","academia"],"What does the passage argue overall?","Rising inequality has complex causes and wide-ranging social consequences, and addressing it requires contested policy choices","The passage covers causes, social impacts, and competing policy views.",["Globalisation is the main cause and must be reversed","Economic growth will eventually reduce inequality without policy intervention","Progressive taxation is the most effective way to reduce inequality"]),
];
P12[0].passage = P12_TEXT;

// ══════════════════════════════════════════════════════════════
// P13 — C1 (7 items) Cognitive Biases and Rationality
// ══════════════════════════════════════════════════════════════
const P13_TEXT = `The assumption of human rationality underpins much of classical economic theory and liberal political philosophy. Yet decades of experimental research in cognitive psychology have systematically documented the ways in which human reasoning deviates from normative standards of rationality. Daniel Kahneman's distinction between System 1 (fast, intuitive, heuristic-driven) and System 2 (slow, deliberate, analytical) thinking has been particularly influential in explaining these deviations.

Among the most consequential biases is the availability heuristic: the tendency to judge the likelihood of an event based on how readily examples come to mind rather than on statistical base rates. This leads individuals to overestimate the frequency of vivid, emotionally salient events — such as plane crashes or terrorist attacks — while underestimating far more common but less memorable causes of death such as cardiovascular disease.

The representativeness heuristic produces similarly systematic errors. People assess probability based on resemblance to a prototype rather than prior probability. In the classic 'Linda problem', the majority of participants rated 'Linda is a bank teller and feminist activist' as more probable than 'Linda is a bank teller', despite the former being logically impossible for any event that is a subset of the latter.

These findings have significant normative implications. If individuals cannot be relied upon to act in their own best interests — a key premise of laissez-faire economics — then the case for paternalistic intervention becomes considerably stronger. Proponents of 'libertarian paternalism' argue that environments can be 'architecturally' designed to steer individuals towards better choices without restricting their freedom.

Critics, however, caution against overstating the irrationality of ordinary cognition. Heuristics are ecologically rational: they are fast, efficient, and highly accurate across a wide range of real-world conditions. Furthermore, many experiments demonstrating bias have been conducted in artificial settings with little external validity.`;

const P13 = [
  q("ph4-P13","","C1",1.0,1.4,0.15,["reading","c1","vocabulary","academia"],"What does 'normative standards of rationality' mean?","The ideal standards of logic and probability against which actual reasoning is measured","'Normative' refers to what ought to be the case; here it means ideal logical/statistical standards.",["The most common ways people actually reason","Standards set by government bodies","The minimum requirements for rational thought"]),
  q("ph4-P13","","C1",1.1,1.4,0.15,["reading","c1","detail","academia"],"What is the availability heuristic?","Judging likelihood based on how easily examples come to mind rather than actual statistics","The passage defines it as judging 'likelihood of an event based on how readily examples come to mind'.",["Assessing probability based on resemblance to a typical example","Using System 2 thinking to evaluate evidence carefully","Overweighting recent events when making future predictions"]),
  q("ph4-P13","","C1",1.2,1.4,0.15,["reading","c1","inference","academia"],"In the 'Linda problem', why is it logically impossible for 'Linda is a bank teller AND feminist activist' to be more probable than 'Linda is a bank teller'?","Because the conjunction of two attributes cannot be more probable than either attribute alone","The conjunction fallacy: P(A and B) is always less than or equal to P(A).",["Because feminist activists are statistically unlikely to work as bank tellers","Because the description is internally contradictory","Because the two roles require incompatible qualifications"]),
  q("ph4-P13","","C1",1.3,1.4,0.15,["reading","c1","detail","academia"],"What do proponents of 'libertarian paternalism' advocate?","Designing choice environments to guide people towards better decisions while preserving freedom","The passage states environments can be designed 'to steer individuals towards better choices without restricting their freedom'.",["Giving individuals financial incentives to make healthier choices","Using legal restrictions to prevent harmful behaviours","Providing more information so people can make fully rational decisions"]),
  q("ph4-P13","","C1",1.4,1.4,0.15,["reading","c1","vocabulary","academia"],"What does 'ecologically rational' mean in the final paragraph?","Well-suited to real-world conditions even if logically imperfect","The passage says heuristics are ecologically rational because they are fast, efficient, and accurate in real-world conditions.",["Heuristics tested in ecological field studies","Rational thinking that considers environmental consequences","Reasoning based on biological instinct"]),
  q("ph4-P13","","C1",1.5,1.4,0.15,["reading","c1","inference","academia"],"What is the implication of critics' argument that many bias experiments 'lack external validity'?","Results from artificial experiments may not accurately predict behaviour in real-world situations","'External validity' means the results generalise to real-world settings; lacking it means they may not.",["Participants were not representative of the general population","The experiments were not conducted ethically","The statistical methods used in bias research are flawed"]),
  q("ph4-P13","","C1",1.6,1.4,0.15,["reading","c1","main-idea","academia"],"What tension does the passage explore?","The tension between evidence of human irrationality and the limits of that evidence, and its implications for policy","The passage documents biases, then addresses critics who question the conclusions, then discusses policy implications.",["The conflict between System 1 and System 2 thinking","The debate between psychology and economics","The relationship between cognitive biases and moral decision-making"]),
];
P13[0].passage = P13_TEXT;

// ══════════════════════════════════════════════════════════════
// P14 — C1 (7 items) The Attention Economy
// ══════════════════════════════════════════════════════════════
const P14_TEXT = `The concept of the attention economy, developed by Herbert Simon in 1971, posits that human attention is the scarce resource that determines which information succeeds in a world of information abundance. As digital content has proliferated exponentially, competition for attention has intensified, with far-reaching consequences for media, politics, and cognition.

Digital platforms monetise attention by selling advertising against it. The imperative to maximise dwell time drives the deployment of psychologically sophisticated persuasion architectures — features such as infinite scroll, variable reward schedules, and algorithmic personalisation — that exploit known vulnerabilities in human self-regulation. Former insiders at major technology companies, including Tristan Harris and Tim Kendall, have testified before legislatures that these features were deliberately designed to be addictive.

The cognitive consequences are contested but concerning. Researchers such as Nicholas Carr have argued that the hyperlinked, fragmented nature of digital reading reshapes neuroplasticity in ways that impair sustained deep reading and linear reasoning. While these claims are disputed — some meta-analyses find no robust evidence of declining attention spans — there is broad agreement that multitasking on digital devices reduces comprehension and retention of complex material.

At a societal level, the attention economy has been implicated in the degradation of democratic discourse. When platforms reward outrage and novelty over accuracy and nuance, the epistemic commons — the shared base of verified facts that democracy requires — is eroded. This has prompted calls for structural interventions including platform liability for harms, mandatory algorithmic transparency, and alternative platform models based on subscription rather than advertising revenue.`;

const P14 = [
  q("ph4-P14","","C1",1.0,1.4,0.15,["reading","c1","vocabulary","academia"],"What does 'proliferated exponentially' mean in context?","Increased in quantity at a rapidly accelerating rate","'Proliferated' means multiplied; 'exponentially' means at an accelerating rate of growth.",["Spread geographically across the world","Become increasingly complex and specialised","Declined in quality while increasing in volume"]),
  q("ph4-P14","","C1",1.1,1.4,0.15,["reading","c1","vocabulary","corporate"],"What is a 'persuasion architecture' in this context?","A set of design features built into digital products to influence user behaviour","The passage describes 'psychologically sophisticated persuasion architectures' as features like infinite scroll.",["A plan developed by advertisers to target specific demographics","A regulatory framework governing digital advertising","A type of artificial intelligence that predicts user preferences"]),
  q("ph4-P14","","C1",1.2,1.4,0.15,["reading","c1","inference","academia"],"What is the significance of testimony from former platform insiders like Tristan Harris?","It suggests the addictive features of platforms were intentional, not accidental","They 'testified that these features were deliberately designed to be addictive', implying intentional design.",["It proves that technology companies have broken the law","It shows that social media platforms are now being regulated","It demonstrates that users are unable to control their own behaviour"]),
  q("ph4-P14","","C1",1.3,1.4,0.15,["reading","c1","detail","academia"],"What does Nicholas Carr argue about digital reading?","That it alters brain plasticity in ways that damage deep reading and sustained reasoning","The passage states Carr argues digital reading 'reshapes neuroplasticity in ways that impair sustained deep reading'.",["That reading online is equivalent to reading in print","That younger generations are better adapted to digital reading","That hyperlinks improve understanding by providing context"]),
  q("ph4-P14","","C1",1.4,1.4,0.15,["reading","c1","vocabulary","academia"],"What does the 'epistemic commons' refer to?","A shared foundation of verified facts and reliable knowledge that supports democratic society","The passage defines it as 'the shared base of verified facts that democracy requires'.",["A digital library of academic research accessible to all","A set of rules governing what can be published online","The collective intelligence stored in social media platforms"]),
  q("ph4-P14","","C1",1.5,1.4,0.15,["reading","c1","inference","academia"],"What does the author imply by saying some claims about attention are 'disputed'?","That there is ongoing scholarly disagreement about some cognitive effects of digital media","The qualifier 'disputed' and reference to meta-analyses indicate legitimate scholarly debate.",["That the research is biased and cannot be trusted","That technology companies have funded research to discredit findings","That most experts agree digital media has no effect on attention"]),
  q("ph4-P14","","C1",1.6,1.4,0.15,["reading","c1","main-idea","academia"],"What is the central argument of this passage?","The attention economy's design exploits human psychology in ways that damage cognition and democratic discourse, and requires structural regulation","The passage describes the commercial logic, cognitive consequences, democratic implications, and calls for structural reforms.",["Technology companies should be broken up","Individuals should take personal responsibility for their digital consumption","Educational institutions must teach critical digital literacy"]),
];
P14[0].passage = P14_TEXT;

// ══════════════════════════════════════════════════════════════
// P15 — C1 (7 items) Post-Truth Politics
// ══════════════════════════════════════════════════════════════
const P15_TEXT = `The term 'post-truth', named Oxford Dictionary's word of the year in 2016, describes a political culture in which objective facts are less influential than emotional appeals and personal beliefs in shaping public opinion. It has become a lens through which many commentators interpret the rise of populist movements in the United States, the United Kingdom, Brazil, and elsewhere.

Post-truth politics is not simply about lying. Rather, it involves a strategic assault on the epistemic foundations of democratic deliberation — the shared commitment to evidence-based reasoning that makes productive political discourse possible. When political actors routinely describe factual corrections as 'fake news', they do not merely deceive: they delegitimise the very institutions — journalism, science, the judiciary — whose authority rests on truth-telling.

Philosopher Harry Frankfurt's influential distinction between lying and 'bullshitting' is relevant here. The liar knows the truth and deliberately asserts its opposite. The bullshitter, by contrast, is indifferent to whether their statements correspond to reality; their only goal is persuasive effect. Frankfurt argues that bullshitting is more dangerous to public discourse than lying precisely because it erodes the norm that assertions should be constrained by evidence.

Responding to post-truth politics presents distinctive challenges. Fact-checking organisations have proliferated, yet research suggests that corrections rarely change the minds of those already committed to a false belief, and may even produce a 'backfire effect' (though this finding has since been qualified by subsequent replication studies). Rebuilding epistemic norms may require longer-term investments in media literacy education, reformed social media incentives, and the reinvigoration of shared civic institutions.`;

const P15 = [
  q("ph4-P15","","C1",1.0,1.4,0.15,["reading","c1","vocabulary","academia"],"What does 'epistemic foundations' mean in the passage?","The shared principles about evidence and truth that underpin rational public debate","'Epistemic' relates to knowledge; the passage refers to 'the shared commitment to evidence-based reasoning'.",["The emotional basis of political belief","The legal frameworks that regulate political conduct","The historical traditions that shape political culture"]),
  q("ph4-P15","","C1",1.1,1.4,0.15,["reading","c1","detail","academia"],"According to Frankfurt's distinction, what is the key difference between lying and bullshitting?","The liar cares about the truth (in order to oppose it), while the bullshitter is completely indifferent to it","The passage states the bullshitter is 'indifferent to whether their statements correspond to reality'.",["Lying involves deliberate deception while bullshitting is accidental","Bullshitting involves using statistics while lying uses emotional appeals","Lying is a legal offence while bullshitting is merely unethical"]),
  q("ph4-P15","","C1",1.2,1.4,0.15,["reading","c1","inference","academia"],"Why does Frankfurt consider bullshitting more dangerous than lying?","Because it undermines the social norm that claims should be based on evidence","Frankfurt argues bullshitting is worse because it 'erodes the norm that assertions should be constrained by evidence'.",["Because it is harder for voters to detect","Because it is protected by free speech laws","Because it tends to spread more widely through social media"]),
  q("ph4-P15","","C1",1.3,1.4,0.15,["reading","c1","vocabulary","academia"],"What does 'delegitimise' mean in context?","Undermine the authority or credibility of an institution","The passage says calling corrections 'fake news' 'delegitimises' journalism, science, and the judiciary.",["Legally dissolve or disband an institution","Replace one institution with another","Fund an institution in secret"]),
  q("ph4-P15","","C1",1.4,1.4,0.15,["reading","c1","detail","academia"],"What does the passage say about fact-checking organisations?","They have grown in number but research suggests corrections often fail to change committed minds","The passage states 'corrections rarely change the minds of those already committed to a false belief'.",["They have successfully reduced political misinformation","They tend to increase polarisation","They have been banned in several countries"]),
  q("ph4-P15","","C1",1.5,1.4,0.15,["reading","c1","inference","academia"],"What is implied by 'qualified by subsequent replication studies' in relation to the backfire effect?","More recent research has cast doubt on whether the backfire effect is as reliable as originally claimed","Replication studies that 'qualify' a finding show it is less certain or universal than first thought.",["The backfire effect has been confirmed beyond doubt","Later research showed that fact-checking always succeeds","The backfire effect only occurs when corrections are made publicly"]),
  q("ph4-P15","","C1",1.6,1.4,0.15,["reading","c1","main-idea","academia"],"What is the overall argument of the passage?","Post-truth politics attacks the shared epistemic norms that democracy needs, and addressing it requires systemic rather than purely factual responses","The passage defines post-truth, explains why it is epistemically dangerous, and argues fact-checking alone is insufficient.",["Social media companies are entirely responsible for the rise of post-truth politics","Political lying has always been a feature of democratic systems","Populist movements will inevitably fail once voters understand the truth"]),
];
P15[0].passage = P15_TEXT;

// ══════════════════════════════════════════════════════════════
// P16 — C1 (7 items) Epigenetics and Behaviour
// ══════════════════════════════════════════════════════════════
const P16_TEXT = `For most of the twentieth century, the dominant narrative in biology held that genetic inheritance was a one-way street: DNA determined phenotype, and environmental experiences could not alter what was passed on to future generations. Epigenetics has fundamentally revised this view.

Epigenetics studies heritable changes in gene expression that do not involve alterations to the DNA sequence itself. Chemical modifications — principally DNA methylation and histone modification — can switch genes on or off in response to environmental stimuli, and crucially, some of these modifications can be transmitted to offspring, a phenomenon sometimes called 'transgenerational epigenetic inheritance'.

Research on the survivors of the Dutch Hunger Winter of 1944–45 found that the children and grandchildren of pregnant women who experienced severe famine showed elevated rates of obesity, cardiovascular disease, and mental health disorders, even when they themselves were never exposed to food scarcity. This suggests that trauma and deprivation can leave molecular signatures that persist across generations.

Similar patterns have emerged from studies of childhood adversity. Adverse childhood experiences — including abuse, neglect, and parental substance use — are associated with altered glucocorticoid receptor gene expression, affecting stress regulation across the lifespan.

These findings do not support genetic determinism; epigenetic modifications are reversible, and understanding the mechanisms through which environment shapes gene expression opens new avenues for intervention, including psychosocial therapies and pharmacological approaches targeting epigenetic pathways.`;

const P16 = [
  q("ph4-P16","","C1",1.0,1.4,0.15,["reading","c1","vocabulary","academia"],"What is 'phenotype' as implied by the passage?","The observable characteristics produced by an organism's genes","The passage pairs 'DNA' with 'phenotype' as its product — the expressed characteristics.",["The complete set of an organism's genetic material","The process by which genes are copied and transmitted","The environmental conditions in which an organism develops"]),
  q("ph4-P16","","C1",1.1,1.4,0.15,["reading","c1","detail","academia"],"What does 'transgenerational epigenetic inheritance' mean?","The passing of epigenetic modifications in gene expression to future generations","The passage defines it as modifications 'transmitted to offspring'.",["The inheritance of new mutations caused by radiation","The transfer of cultural practices between generations","The shared genetic material between closely related individuals"]),
  q("ph4-P16","","C1",1.2,1.4,0.15,["reading","c1","inference","academia"],"What is significant about the Dutch Hunger Winter findings?","They suggest that severe environmental trauma can affect the biology of people who were never directly exposed to it","The children and grandchildren were affected despite never experiencing famine — showing inherited epigenetic effects.",["They proved that famine is the primary cause of cardiovascular disease","They confirmed that genetic mutations occur faster during starvation","They showed that mental health disorders are entirely caused by early nutrition"]),
  q("ph4-P16","","C1",1.3,1.4,0.15,["reading","c1","detail","academia"],"What are adverse childhood experiences (ACEs) associated with according to the passage?","Altered glucocorticoid receptor gene expression affecting stress regulation","The passage explicitly states this association.",["Permanent changes to DNA sequence","Reduced activity in brain regions associated with memory","A higher likelihood of developing autoimmune diseases"]),
  q("ph4-P16","","C1",1.4,1.4,0.15,["reading","c1","inference","academia"],"Why does the author say epigenetic findings 'do not support genetic determinism'?","Because epigenetic modifications are reversible and can be targeted by interventions","The passage argues that because modifications can be reversed and treated, determinism is not implied.",["Because DNA sequences can now be edited using gene therapy","Because the environment has no influence on which genes are inherited","Because psychological factors have no effect on genetics"]),
  q("ph4-P16","","C1",1.5,1.4,0.15,["reading","c1","vocabulary","academia"],"What does 'heritable' mean in the context of epigenetics?","Capable of being transmitted from parent to offspring","The passage uses 'heritable' to describe epigenetic changes that can be passed on.",["Genetically encoded in the nucleus of every cell","Visible through standard genetic testing","Related to inherited physical rather than behavioural traits"]),
  q("ph4-P16","","C1",1.6,1.4,0.15,["reading","c1","main-idea","academia"],"What is the main claim of the passage?","Environmental experiences can cause heritable changes in gene expression with lasting consequences across generations, and this offers new possibilities for intervention","The passage revises the simple genetic inheritance model, presents evidence for transgenerational effects, and notes reversibility.",["Genetics is more important than the environment","Epigenetics has made traditional genetic research obsolete","The effects of famine on future generations can only be reversed through diet"]),
];
P16[0].passage = P16_TEXT;

// ══════════════════════════════════════════════════════════════
// P17 — C1 (7 items) Financialisation and Inequality
// ══════════════════════════════════════════════════════════════
const P17_TEXT = `Financialisation — the increasing dominance of financial motives, institutions, and elites in the operation of domestic and international economies — has been identified as a significant driver of rising inequality over the past four decades. The term describes a structural transformation in which the financial sector grows relative to the productive economy, corporations prioritise shareholder value over other stakeholders, and financial instruments penetrate everyday life through mortgages, credit, and pension funds.

Economists such as Thomas Piketty and Greta Krippner have documented how this shift has contributed to the concentration of wealth at the top of the income distribution. When returns on capital consistently outpace economic growth (Piketty's r > g thesis), accumulated wealth compounds faster than wages, widening the gap between those who own assets and those who depend on labour income.

Financialisation has also transformed corporate behaviour. The shareholder primacy model — in which executives are incentivised through stock options to maximise short-term share price — has been associated with increased wage suppression, reduced investment in research and development, and the offshoring of production. Critics argue that this represents a transfer of value from workers and communities to financial elites, facilitated by deregulation and accommodative monetary policy.

The debate about solutions remains unresolved. Progressive economists advocate for financial transaction taxes, tighter capital controls, and the expansion of stakeholder governance models. Defenders of financialisation point to efficiency gains from capital mobility, the role of financial innovation in economic development, and the risks of reducing returns for institutional investors such as pension funds upon which many workers depend.`;

const P17 = [
  q("ph4-P17","","C1",1.0,1.4,0.15,["reading","c1","vocabulary","academia"],"What does 'financialisation' mean as used in the passage?","A structural shift in which financial activity and motives come to dominate the broader economy","The passage defines it as 'the increasing dominance of financial motives, institutions, and elites' in economies.",["The process of converting assets into financial instruments","The internationalisation of financial markets through globalisation","Government policies that regulate the banking sector"]),
  q("ph4-P17","","C1",1.1,1.4,0.15,["reading","c1","detail","academia"],"What is Piketty's 'r > g' thesis?","That when returns on capital exceed economic growth, wealth concentrates at the top","The passage explains that when 'r' (returns on capital) outpaces 'g' (growth), wealth compounds faster than wages.",["That financial regulation should be strengthened when growth exceeds inflation","That corporate profits will always exceed workers' wages","That income inequality is determined primarily by differences in human capital"]),
  q("ph4-P17","","C1",1.2,1.4,0.15,["reading","c1","detail","corporate"],"What effects on corporate behaviour is the shareholder primacy model associated with?","Wage suppression, reduced R&D investment, and offshoring of production","The passage explicitly lists these three effects.",["Increased investment in employee training","Greater long-term planning and innovation","Expansion of domestic manufacturing"]),
  q("ph4-P17","","C1",1.3,1.4,0.15,["reading","c1","inference","academia"],"What does 'returns on capital compound faster than wages' imply about inequality?","That people who own assets accumulate wealth faster than those who earn wages, widening inequality","Compounding returns on capital means the asset-owning class accumulates wealth at an accelerating rate.",["That wages are falling in absolute terms due to automation","That tax cuts on capital gains are the primary driver","That workers should invest in stocks rather than rely on wages"]),
  q("ph4-P17","","C1",1.4,1.4,0.15,["reading","c1","vocabulary","corporate"],"What does 'accommodative monetary policy' mean in this context?","Low interest rates and expansionary policies that tend to inflate asset prices","'Accommodative' monetary policy typically means low rates and quantitative easing, which inflate asset values.",["Strict regulation of financial institutions by central banks","Government subsidies for manufacturing industries","Trade policies that restrict imports"]),
  q("ph4-P17","","C1",1.5,1.4,0.15,["reading","c1","detail","academia"],"What potential risk of reducing financialisation do defenders mention?","That reducing returns could harm pension funds on which workers depend","The passage states defenders point to 'risks of reducing returns for institutional investors such as pension funds'.",["That financial transaction taxes would cause recession","That restricting capital mobility would increase unemployment","That stakeholder governance would reduce executive pay"]),
  q("ph4-P17","","C1",1.6,1.4,0.15,["reading","c1","main-idea","academia"],"What is the central argument of the passage?","Financialisation has increased wealth inequality through multiple mechanisms, and addressing it involves contested trade-offs","The passage defines financialisation, links it to inequality via multiple channels, and presents opposed views on reform.",["Financial deregulation has been entirely beneficial for growth","The solution to inequality is simply to redistribute wealth","Shareholders and workers have fundamentally aligned interests"]),
];
P17[0].passage = P17_TEXT;

// ══════════════════════════════════════════════════════════════
// P18 — C2 (7 items) Philosophy of Consciousness
// ══════════════════════════════════════════════════════════════
const P18_TEXT = `The mind-body problem — the question of how subjective mental states relate to physical brain processes — has resisted definitive resolution for centuries. David Chalmers' reformulation into 'easy' and 'hard' components has become the canonical framework for contemporary philosophy of mind. The 'easy' problems concern the functional explanation of cognitive capacities: how the brain integrates information, controls behaviour, and generates verbal reports about its own states. The 'hard' problem asks why any of this information processing is accompanied by subjective experience at all — why there is 'something it is like' to see red, feel pain, or hear music. This phenomenal dimension — qualia — appears to resist purely functional explanation.

Physicalist responses take broadly two forms. Eliminativists, such as Daniel Dennett, deny that qualia exist as a philosophically significant category, arguing that our introspective reports are systematically unreliable and that once we explain the functional story, nothing further requires explanation. Type identity theorists claim that mental state types are identical to brain state types, though this view faces the multiple realisation objection: the same mental state can be instantiated in different physical substrates, suggesting mental properties are not type-identical to physical ones.

Property dualists accept the irreducibility of phenomenal properties while rejecting Cartesian substance dualism. On this view, consciousness is a non-physical property instantiated in physical systems, akin to — though arguably more exotic than — the way in which liquidity is a property of water molecules in aggregate.

The practical stakes are considerable. Questions about machine consciousness, the moral status of artificial intelligence, the ethics of anaesthesia, and the admissibility of first-person evidence in consciousness research all hinge, in part, on how we resolve the explanatory gap between brain and mind.`;

const P18 = [
  q("ph4-P18","","C2",1.5,1.5,0.10,["reading","c2","vocabulary","academia"],"What are 'qualia'?","The subjective, felt qualities of conscious experience (e.g. the specific 'redness' of red)","The passage uses 'qualia' to describe the phenomenal dimension — 'something it is like' to have an experience.",["The functional role that mental states play in controlling behaviour","The neural correlates of conscious experience identified by neuroscience","The verbal reports individuals give about their internal states"]),
  q("ph4-P18","","C2",1.6,1.5,0.10,["reading","c2","detail","academia"],"What is the multiple realisation objection to type identity theory?","The same mental state can be realised in physically different substrates, so mental types cannot be identical to brain types","The passage states 'the same mental state can be instantiated in different physical substrates', undermining type identity.",["Mental states are too variable across individuals to map onto brain states","Brain states change too rapidly to be correlated with mental states","Type identity theory cannot explain unconscious mental processes"]),
  q("ph4-P18","","C2",1.7,1.5,0.10,["reading","c2","inference","academia"],"What does Dennett's eliminativist position entail about qualia?","That they do not constitute a genuine explanatory problem, because introspection is unreliable","The passage says Dennett denies qualia 'exist as a philosophically significant category' because introspective reports are unreliable.",["That qualia are real but can be fully explained by neuroscience","That qualia are physical phenomena emerging from complex neural networks","That the hard problem will be solved once neuroscience advances sufficiently"]),
  q("ph4-P18","","C2",1.8,1.5,0.10,["reading","c2","vocabulary","academia"],"What does 'phenomenal' mean in the phrase 'phenomenal dimension'?","Relating to subjective, first-person experience — what it feels like from the inside","In philosophy of mind, 'phenomenal' refers to the felt, experiential quality of conscious states.",["Unusually large or impressive in scale","Relating to observable physical events in the external world","Pertaining to neurological mechanisms underlying awareness"]),
  q("ph4-P18","","C2",1.9,1.5,0.10,["reading","c2","detail","academia"],"How does the passage characterise property dualism?","It accepts that consciousness is irreducible to physical description while rejecting the claim that mind and matter are separate substances","Property dualists accept irreducibility of phenomenal properties but reject Cartesian substance dualism.",["It holds that mental and physical substances are entirely distinct and causally interact","It claims that consciousness emerges from sufficient computational complexity","It argues that all apparently mental phenomena are reducible to brain states"]),
  q("ph4-P18","","C2",2.0,1.5,0.10,["reading","c2","inference","academia"],"Why does the author argue that the hard problem has 'practical stakes'?","Because unresolved questions about consciousness have real consequences for ethics, medicine, and AI","The passage lists several applied questions — machine consciousness, AI moral status, anaesthesia ethics — that depend on resolving the explanatory gap.",["Because unresolved philosophical questions reduce public trust in science","Because the neuroscience of consciousness is of direct commercial interest","Because academic philosophy needs practical relevance to attract funding"]),
  q("ph4-P18","","C2",2.1,1.5,0.10,["reading","c2","main-idea","academia"],"What is the passage's main purpose?","To map the central positions in the philosophy of consciousness and explain why the hard problem remains philosophically intractable","The passage outlines the easy/hard distinction, surveys physicalist and dualist responses, and notes ongoing significance.",["To argue that eliminativism is the most defensible solution","To demonstrate that neuroscience will eventually solve the hard problem","To propose a new theory of consciousness synthesising physicalist and dualist views"]),
];
P18[0].passage = P18_TEXT;

// ══════════════════════════════════════════════════════════════
// P19 — C2 (7 items) Decolonising Knowledge
// ══════════════════════════════════════════════════════════════
const P19_TEXT = `The 'decolonise the curriculum' movement has gained significant institutional traction in Anglophone universities since around 2015, driven in part by the global #RhodesMustFall campaign and subsequent student activism. Its proponents argue that the Western academy has historically constructed knowledge in ways that marginalise, exclude, or misrepresent non-Western epistemologies, peoples, and histories, often in service of colonial political projects.

Theorists working in this tradition draw on a range of intellectual resources. Frantz Fanon's analysis of the psychological dimensions of colonialism, Walter Mignolo's concept of 'coloniality of power', and Gayatri Spivak's interrogation of whether the subaltern can 'speak' within dominant discursive frameworks all inform contemporary debates about whose knowledge counts and under what conditions.

The movement has produced concrete demands: the inclusion of authors from the Global South in reading lists, the interrogation of disciplinary foundations in fields such as economics, law, and medicine for colonial assumptions, and the diversification of academic staff. Critics, including scholars such as Nigel Biggar, have raised concerns about anachronistic moral judgement and the risk of lowering academic standards through ideologically motivated selection of texts.

Epistemological critics raise a deeper objection: that the concept of 'Western' epistemology is itself reductive, given the profound internal diversity of European intellectual traditions, and that the distinction between 'Western' and 'non-Western' knowledge may inadvertently reinscribe the colonial binaries it seeks to dissolve.

The debate touches on fundamental questions about the nature of knowledge itself: whether knowledge claims can be evaluated on universal standards of evidence and reasoning, or whether all knowledge is irreducibly perspectival, produced within specific cultural and political contexts that should be made explicit and critiqued.`;

const P19 = [
  q("ph4-P19","","C2",1.5,1.5,0.10,["reading","c2","vocabulary","academia"],"What does 'epistemology' refer to in this context?","The study of the nature, sources, and limits of knowledge","Epistemology is the branch of philosophy concerned with what knowledge is and how it is acquired.",["The study of the cultural practices of colonised peoples","The historical analysis of intellectual traditions","The sociology of academic institutions"]),
  q("ph4-P19","","C2",1.6,1.5,0.10,["reading","c2","detail","academia"],"What is Mignolo's concept of 'coloniality of power'?","The idea that colonial power relations persist in knowledge production and social hierarchies even after formal independence","The passage references Mignolo's concept in the context of how colonialism shaped knowledge structures.",["The military and economic domination by colonial powers","The psychological damage inflicted on colonised peoples","The formal political relationship between colonial administrators and subject populations"]),
  q("ph4-P19","","C2",1.7,1.5,0.10,["reading","c2","inference","academia"],"What does the reference to Spivak's question of whether the subaltern can 'speak' imply?","That those marginalised by colonial structures may be unable to express themselves within the dominant frameworks of knowledge","Spivak's question concerns whether those excluded from dominant discursive frameworks can make themselves heard within those frameworks.",["That colonised peoples lacked oral traditions before European colonisation","That academic writing requires translation to reach non-Western audiences","That philosophers should write in accessible rather than academic language"]),
  q("ph4-P19","","C2",1.8,1.5,0.10,["reading","c2","detail","academia"],"What is the epistemological objection described in the final two paragraphs?","That distinguishing 'Western' from 'non-Western' knowledge may reproduce the binary divisions that colonialism imposed","The passage states this 'may inadvertently reinscribe the colonial binaries it seeks to dissolve'.",["That non-Western knowledge systems are less rigorous","That decolonisation is a political rather than academic project","That reading lists have too little Western content"]),
  q("ph4-P19","","C2",1.9,1.5,0.10,["reading","c2","vocabulary","academia"],"What does 'subaltern' mean in this passage?","Those who occupy positions of social, political, or epistemic subordination, often as a result of colonial hierarchies","The term, drawn from Gramsci and applied by Spivak, refers to those marginalised within dominant social/epistemic structures.",["Academic scholars who specialise in postcolonial studies","Leaders of anti-colonial independence movements","Citizens of countries formerly subject to imperial rule"]),
  q("ph4-P19","","C2",2.0,1.5,0.10,["reading","c2","inference","academia"],"What tension does the final paragraph expose?","Between universalist epistemology (knowledge assessed by common standards) and perspectivism (knowledge as culturally situated)","The passage asks whether knowledge can be judged by universal standards or is 'irreducibly perspectival'.",["Between academic freedom and institutional responsibility","Between the interests of students and those of established academics","Between scientific and humanistic approaches to knowledge"]),
  q("ph4-P19","","C2",2.1,1.5,0.10,["reading","c2","main-idea","academia"],"What is the passage primarily concerned with?","The intellectual and epistemological foundations and challenges of the decolonise the curriculum movement","The passage surveys the movement's theoretical roots, practical demands, and the substantive epistemological objections raised against it.",["Arguing that colonial histories should be removed from curricula","Defending the inclusion of non-Western authors in reading lists","Demonstrating that Western philosophy is superior to non-Western knowledge systems"]),
];
P19[0].passage = P19_TEXT;

// ══════════════════════════════════════════════════════════════
// P20 — C2 (7 items) Quantum Computing and Cryptography
// ══════════════════════════════════════════════════════════════
const P20_TEXT = `Quantum computing exploits the principles of quantum mechanics — superposition, entanglement, and interference — to perform certain computations at speeds that are fundamentally unachievable by classical silicon-based processors. Unlike classical bits, which are binary (0 or 1), quantum bits (qubits) can exist in a superposition of states simultaneously, enabling massive parallelism in specific computational tasks.

The most consequential near-term implication is the threat to current public-key cryptographic infrastructure. Most internet security depends on the computational infeasibility of factoring large integers or computing discrete logarithms within practical timeframes — problems that classical computers cannot solve in polynomial time for large instances. Shor's algorithm, executable on a sufficiently powerful quantum computer, solves these problems in polynomial time, rendering RSA, Diffie-Hellman, and elliptic curve cryptography effectively obsolete.

The timeline for 'cryptographically relevant' quantum computers remains deeply contested. Most expert assessments place this threshold a decade or more away; however, the possibility of 'harvest now, decrypt later' attacks — in which adversaries collect encrypted data today to decrypt it once quantum capability matures — means that the transition to post-quantum cryptography (PQC) must begin immediately.

NIST's PQC standardisation process, finalised in 2024, selected algorithms based on lattice-based and hash-based cryptographic primitives, which are believed to resist quantum attack. The transition, however, presents formidable engineering challenges: legacy systems must be audited and updated, cryptographic agility must be built into new infrastructure, and international coordination is required to prevent jurisdictional gaps that adversaries could exploit.`;

const P20 = [
  q("ph4-P20","","C2",1.5,1.5,0.10,["reading","c2","vocabulary","academia"],"What is 'superposition' as implied by the passage?","The ability of a qubit to exist in multiple states simultaneously before measurement","The passage contrasts classical bits (binary) with qubits that 'exist in a superposition of states simultaneously'.",["The mathematical technique of combining multiple algorithms","A process by which quantum computers correct errors","A physical property that allows computers to run on less energy"]),
  q("ph4-P20","","C2",1.6,1.5,0.10,["reading","c2","detail","academia"],"What makes RSA and Diffie-Hellman currently secure against classical computers?","The computational infeasibility of factoring large integers or computing discrete logarithms in polynomial time","The passage explains these algorithms depend on problems 'classical computers cannot solve in polynomial time for large instances'.",["The use of quantum-resistant mathematical functions","The ability to generate and discard encryption keys in real time","The physical impossibility of intercepting digital transmissions"]),
  q("ph4-P20","","C2",1.7,1.5,0.10,["reading","c2","vocabulary","academia"],"What does 'cryptographic agility' mean in context?","The ability to swap cryptographic algorithms quickly as threats evolve","'Agility' in cryptography means having infrastructure flexible enough to update algorithms without systemic disruption.",["The speed at which a cryptographic algorithm performs encryption","The capacity of quantum computers to break multiple algorithms simultaneously","The legal authority of governments to mandate encryption standards"]),
  q("ph4-P20","","C2",1.8,1.5,0.10,["reading","c2","detail","academia"],"What is a 'harvest now, decrypt later' attack?","Collecting encrypted data now with the intention of decrypting it when quantum capabilities are sufficiently advanced","The passage defines this as collecting data 'today to decrypt it once quantum capability matures'.",["Breaking encryption by running multiple decryption attempts simultaneously","Intercepting cryptographic keys during transmission","Stealing source code to reverse-engineer encryption protocols"]),
  q("ph4-P20","","C2",1.9,1.5,0.10,["reading","c2","inference","academia"],"Why does the passage argue the transition to post-quantum cryptography must begin immediately, even though quantum computers capable of breaking encryption may be a decade away?","Because harvest now, decrypt later attacks mean data stolen today could be compromised in future, and migration takes years","The threat is already materialising through data collection today; the lead time for transition is long.",["Because NIST has legally mandated immediate compliance","Because classical computers are becoming unable to maintain current encryption","Because quantum computers are already being used by state actors"]),
  q("ph4-P20","","C2",2.0,1.5,0.10,["reading","c2","vocabulary","academia"],"What does 'polynomial time' mean in the context of computing?","A computational speed that scales manageably with input size, making large-scale problems practically solvable","Polynomial time means time grows as a polynomial function of input size — tractable, as opposed to exponential time.",["The time required for a quantum computer to outperform a classical computer","A fixed amount of time regardless of problem size","The speed at which quantum computers generate random numbers"]),
  q("ph4-P20","","C2",2.1,1.5,0.10,["reading","c2","main-idea","academia"],"What is the central message of the passage?","Quantum computing poses an imminent existential threat to current cryptographic security, requiring urgent transition to post-quantum standards despite significant engineering challenges","The passage covers the threat mechanism, timeline uncertainty, harvest-now risk, and engineering challenges.",["Quantum computers have already rendered all current encryption obsolete","Post-quantum cryptography provides complete protection against all future quantum attacks","The greatest barrier to quantum computing adoption is the cost of hardware development"]),
];
P20[0].passage = P20_TEXT;

// ══════════════════════════════════════════════════════════════
// Assemble
// ══════════════════════════════════════════════════════════════
const ALL_ITEMS: ReadingItem[] = [
  ...P01,...P02,
  ...P03,...P04,...P05,...P06,
  ...P07,...P08,...P09,...P10,...P11,...P12,
  ...P13,...P14,...P15,...P16,...P17,
  ...P18,...P19,...P20,
];

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  if (!process.env.DATABASE_URL) { console.error("❌ DATABASE_URL not set"); process.exit(1); }

  if (process.env.DRY_RUN === "1") {
    const counts: Record<string, number> = {};
    for (const i of ALL_ITEMS) counts[i.cefrLevel] = (counts[i.cefrLevel] || 0) + 1;
    console.log(`DRY_RUN: would insert ${ALL_ITEMS.length} reading items`);
    console.table(counts);
    return;
  }

  if (process.env.FORCE === "1") {
    const del = await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`🗑  Deleted ${del.count} existing [${SEED_TAG}] items`);
  }

  const existing = await prisma.item.count({ where: { tags: { has: SEED_TAG } } });
  if (existing > 0 && process.env.FORCE !== "1") {
    console.log(`⚠️  ${existing} items already seeded. Use FORCE=1 to re-seed.`); return;
  }

  // Build passage lookup
  const passageLookup: Record<string, string> = {};
  for (const item of ALL_ITEMS) {
    if (item.passage && !passageLookup[item.passageId]) {
      passageLookup[item.passageId] = item.passage;
    }
  }

  let inserted = 0;
  const { valid, invalid } = validateItemBatch(ALL_ITEMS);
  reportValidationResults(valid.length, invalid.length, invalid);
  if (invalid.length > 0) {
    console.error(`Cannot proceed: ${invalid.length} items failed validation`);
    process.exit(1);
  }
  for (const item of valid) {
    const passageText = passageLookup[item.passageId] ?? "";
    await prisma.item.create({
      data: {
        skill: "READING",
        cefrLevel: item.cefrLevel as any,
        type: "MULTIPLE_CHOICE",
        status: "ACTIVE",
        difficulty: item.b,
        discrimination: item.a,
        guessing: item.c,
        tags: item.tags,
        content: {
          passage: passageText,
          passageId: item.passageId,
          question: item.question,
          options: item.options,
        },
      },
    });
    inserted++;
  }

  const counts: Record<string, number> = {};
  for (const i of ALL_ITEMS) counts[i.cefrLevel] = (counts[i.cefrLevel] || 0) + 1;
  console.log(`\n✅  Inserted ${inserted} reading items`);
  console.table(counts);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
