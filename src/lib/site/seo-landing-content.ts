/**
 * Long-form content for the SEO landing pages (SeoLandingPage). Kept as data
 * so the server can publish the same FAQ as FAQPage structured data.
 *
 * Every product statement here must match what the product does today:
 * - Quick Check: free, adaptive, about 20–30 minutes, 12–24 questions across
 *   six skill areas, no account needed; open writing and speaking answers are
 *   not scored; result is a
 *   provisional CEFR estimate with a range and a skill breakdown.
 * - Full Assessment: reading, listening, writing and speaking, about 45–60
 *   minutes, skill report and QR-verifiable certificate. Individual paid
 *   checkout is not offered on the website; candidates take it through an
 *   institution (exam code).
 * - No validated concordance with IELTS/TOEFL/Cambridge is claimed.
 */
import type { SeoVariant } from "../../components/SeoLandingPage";

export interface LandingSection {
  heading: string;
  paragraphs?: string[];
  steps?: { title: string; text: string }[];
  bullets?: string[];
}

export interface LandingContent {
  lang: "en" | "tr";
  /** Direct answer under the hero: what this page offers, in two or three sentences. */
  intro: string;
  sections: LandingSection[];
  /** Optional comparison table: header row then rows. */
  table?: { caption: string; head: string[]; rows: string[][] };
  faq: { q: string; a: string }[];
  /** Heading for the CEFR level links strip. */
  levelsHeading: string;
  levelsText: string;
}

const QUICK_VS_FULL_EN = {
  caption: "Quick Check compared with the Full Assessment",
  head: ["", "Quick Check", "Full Assessment"],
  rows: [
    ["Cost", "Free", "Through your school, university or employer"],
    ["Time", "About 20–30 minutes", "About 45–60 minutes"],
    ["Skills scored", "Six skill areas, objective questions only; open writing and speaking answers are not scored", "Reading, listening, writing and speaking, including open answers"],
    ["Result", "Provisional CEFR estimate with a range and skill breakdown", "CEFR level, skill report and QR-verifiable certificate"],
    ["Account", "Not required", "Exam code from your institution"],
  ],
};

