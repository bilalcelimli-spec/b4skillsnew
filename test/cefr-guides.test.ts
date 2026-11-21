import { describe, expect, it } from "vitest";
import { render } from "../src/entry-server";
import { CEFR_EXAM_COMPARISON_PATH, CEFR_GUIDE_HUB_PATH, CEFR_GUIDE_PATHS, LEVEL_GUIDES, levelGuidePath } from "../src/lib/site/cefr-guides";
import { EXAM_ALIGNMENTS, alignmentFor } from "../src/lib/site/cefr-exam-alignments";
import { seoPageFor } from "../src/lib/site/seo-pages";
import { applySeoToHtml, llmsTxt, sitemapXml } from "../src/lib/site/seo-head";

const BASE = "https://b4skills.com";
const SHELL = `<html lang="en"><head><title>x</title><meta name="description" content="x" /><meta property="og:title" content="x" /><meta property="og:description" content="x" /></head><body lang="en"><div id="root"></div></body></html>`;
const graphOf = (html: string) => JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];

describe("CEFR level guides", () => {
  it("covers A1–C2 in order with complete content", () => {
    expect(LEVEL_GUIDES.map((g) => g.level)).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
    for (const guide of LEVEL_GUIDES) {
      expect(guide.canDo.map((c) => c.skill)).toEqual(["Reading", "Listening", "Speaking", "Writing"]);
      expect(guide.faq.length).toBeGreaterThanOrEqual(2);
      expect(guide.answer.length).toBeGreaterThan(120);
    }
  });

  it("server-renders every guide page with one h1, the answer and the shared header and footer", () => {
    for (const path of CEFR_GUIDE_PATHS) {
      const { html, didSSR } = render(path);
      expect(didSSR, path).toBe(true);
      expect(html.match(/<h1/g)?.length, path).toBe(1);
      expect(html).toContain('aria-label="Main navigation"');
      expect(html).toContain("<footer");
    }
    const b2 = render("/cefr-levels/b2").html;
    expect(b2).toContain("What is B2 level English?");
    expect(b2).toContain('href="/cefr-levels/c1"');
    expect(b2).toContain('href="/cefr-levels/b1"');
  });

  it("registers each guide for search with Article, a three-step breadcrumb and the visible FAQ", () => {
    for (const path of CEFR_GUIDE_PATHS) expect(seoPageFor(path)?.indexable, path).toBe(true);
    const b1 = LEVEL_GUIDES.find((g) => g.level === "B1")!;
    const html = applySeoToHtml(SHELL, seoPageFor(levelGuidePath(b1))!, { baseUrl: BASE });
    const graph = graphOf(html);
    expect(graph.map((n: { "@type": string }) => n["@type"])).toContain("Article");
    const crumbs = graph.find((n: { "@type": string }) => n["@type"] === "BreadcrumbList").itemListElement;
    expect(crumbs.map((c: { name: string }) => c.name)).toEqual(["b4skills", "CEFR Levels Explained", "B1 level English"]);
    const faq = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((ld) => ld["@type"] === "FAQPage");
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(b1.faq.map((f) => f.q));
    expect(sitemapXml(BASE)).toContain(`<loc>${BASE}${CEFR_EXAM_COMPARISON_PATH}</loc>`);
    expect(llmsTxt(BASE)).toContain(`(${BASE}${CEFR_GUIDE_HUB_PATH})`);
  });
});

describe("exam alignments", () => {
  it("names an owner source over https for every exam and a value for every level", () => {
    expect(EXAM_ALIGNMENTS.length).toBeGreaterThanOrEqual(3);
    for (const exam of EXAM_ALIGNMENTS) {
      expect(exam.sourceUrl).toMatch(/^https:\/\//);
      for (const guide of LEVEL_GUIDES) expect(alignmentFor(exam, guide.level)).toBeTruthy();
    }
  });
});
