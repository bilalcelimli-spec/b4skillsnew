import { question, recording, type AcademiaRecording } from "./academia-listening-item.js";

export const c2Recordings: AcademiaRecording[] = [
  recording("C2", "lecture", "science", "Why prefer the simpler theory?", [],
    `Scientists, when two theories fit the data equally well, will almost invariably plump for the simpler. Ask them why, and you tend to get one of two answers, neither of which, I'm going to suggest, survives much scrutiny.
The first is that nature itself is simple, so the simpler theory is likelier to be true. It's a stirring thought. It is also, when you look at the record, a hostage to fortune. The orbits turned out to be ellipses, not circles; the atom turned out not to be indivisible; heredity turned out to be an administrative nightmare. If nature has a taste for simplicity she has concealed it well.
The second answer is more modest: simpler theories have done better in the past, so we should back them in future. But notice what has been smuggled in. To say that a rule which worked before will work again is itself to prefer the simplest reading of history. We have justified simplicity by appeal to simplicity, and I trust you can hear the floor giving way.
Where does that leave us? Some of my colleagues conclude that the preference is mere prejudice, an aesthetic habit dressed up as method. I think that throws away too much. A simpler theory sticks its neck out further. It forbids more, so it is easier to catch in error, and a science that wants to find its mistakes quickly has every reason to test such theories first. That is a claim about where to look, mind you, and not about what we shall find. I can recommend simplicity to you as a policy for the working week without pretending that the universe has signed up to it.`,
    [
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Identifies the grounds on which a lecturer finally endorses a practice after dismantling the usual defences of it.",
        "On what grounds does the lecturer finally defend the preference for simpler theories?", 2, [
          ["Simpler theories are easier for scientists to work with day to day", "'A policy for the working week' is about which theories to test first, not about convenience."],
          ["Simplicity is a matter of taste that scientists need not justify", "Colleagues who call it an aesthetic habit are said to throw away too much."],
          ["Simpler theories expose themselves more readily to being refuted", "A simpler theory forbids more and is easier to catch in error, so it is worth testing first."],
          ["Nature has repeatedly rewarded those who assumed it was orderly", "The lecturer says that if nature has a taste for simplicity she has concealed it well."],
        ]),
      question("ARGUMENT_DEVELOPMENT", "SYNTHESIS_OR_EVALUATION", "Identifies the logical flaw a speaker attributes to an argument.",
        "What fault does the lecturer find with the argument from the past success of simple theories?", 0, [
          ["It assumes the very principle it sets out to support", "Expecting a rule that worked before to work again is itself a preference for the simplest reading of history."],
          ["It overlooks the cases in which nature proved complicated", "Those cases are used against the first answer, that nature itself is simple."],
          ["It confuses what scientists find beautiful with what they can test", "Aesthetic habit is the view of some colleagues, not the flaw identified here."],
          ["It draws on too short a period of scientific history", "The length of the record is not questioned."],
        ]),
    ]),

  recording("C2", "discussion", "culture", "Teaching novels in translation", ["Dr Hale", "Dr Moreau"],
    `Dr Hale: I gather, Dr Moreau, that you voted against the new course on the European novel. I confess I was taken aback. I'd have thought you of all people would welcome students reading beyond English.
Dr Moreau: I'd welcome it tomorrow, Dr Hale, if they were reading. What's proposed is that they study eight novels, not one of them in the language it was written in, and write about style. About the texture of the prose. You can discuss a plot in translation, or an idea. You cannot, with a straight face, praise an author's rhythm when the rhythm is the translator's.
Dr Hale: But surely that proves too much. On that reasoning hardly anyone has read the Russians. Are we to say that the reading public has been deluded for a century?
Dr Moreau: Not deluded. Reading something else, and something well worth reading. My objection isn't to translation. It's to pretending it's transparent. If the course said, here is a novel as rendered by this translator in this decade, and set two versions side by side, I'd teach on it myself.
Dr Hale: Which would halve the number of novels.
Dr Moreau: It would, and I can see that's what troubles you. You want breadth.
Dr Hale: I want eighteen-year-olds to discover that the novel wasn't invented in England, yes. And I worry that your version becomes a seminar on translation theory, attended by six people.
Dr Moreau: That's a risk, I grant. Though I'd sooner six who know what they're holding than sixty who don't.
Dr Hale: I'd put the numbers less starkly. But I'll concede the essay question is indefensible as drafted. If the assessment asked about structure and ideas, would you withdraw the objection?
Dr Moreau: To the assessment, gladly. The reading list we can argue about over lunch.`,
    [
      question("DISTINGUISHING_VIEWPOINTS", "WRITER_STANCE_OR_IMPLICATION", "Pins down the precise target of an objection that could be mistaken for a broader one.",
        "What exactly does Dr Moreau object to in the proposed course?", 3, [
          ["Students would be reading novels that are too remote from their experience", "Remoteness is not raised; she would welcome students reading beyond English."],
          ["Students would cover so many novels that few are read properly", "Breadth is Dr Hale's aim; her complaint is about what students are asked to judge."],
          ["Students would be introduced to translation theory too early", "A translation seminar is Dr Hale's worry about her alternative."],
          ["Students would be judging qualities that belong to the translator", "She says you cannot praise an author's rhythm when the rhythm is the translator's, and objects to treating translation as transparent."],
        ]),
      question("AGREEMENT_DISAGREEMENT", "SYNTHESIS_OR_EVALUATION", "Separates what has been settled between two speakers from what remains open.",
        "What has been settled between the two speakers by the end?", 1, [
          ["The course will set two versions of each novel side by side", "Dr Moreau proposes this; Dr Hale objects that it would halve the number of novels."],
          ["The essay task should no longer ask about prose style", "Dr Hale concedes the question is indefensible and offers structure and ideas; Dr Moreau gladly withdraws her objection to the assessment."],
          ["The number of novels on the list should be reduced", "The reading list is left to be argued about over lunch."],
          ["A small, well-informed class is better than a large one", "Dr Hale says he would put the numbers less starkly."],
        ]),
    ]),

  recording("C2", "lecture", "society", "Did early industry make workers better off?", [],
    `For the better part of a century, historians have quarrelled over whether the first two generations of industrial workers in Britain were better or worse off than their grandparents. You'd imagine that was a question of fact, to be settled by counting, and a great deal of counting has been done. It hasn't settled anything, and I want to show you why.
Take wages. One widely used reconstruction suggests that real wages, what a week's pay would actually buy, were flat until about eighteen twenty and rose fairly steadily afterwards. On that evidence the optimists have it, if belatedly.
Now take height. Army and prison records give us the stature of tens of thousands of young men, and average height is a sensitive measure of how well children were fed and how often they were ill. Those born in the eighteen thirties and forties were shorter than those born fifty years earlier. Shorter, in a period when wages were going up.
You'll be tempted to ask which series is right. I'd resist the temptation. Both are, as far as we can tell, sound. What they disagree about is what a standard of living is. A man might earn more and spend it in a town where the water made his children ill. He was richer; they were smaller.
So the dispute persists, I think, less because the evidence is poor than because the two camps have never been measuring the same thing, and each has tended to treat its own yardstick as the obvious one. When you write on this, I shall be far more impressed by an essay that says what it means by better off than by one that announces who won.`,
    [
      question("SYNTHESISING_INFORMATION", "SYNTHESIS_OR_EVALUATION", "Integrates two conflicting bodies of evidence into the explanation the speaker offers for a long dispute.",
        "According to the lecturer, why has the debate about workers' living standards never been resolved?", 1, [
          ["The surviving records of wages and of height are too incomplete to trust", "The lecturer says both series are, as far as we can tell, sound."],
          ["The two sides have been using different ideas of what living well means", "The camps have never been measuring the same thing, and each treats its own yardstick as the obvious one."],
          ["Historians have paid too little attention to the decades after 1820", "Both series cover that period; neglect of it is not suggested."],
          ["Wages are a better guide for adults, and height a better guide for children", "The contrast between the richer man and his smaller children illustrates the point; it is not offered as the reason the dispute lasts."],
        ]),
      question("ARGUMENT_DEVELOPMENT", "INFERENCE", "Identifies the role a second body of evidence plays in an argument.",
        "Why does the lecturer bring in the evidence on height?", 3, [
          ["To show that the wage figures were wrongly calculated", "The lecturer says both series are sound."],
          ["To suggest that army and prison records are unreliable", "Those records are the source of the height evidence, which the lecturer trusts."],
          ["To argue that diet mattered more to workers than pay", "The lecturer does not rank one above the other."],
          ["To set a second sound measure against the wage picture", "Height fell while wages rose, and both series are treated as sound."],
        ]),
    ]),

  recording("C2", "conversation", "education", "Answering a hostile reviewer", ["Kwame", "Professor Lindgren"],
    `Kwame: I've drafted the reply to the second reviewer, Professor Lindgren, and I'd be glad if you'd look at it before it goes. I'm afraid it runs to four pages.
Professor Lindgren: Four pages, Kwame, in answer to a report of one paragraph. Let me guess. You've rebutted every sentence.
Kwame: Well, every sentence was wrong. He says the sample is unrepresentative, the method is dated, and the literature review ignores his own work, which, incidentally, appeared after we submitted.
Professor Lindgren: Oh, I don't doubt he's being unreasonable. The question is who you're writing for. Not him. He won't change his mind. You're writing for the editor, who has perhaps ten minutes and wants to know one thing: can she accept this paper without looking foolish?
Kwame: So I should be briefer.
Professor Lindgren: Briefer, yes, but that's the lesser point. Give him the literature. Cite his paper, say it's a valuable recent contribution, add two sentences. It costs you nothing and it lets the editor tell him he's been heard.
Kwame: Even though the criticism was unfair?
Professor Lindgren: Especially then. You'll want your credit for the point that matters, which is the sample. There you don't give an inch, and you don't argue either. You put the comparison with the national figures in a table, you say the reviewer's concern prompted you to add it, and you let the table do the talking.
Kwame: That makes it sound as though he improved the paper.
Professor Lindgren: Which is exactly how he'll want it to sound, and the editor too. You may find it galling. I did, for about my first ten years. Then I noticed that the papers got published.`,
    [
      question("INFERRED_INTENTION", "INFERENCE", "Infers the strategic reasoning behind advice that appears to reward an unfair criticism.",
        "Why does Professor Lindgren advise Kwame to cite the reviewer's paper?", 0, [
          ["Yielding on a minor matter strengthens his hand on the major one", "It costs nothing, lets the editor say the reviewer was heard, and earns credit for the point that matters, the sample."],
          ["The reviewer's paper has made the literature review out of date", "The paper appeared after submission; she does not say the review is now inadequate."],
          ["It may persuade the reviewer to reconsider his other criticisms", "She says the reviewer will not change his mind."],
          ["The editor is known to admire the reviewer's recent work", "Nothing is said about the editor's opinion of the reviewer's work."],
        ]),
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Reads a speaker's attitude to a professional convention from an ironic closing remark.",
        "What attitude does Professor Lindgren express towards letting the reviewer appear to have improved the paper?", 2, [
          ["She regards it as a courtesy that reviewers have generally earned", "She agrees this reviewer is being unreasonable."],
          ["She thinks it dishonest but too common to be worth resisting", "She does not call it dishonest."],
          ["She once resented it and has come to accept it because it works", "She found it galling for about ten years, then noticed that the papers got published."],
          ["She finds it amusing that editors are taken in by it", "She presents the editor as wanting it to sound that way, not as being deceived."],
        ]),
    ]),

  recording("C2", "discussion", "media", "Who pays for open access?", ["Soren", "Zara"],
    `Soren: You've gone very quiet on open access, Zara. Two years ago you'd have signed anything that said research paid for by the public should be free for the public to read.
Zara: I'd still sign that sentence, Soren. It's the small print I've gone off. Somebody has to pay for a journal, and if it isn't the reader it's the author. Three thousand to publish a single article, in some of the journals I'd want to be in.
Soren: Which your grant covers.
Zara: Which my grant covers, because I'm at a wealthy institution in a wealthy country. My co-author in Nairobi has no such line in her budget. Under the old arrangement she couldn't afford to read the journals. Under the new one she can read them all and can't afford to appear in them. I'm not sure that's the liberation we advertised.
Soren: There are fee waivers.
Zara: There are, and have you seen what applying for one involves? You declare, in effect, that you're too poor to pay, and an administrator decides whether she believes you. People would sooner send the paper somewhere obscure.
Soren: I take the point about dignity. But you're comparing the new system at its worst with the old one at its best. The old one locked out every nurse, every teacher, every small firm, as well as most of the world's universities.
Zara: I don't dispute a word of that. I'm not asking for the old system back.
Soren: Then what are you asking for?
Zara: That we stop calling it solved. There are journals funded directly by libraries and societies, with nobody charged at either end. They're few, and they're unglamorous, and nobody's career is made in them. I'd like my next paper to go to one. Whether I'll have the nerve, with a promotion case pending, is another matter.`,
    [
      question("ARGUMENT_DEVELOPMENT", "SYNTHESIS_OR_EVALUATION", "Identifies the central claim that a speaker's example is designed to support.",
        "What is Zara's central criticism of the author-pays model of open access?", 2, [
          ["It has made journals more expensive for universities to run", "The cost of running journals to universities is not discussed."],
          ["It has lowered the standard of the articles that are published", "Quality is not mentioned."],
          ["It has shifted the barrier from reading research to publishing it", "Her co-author can now read every journal and cannot afford to appear in them."],
          ["It has left nurses, teachers and small firms unable to read research", "This is Soren's description of the old system, which she does not dispute."],
        ]),
      question("IMPLICATION", "WRITER_STANCE_OR_IMPLICATION", "Infers from a self-deprecating remark the gap a speaker sees between her principles and her likely conduct.",
        "What does Zara imply in her final remark?", 0, [
          ["Her own career interests may stop her acting on her view", "She would like to publish in a journal that charges nobody but doubts she will have the nerve with a promotion case pending."],
          ["Journals funded by libraries may struggle to survive", "She says they are few and unglamorous, not that they are at risk."],
          ["Her promotion depends on work with her co-author in Nairobi", "The promotion case is not linked to the co-author."],
          ["Soren has persuaded her that the problem is less serious than she thought", "She accepts his description of the old system but still asks that the matter not be called solved."],
        ]),
    ]),

  recording("C2", "lecture", "science", "The brain is not a telephone exchange", [],
    `Every age, it seems, explains the brain by pointing at its cleverest machine. In the seventeenth century that meant hydraulics: the nerves were pipes, and animal spirits flowed through them under pressure, as water did through the fountains of a royal garden. By the nineteen twenties the brain had become a telephone exchange, with operators connecting incoming calls to outgoing lines. And since about nineteen fifty it has, of course, been a computer.
It would be easy to get a cheap laugh here at the expense of the pipes, and I'd ask you not to join in. The hydraulic picture was not stupid. It led people to look for something travelling along the nerve, and something does. The telephone exchange led them to the junctions between cells, which is where a good deal of the interest turned out to lie. A metaphor earns its keep by telling you where to dig.
The cost is paid elsewhere, in what the metaphor makes it hard to see. Nobody thinking in pipes went looking for electricity. And nobody thinking in terms of a computer, with its tidy division between the machine and the program, is naturally led to ask what difference it makes that this particular device is alive, that it is bathed in hormones, that it was built by growth and not by assembly.
I'm not, let me be clear, announcing that the computer metaphor is finished. I use it daily. I am suggesting that we hold it as our predecessors ought to have held theirs: as a tool with a known blind side. If history is any guide, the questions our successors find it astonishing we never asked are sitting just there.`,
    [
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Characterises a lecturer's attitude to a currently dominant model.",
        "What is the lecturer's attitude to describing the brain as a computer?", 3, [
          ["It is losing its usefulness as the field moves on", "The lecturer says the metaphor is not finished and uses it daily."],
          ["It is more accurate than the models that came before it", "The lecturer does not rank it above the earlier pictures."],
          ["It may prove as mistaken as the picture of pipes", "The lecturer says the hydraulic picture was not stupid and that metaphors earn their keep."],
          ["It is productive, provided its limitations are kept in view", "The lecturer wants it held as a tool with a known blind side."],
        ]),
      question("ARGUMENT_DEVELOPMENT", "INFERENCE", "Explains the role an earlier example plays in a later claim.",
        "Why does the lecturer point out that nobody thinking in pipes went looking for electricity?", 1, [
          ["To show that seventeenth-century science lacked the necessary instruments", "Instruments are not mentioned."],
          ["To illustrate how a model can hide what it does not suggest", "It is the example of the cost a metaphor carries: what it makes hard to see."],
          ["To explain why the telephone exchange model replaced the earlier one", "The change of model is described, not explained by this remark."],
          ["To argue that the hydraulic picture produced little of value", "The lecturer says it led people to look for something travelling along the nerve."],
        ]),
    ]),

  recording("C2", "lecture", "society", "A word that began as a warning", [],
    `I'd like to begin with a small piece of intellectual history, because it bears on how you use a word that will turn up in nearly every essay you write for me this term.
The word is meritocracy. It was put into circulation in the late nineteen fifties by a British sociologist, in a book that takes the form of a report written in the year twenty thirty-four. The narrator, a loyal official, describes with satisfaction a society in which position is allotted strictly by measured intelligence and effort. Inherited privilege has gone. So, as it turns out, has any sympathy for those at the bottom. Under the old order a labourer could tell himself that he had never had a chance. Under the new one he has been tested, repeatedly and fairly, and found wanting, and so has everyone he knows. The book ends with the narrator's death in a riot he did not see coming.
It was, in other words, a warning. The author's fear was not that selection by merit would fail but that it would work, and that winners who believed they owed their place to nothing but their own deserving would be harder to live under than an aristocracy that privately knew it had been lucky.
Within a generation the word had shed all of that. Politicians of every party took it up as a straightforward term of praise, to the author's public dismay.
Now, I'm not asking you to share his pessimism. There are serious arguments on the other side and we shall read them. I am asking that when you write that a society is, or should be, meritocratic, you remember that the man who gave you the word thought he was describing a nightmare, and that you tell me whether you think he was wrong.`,
    [
      question("IMPLICATION", "INFERENCE", "Infers the specific fear an author's fiction was meant to convey.",
        "According to the lecturer, what did the author of the word fear about a society ordered by merit?", 0, [
          ["Those who succeeded would feel no obligation to those who had not", "Winners who believed they owed their place to their own deserving would be harder to live under, and sympathy for those at the bottom had gone."],
          ["Tests of intelligence and effort would turn out to be unfair", "The labourer is tested repeatedly and fairly; the fear was that selection would work."],
          ["Inherited privilege would return under another name", "In the book inherited privilege has gone."],
          ["Politicians would adopt the idea without understanding it", "That is what later happened to the word, to his dismay; it is not the fear the book expresses."],
        ]),
      question("INFERRED_INTENTION", "WRITER_STANCE_OR_IMPLICATION", "Identifies what a lecturer does and does not require of students' use of a contested term.",
        "What is the lecturer asking of students when they use the word in their essays?", 2, [
          ["To avoid the word because its meaning has been corrupted", "The lecturer expects the word to appear and does not ask students to avoid it."],
          ["To adopt the author's view that such a society is to be feared", "The lecturer says, 'I'm not asking you to share his pessimism.'"],
          ["To take a considered position on the author's original warning", "Students are to remember he thought it a nightmare and say whether they think he was wrong."],
          ["To use the word in the approving sense that is now standard", "The lecturer wants the original critical sense kept in mind."],
        ]),
    ]),

  recording("C2", "discussion", "culture", "What if? History and the counterfactual", ["Rafael", "Professor Aziz"],
    `Rafael: Professor Aziz, your new book spends a chapter defending counterfactual history, the history of what didn't happen. A good many of your colleagues regard that as a parlour game. What do you say to them?
Professor Aziz: That they play it every working day, Rafael, and would be out of a job if they stopped. The moment a historian writes that a harvest failure caused a revolt, she is claiming that without the failure there would have been no revolt, or a later one, or a smaller one. That is a statement about a world that never existed. You can't have causes without it.
Rafael: So the objection is simply confused?
Professor Aziz: Not entirely, and I'd hate to be thought to be defending the shelf of paperbacks in which the other side wins some famous battle and three hundred years of consequences are spun out of it. My complaint about those isn't that they're speculative. It's that they're speculative about the wrong things. They change one event and then narrate, with enormous confidence, a chain of twenty further events, each of which depended on a thousand accidents of its own.
Rafael: Where would you draw the line?
Professor Aziz: Close to the ground. I'm happy to ask what options a minister actually had on his desk on a given morning, because we often have the memoranda, and we can see which he nearly chose. That disciplines the imagination. One step from what happened, with documents for the step. Beyond that I think we are writing fiction, and should say so.
Rafael: Some would call that a rather timid sort of counterfactual.
Professor Aziz: They would, and I'd accept the adjective. Timidity seems to me the appropriate posture when describing events that have the considerable disadvantage of not having occurred.`,
    [
      question("ARGUMENT_DEVELOPMENT", "SYNTHESIS_OR_EVALUATION", "Reconstructs the argument a speaker uses to show that critics rely on what they reject.",
        "How does Professor Aziz answer colleagues who dismiss counterfactual history?", 3, [
          ["By pointing to the documents that record what ministers nearly decided", "Documents are what she uses to discipline her own counterfactuals, not her answer to the critics."],
          ["By distinguishing serious studies from popular paperbacks", "She makes this distinction afterwards, when asked whether the objection is simply confused."],
          ["By conceding that it is a game, though a useful one", "She does not accept that it is a game."],
          ["By arguing that any claim about causes already contains one", "To say a harvest failure caused a revolt is to claim what would have happened without it."],
        ]),
      question("DISTINGUISHING_VIEWPOINTS", "WRITER_STANCE_OR_IMPLICATION", "Identifies the precise fault a speaker finds in a genre she declines to defend.",
        "What does Professor Aziz find wrong with popular 'what if' histories?", 1, [
          ["They speculate, where a historian ought to keep to the evidence", "She says her complaint is not that they are speculative."],
          ["They follow consequences much further than can be justified", "They change one event and narrate twenty more with enormous confidence, each dependent on a thousand accidents."],
          ["They choose battles when they should look at political decisions", "She objects to the length of the chain, not to battles as a subject."],
          ["They are too cautious about how different things might have been", "Caution is what she claims for her own approach."],
        ]),
    ]),

  recording("C2", "conversation", "science", "Neither one discipline nor the other", ["Oskar", "Mei"],
    `Oskar: You've heard back from the funding council, Mei. I can tell from your face it wasn't a yes.
Mei: It wasn't a yes, Oskar. And what's maddening is that both referees liked it. The historian called the archival work exemplary. The statistician said the modelling was sound and, I quote, refreshingly cautious.
Oskar: Then how on earth did it fail?
Mei: Read the next line of each. The historian says the quantitative half is outside her competence to judge, and she can't say whether it adds anything. The statistician says the same about the archives, more or less word for word. So each has given me top marks for half a project and an abstention on the rest. Average that, and you're below the line.
Oskar: That's not a judgement on the work. That's an artefact of how the panel's put together.
Mei: Which is what I said to the programme officer, a little more forcefully than was wise. She was perfectly civil. She pointed out that there is a separate scheme for interdisciplinary proposals.
Oskar: Well, there you are, then.
Mei: With a third of the budget and a success rate of six per cent. It's where awkward applications are sent to die quietly.
Oskar: So what will you do? Split it in two?
Mei: That was my first thought, and I've gone off it. Each half on its own is perfectly respectable and perfectly dull. The only new thing I have to say comes from putting them together. No. I'm going to resubmit to the main panel and ask, in the covering letter, for a referee who works across both. There are perhaps four people in the country who qualify, and two of them dislike me. I like those odds better than six per cent.`,
    [
      question("SYNTHESISING_INFORMATION", "SYNTHESIS_OR_EVALUATION", "Combines the two referees' reports to explain an outcome neither report states.",
        "Why was Mei's application unsuccessful?", 1, [
          ["Each referee found weaknesses in the half closest to their own field", "Each referee praised the half in their own field."],
          ["Neither referee felt able to assess the proposal as a whole", "Each gave top marks for half and abstained on the rest, which pulled the average below the line."],
          ["The two referees disagreed about the value of the modelling", "The statistician praised the modelling; the historian declined to judge it."],
          ["The panel judged it better suited to the interdisciplinary scheme", "The programme officer mentioned that scheme afterwards; it is not given as the reason for failure."],
        ]),
      question("INFERRED_INTENTION", "INFERENCE", "Infers the reasoning behind a decision from the alternatives a speaker rejects.",
        "Why does Mei decide against dividing the project into two applications?", 3, [
          ["Two applications would have to compete for a smaller budget", "The smaller budget belongs to the interdisciplinary scheme."],
          ["The programme officer advised her to keep it as one", "The officer pointed her to a separate scheme and gave no such advice."],
          ["She could not find suitable referees for either half", "Suitable referees for each half exist; it is a referee across both who is rare."],
          ["Its original contribution lies in combining the two halves", "Each half alone is respectable and dull; the only new thing comes from putting them together."],
        ]),
    ]),

  recording("C2", "lecture", "communication", "When a language falls silent", [],
    `When the last fluent speaker of a language dies, the newspapers reach for the same image. A library has burned down. I understand why; it conveys scale, and it's true as far as it goes. A language holds a body of knowledge about plants, weather, kinship and much else that is not written anywhere. But I've come to think the image misleads more than it helps, and in two ways.
First, a library burns by accident or by malice. Languages, for the most part, are not destroyed. They are set down. Parents who were beaten at school for speaking their mother tongue decide, out of love, that their children will not be put through the same. To describe that as a fire is to erase the people who made the decision and the pressure under which they made it. If we want to understand why languages are lost, we should be studying schools and labour markets, not mourning.
Second, the image tells us what to do, and what it tells us is wrong, or at least badly incomplete. If the loss is a loss of contents, the remedy is to copy the contents: record the elders, compile the dictionary, deposit it in an archive. That work is valuable and I've spent years of my life on it. But ask the communities themselves what they want and it's seldom an archive. They want their grandchildren to be able to joke in the language. A dictionary doesn't do that. A nursery school might.
I'd add, with some discomfort, that the archive is what my own profession is rewarded for producing. It is as well to be suspicious of a metaphor that points so reliably towards one's own interests.`,
    [
      question("ARGUMENT_DEVELOPMENT", "SYNTHESIS_OR_EVALUATION", "Identifies one of two distinct objections a lecturer raises against a familiar image.",
        "What is the lecturer's first objection to comparing a dying language to a burning library?", 2, [
          ["It exaggerates how much knowledge a language contains", "The lecturer accepts that a language holds a body of unwritten knowledge."],
          ["It suggests that recording a language is a waste of effort", "The image points towards recording; the lecturer calls that work valuable."],
          ["It hides the choices speakers made, and why they made them", "Languages are set down by parents under pressure; calling it a fire erases those people and that pressure."],
          ["It blames schools for something that parents decided", "The lecturer wants schools and labour markets studied as the source of the pressure."],
        ]),
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Reads a self-critical stance from a lecturer's closing comment about her own field.",
        "What does the lecturer suggest in the closing remarks about researchers who record languages?", 0, [
          ["They have a professional stake in the image they favour", "The archive is what the profession is rewarded for producing, so a metaphor that points there deserves suspicion."],
          ["They have ignored what communities have asked them to do", "She reports what communities want but does not accuse linguists of ignoring requests."],
          ["They are better placed than communities to save a language", "She suggests the reverse emphasis: a nursery school may do what a dictionary cannot."],
          ["They should give up recording in favour of teaching children", "She calls recording valuable and the remedy incomplete, not mistaken."],
        ]),
    ]),
];
