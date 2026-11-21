// @vitest-environment jsdom
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "../AudioPlayer";

describe("AudioPlayer autoplay and recovery", () => {
  let play: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
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
  it.each(['NaN', 'Infinity', '-1', '0', '100', '1.25garbage'])("ignores invalid saved speed %s", (saved) => {
    localStorage.setItem('linguadapt_audio_speed', saved);
    const {container} = render(<AudioPlayer src="/audio.mp3" showWaveform={false} />);
    expect(container.querySelector('audio')!.playbackRate).toBe(1);
    expect(screen.getByRole('button', {name: 'Speed 1x'}).getAttribute('aria-pressed')).toBe('true');
  });

  it('restores a supported saved playback speed', () => {
    localStorage.setItem('linguadapt_audio_speed', '0.75');
    const {container} = render(<AudioPlayer src="/audio.mp3" showWaveform={false} />);
    expect(container.querySelector('audio')!.playbackRate).toBe(0.75);
  });

  it('ignores an old play resolution when the question audio changes', async () => {
    let resolveOld!: () => void;
    play.mockImplementationOnce(() => new Promise<void>(resolve => {resolveOld = resolve;}));
    const {rerender} = render(<AudioPlayer src="/old.mp3" showWaveform={false} />);
    fireEvent.click(screen.getByRole('button', {name: 'Play audio'}));
    rerender(<AudioPlayer src="/new.mp3" showWaveform={false} />);
    await act(async () => {resolveOld();});
    expect(screen.queryByRole('button', {name: 'Pause audio'})).toBeNull();
    await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Play audio'}));});
    expect(play).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', {name: 'Pause audio'})).toBeTruthy();
  });

  it('keeps unknown audio duration finite and reflects browser pauses', async () => {
    const {container} = render(<AudioPlayer src="/audio.mp3" showWaveform={false} />);
    const audio = container.querySelector('audio')!;
    Object.defineProperty(audio, 'duration', {configurable: true, value: Infinity});
    fireEvent.loadedMetadata(audio);
    expect(screen.getByRole('slider').getAttribute('aria-valuemax')).toBe('0');
    await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Play audio'}));});
    fireEvent.pause(audio);
    expect(screen.getByRole('button', {name: 'Play audio'})).toBeTruthy();
  });

  it('clamps pointer seeking and ignores a progress bar with no width', () => {
    const {container} = render(<AudioPlayer src="/audio.mp3" showWaveform={false} />);
    const audio = container.querySelector('audio')!;
    Object.defineProperty(audio, 'duration', {configurable: true, value: 30});
    fireEvent.loadedMetadata(audio);
    const slider = screen.getByRole('slider');
    const bounds = vi.spyOn(slider, 'getBoundingClientRect');
    bounds.mockReturnValue({left: 10, width: 100} as DOMRect);
    fireEvent.click(slider, {clientX: 200});
    expect(audio.currentTime).toBe(30);
    fireEvent.click(slider, {clientX: 0});
    expect(audio.currentTime).toBe(0);
    bounds.mockReturnValue({left: 10, width: 0} as DOMRect);
    fireEvent.click(slider, {clientX: 50});
    expect(audio.currentTime).toBe(0);
  });

  describe("exam mode", () => {
    const grant = (playsUsed: number, allowed = true) => vi.fn().mockResolvedValue({ allowed, playsUsed });

    it("offers no speed, seek, pause or replay control and ignores a saved speed", async () => {
      localStorage.setItem('linguadapt_audio_speed', '0.75');
      const {container} = render(<AudioPlayer src="/audio.mp3" showWaveform={false} exam={{ onPlayStart: grant(1) }} />);
      expect(container.querySelector('audio')!.playbackRate).toBe(1);
      expect(screen.queryByRole('button', {name: /Speed/})).toBeNull();
      expect(screen.queryByRole('slider')).toBeNull();
      expect(screen.queryByRole('button', {name: 'Replay audio'})).toBeNull();
      await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Play audio'}));});
      expect(screen.queryByRole('button', {name: 'Pause audio'})).toBeNull();
      expect((screen.getByRole('button', {name: 'Audio is playing'}) as HTMLButtonElement).disabled).toBe(true);
    });

    it("counts a play when it starts and resumes an interrupted play for free", async () => {
      const onPlayStart = grant(1);
      const {container} = render(<AudioPlayer src="/audio.mp3" maxPlays={1} showWaveform={false} exam={{ onPlayStart }} />);
      const audio = container.querySelector('audio')!;
      await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Play audio'}));});
      expect(onPlayStart).toHaveBeenCalledOnce();
      expect(screen.getByText('No plays left')).toBeTruthy();
      fireEvent.pause(audio); // e.g. headphones unplugged
      await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Play audio'}));});
      expect(onPlayStart).toHaveBeenCalledOnce();
      fireEvent.ended(audio);
      expect((screen.getByRole('button', {name: 'Play audio'}) as HTMLButtonElement).disabled).toBe(true);
    });

    it("starts from the plays the server already counted", () => {
      render(<AudioPlayer src="/audio.mp3" maxPlays={2} showWaveform={false} exam={{ playsUsed: 2, onPlayStart: grant(2) }} />);
      expect(screen.getByText('No plays left')).toBeTruthy();
      expect((screen.getByRole('button', {name: 'Play audio'}) as HTMLButtonElement).disabled).toBe(true);
    });

    it("stops when the server refuses and returns the play when the server cannot be reached", async () => {
      const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");
      const onPlayStart = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ allowed: false, playsUsed: 2 });
      render(<AudioPlayer src="/audio.mp3" maxPlays={2} showWaveform={false} exam={{ onPlayStart }} />);
      await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Play audio'}));});
      expect(pause).toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain('no play was used');
      expect(screen.getByText('2 plays left')).toBeTruthy();
      await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Play audio'}));});
      expect(screen.getByText('No plays left')).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it("undoes seeking and speed changes made outside the player", async () => {
      const {container} = render(<AudioPlayer src="/audio.mp3" showWaveform={false} exam={{ onPlayStart: grant(1) }} />);
      const audio = container.querySelector('audio')!;
      await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Play audio'}));});
      audio.currentTime = 12;
      fireEvent.seeking(audio);
      expect(audio.currentTime).toBe(0);
      audio.playbackRate = 0.5;
      fireEvent.rateChange(audio);
      expect(audio.playbackRate).toBe(1);
    });
  });

});
