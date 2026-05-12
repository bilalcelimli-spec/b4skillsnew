/**
 * C2 Comprehensive Seed — All Skills
 *
 * Hard-coded, Cambridge/CPE/Pearson-grade C2 items across:
 *   READING   — 3 passages × 8 questions = 24 items
 *   GRAMMAR   — 20 items (inversion, cleft sentences, mixed conditionals,
 *               nominalization, discourse markers, register-shifting)
 *   VOCABULARY — 20 items (idioms, collocations, word formation, register,
 *                connotation, fixed phrases)
 *   WRITING   — 10 prompts (essays, articles, reports, reviews)
 *   SPEAKING  — 10 prompts (monologue, discussion, speculative)
 *
 * Total: ~84 ACTIVE items at C2 level
 *
 * IRT params calibrated to C2 target:
 *   b ≈ 2.3–2.7  a ≈ 1.3–2.0  c = 0.25 (MCQ) / 0.0 (constructed response)
 *
 * Usage:
 *   npx tsx scripts/seed-c2-comprehensive.ts
 *   DRY_RUN=1 npx tsx scripts/seed-c2-comprehensive.ts
 *   FORCE=1 npx tsx scripts/seed-c2-comprehensive.ts    # re-seed even if tag exists
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE   = process.env.FORCE === "1";
const SEED_TAG = "seed-c2-comprehensive-2026";

// ─────────────────────────────────────────────────────────────────────────────
// READING PASSAGES
// ─────────────────────────────────────────────────────────────────────────────

const P1_ID    = "c2-reading-moral-luck";
const P1_TITLE = "Moral Luck and the Limits of Responsibility";
const P1_PASS  = `Few philosophical puzzles unsettle our ordinary moral thinking as thoroughly as the problem of moral luck. We typically assume that people can only be fairly held responsible for what lies within their control; and yet, as philosophers Thomas Nagel and Bernard Williams independently argued in landmark 1976 essays, much of what we praise and blame in others depends crucially on factors beyond any individual's control.

Consider two drivers, equally reckless, who both run a red light at the same speed. One drives home safely. The other strikes a child who has stepped unexpectedly into the road. Our intuitions and, indeed, our legal systems treat these drivers very differently — the second faces criminal prosecution and lifelong guilt, while the first experiences only a fleeting self-reproach. Yet in what morally relevant sense is the second driver worse than the first? The causal contribution of their negligence was identical; only luck determined the outcome.

Nagel distinguishes four varieties of moral luck: resultant luck (as above), circumstantial luck (the situations one happens to face), constitutive luck (the person one happens to be — one's temperament, dispositions, capacities), and causal luck (whether determinism renders all choice illusory). Each variety poses a distinct challenge to the control principle.

Defenders of moral responsibility have responded in two broad ways. Some, following Kant, attempt to sever the connection between moral worth and outcomes altogether, arguing that what counts morally is the quality of the will, not the effects it produces. Others concede that luck penetrates deeply into moral evaluation but deny that this undermines responsibility, since our practices of holding responsible are not grounded in a metaphysical control requirement but in their social and psychological functions: they express and sustain relationships of accountability.

The stakes extend beyond philosophy seminars. How we theorise moral luck shapes criminal sentencing, the ethics of envy and admiration, and our understanding of systemic inequality — for if success owes far more to birthright and circumstance than to desert, the meritocratic ideal may rest on conceptually shaky ground.`;

const P1_ITEMS = [
  {
    subskill: "gist", qNum: 1, difficulty: 2.3,
    stem: "The main argument of the passage is that",
    options: [
      { id: "A", text: "reckless drivers should face identical legal penalties regardless of outcome", isCorrect: false, type: "too-specific", rationale: "This is an implication of one example, not the central argument." },
      { id: "B", text: "moral judgements routinely depend on factors outside an individual's control", isCorrect: true, type: null, rationale: "The passage explicitly opens with this claim and returns to it throughout." },
      { id: "C", text: "determinism makes all questions of moral responsibility philosophically void", isCorrect: false, type: "too-specific", rationale: "Causal luck is one of four types discussed, not the central thesis." },
      { id: "D", text: "Kant's account of moral worth provides the most convincing response to moral luck", isCorrect: false, type: "opposite", rationale: "The passage presents Kantian responses as one option but does not endorse it." },
    ],
  },
  {
    subskill: "detail", qNum: 2, difficulty: 2.2,
    stem: "In the example of the two drivers (paragraph 2), the author's point is that",
    options: [
      { id: "A", text: "the legal system is too lenient on dangerous drivers", isCorrect: false, type: "not-stated", rationale: "The author does not argue for stricter penalties." },
      { id: "B", text: "recklessness alone, not its consequences, should determine moral blame", isCorrect: false, type: "not-stated", rationale: "The author presents this as a puzzle, not a recommendation." },
      { id: "C", text: "outcomes affect how we judge people despite being outside their control", isCorrect: true, type: null, rationale: "The example illustrates exactly this: identical negligence produces different moral and legal outcomes." },
      { id: "D", text: "the child's presence on the road makes the second driver objectively more negligent", isCorrect: false, type: "opposite", rationale: "The passage says the causal contribution of both drivers' negligence was identical." },
    ],
  },
  {
    subskill: "vocabulary_in_context", qNum: 3, difficulty: 2.5,
    stem: "The word 'sever' (paragraph 4) could best be replaced by",
    options: [
      { id: "A", text: "weaken", isCorrect: false, type: "too-specific", rationale: "Sever means to cut completely, not merely to weaken." },
      { id: "B", text: "examine", isCorrect: false, type: "wrong-referent", rationale: "Examine means to study; it does not capture the idea of breaking a connection." },
      { id: "C", text: "deny", isCorrect: false, type: "opposite", rationale: "Denying the connection is subtly different from severing/breaking it as a conceptual move." },
      { id: "D", text: "break", isCorrect: true, type: null, rationale: "To sever the connection means to break it entirely; Kantians disconnect moral worth from outcomes." },
    ],
  },
  {
    subskill: "inference", qNum: 4, difficulty: 2.6,
    stem: "What can be inferred about the author's view of the meritocratic ideal?",
    options: [
      { id: "A", text: "The author firmly believes meritocracy must be abandoned", isCorrect: false, type: "too-specific", rationale: "The author raises a doubt, not a firm conclusion." },
      { id: "B", text: "The author considers it irrelevant to the moral luck debate", isCorrect: false, type: "opposite", rationale: "The final paragraph directly links moral luck to the meritocratic ideal." },
      { id: "C", text: "The author suggests moral luck poses a challenge to meritocratic assumptions", isCorrect: true, type: null, rationale: "'May rest on conceptually shaky ground' implies the author sees a problem for meritocracy." },
      { id: "D", text: "The author thinks meritocracy is justified by Nagel's analysis of circumstantial luck", isCorrect: false, type: "wrong-referent", rationale: "Nagel's analysis is descriptive; the author links it to meritocracy as a critical point." },
    ],
  },
  {
    subskill: "argument_structure", qNum: 5, difficulty: 2.7,
    stem: "Which of the following best describes the function of paragraph 4?",
    options: [
      { id: "A", text: "It introduces a new variety of moral luck not covered by Nagel", isCorrect: false, type: "not-stated", rationale: "Nagel's four varieties are introduced in paragraph 3, not paragraph 4." },
      { id: "B", text: "It presents two philosophical responses to the problem of moral luck", isCorrect: true, type: null, rationale: "The paragraph outlines the Kantian response and the social-function response as two distinct replies." },
      { id: "C", text: "It resolves the tension introduced by the two-driver example", isCorrect: false, type: "too-specific", rationale: "The paragraph presents responses but doesn't claim to resolve the puzzle." },
      { id: "D", text: "It argues that determinism is the most fundamental form of moral luck", isCorrect: false, type: "wrong-referent", rationale: "Causal luck (determinism) was discussed in paragraph 3." },
    ],
  },
  {
    subskill: "author_attitude", qNum: 6, difficulty: 2.5,
    stem: "The author's attitude to the problem of moral luck can best be described as",
    options: [
      { id: "A", text: "dismissive, since the puzzle can be resolved by Kantian ethics", isCorrect: false, type: "opposite", rationale: "The author presents Kantian ethics as one response, not as a conclusive solution." },
      { id: "B", text: "detached and purely expository, presenting all sides neutrally", isCorrect: false, type: "too-specific", rationale: "The final paragraph implies the author sees genuine implications, suggesting engagement beyond neutrality." },
      { id: "C", text: "engaged and concerned, recognising the puzzle has wide practical significance", isCorrect: true, type: null, rationale: "The final paragraph connects moral luck to criminal sentencing, envy, and systemic inequality — practical concerns." },
      { id: "D", text: "sceptical that philosophical analysis can contribute to legal or social questions", isCorrect: false, type: "not-stated", rationale: "The passage explicitly argues the opposite in the final paragraph." },
    ],
  },
  {
    subskill: "reference", qNum: 7, difficulty: 2.4,
    stem: "In paragraph 3, 'each variety' refers to",
    options: [
      { id: "A", text: "resultant, circumstantial, constitutive and causal luck", isCorrect: true, type: null, rationale: "These four varieties are listed in paragraph 3 immediately before the phrase." },
      { id: "B", text: "the two philosophical responses to moral luck described in paragraph 4", isCorrect: false, type: "wrong-referent", rationale: "The responses are in paragraph 4, not paragraph 3." },
      { id: "C", text: "the legal system's treatment of the two drivers", isCorrect: false, type: "wrong-referent", rationale: "The driver example is in paragraph 2." },
      { id: "D", text: "the different accounts offered by Nagel and Williams", isCorrect: false, type: "too-specific", rationale: "Nagel and Williams are mentioned in paragraph 1; 'each variety' refers to Nagel's classification." },
    ],
  },
  {
    subskill: "critical_evaluation", qNum: 8, difficulty: 2.8,
    stem: "Which statement most accurately evaluates the passage's treatment of the social-function response (paragraph 4)?",
    options: [
      { id: "A", text: "The author fully endorses the social-function response as the definitive solution", isCorrect: false, type: "opposite", rationale: "The author presents it as one response among others without endorsing it." },
      { id: "B", text: "The social-function response is presented without evaluation, leaving its strength unclear", isCorrect: true, type: null, rationale: "The author states the position but does not assess its persuasiveness relative to the Kantian alternative." },
      { id: "C", text: "The author implicitly rejects the social-function response by endorsing Kant in paragraph 4", isCorrect: false, type: "opposite", rationale: "Neither response is endorsed; both are presented as 'broad ways' to respond." },
      { id: "D", text: "The social-function response is shown to be incompatible with the control principle", isCorrect: false, type: "not-stated", rationale: "The passage says it denies the control requirement but doesn't call the two incompatible." },
    ],
  },
];

const P2_ID    = "c2-reading-translating-untranslatable";
const P2_TITLE = "Translating the Untranslatable: Loss, Gain and the Afterlife of Text";
const P2_PASS  = `The translator's predicament has long been framed in terms of loss: what cannot be carried across the breach between languages — the resonance of a pun, the cultural freight of an idiom, the texture of a dialect — is said to vanish in transit. This deficiency model, elegantly articulated by Walter Benjamin in his 1923 essay 'The Task of the Translator', treats the original as a transcendent object whose meaning the translation can approach but never equal. The translated text is, on this view, essentially a gesture toward an irreducible original.

Yet the deficiency model has attracted sustained criticism. Lawrence Venuti and others have argued that the anxiety of loss obscures what translation actually does: it does not merely transfer meaning but transforms it, producing a new textual event in a new cultural context. The translated Kafka is not less than the German Kafka; it is a different Kafka — one who has been remade for Anglophone readers whose literary expectations, cultural memories, and semantic associations differ radically from those of Prague's German-Jewish intelligentsia in the 1920s.

Translation theory has accordingly moved toward what might be called a 'productive difference' model. The gain in translation — the unexpected precision that a target language achieves where a source language must gesture vaguely, the cultural visibility that domestication provides — is as real as the loss, though harder to itemise. Nabokov's ferociously literal Eugene Onegin translation was intended to sacrifice elegance for exactitude; what it sacrificed in lyric pleasure, it arguably recovered in semantic transparency.

There is, however, a further complication that neither model fully addresses: the source text is not a stable object but is itself always already in the process of being re-read, contested, and reinterpreted. When a new translation of Homer appears, it does not simply compete with earlier translations; it retroactively alters how the earlier translations are read. Translation, on this dynamic view, participates in the ongoing construction of the text it purports to convey.

Whether one regards this as a philosophical scandal or an intellectual enrichment may depend on whether one believes that meanings are discovered or made.`;

const P2_ITEMS = [
  {
    subskill: "gist", qNum: 1, difficulty: 2.3,
    stem: "The passage primarily argues that",
    options: [
      { id: "A", text: "translation is fundamentally inferior to original literary creation", isCorrect: false, type: "opposite", rationale: "The passage challenges the deficiency model and argues translation produces a new textual event." },
      { id: "B", text: "the traditional view of translation as loss is incomplete and requires revision", isCorrect: true, type: null, rationale: "The passage moves from the deficiency model to the productive difference model and then to a dynamic view." },
      { id: "C", text: "Nabokov's approach to translation is the most philosophically rigorous method available", isCorrect: false, type: "too-specific", rationale: "Nabokov is mentioned as an example, not endorsed as the ideal method." },
      { id: "D", text: "all translations inevitably distort the political meaning of original texts", isCorrect: false, type: "not-stated", rationale: "Political meaning is not mentioned in the passage." },
    ],
  },
  {
    subskill: "vocabulary_in_context", qNum: 2, difficulty: 2.5,
    stem: "In paragraph 2, 'cultural freight' most nearly means",
    options: [
      { id: "A", text: "the commercial value of literary texts in translation markets", isCorrect: false, type: "wrong-referent", rationale: "Freight here is metaphorical; the context is about meaning, not commerce." },
      { id: "B", text: "the burden of historical meaning and association that words carry", isCorrect: true, type: null, rationale: "Freight = cargo, metaphorically the meanings, memories, and cultural weight a word carries." },
      { id: "C", text: "the physical difficulty of transporting manuscripts across borders", isCorrect: false, type: "wrong-referent", rationale: "This interprets 'freight' and 'transit' literally; the passage is entirely metaphorical." },
      { id: "D", text: "the ideological assumptions embedded in a target culture's reading practices", isCorrect: false, type: "too-specific", rationale: "Ideological assumptions are not specifically what 'cultural freight' refers to here." },
    ],
  },
  {
    subskill: "author_technique", qNum: 3, difficulty: 2.6,
    stem: "Why does the author refer to 'the translated Kafka' and 'the German Kafka' (paragraph 2)?",
    options: [
      { id: "A", text: "To illustrate that Kafka wrote in a language unsuited to translation", isCorrect: false, type: "not-stated", rationale: "The suitability of German for translation is not discussed." },
      { id: "B", text: "To distinguish between Kafka as a biographical figure and Kafka as a literary brand", isCorrect: false, type: "wrong-referent", rationale: "The distinction is not biographical but textual/cultural." },
      { id: "C", text: "To suggest that a translated author becomes a culturally reconstituted entity", isCorrect: true, type: null, rationale: "The passage uses Kafka to illustrate the 'productive difference' model: a translation creates a new cultural event." },
      { id: "D", text: "To contrast Kafka's popularity in English with his obscurity in German", isCorrect: false, type: "not-stated", rationale: "Kafka's relative popularity in different languages is not discussed." },
    ],
  },
  {
    subskill: "inference", qNum: 4, difficulty: 2.7,
    stem: "What does the author imply about Nabokov's Eugene Onegin translation?",
    options: [
      { id: "A", text: "It is the only successful translation of a major Russian poem into English", isCorrect: false, type: "not-stated", rationale: "The passage does not claim it is the only successful translation." },
      { id: "B", text: "It demonstrates that different translatorial priorities involve different trade-offs", isCorrect: true, type: null, rationale: "The passage says Nabokov sacrificed elegance for exactitude — a deliberate trade-off illustrating productive difference." },
      { id: "C", text: "It is ultimately inferior to translations that prioritise lyric pleasure", isCorrect: false, type: "opposite", rationale: "The passage presents it as 'arguably' recovering semantic transparency — not as inferior." },
      { id: "D", text: "It proves that the deficiency model applies only to poetry, not prose", isCorrect: false, type: "not-stated", rationale: "The deficiency model applies to all translation; the passage does not restrict it to poetry." },
    ],
  },
  {
    subskill: "argument_structure", qNum: 5, difficulty: 2.7,
    stem: "Paragraph 4 introduces a 'further complication'. This complication is that",
    options: [
      { id: "A", text: "translators often lack the cultural knowledge needed to render source texts accurately", isCorrect: false, type: "not-stated", rationale: "Translators' knowledge is not discussed in paragraph 4." },
      { id: "B", text: "the source text itself has no fixed meaning and is continuously reinterpreted", isCorrect: true, type: null, rationale: "Paragraph 4 argues the source text is 'always already in the process of being re-read, contested, and reinterpreted.'" },
      { id: "C", text: "new translations make earlier translations commercially unviable", isCorrect: false, type: "wrong-referent", rationale: "Commercial viability is not the point; the passage discusses how new translations alter the reading of earlier ones." },
      { id: "D", text: "digital technologies have made original texts accessible in ways that undermine translation", isCorrect: false, type: "not-stated", rationale: "Technology is not mentioned." },
    ],
  },
  {
    subskill: "figurative_language", qNum: 6, difficulty: 2.5,
    stem: "The phrase 'across the breach between languages' (paragraph 1) uses figurative language to suggest that",
    options: [
      { id: "A", text: "some languages are grammatically incompatible with each other", isCorrect: false, type: "not-stated", rationale: "Grammatical incompatibility is not the point; 'breach' refers to a gap, not a technical incompatibility." },
      { id: "B", text: "the gap between languages is violent and destructive to meaning", isCorrect: false, type: "too-specific", rationale: "A breach implies a gap or divide; 'violent' is an over-reading." },
      { id: "C", text: "languages are separated by a fundamental divide that translation must cross", isCorrect: true, type: null, rationale: "'Breach' = a gap or rupture; the metaphor frames translation as a crossing of this divide." },
      { id: "D", text: "Benjamin believed translation was impossible in principle", isCorrect: false, type: "wrong-referent", rationale: "Benjamin's specific view (transcendent original) is described but the breach metaphor belongs to the author's framing." },
    ],
  },
  {
    subskill: "author_attitude", qNum: 7, difficulty: 2.6,
    stem: "The author's attitude to the deficiency model of translation is best described as",
    options: [
      { id: "A", text: "fully sympathetic — the author believes translation inevitably destroys meaning", isCorrect: false, type: "opposite", rationale: "The author critiques the deficiency model from paragraph 2 onward." },
      { id: "B", text: "dismissive — the author considers it philosophically naïve and historically outdated", isCorrect: false, type: "too-specific", rationale: "The author engages seriously with it before moving to alternatives; not simply dismissing it." },
      { id: "C", text: "critically appreciative — acknowledging its insight while finding it insufficient", isCorrect: true, type: null, rationale: "The author gives Benjamin credit ('elegantly articulated') but then outlines the model's limitations." },
      { id: "D", text: "neutral — presenting it as equally valid as the productive difference model", isCorrect: false, type: "opposite", rationale: "The passage moves away from the deficiency model toward alternatives." },
    ],
  },
  {
    subskill: "critical_evaluation", qNum: 8, difficulty: 2.9,
    stem: "The final paragraph ('Whether one regards this...') functions primarily to",
    options: [
      { id: "A", text: "resolve the debate between the deficiency model and the productive difference model", isCorrect: false, type: "opposite", rationale: "The final paragraph opens a further question rather than resolving any debate." },
      { id: "B", text: "redirect the philosophical question toward the epistemology of meaning", isCorrect: true, type: null, rationale: "The final line poses the question of whether meanings are discovered (realism) or made (constructivism), a fundamentally epistemological issue." },
      { id: "C", text: "summarise the historical development of translation theory", isCorrect: false, type: "too-specific", rationale: "The paragraph is not a summary; it opens a further question." },
      { id: "D", text: "endorse a particular philosophical position on the nature of meaning", isCorrect: false, type: "opposite", rationale: "The author presents this as a question ('may depend on') rather than endorsing a position." },
    ],
  },
];

const P3_ID    = "c2-reading-algorithmic-bias";
const P3_TITLE = "Algorithmic Bias and the Limits of Technical Solutions";
const P3_PASS  = `When the COMPAS risk-assessment algorithm was found in 2016 to assign significantly higher recidivism-risk scores to Black defendants than to white defendants with equivalent criminal histories, the reaction in legal and technology circles was one of surprise. It should not have been. The algorithm had been trained on data reflecting decades of racially differentiated policing, prosecution, and sentencing. A system that learns from biased data will, in the absence of deliberate countermeasures, reproduce and even amplify those biases at scale.

The technical community's initial response was to frame this as a solvable engineering problem. If bias originates in training data, the solution is to audit and cleanse the data; if it inheres in model architecture, fairness constraints can be applied. Several mathematically precise definitions of algorithmic fairness were developed: calibration, statistical parity, equalized odds. The problem, rapidly exposed, is that these definitions are mathematically incompatible under ordinary conditions — satisfying one typically precludes satisfying the others.

This impossibility result — sometimes called the 'impossibility theorem of fairness' — suggests that no purely technical solution can dissolve the problem. Every choice of fairness criterion embeds a prior value judgment about which inequalities matter most. Calibration prioritises equal predictive accuracy across groups, accepting differential impact; equalized odds prioritises equal error rates, accepting differential base rates. These are not merely technical preferences but moral ones.

The governance implications are significant. If algorithmic fairness cannot be achieved through technical optimisation alone, then decisions about which fairness criterion to adopt cannot be left to engineers. They require democratic deliberation, legal accountability, and ongoing judicial oversight. The deployment of high-stakes algorithms in criminal justice, credit, healthcare, and employment constitutes a form of public policy, whether or not legislators have chosen to recognise it as such.

Critics of this 'democratisation' argument worry, however, that involving non-experts in technical decisions will produce worse outcomes for the very populations whose interests they aim to protect. The counterargument — and it is compelling — is that the current default is not neutral technical expertise but covert value choice, and that transparency and accountability are more likely to produce equitable outcomes than unexamined algorithmic authority.`;

const P3_ITEMS = [
  {
    subskill: "gist", qNum: 1, difficulty: 2.3,
    stem: "The passage's central claim is that",
    options: [
      { id: "A", text: "algorithmic risk assessment tools should be banned from criminal justice", isCorrect: false, type: "not-stated", rationale: "The passage calls for governance reform, not prohibition." },
      { id: "B", text: "algorithmic fairness is a technical problem that engineers have not yet solved", isCorrect: false, type: "opposite", rationale: "The passage argues it is not merely a technical problem." },
      { id: "C", text: "the bias in algorithms cannot be resolved by technical means alone and requires democratic oversight", isCorrect: true, type: null, rationale: "This is the central argument developed across paragraphs 2–5." },
      { id: "D", text: "racial bias in criminal justice is an inevitable consequence of machine learning", isCorrect: false, type: "too-specific", rationale: "The passage says bias is reproduced from biased data; inevitability is not argued." },
    ],
  },
  {
    subskill: "detail", qNum: 2, difficulty: 2.2,
    stem: "According to paragraph 2, the technical community's initial response to algorithmic bias was to",
    options: [
      { id: "A", text: "call for a moratorium on AI use in criminal justice", isCorrect: false, type: "not-stated", rationale: "A moratorium is not mentioned." },
      { id: "B", text: "treat it as an engineering problem with technical solutions", isCorrect: true, type: null, rationale: "Paragraph 2 explicitly states: 'the technical community's initial response was to frame this as a solvable engineering problem.'" },
      { id: "C", text: "acknowledge that the fairness definitions were incompatible", isCorrect: false, type: "wrong-referent", rationale: "The incompatibility was exposed as a consequence, not part of the initial response." },
      { id: "D", text: "invite democratic deliberation on which fairness criterion to adopt", isCorrect: false, type: "opposite", rationale: "Democratic deliberation is advocated in paragraph 4, not the initial response." },
    ],
  },
  {
    subskill: "inference", qNum: 3, difficulty: 2.6,
    stem: "What does the author imply by saying the reaction to COMPAS's bias 'should not have been' surprising?",
    options: [
      { id: "A", text: "The algorithm's designers were aware of the bias and concealed it", isCorrect: false, type: "not-stated", rationale: "Concealment is not implied; the author argues the bias was predictable from the training data." },
      { id: "B", text: "The bias was a predictable consequence of training on historically biased data", isCorrect: true, type: null, rationale: "The following sentence explains why: a system learns from its data, so biased data produces biased outputs." },
      { id: "C", text: "Prior studies had already proved COMPAS was biased before 2016", isCorrect: false, type: "not-stated", rationale: "Prior studies are not mentioned; the point is about structural predictability." },
      { id: "D", text: "Legal scholars should have tested the algorithm more rigorously before deployment", isCorrect: false, type: "too-specific", rationale: "Pre-deployment testing is not the author's point; the point is conceptual, not procedural." },
    ],
  },
  {
    subskill: "argument_structure", qNum: 4, difficulty: 2.7,
    stem: "The 'impossibility theorem of fairness' (paragraph 3) serves what argumentative function?",
    options: [
      { id: "A", text: "It proves that racial bias in algorithms is legally actionable", isCorrect: false, type: "not-stated", rationale: "Legal actionability is not the theorem's function in this passage." },
      { id: "B", text: "It supports the claim that technical solutions alone cannot achieve algorithmic fairness", isCorrect: true, type: null, rationale: "Paragraph 3 uses the impossibility theorem to argue that fairness criteria embed value judgements, not purely technical choices." },
      { id: "C", text: "It demonstrates that calibration is superior to equalized odds as a fairness metric", isCorrect: false, type: "opposite", rationale: "The passage explicitly avoids endorsing either metric; they represent different values." },
      { id: "D", text: "It summarises the COMPAS litigation outcome", isCorrect: false, type: "wrong-referent", rationale: "COMPAS litigation is not discussed; the theorem is a mathematical result." },
    ],
  },
  {
    subskill: "vocabulary_in_context", qNum: 5, difficulty: 2.5,
    stem: "In paragraph 4, 'constitutes' most nearly means",
    options: [
      { id: "A", text: "legally defines", isCorrect: false, type: "too-specific", rationale: "The word is used generally, not in a strictly legal sense." },
      { id: "B", text: "amounts to or represents", isCorrect: true, type: null, rationale: "'Constitutes a form of public policy' = amounts to / is effectively public policy." },
      { id: "C", text: "regulates", isCorrect: false, type: "wrong-referent", rationale: "Constitutes means 'makes up' or 'amounts to', not 'regulates'." },
      { id: "D", text: "replaces", isCorrect: false, type: "wrong-referent", rationale: "The passage is not saying algorithms replace policy, but that they are a form of policy." },
    ],
  },
  {
    subskill: "critical_evaluation", qNum: 6, difficulty: 2.9,
    stem: "Which statement most accurately evaluates the final paragraph's treatment of critics of the 'democratisation' argument?",
    options: [
      { id: "A", text: "The author presents their concern sympathetically and ultimately agrees with it", isCorrect: false, type: "opposite", rationale: "The author describes a counterargument as 'compelling', suggesting disagreement with the critics." },
      { id: "B", text: "The author acknowledges the concern and then rebuts it as less persuasive than the transparency argument", isCorrect: true, type: null, rationale: "The critics are given voice but the author calls the counterargument 'compelling' and specifically mentions unexamined authority." },
      { id: "C", text: "The author dismisses the critics without engaging with their argument", isCorrect: false, type: "opposite", rationale: "The critics' worry is stated fairly before being rebutted." },
      { id: "D", text: "The author agrees that non-experts should be excluded from technical decisions", isCorrect: false, type: "opposite", rationale: "The passage endorses democratic deliberation and accountability." },
    ],
  },
  {
    subskill: "author_purpose", qNum: 7, difficulty: 2.4,
    stem: "The author's primary purpose in this passage is to",
    options: [
      { id: "A", text: "explain the technical architecture of the COMPAS algorithm", isCorrect: false, type: "not-stated", rationale: "Technical architecture is not explained; COMPAS is used as an example." },
      { id: "B", text: "argue that algorithmic decision-making requires democratic governance, not merely technical fixes", isCorrect: true, type: null, rationale: "This is the argument built through paragraphs 2–5." },
      { id: "C", text: "propose a new mathematical definition of algorithmic fairness", isCorrect: false, type: "not-stated", rationale: "No new definition is proposed; existing ones are analysed." },
      { id: "D", text: "show that artificial intelligence is inherently incompatible with justice", isCorrect: false, type: "too-specific", rationale: "The author argues for reform, not incompatibility." },
    ],
  },
  {
    subskill: "inference", qNum: 8, difficulty: 2.7,
    stem: "The phrase 'covert value choice' (final paragraph) implies that current algorithmic systems",
    options: [
      { id: "A", text: "make value judgements transparently but without legal authority", isCorrect: false, type: "opposite", rationale: "'Covert' means concealed, not transparent." },
      { id: "B", text: "are designed by engineers who deliberately conceal their political biases", isCorrect: false, type: "too-specific", rationale: "'Covert' implies the choice is hidden, but not necessarily through deliberate political concealment." },
      { id: "C", text: "embed value judgements without acknowledging or subjecting them to public scrutiny", isCorrect: true, type: null, rationale: "The 'covert' choice is contrasted with 'transparency and accountability', implying current choices are unacknowledged." },
      { id: "D", text: "are more accurate than human decision-makers and therefore value-neutral", isCorrect: false, type: "opposite", rationale: "The passage argues algorithms are not value-neutral." },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GRAMMAR ITEMS
// ─────────────────────────────────────────────────────────────────────────────

const grammarItems = [
  // Inversion
  {
    difficulty: 2.3, discrimination: 1.6,
    tags: ["grammar", "c2", "inversion", "formal_register", SEED_TAG],
    stem: "_____ the CEO refused to comment did the board begin to suspect that something was seriously wrong.",
    options: [
      { id: "A", text: "Only when",      isCorrect: true,  rationale: "Only when + inversion (auxiliary before subject) is correct in formal/literary English." },
      { id: "B", text: "Just when",      isCorrect: false, rationale: "Just when does not trigger inversion." },
      { id: "C", text: "At the time",    isCorrect: false, rationale: "At the time does not trigger subject-auxiliary inversion." },
      { id: "D", text: "As soon as",     isCorrect: false, rationale: "As soon as does not require inversion." },
    ],
  },
  {
    difficulty: 2.4, discrimination: 1.7,
    tags: ["grammar", "c2", "inversion", "formal_register", SEED_TAG],
    stem: "Not until the final audit results were published _____ the scale of the financial mismanagement.",
    options: [
      { id: "A", text: "did anyone realise",     isCorrect: true,  rationale: "Not until + inversion: 'did anyone realise' is the correct inverted structure." },
      { id: "B", text: "anyone had realised",    isCorrect: false, rationale: "No inversion; grammatically incorrect after 'not until' in formal style." },
      { id: "C", text: "anyone realised",        isCorrect: false, rationale: "Missing auxiliary; inversion required." },
      { id: "D", text: "had anyone been realising", isCorrect: false, rationale: "Past perfect continuous is inappropriate here; realise is stative." },
    ],
  },
  // Cleft sentences
  {
    difficulty: 2.4, discrimination: 1.7,
    tags: ["grammar", "c2", "cleft_sentence", SEED_TAG],
    stem: "_____ the lack of transparency, not the policy itself, that eroded public trust.",
    options: [
      { id: "A", text: "It was",    isCorrect: true,  rationale: "It-cleft: 'It was X that Y' focuses on X as the cause." },
      { id: "B", text: "There was", isCorrect: false, rationale: "There + be introduces new information; it doesn't create a cleft focus." },
      { id: "C", text: "What was",  isCorrect: false, rationale: "What-cleft structure would need 'what eroded public trust was the lack of transparency.'" },
      { id: "D", text: "That was",  isCorrect: false, rationale: "'That was' does not form a grammatical it-cleft." },
    ],
  },
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["grammar", "c2", "cleft_sentence", SEED_TAG],
    stem: "_____ he eventually resigned over was the board's decision to suppress the internal review.",
    options: [
      { id: "A", text: "It was",   isCorrect: false, rationale: "An it-cleft would require 'It was ... that', not 'that' implied by the gap." },
      { id: "B", text: "What",     isCorrect: true,  rationale: "Pseudo-cleft (what-cleft): 'What he resigned over was X' correctly fronts the reason." },
      { id: "C", text: "The thing", isCorrect: false, rationale: "'The thing he resigned over was' is grammatical but non-standard; 'What' is the C2 form expected." },
      { id: "D", text: "Which",    isCorrect: false, rationale: "Which introduces a relative clause, not a cleft." },
    ],
  },
  // Mixed conditional
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["grammar", "c2", "mixed_conditional", SEED_TAG],
    stem: "If the researchers _____ more rigorous controls in the original study, the results would still be influencing policy today.",
    options: [
      { id: "A", text: "had used",     isCorrect: true,  rationale: "Mixed conditional: past perfect in the if-clause (past hypothetical) + conditional present in the result clause (present consequence)." },
      { id: "B", text: "used",         isCorrect: false, rationale: "Simple past in a conditional clause implies a second conditional (present hypothetical), incompatible with 'would still be…today'." },
      { id: "C", text: "would use",    isCorrect: false, rationale: "Would + infinitive in an if-clause is non-standard in formal written English." },
      { id: "D", text: "have used",    isCorrect: false, rationale: "Present perfect in an if-clause is incorrect for past hypothetical conditions." },
    ],
  },
  {
    difficulty: 2.6, discrimination: 1.8,
    tags: ["grammar", "c2", "mixed_conditional", SEED_TAG],
    stem: "Had the company invested in cybersecurity infrastructure three years ago, it _____ the threat it faces now.",
    options: [
      { id: "A", text: "would not be facing",         isCorrect: true,  rationale: "Mixed conditional: inverted had + past participle (past hypothetical) + would be + -ing (present consequence)." },
      { id: "B", text: "would not have faced",        isCorrect: false, rationale: "Third conditional: implies the threat is in the past, but 'now' shows the threat is ongoing." },
      { id: "C", text: "will not be facing",          isCorrect: false, rationale: "Will is for real future; this is a hypothetical past-to-present." },
      { id: "D", text: "would not face",              isCorrect: false, rationale: "Would + bare infinitive is the second conditional result; incompatible with 'Had…' inverted past perfect." },
    ],
  },
  // Nominalization (register — active to nominal)
  {
    difficulty: 2.3, discrimination: 1.5,
    tags: ["grammar", "c2", "nominalization", "academic_register", SEED_TAG],
    stem: "The committee _____ the proposal swiftly led to widespread criticism. (Choose the correct nominalized form)",
    options: [
      { id: "A", text: "that rejected",        isCorrect: false, rationale: "This creates a relative clause; the sentence would need a head noun before 'that'." },
      { id: "B", text: "'s rejection of",      isCorrect: true,  rationale: "Genitive + nominalization ('rejection') + of: 'The committee's rejection of the proposal' — standard academic register." },
      { id: "C", text: "'s rejecting",         isCorrect: false, rationale: "Gerund construction is less formal; in academic writing nominalization is preferred." },
      { id: "D", text: "which rejected",       isCorrect: false, rationale: "Relative clause; does not form a grammatically complete subject NP." },
    ],
  },
  // Discourse markers and cohesion
  {
    difficulty: 2.3, discrimination: 1.5,
    tags: ["grammar", "c2", "discourse_markers", "cohesion", SEED_TAG],
    stem: "The evidence for the hypothesis is mounting. _____, several recent replication failures cast doubt on its universality.",
    options: [
      { id: "A", text: "Similarly",        isCorrect: false, rationale: "Similarly introduces a parallel point, not a concession." },
      { id: "B", text: "Consequently",     isCorrect: false, rationale: "Consequently introduces a result, not a contrasting limitation." },
      { id: "C", text: "Nonetheless",      isCorrect: true,  rationale: "Nonetheless = despite this; introduces a concession contrasting with the previous sentence." },
      { id: "D", text: "Furthermore",      isCorrect: false, rationale: "Furthermore adds support; the second sentence is a contrasting qualification." },
    ],
  },
  {
    difficulty: 2.2, discrimination: 1.5,
    tags: ["grammar", "c2", "discourse_markers", "cohesion", SEED_TAG],
    stem: "The report acknowledges significant methodological weaknesses; _____, it remains the most comprehensive study available.",
    options: [
      { id: "A", text: "therefore",        isCorrect: false, rationale: "Therefore introduces a conclusion, not a concession." },
      { id: "B", text: "for instance",     isCorrect: false, rationale: "For instance introduces an example." },
      { id: "C", text: "even so",          isCorrect: true,  rationale: "Even so = despite these weaknesses — concessive marker appropriate after acknowledgement of a limitation." },
      { id: "D", text: "in other words",   isCorrect: false, rationale: "In other words introduces a restatement or clarification." },
    ],
  },
  // Passive + modal
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["grammar", "c2", "passive_modal", "formal_register", SEED_TAG],
    stem: "The original documents _____ to the archive before the court order was issued.",
    options: [
      { id: "A", text: "should be returned",        isCorrect: false, rationale: "Should be returned = present/future obligation; incompatible with 'before … was issued'." },
      { id: "B", text: "ought to have been returned", isCorrect: true,  rationale: "Ought to have been returned = past obligation unfulfilled; passive construction is correct." },
      { id: "C", text: "must have returned",        isCorrect: false, rationale: "Must have returned is active and expresses deduction, not unfulfilled obligation." },
      { id: "D", text: "may have been returning",   isCorrect: false, rationale: "May have been returning expresses speculation about past continuous action, not obligation." },
    ],
  },
  // Subjunctive
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["grammar", "c2", "subjunctive", "formal_register", SEED_TAG],
    stem: "The ethics committee recommended that the researcher _____ her methodology before publication.",
    options: [
      { id: "A", text: "revises",        isCorrect: false, rationale: "Third person present indicative; formal English uses the mandative subjunctive after recommend." },
      { id: "B", text: "revised",        isCorrect: false, rationale: "Simple past; does not follow the mandative subjunctive convention." },
      { id: "C", text: "would revise",   isCorrect: false, rationale: "Would + infinitive is not used in the mandative subjunctive clause." },
      { id: "D", text: "revise",         isCorrect: true,  rationale: "Mandative subjunctive: base form of the verb after 'recommend that … ' in formal British/American English." },
    ],
  },
  // Ellipsis and substitution
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["grammar", "c2", "ellipsis", "cohesion", SEED_TAG],
    stem: "The first experiment yielded inconclusive results, and the second _____ too.",
    options: [
      { id: "A", text: "has",    isCorrect: false, rationale: "Has does not substitute the entire VP in this context." },
      { id: "B", text: "did",    isCorrect: true,  rationale: "Auxiliary verb substitution ('do' as pro-verb for 'yielded inconclusive results') — standard ellipsis." },
      { id: "C", text: "it",     isCorrect: false, rationale: "It substitutes a noun phrase, not a verb phrase." },
      { id: "D", text: "one",    isCorrect: false, rationale: "One is a noun substitute, not a verb phrase substitute." },
    ],
  },
  // Participle clause
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["grammar", "c2", "participle_clause", SEED_TAG],
    stem: "_____ from her unexpected sabbatical, the professor returned to find her research agenda completely transformed.",
    options: [
      { id: "A", text: "Having returned",   isCorrect: false, rationale: "Having returned implies the returning happened before finding; the participle clause modifies the subject, so 'Returning from… she returned' is illogical." },
      { id: "B", text: "Returning",         isCorrect: true,  rationale: "Present participle clause: 'Returning from X, she returned' — the participle is simultaneous with the main verb, expressing circumstances." },
      { id: "C", text: "Returned",          isCorrect: false, rationale: "Passive past participle would mean she was returned, which is illogical here." },
      { id: "D", text: "After returning",   isCorrect: false, rationale: "Grammatically possible but the question asks for the participle form; 'After returning' uses a subordinating conjunction + gerund." },
    ],
  },
  // Reported speech with modality shift
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["grammar", "c2", "reported_speech", "modal_shift", SEED_TAG],
    stem: "The scientist said: 'The findings may have been misinterpreted.' In formal reported speech: The scientist suggested that the findings _____ misinterpreted.",
    options: [
      { id: "A", text: "may have been",          isCorrect: false, rationale: "No backshift; correct in informal or if present relevance is preserved, but formal backshift is expected." },
      { id: "B", text: "might have been",        isCorrect: true,  rationale: "Formal backshift: may → might; have been remains as perfect aspect." },
      { id: "C", text: "could be",               isCorrect: false, rationale: "Could be changes the aspect (drops perfect); misrepresents the original." },
      { id: "D", text: "would have been",        isCorrect: false, rationale: "Would have been implies certainty about a hypothetical past event, not speculation." },
    ],
  },
  // Key word transformation style
  {
    difficulty: 2.6, discrimination: 1.8,
    tags: ["grammar", "c2", "key_word_transformation", "cpe_use_of_english", SEED_TAG],
    stem: "It is widely believed that the Chancellor will resign next week. (EXPECTED) → The Chancellor _____ next week.",
    options: [
      { id: "A", text: "is expected to resign",           isCorrect: true,  rationale: "'It is expected that X will do Y' → 'X is expected to do Y' — standard impersonal passive transformation." },
      { id: "B", text: "is being expected to resign",     isCorrect: false, rationale: "Is being expected is grammatically non-standard; expect is not normally used in continuous aspect with personal subject." },
      { id: "C", text: "was expected to resign",          isCorrect: false, rationale: "Was expected is past passive, but the original is present tense." },
      { id: "D", text: "expects to be resigning",         isCorrect: false, rationale: "Active voice with continuous aspect; does not preserve the passive/impersonal meaning." },
    ],
  },
  // Concession structure
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["grammar", "c2", "concession", "complex_syntax", SEED_TAG],
    stem: "_____ the evidence points strongly in one direction, scientific consensus requires independent replication.",
    options: [
      { id: "A", text: "Although",      isCorrect: true,  rationale: "Although + clause introduces a concessive subordinate clause correctly." },
      { id: "B", text: "Despite",       isCorrect: false, rationale: "Despite + noun phrase / gerund; 'Despite the evidence points' is ungrammatical." },
      { id: "C", text: "However",       isCorrect: false, rationale: "However is a conjunctive adverb, not a subordinating conjunction; it cannot begin a subordinate clause directly." },
      { id: "D", text: "In spite",      isCorrect: false, rationale: "In spite of + noun/gerund; 'In spite the evidence' is ungrammatical." },
    ],
  },
  // Comparative intensifier
  {
    difficulty: 2.3, discrimination: 1.5,
    tags: ["grammar", "c2", "comparative", "intensifier", SEED_TAG],
    stem: "The longer the deliberations continued, _____ the delegates became.",
    options: [
      { id: "A", text: "the more frustrated",     isCorrect: true,  rationale: "The + comparative … the + comparative: 'the longer X, the more Y' — correlative comparative structure." },
      { id: "B", text: "more frustrated",         isCorrect: false, rationale: "Missing the article 'the' in the second correlative clause." },
      { id: "C", text: "most frustrated",         isCorrect: false, rationale: "Superlative incorrect here; correlative comparatives require comparative forms." },
      { id: "D", text: "very frustrated",         isCorrect: false, rationale: "Very is an intensifier, not a comparative; the correlative structure is broken." },
    ],
  },
  // Formal passive in academic writing
  {
    difficulty: 2.3, discrimination: 1.5,
    tags: ["grammar", "c2", "passive_academic", "formal_register", SEED_TAG],
    stem: "The sample _____ three times to ensure accuracy before the final measurements were recorded.",
    options: [
      { id: "A", text: "had been tested",     isCorrect: true,  rationale: "Past perfect passive: the testing preceded the recording, expressed in formal academic passive voice." },
      { id: "B", text: "was being tested",    isCorrect: false, rationale: "Past continuous passive implies ongoing testing at the same time as recording, which contradicts 'before'." },
      { id: "C", text: "has been tested",     isCorrect: false, rationale: "Present perfect passive implies a connection to the present, not an event prior to past recording." },
      { id: "D", text: "had tested",          isCorrect: false, rationale: "Active voice; academic convention for methods sections requires passive." },
    ],
  },
  // Fronted adverbials
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["grammar", "c2", "fronted_adverbial", "formal_register", SEED_TAG],
    stem: "_____ the possibility of a negotiated settlement that the mediator kept returning to throughout the talks.",
    options: [
      { id: "A", text: "It was",     isCorrect: true,  rationale: "It-cleft with fronted adverbial: 'It was X that Y' — emphasises 'the possibility of a negotiated settlement'." },
      { id: "B", text: "There was",  isCorrect: false, rationale: "There was introduces existence, not emphasis; grammatically awkward here." },
      { id: "C", text: "What was",   isCorrect: false, rationale: "What-cleft would require '…was the possibility…' — but the sentence already has 'that the mediator', making it a what-cleft structure mismatch." },
      { id: "D", text: "Being",      isCorrect: false, rationale: "Being … that does not form a grammatically coherent sentence." },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// VOCABULARY ITEMS
// ─────────────────────────────────────────────────────────────────────────────

const vocabItems = [
  {
    difficulty: 2.3, discrimination: 1.5,
    tags: ["vocabulary", "c2", "collocation", "academic", SEED_TAG],
    stem: "The committee reached a _____ agreement after three days of talks, satisfying most but not all demands.",
    options: [
      { id: "A", text: "compromising",  isCorrect: false, rationale: "Compromising means damaging to reputation; cannot collocate with 'agreement' this way." },
      { id: "B", text: "partial",       isCorrect: false, rationale: "Partial = incomplete; less idiomatic than 'compromise agreement' in this context." },
      { id: "C", text: "compromise",    isCorrect: true,  rationale: "Compromise agreement = standard collocation for a mutually acceptable but not ideal settlement." },
      { id: "D", text: "resolved",      isCorrect: false, rationale: "Resolved is an adjective/past participle; does not collocate with 'agreement' in this slot." },
    ],
  },
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["vocabulary", "c2", "formal_idiom", SEED_TAG],
    stem: "After years of stagnation, the project finally _____ when new funding was secured.",
    options: [
      { id: "A", text: "got under way",  isCorrect: true,  rationale: "Get under way = begin to make progress; standard formal/neutral idiom." },
      { id: "B", text: "came about",     isCorrect: false, rationale: "Come about = happen (often of unexpected events); less appropriate for planned project progress." },
      { id: "C", text: "broke through",  isCorrect: false, rationale: "Break through implies overcoming a specific barrier, not simply beginning progress." },
      { id: "D", text: "moved forward",  isCorrect: false, rationale: "Grammatically possible but less idiomatic than 'got under way' for this context." },
    ],
  },
  {
    difficulty: 2.3, discrimination: 1.5,
    tags: ["vocabulary", "c2", "word_formation", "prefix", SEED_TAG],
    stem: "The evidence presented at trial was largely _____, failing to meet the court's evidentiary standards. (CONCLUSIVE)",
    options: [
      { id: "A", text: "unconclusive",   isCorrect: false, rationale: "Unconclusive is non-standard; the correct negative prefix is in-." },
      { id: "B", text: "inconclusive",   isCorrect: true,  rationale: "Inconclusive = not leading to a definite conclusion; standard formation with in-." },
      { id: "C", text: "disconclusive",  isCorrect: false, rationale: "Disconclusive does not exist in standard English." },
      { id: "D", text: "nonconclusive",  isCorrect: false, rationale: "Nonconclusive is rare and non-standard; in- is the productive prefix here." },
    ],
  },
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["vocabulary", "c2", "register", "connotation", SEED_TAG],
    stem: "The CEO's announcement was _____ with optimism, leaving analysts uncertain whether the targets were realistic.",
    options: [
      { id: "A", text: "suffused",   isCorrect: true,  rationale: "Suffused = permeated throughout; formal, literary collocation with abstract qualities." },
      { id: "B", text: "fulfilled",  isCorrect: false, rationale: "Fulfilled implies satisfaction of a requirement; not used with 'optimism' in this way." },
      { id: "C", text: "covered",    isCorrect: false, rationale: "Covered is too literal; does not collocate with 'optimism' at C2 register." },
      { id: "D", text: "infused",    isCorrect: false, rationale: "Infused can mean imbued with, but 'suffused with optimism' is the established literary collocation." },
    ],
  },
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["vocabulary", "c2", "phrasal_verb", "academic", SEED_TAG],
    stem: "The new data _____ the earlier findings, requiring the research team to revise their conclusions.",
    options: [
      { id: "A", text: "bore out",       isCorrect: false, rationale: "Bear out = confirm; the sentence indicates contradiction, not confirmation." },
      { id: "B", text: "accounted for",  isCorrect: false, rationale: "Account for = explain or comprise; does not capture the idea of contradicting." },
      { id: "C", text: "bore on",        isCorrect: false, rationale: "Bear on = relate to; does not imply contradiction." },
      { id: "D", text: "called into question", isCorrect: true, rationale: "Call into question = cause doubt about; exactly captures the relationship between new data and prior findings." },
    ],
  },
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["vocabulary", "c2", "fixed_phrase", "academic_writing", SEED_TAG],
    stem: "The theory is not without merit _____, it fails to account for the most recent empirical data.",
    options: [
      { id: "A", text: "; as it stands,",   isCorrect: true,  rationale: "As it stands = in its current form; correct semi-colon clause introducing a qualification." },
      { id: "B", text: "; standing,",       isCorrect: false, rationale: "Grammatically incomplete; participle needs a logical subject." },
      { id: "C", text: "; by and large,",   isCorrect: false, rationale: "By and large = generally; does not introduce a specific qualification about current form." },
      { id: "D", text: "; whatsoever,",     isCorrect: false, rationale: "Whatsoever is an emphatic negative particle; ungrammatical here." },
    ],
  },
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["vocabulary", "c2", "synonym_precision", "formal", SEED_TAG],
    stem: "The author's _____ argument makes it difficult to pin down exactly what claim is being defended.",
    options: [
      { id: "A", text: "nebulous",    isCorrect: true,  rationale: "Nebulous = unclear, vague, ill-defined; precisely suited to describing an argument that is hard to identify." },
      { id: "B", text: "extensive",   isCorrect: false, rationale: "Extensive = large in scope; does not capture vagueness." },
      { id: "C", text: "compelling",  isCorrect: false, rationale: "Compelling = convincing; opposite of what the context describes." },
      { id: "D", text: "intricate",   isCorrect: false, rationale: "Intricate = complex in detail; the issue here is vagueness, not complexity." },
    ],
  },
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["vocabulary", "c2", "idiom", "formal_register", SEED_TAG],
    stem: "The government's policy reversal drew _____ from opposition parties who had long advocated for it.",
    options: [
      { id: "A", text: "tepid applause",   isCorrect: false, rationale: "Tepid applause suggests unenthusiastic support; 'long advocated' implies strong support warranting a different phrase." },
      { id: "B", text: "grudging praise",  isCorrect: false, rationale: "Grudging = reluctant; opposition parties who advocated for the policy would not praise grudgingly." },
      { id: "C", text: "guarded optimism", isCorrect: false, rationale: "Guarded optimism = cautious hope; possible but less precisely matched to advocacy." },
      { id: "D", text: "cautious welcome", isCorrect: true,  rationale: "Cautious welcome = accepting but not fully endorsing; typical response when your long-advocated policy finally passes but via a rival government." },
    ],
  },
  {
    difficulty: 2.6, discrimination: 1.8,
    tags: ["vocabulary", "c2", "collocation", "literary_register", SEED_TAG],
    stem: "Her memoir is written in _____ prose that belies the profundity of its subject matter.",
    options: [
      { id: "A", text: "deceptively simple",   isCorrect: true,  rationale: "Deceptively simple prose = prose that appears simple but contains depth; exactly captures 'belies profundity'." },
      { id: "B", text: "complicated dense",    isCorrect: false, rationale: "Complicated dense is not a standard collocation; would contradict 'belies'." },
      { id: "C", text: "beautifully ornate",   isCorrect: false, rationale: "Ornate = elaborately decorated; contradicts the idea of simplicity." },
      { id: "D", text: "transparently clear",  isCorrect: false, rationale: "Transparently clear is redundant; the reading must involve the paradox of simplicity and profundity." },
    ],
  },
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["vocabulary", "c2", "word_formation", "nominalization", SEED_TAG],
    stem: "The _____ of power within the organisation led to decisions being made without adequate consultation. (CONCENTRATE)",
    options: [
      { id: "A", text: "concentration",  isCorrect: true,  rationale: "Concentration of power = the state of power being held by a few; correct nominalization." },
      { id: "B", text: "concentrating",  isCorrect: false, rationale: "Gerund; acceptable in some contexts but 'concentration' is the expected nominalization in formal prose." },
      { id: "C", text: "concentratedness", isCorrect: false, rationale: "Non-standard formation; not a real English word." },
      { id: "D", text: "concentric",     isCorrect: false, rationale: "Concentric = having the same centre; entirely different meaning." },
    ],
  },
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["vocabulary", "c2", "connotation", "register_shift", SEED_TAG],
    stem: "The report's conclusion that pollution levels were 'within acceptable limits' was _____ by environmental groups as an understatement.",
    options: [
      { id: "A", text: "dismissed",     isCorrect: false, rationale: "Dismissed = rejected entirely; the groups' complaint is about understatement, not rejection." },
      { id: "B", text: "denounced",     isCorrect: false, rationale: "Denounced = condemned publicly; strong and political, less precise than 'decried' for a specific characterisation." },
      { id: "C", text: "decried",       isCorrect: true,  rationale: "Decried = publicly criticised as inadequate or misleading; precisely matches 'characterised as an understatement.'" },
      { id: "D", text: "disregarded",   isCorrect: false, rationale: "Disregarded = ignored; environmental groups are engaging with the report, not ignoring it." },
    ],
  },
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["vocabulary", "c2", "collocation", "high_frequency_academic", SEED_TAG],
    stem: "The study's _____ are undermined by its failure to control for confounding variables.",
    options: [
      { id: "A", text: "findings",       isCorrect: false, rationale: "Findings = results; undermined by are possible but 'implications' are more often undermined than raw findings." },
      { id: "B", text: "implications",   isCorrect: false, rationale: "Implications could work but the failure to control undermines validity claims more directly." },
      { id: "C", text: "claims",         isCorrect: false, rationale: "Claims is possible but 'validity' is the term most precisely collocated with controlling for confounders." },
      { id: "D", text: "validity",       isCorrect: true,  rationale: "Validity = the degree to which conclusions are well-founded; failure to control for confounders specifically undermines internal validity." },
    ],
  },
  {
    difficulty: 2.3, discrimination: 1.5,
    tags: ["vocabulary", "c2", "formal_synonym", SEED_TAG],
    stem: "The government _____ the use of facial recognition technology in all public spaces pending a full legal review.",
    options: [
      { id: "A", text: "prevented",    isCorrect: false, rationale: "Prevented = stopped it from happening; implies it was already occurring." },
      { id: "B", text: "suspended",    isCorrect: false, rationale: "Suspended = halted temporarily; possible, but 'moratorium' wording implies a formal suspension." },
      { id: "C", text: "banned",       isCorrect: false, rationale: "Banned = prohibited permanently; 'pending a review' implies temporary." },
      { id: "D", text: "imposed a moratorium on", isCorrect: true, rationale: "Imposed a moratorium on = formally suspended pending review; precise C2 phrase for temporary official prohibition." },
    ],
  },
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["vocabulary", "c2", "idiomatic_expression", SEED_TAG],
    stem: "Despite months of negotiations, the parties remained _____, with neither side willing to concede ground.",
    options: [
      { id: "A", text: "at an impasse",     isCorrect: true,  rationale: "At an impasse = in a situation where no progress can be made; precise diplomatic/formal idiom." },
      { id: "B", text: "at loggerheads",    isCorrect: false, rationale: "At loggerheads = in strong disagreement; similar but less precise (emphasises conflict, not deadlock)." },
      { id: "C", text: "at odds",           isCorrect: false, rationale: "At odds = in disagreement; general, less specific to the deadlock context." },
      { id: "D", text: "at cross purposes", isCorrect: false, rationale: "At cross purposes = misunderstanding each other's goals; different from a deliberate deadlock." },
    ],
  },
  {
    difficulty: 2.6, discrimination: 1.8,
    tags: ["vocabulary", "c2", "precise_meaning", SEED_TAG],
    stem: "The biographer was accused of _____ history to fit a predetermined narrative.",
    options: [
      { id: "A", text: "distorting",      isCorrect: false, rationale: "Distorting is general; procrustean academic vocabulary prefers 'manipulating' or a more precise verb." },
      { id: "B", text: "falsifying",      isCorrect: false, rationale: "Falsifying = making false; implies fabrication rather than selective interpretation." },
      { id: "C", text: "manipulating",    isCorrect: false, rationale: "Manipulating is broad; the most precise term for selective/distorted framing is 'distorting' or 'sanitising.'" },
      { id: "D", text: "sanitising",      isCorrect: true,  rationale: "Sanitising history = removing unflattering or inconvenient elements to present a cleaner narrative; exactly matches 'fit a predetermined narrative.'" },
    ],
  },
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["vocabulary", "c2", "collocation_preposition", SEED_TAG],
    stem: "The success of the peace process hinged _____ the willingness of both leaders to make painful concessions.",
    options: [
      { id: "A", text: "at",     isCorrect: false, rationale: "Hinge at is ungrammatical." },
      { id: "B", text: "over",   isCorrect: false, rationale: "Hinge over is ungrammatical." },
      { id: "C", text: "by",     isCorrect: false, rationale: "Hinge by is ungrammatical." },
      { id: "D", text: "on",     isCorrect: true,  rationale: "Hinge on = depend entirely on; fixed prepositional collocation." },
    ],
  },
  {
    difficulty: 2.3, discrimination: 1.5,
    tags: ["vocabulary", "c2", "academic_vocabulary", SEED_TAG],
    stem: "The data _____ a strong correlation between sleep deprivation and cognitive decline.",
    options: [
      { id: "A", text: "evidences",     isCorrect: false, rationale: "Evidence as a verb is non-standard in formal academic writing." },
      { id: "B", text: "proposes",      isCorrect: false, rationale: "Proposes = suggests an idea; used for theories, not empirical correlations." },
      { id: "C", text: "attests to",    isCorrect: false, rationale: "Attest to = bear witness to; possible but less precise for quantitative data." },
      { id: "D", text: "point to",      isCorrect: true,  rationale: "Point to = indicate; widely accepted academic collocation: 'The data point to X.'" },
    ],
  },
  {
    difficulty: 2.5, discrimination: 1.7,
    tags: ["vocabulary", "c2", "near_synonym", SEED_TAG],
    stem: "The politician's _____ answer left journalists no closer to understanding the government's actual position.",
    options: [
      { id: "A", text: "evasive",      isCorrect: true,  rationale: "Evasive = deliberately avoiding giving a direct answer; precisely matched to 'no closer to understanding.'" },
      { id: "B", text: "elusive",      isCorrect: false, rationale: "Elusive = difficult to find or catch; describes the quality of the position, not the answer itself." },
      { id: "C", text: "illusive",     isCorrect: false, rationale: "Illusive = deceptive in appearance; rare and not standard here." },
      { id: "D", text: "allusive",     isCorrect: false, rationale: "Allusive = making indirect references; literary quality, not appropriate for 'no closer to understanding.'" },
    ],
  },
  {
    difficulty: 2.4, discrimination: 1.6,
    tags: ["vocabulary", "c2", "collocation", "academic", SEED_TAG],
    stem: "The minister's remarks were widely _____ as an implicit endorsement of the controversial policy.",
    options: [
      { id: "A", text: "read",          isCorrect: false, rationale: "Read is too informal/vague for formal analysis of political language." },
      { id: "B", text: "remarked",      isCorrect: false, rationale: "Remarked = said; makes no sense grammatically here." },
      { id: "C", text: "construed",     isCorrect: true,  rationale: "Construed = interpreted (often with nuance or inference); standard academic/journalistic collocation." },
      { id: "D", text: "conceived",     isCorrect: false, rationale: "Conceived = thought of / planned; does not mean 'interpreted.'" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// WRITING PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const writingItems = [
  {
    taskType: "essay", wordRange: { min: 280, max: 400 },
    prompt: "Some argue that the increasing concentration of wealth among a small elite is a natural consequence of a dynamic economy. Others believe it represents a structural failure requiring urgent policy intervention.\n\nWrite an essay discussing both views, then give your own well-reasoned assessment.",
    tags: ["writing", "c2", "essay", "economics", "inequality", SEED_TAG],
    difficulty: 2.4,
  },
  {
    taskType: "article", wordRange: { min: 280, max: 400 },
    prompt: "Write a well-argued article for an international magazine on the following topic:\n\n'The proliferation of academic research has not made public debate more rational — it has made it more confused.'\n\nSupport your position with specific examples.",
    tags: ["writing", "c2", "article", "education", "epistemology", SEED_TAG],
    difficulty: 2.5,
  },
  {
    taskType: "report", wordRange: { min: 300, max: 420 },
    prompt: "You have been commissioned to write a report for a government advisory board on the following question:\n\n'To what extent should algorithmic decision-making systems be subject to independent audit and democratic oversight?'\n\nYour report should summarise the key issues, evaluate competing positions, and make specific recommendations.",
    tags: ["writing", "c2", "report", "technology", "governance", SEED_TAG],
    difficulty: 2.6,
  },
  {
    taskType: "review", wordRange: { min: 260, max: 380 },
    prompt: "Write a critical review for a literary journal of a book (real or imagined) that examines the role of personal narrative in shaping collective memory. Your review should assess the work's argument, its evidence, and its significance to the field.",
    tags: ["writing", "c2", "review", "literary", "memory", SEED_TAG],
    difficulty: 2.5,
  },
  {
    taskType: "essay", wordRange: { min: 280, max: 400 },
    prompt: "'Meritocracy is a myth that legitimises inequality.' Do you agree?\n\nWrite an essay presenting a coherent argument, acknowledging the strongest counterarguments and demonstrating awareness of the philosophical and sociological dimensions of the question.",
    tags: ["writing", "c2", "essay", "meritocracy", "philosophy_of_society", SEED_TAG],
    difficulty: 2.7,
  },
  {
    taskType: "article", wordRange: { min: 270, max: 390 },
    prompt: "Write an article for a broadsheet newspaper arguing that the way in which science is communicated to the public needs fundamental reform. Identify the specific failures and propose concrete solutions.",
    tags: ["writing", "c2", "article", "science_communication", "media", SEED_TAG],
    difficulty: 2.5,
  },
  {
    taskType: "formal_letter", wordRange: { min: 260, max: 380 },
    prompt: "You are a senior researcher at a university. Write a formal letter to the board of a major research funding body arguing that current grant evaluation criteria systematically disadvantage long-term, high-risk fundamental research in favour of short-term applied projects.\n\nPresent your case rigorously and propose specific reforms to the evaluation process.",
    tags: ["writing", "c2", "formal_letter", "academia", "research_policy", SEED_TAG],
    difficulty: 2.6,
  },
  {
    taskType: "essay", wordRange: { min: 280, max: 400 },
    prompt: "The philosopher Isaiah Berlin distinguished between 'negative liberty' (freedom from interference) and 'positive liberty' (the capacity to act meaningfully). Which conception should form the foundation of public policy?\n\nWrite a nuanced essay exploring this distinction and its practical implications.",
    tags: ["writing", "c2", "essay", "political_philosophy", "liberty", SEED_TAG],
    difficulty: 2.8,
  },
  {
    taskType: "proposal", wordRange: { min: 300, max: 420 },
    prompt: "Write a proposal to an international organisation for a research project investigating the long-term psychological effects of remote work on knowledge workers. Your proposal should justify the research question, outline a methodology, address ethical considerations, and explain the expected contribution to the field.",
    tags: ["writing", "c2", "proposal", "workplace", "psychology", SEED_TAG],
    difficulty: 2.5,
  },
  {
    taskType: "essay", wordRange: { min: 280, max: 400 },
    prompt: "'Artistic censorship is never justified in a democratic society.' Discuss.\n\nYour essay should demonstrate awareness of the philosophical arguments on both sides, engage with specific cases or examples, and arrive at a clearly reasoned conclusion.",
    tags: ["writing", "c2", "essay", "censorship", "democracy", SEED_TAG],
    difficulty: 2.7,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SPEAKING PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const speakingItems = [
  {
    taskType: "monologue", timeLimitSeconds: 150,
    prompt: "Speak for 2 minutes on the following proposition, presenting a well-reasoned argument:\n\n'The most dangerous form of power in a democracy is the power that appears to be neutral and technical.'\n\nConsider examples from contemporary society and defend or refute the claim.",
    tags: ["speaking", "c2", "monologue", "political_philosophy", SEED_TAG],
    difficulty: 2.5,
  },
  {
    taskType: "speculative", timeLimitSeconds: 120,
    prompt: "Consider this scenario: A major democratic country adopts a system in which all policy decisions must be validated by a panel of AI systems before implementation. Speak for 2 minutes discussing what would be gained, what would be lost, and what this would mean for democratic accountability.",
    tags: ["speaking", "c2", "speculative", "ai_ethics", SEED_TAG],
    difficulty: 2.6,
  },
  {
    taskType: "discussion_prompt", timeLimitSeconds: 120,
    prompt: "To what extent is the current academic publishing system — peer review, journal hierarchies, paywalls — fit for purpose in an era of open science and accelerating research? Speak for 2 minutes, evaluating the system's strengths and weaknesses.",
    tags: ["speaking", "c2", "discussion", "academia", "open_science", SEED_TAG],
    difficulty: 2.5,
  },
  {
    taskType: "comparative", timeLimitSeconds: 120,
    prompt: "Compare and contrast two fundamentally different approaches to urban planning: the 'smart city' model driven by data and surveillance, and the 'participatory city' model driven by community deliberation and local knowledge. Which approach better serves human flourishing? Speak for 2 minutes.",
    tags: ["speaking", "c2", "comparative", "urbanism", SEED_TAG],
    difficulty: 2.6,
  },
  {
    taskType: "monologue", timeLimitSeconds: 150,
    prompt: "The philosopher Hannah Arendt warned that the greatest evil is often committed not by fanatics but by ordinary people who stop thinking. Speak for 2 minutes exploring what this means and whether it has become more or less true in contemporary society.",
    tags: ["speaking", "c2", "monologue", "philosophy", "political_theory", SEED_TAG],
    difficulty: 2.7,
  },
  {
    taskType: "speculative", timeLimitSeconds: 120,
    prompt: "Imagine a society in which all citizens are required to spend one year in national service — not military, but civic: working in hospitals, schools, environmental projects, or local government. Speak for 2 minutes assessing the likely consequences for social cohesion, individual freedom, and democratic culture.",
    tags: ["speaking", "c2", "speculative", "civic_society", SEED_TAG],
    difficulty: 2.5,
  },
  {
    taskType: "opinion", timeLimitSeconds: 120,
    prompt: "Some economists argue that a Universal Basic Income would liberate people to pursue meaningful work; others contend it would undermine the incentives that drive economic productivity. Speak for 2 minutes, presenting a nuanced assessment of the strongest arguments on both sides.",
    tags: ["speaking", "c2", "opinion", "economics", "ubi", SEED_TAG],
    difficulty: 2.5,
  },
  {
    taskType: "discussion_prompt", timeLimitSeconds: 120,
    prompt: "Critics of social media argue that the design of these platforms is deliberately engineered to exploit psychological vulnerabilities, making informed consent to their use effectively impossible. Do you agree? Speak for 2 minutes with reference to specific mechanisms and their effects.",
    tags: ["speaking", "c2", "discussion", "social_media", "ethics", SEED_TAG],
    difficulty: 2.6,
  },
  {
    taskType: "monologue", timeLimitSeconds: 150,
    prompt: "To what extent is it possible — or desirable — for historians to maintain political neutrality? Speak for 2 minutes, drawing on specific examples to illustrate the tensions involved.",
    tags: ["speaking", "c2", "monologue", "historiography", "objectivity", SEED_TAG],
    difficulty: 2.5,
  },
  {
    taskType: "speculative", timeLimitSeconds: 150,
    prompt: "You are advising a government facing a choice between two climate policies: a carbon tax that is economically efficient but politically unpopular, and a regulatory approach that is less efficient but easier to sell to the public. Speak for 2 minutes, arguing for one approach and acknowledging the strongest objections to it.",
    tags: ["speaking", "c2", "speculative", "climate_policy", SEED_TAG],
    difficulty: 2.6,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RUBRICS
// ─────────────────────────────────────────────────────────────────────────────

const WRITING_RUBRIC_C2 = JSON.stringify({
  criteria: [
    { name: "Content & Task Achievement",     maxScore: 5, descriptor: "Fully addresses all aspects of the task with sophisticated, well-supported arguments. Content is relevant, original, and demonstrates C2 intellectual range." },
    { name: "Coherence & Cohesion",           maxScore: 5, descriptor: "Argument is logically developed with skilful use of cohesive devices. Paragraphing and signposting are exemplary." },
    { name: "Lexical Resource",               maxScore: 5, descriptor: "Wide, precise, and idiomatic vocabulary including sophisticated collocations, academic register, and nuanced connotation. Rare errors." },
    { name: "Grammatical Range & Accuracy",   maxScore: 5, descriptor: "Full range of C2 structures deployed with flexibility and precision. Inversion, clefts, complex nominalizations, mixed conditionals. Near error-free." },
  ],
  scale: "0–5 per criterion (total 20)",
  cefrBenchmark: "C2",
  scoringGuide: "Use Cambridge CPE Writing Mark Scheme 2024 as calibration reference.",
});

const SPEAKING_RUBRIC_C2 = JSON.stringify({
  criteria: [
    { name: "Grammatical Range & Accuracy",   maxScore: 5, descriptor: "Full range of complex structures. Near-native flexibility. Errors are rare slips." },
    { name: "Lexical Resource",               maxScore: 5, descriptor: "C2 vocabulary including idioms, collocations, nuanced register. No perceptible lexical limitations." },
    { name: "Fluency & Coherence",            maxScore: 5, descriptor: "Speaks fluently with well-organised, extended discourse. Pausing is natural, not hesitative." },
    { name: "Pronunciation",                  maxScore: 5, descriptor: "Clear, natural pronunciation. Any accent does not impede comprehension. Prosodic features (stress, intonation) enhance meaning." },
  ],
  scale: "0–5 per criterion (total 20)",
  cefrBenchmark: "C2",
  scoringGuide: "Calibrate against Cambridge CPE Speaking Mark Scheme 2024.",
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  LinguAdapt — Comprehensive C2 Seed (All Skills)");
  console.log("=".repeat(70));
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`  Tag:  ${SEED_TAG}\n`);

  if (!FORCE) {
    const existing = await prisma.item.count({ where: { tags: { has: SEED_TAG } } });
    if (existing > 0) {
      console.log(`  [SKIP] ${existing} items with tag '${SEED_TAG}' already exist. Use FORCE=1 to re-seed.\n`);
      await prisma.$disconnect();
      return;
    }
  }

  const readingPassages = [
    { id: P1_ID, title: P1_TITLE, pass: P1_PASS, items: P1_ITEMS },
    { id: P2_ID, title: P2_TITLE, pass: P2_PASS, items: P2_ITEMS },
    { id: P3_ID, title: P3_TITLE, pass: P3_PASS, items: P3_ITEMS },
  ];

  let saved = 0;

  // ─── Reading ─────────────────────────────────────────────────────────────
  console.log("► READING");
  for (const passage of readingPassages) {
    for (const q of passage.items) {
      const correctOpt = q.options.find(o => o.isCorrect);
      if (DRY_RUN) { console.log(`  [DRY] ${passage.id} Q${q.qNum} ${q.subskill}`); saved++; continue; }
      await prisma.item.create({
        data: {
          type: "MULTIPLE_CHOICE" as any,
          skill: "READING" as any,
          cefrLevel: "C2" as any,
          discrimination: 1.6, difficulty: q.difficulty, guessing: 0.25,
          status: "ACTIVE" as any, isPretest: false,
          content: {
            moduleId: passage.id, moduleTitle: passage.title,
            cefrBand: "C2", passage: passage.pass,
            subskill: q.subskill, questionNumber: q.qNum,
            prompt: q.stem,
            options: q.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, rationale: o.rationale, distractorType: o.type })),
            correctAnswer: correctOpt?.id ?? "A",
          } as any,
          tags: ["reading", "c2", `subskill:${q.subskill}`, `passage:${passage.id}`, "academic", "cambridge_cpe_standard", SEED_TAG],
          metadata: { source: "human-authored", standard: "Cambridge CPE / C2 Proficiency", seedScript: SEED_TAG } as any,
        },
      });
      saved++;
    }
  }
  console.log(`  Saved ${readingPassages.reduce((s, p) => s + p.items.length, 0)} reading items\n`);

  // ─── Grammar ─────────────────────────────────────────────────────────────
  console.log("► GRAMMAR");
  for (const g of grammarItems) {
    const correctOpt = g.options.find(o => o.isCorrect);
    if (DRY_RUN) { console.log(`  [DRY] Grammar: ${g.stem.slice(0, 60)}...`); saved++; continue; }
    await prisma.item.create({
      data: {
        type: "MULTIPLE_CHOICE" as any,
        skill: "GRAMMAR" as any,
        cefrLevel: "C2" as any,
        discrimination: g.discrimination, difficulty: g.difficulty, guessing: 0.25,
        status: "ACTIVE" as any, isPretest: false,
        content: {
          prompt: g.stem,
          options: g.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, rationale: o.rationale })),
          correctAnswer: correctOpt?.id ?? "A",
        } as any,
        tags: g.tags,
        metadata: { source: "human-authored", standard: "Cambridge CPE / CPE Use of English", seedScript: SEED_TAG } as any,
      },
    });
    saved++;
  }
  console.log(`  Saved ${grammarItems.length} grammar items\n`);

  // ─── Vocabulary ───────────────────────────────────────────────────────────
  console.log("► VOCABULARY");
  for (const v of vocabItems) {
    const correctOpt = v.options.find(o => o.isCorrect);
    if (DRY_RUN) { console.log(`  [DRY] Vocab: ${v.stem.slice(0, 60)}...`); saved++; continue; }
    await prisma.item.create({
      data: {
        type: "MULTIPLE_CHOICE" as any,
        skill: "VOCABULARY" as any,
        cefrLevel: "C2" as any,
        discrimination: v.discrimination, difficulty: v.difficulty, guessing: 0.25,
        status: "ACTIVE" as any, isPretest: false,
        content: {
          prompt: v.stem,
          options: v.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, rationale: o.rationale })),
          correctAnswer: correctOpt?.id ?? "A",
        } as any,
        tags: v.tags,
        metadata: { source: "human-authored", standard: "Cambridge CPE / Oxford 5000+ / AWL", seedScript: SEED_TAG } as any,
      },
    });
    saved++;
  }
  console.log(`  Saved ${vocabItems.length} vocabulary items\n`);

  // ─── Writing ──────────────────────────────────────────────────────────────
  console.log("► WRITING");
  for (const w of writingItems) {
    if (DRY_RUN) { console.log(`  [DRY] Writing: ${w.taskType} — ${w.prompt.slice(0, 60)}...`); saved++; continue; }
    await prisma.item.create({
      data: {
        type: "WRITING_PROMPT" as any,
        skill: "WRITING" as any,
        cefrLevel: "C2" as any,
        discrimination: 1.5, difficulty: w.difficulty, guessing: 0.0,
        status: "ACTIVE" as any, isPretest: false,
        content: {
          taskType: w.taskType,
          prompt: w.prompt,
          wordRange: w.wordRange,
          scoringRubric: JSON.parse(WRITING_RUBRIC_C2),
          timeLimitMinutes: 45,
        } as any,
        tags: w.tags,
        metadata: { source: "human-authored", standard: "Cambridge CPE Writing Mark Scheme 2024", seedScript: SEED_TAG } as any,
      },
    });
    saved++;
  }
  console.log(`  Saved ${writingItems.length} writing items\n`);

  // ─── Speaking ─────────────────────────────────────────────────────────────
  console.log("► SPEAKING");
  for (const s of speakingItems) {
    if (DRY_RUN) { console.log(`  [DRY] Speaking: ${s.taskType} — ${s.prompt.slice(0, 60)}...`); saved++; continue; }
    await prisma.item.create({
      data: {
        type: "SPEAKING_PROMPT" as any,
        skill: "SPEAKING" as any,
        cefrLevel: "C2" as any,
        discrimination: 1.5, difficulty: s.difficulty, guessing: 0.0,
        status: "ACTIVE" as any, isPretest: false,
        content: {
          taskType: s.taskType,
          prompt: s.prompt,
          timeLimitSeconds: s.timeLimitSeconds,
          scoringRubric: JSON.parse(SPEAKING_RUBRIC_C2),
        } as any,
        tags: s.tags,
        metadata: { source: "human-authored", standard: "Cambridge CPE Speaking Mark Scheme 2024", seedScript: SEED_TAG } as any,
      },
    });
    saved++;
  }
  console.log(`  Saved ${speakingItems.length} speaking items\n`);

  console.log("=".repeat(70));
  console.log(`  TOTAL SAVED: ${saved} items at C2`);
  console.log("=".repeat(70) + "\n");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[FATAL]", err);
  await prisma.$disconnect();
  process.exit(1);
});
