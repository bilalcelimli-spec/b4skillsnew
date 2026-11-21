import { choiceKey, item, type Choices, type Specification, type WaveItem } from "./young-learner-item.js";

type Focus = Pick<Specification, "subskill" | "construct" | "evidence">;
type Cell = readonly [Specification["productLine"], Specification["level"]];
const primaryA1 = ["primary", "A1"] as const;
const primaryA2 = ["primary", "A2"] as const;
const juniorA2 = ["junior", "A2"] as const;
const juniorB1 = ["junior", "B1"] as const;
const juniorB2 = ["junior", "B2"] as const;

function vocabulary(
  [productLine, level]: Cell, number: string, topic: string, genre: string, focus: Focus,
  type: "MULTIPLE_CHOICE" | "FILL_IN_BLANKS", content: WaveItem["content"],
): WaveItem {
  const scale = focus.subskill === "CONTEXTUAL_MEANING" ? "Vocabulary range" : "Vocabulary control";
  return item({ wave: "04", number, productLine, level, topic, genre, ...focus }, "VOCABULARY", type, scale, content);
}

function select(
  cell: Cell, number: string, topic: string, focus: Focus,
  prompt: string, key: number, choices: Choices,
): WaveItem {
  return vocabulary(cell, number, topic, "contextual_choice", focus, "MULTIPLE_CHOICE", {
    prompt,
    ...choiceKey(key, choices),
  });
}

function fill(
  cell: Cell, number: string, topic: string, focus: Focus,
  prompt: string, scaffold: string, answers: string[], rejectedAnswer: string,
): WaveItem {
  const draft = vocabulary(cell, number, topic, "sentence_completion", focus, "FILL_IN_BLANKS", {
    prompt, scaffold, blanks: [{ acceptableAnswers: answers }],
  });
  return { ...draft, rejectedAnswer };
}

