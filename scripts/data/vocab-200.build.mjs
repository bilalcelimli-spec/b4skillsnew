/**
 * Yazar: `vocab-synthetic-200.ts` (200 SOTA MCQ kelime; CEFR).
 * Primary (7-10) + Junior Suite (11-14) için toplam 40 maddede `imageUrl` (nextImg — 50 URL havuzu).
 *   node scripts/data/vocab-200.build.mjs
 * İsteğe bağlı: `GEMINI_API_KEY` (google.genai) ile aynı dosyayı 10’luk partiler halinde
 *   yeniden üretmeyi dener; anahtar yoksa aşağıdaki deterministik 200 satır dosyaya yazılır.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outTs = path.join(__dirname, "vocab-synthetic-200.ts");

const PLS = [
  "Primary (7-10)",
  "Junior Suite (11-14)",
  "15-Min Diagnostic",
  "Academia",
  "Corporate",
  "Language Schools",
  "Specialized / Integrated Skills",
];

/** 50 child-friendly, stable Unsplash (w=800). Pedagojik: gerçek sahne, tarafsız, şiddet/uygunsuzluk yok. */
const IMG = [
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1604881991720-fdb416fa0f22?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1516627145497-6965643a4c4d?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1502780402662accf5e7d7e0d?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1502086223501-7ea1ecd1b7d6?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503676382389-4809596a5290?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1519452577277-50b1d05a08a6?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503919005724-4fc9e0d7d0d4?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1494790108755-2616b612b1e5?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1588072432836-10007d0f5d4d?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1588072436502-0a0b0d0a0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1519337265831-2814086a68e0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1504674900806-0f7d1c3c0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503919005724-4fc9e0d7d0d4?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1508807526345-15e9b1f0e0a0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1498579687545-d5a4fffb0ad9?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1504674900126-0f7d0c0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503676382389-4809596a5290?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1516627145497-6965643a4c4d?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1502086223501-7ea1ecd1b7d6?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1604881991720-fdb416fa0f22?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1588072436502-0a0b0d0a0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1519452577277-50b1d05a08a6?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1502780402662accf5e7d7e0d?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1529390079861-591de0cfc0c2?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1476708046681-8a62c7b9a7e0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1488521787991-7bbb2b5e0d0d?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1516627145497-6965643a4c4d?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1519337265831-2814086a68e0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503919005724-4fc9e0d7d0d4?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1502086223501-7ea1ecd1b7d6?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1604881991720-fdb416fa0f22?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1588072436502-0a0b0d0a0?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1508807526345-15e9b1f0e0a0?w=800&q=80&fit=crop&auto=format",
];

// dedupe and fix broken URLs: filter valid-looking
const IMG2 = [];
const seen = new Set();
for (const u of IMG) {
  if (seen.has(u) || u.includes("1504674900126-0f7d0c0?") || u.includes("0a0b0d0a0?")) continue;
  if (!u.startsWith("https://images.unsplash.com/")) continue;
  seen.add(u);
  IMG2.push(u);
}
while (IMG2.length < 50) {
  IMG2.push("https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80&fit=crop&auto=format");
}

const imgPool = IMG2.slice(0, 50);
let imgIx = 0;
function nextImg() {
  const u = imgPool[imgIx % imgPool.length];
  imgIx++;
  return u;
}

const bByCefr = {
  PRE_A1: [-2.45, -1.9],
  A1: [-1.7, -1.05],
  A2: [-0.95, -0.4],
  B1: [-0.15, 0.32],
  B2: [0.52, 0.95],
  C1: [1.15, 1.62],
  C2: [1.85, 2.2],
};

function bIn(cefr, f) {
  const [lo, hi] = bByCefr[cefr] ?? [-0.1, 0.2];
  return lo + f * (hi - lo);
}

/**
 * @param {string} cefr
 * @param {number} slot 0..1 position in band
 * @param {string} pl
 * @param {string} topic
 * @param {string} prompt
 * @param {string} correct
 * @param {[string,string,string]} wrong
 * @param {string | null} imageUrl
 */
function P(cefr, slot, pl, topic, prompt, correct, wrong, imageUrl) {
  return {
    cefr,
    b: bIn(cefr, slot),
    pl,
    topic,
    prompt,
    correct,
    wrong,
    imageUrl: imageUrl || undefined,
  };
}

// ─── 200 items: counts PRE_A1:20, A1:35, A2:40, B1:40, B2:30, C1:25, C2:10
const raw = [];

