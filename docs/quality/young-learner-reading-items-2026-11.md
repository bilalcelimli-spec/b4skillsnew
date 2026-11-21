# Primary (7–10) & Secondary / Junior (11–14) — Reading Soru Bankası (ACTIVE Paket)

Bu doküman, **Primary (7–10)** (`PRE_A1` – `A2`, minimum 20 metin/seviye) ve **Secondary / Junior Suite (11–14)** (`A1` – `B2`, minimum 25 metin/seviye) canlı (`ACTIVE`) okuma havuzundaki kapasite açıklarını kapatmak üzere hazırlanmış **38 özgün, metne bağımlı (text-dependent) Reading sorusunu** içerir.

## Tasarım ve Kalite Kuralları (`batch-generator` & `age-context` Uyumlu)

1. **Sıkı Metin Bağımlılığı (Blind-Solver Koruması):** Tüm çeldiriciler (distractors) metin içinde gerçekten geçen ancak yanlış bağlamda/kişide/zamanda yer alan unsurlardan seçilmiştir. Metni okumadan genel kültürle veya şık uzunluğuyla çözülemez.
2. **Homojen Şıklar:** Tüm şıklar aynı dilbilgisel ve anlamsal kategoridedir (renkse 4 renk, saatse 4 saat, nesneyse 4 nesne, nedense 4 eşit uzunlukta neden).
3. **Yaş Bağlamı (`YOUNG_LEARNER` & `TEEN`):** Üniversite, iş hayatı, maaş, yetişkin yaşamı gibi `age-context.ts` yasaklı kelimeleri içermez. Tüm özel isimler metin içinde açıkça geçer (`unanchoredNames = 0`).
4. **Canlı (`ACTIVE`) IRT Parametreleri:**
   - `status: "ACTIVE"`, `pipelineStage: "LIVE"`, `isPretest: false`
   - `discrimination (a)`: `1.15 – 1.35`, `guessing (c)`: `0.25` (4 şıklı MC) / `0.10` (eşleştirme), `difficulty (b)`: CEFR norm tohumları (`PRE_A1: -2.1`, `A1: -1.4`, `A2: -0.6`, `B1: +0.2`, `B2: +1.0`).

---

## BÖLÜM 1: PRIMARY (7–10 Yaş) — 16 Soru (`PRE_A1`, `A1`, `A2`)

### 1.1 Primary `PRE_A1` (6 Soru — Kısa Metin / Mesaj / Hikâye, 25–45 Kelime)

#### [PRI-REA-PREA1-01] `SPECIFIC_INFORMATION` | `narrative` | `family` (`b = -2.20`)
> **Metin (Passage):**
> Hi! My name is Mia. I have a big brown dog and a small white cat. My brother Leo has a green bird in his room. Today we are looking for our yellow ball in the garden.
>
> **Soru (Question):** What colour is the cat?
- **A)** Brown *(Rationale: Brown describes Mia's big dog, not her cat.)*
- **B)** White ✅ *(Rationale: The text explicitly says Mia has a small white cat.)*
- **C)** Green *(Rationale: Green describes Leo's bird, not the cat.)*
- **D)** Yellow *(Rationale: Yellow describes the ball in the garden, not the cat.)*

---

#### [PRI-REA-PREA1-02] `SPECIFIC_INFORMATION` | `message` | `school` (`b = -2.15`)
> **Metin (Passage):**
> Look at Kenji's school desk. His blue pencil is next to the ruler. His red book is inside his bag, and his orange rubber is under the chair. His black pen is on the notebook.
>
> **Soru (Question):** Where is Kenji's red book?
- **A)** Next to the ruler *(Rationale: The blue pencil is next to the ruler, not the red book.)*
- **B)** Inside his bag ✅ *(Rationale: The text states that his red book is inside his bag.)*
- **C)** Under the chair *(Rationale: The orange rubber is under the chair, not the red book.)*
- **D)** On the notebook *(Rationale: The black pen is on the notebook, not the red book.)*

---

#### [PRI-REA-PREA1-03] `EXPLICIT_DETAIL` | `narrative` | `food` (`b = -2.10`)
> **Metin (Passage):**
> It is lunch time at home. Amara eats warm soup and bread. Her sister Hana does not want soup today; she eats pasta with cheese. Their dad drinks apple juice and eats a banana.
>
> **Soru (Question):** What does Hana eat for lunch?
- **A)** Soup and bread *(Rationale: Amara eats soup and bread, while Hana does not want soup.)*
- **B)** Pasta with cheese ✅ *(Rationale: The text says Hana eats pasta with cheese.)*
- **C)** Apple juice *(Rationale: Their dad drinks apple juice; Hana does not eat it.)*
- **D)** A banana *(Rationale: Their dad eats a banana, not Hana.)*

---

#### [PRI-REA-PREA1-04] `SPECIFIC_INFORMATION` | `notice` | `toys` (`b = -2.05`)
> **Metin (Passage):**
> Welcome to Toby's Toy Box! The toy train is on the top shelf. The teddy bear is in the big basket by the door. The red kite is behind the door, and the drum is on the mat.
>
> **Soru (Question):** What is in the big basket?
- **A)** The toy train *(Rationale: The toy train is on the top shelf, not in the basket.)*
- **B)** The teddy bear ✅ *(Rationale: The text states the teddy bear is in the big basket by the door.)*
- **C)** The red kite *(Rationale: The red kite is behind the door, not in the basket.)*
- **D)** The drum *(Rationale: The drum is on the mat, not in the basket.)*

---

#### [PRI-REA-PREA1-05] `SPECIFIC_INFORMATION` | `narrative` | `clothes` (`b = -2.00`)
> **Metin (Passage):**
> It is cold and sunny this morning. Omar puts on his purple coat and his grey boots. He leaves his yellow hat on the table and gives his green scarf to his sister Fatima.
>
> **Soru (Question):** What does Omar give to his sister?
- **A)** His purple coat *(Rationale: Omar puts on his purple coat himself.)*
- **B)** His grey boots *(Rationale: Omar puts on his grey boots himself.)*
- **C)** His yellow hat *(Rationale: Omar leaves his yellow hat on the table.)*
- **D)** His green scarf ✅ *(Rationale: The text says Omar gives his green scarf to his sister Fatima.)*

---

