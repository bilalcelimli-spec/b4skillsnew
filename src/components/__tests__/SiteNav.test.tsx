// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteNav } from "../SiteNav";

describe("SiteNav", () => {
  it("renders every primary desktop link once and keeps login and registration distinct", () => {
    render(<SiteNav onStart={vi.fn()} onCodeEntry={vi.fn()} />);

    expect(screen.getAllByRole("link", { name: "Research" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Methodology" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Pricing" })).toHaveLength(1);

    expect(screen.getByRole("button", { name: "Sign in as test taker" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Get Started" }).getAttribute("href")).toBe("/register");
  });

  it("opens and closes the mobile menu accessibly", () => {
    const onStart = vi.fn();
    render(<SiteNav onStart={onStart} onCodeEntry={vi.fn()} />);

    const toggle = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Open menu" }).getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Test Taker Login" }));
    expect(onStart).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Open menu" }).getAttribute("aria-expanded")).toBe("false");
  });
});