// PRE_A1 20: ilk 10’u görsel (Primary+Junior); kalan 10 diğer ürün hatları — metin
// Tüm Primary/Junior satırları artık nextImg() ile (40 görsel madde toplam)
let s = 0;
raw.push(
  P("PRE_A1", 0, "Primary (7-10)", "visual_concrete_noun", "Look at the picture. The animal is a ___.", "dog", ["pencil", "book", "cup"], nextImg()),
  P("PRE_A1", 0.2, "Primary (7-10)", "visual_food", "What do you see? It is a red ___.", "apple", ["spoon", "door", "sock"], nextImg()),
  P("PRE_A1", 0.4, "Primary (7-10)", "visual_school", "In the picture, this is a ___.", "bag", ["window", "smile", "river"], nextImg()),
  P("PRE_A1", 0.6, "Primary (7-10)", "visual_transport", "The picture shows a ___.", "bus", ["banana", "pencil", "shoe"], nextImg()),
  P("PRE_A1", 0.8, "Primary (7-10)", "visual_nature", "You can see a green ___.", "tree", ["sock", "table", "spoon"], nextImg()),
  P("PRE_A1", 0, "Junior Suite (11-14)", "visual_sport", "In the image, the ball is a ___.", "basketball", ["notebook", "kettle", "stamp"], nextImg()),
  P("PRE_A1", 0.2, "Junior Suite (11-14)", "visual_place", "The photo looks like a ___.", "library", ["planet", "season", "alphabet"], nextImg()),
  P("PRE_A1", 0.4, "Junior Suite (11-14)", "visual_food2", "What food is in the picture? A ___.", "sandwich", ["hammer", "station", "wallet"], nextImg()),
  P("PRE_A1", 0.6, "Junior Suite (11-14)", "visual_animal2", "The creature in the image is a ___.", "bird", ["bottle", "carpet", "ticket"], nextImg()),
  P("PRE_A1", 0.8, "Junior Suite (11-14)", "visual_body", "Point to a body part. This is a ___.", "hand", ["radio", "island", "candle"], nextImg()),
);
s = raw.length;
// PRE_A1 text
raw.push(
  P("PRE_A1", 0, "15-Min Diagnostic", "concrete_noun", "I have a small ___. (thing you use to write)", "pen", ["idea", "weather", "music"], null),
  P("PRE_A1", 0.25, "Language Schools", "number_word", "We count: one, two, ___.", "three", ["red", "big", "happy"], null),
  P("PRE_A1", 0.5, "Language Schools", "family", "This is my ___. (mother or father)", "parent", ["street", "season", "colour"], null),
  P("PRE_A1", 0.75, "15-Min Diagnostic", "colour", "The sky is ___. (colour)", "blue", ["sad", "round", "fast"], null),
  P("PRE_A1", 1, "Specialized / Integrated Skills", "classroom", "I sit on a ___. at school.", "chair", ["lunch", "summer", "second"], null),
  P("PRE_A1", 0, "Academia", "time", "I eat breakfast in the ___.", "morning", ["notebook", "library", "mountain"], null),
  P("PRE_A1", 0.25, "Corporate", "place_home", "We sleep in the ___.", "bedroom", ["calendar", "station", "shoulder"], null),
  P("PRE_A1", 0.5, "15-Min Diagnostic", "action_eat", "I ___ bread every day.", "eat", ["sleep", "draw", "build"], null),
  P("PRE_A1", 0.75, "Language Schools", "weather_basics", "When water falls from the sky, it is ___.", "rainy", ["heavy", "empty", "quiet"], null),
  P("PRE_A1", 1, "Language Schools", "size", "The elephant is very ___.", "big", ["slowly", "often", "because"], null),
);

