/**
 * LISTENING PHASE 26 — C2/C1 Academic & Professional (Gap-fill)
 * Modules: 4 passages × 5 MC items = 20 items
 * SEED_TAG: "seed-listening-phase26"
 * Distribution: C2=10, C1=10
 *
 * Module A — C2: "Philosophy of Language Lecture" (University lecture)
 * Module B — C2: "Global Governance Debate" (Conference panel excerpt)
 * Module C — C1: "Medical Research Ethics Briefing" (Hospital seminar)
 * Module D — C1: "Urban Infrastructure Interview" (Radio interview)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SEED_TAG = "seed-listening-phase26";
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE   = process.env.FORCE   === "1";

// ─── MODULE A: Philosophy of Language — C2 ────────────────────────────────
const MOD_A_ID    = "academia-philosophy-of-language-c2";
const MOD_A_TITLE = "Philosophy of Language — Reference and Meaning";
const MOD_A_SCRIPT = `[Professor Elena Voss — philosophy of language, female adult, lecture theatre]

Today I want to examine a tension that sits at the heart of the philosophy of language — the relationship between linguistic reference and meaning. Let us begin with a classic puzzle. Consider the phrases "the morning star" and "the evening star." Both refer to Venus. Yet there is a palpable difference in meaning between them. Gottlob Frege captured this distinction using the terms Sinn — sense — and Bedeutung — reference. The reference of both phrases is the same celestial body. But their senses — the modes of presentation, if you like — differ.

Frege's insight creates an immediate puzzle for theories that tie meaning directly to reference. If meaning just were reference, these two phrases would mean the same thing. But clearly they do not — or at least, that is our strong intuition. The sentence "the morning star is the evening star" turns out to be an astronomically significant discovery, not a trivial identity.

Now, Bertrand Russell would push back against Frege in an important way. For Russell, ordinary proper names — "Aristotle," "London" — are abbreviated definite descriptions. "Aristotle" might mean something like "the pupil of Plato who tutored Alexander." This descriptivist view allows us to give an account of how names are meaningful even when their reference fails — when there is no such entity.

But Russell's descriptivism faces a powerful challenge from Saul Kripke, who argues that proper names are rigid designators. They pick out the same individual across all possible worlds. Descriptions, by contrast, are non-rigid — in a possible world where Aristotle had never studied philosophy, "the pupil of Plato who tutored Alexander" would refer to nobody. Yet "Aristotle," Kripke argues, would still pick out Aristotle.`;

const MOD_A_ITEMS = [
  {
    skill: 'LISTENING', cefrLevel: 'C2', difficulty: 1.5, discrimination: 1.4, guessing: 0.15,
    tags: ['listening', 'academia', 'c2', 'detail', 'frege', MOD_A_ID],
    content: {
      moduleId: MOD_A_ID, productLine: 'Academia', moduleTitle: MOD_A_TITLE,
      cefrBand: 'C2', numberOfSpeakers: 1, speakers: ['Prof. Elena Voss (philosophy, female adult)'],
      passage: MOD_A_SCRIPT,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What is the example Frege uses to illustrate the distinction between sense and reference?',
      options: [
        { text: '"The morning star" and "the evening star"', isCorrect: true,  rationale: 'The lecturer states: "Consider the phrases \'the morning star\' and \'the evening star.\' Both refer to Venus."' },
        { text: '"Aristotle" and "Plato"',                  isCorrect: false, rationale: 'Aristotle and Plato are used to illustrate Russell\'s descriptivism, not Frege\'s sense/reference distinction.' },
        { text: '"London" and "Londres"',                   isCorrect: false, rationale: 'This example is associated with discussions of proper names but is not cited in this lecture.' },
        { text: 'The number 4 and 2+2',                    isCorrect: false, rationale: 'A mathematical analogy is not mentioned; the lecturer uses astronomical examples.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C2', difficulty: 1.6, discrimination: 1.5, guessing: 0.15,
    tags: ['listening', 'academia', 'c2', 'inference', 'identity-statement', MOD_A_ID],
    content: {
      moduleId: MOD_A_ID, productLine: 'Academia', moduleTitle: MOD_A_TITLE,
      cefrBand: 'C2', numberOfSpeakers: 1, speakers: ['Prof. Elena Voss (philosophy, female adult)'],
      passage: MOD_A_SCRIPT,
      subskill: 'inference', questionNumber: 2,
      prompt: 'Why does the lecturer describe "the morning star is the evening star" as "astronomically significant" rather than trivial?',
      options: [
        { text: 'Because it reveals that two differently conceived entities are in fact the same — a non-obvious discovery', isCorrect: true,  rationale: 'If meaning were just reference, the statement would be trivially true (like "Venus is Venus"). Its informativeness proves that the senses differ, making the discovery non-trivial.' },
        { text: 'Because it was difficult to observe Venus in both morning and evening',   isCorrect: false, rationale: 'The significance is logical/semantic, not observational difficulty.' },
        { text: 'Because Frege was an astronomer who made the observation himself',        isCorrect: false, rationale: 'Frege was a philosopher/logician; the example is philosophical, not biographical.' },
        { text: 'Because morning stars and evening stars are different categories of celestial body', isCorrect: false, rationale: 'They are the same body — that is precisely the point of the example.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C2', difficulty: 1.5, discrimination: 1.4, guessing: 0.15,
    tags: ['listening', 'academia', 'c2', 'detail', 'russell-descriptivism', MOD_A_ID],
    content: {
      moduleId: MOD_A_ID, productLine: 'Academia', moduleTitle: MOD_A_TITLE,
      cefrBand: 'C2', numberOfSpeakers: 1, speakers: ['Prof. Elena Voss (philosophy, female adult)'],
      passage: MOD_A_SCRIPT,
      subskill: 'detail', questionNumber: 3,
      prompt: 'According to the lecture, what is Russell\'s descriptivist claim about ordinary proper names?',
      options: [
        { text: 'They are abbreviated definite descriptions',                isCorrect: true,  rationale: '"For Russell, ordinary proper names… are abbreviated definite descriptions."' },
        { text: 'They are rigid designators that pick out the same individual across all possible worlds', isCorrect: false, rationale: 'This is Kripke\'s position, not Russell\'s.' },
        { text: 'They have both a sense and a reference, just like phrases',  isCorrect: false, rationale: 'This is Frege\'s framework, not Russell\'s innovation.' },
        { text: 'They are meaningless unless the referent exists',            isCorrect: false, rationale: 'The descriptivist view was invoked precisely to explain how names are meaningful even when reference fails.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C2', difficulty: 1.7, discrimination: 1.5, guessing: 0.15,
    tags: ['listening', 'academia', 'c2', 'inference', 'kripke-challenge', MOD_A_ID],
    content: {
      moduleId: MOD_A_ID, productLine: 'Academia', moduleTitle: MOD_A_TITLE,
      cefrBand: 'C2', numberOfSpeakers: 1, speakers: ['Prof. Elena Voss (philosophy, female adult)'],
      passage: MOD_A_SCRIPT,
      subskill: 'inference', questionNumber: 4,
      prompt: 'What is the core of Kripke\'s challenge to Russell\'s descriptivism, as presented in the lecture?',
      options: [
        { text: 'Descriptions are non-rigid: they might refer to nobody in a possible world where the described properties belong to no one', isCorrect: true,  rationale: '"In a possible world where Aristotle had never studied philosophy, \'the pupil of Plato\' would refer to nobody. Yet \'Aristotle\' would still pick out Aristotle." — descriptions fail in counterfactual worlds; names do not.' },
        { text: 'Descriptions are too long and cumbersome to serve as names',  isCorrect: false, rationale: 'The objection is semantic (rigid/non-rigid reference), not about length or practicality.' },
        { text: 'Russell contradicts himself by using "Aristotle" as an example of a description', isCorrect: false, rationale: 'No self-contradiction is mentioned; the lecture presents a philosophical challenge, not a logical inconsistency.' },
        { text: 'Frege\'s sense/reference framework makes descriptivism redundant', isCorrect: false, rationale: 'Kripke challenges Russell; Frege\'s framework is a separate position.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C2', difficulty: 1.6, discrimination: 1.5, guessing: 0.15,
    tags: ['listening', 'academia', 'c2', 'inference', 'rigid-designator', MOD_A_ID],
    content: {
      moduleId: MOD_A_ID, productLine: 'Academia', moduleTitle: MOD_A_TITLE,
      cefrBand: 'C2', numberOfSpeakers: 1, speakers: ['Prof. Elena Voss (philosophy, female adult)'],
      passage: MOD_A_SCRIPT,
      subskill: 'inference', questionNumber: 5,
      prompt: 'What does it mean for a name to be a "rigid designator," according to the lecture?',
      options: [
        { text: 'It picks out the same individual across all possible worlds',          isCorrect: true,  rationale: '"Rigid designators… pick out the same individual across all possible worlds" — stated directly by the lecturer.' },
        { text: 'It cannot be replaced by a description without loss of meaning',       isCorrect: false, rationale: 'This is a consequence of rigid designation but not the definition given in the lecture.' },
        { text: 'It refers only to existing, actual entities, not possible ones',       isCorrect: false, rationale: 'Rigid designators apply across possible worlds — they are not limited to the actual world.' },
        { text: 'It has exactly one sense and one reference',                           isCorrect: false, rationale: 'This conflates Frege\'s framework with Kripke\'s; rigidity is about cross-world reference, not sense/reference uniqueness.' },
      ],
    },
  },
];

// ─── MODULE B: Global Governance — C2 ────────────────────────────────────
const MOD_B_ID    = "academia-global-governance-panel-c2";
const MOD_B_TITLE = "Global Governance — Sovereignty and Supranational Authority";
const MOD_B_SCRIPT = `[Panel discussion — two speakers: Dr. Amara Diallo (political scientist, female) and Prof. Henrik Bjorn (international law, male)]

Diallo: The tension between state sovereignty and supranational authority is, I would argue, the defining constitutional question of the twenty-first century. We have constructed international institutions — the UN, the WTO, the ICC — that presuppose a transfer, however partial, of sovereign competence. And yet states continue to invoke sovereignty as a trump card whenever those institutions inconveniently constrain their behaviour.

Bjorn: I take your point, but I think the framing of "transfer of sovereignty" can mislead. States do not surrender sovereignty when they join international treaties. They exercise their sovereignty in choosing to bind themselves. The self-binding theory, going back at least to Vattel, sees international obligations as a form of sovereign self-expression, not its negation.

Diallo: That is an elegant theoretical position. But it struggles with enforcement. If sovereignty is preserved intact, then states can unilaterally withdraw from obligations whenever they conflict with national interest. And we see this — the United States and the ICC, the UK and the European Convention on Human Rights. The self-binding theory has no purchase when the bind can be dissolved unilaterally.

Bjorn: Your examples illustrate political pathology, not theoretical failure. The self-binding view never claimed that international law was coercive in the way domestic law is. It claims that legitimacy derives from consent. The deficit you identify — that states can exit — is a feature of a system built on consent, not a flaw in the theory.

Diallo: And that, I suspect, is precisely where we disagree. I think a system that cannot compel compliance is not really a legal system at all. It is, at best, a set of shared norms backed by reputational incentives.`;

const MOD_B_ITEMS = [
  {
    skill: 'LISTENING', cefrLevel: 'C2', difficulty: 1.5, discrimination: 1.4, guessing: 0.15,
    tags: ['listening', 'academia', 'c2', 'detail', 'diallo-position', MOD_B_ID],
    content: {
      moduleId: MOD_B_ID, productLine: 'Academia', moduleTitle: MOD_B_TITLE,
      cefrBand: 'C2', numberOfSpeakers: 2,
      speakers: ['Dr. Amara Diallo (political scientist, female)', 'Prof. Henrik Bjorn (international law, male)'],
      passage: MOD_B_SCRIPT,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What institutions does Dr. Diallo cite as evidence of partial transfer of sovereign competence?',
      options: [
        { text: 'The UN, the WTO, and the ICC',                        isCorrect: true,  rationale: 'Diallo states: "We have constructed international institutions — the UN, the WTO, the ICC."' },
        { text: 'The World Bank, the IMF, and NATO',                   isCorrect: false, rationale: 'These institutions are not mentioned in the discussion.' },
        { text: 'The European Court of Human Rights, the ICC, and NATO', isCorrect: false, rationale: 'The European Convention is mentioned later by Diallo in a different context.' },
        { text: 'The UN Security Council and the General Assembly',    isCorrect: false, rationale: 'Only "the UN" is mentioned as a single body; its internal organs are not distinguished.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C2', difficulty: 1.6, discrimination: 1.5, guessing: 0.15,
    tags: ['listening', 'academia', 'c2', 'detail', 'bjorn-self-binding', MOD_B_ID],
    content: {
      moduleId: MOD_B_ID, productLine: 'Academia', moduleTitle: MOD_B_TITLE,
      cefrBand: 'C2', numberOfSpeakers: 2,
      speakers: ['Dr. Amara Diallo (political scientist, female)', 'Prof. Henrik Bjorn (international law, male)'],
      passage: MOD_B_SCRIPT,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What is the "self-binding theory" that Prof. Bjorn invokes?',
      options: [
        { text: 'States exercise sovereignty by voluntarily committing to international obligations', isCorrect: true,  rationale: 'Bjorn: "The self-binding theory… sees international obligations as a form of sovereign self-expression, not its negation."' },
        { text: 'States are legally bound by customary international law regardless of consent', isCorrect: false, rationale: 'This is the opposite of the consent-based self-binding view.' },
        { text: 'States can only bind themselves to obligations enforced by supranational courts', isCorrect: false, rationale: 'Bjorn explicitly says international law is not coercive in the way domestic law is.' },
        { text: 'Vattel argued that states must seek UN approval before adopting treaties',       isCorrect: false, rationale: 'Vattel is cited as an historical source for self-binding theory, not for UN approval requirements.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C2', difficulty: 1.6, discrimination: 1.5, guessing: 0.15,
    tags: ['listening', 'academia', 'c2', 'inference', 'diallo-enforcement', MOD_B_ID],
    content: {
      moduleId: MOD_B_ID, productLine: 'Academia', moduleTitle: MOD_B_TITLE,
      cefrBand: 'C2', numberOfSpeakers: 2,
      speakers: ['Dr. Amara Diallo (political scientist, female)', 'Prof. Henrik Bjorn (international law, male)'],
      passage: MOD_B_SCRIPT,
      subskill: 'inference', questionNumber: 3,
      prompt: 'What specific examples does Dr. Diallo use to support her argument that the self-binding theory fails in practice?',
      options: [
        { text: 'The US relationship with the ICC and the UK\'s relationship with the ECHR', isCorrect: true,  rationale: 'Diallo: "the United States and the ICC, the UK and the European Convention on Human Rights."' },
        { text: 'Russia\'s withdrawal from the Council of Europe and the WTO dispute mechanism', isCorrect: false, rationale: 'These examples are not mentioned.' },
        { text: 'States refusing to ratify the Kyoto Protocol and the Paris Agreement', isCorrect: false, rationale: 'Environmental treaties are not referenced in this discussion.' },
        { text: 'The collapse of the League of Nations and the Second World War', isCorrect: false, rationale: 'Historical examples of this kind are not cited.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C2', difficulty: 1.7, discrimination: 1.5, guessing: 0.15,
    tags: ['listening', 'academia', 'c2', 'inference', 'bjorn-rebuttal', MOD_B_ID],
    content: {
      moduleId: MOD_B_ID, productLine: 'Academia', moduleTitle: MOD_B_TITLE,
      cefrBand: 'C2', numberOfSpeakers: 2,
      speakers: ['Dr. Amara Diallo (political scientist, female)', 'Prof. Henrik Bjorn (international law, male)'],
      passage: MOD_B_SCRIPT,
      subskill: 'inference', questionNumber: 4,
      prompt: 'How does Prof. Bjorn respond to Diallo\'s enforcement critique?',
      options: [
        { text: 'He argues it mistakes a theoretical feature (consent-based system) for a practical flaw', isCorrect: true,  rationale: 'Bjorn: "Your examples illustrate political pathology, not theoretical failure… The deficit you identify… is a feature of a system built on consent, not a flaw in the theory."' },
        { text: 'He concedes that enforcement is weak but argues it is improving over time',                isCorrect: false, rationale: 'He does not concede the weakness or suggest improvement.' },
        { text: 'He introduces additional examples of successful international enforcement',                isCorrect: false, rationale: 'No enforcement success examples are provided.' },
        { text: 'He proposes that the ICC should be given coercive powers to address the gap',             isCorrect: false, rationale: 'No institutional reform proposal is made.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C2', difficulty: 1.7, discrimination: 1.5, guessing: 0.15,
    tags: ['listening', 'academia', 'c2', 'inference', 'diallo-final-position', MOD_B_ID],
    content: {
      moduleId: MOD_B_ID, productLine: 'Academia', moduleTitle: MOD_B_TITLE,
      cefrBand: 'C2', numberOfSpeakers: 2,
      speakers: ['Dr. Amara Diallo (political scientist, female)', 'Prof. Henrik Bjorn (international law, male)'],
      passage: MOD_B_SCRIPT,
      subskill: 'inference', questionNumber: 5,
      prompt: 'What is Dr. Diallo\'s conclusion about a legal system that cannot compel compliance?',
      options: [
        { text: 'It is not a genuine legal system — at best, a set of norms backed by reputational incentives', isCorrect: true,  rationale: 'Diallo: "a system that cannot compel compliance is not really a legal system at all. It is, at best, a set of shared norms backed by reputational incentives."' },
        { text: 'It is a transitional form of governance that will eventually evolve into a stronger system',   isCorrect: false, rationale: 'No evolutionary or transitional claim is made.' },
        { text: 'It should be replaced by a global federal government with enforcement powers',                 isCorrect: false, rationale: 'No institutional prescription is offered.' },
        { text: 'It is theoretically flawed but practically useful as a coordination mechanism',               isCorrect: false, rationale: 'Diallo\'s position is more sceptical — she questions whether it qualifies as law at all.' },
      ],
    },
  },
];

// ─── MODULE C: Medical Research Ethics — C1 ──────────────────────────────
const MOD_C_ID    = "academia-medical-research-ethics-c1";
const MOD_C_TITLE = "Medical Research Ethics — Informed Consent and Clinical Trials";
const MOD_C_SCRIPT = `[Dr. Priya Mehta — clinical ethics, hospital seminar, female adult]

Good afternoon. Today's seminar addresses one of the most contested areas in medical research ethics: the conditions under which informed consent may be modified or waived in clinical trials. I will focus on three specific scenarios.

The first is emergency research. When a patient is incapacitated at the moment of a medical emergency — cardiac arrest, severe trauma — obtaining prior informed consent is impossible by definition. Most ethical frameworks, including the Declaration of Helsinki, permit the waiver of consent in this scenario, provided the research offers potential direct benefit to the participant and the incapacity is temporary.

The second scenario involves cluster-randomised trials, where the unit of randomisation is a community or institution, not an individual. In these designs, individual consent is structurally complicated. If a hospital is randomised to receive a new antibiotic protocol, it is logistically impractical to obtain consent from every patient who will be treated under that protocol. Ethical guidance here remains contested — some frameworks require community-level consultation, others accept institutional approval as sufficient.

The third, and in my view the most ethically challenging, is placebo-controlled trials in conditions where an effective treatment already exists. The argument for using a placebo is methodological — it produces cleaner statistical data. But if patients in the placebo group are denied a treatment known to reduce suffering, we face a direct conflict with the therapeutic obligation. The Declaration of Helsinki introduced the concept of post-trial access — the obligation to ensure that participants receive the beneficial treatment after the trial ends. But this does not address the harm during the trial itself.`;

const MOD_C_ITEMS = [
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.3, guessing: 0.20,
    tags: ['listening', 'academia', 'c1', 'detail', 'emergency-research', MOD_C_ID],
    content: {
      moduleId: MOD_C_ID, productLine: 'Academia', moduleTitle: MOD_C_TITLE,
      cefrBand: 'C1', numberOfSpeakers: 1, speakers: ['Dr. Priya Mehta (clinical ethics, female adult)'],
      passage: MOD_C_SCRIPT,
      subskill: 'detail', questionNumber: 1,
      prompt: 'Under what conditions does the Declaration of Helsinki permit waiver of consent in emergency research?',
      options: [
        { text: 'When the research offers direct benefit and the incapacity is temporary',            isCorrect: true,  rationale: '"The Declaration of Helsinki permits the waiver of consent… provided the research offers potential direct benefit to the participant and the incapacity is temporary."' },
        { text: 'When the research is approved by a national ethics committee',                       isCorrect: false, rationale: 'Ethics committee approval is not specified as the condition in this context.' },
        { text: 'When consent can be obtained from a family member within 24 hours',                  isCorrect: false, rationale: 'A 24-hour proxy consent condition is not stated.' },
        { text: 'When the patient has previously registered consent on a research database',          isCorrect: false, rationale: 'No such prior registration condition is mentioned.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.3, guessing: 0.20,
    tags: ['listening', 'academia', 'c1', 'detail', 'cluster-trials', MOD_C_ID],
    content: {
      moduleId: MOD_C_ID, productLine: 'Academia', moduleTitle: MOD_C_TITLE,
      cefrBand: 'C1', numberOfSpeakers: 1, speakers: ['Dr. Priya Mehta (clinical ethics, female adult)'],
      passage: MOD_C_SCRIPT,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What practical problem does the cluster-randomised trial design create for informed consent?',
      options: [
        { text: 'It is logistically impractical to obtain individual consent from every patient affected', isCorrect: true,  rationale: '"If a hospital is randomised to receive a new antibiotic protocol, it is logistically impractical to obtain consent from every patient."' },
        { text: 'Patients in different clusters may receive conflicting information about the trial',      isCorrect: false, rationale: 'Conflicting information is not the issue raised.' },
        { text: 'Cluster randomisation makes it impossible to identify which patients were harmed',        isCorrect: false, rationale: 'Attribution of harm is not the problem mentioned.' },
        { text: 'Community leaders may override individual patients\' wish to participate',               isCorrect: false, rationale: 'This outcome is not described in the seminar.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['listening', 'academia', 'c1', 'inference', 'placebo-ethics', MOD_C_ID],
    content: {
      moduleId: MOD_C_ID, productLine: 'Academia', moduleTitle: MOD_C_TITLE,
      cefrBand: 'C1', numberOfSpeakers: 1, speakers: ['Dr. Priya Mehta (clinical ethics, female adult)'],
      passage: MOD_C_SCRIPT,
      subskill: 'inference', questionNumber: 3,
      prompt: 'Why does Dr. Mehta consider placebo-controlled trials in conditions with existing treatments the "most ethically challenging"?',
      options: [
        { text: 'Because methodological advantages are gained at the direct cost of patient welfare',         isCorrect: true,  rationale: 'The placebo produces cleaner data (methodological benefit) but denies effective treatment (harm), creating a direct conflict with the therapeutic obligation.' },
        { text: 'Because patients in placebo groups are unaware they are not receiving real treatment',       isCorrect: false, rationale: 'Awareness is not the issue raised — the ethical conflict is therapeutic, not epistemic.' },
        { text: 'Because regulators rarely approve placebo-controlled trials for already-treatable conditions', isCorrect: false, rationale: 'Regulatory approval is not the focus of the ethical challenge.' },
        { text: 'Because the statistical data from placebo trials is often unreliable',                       isCorrect: false, rationale: 'Dr. Mehta says placebo trials produce "cleaner statistical data" — the opposite of unreliable.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.3, guessing: 0.20,
    tags: ['listening', 'academia', 'c1', 'detail', 'post-trial-access', MOD_C_ID],
    content: {
      moduleId: MOD_C_ID, productLine: 'Academia', moduleTitle: MOD_C_TITLE,
      cefrBand: 'C1', numberOfSpeakers: 1, speakers: ['Dr. Priya Mehta (clinical ethics, female adult)'],
      passage: MOD_C_SCRIPT,
      subskill: 'detail', questionNumber: 4,
      prompt: 'What does the Declaration of Helsinki\'s concept of "post-trial access" require?',
      options: [
        { text: 'That participants receive the beneficial treatment after the trial ends', isCorrect: true,  rationale: '"The Declaration of Helsinki introduced the concept of post-trial access — the obligation to ensure that participants receive the beneficial treatment after the trial ends."' },
        { text: 'That participants are informed of the trial results within one year',     isCorrect: false, rationale: 'Information disclosure timelines are not mentioned.' },
        { text: 'That researchers compensate participants for any harm during the trial',  isCorrect: false, rationale: 'Compensation is not the focus of post-trial access.' },
        { text: 'That placebo groups are automatically switched to active treatment mid-trial', isCorrect: false, rationale: 'Post-trial access applies after, not during, the trial.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['listening', 'academia', 'c1', 'inference', 'limitation-of-post-trial', MOD_C_ID],
    content: {
      moduleId: MOD_C_ID, productLine: 'Academia', moduleTitle: MOD_C_TITLE,
      cefrBand: 'C1', numberOfSpeakers: 1, speakers: ['Dr. Priya Mehta (clinical ethics, female adult)'],
      passage: MOD_C_SCRIPT,
      subskill: 'inference', questionNumber: 5,
      prompt: 'Why does Dr. Mehta say post-trial access does not fully resolve the ethical problem with placebos?',
      options: [
        { text: 'It does not address the harm that occurs during the trial itself',           isCorrect: true,  rationale: '"But this does not address the harm during the trial itself" — post-trial access helps survivors but not those harmed during the trial.' },
        { text: 'Post-trial access is rarely enforced in practice',                           isCorrect: false, rationale: 'Enforcement is not the limitation raised by Dr. Mehta.' },
        { text: 'It creates perverse incentives for researchers to extend trials unnecessarily', isCorrect: false, rationale: 'No such perverse incentive is mentioned.' },
        { text: 'It only benefits participants who completed the trial, not those who dropped out', isCorrect: false, rationale: 'Dropout-related limitations are not discussed.' },
      ],
    },
  },
];

// ─── MODULE D: Urban Infrastructure Interview — C1 ────────────────────────
const MOD_D_ID    = "corporate-urban-infrastructure-interview-c1";
const MOD_D_TITLE = "Urban Infrastructure — The Finance Gap for Cities";
const MOD_D_SCRIPT = `[Radio interview — Interviewer (male host) and Yuki Tanaka (urban infrastructure economist, female)]

Host: Cities around the world are facing enormous infrastructure deficits — crumbling roads, ageing water systems, insufficient public transport. Yuki Tanaka, you have studied this problem extensively. What is driving the gap?

Tanaka: The core problem is a structural mismatch between the time horizons of infrastructure investment and the political cycle. Infrastructure — a metro system, a water treatment plant — requires upfront capital that will not generate returns for fifteen or twenty years. Politicians operate on four-year cycles. So you have a situation where the benefit of investing today falls to a successor government, while the political cost of raising taxes or borrowing falls on you now. The incentives simply do not align.

Host: And municipal finance — is that part of the problem?

Tanaka: Enormously so. In many countries, cities have very limited fiscal autonomy. They depend on central government transfers, and those transfers are often tied to specific programmes or come with conditions that prevent local authorities from making the infrastructure choices that best suit their context. The result is that cities with the highest investment needs — rapidly growing cities in the Global South, for example — are often the ones with the weakest revenue base.

Host: What solutions have worked?

Tanaka: Land value capture is very promising. The idea is that when public infrastructure — a new metro line, say — raises property values in the surrounding area, the government captures some of that increase through a levy or betterment tax. This creates a self-financing loop. Hong Kong's MTR is often cited as the paradigm case, though it is difficult to replicate in contexts with less concentrated land ownership.`;

const MOD_D_ITEMS = [
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.3, guessing: 0.20,
    tags: ['listening', 'corporate', 'c1', 'detail', 'political-cycle', MOD_D_ID],
    content: {
      moduleId: MOD_D_ID, productLine: 'Corporate', moduleTitle: MOD_D_TITLE,
      cefrBand: 'C1', numberOfSpeakers: 2,
      speakers: ['Radio host (male)', 'Yuki Tanaka (urban economist, female)'],
      passage: MOD_D_SCRIPT,
      subskill: 'detail', questionNumber: 1,
      prompt: 'What "structural mismatch" does Tanaka identify as the core driver of the infrastructure gap?',
      options: [
        { text: 'The mismatch between long-term investment time horizons and short political cycles', isCorrect: true,  rationale: '"The core problem is a structural mismatch between the time horizons of infrastructure investment and the political cycle."' },
        { text: 'The mismatch between urban population growth and housing supply',                  isCorrect: false, rationale: 'Housing supply is not mentioned as the core driver.' },
        { text: 'The mismatch between tax revenues and public spending commitments',                 isCorrect: false, rationale: 'Tax/spending mismatch is related but not what Tanaka identifies as the core mismatch.' },
        { text: 'The mismatch between engineering capacity and project complexity',                  isCorrect: false, rationale: 'Engineering capacity is not raised in this interview.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.3, guessing: 0.20,
    tags: ['listening', 'corporate', 'c1', 'inference', 'incentive-misalignment', MOD_D_ID],
    content: {
      moduleId: MOD_D_ID, productLine: 'Corporate', moduleTitle: MOD_D_TITLE,
      cefrBand: 'C1', numberOfSpeakers: 2,
      speakers: ['Radio host (male)', 'Yuki Tanaka (urban economist, female)'],
      passage: MOD_D_SCRIPT,
      subskill: 'inference', questionNumber: 2,
      prompt: 'Why do political incentives not align with long-term infrastructure investment, according to Tanaka?',
      options: [
        { text: 'The current government bears the political cost of funding while the benefits accrue to a future government', isCorrect: true,  rationale: '"The benefit of investing today falls to a successor government, while the political cost falls on you now."' },
        { text: 'Voters consistently punish governments that invest in infrastructure rather than tax cuts', isCorrect: false, rationale: 'Voter preferences are not the specific mechanism described.' },
        { text: 'Infrastructure projects almost always run over budget, creating political embarrassment',   isCorrect: false, rationale: 'Cost overruns are not mentioned as the alignment problem.' },
        { text: 'Central governments withhold infrastructure funding to control municipal governments',     isCorrect: false, rationale: 'Withholding is a different issue — Tanaka is explaining the political incentive structure at the investment decision level.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.3, guessing: 0.20,
    tags: ['listening', 'corporate', 'c1', 'detail', 'fiscal-autonomy', MOD_D_ID],
    content: {
      moduleId: MOD_D_ID, productLine: 'Corporate', moduleTitle: MOD_D_TITLE,
      cefrBand: 'C1', numberOfSpeakers: 2,
      speakers: ['Radio host (male)', 'Yuki Tanaka (urban economist, female)'],
      passage: MOD_D_SCRIPT,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What problem does Tanaka identify with central government transfers to cities?',
      options: [
        { text: 'They are often tied to specific programmes or conditions that limit local infrastructure choices', isCorrect: true,  rationale: '"Those transfers are often tied to specific programmes or come with conditions that prevent local authorities from making the infrastructure choices that best suit their context."' },
        { text: 'They are too small to cover even basic maintenance costs',                                        isCorrect: false, rationale: 'The amount is not the issue raised; the conditions attached to transfers are.' },
        { text: 'They are delayed by central government bureaucracy, causing project cost increases',              isCorrect: false, rationale: 'Bureaucratic delay is not mentioned.' },
        { text: 'They favour wealthier cities over poorer ones because of political influence',                    isCorrect: false, rationale: 'Political favouritism is not the mechanism Tanaka describes.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.1, discrimination: 1.3, guessing: 0.20,
    tags: ['listening', 'corporate', 'c1', 'detail', 'land-value-capture', MOD_D_ID],
    content: {
      moduleId: MOD_D_ID, productLine: 'Corporate', moduleTitle: MOD_D_TITLE,
      cefrBand: 'C1', numberOfSpeakers: 2,
      speakers: ['Radio host (male)', 'Yuki Tanaka (urban economist, female)'],
      passage: MOD_D_SCRIPT,
      subskill: 'detail', questionNumber: 4,
      prompt: 'How does "land value capture" work, according to Tanaka?',
      options: [
        { text: 'A levy on property value increases created by nearby public infrastructure',          isCorrect: true,  rationale: '"When public infrastructure raises property values, the government captures some of that increase through a levy or betterment tax."' },
        { text: 'The government purchases land cheaply before announcing infrastructure projects',     isCorrect: false, rationale: 'Government land purchase is not described as the mechanism.' },
        { text: 'Developers are required to build affordable housing in exchange for planning permission', isCorrect: false, rationale: 'Affordable housing requirements are not land value capture as described.' },
        { text: 'Property taxes are increased in areas that benefit from improved transit access',     isCorrect: false, rationale: 'A general property tax increase differs from a targeted betterment levy on value uplift.' },
      ],
    },
  },
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.4, guessing: 0.20,
    tags: ['listening', 'corporate', 'c1', 'inference', 'hk-mtr-caveat', MOD_D_ID],
    content: {
      moduleId: MOD_D_ID, productLine: 'Corporate', moduleTitle: MOD_D_TITLE,
      cefrBand: 'C1', numberOfSpeakers: 2,
      speakers: ['Radio host (male)', 'Yuki Tanaka (urban economist, female)'],
      passage: MOD_D_SCRIPT,
      subskill: 'inference', questionNumber: 5,
      prompt: 'Why does Tanaka suggest Hong Kong\'s MTR model is difficult to replicate elsewhere?',
      options: [
        { text: 'It depends on concentrated land ownership which most cities do not have', isCorrect: true,  rationale: '"It is difficult to replicate in contexts with less concentrated land ownership."' },
        { text: 'Hong Kong\'s government has unique legal powers unavailable elsewhere',   isCorrect: false, rationale: 'Legal power uniqueness is not the reason cited.' },
        { text: 'The MTR model required decades of political stability that most cities lack', isCorrect: false, rationale: 'Political stability is not given as the replication barrier.' },
        { text: 'Property values in most cities do not rise sufficiently near transit lines', isCorrect: false, rationale: 'Property value uplift effects are not disputed; land ownership concentration is the barrier.' },
      ],
    },
  },
];

const ALL_ITEMS = [...MOD_A_ITEMS, ...MOD_B_ITEMS, ...MOD_C_ITEMS, ...MOD_D_ITEMS];

async function main() {
  if (!FORCE) {
    const existing = await prisma.item.findFirst({ where: { tags: { has: SEED_TAG } } });
    if (existing) {
      console.log(`⚠️  SEED_TAG "${SEED_TAG}" already present — skipping. Use FORCE=1 to re-seed.`);
      return;
    }
  } else {
    const deleted = await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`🗑  Deleted ${deleted.count} existing items tagged "${SEED_TAG}".`);
  }

  const byLevel: Record<string, number> = {};
  if (DRY_RUN) {
    for (const item of ALL_ITEMS) {
      byLevel[item.cefrLevel] = (byLevel[item.cefrLevel] ?? 0) + 1;
    }
    console.log(`DRY_RUN: would insert ${ALL_ITEMS.length} listening items`);
    console.table(byLevel);
    return;
  }

  let inserted = 0;
  for (const item of ALL_ITEMS) {
    const tags = [...item.tags, SEED_TAG];
    await prisma.item.create({
      data: {
        type: 'MULTIPLE_CHOICE',
        skill: item.skill as any,
        cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: item.guessing,
        tags,
        status: 'ACTIVE',
        content: item.content,
      },
    });
    inserted++;
    byLevel[item.cefrLevel] = (byLevel[item.cefrLevel] ?? 0) + 1;
  }

  console.log(`✅  Inserted ${inserted} listening items`);
  console.table(byLevel);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
