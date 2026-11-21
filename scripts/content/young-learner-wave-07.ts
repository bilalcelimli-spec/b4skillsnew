import { objective, type Choices, type Specification, type WaveItem } from "./young-learner-item.js";

type SetSpec = Pick<Specification, "number" | "productLine" | "level" | "genre" | "topic">;
type Question = {
  subskill: string;
  construct: string;
  evidence: string;
  prompt: string;
  key: number;
  choices: Choices;
};

function readingPair(set: SetSpec, scale: string, passage: string, questions: readonly [Question, Question]): WaveItem[] {
  const readingSetId = `yl-w07-${set.productLine}-${set.level}-${set.number}`;
  return questions.map(({ prompt, key, choices, ...focus }, index) => ({
    ...objective({ ...set, ...focus, wave: "07", number: `${set.number}-${index + 1}` }, scale, passage, prompt, key, choices),
    readingSetId,
  }));
}

export const waveItems: WaveItem[] = [
  ...readingPair({ number: "01", productLine: "primary", level: "A1", genre: "notice", topic: "education" },
    "Reading for orientation",
    "Paper animals club\nMeet in Room 4 at lunch. This week we are making paper birds. We have paper and glue for everyone. Bring a pencil. On Friday we'll put the finished birds in the hall.", [
    {
      subskill: "SPECIFIC_INFORMATION", construct: "Find a requested object in a notice", evidence: "Distinguishes an item to bring from materials already provided.",
      prompt: "What should pupils bring?", key: 2,
      choices: [["Paper", "The club provides paper."], ["Glue", "The club provides glue."], ["A pencil", "The notice asks pupils to bring a pencil."], ["A paper bird", "Pupils will make birds at the club."]],
    },
    {
      subskill: "TEXT_FUNCTION", construct: "Distinguish an activity location from a display location", evidence: "Identifies which place is used to show the work.",
      prompt: "What will pupils use the hall for on Friday?", key: 0,
      choices: [["Showing their birds", "The finished birds will be put in the hall."], ["Making the birds", "They meet to make birds in Room 4."], ["Getting a pencil", "The notice tells pupils to bring a pencil."], ["Eating lunch", "Lunch gives the meeting time, not the hall's purpose."]],
    },
  ]),
  ...readingPair({ number: "02", productLine: "primary", level: "A1", genre: "message", topic: "personal_life" },
    "Reading correspondence",
    "Hi Leo,\nI found your blue cap on a chair after the game. It is in my bag now. I can see you at the park gate at four. Please bring my red ball.\nKim", [
    {
      subskill: "SPECIFIC_INFORMATION", construct: "Find the current location of an object", evidence: "Distinguishes the place an object is now from where it was found.",
      prompt: "Where is Leo's cap now?", key: 1,
      choices: [["On the chair", "That is where Kim found it."], ["In Kim's bag", "Kim says it is in the bag now."], ["At the park gate", "That is the proposed meeting place."], ["On the playing field", "The cap was found on a chair."]],
    },
    {
      subskill: "REFERENCE_RESOLUTION", construct: "Identify the owner of an object in a personal message", evidence: "Understands my from the point of view of the message writer.",
      prompt: "Whose ball is it?", key: 3,
      choices: [["Leo's", "Leo owns the cap."], ["Both children's", "The writer calls it my ball."], ["The team's", "The message does not assign it to the team."], ["Kim's", "Kim writes my red ball and signs the message."]],
    },
  ]),
  ...readingPair({ number: "03", productLine: "primary", level: "A1", genre: "narrative", topic: "leisure" },
    "Reading as a leisure activity",
    "Mina takes her toy bus to the garden. A small stone is on the path. Mina moves it. The bus goes past a red flower. Then it stops next to a big pot. Mina calls her brother to see it.", [
    {
      subskill: "SPECIFIC_INFORMATION", construct: "Track the order of two concrete actions", evidence: "Finds what happens between moving the stone and stopping by the pot.",
      prompt: "What does the bus do before it stops by the pot?", key: 1,
      choices: [["It goes inside the pot.", "The bus stops beside the pot."], ["It goes past a flower.", "The sentence about the flower comes before the bus stops."], ["It moves the stone.", "Mina moves the stone."], ["It goes back into the house.", "The bus stays in the garden in this story."]],
    },
    {
      subskill: "EXPLICIT_DETAIL", construct: "Find a named person at the end of a story", evidence: "Identifies who Mina invites after the bus stops.",
      prompt: "Who does Mina call?", key: 2,
      choices: [["Her friend", "The story does not name a friend."], ["Her sister", "The final sentence identifies her brother."], ["Her brother", "Mina calls her brother to see the bus."], ["Her teacher", "The story takes place in the garden with Mina and her brother."]],
    },
  ]),
  ...readingPair({ number: "01", productLine: "primary", level: "A2", genre: "notice", topic: "leisure" },
    "Reading for orientation",
    "Saturday puzzle morning\nCome to Room 2 at ten if you want to learn a new puzzle. If you know the puzzle already, come to Room 3 at half past ten for the race. The small tables in Room 2 are for pairs. If you come on your own, wait by the blue sign. A helper will find someone to work with you.", [
    {
      subskill: "SPECIFIC_INFORMATION", construct: "Choose an arrival instruction for a specified participant", evidence: "Combines the learner's experience with the correct room and time.",
      prompt: "What should a child who knows the puzzle do to join the race?", key: 3,
      choices: [["Go to Room 2 at ten.", "That is for new learners."], ["Go to Room 3 at ten.", "The race is in Room 3 at half past ten."], ["Go to Room 2 at half past ten.", "The race is in a different room."], ["Go to Room 3 at half past ten.", "This matches the notice's race instruction."]],
    },
    {
      subskill: "INFERENCE", construct: "Infer the function of a meeting point", evidence: "Links the blue sign with help finding a partner.",
      prompt: "Why should a child who comes alone wait by the blue sign?", key: 0,
      choices: [["To get a partner for the puzzle.", "The helper finds someone for the child to work with."], ["To borrow a small table.", "The tables are already in the room."], ["To get a race time.", "The race's time is fixed in the notice."], ["To learn where the rooms are.", "The notice connects the sign with help joining a pair."]],
    },
  ]),
  ...readingPair({ number: "02", productLine: "primary", level: "A2", genre: "narrative", topic: "environment" },
    "Reading as a leisure activity",
    "Sam put a bowl of water near the class flowers each morning. On Monday the bowl was full when he left, but it was almost empty at lunch. On Tuesday he watched from the window. Two sparrows came down to drink. After lunch Sam put the bowl on a low stone a little farther from the path. He hoped people would walk past without frightening the birds.", [
    {
      subskill: "EXPLICIT_DETAIL", construct: "Distinguish an observation from its possible effects", evidence: "Finds the action Sam personally saw from the window.",
      prompt: "What did Sam see on Tuesday morning?", key: 0,
      choices: [["Two birds drinking from the bowl.", "He watched the sparrows come down to drink."], ["Someone moving the bowl to a new place.", "Sam moved it later himself."], ["Someone walking past the flowers.", "People walking past are mentioned in his hope for later."], ["The bowl falling off a stone.", "The bowl is not described falling."]],
    },
    {
      subskill: "CAUSE_EFFECT_INFERENCE", construct: "Infer why a person moved an object", evidence: "Connects the distance from the path with a wish to avoid disturbing the birds.",
      prompt: "Why did Sam move the bowl away from the path?", key: 2,
      choices: [["To make it easier for pupils to fill.", "The story gives no filling problem."], ["To give the flowers more sun.", "The move is about the birds."], ["To leave the birds a quieter place to drink.", "He hopes people can pass without frightening the birds."], ["To make the birds come past the window.", "The birds had already come while he watched."]],
    },
  ]),
  ...readingPair({ number: "03", productLine: "primary", level: "A2", genre: "message", topic: "education" },
    "Reading correspondence",
    "Hi Ida,\nThe class show is still on Thursday. Our group has to be ready before the music group, so please come to the old library at 2:30. We will put our bags there and walk to the hall together. I have the picture cards for our show. Please bring the paper stars we made.\nRen", [
    {
      subskill: "EXPLICIT_DETAIL", construct: "Find a step between arrival and proceeding to a venue", evidence: "Follows the order of activities in the message.",
      prompt: "What will the group do before walking to the hall?", key: 1,
      choices: [["Meet the music group in the hall.", "They need to be ready before the music group."], ["Leave their bags in the old library.", "Ren says they will put their bags there first."], ["Make the paper stars.", "The stars have already been made."], ["Put the picture cards on the hall wall.", "The message says Ren has the cards, not that they go on a wall."]],
    },
    {
      subskill: "REFERENCE_RESOLUTION", construct: "Interpret a pronoun in a message", evidence: "Links I to the sender by using the sign-off.",
      prompt: "Who has the picture cards?", key: 3,
      choices: [["Ida", "The message is written to Ida, who is asked to bring the stars."], ["The music group", "The music group is mentioned in relation to timing."], ["The pupils in the hall", "The message says the hall is the place they will go."], ["Ren", "Ren signed the message and wrote that they have the picture cards."]],
    },
  ]),
  ...readingPair({ number: "01", productLine: "junior", level: "B1", genre: "article", topic: "education" },
    "Reading for information and argument",
    "At first, each team at the science fair put all its materials on one table. People liked looking at the models, but they often reached for the parts while a student was trying to explain how a model worked. The following year, teams kept one finished model on the table and put the pieces visitors could touch on a second table. Team members spent less time returning pieces to the right place. They also noticed that visitors who knew very little about the projects often stayed to ask questions after trying the loose pieces.", [
    {
      subskill: "MAIN_IDEA", construct: "Identify the main effect of a practical change", evidence: "Connects separation of display and handling to improvements for teams and visitors.",
      prompt: "Which statement best sums up the effect of the second table?", key: 2,
      choices: [["It meant teams could leave their finished models at home.", "Each team still displayed a finished model."], ["It gave experienced visitors a place to build their own models.", "The article describes exploring parts, not building models."], ["It made projects easier to explain and gave visitors a chance to experiment.", "Teams reset models less often, and visitors could try the loose parts."], ["It let teams replace student explanations with written instructions.", "Teams still explained their projects."]],
    },
    {
      subskill: "SPECIFIC_INFORMATION", construct: "Locate a detail about a subgroup's response", evidence: "Identifies which visitors often stayed after trying the pieces.",
      prompt: "Who often stayed to ask questions after trying the pieces?", key: 0,
      choices: [["Visitors with little previous knowledge of the projects.", "The last sentence specifies visitors who knew very little about them."], ["People who had brought models to show.", "The models belonged to participating teams."], ["Visitors who had already built similar models.", "The article describes visitors with little prior knowledge."], ["Students waiting for their turn to present.", "The observation is about visitors, not presenters."]],
    },
  ]),
  ...readingPair({ number: "02", productLine: "junior", level: "B1", genre: "review", topic: "culture" },
    "Reading for information and argument",
    "At our town's weekend theatre workshop, the organisers gave groups ten minutes to invent a scene from an object in a bag. My group pulled out a broken umbrella. At first I wanted the leader to show us an example, but starting without one got us talking straight away. I would keep that part as it is. I would change the end, though: after the scenes, a bell rang and the next workshop started. There was no time to tell the other groups what we had enjoyed about their work.", [
    {
      subskill: "WRITER_ATTITUDE", construct: "Identify a recommendation in a mixed review", evidence: "Distinguishes the activity the writer wants to keep from the part they would change.",
      prompt: "What change would the writer make to the workshop?", key: 3,
      choices: [["Give every group the same object.", "The review does not object to different objects."], ["Show an example before each group starts.", "The writer initially wanted one but came to value starting without it."], ["Make each performance longer.", "The writer is concerned with the time after the scenes."], ["Leave time to comment on the scenes.", "The final sentence explains what the writer missed."]],
    },
    {
      subskill: "CAUSE_EFFECT_INFERENCE", construct: "Link a missing resource with a group response", evidence: "Explains what the lack of a demonstration prompted the group to do.",
      prompt: "How did starting without an example help the writer's group?", key: 1,
      choices: [["They had time to choose a replacement for the umbrella.", "The group worked with the object it drew."], ["They began talking about their own ideas at once.", "The writer says starting without an example got them talking straight away."], ["They could spend the whole ten minutes practising lines.", "The group first had to invent its scene."], ["They could copy another group's scene.", "There was no model scene to copy."]],
    },
  ]),
  ...readingPair({ number: "03", productLine: "junior", level: "B1", genre: "article", topic: "environment" },
    "Reading for information and argument",
    "The school gardening group began by sending a long message each Friday to remind volunteers what to water over the weekend. Several people missed small details, especially when a pot had been moved. The group then tied a blue ribbon to a pot if it needed water and took the ribbon off when the job was done. They still sent a Friday message, but it now said who was on duty. The ribbons did not replace the timetable. They meant the person who arrived could see which jobs were still waiting.", [
    {
      subskill: "TEXT_FUNCTION", construct: "Distinguish the purposes of two communication methods", evidence: "Separates the staffing purpose of the message from the live task status indicated by ribbons.",
      prompt: "What is the Friday message mainly for after the change?", key: 1,
      choices: [["Listing all the pots that have moved.", "The message no longer gives that detail."], ["Telling volunteers who is meant to come.", "The revised message says who is on duty."], ["Marking each pot that has just been watered.", "Taking a ribbon off indicates a completed job."], ["Explaining how much water each plant needs.", "No watering amounts are given."]],
    },
    {
      subskill: "INFERENCE", construct: "Infer how a visible signal resolves uncertainty", evidence: "Uses the stated ribbon rule to predict what an arriving volunteer can tell.",
      prompt: "What can a volunteer infer when a pot still has a blue ribbon?", key: 3,
      choices: [["Another volunteer is on the way.", "The ribbon does not identify people."], ["The pot has been moved since Friday.", "A ribbon can be attached to any pot needing water."], ["The pot has already been watered.", "The ribbon should have been removed when the work was done."], ["The pot still needs watering.", "The ribbon remains while the job is waiting."]],
    },
  ]),
  ...readingPair({ number: "01", productLine: "junior", level: "B2", genre: "article", topic: "media" },
    "Reading for information and argument",
    "A student podcast team added a half-minute preview to each episode and noticed that more people started an episode after visiting the page. The team treated this rise as evidence listeners preferred the new interviews. But the interviews themselves had not changed, and the statistics did not show who finished listening. A preview might help visitors decide more quickly whether to press play. That is a real advantage, though it tells us little about how listeners rate the interview. For the next series, the team kept the preview and added a question at the end of each episode. It also noted that any survey answered only by people who reached the end would miss the views of early leavers.", [
    {
      subskill: "EVIDENCE_EVALUATION", construct: "Identify the strongest conclusion supported by a recorded measure", evidence: "Distinguishes initial engagement from preferences and completion.",
      prompt: "What did the team's original figures establish?", key: 3,
      choices: [["Visitors valued the interviews more after the change.", "Visitor preferences were not measured."], ["The proportion who finished each episode increased.", "The statistics did not show who finished."], ["Listeners found the original interviews too long.", "No judgment about interview length was measured."], ["More people began an episode after the preview was added.", "Episode starts were the behaviour recorded."]],
    },
    {
      subskill: "ARGUMENT_STRUCTURE", construct: "Explain the role of a limitation at the end of an argument", evidence: "Identifies how the sampling caveat qualifies a proposal introduced earlier.",
      prompt: "Why does the writer mention people who stop listening early in the final sentence?", key: 0,
      choices: [["To show why the proposed feedback would still represent only part of the audience.", "End-of-episode feedback leaves out people who did not reach it."], ["To explain why episode starts should no longer be measured.", "The writer treats starts as useful for a narrower purpose."], ["To argue that the preview itself made the interviews harder to finish.", "The passage provides no evidence that previews reduced completion."], ["To suggest that early leavers should be treated as survey responders.", "They are the people the new question would fail to reach."]],
    },
  ]),
  ...readingPair({ number: "02", productLine: "junior", level: "B2", genre: "review", topic: "culture" },
    "Reading for information and argument",
    "The new museum trail invites visitors to hear a short recording of a local person's memory at each stop. I expected this to make the objects feel less important. In fact, hearing a former shopkeeper explain how she used a brass scale made me look at it longer. Yet I was less convinced by the trail's insistence on a fixed order. A queue at the second stop prevented several people from starting other recordings even though nobody was using those stations. The museum explains that the order creates a story. That may matter at a few points, but many of the recordings are complete on their own. Visitors should be told which stops to hear together and be free to approach the rest as they like.", [
    {
      subskill: "WRITER_ATTITUDE", construct: "Interpret a mixed judgment following a revision of initial expectations", evidence: "Distinguishes appreciation of the recordings from criticism of how access is organised.",
      prompt: "What is the writer's overall position on the trail?", key: 1,
      choices: [["The stops should all have the same order, with shorter recordings.", "The writer is concerned that a fixed order causes avoidable delays."], ["Keep the recordings, but make the route flexible where possible.", "The writer values the memories and wants flexibility for independent stops."], ["The recordings would work only if the objects were removed.", "The scale example shows the recording increased attention to the object."], ["Let visitors hear the whole trail in any order without guidance.", "The writer would still identify stops best heard together."]],
    },
    {
      subskill: "OVERALL_PURPOSE", construct: "Identify why a specific object is used as an illustration", evidence: "Connects the scale example to a reversal of the writer's initial expectation.",
      prompt: "Why does the writer give the example of the brass scale?", key: 2,
      choices: [["To show that visitors understood how to follow the fixed order.", "The scale is mentioned before the discussion of route problems."], ["To suggest that accounts about work were better than other memories.", "The writer does not compare categories of recordings."], ["To illustrate how a memory could increase interest in an object.", "The memory prompted the writer to examine the scale more closely."], ["To explain why some recordings needed to be heard together.", "The example illustrates the effect of one independent recording."]],
    },
  ]),
  ...readingPair({ number: "03", productLine: "junior", level: "B2", genre: "article", topic: "technology" },
    "Reading for information and argument",
    "The student council moved its suggestion box online. The first week brought more messages than a whole month with the paper box. Some members wanted to remove the old box straight away. Others noticed that most online suggestions arrived just after a link appeared on the school's social page, where followers were mainly older pupils. The council decided to advertise both methods to every year group before comparing them. It also changed its report to distinguish the number of suggestions from the number of pupils contributing: a small group sending many messages might create the appearance of wider participation. The aim of the trial was to hear from more pupils, not simply to collect more ideas.", [
    {
      subskill: "COMPETING_VIEWPOINTS", construct: "Compare two positions on adopting a new system", evidence: "Distinguishes preference based on volume from concern about how broadly the system reached pupils.",
      prompt: "Why did some council members resist removing the paper box immediately?", key: 0,
      choices: [["The launch might have reached some year groups more than others.", "Access to the campaign link was uneven across age groups."], ["They felt the online system attracted fewer ideas than the paper box.", "The online system initially attracted more messages."], ["The school had shared the link equally and wanted to avoid repeating it.", "The report says mainly older pupils followed the page."], ["They expected suggestions to arrive later on paper.", "Their concern was reach rather than the speed of responses."]],
    },
    {
      subskill: "EVIDENCE_EVALUATION", construct: "Select an appropriate indicator for the stated goal", evidence: "Recognises why a unique contributor count is more informative for breadth than message volume.",
      prompt: "Which comparison would best address the council's stated aim?", key: 3,
      choices: [["Compare the times of day when the two boxes were used.", "Timing does not show whether more different pupils participated."], ["Compare the total length of suggestions from the two boxes.", "Length does not show how many pupils took part."], ["Compare total suggestions, counting repeated submissions separately.", "This could be driven by a small group submitting repeatedly."], ["Compare how many different pupils responded after both methods were advertised.", "This measures participation breadth after a more comparable launch."]],
    },
  ]),
];
