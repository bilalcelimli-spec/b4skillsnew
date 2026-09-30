import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ItemRenderer } from "../../../src/components/ItemRenderer";
import "../../../src/index.css";

const mode = new URLSearchParams(location.search).get("mode") ?? "reading";
const passage = Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1}. The community garden provides a quiet place for local residents to meet, learn and grow fresh vegetables together.`).join("\n\n");
const variants: Record<string, any> = {
  reading: { skill: "READING", type: "MULTIPLE_CHOICE", content: { readingText: passage, question: "Why do people visit the community garden?", options: ["To meet neighbours and learn about gardening.", "To avoid all contact with local residents.", "To buy equipment from a commercial shop.", "To attend a weekly meeting about an exceptionallylongwordwithoutspaces".repeat(2)] } },
  grammar: { skill: "GRAMMAR", type: "FILL_IN_BLANKS", content: { prompt: "Complete the sentence", scaffold: "She ___1___ home and ___[2]___ dinner.", wordBank: ["walks", "cooks", "away"] } },
  vocabulary: { skill: "VOCABULARY", type: "FILL_IN_BLANKS", content: { prompt: "Choose a word", passage: "The room was ___1___.", options: ["enormous", "tiny", "quiet", "dark"] } },
  open: { skill: "GRAMMAR", type: "FILL_IN_BLANKS", content: { prompt: "She ___1___ home." } },
  writing: { skill: "WRITING", type: "INTEGRATED_TASK", content: { prompt: "Summarise the community garden proposals.", input: passage, minWords: 1, maxWords: 50 } },
  matching: { skill: "VOCABULARY", type: "DRAG_DROP", content: { prompt: "Match the words", draggableItems: ["a place to grow plants", "people living nearby"], dropZones: ["garden", "neighbours"] } },
  ordering: { skill: "READING", type: "DRAG_DROP", content: { prompt: "Arrange the events", draggableItems: ["First plant the seeds.", "Then water them." ] } },
};
function Fixture() {
  const [answer, setAnswer] = useState<unknown>();
  return <main className="mx-auto w-full max-w-4xl p-3">
    <ItemRenderer sessionId="fixture-session" item={{ id: `fixture-${mode}`, ...variants[mode] } as any} onResponse={setAnswer} />
    <output aria-label="Submitted answer">{answer === undefined ? "Not submitted" : JSON.stringify(answer)}</output>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
