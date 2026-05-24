// Augment the Express Request interface with custom properties
// set by auth/API-key middleware throughout server.ts.
// `export {}` makes this a module so `declare global` works with moduleDetection: "force".
export {};

declare global {
  namespace Express {
    interface Request {
      /** Populated by JWT auth middleware — decoded access-token payload. */
      user?: {
        userId?: string;
        role?: string;
        organizationId?: string;
        [key: string]: unknown;
      } | null;

      /** Populated by API-key middleware — the resolved organisation record. */
      apiOrg?: {
        id: string;
        name?: string;
        [key: string]: unknown;
      } | null;
    }
  }
}
