/**
 * replace-dialogue-items.ts
 *
 * 1. Retires the 60 LISTENING items that are flagged as DIALOGUE_SINGLE_VOICE
 *    (they mention "conversation/dialogue/two people" but lack proper speaker
 *    metadata — so both speakers would sound identical).
 *
 * 2. Seeds 40 new LISTENING dialogue items (CEFR PRE_A1 → C2) with:
 *    - `content.transcript`  in "Name: text\nName2: text\n…" format
 *    - `content.speakers`    array of speaker names
 *    - `content.numberOfSpeakers` = 2
 *    - Proper MCQ prompt + 4 options
 *
 * 3. Calls Gemini 2.5 Flash Preview TTS (multi-speaker) to generate WAV audio
 *    for every new item and saves to public/audio/listening-<id>.wav
 *
 * Usage:
 *   npx tsx scripts/replace-dialogue-items.ts
 *   DRY_RUN=1 npx tsx scripts/replace-dialogue-items.ts  # skip Gemini calls
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI, Modality } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }

const ai = new GoogleGenAI({ apiKey: API_KEY });
const DRY_RUN = process.env.DRY_RUN === "1";
const PUBLIC_AUDIO_DIR = path.join(__dirname, "../public/audio");

// ---------------------------------------------------------------------------
// WAV helper
// ---------------------------------------------------------------------------
const WAV_SAMPLE_RATE = 24000;
const WAV_CHANNELS = 1;
const WAV_BITS = 16;

function buildWavHeader(pcm: Buffer): Buffer {
  const byteRate = WAV_SAMPLE_RATE * WAV_CHANNELS * (WAV_BITS / 8);
  const blockAlign = WAV_CHANNELS * (WAV_BITS / 8);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0, "ascii"); h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8, "ascii"); h.write("fmt ", 12, "ascii");
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(WAV_CHANNELS, 22);
  h.writeUInt32LE(WAV_SAMPLE_RATE, 24); h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32); h.writeUInt16LE(WAV_BITS, 34);
  h.write("data", 36, "ascii"); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// ---------------------------------------------------------------------------
// Voice assignment (same logic as regenerate-dialogue-audio.ts)
// ---------------------------------------------------------------------------
const FEMALE_NAMES = new Set(["chloe","sarah","maria","emily","sophia","lucy","anna","emma","ms","mrs","miss","librarian","olivia","rachel","lisa","kate","dr. chen","dr. patel","professor","prof.","elena","natasha","amina"]);
const MALE_NAMES   = new Set(["david","alex","ben","leo","jake","tom","daniel","mark","mr","coach","teacher","james","john","peter","michael","carlos","ahmed","jack","ryan","dr. miller","professor","prof."]);

function guessGender(name: string): "female" | "male" | "unknown" {
  const lower = name.toLowerCase().split(" ")[0].replace(/\.$/, "");
  if (FEMALE_NAMES.has(lower)) return "female";
  if (MALE_NAMES.has(lower)) return "male";
  return "unknown";
}
function assignVoices(speakers: string[]): Record<string, string> {
  const assigned: Record<string, string> = {};
  let fUsed = false, mUsed = false;
  for (const sp of speakers) {
    const g = guessGender(sp);
    if (g === "female") { assigned[sp] = fUsed ? "Kore" : "Aoede"; fUsed = true; }
    else if (g === "male") { assigned[sp] = mUsed ? "Puck" : "Charon"; mUsed = true; }
    else {
      const used = Object.values(assigned);
      if (!used.includes("Aoede")) assigned[sp] = "Aoede";
      else if (!used.includes("Charon")) assigned[sp] = "Charon";
      else assigned[sp] = "Kore";
    }
  }
  return assigned;
}
function extractSpeakers(transcript: string): string[] {
  const seen = new Set<string>(); const order: string[] = [];
  const re = /^([A-Z][a-zA-Z.\s]+):/gm; let m;
  while ((m = re.exec(transcript)) !== null) {
    const name = m[1].trim();
    if (!seen.has(name)) { seen.add(name); order.push(name); }
  }
  return order;
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// The 60 IDs to retire
// ---------------------------------------------------------------------------
const IDS_TO_RETIRE = [
  "cmor7by1e00034ypvg96g1zkq","cmovo24dz001snunkvgg93430","cmor7bd2h00054yezlbthtwzx",
  "cmor7bcye00044yez2tn30d5s","cmor7bf8x00004yg1se7hcwke","cmor7bcu800034yezdmnq1gd8",
  "cmor7bfgb00024yg1kw13qmb7","cmoukex6c0009nuj96gm7cyxc","cmovo1jlk001pnunk7ry8ea4a",
  "cmovo1j9o001inunkpohxaiig","cmovo1jcg001knunkwcre7lcw","cmoruz90k000anup7ny3sqfer",
  "cmor7atsa00014y4ux7rw2cbj","cmor7atv200024y4usgg8a05y","cmor7atxp00034y4uw17xucs6",
  "cmor7ax3c00014y6pchcsdypw","cmor7ax5k00024y6pwxha42lk","cmor7ax7r00034y6phrnxs8e8",
  "cmor7b7rt00024ycr05sp2hpw","cmor7bfds00014yg1yr0n974v","cmoruz923000bnup7wh4rl8nk",
  "cmoruz93n000cnup7m0g4279d","cmoukexzc000rnuj9mt7ecmbd","cmovo1jb2001jnunk3d8itwls",
  "cmovo1j8a001hnunkuzjetd30","cmovo1jia001onunkpsf194sn","cmovo1jfj001mnunk4mhm67o8",
  "cmos6ds4w000fnu1fz4ighzlh","cmox3ts6o001fnuqnkjyip35y","cmovo1je7001lnunkior3m2bh",
  "cmovo24cj001rnunkhqbegs3g","cmor7b7lc00004ycrfnw8axm8","cmor7bxv200014ypv1fo1wv3v",
  "cmor7b4al00004yahmli5sojr","cmor7b4hm00024yahctvf9ktp","cmor7b4os00044yahswljem5s",
  "cmor7aqjj00004y2w9p38q4vj","cmor7aqo000014y2wz15lfy40","cmor7aqsf00024y2w3i78htkj",
  "cmor7aquq00034y2wdzll4s98","cmor7aqxp00044y2w19aqc2k8","cmor7axa500044y6pkakm7smr",
  "cmor7bcki00014yez438b4mgd","cmor7b4f400014yah3z7qhrqh","cmor7b4lo00034yah4qiolnsk",
  "cmoruwa0v000anuywoop vefjs","cmor7bcq900024yezxmums57h","cmor7atmy00004y4upruz8quv",
  "cmor7au0600044y4u7vncvwnj","cmor7awyf00004y6pec13no4d","cmor7b7pf00014ycr3e73ylse",
  "cmor7b7vw00034ycrbrkuxiwe","cmor7bcer00004yezdjxgsb3p","cmor7by3p00044ypv5ksuevoo",
  "cmoruwa41000cnuyw4kh9caxl","cmoruw9hd0000nuywkp5ieh8j","cmoruw9m60002nuywls8st62m",
  "cmoruw9nq0003nuywsiasx7xt","cmoruw9pe0004nuywlieh6bbg","cmovo1jgy001nnunkjj4k1w9u",
];

// ---------------------------------------------------------------------------
// 40 replacement dialogue items
// ---------------------------------------------------------------------------
interface NewItem {
  cefrLevel: string;
  prompt: string;
  transcript: string;
  options: Array<{ id: string; text: string; isCorrect: boolean; rationale: string }>;
  correctAnswer: string;
  tags?: string[];
}

const NEW_ITEMS: NewItem[] = [
  // ── PRE_A1 (4) ──────────────────────────────────────────────────────────
  {
    cefrLevel: "PRE_A1",
    prompt: "What does Anna want to buy?",
    correctAnswer: "B",
    tags: ["dialogue","everyday"],
    options: [
      { id:"A", text:"A pen",         isCorrect:false, rationale:"Anna says she wants milk, not a pen." },
      { id:"B", text:"Milk",          isCorrect:true,  rationale:"Anna says 'I need milk, please.'" },
      { id:"C", text:"Bread",         isCorrect:false, rationale:"Bread is not mentioned by Anna." },
      { id:"D", text:"An apple",      isCorrect:false, rationale:"Anna does not ask for an apple." },
    ],
    transcript: `Anna: Hello. I need milk, please.
Shop Assistant: How much do you need?
Anna: One litre, please.
Shop Assistant: Here you are. That is one pound.
Anna: Thank you. Goodbye!
Shop Assistant: Goodbye!`,
  },
  {
    cefrLevel: "PRE_A1",
    prompt: "Where is the cat?",
    correctAnswer: "C",
    tags: ["dialogue","home"],
    options: [
      { id:"A", text:"On the sofa",   isCorrect:false, rationale:"The cat is not on the sofa." },
      { id:"B", text:"In the garden", isCorrect:false, rationale:"The cat is not in the garden." },
      { id:"C", text:"Under the bed", isCorrect:true,  rationale:"Mum says 'The cat is under the bed.'" },
      { id:"D", text:"In the kitchen",isCorrect:false, rationale:"The kitchen is not mentioned." },
    ],
    transcript: `Tom: Mum, where is my cat?
Mum: I do not know, Tom. Look in your room.
Tom: She is not here. Is she in the garden?
Mum: No, I think she is under the bed.
Tom: Oh yes! Here she is!
Mum: Good. Now close the door.`,
  },
  {
    cefrLevel: "PRE_A1",
    prompt: "What colour is the ball?",
    correctAnswer: "A",
    tags: ["dialogue","playground"],
    options: [
      { id:"A", text:"Red",    isCorrect:true,  rationale:"Sam says 'My ball is red.'" },
      { id:"B", text:"Blue",   isCorrect:false, rationale:"Blue is not mentioned." },
      { id:"C", text:"Green",  isCorrect:false, rationale:"Sam's ball is not green." },
      { id:"D", text:"Yellow", isCorrect:false, rationale:"The ball is not yellow." },
    ],
    transcript: `Sam: Can I play with you?
Lucy: Yes! What game do you want to play?
Sam: Can we use my ball?
Lucy: OK. What colour is it?
Sam: My ball is red.
Lucy: I love red! Let's play!`,
  },
  {
    cefrLevel: "PRE_A1",
    prompt: "What does the boy want for lunch?",
    correctAnswer: "D",
    tags: ["dialogue","food"],
    options: [
      { id:"A", text:"Soup",   isCorrect:false, rationale:"The boy does not ask for soup." },
      { id:"B", text:"Rice",   isCorrect:false, rationale:"Rice is not mentioned." },
      { id:"C", text:"Pasta",  isCorrect:false, rationale:"The boy does not mention pasta." },
      { id:"D", text:"A sandwich", isCorrect:true, rationale:"The boy says 'I want a sandwich, please.'" },
    ],
    transcript: `Dad: Are you hungry?
Boy: Yes, Dad. Very hungry!
Dad: What do you want for lunch?
Boy: I want a sandwich, please.
Dad: OK. Do you want cheese or ham?
Boy: Cheese, please.
Dad: Good choice!`,
  },

  // ── A1 (5) ──────────────────────────────────────────────────────────────
  {
    cefrLevel: "A1",
    prompt: "Why is Emma late for school?",
    correctAnswer: "B",
    tags: ["dialogue","school"],
    options: [
      { id:"A", text:"She missed the bus",     isCorrect:false, rationale:"Emma does not mention the bus." },
      { id:"B", text:"She woke up late",       isCorrect:true,  rationale:"Emma says 'I woke up very late this morning.'" },
      { id:"C", text:"She forgot her bag",     isCorrect:false, rationale:"She did not forget her bag." },
      { id:"D", text:"There was heavy traffic",isCorrect:false, rationale:"Traffic is not mentioned." },
    ],
    transcript: `Teacher: Emma, why are you late?
Emma: Sorry, Ms. Brown. I woke up very late this morning.
Teacher: Did you have breakfast?
Emma: No, I didn't have time.
Teacher: You must eat breakfast. It is important.
Emma: I know. I will not be late again.
Teacher: Please sit down and open your book.`,
  },
  {
    cefrLevel: "A1",
    prompt: "What sport does Jack want to try?",
    correctAnswer: "C",
    tags: ["dialogue","sports"],
    options: [
      { id:"A", text:"Football",  isCorrect:false, rationale:"Jack already plays football." },
      { id:"B", text:"Swimming",  isCorrect:false, rationale:"Swimming is not mentioned." },
      { id:"C", text:"Tennis",    isCorrect:true,  rationale:"Jack says 'I really want to try tennis.'" },
      { id:"D", text:"Basketball",isCorrect:false, rationale:"Jack does not mention basketball." },
    ],
    transcript: `Jack: Do you play any sport after school?
Kate: Yes, I go swimming on Tuesdays and Thursdays.
Jack: That sounds fun! I only play football.
Kate: Do you want to try something new?
Jack: Yes! I really want to try tennis.
Kate: There is a tennis club at school. We can join together.
Jack: Great! Let's do it.`,
  },
  {
    cefrLevel: "A1",
    prompt: "What will they do at the weekend?",
    correctAnswer: "A",
    tags: ["dialogue","weekends"],
    options: [
      { id:"A", text:"Go to the cinema",isCorrect:true,  rationale:"They agree to go to the cinema on Saturday." },
      { id:"B", text:"Visit a museum", isCorrect:false, rationale:"The museum is suggested but not agreed upon." },
      { id:"C", text:"Have a picnic",  isCorrect:false, rationale:"A picnic is not mentioned." },
      { id:"D", text:"Go shopping",    isCorrect:false, rationale:"They do not decide to go shopping." },
    ],
    transcript: `Maria: What are you doing this weekend?
Tom: I don't know yet. Do you have a plan?
Maria: We could visit a museum or go to the cinema.
Tom: I went to the museum last week. Can we go to the cinema?
Maria: Sure! There is a new film on Saturday.
Tom: What time does it start?
Maria: Three o'clock. I can meet you outside at half past two.
Tom: Perfect. See you then!`,
  },
  {
    cefrLevel: "A1",
    prompt: "What does the girl buy at the café?",
    correctAnswer: "B",
    tags: ["dialogue","food","café"],
    options: [
      { id:"A", text:"Orange juice and a cake",  isCorrect:false, rationale:"She orders hot chocolate, not juice." },
      { id:"B", text:"Hot chocolate and a muffin",isCorrect:true, rationale:"She says 'Can I have a hot chocolate and a blueberry muffin?'" },
      { id:"C", text:"Tea and a sandwich",       isCorrect:false, rationale:"She does not order tea or a sandwich." },
      { id:"D", text:"Coffee and a biscuit",     isCorrect:false, rationale:"Coffee and biscuit are not what she orders." },
    ],
    transcript: `Waiter: Good afternoon! What can I get you?
Girl: Can I have a hot chocolate and a blueberry muffin, please?
Waiter: Of course. Anything else?
Girl: No, thank you. How much is it?
Waiter: That's three pounds fifty, please.
Girl: Here you are.
Waiter: Thank you. I'll bring it to your table.`,
  },
  {
    cefrLevel: "A1",
    prompt: "What is the weather like in the story?",
    correctAnswer: "D",
    tags: ["dialogue","weather"],
    options: [
      { id:"A", text:"Sunny and warm", isCorrect:false, rationale:"It is not sunny." },
      { id:"B", text:"Windy and cold", isCorrect:false, rationale:"Wind is not mentioned." },
      { id:"C", text:"Hot and dry",    isCorrect:false, rationale:"It is not described as hot." },
      { id:"D", text:"Rainy and cloudy",isCorrect:true, rationale:"Ben says 'It is raining again!' and they see dark clouds." },
    ],
    transcript: `Ben: Look outside! It is raining again!
Anna: I know. And the clouds are very dark.
Ben: I wanted to play in the park today.
Anna: We can play inside. Do you want to do a puzzle?
Ben: OK. Do you have a big puzzle?
Anna: Yes, it has five hundred pieces. It is a picture of a castle.
Ben: That sounds great! Let's start now.`,
  },

  // ── A2 (7) ──────────────────────────────────────────────────────────────
  {
    cefrLevel: "A2",
    prompt: "Why does Carlos want to change his doctor?",
    correctAnswer: "C",
    tags: ["dialogue","health"],
    options: [
      { id:"A", text:"The doctor's clinic is too far",   isCorrect:false, rationale:"Distance is not mentioned." },
      { id:"B", text:"The doctor is very expensive",     isCorrect:false, rationale:"Cost is not the reason given." },
      { id:"C", text:"He always waits a long time",      isCorrect:true,  rationale:"Carlos says 'I wait for more than an hour every time I visit.'" },
      { id:"D", text:"The doctor does not speak Spanish",isCorrect:false, rationale:"Language is not mentioned." },
    ],
    transcript: `Carlos: I'm thinking about changing my doctor.
Rachel: Why? Is something wrong?
Carlos: Every time I visit, I wait for more than an hour.
Rachel: That's terrible! Does your doctor know?
Carlos: I told the receptionist, but nothing changed.
Rachel: You should find a new clinic. My doctor is excellent and very punctual.
Carlos: Really? Can you give me her number?
Rachel: Of course. I'll text it to you this evening.`,
  },
  {
    cefrLevel: "A2",
    prompt: "What does Ahmed decide to give as a birthday present?",
    correctAnswer: "B",
    tags: ["dialogue","shopping"],
    options: [
      { id:"A", text:"A book",   isCorrect:false, rationale:"Ahmed does not choose a book." },
      { id:"B", text:"A scarf",  isCorrect:true,  rationale:"Ahmed says 'I think I'll get the blue scarf.'" },
      { id:"C", text:"Perfume",  isCorrect:false, rationale:"Perfume is mentioned but not chosen." },
      { id:"D", text:"Chocolates",isCorrect:false, rationale:"Chocolates are not what Ahmed decides to buy." },
    ],
    transcript: `Ahmed: I need to buy a birthday present for my mum. Any ideas?
Olivia: What does she like?
Ahmed: She loves fashion. I was thinking about perfume, but I'm not sure.
Olivia: How about a nice scarf? There are some beautiful ones in this shop.
Ahmed: That blue one looks lovely. How much is it?
Olivia: Twelve euros. It's really good quality.
Ahmed: Perfect. I think I'll get the blue scarf. She'll love it.
Olivia: Great choice! Do you need gift wrapping?
Ahmed: Yes, please!`,
  },
  {
    cefrLevel: "A2",
    prompt: "What problem does the student have with the trip?",
    correctAnswer: "A",
    tags: ["dialogue","school"],
    options: [
      { id:"A", text:"He doesn't have enough money",    isCorrect:true,  rationale:"James says 'I don't think I can afford it.'" },
      { id:"B", text:"He doesn't like history",         isCorrect:false, rationale:"He seems interested in the trip." },
      { id:"C", text:"His parents didn't give permission",isCorrect:false, rationale:"Parents are not mentioned in this context." },
      { id:"D", text:"The trip conflicts with an exam", isCorrect:false, rationale:"An exam is not mentioned." },
    ],
    transcript: `Teacher: Don't forget — the history trip to Rome is next month. Have you all handed in your forms?
James: Ms. Davis, I'm not sure I can come.
Teacher: Why not, James? Is everything okay?
James: I don't think I can afford it. The trip costs quite a lot.
Teacher: I understand. You should speak to the school office. There is sometimes financial support available.
James: Really? I didn't know that.
Teacher: Yes. Please go and ask tomorrow morning. I want everyone to come if possible.
James: Thank you, Ms. Davis. I will ask.`,
  },
  {
    cefrLevel: "A2",
    prompt: "What will Elena and Marco cook for the party?",
    correctAnswer: "D",
    tags: ["dialogue","food","planning"],
    options: [
      { id:"A", text:"Pizza",  isCorrect:false, rationale:"Pizza is mentioned as an option but not chosen." },
      { id:"B", text:"Tacos",  isCorrect:false, rationale:"Tacos are not mentioned." },
      { id:"C", text:"Salad",  isCorrect:false, rationale:"Salad alone is not their main dish." },
      { id:"D", text:"Pasta",  isCorrect:true,  rationale:"Marco says 'Let's make pasta then — everyone likes it.'" },
    ],
    transcript: `Elena: We need to decide what to cook for Saturday's party.
Marco: How many people are coming?
Elena: About fifteen. Some are vegetarian.
Marco: Then pizza is difficult — not everyone likes the same toppings.
Elena: You're right. What about pasta? We could make a big vegetable sauce.
Marco: Let's make pasta then — everyone likes it. And it's easy to cook for a large group.
Elena: Great idea! I'll buy the ingredients on Friday.
Marco: I can help you cook on Saturday morning.
Elena: Perfect. Thanks, Marco!`,
  },
  {
    cefrLevel: "A2",
    prompt: "What does Lisa say about the film?",
    correctAnswer: "C",
    tags: ["dialogue","film"],
    options: [
      { id:"A", text:"The story was boring",     isCorrect:false, rationale:"Lisa does not say the story was boring." },
      { id:"B", text:"The actors were terrible", isCorrect:false, rationale:"Lisa does not criticise the actors." },
      { id:"C", text:"It was too long",           isCorrect:true,  rationale:"Lisa says 'It was good but a bit too long for me.'" },
      { id:"D", text:"The ending was confusing",  isCorrect:false, rationale:"Lisa does not mention the ending." },
    ],
    transcript: `Ryan: Did you see the new superhero film last night?
Lisa: Yes, I did! Did you see it too?
Ryan: Not yet. Was it good?
Lisa: It was good but a bit too long for me. Almost three hours!
Ryan: Wow, that is long. Was the action exciting?
Lisa: Very exciting! The special effects were amazing. I just got tired near the end.
Ryan: I'll probably see it this weekend. My brother really wants to go.
Lisa: He will love it — the final scene is incredible.`,
  },
  {
    cefrLevel: "A2",
    prompt: "Why did Amina join the running club?",
    correctAnswer: "A",
    tags: ["dialogue","sport","health"],
    options: [
      { id:"A", text:"To get fitter and meet new people",isCorrect:true,  rationale:"Amina says 'I wanted to get fitter and also make new friends.'" },
      { id:"B", text:"Because her parents told her to",  isCorrect:false, rationale:"Her parents are not mentioned." },
      { id:"C", text:"To prepare for a race",           isCorrect:false, rationale:"A race is not why she joined initially." },
      { id:"D", text:"Because it was free",             isCorrect:false, rationale:"Cost is not mentioned." },
    ],
    transcript: `Peter: Hey Amina! I saw you running in the park this morning.
Amina: Yes! I joined the running club three weeks ago.
Peter: Oh cool! Why did you decide to join?
Amina: I wanted to get fitter and also make new friends. I moved here six months ago and don't know many people.
Peter: That's a great idea. Is it a big club?
Amina: About twenty people. We meet every Tuesday and Saturday morning.
Peter: Maybe I should join too. I've been wanting to do more exercise.
Amina: You should! Just come on Saturday. Everyone is very friendly.`,
  },
  {
    cefrLevel: "A2",
    prompt: "What does Daniel do when he loses something important?",
    correctAnswer: "B",
    tags: ["dialogue","everyday","school"],
    options: [
      { id:"A", text:"He asks his teacher immediately",   isCorrect:false, rationale:"He goes to the lost property office, not the teacher." },
      { id:"B", text:"He goes to the school lost property office",isCorrect:true, rationale:"Daniel says 'I went straight to the lost property office.'" },
      { id:"C", text:"He sends a message to his parents", isCorrect:false, rationale:"Parents are not part of his plan." },
      { id:"D", text:"He searches the classroom alone",   isCorrect:false, rationale:"He doesn't search alone first." },
    ],
    transcript: `Sofia: Did you find your phone?
Daniel: Yes, I did! I was so relieved.
Sofia: Where was it?
Daniel: Someone handed it in to the lost property office. When I noticed it was missing, I went straight there.
Sofia: That was smart. A lot of people just panic.
Daniel: Well, I've lost things before. Now I know the best thing to do.
Sofia: I should remember that. I always waste time looking everywhere first.
Daniel: Go to lost property first — it saves a lot of stress!`,
  },

  // ── B1 (8) ──────────────────────────────────────────────────────────────
  {
    cefrLevel: "B1",
    prompt: "What does the manager suggest to improve team communication?",
    correctAnswer: "C",
    tags: ["dialogue","work"],
    options: [
      { id:"A", text:"Use a new messaging app",            isCorrect:false, rationale:"An app is not the suggested solution." },
      { id:"B", text:"Hold daily one-to-one meetings",     isCorrect:false, rationale:"Daily individual meetings are not mentioned." },
      { id:"C", text:"Have a short weekly team meeting",   isCorrect:true,  rationale:"The manager says 'I'd like to introduce a short meeting every Monday morning.'" },
      { id:"D", text:"Send weekly written reports",        isCorrect:false, rationale:"Written reports are not the manager's suggestion." },
    ],
    transcript: `Manager: I've noticed that some projects have had delays recently because of miscommunication between team members.
Employee: Yes, I agree. Sometimes I'm not sure what other people are working on.
Manager: I'd like to introduce a short meeting every Monday morning — about fifteen minutes — just to share updates.
Employee: That sounds helpful. Would it be for everyone or just project leads?
Manager: Everyone. That way the whole team stays informed.
Employee: Good idea. Can we also have a shared document to track progress?
Manager: Absolutely. I'll set that up this week. Thanks for the suggestion.
Employee: Thank you. I think it will really help.`,
  },
  {
    cefrLevel: "B1",
    prompt: "What is the main reason the two friends disagree about social media?",
    correctAnswer: "D",
    tags: ["dialogue","social media","debate"],
    options: [
      { id:"A", text:"One of them is addicted to it",       isCorrect:false, rationale:"Addiction is not directly stated." },
      { id:"B", text:"They use different platforms",        isCorrect:false, rationale:"Platform differences are not the key disagreement." },
      { id:"C", text:"One cannot afford a smartphone",      isCorrect:false, rationale:"Money is not the issue here." },
      { id:"D", text:"One thinks it connects people; the other thinks it isolates them",isCorrect:true, rationale:"Jack says it brings people together; Natasha argues it makes people lonelier." },
    ],
    transcript: `Jack: I think social media is really positive. It helps people stay connected with friends and family.
Natasha: I disagree, actually. I think it often makes people lonelier.
Jack: How can connecting with hundreds of people make you lonelier?
Natasha: Because those connections aren't real. You're not having actual conversations — just looking at each other's highlight reels.
Jack: But for people who live far from their families, it's a lifeline. My cousin moved abroad and we talk on video every week because of it.
Natasha: That's a fair point. But for most people, it replaces going out and meeting friends.
Jack: I think it depends on how you use it. It's a tool — not good or bad by itself.
Natasha: Maybe. But I notice I always feel worse after scrolling for an hour.`,
  },
  {
    cefrLevel: "B1",
    prompt: "What compromise do they reach about the holiday destination?",
    correctAnswer: "A",
    tags: ["dialogue","travel","planning"],
    options: [
      { id:"A", text:"Go to a coastal city that also has historical sites",isCorrect:true, rationale:"They agree on a place with both the beach and old buildings, like Valencia or Lisbon." },
      { id:"B", text:"Take two separate holidays",       isCorrect:false, rationale:"Separate holidays are not suggested." },
      { id:"C", text:"Visit the mountains instead",     isCorrect:false, rationale:"Mountains are not the compromise." },
      { id:"D", text:"Let the travel agent decide",     isCorrect:false, rationale:"A travel agent is not mentioned." },
    ],
    transcript: `Elena: I'd love to go somewhere by the sea this summer. Maybe Greece or Portugal.
Carlos: I was hoping to see some history and culture. I've been reading about Rome.
Elena: Rome's beautiful but it gets so hot in July, and I really need to relax on a beach.
Carlos: What if we found a place with both? Somewhere coastal but with some history.
Elena: Like Valencia or Lisbon?
Carlos: Exactly! Lisbon has amazing old neighbourhoods and it's on the Atlantic coast.
Elena: That sounds perfect actually. We could visit the Alfama district one day and spend another day at the beach.
Carlos: Great. I'll look up flights tonight. June might be cheaper than July.
Elena: Let's do it. I'm excited already.`,
  },
  {
    cefrLevel: "B1",
    prompt: "What does the student plan to do to improve her grades?",
    correctAnswer: "B",
    tags: ["dialogue","education","study"],
    options: [
      { id:"A", text:"Ask her parents to hire a private tutor",isCorrect:false, rationale:"She does not mention a private tutor." },
      { id:"B", text:"Attend the after-school study sessions and make a revision schedule",isCorrect:true, rationale:"She says she'll join the after-school group and make a weekly plan." },
      { id:"C", text:"Take extra exams to improve her score",  isCorrect:false, rationale:"Extra exams are not mentioned." },
      { id:"D", text:"Change her main subjects",               isCorrect:false, rationale:"She does not plan to change subjects." },
    ],
    transcript: `Teacher: I wanted to talk to you about your recent test results, Lucia. How are you feeling about Chemistry?
Lucia: Honestly, I'm struggling. I understand things in class, but then I forget them by the test.
Teacher: That's common. The key is regular revision, not just studying the night before.
Lucia: I know. I've been trying, but I don't really have a system.
Teacher: I run after-school study sessions on Wednesdays. It might help to come along.
Lucia: I hadn't thought about that. Would there be other students there?
Teacher: Yes, small groups. You can ask questions and work together.
Lucia: I'll definitely come next week. And I think I should make a weekly revision schedule too.
Teacher: That's an excellent idea. Consistency is everything.`,
  },
  {
    cefrLevel: "B1",
    prompt: "Why does the man say he is unlikely to buy an electric car soon?",
    correctAnswer: "C",
    tags: ["dialogue","environment","transport"],
    options: [
      { id:"A", text:"He doesn't like the design of electric cars",isCorrect:false, rationale:"Design is not mentioned." },
      { id:"B", text:"He thinks they are unreliable",               isCorrect:false, rationale:"Reliability is not his concern." },
      { id:"C", text:"The upfront cost is too high for him",        isCorrect:true,  rationale:"David says 'The upfront price is still out of my budget.'" },
      { id:"D", text:"There are no charging stations near his home",isCorrect:false, rationale:"He is not worried about charging infrastructure." },
    ],
    transcript: `Rachel: I'm thinking about getting an electric car. What do you think?
David: I think they're great for the environment. The running costs are much lower too.
Rachel: Exactly! No petrol, and maintenance is cheaper because there are fewer moving parts.
David: I'd love one, but the upfront price is still out of my budget.
Rachel: Prices are dropping quite fast though. And there are government grants available.
David: I know. Maybe in a few years it'll be more realistic for me.
Rachel: I found a second-hand one that's only two years old and already much cheaper.
David: Second-hand electric? I hadn't considered that. Are they reliable?
Rachel: Mine has been perfect. I'd definitely recommend it.`,
  },
  {
    cefrLevel: "B1",
    prompt: "What is the purpose of the community garden project?",
    correctAnswer: "D",
    tags: ["dialogue","community","environment"],
    options: [
      { id:"A", text:"To make the neighbourhood more expensive",  isCorrect:false, rationale:"Property values are not the aim." },
      { id:"B", text:"To create a business selling vegetables",   isCorrect:false, rationale:"It is not a commercial project." },
      { id:"C", text:"To give children space to do sport",        isCorrect:false, rationale:"Sport is not mentioned." },
      { id:"D", text:"To provide fresh food and bring residents together",isCorrect:true, rationale:"She says it will give people access to fresh produce and a chance to socialise." },
    ],
    transcript: `Interviewer: Can you tell us about the community garden project?
Organiser: Of course. The idea started because there are many families in this area who don't have gardens and find fresh vegetables expensive.
Interviewer: So the main goal is to improve access to food?
Organiser: Yes, but also to create a shared space. Gardening together is a wonderful way for neighbours to meet each other.
Interviewer: How is it funded?
Organiser: Through a local council grant and small donations. Everyone who participates contributes a few hours a week.
Interviewer: Have you seen any changes in the community?
Organiser: Absolutely. People who never spoke to each other before are now friends. It's been quite magical.`,
  },
  {
    cefrLevel: "B1",
    prompt: "What does the doctor advise the patient to do first?",
    correctAnswer: "A",
    tags: ["dialogue","health"],
    options: [
      { id:"A", text:"Keep a food diary for two weeks",    isCorrect:true,  rationale:"The doctor says 'I'd like you to keep a food diary for two weeks.'" },
      { id:"B", text:"Start a strict diet immediately",   isCorrect:false, rationale:"A strict diet is not immediately recommended." },
      { id:"C", text:"Take medication every morning",     isCorrect:false, rationale:"Medication is not prescribed first." },
      { id:"D", text:"Exercise for one hour every day",   isCorrect:false, rationale:"One hour daily is not what the doctor prescribes." },
    ],
    transcript: `Patient: Doctor, I've been feeling tired all the time and I've gained weight over the past year.
Doctor: I see. Have there been any major changes in your lifestyle — work stress, less sleep, different eating habits?
Patient: All three, really. I changed jobs and I've been eating a lot of convenience food.
Doctor: That could certainly be a factor. I'd like you to keep a food diary for two weeks — write down everything you eat and drink.
Patient: Just a diary? I thought you might put me on a diet straight away.
Doctor: I want to understand your current habits first before making any recommendations.
Patient: That makes sense. Should I also start exercising?
Doctor: Some gentle walking would be good, but let's focus on the diary first. Then we can make a proper plan together.`,
  },
  {
    cefrLevel: "B1",
    prompt: "What is Dr. Patel's main concern about the new development project?",
    correctAnswer: "B",
    tags: ["dialogue","environment","community"],
    options: [
      { id:"A", text:"The project will create too much noise",     isCorrect:false, rationale:"Noise is not Dr. Patel's main concern." },
      { id:"B", text:"Local wildlife habitats will be destroyed",  isCorrect:true,  rationale:"Dr. Patel says 'My main worry is the woodland. It's home to protected species.'" },
      { id:"C", text:"The construction company is not experienced",isCorrect:false, rationale:"Company experience is not raised." },
      { id:"D", text:"The project will increase house prices",      isCorrect:false, rationale:"House prices are not mentioned." },
    ],
    transcript: `Reporter: Dr. Patel, what's your view on the proposed housing development on the edge of town?
Dr. Patel: I have mixed feelings. We absolutely need more affordable housing — that's undeniable.
Reporter: But?
Dr. Patel: My main worry is the woodland on that site. It's home to protected species including several types of bats.
Reporter: The developers say they'll plant replacement trees elsewhere.
Dr. Patel: It's not that simple. Those trees are hundreds of years old. You can't just replace them. The whole ecosystem would be disrupted.
Reporter: Is there a middle ground?
Dr. Patel: I'd suggest building on the brownfield land to the south first. That would avoid destroying a habitat entirely.
Reporter: We'll bring that suggestion to the council. Thank you, Dr. Patel.`,
  },

  // ── B2 (7) ──────────────────────────────────────────────────────────────
  {
    cefrLevel: "B2",
    prompt: "What does Sarah argue is the key flaw in the proposed solution?",
    correctAnswer: "C",
    tags: ["dialogue","work","problem-solving"],
    options: [
      { id:"A", text:"It is too expensive to implement",       isCorrect:false, rationale:"Cost is not Sarah's main argument." },
      { id:"B", text:"The technology does not yet exist",      isCorrect:false, rationale:"Technology availability is not the issue." },
      { id:"C", text:"It addresses the symptom, not the underlying cause",isCorrect:true, rationale:"Sarah says 'We'd be treating the symptom rather than the cause.'" },
      { id:"D", text:"It would require hiring new staff",       isCorrect:false, rationale:"Staffing is not mentioned." },
    ],
    transcript: `James: The data consistently shows high customer churn in the first three months. My proposal is to improve the onboarding experience.
Sarah: I've looked at the same data, James, and I'm not convinced that's the root issue.
James: The onboarding process scores very poorly in exit surveys.
Sarah: But why do customers rate it poorly? I think it's because the product itself doesn't deliver on what was promised in the sales pitch.
James: So you think we should change how we sell rather than how we onboard?
Sarah: Exactly. If we improve onboarding without fixing the expectation gap, we'd be treating the symptom rather than the cause.
James: That's a fair challenge. But changing the sales approach takes much longer to implement.
Sarah: True, but a short-term fix that doesn't address the real problem will cost us more in the long run.
James: Let me look at the data from that angle. Can we meet again on Thursday?`,
  },
  {
    cefrLevel: "B2",
    prompt: "Why does the professor suggest the student revise her thesis argument?",
    correctAnswer: "A",
    tags: ["dialogue","academic","education"],
    options: [
      { id:"A", text:"The current argument is too broad to be defended adequately",isCorrect:true, rationale:"The professor says 'It's too ambitious for a dissertation of this scope.'" },
      { id:"B", text:"The topic is not original enough",     isCorrect:false, rationale:"Originality is not raised as the concern." },
      { id:"C", text:"There is insufficient secondary literature",isCorrect:false, rationale:"Literature availability is not mentioned." },
      { id:"D", text:"The writing style is too informal",   isCorrect:false, rationale:"Writing style is not the professor's concern here." },
    ],
    transcript: `Student: Professor Williams, I've been working on my thesis and I'd love your feedback on my central argument.
Professor: Of course. Tell me what you're arguing.
Student: I want to claim that social media has fundamentally changed how young people form their political identities across all Western democracies since 2010.
Professor: That's an interesting area, but I'm concerned the argument is too ambitious for a dissertation of this scope.
Student: In what sense? I have a lot of evidence.
Professor: "All Western democracies" is an enormous claim. You'd need comparative data from dozens of countries, each with very different political contexts.
Student: I see. Should I narrow it to one country?
Professor: Or one specific mechanism — how one platform affected political identity in one national context. That's defensible and still highly significant.
Student: That makes sense. I've been most interested in Twitter's role in the UK 2019 election.
Professor: Now that's a focused, arguable thesis. Pursue that direction.`,
  },
  {
    cefrLevel: "B2",
    prompt: "What is the presenter's view on the role of technology in solving climate change?",
    correctAnswer: "D",
    tags: ["dialogue","environment","science"],
    options: [
      { id:"A", text:"Technology is the only realistic solution",  isCorrect:false, rationale:"She does not say technology is the only solution." },
      { id:"B", text:"Technology cannot solve climate change",     isCorrect:false, rationale:"She does not dismiss technology." },
      { id:"C", text:"Governments should fund all green technology",isCorrect:false, rationale:"This is not her argument." },
      { id:"D", text:"Technology is necessary but insufficient without behaviour change",isCorrect:true, rationale:"She says 'Technology gives us the tools, but we also need significant changes in how we live.'" },
    ],
    transcript: `Host: Welcome to the programme. Tonight we're discussing green technology with Dr. Elena Markov. Dr. Markov, are innovations like solar panels and electric vehicles enough to stop climate change?
Dr. Markov: They're absolutely essential, but I don't think they're sufficient on their own.
Host: Why not? If we replace fossil fuels with renewables, isn't that the problem solved?
Dr. Markov: The science is clear that technology gives us the tools, but we also need significant changes in how we live — how much we consume, how we travel, what we eat.
Host: Critics would say that places an unfair burden on ordinary people rather than corporations.
Dr. Markov: That's a valid concern. Corporate accountability must come first. But ultimately, both systemic change and individual behaviour are needed.
Host: Is there a danger that focusing on individual choices lets governments off the hook?
Dr. Markov: Yes, and we must be vigilant about that. Policy and regulation are far more powerful than personal choices alone.`,
  },
  {
    cefrLevel: "B2",
    prompt: "What concern does the journalist raise about press freedom?",
    correctAnswer: "B",
    tags: ["dialogue","journalism","media"],
    options: [
      { id:"A", text:"Journalists are not well paid enough",          isCorrect:false, rationale:"Salaries are not the issue raised." },
      { id:"B", text:"Defamation laws are being used to silence critical reporting",isCorrect:true, rationale:"The journalist says 'Wealthy individuals are increasingly using defamation laws to intimidate journalists.'" },
      { id:"C", text:"Social media undermines professional journalism",isCorrect:false, rationale:"Social media is not the journalist's main concern here." },
      { id:"D", text:"News is too focused on entertainment",           isCorrect:false, rationale:"Entertainment is not the journalist's point." },
    ],
    transcript: `Interviewer: You've been an investigative journalist for over twenty years. What's your biggest concern about the state of the industry today?
Journalist: There are several, but the one that worries me most is the legal climate. Wealthy individuals and corporations are increasingly using defamation laws to intimidate journalists and prevent critical stories from being published.
Interviewer: Do you mean legal threats to silence journalists even before they publish?
Journalist: Exactly. It's called SLAPP — Strategic Lawsuits Against Public Participation. Even if you'd win in court, defending a case can cost years and hundreds of thousands of pounds.
Interviewer: Does that make self-censorship a problem in the industry?
Journalist: Absolutely. I've seen colleagues drop important investigations because their publications couldn't afford the legal risk.
Interviewer: What's the solution?
Journalist: Anti-SLAPP legislation, which several European countries are now introducing. Without it, investigative journalism cannot function properly.`,
  },
  {
    cefrLevel: "B2",
    prompt: "How does the mentor suggest the young professional handle workplace conflict?",
    correctAnswer: "A",
    tags: ["dialogue","work","career"],
    options: [
      { id:"A", text:"Address it directly in a private conversation before involving management",isCorrect:true, rationale:"The mentor says 'Have a direct conversation with that person privately before escalating.'" },
      { id:"B", text:"Ignore it and focus on her own work",  isCorrect:false, rationale:"Ignoring it is not recommended." },
      { id:"C", text:"Send a formal written complaint immediately",isCorrect:false, rationale:"Formal complaints are not the first step advised." },
      { id:"D", text:"Discuss it openly in the next team meeting",isCorrect:false, rationale:"Raising it in a team meeting is not suggested." },
    ],
    transcript: `Mentor: How are things going in your new role?
Mentee: Mostly well, but there's one colleague who consistently takes credit for ideas I've raised in meetings. It's frustrating.
Mentor: I understand that frustration. How are you currently handling it?
Mentee: Honestly, I haven't said anything. I wasn't sure if I was overreacting.
Mentor: You're not overreacting. But my advice would be to have a direct conversation with that person privately before escalating.
Mentee: I'm worried about coming across as difficult.
Mentor: The key is to be specific and factual, not accusatory. Say what you observed, not what you assume their intentions were.
Mentee: Something like 'I noticed my suggestion about X wasn't credited — can we discuss how we share ideas?'
Mentor: Exactly. That opens a conversation rather than creating a confrontation. If it continues after that, then involve your manager.`,
  },
  {
    cefrLevel: "B2",
    prompt: "What does the economist predict will happen to inequality if automation continues unchecked?",
    correctAnswer: "C",
    tags: ["dialogue","economics","society"],
    options: [
      { id:"A", text:"Wages will rise for most workers",            isCorrect:false, rationale:"She predicts wages will stagnate or fall for many." },
      { id:"B", text:"The middle class will grow significantly",    isCorrect:false, rationale:"The opposite is predicted." },
      { id:"C", text:"The gap between high and low earners will widen",isCorrect:true, rationale:"She says 'The concentration of wealth at the top will accelerate, while routine jobs disappear.'" },
      { id:"D", text:"Unemployment will briefly rise then stabilise",isCorrect:false, rationale:"She is more pessimistic than this." },
    ],
    transcript: `Interviewer: Professor Silva, how do you see automation affecting employment over the next decade?
Professor Silva: The short-term picture is concerning. We'll see significant displacement of routine cognitive tasks — data entry, basic analysis, customer service scripts.
Interviewer: But won't new jobs be created, as happened during previous industrial revolutions?
Professor Silva: That's the standard argument, and historically it has held true. But the speed of this transition is unprecedented, and I'm not confident the labour market can adapt quickly enough.
Interviewer: What's the likely social outcome if it doesn't?
Professor Silva: The concentration of wealth at the top will accelerate, while routine jobs disappear without equivalent replacements emerging in time. The gap between high and low earners will widen significantly.
Interviewer: What policy responses do you recommend?
Professor Silva: Universal basic income deserves serious consideration, as does radical reform of education to focus on creativity, complex reasoning, and interpersonal skills that machines cannot easily replicate.`,
  },
  {
    cefrLevel: "B2",
    prompt: "What does the architect propose to make the new district more sustainable?",
    correctAnswer: "D",
    tags: ["dialogue","architecture","environment"],
    options: [
      { id:"A", text:"Use cheaper building materials to reduce waste",  isCorrect:false, rationale:"Cheap materials are not her suggestion." },
      { id:"B", text:"Build taller apartment blocks to save land",      isCorrect:false, rationale:"Height is mentioned but not as the main sustainability feature." },
      { id:"C", text:"Restrict car access entirely",                    isCorrect:false, rationale:"Complete car restriction is not proposed." },
      { id:"D", text:"Integrate green roofs, solar panels, and local food growing into the design",isCorrect:true, rationale:"She says 'Every building will have a green roof, solar panels, and space allocated for food production.'" },
    ],
    transcript: `Reporter: You've been selected to design the new riverside district. What's your guiding vision?
Architect: The central idea is that sustainability shouldn't be an add-on — it has to be embedded in every design decision from the beginning.
Reporter: Can you give us specific examples?
Architect: Every building will have a green roof, solar panels, and space allocated for food production. We're thinking community allotments on rooftops and in courtyards.
Reporter: What about transport?
Architect: We want to prioritise walking and cycling, with good public transport connections. Cars won't be banned, but they won't be the default option.
Reporter: Critics say this kind of development is too expensive and becomes exclusive housing for the wealthy.
Architect: That's a real risk and one we're taking very seriously. Forty per cent of units will be social housing, and we're designing the green spaces as genuinely public, not gated amenities.`,
  },

  // ── C1 (5) ──────────────────────────────────────────────────────────────
  {
    cefrLevel: "C1",
    prompt: "What does the philosopher argue is the central problem with compatibilist free will?",
    correctAnswer: "B",
    tags: ["dialogue","philosophy","academic"],
    options: [
      { id:"A", text:"It relies on an outdated understanding of neuroscience", isCorrect:false, rationale:"Neuroscience is not her main objection." },
      { id:"B", text:"It redefines freedom in a way that trivialises the concept",isCorrect:true, rationale:"She argues compatibilists 'water down the concept to the point where it loses any meaningful force.'" },
      { id:"C", text:"It cannot explain moral responsibility in legal contexts", isCorrect:false, rationale:"Legal contexts are not discussed." },
      { id:"D", text:"It depends on empirically unverifiable claims",           isCorrect:false, rationale:"Empirical verification is not her core objection." },
    ],
    transcript: `Professor Chen: I want to push back on the compatibilist position you've been defending. You claim that free will is compatible with determinism provided our actions flow from our own desires and reasoning.
Student: That's right. Frankfurt's hierarchical model shows that we can be free even in a determined universe, as long as our second-order desires align with our first-order desires.
Professor Chen: But isn't this simply redefining freedom to mean something much weaker than what the concept traditionally implies? You've essentially said: we're free when we do what we want, even if what we want was causally inevitable.
Student: I'd argue that's the only coherent notion of freedom available to us.
Professor Chen: Or it's an attempt to preserve a word whose meaningful content has been evacuated. Hard incompatibilists like Pereboom would say you've watered down the concept to the point where it loses any meaningful force.
Student: And yet compatibilism seems to be what we actually need for moral responsibility. If hard incompatibilism is true, punishment becomes very difficult to justify.
Professor Chen: Precisely — and that may be exactly the right conclusion. Perhaps our practices of praise and blame need radical revision rather than a convenient philosophical rescue operation.`,
  },
  {
    cefrLevel: "C1",
    prompt: "What methodology problem does the researcher identify in the original study?",
    correctAnswer: "A",
    tags: ["dialogue","academic","research"],
    options: [
      { id:"A", text:"The sample was not representative of the broader population",isCorrect:true, rationale:"She says 'The cohort was drawn entirely from elite universities, which significantly limits generalisability.'" },
      { id:"B", text:"The study lacked a control group",      isCorrect:false, rationale:"Control groups are not the focus of the criticism." },
      { id:"C", text:"The statistical analysis contained errors",isCorrect:false, rationale:"Statistical errors are not raised." },
      { id:"D", text:"The researchers had conflicts of interest",isCorrect:false, rationale:"Conflicts of interest are not mentioned." },
    ],
    transcript: `Researcher A: I've been reading your paper on cognitive flexibility in bilingual adults and I have some methodological concerns I'd like to raise.
Researcher B: Of course. I'd welcome the critique.
Researcher A: The cohort was drawn entirely from elite universities, which significantly limits generalisability to the broader bilingual population. Many bilinguals acquire their second language in very different circumstances — migration, heritage language contexts, immersion schooling.
Researcher B: You're right that the sample was self-selecting, but I'd argue the findings on executive function are robust across educational level based on previous literature.
Researcher A: The previous literature also has this bias. I think the field has been consistently over-relying on WEIRD samples — Western, Educated, Industrialised, Rich, Democratic.
Researcher B: Fair point. For the follow-up study, I've already secured a partnership with community organisations to recruit a more diverse cohort.
Researcher A: Good. The theoretical contributions are genuinely interesting; it would be a shame for them to be dismissed on sampling grounds alone.`,
  },
  {
    cefrLevel: "C1",
    prompt: "What is the diplomat's main argument against imposing economic sanctions?",
    correctAnswer: "D",
    tags: ["dialogue","politics","international"],
    options: [
      { id:"A", text:"Sanctions are illegal under international law",        isCorrect:false, rationale:"Legality is not her argument." },
      { id:"B", text:"The target country's government is too powerful to be affected",isCorrect:false, rationale:"This is not her position." },
      { id:"C", text:"Trading relationships are more effective than pressure",isCorrect:false, rationale:"Trade is mentioned but not as her main objection." },
      { id:"D", text:"Sanctions disproportionately harm civilian populations rather than the ruling elite",isCorrect:true, rationale:"She says 'The evidence consistently shows that sanctions harm ordinary citizens far more than the political elites they target.'" },
    ],
    transcript: `Interviewer: The Security Council is debating further sanctions. Ambassador, do you support them?
Ambassador: I understand the impulse, and the human rights situation is genuinely alarming. But the evidence consistently shows that sanctions harm ordinary citizens far more than the political elites they target.
Interviewer: Critics would say that maintaining engagement amounts to endorsing the regime.
Ambassador: That's a false binary. Targeted measures against named individuals — asset freezes, travel bans — can exert real pressure without impoverishing a population.
Interviewer: But the regime has already survived years of targeted measures with no apparent change in behaviour.
Ambassador: Which tells us something important: coercive measures alone are insufficient. They need to be coupled with credible incentives — a pathway that the regime can take if it chooses to reform.
Interviewer: Isn't that rewarding bad behaviour?
Ambassador: I prefer to think of it as recognising political reality. Regimes rarely collapse under external pressure; they adapt. If we want genuine change, we need a negotiated framework, not just escalating punishment.`,
  },
  {
    cefrLevel: "C1",
    prompt: "According to the neuroscientist, what is the key challenge in treating treatment-resistant depression?",
    correctAnswer: "C",
    tags: ["dialogue","science","health"],
    options: [
      { id:"A", text:"Patients often stop taking medication before it can work",isCorrect:false, rationale:"Adherence is not the core challenge she identifies." },
      { id:"B", text:"There is insufficient funding for psychiatric research", isCorrect:false, rationale:"Funding is not mentioned." },
      { id:"C", text:"The neurobiological mechanisms vary significantly between patients",isCorrect:true, rationale:"She says 'The condition is not a single disease — the biological pathways can be completely different from one patient to the next.'" },
      { id:"D", text:"Side effects of current drugs are too severe",           isCorrect:false, rationale:"Side effects are not her main point." },
    ],
    transcript: `Host: Dr. Nakamura, your research focuses on treatment-resistant depression. What makes it so difficult to treat?
Dr. Nakamura: The fundamental challenge is that we're talking about a collection of conditions that share surface symptoms but have very different underlying mechanisms. Treatment-resistant depression is not a single disease — the biological pathways can be completely different from one patient to the next.
Host: So you might have two patients with identical symptoms who need entirely different treatments?
Dr. Nakamura: Exactly. Which is why the one-size-fits-all approach — trying antidepressant A, then B, then C — is so inefficient and demoralising for patients.
Host: What does your research suggest as an alternative?
Dr. Nakamura: Precision psychiatry. Using biomarkers — genetic profiles, neuroimaging, inflammatory markers — to identify which biological subtype a patient has, and matching them to the treatment most likely to work.
Host: How close are we to that being clinical reality?
Dr. Nakamura: Closer than people realise. We've published promising results with a biomarker panel that can predict response to a specific class of drugs with about seventy percent accuracy.`,
  },
  {
    cefrLevel: "C1",
    prompt: "What does the writer argue is the fundamental tension in postcolonial literature?",
    correctAnswer: "B",
    tags: ["dialogue","literature","culture"],
    options: [
      { id:"A", text:"Whether to write in indigenous or colonial languages",  isCorrect:false, rationale:"Language choice is one example, not the fundamental tension she names." },
      { id:"B", text:"Between subverting the colonial canon and being legible to it",isCorrect:true, rationale:"She says 'The writer must speak to the coloniser's tradition while simultaneously dismantling it.'" },
      { id:"C", text:"Between commercial success and literary integrity",      isCorrect:false, rationale:"Commercial pressures are not her focus." },
      { id:"D", text:"Whether postcolonial experience can be represented authentically",isCorrect:false, rationale:"Authenticity of representation is not the core tension she identifies." },
    ],
    transcript: `Interviewer: Your new critical study argues that Achebe and Rushdie, despite their very different contexts, share a common literary strategy. Can you explain?
Writer: Both writers are caught in what I call the double bind of postcolonial literature. The writer must speak to the coloniser's tradition — must be legible within it, because that's where cultural authority and audience reside — while simultaneously dismantling it.
Interviewer: So the very form they're working in is implicated in the colonial project?
Writer: Precisely. The English novel is not a neutral container. It carries assumptions about interiority, linear time, the supremacy of individual consciousness — all of which map onto a colonial worldview.
Interviewer: And yet both Achebe and Rushdie write in English.
Writer: Yes, and that's the brilliance and the trap. Achebe said, famously, that he wanted to use English in a way that felt different, that carried the weight of Igbo culture. But you can't fully escape the gravitational pull of the form you're working within.
Interviewer: Is that a pessimistic conclusion?
Writer: Not necessarily. The tension itself generates literary energy. The strain between subversion and legibility is, I'd argue, what makes these texts so dynamically alive.`,
  },

  // ── C2 (4) ──────────────────────────────────────────────────────────────
  {
    cefrLevel: "C2",
    prompt: "What does the philosopher identify as the core insufficiency of purely consequentialist approaches to AI ethics?",
    correctAnswer: "C",
    tags: ["dialogue","philosophy","AI"],
    options: [
      { id:"A", text:"Consequences cannot be measured objectively",      isCorrect:false, rationale:"Measurement problems are not her core objection." },
      { id:"B", text:"Consequentialism ignores corporate liability",     isCorrect:false, rationale:"Corporate liability is not her point." },
      { id:"C", text:"Aggregate benefit calculations can mask systematic harm to specific groups",isCorrect:true, rationale:"She argues 'utilitarian calculus tends to aggregate benefits in ways that render invisible the particular harms visited on marginalised populations.'" },
      { id:"D", text:"Algorithms cannot perform utilitarian calculations accurately",isCorrect:false, rationale:"Algorithmic capability is not her objection." },
    ],
    transcript: `Moderator: The dominant framework for AI ethics seems to be consequentialist — we assess algorithms by their outcomes. Professor Osei-Mensah, do you find that adequate?
Professor Osei-Mensah: It's a necessary starting point, but deeply insufficient as a complete framework. My concern is that utilitarian calculus tends to aggregate benefits in ways that render invisible the particular harms visited on marginalised populations.
Moderator: Can you give a concrete example?
Professor Osei-Mensah: Facial recognition systems that perform with high average accuracy while being dramatically less accurate for darker-skinned faces. The aggregate number looks acceptable; the distributional injustice is invisible to the metric.
Panellist: But couldn't you simply expand the utility function to incorporate equality constraints?
Professor Osei-Mensah: You could, but that moves you away from pure consequentialism toward something like Rawlsian justice — prioritising the worst-off rather than maximising aggregate welfare. Which I think is exactly right, but it requires acknowledging the limits of the original framework.
Moderator: So what alternative framework do you propose?
Professor Osei-Mensah: A pluralist approach that draws on deontological constraints — certain uses of AI should be prohibited regardless of consequences — combined with substantive equality requirements and democratic deliberation about which values to encode. No single ethical theory is adequate to the complexity.`,
  },
  {
    cefrLevel: "C2",
    prompt: "What is the historian's central claim about the relationship between language and historical memory?",
    correctAnswer: "A",
    tags: ["dialogue","history","language"],
    options: [
      { id:"A", text:"The vocabulary available in a given period determines which aspects of experience can be historically preserved",isCorrect:true, rationale:"She argues 'A culture can only memorialise what its available conceptual apparatus allows it to articulate.'" },
      { id:"B", text:"Translation between languages inevitably distorts historical records",isCorrect:false, rationale:"Translation is mentioned but not her central claim." },
      { id:"C", text:"Oral traditions are more reliable than written archives",isCorrect:false, rationale:"Oral vs written is not her main argument." },
      { id:"D", text:"Modern historians project contemporary concepts onto historical subjects",isCorrect:false, rationale:"Anachronism is not her focus here." },
    ],
    transcript: `Interviewer: Your book makes a provocative claim about what you call 'the linguistic limits of memory'. Can you unpack that for us?
Historian: The argument, put simply, is that a culture can only memorialise what its available conceptual apparatus allows it to articulate. If a language lacks a term for a particular kind of suffering — or social arrangement, or emotional state — then that experience tends to fall out of the historical record.
Interviewer: Isn't that just saying history is written by those with the power to write it?
Historian: That's related but distinct. I'm not primarily making a point about who controls the archive — though that matters enormously. I'm saying something more fundamental: that the texture of lived experience in the past is often radically untranslatable into the conceptual vocabularies available to later historians.
Interviewer: Could you give an example?
Historian: Medieval European concepts of 'the self' — the boundary between individual and community, between rational and spiritual agency — are so different from modern assumptions that reading medieval accounts of decision-making through a contemporary individualist lens produces systematic misreadings.
Interviewer: What's the methodological implication?
Historian: Historians need to engage in what I call conceptual archaeology — learning to think within the categories of the period under study rather than importing our own, and acknowledging honestly when we simply cannot bridge the gap.`,
  },
  {
    cefrLevel: "C2",
    prompt: "What does the economist argue is the primary reason why proposed wealth redistribution policies consistently fail to be implemented?",
    correctAnswer: "D",
    tags: ["dialogue","economics","politics"],
    options: [
      { id:"A", text:"Economists cannot agree on how to measure wealth inequality",isCorrect:false, rationale:"Measurement disagreements are not her main argument." },
      { id:"B", text:"Wealthy individuals always emigrate to avoid taxation",isCorrect:false, rationale:"Tax emigration is mentioned but not her primary explanation." },
      { id:"C", text:"Redistribution always reduces economic growth",    isCorrect:false, rationale:"This is a claim she explicitly disputes." },
      { id:"D", text:"Those with concentrated wealth exercise disproportionate influence over the political processes that would constrain them",isCorrect:true, rationale:"She says 'The very concentration of wealth that redistribution seeks to address gives its beneficiaries the political leverage to prevent meaningful reform.'" },
    ],
    transcript: `Host: Professor Andreou, the economic case for wealth redistribution seems fairly compelling in the literature. Why does it so rarely happen in practice?
Professor Andreou: Because the question is never purely economic. The very concentration of wealth that redistribution seeks to address gives its beneficiaries the political leverage to prevent meaningful reform. You can't separate the economics from the political economy.
Host: But most democracies have majority populations who would benefit from redistribution. Shouldn't voting reflect that?
Professor Andreou: In theory. But electoral influence is not proportional to votes. It's also a function of campaign financing, media ownership, think-tank funding, and the revolving door between regulatory bodies and the industries they regulate.
Host: Some economists argue that aggressive redistribution would reduce investment and growth, harming everyone.
Professor Andreou: There's very limited empirical support for the strong version of that claim. The Nordic countries have maintained high investment and innovation alongside much higher redistribution than the Anglo-American world. The argument is often more ideological than evidential.
Host: So are you pessimistic about the prospects for change?
Professor Andreou: Cautiously. The historical periods of significant redistribution — post-war Europe, the New Deal — tended to follow crises that disrupted existing power arrangements. Absent such disruption, the structural barriers are formidable.`,
  },
  {
    cefrLevel: "C2",
    prompt: "What is the neuroscientist's response to the 'hard problem of consciousness'?",
    correctAnswer: "B",
    tags: ["dialogue","neuroscience","philosophy"],
    options: [
      { id:"A", text:"The hard problem will eventually be solved through advances in brain imaging",isCorrect:false, rationale:"She does not believe brain imaging will resolve the hard problem." },
      { id:"B", text:"The hard problem may reflect a conceptual confusion rather than a genuine empirical gap",isCorrect:true, rationale:"She suggests 'What if the explanatory gap exists because we're asking a conceptually malformed question?'" },
      { id:"C", text:"Consciousness is an emergent property that cannot be studied scientifically",isCorrect:false, rationale:"She does not dismiss scientific study of consciousness." },
      { id:"D", text:"AI systems will eventually replicate consciousness, dissolving the problem",isCorrect:false, rationale:"AI replication is not her argument." },
    ],
    transcript: `Philosopher: Your work on neural correlates of consciousness has been enormously influential. But I want to press you on Chalmers' hard problem. Why is there something it is like to be you, looking at that red object?
Neuroscientist: I spend considerable time thinking about whether the hard problem is a genuine explanatory gap or a conceptual illusion that we've been seduced into taking for a deep truth.
Philosopher: That's a rather deflationary response. Are you suggesting there's nothing to explain?
Neuroscientist: Not nothing. But consider: when you ask why neural process X gives rise to the subjective quality of redness, you're presupposing that there's a brute contingent fact connecting the physical and phenomenal that requires further explanation. What if the explanatory gap exists because we're asking a conceptually malformed question?
Philosopher: Like asking what's north of the North Pole?
Neuroscientist: Precisely. Wittgenstein would say we've been bewitched by a picture — the picture of consciousness as a thing separate from brain processes, that the brain mysteriously produces. If phenomenal experience just is a certain type of information integration, the question 'but why does it feel like something?' may dissolve rather than be answered.
Philosopher: But that seems to explain away rather than explain the phenomenon. Many philosophers find eliminativism deeply unsatisfying.
Neuroscientist: I understand the intuition. But intellectual satisfaction is not a reliable guide to what's true. The history of science is full of concepts that felt indispensable and turned out to be confused — vital force in biology, phlogiston in chemistry.`,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(60));
  console.log("  REPLACE DIALOGUE ITEMS");
  console.log("=".repeat(60));

  // ── Step 1: Retire 60 bad items ─────────────────────────────────────────
  console.log(`\n[1] Retiring ${IDS_TO_RETIRE.length} DIALOGUE_SINGLE_VOICE items…`);
  const cleanIds = IDS_TO_RETIRE.map(id => id.trim());
  const retired = await prisma.item.updateMany({
    where: { id: { in: cleanIds } },
    data: {
      status: "RETIRED",
      retirementReason: "Replaced: single-voice dialogue audio — no multi-speaker TTS metadata",
    },
  });
  console.log(`  ✅ Retired: ${retired.count} items`);

  // ── Step 2: Create 40 new items ─────────────────────────────────────────
  console.log(`\n[2] Creating ${NEW_ITEMS.length} new LISTENING dialogue items…`);
  const createdIds: Array<{ id: string; cefrLevel: string; transcript: string; index: number }> = [];

  for (let i = 0; i < NEW_ITEMS.length; i++) {
    const ni = NEW_ITEMS[i];
    const speakers = extractSpeakers(ni.transcript);

    const item = await prisma.item.create({
      data: {
        skill: "LISTENING",
        type: "MULTIPLE_CHOICE",
        cefrLevel: ni.cefrLevel as any,
        status: "ACTIVE",
        isPretest: false,
        difficulty: 0,
        discrimination: 1.0,
        guessing: 0.2,
        tags: ni.tags ?? ["dialogue"],
        content: {
          prompt: ni.prompt,
          options: ni.options,
          correctAnswer: ni.correctAnswer,
          transcript: ni.transcript,
          speakers,
          numberOfSpeakers: speakers.length,
          audioUrl: "",
        } as any,
      },
    });

    createdIds.push({ id: item.id, cefrLevel: ni.cefrLevel, transcript: ni.transcript, index: i + 1 });
    process.stdout.write(`  [${i + 1}/${NEW_ITEMS.length}] Created ${item.id} (${ni.cefrLevel})\n`);
  }

  // ── Step 3: Generate multi-speaker TTS audio ────────────────────────────
  console.log(`\n[3] Generating multi-speaker TTS audio for ${createdIds.length} items…`);
  if (DRY_RUN) {
    console.log("  DRY_RUN=1 — skipping Gemini calls.\n");
    return;
  }

  let generated = 0;
  let errors = 0;

  for (const { id, cefrLevel, transcript, index } of createdIds) {
    const speakers = extractSpeakers(transcript);
    const voiceMap = assignVoices(speakers);
    const filename = `listening-${id}.wav`;
    const outputPath = path.join(PUBLIC_AUDIO_DIR, filename);
    const audioUrl = `/audio/${filename}`;

    console.log(`\n  [${index}/${createdIds.length}] ${id} (${cefrLevel})`);
    console.log(`    Speakers: ${speakers.map(s => `${s} → ${voiceMap[s]}`).join(" | ")}`);

    try {
      const speakerVoiceConfigs = speakers.map(speaker => ({
        speaker,
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceMap[speaker] } },
      }));

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ role: "user", parts: [{ text: transcript }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs } },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts?.length) throw new Error("Empty TTS response");
      const audioParts = parts.filter((p: any) => p.inlineData?.mimeType?.startsWith("audio/"));
      if (!audioParts.length) throw new Error("No audio parts");

      const pcm = Buffer.from(audioParts[0].inlineData!.data as string, "base64");
      const wav = buildWavHeader(pcm);
      fs.writeFileSync(outputPath, wav);

      await prisma.item.update({
        where: { id },
        data: { content: { update: {} } }, // trigger below
      });
      // Fetch and merge
      const existing = await prisma.item.findUniqueOrThrow({ where: { id }, select: { content: true } });
      await prisma.item.update({
        where: { id },
        data: { content: { ...(existing.content as any), audioUrl } },
      });

      console.log(`    ✓ ${filename} (${(wav.length / 1024).toFixed(0)} KB)`);
      generated++;
    } catch (err: any) {
      console.error(`    ✗ ERROR: ${err.message}`);
      errors++;
    }

    await sleep(2500);
  }

  console.log("\n" + "=".repeat(60));
  console.log(`  DONE`);
  console.log(`  Retired: ${retired.count} | Created: ${createdIds.length} | Audio generated: ${generated} | Errors: ${errors}`);
  console.log("=".repeat(60));
}

main().catch(console.error).finally(() => prisma.$disconnect());