export const LANDING_CONTENT: Record<SeoVariant, LandingContent> = {
  "english-level-test": {
    lang: "en",
    intro:
      "The b4skills Quick Check is a free online English level test. It adapts to your answers, takes about 20–30 minutes and gives you a provisional CEFR level from A1 to C2, with a skill breakdown — no account needed.",
    sections: [
      {
        heading: "How the free English level test works",
        steps: [
          { title: "Start straight away", text: "Begin as a guest or leave your name and email if you want the result sent to you. There is nothing to install." },
          { title: "Answer 12–24 adaptive questions", text: "Each answer changes the next question: a correct answer brings a harder one, a wrong answer an easier one. This is why the test can be short and still cover A1 to C2." },
          { title: "See your provisional level", text: "Your result shows an estimated CEFR level, the range it most likely falls in, and how you did in each skill area." },
        ],
      },
      {
        heading: "What the result tells you",
        paragraphs: [
          "Adaptive tests estimate ability from the pattern of answers, not from a percentage of correct questions. Two people can answer the same number of questions correctly and still get different levels, because they answered questions of different difficulty.",
          "Because the Quick Check is short, the result is a provisional estimate with a range around it. It is useful for choosing a course, setting a learning goal or deciding whether you are ready for a full assessment. It is not an official qualification such as IELTS or Cambridge.",
        ],
      },
      {
        heading: "Which skills are tested",
        bullets: [
          "Grammar and vocabulary: how accurately and widely you use English structures and words.",
          "Reading: understanding short texts, from notices to opinion pieces.",
          "Listening: understanding short recordings at natural speed.",
          "Writing and speaking appear only as objective questions; open written or spoken answers are not scored in the Quick Check. The Full Assessment scores all four skills, including open answers.",
        ],
      },
    ],
    table: QUICK_VS_FULL_EN,
    faq: [
      { q: "Is the English level test really free?", a: "Yes. The Quick Check is free and does not need an account. You can leave your email if you want the result sent to you." },
      { q: "How accurate is a 20–30 minute test?", a: "Adaptive testing makes short tests efficient, but a shorter test always has more uncertainty. That is why the Quick Check shows a range around your estimated level and calls it provisional." },
      { q: "Can I use the result for a university or job application?", a: "The Quick Check result is for your own guidance. If an institution needs proof of English, check which tests it accepts; some institutions use the b4skills Full Assessment, others require IELTS, TOEFL or Cambridge." },
      { q: "Can I take the test again?", a: "Yes. Because questions are chosen adaptively from a large bank, a retake is unlikely to show you the same questions." },
    ],
    levelsHeading: "What do the CEFR levels mean?",
    levelsText: "Read what learners can do at each level before or after you take the test.",
  },
  "ingilizce-seviye-testi": {
    lang: "tr",
    intro:
      "b4skills Quick Check ücretsiz bir online İngilizce seviye testidir. Sorular cevaplarınıza göre değişir; test yaklaşık 20–30 dakika sürer ve size A1'den C2'ye geçici bir CEFR seviyesi ile beceri dağılımınızı gösterir. Hesap açmanız gerekmez.",
    sections: [
      {
        heading: "Ücretsiz İngilizce seviye testi nasıl işler?",
        steps: [
          { title: "Hemen başlayın", text: "Misafir olarak başlayabilir ya da sonucun size gönderilmesi için adınızı ve e-postanızı bırakabilirsiniz. Herhangi bir şey yüklemeniz gerekmez." },
          { title: "12–24 adaptif soruyu yanıtlayın", text: "Her cevap bir sonraki soruyu belirler: doğru cevaptan sonra daha zor, yanlış cevaptan sonra daha kolay bir soru gelir. Bu sayede test kısa kalır ama A1'den C2'ye kadar tüm seviyeleri kapsar." },
          { title: "Geçici seviyenizi görün", text: "Sonuç ekranında tahmini CEFR seviyeniz, seviyenizin büyük olasılıkla bulunduğu aralık ve her beceri alanındaki performansınız yer alır." },
        ],
      },
      {
        heading: "Sonuç size ne söyler?",
        paragraphs: [
          "Adaptif testler seviyeyi doğru cevap yüzdesine göre değil, cevapların örüntüsüne göre tahmin eder. Aynı sayıda soruyu doğru yanıtlayan iki kişi, farklı zorluktaki sorularla karşılaştıkları için farklı seviyeler alabilir.",
          "Quick Check kısa bir test olduğu için sonuç, çevresinde bir aralık bulunan geçici bir tahmindir. Kurs seçmek, öğrenme hedefi belirlemek ya da tam değerlendirmeye hazır olup olmadığınızı anlamak için kullanışlıdır. IELTS veya Cambridge gibi resmi bir yeterlilik belgesi değildir.",
        ],
      },
      {
        heading: "Hangi beceriler ölçülür?",
        bullets: [
          "Dilbilgisi ve kelime: İngilizce yapıları ve kelimeleri ne kadar doğru ve geniş kullandığınız.",
          "Okuma: duyurulardan görüş yazılarına kadar kısa metinleri anlama.",
          "Dinleme: doğal hızdaki kısa kayıtları anlama.",
          "Yazma ve konuşma yalnızca kapalı uçlu sorularla yer alır; Quick Check'te açık uçlu yazılı veya sözlü cevaplar puanlanmaz. Full Assessment açık uçlu cevaplar dahil dört beceriyi puanlar.",
        ],
      },
    ],
    table: {
      caption: "Quick Check ile Full Assessment karşılaştırması",
      head: ["", "Quick Check", "Full Assessment"],
      rows: [
        ["Ücret", "Ücretsiz", "Okulunuz, üniversiteniz veya işvereniniz aracılığıyla"],
        ["Süre", "Yaklaşık 20–30 dakika", "Yaklaşık 45–60 dakika"],
        ["Puanlanan beceriler", "Altı beceri alanı, yalnızca kapalı uçlu sorular; açık uçlu yazma ve konuşma cevapları puanlanmaz", "Açık uçlu cevaplar dahil okuma, dinleme, yazma ve konuşma"],
        ["Sonuç", "Aralıklı geçici CEFR tahmini ve beceri dağılımı", "CEFR seviyesi, beceri raporu ve QR ile doğrulanabilir sertifika"],
        ["Hesap", "Gerekmez", "Kurumunuzdan alınan sınav kodu"],
      ],
    },
    faq: [
      { q: "İngilizce seviye testi gerçekten ücretsiz mi?", a: "Evet. Quick Check ücretsizdir ve hesap gerektirmez. Sonucun size gönderilmesini isterseniz e-postanızı bırakabilirsiniz." },
      { q: "20–30 dakikalık bir test ne kadar doğru?", a: "Adaptif test kısa sınavları verimli kılar, ancak kısa bir testte belirsizlik her zaman daha fazladır. Bu yüzden Quick Check tahmini seviyenizin çevresinde bir aralık gösterir ve sonucu geçici olarak sunar." },
      { q: "Sonucu üniversite veya iş başvurusunda kullanabilir miyim?", a: "Quick Check sonucu kendi yönlendirmeniz içindir. Bir kurum İngilizce belgesi istiyorsa hangi sınavları kabul ettiğini kontrol edin; bazı kurumlar b4skills Full Assessment kullanır, bazıları IELTS, TOEFL veya Cambridge ister." },
      { q: "Testi tekrar çözebilir miyim?", a: "Evet. Sorular geniş bir soru bankasından adaptif olarak seçildiği için tekrar çözdüğünüzde büyük olasılıkla aynı sorularla karşılaşmazsınız." },
    ],
    levelsHeading: "CEFR seviyeleri ne anlama geliyor?",
    levelsText: "Testten önce veya sonra her seviyede neler yapılabildiğini okuyun (İngilizce).",
  },
  "cefr-english-test": {
    lang: "en",
    intro:
      "The b4skills Full Assessment is an adaptive English test aligned to the CEFR. It scores reading, listening, writing and speaking in about 45–60 minutes and reports a CEFR level with a skill report and a certificate that anyone can verify by QR code.",
    sections: [
      {
        heading: "What a CEFR-aligned test means",
        paragraphs: [
          "The CEFR (Common European Framework of Reference for Languages) describes six levels of language ability, A1 to C2. A CEFR-aligned test reports its results on those levels, so a score says what the candidate can do in English rather than just how many questions they got right.",
          "b4skills places every question on one ability scale using item response theory, and the reported CEFR level comes from where the candidate's ability estimate falls on that scale.",
        ],
      },
      {
        heading: "How the Full Assessment works",
        steps: [
          { title: "Adaptive reading, listening, grammar and vocabulary", text: "Questions adjust to each answer, so candidates spend their time on questions near their level rather than on items that are far too easy or too hard." },
          { title: "Writing and speaking tasks", text: "Candidates write short texts and record spoken answers. These are scored against CEFR-based rubrics with AI assistance; uncertain cases go to human raters." },
          { title: "Report and certificate", text: "The result shows the overall CEFR level, a level for each skill and a certificate with a QR code that links to a public verification page." },
        ],
      },
      {
        heading: "Who uses it",
        bullets: [
          "Schools and language schools for placement and progress checks.",
          "Universities for EAP placement and internal entry decisions.",
          "Employers for hiring and training decisions.",
          "Candidates take the Full Assessment through their institution with an exam code; individual paid checkout is not offered on the website.",
        ],
      },
      {
        heading: "What the certificate is — and is not",
        paragraphs: [
          "A b4skills certificate is a standardised CEFR estimate that a receiving organisation can check online. It is not an official qualification like IELTS or Cambridge English, and no validated concordance between b4skills and those exams is claimed. Each receiving institution decides which results it accepts.",
        ],
      },
    ],
    faq: [
      { q: "Is the b4skills certificate accepted by universities?", a: "Acceptance is decided by each receiving institution. Some use b4skills for placement or internal decisions; for admission requirements that name specific exams, check the institution's own list." },
      { q: "How is writing and speaking scored?", a: "Writing and speaking answers are scored against CEFR-based rubrics with AI assistance. When the scoring confidence is low, the response goes to human raters." },
      { q: "How can someone check a certificate?", a: "Every certificate has a QR code and an ID. Scanning it or entering the ID on the verification page shows the certificate's status and details." },
      { q: "How does the CEFR English test compare with IELTS?", a: "Both report results that can be related to CEFR levels, but they are different tests with different tasks and stakes. See our exam comparison page for the ranges each exam owner publishes." },
    ],
    levelsHeading: "CEFR levels explained",
    levelsText: "What each level means, with typical grammar, vocabulary and exam score ranges.",
  },
  "english-assessment-for-universities": {
    lang: "en",
    intro:
      "b4skills gives university language centres, EAP departments and admissions teams an adaptive CEFR placement test that runs online, places each student on A1–C2 with a skill profile, and feeds results into your LMS and cohort dashboards.",
    sections: [
      {
        heading: "Placement that fits your intake",
        paragraphs: [
          "Placing a large intake into the right course quickly is hard with fixed paper tests. An adaptive test chooses each question from the student's previous answers, so it reaches a reliable level with fewer questions and works for the whole range from beginner to proficient.",
          "Each student receives an overall CEFR level and a level per skill. Programme coordinators see the whole cohort, and teachers see the students in their groups.",
        ],
      },
      {
        heading: "How a placement cycle runs",
        steps: [
          { title: "Import students", text: "Upload a CSV or connect your student information system, and invite students by email or with an exam code." },
          { title: "Students take the test online", text: "Placement takes 15–60 minutes depending on the configuration you choose. Students can take it on campus or remotely." },
          { title: "Place and report", text: "Use CEFR levels and skill profiles to place students, export results, and send grades back to Moodle, Canvas or Blackboard." },
        ],
      },
      {
        heading: "Placement, progress and exit on one scale",
        paragraphs: [
          "Because each test is assembled adaptively from a large item bank, students can sit it again at the end of a course without meeting the same questions. Entry, mid-course and exit results sit on the same scale, so you can report progress in CEFR terms for a group or a whole programme.",
        ],
      },
      {
        heading: "Using results responsibly",
        paragraphs: [
          "The CEFR boundaries on the b4skills scale are platform defaults based on published research, not the outcome of a standard-setting study at your institution. Most centres start with the default levels for placement and adjust course boundaries after the first intake, comparing placements with teacher judgement in the first weeks.",
          "For higher-stakes decisions, such as exemption from a language requirement, run a local standard-setting exercise, look at the skill profile rather than the overall level alone, and keep human review in the process. The methodology and research pages describe the measurement model and the evidence available so far.",
        ],
      },
    ],
    faq: [
      { q: "Can b4skills replace IELTS or TOEFL for admissions?", a: "That is each university's decision. b4skills is commonly a fit for placement, progress testing and internal decisions. No validated concordance with IELTS or TOEFL is claimed, so use your own standard-setting before using b4skills for high-stakes admission." },
      { q: "How long does placement take per student?", a: "Between about 15 and 60 minutes, depending on which skills you include and the precision you need." },
      { q: "Does it work with our LMS?", a: "b4skills supports LTI 1.3 launch and grade passback, used with Moodle, Canvas and Blackboard." },
      { q: "Can we try it first?", a: "Yes. Institutions can run a 14-day free pilot with up to 20 assessments." },
    ],
    levelsHeading: "CEFR levels for your students",
    levelsText: "Share these level guides with students and staff to explain placement results.",
  },
  "english-assessment-for-companies": {
    lang: "en",
    intro:
      "b4skills helps HR and L&D teams screen candidates and map the English skills of their workforce with an adaptive, CEFR-aligned test that takes under an hour and reports a level per skill for every person.",
    sections: [
      {
        heading: "Why companies test English",
        paragraphs: [
          "When roles involve customers, partners or colleagues abroad, English level affects performance. A CEFR level gives hiring managers and trainers a shared, job-relevant language: B1 for routine communication on familiar topics, B2 for meetings and negotiation, C1 for complex presentations and writing.",
          "An adaptive test keeps the assessment short for candidates while still measuring across the whole range, which matters when you test entry-level and senior staff with the same tool.",
        ],
      },
      {
        heading: "How it works for HR teams",
        steps: [
          { title: "Invite candidates or employees", text: "Send invitations or exam codes in bulk, or trigger them from your ATS or HRIS through the API and webhooks." },
          { title: "People test online in under an hour", text: "The assessment adapts to each person and covers reading, listening, writing and speaking." },
          { title: "Decide with reports", text: "Each person gets a CEFR level and skill report; your team sees skill gaps by team, location or role." },
        ],
      },
      {
        heading: "Fair and consistent screening",
        paragraphs: [
          "Every candidate is measured on the same scale, whatever questions they happen to see, so results from different locations and dates can be compared directly. Set the required level per role in advance and apply it the same way to everyone; use the skill profile when a role depends mostly on one skill, such as writing for a support team that works by email.",
          "Treat the level as one input among several. Starting points like the table below should be checked against the real tasks of each role and adjusted after you see how hires perform.",
        ],
      },
    ],
    table: {
      caption: "Typical starting points for English requirements by role",
      head: ["Role example", "Typical English tasks", "Starting point"],
      rows: [
        ["Production, logistics, site work", "Short instructions, signs, simple forms", "A2"],
        ["Customer support on routine issues", "Routine requests by email, chat or phone", "B1"],
        ["Sales, account and project management", "Meetings, negotiation, reports", "B2"],
        ["Senior leadership, consulting, legal", "Complex presentations and precise writing", "C1"],
      ],
    },
    faq: [
      { q: "Which CEFR level should we require for a role?", a: "It depends on the tasks. As a rule of thumb, routine written and spoken tasks on familiar topics need B1, meetings and negotiation need B2, and complex presentations or writing need C1. Our CEFR level guides describe each level in detail." },
      { q: "Can candidates test remotely?", a: "Yes. The assessment runs online, and candidates can take it from home or the office." },
      { q: "Can results flow into our HR systems?", a: "Yes. b4skills offers an API and webhooks to send invitations and receive results from your ATS or HRIS." },
      { q: "Is the result an official English certificate?", a: "It is a standardised CEFR estimate with a verifiable b4skills certificate, not an official qualification like IELTS or Cambridge. It is designed for hiring, placement and training decisions inside your organisation." },
    ],
    levelsHeading: "What each CEFR level means at work",
    levelsText: "Use the level guides to set role requirements and explain results to managers.",
  },
};