#### [PRI-REA-PREA1-06] `EXPLICIT_DETAIL` | `message` | `sports` (`b = -1.95`)
> **Metin (Passage):**
> In the park, four friends play games. Sofia rides her new bike on the path. Ravi kicks a football on the grass. Yuna flies a kite, and Dario sits on a bench and draws a tree.
>
> **Soru (Question):** Who is kicking a football?
- **A)** Sofia *(Rationale: Sofia is riding her new bike on the path.)*
- **B)** Ravi ✅ *(Rationale: The text explicitly says Ravi kicks a football on the grass.)*
- **C)** Yuna *(Rationale: Yuna is flying a kite in the park.)*
- **D)** Dario *(Rationale: Dario is sitting on a bench and drawing a tree.)*

---

#### [PRI-REA-PREA1-07] `SPECIFIC_INFORMATION` | `narrative` | `animals` (`b = -1.90`)
> **Metin (Passage):**
> At the zoo, Chidi sees four animals. The tall giraffe eats green leaves from a tree. The monkey holds a yellow banana. The hippo sleeps in the blue water, and the parrot sits on a brown branch.
>
> **Soru (Question):** Which animal is in the blue water?
- **A)** The giraffe *(Rationale: The giraffe is eating green leaves from a tree.)*
- **B)** The monkey *(Rationale: The monkey is holding a yellow banana.)*
- **C)** The hippo ✅ *(Rationale: The text states that the hippo sleeps in the blue water.)*
- **D)** The parrot *(Rationale: The parrot sits on a brown branch.)*

---

#### [PRI-REA-PREA1-08] `SPECIFIC_INFORMATION` | `message` | `home` (`b = -1.85`)
> **Metin (Passage):**
> Welcome to Yuki's house! Her red bike is in the garden. Her school bag is on the kitchen chair. Her green umbrella is by the front door, and her guitars are in the bedroom.
>
> **Soru (Question):** Where is Yuki's green umbrella?
- **A)** In the garden *(Rationale: Her red bike is in the garden, not the umbrella.)*
- **B)** On the kitchen chair *(Rationale: Her school bag is on the kitchen chair.)*
- **C)** By the front door ✅ *(Rationale: The text says her green umbrella is by the front door.)*
- **D)** In the bedroom *(Rationale: Her guitars are in the bedroom.)*

---

### 1.2 Primary `A1` (5 Soru — Tabela / Kısa Not / Hikâye, 45–70 Kelime)

#### [PRI-REA-A1-01] `SPECIFIC_INFORMATION` | `notice` | `school` (`b = -1.50`)
> **Metin (Passage):**
> **SCHOOL ART CLUB**
> Come and paint animals with Miss Rosa!
> We meet every Wednesday after lessons in Room 4.On Monday, Room 4 is for the Music Club, and on Friday it is for the Chess Club.
> Please bring an old shirt and a pencil. We have paper, brushes, and paint for everyone.
>
> **Soru (Question):** What do children need to bring to the Art Club?
- **A)** Brushes and paint *(Rationale: The notice says the club already has brushes and paint for everyone.)*
- **B)** White paper *(Rationale: The club provides paper for everyone.)*
- **C)** An old shirt and a pencil ✅ *(Rationale: The notice explicitly asks children to bring an old shirt and a pencil.)*
- **D)** A chess board *(Rationale: Chess Club meets on Friday; no chess board is requested for Art Club.)*

---

#### [PRI-REA-A1-02] `EXPLICIT_DETAIL` | `message` | `family` (`b = -1.40`)
> **Metin (Passage):**
> Hi Elias,
> Mum and I are at the supermarket now. Your grandma is coming to our house at four o'clock. Before three o'clock, please put your clean shoes in the cupboard and feed the fish in the living room. Don't water the garden plants because Dad watered them this morning.
> See you soon,
> Nadia
>
> **Soru (Question):** What must Elias do before three o'clock?
- **A)** Go to the supermarket *(Rationale: Mum and Nadia are already at the supermarket.)*
- **B)** Water the garden plants *(Rationale: Nadia tells him not to water the plants because Dad already did.)*
- **C)** Feed the fish in the living room ✅ *(Rationale: Nadia asks Elias to put his shoes away and feed the fish before three o'clock.)*
- **D)** Meet Grandma at the bus stop *(Rationale: The message only says Grandma is coming to the house at four o'clock.)*

---

#### [PRI-REA-A1-03] `SPECIFIC_INFORMATION` | `narrative` | `animals` (`b = -1.35`)
> **Metin (Passage):**
> Last Saturday, Priya went to Sunrise Farm with her cousin Kwame. First, they gave carrots to three grey donkeys. Then a farmer showed them five baby ducks by the pond. Kwame wanted to ride a brown horse, but it was sleeping in the barn, so they watched the sheep instead.
>
> **Soru (Question):** Why didn't Kwame ride the brown horse?
- **A)** It was eating carrots by the fence. *(Rationale: Priya and Kwame gave carrots to the grey donkeys, not the horse.)*
- **B)** It was swimming near the pond. *(Rationale: The baby ducks were by the pond, not the horse.)*
- **C)** It was sleeping in the barn. ✅ *(Rationale: The text states that Kwame wanted to ride the brown horse, but it was sleeping in the barn.)*
- **D)** It was running with the sheep. *(Rationale: They watched the sheep because the horse was sleeping.)*

---

#### [PRI-REA-A1-04] `EXPLICIT_DETAIL` | `notice` | `swimming pool` (`b = -1.30`)
> **Metin (Passage):**
> **SUNNY TOWN SWIMMING POOL**
> - Small pool (ages 5–8): Open 9:00 a.m. to 12:00 p.m.
> - Big pool (ages 9 and older): Open 10:00 a.m. to 4:00 p.m.
> - Everyone must wear a blue or yellow swim cap in the water.
> - Food and juice are only allowed at the picnic tables outside.
>
> **Soru (Question):** What rule must all swimmers follow at Sunny Town Swimming Pool?
- **A)** Arrive before nine o'clock in the morning. *(Rationale: The big pool opens at 10:00 a.m., and swimmers do not have to arrive before 9:00.)*
- **B)** Wear a swim cap when they are in the water. ✅ *(Rationale: The notice says everyone must wear a blue or yellow swim cap in the water.)*
- **C)** Swim in the small pool if they are nine years old. *(Rationale: Nine-year-olds use the big pool, while the small pool is for ages 5–8.)*
- **D)** Keep their food and juice next to the pool. *(Rationale: Food and juice are only allowed at the picnic tables outside.)*

---