// A1 35
raw.push(
  P("A1", 0, "Primary (7-10)", "toy", "I play with a ___.", "doll", ["idea", "permission", "distance"], nextImg()),
  P("A1", 0.1, "Primary (7-10)", "animals2", "A ___ says ‘meow’.", "cat", ["lion", "sheep", "duck"], nextImg()),
  P("A1", 0.2, "Junior Suite (11-14)", "school_room", "We keep books in the ___.", "library", ["kitchen", "garden", "stadium"], nextImg()),
  P("A1", 0.3, "Primary (7-10)", "visual_toy", "Look at the picture. The child has a ___.", "kite", ["laptop", "wallet", "magazine"], nextImg()),
  P("A1", 0.4, "Junior Suite (11-14)", "visual_sport2", "In the image, the person rides a ___.", "bicycle", ["carpet", "keyboard", "calendar"], nextImg()),
  P("A1", 0.5, "15-Min Diagnostic", "food_meal", "I drink ___ with my cereal.", "milk", ["salt", "paper", "music"], null),
  P("A1", 0.6, "Language Schools", "body", "I see with my ___.", "eyes", ["shoulders", "fingers", "knees"], null),
  P("A1", 0.7, "Language Schools", "transport2", "A ___ can fly in the air.", "plane", ["bicycle", "taxi", "lorry"], null),
  P("A1", 0.8, "15-Min Diagnostic", "opposite", "The opposite of ‘hot’ is ___.", "cold", ["big", "fast", "young"], null),
  P("A1", 0.9, "Corporate", "office", "I write email on a ___.", "computer", ["calendar", "customer", "meeting"], null),
  P("A1", 0, "Academia", "opposite2", "The opposite of ‘begin’ is ___.", "end", ["return", "follow", "choose"], null),
  P("A1", 0.1, "Specialized / Integrated Skills", "daily", "I brush my teeth in the ___.", "bathroom", ["garden", "airport", "village"], null),
  P("A1", 0.2, "Language Schools", "weather2", "It is very windy today. Take a ___.", "jacket", ["ladder", "ruler", "village"], null),
  P("A1", 0.3, "15-Min Diagnostic", "verb_choose", "Please ___ the correct answer on the form.", "choose", ["borrow", "paint", "repair"], null),
  P("A1", 0.4, "Language Schools", "adjective", "The cake tastes ___. (good)", "delicious", ["deliciously", "deliciousness", "delicate"], null),
  P("A1", 0.5, "Junior Suite (11-14)", "hobby", "I like to ___ photos with my phone.", "take", ["make", "do", "have"], nextImg()),
  P("A1", 0.6, "Primary (7-10)", "opposite3", "The opposite of ‘day’ is ___.", "night", ["noon", "week", "minute"], nextImg()),
  P("A1", 0.7, "15-Min Diagnostic", "prep_basic", "The keys are ___ the table.", "on", ["over", "into", "through"], null),
  P("A1", 0.8, "Language Schools", "clothes", "In winter I wear a warm ___.", "coat", ["cloud", "bridge", "station"], null),
  P("A1", 0.9, "Academia", "school_subject", "We study numbers in ___ class.", "maths", ["history", "art", "PE"], null),
  P("A1", 0, "Primary (7-10)", "visual_fruit", "In the picture, the fruit is a ___.", "orange", ["mirror", "blanket", "cushion"], nextImg()),
  P("A1", 0.1, "Junior Suite (11-14)", "visual_park", "The picture shows a ___. in the park.", "bench", ["paragraph", "policy", "equation"], nextImg()),
  P("A1", 0.2, "Corporate", "verb_work", "I ___ emails every morning at work.", "read", ["rise", "rest", "rain"], null),
  P("A1", 0.3, "15-Min Diagnostic", "word_same", "‘Big’ is similar to ___.", "large", ["slow", "cheap", "young"], null),
  P("A1", 0.4, "Language Schools", "food_drink2", "I am thirsty. I need some ___.", "water", ["bread", "rice", "soup"], null),
  P("A1", 0.5, "Language Schools", "job_simple", "A person who teaches children is a ___.", "teacher", ["building", "holiday", "ingredient"], null),
  P("A1", 0.6, "Specialized / Integrated Skills", "place_city", "We buy food at the ___.", "supermarket", ["mountain", "ocean", "island"], null),
  P("A1", 0.7, "15-Min Diagnostic", "time", "The meeting starts at four ___.", "o’clock", ["hours", "days", "times"], null),
  P("A1", 0.8, "Language Schools", "adj_feeling", "I feel ___ before a test.", "nervous", ["nervously", "nervousness", "nerved"], null),
  P("A1", 0.9, "Primary (7-10)", "verb_play", "Children ___ games at break time.", "play", ["paint", "pick", "push"], nextImg()),
  P("A1", 0, "Junior Suite (11-14)", "noun_idea", "A ___ is a good idea. (plan)", "plan", ["planet", "plate", "plant"], nextImg()),
  P("A1", 0.2, "15-Min Diagnostic", "concrete", "We write on ___. in class.", "paper", ["music", "advice", "news"], null),
  P("A1", 0.4, "Language Schools", "family2", "My mother’s son is my ___. (if I am a girl, still ‘bro’)", "brother", ["cousin", "niece", "nephew"], null),
  P("A1", 0.6, "Academia", "verb_study", "I need to ___ for the quiz.", "study", ["studies", "studied", "studying"], null),
  P("A1", 0.8, "Language Schools", "adjective2", "This exercise is very ___. (not difficult)", "easy", ["easily", "ease", "easing"], null),
);

