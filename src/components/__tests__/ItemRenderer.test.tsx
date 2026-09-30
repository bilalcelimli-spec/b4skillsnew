// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemRenderer } from "../ItemRenderer.js";

const baseItem = {
  id: "item-1",
  skill: "GRAMMAR",
  type: "FILL_IN_BLANKS",
  content: { prompt: "She ___ to work every day." },
} as any;

describe("ItemRenderer response recovery", () => {
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
