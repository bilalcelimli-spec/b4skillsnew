import { item, productiveRubric, type Specification, type WaveItem } from "./young-learner-item.js";

type Audience = "primaryA1" | "primaryA2" | "juniorA2" | "juniorB1";
type Task = {
  genre: string;
  topic: string;
  construct: string;
  prompt: string;
  evidence: string;
  sample: string;
};

const settings = {
  primaryA1: { productLine: "primary", level: "A1", range: [12, 30], prepTime: 15, responseTime: 30 },
  primaryA2: { productLine: "primary", level: "A2", range: [22, 45], prepTime: 20, responseTime: 45 },
  juniorA2: { productLine: "junior", level: "A2", range: [35, 65], prepTime: 25, responseTime: 60 },
  juniorB1: { productLine: "junior", level: "B1", range: [60, 100], prepTime: 30, responseTime: 75 },
} as const;

function tasks(audience: Audience, skill: "WRITING" | "SPEAKING", entries: Task[]): WaveItem[] {
  const { productLine, level, range, prepTime, responseTime } = settings[audience];
  const writing = skill === "WRITING";
  return entries.map(({ genre, topic, construct, prompt, evidence, sample }, index) => {
    const spec: Specification = {
      wave: "05", number: String(index + 1).padStart(2, "0"), productLine, level, genre, topic,
      subskill: "TASK_FULFILMENT", construct, evidence,
    };
    const scale = writing
      ? genre === "story" ? "Creative writing" : genre === "notice" ? "Notes, messages and forms" : "Correspondence"
      : genre === "opinion" ? "Sustained monologue: putting a case"
        : genre === "situational" ? "Sustained monologue: giving information" : "Sustained monologue: describing experience";
    const delivery = writing
      ? { minWords: range[0], maxWords: range[1], taskType: level === "B1" ? "paragraph_response" : "short_response" }
      : { prepTime, responseTime, taskType: genre };
    return item(spec, skill, writing ? "WRITING_PROMPT" : "SPEAKING_PROMPT", scale, {
      ...delivery,
      prompt,
      sampleAnswer: sample,
      ageGroup: productLine === "primary" ? "7–10" : "11–14",
      rubric: productiveRubric("wave-05-draft", {
        taskFulfilment: evidence,
        organisation: level === "A1" ? "Ideas can be listed in short, understandable phrases."
          : "Organise the details so the listener or reader can follow the message and its sequence or reasons.",
        language: level === "B1" ? "Use connected language and a suitable range of everyday forms. Allow errors that leave meaning clear."
          : "Use familiar vocabulary and basic grammatical patterns. Allow errors that leave meaning clear.",
        [writing ? "writtenClarity" : "intelligibility"]: writing
          ? "The message can be understood despite minor spelling or punctuation errors."
          : "Speech is understandable. Assess intelligibility without penalising a regional accent. A technical recording failure requires a separate decision.",
      }),
    });
  });
}

