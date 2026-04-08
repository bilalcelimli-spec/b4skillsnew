/**
 * PHASE 5 — Chapters 7 & 8
 * Topics: Adjectives (patterns, linking verb+adj, types, comparison, superlatives,
 *         compound adj, -ed/-ing adj) · Adverbs (all types, position, comparison)
 * 5 questions per sub-topic
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const items = [
  // ── CH7 · MAJOR ADJECTIVE PATTERNS ──────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['adjectives', 'patterns', 'attributive-predicative'],
    content: {
      prompt: 'Which adjective can ONLY be used attributively (before a noun)?',
      options: [
        { text: 'utter (e.g., utter nonsense)',     isCorrect: true,  rationale: '"Utter" is exclusively attributive: "utter nonsense" — *"the nonsense was utter" is ungrammatical.' },
        { text: 'tired',                            isCorrect: false, rationale: '"Tired" can be both attributive ("a tired child") and predicative ("The child is tired").' },
        { text: 'happy',                            isCorrect: false, rationale: '"Happy" is freely used in both positions.' },
        { text: 'cold',                             isCorrect: false, rationale: '"Cold" works in both positions.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['adjectives', 'patterns', 'predicative-only'],
    content: {
      prompt: 'Which adjective is restricted to PREDICATIVE position only?',
      options: [
        { text: 'afraid',    isCorrect: true,  rationale: '"Afraid" only follows a linking verb: "She is afraid." *"an afraid child" is ungrammatical.' },
        { text: 'beautiful', isCorrect: false, rationale: '"Beautiful" is used in both positions.' },
        { text: 'large',     isCorrect: false, rationale: '"Large" is used freely in both positions.' },
        { text: 'ancient',   isCorrect: false, rationale: '"Ancient" is primarily attributive but not exclusively.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['adjectives', 'patterns', 'order'],
    content: {
      prompt: 'Which sequence follows the correct order of adjective types?',
      options: [
        { text: 'a lovely little old rectangular green French silver whittling knife',  isCorrect: true,  rationale: 'Standard order: opinion → size → age → shape → colour → origin → material → purpose + noun.' },
        { text: 'a French old green little lovely rectangular silver whittling knife',  isCorrect: false, rationale: 'Adjective order is violated.' },
        { text: 'a silver French rectangular old little lovely green whittling knife',  isCorrect: false, rationale: 'Adjective order is violated.' },
        { text: 'a whittling green silver French old rectangular little lovely knife',  isCorrect: false, rationale: 'Adjective order is violated.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['adjectives', 'patterns', 'postpositive'],
    content: {
      prompt: 'Which phrase illustrates a POSTPOSITIVE adjective (adjective placed AFTER the noun)?',
      options: [
        { text: 'the president elect',      isCorrect: true,  rationale: '"Elect" is a legal/formal adjective always placed after the noun.' },
        { text: 'the tired candidate',      isCorrect: false, rationale: '"Tired" is in attributive position (before the noun).' },
        { text: 'an interesting proposal',  isCorrect: false, rationale: 'Attributive position.' },
        { text: 'the problem is complex',   isCorrect: false, rationale: '"Complex" here is predicative, not postpositive.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['adjectives', 'patterns', 'gradability'],
    content: {
      prompt: '"The results were ____ unique." Which intensifier is INCORRECT with non-gradable adjectives?',
      options: [
        { text: 'very',        isCorrect: true,  rationale: '"Unique" is absolute/non-gradable; "very unique" is nonstandard in formal English.' },
        { text: 'absolutely',  isCorrect: false, rationale: '"Absolutely unique" is idiomatic — "absolutely" is used as an amplifier with non-gradable adjectives.' },
        { text: 'truly',       isCorrect: false, rationale: '"Truly unique" is an accepted emphatic use.' },
        { text: 'completely',  isCorrect: false, rationale: '"Completely unique" is acceptable as a non-gradable amplifier.' },
      ],
    },
  },

  // ── CH7 · COMPARATIVE AND SUPERLATIVE FORMS ──────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['adjectives', 'comparison', 'comparative'],
    content: {
      prompt: '"This algorithm is ____ efficient than the previous version." Choose the correct form.',
      options: [
        { text: 'more',    isCorrect: true,  rationale: 'Three or more syllables: use "more + adjective" for comparatives.' },
        { text: 'most',    isCorrect: false, rationale: '"Most" is for superlatives, not comparatives.' },
        { text: 'much',    isCorrect: false, rationale: '"Much" intensifies a comparative that is already formed: "much more efficient".' },
        { text: 'efficienter', isCorrect: false, rationale: 'Polysyllabic adjectives do not take -er.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['adjectives', 'comparison', 'constructions'],
    content: {
      prompt: '"The system becomes ____ complex, ____ errors it generates." Which construction expresses proportional increase?',
      options: [
        { text: 'the more / the more',   isCorrect: true,  rationale: '"The more … the more …" = parallel comparatives for proportional relationship.' },
        { text: 'more / more',           isCorrect: false, rationale: 'Without "the", the parallel structure is incomplete.' },
        { text: 'as / as',               isChoct: false, isCorrect: false, rationale: '"As … as" expresses equality, not proportional increase.' },
        { text: 'so / so',               isCorrect: false, rationale: '"So … so" is not a standard proportional comparison structure.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['adjectives', 'comparison', 'modification'],
    content: {
      prompt: '"Her second paper was ____ better than the first." Which modifier correctly intensifies a comparative?',
      options: [
        { text: 'considerably',   isCorrect: true,  rationale: '"Considerably" (and "much," "far," "significantly") modify comparatives.' },
        { text: 'very',           isCorrect: false, rationale: '"Very" is not used to modify comparative adjectives; use "much/far/a lot".' },
        { text: 'so',             isCorrect: false, rationale: '"So" modifies absolute adjectives, not comparatives.' },
        { text: 'too',            isCorrect: false, rationale: '"Too" modifies absolute adjectives and creates a negative excess meaning.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['adjectives', 'comparison', 'superlative', 'modification'],
    content: {
      prompt: '"This is ____ the most compelling argument in the debate." Which superlative modifier is correct?',
      options: [
        { text: 'by far',      isCorrect: true,  rationale: '"By far" intensifies superlatives: "by far the most compelling".' },
        { text: 'more',        isCorrect: false, rationale: '"More" introduces comparatives, not superlatives.' },
        { text: 'very',        isCorrect: false, rationale: '"Very" does not modify superlatives ("the very most" is possible but rare and stylistic).' },
        { text: 'so much',     isCorrect: false, rationale: '"So much" does not intensify superlatives in standard usage.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.0, discrimination: 1.0, guessing: 0.25,
    tags: ['adjectives', 'comparison', 'irregular'],
    content: {
      prompt: '"The second option is clearly ____." (irregular superlative of "good") Which form is correct?',
      options: [
        { text: 'the best',     isCorrect: true,  rationale: '"Good → better → the best" is the irregular comparative/superlative.' },
        { text: 'the most good',isCorrect: false, rationale: '"Good" forms an irregular superlative; "most good" is nonstandard.' },
        { text: 'the goodest',  isCorrect: false, rationale: '"Goodest" is not a valid English form.' },
        { text: 'the better',   isCorrect: false, rationale: '"The better" is the comparative used in comparisons of two things, not the superlative.' },
      ],
    },
  },

  // ── CH7 · -ED / -ING ADJECTIVES AND COMPOUND ADJECTIVES ─────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['adjectives', 'ed-ing-adjectives'],
    content: {
      prompt: '"The audience found the documentary ____." Which form means the documentary caused feelings of interest?',
      options: [
        { text: 'fascinating',  isCorrect: true,  rationale: '-ing adjective = the noun causes the feeling.' },
        { text: 'fascinated',   isCorrect: false, rationale: '-ed adjective = the noun experiences the feeling: "a fascinated audience".' },
        { text: 'fascinate',    isCorrect: false, rationale: 'Base verb form is not an adjective.' },
        { text: 'fascination',  isCorrect: false, rationale: 'This is a noun, not an adjective.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['adjectives', 'ed-ing-adjectives'],
    content: {
      prompt: '"She gave a ____ speech that left the audience in tears." Which adjective is correct?',
      options: [
        { text: 'moving',   isCorrect: true,  rationale: '"Moving" (-ing) = the speech caused emotion in the listeners.' },
        { text: 'moved',    isCorrect: false, rationale: '"Moved" (-ed) = someone felt emotion: "a moved audience".' },
        { text: 'movingly', isCorrect: false, rationale: '"Movingly" is an adverb; a noun modifier must be an adjective.' },
        { text: 'movement', isCorrect: false, rationale: '"Movement" is a noun, not an adjective modifier.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['adjectives', 'compound-adjectives'],
    content: {
      prompt: '"She is a ____ researcher with an impressive publication record." (age: 35, experience: many years) Choose the compound adjective.',
      options: [
        { text: 'well-established',   isCorrect: true,  rationale: '"Well-established" is a hyphenated compound adjective in attributive position.' },
        { text: 'well established',   isCorrect: false, rationale: 'Compound adjectives in attributive position are hyphenated: "well-established researcher".' },
        { text: 'established well',   isCorrect: false, rationale: 'Word order in compound adjectives is fixed.' },
        { text: 'wellestablished',    isCorrect: false, rationale: 'A hyphen is required in compound adjectives.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['adjectives', 'compound-adjectives', 'measurement'],
    content: {
      prompt: '"She enrolled in ____ programme." (a programme that lasts two years) Which compound adjective is correct?',
      options: [
        { text: 'a two-year',    isCorrect: true,  rationale: 'Compound adjectives of measurement: number + hyphen + singular noun (no -s).' },
        { text: 'a two-years',   isCorrect: false, rationale: 'The noun in a compound adjective does not take a plural -s.' },
        { text: 'a two years',   isCorrect: false, rationale: 'Hyphen is required in attributive compound adjectives.' },
        { text: 'a two year\'s', isCorrect: false, rationale: 'Possessive apostrophe is not used in compound adjective formation.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['adjectives', 'ed-ing-adjectives', 'advanced'],
    content: {
      prompt: '"The ____ look in her eyes suggested she had not expected the news." Which form expresses the feeling she experienced?',
      options: [
        { text: 'stunned',      isCorrect: true,  rationale: '"Stunned" (-ed) = she experienced the state of shock/surprise.' },
        { text: 'stunning',     isCorrect: false, rationale: '"Stunning" (-ing) = it caused the feeling of shock in others.' },
        { text: 'stun',         isCorrect: false, rationale: 'Base verb form is not an adjective.' },
        { text: 'being stunned',isCorrect: false, rationale: 'A participial gerund phrase, not a simple adjective in this pre-nominal position.' },
      ],
    },
  },

  // ── CH8 · ADVERBS — TYPES AND FUNCTIONS ─────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.2, discrimination: 1.1, guessing: 0.25,
    tags: ['adverbs', 'manner'],
    content: {
      prompt: '"She spoke ____ to the grieving family." Which adverb of manner is correct?',
      options: [
        { text: 'gently',    isCorrect: true,  rationale: '"Gently" is an adverb of manner describing how she spoke.' },
        { text: 'gentle',    isCorrect: false, rationale: '"Gentle" is an adjective; an adverb is needed to modify the verb.' },
        { text: 'gentler',   isCorrect: false, rationale: '"Gentler" is a comparative adjective, not an adverb.' },
        { text: 'gentling',  isCorrect: false, rationale: 'Not a standard English word.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['adverbs', 'sentential', 'disjunct'],
    content: {
      prompt: '"Frankly, the report is unacceptable." The adverb "frankly" functions as a:',
      options: [
        { text: 'Sentential (disjunct) adverb expressing the speaker\'s viewpoint.',  isCorrect: true,  rationale: 'Disjuncts comment on the whole proposition from the speaker\'s perspective.' },
        { text: 'Adverb of manner modifying "is".',                                  isCorrect: false, rationale: '"Frankly" does not describe how the report is unacceptable.' },
        { text: 'Focusing adverb restricting the scope of the verb.',                isCorrect: false, rationale: 'Focusing adverbs (even, only, merely) restrict scope, not speaker stance.' },
        { text: 'Adverb of degree intensifying "unacceptable".',                    isCorrect: false, rationale: 'Degree adverbs precede adjectives: "frankly unacceptable" is possible but here "frankly" opens the sentence as a disjunct.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['adverbs', 'focusing'],
    content: {
      prompt: '"____ the senior partners were informed; the associates were kept in the dark." Which focusing adverb is correct?',
      options: [
        { text: 'Only',    isCorrect: true,  rationale: '"Only" restricts the scope to "the senior partners" — others were not informed.' },
        { text: 'Even',    isCorrect: false, rationale: '"Even the senior partners were informed" implies surprise that they too were told.' },
        { text: 'Just',    isCorrect: false, rationale: '"Just" is possible but more informal than "only" in this formal context.' },
        { text: 'Almost',  isCorrect: false, rationale: '"Almost" would imply nearly all of them, not restriction to a subgroup.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['adverbs', 'degree', 'rather-quite-fairly'],
    content: {
      prompt: '"The presentation was ____ good, but not outstanding." Which adverb of degree fits best (positive but not strong)?',
      options: [
        { text: 'fairly',      isCorrect: true,  rationale: '"Fairly good" = moderately good, a neutral positive assessment.' },
        { text: 'rather',      isCorrect: false, rationale: '"Rather good" often signals a surprised or emphatic positive, or it can soften criticism; context-dependent.' },
        { text: 'quite',       isCorrect: false, rationale: '"Quite good" (British English) = fairly/somewhat; with gradable adjectives it can mean thoroughly or moderately.' },
        { text: 'absolutely',  isCorrect: false, rationale: '"Absolutely" is used with non-gradable adjectives: "absolutely perfect".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['adverbs', 'restricting'],
    content: {
      prompt: '"The device works ____ in low-humidity environments." (nowhere else) Which restricting adverb fits?',
      options: [
        { text: 'only',      isCorrect: true,  rationale: '"Only" restricts function to one condition.' },
        { text: 'almost',    isCorrect: false, rationale: '"Almost" = nearly, not exclusively.' },
        { text: 'merely',    isCorrect: false, rationale: '"Merely" adds a dismissive nuance (just/no more than), not pure restriction.' },
        { text: 'even',      isCorrect: false, rationale: '"Even" adds surprise/unexpectedness, not restriction.' },
      ],
    },
  },

  // ── CH8 · POSITION OF ADVERBS ────────────────────────────────────────────
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: -0.1, discrimination: 1.1, guessing: 0.25,
    tags: ['adverbs', 'position', 'frequency'],
    content: {
      prompt: '"She ____ reads the briefings before the meeting." Where does the frequency adverb "always" go?',
      options: [
        { text: 'always (before the main verb: "She always reads")',    isCorrect: true,  rationale: 'Frequency adverbs go before the main verb but after auxiliary verbs.' },
        { text: 'at the end: "She reads the briefings always."',        isCorrect: false, rationale: 'End position for frequency adverbs is unusual and emphatic; mid-position is standard.' },
        { text: 'after the object: "She reads always the briefings."',  isCorrect: false, rationale: 'Adverb between object and verb is ungrammatical here.' },
        { text: 'before the subject: "Always she reads the briefings."',isCorrect: false, rationale: 'Initial position is possible but triggers subject-auxiliary inversion in certain formal registers: "Always does she read…"' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['adverbs', 'position', 'manner-place-time'],
    content: {
      prompt: '"She presented her findings quietly in the conference hall last Tuesday." What is the standard order of the final adverbials?',
      options: [
        { text: 'Manner → Place → Time',   isCorrect: true,  rationale: 'The canonical order for end-position adverbials: manner + place + time.' },
        { text: 'Time → Place → Manner',   isCorrect: false, rationale: 'This reverses the standard order.' },
        { text: 'Place → Manner → Time',   isCorrect: false, rationale: 'Place before manner is incorrect in the standard ordering.' },
        { text: 'Time → Manner → Place',   isCorrect: false, rationale: 'Non-standard ordering.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B2', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['adverbs', 'position', 'split-infinitive'],
    content: {
      prompt: '"She decided to ____ investigate the matter." Which position for "thoroughly" avoids a split infinitive?',
      options: [
        { text: '"She decided to investigate the matter thoroughly."',   isCorrect: true,  rationale: 'End-position avoids splitting the infinitive "to investigate".' },
        { text: '"She decided to thoroughly investigate the matter."',   isCorrect: false, rationale: '"To thoroughly investigate" is a split infinitive (adverb between "to" and verb); avoided in formal writing.' },
        { text: '"She decided thoroughly to investigate the matter."',   isCorrect: false, rationale: 'Mid-position before "to" is awkward; it modifies "decided" rather than "investigate".' },
        { text: '"Thoroughly she decided to investigate the matter."',   isCorrect: false, rationale: 'Initial position changes the meaning — "thoroughly" now modifies "decided".' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['adverbs', 'comparison', 'adverbs-of-degree'],
    content: {
      prompt: '"He drives ____ than his brother." (irregular adverb comparison) Which is correct?',
      options: [
        { text: 'worse',      isCorrect: true,  rationale: '"Badly → worse → worst" — irregular comparative adverb.' },
        { text: 'more badly', isCorrect: false, rationale: '"Badly" forms an irregular comparative; "more badly" is nonstandard.' },
        { text: 'badlier',    isCorrect: false, rationale: 'Not a valid English form.' },
        { text: 'worst',      isCorrect: false, rationale: '"Worst" is the superlative, not the comparative.' },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'C1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['adverbs', 'viewpoint', 'conjunctive'],
    content: {
      prompt: '"The project was completed on time; ____, costs exceeded the budget." Which connective adverb best signals unexpected contrast?',
      options: [
        { text: 'however',       isCorrect: true,  rationale: '"However" is a connective/conjunctive adverb signalling concessive contrast.' },
        { text: 'furthermore',   isCorrect: false, rationale: '"Furthermore" signals addition, not contrast.' },
        { text: 'therefore',     isCorrect: false, rationale: '"Therefore" signals result/consequence, not contrast.' },
        { text: 'similarly',     isCorrect: false, rationale: '"Similarly" signals comparison/similarity.' },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding Phase 5 grammar items (${items.length} total)…`);
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
  console.log(`✓ Phase 5 complete — ${inserted} items inserted.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