#### [PRI-REA-A1-05] `SPECIFIC_INFORMATION` | `email` | `birthday party` (`b = -1.20`)
> **Metin (Passage):**
> Dear Soren,
> Thank you for inviting me to your birthday party on Sunday! My mum can drive me to your house at two o'clock, right after my swimming lesson finishes at one. I made a chocolate cake with strawberries for you because I know your brother doesn't like lemon cake.
> Best wishes,
> Leila
>
> **Soru (Question):** What is Leila bringing to Soren's birthday party?
- **A)** A lemon cake *(Rationale: Leila says Soren's brother doesn't like lemon cake, so she did not make that.)*
- **B)** A chocolate cake with strawberries ✅ *(Rationale: Leila writes that she made a chocolate cake with strawberries for Soren.)*
- **C)** A new swimming towel *(Rationale: She mentions her swimming lesson at one o'clock, not bringing a towel as a gift.)*
- **D)** A box of sandwiches *(Rationale: Sandwiches are never mentioned in the email.)*

---

### 1.3 Primary `A2` (5 Soru — Hikâye / E-posta / Duyuru, 70–105 Kelime)

#### [PRI-REA-A2-01] `EXPLICIT_DETAIL` | `narrative` | `school trip` (`b = -0.75`)
> **Metin (Passage):**
> Yesterday, Class 4B visited the City Science Museum. The teacher, Mr Jonas, told everyone to stay in pairs. Elif and Aiko went to the space room first because they wanted to see the moon rocks. However, the space room was closed until eleven o'clock for cleaning. Instead, they watched a short film about ocean animals and then built a small paper bridge in the invention corner. At eleven thirty, they finally saw the moon rocks before eating lunch on the bus.
>
> **Soru (Question):** What did Elif and Aiko do right after they found the space room closed?
- **A)** They ate their lunch on the school bus. *(Rationale: They ate lunch on the bus after seeing the moon rocks at 11:30.)*
- **B)** They built a small paper bridge in the invention corner. *(Rationale: They built the paper bridge after watching the film about ocean animals.)*
- **C)** They watched a short film about ocean animals. ✅ *(Rationale: The text says that instead of entering the closed space room, they watched a short film about ocean animals first and then built a bridge.)*
- **D)** They waited outside the space room door until eleven thirty. *(Rationale: They did not wait by the door; they went to watch a film and visit the invention corner.)*

---

#### [PRI-REA-A2-02] `CAUSE_EFFECT_INFERENCE` | `email` | `holidays` (`b = -0.65`)
> **Metin (Passage):**
> Hi Mateo,
> We arrived at Pine Lake Camp on Tuesday evening. Our cabin is right next to the forest, and we can hear owls at night! On Wednesday morning, we planned to go canoeing on the lake, but the wind was too strong and the water was rough. Our guide, Finn, took us on a forest treasure hunt with compasses instead. Today the weather is calm and sunny, so we are finally taking the canoes out after breakfast.
> Write soon,
> Zara
>
> **Soru (Question):** Why did Zara's group go on a forest treasure hunt on Wednesday morning?
- **A)** Because they lost their paddles near the cabin on Tuesday night. *(Rationale: Paddles are not mentioned; the change of plan was due to windy weather.)*
- **B)** Because strong wind made the lake unsafe for canoeing. ✅ *(Rationale: The email explains that the wind was too strong and the water was rough, so Finn took them on a treasure hunt instead.)*
- **C)** Because the guide wanted to teach them about owls in the forest. *(Rationale: Zara hears owls at night near the cabin, not during the Wednesday morning hunt.)*
- **D)** Because the canoes were only available after Thursday breakfast. *(Rationale: They planned to canoe on Wednesday, and only postponed it because of the wind.)*

---

#### [PRI-REA-A2-03] `SPECIFIC_INFORMATION` | `notice` | `school library` (`b = -0.60`)
> **Metin (Passage):**
> **GREENWOOD PRIMARY LIBRARY — SUMMER READING CHALLENGE**
> Read six books between 1 June and 15 July to win a gold star badge!
> - You can borrow up to two storybooks and one comic book at the same time.
> - Keep each book for up to ten days.
> - For every book you finish, write three sentences about your favourite character in your reading diary and show it to Mrs Esther at the front desk.
> - All books must come back to the library by Friday, 17 July.
>
> **Soru (Question):** How do students get credit for finishing a book in the challenge?
- **A)** By returning all six books on the same day in July. *(Rationale: Students borrow up to three books at a time and return everything by 17 July.)*
- **B)** By drawing a picture of the book cover for their classroom wall. *(Rationale: Drawing a book cover is not mentioned in the rules.)*
- **C)** By writing three sentences in their reading diary and showing Mrs Esther. ✅ *(Rationale: The notice states that for every book finished, students must write three sentences about their favourite character in their reading diary and show it to Mrs Esther.)*
- **D)** By reading two comic books and one storybook every ten days. *(Rationale: Students can borrow up to two storybooks and one comic book, not two comics.)*

---

#### [PRI-REA-A2-04] `MAIN_IDEA` | `narrative` | `gardening` (`b = -0.50`)
> **Metin (Passage):**
> In March, Kofi's grandfather gave him a small packet of sunflower seeds. Kofi planted them in four pots on his balcony and watered them every evening. After two weeks, tiny green leaves appeared, except in the fourth pot, which stood in the dark corner behind a box. Kofi moved that pot into the sunshine next to the others. By June, all four plants had tall stems and bright yellow flowers taller than Kofi's head.
>
> **Soru (Question):** What did Kofi learn from growing his sunflowers?
- **A)** Sunflower seeds only grow if you water them twice a day. *(Rationale: Kofi watered them once every evening, and they grew well.)*
- **B)** Young plants need sunlight as well as water to grow well. ✅ *(Rationale: The fourth pot did not sprout in the dark corner until Kofi moved it into the sunshine alongside the watered pots.)*
- **C)** Sunflowers grow much faster inside a dark room than on a balcony. *(Rationale: The pot in the dark corner did not grow until moved into the sun.)*
- **D)** Four seeds are too many to plant in the month of March. *(Rationale: All four seeds planted in March grew into tall flowers by June.)*

---

#### [PRI-REA-A2-05] `EXPLICIT_DETAIL` | `message` | `weekend` (`b = -0.45`)
> **Metin (Passage):**
> **Saturday Family Plan — From Mum**
> Morning: Grandpa is arriving by train at 10:15. Dad and Luca are meeting him at the station, while Ines helps me tidy the guest bedroom.
> Afternoon: We are all having lunch at Harbor Café at 12:30. If it doesn't rain at 2:30, we will walk to the botanical garden. If it rains, we will visit the indoor aquarium next to the harbour instead.
>
> **Soru (Question):** Who is going to the train station on Saturday morning?
- **A)** Mum and Ines *(Rationale: Mum and Ines are staying home to tidy the guest bedroom.)*
- **B)** Dad and Luca ✅ *(Rationale: The note clearly states that Dad and Luca are meeting Grandpa at the station.)*
- **C)** Ines and Luca *(Rationale: Luca goes with Dad to the station, while Ines helps Mum at home.)*
- **D)** Grandpa and Mum *(Rationale: Grandpa is arriving on the train, and Mum is tidying the guest room.)*

