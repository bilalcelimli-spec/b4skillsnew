import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEO_PAGES, isPrivatePublicPath, seoPageFor } from "../src/lib/site/seo-pages";
import { NAMED_CRAWLERS, applyNoindexToHtml, applySeoToHtml, atomFeed, headTags, llmsTxt, robotsTxt, sitemapXml } from "../src/lib/site/seo-head";

const BASE = "https://b4skills.com";
const SHELL = `<!doctype html>\n<html lang="en">\n<head><title>x</title><meta name="description" content="x" /><meta property="og:title" content="x" /><meta property="og:description" content="x" /></head>\n<body lang="en"><div id="root"></div></body></html>`;
const jsonLdBlocks = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

describe("SEO page list", () => {
  it("has unique paths, ISO dates and a share image file for every page that names one", () => {
    expect(new Set(SEO_PAGES.map((p) => p.path)).size).toBe(SEO_PAGES.length);
    for (const page of SEO_PAGES) {
      expect(page.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (page.ogImage) expect(fs.existsSync(path.join("public/og", page.ogImage)), page.ogImage).toBe(true);
    }
    expect(fs.existsSync("public/og/default.png")).toBe(true);
  });

  it("pairs language alternates both ways", () => {
    for (const page of SEO_PAGES.filter((p) => p.alternates)) {
      for (const target of Object.values(page.alternates!)) {
        expect(seoPageFor(target!)?.alternates).toEqual(page.alternates);
      }
    }
  });

  it("covers every server-rendered marketing route", () => {
    const entry = fs.readFileSync("src/entry-server.tsx", "utf8");
    const ssrPaths = [...entry.matchAll(/^\s+"(\/[^"]*)": \(\) =>/gm)].map((m) => m[1]);
    expect(ssrPaths.length).toBeGreaterThan(10);
    for (const ssrPath of ssrPaths) expect(seoPageFor(ssrPath), ssrPath).toBeDefined();
  });

  it("keeps personal and sign-in pages out of search", () => {
    for (const p of ["/verify/ABC123", "/share/0123456789abcdef0123456789abcdef", "/login", "/register", "/exam-code"]) {
      expect(isPrivatePublicPath(p), p).toBe(true);
    }
    expect(isPrivatePublicPath("/verify")).toBe(false);
    expect(applyNoindexToHtml(SHELL)).toContain('<meta name="robots" content="noindex, nofollow" />');
  });
});

describe("page head", () => {
  it("serves the Turkish test page as Turkish with hreflang back to English", () => {
    const html = applySeoToHtml(SHELL, seoPageFor("/ingilizce-seviye-testi")!, { baseUrl: BASE });
    expect(html).toContain('<html lang="tr"');
    expect(html).toContain('<body lang="tr"');
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://b4skills.com/english-level-test" />');
    expect(html).toContain('<link rel="alternate" hreflang="tr" href="https://b4skills.com/ingilizce-seviye-testi" />');
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://b4skills.com/english-level-test" />');
    expect(html).toContain('<meta property="og:locale" content="tr_TR" />');
    expect(html).toContain("https://b4skills.com/og/ingilizce-seviye-testi.png");
  });

  it("emits valid JSON-LD with the organization, breadcrumb and service, and no site search", () => {
    const html = applySeoToHtml(SHELL, seoPageFor("/schools")!, { baseUrl: BASE });
    const graph = jsonLdBlocks(html)[0]["@graph"];
    const types = graph.map((node: { "@type": string }) => node["@type"]);
    expect(types).toEqual(["Organization", "WebPage", "BreadcrumbList", "Service"]);
    expect(graph[0].logo.url).toBe("https://b4skills.com/b4skillslogo.png");
    expect(html).not.toContain("SearchAction");
    expect(html).not.toContain('name="keywords"');
  });

  it("marks draft legal pages noindex and adds verification tokens only on the home page when set", () => {
    expect(headTags(seoPageFor("/privacy")!, { baseUrl: BASE })).toContain('content="noindex, follow"');
    const env = { baseUrl: BASE, googleVerification: "g-token", bingVerification: "b-token" };
    const home = headTags(seoPageFor("/")!, env);
    expect(home).toContain('<meta name="google-site-verification" content="g-token" />');
    expect(home).toContain('<meta name="msvalidate.01" content="b-token" />');
    expect(home).not.toContain("yandex-verification");
    expect(headTags(seoPageFor("/pricing")!, env)).not.toContain("google-site-verification");
  });
});

describe("crawler files", () => {
  it("lists only indexable pages in the sitemap with their real content dates", () => {
    const xml = sitemapXml(BASE);
    expect(xml).toContain("<loc>https://b4skills.com/ingilizce-seviye-testi</loc>");
    expect(xml).not.toContain("/privacy<");
    expect(xml).not.toContain("/checkout<");
    const today = new Date().toISOString().slice(0, 10);
    const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(dates.length).toBe(SEO_PAGES.filter((p) => p.indexable).length);
    for (const date of dates) expect(date <= today).toBe(true);
    expect(sitemapXml(BASE)).toBe(xml);
  });

  it("gives every named crawler the same rules as everyone else", () => {
    const txt = robotsTxt(BASE);
    for (const bot of NAMED_CRAWLERS) expect(txt).toContain(`User-agent: ${bot}\nAllow: /\nDisallow: /api/`);
    expect(txt).toContain("User-agent: *\nAllow: /");
    expect(txt).toContain("Disallow: /share/");
    expect(txt).toContain("Disallow: /verify/");
    expect(txt).toContain("Sitemap: https://b4skills.com/sitemap.xml");
    expect(txt).not.toMatch(/Disallow: \/\n/);
  });

  it("describes the product and links indexable pages in llms.txt", () => {
    const txt = llmsTxt(BASE);
    expect(txt.startsWith("# b4skills\n\n> ")).toBe(true);
    expect(txt).toContain("(https://b4skills.com/english-level-test)");
    expect(txt).toContain("not an official qualification");
    expect(txt).not.toContain("/privacy)");
  });

  it("dates feed entries by content change, not by request time", () => {
    const feed = atomFeed(BASE);
    const newest = SEO_PAGES.filter((p) => p.indexable && p.summary && p.kind !== "legal").map((p) => p.updated).sort().at(-1);
    expect(feed).toContain(`<updated>${newest}T00:00:00Z</updated>`);
    expect(atomFeed(BASE)).toBe(feed);
  });
});
