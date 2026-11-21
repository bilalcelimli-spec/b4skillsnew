import { question, recording, type AcademiaRecording } from "./academia-listening-item.js";

export const c1Recordings: AcademiaRecording[] = [
  recording("C1", "lecture", "science", "What failed replications tell us", [],
    `I want to spend the rest of the hour on what has come to be called the replication crisis, because I think the phrase itself is misleading you.
The facts are not in dispute. When large teams set out to repeat a hundred well-known studies in psychology, fewer than half produced the original result. Newspapers reported this as a scandal, and a good many of my colleagues took it personally.
Now, you might expect me to defend the field by saying the repeat studies were badly done. Some people did argue that, and in a handful of cases they had a point. But on the whole the replications were larger and more carefully designed than the originals, so I don't find that defence persuasive.
What I'd question is the word crisis. A field that checks its own findings and publishes the embarrassing answers is behaving exactly as a science should. The fields that ought to worry us are the ones where nobody has looked.
So where is the real problem? Not, I think, in dishonest researchers; outright invention of data is rare. It lies in what gets rewarded. A surprising result in a small sample gets you published, and a publication gets you a job. A careful study that finds nothing gets you neither. Until appointment committees start counting something other than striking results, I'm afraid better statistics training, which is the remedy usually proposed, will treat the symptom and leave the cause alone.
I'd like you to keep that distinction in mind when you read the two papers for next week.`,
    [
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Identifies a lecturer's evaluation of an event against two reactions she rejects.",
        "How does the lecturer regard the failure of many studies to replicate?", 2, [
          ["As evidence that the repeat studies were weaker than the originals", "She says the replications were on the whole larger and more careful, and does not find this defence persuasive."],
          ["As a scandal that the field has been slow to admit", "She reports that newspapers called it a scandal, and questions that framing herself."],
          ["As a sign that the field is doing what a science ought to do", "She says a field that checks its findings and publishes embarrassing answers is behaving exactly as a science should."],
          ["As a problem confined to a handful of well-known studies", "The handful refers to cases where critics of the replications had a point."],
        ]),
      question("ARGUMENT_DEVELOPMENT", "INFERENCE", "Follows an argument to the speaker's judgement of a commonly proposed remedy.",
        "What does the lecturer suggest about better training in statistics?", 0, [
          ["It will not change what researchers are rewarded for", "She says it will treat the symptom and leave the cause, which is what gets rewarded, alone."],
          ["It would have prevented most of the failed studies", "She does not claim that training would have prevented them."],
          ["It is less urgent than detecting invented data", "She says outright invention of data is rare and not where the problem lies."],
          ["It should be required by appointment committees", "Committees are mentioned for what they count, not as a body that should require training."],
        ]),
    ]),

  recording("C1", "discussion", "education", "What university rankings measure", ["Leila", "Tobias"],
    `Leila: Tobias, you've read the chapter on league tables. I thought it was a bit one-sided, to be honest. Three pages on how rankings distort universities, and barely a line on why applicants keep using them.
Tobias: I'd have said the opposite, Leila. I thought he let them off lightly. Most of the score in the big international tables comes from research output and from reputation surveys, which are filled in by academics who've never set foot in the places they're rating.
Leila: I'm not disputing that. My point is that an eighteen-year-old choosing between forty institutions needs something. If you take the tables away, what's left is who your parents know.
Tobias: That's fair, and it's the part of your argument I can't answer. But a number that measures research and gets read as a verdict on teaching isn't neutral information. It sends people to the wrong places for the wrong reasons.
Leila: Does it, though? The chapter quoted that survey where graduates of highly ranked universities were more satisfied with their courses.
Tobias: More satisfied with the outcome. They got better jobs. Ask them about feedback and contact with staff and the pattern disappears. It was in the footnote.
Leila: I missed the footnote. All right, so the tables tell you about prestige, and prestige does get you a job. That's not nothing.
Tobias: No, it isn't. I'd just like them to be labelled honestly. Call it a reputation index and I'd have no quarrel with it.
Leila: Whereas I'd keep the name and add a teaching measure alongside. Which, I suspect, is harder than either of us is making it sound.`,
    [
      question("DISTINGUISHING_VIEWPOINTS", "WRITER_STANCE_OR_IMPLICATION", "Distinguishes one speaker's core objection from related points made in the same exchange.",
        "What is Tobias's main objection to university rankings?", 3, [
          ["They are compiled by people with little experience of research", "He says the surveys are filled in by academics, who have not visited the places they rate."],
          ["They leave applicants dependent on family connections", "Leila says this is what would remain if the tables were taken away."],
          ["They lead graduates to expect better jobs than they get", "He accepts that graduates of highly ranked universities got better jobs."],
          ["They are taken as a guide to something they do not assess", "He objects that a number measuring research gets read as a verdict on teaching."],
        ]),
      question("AGREEMENT_DISAGREEMENT", "SYNTHESIS_OR_EVALUATION", "Integrates concessions from both speakers to identify their common ground.",
        "On which point do the two speakers come to share a view?", 1, [
          ["The chapter they read was unfair to rankings", "Leila found it one-sided against rankings; Tobias thought it let them off lightly."],
          ["Rankings reflect standing that has practical value for graduates", "Leila says prestige gets you a job and that is not nothing; Tobias replies, 'No, it isn't.'"],
          ["Rankings ought to be renamed to show what they contain", "Tobias wants a new label; Leila would keep the name."],
          ["A measure of teaching could be added without much difficulty", "Leila suspects it is harder than either of them makes it sound."],
        ]),
    ]),

  recording("C1", "conversation", "education", "A thesis that keeps growing", ["Professor Kessler", "Amara"],
    `Professor Kessler: So, Amara. You sent me a new outline. Chapter four now covers three more countries.
Amara: Yes, Professor Kessler. I came across the archives in Lisbon and Vienna, and it seemed a waste to leave them out. The comparison would be so much richer.
Professor Kessler: It would. I don't doubt the material is good. May I ask how the writing of chapter two is going?
Amara: Slowly. I keep finding things I need to read first.
Professor Kessler: That's what I thought. I'm going to say something, and I'd like you to hear it as an observation, not a criticism. This is the third time the project has grown, and each time it has happened in the month a draft was due.
Amara: You think I'm avoiding the writing.
Professor Kessler: I think reading feels like progress, and writing feels like exposure. I did precisely the same in my second year, and my supervisor was a good deal less polite about it.
Amara: But if I leave those archives out, an examiner could say the study is too narrow.
Professor Kessler: An examiner can say that about any thesis ever written. What they can't forgive is a thesis that isn't there. One country, studied thoroughly, is a doctorate. Four countries in outline is a research proposal.
Amara: So you want me to drop Lisbon and Vienna.
Professor Kessler: I want you to put them in a folder marked 'first book'. And I want five thousand words of chapter two, however rough, by the end of the month. I won't comment on the style. I just want to see that it exists.
Amara: Five thousand rough words. I can do that.`,
    [
      question("INFERRED_INTENTION", "INFERENCE", "Infers the concern behind a supervisor's question and observation.",
        "What does Professor Kessler believe is the real reason the project keeps expanding?", 0, [
          ["Adding material lets Amara put off producing a draft", "He notes that each expansion came in a month a draft was due, and says reading feels like progress while writing feels like exposure."],
          ["Amara is worried that examiners will find the study too narrow", "This is the reason Amara gives; he replies that an examiner can say that about any thesis."],
          ["The new archives are too valuable to be left out", "He agrees the material is good but asks her to set it aside."],
          ["Amara has not yet read enough to begin chapter two", "She says she keeps finding things to read; he treats that as part of the pattern."],
        ]),
      question("IMPLIED_MEANING", "WRITER_STANCE_OR_IMPLICATION", "Interprets what a figurative instruction implies about the speaker's view.",
        "What does Professor Kessler imply by telling Amara to mark the folder 'first book'?", 2, [
          ["The extra archives are of doubtful value to her research", "He says he does not doubt the material is good."],
          ["She should publish the comparison before she submits", "He wants the thesis written first, starting with chapter two this month."],
          ["The extra archives are worth using once the doctorate is done", "A folder for a first book keeps the material for later instead of discarding it."],
          ["Her thesis is already long enough to become a book", "Chapter two has barely been written."],
        ]),
    ]),

  recording("C1", "lecture", "work", "Reading the minimum wage evidence", [],
    `For most of the last century, the textbook answer was simple. Set a minimum wage above the market rate and employers will hire fewer people. It follows directly from the supply and demand diagram you met in your first term.
Then, in the nineteen nineties, researchers compared fast-food restaurants on either side of a state border after one state raised its minimum and the other didn't. Employment on the side with the higher wage did not fall. That study has been repeated, criticised and refined for thirty years, and the broad picture has held: moderate increases produce little or no loss of jobs.
You may think I'm about to tell you the textbook was wrong. I'm not, quite. What the newer work shows is that employers have more ways of adjusting than the diagram allows. Some reduce hours. Some cut back on training. Quite a few simply become choosier, so the same job goes to a more experienced applicant, and the teenager with no record doesn't get a first chance. None of that shows up when you count heads.
There's a second caution, and it's the one I'd most like you to remember. Nearly all of this evidence comes from modest rises, typically ten or fifteen per cent. It tells us very little about what happens if a government doubles the minimum, and anyone who cites these studies in support of a very large increase is asking them to carry a weight they weren't built for.
So, in your essays, please don't write that economists have shown minimum wages don't cost jobs. Write what was measured, and over what range.`,
    [
      question("ARGUMENT_DEVELOPMENT", "INFERENCE", "Identifies the function of a set of examples within a qualified argument.",
        "Why does the lecturer describe employers reducing hours, cutting training and becoming choosier?", 1, [
          ["To suggest that the border study undercounted job losses", "The lecturer accepts the count of jobs; the point is what a count of jobs leaves out."],
          ["To explain how costs can arise without job numbers changing", "These adjustments do not show up when you count heads, so the textbook is not simply wrong."],
          ["To show that employers react less than the textbook predicts", "The examples show employers reacting in more ways than the diagram allows."],
          ["To explain why the textbook diagram has been set aside", "The lecturer says the textbook was not quite wrong."],
        ]),
      question("IMPLICATION", "INFERENCE", "Keeps two separate cautions apart and identifies the second.",
        "What is the lecturer's second caution about the minimum wage evidence?", 3, [
          ["It has held for a shorter time than is often claimed", "The lecturer says the broad picture has held for thirty years."],
          ["It comes largely from a single type of business", "Fast-food restaurants were the first study; the lecturer does not make this the caution."],
          ["It leaves hours and training out of the count", "This belongs to the first point, about what counting heads misses."],
          ["It says little about rises far beyond those studied", "Nearly all the evidence comes from modest rises and tells us very little about doubling the minimum."],
        ]),
    ]),

  recording("C1", "discussion", "science", "Signing your name to a review", ["Jonas", "Priya"],
    `Jonas: Priya, the journal's asked whether we'd support signed reviews. No more anonymous referees. I was going to vote yes. Were you?
Priya: A year ago I would have, Jonas, without hesitating. Anonymity lets people be lazy and occasionally vicious. I've had a report that was two lines long and plainly written by someone who hadn't got past the abstract.
Jonas: So what's changed?
Priya: I reviewed a paper from a very senior group in my own area. The central analysis didn't support the conclusion, and I said so. I'm fairly sure I wouldn't have written that report in those words if my name had been at the bottom. They'll be sitting on my next grant panel.
Jonas: Then the argument is about junior people, not about anonymity as such. You could let reviewers choose.
Priya: Which sounds fair, and I suspect makes things worse. If signing is optional, the signed reviews will be the kind ones. An unsigned report becomes a signal that the reviewer had something unpleasant to say, and then authors start guessing.
Jonas: I hadn't followed it through that far. My thinking was simpler: if I have to sign, I write a more careful review.
Priya: I believe you would. I'm less sure it holds for everyone. What I'd support is publishing the reports themselves, unsigned, next to the paper. The laziness is exposed, because anyone can see a two-line review, and nobody's career depends on having been brave.
Jonas: That's not what the journal is offering, though.
Priya: No. So on the question as asked, I'm voting no, and I'm going to write to the editor with the alternative.
Jonas: Copy me in. I think I may have just changed my vote.`,
    [
      question("INFERRED_INTENTION", "INFERENCE", "Identifies the experience that altered a speaker's position and what it showed her.",
        "Why has Priya changed her mind about signed reviews?", 2, [
          ["She received a careless report from an anonymous reviewer", "That experience is why she used to favour signing."],
          ["She realised that optional signing would be fairer to junior staff", "She thinks optional signing sounds fair and would make things worse."],
          ["She found that being unnamed allowed her to be frank about powerful colleagues", "She doubts she would have written a critical report on a senior group in those words under her own name."],
          ["She learned that the senior group had identified her as their reviewer", "Nothing suggests she was identified; her concern is what would happen if she were."],
        ]),
      question("ARGUMENT_DEVELOPMENT", "SYNTHESIS_OR_EVALUATION", "Evaluates how a proposed alternative answers the two problems raised earlier in the discussion.",
        "What does Priya's own proposal aim to achieve?", 0, [
          ["Reveal poor reviewing while keeping reviewers unidentified", "Publishing unsigned reports exposes laziness, and nobody's career depends on having been brave."],
          ["Reward reviewers who are willing to be named", "Her proposal keeps the reports unsigned."],
          ["Let authors work out who has criticised them", "She regards authors guessing as a harm of optional signing."],
          ["Give junior reviewers a choice the journal has not offered", "Choice is Jonas's suggestion, which she rejects."],
        ]),
    ]),

  recording("C1", "lecture", "culture", "Court records as evidence of ordinary lives", [],
    `Historians of the medieval village face an obvious difficulty: the people we most want to hear from left nothing in their own hand. So for two generations now we have turned to court records, and with good reason. When a peasant woman is brought before a church court and questioned about her marriage, a clerk writes down what she says. It is as close as we come to hearing her speak.
I want to complicate that for you this morning, without, I hope, taking it away.
Consider how the record was made. She spoke in her own dialect. The clerk wrote in Latin, at speed, selecting what the court needed to know. Her answers were replies to questions she had not chosen, in a room where the wrong reply might cost her dearly. What survives is not her voice. It is a legal document in which she appears.
Some of my colleagues have concluded from this that the records tell us about courts and nothing else. I think that is too pessimistic, and I'd point to what the clerks let slip. A witness explains where she was standing when she overheard a quarrel: at the well, at the oven, mending a wall with a neighbour. Nobody in the court cared about the oven. Precisely for that reason, nobody had a motive to distort it. The incidental detail, the thing mentioned on the way to something else, is where I'd place most trust.
So read these sources twice. Once for the story the court was trying to establish, which you should treat with caution, and once for everything it recorded without meaning to.`,
    [
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Places a lecturer's position between an older confidence and a sceptical reaction.",
        "What is the lecturer's position on court records as a source for ordinary people's lives?", 1, [
          ["They preserve the speech of people who could not write", "The lecturer says what survives is not her voice but a legal document in which she appears."],
          ["They are informative mainly in what they record by the way", "The lecturer places most trust in incidental detail that nobody had a motive to distort."],
          ["They reveal how courts worked and little beyond that", "The lecturer calls this conclusion of some colleagues too pessimistic."],
          ["They are reliable once the clerk's Latin is carefully translated", "Translation is one of several distortions; fixing it is not offered as a solution."],
        ]),
      question("IMPLICATION", "INFERENCE", "Infers how the making of a record limits what it can show.",
        "What does the lecturer say about the clerk's written record of the woman's answers?", 3, [
          ["It was read back to her before it was accepted", "Nothing is said about the record being read back."],
          ["It was written up some time after the hearing", "The clerk wrote at speed as she spoke."],
          ["It was fuller than the court itself required", "The clerk selected what the court needed to know."],
          ["It was shaped by what the court needed to know", "The clerk wrote in Latin, at speed, selecting what the court needed; what survives is a legal document, not her voice."],
        ]),
    ]),

  recording("C1", "presentation", "environment", "Street trees and summer heat", ["Dr Mwangi", "Elias"],
    `Dr Mwangi: To sum up, then. Across the forty streets we monitored, those with mature tree cover were on average two degrees cooler on summer afternoons than comparable streets without. On that basis the city is planning to plant twelve thousand trees over five years. I'll stop there. Yes, Elias?
Elias: Thank you, Dr Mwangi. A question about the comparison. The streets with mature trees are presumably older streets. Aren't they also wider, with gardens, and fewer parked cars? How do you know it's the trees?
Dr Mwangi: It's a fair challenge, and we can't rule it out entirely. We matched the streets for width and building height. We could not match them for gardens, because the leafy streets nearly all have them. So some of that two degrees may belong to the gardens.
Elias: Then is twelve thousand trees a sound decision?
Dr Mwangi: I'd defend the decision and criticise the plan. The cooling is real; we see the same thing when we measure under a single tree on a bare street. My concern is where the trees are going. The planting map follows available pavement space, which means the wide, already pleasant streets get more, and the dense streets with the highest temperatures and the oldest residents get almost none, because there is nowhere obvious to dig.
Elias: So the benefit goes to the people who need it least.
Dr Mwangi: On the present map, yes. We've proposed removing some parking spaces in the hottest streets to make room. That is politically much harder than planting in a park, and I'd be misleading you if I said I was confident it will happen.`,
    [
      question("DISTINGUISHING_VIEWPOINTS", "WRITER_STANCE_OR_IMPLICATION", "Separates a speaker's support for a policy's aim from her criticism of how it is carried out.",
        "What is Dr Mwangi's view of the city's tree-planting programme?", 0, [
          ["Its aim is sound, but the trees are going to the wrong streets", "She would defend the decision and criticise the plan, because the map favours wide, pleasant streets over the hottest ones."],
          ["Its aim is doubtful, because the cooling may come from gardens", "She accepts gardens may explain part of the figure but says the cooling is real."],
          ["It is too small to make a difference to summer temperatures", "The number of trees is not criticised."],
          ["It should be paused until the streets can be compared properly", "She does not call for a pause; she proposes changing where the trees go."],
        ]),
      question("IMPLICATION", "INFERENCE", "Infers how likely a speaker thinks an outcome is from her closing remarks.",
        "What does Dr Mwangi suggest about the proposal to remove parking spaces?", 2, [
          ["It has already been accepted for the hottest streets", "It has been proposed; she is not confident it will happen."],
          ["It would cool the streets more than the trees themselves", "Removing spaces is a way to make room for trees, not a cooling measure of its own."],
          ["It may well fail to win political approval", "She calls it politically much harder and says she is not confident it will happen."],
          ["It is less necessary than planting in the parks", "Planting in a park is mentioned as the easier option, not the more necessary one."],
        ]),
    ]),

  recording("C1", "conversation", "education", "After a seminar presentation", ["Mateo", "Dr Farouk"],
    `Mateo: Dr Farouk, do you have a moment? I wanted to ask how you thought my presentation went. I know I was nervous.
Dr Farouk: Come in, Mateo. You were nervous for about ninety seconds, and then you weren't. Nobody will have minded that. The talk itself was clear and well paced.
Mateo: That's a relief. I'd rehearsed it six or seven times.
Dr Farouk: It showed, and I mean that as praise. Can I ask you about the questions afterwards, though? When Ayesha asked whether your sample could be biased, what did you do?
Mateo: I went back to the slide on sampling and went through it again.
Dr Farouk: You did. Word for word, nearly. And when she asked a second time, you went through it a third.
Mateo: I thought she hadn't understood it.
Dr Farouk: She'd understood it perfectly. She was telling you she didn't accept it. Those are different situations, and they call for different responses. Repeating an explanation to someone who disagrees with it comes across as not listening, even when it's nothing of the kind.
Mateo: So what should I have said?
Dr Farouk: Something like: you're right that students who volunteer may differ from those who don't, and here's what that would do to my result. You know the answer; you wrote two pages on it in your report. It simply wasn't on a slide, so in the moment you didn't reach for it.
Mateo: I was afraid that if I admitted a weakness, the whole thing would collapse.
Dr Farouk: It's the reverse. An audience trusts a speaker who can say where the argument is thin. Next time, rehearse the questions as carefully as you rehearse the talk.`,
    [
      question("IMPLIED_MEANING", "INFERENCE", "Identifies the misreading of a situation that a tutor points out indirectly.",
        "According to Dr Farouk, what did Mateo get wrong during the questions?", 3, [
          ["He let his nervousness show in front of the audience", "She says the nervousness lasted ninety seconds and nobody will have minded."],
          ["He had not prepared an answer about bias in his sample", "She says he knows the answer and wrote two pages on it in his report."],
          ["He admitted a weakness that made his argument look thin", "He avoided admitting one; she says admitting it would have built trust."],
          ["He treated an objection as a failure to understand", "Ayesha was telling him she did not accept his explanation, and he repeated it as if she had not followed."],
        ]),
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Recognises a positive evaluation that is separate from the criticism that follows.",
        "What is Dr Farouk's opinion of the amount of rehearsal Mateo did for the talk itself?", 1, [
          ["It made his delivery sound mechanical", "She says the talk was clear and well paced."],
          ["It paid off in the quality of the talk", "She says, 'It showed, and I mean that as praise.'"],
          ["It was more than a seminar talk requires", "She does not suggest he rehearsed too much; she wants the questions rehearsed as carefully."],
          ["It was the cause of his nervousness at the start", "She does not link rehearsal with nervousness."],
        ]),
    ]),

  recording("C1", "lecture", "education", "Two arguments for bilingual schooling", [],
    `You will often hear it said that growing up with two languages makes children better at concentrating, at switching between tasks, at ignoring distractions. It's an appealing idea, and for about fifteen years it had respectable experimental support.
I have to tell you that the support has weakened considerably. The early studies were small. When much larger ones were run, with children matched for family income and parents' education, the advantage shrank and in many cases vanished. I'm not saying there is nothing there. There may be a modest effect in old age. But as a general claim about children, I would no longer teach it as established.
Now, I've watched students draw the wrong conclusion from this, so let me head it off. They reason: bilingual education was justified by the cognitive advantage; the advantage has gone; therefore the case for bilingual education has gone too. The middle step is fine. The first is where it goes wrong.
The case never rested there, or it shouldn't have. A child taught partly in the language spoken at home learns to read sooner, because she is decoding words she already knows. She can talk to her grandparents. Her parents can help with homework and are more likely to come into the school. Those benefits are well documented, and none of them depends on what happens in a laboratory attention task.
If anything, I think the cognitive argument did some harm. It encouraged people to defend a child's language for what it might do for her test scores, and that is a defence which fails the moment the scores don't move.`,
    [
      question("ARGUMENT_DEVELOPMENT", "INFERENCE", "Locates the step in a chain of reasoning that a speaker rejects.",
        "Which step in the students' reasoning does the lecturer say is mistaken?", 2, [
          ["That the larger studies were better designed than the early ones", "The lecturer relies on the larger, matched studies."],
          ["That the cognitive advantage has largely disappeared", "The lecturer calls this middle step fine."],
          ["That bilingual education was justified by the cognitive advantage", "The lecturer says the first step is where it goes wrong: the case never rested there."],
          ["That any remaining effect is found in old age", "The lecturer allows that there may be a modest effect in old age; it is not a step in the students' reasoning."],
        ]),
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Identifies a speaker's critical judgement of an argument made for a cause she supports.",
        "Why does the lecturer think the cognitive argument may have been harmful?", 0, [
          ["It made the value of a child's language depend on uncertain results", "It encouraged a defence based on test scores, which fails the moment the scores do not move."],
          ["It led schools to delay teaching children to read", "Reading sooner is a documented benefit of home-language teaching, not a harm of the argument."],
          ["It discouraged parents from helping with homework", "Parental help is given as a benefit of bilingual schooling."],
          ["It relied on studies that matched children by family income", "Matching was a feature of the later, larger studies."],
        ]),
    ]),

  recording("C1", "discussion", "technology", "Assessing students when machines can write", ["Dr Nilsen", "Dr Adeyemi"],
    `Dr Nilsen: I'll be direct, Dr Adeyemi. I don't think the take-home essay can survive. When a machine can produce a competent two thousand words in a minute, a mark for that essay tells me nothing about the student. I'd move to oral examinations: twenty minutes, face to face, defend your argument.
Dr Adeyemi: I share the diagnosis, Dr Nilsen, and I doubt the cure. We have four hundred students in the first year. Twenty minutes each is over a hundred and thirty hours of examining, before anyone has moderated a single mark.
Dr Nilsen: Expensive, I grant you. But it would be valid.
Dr Adeyemi: Would it? An oral rewards the student who is fluent and confident under pressure. I've taught brilliant people who freeze, and second-language speakers who think more slowly aloud than on paper. You'd be exchanging one distortion for another.
Dr Nilsen: Then what would you do? Not, I hope, pretend we can detect the machine's work. That software accuses the innocent.
Dr Adeyemi: On that we're entirely agreed. No, I'd assess the process. A plan in week three, an annotated list of sources in week five, a draft with my comments, and a final version with a note explaining what changed and why. It's hard to fake six weeks of thinking.
Dr Nilsen: Hard, but hardly impossible. And you've quadrupled your marking.
Dr Adeyemi: I've spread it out, and most of those stages take five minutes to check. I'll concede it isn't proof against a determined cheat. But I'm not designing for the determined cheat. I'm designing so that the ordinary student finds it easier to do the work than to avoid it.
Dr Nilsen: That's a more modest goal than mine. I'm not certain it's a worse one.`,
    [
      question("DISTINGUISHING_VIEWPOINTS", "WRITER_STANCE_OR_IMPLICATION", "Identifies the grounds on which one speaker rejects the other's proposal beyond its cost.",
        "Apart from the time it would take, why does Dr Adeyemi object to oral examinations?", 1, [
          ["They would be easier for students to prepare for with a machine", "She does not say machines would help students prepare for an oral."],
          ["They would favour ease in speaking over quality of thought", "She says an oral rewards fluency and confidence under pressure, and would disadvantage people who freeze or think more slowly aloud."],
          ["They could not be moderated as reliably as essays", "Moderation is mentioned as part of the workload, not as a question of reliability."],
          ["They would unfairly accuse some students of cheating", "False accusation is their shared objection to detection software."],
        ]),
      question("SPEAKER_ATTITUDE", "INFERENCE", "Infers a shift in a speaker's attitude from his final, hedged remark.",
        "How does Dr Nilsen respond to Dr Adeyemi's approach by the end of the discussion?", 3, [
          ["He is persuaded that it is proof against cheating", "He says faking it is hardly impossible, and she concedes the point."],
          ["He suspects it would add too much marking", "He raises the marking earlier; his final remark is about her goal."],
          ["He sees little difference from his own proposal", "He calls her goal more modest than his."],
          ["He allows that it may be as good an aim as his own", "He says her goal is more modest and that he is not certain it is a worse one."],
        ]),
    ]),
];
