import { VOCAB_SYNTHETIC_200 } from "./data/vocab-synthetic-200.js";

const expectedByCefr: Record<string, number> = {
  PRE_A1: 20,
  A1: 35,
  A2: 40,
  B1: 40,
  B2: 30,
  C1: 25,
  C2: 10,
};

function isVisualStem(topic: string, prompt: string): boolean {
  return topic.startsWith("visual_") || /(picture|image|photo|look at)/i.test(prompt);
}

async function main() {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cefrCounts = new Map<string, number>();
  const idSeen = new Set<string>();
  const promptSeen = new Set<string>();

  for (const s of VOCAB_SYNTHETIC_200) {
    cefrCounts.set(s.cefr, (cefrCounts.get(s.cefr) || 0) + 1);

    if (idSeen.has(s.id)) errors.push(`duplicate id: ${s.id}`);
    idSeen.add(s.id);

    const promptKey = s.prompt.trim().toLowerCase();
    if (promptSeen.has(promptKey)) errors.push(`duplicate prompt: ${s.id}`);
    promptSeen.add(promptKey);

    if (s.wrong.length !== 3) errors.push(`wrong option count != 3: ${s.id}`);
    if (s.wrong.includes(s.correct)) errors.push(`correct answer duplicated in wrong options: ${s.id}`);

    if (s.imageUrl && !isVisualStem(s.topic, s.prompt)) {
      warnings.push(`imageUrl on non-visual source stem (ignored by seed): ${s.id} (${s.topic})`);
    }

    if (s.imageUrl && !s.imageUrl.startsWith("https://")) {
      errors.push(`imageUrl must be https: ${s.id}`);
    }
  }

  if (VOCAB_SYNTHETIC_200.length !== 200) {
    errors.push(`expected 200 total stems, got ${VOCAB_SYNTHETIC_200.length}`);
  }

  for (const [cefr, expected] of Object.entries(expectedByCefr)) {
    const got = cefrCounts.get(cefr) || 0;
    if (got !== expected) {
      errors.push(`cefr count mismatch for ${cefr}: expected ${expected}, got ${got}`);
    }
  }

  if (errors.length) {
    console.error("Vocabulary quality gate FAILED:");
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }

  const imageCount = VOCAB_SYNTHETIC_200.filter((s) => Boolean(s.imageUrl)).length;
  const effectiveImageCount = VOCAB_SYNTHETIC_200.filter((s) => Boolean(s.imageUrl) && isVisualStem(s.topic, s.prompt)).length;
  console.log("Vocabulary quality gate PASSED.");
  if (warnings.length) {
    console.warn(`Warnings: ${warnings.length}`);
    for (const w of warnings.slice(0, 20)) console.warn(` - ${w}`);
  }
  console.log(
    JSON.stringify(
      { total: VOCAB_SYNTHETIC_200.length, imageCount, effectiveImageCount, cefrCounts: Object.fromEntries(cefrCounts) },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