---

#### [PRI-REA-A2-06] `SPECIFIC_INFORMATION` | `notice` | `sports` (`b = -0.40`)
> **Metin (Passage):**
> **JUNIOR TENNIS DAY AT PARKSIDE COURTS**
> Saturday 20 June — For children aged 7 to 10!
> - 9:30 a.m.: Beginners' games on Court 1 with Coach Rosa.
> - 11:00 a.m.: Short matches on Court 2 for players who took lessons last term.
> - Please wear white sports shoes on the courts. If you do not have a tennis racket, you can borrow one for free at the blue tent near the gate. Bring your own water bottle!
>
> **Soru (Question):** Where can a child get a tennis racket on Junior Tennis Day?
- **A)** On Court 1 from Coach Rosa at 9:30 a.m. *(Rationale: Coach Rosa runs beginners' games on Court 1, not racket lending.)*
- **B)** On Court 2 after the short matches finish. *(Rationale: Court 2 is for 11:00 a.m. matches.)*
- **C)** At the blue tent near the gate. ✅ *(Rationale: The notice states that children without a racket can borrow one for free at the blue tent near the gate.)*
- **D)** At the sports shoe shop next to the park. *(Rationale: No shoe shop is mentioned in the notice.)*

---

#### [PRI-REA-A2-07] `EXPLICIT_DETAIL` | `narrative` | `school` (`b = -0.35`)
> **Metin (Passage):**
> On Friday afternoon, Class 3A made puppets for their puppet theatre show. Tariq wanted to make a green dragon, but there was no green cloth left in the art box. His friend Mei gave him a piece of silver paper, so Tariq made a shiny space robot instead. Meanwhile, Mei sewed a brown owl with big yellow eyes, and Daniel painted a cardboard castle for the stage background.
>
> **Soru (Question):** Why did Tariq make a space robot instead of a dragon?
- **A)** Because Daniel needed the dragon for the cardboard castle. *(Rationale: Daniel painted the castle background; he didn't use a dragon.)*
- **B)** Because all the green cloth in the art box was gone. ✅ *(Rationale: The text states there was no green cloth left in the art box, so he used silver paper from Mei to make a robot.)*
- **C)** Because Mei asked him to make a robot to go with her owl. *(Rationale: Mei gave him silver paper, and sewed a brown owl for herself.)*
- **D)** Because the teacher said dragons were too difficult to sew. *(Rationale: The teacher is not mentioned in the passage.)*

---

## BÖLÜM 2: SECONDARY / JUNIOR SUITE (11–14 Yaş) — 16 Soru (`A1`, `A2`, `B1`, `B2`)

### 2.1 Secondary / Junior `A1` (2 Soru — Okul Tabelası & Genç Mesajı, 50–70 Kelime)

#### [JUN-REA-A1-01] `SPECIFIC_INFORMATION` | `notice` | `school clubs` (`b = -1.35`)
> **Metin (Passage):**
> **AFTER-SCHOOL DRAMA CLUB**
> Do you want to act or help with stage lights for our winter play?
> First meeting: Thursday at 3:45 p.m. in the Main Hall.
> (Note: Room 12 is closed this week for painting.)
> Sign your name on the list outside Mr Rafael's classroom before Wednesday lunchtime. No acting experience needed!
>
> **Soru (Question):** What must students do before Wednesday lunchtime if they want to join?
- **A)** Go to Room 12 to meet Mr Rafael. *(Rationale: Room 12 is closed for painting, and the meeting is on Thursday in the Main Hall.)*
- **B)** Write their name on the list outside Mr Rafael's classroom. ✅ *(Rationale: The notice instructs students to sign their name on the list outside Mr Rafael's classroom before Wednesday lunchtime.)*
- **C)** Practise a short scene from the winter play. *(Rationale: The notice says no acting experience is needed and doesn't ask for a scene.)*
- **D)** Check the stage lights in the Main Hall. *(Rationale: Helping with stage lights is one of the club activities, not a registration requirement before Wednesday.)*

---

#### [JUN-REA-A1-02] `EXPLICIT_DETAIL` | `message` | `free time` (`b = -1.25`)
> **Metin (Passage):**
> Hey Selin,
> Are you still coming to the skate park at 4:30? Hiro and I are leaving the library at 4:00. My bike has a flat tyre, so we're taking the Number 7 bus instead of cycling. Can you bring your spare knee pads for Hiro? He remembered his helmet, but he left his pads at home.
> — Oskar
>
> **Soru (Question):** Why does Oskar ask Selin to bring knee pads?
- **A)** Because Oskar forgot both his helmet and his pads at the library. *(Rationale: It is Hiro who left his pads at home, and Hiro remembered his helmet.)*
- **B)** Because Hiro left his own knee pads at home. ✅ *(Rationale: Oskar writes that Hiro remembered his helmet, but left his knee pads at home.)*
- **C)** Because Selin needs them to ride Oskar's bicycle. *(Rationale: Oskar's bike has a flat tyre, so they are taking the bus.)*
- **D)** Because the skate park sells helmets but not knee pads. *(Rationale: Buying gear at the skate park is never mentioned.)*

---

### 2.2 Secondary / Junior `A2` (5 Soru — E-posta / Duyuru / Mesaj, 75–110 Kelime)

#### [JUN-REA-A2-01] `SPECIFIC_INFORMATION` | `notice` | `the library` (`b = -0.70`)
> **Metin (Passage):**
> **OAKRIDGE SECONDARY LIBRARY — EXAM WEEK HOURS**
> From Monday 12 May to Friday 16 May, the library will stay open until 5:30 p.m. instead of closing at 4:00 p.m.
> - **Quiet Study Area (Upstairs):** For individual homework only. No talking or group projects.
> - **Computer Tables (Downstairs):** Open for group science presentations until 4:30 p.m. After 4:30 p.m., computers are reserved for printing study notes.
> - Please show your student card at the desk if you stay after 4:00 p.m.
>
> **Soru (Question):** What changes downstairs in the library after 4:30 p.m. during exam week?
- **A)** Students can start working on group science presentations. *(Rationale: Group science presentations are allowed until 4:30 p.m., not after.)*
- **B)** The downstairs area closes while the upstairs stays open. *(Rationale: The entire library stays open until 5:30 p.m.)*
- **C)** The computers can only be used for printing study notes. ✅ *(Rationale: The notice states that after 4:30 p.m., computers downstairs are reserved for printing study notes.)*
- **D)** Students no longer need to show their student cards at the desk. *(Rationale: Anyone staying after 4:00 p.m. must show their student card.)*

