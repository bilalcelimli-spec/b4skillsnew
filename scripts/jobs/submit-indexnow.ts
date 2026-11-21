/**
 * Tells IndexNow search engines (Bing, Yandex, Seznam, Naver …) that public
 * pages changed, so they recrawl without waiting for the sitemap.
 *
 *   npm run seo:indexnow                  # pages whose `updated` is within 7 days
 *   npm run seo:indexnow -- --all         # every indexable page
 *   npm run seo:indexnow -- --dry-run     # print the payload only
 *
 * Needs INDEXNOW_KEY (8–128 letters, digits or dashes) and APP_URL, and the
 * deployed server must already serve /<INDEXNOW_KEY>.txt (server.ts does when
 * the variable is set).
 */
import "dotenv/config";
import { SEO_PAGES } from "../../src/lib/site/seo-pages";

const args = new Set(process.argv.slice(2));
const key = process.env.INDEXNOW_KEY?.trim() ?? "";
const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");

if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
  console.error("INDEXNOW_KEY is missing or invalid (8–128 letters, digits or dashes).");
  process.exit(1);
}
if (!/^https:\/\//.test(baseUrl)) {
  console.error("APP_URL must be the public https address, for example https://b4skills.com");
  process.exit(1);
}

const since = Date.now() - 7 * 86_400_000;
const urls = SEO_PAGES
  .filter((page) => page.indexable && (args.has("--all") || Date.parse(page.updated) >= since))
  .map((page) => `${baseUrl}${page.path}`);

if (!urls.length) {
  console.log("No pages changed in the last 7 days. Use --all to submit every page.");
  process.exit(0);
}

const payload = { host: new URL(baseUrl).host, key, keyLocation: `${baseUrl}/${key}.txt`, urlList: urls };

if (args.has("--dry-run")) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(20_000),
});
console.log(`IndexNow answered ${response.status} for ${urls.length} URL(s).`);
if (response.status >= 400) {
  console.error(await response.text());
  process.exit(1);
}
