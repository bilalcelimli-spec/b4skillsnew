// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemRenderer } from "../ItemRenderer.js";
import { scoreStructuredResponse } from "../../lib/assessment-engine/structured-response";

const baseItem = {
  id: "item-1",
  skill: "GRAMMAR",
  type: "FILL_IN_BLANKS",
  content: { prompt: "She ___ to work every day." },
} as any;

describe("ItemRenderer response recovery", () => {
  it("renders numbered blanks once and submits choices in gap order", () => {
    const onResponse = vi.fn();
    render(<ItemRenderer item={{ ...baseItem, content: { prompt: "Choose the words", scaffold: "She ___1___ ___[2]___.", wordBank: ["walks", "home", "away"] } }} onResponse={onResponse} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    fireEvent.change(screen.getByRole("combobox", { name: "Blank 1" }), { target: { value: "walks" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Blank 2" }), { target: { value: "home" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Answer" }));
    expect(onResponse).toHaveBeenCalledWith("walks|home");
  });
  it("keeps image and text sources visible in an integrated writing task", () => {
    render(<ItemRenderer item={{ ...baseItem, skill: "WRITING", type: "INTEGRATED_TASK", content: { prompt: "Describe the chart", input: "Chart notes\nSecond paragraph", imageUrl: "/chart.svg", minWords: 1 } }} onResponse={vi.fn()} />);
    expect(screen.getByRole("img", { name: "Question Visual" })).toBeTruthy();
    expect(screen.getByText(/Chart notes/)).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Writing response" })).toBeTruthy();
  });
  it("answers matching through the candidate screen and server scoring contract", () => {
    const content = { prompt: "Match", draggableItems: ["meows", "barks"], dropZones: ["cat", "dog"], correctMapping: { "0": 0, "1": 1 } };
    const onResponse = vi.fn();
    render(<ItemRenderer item={{ ...baseItem, type: "DRAG_DROP", content }} onResponse={onResponse} />);
    fireEvent.change(screen.getByRole("combobox", { name: "cat" }), { target: { value: "0" } });
    fireEvent.change(screen.getByRole("combobox", { name: "dog" }), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Answer" }));
    expect(scoreStructuredResponse(content, onResponse.mock.calls[0][0])).toBe(1);
  });

  it("answers ordering by moving sentences and preserves the answer on retry", () => {
    const content = { prompt: "Arrange", draggableItems: ["First", "Second"], correctOrder: [0, 1] };
    const onResponse = vi.fn();
    render(<ItemRenderer item={{ ...baseItem, type: "DRAG_DROP", content }} onResponse={onResponse} />);
    fireEvent.click(screen.getByRole("button", { name: "Move First up" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Answer" }));
    expect(scoreStructuredResponse(content, onResponse.mock.calls[0][0])).toBe(1);
    expect(onResponse.mock.calls[1][0]).toEqual(onResponse.mock.calls[0][0]);
  });

  it("switches between MCQ and blank tasks without changing hook order", () => {
    const onResponse = vi.fn();
    const { rerender } = render(<ItemRenderer item={{ ...baseItem, type: "MULTIPLE_CHOICE", content: { prompt: "Choose", options: ["One", "Two"] } }} onResponse={onResponse} />);
    rerender(<ItemRenderer item={{ ...baseItem, id: "blank" }} onResponse={onResponse} />);
    expect(screen.getByPlaceholderText("···")).toBeTruthy();
  });
  it("keeps a typed answer available when submission does not advance the item", () => {
    const onResponse = vi.fn();
    const { rerender } = render(<ItemRenderer item={baseItem} onResponse={onResponse} />);

    fireEvent.change(screen.getByPlaceholderText("···"), { target: { value: "walks" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Answer" }));

    expect(onResponse).toHaveBeenCalledWith("walks");
    rerender(<ItemRenderer item={baseItem} onResponse={onResponse} disabled={false} />);
    expect((screen.getByPlaceholderText("···") as HTMLInputElement).value).toBe("walks");
  });

  it("clears the preserved answer only when the item changes", () => {
    const { rerender } = render(<ItemRenderer item={baseItem} onResponse={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("···"), { target: { value: "walks" } });

    rerender(
      <ItemRenderer
        item={{ ...baseItem, id: "item-2", content: { prompt: "They ___ ready." } }}
        onResponse={vi.fn()}
      />,
    );

    expect((screen.getByPlaceholderText("···") as HTMLInputElement).value).toBe("");
  });
});
