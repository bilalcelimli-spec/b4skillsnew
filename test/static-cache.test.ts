import { describe, expect, it } from 'vitest';
import express from 'express';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { staticCacheControl, noStoreMissingAsset } from '../src/lib/security/static-cache';

describe('deployment cache headers', () => {
  it('only fingerprints are immutable', () => {
    expect(staticCacheControl('/dist/assets/index-Abc123.js')).toContain('immutable');
    for (const file of ['index.html', 'service-worker.js', 'sw.js', 'registerSW.js', 'manifest.webmanifest', 'assets/index.js']) {
      expect(staticCacheControl(`/dist/${file}`)).toBe('no-cache, max-age=0, must-revalidate');
    }
  });

  it('serves worker without immutable caching and missing assets without storage (GET/HEAD)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'b4skills-cache-test-'));
    await writeFile(path.join(dir, 'service-worker.js'), '// test');
    const app = express();
    app.use(express.static(dir, { setHeaders: (res, file) => res.setHeader('Cache-Control', staticCacheControl(file)) }));
    app.use(noStoreMissingAsset);
    app.use((_req, res) => res.status(404).end());
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address() as { port: number };
    try {
      const base = `http://127.0.0.1:${address.port}`;
      const worker = await fetch(`${base}/service-worker.js`);
      expect(worker.status).toBe(200);
      expect(worker.headers.get('cache-control')).not.toContain('immutable');
      for (const method of ['GET', 'HEAD']) {
        const missing = await fetch(`${base}/assets/index-deleted.js`, { method });
        expect(missing.status).toBe(404);
        expect(missing.headers.get('cache-control')).toBe('no-store');
      }
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
      await rm(dir, { recursive: true });
    }
  });
});
