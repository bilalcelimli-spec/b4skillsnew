/**
 * Renders the 1200×630 share images (Open Graph / Twitter) for every page in
 * SEO_PAGES that names an `ogImage`, plus public/og/default.png.
 *
 *   npm run seo:og-images
 *
 * Re-run after changing a page title or summary, and commit the PNGs.
 * Uses Playwright's Chromium, or the installed Google Chrome when Playwright's
 * browser is not downloaded.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { SEO_PAGES } from "../src/lib/site/seo-pages";

const OUT_DIR = path.join(process.cwd(), "public", "og");
const FONT_DIR = path.join(process.cwd(), "public", "fonts");

const KICKER: Record<string, string> = {
  home: "Adaptive English Assessment",
  test: "CEFR A1–C2 · Adaptive",
  solution: "b4skills for institutions",
  info: "How b4skills works",
  utility: "b4skills",
  legal: "b4skills",
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function template(heading: string, summary: string, kicker: string, lang: string): string {
  const font = (file: string) => `url(data:font/ttf;base64,${fs.readFileSync(path.join(FONT_DIR, file)).toString("base64")})`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
    @font-face { font-family: Noto; font-weight: 400; src: ${font("NotoSans-Regular.ttf")}; }
    @font-face { font-family: Noto; font-weight: 700; src: ${font("NotoSans-Bold.ttf")}; }
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; font-family: Noto, sans-serif; color: #fff;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #9b276c 100%);
      padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
    .logo { display: inline-block; background: #9b276c; padding: 6px 18px; transform: skewX(-6deg); border-radius: 4px;
      font-weight: 700; font-size: 40px; letter-spacing: -0.5px; text-shadow: 0 0 10px rgba(253,224,71,.8); }
    .kicker { font-size: 24px; letter-spacing: 4px; text-transform: uppercase; color: #c7d2fe; font-weight: 700; margin-bottom: 20px; }
    h1 { font-size: 68px; line-height: 1.08; font-weight: 700; max-width: 1000px; }
    p { font-size: 28px; line-height: 1.4; color: rgba(255,255,255,.78); max-width: 980px; margin-top: 22px; }
    .foot { font-size: 24px; color: rgba(255,255,255,.7); }
  </style></head><body>
    <div><span class="logo">b4skills</span></div>
    <div><div class="kicker">${escapeHtml(kicker)}</div><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(summary)}</p></div>
    <div class="foot">b4skills.com</div>
  </body></html>`;
}

async function launch(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch {
    return chromium.launch({ channel: "chrome" });
  }
}

/** Keeps the share card readable: the first sentence, at most ~150 characters. */
function shortSummary(text: string): string {
  const first = text.split(/(?<=\.)\s/)[0];
  return first.length <= 150 ? first : `${first.slice(0, 147).replace(/\s+\S*$/, "")}…`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const jobs = [
    { file: "default.png", heading: "Adaptive English Assessment", summary: "CEFR-aligned testing for individuals, schools, universities and companies.", kicker: "b4skills", lang: "en" },
    ...SEO_PAGES.filter((p) => p.ogImage).map((p) => ({
      file: p.ogImage!,
      heading: p.name === "Home" ? "Adaptive English Assessment Platform" : p.name,
      summary: shortSummary(p.summary ?? p.description),
      kicker: p.lang === "tr" ? "CEFR A1–C2 · Adaptif" : KICKER[p.kind],
      lang: p.lang,
    })),
  ];
  for (const job of jobs) {
    await page.setContent(template(job.heading, job.summary, job.kicker, job.lang));
    await page.screenshot({ path: path.join(OUT_DIR, job.file), type: "png" });
    console.log(`og/${job.file}`);
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
