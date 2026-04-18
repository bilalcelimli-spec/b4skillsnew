import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sotaItems = [
  // Primary (7-10) [6 Items] - Visual, simple logic, basic grammar
  { tags: ["Primary (7-10)"], content: { prompt: "Tom ______ playing with his green ball now.", options: [{id:"A",text:"is"},{id:"B",text:"are"},{id:"C",text:"am"},{id:"D",text:"be"}], correctAnswer: "A", rubric: "Present continuous singular subject." }, type: "MULTIPLE_CHOICE", cefrLevel: "A1", skill: "GRAMMAR", difficulty: -2.5, discrimination: 0.8 },
  { tags: ["Primary (7-10)"], content: { prompt: "Look at the animal with a long neck. It is a ______.", options: [{id:"A",text:"giraffe"},{id:"B",text:"elephant"},{id:"C",text:"hippo"},{id:"D",text:"monkey"}], correctAnswer: "A", rubric: "Basic animal vocabulary." }, type: "MULTIPLE_CHOICE", cefrLevel: "A1", skill: "VOCABULARY", difficulty: -2.0, discrimination: 1.0 },
  { tags: ["Primary (7-10)"], content: { prompt: "Mary has three dogs. ____ names are Fluffy, Spot, and Max.", options: [{id:"A",text:"Their"},{id:"B",text:"There"},{id:"C",text:"They're"},{id:"D",text:"Her"}], correctAnswer: "A", rubric: "Possessive adjectives." }, type: "MULTIPLE_CHOICE", cefrLevel: "A2", skill: "GRAMMAR", difficulty: -1.5, discrimination: 1.2 },
  { tags: ["Primary (7-10)"], content: { prompt: "I like _____ apples and bananas for breakfast.", options: [{id:"A",text:"eat"},{id:"B",text:"ate"},{id:"C",text:"eating"},{id:"D",text:"eats"}], correctAnswer: "C", rubric: "Gerunds after 'like'." }, type: "MULTIPLE_CHOICE", cefrLevel: "A2", skill: "GRAMMAR", difficulty: -1.2, discrimination: 1.1 },
  { tags: ["Primary (7-10)"], content: { prompt: "Can you _____ the door, please? It's cold outside.", options: [{id:"A",text:"close"},{id:"B",text:"jump"},{id:"C",text:"run"},{id:"D",text:"sing"}], correctAnswer: "A", rubric: "Basic verb vocabulary." }, type: "MULTIPLE_CHOICE", cefrLevel: "A1", skill: "VOCABULARY", difficulty: -2.8, discrimination: 0.7 },
  { tags: ["Primary (7-10)"], content: { prompt: "Yesterday, we _____ to the park.", options: [{id:"A",text:"go"},{id:"B",text:"goes"},{id:"C",text:"going"},{id:"D",text:"went"}], correctAnswer: "D", rubric: "Irregular past tense." }, type: "MULTIPLE_CHOICE", cefrLevel: "A2", skill: "GRAMMAR", difficulty: -1.0, discrimination: 1.5 },

  // Junior Suite (11-14) [6 Items] - Adolescents, hobbies, friends
  { tags: ["Junior Suite (11-14)"], content: { prompt: "My brother is really _____ playing video games.", options: [{id:"A",text:"interested in"},{id:"B",text:"curious at"},{id:"C",text:"good with"},{id:"D",text:"excited of"}], correctAnswer: "A", rubric: "Prepositions after adjectives." }, type: "MULTIPLE_CHOICE", cefrLevel: "B1", skill: "GRAMMAR", difficulty: 0.0, discrimination: 1.8 },
  { tags: ["Junior Suite (11-14)"], content: { prompt: "If it rains tomorrow, we _____ to the concert.", options: [{id:"A",text:"wouldn't go"},{id:"B",text:"won't go"},{id:"C",text:"didn't go"},{id:"D",text:"aren't going"}], correctAnswer: "B", rubric: "First conditional." }, type: "MULTIPLE_CHOICE", cefrLevel: "B1", skill: "GRAMMAR", difficulty: -0.5, discrimination: 1.6 },
  { tags: ["Junior Suite (11-14)"], content: { prompt: "She _____ her homework yet, so she can't watch TV.", options: [{id:"A",text:"hasn't finished"},{id:"B",text:"isn't finishing"},{id:"C",text:"didn't finish"},{id:"D",text:"doesn't finish"}], correctAnswer: "A", rubric: "Present perfect with 'yet'." }, type: "MULTIPLE_CHOICE", cefrLevel: "B1", skill: "GRAMMAR", difficulty: -0.2, discrimination: 1.9 },
  { tags: ["Junior Suite (11-14)"], content: { prompt: "That is the teacher _____ helped me with the math project.", options: [{id:"A",text:"which"},{id:"B",text:"where"},{id:"C",text:"who"},{id:"D",text:"whose"}], correctAnswer: "C", rubric: "Relative pronouns." }, type: "MULTIPLE_CHOICE", cefrLevel: "A2", skill: "GRAMMAR", difficulty: -0.8, discrimination: 1.4 },
  { tags: ["Junior Suite (11-14)"], content: { prompt: "I usually hang _____ with my friends at the mall on Saturdays.", options: [{id:"A",text:"on"},{id:"B",text:"up"},{id:"C",text:"in"},{id:"D",text:"out"}], correctAnswer: "D", rubric: "Phrasal verbs." }, type: "MULTIPLE_CHOICE", cefrLevel: "B1", skill: "VOCABULARY", difficulty: 0.2, discrimination: 1.5 },
  { tags: ["Junior Suite (11-14)"], content: { prompt: "Reading this sci-fi novel is much _____ than watching the movie.", options: [{id:"A",text:"most thrilling"},{id:"B",text:"more thrilling"},{id:"C",text:"thrilling"},{id:"D",text:"thrilled"}], correctAnswer: "B", rubric: "Comparative adjectives with multi-syllables." }, type: "MULTIPLE_CHOICE", cefrLevel: "B1", skill: "GRAMMAR", difficulty: 0.1, discrimination: 1.7 },

  // 15-Min Diagnostic [6 Items] - Highly discriminative spectrum A1-C2
  { tags: ["15-Min Diagnostic"], content: { prompt: "I _____ a doctor.", options: [{id:"A",text:"is"},{id:"B",text:"are"},{id:"C",text:"am"},{id:"D",text:"be"}], correctAnswer: "C", rubric: "A1 discriminator." }, type: "MULTIPLE_CHOICE", cefrLevel: "A1", skill: "GRAMMAR", difficulty: -3.0, discrimination: 2.0 },
  { tags: ["15-Min Diagnostic"], content: { prompt: "They _____ dinner when the phone rang.", options: [{id:"A",text:"eats"},{id:"B",text:"were eating"},{id:"C",text:"have eaten"},{id:"D",text:"will eat"}], correctAnswer: "B", rubric: "B1 discriminator." }, type: "MULTIPLE_CHOICE", cefrLevel: "B1", skill: "GRAMMAR", difficulty: 0.0, discrimination: 2.2 },
  { tags: ["15-Min Diagnostic"], content: { prompt: "Had I known about the crisis, I _____ immediately.", options: [{id:"A",text:"will act"},{id:"B",text:"acted"},{id:"C",text:"would have acted"},{id:"D",text:"must act"}], correctAnswer: "C", rubric: "C1 discriminator (Third Conditional Inversion)." }, type: "MULTIPLE_CHOICE", cefrLevel: "C1", skill: "GRAMMAR", difficulty: 2.0, discrimination: 2.5 },
  { tags: ["15-Min Diagnostic"], content: { prompt: "It is imperative that the CEO _____ the document prior to the merger.", options: [{id:"A",text:"signs"},{id:"B",text:"sign"},{id:"C",text:"signed"},{id:"D",text:"signing"}], correctAnswer: "B", rubric: "C2 discriminator (Subjunctive)." }, type: "MULTIPLE_CHOICE", cefrLevel: "C2", skill: "GRAMMAR", difficulty: 2.8, discrimination: 2.3 },
  { tags: ["15-Min Diagnostic"], content: { prompt: "He isn't used _____ up so early in the morning.", options: [{id:"A",text:"getting"},{id:"B",text:"to get"},{id:"C",text:"to getting"},{id:"D",text:"get"}], correctAnswer: "C", rubric: "B2 discriminator." }, type: "MULTIPLE_CHOICE", cefrLevel: "B2", skill: "GRAMMAR", difficulty: 1.0, discrimination: 1.9 },
  { tags: ["15-Min Diagnostic"], content: { prompt: "The negotiations reached a _____, neither side willing to compromise.", options: [{id:"A",text:"breakthrough"},{id:"B",text:"stalemate"},{id:"C",text:"truce"},{id:"D",text:"conclusion"}], correctAnswer: "B", rubric: "C1 vocab discriminator." }, type: "MULTIPLE_CHOICE", cefrLevel: "C1", skill: "VOCABULARY", difficulty: 1.8, discrimination: 2.1 },

  // Academia [6 Items] - Uni, Research, complex sentences
  { tags: ["Academia"], content: { prompt: "The methodology chapter explains how the data was _____ for the study.", options: [{id:"A",text:"deduced"},{id:"B",text:"concurred"},{id:"C",text:"acquired"},{id:"D",text:"collated"}], correctAnswer: "C", rubric: "Academic vocabulary." }, type: "MULTIPLE_CHOICE", cefrLevel: "B2", skill: "VOCABULARY", difficulty: 1.2, discrimination: 1.8 },
  { tags: ["Academia"], content: { prompt: "_____ the initial hypothesis was rejected, the subsequent experiments yielded promising results.", options: [{id:"A",text:"Even"},{id:"B",text:"Despite"},{id:"C",text:"Although"},{id:"D",text:"However"}], correctAnswer: "C", rubric: "Subordinating conjunctions of concession." }, type: "MULTIPLE_CHOICE", cefrLevel: "B2", skill: "GRAMMAR", difficulty: 0.9, discrimination: 1.9 },
  { tags: ["Academia"], content: { prompt: "The professor elucidated the theory with such _____ that all ambiguities were resolved.", options: [{id:"A",text:"opacity"},{id:"B",text:"lucidity"},{id:"C",text:"verbosity"},{id:"D",text:"levity"}], correctAnswer: "B", rubric: "Advanced nominal vocabulary." }, type: "MULTIPLE_CHOICE", cefrLevel: "C1", skill: "VOCABULARY", difficulty: 2.2, discrimination: 2.0 },
  { tags: ["Academia"], content: { prompt: "The findings were largely _____ with previous literature on cognitive behavioral mechanisms.", options: [{id:"A",text:"substantiated"},{id:"B",text:"inconclusive"},{id:"C",text:"consistent"},{id:"D",text:"deviating"}], correctAnswer: "C", rubric: "Collocations in research writing." }, type: "MULTIPLE_CHOICE", cefrLevel: "C1", skill: "VOCABULARY", difficulty: 1.8, discrimination: 2.2 },
  { tags: ["Academia"], content: { prompt: "By the time the symposium concludes, the team _____ their primary abstract.", options: [{id:"A",text:"will publish"},{id:"B",text:"published"},{id:"C",text:"will have published"},{id:"D",text:"are publishing"}], correctAnswer: "C", rubric: "Future perfect tense." }, type: "MULTIPLE_CHOICE", cefrLevel: "B2", skill: "GRAMMAR", difficulty: 1.1, discrimination: 1.7 },
  { tags: ["Academia"], content: { prompt: "Seldom _____ such a paradigm shift in evolutionary biology.", options: [{id:"A",text:"has there been"},{id:"B",text:"there has been"},{id:"C",text:"was there being"},{id:"D",text:"has been there"}], correctAnswer: "A", rubric: "Negative inversion." }, type: "MULTIPLE_CHOICE", cefrLevel: "C2", skill: "GRAMMAR", difficulty: 2.6, discrimination: 2.4 },

  // Corporate [6 Items] - Business, Office, Management
  { tags: ["Corporate"], content: { prompt: "Please ensure that the quarterly financial report is submitted _____ End of Day.", options: [{id:"A",text:"until"},{id:"B",text:"by"},{id:"C",text:"for"},{id:"D",text:"in"}], correctAnswer: "B", rubric: "Prepositions of time." }, type: "MULTIPLE_CHOICE", cefrLevel: "B1", skill: "GRAMMAR", difficulty: -0.2, discrimination: 1.6 },
  { tags: ["Corporate"], content: { prompt: "We need someone to _____ the new marketing campaign while Sarah is on maternity leave.", options: [{id:"A",text:"oversee"},{id:"B",text:"overlook"},{id:"C",text:"overcast"},{id:"D",text:"overtake"}], correctAnswer: "A", rubric: "Business phrasal verbs." }, type: "MULTIPLE_CHOICE", cefrLevel: "B2", skill: "VOCABULARY", difficulty: 1.0, discrimination: 1.8 },
  { tags: ["Corporate"], content: { prompt: "The stakeholders have unanimously agreed to _____ the proposal moving forward.", options: [{id:"A",text:"veto"},{id:"B",text:"endorse"},{id:"C",text:"reprimand"},{id:"D",text:"dissuade"}], correctAnswer: "B", rubric: "Formal meeting vocabulary." }, type: "MULTIPLE_CHOICE", cefrLevel: "C1", skill: "VOCABULARY", difficulty: 1.5, discrimination: 1.9 },
  { tags: ["Corporate"], content: { prompt: "If the logistics department _____ the shipment earlier, we wouldn't be facing this bottleneck.", options: [{id:"A",text:"dispatched"},{id:"B",text:"have dispatched"},{id:"C",text:"had dispatched"},{id:"D",text:"would dispatch"}], correctAnswer: "C", rubric: "Mixed / 3rd conditionals in business context." }, type: "MULTIPLE_CHOICE", cefrLevel: "C1", skill: "GRAMMAR", difficulty: 1.7, discrimination: 2.2 },
  { tags: ["Corporate"], content: { prompt: "To stay competitive, the firm must continuously _____ its internal operations.", options: [{id:"A",text:"streamline"},{id:"B",text:"mitigate"},{id:"C",text:"placate"},{id:"D",text:"aggravate"}], correctAnswer: "A", rubric: "C-level operations vocabulary." }, type: "MULTIPLE_CHOICE", cefrLevel: "C1", skill: "VOCABULARY", difficulty: 1.9, discrimination: 2.1 },
  { tags: ["Corporate"], content: { prompt: "_____ you require any further assistance, please do not hesitate to contact our support desk.", options: [{id:"A",text:"Should"},{id:"B",text:"Would"},{id:"C",text:"If"},{id:"D",text:"Might"}], correctAnswer: "A", rubric: "Formal conditionals omitting 'if'." }, type: "MULTIPLE_CHOICE", cefrLevel: "B2", skill: "GRAMMAR", difficulty: 1.2, discrimination: 1.8 },

  // Language Schools [5 Items] - General adult, travel
  { tags: ["Language Schools"], content: { prompt: "Excuse me, _____ me where the nearest pharmacy is?", options: [{id:"A",text:"could you telling"},{id:"B",text:"can you tell"},{id:"C",text:"would you told"},{id:"D",text:"are you tell"}], correctAnswer: "B", rubric: "Polite requests." }, type: "MULTIPLE_CHOICE", cefrLevel: "A2", skill: "GRAMMAR", difficulty: -1.0, discrimination: 1.4 },
  { tags: ["Language Schools"], content: { prompt: "It's highly recommended to book your flights _____ advance during the holiday season.", options: [{id:"A",text:"in"},{id:"B",text:"on"},{id:"C",text:"at"},{id:"D",text:"by"}], correctAnswer: "A", rubric: "Prepositional phrases for travel." }, type: "MULTIPLE_CHOICE", cefrLevel: "B1", skill: "GRAMMAR", difficulty: 0.0, discrimination: 1.6 },
  { tags: ["Language Schools"], content: { prompt: "The view from the top of the Eiffel Tower is absolutely _____.", options: [{id:"A",text:"breathtaking"},{id:"B",text:"tedious"},{id:"C",text:"mundane"},{id:"D",text:"exhausted"}], correctAnswer: "A", rubric: "Extreme adjectives." }, type: "MULTIPLE_CHOICE", cefrLevel: "B2", skill: "VOCABULARY", difficulty: 0.8, discrimination: 1.7 },
  { tags: ["Language Schools"], content: { prompt: "I _____ living in a big city now, but initially the noise bothered me.", options: [{id:"A",text:"used to"},{id:"B",text:"am used to"},{id:"C",text:"use to"},{id:"D",text:"am usually"}], correctAnswer: "B", rubric: "Be used to vs Used to." }, type: "MULTIPLE_CHOICE", cefrLevel: "B2", skill: "GRAMMAR", difficulty: 1.1, discrimination: 2.0 },
  { tags: ["Language Schools"], content: { prompt: "Despite setting _____ early, we still missed the express train to London.", options: [{id:"A",text:"up"},{id:"B",text:"down"},{id:"C",text:"off"},{id:"D",text:"in"}], correctAnswer: "C", rubric: "Phrasal verbs for journey." }, type: "MULTIPLE_CHOICE", cefrLevel: "B2", skill: "VOCABULARY", difficulty: 0.9, discrimination: 1.8 },

  // Specialized / Integrated Skills [5 Items] - Advanced Reading & Logic
  { tags: ["Specialized / Integrated Skills"], content: { prompt: "The author’s argument hinges on the premise that socioeconomic disparities are inexorably tied to access to early childhood education.", question: "What does 'inexorably' suggest in this context?", options: [{id:"A",text:"Impossible to stop or prevent"},{id:"B",text:"Highly unlikely to occur"},{id:"C",text:"Temporarily connected"},{id:"D",text:"Subject to rapid change"}], correctAnswer: "A", rubric: "Deducing vocabulary from context." }, type: "MULTIPLE_CHOICE", cefrLevel: "C1", skill: "READING", difficulty: 2.1, discrimination: 2.3 },
  { tags: ["Specialized / Integrated Skills"], content: { prompt: "While urban density often correlates with increased carbon footprints, comprehensive transit infrastructure can entirely invert this dynamic.", question: "According to the text, how can the relationship between density and carbon footprints be changed?", options: [{id:"A",text:"By avoiding urban living entirely"},{id:"B",text:"By improving public transportation networks"},{id:"C",text:"By increasing personal vehicle ownership"},{id:"D",text:"By expanding city boundaries outwards"}], correctAnswer: "B", rubric: "Detailed reading comprehension." }, type: "MULTIPLE_CHOICE", cefrLevel: "C1", skill: "READING", difficulty: 1.9, discrimination: 2.1 },
  { tags: ["Specialized / Integrated Skills"], content: { prompt: "\"The deployment of autonomous drones for last-mile delivery is fraught with regulatory hurdles, yet the margin for cost-reduction renders it deeply compelling for conglomerates.\"", question: "Why are companies interested in this technology despite the difficulties?", options: [{id:"A",text:"It guarantees immediate legal compliance"},{id:"B",text:"It is highly popular with local customers"},{id:"C",text:"It offers significant financial savings"},{id:"D",text:"It eliminates the need for human pilots"}], correctAnswer: "C", rubric: "Inferring motives from advanced text." }, type: "MULTIPLE_CHOICE", cefrLevel: "C2", skill: "READING", difficulty: 2.5, discrimination: 2.2 },
  { tags: ["Specialized / Integrated Skills"], content: { prompt: "It is widely accepted that exposure to a plethora of linguistic stimuli ______ the cognitive development of bilingual infants.", options: [{id:"A",text:"impedes"},{id:"B",text:"obfuscates"},{id:"C",text:"catalyzes"},{id:"D",text:"nullifies"}], correctAnswer: "C", rubric: "Complex academic vocabulary in cloze." }, type: "MULTIPLE_CHOICE", cefrLevel: "C2", skill: "VOCABULARY", difficulty: 2.8, discrimination: 2.4 },
  { tags: ["Specialized / Integrated Skills"], content: { prompt: "Read the excerpt: 'The CEO stepped down amidst rising speculations regarding the merger's viability.'", question: "What can be inferred about the CEO's departure?", options: [{id:"A",text:"It was a planned retirement"},{id:"B",text:"It was linked to doubts about a business deal"},{id:"C",text:"It resulted from a successful expansion"},{id:"D",text:"It was legally mandated"}], correctAnswer: "B", rubric: "Inference from contextual cues." }, type: "MULTIPLE_CHOICE", cefrLevel: "B2", skill: "READING", difficulty: 1.3, discrimination: 1.9 },
];

async function main() {
  console.log(`Starting static seed of ${sotaItems.length} state-of-the-art items...`);
  let inserted = 0;
  for (const item of sotaItems) {
    await prisma.item.create({
      data: {
        type: item.type as any,
        skill: item.skill as any,
        cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: 0.0,
        content: item.content,
        tags: item.tags,
        status: "ACTIVE",
        isPretest: false
      }
    });
    inserted++;
  }
  console.log(`✅ Successfully seeded ${inserted} State of the Art test items across 7 different sections!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

