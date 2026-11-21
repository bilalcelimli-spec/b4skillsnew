import { objective, productiveRubric, type WaveItem, type Specification, item } from "./young-learner-item.js";

function productive(
  spec: Specification,
  skill: "WRITING" | "SPEAKING",
  scale: string,
  prompt: string,
  taskCriterion: string,
  sampleAnswer: string,
): WaveItem {
  const primary = spec.productLine === "primary";
  const writing = skill === "WRITING";
  const format = writing
    ? { minWords: primary ? 20 : 100, maxWords: primary ? 45 : 150, taskType: primary ? "short_response" : "paragraph_response" }
    : { prepTime: primary ? 15 : 30, responseTime: primary ? 45 : 90, taskType: primary ? "situational" : "opinion" };
  const levelFocus = primary
    ? "Use common words and simple forms. Allow errors that leave the message clear."
    : "Use enough range to express the contrast or condition clearly. Allow occasional errors that do not obscure the reasoning.";
  return item(spec, skill, writing ? "WRITING_PROMPT" : "SPEAKING_PROMPT", scale, {
    ...format,
    prompt,
    sampleAnswer,
    rubric: productiveRubric("wave-01-draft-2", {
      taskFulfilment: taskCriterion,
      organisation: primary
        ? "Put details in an understandable order, using simple links when needed."
        : "Maintain a logical sequence and make the relation between claims and reasons clear.",
      language: levelFocus,
      [writing ? "writtenClarity" : "intelligibility"]: writing
        ? "Judge whether wording and spelling let the reader recover the message."
        : "Judge whether speech is understandable. Do not penalise an accent or treat a failed recording as a language score.",
    }),
  });
}