export const waveItems: WaveItem[] = [
  select(primaryA1, "01", "education",
    { subskill: "CONTEXTUAL_MEANING", construct: "Identify a school object from its function", evidence: "Recognises the object used to remove a pencil mark." },
    "I made a line with my pencil. I need to take the line off the paper. What do I need?", 2, [
      ["A ruler", "A ruler helps make a line straight."], ["A clip", "A clip holds sheets together."],
      ["An eraser", "An eraser takes a pencil mark off paper."], ["A brush", "A brush puts paint on paper."],
    ]),
  select(primaryA1, "02", "leisure",
    { subskill: "CONTEXTUAL_MEANING", construct: "Identify a familiar garment from the part of the body it covers", evidence: "Links the clothing term to cold hands." },
    "We're going out to play. My hands are cold. What can I put on my hands?", 0, [
      ["Gloves", "Gloves cover the hands."], ["Socks", "Socks cover the feet."],
      ["Boots", "Boots go on the feet."], ["A scarf", "A scarf normally goes around the neck."],
    ]),
  select(primaryA1, "03", "personal_life",
    { subskill: "CONTEXTUAL_MEANING", construct: "Recognise an everyday action from a short sequence", evidence: "Links moving water from a bottle into a cup to the appropriate verb." },
    "Ali puts some water from a bottle into a cup. What does he do to the water?", 3, [
      ["He drinks it.", "The story describes water going into the cup."], ["He drops it.", "The transfer into the cup is deliberate."],
      ["He turns it.", "The water moves into another container."], ["He pours it.", "Pour describes making liquid flow into a container."],
    ]),
  select(primaryA1, "04", "personal_life",
    { subskill: "CONTEXTUAL_MEANING", construct: "Match a common adjective to a visible state", evidence: "Recognises that no contents is the defining clue for empty." },
    "There is nothing in the basket now. Which word describes the basket?", 1, [
      ["Full", "Full would mean the basket contains things."], ["Empty", "The basket contains nothing."],
      ["Heavy", "The sentence gives no information about weight."], ["Broken", "There is no damage in the sentence."],
    ]),
  select(primaryA1, "05", "transport",
    { subskill: "CONTEXTUAL_MEANING", construct: "Recognise a common travel place", evidence: "Distinguishes a place where a train leaves from other public places." },
    "We need to catch a train. Where do we go to get on it?", 0, [
      ["The station", "People get on trains at a station."], ["The market", "People go to a market to buy things."],
      ["The cinema", "People see films there."], ["The library", "People read and borrow books there."],
    ]),
  select(primaryA1, "06", "education",
    { subskill: "CONTEXTUAL_MEANING", construct: "Recognise a common movement instruction", evidence: "Links movement upwards and downwards between floors to stairs." },
    "The music room is on the next floor. My teacher says, ‘Walk up the stairs.’ What does the teacher mean?", 2, [
      ["Walk through a door.", "A door takes someone into or out of a space."], ["Walk across the room.", "This is movement to the other side of the same room."],
      ["Walk up the steps.", "Stairs are steps that take someone to another level."], ["Walk along the wall.", "This describes moving beside a wall on the same level."],
    ]),
  select(primaryA2, "01", "education",
    { subskill: "CONTEXTUAL_MEANING", construct: "Understand borrow in a classroom exchange", evidence: "Identifies temporary use with a plan to return the object." },
    "‘Can I borrow your blue marker until the end of class?’ What is the person asking to do?", 3, [
      ["Give the marker to someone else.", "The pupil asks to use the owner's marker personally."],
      ["Buy a marker after class.", "No purchase is requested."],
      ["Keep the marker for good.", "Until the end of class limits the time."],
      ["Use the marker for a short time and give it back.", "Borrow includes using something temporarily and returning it."],
    ]),
  select(primaryA2, "02", "leisure",
    { subskill: "COLLOCATION", construct: "Interpret the familiar phrase take turns", evidence: "Connects the phrase with different people doing the same activity one at a time." },
    "Only one person can use the drum at a time. The teacher says, ‘Let's take turns.’ What should the group do?", 1, [
      ["Play other instruments at the same time.", "The instruction is about sharing the drum."],
      ["Let each person use the drum one after another.", "Taking turns gives each person a chance in sequence."],
      ["Pick one person to play it all the time.", "Taking turns involves more than one person."],
      ["Move the drum to another part of the room.", "The phrase concerns who plays and when."],
    ]),
  select(primaryA2, "03", "personal_life",
    { subskill: "LEXICAL_PRECISION", construct: "Understand spare in an everyday offer", evidence: "Distinguishes an extra thing from a different state of the same thing." },
    "‘I have a spare ticket for Saturday. Would you like it?’ What does spare mean here?", 2, [
      ["Already used", "The offer is for a future event."], ["Too expensive", "The message does not mention the price."],
      ["Extra", "The speaker has a ticket beyond the one they need."], ["Hard to find", "The speaker has the ticket to offer."],
    ]),
  select(primaryA2, "04", "education",
    { subskill: "CONTEXTUAL_MEANING", construct: "Infer the meaning of crowded from a description", evidence: "Uses the presence of many people and limited room to understand the adjective." },
    "The hall was crowded after the show, and it took us a while to get to the door. What does crowded mean here?", 0, [
      ["Full of people", "Many people with little space make a place crowded."],
      ["Hard to see in", "There is no mention of darkness."],
      ["Too cold for a show", "Temperature is not the problem."],
      ["Closed for cleaning", "People are inside and trying to leave."],
    ]),
  fill(primaryA2, "05", "personal_life",
    { subskill: "WORD_FORMATION", construct: "Form an adjective for taking care in a familiar setting", evidence: "Forms the adjective that expresses attention to the stated risk." },
    "Change the word in capital letters to complete the sentence.", "The path is wet, so please be ___ when you walk down it. (CARE)", ["careful"], "careless"),
  fill(primaryA2, "06", "education",
    { subskill: "WORD_FORMATION", construct: "Form a verb that reverses an action on a school bag", evidence: "Uses the reversal prefix to fit a situation where packed items are taken out." },
    "Change the word in capital letters to complete the sentence.", "When you get home, ___ your bag and take out the books. (PACK)", ["unpack"], "repack"),
  select(juniorA2, "01", "education",
    { subskill: "CONTEXTUAL_MEANING", construct: "Understand available in a timetable exchange", evidence: "Infers that a room can be used only during the stated slot." },
    "The club leader says, ‘Room 6 is only available before lunch.’ What is she saying about Room 6?", 1, [
      ["The group must clean it before lunch.", "The sentence gives no cleaning instructions."],
      ["The group can use it before lunch.", "Available means the room is free to use."],
      ["The group needs to leave its bags there all day.", "There is no storage instruction."],
      ["The group can go there only after lunch.", "This reverses the time in the message."],
    ]),
  select(juniorA2, "02", "media",
    { subskill: "MULTI_WORD_EXPRESSIONS", construct: "Understand a common phrasal verb for completing a form", evidence: "Identifies putting information into the spaces of a form." },
    "Before the trip, ‘fill in the form’ at the school office. What should students do?", 3, [
      ["Check what the form looks like.", "Looking at a form does not complete it."],
      ["Put the form into an envelope.", "Putting it away is a different action."],
      ["Pick a form from the box.", "This would be getting a form."],
      ["Write the information the form asks for.", "Filling in a form means supplying the requested information."],
    ]),
  select(juniorA2, "03", "leisure",
    { subskill: "COLLOCATION", construct: "Interpret a fixed expression for a participation decision", evidence: "Recognises that take part means joining the activity as a participant." },
    "‘Can students from other classes take part in our photography competition?’ What does take part mean?", 0, [
      ["Enter the competition", "To take part is to participate as an entrant."],
      ["Help choose the winners", "Choosing winners is a judging role."],
      ["Watch the competition", "Watching leaves the person outside the activity."],
      ["Tell people about it", "This means promoting the competition."],
    ]),
  select(juniorA2, "04", "technology",
    { subskill: "CONTEXTUAL_MEANING", construct: "Recognise a contrast between fixing and replacing an object", evidence: "Uses the damaged screen to understand the action of substituting a new part." },
    "The tablet works, but the screen is cracked. The technician will replace the screen. What will happen?", 2, [
      ["The same screen will be cleaned.", "Cleaning leaves the cracked screen in place."],
      ["The whole tablet will be thrown away.", "The action is limited to the screen."],
      ["A different screen will be fitted.", "Replacing the screen means putting another screen in its place."],
      ["The screen will be covered with a case.", "A case does not take the old screen's place."],
    ]),
  fill(juniorA2, "05", "transport",
    { subskill: "WORD_FORMATION", construct: "Form an adjective describing a late service", evidence: "Derives an adjective identifying a service that will not leave on time." },
    "Change the word in capital letters to complete the sentence.", "The bus was ___ and arrived twenty minutes after its usual time. (DELAY)", ["delayed"], "delaying"),
  fill(juniorA2, "06", "education",
    { subskill: "WORD_FORMATION", construct: "Form an adjective describing how someone feels", evidence: "Derives a participial adjective naming the students' emotional response." },
    "Change the word in capital letters to complete the sentence.", "We were ___ when our group won the school quiz. (EXCITE)", ["excited"], "exciting"),
  select(juniorB1, "01", "education",
    { subskill: "LEXICAL_PRECISION", construct: "Interpret a verb that signals a condition is essential", evidence: "Distinguishes what an activity needs from what it offers or recommends." },
    "The workshop requires an adult to be present, even if the students already know the equipment. What does requires mean?", 2, [
      ["Suggests that an adult might help", "The adult's presence is presented as a condition."],
      ["Pays for an adult to attend", "The notice says nothing about payment."],
      ["Makes an adult's presence necessary", "Requires introduces a condition of the workshop."],
      ["Offers to train an adult", "No training for the adult is mentioned."],
    ]),
  select(juniorB1, "02", "environment",
    { subskill: "CONTEXTUAL_MEANING", construct: "Infer the sense of a verb used in a repair report", evidence: "Uses the continued existence of the work to distinguish postponing from ending it." },
    "The club put off the garden repairs until the ground dried. The tools were left beside the shed for the following week. What does put off mean?", 0, [
      ["Delayed the work", "The repairs will happen after a wait."], ["Finished the work", "The work has not taken place yet."],
      ["Called off the work", "The tools are ready for a later time."], ["Moved the work to another garden", "The change is in time, not location."],
    ]),
  fill(juniorB1, "03", "media",
    { subskill: "WORD_FORMATION", construct: "Form a noun for the gradual improvement of a skill", evidence: "Derives a noun from the supplied verb to fit the meaning and syntax." },
    "Change the word in capital letters to complete the sentence.", "The students' language ___ was easier to see after the second recording. (DEVELOP)", ["development"], "developing"),
  fill(juniorB1, "04", "technology",
    { subskill: "WORD_FORMATION", construct: "Form an adjective denoting suitability for reliance", evidence: "Selects the adjective for an object that performs consistently." },
    "Change the word in capital letters to complete the sentence.", "The old counter gives a different number each time, so it is not ___. (RELY)", ["reliable"], "reliably"),
  fill(juniorB1, "05", "culture",
    { subskill: "WORD_FORMATION", construct: "Form an adjective meaning connected to the past", evidence: "Produces the adjectival form that describes a collection of objects from the past." },
    "Change the word in capital letters to complete the sentence.", "The exhibition includes ___ objects from the 1800s and photographs from this year. (HISTORY)", ["historical", "historic"], "historian"),
  fill(juniorB1, "06", "education",
    { subskill: "WORD_FORMATION", construct: "Form a noun for an account of how something was done", evidence: "Uses an appropriate singular noun after an adjective." },
    "Change the word in capital letters to complete the sentence.", "Please give a clear ___ of how your group made the model. (EXPLAIN)", ["explanation"], "explaining"),
  select(juniorB2, "01", "education",
    { subskill: "LEXICAL_PRECISION", construct: "Interpret a verb for making an allowance without removing a requirement", evidence: "Distinguishes accommodating a need from endorsing or overlooking it." },
    "The club moved practice to an earlier slot to accommodate members who left on the first bus. What does accommodate mean here?", 2, [
      ["Persuade the members to stay longer.", "The change acknowledges that members need to leave by bus."],
      ["Give the members a temporary place to stay.", "The sentence concerns a timetable, not lodging."],
      ["Organise practice in a way that fits the members' needs.", "The earlier slot makes the schedule workable for those members."],
      ["Make the practice optional for those members.", "The members can attend at the earlier time."],
    ]),
  select(juniorB2, "02", "media",
    { subskill: "CONTEXTUAL_MEANING", construct: "Interpret provisional after a qualification about incomplete evidence", evidence: "Distinguishes subject to revision from approved, unmeasurable or irrelevant." },
    "The student paper published a provisional list of the most requested clubs because two classes had yet to respond. What does provisional mean?", 1, [
      ["Already accepted as final.", "The missing responses could change the result."],
      ["Valid for now, but open to change.", "Provisional indicates a current decision that may be revised."],
      ["Selected without using any evidence.", "The paper has requests from other classes."],
      ["Incomplete because the editor removed entries.", "The issue is missing responses, not removed entries."],
    ]),
  fill(juniorB2, "03", "technology",
    { subskill: "WORD_FORMATION", construct: "Derive a noun for the ability to use a service", evidence: "Selects the abstract noun when the context describes removing barriers." },
    "Change the word in capital letters to complete the sentence.", "Giving the videos captions improved their ___ for students watching without sound. (ACCESS)", ["accessibility"], "accessible"),
  fill(juniorB2, "04", "media",
    { subskill: "WORD_FORMATION", construct: "Derive the noun for a difference of opinion", evidence: "Uses the negative noun form in a context where two people prefer different outcomes." },
    "Change the word in capital letters to complete the sentence.", "There was a ___ about the headline: one editor wanted a question and the other wanted a statement. (AGREE)", ["disagreement"], "agreement"),
  fill(juniorB2, "05", "environment",
    { subskill: "WORD_FORMATION", construct: "Derive the noun that marks doubt about an outcome", evidence: "Recognises that the described outcome is unresolved and selects the negative abstract form." },
    "Change the word in capital letters to complete the sentence.", "The club cannot plan the outdoor display until there is less ___ about the weather. (CERTAIN)", ["uncertainty"], "certainty"),
  fill(juniorB2, "06", "culture",
    { subskill: "WORD_FORMATION", construct: "Derive the adjective describing something with deceptive implications", evidence: "Builds the adjective that fits a headline presenting an inaccurate impression." },
    "Change the word in capital letters to complete the sentence.", "Calling the exhibition ‘Free’ was ___ because visitors still had to pay to enter the building. (MISLEAD)", ["misleading"], "misled"),
];
