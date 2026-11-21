/**
 * Pure builders for everything crawlers read: per-page <head> tags and
 * JSON-LD, sitemap.xml, the Atom feed, robots.txt and llms.txt.
 * All of them read SEO_PAGES so the files can never disagree.
 */
import { COMPANY } from "./company";
import { SEO_PAGES, type SeoPage } from "./seo-pages";
import { serializeJsonLd } from "./seo-serialization";

export interface SeoEnv {
  baseUrl: string;
  googleVerification?: string;
  bingVerification?: string;
  yandexVerification?: string;
}

/** Brand profiles elsewhere on the web (schema.org sameAs). Add each one once it exists. */
export const BRAND_PROFILES: readonly string[] = [];

const LOCALE: Record<SeoPage["lang"], string> = { en: "en_US", tr: "tr_TR" };
const SOLUTION_AUDIENCE: Record<string, string> = {
  "/schools": "Primary and secondary schools",
  "/academia": "Universities and research institutions",
  "/english-assessment-for-universities": "Universities and language centres",
  "/corporate": "HR and L&D teams",
  "/english-assessment-for-companies": "HR and L&D teams",
  "/language-schools": "Language schools",
};

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const jsonLdScript = (value: unknown) => `<script type="application/ld+json">${serializeJsonLd(value)}</script>`;

export function organizationLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: COMPANY.brand,
    legalName: COMPANY.legalName,
    url: `${baseUrl}/`,
    logo: { "@type": "ImageObject", url: `${baseUrl}/b4skillslogo.png`, width: 1774, height: 887 },
    email: COMPANY.contactEmail,
    telephone: COMPANY.phone,
    address: { "@type": "PostalAddress", streetAddress: "Esentepe Mah. Tuna Cad. Güral İş Merkezi No: 110-112 İç Kapı No: 11", addressLocality: "Nilüfer", addressRegion: "Bursa", addressCountry: "TR" },
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: COMPANY.contactEmail, availableLanguage: ["en", "tr"] },
    ...(BRAND_PROFILES.length ? { sameAs: BRAND_PROFILES } : {}),
  };
}

export function pageJsonLd(page: SeoPage, baseUrl: string): object[] {
  const url = `${baseUrl}${page.path}`;
  const org = { "@id": `${baseUrl}/#organization` };
  const graph: object[] = [];
  if (page.kind === "home") {
    graph.push({ "@type": "WebSite", "@id": `${baseUrl}/#website`, name: COMPANY.brand, url: `${baseUrl}/`, inLanguage: ["en", "tr"], publisher: org });
  }
  graph.push({
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    inLanguage: page.lang,
    dateModified: page.updated,
    isPartOf: { "@id": `${baseUrl}/#website` },
    publisher: org,
    ...(page.kind !== "home" ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
  });
  if (page.kind !== "home") {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "b4skills", item: `${baseUrl}/` },
        { "@type": "ListItem", position: 2, name: page.name, item: url },
      ],
    });
  }
  if (page.kind === "solution" || page.kind === "test") {
    graph.push({
      "@type": "Service",
      "@id": `${url}#service`,
      name: page.name,
      serviceType: "English language proficiency assessment",
      description: page.description,
      provider: org,
      url,
      areaServed: "Worldwide",
      availableLanguage: page.lang,
      ...(SOLUTION_AUDIENCE[page.path] ? { audience: { "@type": "Audience", audienceType: SOLUTION_AUDIENCE[page.path] } } : {}),
    });
  }
  return [{ "@context": "https://schema.org", "@graph": [organizationLd(baseUrl), ...graph] }, ...(page.jsonLd ?? [])];
}

