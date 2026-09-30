#!/usr/bin/env npx tsx
/**
 * Deterministic item-bank fixtures for CI and isolated test databases.
 *
 * This script intentionally refuses to run outside CI/test unless explicitly
 * enabled. It supplies enough ACTIVE items for every product-line section and
 * CEFR cell, plus a small PRETEST pool for lifecycle/injection tests.
 */

import "dotenv/config";
import {
  CefrLevel,
  ItemStatus,
  ItemType,
  Prisma,
  PrismaClient,
  SkillType,
} from "@prisma/client";

const prisma = new PrismaClient();

const isAllowed =
  process.env.CI === "true" ||
  process.env.NODE_ENV === "test" ||
  process.env.ALLOW_CI_FIXTURES === "1";

if (!isAllowed) {
  console.error(
    "Refusing to seed CI fixtures outside an isolated test environment. " +
      "Set ALLOW_CI_FIXTURES=1 only for a disposable database."
  );
  process.exit(2);
}

const LEVELS: CefrLevel[] = [
  CefrLevel.PRE_A1,
  CefrLevel.A1,
  CefrLevel.A2,
  CefrLevel.B1,
  CefrLevel.B2,
  CefrLevel.C1,
  CefrLevel.C2,
];

// At least the largest maxItems value used by any product profile. Seeding the
// operational maximum (rather than only the validation minimum) lets E2E exams
// finish without exhausting a section.
const ACTIVE_PER_LEVEL: Record<SkillType, number> = {
  [SkillType.GRAMMAR]: 14,
  [SkillType.VOCABULARY]: 14,
  [SkillType.READING]: 18,
  [SkillType.LISTENING]: 16,
  [SkillType.WRITING]: 3,
  [SkillType.SPEAKING]: 3,
};

const DIFFICULTY_BY_LEVEL: Record<CefrLevel, number> = {
  [CefrLevel.PRE_A1]: -2.7,
  [CefrLevel.A1]: -2.0,
  [CefrLevel.A2]: -1.2,
  [CefrLevel.B1]: -0.4,
  [CefrLevel.B2]: 0.5,
  [CefrLevel.C1]: 1.4,
  [CefrLevel.C2]: 2.3,
};

function mcqContent(skill: SkillType, level: CefrLevel, index: number) {
  const label = `${skill.toLowerCase()} ${level} ${index}`;
  const base = {
    prompt: `Choose the best answer for this ${label} assessment item.`,
    options: [
      {
        id: "a",
        text: `Correct response ${index}`,
        isCorrect: true,
        rationale: "This option best satisfies the language task.",
      },
      {
        id: "b",
        text: `Distractor one ${index}`,
        isCorrect: false,
        rationale: "This option does not fit the intended meaning.",
      },
      {
        id: "c",
        text: `Distractor two ${index}`,
        isCorrect: false,
        rationale: "This option contains a contextual mismatch.",
      },
      {
        id: "d",
        text: `Distractor three ${index}`,
        isCorrect: false,
        rationale: "This option does not complete the task correctly.",
      },
    ],
    correctAnswer: "a",
  };

  if (skill === SkillType.READING) {
    return {
      ...base,
      passage:
        `This is a controlled ${level} reading passage for automated delivery testing. ` +
        `It contains enough context to validate rendering and item selection for case ${index}.`,
    };
  }

  if (skill === SkillType.LISTENING) {
    return {
      ...base,
      audioUrl: `/audio/ci-fixture-${level.toLowerCase()}-${index}.mp3`,
      ttsScript:
        `This is a controlled listening script for ${level} automated assessment case ${index}.`,
      transcript:
        `Controlled listening transcript for ${level} automated assessment case ${index}.`,
    };
  }

  return base;
}

function productiveContent(skill: SkillType, level: CefrLevel, index: number) {
  if (skill === SkillType.WRITING) {
    return {
      prompt: `Write a short ${level} response about a familiar situation (task ${index}).`,
      minWords: 30,
      maxWords: 250,
      taskType: index === 1 ? "short_response" : "extended_response",
      rubric: {
        taskAchievement: { name: "Task achievement", descriptor: "Addresses the prompt." },
        languageControl: { name: "Language control", descriptor: "Uses appropriate language." },
      },
    };
  }

  return {
    prompt: `Speak about a familiar ${level} topic for automated assessment task ${index}.`,
    prepTime: 15,
    responseTime: 60,
    taskType: "individual_long_turn",
    rubric: {
      fluency: { name: "Fluency", descriptor: "Maintains an intelligible response." },
      languageControl: { name: "Language control", descriptor: "Uses appropriate language." },
    },
  };
}

function itemTypeFor(skill: SkillType): ItemType {
  if (skill === SkillType.WRITING) return ItemType.WRITING_PROMPT;
  if (skill === SkillType.SPEAKING) return ItemType.SPEAKING_PROMPT;
  return ItemType.MULTIPLE_CHOICE;
}

function buildItem(
  skill: SkillType,
  level: CefrLevel,
  index: number,
  status: ItemStatus
): Prisma.ItemCreateManyInput {
  const productive = skill === SkillType.WRITING || skill === SkillType.SPEAKING;
  const content = productive
    ? productiveContent(skill, level, index)
    : mcqContent(skill, level, index);
  const statusCode = status === ItemStatus.PRETEST ? "PT" : "A";

  return {
    itemCode: `CI-${statusCode}-${skill}-${level}-${String(index).padStart(2, "0")}`,
    type: itemTypeFor(skill),
    skill,
    cefrLevel: level,
    difficulty: DIFFICULTY_BY_LEVEL[level] + ((index % 5) - 2) * 0.08,
    discrimination: 1.15 + (index % 4) * 0.05,
    guessing: productive ? 0 : 0.25,
    content,
    tags: [],
    status,
    isPretest: status === ItemStatus.PRETEST,
    pipelineStage: status === ItemStatus.PRETEST ? "PILOT" : "LIVE",
    iqScore: status === ItemStatus.PRETEST ? 82 : 92,
    metadata: {
      fixture: "ci-item-bank-v1",
      paramSource: "prior",
    },
  };
}

async function main() {
  const items: Prisma.ItemCreateManyInput[] = [];

  for (const skill of Object.values(SkillType)) {
    for (const level of LEVELS) {
      for (let index = 1; index <= ACTIVE_PER_LEVEL[skill]; index += 1) {
        items.push(buildItem(skill, level, index, ItemStatus.ACTIVE));
      }
    }
    // One valid PRETEST item per skill is sufficient for lifecycle and injection
    // tests while keeping a clear ACTIVE majority.
    items.push(buildItem(skill, CefrLevel.B1, 99, ItemStatus.PRETEST));
  }

  const result = await prisma.item.createMany({ data: items, skipDuplicates: true });
  const totalFixtures = await prisma.item.count({
    where: { itemCode: { startsWith: "CI-" } },
  });

  console.log(
    `CI item bank ready: ${result.count} inserted, ${totalFixtures} fixtures available.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