export const waveItems: WaveItem[] = [
  objective({ number: "01", productLine: "primary", level: "PRE_A1", genre: "notice", topic: "education", subskill: "EXPLICIT_DETAIL", construct: "Read an object location in a brief note", evidence: "Links a named object to its written location." },
    "Reading for orientation", "My bag is on the chair. My hat is in the box.",
    "Where is the hat?", 2, [
      ["On the chair", "The bag is on the chair."], ["In the bag", "The note names the bag but puts the hat in the box."],
      ["In the box", "The second sentence puts the hat in the box."], ["On the box", "The note says the hat is inside the box."],
    ]),
  objective({ number: "02", productLine: "primary", level: "PRE_A1", genre: "message", topic: "leisure", subskill: "EXPLICIT_DETAIL", construct: "Find a named object in a short personal message", evidence: "Selects what the named child has." },
    "Reading correspondence", "I have a red kite. Sam has a blue ball.",
    "What has Sam got?", 0, [
      ["A blue ball", "The second sentence says Sam has a blue ball."], ["A red ball", "Red belongs to the kite."],
      ["A blue kite", "Blue belongs to the ball."], ["A red kite", "The writer has the red kite."],
    ]),
  objective({ number: "01", productLine: "primary", level: "A1", genre: "notice", topic: "education", subskill: "SPECIFIC_INFORMATION", construct: "Find an entry instruction in a school notice", evidence: "Distinguishes the arrival point from places used later." },
    "Reading for orientation", "Making Club\nPlease come to the hall at three. We will go to the art room together. Leave your school bag in the classroom. At four, show your model in the library.",
    "Where should children go first at three?", 3, [
      ["The art room", "The group goes there after meeting."], ["The classroom", "Children leave their bags there."],
      ["The library", "Children show models there at four."], ["The hall", "The hall is where the notice asks children to come at three."],
    ]),
  objective({ number: "02", productLine: "primary", level: "A1", genre: "message", topic: "personal_life", subskill: "SPECIFIC_INFORMATION", construct: "Read an updated plan in a short message", evidence: "Links the revised day to the planned activity." },
    "Reading correspondence", "Hi Noor,\nWe can't make the paper boats on Monday. Let's make them on Thursday. On Tuesday we can get the paper. You can take a boat home on Friday.\nKim",
    "When will Noor and Kim make the boats?", 1, [
      ["Monday", "The Monday plan was cancelled."], ["Thursday", "The message proposes Thursday for making boats."],
      ["Tuesday", "Tuesday is for getting the paper."], ["Friday", "Friday is for taking a boat home."],
    ]),
  objective({ number: "01", productLine: "primary", level: "A2", genre: "narrative", topic: "environment", subskill: "CAUSE_EFFECT_INFERENCE", construct: "Connect successive events to infer a simple reason", evidence: "Combines the access problem and the younger group's behaviour to explain a change." },
    "Reading as a leisure activity", "The class put small cards with the plants' names beside the plants in the school garden. The youngest visitors stopped at the gate. They could see the plants, but they did not walk through the wet grass to read the cards. Before the next visit, the class hung copies beside the gate.",
    "Why did the class hang copies beside the gate?", 0, [
      ["So the visitors could read the names from a dry place.", "The visitors stayed at the gate rather than crossing wet grass."],
      ["So the plants would be easier to see.", "The visitors could already see the plants."],
      ["So the grass would stay dry after the visit.", "Hanging the cards does not keep the grass dry."],
      ["So the visitors could take the plants home.", "The change concerns access to the cards."],
    ]),
  objective({ number: "02", productLine: "primary", level: "A2", genre: "notice", topic: "leisure", subskill: "TEXT_FUNCTION", construct: "Identify the purpose of an amended activity notice", evidence: "Connects the venue and arrival changes with the continuing activity." },
    "Reading for orientation", "Saturday's swap table is still open from ten until twelve. The main door is being painted, so please use the little door next to the garden. The table is now in the music room. Bring one book to swap, as before.",
    "What is the main purpose of this notice?", 2, [
      ["To tell people which books they may swap.", "The book requirement has stayed the same."],
      ["To ask people to help paint the main door.", "Painting explains the change but the notice asks for no help."],
      ["To tell people how to get to the swap table this week.", "The notice provides a changed entrance and room for the same activity."],
      ["To give the swap table a new opening time.", "The opening hours are unchanged."],
    ]),
  objective({ number: "01", productLine: "junior", level: "B2", genre: "discussion", topic: "education", subskill: "AGREEMENT_DISAGREEMENT", construct: "Interpret the condition behind partial agreement", evidence: "Distinguishes support for the project from approval of its public location." },
    "Understanding conversation between other people", "Mina: The repair club wants to put its station in the entrance hall. People could watch us fix things while they wait.\nLeo: I like the idea of showing the work. Last term, though, the hall got so crowded that people handed over their things and left. Nobody learned how to repair anything.\nMina: Would you keep it upstairs, then?\nLeo: Hold the demonstrations upstairs in small groups. The hall could still be where people sign up, with one broken object on display to start a conversation.",
    "On what condition does the second speaker support using the hall?", 1, [
      ["If the club repairs only items left by visitors.", "Leaving items without taking part was a problem in the previous trial."],
      ["If the hall invites people in and the demonstrations happen elsewhere.", "Leo separates sign-up and display from the small-group demonstrations."],
      ["If the upstairs groups come down to watch one common demonstration.", "Leo wants demonstrations upstairs in small groups."],
      ["If visitors can watch repairs there without creating long queues.", "The hall is for sign-up and display in Leo's proposal."],
    ], ["Mina", "Leo"]),
  objective({ number: "02", productLine: "junior", level: "B2", genre: "interview", topic: "science", subskill: "IMPLICATION", construct: "Infer why a speaker changed an evidence claim", evidence: "Recognises the distinction between recorded counts and what the counts represent." },
    "Understanding conversation between other people", "Nadia: In your first report, you said fewer birds used the far end of the garden. Why did the final report say less about that?\nEli: We counted from the same bench every day. At first that seemed fair because the observer never moved. Then we tried standing by the back fence, and suddenly we could see birds behind the tall bushes.\nNadia: Did you throw away the old counts?\nEli: We kept them and labelled where they were taken. We still use them to describe what was visible from the bench.",
    "Why was the claim in the final report narrowed?", 3, [
      ["The observer had moved during the original counts.", "The original observer stayed at the same bench."],
      ["Taking a second viewpoint made the earlier counts unusable.", "Eli kept the older counts for a narrower claim."],
      ["Most birds moved towards the fence after the counting began.", "Changing the viewpoint made different birds visible; no movement of the birds was established."],
      ["The original position hid part of what was being counted.", "The rear viewpoint revealed birds obscured from the bench."],
    ], ["Nadia", "Eli"]),
  objective({ number: "03", productLine: "junior", level: "B2", genre: "discussion", topic: "media", subskill: "DISTINGUISHING_VIEWPOINTS", construct: "Distinguish two judgments about a shared change", evidence: "Tracks the reason each speaker gives for a different editing preference." },
    "Understanding conversation between other people", "Adil: I cut the quiet minute from our podcast. The interview starts more quickly now, which matters when people listen on the bus.\nRosa: I noticed. But during that quiet minute you could hear the sports hall fill up. When the coach later says she couldn't hear the whistle, that detail makes sense.\nAdil: So you want the whole minute back?\nRosa: Just a few seconds. The listeners need enough sound to imagine being there.",
    "How do the two speakers differ about the original sound?", 0, [
      ["The first speaker wants a faster opening, while the second sees the sound as useful context.", "Adil values pace and Rosa values the hall sound as context for the coach's comment."],
      ["The first speaker thinks the opening is too slow, while the second doubts the sound can be shortened.", "Rosa asks for a few seconds of the original, not the whole minute."],
      ["The first speaker thinks the sound gives context, while the second would rely on the coach's description.", "Rosa is the one who wants the original sound to make the coach's comment clearer."],
      ["The first speaker wants clearer instructions, while the second wants more time for the coach's story.", "Their discussion concerns pace and the contextual sound."],
    ], ["Adil", "Rosa"]),
  objective({ number: "04", productLine: "junior", level: "B2", genre: "discussion", topic: "environment", subskill: "SPEAKER_ATTITUDE", construct: "Identify a qualified attitude to an encouraging result", evidence: "Infers from the proposed follow-up that the speaker reserves judgment on transfer." },
    "Understanding conversation between other people", "Owen: The signs worked. On Tuesday nearly everyone put their lunch rubbish in the right bins.\nLea: The signs were easy to read. But every class had just watched us sort a tray at assembly. I'd try the signs at the evening concert, when families come in through a different door and nobody sees the demonstration.\nOwen: You think we need different signs?\nLea: I'd use exactly these ones for the test.",
    "What is the second speaker's view of Tuesday's outcome?", 2, [
      ["It shows the signs should be redesigned for families.", "Lea explicitly wants to keep the same signs."],
      ["It shows the assembly made little difference.", "Lea raises the assembly as a possible reason for the result."],
      ["It is promising, but the demonstration may explain part of it.", "Lea wants to see whether the same signs work without an assembly demonstration."],
      ["It is enough evidence to use the signs at every event.", "Lea proposes checking another setting before drawing that conclusion."],
    ], ["Owen", "Lea"]),
  objective({ number: "05", productLine: "junior", level: "B2", genre: "interview", topic: "culture", subskill: "INFERRED_INTENTION", construct: "Infer the intended audience action behind a layout decision", evidence: "Connects the guide's decision with the order in which visitors interpret evidence." },
    "Understanding conversation between other people", "Iris: You put the archive labels around the corner instead of beside the objects. Isn't that extra walking?\nBen: It's only a few steps. When the labels were right there, students read the dates first and started deciding which objects mattered most. This time they'll get a small card that asks them to find two objects made for a similar job. Then they'll come round the corner to check what each one was used for.\nIris: So the labels are still part of the visit?\nBen: Yes, and I want groups to return to the objects if the labels change their minds.",
    "What does the second speaker want students to do before reading a label?", 1, [
      ["Choose which object has the earliest date.", "Deciding by date is the previous behaviour Ben wants to change."],
      ["Make their own comparison by looking at the objects.", "The card sends them to form an initial comparison from what they see."],
      ["Read a short account of how the objects were collected.", "There is no collecting account in the proposed first step."],
      ["Work out which objects the archive values most.", "Judging importance from dates is what Ben wants to avoid."],
    ], ["Iris", "Ben"]),
  objective({ number: "06", productLine: "junior", level: "B2", genre: "discussion", topic: "leisure", subskill: "ARGUMENT_DEVELOPMENT", construct: "Follow a speaker's explanation of a misleading comparison", evidence: "Identifies the change in who could participate across two activity conditions." },
    "Understanding conversation between other people", "Zara: The shorter games were more popular. We had twenty-four names on the list, compared with sixteen for the longer games.\nTom: The sixteen were picked in advance because there were only four places in each team. For the shorter games we put spare equipment outside and let anyone join after lunch.\nZara: Then what would tell us which game students actually prefer?\nTom: Give everyone the same chance to sign up for either one. We can still run the shorter game today because more people are waiting.",
    "Why does the second speaker question the comparison?", 3, [
      ["Extra equipment made the shorter game itself more appealing.", "The equipment was put out so anyone could join; Tom gives no evidence that it made the game more appealing."],
      ["Students were counted over different numbers of days.", "Tom contrasts the sign-up arrangements and gives no difference in counting days."],
      ["The long games had more teams, so each team attracted fewer names.", "Tom mentions places per team, not a larger number of teams."],
      ["Students had different opportunities to join the two games.", "The longer game had selected places, while sign-up for the shorter game was open."],
    ], ["Zara", "Tom"]),
  productive({ number: "01", productLine: "primary", level: "A2", genre: "message", topic: "education", subskill: "TASK_FULFILMENT", construct: "Write a practical reply to a classmate", evidence: "Communicates a choice, meeting point and one useful preparation detail." },
    "WRITING", "Correspondence", "Your classmate asks: ‘Shall we make a paper boat or a paper bird for our table?’ Write a reply. Say which one you want to make, where to meet, and what your classmate should bring.",
    "Credit a clear choice, a meeting place and an object to bring. Accept any coherent choices.",
    "Let's make a paper bird. Meet me by the classroom door after lunch. Please bring some coloured paper. I can bring the glue."),
  productive({ number: "02", productLine: "primary", level: "A2", genre: "notice", topic: "leisure", subskill: "GENRE_CONVENTIONS", construct: "Write a short notice that helps readers take action", evidence: "Gives a recognisable description and practical collection details." },
    "WRITING", "Notes, messages and forms", "You find a pencil case in the school garden. Write a notice for your class. Describe it and tell its owner where and when to get it.",
    "Credit a usable identifying detail, a collection place and a time. Accept plausible invented details.",
    "I found a green pencil case with a white star on it. If it's yours, come to the art room after lunch today."),
  productive({ number: "03", productLine: "primary", level: "A2", genre: "narrative", topic: "personal_life", subskill: "COHERENCE", construct: "Write a short connected story from a given start", evidence: "Uses simple linked events to explain what happened next and resolve the scene." },
    "WRITING", "Creative writing", "Start your story with: ‘When I opened the box, there was a small bell inside.’ Write what you did with the bell and what happened next.",
    "Credit an action involving the bell and a connected next event. No particular ending is required.",
    "When I opened the box, there was a small bell inside. I rang it once. My little dog came into the room and sat next to me."),
  productive({ number: "01", productLine: "primary", level: "A2", genre: "presentation", topic: "leisure", subskill: "COHERENCE", construct: "Describe two stages of a familiar activity", evidence: "Presents a simple sequence another child could follow." },
    "SPEAKING", "Sustained monologue: giving information", "A new classmate wants to play a game at break. Tell them what game you suggest and what to do first and next. You can invent a game.",
    "Credit a named or recognisable game and two understandable stages. Judge language, including in invented games.",
    "Let's play a ball game. First, draw a line with chalk. Then stand behind the line and roll the ball to your partner. Take turns."),
  productive({ number: "02", productLine: "primary", level: "A2", genre: "presentation", topic: "education", subskill: "TASK_FULFILMENT", construct: "Describe a proposed object and its use", evidence: "Gives simple details and links them to a practical purpose." },
    "SPEAKING", "Sustained monologue: describing experience", "Your class is making a quiet reading corner. Say one thing you would put there. Describe it and say how children could use it.",
    "Credit a proposed object, a relevant detail and a plausible use. Any coherent choice is acceptable.",
    "I would put a small shelf by the door. It would have two boxes, one for funny books and one for animal books. Children could find a book quickly."),
  productive({ number: "03", productLine: "primary", level: "A2", genre: "narrative", topic: "personal_life", subskill: "DISCOURSE_MANAGEMENT", construct: "Continue a simple story orally", evidence: "States an action and a linked outcome in an intelligible sequence." },
    "SPEAKING", "Sustained monologue: describing experience", "A child hears a noise in a classroom that looks empty. Imagine what happens next. Say what the child does and how the story ends.",
    "Credit a relevant action and a connected ending. No genre-specific ending is required.",
    "The child opens the door and waits. A small toy car comes out. Her friend is behind a desk with a toy controller. They laugh and put the car away."),
  productive({ number: "01", productLine: "junior", level: "B2", genre: "email", topic: "media", subskill: "TASK_FULFILMENT", construct: "Write a reasoned recommendation that accommodates a competing preference", evidence: "Recommends a format with a trade-off and a practical response to the alternative preference." },
    "WRITING", "Correspondence", "Your school magazine can publish one long student interview or three short student profiles. The team wants both depth and a wider range of voices. Email the editor. Recommend a format, explain a trade-off, and suggest one practical way to address the drawback of your choice.",
    "Credit a clear recommendation, a genuine trade-off and a workable way to address the identified drawback.",
    "Hi Alex,\nI would run three short profiles. A single long interview could show how someone changed their mind or dealt with a setback, but choosing one person means the issue may represent only one kind of experience. Three profiles let us include students who rarely appear in the magazine. The drawback is that each piece could become a list of facts. To give the pieces more depth, I would ask everyone to describe one decision they found difficult and explain what happened afterwards. We could cut the standard questions about favourite subjects to make room for those answers. That would keep the issue varied while still giving readers a story to follow.\nSam"),
  productive({ number: "02", productLine: "junior", level: "B2", genre: "report", topic: "education", subskill: "ORGANISATION", construct: "Write a report that interprets simple conflicting observations", evidence: "Weighs two observations and proposes a trial with an observable check." },
    "WRITING", "Reports and essays", "In one week, the library recorded more visits when games were available, but readers reported that the desks felt noisier. Write a short report for the library team. Explain the tension, propose a trial change and say what evidence the team should collect to decide whether it worked.",
    "Credit both observations, a practicable trial, and a measure that can show benefits and drawbacks.",
    "Last week's game sessions brought more people into the library, but some readers found it harder to concentrate. Higher attendance is worth keeping only if the library remains useful for quiet work. I suggest running games in the entrance area on two days next week while keeping the desks at the back for reading. The team could count visits during the same lunch break each day and ask readers at both ends of the room how easy it was to concentrate. Staff should also record how many readers leave before finding a seat. If attendance stays high and fewer readers report interruptions, we can extend the trial."),
  productive({ number: "03", productLine: "junior", level: "B2", genre: "article", topic: "technology", subskill: "REGISTER", construct: "Develop a balanced case for a familiar audience", evidence: "Responds to an opposing view and proposes a justified condition." },
    "WRITING", "Reports and essays", "A student forum is discussing whether club members should be able to submit ideas anonymously. Write a post for other students. Take a position, respond to one concern someone might raise, and suggest one rule that could make the system work.",
    "Credit a defensible position, a meaningful response to a concern and a concrete rule. Either position is acceptable.",
    "I would let people submit ideas without putting their names on a public list. New members may have good suggestions but worry about arguing with friends who already run the club. A common concern is that anonymous comments might become rude. That is possible, especially if comments are posted as soon as they arrive. My rule would be that two club members read submissions before sharing them, and publish the suggestion without any personal comments about other students. The reviewers should also explain why an idea has been left out. This gives quieter students a way to contribute while making it harder to use the system to target someone."),
  productive({ number: "01", productLine: "junior", level: "B2", genre: "presentation", topic: "leisure", subskill: "DISCOURSE_MANAGEMENT", construct: "Make a structured oral case with a concession", evidence: "Explains a choice, acknowledges an advantage of the alternative and proposes a mitigation." },
    "SPEAKING", "Sustained monologue: putting a case", "Your club can hold a short activity in a large room or a longer activity in a small room. Give an oral recommendation. Explain your choice, acknowledge one advantage of the other room, and say how you would manage one drawback of your choice.",
    "Credit a clear choice, a relevant concession about the alternative, and a plausible way to manage the chosen option's drawback.",
    "I'd choose the larger room for the short session because everyone could take part at the same time. The small room would let us spend longer with each group, which matters if the activity is difficult. To manage the shorter time, I would send a simple example beforehand and use the session itself for one practical challenge. Anyone who wants to keep working could take the materials home."),
  productive({ number: "02", productLine: "junior", level: "B2", genre: "presentation", topic: "environment", subskill: "TASK_FULFILMENT", construct: "Explain and evaluate an improvement proposal orally", evidence: "Connects a practical recommendation to an observation and an evaluation criterion." },
    "SPEAKING", "Sustained monologue: putting a case", "The school's water refill point is busiest when one group finishes sport. Some students leave the queue without filling their bottles. Propose one practical change, explain a possible drawback, and say how the school could tell whether your idea helped.",
    "Credit a feasible intervention, a plausible drawback of that intervention and an observable outcome.",
    "I would give the two sports groups slightly different finishing times so the queue doesn't form all at once. One drawback is that the group finishing later might have less time to reach its next lesson. Teachers could try a difference of only three minutes for a week and count how many students leave the queue without filling a bottle. They should also check whether the second group reaches class on time."),
  productive({ number: "03", productLine: "junior", level: "B2", genre: "presentation", topic: "culture", subskill: "DISCOURSE_MANAGEMENT", construct: "Present a qualified oral comparison for a specific audience", evidence: "Weighs two formats for a stated goal and adapts one to address a weakness." },
    "SPEAKING", "Sustained monologue: putting a case", "For an exhibition, your class can display objects with short labels or play short recordings made by students. The aim is for visitors to compare two stories. Recommend a format, explain how it serves that aim, and suggest how to handle a weakness of the format.",
    "Credit a recommendation, an explicit link to comparison and a mitigation that addresses the selected format.",
    "I'd put short labels beside the objects, because visitors could move back and forth between the two accounts. Recordings can make a story feel more personal, but it's harder to check a detail you've just heard. The risk with labels is that visitors may walk past without reading. I'd give each label the same two headings so readers can compare the stories quickly, and place the objects where both labels are easy to reach."),
];
