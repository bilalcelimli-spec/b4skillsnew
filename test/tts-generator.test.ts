import { describe, expect, it } from "vitest";
import {
  collapseDialogueToTwoVoices,
  detectSpeakers,
  resolveListeningScript,
} from "../src/lib/audio/tts-generator.js";
import { normalizeSpeakerLabels, stripListeningWorksheet } from '../src/lib/audio/speaker-labels.js';

describe("listening TTS source selection", () => {
  it('recognizes bracketed labels and normalizes them for voice configuration', () => {
    const script = '  [Speaker A]: Hello.\r\n[Speaker B]: Hi.\n[pause]\n[Speaker A]: Welcome.';
    expect(detectSpeakers(script)).toEqual(['Speaker A', 'Speaker B']);
    expect(normalizeSpeakerLabels(script)).toBe('Speaker A: Hello.\nSpeaker B: Hi.\n[pause]\nSpeaker A: Welcome.');
  });
  it('preserves bracketed speaker turns when mapping dialogue', () => {
    expect(collapseDialogueToTwoVoices('[Alice]: Hello.\n[Bob]: Hi.').script).toBe('Speaker A: Hello.\nSpeaker B: Hi.');
  });
  it('does not treat candidate note-taking fields as speakers', () => {
    const source = '[Speaker A]: Hi.\n[Speaker B]: Hello. [pause] Notes about Mum:\nWearing: green ____\nMaking: ____';
    expect(detectSpeakers(source)).toEqual(['Speaker A', 'Speaker B']);
    expect(stripListeningWorksheet(source)).toBe('[Speaker A]: Hi.\n[Speaker B]: Hello.');
  });
  it('keeps genuine spoken notes when no answer scaffold follows', () => {
    const source = 'Speaker A: Notes about the meeting: everyone agreed.';
    expect(stripListeningWorksheet(source)).toBe(source);
  });
  it("recognizes titles and multi-word speaker names", () => {
    expect(detectSpeakers("Ms. Green: Hello.\nTom: Hi.\nMs. Green: Sit down.")).toEqual([
      "Ms. Green",
      "Tom",
    ]);
    expect(detectSpeakers("Prof. Chen: Begin.\nDr. Amara Diallo: I agree.")).toEqual([
      "Prof. Chen",
      "Dr. Amara Diallo",
    ]);
  });

  it("uses the labelled passage when an old ttsScript collapsed the dialogue", () => {
    const passage = "Ms. Green: Good morning.\nTom: Good morning.";
    expect(resolveListeningScript({
      numberOfSpeakers: 2,
      speakers: ["Ms. Green", "Tom"],
      passage,
      ttsScript: "Good morning.\nGood morning.",
    })).toBe(passage);
  });

  it("keeps the curated ttsScript for a monologue", () => {
    expect(resolveListeningScript({
      numberOfSpeakers: 1,
      passage: "[Lecturer]\nA longer source passage.",
      ttsScript: "A pronunciation-safe source passage.",
    })).toBe("A pronunciation-safe source passage.");
  });

  it("preserves all turns while mapping larger panels to two voice channels", () => {
    const result = collapseDialogueToTwoVoices(
      "Moderator: Welcome.\nProfessor Osei-Mensah: Thank you.\nPanellist: I disagree.\nModerator: Why?",
    );
    expect(result.originalSpeakers).toEqual(["Moderator", "Professor Osei-Mensah", "Panellist"]);
    expect(result.voiceMapping).toEqual({
      Moderator: "Speaker A",
      "Professor Osei-Mensah": "Speaker B",
      Panellist: "Speaker A",
    });
    expect(result.script).toBe(
      "Speaker A: Welcome.\nSpeaker B: Thank you.\nSpeaker A: I disagree.\nSpeaker A: Why?",
    );
    expect(detectSpeakers(result.script)).toEqual(["Speaker A", "Speaker B"]);
  });
});