---

#### [JUN-REA-A2-02] `EXPLICIT_DETAIL` | `email` | `sport` (`b = -0.60`)
> **Metin (Passage):**
> Subject: Saturday Inter-School Swimming Meet
> Dear Team,
> Please arrive at Northside Sports Centre by 8:15 a.m. this Saturday. Our coach, Ms Ingrid, will hand out team caps at the entrance before warm-up starts at 8:30. Remember that the main car park is closed for a weekend market, so ask your parents to drop you off on Elm Street behind the tennis courts. Also, pack a warm tracksuit because the spectator benches are quite cool between races.
> — Thandi (Team Captain)
>
> **Soru (Question):** Why should swimmers be dropped off on Elm Street on Saturday?
- **A)** Because the entrance near the tennis courts opens earlier than the main door. *(Rationale: Opening times of different doors are not mentioned.)*
- **B)** Because the main car park is being used for a weekend market. ✅ *(Rationale: The email explicitly states that the main car park is closed for a weekend market.)*
- **C)** Because Ms Ingrid is giving out team caps behind the tennis courts. *(Rationale: Ms Ingrid will hand out caps at the entrance of the sports centre.)*
- **D)** Because warm-up races are taking place on Elm Street at 8:15 a.m. *(Rationale: Warm-up starts in the pool at 8:30 a.m.)*

---

#### [JUN-REA-A2-03] `INFERENCE` | `message` | `school band` (`b = -0.55`)
> **Metin (Passage):**
> **Band Group Chat — Message from Arnav:**
> "Everyone, Mr Tobias just told me the music room has a leaky roof after last night's storm, so the caretakers are fixing it this afternoon. Don't pack up your instruments yet, though! Mrs Mei says we can use the small gym from 3:30 to 4:45 as long as we carry the drum kit back to the storage cupboard before the basketball team arrives at 5:00."
>
> **Soru (Question):** Why is Arnav sending this message to the band members?
- **A)** To cancel today's band rehearsal until the roof is repaired next week. *(Rationale: He tells them not to pack up because rehearsal is still happening in another room.)*
- **B)** To let them know rehearsal is moving to the small gym today. ✅ *(Rationale: Because the music room roof is being fixed, he informs them they will rehearse in the small gym from 3:30 to 4:45.)*
- **C)** To ask who can stay after 5:00 p.m. to play basketball with the team. *(Rationale: They must clear out before the basketball team arrives at 5:00.)*
- **D)** To remind them to leave the drum kit in the music room during the storm. *(Rationale: The storm was last night, and the drum kit must be put in the storage cupboard after rehearsal.)*

---

#### [JUN-REA-A2-04] `EXPLICIT_DETAIL` | `email` | `holidays` (`b = -0.50`)
> **Metin (Passage):**
> Hi Amina,
> My family and I are spending three days in York with my uncle Santiago. On our first day, we walked along the old city walls in the morning. My brother Emeka wanted to visit the Railway Museum right after lunch, but the queue outside was enormous. Instead, Uncle Santiago took us on a river boat tour, and we booked museum tickets online for tomorrow at 9:30 a.m. so we can go straight in when it opens!
> See you on Monday,
> Noor
>
> **Soru (Question):** How did Noor's family solve the problem at the Railway Museum?
- **A)** They waited in the long queue for two hours after lunch. *(Rationale: They did not wait in the queue; they went on a river boat tour instead.)*
- **B)** They decided to walk along the old city walls instead of visiting it. *(Rationale: They walked along the city walls in the morning, before going to the museum.)*
- **C)** They went on a boat tour and booked early morning tickets online for the next day. ✅ *(Rationale: Because the queue was huge, they took a river boat tour and booked online tickets for 9:30 a.m. tomorrow.)*
- **D)** They asked Uncle Santiago to drive them to a smaller museum outside York. *(Rationale: They still plan to visit the Railway Museum the next morning.)*

---

#### [JUN-REA-A2-05] `TEXT_FUNCTION` | `notice` | `neighborhood market` (`b = -0.40`)
> **Metin (Passage):**
> **YEAR 8 REPAIR & SWAP FAIR — THIS SATURDAY!**
> Have you got board games with missing pieces, or a bicycle lamp that needs a new wire? Bring them to the school courtyard between 10:00 and 1:00!
> - **Table A (Science Club):** Simple electronics & bike light repairs.
> - **Table B (Art Club):** Sewing torn backpacks and decorating cloth bags.
> - **Table C (Swap Zone):** Trade books and puzzles you have already finished for a different one (up to 3 items per student).
>
> **Soru (Question):** Which table should a student visit if the strap on their school bag is broken?
- **A)** Table A, before 10:00 a.m. *(Rationale: Table A repairs electronics and bike lights, and the fair starts at 10:00.)*
- **B)** Table B, where the Art Club repairs backpacks. ✅ *(Rationale: Table B handles sewing torn backpacks and decorating cloth bags.)*
- **C)** Table C, to exchange it for three new textbooks. *(Rationale: Table C is for trading books and puzzles, not school bags.)*
- **D)** Both Table A and Table C at 1:00 p.m. *(Rationale: Neither Table A nor Table C repairs torn backpacks.)*

---

### 2.3 Secondary / Junior `B1` (4 Soru — Makale / Blog / İnceleme, 125–170 Kelime)

#### [JUN-REA-B1-01] `EXPLICIT_DETAIL` | `article` | `hobbies` (`b = 0.15`)
> **Metin (Passage):**
> **Why Our School Started a Seed Library**
> *By Marcus, Year 9 Student Reporter*
> Two years ago, our biology teacher, Ms Ayesha, noticed that half the vegetable beds behind the school gym were empty. Many students wanted to try growing food at home, too, but packets of seeds at the garden centre cost more than they expected, and each packet contained far more seeds than one family could use on a small balcony.
>
> Last autumn, our Eco-Club built a wooden cabinet near the main entrance and filled it with small paper envelopes. Each envelope holds just ten seeds — such as cherry tomatoes, basil, or dwarf beans — donated by local gardeners. Students take an envelope for free in spring. In return, when their plants produce vegetables in late summer, they dry a few seeds from their best plant and bring them back to the cabinet for next year's students.
>
> **Soru (Question):** According to Marcus, why were commercially sold seed packets unsuitable for many students?
- **A)** They only contained vegetables that needed a large school greenhouse. *(Rationale: The article mentions small balconies and vegetable beds behind the gym, not greenhouses.)*
- **B)** They were expensive and held more seeds than one household needed. ✅ *(Rationale: The first paragraph explains that seed packets cost more than students expected and contained far more seeds than one family could use.)*
- **C)** Local garden centres refused to sell seeds to students under fourteen. *(Rationale: Age restrictions at garden centres are never mentioned.)*
- **D)** The seeds from garden centres could not be dried and saved for the following year. *(Rationale: Saving seeds is how the school seed library works, not a flaw of commercial seeds.)*

