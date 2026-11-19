/**
 * Rate-limit keys and shared stores.
 *
 * Schools and companies put a whole class behind one NAT address, so a limit
 * keyed by IP alone locks out the sixth student who signs in. Credential
 * endpoints are therefore keyed by IP + account (email), with a much looser
 * per-IP ceiling against spraying; the general API limit is keyed by the
 * signed-in user when a valid access token is present.
 *
 * With Redis every limiter gets its own RedisStore (express-rate-limit refuses
 * a store shared between limiters), so counts hold across instances. A Redis
 * error lets the request through (`passOnStoreError`) instead of failing the
 * whole API.
 */
import type { Request } from "express";
import jwt from "jsonwebtoken";
import { ipKeyGenerator, type Options, type Store } from "express-rate-limit";
import type { Redis as RedisClient } from "ioredis";

/** IPv6 addresses are grouped by /56 so one host cannot rotate through its range. */
export function clientIpKey(req: Request): string {
  return ipKeyGenerator(req.ip ?? "unknown");
}

function normalizedEmail(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase().slice(0, 254) : "-";
}

/** `<ip>:<email>` — one account's attempts from one network. */
export function ipAndEmailKey(req: Request): string {
  return `${clientIpKey(req)}:${normalizedEmail(req.body?.email)}`;
}

/** User id from a valid access token (cookie or bearer), or null. Signature-checked, no DB call. */
export function accessTokenUserId(req: Request, secret: string | undefined): string | null {
  if (!secret) return null;
  const header = req.headers.authorization;
  const token = req.cookies?.accessToken ?? (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
  if (typeof token !== "string" || !token) return null;
  try {
    const decoded = jwt.verify(token, secret) as { userId?: unknown };
    return typeof decoded?.userId === "string" ? decoded.userId : null;
  } catch {
    return null;
  }
}

/** Signed-in user when the token verifies, otherwise the client IP. */
export function userOrIpKey(secret: string | undefined) {
  return (req: Request): string => {
    const userId = accessTokenUserId(req, secret);
    return userId ? `u:${userId}` : `ip:${clientIpKey(req)}`;
  };
}

/** Positive integer from an env var, else the default. */
export function limitFromEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** Options shared by every limiter: Redis store when available, fail open on store errors. */
export async function createLimiterStoreFactory(redis: RedisClient | null) {
  const RedisStore = redis ? (await import("rate-limit-redis")).RedisStore : null;
  return (prefix: string): Pick<Options, "store" | "passOnStoreError"> => {
    const store: Store | undefined = redis && RedisStore
      ? new RedisStore({
          sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as any,
          prefix: `rl_${prefix}:`,
        })
      : undefined;
    return { store, passOnStoreError: true };
  };
}
