import { question, recording, type AcademiaRecording } from "./academia-listening-item.js";

export const b2Recordings: AcademiaRecording[] = [
  recording("B2", "lecture", "transport", "Judging the Norbridge cycle lanes", [],
    `Let's turn to the case study I asked you to read: the cycle lanes built in the city of Norbridge five years ago.
When the plan was announced, the council promised two things: cleaner air and less traffic. So did it work?
Well, the number of people cycling to work doubled, which sounds impressive. But car traffic in the centre fell by just three per cent, because most of the new cyclists had previously taken the bus, not driven. Air quality, as a result, barely changed. On the council's own terms, then, you could call the project a disappointment.
And yet I'd argue it was a success, for a reason nobody had planned. Shop owners on those streets had protested loudly, expecting to lose the customers who could no longer park outside. In fact, their sales rose by about a fifth. Cyclists spend less per visit than drivers, but they come back far more often.
Now, what should we take from this? Not that cycle lanes are good for business everywhere; one city proves very little. My point is about evaluation. If we judge a policy against the goals written in the original plan and look no further, we may miss its most important effects.
For your assignment, choose a local policy and look for one outcome that its designers did not predict.`,
    [
      question("GIST", "MAIN_IDEA", "Separates the general point a lecturer draws from a case from the findings of the case itself.",
        "What is the lecturer's main point in this part of the lecture?", 1, [
          ["A policy should be assessed against the aims it began with", "The lecturer says that looking no further than the original goals can miss the most important effects."],
          ["A policy's results should be judged more widely than by its first aims", "The lecturer says the point is about evaluation: looking no further than the original goals can miss the main effects."],
          ["A policy's success depends on winning over local businesses", "Shop owners protested and then gained, but the lecturer warns that one city proves very little about business."],
          ["A policy's effects on traffic take many years to appear", "Traffic was measured after five years; the lecturer draws no lesson about waiting longer."],
        ]),
      question("IMPLICATION", "SIMPLE_INFERENCE", "Combines two statements to explain a result the speaker reports.",
        "Why did air quality in the city centre hardly improve?", 3, [
          ["Fewer people started cycling than the council had hoped", "The number of people cycling to work doubled."],
          ["Drivers moved to streets that had no cycle lanes", "Nothing is said about drivers changing their routes."],
          ["Shoppers kept driving in and parking further away", "Parking is mentioned as the shop owners' fear, not as a cause of pollution."],
          ["Most new cyclists had not been travelling by car before", "They had taken the bus, so car traffic fell by three per cent."],
        ]),
    ]),

  recording("B2", "conversation", "education", "Adding interviews to a dissertation", ["Noor", "Dr Petrov"],
    `Noor: Thanks for seeing me, Dr Petrov. I wanted to ask about my dissertation. I've had two hundred replies to my questionnaire on student housing.
Dr Petrov: Two hundred is excellent, Noor. So what's worrying you?
Noor: The answers feel a bit thin. People tick a box to say they're unhappy with their landlord, but I don't know why. So I'd like to add ten interviews.
Dr Petrov: I can see the attraction. Interviews would give you the reasons behind the numbers.
Noor: Exactly. And I think I have time. The deadline isn't until June.
Dr Petrov: Time isn't what concerns me. Your ethics approval covers an anonymous questionnaire and nothing else. For interviews you'd have to apply again, and the committee turns down a lot of late changes.
Noor: Oh. I hadn't thought of that. So it's impossible?
Dr Petrov: Not impossible, but risky. Here's another idea. Your questionnaire had an open question at the end, didn't it? Where people could write comments?
Noor: Yes, but hardly anyone reads those. I skipped them.
Dr Petrov: How many people wrote something?
Noor: About sixty, I think.
Dr Petrov: Then you already have sixty short explanations, and you're allowed to use them. Analyse those properly before you decide you need anything new.
Noor: That's true. I'll go through them this week and send you a summary.`,
    [
      question("INFERRED_INTENTION", "INFERENCE", "Identifies the reason behind advice when a more expected reason is raised and set aside.",
        "Why is Dr Petrov reluctant for Noor to add interviews?", 0, [
          ["She does not have permission to carry them out yet", "Her ethics approval covers the questionnaire and nothing else, and a new application might be turned down."],
          ["There is too little time left before the deadline", "Noor raises time, and Dr Petrov says time is not what concerns him."],
          ["Ten interviews would be too few to be useful", "The number of interviews is not criticised."],
          ["Her questionnaire has already had enough replies", "He praises the two hundred replies but does not give this as the reason."],
        ]),
      question("SPECIFIC_INFORMATION", "SIMPLE_INFERENCE", "Follows a suggestion built up over several turns to its practical outcome.",
        "What will Noor do next?", 2, [
          ["Send the questionnaire to more students", "More replies are not suggested; two hundred is called excellent."],
          ["Apply to the ethics committee a second time", "This is described as possible but risky, and she agrees to another plan."],
          ["Study the comments she has already collected", "She says she will go through the roughly sixty comments this week."],
          ["Write a summary of her ten interviews", "No interviews have taken place; the summary will be of the comments."],
        ]),
    ]),

  recording("B2", "discussion", "education", "Recorded lectures and attendance", ["Chidi", "Ingrid"],
    `Chidi: Did you see the figures in that article, Ingrid? Since the department started recording lectures, attendance has dropped by forty per cent.
Ingrid: I did. And the average exam mark stayed exactly the same, which the authors seem to think settles the question.
Chidi: Doesn't it? If people learn as much at home, who cares where they sit?
Ingrid: I'd care if I were teaching the seminars. Look at the second table. Students who watched recordings spoke far less in seminars. The authors mention it once and move on.
Chidi: Maybe quiet people chose the recordings. That wouldn't be the recordings' fault.
Ingrid: Possibly. But they did compare the same students before and after, and the students got quieter. That's harder to explain away.
Chidi: Hmm. I hadn't noticed it was the same group. All right, that is a problem, but I still wouldn't stop the recordings. I have a job on Tuesday mornings. Without them I'd miss a tenth of the course.
Ingrid: I'm not saying stop them, Chidi. I'd release them a week late. You'd still have them for revision, but people would have a reason to turn up.
Chidi: A week late doesn't help me on Tuesdays, though.
Ingrid: No, it doesn't. I suppose there's no version that suits everyone.`,
    [
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Identifies a speaker's criticism of how a study treats its own evidence.",
        "What is Ingrid's criticism of the article?", 3, [
          ["It compares two groups of students who were too different", "She points out that the same students were compared before and after."],
          ["It uses exam marks that were not collected carefully", "She accepts the marks; her complaint is about what the authors conclude from them."],
          ["It blames the recordings for the fall in attendance", "She does not dispute that attendance fell after recording began."],
          ["It gives too little weight to one of its own results", "She says the authors mention the drop in seminar participation once and move on."],
        ]),
      question("AGREEMENT_DISAGREEMENT", "INFERENCE", "Tracks where two speakers end up after one of them concedes a point.",
        "What do Chidi and Ingrid agree on by the end?", 0, [
          ["The recordings should not be withdrawn", "Chidi would not stop them and Ingrid says she is not saying stop them."],
          ["Recordings should be released a week late", "Ingrid proposes this; Chidi objects that it does not help him."],
          ["Quieter students are the ones who choose recordings", "Chidi suggests it and Ingrid answers with the before-and-after comparison."],
          ["Exam marks show that attendance is unimportant", "Chidi starts from this view and then accepts there is a problem."],
        ]),
    ]),

  recording("B2", "announcement", "education", "A new way of assessing the course", [],
    `Before we begin today, I need to explain a change to how this module is assessed, because it affects how you should work from now on.
Until last year, the whole mark came from a three-hour exam in January. Many of you will have heard from older students that they spent December memorising model answers. The external examiner noticed the same thing: the exam scripts were accurate but remarkably similar.
So, from this year, the exam counts for forty per cent, and it will be two hours long. The other sixty per cent comes from a portfolio of four short case reports, one every three weeks.
Let me deal with the obvious worry. This is not more work in total; we have removed two of the weekly reading tasks to make room. But it's work you can't leave until the end. Each report closes on a fixed date, and I can't reopen it.
One thing has not changed. You still need to pass the exam itself to pass the module, so a strong portfolio will not rescue a failed exam.
The first report is due on the twenty-third. I'd suggest you read the marking guide before you write a single word, because we reward your reasoning about the case, not the amount you can remember.`,
    [
      question("PURPOSE", "INFERENCE", "Infers the motive for a change from the problem the speaker describes.",
        "Why has the department changed the assessment?", 2, [
          ["Students complained that the exam was too long", "The exam is shorter now, but no complaint about its length is reported."],
          ["The old exam produced too many failures in January", "Failure rates are not mentioned; the old scripts were accurate."],
          ["Students were repeating prepared answers in the exam", "Students memorised model answers and the examiner found the scripts remarkably similar."],
          ["The weekly reading tasks were taking up too much time", "Two reading tasks were removed to make room; they were not the reason for the change."],
        ]),
      question("FACTUAL_DETAIL", "SIMPLE_INFERENCE", "Combines two statements about workload into one accurate summary.",
        "What does the speaker say about the amount of work on the module?", 1, [
          ["It has increased because of the four case reports", "The speaker says this is not more work in total."],
          ["It is the same overall but spread across the term", "Two reading tasks were removed to make room, and the reports cannot be left until the end."],
          ["It has been reduced by making the exam shorter", "The shorter exam is not linked to the amount of work."],
          ["It now depends mainly on the weekly reading tasks", "Two of the weekly reading tasks have been removed."],
        ]),
    ]),

  recording("B2", "lecture", "consumer", "Does more choice put people off?", [],
    `Most of you will know the jam experiment. Shoppers were offered either six kinds of jam or twenty-four. The larger display attracted more people, but those who saw six were far more likely to buy. The conclusion, repeated in every business magazine since, was that too much choice stops people from acting.
It's a neat story. Unfortunately, when other researchers repeated the experiment, the results were mixed. Some found the same effect, some found nothing, and a few found that more choice increased sales.
Does that mean the original finding was simply wrong? Some of my colleagues think so, and I understand why. My own view is different. I think the effect is real, but it appears under particular conditions. Look at where it was found most clearly: with products the shoppers didn't know well and couldn't easily compare. Offer me twenty-four unfamiliar jams and I may walk away. Offer me twenty-four kinds of coffee, when I already know what I like, and the number doesn't trouble me at all. I just look for my usual one.
So when you read that a company cut its range and sales went up, don't ask whether choice is good or bad. Ask how much the customers knew before they arrived. That, incidentally, is the question for Thursday's seminar.`,
    [
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Identifies a speaker's own position between two views that are both presented.",
        "What is the lecturer's view of the idea that too much choice stops people buying?", 3, [
          ["It was true once, but later studies have shown it to be wrong", "This is close to the view of some colleagues; the lecturer says, 'My own view is different.'"],
          ["It holds when the range on offer is very large", "Every version of the experiment used a large range, and the results were mixed."],
          ["It holds for food but not for other kinds of product", "Jam and coffee are both food, and the lecturer treats them differently."],
          ["It holds when shoppers know little about what is on offer", "The lecturer thinks the effect is real under particular conditions: unfamiliar products that are hard to compare."],
        ]),
      question("FACTUAL_DETAIL", "SIMPLE_INFERENCE", "Summarises the outcome of a set of later studies described in one stretch of talk.",
        "What happened when other researchers repeated the jam experiment?", 0, [
          ["Their findings did not agree with one another", "Some found the same effect, some found nothing and a few found the reverse."],
          ["They confirmed what the first study had found", "Some did; the lecturer calls the results as a whole mixed."],
          ["They found the opposite effect in most cases", "A few, not most, found that more choice increased sales."],
          ["They tested products that shoppers knew well", "Familiar products are the lecturer's own explanation, not a description of the repeat studies."],
        ]),
    ]),

  recording("B2", "conversation", "education", "Feedback on an essay draft", ["Yuna", "Mr Oduya"],
    `Yuna: Hello, Mr Oduya. I booked a session about my politics essay. My tutor gave the draft a low mark and wrote 'unclear argument' at the top, and nothing else.
Mr Oduya: Hello, Yuna. Yes, I've read it. Tell me first what you think went wrong.
Yuna: My English, probably. I'm sure there are lots of grammar mistakes. I thought you could help me correct them.
Mr Oduya: There are a few, but honestly they didn't get in my way. I understood every sentence. What I couldn't tell, until the last page, was what you were arguing.
Yuna: But I explain my opinion in the conclusion.
Mr Oduya: You do, and it's a good one: that the voting age matters less than how politics is taught in schools. The trouble is that the reader meets it for the first time on page six. For five pages you describe what other writers say, and I didn't know why I was being told.
Yuna: At home we're taught to present all the views first and give our own at the end. Putting it first feels rude.
Mr Oduya: That's a perfectly respectable way to write, and I'm not saying it's wrong. Your tutor, though, expects the claim in the first paragraph and then evidence for it. Try moving that one sentence from the conclusion to the introduction and see what each paragraph has to do differently.
Yuna: Just one sentence? All right. I'll try that tonight.`,
    [
      question("GIST", "MAIN_IDEA", "Identifies the central problem an adviser diagnoses, against the problem the student expected.",
        "According to Mr Oduya, what is the main weakness of Yuna's draft?", 2, [
          ["Grammar mistakes make some sentences hard to follow", "He says the mistakes did not get in his way and he understood every sentence."],
          ["It reports too few of the views of other writers", "Five pages describe what other writers say."],
          ["Her own position is not stated until the end", "The reader meets her argument for the first time on page six, in the conclusion."],
          ["Her opinion on the voting age is not a convincing one", "He calls her opinion a good one."],
        ]),
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Infers a speaker's attitude from how he qualifies his advice.",
        "How does Mr Oduya regard the way Yuna was taught to write essays?", 1, [
          ["As a sound approach that she has not followed closely", "He does not suggest she has failed to follow it; her draft does present other views first."],
          ["As a valid approach that her tutor is not looking for", "He calls it perfectly respectable, then explains what her tutor expects instead."],
          ["As a clear approach that works best in shorter essays", "He does not connect the approach with the length of an essay."],
          ["As a polite approach that her tutor would welcome", "Yuna says putting the claim first feels rude; he explains that her tutor expects the claim first."],
        ]),
    ]),

  recording("B2", "presentation", "environment", "Food waste in the canteen", [],
    `Good afternoon. I'm Thandi, and I'm going to present our group's project on food waste in the main canteen.
For three weeks we weighed everything that came back on the trays, and then we tested two changes, one at a time.
The first was smaller plates. The idea comes from several well-known studies, and frankly we expected it to work. It didn't. People took less the first time, but they went back for a second plate, and the weight of food thrown away was almost identical.
The second change was removing the trays, so that people carried their plate and glass by hand. This time waste fell by nearly a third. Our explanation is simple: with a tray you can pick up a dessert and a second side dish without thinking. Without one, your hands are full.
I should mention a limitation. We ran the no-tray weeks at the end of term, when the canteen is quieter, so some of the fall may be due to that. We'd like to repeat it in a busy month.
One result surprised us. We assumed students would hate losing the trays, but in our survey more than half said they hadn't noticed, and the loudest objections came from the kitchen staff, who now have more tables to wipe.
Our recommendation is to remove trays for a full term and measure again. Thank you. I'm happy to take questions.`,
    [
      question("SYNTHESISING_INFORMATION", "INFERENCE", "Compares the outcomes of two interventions described in sequence.",
        "What did the group find when they compared the two changes?", 0, [
          ["Taking the trays away cut waste, while smaller plates made little difference", "Waste was almost identical with smaller plates and fell by nearly a third without trays."],
          ["Smaller plates cut waste, while taking the trays away made little difference", "This reverses the two results."],
          ["Both changes reduced waste, though by less than earlier studies", "Smaller plates did not reduce the weight thrown away."],
          ["Neither change had a clear effect once the quiet weeks were considered", "The quiet period is a limitation on one result; the speaker still recommends removing trays."],
        ]),
      question("IMPLICATION", "INFERENCE", "Identifies which expectation was overturned by a survey result.",
        "What surprised the group about how people reacted to losing the trays?", 3, [
          ["Students complained more than the kitchen staff did", "The loudest objections came from the kitchen staff."],
          ["Kitchen staff welcomed having fewer trays to wash", "The staff objected because they have more tables to wipe."],
          ["Students said carrying plates by hand was difficult", "No such complaint is reported; more than half had not noticed the change."],
          ["Many students were hardly aware of the change", "More than half said they had not noticed, although the group expected students to hate it."],
        ]),
    ]),

  recording("B2", "discussion", "education", "Where to spend a term abroad", ["Sofia", "Emeka"],
    `Sofia: Emeka, have you filled in the exchange form yet? It has to be in by Friday.
Emeka: Nearly. I've put Weston first. It's the famous one, and it would look good on any application I ever make.
Sofia: I had Weston first too, until I read the course list. They don't let exchange students into the laboratory courses. You'd spend the term in lectures.
Emeka: Seriously, Sofia? But the lab work is the reason I'm studying chemistry.
Sofia: That's what I thought. So I've changed to Calder. It's small and nobody's heard of it, but exchange students join a research group from the first week.
Emeka: Hmm. My parents won't be impressed. They've been telling everyone I'm going to Weston.
Sofia: Mine weren't delighted either. But think about next year. When we apply for a master's, which helps more: a well-known name, or a supervisor who can describe what you did in the lab?
Emeka: The supervisor, obviously. All right, you've made your point. Isn't Calder more expensive, though? It's in the capital.
Sofia: The rent is higher, yes. But the exchange grant is adjusted for the city, so in the end it works out about the same.
Emeka: Then I've run out of objections. I'll change the form tonight. Can you send me the name of that research group?`,
    [
      question("INFERRED_INTENTION", "INFERENCE", "Identifies what persuades a speaker to change a decision.",
        "What makes Emeka change his first choice?", 2, [
          ["Calder turns out to be cheaper to live in than Weston", "Rent at Calder is higher; with the grant it works out about the same."],
          ["His parents would prefer him to go to Calder", "His parents expect him to go to Weston."],
          ["At Weston he would not be able to do practical work", "Weston keeps exchange students out of laboratory courses, and lab work is why he studies chemistry."],
          ["Weston is less well known than he had believed", "Weston is the famous one; its reputation is not questioned."],
        ]),
      question("IMPLIED_MEANING", "SIMPLE_INFERENCE", "Works out what a comparison implies about the speakers' families.",
        "What do we learn about Sofia's parents?", 1, [
          ["They suggested Calder because it is in the capital", "Nothing indicates that the idea came from them."],
          ["They were not pleased when she changed her choice", "Emeka says his parents won't be impressed, and she says hers weren't delighted either."],
          ["They have told people she is going to Weston", "It is Emeka's parents who have been telling everyone."],
          ["They are worried about the cost of the exchange", "Cost is raised by Emeka, not by her parents."],
        ]),
    ]),

  recording("B2", "lecture", "communication", "How new words spread", [],
    `Every generation is told that it is ruining the language, and at the moment the blame falls on text messages and social media. So let's look at what the evidence says about how language change spreads.
First, the popular belief. People assume that writing on phones has damaged young people's grammar. Several large studies have compared school essays from the nineteen nineties with essays written today, and they found no decline in sentence structure at all. What has changed is vocabulary, and vocabulary has changed in every period we have records for.
Second, who leads change? Here the popular belief is half right. Young people do adopt new forms first. But a new word that stays inside one group of friends dies there. For it to spread, it has to be carried between groups, and the people who do that are not the most popular members at the centre of a group. They are people at the edges who belong loosely to several groups at once: the student with a weekend job, a sports team and friends from another town.
That finding predates the internet, by the way. It comes from a study of working-class neighbourhoods in the nineteen seventies. Online networks have made the process faster and easier to observe, but they have not changed how it works.
For next week, read the original study and note how the researchers measured belonging.`,
    [
      question("GIST", "MAIN_IDEA", "Identifies which type of person a lecturer credits with a process, against more expected candidates.",
        "According to the lecturer, who is most responsible for spreading a new word?", 1, [
          ["Teenagers who are the most popular in their group", "The lecturer says the carriers are not the most popular members at the centre."],
          ["People with loose ties to a number of different groups", "A word spreads when people at the edges, who belong loosely to several groups, carry it between them."],
          ["Heavy users of text messages and social media", "Online networks speed the process up; they are not said to be the people responsible."],
          ["Researchers who record the vocabulary of a neighbourhood", "The researchers studied the process; they did not spread the words."],
        ]),
      question("SPEAKER_ATTITUDE", "WRITER_STANCE_OR_IMPLICATION", "Identifies how far a speaker accepts a claim about a recent technology.",
        "What does the lecturer say about the effect of the internet on language change?", 3, [
          ["It has changed which people start using new words", "Young people adopted new forms first before the internet and still do."],
          ["It has made new words die out sooner than before", "Words are said to die when they stay inside one group; the internet is not linked to this."],
          ["It has had no effect that researchers can measure", "The lecturer says it has made the process faster and easier to observe."],
          ["It has sped up a process that already existed", "The finding predates the internet; online networks made it faster without changing how it works."],
        ]),
    ]),

  recording("B2", "conversation", "science", "Marks for a lab report", ["Hiro", "Dr Lindqvist"],
    `Hiro: Dr Lindqvist, could I ask about my lab report? I got fifty-two, and I don't understand why. My results were almost exactly the values in the textbook.
Dr Lindqvist: They were, Hiro. Your measurements were some of the most careful in the class, and you got full marks for the method section.
Hiro: Then where did I lose the marks?
Dr Lindqvist: In the discussion. You wrote four lines: the results agree with theory, so the experiment was successful.
Hiro: But it was successful.
Dr Lindqvist: It was. But think about what a discussion is for. One of your five readings was noticeably lower than the others. You left it out of the average, and you didn't say so.
Hiro: I assumed I'd made a mistake with that one.
Dr Lindqvist: Perhaps you did. Or perhaps the solution had cooled. I can't tell, and neither can your reader, because you don't mention it. A student who got worse numbers than yours scored seventy, because she spent a page working out why hers were wrong.
Hiro: So I'd have done better with a bad result?
Dr Lindqvist: No. You'd have done better by treating the odd reading as something to explain. Good results don't excuse you from that.
Hiro: Can I rewrite the discussion?
Dr Lindqvist: Not for this report, the marks have gone in. But the next one is in two weeks, and it's marked the same way.`,
    [
      question("IMPLICATION", "INFERENCE", "Infers the criterion behind a mark from two contrasting cases.",
        "What does Dr Lindqvist's explanation show about how the reports are marked?", 3, [
          ["Results close to the textbook values earn the most marks", "Hiro's results were close to the textbook and he scored fifty-two."],
          ["A report with poor results is marked more generously", "She rejects this when Hiro asks whether a bad result would have helped."],
          ["The method section counts for more than the discussion", "He got full marks for method and still received a low mark overall."],
          ["Good results are not enough if odd readings go unexplained", "A student with worse numbers scored seventy for working out why; Hiro lost marks for ignoring an odd reading."],
        ]),
      question("FACTUAL_DETAIL", "SIMPLE_INFERENCE", "Identifies the specific omission a speaker criticises.",
        "What had Hiro done with his lowest reading?", 0, [
          ["Dropped it without saying so", "He left it out of the average and did not mention it."],
          ["Repeated it after the solution cooled", "Cooling is the lecturer's guess at a cause; he did not repeat the reading."],
          ["Explained it in four lines", "His four lines said only that the results agreed with theory."],
          ["Replaced it with the textbook value", "Nothing suggests he substituted a value."],
        ]),
    ]),
];
