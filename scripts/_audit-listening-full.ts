import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const items = await p.item.findMany({
    where: { skill: "LISTENING", status: "ACTIVE" },
    select: {
      id: true,
      type: true,
      cefrLevel: true,
      content: true,
      tags: true,
    },
  });

  let withAudio = 0,
    withoutAudio = 0,
    noOptions = 0,
    noPrompt = 0,
    fib = 0,
    mc = 0;
  const issues: {
    id: string;
    type: string | null;
    level: string;
    problems: string[];
    tags: string[];
  }[] = [];
  const noAudioItems: { id: string; level: string; ttsScript: string | null }[] =
    [];

  for (const item of items) {
    const c = item.content as Record<string, unknown>;
    const audioUrl = c.audioUrl as string | undefined;
    const ttsScript = c.ttsScript as string | undefined;
    const passage = c.passage as string | undefined;
    const prompt = c.prompt as string | undefined;
    const opts = c.options as unknown[] | undefined;
    const hasOpts = opts && opts.length > 0;

    if (audioUrl) {
      withAudio++;
    } else {
      withoutAudio++;
      noAudioItems.push({
        id: item.id,
        level: item.cefrLevel,
        ttsScript: ttsScript ?? null,
      });
    }

    if (!hasOpts) noOptions++;
    if (!prompt) noPrompt++;
    if (item.type === "FILL_IN_BLANKS") fib++;
    else if (item.type === "MULTIPLE_CHOICE") mc++;

    const probs: string[] = [];
    if (!audioUrl && !ttsScript) probs.push("NO_AUDIO_NO_TTS");
    if (!hasOpts && item.type !== "FILL_IN_BLANKS") probs.push("NO_OPTIONS_NOT_FIB");
    if (!prompt && !passage) probs.push("NO_PROMPT_NO_PASSAGE");
    if (probs.length > 0) {
      issues.push({
        id: item.id,
        type: item.type,
        level: item.cefrLevel,
        problems: probs,
        tags: item.tags as string[],
      });
    }
  }

  console.log("=== LISTENING AUDIT ===");
  console.log("Total LISTENING items:", items.length);
  console.log("With audioUrl:", withAudio, "| Without:", withoutAudio);
  console.log("MULTIPLE_CHOICE:", mc, "| FILL_IN_BLANKS:", fib, "| other:", items.length - mc - fib);
  console.log("No options:", noOptions, "| No prompt:", noPrompt);
  console.log("\nItems with structural issues:", issues.length);
  if (issues.length > 0) {
    console.log("\nAll issues:");
    issues.forEach((i) => console.log(JSON.stringify(i)));
  }

  console.log("\n=== Items WITHOUT audio (first 20) ===");
  noAudioItems.slice(0, 20).forEach((i) =>
    console.log(
      i.id,
      i.level,
      "ttsScript:",
      i.ttsScript ? i.ttsScript.slice(0, 60) + "..." : "NULL"
    )
  );

  // Sample a full item to understand structure
  const sample = items.find((i) => !(i.content as any).audioUrl);
  if (sample) {
    console.log("\n=== Sample item without audio ===");
    console.log(JSON.stringify(sample, null, 2));
  }

  // Check broken URLs
  const brokenUrl = items.filter((i) => {
    const url = (i.content as any).audioUrl as string | undefined;
    return url && !url.startsWith("http") && !url.startsWith("/");
  });
  console.log("\nBroken audioUrl format:", brokenUrl.length);
}

main().catch(console.error).finally(() => p.$disconnect());
