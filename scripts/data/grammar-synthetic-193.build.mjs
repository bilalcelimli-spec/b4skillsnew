/**
 * One-off: generates scripts/data/grammar-synthetic-193.ts with EXACTLY 193 unique MC grammar stems.
 * Run: node scripts/data/grammar-synthetic-193.build.mjs
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const PLS = [
  "Primary (7-10)",
  "Junior Suite (11-14)",
  "15-Min Diagnostic",
  "Academia",
  "Corporate",
  "Language Schools",
  "Specialized / Integrated Skills",
];

/** Design: 11 strands × 17 + 6 = 193; each line has unique `prompt` (lexical+structural unicity). */
const stems = [
  // A — Tense & aspect (1–25)
  ["A1", "Primary (7-10)", "tense", -1.25, "My little brother ___ a bicycle every Sunday.", "rides", "ride", "is riding", "rode"],
  ["A1", "Language Schools", "tense", -1.2, "The shop ___ at nine o’clock on weekdays.", "opens", "open", "is opening", "opened"],
  ["A1", "15-Min Diagnostic", "tense", -1.15, "It ___ a lot in this region in April.", "rains", "rain", "is raining", "rained"],
  ["A2", "Junior Suite (11-14)", "tense", -0.7, "While I ___ dinner, the phone rang.", "was cooking", "cook", "cooked", "have cooked"],
  ["A2", "Corporate", "tense", -0.65, "By last Friday, the team ___ the first milestone.", "had completed", "completed", "has completed", "was completing"],
  ["A2", "Language Schools", "tense", -0.6, "I ___ in this town since 2015.", "have lived", "live", "lived", "am living"],
  ["B1", "Academia", "tense", 0, "The effect ___ replicable in two follow-up studies so far.", "has not been", "is not", "was not", "has not been being"],
  ["B1", "15-Min Diagnostic", "tense", 0.05, "We ___ the contract before we read the last page.", "should not have signed", "should not sign", "must not to sign", "ought not sign"],
  ["B1", "Primary (7-10)", "tense", 0.1, "At eight tomorrow I ___ the train to Leeds.", "will be catching", "will catch", "catch", "caught"],
  ["B1", "Corporate", "tense", 0.12, "The board ___ to announce the results next week.", "is about", "is", "are about", "has been about"],
  ["B2", "Academia", "tense", 0.65, "The manuscript ___ for six months when it was finally accepted.", "had been under review", "was under review", "has been under review", "is under review"],
  ["B2", "Specialized / Integrated Skills", "tense", 0.7, "Next July she ___ her doctorate for a decade.", "will have been pursuing", "will pursue", "is pursuing", "has pursued"],
  ["B2", "Corporate", "tense", 0.68, "No sooner had the market opened than prices ___", "began to climb", "begin to climb", "had begun to climb", "beginning to climb"],
  ["C1", "Academia", "tense", 1.35, "I wish I ___ the revised submission deadline.", "had noticed", "noticed", "would notice", "have noticed"],
  ["C1", "Specialized / Integrated Skills", "tense", 1.4, "It is time the committee ___ a formal decision on this matter.", "made", "makes", "is making", "has made"],
  ["C2", "Academia", "tense", 1.9, "Were the evidence to surface earlier, the narrative ___ very different today.", "would be", "will be", "would have been", "is"],
  ["A1", "Primary (7-10)", "tense", -1.3, "She ___ the piano for two hours every day.", "practices", "practice", "is practice", "practiced"],
  ["A1", "Language Schools", "tense", -1.28, "Water ___ at 100°C at sea level.", "boils", "is boiling", "boil", "boiled"],
  ["A2", "15-Min Diagnostic", "tense", -0.72, "When we arrived, the film ___", "had already started", "already started", "was already starting", "has already started"],
  ["A2", "Junior Suite (11-14)", "tense", -0.68, "I think she ___ the email — it’s in my inbox now.", "has received", "receives", "received", "is receiving"],
  ["B1", "Language Schools", "tense", 0.08, "This time next week, we ___ the exam.", "will be sitting", "will sit", "sit", "sitted"],
  ["B1", "Corporate", "tense", 0.1, "He ___ the minutes before the chair arrived.", "had drafted", "drafted", "has drafted", "was draft"],
  ["B2", "15-Min Diagnostic", "tense", 0.66, "All week the interns ___ the lab protocol.", "have been following", "follow", "are following", "followed"],
  ["B2", "Academia", "tense", 0.62, "By 2030, the programme ___ 10,000 teachers.", "will have trained", "will train", "trains", "has trained"],
  ["C1", "Corporate", "tense", 1.3, "If only I ___ the risks more clearly in the first draft.", "had flagged", "flagged", "have flagged", "would flag"],
  // B — Modals & semimodals (26–40)
  ["A2", "Corporate", "modal", -0.55, "You ___ smoke in the laboratory — it is strictly forbidden.", "must not", "don’t have to", "need not", "can’t to"],
  ["A2", "15-Min Diagnostic", "modal", -0.5, "The train ___ be delayed; look at the board.", "may", "must to", "has to to", "will can"],
  ["B1", "Academia", "modal", 0, "The effect ___ be an artefact of sampling bias.", "could", "can to", "must to", "should to"],
  ["B1", "Corporate", "modal", 0.02, "You ___ have informed HR before the transfer.", "should", "ought", "ought to have to", "must to"],
  ["B1", "Language Schools", "modal", 0.12, "___ you hold this for a second?", "Would", "Will", "Do", "Are"],
  ["B2", "Specialized / Integrated Skills", "modal", 0.6, "The model ___ still overfit despite regularization.", "might", "must", "ought", "shall to"],
  ["B2", "Academia", "modal", 0.64, "Participants ___ not disclose the stimulus materials.", "must", "should", "have to to", "need not to"],
  ["C1", "Corporate", "modal", 1.2, "The data ___ reasonably be read as supporting a null finding.", "may", "must", "should to", "ought"],
  ["C1", "Academia", "modal", 1.25, "In retrospect, the study ___ have used a preregistered plan.", "should", "must to", "will", "need"],
  ["A1", "Primary (7-10)", "modal", -1.1, "You ___ have a break now.", "can", "must to", "will can", "should to"],
  ["A1", "Junior Suite (11-14)", "modal", -1.05, "I ___ help you with that exercise.", "can", "must", "cans", "mays"],
  ["A2", "Language Schools", "modal", -0.58, "In the UK, you ___ be 16 to work part-time in many jobs.", "must", "need", "ought", "can to"],
  ["B1", "15-Min Diagnostic", "modal", 0.03, "The results ___ be ready by noon.", "should", "ought", "shall to", "must to"],
  ["B1", "Corporate", "modal", 0.1, "Employees ___ to complete annual training by March.", "are required", "require", "must to", "are requiring"],
  ["B2", "Academia", "modal", 0.58, "The reviewer ___ to have overlooked Table 2.", "appears", "appear", "is appearing", "has appeared to"],
  // C — Articles, determiners, quantifiers (41–60)
  ["A1", "Primary (7-10)", "article", -1.35, "She wants ___ useful tool for the project.", "a", "an", "the", "— (no article)"],
  ["A1", "Language Schools", "article", -1.32, "I saw ___ elephant at the zoo yesterday.", "an", "a", "the", "—"],
  ["A1", "15-Min Diagnostic", "article", -1.3, "___ sun rises in the east.", "The", "A", "An", "—"],
  ["A2", "Junior Suite (11-14)", "quant", -0.62, "There isn’t ___ milk for everyone.", "enough", "many", "several", "a few of"],
  ["A2", "Academia", "quant", -0.58, "We found ___ support for the hypothesis in Study 2 than in Study 1.", "weaker", "more weak", "weakest", "most weakly"],
  ["B1", "Corporate", "quant", 0.02, "___ employee is entitled to a fair hearing.", "Each", "Every of", "All of", "Both of"],
  ["B1", "Language Schools", "quant", 0.1, "She has read ___ the reports on the list.", "all of", "each of", "every of", "both of the"],
  ["B1", "15-Min Diagnostic", "quant", 0, "I need ___ more time to finish.", "a little", "little", "few", "a few of"],
  ["B2", "Academia", "quant", 0.55, "The authors cited ___ the earlier literature in their discussion.", "little of", "a little", "few of", "several of little"],
  ["B2", "Specialized / Integrated Skills", "quant", 0.6, "There is ___ any doubt left on that point after the triangulation exercise.", "hardly", "hard", "nearly", "not hardly"],
  ["C1", "Academia", "article", 1.15, "___ knowledge gained from failure is not trivial.", "The", "A", "An", "— (no article)"],
  ["C1", "Corporate", "article", 1.2, "She was promoted to ___ CEO of a spin-off last year.", "— (no article)", "a", "the", "an"],
  ["A1", "Primary (7-10)", "article", -1.38, "It’s ___ University of Leeds.", "the", "a", "an", "—"],
  ["A2", "15-Min Diagnostic", "article", -0.6, "I need to buy ___ new laptop for school.", "a", "an", "the", "—"],
  ["B1", "Junior Suite (11-14)", "quant", 0.05, "How ___ pages did you read?", "many", "much", "a lot", "several of"],
  ["B1", "Language Schools", "quant", 0.08, "We don’t have ___ paper left in the printer.", "any", "some", "no any", "many of"],
  ["B2", "Corporate", "quant", 0.57, "___ of the two proposals was adopted.", "Neither", "None", "Either of", "No one of"],
  ["B2", "Academia", "quant", 0.52, "There were ___ than twenty participants in that condition.", "fewer", "less", "more few", "more fewer"],
  ["C1", "Academia", "quant", 1.18, "She showed ___ the patience required for longitudinal fieldwork.", "considerable", "considerably", "consideration", "a consider"],
  ["C1", "Specialized / Integrated Skills", "quant", 1.22, "___ evidence points to a ceiling effect in that age band.", "Little", "A little", "Few", "A few of"],
  // D — Prepositions (61–80)
  ["A1", "Primary (7-10)", "prep", -1.4, "My birthday is ___ 12 May.", "on", "in", "at", "to"],
  ["A1", "Language Schools", "prep", -1.38, "I go to the gym ___ Mondays.", "on", "in", "at", "by"],
  ["A2", "15-Min Diagnostic", "prep", -0.7, "The keys are ___ your jacket pocket.", "in", "on", "at", "over"],
  ["A2", "Corporate", "prep", -0.65, "The meeting has been moved ___ 3 p.m.", "to", "in", "on", "at the"],
  ["B1", "Academia", "prep", 0, "The result is consistent ___ prior theory.", "with", "to", "for", "on"],
  ["B1", "Corporate", "prep", 0.05, "We apologized ___ the delay in the shipment.", "for", "on", "about the", "from"],
  ["B1", "Language Schools", "prep", 0.1, "She’s responsible ___ the newsletter.", "for", "of", "to", "in"],
  ["B2", "Academia", "prep", 0.58, "The paper draws ___ work in cognitive development.", "on", "of", "from of", "at"],
  ["B2", "Specialized / Integrated Skills", "prep", 0.62, "There is no simple substitute ___ careful piloting in item design.", "for", "to", "of", "in"],
  ["C1", "Academia", "prep", 1.1, "The participants were blind ___ condition at encoding.", "to", "for", "on", "with"],
  ["C1", "Corporate", "prep", 1.15, "Liability is limited ___ the amount stated in the contract.", "to", "for", "in", "on"],
  ["A2", "Junior Suite (11-14)", "prep", -0.68, "We met ___ a café on the high street.", "in", "on", "at in", "into"],
  ["B1", "15-Min Diagnostic", "prep", 0.04, "The course starts ___ September.", "in", "on", "at", "to"],
  ["B2", "Corporate", "prep", 0.55, "The parties agree ___ a dispute resolution procedure.", "on", "in", "for", "at"],
  ["B2", "Academia", "prep", 0.6, "The study capitalizes ___ a natural experiment.", "on", "in", "for", "with"],
  ["C1", "Academia", "prep", 1.12, "The finding is at odds ___ the dominant model.", "with", "to", "on", "for"],
  ["C1", "Specialized / Integrated Skills", "prep", 1.2, "They entered ___ an agreement in good faith.", "into", "in", "to", "on"],
  ["A1", "Primary (7-10)", "prep", -1.42, "I’ll see you ___ the weekend.", "on", "in", "at", "to"],
  ["A2", "Language Schools", "prep", -0.66, "She’s good ___ solving puzzles quickly.", "at", "in", "on", "for at"],
  ["B1", "Junior Suite (11-14)", "prep", 0.06, "I’m not familiar ___ that author.", "with", "to", "of", "in"],
  // E — Passives, causatives, voice (81–95)
  ["A2", "15-Min Diagnostic", "passive", -0.64, "The form ___ in ink only.", "must be completed", "must complete", "must to be completed", "must to complete"],
  ["B1", "Corporate", "passive", 0.1, "The order ___ by Friday.", "will be sent", "will send", "is sending to", "will to be sent"],
  ["B1", "Academia", "passive", 0.12, "The data ___ in anonymous form by default.", "are stored", "is stored", "store", "are storing"],
  ["B2", "Academia", "passive", 0.65, "The results ___ not to be shared outside the project.", "are", "is", "were to", "is being to"],
  ["B2", "Specialized / Integrated Skills", "passive", 0.7, "The software ___ last month across all lab machines.", "was deployed", "deployed", "has deployed", "is deploying"],
  ["C1", "Corporate", "passive", 1.25, "The matter ___ to have been closed before the audit.", "was believed", "believed", "is believing", "has believed"],
  ["A1", "Primary (7-10)", "passive", -1.0, "The door ___ with a key.", "is opened", "opens", "is opening", "open"],
  ["A2", "Language Schools", "passive", -0.6, "The cake ___ by my mother yesterday.", "was made", "made", "is made", "has made"],
  ["B1", "15-Min Diagnostic", "passive", 0, "The answer ___ in the back of the book.", "is given", "gives", "is give", "given is"],
  ["B2", "Corporate", "passive", 0.63, "The report ___ to the board on Tuesday.", "was presented", "presented", "is presenting to", "has presented to"],
  ["C1", "Academia", "passive", 1.22, "The effect ___ in several independent labs.", "has been replicated", "replicated", "has replicated", "is replicating"],
  ["A2", "Junior Suite (11-14)", "passive", -0.56, "English ___ by millions of people worldwide.", "is spoken", "speaks", "is speak", "spoke"],
  ["B1", "Language Schools", "causative", 0.15, "We ___ the car serviced before the trip.", "had", "have", "made", "got to"],
  ["B2", "Academia", "causative", 0.6, "The team ___ the model re-run with new priors.", "got", "made", "had to make", "let"],
  ["C1", "Corporate", "causative", 1.2, "The board ___ the report rewritten by external counsel.", "had", "made", "got to have", "let to"],
  // F — Clauses, relatives, complementation (96–120)
  ["A2", "15-Min Diagnostic", "clause", -0.55, "The man ___ you met is our coach.", "who", "which", "whose", "whom"],
  ["B1", "Academia", "rel", 0.1, "The students ___ essays were strongest received a prize.", "whose", "which", "who", "that their"],
  ["B1", "Corporate", "rel", 0.1, "This is the document ___ I mentioned yesterday.", "that", "what", "where", "how"],
  ["B2", "Academia", "rel", 0.6, "The only reason ___ the effect vanished was attrition.", "why", "which", "that why", "whereby why"],
  ["B2", "Specialized / Integrated Skills", "rel", 0.64, "The book, ___ I admit I have not finished, is influential.", "which", "that", "what", "it which"],
  ["C1", "Academia", "complement", 1.2, "The fact ___ the sample is small is widely acknowledged.", "that", "which", "of that", "for which"],
  ["C1", "Academia", "complement", 1.3, "There is a chance ___ the test will misfit at the extremes.", "that", "for", "of", "which that"],
  ["C2", "Academia", "complement", 1.85, "I am not sure ___ to attribute the outlier in Cell 3.", "how", "how to to", "what how", "that how"],
  ["A1", "Primary (7-10)", "rel", -1.2, "The girl ___ is singing is my sister.", "who", "which", "what", "whom is"],
  ["A2", "Language Schools", "rel", -0.58, "I know the people ___ work in that office.", "who", "which", "what", "whom of"],
  ["B1", "Junior Suite (11-14)", "indirect", 0.12, "Could you tell me how this ___ in practice?", "works", "work", "is work", "working"],
  ["B1", "15-Min Diagnostic", "indirect", 0.1, "I don’t remember where I ___ the receipt.", "put", "putted", "have put to", "was putting the"],
  ["B2", "Corporate", "indirect", 0.6, "She asked when the refund ___ be processed.", "would", "will", "should to", "is"],
  ["B2", "Academia", "indirect", 0.55, "The reviewer asked whether the authors ___ the raw data.", "had preserved", "preserved", "have preserved to", "were preserving the"],
  ["C1", "Specialized / Integrated Skills", "nominal", 1.2, "There is no point ___ the same experiment twice with no change.", "in running", "to run in", "of running the", "run"],
  ["C1", "Academia", "complement", 1.18, "The question is whether the model ___ the boundary conditions.", "meets", "meet", "is meet", "meeting"],
  ["A2", "15-Min Diagnostic", "gerund", -0.55, "I enjoy ___ in my free time.", "reading", "read", "to read the", "reads"],
  ["B1", "Language Schools", "gerund", 0.1, "She avoided ___ the topic during the session.", "raising", "to raise to", "raise the", "raised"],
  ["B2", "Academia", "gerund", 0.6, "___ the dataset took longer than we expected.", "Cleaning", "To cleaning", "Clean", "For cleaning the"],
  ["B2", "Academia", "participle", 0.63, "___ the assumptions explicit, the model is easier to test.", "Having made", "Making the", "Made", "To have been making the"],
  ["C1", "Academia", "complement", 1.2, "The aim is to establish ___ the measure is unidimensional enough.", "whether", "if whether", "that if", "which that"],
  ["C1", "Corporate", "cleft", 1.2, "___ the delay that triggered the client’s complaint, not the price.", "It was", "What was", "There was that", "That was the"],
  ["B1", "Academia", "subjunctive", 0.2, "It is important that the code ___ versioned in the repository.", "be", "is", "will be", "is being to"],
  ["B2", "Academia", "subjunctive", 0.6, "The policy requires that every visitor ___ a badge.", "wear", "wears", "will wear", "is wear"],
  ["C1", "Specialized / Integrated Skills", "subjunctive", 1.2, "We suggest that the panel ___ the scoring rubric in advance.", "approve", "approves", "will approve the", "is to approve the"],
  // G — Conditionals, wishes, unreal (121–140)
  ["A2", "Junior Suite (11-14)", "cond", -0.55, "If it rains, we ___ the match indoors.", "will play", "play", "would play the", "plays"],
  ["B1", "15-Min Diagnostic", "cond", 0.1, "If I ___ you, I would double-check the figures.", "were", "was", "am", "be"],
  ["B1", "Language Schools", "cond", 0.12, "Unless we leave now, we ___ the train.", "will miss", "miss", "would miss the", "are missing"],
  ["B2", "Academia", "cond", 0.6, "If the null hypothesis were true, we ___ see this pattern often.", "would", "will", "should to", "had"],
  ["B2", "Corporate", "cond", 0.58, "If the order ___ cancelled earlier, we would have reallocated stock.", "had been", "was", "has been to", "were been"],
  ["C1", "Academia", "cond", 1.2, "Had the protocol ___ earlier, the failure might have been avoided.", "been audited", "audited", "be audited", "was audited"],
  ["C1", "Specialized / Integrated Skills", "cond", 1.15, "Were the design ___ sound, the estimates would be tighter.", "more", "most", "moreer", "as more"],
  ["A1", "Primary (7-10)", "cond", -1.1, "If you heat ice, it ___", "melts", "melt", "melted", "is melt"],
  ["A2", "15-Min Diagnostic", "cond", -0.52, "I would help you if I ___ more time today.", "had", "have", "has", "am having the"],
  ["B1", "Corporate", "cond", 0.15, "If the client agrees, we ___ proceed next week.", "can", "will can", "could to", "are able to to"],
  ["B2", "Academia", "cond", 0.62, "If the analysis ___ flawed, the conclusion cannot stand.", "is", "were to", "are", "was to are"],
  ["B2", "Academia", "wish", 0.6, "I wish the sample ___ a bit larger.", "were", "was", "is", "had been the"],
  ["C1", "Academia", "cond", 1.1, "___ you need further clarification, contact the project office.", "Should", "If should", "Would", "Might you"],
  ["A2", "Language Schools", "cond", -0.5, "I’ll call you if there ___ a problem.", "is", "are", "be", "will be the"],
  ["B1", "Junior Suite (11-14)", "cond", 0.1, "If you don’t understand, you ___ ask the teacher.", "should", "ought", "ought to to", "must to"],
  ["B1", "15-Min Diagnostic", "cond", 0, "I’ll come with you, ___ you like.", "if", "whether", "that if", "while if"],
  ["B2", "Corporate", "cond", 0.6, "Supposing the budget ___ cut, we would need a new plan.", "were to be", "is to be", "will to be be", "has been the"],
  ["C1", "Academia", "cond", 1.1, "___ it not for the control group, the claim would be weaker.", "Were", "Was", "If was", "Should"],
  ["C1", "Specialized / Integrated Skills", "cond", 1.15, "Even if the effect ___ real, the effect size is small.", "is", "were to", "be", "was the"],
  ["C1", "Academia", "cond", 1.2, "___ I known about the error, I would not have published the result.", "Had", "If I had the", "Have", "If had"],
  // H — Agreement, concord, negation, inversion (141–160)
  ["A1", "Primary (7-10)", "sva", -1.2, "There ___ a cat under the car.", "is", "are", "am", "be"],
  ["A1", "Language Schools", "sva", -1.18, "Dogs and cats ___ different animals.", "are", "is", "be", "am"],
  ["A2", "15-Min Diagnostic", "sva", -0.6, "Everyone ___ a seat before the test begins.", "has", "have", "having the", "are having a"],
  ["A2", "Academia", "sva", -0.58, "A box of reprints ___ on the table.", "is", "are", "were", "be"],
  ["B1", "Academia", "sva", 0, "The data ___ open access online.", "are", "is", "be", "was"],
  ["B1", "Corporate", "sva", 0.1, "Neither the offer nor the invoice ___ the fee we expected.", "matches", "match", "matching the", "are match"],
  ["B2", "Academia", "sva", 0.55, "The number of false alarms ___ in the new condition.", "decreased", "decrease", "have decreased the", "were decreased"],
  ["B2", "Specialized / Integrated Skills", "sva", 0.58, "More than one reviewer ___ a conflict of interest.", "declared", "have declared the", "declares the", "were declaring a"],
  ["C1", "Academia", "inversion", 1.1, "Not until the test ended ___ the participants the debriefing sheet.", "did the researchers give", "the researchers give", "gave the researchers", "had the researchers give"],
  ["C1", "Academia", "inversion", 1.2, "Scarcely had the task begun ___ the timer stopped.", "when", "than", "then", "that when"],
  ["A2", "Junior Suite (11-14)", "sva", -0.56, "Here ___ the keys you lost.", "are", "is", "be", "was"],
  ["B1", "Language Schools", "negation", 0.1, "I have ___ time left — I need to go.", "no", "not", "any no", "not a any"],
  ["B1", "15-Min Diagnostic", "sva", 0, "Fifty miles ___ a long way on foot in one day.", "is", "are", "be", "were to"],
  ["B2", "Corporate", "sva", 0.5, "The majority of the board ___ the proposal on Friday.", "approved", "approve", "have approved the", "were approving a"],
  ["B2", "Academia", "inversion", 0.6, "Under no circumstances ___ the raw data to be published online.", "is", "are the", "should to be the", "will be to"],
  ["C1", "Academia", "sva", 1.1, "The majority ___ often split in open debates; context matters here.", "are", "is", "be", "was"],
  ["C1", "Corporate", "sva", 1.1, "The team ___ to finish the rollout by EOD, according to the PM.", "is", "are", "be", "were to"],
  ["A1", "Primary (7-10)", "sva", -1.25, "He ___ my friend.", "is", "are", "am", "be"],
  ["A2", "15-Min Diagnostic", "sva", -0.52, "My brother and I ___ the same class.", "are in", "is in", "am in", "be in the"],
  ["A2", "Language Schools", "sva", -0.54, "Somebody ___ at the door.", "is", "are", "be", "were"],
  // I — Adverbs, word order, linking, cohesion (161–180)
  ["A1", "Primary (7-10)", "adverb", -1.3, "She can ___ read three languages.", "already", "already can", "can already to", "yet already"],
  ["A2", "Language Schools", "adverb", -0.55, "I have ___ been to Japan.", "never", "ever never", "not ever", "don’t never"],
  ["B1", "15-Min Diagnostic", "adverb", 0.1, "She works ___ on weekends to save money.", "overtime", "over the time", "in overtime the", "on overtime"],
  ["B1", "Corporate", "adverb", 0.1, "We can ___ adjust the model if the client agrees.", "still", "yet still", "already still", "even still the"],
  ["B2", "Academia", "adverb", 0.55, "The effect is only ___ in the high-ability stratum.", "visible", "visibly", "vision", "in visible the"],
  ["B2", "Academia", "linking", 0.6, "The first study found a trend; ___, the second study failed to replicate it.", "however", "therefore", "furthermore to", "moreover the"],
  ["C1", "Academia", "linking", 1.1, "The test is long; ___, breaks are provided.", "nevertheless", "however the", "although", "but nevertheless the"],
  ["C1", "Specialized / Integrated Skills", "word_order", 1.1, "___ carefully did they pilot the item set before launch.", "So", "Such", "Very so", "Too"],
  ["A2", "Junior Suite (11-14)", "adverb", -0.5, "I have ___ my homework, but I can check it again.", "finished", "already finish", "finish already", "finishing the"],
  ["B1", "Language Schools", "adverb", 0.1, "She’s ___ been waiting for an hour.", "only", "just only the", "even only the", "still only a"],
  ["B2", "Academia", "linking", 0.55, "The study is underpowered; ___, the effect may be overestimated.", "hence", "then hence", "so hence the", "because of hence"],
  ["B2", "Corporate", "adverb", 0.5, "We are ___ to respond within two business days.", "able", "capable the", "possible to the", "likely able the"],
  ["C1", "Academia", "linking", 1.0, "The evidence is suggestive, ___ conclusive it is not.", "though", "although though", "but though the", "even if though"],
  ["C1", "Academia", "linking", 1.0, "___ the high stakes, the procedure remained double-blind.", "Despite", "Although despite", "In despite of", "Despite of"],
  ["A1", "Primary (7-10)", "adverb", -1.2, "I like music ___", "a lot", "a lot of", "many lot", "much lot the"],
  ["A2", "15-Min Diagnostic", "adverb", -0.48, "She speaks English ___ for a beginner.", "well", "good", "goodly", "wellly"],
  ["B1", "Corporate", "adverb", 0.1, "Please reply ___ the end of the day.", "by", "until", "in", "on by the"],
  ["B1", "Academia", "adverb", 0, "The results differ ___ the two conditions.", "between", "among", "within between", "from between the"],
  ["B2", "Specialized / Integrated Skills", "word_order", 0.6, "Hardly had the trial ended ___ the first queries arrived.", "when", "than", "then", "that when the"],
  ["C1", "Academia", "adverb", 1.0, "___ enough funds, we will extend the data collection period.", "Given", "Giving", "Having given the", "Been given the"],
  // J — Pronouns, possession, anaphora (181–193)
  ["A1", "Primary (7-10)", "pronoun", -1.2, "This book is not ___. It’s mine.", "yours", "your", "you", "your’s"],
  ["A1", "Language Schools", "pronoun", -1.15, "___ is your teacher?", "Who", "Which", "Whose", "Whom is"],
  ["A2", "Junior Suite (11-14)", "pronoun", -0.5, "They invited my sister and ___ to the debate.", "me", "I", "my", "myself to"],
  ["A2", "15-Min Diagnostic", "pronoun", -0.5, "Each student must finish ___ work alone.", "their", "his or her the", "its", "it’s the"],
  ["B1", "Academia", "pronoun", 0, "The authors revised the manuscript ___ after peer review.", "themselves", "theirselves", "themselfs", "their ownselves"],
  ["B1", "Language Schools", "reflexive", 0.1, "I hurt ___ playing football last week.", "myself", "me", "mine", "Iself the"],
  ["B2", "Academia", "pronoun", 0.55, "The candidate, ___ we interviewed last week, accepted the post.", "whom", "who we", "which", "whom that we the"],
  ["B2", "Corporate", "pronoun", 0.5, "Between you and ___, the deadline is not realistic.", "me", "I", "myself the", "mine"],
  ["C1", "Academia", "pronoun", 1.1, "It was Jones ___ first spotted the outlier, not the PI.", "who", "whom", "which the", "that who the"],
  ["C1", "Academia", "pronoun", 1.0, "Not one of the participants, ___ the protocol clearly stated, opted out early.", "though", "although though", "even if", "while though the"],
  ["A2", "Language Schools", "pronoun", -0.52, "Can ___ help me carry these boxes?", "anyone", "someone the", "any one of", "someone one"],
  ["B1", "15-Min Diagnostic", "pronoun", 0, "I don’t have ___ to add on this point.", "anything", "something", "nothing the", "any thing of"],
  ["B2", "Academia", "pronoun", 0.55, "The participants, all of ___, were recruited locally.", "whom", "who the", "which", "that whom the"],
  // Extra: pool size must be ≥ (268 − blocks.length) — currently 72 blocks → 196 synthetic
  ["B2", "Academia", "coord", 0.6, "The procedure is long ___ thorough.", "but", "and", "so", "because"],
  ["B1", "15-Min Diagnostic", "spelling_grammar", 0.1, "Which sentence is punctuated correctly in formal English?", "First, the results were clear.", "First the results were clear.", "First; the results were clear.", "First. the results were clear."],
  ["A2", "Primary (7-10)", "conjunction", -0.6, "I wanted to go, ___ it was too late.", "but", "however the", "although it", "despite the"],
];

