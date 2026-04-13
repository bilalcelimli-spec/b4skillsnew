/**
 * LISTENING PHASE 15 — ACADEMIA
 * Module: "Ocean Microplastics Research"
 * CEFR: C1 | Academic research presentation | ~140 seconds
 * 7 questions — academic listening, methodology, data interpretation
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULE_ID = 'academia-ocean-microplastics';
const PRODUCT_LINE = 'ACADEMIA';
const MODULE_TITLE = 'Ocean Microplastics Research';
const CEFR_BAND = 'C1';
const ESTIMATED_DURATION_SECONDS = 140;

const TTS_SETTINGS = {
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-C',
  speakingRate: 0.86,
  pitch: 0.0,
  audioEncoding: 'MP3',
  notes: 'Single academic female voice — Dr. Adaeze Okafor, environmental science. Formal research presentation. "Raman spectroscopy" — RAY-man spek-TROS-koh-pee; flag for human review. "polypropylene" — pol-ee-PROP-uh-leen; verify. "polyethylene" — pol-ee-ETH-uh-leen; verify. "Adaeze" — ah-DAY-zay (Nigerian name); only in TTS intro, flag for review. "sub-millimetre" — say in full. Pause 1.5s between sections.',
};

const HUMAN_SCRIPT = `[Dr. Adaeze Okafor — environmental science researcher, female adult, research presentation]

Good afternoon. I would like to present some preliminary findings from our two-year study into microplastic accumulation in deep-sea sediment samples collected from three sites in the South Atlantic.
Before I discuss results, a brief note on methodology. We used a combination of Raman spectroscopy and mass spectrometry to identify and quantify plastic particles. Our sampling depth ranged from eight hundred to three thousand metres. Importantly, we focused specifically on particles under five millimetres — the standard definition of microplastics — and within that, on particles under one millimetre, which we are calling sub-millimetre microplastics.
Our first finding confirms what prior literature suggested: microplastic concentration increases with depth, up to a certain point. Contrary to what one might expect, however, we found a consistent decline in concentration below approximately two thousand metres. Our hypothesis is that this reflects a settling and aggregation effect — plastics become embedded in marine snow and descend to the seafloor in clusters, which may explain why surface-to-mid-depth measurements have previously overestimated deep-sea accumulation.
The second significant finding relates to polymer type. Polyethylene and polypropylene dominated our samples — both are used extensively in single-use packaging. Fibres — primarily from synthetic textiles — represented twenty-eight percent of particles identified.
These findings carry clear implications for ocean management policy, which I will address in the final slides.`;

const TTS_SCRIPT = `Good afternoon. I would like to present some preliminary findings from our two-year study into microplastic accumulation in deep-sea sediment samples collected from three sites in the South Atlantic.
Before I discuss results, a brief note on methodology. We used a combination of Raman spectroscopy and mass spectrometry to identify and quantify plastic particles. Our sampling depth ranged from eight hundred to three thousand metres. Importantly, we focused specifically on particles under five millimetres. This is the standard definition of microplastics. And within that, on particles under one millimetre, which we are calling sub-millimetre microplastics.
Our first finding confirms what prior literature suggested. Microplastic concentration increases with depth, up to a certain point. Contrary to what one might expect, however, we found a consistent decline in concentration below approximately two thousand metres. Our hypothesis is that this reflects a settling and aggregation effect. Plastics become embedded in marine snow and descend to the seafloor in clusters, which may explain why surface-to-mid-depth measurements have previously overestimated deep-sea accumulation.
The second significant finding relates to polymer type. Polyethylene and polypropylene dominated our samples. Both are used extensively in single-use packaging. Fibres, primarily from synthetic textiles, represented twenty-eight percent of particles identified.
These findings carry clear implications for ocean management policy, which I will address in the final slides.`;

const TTS_NOTES = `
PRODUCTION NOTES:
- "Raman spectroscopy" — RAY-man spek-TROS-koh-pee. R-A-M-A-N is a proper noun (scientist's name). TTS HIGH RISK of mis-stress. Flag for human review.
- "mass spectrometry" — MASS spek-TROM-ih-tree; typically fine in TTS.
- "polypropylene" — pol-ee-PROP-uh-leen; verify. TTS sometimes elides syllables.
- "polyethylene" — pol-ee-ETH-uh-leen; verify.
- "sub-millimetre" — SUB-mil-ih-MEE-ter; three-part compound; verify.
- "twenty-eight percent" — verify TTS renders "28%."
- "marine snow" — natural two-word compound, no issue.
- "three thousand metres" — TREE-THOU-zund MEE-terz; verify number.
- Academic register: measured, no emotional inflection.
- Pause 1.5s at each new section break.
`;

const QUALITY_NOTES = `
QC CHECKLIST:
✓ CEFR C1 — research presentation, technical vocabulary, data interpretation, implicit reasoning.
✓ Academia product line — appropriate complexity for C1 academic English learner.
✓ Q4 tests comprehension of counterintuitive finding (decline below 2000m).
✓ Q5 tests hypothesis reasoning — requires connecting marine snow explanation to the finding.
✓ Q7 tests percentage precision (28%) — a demanding listening detail.
✓ IRT range 0.6 to 1.2 appropriate for C1 academia.
HUMAN REVIEW: Verify Raman, polypropylene, polyethylene, and sub-millimetre in final audio.
`;

const items = [
  // Q1 — Detail: study duration
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'detail', 'research', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Adaeze Okafor (environmental science researcher, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 1,
      prompt: 'How long did the study last?',
      options: [
        { text: 'Six months', isCorrect: false, rationale: 'Six months is not the duration stated.' },
        { text: 'One year',   isCorrect: false, rationale: 'One year is not the duration stated.' },
        { text: 'Two years',  isCorrect: true,  rationale: 'Dr. Okafor says "our two-year study."' },
        { text: 'Five years', isCorrect: false, rationale: 'Five years is not the duration stated.' },
      ],
    },
  },
  // Q2 — Detail: maximum sampling depth
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'detail', 'research', 'numbers', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Adaeze Okafor (environmental science researcher, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 2,
      prompt: 'What was the deepest depth at which samples were collected?',
      options: [
        { text: '800 metres',    isCorrect: false, rationale: 'Eight hundred metres is the minimum depth, not the maximum.' },
        { text: '1,500 metres',  isCorrect: false, rationale: '1,500 metres is not mentioned as a sampling depth.' },
        { text: '3,000 metres',  isCorrect: true,  rationale: 'Dr. Okafor says "sampling depth ranged from eight hundred to three thousand metres."' },
        { text: '5,000 metres',  isCorrect: false, rationale: 'Five thousand metres is not stated.' },
      ],
    },
  },
  // Q3 — Detail: standard size definition of microplastics
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.3, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'detail', 'terminology', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Adaeze Okafor (environmental science researcher, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 3,
      prompt: 'What is the standard size definition of microplastics mentioned in the research?',
      options: [
        { text: 'Under 1 mm',  isCorrect: false, rationale: 'Under 1mm is the "sub-millimetre" sub-category, not the standard definition.' },
        { text: 'Under 5 mm',  isCorrect: true,  rationale: 'Dr. Okafor says "particles under five millimetres — the standard definition of microplastics."' },
        { text: 'Under 10 mm', isCorrect: false, rationale: '10mm is not the standard definition given.' },
        { text: 'Under 1 cm',  isCorrect: false, rationale: '1cm equals 10mm; this is not the standard given (which is 5mm).' },
      ],
    },
  },
  // Q4 — Unexpected finding: concentration below 2000m
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'detail', 'data-interpretation', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Adaeze Okafor (environmental science researcher, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 4,
      prompt: 'What unexpected finding was made about microplastic concentration below approximately 2,000 metres?',
      options: [
        { text: 'Concentration doubled compared to shallower depths',         isCorrect: false, rationale: 'Doubling would be a continuation of the upward trend, not the unexpected finding.' },
        { text: 'No plastics at all were found below 2,000 metres',           isCorrect: false, rationale: 'The research found a decline, not a complete absence.' },
        { text: 'The polymer composition changed completely',                 isCorrect: false, rationale: 'Polymer composition is a separate finding; the surprising result is about concentration levels.' },
        { text: 'Concentration declined consistently below that depth',      isCorrect: true,  rationale: 'Dr. Okafor says "we found a consistent decline in concentration below approximately two thousand metres."' },
      ],
    },
  },
  // Q5 — Hypothesis: explanation for the decline
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.4, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'inference', 'hypothesis', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Adaeze Okafor (environmental science researcher, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'inference', questionNumber: 5,
      prompt: 'What is the researchers\' hypothesis for the decline in concentration below 2,000 metres?',
      options: [
        { text: 'Ocean currents carry the plastics away from the sampling sites',                isCorrect: false, rationale: 'Currents are not the offered explanation.' },
        { text: 'Deep-sea bacteria break down the plastics at those depths',                     isCorrect: false, rationale: 'Bacterial breakdown is not the hypothesis given.' },
        { text: 'The sampling method was inaccurate at extreme depths',                         isCorrect: false, rationale: 'Methodology limitations are not offered as the explanation for this finding.' },
        { text: 'Plastics aggregate in marine snow and descend to the seafloor in clusters',    isCorrect: true,  rationale: 'Dr. Okafor says the hypothesis is "a settling and aggregation effect — plastics become embedded in marine snow and descend to the seafloor in clusters."' },
      ],
    },
  },
  // Q6 — Detail: polymer types that dominated
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.0, discrimination: 1.5, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'detail', 'terminology', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Adaeze Okafor (environmental science researcher, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 6,
      prompt: 'Which two polymer types dominated the samples?',
      options: [
        { text: 'Nylon and natural rubber',            isCorrect: false, rationale: 'Nylon and rubber are not the polymers mentioned.' },
        { text: 'PVC and polystyrene',                 isCorrect: false, rationale: 'PVC and polystyrene are not the polymers stated.' },
        { text: 'Fibreglass and industrial resin',     isCorrect: false, rationale: 'Fibreglass and resin are industrial materials not mentioned in this context.' },
        { text: 'Polyethylene and polypropylene',      isCorrect: true,  rationale: 'Dr. Okafor says "Polyethylene and polypropylene dominated our samples."' },
      ],
    },
  },
  // Q7 — Detail: percentage of fibres
  {
    skill: 'LISTENING', cefrLevel: 'C1', difficulty: 1.2, discrimination: 1.5, guessing: 0.25,
    tags: ['listening', 'academia', 'c1', 'detail', 'numbers', MODULE_ID],
    content: {
      moduleId: MODULE_ID, productLine: PRODUCT_LINE, moduleTitle: MODULE_TITLE,
      cefrBand: CEFR_BAND, estimatedDurationSeconds: ESTIMATED_DURATION_SECONDS,
      numberOfSpeakers: 1, speakers: ['Dr. Adaeze Okafor (environmental science researcher, female adult)'],
      passage: HUMAN_SCRIPT, ttsScript: TTS_SCRIPT, ttsSettings: TTS_SETTINGS,
      ttsNotes: TTS_NOTES, qualityNotes: QUALITY_NOTES,
      subskill: 'detail', questionNumber: 7,
      prompt: 'What percentage of the identified particles were fibres?',
      options: [
        { text: '10%', isCorrect: false, rationale: 'Ten percent is not the figure stated.' },
        { text: '28%', isCorrect: true,  rationale: 'Dr. Okafor says "Fibres … represented twenty-eight percent of particles identified."' },
        { text: '42%', isCorrect: false, rationale: 'Forty-two percent is not the figure stated.' },
        { text: '65%', isCorrect: false, rationale: 'Sixty-five percent is not the figure stated.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Listening Phase 15 — ${MODULE_TITLE} (${items.length} items)…`);
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
  console.log(`✓ Listening Phase 15 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