---

#### [JUN-REA-B1-02] `CAUSE_EFFECT_INFERENCE` | `blog` | `cooking` (`b = 0.20`)
> **Metin (Passage):**
> **My First Term in Teen Kitchen Club — By Lena**
> When I signed up for the Thursday cooking class, I hoped we would bake fancy three-layer cakes every week. During the first month, however, Chef Tariq didn't let us touch the ovens at all. We spent four sessions learning how to chop onions safely, measure spices accurately, and prepare simple vegetable stir-fries in a single pan. I privately thought it was dull and almost quit in week three to join the photography club with my friend Chidi.
>
> Looking back now, I'm glad I stayed. Last weekend, my parents came home late from visiting my aunt, and I managed to cook a hot vegetable curry for the whole family in twenty-five minutes without burning anything or making a mess. Even my older brother Daniel asked for a second bowl!
>
> **Soru (Question):** What made Lena change her mind about Chef Tariq's early lessons?
- **A)** Chef Tariq finally allowed the class to bake three-layer cakes in week four. *(Rationale: She says they spent the first four sessions on chopping, spices, and stir-fries, not baking cakes.)*
- **B)** Her friend Chidi told her that the photography club was much more difficult. *(Rationale: Chidi is only mentioned as being in the photography club; he says nothing about its difficulty.)*
- **C)** She realised those basic skills enabled her to cook a real meal for her family at home. ✅ *(Rationale: In the second paragraph, she says she is glad she stayed because she successfully cooked a hot vegetable curry for her family in 25 minutes.)*
- **D)** Her brother Daniel promised to wash the dishes whenever she cooked dinner. *(Rationale: Daniel asked for a second bowl of curry, not to wash the dishes.)*

---

#### [JUN-REA-B1-03] `INFERENCE` | `article` | `animals` (`b = 0.25`)
> **Metin (Passage):**
> **Tracking Urban Hedgehogs**
> Every May, volunteers from Hillside Youth Nature Group help wildlife biologists count hedgehogs in town parks. Because hedgehogs look for beetles and worms after dark, searching for them with torches rarely works well and often frightens the animals into hiding under thick bushes.
>
> Instead, the teenagers place low plastic tunnels along wooden fences in the evening. Inside each tunnel, they put a small dish of meat-flavoured pet food between two strips of harmless vegetable charcoal and white paper tape. When a hedgehog walks through the tunnel to eat, its paws step on the charcoal and leave clear footprints on the paper strips. By checking the tunnels at dawn, students can tell whether hedgehogs visited an area without ever disturbing them.
>
> **Soru (Question):** Why do the youth volunteers use footprint tunnels rather than torches to survey hedgehogs?
- **A)** Torches attract beetles and worms away from the park paths at night. *(Rationale: Hedgehogs eat beetles and worms after dark; torches do not lure insects away.)*
- **B)** Tunnels allow the team to detect hedgehogs at night without scaring them away. ✅ *(Rationale: The text states that searching with torches rarely works and frightens the animals into hiding, whereas tunnels record footprints without disturbing them.)*
- **C)** Biologists do not allow students under fifteen to enter town parks after sunset. *(Rationale: The teenagers place the tunnels in the evening and check them at dawn; no age ban is mentioned.)*
- **D)** Charcoal footprints show the exact age and weight of every hedgehog in the park. *(Rationale: The text only says the footprints tell whether hedgehogs visited an area.)*

---

#### [JUN-REA-B1-04] `WRITER_ATTITUDE` | `review` | `science fair` (`b = 0.35`)
> **Metin (Passage):**
> **Review: The Interactive Sound Exhibition at the City Museum**
> *By Tobias, Age 13*
> Most museum exhibitions I have visited with my school consist of glass cases and long printed labels that nobody finishes reading. The new *Waves & Voices* exhibition on the second floor of the City Museum is a refreshing exception. From the moment you walk through the entrance tunnel, you are encouraged to tap giant metal tubes, whisper across curved dishes twenty metres apart, and watch coloured sand jump into geometric patterns on a vibrating speaker plate.
>
> My only complaint is that the headphone stations in the final room were placed too close to the giant drum experiment, making it hard to hear the quiet whale recordings when a large school group was in the hall. Apart from that minor layout flaw, it is easily the best way to spend a rainy Saturday afternoon.
>
> **Soru (Question):** What is Tobias's overall opinion of the *Waves & Voices* exhibition?
- **A)** He thinks it has too many long printed labels compared with other museums. *(Rationale: He contrasts this exhibition favourably against typical museums that have glass cases and long labels.)*
- **B)** He is enthusiastic about its hands-on activities despite one noisy area. ✅ *(Rationale: He calls it a refreshing exception full of interactive experiments and complains only that the headphone stations were too close to the giant drum.)*
- **C)** He believes the museum should replace the giant drum experiment with more whale recordings. *(Rationale: He critiques the placement/distance between the stations, not the drum experiment itself.)*
- **D)** He recommends visiting only on weekdays when school groups are not allowed inside. *(Rationale: He explicitly calls it the best way to spend a rainy Saturday afternoon.)*

---

### 2.4 Secondary / Junior `B2` (5 Soru — Görüş Yazısı / İnceleme / Makale + Çoklu Eşleştirme, 175–230 Kelime)