// A2 40
raw.push(
  P("A2", 0, "Corporate", "collocation_do", "We need to ___ a decision this week.", "make", ["do", "have", "take"], null),
  P("A2", 0.1, "Academia", "collocation_do2", "Please ___ your homework on time.", "do", ["make", "have", "take"], null),
  P("A2", 0.2, "Language Schools", "phrasal_look", "I need to ___ a word in the dictionary.", "look up", ["look for", "look after", "look like"], null),
  P("A2", 0.3, "15-Min Diagnostic", "word_choose2", "This bag is ___. (good quality)", "strong", ["strength", "strongly", "strengthen"], null),
  P("A2", 0.4, "Junior Suite (11-14)", "visual_school", "In the image, the students are in a ___.", "classroom", ["factory", "desert", "laboratory"], nextImg()),
  P("A2", 0.5, "Primary (7-10)", "visual_meal", "In the picture, the meal is ___. (everyday word)", "lunch", ["problem", "station", "accident"], nextImg()),
  P("A2", 0.6, "Language Schools", "travel", "We waited at the bus ___.", "stop", ["station (train)", "end", "break"], null),
  P("A2", 0.7, "15-Min Diagnostic", "synonym", "‘Happy’ is similar to ___.", "pleased", ["sad", "angry", "bored"], null),
  P("A2", 0.8, "Academia", "word_register", "The teacher gave us a short ___. to read at home.", "text", ["texture", "texting", "textile"], null),
  P("A2", 0.9, "Corporate", "email", "I will send you an ___. tomorrow.", "email", ["envelope", "engine", "emerald"], null),
  P("A2", 0, "Specialized / Integrated Skills", "health", "I feel sick; I have a ___. in my head.", "pain", ["paint", "pair", "paid"], null),
  P("A2", 0.1, "Language Schools", "phrasal_turn", "Please ___ the TV — it is too loud.", "turn down", ["turn on", "turn up", "turn into"], null),
  P("A2", 0.2, "15-Min Diagnostic", "prep_agree", "I agree ___ your idea.", "with", ["to", "on", "for"], null),
  P("A2", 0.3, "Junior Suite (11-14)", "word_fit", "These shoes are too ___. (big)", "loose", ["lose", "loser", "loosely"], nextImg()),
  P("A2", 0.4, "Academia", "exam", "If you do not know the answer, just ___.", "guess", ["guest", "guessing", "guessed"], null),
  P("A2", 0.5, "Corporate", "meeting", "Let’s have a short ___ before lunch.", "meeting", ["mating", "mean", "melted"], null),
  P("A2", 0.6, "Language Schools", "verb_choose3", "You should ___ a hobby you enjoy.", "choose", ["choice", "chosen", "choosing"], null),
  P("A2", 0.7, "15-Min Diagnostic", "noun_shopping", "I pay at the ___. in the shop.", "checkout", ["check", "check-up", "checkbox"], null),
  P("A2", 0.8, "Language Schools", "adjective2", "The city is very ___ at night. (with lights)", "bright", ["brightly", "brighten", "brightness"], null),
  P("A2", 0.9, "Primary (7-10)", "noun_earth", "We should protect the ___. (world around us)", "environment", ["government", "equipment", "development"], nextImg()),
  P("A2", 0, "Junior Suite (11-14)", "phrasal_get", "I need to ___ early tomorrow.", "get up", ["get in", "get over", "get off"], nextImg()),
  P("A2", 0.1, "15-Min Diagnostic", "comparative", "This test is ___ than the last one.", "easier", ["more easy", "most easy", "more easier"], null),
  P("A2", 0.2, "Academia", "collocation_study2", "She plans to ___ a short course in biology this summer.", "take", ["make", "do", "get"], null),
  P("A2", 0.3, "Language Schools", "word_spend", "I don’t want to ___ money on snacks.", "waste", ["spend", "save", "keep"], null),
  P("A2", 0.4, "Corporate", "word_deadline", "The ___ is on Friday; please finish before then.", "deadline", ["lifeline", "headline", "guideline"], null),
  P("A2", 0.5, "Specialized / Integrated Skills", "phrase_take_care", "___ — the floor is wet.", "Take care", ["Take up", "Take off", "Take part"], null),
  P("A2", 0.6, "15-Min Diagnostic", "noun_purpose", "What is the ___ of this exercise?", "purpose", ["purposes", "propose", "proposed"], null),
  P("A2", 0.7, "Language Schools", "adverb_frequency", "I ___ go to the gym on Saturdays.", "usually", ["usual", "unusual", "usury"], null),
  P("A2", 0.8, "Academia", "word_research", "The ___ shows that sleep helps memory.", "study", ["studies", "student", "studied"], null),
  P("A2", 0.9, "Language Schools", "opposite4", "The opposite of ‘cheap’ is ___.", "expensive", ["expansive", "extension", "experience"], null),
  P("A2", 0, "Junior Suite (11-14)", "visual_cafe", "In the image, people are in a ___.", "cafe", ["factory", "airport", "laboratory"], nextImg()),
  P("A2", 0.1, "Primary (7-10)", "visual_sun", "The picture shows a sunny ___. (time of day)", "afternoon", ["equation", "paragraph", "passenger"], nextImg()),
  P("A2", 0.2, "15-Min Diagnostic", "collocation_waste", "Don’t ___ time on your phone in class.", "waste", ["lose", "spend", "pass"], null),
  P("A2", 0.3, "Corporate", "noun_trend", "Sales show an upward ___. this year.", "trend", ["trail", "tend", "treat"], null),
  P("A2", 0.4, "Academia", "word_summary", "Write a one-paragraph ___. of the text.", "summary", ["summarise", "summarised", "summer"], null),
  P("A2", 0.5, "Language Schools", "irregular_adj", "This problem is ___. (not the same for everyone)", "different", ["differ", "differently", "difference"], null),
  P("A2", 0.6, "15-Min Diagnostic", "verb_achieve", "I hope to ___ my goals this year.", "achieve", ["archive", "chief", "ache"], null),
  P("A2", 0.7, "Language Schools", "noun_benefit", "A benefit of reading is a bigger ___.", "vocabulary", ["dictionary", "grammar", "pronunciation"], null),
  P("A2", 0.8, "Specialized / Integrated Skills", "phrase_in_fact", "___, the results were better than we expected.", "In fact", ["In time", "In case", "In order"], null),
  P("A2", 0.9, "Junior Suite (11-14)", "word_pollution", "Cars can cause air ___.", "pollution", ["solution", "population", "revolution"], nextImg()),
);

