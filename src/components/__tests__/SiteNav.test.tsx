// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteNav } from "../SiteNav";

describe("SiteNav", () => {
  it("renders every primary desktop link once and keeps login and registration distinct", () => {
    render(<SiteNav />);

    expect(screen.getAllByRole("link", { name: "Research" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Methodology" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Pricing" })).toHaveLength(1);

    expect(screen.getByRole("link", { name: "Sign in as test taker" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Enter your exam code" }).getAttribute("href")).toBe("/exam-code");
    expect(screen.getByRole("link", { name: "Get Started" }).getAttribute("href")).toBe("/register");
  });

  it("opens and closes the mobile menu accessibly", () => {
    render(<SiteNav />);

    const toggle = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Open menu" }).getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileLogin = screen.getAllByRole("link", { name: "Test Taker Login" }).at(-1)!;
    expect(mobileLogin.getAttribute("href")).toBe("/login");
    fireEvent.click(mobileLogin);
    expect(screen.getByRole("button", { name: "Open menu" }).getAttribute("aria-expanded")).toBe("false");
  });
});
