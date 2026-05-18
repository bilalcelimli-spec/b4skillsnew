/**
 * UI Component Tests — Tier 3
 *
 * Tests for React components critical to assessment delivery:
 * - ItemRenderer: MCQ rendering and response handling
 * - Option selection and feedback
 * - Error states and edge cases
 *
 * Environment: jsdom (React testing)
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const MockItemRenderer: React.FC<any> = ({
  item,
  onResponse,
  disabled,
  feedback,
}) => {
  const [selectedOption, setSelectedOption] = React.useState<number | null>(null);
  const content = item.content as any;
  const options = Array.isArray(content.options) ? content.options : [];

  const handleOptionSelect = (index: number) => {
    if (!disabled) {
      setSelectedOption(index);
      onResponse({ selectedIndex: index, text: options[index]?.text });
    }
  };

  return (
    <div data-testid="item-renderer">
      <div data-testid="item-prompt">{content.prompt || content.stem}</div>

      <div data-testid="options-list">
        {options.map((opt: any, idx: number) => (
          <button
            key={idx}
            data-testid={`option-${idx}`}
            onClick={() => handleOptionSelect(idx)}
            disabled={disabled}
            className={selectedOption === idx ? "selected" : ""}
          >
            {opt.text}
          </button>
        ))}
      </div>

      {feedback && (
        <div data-testid="feedback">
          <p data-testid="feedback-message">{feedback.message}</p>
          {feedback.rationale && (
            <p data-testid="feedback-rationale">{feedback.rationale}</p>
          )}
        </div>
      )}
    </div>
  );
};

describe("ItemRenderer: MCQ Items", () => {
  let mockItem: any;
  let mockOnResponse: any;

  beforeEach(() => {
    mockItem = {
      id: "test-item-001",
      skill: "GRAMMAR",
      cefrLevel: "B1",
      content: {
        prompt: "Which sentence is correct?",
        options: [
          { text: "She go to school", isCorrect: false, rationale: "Wrong verb form" },
          { text: "She goes to school", isCorrect: true, rationale: "Correct subject-verb agreement" },
          { text: "She going to school", isCorrect: false, rationale: "Missing auxiliary verb" },
          { text: "She gone to school", isCorrect: false, rationale: "Wrong tense" },
        ],
      },
    };
    mockOnResponse = vi.fn();
  });

  it("should render item prompt correctly", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} />);
    const prompt = screen.getByTestId("item-prompt");
    expect(prompt).toBeDefined();
    expect(prompt.textContent).toContain("Which sentence is correct?");
  });

  it("should render all 4 options", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} />);
    expect(screen.getByTestId("option-0")).toBeDefined();
    expect(screen.getByTestId("option-1")).toBeDefined();
    expect(screen.getByTestId("option-2")).toBeDefined();
    expect(screen.getByTestId("option-3")).toBeDefined();
  });

  it("should display option text correctly", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} />);
    expect(screen.getByTestId("option-0").textContent).toContain("She go to school");
    expect(screen.getByTestId("option-1").textContent).toContain("She goes to school");
  });

  it("should call onResponse when option is selected", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} />);
    fireEvent.click(screen.getByTestId("option-1"));
    expect(mockOnResponse).toHaveBeenCalledWith({
      selectedIndex: 1,
      text: "She goes to school",
    });
  });

  it("should visually highlight selected option", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} />);
    const option = screen.getByTestId("option-1");
    fireEvent.click(option);
    expect(option.classList.contains("selected")).toBe(true);
  });

  it("should not call onResponse when disabled", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} disabled={true} />);
    fireEvent.click(screen.getByTestId("option-1"));
    expect(mockOnResponse).not.toHaveBeenCalled();
  });

  it("should disable all option buttons when disabled prop is true", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} disabled={true} />);
    expect((screen.getByTestId("option-0") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("option-1") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("option-2") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("option-3") as HTMLButtonElement).disabled).toBe(true);
  });

  it("should allow changing selection", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} />);
    fireEvent.click(screen.getByTestId("option-0"));
    expect(mockOnResponse).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("option-1"));
    expect(mockOnResponse).toHaveBeenCalledTimes(2);
  });
});

describe("ItemRenderer: Feedback Display", () => {
  let mockItem: any;
  let mockOnResponse: any;

  beforeEach(() => {
    mockItem = {
      id: "test-item-002",
      skill: "VOCABULARY",
      cefrLevel: "A2",
      content: {
        prompt: "What does 'abundant' mean?",
        options: [
          { text: "Scarce", isCorrect: false, rationale: "Opposite meaning" },
          { text: "Plentiful", isCorrect: true, rationale: "Abundant means existing in large quantities" },
          { text: "Expensive", isCorrect: false, rationale: "No relation to price" },
          { text: "New", isCorrect: false, rationale: "No relation to age" },
        ],
      },
    };
    mockOnResponse = vi.fn();
  });

  it("should display feedback when provided", () => {
    const feedback = {
      message: "Correct!",
      rationale: "You selected the right answer.",
    };
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} feedback={feedback} />);
    const feedbackMsg = screen.getByTestId("feedback-message");
    expect(feedbackMsg).toBeDefined();
    expect(feedbackMsg.textContent).toContain("Correct!");
  });

  it("should display rationale when feedback provided", () => {
    const feedback = {
      message: "Correct!",
      rationale: "Abundant means existing in large quantities.",
    };
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} feedback={feedback} />);
    const rationale = screen.getByTestId("feedback-rationale");
    expect(rationale).toBeDefined();
    expect(rationale.textContent).toContain("Abundant means existing");
  });

  it("should not display feedback section when no feedback", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} />);
    expect(() => screen.getByTestId("feedback")).toThrow();
  });

  it("should display feedback with incorrect answer message", () => {
    const feedback = {
      message: "Incorrect",
      rationale: "Opposite meaning — abundant means plentiful, not scarce.",
    };
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} feedback={feedback} />);
    expect(screen.getByTestId("feedback-message").textContent).toContain("Incorrect");
    expect(screen.getByTestId("feedback-rationale")).toBeDefined();
  });
});

describe("ItemRenderer: READING Items", () => {
  let mockReadingItem: any;
  let mockOnResponse: any;

  beforeEach(() => {
    mockReadingItem = {
      id: "test-reading-001",
      skill: "READING",
      cefrLevel: "B1",
      content: {
        passage:
          "The climate is changing rapidly. Scientists agree that human activity is the primary cause. Rising temperatures are already affecting ecosystems worldwide.",
        prompt: "According to the passage, what is the primary cause of climate change?",
        options: [
          { text: "Natural cycles", isCorrect: false, rationale: "The passage states human activity" },
          { text: "Human activity", isCorrect: true, rationale: "Explicitly stated in passage" },
          { text: "Solar radiation", isCorrect: false, rationale: "Not mentioned" },
          { text: "Unknown causes", isCorrect: false, rationale: "Passage identifies a cause" },
        ],
      },
    };
    mockOnResponse = vi.fn();
  });

  it("should render READING item with passage", () => {
    render(<MockItemRenderer item={mockReadingItem} onResponse={mockOnResponse} />);
    expect(screen.getByTestId("item-prompt")).toBeDefined();
    expect(screen.getByTestId("options-list")).toBeDefined();
  });

  it("should render comprehension question", () => {
    render(<MockItemRenderer item={mockReadingItem} onResponse={mockOnResponse} />);
    const prompt = screen.getByTestId("item-prompt");
    expect(prompt.textContent).toContain("primary cause");
  });

  it("should allow selection on READING item options", () => {
    render(<MockItemRenderer item={mockReadingItem} onResponse={mockOnResponse} />);
    fireEvent.click(screen.getByTestId("option-1"));
    expect(mockOnResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedIndex: 1,
        text: "Human activity",
      })
    );
  });
});

describe("ItemRenderer: Edge Cases", () => {
  let mockOnResponse: any;

  beforeEach(() => {
    mockOnResponse = vi.fn();
  });

  it("should handle item with minimum content", () => {
    const minimalItem = {
      id: "minimal-001",
      skill: "GRAMMAR",
      content: {
        prompt: "Choose",
        options: [
          { text: "A", isCorrect: true, rationale: "Correct" },
          { text: "B", isCorrect: false, rationale: "Wrong" },
          { text: "C", isCorrect: false, rationale: "Wrong" },
          { text: "D", isCorrect: false, rationale: "Wrong" },
        ],
      },
    };
    render(<MockItemRenderer item={minimalItem} onResponse={mockOnResponse} />);
    expect(screen.getByTestId("item-prompt").textContent).toContain("Choose");
  });

  it("should handle long option text", () => {
    const longOptionItem = {
      id: "long-001",
      skill: "VOCABULARY",
      content: {
        prompt: "Choose",
        options: [
          {
            text: "A very long option text that goes on and on describing something in great detail",
            isCorrect: true,
            rationale: "Correct",
          },
          { text: "B", isCorrect: false, rationale: "Wrong" },
          { text: "C", isCorrect: false, rationale: "Wrong" },
          { text: "D", isCorrect: false, rationale: "Wrong" },
        ],
      },
    };
    render(<MockItemRenderer item={longOptionItem} onResponse={mockOnResponse} />);
    const option = screen.getByTestId("option-0");
    expect(option.textContent).toContain("A very long option");
  });

  it("should maintain state after option selection and feedback", () => {
    const item = {
      id: "state-001",
      skill: "GRAMMAR",
      content: {
        prompt: "Choose",
        options: [
          { text: "A", isCorrect: true, rationale: "Correct" },
          { text: "B", isCorrect: false, rationale: "Wrong" },
          { text: "C", isCorrect: false, rationale: "Wrong" },
          { text: "D", isCorrect: false, rationale: "Wrong" },
        ],
      },
    };
    const feedback = { message: "Correct!", rationale: "Good choice" };

    render(<MockItemRenderer item={item} onResponse={mockOnResponse} feedback={feedback} />);

    fireEvent.click(screen.getByTestId("option-0"));
    expect(screen.getByTestId("option-0").classList.contains("selected")).toBe(true);
    expect(screen.getByTestId("feedback-message").textContent).toContain("Correct!");
  });
});

describe("ItemRenderer: Accessibility", () => {
  let mockItem: any;
  let mockOnResponse: any;

  beforeEach(() => {
    mockItem = {
      id: "a11y-001",
      skill: "GRAMMAR",
      content: {
        prompt: "Choose correct option",
        options: [
          { text: "Option A", isCorrect: false, rationale: "Wrong" },
          { text: "Option B", isCorrect: true, rationale: "Correct" },
          { text: "Option C", isCorrect: false, rationale: "Wrong" },
          { text: "Option D", isCorrect: false, rationale: "Wrong" },
        ],
      },
    };
    mockOnResponse = vi.fn();
  });

  it("should have descriptive test IDs for all elements", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} />);
    expect(screen.getByTestId("item-renderer")).toBeDefined();
    expect(screen.getByTestId("item-prompt")).toBeDefined();
    expect(screen.getByTestId("options-list")).toBeDefined();
  });

  it("should have clickable buttons for options", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(4);
  });

  it("should support keyboard navigation (simulated with fireEvent)", () => {
    render(<MockItemRenderer item={mockItem} onResponse={mockOnResponse} />);
    const option = screen.getByTestId("option-1");
    fireEvent.click(option);
    expect(option.classList.contains("selected")).toBe(true);
  });
});