export const waveItems: WaveItem[] = [
  ...tasks("primaryA1", "WRITING", [
    {
      genre: "message", topic: "leisure", construct: "Write a short invitation with time and place.",
      prompt: "Invite a friend to draw with you. Write where to meet and give a time. You can invent the details.",
      evidence: "Invites a friend to draw and provides an understandable place and time.",
      sample: "Hi! Come and draw with me in the garden at four. I have some paper.",
    },
    {
      genre: "message", topic: "education", construct: "Write a short practical request.",
      prompt: "You need something for art class. Write a note to a friend. Say what you need and ask your friend to bring it.",
      evidence: "Names an object for art and asks the reader to bring it. Accept a sensible invented object.",
      sample: "Hi! I need some green paper for art class. Can you bring some for me, please?",
    },
    {
      genre: "message", topic: "personal_life", construct: "Write a simple thank-you message.",
      prompt: "A friend gave you a book. Write a thank-you message. Say one thing you like about the book.",
      evidence: "Thanks the friend and names a feature the writer likes. Accept an invented feature.",
      sample: "Thank you for the book. I like the funny pictures of the little dogs.",
    },
  ]),
  ...tasks("primaryA1", "SPEAKING", [
    {
      genre: "description", topic: "personal_life", construct: "Describe a familiar object using simple details.",
      prompt: "Choose a school bag, real or made up. Say its colour and name two things in it.",
      evidence: "Gives a colour and names two contents of the bag in intelligible language.",
      sample: "My bag is blue. I have a red book and a pencil in it.",
    },
    {
      genre: "description", topic: "leisure", construct: "Give basic personal information about an activity.",
      prompt: "Say what game you like and where you play it. You can make up your answer.",
      evidence: "Names a game and an understandable place to play it. Any coherent choice is valid.",
      sample: "I like playing cards. I play at the kitchen table with my brother.",
    },
    {
      genre: "situational", topic: "education", construct: "Make a brief request using familiar language.",
      prompt: "You want to borrow a ruler from a friend. Ask for the ruler and say when you will give it back.",
      evidence: "Makes an understandable request and gives a time for returning the ruler.",
      sample: "Can I borrow your ruler, please? I can give it back after class.",
    },
  ]),
  ...tasks("primaryA2", "WRITING", [
    {
      genre: "message", topic: "leisure", construct: "Write a revised plan with a simple explanation.",
      prompt: "Your class planned to paint outside. It is raining. Write to a classmate. Suggest a new place and say what your classmate should bring.",
      evidence: "Communicates a change, names a workable new place and gives one preparation detail.",
      sample: "Hi! We can't paint outside today because of the rain. Let's meet in the art room instead. Please bring your brush and the blue paint.",
    },
    {
      genre: "story", topic: "personal_life", construct: "Link a simple problem, action and outcome.",
      prompt: "A child makes a toy boat, but it sinks. Write a short story about what the child does next and how it ends.",
      evidence: "Connects the sinking boat with a subsequent action and an understandable outcome.",
      sample: "The boat sank because the paper got wet. The child made a new boat from a clean plastic lid. This time it stayed on top of the water.",
    },
    {
      genre: "notice", topic: "education", construct: "Write a short notice with instructions.",
      prompt: "Your class is collecting clean boxes to make models. Write a notice. Tell pupils where to put the boxes and what day to bring them.",
      evidence: "States the purpose and gives an actionable day and collection point.",
      sample: "Please bring one clean box on Friday for our model town. Put it on the table by the classroom door. Small boxes are fine, too.",
    },
  ]),
  ...tasks("primaryA2", "SPEAKING", [
    {
      genre: "description", topic: "leisure", construct: "Describe a short sequence of events.",
      prompt: "Tell us about a school break, real or made up. Say what you did first and what you did next.",
      evidence: "Describes two intelligible events in a clear order.",
      sample: "First I went outside and played catch with a friend. Then it started to rain, so we went inside and read a comic.",
    },
    {
      genre: "situational", topic: "education", construct: "Give two short instructions with a purpose.",
      prompt: "A new pupil wants to borrow a book from your class. Explain how to choose a book and where to write its name. You can invent the rules.",
      evidence: "Gives an understandable selection step and shows where to record the chosen book.",
      sample: "Look at the books on the low shelf and choose one you like. Then open the notebook by the shelf and write the name of your book.",
    },
    {
      genre: "opinion", topic: "environment", construct: "Give a preference and a simple reason.",
      prompt: "Your class can plant flowers or beans. Say which one you would plant and why.",
      evidence: "States a preference and gives a relevant reason. Accept either choice.",
      sample: "I would plant beans. We can see them grow taller every week, and we can take some of the beans home when they are ready.",
    },
  ]),
  ...tasks("juniorA2", "WRITING", [
    {
      genre: "email", topic: "education", construct: "Write an invitation with practical information.",
      prompt: "You are helping to run a lunchtime board-game club. Email a new student. Say where the club meets, what the student can do there and whether they need to bring anything.",
      evidence: "Invites the student, names a meeting place, describes an activity and resolves what to bring.",
      sample: "Hi! Would you like to come to our board-game club on Tuesday? We meet in Room 4 at lunch. You can learn a new game or play one you already know. We have all the games, so you don't need to bring anything.",
    },
    {
      genre: "message", topic: "transport", construct: "Notify a peer about a delay and give an alternative.",
      prompt: "You and a friend planned to meet at the sports centre. Your bus is late. Write a message. Explain why you will be late, give a new meeting time and suggest something your friend can do while waiting.",
      evidence: "Explains the delay and gives a clear new time and practical suggestion.",
      sample: "Hi! My bus is late, so I won't be at the sports centre at three. Can we meet at half past three instead? If you arrive first, you can wait in the small café by the front door. I'll send another message when I get there.",
    },
    {
      genre: "story", topic: "media", construct: "Write a short, connected account with a resolution.",
      prompt: "Your group finishes a short film but cannot hear part of it. Write what happened and how the group fixed the problem.",
      evidence: "Links the sound problem with an action and says whether the result was usable.",
      sample: "We watched our film in the classroom and found that the first voice was too quiet. We went to a smaller room and recorded that part again. Then we put the new voice into the film. This time everyone could hear the first speaker.",
    },
  ]),
  ...tasks("juniorA2", "SPEAKING", [
    {
      genre: "situational", topic: "education", construct: "Explain a familiar routine with two steps.",
      prompt: "Your school has a shelf where students can swap books. Tell a new student how to use it. Explain what to bring and what to do next.",
      evidence: "Identifies what the student brings and the actions for leaving and taking a book.",
      sample: "Bring a book you have finished. Put it on the swap shelf near the office. Then choose a different book to take home. If you don't see one you like, you can come back another day.",
    },
    {
      genre: "opinion", topic: "culture", construct: "Compare two simple options and choose one.",
      prompt: "The class can visit a small museum or take a walk to see old buildings. Say which idea you prefer and give a reason.",
      evidence: "Names one option and gives a relevant, understandable reason. Accept either option.",
      sample: "I'd choose the walk. We can see how people still use some old buildings, and we can stop when we find something interesting. If it rains, we could go to the museum another day.",
    },
    {
      genre: "description", topic: "technology", construct: "Describe a personal or invented experience.",
      prompt: "Think of a time when a device stopped working. Say what happened and what you did. You can make up the story.",
      evidence: "Describes an understandable problem and a connected action.",
      sample: "I wanted to show my group a photo, but the tablet had no power. I asked our teacher for a charger. We looked at my drawing first and showed the photo later, when the tablet worked again.",
    },
  ]),
  ...tasks("juniorB1", "WRITING", [
    {
      genre: "email", topic: "education", construct: "Write a practical proposal and justify it.",
      prompt: "Your school wants to help new students meet people. Email the student council. Suggest one short activity, explain how it would work and say why it would help.",
      evidence: "Proposes a feasible activity, explains its steps and gives a reason tied to helping new students meet people.",
      sample: "Hi everyone, I suggest a lunchtime game in the hall during the first week. We could give each new student a small card with three things to find out, such as who likes the same music. Older students could join in and show them around afterwards. The activity would give people a reason to start talking and help students who are shy. We would only need a few cards and one room.",
    },
    {
      genre: "story", topic: "leisure", construct: "Write a narrative about an unexpected change.",
      prompt: "A group is about to start a club event when they find their usual room locked. Write a story about how they react and what happens at the event.",
      evidence: "Develops the initial problem, a linked response and an explicit outcome in a coherent sequence.",
      sample: "We arrived early to set up the quiz, but the hall was locked. I called the teacher while my friend checked the other rooms. The art room was free, although it only had a few chairs. We put the questions on the walls and turned the quiz into a walk around the room. At first I thought people would leave, but everyone stayed and asked us to do it that way again.",
    },
    {
      genre: "email", topic: "environment", construct: "Respond to competing suggestions and make a recommendation.",
      prompt: "Your class has space for a small garden. Some classmates want flowers and others want vegetables. Write to your class. Recommend one option or a combination, give a reason and suggest one way to share the work.",
      evidence: "Makes a clear recommendation, relates it to the garden's purpose and proposes a realistic division of work.",
      sample: "I think we should grow vegetables in the large boxes and put flowers in the smaller ones. That would give us something to use in cooking club and make the garden more colourful. We could work in pairs, with a different pair checking the boxes each day. At the end of the month, we could talk about what grew well and decide whether to change the plan for the next term.",
    },
  ]),
  ...tasks("juniorB1", "SPEAKING", [
    {
      genre: "opinion", topic: "education", construct: "Give a supported preference and address one drawback.",
      prompt: "Your school can run a homework club before classes or after classes. Recommend a time, give a reason and say how you would help pupils who cannot come then.",
      evidence: "States a supported recommendation and offers a feasible accommodation for pupils who would miss out.",
      sample: "I'd run it after classes because pupils can ask about work they were given that day. Some have to catch a bus straight away, though. The club could put the teacher's notes online, and those pupils could send one question before the next day.",
    },
    {
      genre: "description", topic: "leisure", construct: "Recount a problem and reflect on a change.",
      prompt: "Tell us about a group activity that didn't go as planned. Say what happened, how the group reacted and what you would change next time. You can invent an example.",
      evidence: "Recounts the problem and response, then offers a specific improvement connected to the experience.",
      sample: "We planned a football game, but too many students came for one match. We made small teams and played shorter games. Next time I'd ask people to sign up first so we know how many teams we need before we start.",
    },
    {
      genre: "situational", topic: "culture", construct: "Present an event plan and explain a choice.",
      prompt: "Your club is making a small exhibition. Explain how visitors will move through it and how you will help them find the section they want.",
      evidence: "Proposes an intelligible route and a relevant tool or instruction for navigating to a section.",
      sample: "I'd start with a welcome table where visitors can pick up a map. The door on the left would lead to the photographs, and the other door would lead to the models. We'd put the same section names on the map and on signs above the doors.",
    },
  ]),
];
