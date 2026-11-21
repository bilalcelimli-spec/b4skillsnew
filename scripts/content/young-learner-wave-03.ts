import { item, objective, type Specification, type WaveItem } from "./young-learner-item.js";

type Focus = Pick<Specification, "subskill" | "construct" | "evidence">;
type Choices = Parameters<typeof objective>[5];

function reading(
  number: string, level: "A2" | "B1" | "B2", genre: string, topic: string,
  focus: Focus, passage: string, prompt: string, key: number, options: Choices,
): WaveItem {
  const scale = genre === "message" ? "Reading correspondence"
    : genre === "notice" ? "Reading for orientation" : "Reading for information and argument";
  return objective({ wave: "03", number, productLine: "junior", level, genre, topic, ...focus },
    scale, passage, prompt, key, options);
}

function grammar(
  number: string, focus: Focus, clue: string, scaffold: string, answers: string[], rejectedAnswer: string,
): WaveItem {
  const draft = item({
    wave: "03", number, productLine: "primary", level: "A2", genre: "sentence_completion", topic: "personal_life", ...focus,
  }, "GRAMMAR", "FILL_IN_BLANKS", "Grammatical accuracy", {
    prompt: `Complete the sentence. Use the correct form of ${clue}.`,
    scaffold,
    blanks: [{ acceptableAnswers: answers }],
  });
  // Author-bound test case, omitted from the imported candidate content.
  return { ...draft, rejectedAnswer };
}

