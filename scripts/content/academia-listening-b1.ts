import { question, recording, type AcademiaRecording } from "./academia-listening-item.js";

export const b1Recordings: AcademiaRecording[] = [
  recording("B1", "announcement", "education", "Library hours in the exam period", [],
    `Good morning, everyone. This is a short announcement from the university library.
From Monday the fourth of May, some things will be different for the exam period.
The main reading room will stay open until midnight from Monday to Friday. At weekends it will close at eight in the evening, not at six as it does now.
The café on the ground floor will keep its normal hours and close at five.
Group study rooms are very popular at this time of year, so you now need to book them online, at least one day before. You cannot book them at the front desk any more.
Finally, the silent study area is moving from the second floor to the third floor, because the second floor is being painted.
If you have any questions, please ask a member of staff at the information point. Thank you, and good luck with your exams.`,
    [
      question("GIST", "MAIN_IDEA", "Identifies the overall subject of a short public announcement.",
        "What is the announcement mainly about?", 2, [
          ["A new online system for borrowing library books", "Online booking is mentioned, but for group study rooms, and it is one point among several."],
          ["Building work that will close the library in May", "One floor is being painted; the library stays open and opens longer."],
          ["Changes to library services during the exam period", "The speaker lists new hours, a new booking rule and a new place for silent study."],
          ["New opening hours for the café on the ground floor", "The café keeps its normal hours."],
        ]),
      question("SPECIFIC_INFORMATION", "EXPLICIT_DETAIL", "Picks out one time among several times that are said.",
        "When will the main reading room close on Saturdays and Sundays in the exam period?", 1, [
          ["At six in the evening", "Six is the weekend closing time now, before the change."],
          ["At eight in the evening", "The speaker says that at weekends it will close at eight."],
          ["At five in the afternoon", "Five is when the café closes."],
          ["At midnight", "Midnight is the closing time from Monday to Friday."],
        ]),
    ]),

  recording("B1", "conversation", "education", "A late history essay", ["Mira", "Dr Hassan"],
    `Mira: Hello, Dr Hassan. Do you have a minute? It's about the history essay.
Dr Hassan: Of course, Mira. Come in. Is there a problem?
Mira: A small one. I've finished my reading and my plan is ready, but I haven't started writing. I was ill for four days last week.
Dr Hassan: I'm sorry to hear that. The essay is for this Friday, isn't it?
Mira: Yes. Could I give it to you next Wednesday?
Dr Hassan: I can't wait that long, I'm afraid, because I have to send the marks to the office on Tuesday. But you can have until Monday morning at nine.
Mira: Thank you, that helps a lot. Do I need to fill in a form?
Dr Hassan: No, you don't need a form for just a few days. Just send me an email today, so that I have it in writing. And I don't need a note from your doctor.
Mira: Great. Should I still come to the seminar on Thursday?
Dr Hassan: Yes, please do. We'll talk about how to use sources, and that will help you with the essay.`,
    [
      question("PURPOSE", "MAIN_IDEA", "Recognises why a student has come to speak to a tutor.",
        "Why has Mira come to see Dr Hassan?", 0, [
          ["To ask for more time to finish a piece of work", "She asks to hand the essay in later than Friday."],
          ["To get advice on how to plan her essay", "Her plan is already finished."],
          ["To explain why she missed last week's seminar", "She was ill, but a missed seminar is not discussed; the seminar is this Thursday."],
          ["To ask him to sign a form for the office", "She asks about a form and is told she does not need one."],
        ]),
      question("SPECIFIC_INFORMATION", "EXPLICIT_DETAIL", "Separates the one action requested from actions that are mentioned and ruled out.",
        "What does Dr Hassan want Mira to do before the end of the day?", 3, [
          ["Fill in a form", "He says she does not need a form for just a few days."],
          ["Get a note from her doctor", "He says he does not need a doctor's note."],
          ["Come to a seminar", "The seminar is on Thursday, and he does not say that today is Thursday."],
          ["Write him an email", "He says, 'Just send me an email today.'"],
        ]),
    ]),

  recording("B1", "lecture", "society", "Why old cities stand on rivers", [],
    `Good afternoon. I'm Dr Okafor, and today we're looking at why so many old cities were built next to rivers.
Students often tell me the reason was drinking water. Water was useful, of course, but people could also get it from wells, so it wasn't the main reason.
Others say it was protection from enemies, and for a few cities on islands that is true.
However, for most cities the answer is transport. Before trains and good roads, moving heavy things like wood, stone and grain over land was slow and expensive. One boat could carry the same amount as about fifty horses. So a town on a river could buy and sell much more, and it grew faster than a town in the hills.
There was a cost, though. Rivers flood, and many of these cities were damaged again and again.
Next week we'll look at how cities tried to control that problem.`,
    [
      question("GIST", "MAIN_IDEA", "Identifies the lecturer's main claim among reasons that are mentioned and played down.",
        "According to Dr Okafor, why were most old cities built next to rivers?", 3, [
          ["People needed water to drink", "He says water also came from wells, so it was not the main reason."],
          ["The river protected them from enemies", "He says this is true for a few island cities, not for most."],
          ["The land was good for growing grain", "Grain is mentioned as something heavy to move, not as a reason for the place."],
          ["Goods could be moved more cheaply", "He says that for most cities the answer is transport, and explains the cost of moving goods by land."],
        ]),
      question("IMPLICATION", "SIMPLE_INFERENCE", "Follows a forward reference to work out the subject of the next class.",
        "What will next week's lecture be about?", 0, [
          ["How cities dealt with flooding", "'That problem' refers to the floods he has just described."],
          ["How trains changed trade", "Trains are mentioned to mark the period, not as the next topic."],
          ["Why some cities were built on islands", "Island cities are a short example in this lecture."],
          ["How people dug wells for water", "Wells are mentioned once, to show water was not the main reason."],
        ]),
    ]),

  recording("B1", "discussion", "work", "Planning a seminar presentation", ["Lena", "Tariq"],
    `Lena: Tariq, we need to plan our presentation for the business seminar. It's on the twentieth.
Tariq: I know, Lena. Have you thought about a topic? I'd like to do online shopping.
Lena: Two other groups have chosen that already. What about small local shops, and how they survive?
Tariq: Hmm. Or we could do food delivery companies.
Lena: That's interesting, but it's hard to find good numbers for those. My aunt has a bookshop, so for local shops we could interview her.
Tariq: A real interview would be good. OK, local shops. Shall I make the slides?
Lena: You made the slides last time and they were great, but I think you should do the speaking this time. The tutor said everyone has to present at least once.
Tariq: That's true. Fine. I'll talk, you do the slides, and we'll write the questions for your aunt together.
Lena: Perfect. Can you meet on Tuesday after class?
Tariq: I have football then. Wednesday at lunchtime?
Lena: Wednesday's fine. Let's meet in the library café.`,
    [
      question("AGREEMENT_DISAGREEMENT", "MAIN_IDEA", "Identifies what two speakers finally agree on after other ideas are rejected.",
        "Which topic do Lena and Tariq agree on for their presentation?", 1, [
          ["Online shopping", "Tariq suggests it, but two other groups have already chosen it."],
          ["Small local shops", "Tariq says, 'OK, local shops.'"],
          ["Food delivery companies", "Lena says it is hard to find good numbers for them."],
          ["How to interview a business owner", "They plan an interview as part of their work; it is not their topic."],
        ]),
      question("FACTUAL_DETAIL", "EXPLICIT_DETAIL", "Identifies the reason one speaker gives for a division of tasks.",
        "Why will Tariq do the speaking this time?", 2, [
          ["His slides were not very good last time", "Lena says his slides were great."],
          ["Lena will be busy interviewing her aunt", "They will write the interview questions together."],
          ["The tutor wants each student to present", "Lena says the tutor said everyone has to present at least once."],
          ["Lena cannot come to the seminar on the twentieth", "The twentieth is the seminar date; nobody says Lena cannot come."],
        ]),
    ]),

  recording("B1", "announcement", "science", "News about the field trip", [],
    `Hello, everyone. Before we start, I have some news about Saturday's field trip to the coast.
First, the trip is still happening. But we have changed the time. We will now leave at seven thirty, not at nine, so please be at the main gate by seven fifteen. The tide will be out in the morning, and that is the best time to see the rocks we have been studying.
Bring strong shoes and a waterproof jacket. You do not need to bring lunch, because the department is paying for sandwiches, but please bring your own water.
There is one more thing. I asked you to write your report in pairs, but several of you said that was difficult to organise. So each of you will now write your own short report, about five hundred words, and give it to me by the following Friday.
We should be back on campus at about four.`,
    [
      question("GIST", "MAIN_IDEA", "Recognises what a speaker is doing in a short talk to a class.",
        "What is the speaker mainly doing?", 3, [
          ["Explaining why a trip has been cancelled", "The speaker says the trip is still happening."],
          ["Telling students how to book a place on a trip", "Booking is not mentioned; the students are already going."],
          ["Giving students feedback on their reports", "The report has not been written yet."],
          ["Describing changes to the plans for a trip", "The time of leaving and the report task have both changed."],
        ]),
      question("FACTUAL_DETAIL", "EXPLICIT_DETAIL", "Identifies how a task has changed from the original instruction.",
        "How is the report different from the speaker's first plan?", 0, [
          ["Students will write it alone", "The first plan was to write in pairs; now each student writes their own."],
          ["Students will write it at the coast", "No place for writing is given; it is handed in the following Friday."],
          ["It will be longer than before", "Five hundred words is called short, and no earlier length is given."],
          ["It is no longer necessary", "Each student still has to write one."],
        ]),
    ]),

  recording("B1", "conversation", "education", "Choosing an optional course", ["Kofi", "Ms Novak"],
    `Kofi: Good morning, Ms Novak. I need to choose my optional course for next term and I can't decide.
Ms Novak: Morning, Kofi. Which ones are you thinking about?
Kofi: Statistics, or Introduction to Film. My friends are all taking Film.
Ms Novak: I see. What do you want to do after your degree?
Kofi: I'd like to work in market research.
Ms Novak: Then Statistics would be more useful. Most companies ask for it.
Kofi: I know, but I'm worried about the maths. I wasn't good at it at school.
Ms Novak: The course starts from the beginning, and there's a free help class every Thursday. Lots of students use it.
Kofi: That's good to hear. Is there an exam?
Ms Novak: No. Statistics has a project and two short tests. Film has the exam, and a long essay.
Kofi: Oh, I thought it was the other way round. OK, I'll take Statistics. Can I put my name down now?
Ms Novak: Not yet. You do it online from Monday, and the list closes on Friday, so don't leave it late.`,
    [
      question("GIST", "MAIN_IDEA", "Identifies the subject of a conversation between a student and an adviser.",
        "What is the conversation mainly about?", 1, [
          ["Getting extra help with a maths course", "A help class is mentioned as one point in favour of Statistics."],
          ["Deciding which of two courses to take", "Kofi cannot decide between Statistics and Film, and decides at the end."],
          ["Preparing to apply for a job in market research", "His future job is a reason for the choice, not the subject."],
          ["Changing the date of an exam", "They talk about which course has an exam, not about its date."],
        ]),
      question("IMPLIED_MEANING", "SIMPLE_INFERENCE", "Works out what a speaker had misunderstood from his reaction.",
        "What had Kofi misunderstood before this conversation?", 3, [
          ["Which course his friends are taking", "He knows his friends are taking Film."],
          ["What job he can get with his degree", "He already knows he wants to work in market research."],
          ["When he can put his name down", "He asks about this; he does not show a wrong idea about it."],
          ["Which of the two courses has an exam", "He says, 'I thought it was the other way round,' after hearing that Film has the exam."],
        ]),
    ]),

  recording("B1", "short_talk", "education", "Taking notes in lectures", [],
    `Hi, everyone. I'm Rosa from the Study Skills Centre, and I have five minutes to talk to you about taking notes in lectures.
Many new students try to write down everything the lecturer says. I did that in my first year. At the end of each class my hand hurt and I couldn't remember anything. When you are writing all the time, you stop listening.
So here is my advice. Before the lecture, look at the slides for ten minutes. Most lecturers put them online the day before. Then, in the lecture, write the main ideas and any examples that are not on the slides.
Some students record lectures on their phones. You can do that if the lecturer agrees, but be honest: will you really listen to two hours again? Most people don't.
The last step matters most. On the same day, spend fifteen minutes reading your notes and writing a short summary.
If you'd like more help, the Centre is open every afternoon, and you don't need an appointment.`,
    [
      question("FACTUAL_DETAIL", "EXPLICIT_DETAIL", "Identifies which of several recommended steps the speaker ranks highest.",
        "Which step does Rosa say is the most important?", 2, [
          ["Looking at the slides before the lecture", "This is her first piece of advice, but she does not call it the most important."],
          ["Writing down examples during the lecture", "She recommends it, without ranking it first."],
          ["Going over the notes later the same day", "She says the last step matters most: reading the notes and writing a summary on the same day."],
          ["Visiting the Study Skills Centre", "She offers this as extra help at the end."],
        ]),
      question("SPEAKER_ATTITUDE", "SIMPLE_INFERENCE", "Infers a speaker's opinion from a rhetorical question and her comment on it.",
        "What does Rosa think about recording lectures?", 0, [
          ["Students are unlikely to use the recordings", "She asks whether students will really listen again and says most people don't."],
          ["Lecturers usually refuse to allow it", "She says students can do it if the lecturer agrees; she does not say lecturers refuse."],
          ["It is a good way to stop your hand hurting", "Her hand hurt from writing everything; she does not offer recording as the answer."],
          ["It is useful if the slides are not online", "She does not connect recording with the slides."],
        ]),
    ]),

  recording("B1", "short_talk", "science", "The first chemistry lab", [],
    `Right, can everyone hear me? Welcome to your first chemistry lab. My name is Mr Santiago and I'm the lab technician. Before you touch anything, three things.
First, safety glasses. You wear them from the moment you come in until the moment you leave, even when you are writing.
Lab coats are in the grey cupboard. Please put yours back at the end; don't take it home.
Second, bags. They don't go under the tables, because people fall over them. Put them on the shelves by the door.
Third, today's experiment. You'll work in groups of three, not in pairs as it says in your handbook, because two of the machines are broken.
The experiment takes about forty minutes. When you finish, wash the glass bottles, but leave the metal tools on the table for me to check.
Dr Bello will arrive at eleven to answer questions about your lab reports.`,
    [
      question("SPECIFIC_INFORMATION", "EXPLICIT_DETAIL", "Matches an object to the correct instruction among several similar instructions.",
        "What should students do with the metal tools after the experiment?", 1, [
          ["Wash them with the bottles", "The glass bottles are washed; the tools are not."],
          ["Leave them on the table", "He says to leave the metal tools on the table for him to check."],
          ["Put them in the grey cupboard", "The grey cupboard is for lab coats."],
          ["Place them on the shelves by the door", "The shelves by the door are for bags."],
        ]),
      question("FACTUAL_DETAIL", "EXPLICIT_DETAIL", "Connects a stated cause to a change from the written plan.",
        "Why are the students not working in pairs today?", 2, [
          ["The class is bigger than usual", "The size of the class is not mentioned."],
          ["The handbook says groups of three are safer", "The handbook says pairs."],
          ["Some of the equipment is not working", "He says two of the machines are broken."],
          ["The experiment is too long for two people", "It takes about forty minutes; length is not given as a reason."],
        ]),
    ]),

  recording("B1", "discussion", "work", "Students with part-time jobs", ["Elif", "Marcus"],
    `Elif: Marcus, did you read the article for tomorrow's seminar? The one about students with part-time jobs.
Marcus: I did, Elif, and I was surprised. I thought working students would get lower marks.
Elif: Me too. But the study says students who work up to ten hours a week get the same marks as students who don't work.
Marcus: Yes, and they are better at planning their time. The problems start above fifteen hours.
Elif: Right. Above fifteen, marks go down, and those students miss more classes.
Marcus: I'm not sure about the study, though. It looked at students at one university, and a small one.
Elif: That's a fair point. But it followed the same people for three years. I think that makes it quite strong.
Marcus: Maybe. I'd still like to see results from a big city university, where rents are higher.
Elif: You should say that in the seminar. Dr Reyes likes it when we question the reading.
Marcus: I will. By the way, how many hours do you work at the café?
Elif: Twelve. So I'm somewhere in the middle!`,
    [
      question("FACTUAL_DETAIL", "EXPLICIT_DETAIL", "Reports a finding that goes against what the speakers expected.",
        "According to the article, what is true of students who work up to ten hours a week?", 3, [
          ["They get lower marks than other students", "This is what both speakers expected, and what the study found above fifteen hours."],
          ["They miss more classes than other students", "Missing classes is reported for students who work more than fifteen hours."],
          ["They plan their time worse than other students", "Marcus says they are better at planning their time."],
          ["They get the same marks as students without jobs", "Elif says they get the same marks as students who don't work."],
        ]),
      question("SPEAKER_ATTITUDE", "SIMPLE_INFERENCE", "Identifies a speaker's reservation about a study he has read.",
        "What is Marcus's opinion of the study?", 0, [
          ["It should include other kinds of university", "He points out it used one small university and wants results from a big city one."],
          ["It did not follow the students for long enough", "Elif says it followed them for three years; Marcus does not complain about the length."],
          ["Its results are what he expected", "He says he was surprised."],
          ["It asked students the wrong questions about rent", "He mentions rents to explain why another university might differ, not as a fault in the questions."],
        ]),
    ]),

  recording("B1", "lecture", "science", "An experiment on memory", [],
    `Good morning. Today's topic is how we remember what we study. Let me start with an experiment from our own department.
Last year we taught two groups of students forty new words in a foreign language. Group A studied for two hours on one evening. Group B studied for thirty minutes on four different days, so the total time was the same.
The next morning we tested both groups, and the results were almost equal. Group A was even a little better.
So is one long evening of study the answer? No, because we tested them again a month later. This time Group B remembered about twice as many words as Group A.
Why? When you come back to information after a break, your brain has to work to find it again, and that work makes the memory stronger. It feels harder, and students often think they are learning less. In fact, they are learning more.
Your task for this week: plan your revision for my course in short sessions, and bring the plan to Thursday's class.`,
    [
      question("SPECIFIC_INFORMATION", "EXPLICIT_DETAIL", "Keeps two test results apart and reports the first one.",
        "What happened in the test on the next morning?", 2, [
          ["Group B remembered about twice as many words", "That was the result a month later."],
          ["Group A remembered far fewer words than Group B", "Group A was a little better on the first test."],
          ["The two groups did about equally well", "The lecturer says the results were almost equal."],
          ["Both groups had forgotten most of the words", "Nothing suggests most words were forgotten by the next morning."],
        ]),
      question("GIST", "MAIN_IDEA", "Identifies the explanation a lecturer gives for a result.",
        "According to the lecturer, why did Group B remember more after a month?", 1, [
          ["They spent more hours studying the words in total", "The total study time was the same for both groups."],
          ["Returning to the words after breaks made the memory stronger", "The brain has to work to find the information again, and that work strengthens the memory."],
          ["They found the short sessions easier than a long one", "The lecturer says coming back after a break feels harder."],
          ["They were tested more often than the other group", "Both groups took the same two tests."],
        ]),
    ]),
];
