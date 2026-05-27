/**
 * Primary Suite Comprehensive Seed — Age 7–10 (PRE_A1 to A2)
 * Covers: VOCABULARY, GRAMMAR, READING, WRITING, SPEAKING
 * Pedagogical focus: concrete topics, simple language, high-frequency words
 * Topics: animals, family, school, colors, food, body, home, weather, numbers, actions
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
  // VOCABULARY — PRE_A1 (basic words, colors, numbers, body)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'VOCABULARY', cefrLevel: 'PRE_A1', difficulty: -2.0, discrimination: 0.9, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'colors', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'Look at this color: 🔴 What color is it?',
      options: [
        { text: 'Red', isCorrect: true },
        { text: 'Blue', isCorrect: false },
        { text: 'Green', isCorrect: false },
        { text: 'Yellow', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'PRE_A1', difficulty: -2.0, discrimination: 0.9, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'colors', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'The sky is ___.',
      options: [
        { text: 'blue', isCorrect: true },
        { text: 'red', isCorrect: false },
        { text: 'black', isCorrect: false },
        { text: 'pink', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'PRE_A1', difficulty: -1.9, discrimination: 0.9, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'numbers', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'How many legs does a dog have?',
      options: [
        { text: 'Four', isCorrect: true },
        { text: 'Two', isCorrect: false },
        { text: 'Six', isCorrect: false },
        { text: 'Eight', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'PRE_A1', difficulty: -1.9, discrimination: 0.9, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'body', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'We use our ___ to see.',
      options: [
        { text: 'eyes', isCorrect: true },
        { text: 'ears', isCorrect: false },
        { text: 'nose', isCorrect: false },
        { text: 'mouth', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'PRE_A1', difficulty: -1.8, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'animals', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'Which animal says "meow"?',
      options: [
        { text: 'Cat', isCorrect: true },
        { text: 'Dog', isCorrect: false },
        { text: 'Cow', isCorrect: false },
        { text: 'Bird', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'PRE_A1', difficulty: -1.8, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'family', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'My mother\'s mother is my ___.',
      options: [
        { text: 'grandmother', isCorrect: true },
        { text: 'aunt', isCorrect: false },
        { text: 'sister', isCorrect: false },
        { text: 'cousin', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'PRE_A1', difficulty: -1.7, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'food', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'A yellow fruit that monkeys like is a ___.',
      options: [
        { text: 'banana', isCorrect: true },
        { text: 'apple', isCorrect: false },
        { text: 'orange', isCorrect: false },
        { text: 'grape', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'PRE_A1', difficulty: -1.7, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'school', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'We write with a ___.',
      options: [
        { text: 'pencil', isCorrect: true },
        { text: 'book', isCorrect: false },
        { text: 'ruler', isCorrect: false },
        { text: 'desk', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'PRE_A1', difficulty: -1.6, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'weather', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'When it rains, we use an ___.',
      options: [
        { text: 'umbrella', isCorrect: true },
        { text: 'hat', isCorrect: false },
        { text: 'scarf', isCorrect: false },
        { text: 'glove', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'PRE_A1', difficulty: -1.6, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'home', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'We sleep in a ___.',
      options: [
        { text: 'bedroom', isCorrect: true },
        { text: 'kitchen', isCorrect: false },
        { text: 'bathroom', isCorrect: false },
        { text: 'garden', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // VOCABULARY — A1 (verbs, classroom, daily routine, toys)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.4, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'daily-routine', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'In the morning, I ___ my teeth.',
      options: [
        { text: 'brush', isCorrect: true },
        { text: 'wash', isCorrect: false },
        { text: 'cut', isCorrect: false },
        { text: 'comb', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'animals', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'A very large grey animal with a long nose is an ___.',
      options: [
        { text: 'elephant', isCorrect: true },
        { text: 'hippo', isCorrect: false },
        { text: 'rhino', isCorrect: false },
        { text: 'giraffe', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'classroom', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'The teacher writes on the ___.',
      options: [
        { text: 'board', isCorrect: true },
        { text: 'window', isCorrect: false },
        { text: 'ceiling', isCorrect: false },
        { text: 'floor', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'sports', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'You kick a ___ in football.',
      options: [
        { text: 'ball', isCorrect: true },
        { text: 'bat', isCorrect: false },
        { text: 'net', isCorrect: false },
        { text: 'stick', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'food', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'A healthy red vegetable that grows in the ground is a ___.',
      options: [
        { text: 'carrot', isCorrect: false },
        { text: 'tomato', isCorrect: true },
        { text: 'potato', isCorrect: false },
        { text: 'onion', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'transport', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'Children ride a ___ to school.',
      options: [
        { text: 'bicycle', isCorrect: true },
        { text: 'train', isCorrect: false },
        { text: 'boat', isCorrect: false },
        { text: 'plane', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'weather', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'In winter, it sometimes ___.',
      options: [
        { text: 'snows', isCorrect: true },
        { text: 'rains heavily', isCorrect: false },
        { text: 'gets very hot', isCorrect: false },
        { text: 'becomes windy', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'time', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'There are ___ days in a week.',
      options: [
        { text: 'seven', isCorrect: true },
        { text: 'five', isCorrect: false },
        { text: 'ten', isCorrect: false },
        { text: 'six', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -1.0, discrimination: 1.0, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'actions', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'A bird can ___ in the sky.',
      options: [
        { text: 'fly', isCorrect: true },
        { text: 'swim', isCorrect: false },
        { text: 'climb', isCorrect: false },
        { text: 'dig', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A1', difficulty: -0.9, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'clothes', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'In cold weather, we put on a ___.',
      options: [
        { text: 'coat', isCorrect: true },
        { text: 'swimsuit', isCorrect: false },
        { text: 'shorts', isCorrect: false },
        { text: 'sandals', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // VOCABULARY — A2 (describing, sequencing, adjectives)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'adjectives', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'The opposite of "noisy" is ___.',
      options: [
        { text: 'quiet', isCorrect: true },
        { text: 'loud', isCorrect: false },
        { text: 'busy', isCorrect: false },
        { text: 'dark', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'hobbies', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'Someone who loves reading spends a lot of time with ___.',
      options: [
        { text: 'books', isCorrect: true },
        { text: 'toys', isCorrect: false },
        { text: 'games', isCorrect: false },
        { text: 'music', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'feelings', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'When you get a great present, you feel ___.',
      options: [
        { text: 'excited', isCorrect: true },
        { text: 'bored', isCorrect: false },
        { text: 'angry', isCorrect: false },
        { text: 'tired', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'nature', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'A place with lots of trees, plants and wild animals is a ___.',
      options: [
        { text: 'forest', isCorrect: true },
        { text: 'desert', isCorrect: false },
        { text: 'city', isCorrect: false },
        { text: 'beach', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'school-subjects', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'The school subject where you learn about numbers and shapes is ___.',
      options: [
        { text: 'maths', isCorrect: true },
        { text: 'history', isCorrect: false },
        { text: 'art', isCorrect: false },
        { text: 'music', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'community', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'The person who helps sick people get better is a ___.',
      options: [
        { text: 'doctor', isCorrect: true },
        { text: 'pilot', isCorrect: false },
        { text: 'baker', isCorrect: false },
        { text: 'farmer', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'compound-words', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: '"Rain" + "bow" = ___. What do you see in the sky after rain?',
      options: [
        { text: 'rainbow', isCorrect: true },
        { text: 'sunshine', isCorrect: false },
        { text: 'snowfall', isCorrect: false },
        { text: 'moonlight', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.2, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'places', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'You borrow books for free from a ___.',
      options: [
        { text: 'library', isCorrect: true },
        { text: 'museum', isCorrect: false },
        { text: 'bookshop', isCorrect: false },
        { text: 'cinema', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'adjectives-comparison', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'An elephant is ___ than a mouse.',
      options: [
        { text: 'bigger', isCorrect: true },
        { text: 'more big', isCorrect: false },
        { text: 'most big', isCorrect: false },
        { text: 'the biggest', isCorrect: false },
      ],
    },
  },
  {
    skill: 'VOCABULARY', cefrLevel: 'A2', difficulty: -0.1, discrimination: 1.2, guessing: 0.25,
    tags: ['vocabulary', 'primary', 'prepositions', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'The cat is sitting ___ the chair (it is on top).',
      options: [
        { text: 'on', isCorrect: true },
        { text: 'under', isCorrect: false },
        { text: 'behind', isCorrect: false },
        { text: 'next to', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // GRAMMAR — PRE_A1 (simple present, "is/are", "have/has")
  // ══════════════════════════════════════════════════════════
  {
    skill: 'GRAMMAR', cefrLevel: 'PRE_A1', difficulty: -2.0, discrimination: 0.9, guessing: 0.25,
    tags: ['grammar', 'primary', 'be-verb', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'My name ___ Tom.',
      options: [
        { text: 'is', isCorrect: true },
        { text: 'are', isCorrect: false },
        { text: 'am', isCorrect: false },
        { text: 'be', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'PRE_A1', difficulty: -2.0, discrimination: 0.9, guessing: 0.25,
    tags: ['grammar', 'primary', 'be-verb', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'The children ___ happy.',
      options: [
        { text: 'are', isCorrect: true },
        { text: 'is', isCorrect: false },
        { text: 'am', isCorrect: false },
        { text: 'be', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'PRE_A1', difficulty: -1.9, discrimination: 0.9, guessing: 0.25,
    tags: ['grammar', 'primary', 'pronouns', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'Anna and I ___ friends.',
      options: [
        { text: 'are', isCorrect: true },
        { text: 'is', isCorrect: false },
        { text: 'am', isCorrect: false },
        { text: 'has', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'PRE_A1', difficulty: -1.9, discrimination: 0.9, guessing: 0.25,
    tags: ['grammar', 'primary', 'have', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'He ___ a big dog.',
      options: [
        { text: 'has', isCorrect: true },
        { text: 'have', isCorrect: false },
        { text: 'is', isCorrect: false },
        { text: 'are', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'PRE_A1', difficulty: -1.8, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'articles', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'I have ___ orange.',
      options: [
        { text: 'an', isCorrect: true },
        { text: 'a', isCorrect: false },
        { text: 'the', isCorrect: false },
        { text: 'some', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'PRE_A1', difficulty: -1.8, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'articles', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'I see ___ cat. ___ cat is black.',
      options: [
        { text: 'a ... The', isCorrect: true },
        { text: 'the ... A', isCorrect: false },
        { text: 'an ... The', isCorrect: false },
        { text: 'a ... A', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'PRE_A1', difficulty: -1.7, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'plurals', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'One apple, two ___.',
      options: [
        { text: 'apples', isCorrect: true },
        { text: 'apple', isCorrect: false },
        { text: 'applees', isCorrect: false },
        { text: 'appled', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'PRE_A1', difficulty: -1.7, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'negation', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'I ___ like spiders.',
      options: [
        { text: 'don\'t', isCorrect: true },
        { text: 'not', isCorrect: false },
        { text: 'isn\'t', isCorrect: false },
        { text: 'no', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'PRE_A1', difficulty: -1.6, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'wh-questions', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: '___ is your name?',
      options: [
        { text: 'What', isCorrect: true },
        { text: 'Who', isCorrect: false },
        { text: 'Where', isCorrect: false },
        { text: 'When', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'PRE_A1', difficulty: -1.6, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'wh-questions', 'pre-a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: '___ old are you?',
      options: [
        { text: 'How', isCorrect: true },
        { text: 'What', isCorrect: false },
        { text: 'Which', isCorrect: false },
        { text: 'Where', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // GRAMMAR — A1 (present simple, "can", prepositions, possessives)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.5, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'present-simple', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'She ___ to school every day.',
      options: [
        { text: 'goes', isCorrect: true },
        { text: 'go', isCorrect: false },
        { text: 'going', isCorrect: false },
        { text: 'gone', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.5, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'present-simple', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'They ___ football on Saturdays.',
      options: [
        { text: 'play', isCorrect: true },
        { text: 'plays', isCorrect: false },
        { text: 'played', isCorrect: false },
        { text: 'playing', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.4, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'can', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'My baby brother ___ walk yet.',
      options: [
        { text: 'can\'t', isCorrect: true },
        { text: 'can', isCorrect: false },
        { text: 'doesn\'t', isCorrect: false },
        { text: 'isn\'t', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.4, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'possessives', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'That is Emma\'s bag. It is ___ bag.',
      options: [
        { text: 'her', isCorrect: true },
        { text: 'his', isCorrect: false },
        { text: 'their', isCorrect: false },
        { text: 'its', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'prepositions-place', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'The book is ___ the table. (It is on top.)',
      options: [
        { text: 'on', isCorrect: true },
        { text: 'in', isCorrect: false },
        { text: 'at', isCorrect: false },
        { text: 'under', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'present-continuous', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'Look! The bird ___ .',
      options: [
        { text: 'is singing', isCorrect: true },
        { text: 'sings', isCorrect: false },
        { text: 'sang', isCorrect: false },
        { text: 'sing', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'time-expressions', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'I brush my teeth ___ the morning.',
      options: [
        { text: 'in', isCorrect: true },
        { text: 'at', isCorrect: false },
        { text: 'on', isCorrect: false },
        { text: 'for', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'question-forms', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: '___ you like chocolate?',
      options: [
        { text: 'Do', isCorrect: true },
        { text: 'Are', isCorrect: false },
        { text: 'Have', isCorrect: false },
        { text: 'Does', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'there-is-are', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: '___ three books on the desk.',
      options: [
        { text: 'There are', isCorrect: true },
        { text: 'There is', isCorrect: false },
        { text: 'It is', isCorrect: false },
        { text: 'They are', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A1', difficulty: -1.1, discrimination: 1.0, guessing: 0.25,
    tags: ['grammar', 'primary', 'like-ing', 'a1'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'I like ___ in the park.',
      options: [
        { text: 'playing', isCorrect: true },
        { text: 'play', isCorrect: false },
        { text: 'played', isCorrect: false },
        { text: 'plays', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // GRAMMAR — A2 (past simple, comparatives, connectors)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.8, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'primary', 'past-simple', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'Yesterday I ___ a letter to my friend.',
      options: [
        { text: 'wrote', isCorrect: true },
        { text: 'write', isCorrect: false },
        { text: 'writes', isCorrect: false },
        { text: 'writing', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.8, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'primary', 'past-simple', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'We ___ to the zoo last Sunday.',
      options: [
        { text: 'went', isCorrect: true },
        { text: 'go', isCorrect: false },
        { text: 'goes', isCorrect: false },
        { text: 'going', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.7, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'primary', 'comparatives', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'Summer is ___ winter in our country.',
      options: [
        { text: 'hotter than', isCorrect: true },
        { text: 'more hot than', isCorrect: false },
        { text: 'hottest', isCorrect: false },
        { text: 'hot than', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.7, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'primary', 'future-going-to', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'Tonight we ___ watch a film.',
      options: [
        { text: 'are going to', isCorrect: true },
        { text: 'going to', isCorrect: false },
        { text: 'will going to', isCorrect: false },
        { text: 'go to', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.6, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'primary', 'connectors', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'I like dogs ___ cats.',
      options: [
        { text: 'and', isCorrect: true },
        { text: 'but', isCorrect: false },
        { text: 'because', isCorrect: false },
        { text: 'so', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.6, discrimination: 1.1, guessing: 0.25,
    tags: ['grammar', 'primary', 'frequency-adverbs', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'She ___ eats breakfast. She never misses it.',
      options: [
        { text: 'always', isCorrect: true },
        { text: 'never', isCorrect: false },
        { text: 'sometimes', isCorrect: false },
        { text: 'rarely', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'primary', 'past-simple-irregular', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'The children ___ a sandcastle at the beach.',
      options: [
        { text: 'built', isCorrect: true },
        { text: 'builded', isCorrect: false },
        { text: 'build', isCorrect: false },
        { text: 'are building', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.5, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'primary', 'superlatives', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'The cheetah is ___ land animal in the world.',
      options: [
        { text: 'the fastest', isCorrect: true },
        { text: 'faster', isCorrect: false },
        { text: 'most fast', isCorrect: false },
        { text: 'the most fastest', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'primary', 'because', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'I wore a coat ___ it was cold.',
      options: [
        { text: 'because', isCorrect: true },
        { text: 'but', isCorrect: false },
        { text: 'and', isCorrect: false },
        { text: 'so', isCorrect: false },
      ],
    },
  },
  {
    skill: 'GRAMMAR', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.2, guessing: 0.25,
    tags: ['grammar', 'primary', 'past-negative', 'a2'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      prompt: 'She ___ come to the party yesterday.',
      options: [
        { text: 'didn\'t', isCorrect: true },
        { text: 'doesn\'t', isCorrect: false },
        { text: 'wasn\'t', isCorrect: false },
        { text: 'not', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // READING — PRE_A1 (very short texts, single sentences)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'READING', cefrLevel: 'PRE_A1', difficulty: -2.0, discrimination: 0.9, guessing: 0.25,
    tags: ['reading', 'primary', 'pre-a1', 'sign'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      passage: 'NO PETS ALLOWED',
      prompt: 'What does this sign mean?',
      options: [
        { text: 'Animals cannot come in here.', isCorrect: true },
        { text: 'Pets are welcome here.', isCorrect: false },
        { text: 'This place sells animals.', isCorrect: false },
        { text: 'You can walk your dog here.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'PRE_A1', difficulty: -1.9, discrimination: 0.9, guessing: 0.25,
    tags: ['reading', 'primary', 'pre-a1', 'note'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      passage: 'Hello! My name is Ben. I am seven years old.',
      prompt: 'How old is Ben?',
      options: [
        { text: 'Seven', isCorrect: true },
        { text: 'Eight', isCorrect: false },
        { text: 'Six', isCorrect: false },
        { text: 'Nine', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'PRE_A1', difficulty: -1.9, discrimination: 0.9, guessing: 0.25,
    tags: ['reading', 'primary', 'pre-a1', 'label'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      passage: 'OPEN: 9 am – 5 pm',
      prompt: 'At what time does this place close?',
      options: [
        { text: '5 pm', isCorrect: true },
        { text: '9 am', isCorrect: false },
        { text: '3 pm', isCorrect: false },
        { text: '7 pm', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'PRE_A1', difficulty: -1.8, discrimination: 1.0, guessing: 0.25,
    tags: ['reading', 'primary', 'pre-a1', 'message'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      passage: 'Hi Mum, I am at school. I am happy. Love, Sara',
      prompt: 'Who wrote this message?',
      options: [
        { text: 'Sara', isCorrect: true },
        { text: 'Mum', isCorrect: false },
        { text: 'A teacher', isCorrect: false },
        { text: 'A friend', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'PRE_A1', difficulty: -1.8, discrimination: 1.0, guessing: 0.25,
    tags: ['reading', 'primary', 'pre-a1', 'poster'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      passage: 'SPORTS DAY — Friday 10 June — Come and run, jump and play!',
      prompt: 'When is Sports Day?',
      options: [
        { text: 'Friday 10 June', isCorrect: true },
        { text: 'Saturday 10 June', isCorrect: false },
        { text: 'Friday 11 June', isCorrect: false },
        { text: 'Thursday 10 June', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // READING — A2 (short paragraphs about familiar topics)
  // ══════════════════════════════════════════════════════════
  {
    skill: 'READING', cefrLevel: 'A2', difficulty: -0.6, discrimination: 1.1, guessing: 0.25,
    tags: ['reading', 'primary', 'a2', 'paragraph'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      passage: 'Lucy loves animals. She has a cat called Biscuit and two goldfish. Every morning before school she feeds them. She wants to be a vet when she grows up.',
      prompt: 'What does Lucy want to do in the future?',
      options: [
        { text: 'Become a vet', isCorrect: true },
        { text: 'Work at a pet shop', isCorrect: false },
        { text: 'Become a teacher', isCorrect: false },
        { text: 'Open a zoo', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'A2', difficulty: -0.6, discrimination: 1.1, guessing: 0.25,
    tags: ['reading', 'primary', 'a2', 'email'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      passage: 'Hi Jack,\nI am having a birthday party on Saturday at 3 pm. Please come to my house. We are going to eat cake and play games. Don\'t forget to bring a swimsuit!\nYour friend, Mia',
      prompt: 'Why should Jack bring a swimsuit?',
      options: [
        { text: 'Because there will be water activities at the party', isCorrect: true },
        { text: 'Because the party is at the beach', isCorrect: false },
        { text: 'Because it will be hot', isCorrect: false },
        { text: 'Because they are going swimming afterwards', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'A2', difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    tags: ['reading', 'primary', 'a2', 'information-text'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      passage: 'Penguins are birds but they cannot fly. They live in cold places like Antarctica. They eat fish and swim very well. Baby penguins have fluffy grey feathers.',
      prompt: 'What is true about penguins?',
      options: [
        { text: 'They can swim but cannot fly.', isCorrect: true },
        { text: 'They live in hot places.', isCorrect: false },
        { text: 'They eat plants.', isCorrect: false },
        { text: 'Baby penguins have black feathers.', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'A2', difficulty: -0.4, discrimination: 1.1, guessing: 0.25,
    tags: ['reading', 'primary', 'a2', 'diary'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      passage: 'Monday 5th May\nToday was the best day! We went to the science museum. My favourite part was the space exhibition. I learnt that the sun is a star. Dad bought me a book about planets.',
      prompt: 'What was the child\'s favourite part of the museum?',
      options: [
        { text: 'The space exhibition', isCorrect: true },
        { text: 'The history section', isCorrect: false },
        { text: 'The dinosaur display', isCorrect: false },
        { text: 'The book shop', isCorrect: false },
      ],
    },
  },
  {
    skill: 'READING', cefrLevel: 'A2', difficulty: -0.3, discrimination: 1.2, guessing: 0.25,
    tags: ['reading', 'primary', 'a2', 'notice'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A2',
      passage: 'LOST: Small brown dog named Buster. Last seen near Green Park on Tuesday evening. If you find him, please call 555-0123. Reward offered!',
      prompt: 'What should you do if you find Buster?',
      options: [
        { text: 'Call 555-0123', isCorrect: true },
        { text: 'Take him to the park', isCorrect: false },
        { text: 'Keep him at home', isCorrect: false },
        { text: 'Give him food', isCorrect: false },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // WRITING PROMPTS — PRE_A1 and A1
  // ══════════════════════════════════════════════════════════
  {
    skill: 'WRITING', cefrLevel: 'PRE_A1', difficulty: -2.0, discrimination: 0.8, guessing: 0.0,
    type: 'WRITING_PROMPT',
    tags: ['writing', 'primary', 'pre-a1', 'introduce'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'Write 2–3 sentences to introduce yourself. Write your name, your age, and one thing you like.',
      rubric: { minWords: 10, maxWords: 30, criteria: ['name', 'age', 'like/dislike'] },
      example: 'My name is Lily. I am eight years old. I like cats.',
    },
  },
  {
    skill: 'WRITING', cefrLevel: 'A1', difficulty: -1.5, discrimination: 0.9, guessing: 0.0,
    type: 'WRITING_PROMPT',
    tags: ['writing', 'primary', 'a1', 'description'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'Write 3–4 sentences about your family. Write how many people are in your family and what they look like.',
      rubric: { minWords: 20, maxWords: 50, criteria: ['family members', 'description', 'simple sentences'] },
      example: 'I have a small family. My mum has brown hair. My dad is tall. My sister is funny.',
    },
  },
  {
    skill: 'WRITING', cefrLevel: 'A1', difficulty: -1.4, discrimination: 0.9, guessing: 0.0,
    type: 'WRITING_PROMPT',
    tags: ['writing', 'primary', 'a1', 'my-day'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'Write about what you do every morning before school. Write 3–5 sentences.',
      rubric: { minWords: 20, maxWords: 60, criteria: ['daily routine', 'time expressions', 'simple present'] },
      example: 'I wake up at seven. I wash my face and brush my teeth. I eat breakfast. Then I go to school.',
    },
  },

  // ══════════════════════════════════════════════════════════
  // SPEAKING PROMPTS — PRE_A1, A1
  // ══════════════════════════════════════════════════════════
  {
    skill: 'SPEAKING', cefrLevel: 'PRE_A1', difficulty: -2.0, discrimination: 0.8, guessing: 0.0,
    type: 'SPEAKING_PROMPT',
    tags: ['speaking', 'primary', 'pre-a1', 'greetings'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'PRE_A1',
      prompt: 'Say hello and tell us your name and how old you are.',
      scaffolding: 'Hello! My name is ___ . I am ___ years old.',
      rubric: { criteria: ['greeting', 'name', 'age', 'pronunciation', 'confidence'] },
    },
  },
  {
    skill: 'SPEAKING', cefrLevel: 'A1', difficulty: -1.5, discrimination: 0.9, guessing: 0.0,
    type: 'SPEAKING_PROMPT',
    tags: ['speaking', 'primary', 'a1', 'describe-picture'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'Look at a picture of a family at the park. Describe what you see. Use words like: family, playing, running, happy.',
      scaffolding: 'In the picture I can see ... . There is/are ... . They are ...',
      rubric: { criteria: ['vocabulary', 'description', 'simple sentences', 'pronunciation'] },
    },
  },
  {
    skill: 'SPEAKING', cefrLevel: 'A1', difficulty: -1.4, discrimination: 0.9, guessing: 0.0,
    type: 'SPEAKING_PROMPT',
    tags: ['speaking', 'primary', 'a1', 'my-favourite'],
    content: {
      productLine: 'PRIMARY', cefrBand: 'A1',
      prompt: 'Talk about your favourite animal. What is it? What does it look like? What does it eat?',
      scaffolding: 'My favourite animal is a ... . It is ... and it has ... . It eats ...',
      rubric: { criteria: ['topic coherence', 'vocabulary', 'grammar', 'fluency'] },
    },
  },
];

async function main() {
  console.log(`Seeding ${items.length} Primary suite items...`);
  const validItems = validateOrExit(items, "seed-primary-comprehensive");
  let created = 0;
  let updated = 0;

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const content = item.content as any;
    const skill = item.skill;
    const cefrLevel = item.cefrLevel;
    const tagSlug = (item.tags[2] || item.tags[1] || 'item').replace(/[^a-z0-9-]/g, '-');
    const itemCode = `primary-${skill.toLowerCase()}-${cefrLevel.toLowerCase().replace('_', '')}-${tagSlug}-${String(i + 1).padStart(3, '0')}`;

    const type = item.type || (skill === 'WRITING' ? 'WRITING_PROMPT' : skill === 'SPEAKING' ? 'SPEAKING_PROMPT' : 'MULTIPLE_CHOICE');

    const result = await prisma.item.upsert({
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
    console.log(`  [${i + 1}/${validItems.length}] ${result.id ? 'OK' : 'ERR'} ${itemCode}`);
    created++;
  }

  console.log(`\nDone! Processed ${created} items.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
