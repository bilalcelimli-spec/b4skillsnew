/**
 * Junior Suite Comprehensive Seed — Age 11–14 (A1 to B1)
 * Covers: VOCABULARY, GRAMMAR, READING
 * Pedagogical focus: narrative, descriptive, analytical thinking, wider vocabulary
 * Topics: school subjects, hobbies, sports, travel, technology, friends, environment, culture
 */

import { PrismaClient } from '@prisma/client';
import { validateOrExit } from "./_validation-helper.js";

const prisma = new PrismaClient();

interface ItemInput {
  skill: string;
  cefrLevel: string;
  difficulty: number;
  discrimination: number;
  guessing: number;
  type?: string;
  tags: string[];
  content: Record<string, unknown>;
}

const items: ItemInput[] = [

  // ══════════════════════════════════════════════════════════
  // VOCABULARY — A1 (extending basic vocab for 11-14)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.4, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'school', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'A class where you learn about living things — plants and animals — is called ___.',
      options: [
        { text: 'biology', isCorrect: true },
        { text: 'chemistry', isCorrect: false },
        { text: 'physics', isCorrect: false },
        { text: 'maths', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.4, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'sports', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'In basketball, you score by throwing the ball through the ___.',
      options: [
        { text: 'hoop', isCorrect: true },
        { text: 'goal', isCorrect: false },
        { text: 'net', isCorrect: false },
        { text: 'ring', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'technology', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'You use a ___ to search for information on the internet.',
      options: [
        { text: 'browser', isCorrect: true },
        { text: 'printer', isCorrect: false },
        { text: 'scanner', isCorrect: false },
        { text: 'keyboard', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'hobbies', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'A hobby where you take pictures is called ___.',
      options: [
        { text: 'photography', isCorrect: true },
        { text: 'painting', isCorrect: false },
        { text: 'drawing', isCorrect: false },
        { text: 'acting', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'feelings', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'When you are ___, you feel worried about something bad that might happen.',
      options: [
        { text: 'nervous', isCorrect: true },
        { text: 'excited', isCorrect: false },
        { text: 'relaxed', isCorrect: false },
        { text: 'proud', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'food', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'A ___ is a type of food that gives you lots of energy, like bread or pasta.',
      options: [
        { text: 'carbohydrate', isCorrect: true },
        { text: 'vitamin', isCorrect: false },
        { text: 'protein', isCorrect: false },
        { text: 'mineral', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'community', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'A person who writes news stories for a newspaper is a ___.',
      options: [
        { text: 'journalist', isCorrect: true },
        { text: 'novelist', isCorrect: false },
        { text: 'editor', isCorrect: false },
        { text: 'publisher', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'travel', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'When you travel to a different country, you need a ___.',
      options: [
        { text: 'passport', isCorrect: true },
        { text: 'ticket', isCorrect: false },
        { text: 'suitcase', isCorrect: false },
        { text: 'map', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'nature', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'Animals that only eat plants are called ___.',
      options: [
        { text: 'herbivores', isCorrect: true },
        { text: 'carnivores', isCorrect: false },
        { text: 'omnivores', isCorrect: false },
        { text: 'predators', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'music', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'A group of musicians who play together is called an ___.',
      options: [
        { text: 'orchestra', isCorrect: true },
        { text: 'audience', isCorrect: false },
        { text: 'ensemble', isCorrect: false },
        { text: 'chorus', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // VOCABULARY — A2 (extending descriptions, collocations)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'collocations', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'Choose the correct collocation: "take a ___".',
      options: [
        { text: 'photograph', isCorrect: true },
        { text: 'run', isCorrect: false },
        { text: 'dream', isCorrect: false },
        { text: 'work', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'environment', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'Gases like CO₂ that trap heat in the atmosphere are called ___ gases.',
      options: [
        { text: 'greenhouse', isCorrect: true },
        { text: 'toxic', isCorrect: false },
        { text: 'invisible', isCorrect: false },
        { text: 'volcanic', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'personality', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'A ___ person is always willing to help others and share.',
      options: [
        { text: 'generous', isCorrect: true },
        { text: 'selfish', isCorrect: false },
        { text: 'patient', isCorrect: false },
        { text: 'rude', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'technology', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'When you ___ a file, you make a copy of it to keep it safe.',
      options: [
        { text: 'back up', isCorrect: true },
        { text: 'delete', isCorrect: false },
        { text: 'upload', isCorrect: false },
        { text: 'compress', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'science', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'Water changes from liquid to gas when it ___.',
      options: [
        { text: 'evaporates', isCorrect: true },
        { text: 'condenses', isCorrect: false },
        { text: 'freezes', isCorrect: false },
        { text: 'melts', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'phrasal-verbs', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: '"She looks ___ her little brother while their parents are at work." = She takes care of him.',
      options: [
        { text: 'after', isCorrect: true },
        { text: 'up', isCorrect: false },
        { text: 'into', isCorrect: false },
        { text: 'over', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'culture', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'A country\'s ___ includes its traditions, food, art, and language.',
      options: [
        { text: 'culture', isCorrect: true },
        { text: 'currency', isCorrect: false },
        { text: 'climate', isCorrect: false },
        { text: 'government', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'word-formation', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'The adjective form of "danger" is ___.',
      options: [
        { text: 'dangerous', isCorrect: true },
        { text: 'dangered', isCorrect: false },
        { text: 'endangers', isCorrect: false },
        { text: 'dangerful', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'context', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'Choose the word that best fits: "The scientist made an important ___ that changed our understanding of the universe."',
      options: [
        { text: 'discovery', isCorrect: true },
        { text: 'invention', isCorrect: false },
        { text: 'experiment', isCorrect: false },
        { text: 'solution', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'synonyms', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'A synonym for "enormous" is ___.',
      options: [
        { text: 'huge', isCorrect: true },
        { text: 'tiny', isCorrect: false },
        { text: 'beautiful', isCorrect: false },
        { text: 'strange', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // VOCABULARY — B1 (academic, abstract, wider themes)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'academic', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'To ___ information means to look at it carefully and understand it.',
      options: [
        { text: 'analyse', isCorrect: true },
        { text: 'ignore', isCorrect: false },
        { text: 'copy', isCorrect: false },
        { text: 'delete', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'environment', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'Using solar panels and wind farms is part of a move towards ___ energy.',
      options: [
        { text: 'renewable', isCorrect: true },
        { text: 'fossil', isCorrect: false },
        { text: 'nuclear', isCorrect: false },
        { text: 'chemical', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'abstract', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'A ___ person thinks carefully before acting and avoids taking risks.',
      options: [
        { text: 'cautious', isCorrect: true },
        { text: 'reckless', isCorrect: false },
        { text: 'impulsive', isCorrect: false },
        { text: 'creative', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'word-formation', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'The noun form of "achieve" is ___.',
      options: [
        { text: 'achievement', isCorrect: true },
        { text: 'achiever', isCorrect: false },
        { text: 'achieving', isCorrect: false },
        { text: 'achievable', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'global-issues', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'When many different species of animals and plants exist in one area, we call this ___.',
      options: [
        { text: 'biodiversity', isCorrect: true },
        { text: 'ecosystem', isCorrect: false },
        { text: 'habitat', isCorrect: false },
        { text: 'evolution', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'media', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: '"She shared a ___ of facts she had memorised about the solar system." The sentence needs a word meaning a very large amount.',
      options: [
        { text: 'wealth', isCorrect: true },
        { text: 'lack', isCorrect: false },
        { text: 'fear', isCorrect: false },
        { text: 'loss', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'phrasal-verbs', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'To ___ with something means to manage or deal with it.',
      options: [
        { text: 'cope', isCorrect: true },
        { text: 'make', isCorrect: false },
        { text: 'call', isCorrect: false },
        { text: 'keep', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'opinion', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'When something is ___, it is open to different interpretations and not clearly right or wrong.',
      options: [
        { text: 'controversial', isCorrect: true },
        { text: 'straightforward', isCorrect: false },
        { text: 'obvious', isCorrect: false },
        { text: 'accurate', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'idiomatic', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: '"It\'s raining cats and dogs" means ___.',
      options: [
        { text: 'It is raining very heavily.', isCorrect: true },
        { text: 'Animals are falling from the sky.', isCorrect: false },
        { text: 'The weather is unpredictable.', isCorrect: false },
        { text: 'It is starting to rain.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'register', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'Which phrase is more formal and suitable for a school essay?',
      options: [
        { text: 'In conclusion, it is clear that...', isCorrect: true },
        { text: 'So basically, like...', isCorrect: false },
        { text: 'Anyway, I think...', isCorrect: false },
        { text: 'Totally, this shows...', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'connotation', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'Which word has a negative connotation? "The politician was ___ about his plans."',
      options: [
        { text: 'secretive', isCorrect: true },
        { text: 'thoughtful', isCorrect: false },
        { text: 'careful', isCorrect: false },
        { text: 'detailed', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'B1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['vocabulary', 'junior', 'science-tech', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'An ___ is a type of computer program that can perform tasks without constant human input.',
      options: [
        { text: 'algorithm', isCorrect: true },
        { text: 'application', isCorrect: false },
        { text: 'analysis', isCorrect: false },
        { text: 'animation', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // GRAMMAR — A1 (present simple/continuous, past simple intro)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.5, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'present-simple', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'My sister ___ guitar every evening.',
      options: [
        { text: 'plays', isCorrect: true },
        { text: 'play', isCorrect: false },
        { text: 'playing', isCorrect: false },
        { text: 'is plays', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.4, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'present-continuous', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'Right now, they ___ their homework.',
      options: [
        { text: 'are doing', isCorrect: true },
        { text: 'do', isCorrect: false },
        { text: 'did', isCorrect: false },
        { text: 'does', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.4, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'past-simple', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'Last weekend, we ___ to the cinema.',
      options: [
        { text: 'went', isCorrect: true },
        { text: 'go', isCorrect: false },
        { text: 'gone', isCorrect: false },
        { text: 'will go', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'question-forms', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: '___ she speak Spanish?',
      options: [
        { text: 'Does', isCorrect: true },
        { text: 'Do', isCorrect: false },
        { text: 'Is', isCorrect: false },
        { text: 'Has', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'modal-can', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: '___ I use your phone, please?',
      options: [
        { text: 'Can', isCorrect: true },
        { text: 'Do', isCorrect: false },
        { text: 'Am', isCorrect: false },
        { text: 'Have', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'articles', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'I found ___ key on the floor. ___ key is blue.',
      options: [
        { text: 'a ... The', isCorrect: true },
        { text: 'the ... A', isCorrect: false },
        { text: 'an ... The', isCorrect: false },
        { text: 'a ... A', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'there-is-are', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: '___ a new student in our class today.',
      options: [
        { text: 'There is', isCorrect: true },
        { text: 'There are', isCorrect: false },
        { text: 'It is', isCorrect: false },
        { text: 'He is', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'possessives', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'That is the teacher\'s desk. It is ___ desk.',
      options: [
        { text: 'her', isCorrect: true },
        { text: 'his', isCorrect: false },
        { text: 'their', isCorrect: false },
        { text: 'our', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'prepositions', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'The school is ___ the library and the park.',
      options: [
        { text: 'between', isCorrect: true },
        { text: 'behind', isCorrect: false },
        { text: 'in front of', isCorrect: false },
        { text: 'above', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'object-pronouns', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'I called Maria but she didn\'t answer ___.',
      options: [
        { text: 'me', isCorrect: true },
        { text: 'I', isCorrect: false },
        { text: 'my', isCorrect: false },
        { text: 'mine', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'frequency-adverbs', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'He ___ forgets his keys. He loses them almost every day.',
      options: [
        { text: 'always', isCorrect: true },
        { text: 'never', isCorrect: false },
        { text: 'rarely', isCorrect: false },
        { text: 'sometimes', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'time-prepositions', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'I was born ___ June.',
      options: [
        { text: 'in', isCorrect: true },
        { text: 'on', isCorrect: false },
        { text: 'at', isCorrect: false },
        { text: 'by', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'comparative', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'Maths is ___ than art for me.',
      options: [
        { text: 'more difficult', isCorrect: true },
        { text: 'difficultier', isCorrect: false },
        { text: 'difficulter', isCorrect: false },
        { text: 'most difficult', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -0.8, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'junior', 'past-negative', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: 'We ___ any homework last night.',
      options: [
        { text: 'didn\'t have', isCorrect: true },
        { text: 'don\'t have', isCorrect: false },
        { text: 'haven\'t', isCorrect: false },
        { text: 'wasn\'t have', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -0.8, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'junior', 'wh-questions', 'a1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      prompt: '___ did you go on holiday? — To Spain.',
      options: [
        { text: 'Where', isCorrect: true },
        { text: 'When', isCorrect: false },
        { text: 'Why', isCorrect: false },
        { text: 'What', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // GRAMMAR — A2 (past continuous, going to, present perfect intro)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.6, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'junior', 'past-continuous', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'When the phone rang, I ___ my homework.',
      options: [
        { text: 'was doing', isCorrect: true },
        { text: 'did', isCorrect: false },
        { text: 'do', isCorrect: false },
        { text: 'have done', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.6, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'junior', 'future-will', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'The weather forecast says it ___ rain tomorrow.',
      options: [
        { text: 'will', isCorrect: true },
        { text: 'is', isCorrect: false },
        { text: 'would', isCorrect: false },
        { text: 'was', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'junior', 'present-perfect', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'I ___ never ___ sushi before.',
      options: [
        { text: 'have ... tried', isCorrect: true },
        { text: 'did ... try', isCorrect: false },
        { text: 'have ... try', isCorrect: false },
        { text: 'was ... tried', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'junior', 'modal-should', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'You ___ exercise more. It\'s good for your health.',
      options: [
        { text: 'should', isCorrect: true },
        { text: 'must not', isCorrect: false },
        { text: 'can\'t', isCorrect: false },
        { text: 'don\'t have to', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'junior', 'unless', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'You can\'t enter the club ___ you are a member.',
      options: [
        { text: 'unless', isCorrect: true },
        { text: 'if', isCorrect: false },
        { text: 'when', isCorrect: false },
        { text: 'until', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'junior', 'relative-clauses', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'The girl ___ sits next to me is my best friend.',
      options: [
        { text: 'who', isCorrect: true },
        { text: 'which', isCorrect: false },
        { text: 'where', isCorrect: false },
        { text: 'what', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'reported-speech', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'She said, "I am tired." → She said that she ___ tired.',
      options: [
        { text: 'was', isCorrect: true },
        { text: 'is', isCorrect: false },
        { text: 'were', isCorrect: false },
        { text: 'has been', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'zero-conditional', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'If you heat water to 100°C, it ___.',
      options: [
        { text: 'boils', isCorrect: true },
        { text: 'will boil', isCorrect: false },
        { text: 'would boil', isCorrect: false },
        { text: 'boiled', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'too-enough', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'This box is ___ heavy for me to carry.',
      options: [
        { text: 'too', isCorrect: true },
        { text: 'enough', isCorrect: false },
        { text: 'very', isCorrect: false },
        { text: 'much', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'passive', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'The book ___ written by J.K. Rowling.',
      options: [
        { text: 'was', isCorrect: true },
        { text: 'is', isCorrect: false },
        { text: 'has', isCorrect: false },
        { text: 'did', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'modal-must', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'Students ___ wear a school uniform. It\'s a rule.',
      options: [
        { text: 'must', isCorrect: true },
        { text: 'can', isCorrect: false },
        { text: 'might', isCorrect: false },
        { text: 'would', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'second-conditional-intro', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'If I had a million pounds, I ___ travel the world.',
      options: [
        { text: 'would', isCorrect: true },
        { text: 'will', isCorrect: false },
        { text: 'can', isCorrect: false },
        { text: 'had', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'present-perfect-for-since', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'I have lived here ___ 2015.',
      options: [
        { text: 'since', isCorrect: true },
        { text: 'for', isCorrect: false },
        { text: 'during', isCorrect: false },
        { text: 'ago', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: 0.0, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'present-perfect-duration', 'a2'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A2',
      prompt: 'She has studied French ___ three years.',
      options: [
        { text: 'for', isCorrect: true },
        { text: 'since', isCorrect: false },
        { text: 'during', isCorrect: false },
        { text: 'in', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // GRAMMAR — B1 (first/second conditional, passive, reported speech)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'first-conditional', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'If it ___ tomorrow, we will cancel the picnic.',
      options: [
        { text: 'rains', isCorrect: true },
        { text: 'will rain', isCorrect: false },
        { text: 'rained', isCorrect: false },
        { text: 'would rain', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'second-conditional', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'If I ___ a scientist, I would try to cure diseases.',
      options: [
        { text: 'were', isCorrect: true },
        { text: 'am', isCorrect: false },
        { text: 'will be', isCorrect: false },
        { text: 'was being', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'passive-present', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'Millions of plastic bottles ___ every year.',
      options: [
        { text: 'are thrown away', isCorrect: true },
        { text: 'throw away', isCorrect: false },
        { text: 'are throwing away', isCorrect: false },
        { text: 'were thrown away', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'junior', 'reported-speech-b1', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'He said, "I will help you." → He said that he ___ help me.',
      options: [
        { text: 'would', isCorrect: true },
        { text: 'will', isCorrect: false },
        { text: 'could', isCorrect: false },
        { text: 'should', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['grammar', 'junior', 'gerund-infinitive', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'She avoided ___ eye contact during the presentation.',
      options: [
        { text: 'making', isCorrect: true },
        { text: 'to make', isCorrect: false },
        { text: 'make', isCorrect: false },
        { text: 'made', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['grammar', 'junior', 'defining-relative', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'The restaurant ___ we ate last night was excellent.',
      options: [
        { text: 'where', isCorrect: true },
        { text: 'which', isCorrect: false },
        { text: 'who', isCorrect: false },
        { text: 'that', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['grammar', 'junior', 'present-perfect-just', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'I ___ just ___ the latest book in the series.',
      options: [
        { text: 'have ... finished', isCorrect: true },
        { text: 'did ... finish', isCorrect: false },
        { text: 'was ... finishing', isCorrect: false },
        { text: 'had ... finished', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['grammar', 'junior', 'wish', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'I wish I ___ play the piano like her.',
      options: [
        { text: 'could', isCorrect: true },
        { text: 'can', isCorrect: false },
        { text: 'will', isCorrect: false },
        { text: 'would', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['grammar', 'junior', 'although-despite', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: '___ the heavy rain, the match continued.',
      options: [
        { text: 'Despite', isCorrect: true },
        { text: 'Although', isCorrect: false },
        { text: 'Because of', isCorrect: false },
        { text: 'However', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['grammar', 'junior', 'passive-past', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'The Eiffel Tower ___ in 1889.',
      options: [
        { text: 'was built', isCorrect: true },
        { text: 'built', isCorrect: false },
        { text: 'has been built', isCorrect: false },
        { text: 'were built', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['grammar', 'junior', 'have-to-dont', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'On weekends, I ___ wear a uniform. It\'s optional.',
      options: [
        { text: 'don\'t have to', isCorrect: true },
        { text: 'mustn\'t', isCorrect: false },
        { text: 'can\'t', isCorrect: false },
        { text: 'shouldn\'t', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['grammar', 'junior', 'past-perfect', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'By the time we arrived, the film ___ already ___ .',
      options: [
        { text: 'had ... started', isCorrect: true },
        { text: 'has ... started', isCorrect: false },
        { text: 'was ... starting', isCorrect: false },
        { text: 'did ... start', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['grammar', 'junior', 'used-to', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'When I was young, I ___ be afraid of the dark.',
      options: [
        { text: 'used to', isCorrect: true },
        { text: 'was used to', isCorrect: false },
        { text: 'would use to', isCorrect: false },
        { text: 'am used to', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['grammar', 'junior', 'so-such', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'It was ___ a difficult exam that many students failed.',
      options: [
        { text: 'such', isCorrect: true },
        { text: 'so', isCorrect: false },
        { text: 'very', isCorrect: false },
        { text: 'too', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'B1', difficulty: 0.9, discrimination: 1.5, guessing: 0.25,
    tags: ['grammar', 'junior', 'discourse-markers', 'b1'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      prompt: 'The plan sounds good. ___, we need to check the budget first.',
      options: [
        { text: 'However', isCorrect: true },
        { text: 'Therefore', isCorrect: false },
        { text: 'Moreover', isCorrect: false },
        { text: 'Although', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // READING — A1 (short emails, messages, profiles)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'READING', cefrLevel: 'A1', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['reading', 'junior', 'a1', 'social-message'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      passage: 'Hi Maya! Do you want to come to my house on Saturday? We can watch a film and eat pizza. My mum says it\'s OK. Let me know! — Jess',
      prompt: 'What does Jess want Maya to do?',
      options: [
        { text: 'Come to her house on Saturday.', isCorrect: true },
        { text: 'Go to the cinema.', isCorrect: false },
        { text: 'Meet her mum.', isCorrect: false },
        { text: 'Cook pizza together.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'A1', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['reading', 'junior', 'a1', 'school-notice'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      passage: 'SCHOOL TRIP REMINDER\nAll Year 7 students must bring a packed lunch, comfortable shoes and a water bottle on Thursday. The bus leaves at 8:30 am. Do not be late!',
      prompt: 'What time does the bus leave?',
      options: [
        { text: '8:30 am', isCorrect: true },
        { text: '8:00 am', isCorrect: false },
        { text: '9:00 am', isCorrect: false },
        { text: '7:30 am', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'A1', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['reading', 'junior', 'a1', 'profile'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      passage: 'NAME: Carlos\nAGE: 13\nHOME: Madrid, Spain\nHOBBIES: Football, drawing, computer games\nFAVOURITE SUBJECT: Science',
      prompt: 'What is Carlos\'s favourite subject?',
      options: [
        { text: 'Science', isCorrect: true },
        { text: 'Art', isCorrect: false },
        { text: 'Maths', isCorrect: false },
        { text: 'PE', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'A1', difficulty: -0.9, discrimination: 1.0, guessing: 0.25,
    tags: ['reading', 'junior', 'a1', 'short-story'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      passage: 'My name is Aisha. I live in London. Every day after school, I walk to the park with my dog, Max. Max loves to run and play. Last Sunday, we saw a duck on the pond. Max barked and the duck swam away quickly.',
      prompt: 'What happened when Max saw the duck?',
      options: [
        { text: 'Max barked and the duck swam away.', isCorrect: true },
        { text: 'Max jumped into the pond.', isCorrect: false },
        { text: 'The duck ran onto the grass.', isCorrect: false },
        { text: 'Aisha called Max back home.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'A1', difficulty: -0.8, discrimination: 1.0, guessing: 0.25,
    tags: ['reading', 'junior', 'a1', 'timetable'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      passage: 'Monday Timetable:\n08:30 – English\n09:30 – Maths\n10:30 – Break\n11:00 – Science\n12:00 – Lunch\n13:00 – Art\n14:00 – PE',
      prompt: 'What class is right after lunch on Monday?',
      options: [
        { text: 'Art', isCorrect: true },
        { text: 'Science', isCorrect: false },
        { text: 'PE', isCorrect: false },
        { text: 'English', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'A1', difficulty: -0.7, discrimination: 1.0, guessing: 0.25,
    tags: ['reading', 'junior', 'a1', 'blog-post'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      passage: 'My Best Day\nLast Saturday was the best day ever. My parents took me to a theme park. I went on ten rides and ate candy floss. My favourite ride was the roller coaster — it was so fast! We got home at eight in the evening. I was very tired but happy.',
      prompt: 'What was the writer\'s favourite part of the trip?',
      options: [
        { text: 'The roller coaster', isCorrect: true },
        { text: 'Eating candy floss', isCorrect: false },
        { text: 'Going home at night', isCorrect: false },
        { text: 'Buying souvenirs', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'A1', difficulty: -0.6, discrimination: 1.0, guessing: 0.25,
    tags: ['reading', 'junior', 'a1', 'information'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'A1',
      passage: 'Dolphins are sea mammals. They breathe air and feed their babies milk, just like humans. Dolphins are very intelligent — they can learn tricks and communicate with each other using sounds.',
      prompt: 'How do dolphins breathe?',
      options: [
        { text: 'They come to the surface to breathe air.', isCorrect: true },
        { text: 'They breathe underwater through gills.', isCorrect: false },
        { text: 'They absorb oxygen from the water.', isCorrect: false },
        { text: 'They only need to breathe once a day.', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // READING — B1 (longer text, inference, attitude)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'READING', cefrLevel: 'B1', difficulty: 0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['reading', 'junior', 'b1', 'article'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      passage: 'Social media has changed the way teenagers communicate. Many young people now prefer to send messages online rather than speak face to face. While this makes it easier to stay in touch with friends abroad, some experts worry that it is reducing social skills in real-life situations. A recent study found that teenagers who spend more than four hours a day on social media reported feeling lonelier than those who spent less time online. However, others argue that online friendships are just as meaningful as offline ones.',
      prompt: 'What concern do some experts have about social media use?',
      options: [
        { text: 'It may be reducing young people\'s real-life social skills.', isCorrect: true },
        { text: 'It makes it too easy to stay in touch with friends.', isCorrect: false },
        { text: 'It is too expensive for most teenagers.', isCorrect: false },
        { text: 'It prevents teenagers from doing their homework.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'B1', difficulty: 0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['reading', 'junior', 'b1', 'narrative'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      passage: 'It was the morning of the final exam. Priya sat at her desk, her notes spread out in front of her, but she couldn\'t focus. She had studied for weeks, but somehow the knowledge seemed to have disappeared overnight. Her friend Layla leaned over. "You know this stuff," she whispered. "Trust yourself." Priya took a deep breath, picked up her pen, and began.',
      prompt: 'What was Priya\'s main problem at the start of the passage?',
      options: [
        { text: 'She couldn\'t concentrate despite knowing the material.', isCorrect: true },
        { text: 'She had not studied enough for the exam.', isCorrect: false },
        { text: 'She had forgotten her notes at home.', isCorrect: false },
        { text: 'She and Layla had an argument before the exam.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'B1', difficulty: 0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['reading', 'junior', 'b1', 'opinion'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      passage: 'Some schools have banned smartphones in classrooms, claiming they are a major distraction. Supporters of the ban say test scores have improved since the rule was introduced. On the other hand, critics argue that phones can be valuable learning tools when used responsibly, providing instant access to information and educational apps. The debate continues, with parents, teachers and students all holding strong views.',
      prompt: 'What reason do critics of the ban give for allowing phones?',
      options: [
        { text: 'They can be useful educational tools.', isCorrect: true },
        { text: 'They improve test scores.', isCorrect: false },
        { text: 'They help students communicate with parents.', isCorrect: false },
        { text: 'Teachers prefer to use them in lessons.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'B1', difficulty: 0.4, discrimination: 1.3, guessing: 0.25,
    tags: ['reading', 'junior', 'b1', 'inference'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      passage: 'The small café on the corner had been there for thirty years. The walls were covered in faded photographs and the menu was handwritten in chalk. New coffee chains had opened nearby, all bright lights and loyalty apps. Yet every morning, the old café was still full — regulars who had been coming since before the big chains arrived.',
      prompt: 'What can we infer about the old café?',
      options: [
        { text: 'Its loyal customers value its traditional character.', isCorrect: true },
        { text: 'It is more profitable than the new chains.', isCorrect: false },
        { text: 'It recently changed its menu to attract customers.', isCorrect: false },
        { text: 'The owner plans to close it soon.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'B1', difficulty: 0.5, discrimination: 1.3, guessing: 0.25,
    tags: ['reading', 'junior', 'b1', 'environment'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      passage: 'Every year, millions of tonnes of plastic enter our oceans. Much of it breaks into tiny particles called microplastics, which are eaten by sea creatures and can enter the food chain, eventually reaching humans. Scientists are calling for urgent action: reducing single-use plastics, improving waste management, and investing in materials that biodegrade safely. Without change, the situation is predicted to worsen dramatically over the next decade.',
      prompt: 'Why are microplastics a concern for humans?',
      options: [
        { text: 'They can enter the human food chain through sea creatures.', isCorrect: true },
        { text: 'They are too small to be cleaned from the ocean.', isCorrect: false },
        { text: 'They are causing floods in coastal cities.', isCorrect: false },
        { text: 'They prevent scientists from studying marine life.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'B1', difficulty: 0.6, discrimination: 1.3, guessing: 0.25,
    tags: ['reading', 'junior', 'b1', 'writer-attitude'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      passage: 'People often assume that learning a new language as an adult is nearly impossible. Yet research consistently shows that motivated adult learners can achieve high levels of fluency — sometimes faster than children in formal settings. Adults bring advantages: a wider vocabulary in their first language, stronger analytical skills, and greater ability to self-study. The real barrier is not age, but rather dedication and finding sufficient time to practise.',
      prompt: 'What is the writer\'s attitude towards adult language learning?',
      options: [
        { text: 'Positive — adults are capable of learning languages effectively.', isCorrect: true },
        { text: 'Negative — adults face too many disadvantages.', isCorrect: false },
        { text: 'Neutral — the writer presents no personal opinion.', isCorrect: false },
        { text: 'Uncertain — the writer is unsure about the research.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'B1', difficulty: 0.7, discrimination: 1.4, guessing: 0.25,
    tags: ['reading', 'junior', 'b1', 'main-idea'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      passage: 'In many cities around the world, cycling infrastructure has improved dramatically. Dedicated bike lanes, cycle-sharing schemes and safe storage facilities have all encouraged more people to leave their cars at home. The benefits are clear: less traffic, cleaner air and healthier citizens. Despite this, progress remains uneven — some areas still lack even basic cycling paths, leaving residents with little choice but to drive.',
      prompt: 'What is the main idea of this text?',
      options: [
        { text: 'Cycling infrastructure has improved but is not yet equal everywhere.', isCorrect: true },
        { text: 'Everyone should stop using cars immediately.', isCorrect: false },
        { text: 'Cycle-sharing schemes are the best solution to traffic.', isCorrect: false },
        { text: 'Poor areas have more cyclists than rich areas.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'B1', difficulty: 0.8, discrimination: 1.4, guessing: 0.25,
    tags: ['reading', 'junior', 'b1', 'text-purpose'],
    content: {
      productLine: 'JUNIOR_SUITE', cefrBand: 'B1',
      passage: 'Dear Students,\nWe are excited to announce the launch of our new after-school Tech Club, starting next Monday. The club will meet every Monday and Wednesday from 4 pm to 5:30 pm in Room 14. Activities will include coding, robotics, and app design. Places are limited, so please sign up with Ms Park in the office by this Friday. No previous experience is necessary — all are welcome!\nMr Thompson, Deputy Head',
      prompt: 'What is the main purpose of this text?',
      options: [
        { text: 'To inform students about a new club and encourage them to join.', isCorrect: true },
        { text: 'To explain the school\'s technology policy.', isCorrect: false },
        { text: 'To warn students about the dangers of technology.', isCorrect: false },
        { text: 'To report the results of a coding competition.', isCorrect: false },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding ${items.length} Junior Suite items...`);
  const validItems = validateOrExit(items, "seed-junior-comprehensive");
  let count = 0;

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const content = item.content as any;
    const skill = item.skill;
    const cefrLevel = item.cefrLevel;
    const tagSlug = (item.tags[2] || item.tags[1] || 'item').replace(/[^a-z0-9-]/g, '-');
    const itemCode = `junior-${skill.toLowerCase()}-${cefrLevel.toLowerCase().replace('_', '')}-${tagSlug}-${String(i + 1).padStart(3, '0')}`;

    const type = item.type || (skill === 'WRITING' ? 'WRITING_PROMPT' : skill === 'SPEAKING' ? 'SPEAKING_PROMPT' : 'MULTIPLE_CHOICE');

    await prisma.item.upsert({
      where: { itemCode },
      create: {
        itemCode,
        skill: skill as any,
        cefrLevel: cefrLevel as any,
        type: type as any,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: item.guessing,
        status: 'ACTIVE',
        tags: item.tags,
        content: content,
      },
      update: {
        skill: skill as any,
        cefrLevel: cefrLevel as any,
        type: type as any,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: item.guessing,
        status: 'ACTIVE',
        tags: item.tags,
        content: content,
      },
    });
    count++;
    if (count % 20 === 0) console.log(`  ${count}/${validItems.length}...`);
  }

  console.log(`\nDone! Seeded ${count} Junior Suite items.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