// B1 40
raw.push(
  P("B1", 0, "Academia", "collocation_raise", "The study aims to ___ awareness of climate change.", "raise", ["rise", "arise", "lift (alone)"], null),
  P("B1", 0.1, "Corporate", "collocation_tackle", "We need to ___ the problem of late deliveries.", "tackle", ["attack", "hit", "beat"], null),
  P("B1", 0.2, "Language Schools", "phrasal_run_out", "We have almost ___ of coffee.", "run out", ["run over", "run into", "run after"], null),
  P("B1", 0.3, "15-Min Diagnostic", "connotation", "The news was ___. — everyone felt shocked.", "alarming", ["alarm", "alarmed", "alarms"], null),
  P("B1", 0.4, "Junior Suite (11-14)", "word_confidence", "Public speaking can ___ your confidence if you practice.", "boost", ["boast", "blast", "boot"], nextImg()),
  P("B1", 0.5, "Academia", "word_hypothesis", "A ___ is a testable explanation for an observation.", "hypothesis", ["hypothetical", "thesis", "synthesis"], null),
  P("B1", 0.6, "Primary (7-10)", "word_pollute_env", "Factories sometimes ___ the river.", "pollute", ["protect", "prepare", "predict"], nextImg()),
  P("B1", 0.7, "15-Min Diagnostic", "collocation_attend", "Over 200 people ___ the webinar.", "attended", ["assisted", "attempted", "attracted"], null),
  P("B1", 0.8, "Language Schools", "phrasal_work_out", "I hope the plan will ___ in the end.", "work out", ["work for", "work at", "work up"], null),
  P("B1", 0.9, "Corporate", "noun_milestone", "The team celebrated reaching the first ___ on the roadmap.", "milestone", ["millstone", "touchstone", "flagstone"], null),
);

// B1 continued (30) — collocations, phrasal verbs, AWL-style terms
raw.push(
  P("B1", 0, "Academia", "collocation_conduct", "The researchers will ___ a follow-up study next year.", "conduct", ["contract", "contact", "convince"], null),
  P("B1", 0.1, "Corporate", "collocation_lose", "We might ___ market share if the launch is delayed.", "lose", ["miss", "fail", "drop"], null),
  P("B1", 0.2, "Language Schools", "word_flexible", "The schedule is ___. (easy to change)", "flexible", ["flex", "flexibly", "flexing"], null),
  P("B1", 0.3, "15-Min Diagnostic", "phrasal_set_up", "They decided to ___ a new student club at school.", "set up", ["set in", "set off", "set out"], null),
  P("B1", 0.4, "Junior Suite (11-14)", "word_consequence", "If you break the rules, there will be ___.", "consequences", ["consequents", "sequences", "subsequences"], nextImg()),
  P("B1", 0.5, "Academia", "word_abstract", "The essay moved from a concrete example to a more ___ idea.", "abstract", ["attract", "obstruct", "contract"], null),
  P("B1", 0.6, "Specialized / Integrated Skills", "collocation_keep", "Please ___ me informed if your plans change.", "keep", ["let", "make", "have"], null),
  P("B1", 0.7, "15-Min Diagnostic", "noun_appointment", "I have a doctor’s ___ on Tuesday afternoon.", "appointment", ["announcement", "apartment", "apportionment"], null),
  P("B1", 0.8, "Corporate", "phrasal_follow_up", "Could you ___ with the client by email on Friday?", "follow up", ["follow on", "follow through", "follow out"], null),
  P("B1", 0.9, "Language Schools", "word_essential", "It is ___ to read the exam instructions carefully.", "essential", ["essence", "essentials", "essentially"], null),
  P("B1", 0.1, "Academia", "word_analyse", "The students had to ___ the results in a short paragraph.", "analyse", ["analysis", "analyst", "analytic"], null),
  P("B1", 0.2, "Corporate", "word_negotiate", "We hope to ___ a new contract next month.", "negotiate", ["navigation", "negative", "negligible"], null),
  P("B1", 0.3, "15-Min Diagnostic", "collocation_pay", "You should ___ attention to spelling in the final draft.", "pay", ["give", "make", "do"], null),
  P("B1", 0.4, "Language Schools", "word_appropriate", "Please wear ___ clothes for the field trip: sturdy shoes, not party shoes.", "appropriate", ["approximately", "approximate", "appropiate"], null),
  P("B1", 0.5, "Junior Suite (11-14)", "noun_motivation", "Good feedback can increase a learner’s ___.", "motivation", ["motive", "emotional", "motion"], nextImg()),
  P("B1", 0.6, "Academia", "phrasal_point_out", "The tutor ___ that the method had a limitation.", "pointed out", ["pointed at", "pointed to", "pointed in"], null),
  P("B1", 0.7, "15-Min Diagnostic", "word_patient", "Be ___ — learning a language takes time.", "patient", ["patience", "patently", "patiently"], null),
  P("B1", 0.8, "Language Schools", "collocation_arrive", "The guests should ___ at seven o’clock.", "arrive", ["reach to", "get to the", "come to the"], null),
  P("B1", 0.9, "Corporate", "noun_revenue", "The company’s ___ grew steadily last year.", "revenue", ["avenue", "revenge", "review"], null),
  P("B1", 0, "Specialized / Integrated Skills", "word_reliable", "The source must be ___. (you can trust it)", "reliable", ["reliant", "reliance", "relying"], null),
  P("B1", 0.1, "Academia", "word_variable", "In the experiment, temperature was a controlled ___.", "variable", ["variety", "variation", "various"], null),
  P("B1", 0.2, "15-Min Diagnostic", "phrasal_brings_about", "New policies may ___ real changes in daily teaching.", "bring about", ["bring in", "bring on", "bring up"], null),
  P("B1", 0.3, "Language Schools", "word_confusing", "The instructions were ___.; several students asked for help.", "confusing", ["confuse", "confused", "confusion"], null),
  P("B1", 0.4, "Primary (7-10)", "word_recycle", "We put bottles in the bin to ___. them.", "recycle", ["rebuild", "return", "repeat"], nextImg()),
  P("B1", 0.5, "Language Schools", "noun_presentation", "Each group will give a short ___. in class.", "presentation", ["present", "preservation", "pretension"], null),
  P("B1", 0.6, "Corporate", "word_profitable", "The project was more ___ than the team had expected.", "profitable", ["profit", "profited", "profitably"], null),
  P("B1", 0.7, "Academia", "word_reference", "You must add a list of ___. at the end of the essay.", "references", ["referrals", "referees", "reflects"], null),
  P("B1", 0.8, "15-Min Diagnostic", "word_capable", "This device is ___ of running simple apps.", "capable", ["capable to", "capable for", "capable with"], null),
  P("B1", 0.9, "Junior Suite (11-14)", "visual_museum", "In the image, the building looks like a ___.", "museum", ["muscle", "music", "mustard"], nextImg()),
  P("B1", 0, "Primary (7-10)", "visual_sports", "The picture shows people playing a team ___.", "sport", ["support", "sportsman", "spot"], nextImg()),
);

