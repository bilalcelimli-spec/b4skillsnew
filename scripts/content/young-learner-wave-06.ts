import { choiceKey, item, type Choices, type Specification, type WaveItem } from "./young-learner-item.js";

type Cell = Readonly<Pick<Specification, "productLine" | "level">>;
type Focus = Pick<Specification, "subskill" | "construct" | "evidence">;
const preA1 = { productLine: "primary", level: "PRE_A1" } as const;
const a1 = { productLine: "primary", level: "A1" } as const;
const b1 = { productLine: "junior", level: "B1" } as const;
const b2 = { productLine: "junior", level: "B2" } as const;

function select(
  cell: Cell, number: string, topic: string, focus: Focus, prompt: string, key: number, choices: Choices,
): WaveItem {
  return item({ ...cell, ...focus, wave: "06", number, topic, genre: "multiple_choice_context" },
    "GRAMMAR", "MULTIPLE_CHOICE", "Grammatical accuracy", { prompt, ...choiceKey(key, choices) });
}

function fill(
  cell: Cell, number: string, topic: string, focus: Focus, prompt: string, scaffold: string,
  answers: string[], rejectedAnswer: string,
): WaveItem {
  const draft = item({ ...cell, ...focus, wave: "06", number, topic, genre: "gap_fill" },
    "GRAMMAR", "FILL_IN_BLANKS", "Grammatical accuracy", {
      prompt, scaffold, blanks: [{ acceptableAnswers: answers }],
    });
  return { ...draft, rejectedAnswer };
}

