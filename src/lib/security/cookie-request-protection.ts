import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/** Browser Origin validation plus session-bound signed double-submit for originless clients. */
export function cookieRequestProtection(secret: string, appUrl: string, secure: boolean) {
  const origin = new URL(appUrl).origin;
  const cookieName = secure ? '__Host-b4csrf' : 'b4csrf';
  const sign = (req: Request, nonce: string) => createHmac('sha256', secret)
    .update(JSON.stringify([nonce, req.cookies?.accessToken ?? '', req.cookies?.refreshToken ?? ''])).digest('hex');
  const issue = (req: Request, res: Response) => {
    const nonce = randomBytes(32).toString('hex');
    const token = `${nonce}.${sign(req, nonce)}`;
    res.cookie(cookieName, token, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 900_000 });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ csrfToken: token });
  };
  const protect = (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const suppliedOrigin = req.get('Origin');
    if (suppliedOrigin) {
      // Exact origin, including scheme and port; sibling subdomains are not trusted.
      if (suppliedOrigin !== origin) return res.status(403).json({ error: 'CSRF origin rejected' });
      return next();
    }
    if (!req.cookies?.accessToken && !req.cookies?.refreshToken) return next();
    const csrfToken = req.get('X-CSRF-Token');
    const csrfCookie = secure ? req.cookies?.['__Host-b4csrf'] : req.cookies?.b4csrf;
    if (typeof csrfToken !== 'string' || typeof csrfCookie !== 'string' || csrfToken.length !== 129 || csrfToken !== csrfCookie) {
      return res.status(403).json({ error: 'CSRF token required' });
    }
    const [nonce, signature] = csrfToken.split('.');
    if (!/^[a-f0-9]{64}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)
        || !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(req, nonce), 'hex'))) {
      return res.status(403).json({ error: 'CSRF token rejected' });
    }
    return next();
  };
  return { protect, issue };
}