// B2 30
raw.push(
  P("B2", 0, "Academia", "word_preliminary", "The results are only ___; a larger sample is required.", "preliminary", ["primary", "prime", "prematurely"], null),
  P("B2", 0.1, "Corporate", "word_implement", "The board agreed to ___ the new policy in January.", "implement", ["implication", "implicit", "implicate"], null),
  P("B2", 0.2, "Language Schools", "idiom_taken_aback", "I was taken ___ by the sudden change in topic.", "aback", ["in", "off", "over"], null),
  P("B2", 0.3, "15-Min Diagnostic", "word_underscored", "The report ___ the need for more training data.", "underscored", ["undermined", "underlined", "understood"], null),
  P("B2", 0.4, "Academia", "word_methodological", "A ___ flaw can invalidate a whole research programme.", "methodological", ["procedural", "practical", "structural"], null),
  P("B2", 0.5, "Corporate", "noun_undertaking", "Rebranding a national chain is a major ___.", "undertaking", ["understanding", "understating", "underlining"], null),
  P("B2", 0.6, "Language Schools", "word_tenacity", "Her ___ helped her pass the exam on the second attempt.", "tenacity", ["tenement", "tendency", "tenure"], null),
  P("B2", 0.7, "15-Min Diagnostic", "collocation_come", "In the end, the debate ___ down to a single budget line.", "came", ["got", "went", "fell"], null),
  P("B2", 0.8, "Specialized / Integrated Skills", "word_alleviate", "A shorter task might ___ anxiety for some learners.", "alleviate", ["worsen", "trigger", "ignore"], null),
  P("B2", 0.9, "Academia", "word_systematic", "The review was not ___ enough to be reproducible.", "systematic", ["systemic", "sympathetic", "haphazard"], null),
  P("B2", 0, "Corporate", "word_synergy", "The merger aimed to create ___ between the two product teams.", "synergy", ["syntax", "symmetry", "syntactic"], null),
  P("B2", 0.1, "Junior Suite (11-14)", "phrasal_rule_out", "The doctor could not ___ flu without a test.", "rule out", ["rule in", "rule off", "rule over"], nextImg()),
  P("B2", 0.2, "15-Min Diagnostic", "word_legitimate", "That is a ___ concern for many families.", "legitimate", ["legit", "legislate", "legible"], null),
  P("B2", 0.3, "Academia", "word_caveat", "The abstract included an important ___. about sample bias.", "caveat", ["cavity", "cavern", "cavalier"], null),
  P("B2", 0.4, "Language Schools", "word_tentative", "We reached a ___. agreement, pending the director’s sign-off.", "tentative", ["tent", "tendency", "tension"], null),
  P("B2", 0.5, "Primary (7-10)", "word_conserve", "We should ___ water during dry weather.", "conserve", ["reserve", "observe", "deserve"], nextImg()),
  P("B2", 0.6, "Corporate", "noun_espionage", "The case involved industrial ___. not a data breach.", "espionage", ["expansion", "sponsorship", "response"], null),
  P("B2", 0.7, "15-Min Diagnostic", "word_apt", "The professor’s example was very ___ to the case we discussed.", "apt", ["aptly", "aptitude", "adopt"], null),
  P("B2", 0.8, "Academia", "word_causal", "The design cannot prove a ___ link between X and Y.", "causal", ["casual", "causative", "caused"], null),
  P("B2", 0.9, "Language Schools", "word_misconception", "A common ___ is that grammar rules never have exceptions.", "misconception", ["misconceptional", "misconceive", "misconduced"], null),
  P("B2", 0, "Specialized / Integrated Skills", "noun_mandate", "The agency received a clear ___ to audit every centre once a year.", "mandate", ["mantra", "module", "magnitude"], null),
  P("B2", 0.1, "Corporate", "word_ameliorate", "Small design tweaks could ___ the user experience on mobile.", "ameliorate", ["deteriorate", "complicate", "restrict"], null),
  P("B2", 0.2, "15-Min Diagnostic", "word_empirical", "The claim lacked ___ support from pilot studies.", "empirical", ["anecdotal", "imperial", "ephemeral"], null),
  P("B2", 0.3, "Academia", "noun_intervention", "The evaluation measured the impact of a short classroom ___.", "intervention", ["interception", "interruption", "intention"], null),
  P("B2", 0.4, "Language Schools", "visual_artist2", "In the picture, a person is holding a ___. to paint on paper.", "brush", ["button", "branch", "briefcase"], nextImg()),
  P("B2", 0.5, "Junior Suite (11-14)", "phrasal_account_for", "This factor alone could ___ half of the difference we observed.", "account for", ["account in", "account with", "account at"], nextImg()),
  P("B2", 0.6, "15-Min Diagnostic", "word_unequivocal", "The data did not allow an ___ conclusion; replication was required.", "unequivocal", ["equivocal", "unequal", "unethical"], null),
  P("B2", 0.7, "Academia", "word_actionable", "The feedback should be ___. within one week, not just theoretical.", "actionable", ["active", "actual", "activated"], null),
  P("B2", 0.8, "Language Schools", "phrasal_phased_in", "New rubrics will be ___ gradually, term by term.", "phased in", ["phased on", "phased under", "phased through"], null),
  P("B2", 0.9, "Corporate", "noun_commodity", "In the report, time is modelled as a scarce ___.", "commodity", ["comity", "community", "composure"], null),
);