if (stems.length !== 196) {
  throw new Error(`Expected 196 rows, have ${stems.length}`);
}

const out = `/**
 * 196 tekil (unique stem) dilbilgisi sorusu — seed-grammar-300 sota eklentisi.
 * Tasarım prensipleri (özet):
 * - Her satır: benzersiz kök; şıklar 4xMC; 3 distraktör aynı madde ailesi içinde.
 * - CEFR ve b, ürün hattı (sınava/segmente) pedagojik eşleme: çocuk/okul, iş, akademi ayrı etiket.
 * - Sunucu: productLine, tags içinde birebir bu \`pl\` dizesi ile eşleşir.
 * Bu dosya scripts/data/grammar-synthetic-193.build.mjs tarafından üretilmiştir; elle düzeltmeleri koruyun
 * veya betiği yeniden çalıştırıp tüm listeyi yeniden üretin.
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

export type SyntheticStem = {
  id: string;
  cefr: CefrLevel;
  b: number;
  pl: PlTag;
  topic: string;
  prompt: string;
  correct: string;
  wrong: [string, string, string];
};

export const GRAMMAR_SYNTHETIC_196: readonly SyntheticStem[] = [
${stems
  .map(
    (s, i) =>
      `  { id: "G193-${String(i + 1).padStart(3, "0")}", cefr: "${s[0]}" as CefrLevel, b: ${s[3]}, pl: ${JSON.stringify(s[1])} as PlTag, topic: ${JSON.stringify(s[2])}, prompt: ${JSON.stringify(
        s[4]
      )}, correct: ${JSON.stringify(s[5])}, wrong: [${JSON.stringify(s[6])}, ${JSON.stringify(s[7])}, ${JSON.stringify(
        s[8]
      )}] }`
  )
  .join(",\n")}
] as const;

if (GRAMMAR_SYNTHETIC_196.length !== 196) {
  throw new Error("GRAMMAR_SYNTHETIC_196 must contain exactly 196 items");
}
`;

const outFile = "grammar-synthetic-196.ts";
writeFileSync(join(__dir, outFile), out, "utf8");
console.log("Wrote", stems.length, "stems to", outFile);
