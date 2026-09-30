// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WritingEditor } from "../WritingEditor";
import { writingDraftKey } from "../../lib/assessment-engine/writing-draft";

describe("WritingEditor draft recovery", () => {
  beforeEach(() => sessionStorage.clear());
  it("restores a saved draft with an accurate word count and submits it", () => {
    const draftKey = writingDraftKey("session-1", "question-1");
    sessionStorage.setItem(draftKey, "One two three");
    const onWritingComplete = vi.fn();
    render(<WritingEditor draftKey={draftKey} prompt="Write" minWords={3} isUploading={false} onWritingComplete={onWritingComplete} />);
    expect(screen.getByRole("status", { name: "Word count: 3 of 3 minimum" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Submit Essay" }));
    expect(onWritingComplete).toHaveBeenCalledWith("One two three");
  });
  it("saves each edit and keeps identical prompts isolated by question and session", () => {
    const first = writingDraftKey("session-1", "question-1");
    const second = writingDraftKey("session-2", "question-1");
    const props = { prompt: "The same prompt", minWords: 1, isUploading: false, onWritingComplete: vi.fn() };
    const { rerender } = render(<WritingEditor {...props} draftKey={first} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Saved immediately" } });
    expect(sessionStorage.getItem(first)).toBe("Saved immediately");
    rerender(<WritingEditor {...props} draftKey={second} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
    rerender(<WritingEditor {...props} draftKey={first} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Saved immediately");
  });
});
