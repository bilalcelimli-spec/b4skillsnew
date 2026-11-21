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

describe("SEO landing page depth", () => {
  it("server-renders each landing page with long-form content, level links and its FAQ as structured data", async () => {
    const { LANDING_CONTENT } = await import("../src/lib/site/seo-landing-content");
    for (const [variant, content] of Object.entries(LANDING_CONTENT)) {
      const path = `/${variant}`;
      const { html } = render(path);
      const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      expect(words, path).toBeGreaterThan(700);
      expect(html).toContain(content.lang === "tr" ? 'href="/cefr-seviyeleri/b2"' : 'href="/cefr-levels/b2"');
      for (const item of content.faq) expect(html).toContain(item.q.replace(/'/g, "&#x27;"));
      const head = applySeoToHtml(SHELL, seoPageFor(path)!, { baseUrl: BASE });
      const faq = [...head.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((ld) => ld["@type"] === "FAQPage");
      expect(faq.mainEntity.map((q: { name: string }) => q.name), path).toEqual(content.faq.map((f) => f.q));
    }
  });
});

describe("Turkish CEFR guides", () => {
  it("mirror the English guides level by level with complete Turkish content", async () => {
    const { LEVEL_GUIDES_TR } = await import("../src/lib/site/cefr-guides");
    expect(LEVEL_GUIDES_TR.map((g) => [g.level, g.slug, g.lang])).toEqual(LEVEL_GUIDES.map((g) => [g.level, g.slug, "tr"]));
    for (const [i, guide] of LEVEL_GUIDES_TR.entries()) {
      expect(guide.canDo.map((c) => c.skill)).toEqual(LEVEL_GUIDES[i].canDo.map((c) => c.skill));
      expect(guide.faq.length).toBeGreaterThanOrEqual(2);
      expect(guide.answer).toMatch(/[ığüşöçİ]/);
    }
  });

  it("server-renders Turkish pages in Turkish, linking Turkish neighbours, the Turkish test and the Turkish comparison", () => {
    const html = render("/cefr-seviyeleri/b2").html;
    expect(html).toContain('lang="tr"');
    expect(html).toContain("B2 seviyesi nedir?");
    expect(html).toContain('href="/cefr-seviyeleri/c1"');
    expect(html).toContain('href="/cefr-seviyeleri/sinav-karsilastirma"');
    expect(html).toContain('href="/ingilizce-seviye-testi"');
    expect(render("/cefr-seviyeleri/sinav-karsilastirma").html).toContain("TOEFL iBT (Ocak 2026&#x27;dan itibaren)");
    expect(render("/cefr-seviyeleri").html).toContain("CEFR seviyeleri: A1&#x27;den C2&#x27;ye");
  });

  it("pairs every English and Turkish guide page with hreflang and serves Turkish pages as lang=tr", () => {
    const pairs: [string, string][] = [
      ["/cefr-levels", "/cefr-seviyeleri"],
      ["/cefr-levels/a1", "/cefr-seviyeleri/a1"],
      ["/cefr-levels/c2", "/cefr-seviyeleri/c2"],
      ["/cefr-levels/exam-comparison", "/cefr-seviyeleri/sinav-karsilastirma"],
    ];
    for (const [en, tr] of pairs) {
      expect(seoPageFor(en)?.alternates).toEqual({ en, tr });
      expect(seoPageFor(tr)?.alternates).toEqual({ en, tr });
    }
    const head = applySeoToHtml(SHELL, seoPageFor("/cefr-seviyeleri/b1")!, { baseUrl: BASE });
    expect(head).toContain('<html lang="tr"');
    expect(head).toContain('hreflang="en" href="https://b4skills.com/cefr-levels/b1"');
    const crumbs = graphOf(head).find((n: { "@type": string }) => n["@type"] === "BreadcrumbList").itemListElement;
    expect(crumbs.map((c: { name: string }) => c.name)).toEqual(["b4skills", "CEFR Seviyeleri", "B1 seviyesi"]);
  });

  it("links the Turkish landing page to the Turkish guides", () => {
    const html = render("/ingilizce-seviye-testi").html;
    expect(html).toContain('href="/cefr-seviyeleri/b2"');
    expect(html).not.toContain('href="/cefr-levels/b2"');
  });
});

describe("content-free guide paths", () => {
  it("list exactly the guide pages and agree with the SEO list on page language", async () => {
    const paths = await import("../src/lib/site/cefr-guide-paths");
    const guides = await import("../src/lib/site/cefr-guides");
    expect(paths.LEVEL_SLUGS).toEqual(LEVEL_GUIDES.map((g) => g.slug));
    expect(paths.LEVEL_SLUGS).toEqual(guides.LEVEL_GUIDES_TR.map((g) => g.slug));
    for (const path of paths.CEFR_GUIDE_PATHS) expect(seoPageFor(path), path).toBeDefined();
    const { SEO_PAGES } = await import("../src/lib/site/seo-pages");
    for (const page of SEO_PAGES.filter((p) => p.kind !== "legal" && p.kind !== "utility")) {
      expect(paths.isTurkishMarketingPath(page.path), page.path).toBe(page.lang === "tr");
    }
  });
});