export const waveItems: WaveItem[] = [
  select(preA1, "01", "personal_life",
    { subskill: "DETERMINERS", construct: "Choose a possessive determiner for a first-person speaker", evidence: "Uses the speaker's relationship to the object to select my." },
    "I have a yellow cup. This is ___ cup.", 1, [
      ["your", "The speaker says they have the cup."], ["my", "My refers to the speaker's own cup."],
      ["his", "His refers to another person."], ["their", "Their refers to someone other than the speaker."],
    ]),
  select(preA1, "02", "education",
    { subskill: "AGREEMENT", construct: "Recognise a pronoun for two familiar objects", evidence: "Uses the plural subject pronoun to refer back to both objects." },
    "Here are two pencils. ___ are in the box.", 3, [
      ["It", "It refers to one object."], ["We", "We includes the speaker and does not refer to the pencils."],
      ["She", "She does not refer to the two objects."], ["They", "They refers to both pencils."],
    ]),
  select(preA1, "03", "personal_life",
    { subskill: "DETERMINERS", construct: "Choose the article before a common vowel-initial noun", evidence: "Recognises the singular indefinite article before the vowel sound in egg." },
    "I have ___ in my lunch box. There is only one egg.", 0, [
      ["an egg", "An comes before the vowel sound in egg."], ["a egg", "A is used before a consonant sound."],
      ["some eggs", "Eggs is plural, but there is only one."], ["two eggs", "Two eggs conflicts with the stated number."],
    ]),
  select(preA1, "04", "leisure",
    { subskill: "MODALITY", construct: "Choose the form after the ability modal can", evidence: "Supplies the base verb after can." },
    "In the pool, I can ___ without help.", 2, [
      ["swims", "The modal takes the base form."], ["swimming", "The -ing form cannot directly follow can."],
      ["swim", "Can is followed by the base form swim."], ["swam", "The past form does not follow can."],
    ]),
  fill(preA1, "05", "personal_life",
    { subskill: "AGREEMENT", construct: "Supply singular present be", evidence: "Writes is with a third-person singular subject." },
    "Use the correct form of ‘be’.", "My coat ___ green.", ["is"], "are"),
  fill(preA1, "06", "leisure",
    { subskill: "AGREEMENT", construct: "Supply plural present be", evidence: "Writes are after a simple plural subject." },
    "Use the correct form of ‘be’.", "The games ___ on the table.", ["are"], "is"),
  fill(preA1, "07", "education",
    { subskill: "QUANTIFICATION", construct: "Supply a regular plural noun", evidence: "Uses the plural of a familiar noun after two." },
    "Use the correct form of ‘book’.", "I have two ___ in my bag.", ["books"], "book"),
  fill(preA1, "08", "personal_life",
    { subskill: "AGREEMENT", construct: "Supply the present form of be after I", evidence: "Writes am with the first-person singular subject." },
    "Use the correct form of ‘be’.", "I ___ happy today.", ["am"], "is"),

  select(a1, "01", "leisure",
    { subskill: "TENSE_ASPECT", construct: "Select a regular past form after a completed time reference", evidence: "Uses the simple past in a finished yesterday event." },
    "Yesterday after lunch, we ___ in the park for an hour.", 2, [
      ["play", "The unmarked present form does not fit the completed time."], ["are playing", "The activity happened yesterday."],
      ["played", "Played marks the finished past activity."], ["will play", "Will play refers to a future activity."],
    ]),
  select(a1, "02", "education",
    { subskill: "DETERMINERS", construct: "Choose the object pronoun for two people", evidence: "Selects them as the object in a request concerning two classmates." },
    "Eli and Noor are at the door. Can you help ___ with the boxes?", 3, [
      ["they", "They is used as a subject."], ["their", "Their is a possessive determiner and needs a noun."],
      ["him", "Him refers to one person."], ["them", "Them is the object pronoun for the two classmates."],
    ]),
  select(a1, "03", "personal_life",
    { subskill: "QUANTIFICATION", construct: "Choose a question phrase for an amount of liquid", evidence: "Combines how much with an uncountable noun." },
    "___ juice do we need for one glass?", 0, [
      ["How much", "How much asks about an amount of uncountable juice."], ["How many", "How many needs a countable plural noun."],
      ["How often", "How often asks about frequency."], ["How long", "How long asks about length or duration."],
    ]),
  select(a1, "04", "education",
    { subskill: "TENSE_ASPECT", construct: "Distinguish an action in progress from a usual activity", evidence: "Uses the present continuous for what a classmate is doing at the moment." },
    "Look through the window. Our teacher ___ a sign on the door right now.", 1, [
      ["puts", "The simple present normally describes a routine in this context."], ["is putting", "Is putting describes the action happening now."],
      ["put", "The past form conflicts with the present observation."], ["will put", "The action is visible now and is not merely planned."],
    ]),
  fill(a1, "05", "personal_life",
    { subskill: "TENSE_ASPECT", construct: "Produce the irregular past form of get", evidence: "Writes a simple past form for a completed event." },
    "Use the past form of ‘get’.", "I ___ a new pair of socks yesterday.", ["got"], "get"),
  fill(a1, "06", "education",
    { subskill: "AGREEMENT", construct: "Use a third-person singular present ending", evidence: "Adds the required agreement ending to a familiar verb." },
    "Use the correct present form of ‘open’.", "The school office usually ___ at eight.", ["opens"], "open"),
  fill(a1, "07", "leisure",
    { subskill: "TENSE_ASPECT", construct: "Use a past negative with the base verb", evidence: "Produces the past auxiliary and retains the base form of the supplied verb." },
    "Use ‘watch’ in the negative past.", "We ___ the game yesterday.", ["did not watch", "didn't watch", "didn’t watch"], "didn't watched"),
  fill(a1, "08", "personal_life",
    { subskill: "COMPARISON", construct: "Supply a regular comparative adjective", evidence: "Builds the -er form for a comparison with than." },
    "Use the correct form of ‘short’.", "This scarf is ___ than your scarf.", ["shorter"], "shortest"),

  select(b1, "01", "technology",
    { subskill: "TENSE_ASPECT", construct: "Distinguish background action from a sudden interruption", evidence: "Uses past continuous to present the activity interrupted by an event." },
    "We ___ the sound for our film when the power suddenly went off.", 3, [
      ["will record", "The power cut places the action in the past."], ["have recorded", "The finished past event does not support this present-perfect form."],
      ["record", "The sentence is about one past occasion."], ["were recording", "The ongoing recording is the background to the past interruption."],
    ]),
  select(b1, "02", "education",
    { subskill: "SUBORDINATION", construct: "Select a conjunction that marks concession", evidence: "Links an obstacle with the decision taken despite it." },
    "The group expected the difficult instructions to slow them down. ___ the instructions were difficult, they finished the model on time.", 1, [
      ["Because", "The difficulty is an obstacle here, not the stated cause of timely completion."],
      ["Although", "Although marks the contrast between difficulty and timely completion."],
      ["Unless", "Unless would introduce an exception or condition."], ["Before", "Before would express timing rather than this intended contrast."],
    ]),
  select(b1, "03", "culture",
    { subskill: "REPORTED_LANGUAGE", construct: "Recognise the grammar of an embedded wh-question", evidence: "Uses statement order after the reporting clause while preserving the past auxiliary." },
    "At the museum, I asked the guide where ___.", 2, [
      ["was the old map", "Direct question inversion is not used inside the reported question."],
      ["did the old map was", "The did and was sequence is ungrammatical."],
      ["the old map was", "The subject comes before was in the embedded question."],
      ["the old map did be", "Did be is not the appropriate past form of be here."],
    ]),
  select(b1, "04", "leisure",
    { subskill: "MODALITY", construct: "Distinguish lack of necessity from prohibition", evidence: "Selects an expression for an optional action when the option is explicitly allowed." },
    "The club has spare rackets. You can bring yours, but you ___.", 0, [
      ["don't have to", "This means bringing your own racket is optional."],
      ["mustn't", "This contradicts the explicit permission to bring one."],
      ["can't", "This contradicts the stated ability or permission."],
      ["had to", "There is no past requirement here."],
    ]),
  fill(b1, "05", "environment",
    { subskill: "PASSIVE", construct: "Produce the simple past passive in a repair note", evidence: "Uses a plural past auxiliary and the correct past participle." },
    "Use ‘repair’ in the past simple passive.", "The wooden seats ___ by the volunteers last Saturday.", ["were repaired"], "repaired"),
  fill(b1, "06", "media",
    { subskill: "COMPLEMENTATION", construct: "Produce an -ing complement after suggest", evidence: "Supplies the gerund in a clause with an explicit object." },
    "Use the correct form of ‘record’.", "To save time, the editor suggested ___ the questions first.", ["recording"], "to record"),
  fill(b1, "07", "education",
    { subskill: "TENSE_ASPECT", construct: "Produce a present perfect form for a continuing state", evidence: "Connects a starting point in the past to the present with a plural perfect auxiliary." },
    "Use ‘know’ in the present perfect.", "We ___ each other since the first week of school.", ["have known"], "have knew"),
  fill(b1, "08", "culture",
    { subskill: "RELATIVE_CLAUSES", construct: "Supply a human defining relative pronoun", evidence: "Uses who or that to link a person to the person's role." },
    "Use a relative pronoun.", "The student ___ designed the posters will introduce the exhibition.", ["who", "that"], "which"),

  select(b2, "01", "media",
    { subskill: "MODALITY", construct: "Express a confident inference about a completed event", evidence: "Uses must have for a conclusion based on present evidence about a past action." },
    "Our recorder has been locked in the cupboard since Tuesday. This audio file was made on Wednesday. It ___ on a different device.", 2, [
      ["must record", "This is active and does not express a past deduction about the file."],
      ["could have record", "The modal perfect requires a past participle and passive marking here."],
      ["must have been recorded", "The evidence leads to a past deduction, and the file is the recipient of the action."],
      ["must have recording", "The modal perfect cannot be completed by this -ing form."],
    ]),
  select(b2, "02", "education",
    { subskill: "CONDITIONALS", construct: "Connect an unreal past decision to a present result", evidence: "Interprets the past counterfactual as explaining a present difficulty." },
    "If we had saved a second copy yesterday, we ___ the layout from scratch now.", 1, [
      ["will not be rebuilding", "A future prediction does not follow this past counterfactual."],
      ["would not be rebuilding", "This gives the unreal present result of a different past action."],
      ["had not rebuilt", "This states a past result instead of an unreal present one."],
      ["would not have rebuilt", "That form puts the result in the past, whereas now identifies the ongoing result."],
    ]),
  select(b2, "03", "culture",
    { subskill: "DISCOURSE_GRAMMAR", construct: "Choose a connector for an alternative route to the same goal", evidence: "Interprets otherwise as introducing a consequence if the preceding action is not taken." },
    "Leave a clear space beside the display. ___, visitors using the side door will have to turn back.", 3, [
      ["Likewise", "No parallel case is introduced."], ["Nevertheless", "This would make the problem continue even after space was left."],
      ["Meanwhile", "The relationship is conditional rather than merely simultaneous."],
      ["Otherwise", "It introduces what will happen if a clear space is not left."],
    ]),
  select(b2, "04", "technology",
    { subskill: "PASSIVE", construct: "Choose a perfect passive after a reporting verb", evidence: "Marks the completion of an action before a reported discovery and keeps the affected object as subject." },
    "On Friday we found all the photos in a new folder. The activity log showed that every photo ___ the night before.", 0, [
      ["had been moved", "The move happened before the Friday check, and the photos received the action."],
      ["has been moved", "This present perfect anchors the event to now rather than the finished Friday viewpoint."],
      ["had moved itself", "The folder context describes the photos being moved, not moving themselves."],
      ["was going to be moved", "This describes an intention, not a completed move before the check."],
    ]),
  fill(b2, "05", "education",
    { subskill: "TENSE_ASPECT", construct: "Use a past perfect after wish to express regret", evidence: "Expresses regret about an action that did not happen on the finished past occasion." },
    "Use ‘check’ in the past perfect.", "I wish I ___ the room number before the meeting yesterday.", ["had checked"], "have checked"),
  fill(b2, "06", "media",
    { subskill: "MODALITY", construct: "Produce a modal perfect of unnecessary completed action", evidence: "Uses need not have plus a participle to mark an action that happened but was unnecessary." },
    "Use ‘need not have’ or its contracted form with the correct form of ‘print’.", "We printed fifty copies, but everyone read the programme online. We ___ any copies at all.", ["need not have printed", "needn't have printed", "needn’t have printed"], "needn't have print"),
  fill(b2, "07", "culture",
    { subskill: "SUBORDINATION", construct: "Produce a past counterfactual after as if", evidence: "Uses a negative past perfect for behaviour that contradicts a known earlier event." },
    "Use ‘see’ in the negative past perfect.", "She had seen the exhibit the day before, but spoke as if she ___ it before.", ["had not seen", "hadn't seen", "hadn’t seen"], "has not seen"),
  fill(b2, "08", "leisure",
    { subskill: "INVERSION", construct: "Produce subject–auxiliary inversion after a fronted negative restriction", evidence: "Uses did before the subject after only then, without changing the supplied base verb." },
    "Complete the gap using ‘the team’ and the correct past form of ‘do’.", "The referee finally signalled. Only then ___ restart the game.", ["did the team"], "the team did"),
];