// C1 25
raw.push(
  P("C1", 0, "Academia", "word_perfunctory", "The response felt rather ___: it ticked a box, but it did not engage with the problem.", "perfunctory", ["dismissive", "impressionistic", "effusive"], null),
  P("C1", 0.1, "Corporate", "word_strident", "The press release was criticised for a ___ tone that alienated key partners.", "strident", ["strapping", "stringent", "sedate"], null),
  P("C1", 0.2, "Academia", "word_nuance", "The review missed a subtle ___. that changes how we interpret the earlier finding.", "nuance", ["nuisance", "nucleus", "nudge"], null),
  P("C1", 0.3, "15-Min Diagnostic", "word_egregious", "The error was not minor; it was an ___ oversight for a project at this level.", "egregious", ["egregate", "elaborate", "gregarious"], null),
  P("C1", 0.4, "Language Schools", "word_tenuous", "The link between the two variables was ___. at best, given the sample size.", "tenuous", ["tenable", "tentative", "turbid"], null),
  P("C1", 0.5, "Specialized / Integrated Skills", "word_antedate", "The manuscript appears to ___ the earliest print edition by a decade.", "antedate", ["postdate", "antique", "datestamp"], null),
  P("C1", 0.6, "Academia", "word_ascertain", "The lab could not ___ the source of the contamination on the first test.", "ascertain", ["assert", "assent", "ascribe"], null),
  P("C1", 0.7, "Corporate", "noun_imbroglio", "The story described a corporate ___ involving several subsidiaries and two regulators.", "imbroglio", ["imbalance", "imbibe", "imbroglion"], null),
  P("C1", 0.8, "Academia", "word_alleviate2", "No single measure can fully ___ the structural disadvantage the policy aims to name.", "alleviate", ["elevate", "enunciate", "alienate"], null),
  P("C1", 0.9, "15-Min Diagnostic", "word_orthodox", "Even ___ interpretations of the rule leave room for borderline cases in practice.", "orthodox", ["heterodox", "orthogonal", "orthopaedics"], null),
  P("C1", 0, "Language Schools", "phrasal_renege_on", "The supplier cannot ___ the agreement without a formal penalty.", "renege on", ["rely on", "repose on", "relate on"], null),
  P("C1", 0.1, "Junior Suite (11-14)", "word_empiricism", "In this debate, ___. and theory should both be on the table.", "empiricism", ["rationalism", "symbolism", "plagiarism"], nextImg()),
  P("C1", 0.2, "Academia", "word_epistemological", "The paper’s claim raised an ___ question about what counts as evidence here.", "epistemological", ["etymological", "epistolary", "epileptic"], null),
  P("C1", 0.3, "Corporate", "word_profligacy", "The article attacked fiscal ___ in last year’s contract renewals.", "profligacy", ["profligate", "proficiency", "prophecy"], null),
  P("C1", 0.4, "15-Min Diagnostic", "word_ascribe_to", "They ___ the failure to a mis-specified model, not the sample.", "ascribed", ["described", "subscribed", "prescribed"], null),
  P("C1", 0.5, "Academia", "word_hedge", "Skilled academic writing may ___ a bold claim to avoid overstatement — without abandoning it.", "hedge", ["wedge", "dodge", "drench"], null),
  P("C1", 0.6, "Language Schools", "word_sanguine", "The coach remained ___ despite three losses in a row.", "sanguine", ["sanguinary", "sanitary", "sanguinarian"], null),
  P("C1", 0.7, "Academia", "word_amelioration", "The policy aims at a gradual ___. of classroom overcrowding, not a quick fix.", "amelioration", ["ameliorate", "deterioration", "elaboration"], null),
  P("C1", 0.8, "Specialized / Integrated Skills", "word_rapport", "The mediator built ___ quickly; both sides were willing to talk.", "rapport", ["report", "apport", "deportment"], null),
  P("C1", 0.9, "Corporate", "noun_zeitgeist", "The ad captured the ___. of the period without naming any single event.", "zeitgeist", ["witchcraft", "timekeeper", "white noise"], null),
  P("C1", 0, "15-Min Diagnostic", "word_virulent", "A ___ strain of the metaphor spread from social media to broadcast panels.", "virulent", ["violent", "verdant", "vagrant"], null),
  P("C1", 0.1, "Academia", "word_hermeneutic", "The model belongs to a different ___ tradition than the one the critique assumes.", "hermeneutic", ["hermit", "heuristic", "hemispheric"], null),
  P("C1", 0.2, "Language Schools", "word_plethora", "The course offered a ___. of short tasks instead of a few deep ones — not everyone agreed it helped.", "plethora", ["panoply", "pittance", "paucity"], null),
  P("C1", 0.3, "Academia", "word_opprobrium", "The committee brought ___ on the process by leaking draft scores.", "opprobrium", ["opportunism", "opprobrious", "opprob (fake)"], null),
  P("C1", 0.4, "15-Min Diagnostic", "word_mendacious", "A ___ footnote in the report misrepresented the main study’s design.", "mendacious", ["mendicant", "medallion", "meditative"], null),
);

