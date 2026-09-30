// @vitest-environment jsdom
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FaceCapture } from "../FaceCapture";

vi.mock("motion/react", () => ({ motion: { div: ({ children, ...props }: any) => <div>{children}</div> } }));

const stopTrack = vi.fn();
const getUserMedia = vi.fn();

async function readyCamera(container: HTMLElement) {
  await act(async () => {});
  const video = container.querySelector("video")!;
  Object.defineProperties(video, {
    readyState: { configurable: true, value: 2 },
    videoWidth: { configurable: true, value: 640 },
    videoHeight: { configurable: true, value: 480 },
  });
  fireEvent.loadedData(video);
}

async function takePhoto() {
  fireEvent.click(screen.getByRole("button", { name: "Take Photo" }));
  await act(async () => { vi.advanceTimersByTime(3000); });
}

describe("FaceCapture transition and recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopTrack.mockReset();
    getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as any);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,/9j/AA==");
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("uploads to the real session and provides an immediate, single-use continue action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const onCaptureDone = vi.fn();
    const { container } = render(<FaceCapture sessionId="session-1" onCaptureDone={onCaptureDone} />);
    await readyCamera(container);
    await takePhoto();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/sessions/session-1/identity-snapshot");
    expect(stopTrack).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Exam" }));
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(onCaptureDone).toHaveBeenCalledOnce();
  });

  it("preserves upload errors and bounds the existing skip fallback when the network hangs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: "Identity evidence storage is not configured" }) });
    vi.stubGlobal("fetch", fetchMock);
    const onCaptureDone = vi.fn();
    const { container } = render(<FaceCapture sessionId="session-1" onCaptureDone={onCaptureDone} />);
    for (let i = 0; i < 3; i++) {
      await readyCamera(container);
      await takePhoto();
      expect(screen.getByRole("alert")).toBeTruthy();
      if (i < 2) {
        expect(screen.getByRole("alert").textContent).toContain("storage is not configured");
        // Retry must be explicit; the error should not vanish automatically.
        expect(getUserMedia).toHaveBeenCalledTimes(i + 1);
        fireEvent.click(screen.getByRole("button", { name: /Try Again/ }));
      }
    }
    fetchMock.mockImplementationOnce((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Timeout", "AbortError")));
    }));
    fireEvent.click(screen.getByRole("button", { name: "Start Exam (Without Photo)" }));
    expect(screen.getByRole("status").textContent).toBe("Continuing…");
    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect(onCaptureDone).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[3][1].body).failureReason).toBe("max_retries_exceeded");
  });

  it("does not bypass capture when the camera has no usable frame", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const onCaptureDone = vi.fn();
    const { container } = render(<FaceCapture sessionId="session-1" onCaptureDone={onCaptureDone} />);
    await readyCamera(container);
    Object.defineProperty(container.querySelector("video"), "readyState", { configurable: true, value: 0 });
    await takePhoto();
    expect(screen.getByRole("alert").textContent).toContain("Camera image is not ready");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onCaptureDone).not.toHaveBeenCalled();
  });

  it("times out camera acquisition and releases a late stream instead of overwriting the error", async () => {
    let resolveStream: (stream: any) => void;
    getUserMedia.mockImplementationOnce(() => new Promise(resolve => { resolveStream = resolve; }));
    render(<FaceCapture sessionId="session-1" onCaptureDone={vi.fn()} />);
    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect(screen.getByRole("alert").textContent).toContain("Camera did not become ready");
    await act(async () => { resolveStream!({ getTracks: () => [{ stop: stopTrack }] }); });
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("cancels countdowns and releases the camera when leaving the step", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container, unmount } = render(<FaceCapture sessionId="session-1" onCaptureDone={vi.fn()} />);
    await readyCamera(container);
    fireEvent.click(screen.getByRole("button", { name: "Take Photo" }));
    unmount();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(stopTrack).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
