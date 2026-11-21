import { describe, expect, it, vi } from "vitest";

vi.mock("../../prisma", () => ({ prisma: {} }));

import { audioPlayKey, audioPlaysUsed, audioPolicy, audioSource, LISTENING_MAX_PLAYS, withSessionAudio } from "../listening-delivery";

describe("listening play policy", () => {
  it("reads the plays counted for an item and ignores malformed metadata", () => {
    expect(audioPlaysUsed({ audioPlays: { a: 2 } }, "a")).toBe(2);
    expect(audioPlaysUsed({ audioPlays: { a: 2 } }, "b")).toBe(0);
    expect(audioPlaysUsed({ audioPlays: { a: "x" } }, "a")).toBe(0);
    expect(audioPlaysUsed(null, "a")).toBe(0);
  });

  it("sends the candidate the limit and what is already used, never more than the limit", () => {
    expect(audioPolicy({ audioPlays: { a: 1 } }, "a")).toEqual({ maxPlays: LISTENING_MAX_PLAYS, playsUsed: 1 });
    expect(audioPolicy({ audioPlays: { a: 9 } }, "a").playsUsed).toBe(LISTENING_MAX_PLAYS);
  });

  it("counts plays per recording, so its questions share one budget", () => {
    const q1 = { id: "q1", metadata: { ttsScript: "Maria: Hello." } };
    const q2 = { id: "q2", metadata: { ttsScript: "Maria: Hello." } };
    expect(audioPlayKey(q1)).toBe(audioPlayKey(q2));
    expect(audioPlayKey(q1)).not.toBe(audioPlayKey({ id: "q3", metadata: { ttsScript: "Tom: Bye." } }));
    expect(audioPlayKey({ id: "q4", metadata: {} })).toBe("q4");
  });
});

describe("session-bound recording address", () => {
  const storage = "https://project.supabase.co";

  it("recognises files under /audio/ and the project's own public storage", () => {
    expect(audioSource("/audio/talk-1.wav", storage)).toEqual({ kind: "local", file: "talk-1.wav" });
    expect(audioSource("https://project.supabase.co/storage/v1/object/public/question-audio/a/b.wav", storage))
      .toEqual({ kind: "remote", url: "https://project.supabase.co/storage/v1/object/public/question-audio/a/b.wav" });
  });

  it("refuses paths outside /audio/, other hosts and private storage paths", () => {
    for (const url of ["/audio/../.env", "/audio/a/b.wav", "/audio/..wav..", "/uploads/a.wav", "http://project.supabase.co/storage/v1/object/public/a.wav",
      "https://evil.example/storage/v1/object/public/a.wav", "https://project.supabase.co/storage/v1/object/sign/a.wav", "", null, 7]) {
      expect(audioSource(url, storage)).toBeNull();
    }
    expect(audioSource("https://project.supabase.co/storage/v1/object/public/a.wav", undefined)).toBeNull();
  });

  it("hides the stored address from the candidate and leaves other content alone", () => {
    expect(withSessionAudio({ audioUrl: "/audio/research-ethics-seminar.wav", prompt: "Q" }, "s1", "i1"))
      .toEqual({ audioUrl: "/api/sessions/s1/audio/i1", prompt: "Q" });
    expect(withSessionAudio({ audioUrl: "https://elsewhere.example/a.mp3" }, "s1", "i1")).toEqual({ audioUrl: "https://elsewhere.example/a.mp3" });
    expect(withSessionAudio({ prompt: "Q" }, "s1", "i1")).toEqual({ prompt: "Q" });
  });
});
