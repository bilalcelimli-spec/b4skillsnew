// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TestPlayer } from "../TestPlayer";
import { writingDraftKey } from "../../lib/assessment-engine/writing-draft";

vi.mock("../../lib/i18n/config", () => ({}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../ProctoringMonitor", () => ({ ProctoringMonitor: () => null }));
vi.mock("../LanguageSwitcher", () => ({ LanguageSwitcher: () => null }));
vi.mock("../FaceCapture", () => ({ FaceCapture: ({ onCaptureDone }: any) => <button onClick={onCaptureDone}>Verify</button> }));
vi.mock("../PracticeMode", () => ({ PracticeMode: ({ onComplete }: any) => <button onClick={onComplete}>Finish practice</button> }));
vi.mock("../CandidateFeedback", () => ({ CandidateFeedback: () => <p>Finished</p> }));
vi.mock("../ItemRenderer", () => ({ ItemRenderer: ({ onResponse, disabled }: any) => <button disabled={disabled} onClick={() => onResponse("Saved essay")}>Send essay</button> }));
vi.mock("motion/react", () => ({ motion: { div: ({ children }: any) => <div>{children}</div> }, AnimatePresence: ({ children }: any) => children }));

describe("TestPlayer response persistence", () => {
  afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); vi.restoreAllMocks(); });
  it("saves before scoring and clears the draft only after a successful retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let saved = false;
    let attempts = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/launch")) return { ok: true, json: async () => ({ sessionId: "session-1" }) };
      if (url.endsWith("/next")) return { ok: true, json: async () => saved ? { stop: true, finalTheta: 0 } : { item: { id: "item-1", skill: "WRITING", metadata: { prompt: "Write" } } } };
      if (url.endsWith("/status")) return { ok: true, json: async () => ({ progress: 0 }) };
      if (url.endsWith("/respond")) {
        attempts++;
        saved = attempts > 1;
        return { ok: saved, json: async () => saved ? { success: true } : { error: "Please retry" } };
      }
      throw new Error(`Unexpected endpoint ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const key = writingDraftKey("session-1", "item-1");
    sessionStorage.setItem(key, "Saved essay");
    render(<TestPlayer organizationId="org-1" candidateId="candidate-1" onComplete={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Verify" }));
    fireEvent.click(await screen.findByRole("button", { name: "Finish practice" }));
    fireEvent.click(await screen.findByRole("button", { name: "Send essay" }));
    await screen.findByRole("alert");
    expect(sessionStorage.getItem(key)).toBe("Saved essay");
    fireEvent.click(screen.getByRole("button", { name: "Send essay" }));
    await waitFor(() => expect(sessionStorage.getItem(key)).toBeNull());
    expect(attempts).toBe(2);
    expect(fetchMock.mock.calls.every(([url]) => !url.startsWith("/api/ai/"))).toBe(true);
  });
});
