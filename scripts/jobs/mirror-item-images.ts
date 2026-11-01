#!/usr/bin/env tsx

/**
 * Copies externally hotlinked item images (Unsplash, picsum, …) into our own
 * public Supabase bucket and points content.imageUrl at the copy. Five live
 * images had already vanished from their host (bank review 2026-11-01);
 * every remaining hotlink can break the same way, and each one also makes the
 * candidate's browser call a third-party host during the exam.
 *
 *   npx tsx scripts/jobs/mirror-item-images.ts            # plan: what would be copied (downloads, writes nothing)
 *   npx tsx scripts/jobs/mirror-item-images.ts --apply    # create bucket if missing, upload, switch URLs
 *
 * Scope: ACTIVE and PRETEST items whose imageUrl is http(s) on a host other
 * than our Supabase project. The bytes are fetched from the current URL, so the
 * candidate sees exactly the same picture. Object keys are content-addressed
 * (items/<itemId>/<sha256>.<ext>) and uploads never overwrite. The previous
 * URL and the source licence note are kept in metadata.mediaMirror. Running
 * --apply twice changes nothing the second time.
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";
import { supabaseStorageClient } from "../../src/lib/storage/private-storage.js";

const APPLY = process.argv.includes("--apply");
const ACTOR = "claude-code:mirror-item-images";
const BUCKET = "question-images";
const OWN_HOST = /(^|\.)supabase\.co$/i;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };
/**
 * Not copied: the picture contradicts or misleads the task (checked by eye,
 * 2026-11-01). They are handled by quarantine-bank-review-2026-11.ts --set images-2.
 */
const SKIP_CODES = new Set(["VOC-PA1-0007", "GRM-B1-0002", "primary-vocabulary-prea1-colors-001", "SPE-A2-0059-MVX1NDCI", "SPE-B1-0070"]);

const LICENCE: Record<string, string> = {
  "images.unsplash.com": "Unsplash License (free to copy and host; no permission needed)",
  "picsum.photos": "Lorem Picsum — images from Unsplash, Unsplash License",
  "fastly.picsum.photos": "Lorem Picsum — images from Unsplash, Unsplash License",
};

async function main() {
  const rows = await prisma.item.findMany({
    where: { status: { in: ["ACTIVE", "PRETEST"] } },
    select: { id: true, itemCode: true, skill: true, status: true, content: true, metadata: true },
  });
  const targets = rows.filter((r) => {
    const url = String((r.content as any)?.imageUrl ?? "");
    if (!/^https?:\/\//i.test(url) || SKIP_CODES.has(r.itemCode ?? "")) return false;
    try { return !OWN_HOST.test(new URL(url).host); } catch { return false; }
  });
  const hosts: Record<string, number> = {};
  for (const t of targets) { const h = new URL(String((t.content as any).imageUrl)).host; hosts[h] = (hosts[h] ?? 0) + 1; }
  console.log(`${targets.length} live items hotlink an external image ${JSON.stringify(hosts)}${APPLY ? "" : " (dry run)"}`);

  const storage = supabaseStorageClient();
  if (APPLY) {
    const { data: bucket } = await storage.storage.getBucket(BUCKET);
    if (!bucket) {
      const { error } = await storage.storage.createBucket(BUCKET, { public: true, allowedMimeTypes: Object.keys(EXT), fileSizeLimit: 5 * 1024 * 1024 });
      if (error) throw new Error(`could not create bucket ${BUCKET}: ${error.message}`);
      console.log(`created public bucket ${BUCKET}`);
    }
  }

  const report: unknown[] = [];
  let switched = 0, failed = 0;
  for (const item of targets) {
    const content = item.content as Record<string, any>;
    const from = String(content.imageUrl);
    const host = new URL(from).host;
    try {
      const res = await fetch(from, { signal: AbortSignal.timeout(30_000) });
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!res.ok || !EXT[type]) throw new Error(`HTTP ${res.status} ${type || "no content-type"}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      const sha = createHash("sha256").update(bytes).digest("hex");
      const key = `items/${item.id}/${sha.slice(0, 16)}.${EXT[type]}`;
      const line = `${(item.itemCode ?? item.id).padEnd(30)} ${item.skill.padEnd(10)} ${(bytes.length / 1024).toFixed(0).padStart(4)} KB ${host}`;
      if (!APPLY) { console.log(`  ${line}`); report.push({ code: item.itemCode, from, key, bytes: bytes.length, sha }); continue; }

      const up = await storage.storage.from(BUCKET).upload(key, bytes, { contentType: type, upsert: false, cacheControl: "31536000" });
      if (up.error && !/exists/i.test(up.error.message)) throw new Error(`upload: ${up.error.message}`);
      const to = storage.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
      const check = await fetch(to, { headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(15_000) });
      if (!check.ok) throw new Error(`copy not readable: HTTP ${check.status}`);

      await prisma.item.update({ where: { id: item.id }, data: {
        content: { ...content, imageUrl: to },
        metadata: { ...((item.metadata as object) ?? {}), mediaMirror: { at: new Date().toISOString(), by: ACTOR, from, sha256: sha, bytes: bytes.length, licence: LICENCE[host] ?? `unknown — check before reuse (${host})` } },
      } });
      switched++;
      console.log(`  ✓ ${line}`);
      report.push({ code: item.itemCode, from, to, sha });
    } catch (e) {
      failed++;
      console.log(`  ✗ ${(item.itemCode ?? item.id).padEnd(30)} ${(e as Error).message}`);
      report.push({ code: item.itemCode, from, error: (e as Error).message });
    }
  }

  // Keep the last real run's report: an idle re-run must not overwrite it with an empty list.
  if (report.length) {
    mkdirSync("scripts/jobs/.out", { recursive: true });
    writeFileSync(`scripts/jobs/.out/mirror-item-images${APPLY ? "" : "-plan"}.json`, JSON.stringify(report, null, 1));
  }
  console.log(APPLY ? `switched ${switched}, failed ${failed}` : `would copy ${targets.length - failed}, unreachable ${failed} — nothing written`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
