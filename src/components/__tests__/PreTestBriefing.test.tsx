// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OZGUN_PRODUCT } from "../../lib/fixed-forms/ozgun-kids";
import { PreTestBriefing } from "../PreTestBriefing.js";

describe("PreTestBriefing", () => {
  it("uses the shared briefing with the fixed exam's actual skills, timings and policies", () => {
    render(<PreTestBriefing productLine={OZGUN_PRODUCT} onStart={vi.fn()} onCancel={vi.fn()}/>);
    expect(screen.getByText('105 min')).toBeTruthy();
    expect(screen.getByText('96 questions · 4 timed sections')).toBeTruthy();
    expect(screen.queryByText('Microphone required')).toBeNull();
    expect(screen.queryByText('Adaptive — stops early when confident')).toBeNull();
    expect(screen.getByText(/Writing and Speaking are not assessed/)).toBeTruthy();
    expect(screen.getByText(/Preparation does not start the exam timer/)).toBeTruthy();
  });
  it("keeps the dialog height bounded with a scrollable content region", () => {
    render(<PreTestBriefing onStart={vi.fn()} onCancel={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("flex flex-col");
    expect(dialog.className).toContain("sm:max-h-[calc(100dvh-2rem)]");

    const content = screen.getByText("What to Expect").parentElement?.parentElement;
    expect(content?.className).toContain("overflow-y-auto");
    expect(content?.className).toContain("min-h-0 flex-1");
  });

  it("keeps the start action available after rubric details are expanded", () => {
    const onStart = vi.fn();
    render(<PreTestBriefing onStart={onStart} onCancel={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Lexical Accuracy/i })[0]);
    expect(screen.getByText(/Words used with correct meaning and register/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Start Test/i }));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