#### [JUN-REA-B2-01] `WRITER_ATTITUDE` | `review` | `films and books` (`b = 0.90`)
> **Metin (Passage):**
> **Book Review: *The Compass Maker's Apprentice* by H. V. Lindqvist**
> *Reviewed by Malia, Year 10*
> Many historical adventure novels written for young readers make the mistake of treating the past merely as a costume drama: characters wear cloaks and travel by horse, yet they think and speak exactly like twenty-first-century teenagers. To Lindqvist's credit, *The Compass Maker's Apprentice* avoids this trap entirely. Set in a windswept Baltic port in 1740, the story follows fourteen-year-old Soren as he learns to grind lenses and magnetise needles for sea captains. The technical details of navigation never feel like a history lesson pasted onto the page; instead, they drive the suspense when a forged sea chart puts his sister's ship in danger.
>
> Where the novel falters slightly is in its final fifty pages. After building tension patiently for ten chapters, Lindqvist resolves the harbour mystery with an implausible coincidence involving an overheard conversation at a bakery. Even so, the vivid sense of place makes the book hard to put down.
>
> **Soru (Question):** What does Malia praise most about Lindqvist's writing in *The Compass Maker's Apprentice*?
- **A)** How the author uses modern teenage dialogue to make the 1740 setting easy to understand. *(Rationale: Malia criticises other novels for doing that and praises Lindqvist for avoiding that trap.)*
- **B)** The way historical craftsmanship is woven naturally into the plot's tension. ✅ *(Rationale: Malia notes that the technical details of navigation never feel pasted on, but instead drive the suspense of the story.)*
- **C)** The clever twist at the bakery that solves the harbour mystery in the final chapters. *(Rationale: She criticises the bakery coincidence in the final fifty pages as implausible.)*
- **D)** The detailed maps of Baltic sea routes printed at the start of every chapter. *(Rationale: A forged sea chart is part of the story, not chapter illustrations.)*

---

#### [JUN-REA-B2-02] `INFERENCE` | `blog` | `technology` (`b = 0.95`)
> **Metin (Passage):**
> **What Happened When Our Coding Club Tried an "Analogue Week"**
> *By Kenji, Coding Club President*
> When our mentor, Ms Rosa, challenged our twelve-member coding club to design our next puzzle game without touching a keyboard for five days, half the room groaned. Usually, we open our laptops the minute we sit down and begin tweaking colours or animations before we have even agreed on what the player is supposed to achieve.
>
> Armed only with index cards, coloured markers, and dice, we were forced to simulate every rule by hand across a classroom table. By Wednesday, something unexpected happened: we discovered three major flaws in our scoring system that would normally have taken us weeks of programming to notice. Because redrawing a paper card takes ten seconds, nobody felt defensive about throwing away a bad idea. When we finally opened our laptops the following Monday, we wrote cleaner code in two afternoons than we typically produce in a month.
>
> **Soru (Question):** What can be inferred about why the paper-card phase made the students more willing to discard weak ideas?
- **A)** Ms Rosa awarded extra points to teams that threw away the largest number of index cards. *(Rationale: No points or competition from Ms Rosa are mentioned.)*
- **B)** Students had invested very little time in creating each paper prototype compared with coding it. ✅ *(Rationale: Kenji notes that "because redrawing a paper card takes ten seconds, nobody felt defensive about throwing away a bad idea," unlike when they spend weeks programming.)*
- **C)** The twelve members voted anonymously on each card so nobody knew whose idea was rejected. *(Rationale: Anonymous voting is never mentioned in the text.)*
- **D)** The game's graphics and animations were already finished before the five-day challenge began. *(Rationale: They had not touched their laptops for this new game before the five-day challenge.)*

---

#### [JUN-REA-B2-03] `STANCE` | `opinion` | `homework` (`b = 1.05`)
> **Metin (Passage):**
> **Should Schools Replace Daily Homework with Longer Term Projects?**
> *Opinion Column — By Elif, School Newspaper Editor*
> Whenever the debate over homework resurfaces at student council meetings, the choices are usually framed as two extremes: either keep the nightly stream of twenty-minute worksheets, or abolish take-home tasks altogether. Both positions miss the real issue. Short reinforcement exercises have genuine value in subjects like mathematics or foreign languages, where practising a new structure the same evening helps lock it into memory.
>
> The problem arises when six different teachers assign short tasks on the same Tuesday, leaving students switching rapidly between surface-level checklists without ever exploring a topic in depth. A far more sensible reform would be to keep brief practice in skill-based subjects while replacing routine worksheets in history, science, and literature with a single, well-guided inquiry project every three weeks. That way, independent study becomes a chance to think deeply rather than a nightly race against the clock.
>
> **Soru (Question):** Which statement best summarises Elif's position on school homework?
- **A)** All nightly homework should be abolished so students have more time for student council activities. *(Rationale: Elif explicitly rejects abolishing homework altogether as an extreme that misses the real issue.)*
- **B)** Homework format should match the subject, combining short skill practice with periodic deep projects. ✅ *(Rationale: She argues for keeping brief practice in skill-based subjects like maths/languages while replacing routine worksheets in history/science/literature with three-week inquiry projects.)*
- **C)** Mathematics and language teachers should switch from daily exercises to three-week group essays. *(Rationale: She specifically defends short nightly exercises in mathematics and foreign languages.)*
- **D)** Teachers should assign worksheets only on Tuesdays so the rest of the week remains free. *(Rationale: She cites Tuesday as an example of when six uncoordinated tasks pile up, not as a proposal.)*

---

#### [JUN-REA-B2-04] `MEANING_FROM_CONTEXT` | `article` | `environment` (`b = 1.10`)
> **Metin (Passage):**
> **The Quiet Return of Night-Sky Reserves**
> For decades, installing brighter street lamps was seen as an unmistakable sign of civic progress. Yet astronomers and ecologists have long pointed out that poorly shielded lights scatter much of their glare upwards into the clouds rather than onto the pavement below. This artificial glow disrupts nocturnal insects, confuses migrating songbirds, and washes out all but the brightest stars for young stargazers.
>
> Recently, however, several coastal towns have proven that dark skies and public safety do not have to be at odds. By fitting warm-toned LED fixtures with simple metal hoods that direct light strictly downwards — and dimming park lamps late at night when paths are empty — these towns have cut energy bills by a third while restoring a clear view of the Milky Way within months.
>
> **Soru (Question):** In the second paragraph, what does the writer mean by saying that dark skies and public safety "do not have to be at odds"?
- **A)** Towns must choose carefully between protecting migrating birds and lighting pavements at night. *(Rationale: The writer argues the opposite—that towns do not have to choose one at the expense of the other.)*
- **B)** Protecting the night sky and keeping streets safe can be achieved at the same time. ✅ *(Rationale: "At odds" means in conflict; the paragraph explains how downward-hooded warm LEDs keep pavements lit safely while restoring a clear view of the Milky Way.)*
- **C)** Coastal towns have much lower crime rates than inland cities with bright street lamps. *(Rationale: Crime rates between coastal and inland towns are never compared.)*
- **D)** Astronomers and town engineers still disagree strongly about the cost of LED hoods. *(Rationale: The paragraph shows that the solution succeeded and even cut energy bills by a third.)*

