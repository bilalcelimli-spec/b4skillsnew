// @vitest-environment jsdom
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpeakingRecorder } from "../SpeakingRecorder";
import { SessionRespondBody } from "../../lib/security/schemas/sessions";

vi.mock("../../hooks/useToast.js", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("motion/react", () => ({
  motion: { div: ({ children }: any) => <div>{children}</div>, span: ({ children }: any) => <span>{children}</span> },
  AnimatePresence: ({ children }: any) => children,
}));

let latestRecorder: FakeRecorder;
let empty = false;
let delayedStop = false;
class FakeRecorder {
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: any;
  onstop: any;
  onerror: any;
  constructor() { latestRecorder = this; }
  start = vi.fn(() => { this.state = "recording"; });
  stop = vi.fn(() => {
    this.state = "inactive";
    const finish = () => {
      this.ondataavailable?.({ data: new Blob(empty ? [] : ["recorded audio"], { type: this.mimeType }) });
      this.onstop?.();
    };
    if (delayedStop) setTimeout(finish, 100);
    else finish();
  });
}
const stopTrack = vi.fn();
const getUserMedia = vi.fn();

describe("SpeakingRecorder lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    empty = false;
    delayedStop = false;
    stopTrack.mockReset();
    getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:recording"), revokeObjectURL: vi.fn() });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("requires preparation, stops at the deadline and retains the same recording for retry", async () => {
    const onRecordingComplete = vi.fn();
    const props = { maxTime: 2, prepTime: 2, onRecordingComplete, isUploading: false };
    const { rerender } = render(<SpeakingRecorder {...props} />);
    expect((screen.getByRole("button", { name: "Start Recording" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Start Preparation" }));
    await act(async () => { vi.advanceTimersByTime(2000); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start Recording" })); });
    expect(getUserMedia).toHaveBeenCalledOnce();
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(latestRecorder.stop).toHaveBeenCalledOnce();
    expect(stopTrack).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Submit Response" }));
    rerender(<SpeakingRecorder {...props} uploadStatus="error" />);
    fireEvent.click(screen.getByRole("button", { name: "Retry Upload" }));
    expect(onRecordingComplete.mock.calls[0][0]).toBe(onRecordingComplete.mock.calls[1][0]);
    expect(onRecordingComplete.mock.calls[0][0].size).toBeGreaterThan(0);
  });

  it("rejects an empty recording and releases microphone tracks", async () => {
    empty = true;
    render(<SpeakingRecorder maxTime={2} onRecordingComplete={vi.fn()} isUploading={false} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start Recording" })); });
    fireEvent.click(screen.getByRole("button", { name: "Stop Recording" }));
    expect(screen.getByRole("alert").textContent).toContain("No audio was captured");
    expect(stopTrack).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Submit Response" })).toBeNull();
  });

  it("blocks a new recording and mode changes until the final audio event arrives", async () => {
    delayedStop = true;
    const onRecordingStateChange = vi.fn();
    render(<SpeakingRecorder maxTime={60} onRecordingComplete={vi.fn()} onRecordingStateChange={onRecordingStateChange} isUploading={false} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start Recording" })); });
    fireEvent.click(screen.getByRole("button", { name: "Stop Recording" }));
    expect(onRecordingStateChange).toHaveBeenLastCalledWith(true);
    const pending = screen.getByRole("button", { name: "Preparing Recording…" }) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    fireEvent.click(pending);
    expect(getUserMedia).toHaveBeenCalledOnce();
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(onRecordingStateChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("button", { name: "Submit Response" })).toBeTruthy();
  });

  it("pauses preview playback when the editor is inactive or submitting", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const props = { maxTime: 60, onRecordingComplete: vi.fn(), isUploading: false };
    const { rerender } = render(<SpeakingRecorder {...props} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start Recording" })); });
    fireEvent.click(screen.getByRole("button", { name: "Stop Recording" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Play Back" })); });
    expect(play).toHaveBeenCalledOnce();
    rerender(<SpeakingRecorder {...props} isUploading />);
    expect(pause).toHaveBeenCalledOnce();
    expect((screen.getByRole("button", { name: "Play Back" }) as HTMLButtonElement).disabled).toBe(true);
    play.mockRestore();
    pause.mockRestore();
  });

  it("stops the active recorder and microphone when leaving the question", async () => {
    const { unmount } = render(<SpeakingRecorder maxTime={60} onRecordingComplete={vi.fn()} isUploading={false} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start Recording" })); });
    unmount();
    expect(latestRecorder.state).toBe("inactive");
    expect(stopTrack).toHaveBeenCalled();
  });

  it("allows realistic audio payloads through the API validation", () => {
    expect(SessionRespondBody.safeParse({ itemId: "item-1", value: { audio: "A".repeat(100_000), mimeType: "audio/webm;codecs=opus" } }).success).toBe(true);
    expect(SessionRespondBody.safeParse({ itemId: "item-1", value: { audio: "abc", mimeType: "text/html" } }).success).toBe(false);
  });
});
