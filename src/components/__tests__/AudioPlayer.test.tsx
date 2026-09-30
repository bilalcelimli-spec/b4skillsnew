// @vitest-environment jsdom
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "../AudioPlayer";

describe("AudioPlayer autoplay and recovery", () => {
  let play: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('loads external audio in anonymous CORS mode before waveform routing', () => {
    const { container } = render(<AudioPlayer src="https://example.supabase.co/storage/v1/object/public/question-audio/test.wav" showWaveform={false} />);
    expect(container.querySelector('audio')?.getAttribute('crossorigin')).toBe('anonymous');
  });

  it("keeps audio mounted during countdown and starts after it ends", async () => {
    const { container } = render(<AudioPlayer src="/audio.mp3" autoPlay countdownSeconds={3} showWaveform={false} />);
    expect(container.querySelector("audio")).toBeTruthy();
    for (let i = 0; i < 3; i++) await act(async () => { vi.advanceTimersByTime(1000); });
    expect(play).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Pause audio" })).toBeTruthy();
  });

  it("does not consume a play when the browser blocks playback", async () => {
    play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    render(<AudioPlayer src="/audio.mp3" autoPlay countdownSeconds={0} showWaveform={false} />);
    await act(async () => {});
    expect(screen.getByRole("status").textContent).toContain("Press Play audio");
    expect(screen.getByText("2 plays left")).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Play audio" })); });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: "Pause audio" })).toBeTruthy();
  });

  it("resets completed plays for a new source and blocks keyboard seeking after exhaustion", () => {
    const { container, rerender } = render(<AudioPlayer src="/first.mp3" maxPlays={1} showWaveform={false} />);
    const audio = container.querySelector("audio")!;
    Object.defineProperty(audio, "duration", { configurable: true, value: 30 });
    fireEvent.loadedMetadata(audio);
    fireEvent.ended(audio);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(audio.currentTime).toBe(0);
    expect((screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<AudioPlayer src="/second.mp3" maxPlays={1} showWaveform={false} />);
    expect(screen.getByText("1 play left")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