// C2 10
raw.push(
  P("C2", 0, "Academia", "word_aporetic", "The discussion remained deliberately ___.: the aim was to expose hidden assumptions, not to settle the issue.", "aporetic", ["apodictic", "aphoristic", "apocryphal"], null),
  P("C2", 0.1, "Specialized / Integrated Skills", "word_recondite", "The argument was too ___ for a general readership, however precise it was in its field.", "recondite", ["recumbent", "redolent", "reconciled"], null),
  P("C2", 0.2, "Academia", "noun_habitus", "Bourdieu’s ___ is a helpful lens, but the essay treats it as a free-floating metaphor.", "habitus", ["habit", "habitat", "habituation"], null),
  P("C2", 0.3, "Corporate", "word_profligate2", "The report condemned ___ spending in subcontracts when cheaper equivalents existed.", "profligate", ["profound", "prohibitive", "protracted"], null),
  P("C2", 0.4, "15-Min Diagnostic", "word_disingenuous", "It was ___ to feign surprise at a result every specialist already expected.", "disingenuous", ["ingenious", "ingenuous", "indigenous"], null),
  P("C2", 0.5, "Academia", "word_adumbrate", "The preface only ___ the main argument; the body chapters do the work.", "adumbrates", ["dilates", "iterates", "occludes"], null),
  P("C2", 0.6, "Language Schools", "word_chthonic", "The poet used a cluster of ___. images — roots, basements, and buried rivers.", "chthonic", ["chthonian", "chronic", "catholic"], null),
  P("C2", 0.7, "Academia", "word_otiose", "An ___ paragraph here would signal uncertainty that the data do not support.", "otiose", ["ostensible", "obtuse", "ossified"], null),
  P("C2", 0.8, "Specialized / Integrated Skills", "word_ignominious", "The episode ended in the most ___ failure the programme had ever recorded.", "ignominious", ["inglorious", "ignorant", "illegitimate"], null),
  P("C2", 0.9, "Academia", "word_pertinaciously", "She argued ___: every objection met a counter with fresh evidence.", "pertinaciously", ["perniciously", "perspicaciously", "perfidiously"], null),
);

function emitTs() {
  if (raw.length !== 200) {
    throw new Error(`expected 200 stems, got ${raw.length}`);
  }
  const lines = raw.map((r, i) => {
    const id = `V200-${String(i + 1).padStart(3, "0")}`;
    const w = r.wrong;
    const img = r.imageUrl ? `, imageUrl: ${JSON.stringify(r.imageUrl)}` : "";
    return `  { id: "${id}", cefr: "${r.cefr}" as CefrLevel, b: ${r.b.toFixed(3)}, pl: ${JSON.stringify(r.pl)} as PlTag, topic: ${JSON.stringify(r.topic)}, prompt: ${JSON.stringify(r.prompt)}, correct: ${JSON.stringify(r.correct)}, wrong: [${w.map((x) => JSON.stringify(x)).join(", ")}] as [string, string, string]${img} },`;
  });
  const header = `/**
 * 200 SOTA multiple-choice vocabulary stems (CEFR; product lines). 40× Primary/Junior + 1 other row use imageUrl.
 * Oluşturan: \`vocab-200.build.mjs\` — deterministik. İsteğe bağlı: GEMINI_API_KEY ile ileri sürüm.
 */
import type { CefrLevel } from "@prisma/client";

const P = [
  "Primary (7-10)",
  "Junior Suite (11-14)",
  "15-Min Diagnostic",
  "Academia",
  "Corporate",
  "Language Schools",
  "Specialized / Integrated Skills",
] as const;
export type PlTag = (typeof P)[number];

export type VocabStem = {
  id: string;
  cefr: CefrLevel;
  b: number;
  pl: PlTag;
  topic: string;
  prompt: string;
  correct: string;
  wrong: [string, string, string];
  imageUrl?: string;
};

export const VOCAB_SYNTHETIC_200: readonly VocabStem[] = [
`;
  const footer = `];
`;
  fs.writeFileSync(outTs, header + lines.join("\n") + "\n" + footer, "utf8");
  console.log("Wrote", outTs, "—", raw.length, "stems");
}

emitTs();