---

#### [JUN-REA-B2-05] `SYNTHESIS` (`DRAG_DROP` / `MATCHING`) | `article` | `science` (`b = 1.15`, `c = 0.10`)
> **Metin (Passage — Four Teenagers Talk About Their Science Fair Projects):**
> - **Speaker A — Dario:** "I built a solar-powered water heater out of black garden hose and an old window frame. At first I expected the afternoon sun to give the highest temperature, but my sensor logs showed that wind speed cooled the glass far more than cloud cover did. Shielding the box from the breeze doubled its efficiency."
> - **Speaker B — Yuna:** "My partner and I tested whether background music helps Year 7 students memorise vocabulary lists. The hardest part wasn't running the memory tests — it was making sure all three groups studied in rooms with identical lighting and time of day so our results would actually be fair."
> - **Speaker C — Kwame:** "I wanted to compare biodegradable plant pots made from pressed oat husks with standard plastic ones. Halfway through the six-week trial, two of my oat pots cracked because I watered them from above instead of using a tray underneath. That mistake actually gave me my best finding about how the material behaves."
> - **Speaker D — Ingrid:** "I programmed a simple microphone sensor to measure noise levels in our school canteen. Everyone assumed Mondays were the loudest, yet the data clearly showed that rainy days — when nobody could go outside after eating — pushed the decibel average up by nearly forty percent."
>
> **Görev (Task — Matching / `DRAG_DROP`):** Match each student (`0–3`) with what they discovered or experienced (`A–F`, 2 extra distractors).
- **Drop Zones (`dropZones`):**
  - `0`: **Dario** → **`2` (An environmental factor other than sunlight had the biggest effect on performance)**
  - `1`: **Yuna** → **`4` (Controlling external conditions across test groups was the main challenge)**
  - `2`: **Kwame** → **`0` (An accidental procedural error led to the most useful observation)**
  - `3`: **Ingrid** → **`5` (Weather conditions indoors/outdoors disproved a popular assumption about noise)**
- **Draggable Options (`draggableItems` — 6 options for 4 zones):**
  - `0`: An accidental procedural error led to the most useful observation. *(Matches Kwame)*
  - `1`: Expensive laboratory sensors broke down halfway through the six-week experiment. *(Distractor — Kwame's oat pots cracked, not lab sensors)*
  - `2`: An environmental factor other than sunlight had the biggest effect on performance. *(Matches Dario)*
  - `3`: Students remembered more words when they listened to fast instrumental music. *(Distractor — Yuna talks about controlling room conditions, not fast music winning)*
  - `4`: Controlling external conditions across test groups was the main challenge. *(Matches Yuna)*
  - `5`: Weather conditions disproved a popular assumption about which days were loudest. *(Matches Ingrid)*

---

#### [JUN-REA-B2-06] `CAUSE_EFFECT_INFERENCE` | `article` | `nature` (`b = 1.18`)
> **Metin (Passage):**
> **Why Rewinding a River Helps Prevent Flooding Downstream**
> In the nineteenth century, engineers straightened dozens of winding streams across northern valleys so that rainwater would rush out of farmland as quickly as possible. While those concrete-lined channels kept upper fields dry after moderate showers, they created an unforeseen hazard for towns further down the valley: during heavy autumn storms, all the water arrived at the town bridges at the exact same moment.
>
> Over the past five years, youth conservation volunteers and hydrologists have helped restore several streams to their original curving paths. By re-establishing shallow bends, pebble banks, and marshy meadows alongside the water, the restoration slows the current down and lets excess rain spread harmlessly across uninhabited grassland for a few hours. Early monitoring shows that peak water levels at downstream bridges have dropped by almost a quarter during major storms.
>
> **Soru (Question):** Why did nineteenth-century river straightening increase flood risk for downstream towns?
- **A)** Concrete channels blocked rainwater from leaving the upper farmland after moderate showers. *(Rationale: The channels drained the upper fields quickly; they did not block rainwater there.)*
- **B)** Straight channels forced storm water from the whole valley to reach town bridges simultaneously. ✅ *(Rationale: The first paragraph explains that straightening caused all the storm water to arrive at downstream town bridges at the exact same moment.)*
- **C)** Pebble banks and marshy meadows built in the nineteenth century collapsed during autumn storms. *(Rationale: Pebble banks and meadows are part of the modern restoration, not nineteenth-century engineering.)*
- **D)** Towns built new bridges that were a quarter narrower than the original river channels. *(Rationale: Peak water levels dropped by a quarter after restoration; bridge width is not mentioned.)*

---

#### [JUN-REA-B2-07] `IMPLIED_MEANING` | `review` | `music` (`b = 1.22`)
> **Metin (Passage):**
> **Concert Review: The Regional Youth Orchestra at Civic Hall**
> *By Nadia, Year 10 Music Columnist*
> Performing film soundtracks live is trickier than it looks: because audiences already know every melody by heart from the cinema, even a slight hesitation in tempo stands out immediately. Rather than playing it safe with a predictable programme of blockbuster themes, conductor MrJonas and the sixty teenagers of the Regional Youth Orchestra opened Saturday's concert with three lesser-known suites for strings and percussion from animated short films.
>
> That bold choice paid off handsomely. Freed from the pressure of imitating famous recordings note for note, the percussion section played with infectious energy, and fourteen-year-old flautist Aiko delivered a solo of remarkable warmth in the second piece. Only in the final encore — a well-known space-adventure march added at the last minute — did the brass section sound slightly hurried, a minor blemish on an otherwise memorable evening.
>
> **Soru (Question):** What does Nadia suggest was the main advantage of opening the concert with lesser-known film suites?
- **A)** The sixty musicians had not had enough rehearsal time to learn famous blockbuster themes. *(Rationale: Only the final encore was added at the last minute; the opening suites were a deliberate artistic choice.)*
- **B)** The orchestra could play more expressively because listeners were not comparing every bar to a familiar recording. ✅ *(Rationale: Nadia notes that audiences know famous soundtracks by heart, and opening with lesser-known suites freed the players from the pressure of imitating famous recordings note for note.)*
- **C)** Short animated film suites do not require a brass section or a conductor on stage. *(Rationale: Mr Jonas conducted the orchestra, and the brass section was present.)*
- **D)** The audience in Civic Hall preferred space-adventure marches to string and percussion music. *(Rationale: Nadia praises the string and percussion suites and notes the space-adventure march was the only piece that sounded hurried.)*

