import { describe, expect, it, vi } from "vitest";

vi.mock("../../prisma", () => ({ prisma: {} }));

import { audioPlayKey, audioPlaysUsed, audioPolicy, audioSource, isYoungLearnerProfile, listeningMaxPlays, withSessionAudio } from "../listening-delivery";

describe("listening play policy", () => {
  it("reads the plays counted for an item and ignores malformed metadata", () => {
    expect(audioPlaysUsed({ audioPlays: { a: 2 } }, "a")).toBe(2);
    expect(audioPlaysUsed({ audioPlays: { a: 2 } }, "b")).toBe(0);
    expect(audioPlaysUsed({ audioPlays: { a: "x" } }, "a")).toBe(0);
    expect(audioPlaysUsed(null, "a")).toBe(0);
  });

  it("sends the candidate the limit and what is already used, never more than the limit", () => {
    expect(audioPolicy({ audioPlays: { a: 1 } }, "a", 2)).toEqual({ maxPlays: 2, playsUsed: 1 });
    expect(audioPolicy({ audioPlays: { a: 9 } }, "a", 2).playsUsed).toBe(2);
    expect(audioPolicy({ audioPlays: { a: 2 } }, "a", 1)).toEqual({ maxPlays: 1, playsUsed: 1 });
  });

  it("allows two plays up to A2 and one from B1", () => {
    expect(["PRE_A1", "A1", "A2", "pre-a1"].map(level => listeningMaxPlays(level))).toEqual([2, 2, 2, 2]);
    expect(["B1", "B2", "C1", "C2"].map(level => listeningMaxPlays(level))).toEqual([1, 1, 1, 1]);
    expect(listeningMaxPlays(undefined)).toBe(2);
  });

  it("always allows two plays in a young-learner product", () => {
    expect(isYoungLearnerProfile({ ageRange: [7, 10] })).toBe(true);
    expect(isYoungLearnerProfile({ ageRange: [11, 14] })).toBe(false);
    expect(listeningMaxPlays("B1", true)).toBe(2);
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
