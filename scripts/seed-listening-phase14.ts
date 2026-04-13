/**
 * LISTENING PHASE 14 — ACADEMIA
 * Module: "The Role of Dopamine"
 * CEFR: B2 | Academic lecture excerpt | ~112 seconds
 * 6 questions — academic listening, neuroscience, conceptual understanding
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'academia-role-of-dopamine';
const PRODUCT_LINE = 'ACADEMIA';
const MODULE_TITLE = 'The Role of Dopamine';
const CEFR_BAND = 'B2';
const ESTIMATED_DURATION_SECONDS = 112;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-C',
  speakingRate: 0.87,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Single academic female voice — Dr. Mei Liang, neuroscience lecture. Measured academic pace. "neurotransmitters" — nyoo-roh-TRANS-mit-erz (6 syllables); verify TTS. "Wolfram Schultz" — VOLF-rum SHOOLTS; likely TTS error; check synthesis or use phonetic text. "dopamine" — DOH-puh-meen; verify. "baseline" — BASE-line. "prediction error" — natural two-word compound. Pause 1.5s between conceptual sections.',
};

const HUMAN_SCRIPT = `[Dr. Mei Liang — neuroscience lecturer, female adult]

Let us turn our attention today to one of the most commonly misunderstood neurotransmitters: dopamine.
Dopamine is often described in popular media as the "pleasure chemical" — the thing that floods your brain when you eat something delicious or fall in love. While this is not entirely wrong, it is a significant oversimplification. The most current understanding of dopamine is that it functions primarily as a prediction and reward signalling molecule.
Here is the key insight from decades of research, much of it pioneered by Wolfram Schultz: dopamine neurons do not fire in response to the reward itself. They fire in response to the prediction of a reward. If you consistently give a subject — animal or human — a reward following a signal, the dopamine release gradually shifts. Initially, neurons fire when the reward is received. Over time, they begin firing when the signal appears — because the signal predicts the reward. More remarkably, if the predicted reward does not come, there is actually a dip in dopamine activity below baseline. This is known as a prediction error signal.
This mechanism has profound implications. It explains the psychology of anticipation, the neuroscience of habit formation, and — importantly for clinicians — patterns seen in addiction. Addictive substances effectively hijack the dopamine prediction system, creating artificially strong prediction signals that are very difficult to extinguish.
We will explore therapeutic implications of this in week seven.`;

const TTS_SCRIPT = `Let us turn our attention today to one of the most commonly misunderstood neurotransmitters: dopamine.
Dopamine is often described in popular media as the pleasure chemical. The thing that floods your brain when you eat something delicious or fall in love. While this is not entirely wrong, it is a significant oversimplification. The most current understanding of dopamine is that it functions primarily as a prediction and reward signalling molecule.
Here is the key insight from decades of research, much of it pioneered by Wolfram Schultz: dopamine neurons do not fire in response to the reward itself. They fire in response to the prediction of a reward. If you consistently give a subject, animal or human, a reward following a signal, the dopamine release gradually shifts. Initially, neurons fire when the reward is received. Over time, they begin firing when the signal appears, because the signal predicts the reward. More remarkably, if the predicted reward does not come, there is actually a dip in dopamine activity below baseline. This is known as a prediction error signal.
This mechanism has profound implications. It explains the psychology of anticipation, the neuroscience of habit formation, and, importantly for clinicians, patterns seen in addiction. Addictive substances effectively hijack the dopamine prediction system, creating artificially strong prediction signals that are very difficult to extinguish.
We will explore therapeutic implications of this in week seven.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- Single academic voice; clear and measured neuroscience lecture.
- "neurotransmitters" — 6 syllables: nyoo-roh-TRANS-mit-erz. Verify synthesis.
- "Wolfram Schultz" — VOLF-rum SHOOLTS (German name). TTS HIGH RISK of mispronunciation. If problematic, use phonetic spelling "Volfrum Shults" in TTS script. HUMAN REVIEW required.
- "dopamine" — DOH-puh-meen; verify.
- "prediction error signal" — three words, natural academic compound; no special handling needed.
- "hijack" — natural word, no issue.
- "extinguish" — eks-TING-gwish; verify natural synthesis.
- Pause 1.5s between the three conceptual sections (description, mechanism, implications).
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR B2 — formal lecture, technical terminology, causal reasoning required.
✓ Academia product line — appropriate complexity for B2 academic English learner.
✓ Q3 tests attribution (Wolfram Schultz) — requires careful attention.
✓ Q4 tests the counterintuitive core claim (neurons fire at signal, not reward).
✓ Q5 tests definition of prediction error signal — nuanced understanding.
✓ Q6 tests implication (addiction) — requires following a causal chain.
✓ IRT range 0.5 to 1.0 appropriate for B2 academia.
HUMAN REVIEW: Confirm Wolfram Schultz pronunciation in final audio.
`;

const items = [
  // Q1 — Detail: common media description
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'detail', 'lecture', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Mei Liang (neuroscience lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'How is dopamine commonly described in popular media, according to the lecture?',
      options: [
        { text: 'As a stress hormone',      isCorrect: false, rationale: 'Stress hormones (e.g., cortisol) are not what the lecture describes.' },
        { text: 'As a memory molecule',     isCorrect: false, rationale: 'Memory is not the popular description given.' },
        { text: 'As the pleasure chemical', isCorrect: true,  rationale: 'Dr. Liang says dopamine "is often described in popular media as the pleasure chemical."' },
        { text: 'As a mood suppressor',     isCorrect: false, rationale: 'Suppression of mood is the opposite of the popular description given.' },
      ],
    },
  },
  // Q2 — Detail: current scientific understanding
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'detail', 'lecture', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Mei Liang (neuroscience lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What does current research say dopamine primarily signals?',
      options: [
        { text: 'The receipt of pleasure',   isCorrect: false, rationale: 'This is the popular (oversimplified) view, not the current scientific understanding.' },
        { text: 'Level of pain',             isCorrect: false, rationale: 'Pain signalling is not described as dopamine\'s primary function here.' },
        { text: 'Emotional state',           isCorrect: false, rationale: 'Emotional state broadly is not the specific function described.' },
        { text: 'Prediction of a reward',    isCorrect: true,  rationale: 'Dr. Liang says dopamine "functions primarily as a prediction and reward signalling molecule."' },
      ],
    },
  },
  // Q3 — Detail: attribution
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'detail', 'attribution', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Mei Liang (neuroscience lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'Whose research is highlighted in the lecture on dopamine?',
      options: [
        { text: 'Ivan Pavlov',        isCorrect: false, rationale: 'Pavlov\'s conditioning work is related but he is not the researcher named here.' },
        { text: 'B.F. Skinner',       isCorrect: false, rationale: 'Skinner is associated with operant conditioning, not the dopamine prediction error research.' },
        { text: 'Wolfram Schultz',    isCorrect: true,  rationale: 'Dr. Liang says "much of it pioneered by Wolfram Schultz."' },
        { text: 'Antonio Damasio',    isCorrect: false, rationale: 'Damasio is associated with the somatic marker hypothesis, not this research.' },
      ],
    },
  },
  // Q4 — Counterintuitive finding: when neurons fire
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'inference', 'lecture', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Mei Liang (neuroscience lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 4,
      prompt: 'According to the research described, when do dopamine neurons fire?',
      options: [
        { text: 'When the reward is received',    isCorrect: false, rationale: 'Initially they fire at reward receipt, but over time the firing shifts to the predictive signal.' },
        { text: 'When a state of pain is avoided', isCorrect: false, rationale: 'Pain avoidance is not described as the trigger.' },
        { text: 'When sleep is triggered',        isCorrect: false, rationale: 'Sleep is not related to this mechanism.' },
        { text: 'When a reward is predicted — when the predictive signal appears', isCorrect: true, rationale: 'Dr. Liang says "they begin firing when the signal appears — because the signal predicts the reward."' },
      ],
    },
  },
  // Q5 — Definition: prediction error signal
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'detail', 'terminology', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Mei Liang (neuroscience lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 5,
      prompt: 'What is a "prediction error signal" as described in the lecture?',
      options: [
        { text: 'A spike in dopamine when an unexpected reward arrives',                  isCorrect: false, rationale: 'The prediction error signal described is specifically a DIP when the expected reward does NOT come.' },
        { text: 'A chemical released during any cognitive error',                         isCorrect: false, rationale: 'It is not a general cognitive error signal.' },
        { text: 'A brain scan reading showing dopamine levels',                           isCorrect: false, rationale: 'It is a physiological event, not a scan reading.' },
        { text: 'A dip in dopamine activity below baseline when an expected reward does not arrive', isCorrect: true, rationale: 'Dr. Liang says "if the predicted reward does not come, there is actually a dip in dopamine activity below baseline. This is known as a prediction error signal."' },
      ],
    },
  },
  // Q6 — Implication: addiction
  {
    skill: 'LISTENING', cefrLevel: 'B2', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['listening', 'academia', 'b2', 'inference', 'implication', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Mei Liang (neuroscience lecturer, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 6,
      prompt: 'How does the lecture explain addiction in terms of the dopamine system?',
      options: [
        { text: 'Addictive substances destroy dopamine neurons permanently',        isCorrect: false, rationale: 'Destruction of neurons is not the mechanism described.' },
        { text: 'Addiction permanently raises the dopamine baseline level',         isCorrect: false, rationale: 'A raised baseline is not the described mechanism.' },
        { text: 'Addiction eliminates the feeling of reward entirely',             isCorrect: false, rationale: 'Elimination of reward feeling is not the explanation given.' },
        { text: 'Addictive substances hijack the prediction system, creating strong signals that are very difficult to extinguish', isCorrect: true, rationale: 'Dr. Liang says "Addictive substances effectively hijack the dopamine prediction system, creating artificially strong prediction signals that are very difficult to extinguish."' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 14 — ${MODULE_TITLE} (${items.length} items)…`);
  let inserted = 0;
  for (const item of items) {
    await prisma.item.create({
      data: {
        type: 'MULTIPLE_CHOICE', skill: item.skill as any, cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty, discrimination: item.discrimination, guessing: item.guessing,
        tags: item.tags, status: 'ACTIVE', content: item.content,
      },
    });
    inserted++;
  }
  console.log(`✓ Listening Phase 14 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