export const waveItems: WaveItem[] = [
  reading("01", "A2", "message", "media",
    { subskill: "SPECIFIC_INFORMATION", construct: "Find a deadline for a particular submission", evidence: "Distinguishes the recording deadline from two surrounding deadlines." },
    "Hi team,\nPlease send me your quiz questions by Tuesday. I'm editing the answers on Wednesday. We need everyone's short voice recording by Thursday so I can put the quiz online on Friday. Send photos to the art group, not to me.\nNora",
    "When should the team send its voice recordings?", 2, [
      ["By Tuesday", "Tuesday is the question deadline."], ["By Wednesday", "Wednesday is Nora's editing day."],
      ["By Thursday", "The recordings are required by Thursday."], ["By Friday", "Friday is the planned publication day."],
    ]),
  reading("02", "A2", "notice", "education",
    { subskill: "TEXT_FUNCTION", construct: "Identify the purpose of a short exchange notice", evidence: "Understands that the notice specifies how a loan is recorded." },
    "Sports equipment desk\nTake a blue card when you borrow something. Write your class and the name of the item on the card. Leave the card at the desk. The card goes back in the box when you bring the equipment back.",
    "What is a blue card for?", 0, [
      ["Showing which equipment a student has borrowed.", "It records the class and item while the equipment is out."],
      ["Showing which sport a student will play.", "The notice asks for the borrowed item, not a sport."],
      ["Showing where equipment should be stored.", "The blue card records a loan, not a storage location."],
      ["Showing when the desk will close.", "There are no opening hours on the blue card."],
    ]),
  reading("03", "A2", "message", "culture",
    { subskill: "INFERENCE", construct: "Connect a recommendation with a travel constraint", evidence: "Infers why a specific way of getting to the venue is recommended." },
    "Hi Mel,\nThe theatre has two doors. Use the one on Market Street tonight. The car park beside it is closed. The bus stops right by that door, so I'll take the bus and meet you there at six. Keep the ticket I sent you on your phone.\nRui",
    "What makes the bus a useful choice for this visit?", 1, [
      ["It stops outside both theatre doors.", "The message identifies the stop by one door."],
      ["It stops at the entrance to use, beside a closed car park.", "The bus serves the required entrance without needing the car park."],
      ["It takes people to the other theatre entrance.", "The bus stop is beside the Market Street door."],
      ["It is where people get their phone tickets.", "Mel received the ticket already."],
    ]),
  reading("04", "A2", "notice", "leisure",
    { subskill: "SPECIFIC_INFORMATION", construct: "Find instructions for one group in a notice", evidence: "Selects the action assigned specifically to a first-time participant." },
    "Photography walk\nIf this is your first walk, come to the small studio at 10:45. We will show you how to change the camera settings. Everyone else should wait at the park gate at eleven. Bring water, and leave any large bags in the studio.",
    "What should someone on their first walk do?", 3, [
      ["Wait at the park gate at eleven.", "That instruction is for returning participants."],
      ["Take a large bag to the park.", "Large bags should be left in the studio."],
      ["Go to the studio after the walk starts.", "The studio instruction is for 10:45, before the group meets."],
      ["Arrive at the studio before eleven.", "First-time participants are asked to come at 10:45."],
    ]),
  reading("01", "B1", "article", "environment",
    { subskill: "CAUSE_EFFECT_INFERENCE", construct: "Infer why a trial changed one element at a time", evidence: "Links the order of changes to the ability to interpret an observation." },
    "The garden club wanted more insects to visit a row of flowers. One student suggested planting taller flowers and moving all the pots to a sunnier wall. The club tried the wall first. For a week, it counted insects without changing the flowers. More insects appeared after lunch. They then added taller flowers and continued counting. Keeping a record of each change also helped the next group repeat the trial.",
    "Why did the club keep the same flowers in the first week?", 2, [
      ["To use the pots until the taller plants were ready.", "No delay in getting the taller plants is mentioned."],
      ["To prevent insects from reaching the other flowers.", "The trial aims to observe and increase insect visits."],
      ["To see what effect changing the position might have.", "The flowers stayed the same while the position changed."],
      ["To help the next group count before lunch.", "Keeping records helps the next group, but a morning count is not the reason."],
    ]),
  reading("02", "B1", "review", "culture",
    { subskill: "WRITER_ATTITUDE", construct: "Identify a qualified recommendation", evidence: "Distinguishes the writer's positive verdict from a specific reservation." },
    "The new audio guide at our town museum lets visitors choose whose account to hear. At the old bicycle, a former rider and a repairer describe it in quite different ways. That was the best part. I would use the guide again, but next time I'd skip its suggested route. It sent us past the same entrance three times, and the room numbers on the screen took longer to read than the signs on the walls.",
    "What would the writer recommend?", 0, [
      ["Listen to the different accounts and find your own way around.", "The writer values the accounts and plans to ignore the route."],
      ["Follow the route once before listening to the accounts.", "The writer recommends the recordings but found the route unhelpful."],
      ["Use the room numbers on the screen in place of the signs.", "The room signs were faster to read."],
      ["Listen to one account per object to avoid getting lost.", "Hearing two different accounts was the strongest feature."],
    ]),
  reading("03", "B1", "article", "education",
    { subskill: "MAIN_IDEA", construct: "Identify a solution that addresses the problem described", evidence: "Recognises how a timing change widened participation." },
    "At first the student newspaper held interviews at a set time after school. Most volunteers came from two classes. One editor noticed that many students took the first bus home, so the team began offering five-minute interviews at lunch as well. The things people talked about changed: the next issue included ideas for library displays and repairs to sports equipment, two concerns the team had rarely heard about before.",
    "What did lunchtime interviews make possible?", 1, [
      ["The editors could publish the newspaper before the bus left.", "The change concerns how interviews are collected."],
      ["Students with different schedules could contribute new topics.", "The after-school slot excluded some students, and new topics appeared after lunchtime interviews."],
      ["The two original classes could have longer interviews.", "The lunchtime slots are short and support a wider group."],
      ["The library could display newspaper interviews at lunch.", "Library displays are a topic students raised."],
    ]),
  reading("04", "B1", "article", "technology",
    { subskill: "COHESION", construct: "Identify the action referred to by a backward reference", evidence: "Resolves the phrase 'that small change' to the revised title format." },
    "Our school started posting questions for its weekly quiz online. The organisers first used titles like Question 1 and Question 2. Some students opened every post looking for a topic they knew. We tried putting a topic word in each title, though the questions and their order stayed the same. That small change meant students could choose where to start without opening all the posts.",
    "What does 'that small change' refer to?", 3, [
      ["Posting questions online each week.", "The quiz was already online before the change."],
      ["Moving the questions into a new order.", "The order stayed the same."],
      ["Replacing some of the questions.", "The questions were kept."],
      ["Putting the topic in each title.", "The previous sentence says a topic word was added to each title."],
    ]),
  reading("01", "B2", "article", "education",
    { subskill: "EVIDENCE_EVALUATION", construct: "Evaluate the scope of a claim based on a limited measure", evidence: "Identifies what the data supports and the distinct outcome it cannot establish." },
    "After the library lowered its shelves, the team counted more students picking up books without asking for help. A report described the change as proof that students now read more widely. Yet the observations ended when students reached the desk, and the team recorded neither titles chosen nor what happened afterwards. The results do show a useful change at the shelf. The report could make a stronger case by following the range of titles over several weeks and asking students which ones they actually read.",
    "Which finding is supported by the team's existing observations?", 1, [
      ["Students finished more of the books they borrowed.", "The observation ended before later reading could be seen."],
      ["More students collected books without help.", "That is the behaviour the team counted."],
      ["A larger range of titles left the library.", "The titles were not recorded."],
      ["Students read more titles over several weeks.", "Following the range over several weeks is proposed as a further step."],
    ]),
  reading("02", "B2", "article", "media",
    { subskill: "COMPETING_VIEWPOINTS", construct: "Compare two approaches to credit in a group project", evidence: "Distinguishes public recognition of contribution types from a separate assessment of individual effort." },
    "In a film club, one editor wanted the closing credits to name everyone in alphabetical order. She argued that listing jobs would make the camera team seem more important than students who planned interviews. Another editor agreed that the order should be alphabetical but wanted a short line describing each role. In his view, that made less visible work easier to recognise. The group adopted his idea and asked members to keep a private production log as well, so a teacher could understand how much each person had contributed.",
    "Why were both role descriptions and a private log used?", 2, [
      ["To offer two different ways to rank the camera team.", "The public order stays alphabetical, and the private log records effort."],
      ["To let the teacher check whether names were in alphabetical order.", "Alphabetical order is visible in the credits and does not need a private log."],
      ["To make different kinds of work visible and give the teacher evidence of individual effort.", "The public descriptions identify roles; the log helps assess how much each person did."],
      ["To hide the planning roles from viewers while giving them more weight.", "Role descriptions are included publicly to help recognise planning and similar work."],
    ]),
  reading("03", "B2", "article", "environment",
    { subskill: "ARGUMENT_STRUCTURE", construct: "Explain why a counterexample is introduced", evidence: "Shows how a contrast limits an otherwise credible claim." },
    "Some students proposed replacing printed school maps with a map on every classroom screen. The idea worked well during a rehearsal: students could check classroom changes without waiting for new signs. At a weekend event, however, most visitors arrived through a side door and were unlikely to enter a classroom before they needed directions. This does not make the screen map a bad idea. It suggests that the location of the information may matter just as much as how quickly it is updated.",
    "What is the purpose of the weekend event example?", 3, [
      ["It suggests the maps worked only because classroom changes were rare.", "The example concerns access to the map, not frequency of room changes."],
      ["It shows that quickly updating directions caused confusion.", "The author recognises quick updates as an advantage."],
      ["It proves that weekend visitors preferred classroom screens.", "Visitors may not reach a classroom screen when they need directions."],
      ["It illustrates a setting where the map could be current yet hard to reach.", "The route from the side door makes physical access to the screen less likely."],
    ]),
  reading("04", "B2", "review", "culture",
    { subskill: "WRITER_ATTITUDE", construct: "Infer an evaluative distinction from a mixed review", evidence: "Separates approval of a presentation approach from a reservation about its execution." },
    "A youth theatre group invited the audience to choose between two endings. I expected the vote to feel like a trick, but the actors made both choices believable. The problem came afterwards. The programme explained the unchosen ending in a paragraph read out by the director. That turned a question about the characters into a list of plot events. I would keep the vote and let the audience leave wondering what might have happened instead.",
    "How does the writer evaluate the interactive ending?", 0, [
      ["The vote succeeds, but the explanation afterwards weakens its effect.", "The two alternatives are made believable, while the explanation takes away productive uncertainty."],
      ["The actors should explain the endings before people vote.", "The writer favours keeping the outcome open to imagination."],
      ["The director's reading makes up for an unconvincing vote.", "The vote is praised and the reading is criticised."],
      ["The audience needs the plot summary to make a fair choice.", "The summary came afterwards and the writer would remove it."],
    ]),
  grammar("01", { subskill: "TENSE_ASPECT", construct: "Supply an irregular past simple form", evidence: "Inflects the supplied verb to report a completed event." },
    "the verb ‘bring’", "Yesterday, we ___ our own cups to the class picnic.", ["brought"], "bringed"),
  grammar("02", { subskill: "COMPARISON", construct: "Supply an irregular comparative adjective", evidence: "Uses the irregular comparative before 'than'." },
    "the adjective ‘good’", "This brush is ___ than the old one for painting small stars.", ["better"], "more good"),
  grammar("03", { subskill: "TENSE_ASPECT", construct: "Supply an irregular past participle", evidence: "Produces the participle following a present-perfect auxiliary." },
    "the verb ‘wear’", "I have never ___ these boots in the rain.", ["worn"], "wore"),
  grammar("04", { subskill: "COMPLEMENTATION", construct: "Supply the gerund after a familiar verb", evidence: "Uses the supplied verb in the complement pattern with 'finish'." },
    "the verb ‘paint’", "We finished ___ the boat just before lunch.", ["painting"], "to paint"),
  grammar("05", { subskill: "COMPLEMENTATION", construct: "Supply the to-infinitive after a familiar verb", evidence: "Produces the complement of 'decide' in a natural short context." },
    "the verb ‘wait’", "We decided ___ inside until the rain stopped.", ["to wait"], "waiting"),
  grammar("06", { subskill: "AGREEMENT", construct: "Choose the appropriate form of a past-tense auxiliary", evidence: "Uses plural past 'be' to form a question." },
    "the verb ‘be’ in the past", "Why ___ your shoes by the kitchen door this morning?", ["were"], "was"),
  grammar("07", { subskill: "COMPARISON", construct: "Form a regular superlative with a spelling change", evidence: "Applies the superlative form after 'the' and within a defined comparison set." },
    "the adjective ‘easy’", "This is the ___ puzzle in the whole book.", ["easiest"], "easyest"),
  grammar("08", { subskill: "TENSE_ASPECT", construct: "Supply an auxiliary and base verb for a past negative", evidence: "Forms a past simple negative, with contracted and full forms accepted." },
    "the verb ‘hear’ in the negative past", "I ___ the bell yesterday because I was outside.", ["did not hear", "didn't hear", "didn’t hear"], "did not heard"),
  grammar("09", { subskill: "AGREEMENT", construct: "Supply the third-person singular auxiliary in a question", evidence: "Forms a present simple question around a singular subject and lexical base verb." },
    "the verb ‘do’", "What ___ your cousin usually make for the class fair?", ["does"], "do"),
  grammar("10", { subskill: "TENSE_ASPECT", construct: "Complete a past continuous form", evidence: "Produces the present participle after an already supplied past auxiliary." },
    "the verb ‘sit’", "I was ___ on the bus when I found the note in my pocket.", ["sitting"], "siting"),
  grammar("11", { subskill: "QUANTIFICATION", construct: "Supply an irregular plural after a number", evidence: "Uses the correct plural form of a common countable noun." },
    "the noun ‘tooth’", "The little dog has two white ___ at the front.", ["teeth"], "tooths"),
  grammar("12", { subskill: "TENSE_ASPECT", construct: "Form a negative present perfect", evidence: "Produces the plural auxiliary and past participle, accepting contracted and full forms." },
    "the verb ‘finish’ in the negative present perfect", "We ___ our poster yet.", ["have not finished", "haven't finished", "haven’t finished"], "have not finish"),
];
