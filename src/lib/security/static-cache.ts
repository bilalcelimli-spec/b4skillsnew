import type { RequestHandler } from 'express';

// Only successfully served, fingerprinted build files can be immutable.
export function staticCacheControl(filePath: string): string {
  return /[/\\]assets[/\\][^/\\]+-[\w-]+\.(js|css|woff2?|ttf|png|svg|webp)$/.test(filePath)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache, max-age=0, must-revalidate';
}

export const noStoreMissingAsset: RequestHandler = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
};