/** Tags appended to <head> for a known page. */
export function headTags(page: SeoPage, env: SeoEnv): string {
  const { baseUrl } = env;
  const url = `${baseUrl}${page.path}`;
  const image = `${baseUrl}/og/${page.ogImage ?? "default.png"}`;
  const tags: string[] = [
    page.indexable ? "" : `<meta name="robots" content="noindex, follow" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
  ];
  if (page.alternates) {
    for (const [lang, path] of Object.entries(page.alternates)) {
      tags.push(`<link rel="alternate" hreflang="${lang}" href="${esc(baseUrl + path)}" />`);
    }
    tags.push(`<link rel="alternate" hreflang="x-default" href="${esc(baseUrl + (page.alternates.en ?? page.path))}" />`);
  }
  tags.push(
    `<meta property="og:site_name" content="b4skills" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="${LOCALE[page.lang]}" />`,
    ...(page.alternates ? Object.keys(page.alternates).filter(l => l !== page.lang).map(l => `<meta property="og:locale:alternate" content="${LOCALE[l as SeoPage["lang"]]}" />`) : []),
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(page.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  );
  if (page.kind === "home") tags.push(...verificationTags(env));
  tags.push(...pageJsonLd(page, baseUrl).map(jsonLdScript));
  return tags.filter(Boolean).join("\n    ");
}

/** Search console ownership tokens, only rendered when configured. */
export function verificationTags(env: SeoEnv): string[] {
  return [
    env.googleVerification ? `<meta name="google-site-verification" content="${esc(env.googleVerification)}" />` : "",
    env.bingVerification ? `<meta name="msvalidate.01" content="${esc(env.bingVerification)}" />` : "",
    env.yandexVerification ? `<meta name="yandex-verification" content="${esc(env.yandexVerification)}" />` : "",
  ].filter(Boolean);
}

/** Applies a page's title, description, language and head tags to the HTML shell. */
export function applySeoToHtml(html: string, page: SeoPage, env: SeoEnv): string {
  return html
    .replace(/<html lang="[^"]*"/, `<html lang="${page.lang}"`)
    .replace(/<body lang="[^"]*"/, `<body lang="${page.lang}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(page.description)}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(page.title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(page.description)}" />`)
    .replace("</head>", `  ${headTags(page, env)}\n  </head>`);
}

/** Marks a non-indexable public page (personal certificates, shared reports, sign-in). */
export function applyNoindexToHtml(html: string): string {
  return html.replace("</head>", `  <meta name="robots" content="noindex, nofollow" />\n  </head>`);
}

const indexable = () => SEO_PAGES.filter((page) => page.indexable);

export function sitemapXml(baseUrl: string): string {
  const urls = indexable().map((page) => {
    const alternates = page.alternates
      ? Object.entries(page.alternates).map(([lang, path]) => `\n    <xhtml:link rel="alternate" hreflang="${lang}" href="${esc(baseUrl + path)}" />`).join("")
        + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(baseUrl + (page.alternates.en ?? page.path))}" />`
      : "";
    return `  <url>\n    <loc>${esc(baseUrl + page.path)}</loc>\n    <lastmod>${page.updated}</lastmod>${page.changefreq ? `\n    <changefreq>${page.changefreq}</changefreq>` : ""}${page.priority !== undefined ? `\n    <priority>${page.priority.toFixed(1)}</priority>` : ""}${alternates}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>`;
}

export function atomFeed(baseUrl: string): string {
  const pages = indexable().filter((page) => page.summary && page.kind !== "legal");
  const newest = pages.map((page) => page.updated).sort().at(-1) ?? "2026-01-01";
  const entries = pages.map((page) => `  <entry>
    <title>${esc(page.title)}</title>
    <link href="${esc(baseUrl + page.path)}" />
    <id>${esc(baseUrl + page.path)}</id>
    <updated>${page.updated}T00:00:00Z</updated>
    <summary>${esc(page.summary!)}</summary>
  </entry>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>b4skills — Adaptive CEFR English Assessment</title>
  <link href="${esc(baseUrl)}/atom.xml" rel="self" />
  <link href="${esc(baseUrl)}/" />
  <id>${esc(baseUrl)}/</id>
  <updated>${newest}T00:00:00Z</updated>
  <author><name>b4skills</name></author>
${entries}
</feed>`;
}

/** Paths no crawler should fetch: the app, the API and personal pages. */
const DISALLOWED = ["/api/", "/admin", "/assessment", "/dashboard", "/exam", "/report", "/results", "/print", "/share/", "/verify/", "/verify-email", "/reset-password", "/login", "/register", "/exam-code"];

/**
 * Search and AI crawlers that are named explicitly so the policy is visible
 * to them. A named group replaces "*" for that bot, so each repeats the rules.
 * Google-Extended (use of content for Gemini training) is not named and
 * follows "*", which allows it; add a "Disallow: /" group for it to opt out.
 */
export const NAMED_CRAWLERS = [
  "Googlebot", "Bingbot",
  "OAI-SearchBot", "ChatGPT-User", "GPTBot",
  "Claude-SearchBot", "Claude-User", "ClaudeBot",
  "PerplexityBot", "Perplexity-User",
  "Applebot",
] as const;

export function robotsTxt(baseUrl: string): string {
  const rules = ["Allow: /", ...DISALLOWED.map((path) => `Disallow: ${path}`)];
  const groups = [...NAMED_CRAWLERS, "*"].map((agent) => [`User-agent: ${agent}`, ...rules].join("\n"));
  return [...groups, "", `Sitemap: ${baseUrl}/sitemap.xml`, ""].join("\n\n").replace(/\n{3,}/g, "\n\n");
}

/** llms.txt (https://llmstxt.org): a plain overview for AI assistants. */
export function llmsTxt(baseUrl: string): string {
  const link = (page: SeoPage) => `- [${page.name}](${baseUrl}${page.path}): ${page.summary ?? page.description}`;
  const section = (title: string, kinds: SeoPage["kind"][]) => {
    const pages = indexable().filter((page) => kinds.includes(page.kind));
    return pages.length ? `## ${title}\n\n${pages.map(link).join("\n")}\n` : "";
  };
  return `# b4skills

> b4skills is an adaptive English language assessment platform aligned to the Common European Framework of Reference (CEFR, levels A1–C2). It is used by individuals, schools, universities, language schools and companies.

Key facts:

- Assessment type: computer-adaptive test. Question difficulty adjusts to each answer; ability is estimated with item response theory (IRT).
- Skills: grammar, vocabulary, reading and listening are scored automatically; writing and speaking use AI-assisted scoring against CEFR-based rubrics, with human review when scoring confidence is low.
- Free Quick Check: about 20–30 minutes, gives a provisional CEFR estimate, no account required. It does not score open writing or speaking.
- Full Assessment: reading, listening, writing and speaking, about 45–60 minutes, with a skill report and a QR-verifiable b4skills certificate.
- Status of results: the CEFR level is a standardised estimate, not an official qualification such as IELTS or Cambridge. Each receiving institution decides whether to accept it.
- Institutions: teacher and institutional dashboards, bulk candidate import, LMS integration (LTI 1.3), single sign-on and cohort analytics. Institutional terms are agreed per contract; individual paid checkout is not offered on the website.
- Languages: English interface; Turkish pages for Turkish-speaking candidates.
- Operator: ${COMPANY.brand} (${COMPANY.legalName}), Bursa, Türkiye. Contact: ${COMPANY.contactEmail}.

${section("Take a test", ["test"])}
${section("For institutions", ["solution"])}
${section("How it works", ["info", "home"])}
${section("Certificates and support", ["utility", "legal"])}`.replace(/\n{3,}/g, "\n\n");
}
