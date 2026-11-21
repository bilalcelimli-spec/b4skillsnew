import { objective, type Specification, type WaveItem } from "./young-learner-item.js";

type Choices = Parameters<typeof objective>[5];

function reading(
  number: string, level: "PRE_A1" | "A1" | "A2", genre: string,
  focus: Pick<Specification, "subskill" | "construct" | "evidence">,
  passage: string, prompt: string, key: number, options: Choices,
): WaveItem {
  const scale = genre === "narrative" ? "Reading as a leisure activity"
    : genre === "message" ? "Reading correspondence" : "Reading for orientation";
  return objective({ wave: "02", number, productLine: "primary", level, genre, topic: "education", ...focus },
    scale, passage, prompt, key, options);
}

function listening(
  number: string, level: "A1" | "B2", topic: string,
  focus: Pick<Specification, "subskill" | "construct" | "evidence">,
  speakers: [string, string], turns: [string, string, string, string],
  prompt: string, key: number, options: Choices,
): WaveItem {
  const script = turns.map((turn, index) => `${speakers[index % 2]}: ${turn}`).join("\n");
  return objective({ wave: "02", number, productLine: "junior", level, genre: "conversation", topic, ...focus },
    "Understanding conversation between other people", script, prompt, key, options, speakers);
}

export const waveItems: WaveItem[] = [
  reading("01", "PRE_A1", "notice", { subskill: "EXPLICIT_DETAIL", construct: "Read a simple label and location", evidence: "Finds the location written for a named object." },
    "The pens are in the bag. The books are on the desk.", "Where are the pens?", 1, [
      ["On the bag", "The pens are inside the bag."], ["In the bag", "The first sentence puts the pens in the bag."],
      ["Under the desk", "Only the books are near the desk and they are on it."], ["On the desk", "The desk is where the books are."],
    ]),
  reading("02", "PRE_A1", "message", { subskill: "EXPLICIT_DETAIL", construct: "Read a short message about an object", evidence: "Links a simple colour adjective to the requested object." },
    "Jo, my cup is green. My plate is blue. Can I have my cup?", "What colour is the cup?", 3, [
      ["Red", "The writer gives green as the cup colour."], ["Blue", "Blue describes the plate."],
      ["Yellow", "The writer does not name yellow."], ["Green", "The first sentence says the cup is green."],
    ]),
  reading("03", "PRE_A1", "message", { subskill: "EXPLICIT_DETAIL", construct: "Read a simple statement about a person", evidence: "Identifies the animal linked to the named child." },
    "Ana has a pet fish. I have a cat. The cat is black.", "What pet has Ana got?", 0, [
      ["A fish", "The first sentence gives Ana's pet."], ["A cat", "The cat belongs to the writer."],
      ["A dog", "There is no dog in the message."], ["A bird", "There is no bird in the message."],
    ]),
  reading("01", "A1", "notice", { subskill: "SPECIFIC_INFORMATION", construct: "Read a timetable change", evidence: "Selects the new slot and ignores the old one and other clubs." },
    "Monday clubs\nDance starts at four in the hall. Chess is now at five in Room 6. It was at three last week. Art starts at two in the art room.", "When does Chess start now?", 2, [
      ["At two", "That is the Art time."], ["At three", "That was last week's Chess time."],
      ["At five", "The notice says Chess is now at five."], ["At four", "That is the Dance time."],
    ]),
  reading("02", "A1", "message", { subskill: "SPECIFIC_INFORMATION", construct: "Read what to bring in a personal message", evidence: "Distinguishes a requested object from objects already provided." },
    "Hi Ida,\nLet's draw at my house. I have pencils and paper. Please bring a ruler. My sister can give us a rubber.\nSee you at four!\nPat", "What should Ida bring?", 1, [
      ["A pencil", "Pat already has pencils."], ["A ruler", "The message directly asks Ida to bring one."],
      ["A rubber", "Pat's sister can provide it."], ["Some paper", "Pat already has paper."],
    ]),
  reading("03", "A1", "notice", { subskill: "SPECIFIC_INFORMATION", construct: "Read different collection arrangements", evidence: "Matches the object to its collection place." },
    "Lost property today\nBags are by the hall door. Pick up water bottles in the music room. Hats are in the office. Ask for books in the library.", "Where can pupils get their water bottles?", 3, [
      ["By the hall door", "Bags are there."], ["In the office", "Hats are there."],
      ["In the library", "Books are there."], ["In the music room", "The notice puts the bottles in the music room."],
    ]),
  reading("01", "A2", "narrative", { subskill: "CAUSE_EFFECT_INFERENCE", construct: "Connect a problem and a new arrangement in a short story", evidence: "Recognises the new arrangement makes participation possible for a specific group." },
    "Class 4 read its story to Class 2 at the end of the day. Before the story finished, three children had to leave to catch the bus. The next week, the teacher put the story on the morning timetable. Class 4 brought the same story book again.",
    "Why did the teacher probably move the story to the morning?", 0, [
      ["So the children who take the bus could hear all of it.", "Moving earlier removes the conflict with leaving to catch the bus."],
      ["So Class 4 could start reading a different book.", "Class 4 brought the same book."],
      ["So the children could read on the bus instead.", "The class still reads the story in school."],
      ["So Class 2 could read a story to Class 4.", "The passage keeps Class 4 as the group bringing the book."],
    ]),
  reading("02", "A2", "message", { subskill: "INFERENCE", construct: "Infer the next action from a change and sequence", evidence: "Combines the change of venue with the sequence after lunch." },
    "Hi Ren,\nOur models can't go in the hall tomorrow because there's a concert. Put yours on the shelf outside Room 8 before lunch. After lunch, we’ll all carry our models into Room 8 and talk about them. Before you bring the model tomorrow, attach your name card to it.\nLee",
    "Where will Ren probably talk about the model?", 2, [
      ["In the hall", "The concert prevents the models going there."], ["By the shelf", "The shelf is for keeping the models before lunch."],
      ["Inside Room 8", "The models are carried into Room 8 for the talks."], ["At the concert", "The concert is the reason for the venue change."],
    ]),
  listening("01", "A1", "education", { subskill: "SPECIFIC_INFORMATION", construct: "Identify the final meeting point", evidence: "Selects the new meeting place after hearing a correction." },
    ["Lena", "Tom"], ["Do we meet at the library for the film?", "No. The film is in the hall. Meet me at the front gate first.", "At half past three?", "Yes. Then we can walk to the hall together."],
    "Where will they meet first?", 1, [
      ["At the library", "It is suggested before the correction."], ["At the front gate", "Tom says to meet there first."],
      ["In the hall", "It is the film venue."], ["In the classroom", "The conversation gives no classroom meeting point."],
    ]),
  listening("02", "A1", "leisure", { subskill: "SPECIFIC_INFORMATION", construct: "Identify a weekday in a revised plan", evidence: "Follows the final day chosen for the activity." },
    ["Zara", "Leo"], ["Can you play on Monday?", "I can help with the chairs on Monday, but I can only play on Thursday.", "I have art on Wednesday, so Thursday is good.", "Great. I'll bring the ball on Thursday."],
    "When will they play?", 3, [
      ["On Monday", "Leo can only help with chairs then."], ["On Tuesday", "That day is not proposed."],
      ["On Wednesday", "Zara has art on that day."], ["On Thursday", "Both speakers agree on Thursday."],
    ]),
  listening("03", "A1", "education", { subskill: "FACTUAL_DETAIL", construct: "Identify a borrowed item after a contrast", evidence: "Tells which classroom object a speaker still needs." },
    ["Maya", "Omar"], ["Do you want my scissors for the map?", "I've got scissors and paper. Have you got a pen I can use?", "Yes, here's a black one. The ruler is in my bag.", "Thanks. I'll put it back after the lesson."],
    "What does the second speaker borrow?", 0, [
      ["A pen", "He asks for a pen and Maya gives him one."], ["Some scissors", "He says he already has scissors."],
      ["A ruler", "Maya says the ruler is still in her bag."], ["Some paper", "Omar already has paper."],
    ]),
  listening("04", "A1", "leisure", { subskill: "FACTUAL_DETAIL", construct: "Identify a simple time in a short exchange", evidence: "Distinguishes an activity start time from a help and finish time." },
    ["Rosa", "Liam"], ["The music room is open at two. Does the singing start then?", "No, we can help with the chairs at two. The singing starts at three.", "When does it finish?", "At four. The film group comes in at five."],
    "What time does the singing start?", 2, [
      ["At two", "That is when people can help with chairs."], ["At four", "That is when singing finishes."],
      ["At three", "Liam gives three as the start time."], ["At five", "That is when the film group comes."],
    ]),
  listening("05", "A1", "transport", { subskill: "SPECIFIC_INFORMATION", construct: "Identify a route number after clarification", evidence: "Links the confirmed bus number to the destination." },
    ["Aiko", "Daniel"], ["Does the number six bus go to the pool?", "No, take the number eight. The six goes past the park.", "Can I take the nine from here?", "The nine stops on Mill Road. Wait here for the eight."],
    "Which bus goes to the pool?", 1, [
      ["Number six", "It is the bus for the park in this exchange."], ["Number eight", "Daniel names it for the pool and repeats it."],
      ["Number nine", "It stops on another road."], ["Number ten", "The conversation does not give this route."],
    ]),
  listening("06", "A1", "education", { subskill: "FACTUAL_DETAIL", construct: "Identify the chosen colour in a short discussion", evidence: "Finds the colour finally chosen for a sign." },
    ["Hana", "Elias"], ["Can we make the sign blue, like our old sign?", "We don't have blue paper. We have white paper and yellow paper.", "Let's use yellow. Can we write on it with a black pen?", "Yes. I'll get the yellow paper."],
    "What colour paper will they use?", 3, [
      ["White", "It is available but is not chosen."], ["Black", "Black is the pen colour."],
      ["Blue", "The old sign was blue but they have no blue paper."], ["Yellow", "They choose yellow paper at the end."],
    ]),
  listening("07", "A1", "leisure", { subskill: "SPECIFIC_INFORMATION", construct: "Identify which item belongs in a place", evidence: "Follows short spoken instructions for organising a room." },
    ["Sofia", "Marcus"], ["Shall I put the games on the table?", "Put them on the shelf. Leave the cards on the table.", "What about the balls?", "Put them in the box under the chair."],
    "What should stay on the table?", 0, [
      ["The cards", "Marcus asks to leave the cards on the table."], ["The games", "The games go on the shelf."],
      ["The balls", "The balls go in the box."], ["The box", "The box is under the chair."],
    ]),
  listening("08", "A1", "education", { subskill: "PURPOSE", construct: "Recognise the purpose of a simple request", evidence: "Understands what a speaker wants to use an object for." },
    ["Amara", "Dario"], ["Can I use your phone for a minute?", "Sure. Do you need to call someone?", "No. I'd like to take a photo of our model. My phone is at home.", "Okay. We can look at the photo after class."],
    "Why does the first speaker ask to use the phone?", 2, [
      ["To make a call", "Amara rejects this suggestion."], ["To find her phone", "She knows her phone is at home."],
      ["To take a photo", "Amara explicitly says she wants a photo of the model."], ["To look at a photo from class", "Looking at the photo is planned for afterwards."],
    ]),
  listening("01", "B2", "media", { subskill: "DISTINGUISHING_VIEWPOINTS", construct: "Compare two reasons for delaying a release", evidence: "Separates a concern about accessibility from a concern about accuracy." },
    ["Nadia", "Ben"], ["If we release the school tour today, people can watch it before Friday. I'd still wait for the captions, though. When we tested it in a busy corridor, some students could see us talking but couldn't follow a word.", "I'd also wait, but my problem is the map. In the video we turn left at the old office, and the office has moved.", "Would you keep the recording if we added a note over that part?", "Only if the note stays on screen long enough to read while people are walking."],
    "What is the first speaker's main reason for waiting?", 2, [
      ["The map should record the move before viewers use it.", "The second speaker raises the outdated directions."],
      ["Students need the tour on a different day.", "The timing before Friday is presented as a benefit."],
      ["Some viewers could not follow the speech in the test setting.", "She describes students who could see the recording but could not follow the words."],
      ["A note over the map might disappear too quickly.", "The second speaker raises the duration of a note."],
    ]),
  listening("02", "B2", "science", { subskill: "IMPLICATION", construct: "Infer why an apparent effect is uncertain", evidence: "Identifies a competing explanation after hearing a qualification." },
    ["Lily", "Marcus"], ["The model houses with paper roofs ended up cooler. I was going to say paper kept out more heat.", "Then you noticed where they were?", "Yes. We put them on the far side of the table. When the sun moved, that end was shaded by the window frame. The other group was still in sunlight.", "Keep the temperatures in the report, but move the houses between positions each time you repeat it."],
    "Why is the first speaker's initial conclusion uncertain?", 0, [
      ["The houses were exposed to different amounts of direct sun.", "Shade coincided with the roof material, leaving another explanation for the temperature difference."],
      ["The houses were moved halfway through the first comparison.", "Moving the houses is proposed for later repeats."],
      ["The shaded houses were measured before they had cooled down.", "The discussion gives no different timing of temperature measurements."],
      ["The roof material stopped the houses from casting a shadow.", "The shade came from the window frame."],
    ]),
  listening("03", "B2", "leisure", { subskill: "AGREEMENT_DISAGREEMENT", construct: "Identify the point on which two speakers agree", evidence: "Finds shared ground amid disagreement about the format." },
    ["Rosa", "Daniel"], ["I'd let everyone bring the same board game to the club each week. We could learn to play it well instead of spending half the time on rules.", "I would change the game each week. Some people have stopped coming because the same group wins every time.", "Whatever we choose, could two leaders set up before everyone arrives? Yesterday it took ten minutes to find the pieces.", "That would help. Then we wouldn't lose the first part of the break."],
    "What do both speakers support?", 3, [
      ["Changing which game is offered each week.", "Only the second speaker favours a weekly change."],
      ["Keeping one game until everyone has learnt the rules.", "Only the first speaker favours repeating one game."],
      ["Giving the winning group a different role.", "Recurring winners are a concern, but no role change is agreed."],
      ["Preparing the game before the other students arrive.", "One proposes setting up early and the other explicitly supports it."],
    ]),
  listening("04", "B2", "environment", { subskill: "ARGUMENT_DEVELOPMENT", construct: "Follow how a speaker shifts from totals to a diagnostic measure", evidence: "Identifies what the revised measure can reveal about the activity." },
    ["Aiko", "Tom"], ["We counted forty reusable cups at the fair. I thought that meant fewer people needed a paper cup.", "It tells us how many reusable cups we handed out, but some came back for a second drink and asked for a paper cup because their first cup was still dirty.", "Then we'll count how many second drinks go into a paper cup.", "And set up somewhere to rinse the reusable cups before the next fair."],
    "What would the new count help the team understand?", 1, [
      ["Whether the forty cups were handed out at the same time.", "The count is about second drinks, not the times of distribution."],
      ["Whether people switch to paper cups when they come back for another drink.", "The new measure directly records paper use for second drinks."],
      ["Whether first-time visitors choose reusable cups more often.", "The change focuses on returning drinkers."],
      ["Whether a rinse station had already reduced paper cup use.", "A rinse station is proposed for the next fair."],
    ]),
  listening("05", "B2", "education", { subskill: "SPEAKER_ATTITUDE", construct: "Interpret qualified approval of an initiative", evidence: "Identifies both endorsement and the condition the speaker adds." },
    ["Zara", "Leo"], ["The student guides want everyone to use their new welcome sheet. There are twenty questions on it now.", "I like that they collected questions from new students. But my guide read the whole sheet to me before I had even put my bag down. I'd keep it with the guides and have them offer the relevant page when a question comes up.", "So you're happy with the questions themselves?", "Very. I just think people should control when they hear the answers."],
    "How does the second speaker feel about the welcome sheet?", 2, [
      ["The guides should replace the student questions with their own.", "He approves of collecting questions from new students."],
      ["The guides should read it more slowly during the first meeting.", "He wants answers offered when needed."],
      ["Its content is worthwhile, but guides should change how they use it.", "He explicitly approves the questions and changes the timing of delivery."],
      ["Its questions are useful only before students arrive.", "He proposes using it during the visit when a question comes up."],
    ]),
  listening("06", "B2", "technology", { subskill: "INFERRED_INTENTION", construct: "Infer the reason for delaying visibility of information", evidence: "Connects display timing to independent participation." },
    ["Maya", "Omar"], ["You have hidden the live votes on the project page. I thought seeing the totals would make people more interested.", "Last time, the first idea got six votes before lunchtime. After that several students clicked on it without opening the other ideas. This time everyone can still change their vote until Friday, but the totals will appear only when voting closes.", "Are you trying to give the newest ideas more time online?", "All the ideas are already there. I want people to open the ideas before looking at a score."],
    "Why will the totals stay hidden until Friday?", 0, [
      ["So early results are less likely to shape later votes.", "The speaker links visible early results to students voting without looking at alternatives."],
      ["So new project ideas can be added after voters have made their first choice.", "The speaker says all the ideas are already posted."],
      ["So voters can avoid comparing several projects before Friday.", "He specifically wants students to read the ideas before seeing scores."],
      ["So students cannot change a vote once they have seen the ideas.", "Students can change their votes until Friday."],
    ]),
  listening("07", "B2", "culture", { subskill: "IMPLIED_MEANING", construct: "Infer a criticism conveyed through an example", evidence: "Recognises the concern about the effect of presentation on audience interpretation." },
    ["Amara", "Dario"], ["I moved the two photos to opposite sides of the exhibition room. Now people have more space to look at each one.", "Yesterday a visitor told me the photos showed different buildings. She could see the trees in the first one but couldn't remember where they were when she reached the second. They're actually the same corner, fifty years apart.", "I can put copies of the two street plans beneath them.", "That would help, but visitors would still have to carry one view in their heads across the room."],
    "What is the second speaker suggesting about the new layout?", 1, [
      ["Visitors now have insufficient space to look closely at each photo.", "Space is presented as an advantage of the layout."],
      ["It makes the connection between the two pictures harder to see.", "The visitor did not notice the same location, and he says separation will still make comparison hard."],
      ["It directs too much attention to the older street plan.", "The street plans are only suggested during this discussion."],
      ["It makes visitors think both photos were taken in the same year.", "The visitor thinks the buildings are different, not that the date is the same."],
    ]),
  listening("08", "B2", "sports", { subskill: "SYNTHESISING_INFORMATION", construct: "Identify a compromise that responds to different concerns", evidence: "Connects the proposed division of space to the needs mentioned earlier." },
    ["Sofia", "Liam"], ["I'd keep the whole court for players who've already signed up. A large game is easier to run if teams have been picked in advance.", "That leaves students who arrive alone with nothing to do. Could we put two benches down the middle for the first ten minutes? The teams can warm up on one side and anyone can try a short activity on the other. Then the full game can start on time.", "Would the people on the other side be able to join if somebody is missing?", "Yes, we could ask them before we take the benches away."],
    "How does the suggested plan respond to both concerns?", 3, [
      ["It allows the teams to choose new players before anyone has a chance to warm up.", "The teams warm up during the divided period before any invitation is mentioned."],
      ["It lets everyone take part in the full game from the start.", "The full game still starts after the divided introductory period."],
      ["It keeps the two sides separate for the whole break.", "The benches are removed after the first period."],
      ["It gives unregistered students something to do while the teams prepare.", "Separate spaces let the teams warm up and individuals try an activity before the main game."],
    ]),
];
