// @vitest-environment jsdom
/**
 * /research is server-rendered with public item bank facts only. Crawlers
 * must see the item counts and the publication rule, never "Loading…" and
 * never usage figures (sessions, SEM). The browser must hydrate the same
 * markup from the embedded page data.
 */
import React, { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render as renderOnServer } from "../src/entry-server";
import { DomProviders, publicMarketingElement, type PublicPageComponents } from "../src/public-pages";
import { ResearchPage } from "../src/components/ResearchPage";
import { pageDataScript, readPageData, rollUpBankFacts, type PublicBankFacts } from "../src/lib/research/public-bank-facts";

const FACTS: PublicBankFacts = {
  year: 2026,
  totalActive: 3072,
  cefr: { A1: 577, A2: 591, B1: 503, B2: 509, C1: 355, C2: 272, PRE_A1: 265 },
  skills: { GRAMMAR: 914, VOCABULARY: 886, LISTENING: 414, READING: 394, SPEAKING: 237, WRITING: 227 },
};
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("public item bank facts", () => {
  it("roll up counts by CEFR level and skill", () => {
    const facts = rollUpBankFacts([
      { cefrLevel: "B1", skill: "READING", _count: { id: 3 } },
      { cefrLevel: "B1", skill: "GRAMMAR", _count: { id: 2 } },
      { cefrLevel: null, skill: "READING", _count: { id: 1 } },
    ], 2026);
    expect(facts).toEqual({ year: 2026, totalActive: 6, cefr: { B1: 5, Unknown: 1 }, skills: { READING: 4, GRAMMAR: 2 } });
  });

  it("travel from server to browser through an inline script that cannot break out of the tag", () => {
    const script = pageDataScript({ researchBank: { ...FACTS, skills: { "</script><b>": 1 } } });
    expect(script).not.toMatch(/<\/script><b>/);
    const holder = document.createElement("div");
    holder.innerHTML = script;
    // eslint-disable-next-line no-new-func
    new Function(holder.querySelector("script")!.textContent!)();
    expect(readPageData().researchBank?.skills).toEqual({ "</script><b>": 1 });
    delete (window as unknown as Record<string, unknown>).__B4_PAGE_DATA__;
    expect(readPageData()).toEqual({});
  });
});

describe("/research server render", () => {
  it("shows item counts and the publication rule, without loading text or usage figures", () => {
    const { html, didSSR } = renderOnServer("/research", { researchBank: FACTS });
    expect(didSSR).toBe(true);
    const visible = text(html);
    expect(visible).toContain("3,072");
    expect(visible).toContain("Active Items");
    expect(visible).toMatch(/B2 .*509/);
    expect(visible).toContain("at least 30 concurrent validity pairs per external test");
    expect(visible).not.toMatch(/Loading/);
    expect(visible).not.toMatch(/Sessions \(12 m\)|Mean SEM \d/);
  });

  it("without facts (database unavailable) still shows the publication rule instead of validity loading text", () => {
    const visible = text(renderOnServer("/research").html);
    expect(visible).toContain("Data collection in progress");
    expect(visible).not.toContain("Loading validity data");
  });
});

describe("/research hydration with page data", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
  });
  afterEach(() => { vi.unstubAllGlobals(); consoleError.mockRestore(); });

  it("keeps the server markup", async () => {
    const pageData = { researchBank: FACTS };
    const container = document.createElement("div");
    container.innerHTML = renderOnServer("/research", pageData).html;
    document.body.appendChild(container);
    const serverH1 = container.querySelector("h1");

    const pages = { ResearchPage } as unknown as PublicPageComponents;
    const noop = () => {};
    const tree = publicMarketingElement("/research", pages, {
      signedIn: false, showLanding: true, measurementEnabled: false,
      onHome: noop, onStart: noop, onPricing: noop, onLandingStart: noop, onCodeEntry: noop, pageData,
    })!;
    const recoverable: unknown[] = [];
    let root: Root | undefined;
    await act(async () => { root = hydrateRoot(container, <DomProviders>{tree}</DomProviders>, { onRecoverableError: (e) => recoverable.push(e) }); });

    expect(recoverable).toEqual([]);
    expect(consoleError.mock.calls.map((a) => String(a[0])).filter((m) => /hydrat|did not match/i.test(m))).toEqual([]);
    expect(container.querySelector("h1")).toBe(serverH1);
    expect(container.textContent).toContain("3,072");
    act(() => root!.unmount());
    container.remove();
  });
});
