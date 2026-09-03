import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import * as crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";
import { prisma } from "./src/lib/prisma.js";
import { BillingService } from "./src/lib/enterprise/billing-service.js";
import { SecretsManager } from "./src/lib/secrets/secrets-manager.js";
import { buildCorsMiddleware, buildHelmetMiddleware } from "./src/lib/security/http-security.js";
import { RegisterBody, LoginBody, ForgotPasswordBody, ResetPasswordBody } from "./src/lib/security/schemas/auth.js";
import { SessionLaunchBody, SessionRespondBody, SessionCompleteBody, SessionFeedbackBody } from "./src/lib/security/schemas/sessions.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set to true once a live DB connection is confirmed at startup
let dbAvailable = false;

async function startServer() {
  // Load secrets first — AWS Secrets Manager if configured, else env vars
  await SecretsManager.load();

  const app = express();
  const PORT = parseInt(process.env.PORT || "3001", 10);

  // Trust the first proxy hop (Render / Fly / any reverse proxy).
  // Required so express-rate-limit reads X-Forwarded-For correctly.
  app.set("trust proxy", 1);

  // Probe DB connectivity — fall back to mock/demo mode if unreachable
  if (process.env.DATABASE_URL) {
    try {
      await (prisma as any).$queryRaw`SELECT 1`;
      dbAvailable = true;
      console.log("✅ Database connected");
      // Run pending migrations on startup (safe — idempotent)
      try {
        const { execSync } = await import("child_process");
        execSync("npx prisma migrate deploy", { stdio: "inherit" });
        console.log("✅ Prisma migrations applied");
      } catch (migErr) {
        console.warn("⚠️  Prisma migrate deploy failed:", migErr);
      }
      // Ensure default admin org + user exist on every startup
      try {
        await prisma.organization.upsert({
          where: { id: "b4skills-demo" },
          update: {},
          create: { id: "b4skills-demo", name: "b4skills", slug: "b4skills-demo" }
        });
        const seedEmail = process.env.ADMIN_SEED_EMAIL;
        const seedPassword = process.env.ADMIN_SEED_PASSWORD;
        if (seedEmail && seedPassword) {
          const { default: bcryptSeed } = await import("bcrypt");
          const adminHash = await bcryptSeed.hash(seedPassword, 10);
          await prisma.user.upsert({
            where: { email: seedEmail },
            // Always sync the password from env — ensures ADMIN_SEED_PASSWORD changes take effect
            update: { password: adminHash },
            create: { email: seedEmail, name: "Admin", password: adminHash, role: "SUPER_ADMIN", organizationId: "b4skills-demo" }
          });
          console.log("✅ Admin seed OK");
        }
      } catch (seedErr) {
        console.warn("⚠️  Admin seed failed:", seedErr);
      }
    } catch {
      dbAvailable = false;
      console.warn("⚠️  Database not reachable — running in mock/demo mode");
    }
  }

  app.use(buildHelmetMiddleware());
  app.use(buildCorsMiddleware());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  // --- SECURITY: Block known scanner / probe paths (WordPress, PHP, xmlrpc, etc.) ---
  const BLOCKED_PROBE_PATTERN = /\.(php|asp|aspx|jsp|cgi|env|git|svn|htaccess|htpasswd|DS_Store|config|bak|old|sql|xml)$/i;
  // Note: 'admin' intentionally removed — our SPA has a legitimate /admin route.
  // WordPress-specific admin paths (wp-admin, phpmyadmin) are still blocked.
  const BLOCKED_PROBE_PATHS = /\/(wp-admin|wp-login|wp-content|wp-includes|xmlrpc|phpmyadmin|phpinfo|install\.php|setup\.php|\.well-known\/security)/i;

  app.use((req, res, next) => {
    if (BLOCKED_PROBE_PATTERN.test(req.path) || BLOCKED_PROBE_PATHS.test(req.path)) {
      return res.status(404).end();
    }
    next();
  });

  // --- SECURITY: Rate-limit unauthenticated POST/PUT/DELETE to non-API paths ---
  const genericPostLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith("/api/") || req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
  });
  app.use(genericPostLimiter);

  // --- SECURITY: Global rate-limit for /api/ requests (bot / crawler protection) ---
  // Only applies to API routes — static assets and Vite HMR are never rate-limited.
  // In development the limit is relaxed so rapid page reloads don't trigger 429s.
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please slow down." },
    // Only throttle API calls — static assets and Vite HMR are exempt.
    // Also skip entirely in development to avoid false positives from rapid reloads.
    skip: (req) => !req.path.startsWith("/api/") || process.env.NODE_ENV !== "production",
  });
  app.use(globalLimiter);

  // --- SECURITY: Block known headless/automated user-agents ---
  const BLOCKED_UA_PATTERN = /HeadlessChrome|python-requests|curl\/|wget\/|scrapy|zgrab|masscan|nikto|sqlmap|nmap/i;
  app.use((req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    if (BLOCKED_UA_PATTERN.test(ua)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });

  // --- AUTH ROUTES ---
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set — refusing to start");
  if (!process.env.REFRESH_SECRET) throw new Error("REFRESH_SECRET environment variable is not set — refusing to start");
  const JWT_SECRET = process.env.JWT_SECRET;
  const REFRESH_SECRET = process.env.REFRESH_SECRET;

  // Login limiter — Redis-backed when REDIS_URL is set (works across instances),
  // falls back to per-process in-memory store when Redis is unavailable.
  let loginLimiterStore: import("express-rate-limit").Store | undefined;
  if (process.env.REDIS_URL) {
    try {
      const { default: Redis } = await import("ioredis");
      const { RedisStore } = await import("rate-limit-redis");
      const redisClient = new Redis(process.env.REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });
      await redisClient.connect().catch(() => {});
      loginLimiterStore = new RedisStore({
        sendCommand: (args_0: string, ...args: string[]) => redisClient.call(args_0, ...args) as any,
        prefix: "rl_login:",
      });
      console.log("✅ loginLimiter backed by Redis");
    } catch {
      console.warn("⚠️  Redis unavailable — loginLimiter using in-memory store");
    }
  }

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    store: loginLimiterStore,
  });

  const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      let token = req.cookies.accessToken;
      if (!token && req.headers.authorization?.startsWith("Bearer ")) {
         token = req.headers.authorization.split(" ")[1];
      }
      if (!token) return res.status(401).json({ error: 'Missing token' });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      (req as any).user = { id: decoded.userId };
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }
  };

  /**
   * Verifies the authenticated user owns the session (candidateId matches) or has an elevated role.
   * Must be used after authMiddleware. Passes for demo sessions (no DB).
   */
  const assertSessionOwnership = async (req: any, res: any, sessionId: string): Promise<boolean> => {
    if (sessionId.startsWith("demo-session-") || !dbAvailable) return true;
    const userId: string | undefined = req.user?.id;
    const role: string | undefined = req.user?.role;
    const adminRoles = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN", "PROCTOR", "RATER"];
    if (role && adminRoles.includes(role)) return true;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return false; }
    const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { candidateId: true } });
    if (!session) { res.status(404).json({ error: "Session not found" }); return false; }
    if (session.candidateId !== userId) { res.status(403).json({ error: "Forbidden" }); return false; }
    return true;
  };

  /**
   * Parse and validate a request body against a Zod schema.
   * Returns the parsed data or sends a 400 and returns null.
   */
  const validate = <T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: any } }, body: unknown, res: any): T | null => {
    const result = schema.safeParse(body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request body", issues: result.error.issues.map((i: any) => ({ path: i.path.join("."), message: i.message })) });
      return null;
    }
    return result.data as T;
  };

  const setAuthCookies = (res: any, accessToken: string, refreshToken: string) => {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 mins
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  };

  app.post("/api/auth/register", async (req, res) => {
    try {
      const body = validate(RegisterBody, req.body, res);
      if (!body) return;
      const { email, password, displayName } = body;
      let user = await prisma.user.findUnique({ where: { email } });
      if (user) return res.status(400).json({ error: 'User already exists' });
      
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email,
          name: displayName,
          password: hashedPassword,
          role: "CANDIDATE"
        }
      });
      const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
      });
      setAuthCookies(res, accessToken, refreshToken);
      return res.json({ token: accessToken, user: { uid: user.id, email: user.email, displayName: user.name, role: user.role } });
    } catch (err: any) {
      console.error("[auth/register]", err);
      return res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const body = validate(LoginBody, req.body, res);
      if (!body) return;
      const { email, password } = body;
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, password: true, role: true, organizationId: true, refreshToken: true },
      });
      if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
      
      const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
      });
      setAuthCookies(res, accessToken, refreshToken);
      return res.json({ token: accessToken, user: { uid: user.id, email: user.email, displayName: user.name, role: user.role, organizationId: user.organizationId || null } });
    } catch (err: any) {
      console.error("[auth/login]", err);
      return res.status(500).json({ error: "Login failed. Please try again." });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax' as const };
    const rf = req.cookies.refreshToken;
    if (rf) {
      try {
        // Verify the token (clockTolerance allows already-expired tokens to still log out cleanly)
        const decoded: any = jwt.verify(rf, REFRESH_SECRET, { clockTolerance: 60 * 60 * 24 * 7 });
        if (decoded?.userId) {
          await prisma.user.updateMany({
            where: { id: decoded.userId, refreshToken: rf },
            data: { refreshToken: null }
          }).catch(() => {});
        }
      } catch {
        // Token is invalid/tampered — proceed with cookie clearing anyway
      }
    }
    // Must match the same attributes used in setAuthCookies so browsers accept the deletion
    res.clearCookie('accessToken', cookieOpts);
    res.clearCookie('refreshToken', cookieOpts);
    return res.json({ success: true });
  });

  app.get("/api/auth/me", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const userId = (req as any).user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, organizationId: true },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: { uid: user.id, email: user.email, displayName: user.name, role: user.role, organizationId: user.organizationId || null } });
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const rf = req.cookies.refreshToken;
      if (!rf) return res.status(401).json({ error: 'No refresh token' });
      const decoded: any = jwt.verify(rf, REFRESH_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, refreshToken: true },
      });
      if (!user || user.refreshToken !== rf) return res.status(401).json({ error: 'Invalid refresh token' });

      const newAccess = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
      const newRefresh = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
      
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefresh }
      });
      setAuthCookies(res, newAccess, newRefresh);
      
      return res.json({ token: newAccess });
    } catch (err: any) {
      return res.status(401).json({ error: 'Tokens invalid or expired' });
    }
  });

  const resendClient = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  const FROM_ADDRESS = process.env.EMAIL_FROM ?? "B4Skills <noreply@b4skills.com>";
  const APP_BASE_URL = process.env.APP_URL ?? "http://localhost:3001";

  const sendEmail = async (to: string, subject: string, html: string) => {
    if (!resendClient) {
      // Dev fallback: log only, never send
      console.log(`[email:dev] To=${to} Subject="${subject}"`);
      return;
    }
    const { error } = await resendClient.emails.send({ from: FROM_ADDRESS, to, subject, html });
    if (error) console.error("[email] Resend error:", error);
  };

  app.post("/api/auth/forgot-password", async (req, res) => {
    const body = validate(ForgotPasswordBody, req.body, res);
    if (!body) return;
    const { email } = body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'If email exists, reset link sent.' }); // Generic response

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpires: resetExpires }
    });

    const resetLink = `${APP_BASE_URL}/reset-password?token=${resetToken}`;
    await sendEmail(
      user.email,
      "Reset your B4Skills password",
      `<p>Click the link below to reset your password. It expires in 15 minutes.</p><p><a href="${resetLink}">${resetLink}</a></p>`
    );
    
    return res.json({ message: 'If email exists, reset link sent.' });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const body = validate(ResetPasswordBody, req.body, res);
    if (!body) return;
    const { token, password: newPassword } = body;
    
    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: token, resetPasswordExpires: { gt: new Date() } }
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetPasswordToken: null, resetPasswordExpires: null }
    });
    return res.json({ success: true, message: 'Password reset successfully' });
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    const { email } = req.body; // Mock endpoint to start email verification process
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return res.json({ message: 'Process started if email needs verification' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyEmailToken: verifyToken }
    });
    
    const verifyLink = `${APP_BASE_URL}/verify-email?token=${verifyToken}`;
    await sendEmail(
      user.email,
      "Verify your B4Skills email address",
      `<p>Click the link below to verify your email address.</p><p><a href="${verifyLink}">${verifyLink}</a></p>`
    );
    return res.json({ message: 'Process started if email needs verification' });
  });

  // ── Social SSO — redirect-based flows (Google, Microsoft, LinkedIn) ────────

  const { createOAuthState, consumeOAuthState, getSocialAuthUrl, exchangeSocialCode, verifyGoogleIdToken } =
    await import("./src/lib/auth/social-sso.js");

  const socialAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: "Too many auth attempts" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Helper: upsert user from social profile, issue tokens, set cookies
  async function handleSocialProfile(profile: Awaited<ReturnType<typeof exchangeSocialCode>>, res: any) {
    let user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email:         profile.email,
          name:          profile.name,
          image:         profile.picture ?? null,
          role:          "CANDIDATE" as const,
          emailVerified: profile.emailVerified ? new Date() : null,
        },
      });
    } else if (!user.image && profile.picture) {
      user = await prisma.user.update({ where: { id: user.id }, data: { image: profile.picture } });
    }
    const accessToken  = jwt.sign({ userId: user.id }, JWT_SECRET,     { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: "7d"  });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
    setAuthCookies(res, accessToken, refreshToken);
    return { accessToken, user };
  }

  // POST /api/auth/google — legacy alias; delegates to real Google token verification
  app.post("/api/auth/google", socialAuthLimiter, async (req, res) => {
    try {
      const idToken = req.body.token ?? req.body.idToken;
      if (!idToken || typeof idToken !== "string") return res.status(400).json({ error: "idToken required" });
      const profile = await verifyGoogleIdToken(idToken);
      const { accessToken, user } = await handleSocialProfile(profile, res);
      return res.json({ token: accessToken, user: { uid: user.id, email: user.email, displayName: user.name, role: user.role } });
    } catch (err: any) {
      console.error("[auth/google]", err.message);
      return res.status(401).json({ error: "Invalid Google token" });
    }
  });

  // POST /api/auth/social/google/id-token — mobile/SPA flow (pass ID token directly)
  app.post("/api/auth/social/google/id-token", socialAuthLimiter, async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken || typeof idToken !== "string") return res.status(400).json({ error: "idToken required" });
      const profile = await verifyGoogleIdToken(idToken);
      const { accessToken, user } = await handleSocialProfile(profile, res);
      return res.json({ token: accessToken, user: { uid: user.id, email: user.email, displayName: user.name, role: user.role } });
    } catch (err: any) {
      console.error("[social-sso] google id-token:", err.message);
      return res.status(401).json({ error: "Google authentication failed" });
    }
  });

  // GET /api/auth/social/:provider — start the OAuth redirect flow
  app.get("/api/auth/social/:provider", socialAuthLimiter, (req, res) => {
    const provider = req.params.provider as "google" | "microsoft" | "linkedin";
    if (!["google", "microsoft", "linkedin"].includes(provider)) {
      return res.status(400).json({ error: "Unknown provider" });
    }
    const state   = createOAuthState(provider, req.query.redirect_uri as string ?? "/");
    const authUrl = getSocialAuthUrl(provider, state);
    // Store state in a short-lived signed cookie for CSRF protection
    res.cookie("oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 10 * 60 * 1000, secure: process.env.NODE_ENV === "production" });
    return res.redirect(authUrl);
  });

  // GET /api/auth/social/:provider/callback — OAuth callback
  app.get("/api/auth/social/:provider/callback", socialAuthLimiter, async (req, res) => {
    try {
      const provider = req.params.provider as "google" | "microsoft" | "linkedin";
      const { code, state, error } = req.query as Record<string, string>;

      if (error) return res.status(401).json({ error: `Provider error: ${error}` });
      if (!code || !state) return res.status(400).json({ error: "Missing code or state" });

      // CSRF check
      const cookieState = req.cookies?.oauth_state;
      if (!cookieState || cookieState !== state) return res.status(403).json({ error: "State mismatch" });
      res.clearCookie("oauth_state");

      const statePayload = consumeOAuthState(state);
      if (!statePayload) return res.status(403).json({ error: "Expired or unknown state" });

      const profile = await exchangeSocialCode(provider, code);
      const { accessToken, user } = await handleSocialProfile(profile, res);

      // Redirect back to SPA with a one-time code (token already in cookies)
      const redirectTo = statePayload.redirectUri && statePayload.redirectUri.startsWith("/") ? statePayload.redirectUri : "/";
      return res.redirect(`${redirectTo}?sso=ok`);
    } catch (err: any) {
      console.error("[social-sso] callback:", err.message);
      return res.redirect("/login?error=sso_failed");
    }
  });


  // If no database is available, we intercept admin routes and serve mock data
  app.use("/api", (req, res, next) => {
    if (!dbAvailable) {
      // In production, never fall back to a permissive demo mode.
      // Return 503 so operators know the DB is down.
      if (process.env.NODE_ENV === "production") {
        return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
      }

      const url = req.url;
      const method = req.method;

      // ── Auth (demo mode — no DB available) ─────────────────────────────────
      if ((url === "/auth/login" || url === "/auth/register") && method === "POST") {
        const demoAccessToken = jwt.sign({ userId: "demo-admin" }, JWT_SECRET, { expiresIn: "15m" });
        const demoRefreshToken = jwt.sign({ userId: "demo-admin" }, REFRESH_SECRET, { expiresIn: "7d" });
        setAuthCookies(res, demoAccessToken, demoRefreshToken);
        return res.json({ token: demoAccessToken, user: { uid: "demo-admin", email: req.body?.email || "demo@b4skills.com", displayName: req.body?.name || "Demo Admin", role: "SUPER_ADMIN", organizationId: "b4skills-demo" } });
      }
      if (url === "/auth/me" && method === "GET") {
        try {
          let token = req.cookies.accessToken;
          if (!token && req.headers.authorization?.startsWith("Bearer ")) token = req.headers.authorization.split(" ")[1];
          if (!token) return res.status(401).json({ error: "Missing token" });
          const decoded: any = jwt.verify(token, JWT_SECRET);
          return res.json({ user: { uid: decoded.userId, email: "demo@b4skills.com", displayName: "Demo Admin", role: "SUPER_ADMIN", organizationId: "b4skills-demo" } });
        } catch { return res.status(401).json({ error: "Invalid token" }); }
      }
      if (url === "/auth/refresh" && method === "POST") {
        try {
          const rf = req.cookies.refreshToken;
          if (!rf) return res.status(401).json({ error: "No refresh token" });
          jwt.verify(rf, REFRESH_SECRET);
          const newAccess = jwt.sign({ userId: "demo-admin" }, JWT_SECRET, { expiresIn: "15m" });
          const newRefresh = jwt.sign({ userId: "demo-admin" }, REFRESH_SECRET, { expiresIn: "7d" });
          setAuthCookies(res, newAccess, newRefresh);
          return res.json({ token: newAccess });
        } catch { return res.status(401).json({ error: "Invalid refresh token" }); }
      }
      if (url === "/auth/logout" && method === "POST") {
        const _isProd = process.env.NODE_ENV === 'production';
        const _opts = { httpOnly: true, secure: _isProd, sameSite: 'lax' as const };
        res.clearCookie("accessToken", _opts);
        res.clearCookie("refreshToken", _opts);
        return res.json({ success: true });
      }

      // ── Health ──────────────────────────────────────────────────────────────
      if (url === "/health") return next();

      // ── Psychometrics config ─────────────────────────────────────────────────
      if (url.includes("/config/system")) {
        if (method === "GET") return res.json({ minItems: 10, maxItems: 30, semThreshold: 0.25, startingTheta: 0.0, pretestRatio: 0.1, cefrThresholds: { A1: -2.0, A2: -1.0, B1: 0.0, B2: 1.0, C1: 2.0, C2: 3.0 } });
        if (method === "PUT") return res.json(req.body);
      }

      // ── Item Bank ────────────────────────────────────────────────────────────
      if (url === "/items" && method === "GET") {
        return res.json([
          { id: "mock-item-1", skill: "READING", type: "MULTIPLE_CHOICE", cefrLevel: "B1", content: { prompt: "The quick brown fox jumped over the lazy dog. What did the fox jump over?", options: ["A fence", "A wall", "The lazy dog", "A stream"], correctIndex: 2 }, difficulty: 1.0, status: "ACTIVE", assets: [] },
          { id: "mock-item-2", skill: "READING", type: "MULTIPLE_CHOICE", cefrLevel: "A2", content: { prompt: "She ___ to the store yesterday.", text: "Fill in the blank with the correct verb form.", options: ["go", "goes", "went", "gone"], correctIndex: 2 }, difficulty: 2.0, status: "ACTIVE", assets: [] },
          { id: "mock-item-3", skill: "SPEAKING", type: "AUDIO_RESPONSE", cefrLevel: "B2", content: { prompt: "Describe your favorite hobby in detail.", text: "You have 60 seconds to respond." }, difficulty: 3.0, status: "ACTIVE", assets: [] },
          { id: "mock-item-4", skill: "WRITING", type: "OPEN_RESPONSE", cefrLevel: "C1", content: { prompt: "Write an email to a colleague proposing a new project idea.", text: "Minimum 80 words required." }, difficulty: 4.0, status: "ACTIVE", assets: [] },
          { id: "mock-item-5", skill: "READING", type: "MULTIPLE_CHOICE", cefrLevel: "A1", content: { prompt: "What color is the sky on a clear day?", options: ["Green", "Blue", "Red", "Yellow"], correctIndex: 1 }, difficulty: 0.5, status: "ACTIVE", assets: [] },
          { id: "mock-item-6", skill: "WRITING", type: "OPEN_RESPONSE", cefrLevel: "B1", content: { prompt: "Describe your hometown in a few sentences.", text: "Use at least 50 words." }, difficulty: 2.5, status: "DRAFT", assets: [] },
        ]);
      }
      if (url.startsWith("/items") && (method === "PUT" || method === "POST")) return res.json({ ...req.body, id: req.body.id || "new-item-" + Date.now() });
      if (url.startsWith("/items") && method === "DELETE") return res.json({ success: true });

      // ── Cohort / analytics ────────────────────────────────────────────────────
      if (url.includes("/analytics/cohort")) {
        return res.json({
          totalCandidates: 450,
          completedSessions: 312,
          averageAbility: 0.85,
          cefrDistribution: { A1: 12, A2: 25, B1: 80, B2: 110, C1: 60, C2: 25 },
          skillPerformance: { Reading: 72, Listening: 68, Writing: 59, Speaking: 61, Grammar: 74, Vocabulary: 70 },
          timeSeriesData: [
            { date: "Sep", avgScore: 58 }, { date: "Oct", avgScore: 62 }, { date: "Nov", avgScore: 65 },
            { date: "Dec", avgScore: 69 }, { date: "Jan", avgScore: 72 }, { date: "Feb", avgScore: 74 },
            { date: "Mar", avgScore: 77 }, { date: "Apr", avgScore: 80 }
          ],
          settings: { webhookUrl: "", apiKey: "" }
        });
      }

      // ── Org analytics (AdvancedAnalytics component format) ────────────────────
      if (url.includes("/organizations/") && url.includes("/analytics")) {
        return res.json({
          sessionsCount: 312,
          avgRating: 4.3,
          feedbacksCount: 289,
          cefrDistribution: [
            { name: "A1", value: 12 }, { name: "A2", value: 25 }, { name: "B1", value: 80 },
            { name: "B2", value: 110 }, { name: "C1", value: 60 }, { name: "C2", value: 25 }
          ],
          monthlyTrend: [
            { month: "Nov", count: 42 }, { month: "Dec", count: 55 }, { month: "Jan", count: 63 },
            { month: "Feb", count: 70 }, { month: "Mar", count: 89 }, { month: "Apr", count: 97 }
          ],
          skillBreakdown: [
            { skill: "Reading", avg: 72 }, { skill: "Listening", avg: 68 }, { skill: "Writing", avg: 59 },
            { skill: "Speaking", avg: 61 }, { skill: "Grammar", avg: 74 }, { skill: "Vocabulary", avg: 70 }
          ]
        });
      }

      // ── Audit logs ───────────────────────────────────────────────────────────
      if (url.includes("/organizations/") && url.includes("/audit-logs")) {
        return res.json([
          { id: "log-1", action: "CANDIDATE_IMPORT", timestamp: new Date(Date.now() - 3600000).toISOString(), userId: "admin1", details: "50 candidates imported via CSV" },
          { id: "log-2", action: "SETTINGS_UPDATED", timestamp: new Date(Date.now() - 7200000).toISOString(), userId: "admin1", details: "CEFR thresholds updated" },
          { id: "log-3", action: "ITEM_DELETED", timestamp: new Date(Date.now() - 86400000).toISOString(), userId: "admin1", details: "Item mock-item-old removed from bank" },
        ]);
      }

      // ── Billing ───────────────────────────────────────────────────────────────
      if (url.includes("/organizations/") && url.includes("/billing/topup") && method === "POST") {
        return res.json({ success: true });
      }
      if (url.includes("/organizations/") && url.includes("/billing")) {
        return res.json({ creditsRemaining: 4876, licenseType: "Enterprise", expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), recentTransactions: [
          { id: "txn-1", amount: 100000, creditsAdded: 1000, createdAt: new Date(Date.now() - 2592000000).toISOString(), status: "COMPLETED" },
          { id: "txn-2", amount: 0, creditsAdded: -124, createdAt: new Date(Date.now() - 86400000).toISOString(), status: "COMPLETED" },
        ]});
      }

      // ── Webhooks & API Keys ───────────────────────────────────────────────────
      if (url.includes("/organizations/") && url.includes("/webhooks")) {
        if (method === "GET") return res.json([{ id: "wh-1", url: "https://example.com/webhook", events: ["session.completed", "proctoring.alert"], active: true, createdAt: new Date().toISOString() }]);
        if (method === "POST") return res.json({ id: "wh-" + Date.now(), ...req.body, active: true, createdAt: new Date().toISOString() });
        if (method === "DELETE") return res.json({ success: true });
      }
      if (url.includes("/organizations/") && url.includes("/api-keys")) {
        if (method === "GET") return res.json([{ id: "ak-1", name: "Production Key", key: "b4s_prod_xxxxxx", createdAt: new Date(Date.now() - 604800000).toISOString() }]);
        if (method === "POST") return res.json({ id: "ak-" + Date.now(), name: req.body.name, key: "b4s_" + crypto.randomBytes(12).toString("hex"), createdAt: new Date().toISOString() });
        if (method === "DELETE") return res.json({ success: true });
      }

      // ── Proctoring alerts ─────────────────────────────────────────────────────
      if (url.includes("/organizations/") && url.includes("/proctoring-alerts")) {
        return res.json([
          { id: "alert-1", type: "TAB_SWITCH", severity: 2, sessionId: "demo-sess-2", candidateName: "Ben Carter", timestamp: new Date(Date.now() - 600000).toISOString(), count: 3 },
          { id: "alert-2", type: "MULTIPLE_FACES", severity: 5, sessionId: "demo-sess-4", candidateName: "David Kim", timestamp: new Date(Date.now() - 1800000).toISOString(), count: 1 },
        ]);
      }

      // ── Branding ─────────────────────────────────────────────────────────────
      if (url.includes("/branding")) {
        if (method === "GET") return res.json({ primaryColor: "#9b276c", secondaryColor: "#0f172a", name: "b4skills", logoUrl: "", welcomeMessage: "Welcome to b4skills Assessment Platform" });
        if (method === "PUT" || method === "POST") return res.json({ ...req.body, id: "branding-1" });
      }

      // ── Branding (general /api/branding/:orgId) ───────────────────────────────
      if (url.startsWith("/api/branding/") || url.startsWith("/branding/")) {
        return res.json({ primaryColor: "#9b276c", secondaryColor: "#0f172a", name: "b4skills", logoUrl: "", welcomeMessage: "Welcome to b4skills Assessment Platform" });
      }

      // ── Rating tasks ──────────────────────────────────────────────────────────
      if (url.includes("/rating/tasks") && method === "GET") {
        return res.json([
          { id: "task-1", status: "PENDING", type: "WRITING", content: "The impact of AI on the modern workplace is undeniable. Companies are adopting machine learning tools at an unprecedented rate...", aiResult: { cefrLevel: "B2", score: 0.72, feedback: "Well-structured argument with good vocabulary." }, sessionId: "demo-sess-1", createdAt: new Date().toISOString() },
          { id: "task-2", status: "PENDING", type: "SPEAKING", content: "Audio response recorded.", aiResult: { cefrLevel: "B1", score: 0.55, feedback: "Clear pronunciation but limited vocabulary range." }, sessionId: "demo-sess-3", createdAt: new Date().toISOString() },
        ]);
      }
      if (url.includes("/rating/tasks/") && url.includes("/claim")) return res.json({ success: true });
      if (url.includes("/rating/tasks/") && url.includes("/submit")) return res.json({ success: true });

      // ── Calibration ───────────────────────────────────────────────────────────
      if (url.includes("/calibration/study")) {
        return res.json({ items: [{ id: "mock-item-1", irtA: 1.2, irtB: -0.5, irtC: 0.2 }], rmse: 0.12, bias: 0.003, sampleSize: 450 });
      }
      if (url.includes("/calibration/apply")) return res.json({ success: true, updatedCount: 1 });

      // ── Ecosystem / Onboarding ────────────────────────────────────────────────
      if (url.includes("/ecosystem/config")) return res.json({ settings: { webhookUrl: req.body?.webhookUrl || "", apiKey: "b4s_demo_key_xxxx" } });
      if (url.includes("/onboarding/bulk")) {
        const candidates = req.body?.candidates || [];
        return res.json(candidates.map((c: any) => ({ email: c.email, status: "SUCCESS", candidateId: "new-" + Date.now() })));
      }

      // ── Exam code generation ────────────────────────────────────────────────────
      if (url === "/codes/generate" && method === "POST") {
        const { productLine: pl = "General", count: cnt = 1, prefix = "E" } = req.body || {};
        const codes: { code: string }[] = [];
        for (let i = 0; i < Math.min(Number(cnt), 500); i++) {
          const ran = crypto.randomBytes(4).toString("hex").toUpperCase() + crypto.randomBytes(4).toString("hex").toUpperCase();
          codes.push({ code: `${prefix}-${ran}` });
        }
        return res.json({ message: `Generated ${codes.length} codes`, codes: codes.map(c => c.code) });
      }
      if (url === "/codes/validate" && method === "POST") {
        return res.json({ valid: true, examCode: { code: req.body?.code, productLine: "General English", organizationId: "b4skills-demo" } });
      }
      if (url === "/codes/redeem" && method === "POST") {
        return res.json({ success: true, organizationId: "b4skills-demo", productLine: "General English" });
      }

      // ── Bulk candidate import ─────────────────────────────────────────────────────
      if (url.includes("/candidates/bulk-import")) {
        const candidates = req.body?.candidates || [];
        return res.json(candidates.map((c: any) => ({ email: c.email, status: "CREATED" })));
      }

      // ── Candidate history ────────────────────────────────────────────────────
      if (url.includes("/candidates/") && method === "DELETE") return res.json({ success: true });
      if (url.includes("/candidates/")) {
        return res.json([
          { id: "hist-1", cefrLevel: "B2", theta: 1.2, completedAt: new Date(Date.now() - 86400000).toISOString(), status: "COMPLETED" },
          { id: "hist-2", cefrLevel: "B1", theta: 0.4, completedAt: new Date(Date.now() - 7 * 86400000).toISOString(), status: "COMPLETED" },
        ]);
      }

      // ── Org candidates list ────────────────────────────────────────────────────
      if (url.includes("/organizations/") && url.includes("/candidates")) {
        if (method === "GET") return res.json([
          { id: "c-1", name: "Alice Johnson", email: "alice@example.com", role: "CANDIDATE", sessions: [{ status: "COMPLETED", completedAt: new Date(Date.now() - 86400000).toISOString(), theta: 1.2 }] },
          { id: "c-2", name: "Ben Carter", email: "ben@example.com", role: "CANDIDATE", sessions: [{ status: "IN_PROGRESS", completedAt: null, theta: 0.3 }] },
          { id: "c-3", name: "Clara Ricci", email: "clara@example.com", role: "CANDIDATE", sessions: [] },
        ]);
        if (method === "POST") return res.json({ id: "c-" + Date.now(), ...req.body, status: "CREATED" });
      }

      // ── Org sessions list ─────────────────────────────────────────────────────
      if (url.includes("/organizations/") && url.includes("/sessions")) {
        if (method === "GET") return res.json([
          { id: "demo-sess-1", candidateId: "c-1", status: "COMPLETED", createdAt: new Date(Date.now() - 86400000).toISOString(), theta: 1.2, candidate: { name: "Alice Johnson", email: "alice@example.com" }, scoreReport: { overallCefr: "B2", overallScore: 70 } },
          { id: "demo-sess-2", candidateId: "c-2", status: "IN_PROGRESS", createdAt: new Date(Date.now() - 3600000).toISOString(), theta: 0.3, candidate: { name: "Ben Carter", email: "ben@example.com" }, scoreReport: null },
        ]);
      }

      // ── Delete webhook ─────────────────────────────────────────────────────────
      if (url.match(/\/organizations\/[^/]+\/settings$/) && method === "GET") return res.json({ allowRetakes: true, maxRetakes: 3, retakeCooldownDays: 7, sessionTimeoutMinutes: 120, adaptiveAlgorithm: "IRT-3PL", notifyOnCompletion: true });
      if (url.match(/\/organizations\/[^/]+\/branding$/) && method === "GET") return res.json({ primaryColor: "#1a56db", secondaryColor: "#7e3af2", logoUrl: "", customDomain: "", welcomeMessage: "Welcome to your English assessment", organizationName: "Demo Organization" });
      if (url.includes("/items/exposure-report") && method === "GET") return res.json({ totalActive: 120, neverUsed: 34, overExposed: 8, overExposureThreshold: 0.3, strata: [{ stratumIndex: 1, label: "Stratum 1 (Low α)", totalItems: 40, usedItems: 28, usageRate: 0.7, minA: 0.4, maxA: 0.8 }, { stratumIndex: 2, label: "Stratum 2 (Mid α)", totalItems: 40, usedItems: 35, usageRate: 0.875, minA: 0.8, maxA: 1.4 }, { stratumIndex: 3, label: "Stratum 3 (High α)", totalItems: 40, usedItems: 31, usageRate: 0.775, minA: 1.4, maxA: 2.2 }], bySkill: { Reading: { total: 35, active: 30, pretest: 3, retired: 2 }, Listening: { total: 30, active: 26, pretest: 2, retired: 2 }, Writing: { total: 25, active: 22, pretest: 2, retired: 1 }, Speaking: { total: 20, active: 18, pretest: 1, retired: 1 }, Grammar: { total: 20, active: 16, pretest: 2, retired: 2 }, Vocabulary: { total: 15, active: 12, pretest: 1, retired: 2 } }, byCefrLevel: { A1: { total: 15, active: 12 }, A2: { total: 20, active: 18 }, B1: { total: 30, active: 26 }, B2: { total: 30, active: 28 }, C1: { total: 20, active: 18 }, C2: { total: 10, active: 8 } } });
      if (url.includes("/organizations/") && url.includes("/webhooks/") && method === "DELETE") return res.json({ success: true });

      // ── Delete/revoke api-key ──────────────────────────────────────────────────
      if (url.includes("/organizations/") && url.includes("/api-keys/") && method === "DELETE") return res.json({ success: true });

      // ── Org settings update ───────────────────────────────────────────────────
      if (url.includes("/organizations/") && url.includes("/settings") && (method === "PATCH" || method === "PUT")) {
        return res.json({ settings: req.body });
      }

      // ── SSO config update ─────────────────────────────────────────────────────
      if (url.includes("/organizations/") && url.includes("/sso-config") && method === "PUT") {
        return res.json(req.body);
      }
      if (url.includes("/organizations/") && url.includes("/sso-config") && method === "GET") {
        return res.json({ provider: "", entryPoint: "", issuer: "", enabled: false });
      }

      // ── Session responses (SessionReview component) ───────────────────────────
      if (url.match(/^\/sessions\/[^/]+\/responses$/) && method === "GET") {
        return res.json([
          { id: "resp-1", order: 1, score: 0.82, response: "Supply chain disruptions drive localized inflation.", metadata: { cefrLevel: "B2", confidence: 0.9 }, item: { id: "mock-item-1", skill: "READING", content: { prompt: "What is the author's primary argument regarding supply chains?" } } },
          { id: "resp-2", order: 2, score: 0.55, response: "Audio response provided.", metadata: { cefrLevel: "B1", confidence: 0.72 }, item: { id: "mock-item-3", skill: "SPEAKING", content: { prompt: "Describe your favorite hobby in detail." } } },
        ]);
      }

      // ── Session status / insights / next item ────────────────────────────────
      if (url.match(/^\/sessions\/[^/]+\/status$/) && method === "GET") {
        return res.json({ status: "IN_PROGRESS", itemsAnswered: 5, theta: 0.4 });
      }
      if (url.match(/^\/sessions\/[^/]+\/insights$/) && method === "GET") {
        return res.json({ strengths: ["Reading comprehension", "Vocabulary"], weaknesses: ["Speaking fluency"], recommendations: ["Practice daily conversation"] });
      }
      if (url.match(/^\/sessions\/[^/]+\/respond$/) && method === "POST") {
        return res.json({ success: true });
      }
      if (url.match(/^\/sessions\/[^/]+\/next$/) && method === "GET") {
        return res.json({ done: false, item: { id: "mock-item-1", skill: "READING", type: "MULTIPLE_CHOICE", cefrLevel: "B1", content: { prompt: "The quick brown fox...", options: ["A", "B", "C", "D"], correctIndex: 2 }, difficulty: 1.0, assets: [] } });
      }
      if (url.match(/^\/sessions\/[^/]+\/complete$/) && method === "POST") {
        return res.json({ success: true, cefrLevel: "B2", theta: 1.2 });
      }
      if (url.match(/^\/sessions\/[^/]+\/feedback$/) && method === "POST") {
        return res.json({ success: true });
      }

      // ── Session launch ────────────────────────────────────────────────────────
      if (url === "/sessions/launch" && method === "POST") {
        return res.json({ sessionId: "demo-sess-" + Date.now(), status: "IN_PROGRESS" });
      }

      // ── AI scoring (speaking multimodal) ─────────────────────────────────────
      if (url.includes("/ai/score") || url.includes("/score/ai")) {
        return res.json({ cefrLevel: "B2", score: 0.72, feedback: "Good performance.", breakdown: { grammar: 0.7, vocabulary: 0.75, fluency: 0.7 } });
      }

      // ── Freemium placement test (demo mode) ───────────────────────────────────
      // Adaptive demo: tracks score per placement session and adjusts CEFR target.
      // Items are shuffled deterministically per placement ID so every session
      // shows a different order.  State stored on the app object to survive across
      // the start → respond → respond … chain.
      if (!((res as any).__demoCounters)) (res as any).__demoCounters = {};
      const _dc = (app as any).__demoCounters as Record<string, DemoState> ||
                  ((app as any).__demoCounters = {} as Record<string, DemoState>);

      // Full demo item pool — A1 through C1, 4 skills
      const _DEMO_POOL = [
        // ── A1 ──
        { id: "dp-a1-1", skill: "GRAMMAR",    cefrLevel: "A1", content: { prompt: "I ___ a student.", options: ["am", "is", "are", "be"], correctIndex: 0 } },
        { id: "dp-a1-2", skill: "VOCABULARY", cefrLevel: "A1", content: { prompt: "Which word means a place where people sleep?", options: ["kitchen", "office", "bedroom", "garage"], correctIndex: 2 } },
        { id: "dp-a1-3", skill: "LISTENING",  cefrLevel: "A1", content: { prompt: "Someone says 'Good morning!' You reply:", options: ["Good night!", "Good morning!", "See you!", "Bye!"], correctIndex: 1 } },
        // ── A2 ──
        { id: "dp-a2-1", skill: "GRAMMAR",    cefrLevel: "A2", content: { prompt: "Which sentence is correct?", options: ["He don't like coffee.", "He doesn't like coffee.", "He not like coffee.", "He no like coffee."], correctIndex: 1 } },
        { id: "dp-a2-2", skill: "VOCABULARY", cefrLevel: "A2", content: { prompt: "Which word means the opposite of 'difficult'?", options: ["hard", "easy", "complex", "tricky"], correctIndex: 1 } },
        { id: "dp-a2-3", skill: "READING",    cefrLevel: "A2", content: { prompt: "The sign says 'No Entry'. What does it mean?", options: ["You can enter.", "You must stop.", "You cannot enter.", "You can exit."], correctIndex: 2 } },
        { id: "dp-a2-4", skill: "LISTENING",  cefrLevel: "A2", content: { prompt: "A student missed a class. Which response is most polite?", options: ["Can I get the notes?", "Could I possibly borrow your notes?", "Give me the notes.", "I need the notes now."], correctIndex: 1 } },
        // ── B1 ──
        { id: "dp-b1-1", skill: "GRAMMAR",    cefrLevel: "B1", content: { prompt: "She ___ to work every day by bus.", options: ["go", "goes", "going", "gone"], correctIndex: 1 } },
        { id: "dp-b1-2", skill: "VOCABULARY", cefrLevel: "B1", content: { prompt: "Choose the word that best completes: The scientist made a remarkable ___.", options: ["discovery", "discovering", "discovered", "discover"], correctIndex: 0 } },
        { id: "dp-b1-3", skill: "READING",    cefrLevel: "B1", content: { prompt: "According to the passage, what improved last quarter?", passage: "A recent company report outlined how productivity had increased significantly over the last quarter, attributing the improvement to new workflow software.", options: ["Staff numbers", "Productivity", "Customer satisfaction", "Product quality"], correctIndex: 1 } },
        { id: "dp-b1-4", skill: "GRAMMAR",    cefrLevel: "B1", content: { prompt: "By the time we arrived, they ___ already left.", options: ["have", "had", "has", "having"], correctIndex: 1 } },
        { id: "dp-b1-5", skill: "VOCABULARY", cefrLevel: "B1", content: { prompt: "The word 'annual' means:", options: ["every month", "every week", "every year", "every day"], correctIndex: 2 } },
        // ── B2 ──
        { id: "dp-b2-1", skill: "GRAMMAR",    cefrLevel: "B2", content: { prompt: "If I ___ you, I would apologise immediately.", options: ["am", "was", "were", "be"], correctIndex: 2 } },
        { id: "dp-b2-2", skill: "VOCABULARY", cefrLevel: "B2", content: { prompt: "Choose the most precise word: Despite the ___ evidence, the jury acquitted the defendant.", options: ["overwhelming", "some", "small", "little"], correctIndex: 0 } },
        { id: "dp-b2-3", skill: "READING",    cefrLevel: "B2", content: { prompt: "What is the author's main argument?", passage: "Critics who dismiss social media as inherently harmful overlook the substantial body of research demonstrating its positive role in maintaining long-distance relationships and providing support networks for marginalised groups.", options: ["Social media causes harm.", "Social media is entirely positive.", "Social media has benefits that critics overlook.", "Social media research is inconclusive."], correctIndex: 2 } },
        { id: "dp-b2-4", skill: "GRAMMAR",    cefrLevel: "B2", content: { prompt: "The report ___ before the deadline if the team had worked faster.", options: ["would finish", "would have finished", "will finish", "had finished"], correctIndex: 1 } },
        // ── C1 ──
        { id: "dp-c1-1", skill: "VOCABULARY", cefrLevel: "C1", content: { prompt: "Which word best replaces 'very tired' in a formal essay?", options: ["exhausted", "really tired", "super tired", "dead tired"], correctIndex: 0 } },
        { id: "dp-c1-2", skill: "GRAMMAR",    cefrLevel: "C1", content: { prompt: "Select the sentence with correct subject-verb agreement:", options: ["Neither the manager nor the staff was informed.", "Neither the manager nor the staff were informed.", "Neither the manager nor the staff has informed.", "Neither the manager nor the staff are informed."], correctIndex: 1 } },
        { id: "dp-c1-3", skill: "READING",    cefrLevel: "C1", content: { prompt: "What rhetorical device does the author use?", passage: "The policy is not merely impractical — it is, at its core, a monument to wishful thinking dressed in the language of reform.", options: ["Understatement", "Metaphor combined with irony", "Simile", "Alliteration"], correctIndex: 1 } },
        { id: "dp-c1-4", skill: "VOCABULARY", cefrLevel: "C1", content: { prompt: "'Perspicacious' most nearly means:", options: ["stubborn", "generous", "having a keen insight", "overly cautious"], correctIndex: 2 } },
      ] as const;
      type DemoItem = { id: string; skill: string; cefrLevel: string; content: { prompt: string; passage?: string; options: readonly string[]; correctIndex: number } };
      interface DemoState { count: number; correct: number; pool: DemoItem[]; }

      // Seeded shuffle — deterministic per placement ID (LCG-based Fisher-Yates)
      function demoSeededShuffle<T>(arr: readonly T[], seed: string): T[] {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < seed.length; i++) {
          h ^= seed.charCodeAt(i);
          h = Math.imul(h, 16777619) >>> 0;
        }
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
          h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
          const j = h % (i + 1);
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      }

      // CEFR level → theta midpoint for result computation
      const _DEMO_CEFR_THETA: Record<string, number> = { A1: -3.0, A2: -1.5, B1: 0.0, B2: 1.2, C1: 2.4 };
      const _DEMO_CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1"] as const;

      // Pick next item: prefer items at or near current CEFR target and not yet seen
      function pickNextDemoItem(pool: DemoItem[], usedIds: Set<string>, targetCefr: string): DemoItem | undefined {
        const targetIdx = _DEMO_CEFR_ORDER.indexOf(targetCefr as typeof _DEMO_CEFR_ORDER[number]);
        // Try exact level first, then adjacent levels
        for (const offset of [0, -1, 1, -2, 2]) {
          const cefrIdx = Math.max(0, Math.min(_DEMO_CEFR_ORDER.length - 1, targetIdx + offset));
          const band = _DEMO_CEFR_ORDER[cefrIdx];
          const candidate = pool.find(i => i.cefrLevel === band && !usedIds.has(i.id));
          if (candidate) return candidate;
        }
        return pool.find(i => !usedIds.has(i.id));
      }

      const MAX_DEMO_ITEMS = 10;

      if (url === "/assessment/placement/start" && method === "POST") {
        const demoId = "demo-placement-" + Date.now();
        const shuffledPool: DemoItem[] = demoSeededShuffle([..._DEMO_POOL] as DemoItem[], demoId);
        // Start at B1 (most likely level for an unknown candidate)
        const firstItem = pickNextDemoItem(shuffledPool, new Set<string>(), "B1") ?? shuffledPool[0];
        _dc[demoId] = { count: 0, correct: 0, pool: shuffledPool };
        return res.json({
          placementId: demoId,
          firstItem: { ...firstItem, type: "MULTIPLE_CHOICE", irtA: 1.2, irtB: _DEMO_CEFR_THETA[firstItem.cefrLevel] ?? 0, irtC: 0.2, assets: [] },
          maxItems: MAX_DEMO_ITEMS,
        });
      }
      if (url.match(/^\/assessment\/placement\/[^/]+\/respond$/) && method === "POST") {
        const urlParts = url.split("/");
        const demoId = urlParts[urlParts.length - 2];
        const state = _dc[demoId];
        if (!state) {
          return res.status(400).json({ error: "Unknown placement session" });
        }

        // Score the response
        const bodyData = req.body as { itemId?: string; answer?: number };
        const lastItemId = bodyData?.itemId;
        const lastItem = lastItemId ? state.pool.find(i => i.id === lastItemId) : undefined;
        const isCorrect = typeof bodyData?.answer === "number" && lastItem
          ? bodyData.answer === lastItem.content.correctIndex
          : false;

        state.count++;
        if (isCorrect) state.correct++;

        if (state.count >= MAX_DEMO_ITEMS) {
          // Compute result: map score ratio to CEFR band
          const ratio = state.correct / state.count;
          const cefrIdx = Math.min(
            _DEMO_CEFR_ORDER.length - 1,
            Math.floor(ratio * _DEMO_CEFR_ORDER.length),
          );
          const cefrLevel = _DEMO_CEFR_ORDER[cefrIdx];
          const theta = _DEMO_CEFR_THETA[cefrLevel] ?? 0;
          delete _dc[demoId];
          return res.json({
            complete: true,
            result: {
              placementId: demoId,
              cefrLevel,
              theta,
              sem: 0.4,
              cefrConfidenceInterval: [theta - 0.7, theta + 0.7] as [number, number],
              cefrRange: cefrIdx > 0 ? `${_DEMO_CEFR_ORDER[cefrIdx - 1]}–${cefrLevel}` : cefrLevel,
              itemsAdministered: state.count,
              completionMs: state.count * 30000,
              skillBreakdown: {
                GRAMMAR:    { total: state.pool.filter(i => i.skill === "GRAMMAR").length,    correct: Math.round(state.correct * 0.35) },
                VOCABULARY: { total: state.pool.filter(i => i.skill === "VOCABULARY").length, correct: Math.round(state.correct * 0.30) },
                READING:    { total: state.pool.filter(i => i.skill === "READING").length,    correct: Math.round(state.correct * 0.20) },
                LISTENING:  { total: state.pool.filter(i => i.skill === "LISTENING").length,  correct: Math.round(state.correct * 0.15) },
              },
              upgradePrompt: {
                message: "Get a full psychometric report with detailed skill breakdowns and a certified CEFR certificate.",
                skills: ["Deep Psychometrics", "Certified Report", "Speaking & Writing AI Scoring"],
                callToActionUrl: "#pricing",
              },
            },
          });
        }

        // Adapt difficulty: step up if ≥ 70% correct, step down if < 40%
        const usedIds = new Set(state.pool.slice(0, state.count).map(i => i.id));
        const ratio = state.correct / state.count;
        const currentAdminItems = state.pool.filter(i => usedIds.has(i.id));
        const lastCefrIdx = currentAdminItems.length > 0
          ? _DEMO_CEFR_ORDER.indexOf(currentAdminItems[currentAdminItems.length - 1].cefrLevel as typeof _DEMO_CEFR_ORDER[number])
          : 2; // B1
        let nextCefrIdx = lastCefrIdx;
        if (ratio >= 0.70) nextCefrIdx = Math.min(_DEMO_CEFR_ORDER.length - 1, lastCefrIdx + 1);
        else if (ratio < 0.40) nextCefrIdx = Math.max(0, lastCefrIdx - 1);
        const targetCefr = _DEMO_CEFR_ORDER[nextCefrIdx];

        const nextItem = pickNextDemoItem(state.pool, usedIds, targetCefr);
        if (!nextItem) {
          // Exhausted pool — complete early
          delete _dc[demoId];
          return res.json({ complete: true, result: { placementId: demoId, cefrLevel: "B1", theta: 0, sem: 0.5, cefrConfidenceInterval: [-0.5, 0.5] as [number, number], cefrRange: "A2–B1", itemsAdministered: state.count, completionMs: state.count * 30000, skillBreakdown: {}, upgradePrompt: { message: "Upgrade for a full report.", skills: [], callToActionUrl: "#pricing" } } });
        }
        return res.json({
          complete: false,
          nextItem: { ...nextItem, type: "MULTIPLE_CHOICE", irtA: 1.0, irtB: _DEMO_CEFR_THETA[nextItem.cefrLevel] ?? 0, irtC: 0.2, assets: [] },
          itemsAdministered: state.count,
          currentCefrBand: targetCefr,
        });
      }
    }
    next();
  });

  // --- RBAC MIDDLEWARE ---
  const checkRole = (roles: string[]) => {
    return async (req: any, res: any, next: any) => {
      // 1. Try JWT cookie (preferred - works for logged-in users)
      const accessToken = req.cookies?.accessToken;
      if (accessToken) {
        try {
          const decoded: any = jwt.verify(accessToken, JWT_SECRET);
          if (decoded.userId) {
            if (!dbAvailable) {
              req.user = { role: "SUPER_ADMIN", organizationId: "default-org" };
              return next();
            }
            const jwtUser = await prisma.user.findUnique({
              where: { id: decoded.userId },
              select: { role: true, organizationId: true }
            });
            if (jwtUser && (roles.includes(jwtUser.role) || jwtUser.role === "SUPER_ADMIN")) {
              req.user = jwtUser;
              return next();
            }
          }
        } catch {
          // JWT invalid/expired, fall through to x-user-email check
        }
      }

      // 2. Fall back to x-user-email header (legacy/internal — DB lookup required)
      const userEmailHeader = req.headers["x-user-email"];
      const userEmail = Array.isArray(userEmailHeader) ? userEmailHeader[0] : userEmailHeader;
      if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

      const user = await prisma.user.findUnique({
        where: { email: userEmail as string },
        select: { role: true, organizationId: true }
      });

      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      }

      req.user = user;
      next();
    };
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // --- STATUS PAGE ---
  // GET /api/status — deep health check suitable for a public status page.
  // Returns 200 when all critical subsystems are UP; 503 when any are DOWN.
  // Checks: database, AI scoring endpoint, item bank size, session store.
  app.get("/api/status", async (req, res) => {
    const start = Date.now();
    const checks: Record<string, { status: "up" | "down" | "degraded"; latencyMs?: number; detail?: string }> = {};

    // 1. Database
    try {
      const { prisma: db } = await import("./src/lib/prisma.js");
      const t0 = Date.now();
      await db.$queryRaw`SELECT 1`;
      checks.database = { status: "up", latencyMs: Date.now() - t0 };
    } catch (err: any) {
      checks.database = { status: "down", detail: err.message?.slice(0, 120) };
    }

    // 2. Item bank — verify items exist
    try {
      const { prisma: db } = await import("./src/lib/prisma.js");
      const count = await db.item.count({ where: { status: "ACTIVE" } });
      checks.itemBank = { status: count > 0 ? "up" : "degraded", detail: `${count} active items` };
    } catch {
      checks.itemBank = { status: "down" };
    }

    // 3. AI scoring — lightweight env check (actual probe would be expensive)
    const aiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    checks.aiScoring = { status: aiKey ? "up" : "degraded", detail: aiKey ? "API key configured" : "No AI API key — AI scoring unavailable" };

    // 4. Memory / process uptime
    const mem = process.memoryUsage();
    checks.process = {
      status: "up",
      detail: `uptime=${Math.round(process.uptime())}s  rss=${Math.round(mem.rss / 1024 / 1024)}MB  heap=${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    };

    const overallUp = Object.values(checks).every(c => c.status !== "down");
    const httpStatus = overallUp ? 200 : 503;

    res.status(httpStatus).json({
      status:     overallUp ? "operational" : "incident",
      checks,
      totalMs:    Date.now() - start,
      version:    process.env.npm_package_version ?? "unknown",
      env:        process.env.NODE_ENV ?? "development",
      timestamp:  new Date().toISOString(),
    });
  });

  
// --- MOCK MODE FOR UI DEMO WITHOUT DB ---
let mockSessions: Record<string, any> = {};
let mockSessionIdCounter = 0;
function isDBError(err: any) { return err && (err.message || "").includes("DATABASE_URL"); }

// --- ASSESSMENT SESSION API ---
  const { AssessmentService } = await import("./src/lib/assessment-engine/server-engine.js");

  app.post("/api/sessions/launch", authMiddleware, async (req, res) => {
    try {
      const body = validate(SessionLaunchBody, req.body, res);
      if (!body) return;
      const { candidateId, organizationId, productLine } = body;
      let session;
      try {
        session = await AssessmentService.launchSession(
          candidateId || "demo-user", 
          organizationId || "demo-org",
          productLine
        );
      } catch (err: any) {
        if (isDBError(err) || err.name === "PrismaClientInitializationError") {
          const { studioItems } = await import("./src/data/studioItems.js");
          const sId = "demo-session-" + Date.now();
          const filteredItems = productLine && productLine !== "General" && productLine !== "General English" ? studioItems.filter((i: any) => i.productLine === productLine) : studioItems;
          const mappedItems = filteredItems.map((it: any) => ({
            id: it.id,
            skill: it.skill,
            type: it.type,
            metadata: {
              prompt: it.prompt,
              options: it.options?.map((o: any) => o.text),
              correctOption: it.options?.find((o: any) => o.isCorrect)?.text,
              rubric: it.rubric,
              minWords: 30, maxTime: 60
            },
            irtA: it.discrimination,
            irtB: it.difficulty,
            irtC: it.guessing,
            active: true
          }));
          mockSessions[sId] = { progress: 0, productLine, items: mappedItems.length ? mappedItems : [{ id: "fallback1", skill: "READING", type: "MULTIPLE_CHOICE", metadata: { prompt: "Default fallback item", options: ["A", "B", "C"], correctOption: "A" }, irtA:1, irtB:0, irtC:0 }] };
          return res.json({
            sessionId: sId,
            candidateId,
            organizationId,
            productLine,
            status: "STARTED",
            theta: 0,
            sem: 1,
            history: [],
            // DB-down fallback still advertises the full 6-skill order so the
            // UI breadcrumb remains accurate even when the studioItems pool is empty.
            sectionOrder: ["VOCABULARY", "GRAMMAR", "READING", "LISTENING", "WRITING", "SPEAKING"],
          });
        }
        throw err;
      }
      res.json(session);
    } catch (error: any) {
      console.error("LAUNCH ERROR", error);
      // Surface configuration errors (item bank, billing) clearly — they are
      // operational issues the admin needs to act on, not security-sensitive info.
      const msg: string = error?.message ?? "";
      const isConfigError = msg.includes("Item bank is insufficient") ||
                            msg.includes("Insufficient credits") ||
                            msg.includes("profile") ||
                            msg.includes("product line");
      res.status(500).json({ error: isConfigError ? msg : "Failed to launch session" });
    }
  });

  // POST /api/sessions/:id/identity-snapshot
  // Stores a candidate's identity photo (base64 JPEG) taken at exam start.
  // S3 upload is optional — set IDENTITY_SNAPSHOT_BUCKET env var to enable.
  // If S3 is not configured the snapshot URL is omitted but the exam is never blocked.
  app.post("/api/sessions/:id/identity-snapshot", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { frame, failureReason } = req.body as {
      frame?: string | null;
      failureReason?: string;
    };

    // Candidate hit max retries — record the failure and unblock the exam
    if (!frame && failureReason) {
      try {
        if (!id.startsWith("demo-session-")) {
          const existing = await prisma.session.findUnique({
            where: { id },
            select: { metadata: true },
          });
          await prisma.session.update({
            where: { id },
            data: {
              metadata: {
                ...(typeof existing?.metadata === "object" && existing.metadata !== null
                  ? (existing.metadata as Record<string, unknown>)
                  : {}),
                identitySnapshotFailed: true,
                identitySnapshotFailureReason: failureReason,
                identitySnapshotAt: new Date().toISOString(),
              },
            },
          });
        }
      } catch (_) { /* non-fatal */ }
      return res.json({ success: true, skipped: true });
    }

    if (!frame || typeof frame !== "string") {
      return res.status(400).json({ error: "Missing frame" });
    }

    try {
      const base64Data = frame.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      let photoUrl: string | null = null;

      const bucket = process.env.IDENTITY_SNAPSHOT_BUCKET;
      if (bucket) {
        const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3") as any;
        const s3 = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-1" });
        const key = `identity/${id}/${Date.now()}.jpg`;
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: "image/jpeg",
        }));
        photoUrl = `https://${bucket}.s3.amazonaws.com/${key}`;
      }

      if (!id.startsWith("demo-session-")) {
        const existing = await prisma.session.findUnique({
          where: { id },
          select: { metadata: true },
        });
        await prisma.session.update({
          where: { id },
          data: {
            metadata: {
              ...(typeof existing?.metadata === "object" && existing.metadata !== null
                ? (existing.metadata as Record<string, unknown>)
                : {}),
              identitySnapshotUrl: photoUrl ?? "stored-server-side",
              identitySnapshotAt: new Date().toISOString(),
            },
          },
        });
      }

      return res.json({ success: true, url: photoUrl });
    } catch (error) {
      console.error("[identity-snapshot] failed:", error);
      return res.status(500).json({
        error: "Failed to store identity snapshot",
      });
    }
  });

  app.get("/api/sessions/:id/next", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      let next;
      try {
        next = await AssessmentService.getNextItem(id);
      } catch(err: any) {
        if (isDBError(err) || err.name === "PrismaClientInitializationError" || id.startsWith("demo-session-")) {
          const sDate = mockSessions[id];
          if (!sDate) return res.json({ stop: true, finalTheta: 0 });
          if (sDate.progress >= sDate.items.length) {
            return res.json({ stop: true, finalTheta: 1.5 });
          }
          return res.json({ item: sDate.items[sDate.progress], stop: false });
        }
        throw err;
      }
      res.json(next);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch next item" });
    }
  });

  app.post("/api/sessions/:id/respond", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (!(await assertSessionOwnership(req, res, id))) return;
      const body = validate(SessionRespondBody, req.body, res);
      if (!body) return;
      const { itemId, value, latencyMs } = body;
      let result;
      try {
        result = await AssessmentService.submitResponse(id, itemId, value, latencyMs);
      } catch(err: any) {
        if (isDBError(err) || err.name === "PrismaClientInitializationError" || id.startsWith("demo-session-")) {
          if (mockSessions[id]) mockSessions[id].progress++;
          const p = mockSessions[id]?.progress || 0;
          return res.json({ success: true, progress: p, theta: 0.5 + p * 0.2 });
        }
        throw err;
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit response" });
    }
  });

  app.get("/api/sessions/:id/status", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      let status;
      try {
        status = await AssessmentService.getSessionStatus(id);
      } catch(err: any) {
        if (isDBError(err) || err.name === "PrismaClientInitializationError" || id.startsWith("demo-session-")) {
          const sData = mockSessions[id];
          const pr = sData ? sData.progress : 0;
          const max = sData ? sData.items.length : 20;
          return res.json({ progress: pr, maxItems: max, isComplete: pr >= max, currentTheta: 0.5 + (pr * 0.2), cefrLevel: "B1" });
        }
        throw err;
      }
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session status" });
    }
  });

  // --- ITEM EXPOSURE REPORT ---
  app.get("/api/items/exposure-report", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const items = await prisma.item.findMany({
        select: { id: true, skill: true, cefrLevel: true, discrimination: true, status: true },
      });
      const responses = await prisma.response.groupBy({
        by: ["itemId"],
        _count: { itemId: true },
      });
      const usageMap: Record<string, number> = {};
      for (const r of responses) usageMap[r.itemId] = r._count.itemId;

      const totalActive = items.filter((i) => i.status === "ACTIVE").length;
      const neverUsed = items.filter((i) => !usageMap[i.id]).length;
      const overExposureThreshold = 0.3;
      const totalResponses = Object.values(usageMap).reduce((a, b) => a + b, 0) || 1;
      const overExposed = items.filter((i) => (usageMap[i.id] ?? 0) / totalResponses > overExposureThreshold).length;

      // α-strata (3 strata by discrimination)
      const sorted = [...items].sort((a, b) => (a.discrimination ?? 0) - (b.discrimination ?? 0));
      const chunkSize = Math.ceil(sorted.length / 3);
      const strata = [0, 1, 2].map((si) => {
        const chunk = sorted.slice(si * chunkSize, (si + 1) * chunkSize);
        const usedInChunk = chunk.filter((i) => usageMap[i.id]).length;
        const aVals = chunk.map((i) => i.discrimination ?? 0);
        return {
          stratumIndex: si + 1,
          label: `Stratum ${si + 1} (${["Low", "Mid", "High"][si]} α)`,
          totalItems: chunk.length,
          usedItems: usedInChunk,
          usageRate: chunk.length > 0 ? usedInChunk / chunk.length : 0,
          minA: Math.min(...aVals, 0),
          maxA: Math.max(...aVals, 0),
        };
      });

      const bySkill: Record<string, { total: number; active: number; pretest: number; retired: number }> = {};
      for (const i of items) {
        if (!bySkill[i.skill]) bySkill[i.skill] = { total: 0, active: 0, pretest: 0, retired: 0 };
        bySkill[i.skill].total++;
        if (i.status === "ACTIVE") bySkill[i.skill].active++;
        if (i.status === "PRETEST") bySkill[i.skill].pretest++;
        if (i.status === "RETIRED") bySkill[i.skill].retired++;
      }

      const byCefrLevel: Record<string, { total: number; active: number }> = {};
      for (const i of items) {
        if (!byCefrLevel[i.cefrLevel]) byCefrLevel[i.cefrLevel] = { total: 0, active: 0 };
        byCefrLevel[i.cefrLevel].total++;
        if (i.status === "ACTIVE") byCefrLevel[i.cefrLevel].active++;
      }

      res.json({ totalActive, neverUsed, overExposed, overExposureThreshold, strata, bySkill, byCefrLevel });
    } catch (err) {
      res.status(500).json({ error: "Failed to compute exposure report"});
    }
  });

  // --- ITEM BANK API ---
  app.get("/api/items", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER", "INST_ADMIN",
    "LANGUAGE_REVIEWER", "CEFR_REVIEWER", "MODERATOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { stage, skill, cefr, status, limit = "50", offset = "0" } = req.query as Record<string, string>;

      // If pipeline-stage filter requested, use direct prisma query for content-factory workflow
      if (stage || skill || cefr) {
        const where: Record<string, unknown> = {};
        if (stage) where.pipelineStage = stage;
        if (skill) where.skill = skill;
        if (cefr) where.cefrLevel = cefr;
        if (status) where.status = status;

        const items = await prisma.item.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: Math.min(parseInt(limit), 100),
          skip: parseInt(offset),
          select: {
            id: true, itemCode: true, type: true, skill: true, cefrLevel: true,
            status: true, pipelineStage: true, iqScore: true, subskill: true,
            genre: true, topic: true, construct: true, evidenceStatement: true,
            content: true, tags: true, difficulty: true, discrimination: true,
            guessing: true, exposureCount: true, metadata: true,
            ageSuitability: true, culturalLoad: true, englishVariant: true,
            register: true, provenance: true, securityClass: true,
            createdAt: true, updatedAt: true,
            itemReviews: {
              orderBy: { createdAt: "desc" },
              take: 3,
              select: { id: true, reviewType: true, verdict: true, notes: true, createdAt: true },
            },
          },
        });
        return res.json(items);
      }

      const items = await AssessmentService.getAllItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.post("/api/items", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    try {
      const item = await AssessmentService.createItem(req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  // --- ITEM GENERATION (AI) — Single spec ---
  // Optional body field: autoGenerateAudio: boolean
  //   When true and skill === LISTENING, triggers TTS generation for each item
  //   that has a ttsScript, patches audioUrl, and returns audioResults in the response.
  app.post("/api/items/generate", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    try {
      const { itemGenerator } = await import("./src/lib/language-skills/ai-item-generator.js");
      const { autoGenerateAudio, ...spec } = req.body;
      if (!spec.skill || !spec.level || !spec.format) {
        return res.status(400).json({ error: "skill, level, and format are required" });
      }
      spec.quantity = Math.min(Number(spec.quantity) || 1, 5);
      const result = await itemGenerator.generate(spec);

      // Optional: generate TTS audio for LISTENING items immediately after generation
      if (autoGenerateAudio && spec.skill === "LISTENING" && dbAvailable) {
        const audioResults: Record<string, unknown>[] = [];
        try {
          const { generateListeningAudio } = await import("./src/lib/audio/tts-generator.js");
          for (const item of result.items) {
            if (item.ttsScript && item.moduleId) {
              const audio = await generateListeningAudio({
                moduleId: item.moduleId,
                ttsScript: item.ttsScript,
                cefrLevel: item.cefrLevel,
                productLine: (spec as any).productLine,
              });
              (item as any).audioUrl = audio.audioUrl;
              audioResults.push({ moduleId: item.moduleId, ...audio });
            }
          }
        } catch (audioErr) {
          console.error("[generate] autoGenerateAudio failed:", audioErr);
          // Non-fatal — items still returned without audio
        }
        return res.json({ ...result, audioResults });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Item generation failed"});
    }
  });

  // --- ITEM GENERATION (AI) — Bulk (multiple specs) ---
  app.post("/api/items/generate/bulk", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    try {
      const { itemGenerator } = await import("./src/lib/language-skills/ai-item-generator.js");
      const { specs } = req.body;
      if (!Array.isArray(specs) || specs.length === 0) {
        return res.status(400).json({ error: "specs array is required" });
      }
      if (specs.length > 20) {
        return res.status(400).json({ error: "Maximum 20 specs per bulk request" });
      }
      for (const s of specs) {
        if (!s.skill || !s.level || !s.format) {
          return res.status(400).json({ error: "Each spec requires skill, level, and format" });
        }
        s.quantity = Math.min(Number(s.quantity) || 1, 5);
      }
      const results = await itemGenerator.generateBulk(specs);
      res.json({ results, totalSpecs: specs.length });
    } catch (error) {
      res.status(500).json({ error: "Bulk generation failed"});
    }
  });

  // --- ITEM GENERATION PREVIEW (generate without persisting to bank) ---
  app.post("/api/items/preview", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    try {
      const { itemGenerator } = await import("./src/lib/language-skills/ai-item-generator.js");
      const spec = req.body;
      if (!spec.skill || !spec.level || !spec.format) {
        return res.status(400).json({ error: "skill, level, and format are required" });
      }
      spec.quantity = 1; // Preview always generates exactly 1 item
      const result = await itemGenerator.generate(spec);
      // Return just the first item with full pipeline data — does NOT save to DB
      res.json({ preview: result.items[0] ?? null, generationModel: result.generationModel });
    } catch (error) {
      res.status(500).json({ error: "Preview generation failed"});
    }
  });

  // --- ITEM QUALITY VALIDATION ---
  app.get("/api/items/:id/validate", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { validateItem } = await import("./src/lib/language-skills/item-quality-validator.js");
      const dbItem = await (await import("./src/lib/prisma.js")).prisma.item.findUnique({ where: { id } });
      if (!dbItem) return res.status(404).json({ error: "Item not found" });
      const report = validateItem({
        skill: dbItem.skill,
        cefrLevel: dbItem.cefrLevel,
        type: dbItem.type,
        discrimination: dbItem.discrimination,
        difficulty: dbItem.difficulty,
        guessing: dbItem.guessing,
        content: dbItem.content as any,
      });
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Validation failed"});
    }
  });

  // --- ITEM QUALITY SCORE (IQS) ---
  // GET  /api/items/:id/iqs  — compute IQS for a persisted item (does NOT persist)
  // POST /api/items/:id/iqs  — compute IQS AND write iqScore back to DB
  app.get("/api/items/:id/iqs", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { calculateIqs } = await import("./src/lib/psychometrics/item-quality-score.js");
      const dbItem = await (await import("./src/lib/prisma.js")).prisma.item.findUnique({ where: { id } });
      if (!dbItem) return res.status(404).json({ error: "Item not found" });
      const result = calculateIqs({
        skill: dbItem.skill,
        cefrLevel: dbItem.cefrLevel,
        type: dbItem.type,
        discrimination: dbItem.discrimination,
        difficulty: dbItem.difficulty,
        guessing: dbItem.guessing,
        content: dbItem.content as any,
        tags: dbItem.tags,
        metadata: dbItem.metadata as any,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "IQS calculation failed"});
    }
  });

  app.post("/api/items/:id/iqs", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { computeAndPersistIqs } = await import("./src/lib/psychometrics/item-quality-score.js");
      const result = await computeAndPersistIqs(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "IQS persist failed"});
    }
  });

  // --- IQS BATCH RUN ---
  // POST /api/items/iqs/batch — compute & persist IQS for all (or unscored) items.
  // Query params:
  //   ?onlyUnscored=true  (default true)  — skip items that already have iqScore set
  //   ?concurrency=5      (default 5)     — parallel workers
  // Response: NDJSON stream of progress events so the client can render a live progress bar.
  app.post("/api/items/iqs/batch", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const onlyUnscored = req.query.onlyUnscored !== "false";
    const concurrency  = Math.min(Math.max(parseInt(String(req.query.concurrency ?? "5"), 10), 1), 20);

    try {
      const { computeAndPersistIqs } = await import("./src/lib/psychometrics/item-quality-score.js");
      const { prisma: db }            = await import("./src/lib/prisma.js");

      const where = onlyUnscored ? { iqScore: null } : {};
      const ids   = await db.item.findMany({ where, select: { id: true } });
      const total = ids.length;

      // Stream NDJSON so the caller can track progress
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Transfer-Encoding", "chunked");
      res.flushHeaders();

      const write = (obj: object) => res.write(JSON.stringify(obj) + "\n");
      write({ event: "start", total, concurrency, onlyUnscored });

      let done = 0; let failed = 0;
      const queue = [...ids.map(r => r.id)];

      async function worker() {
        while (queue.length > 0) {
          const id = queue.shift();
          if (!id) break;
          try {
            const result = await computeAndPersistIqs(id);
            done++;
            if (done % 50 === 0 || done === total) {
              write({ event: "progress", done, failed, total, pct: Math.round((done + failed) / total * 100) });
            }
          } catch (err: any) {
            failed++;
            write({ event: "error", id, error: "Processing failed" });
          }
        }
      }

      await Promise.all(Array.from({ length: concurrency }, worker));
      write({ event: "done", done, failed, total });
      res.end();
    } catch (error) {
      if (!res.headersSent) res.status(500).json({ error: "IQS batch failed"});
      else res.end(JSON.stringify({ event: "fatal", error: "Internal server error" }) + "\n");
    }
  });

  app.put("/api/items/:id", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    try {
      const { id } = req.params;
      const item = await AssessmentService.updateItem(id, req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { id } = req.params;
      await AssessmentService.deleteItem(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.post("/api/items/:id/assets", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await AssessmentService.addItemAsset(id, req.body);
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to add asset" });
    }
  });

  // --- IN-APP LISTENING AUDIO GENERATION (Gemini 2.5 Flash TTS) ---
  // Reads item.content.ttsScript + item.content.moduleId from DB,
  // generates WAV, saves to public/audio/, patches content.audioUrl.
  app.post(
    "/api/items/:id/generate-audio",
    authMiddleware,
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]),
    async (req: any, res) => {
      const { id } = req.params;
      try {
        if (!dbAvailable) {
          return res.status(503).json({ error: "Audio generation requires a database connection" });
        }
        const { prisma: db } = await import("./src/lib/prisma.js");
        const item = await db.item.findUnique({ where: { id } });
        if (!item) return res.status(404).json({ error: "Item not found" });
        if (item.skill !== "LISTENING") {
          return res.status(400).json({ error: "Audio generation is only available for LISTENING items" });
        }
        const content = (item.content as Record<string, any>) ?? {};
        const ttsScript: string | undefined = content.ttsScript;
        const moduleId: string = (content.moduleId as string | undefined) ?? id;
        if (!ttsScript) {
          return res.status(400).json({ error: "Item has no ttsScript in content. Generate or add a ttsScript first." });
        }
        const { generateListeningAudio } = await import("./src/lib/audio/tts-generator.js");
        const result = await generateListeningAudio({
          moduleId,
          ttsScript,
          cefrLevel: item.cefrLevel,
          productLine: content.productLine,
        });
        // Patch audioUrl back into item content
        await db.item.update({
          where: { id },
          data: { content: { ...content, audioUrl: result.audioUrl, moduleId } },
        });
        res.json({
          audioUrl: result.audioUrl,
          durationSeconds: result.durationSeconds,
          voiceName: result.voiceName,
          fileSizeKb: result.fileSizeKb,
        });
      } catch (err: any) {
        console.error("[generate-audio]", err);
        res.status(500).json({ error: "Audio generation failed"});
      }
    }
  );

  app.delete("/api/assets/:id", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    try {
      const { id } = req.params;
      await AssessmentService.deleteAsset(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // ── CONTENT FACTORY APIs ──────────────────────────────────────────────────

  const CONTENT_FACTORY_ROLES = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN",
    "ITEM_WRITER", "LANGUAGE_REVIEWER", "CEFR_REVIEWER", "MODERATOR", "PSYCHOMETRICIAN"];

  // POST /api/content/batch/generate — blueprint-aware controlled batch generation (§131-133)
  // Takes a precise blueprint cell spec; generates AI drafts → stores as AI_DRAFT → returns summary.
  // NEVER auto-publishes. Items must pass human review pipeline before going live.
  app.post("/api/content/batch/generate",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN", "ITEM_WRITER"]),
    async (req: any, res) => {
      try {
        if (!dbAvailable) return res.status(503).json({ error: "Database required for batch generation" });
        if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "GEMINI_API_KEY not configured" });

        const { cell, count = 5, notes } = req.body;
        if (!cell?.cefr || !cell?.skill || !cell?.subskill) {
          return res.status(400).json({ error: "cell.cefr, cell.skill, cell.subskill are required" });
        }
        if (count < 1 || count > 20) {
          return res.status(400).json({ error: "count must be 1–20 (§190 controlled batches)" });
        }

        const { runBatchGeneration } = await import("./src/lib/content-factory/batch-generator.js");
        const result = await runBatchGeneration({
          cell,
          count,
          triggeredBy: req.user.userId,
          notes: notes ?? undefined,
        });

        return res.json(result);
      } catch (err) {
        console.error("[content/batch/generate]", err);
        res.status(500).json({ error: "Batch generation failed", detail: (err as Error).message });
      }
    }
  );

  // GET /api/content/batch/:batchId/feedback — rejection reason analysis (§194)
  app.get("/api/content/batch/:batchId/feedback",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]),
    async (req, res) => {
      try {
        if (!dbAvailable) return res.json({});
        const { getBatchFeedback } = await import("./src/lib/content-factory/batch-generator.js");
        const feedback = await getBatchFeedback(req.params.batchId);
        return res.json(feedback);
      } catch (err) {
        res.status(500).json({ error: "Failed to get batch feedback" });
      }
    }
  );

  // POST /api/content/duplicates/check — ad-hoc semantic duplicate check for a given item text
  // Body: { text: string, skill: string, cefrLevel: string, excludeId?: string }
  // Returns: { isDuplicate, isNearMatch, topMatch, nearMatches }
  app.post("/api/content/duplicates/check",
    checkRole(CONTENT_FACTORY_ROLES),
    async (req: any, res) => {
      try {
        if (!dbAvailable) return res.status(503).json({ error: "Database required" });
        if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "GEMINI_API_KEY not configured" });

        const { text, skill, cefrLevel, excludeId } = req.body;
        if (!text || !skill || !cefrLevel) {
          return res.status(400).json({ error: "text, skill, and cefrLevel are required" });
        }

        const { embedText, checkDuplicate } = await import("./src/lib/content-factory/duplicate-detector.js");
        const embedding = await embedText(String(text));
        const result = await checkDuplicate(embedding, skill, cefrLevel, excludeId);
        res.json({ result, embeddingDim: embedding.length });
      } catch (err) {
        console.error("[content/duplicates/check]", err);
        res.status(500).json({ error: "Duplicate check failed" });
      }
    }
  );

  // POST /api/content/duplicates/backfill — retroactively embed items that predate dedup
  // Body: { skill?: string, cefrLevel?: string, maxItems?: number }
  app.post("/api/content/duplicates/backfill",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (req: any, res) => {
      try {
        if (!dbAvailable) return res.status(503).json({ error: "Database required" });
        if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "GEMINI_API_KEY not configured" });

        const { skill, cefrLevel, maxItems = 200 } = req.body;
        const { backfillEmbeddings } = await import("./src/lib/content-factory/duplicate-detector.js");
        const result = await backfillEmbeddings(skill, cefrLevel, Math.min(Number(maxItems), 500));
        res.json(result);
      } catch (err) {
        console.error("[content/duplicates/backfill]", err);
        res.status(500).json({ error: "Backfill failed" });
      }
    }
  );

  // GET /api/content/coverage — CEFR × Skill × Subskill coverage heatmap
  app.get("/api/content/coverage", checkRole(CONTENT_FACTORY_ROLES), async (_req, res) => {
    try {
      if (!dbAvailable) return res.json({ heatmap: {}, totals: {}, byPipeline: {} });

      const items = await prisma.item.findMany({
        select: { skill: true, cefrLevel: true, subskill: true, status: true, pipelineStage: true, iqScore: true },
      });

      // CEFR × Skill count matrix
      const heatmap: Record<string, Record<string, number>> = {};
      const byPipeline: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const subskillGaps: Record<string, Record<string, number>> = {}; // skill → subskill → count

      for (const it of items) {
        // heatmap[cefrLevel][skill]
        if (!heatmap[it.cefrLevel]) heatmap[it.cefrLevel] = {};
        heatmap[it.cefrLevel][it.skill] = (heatmap[it.cefrLevel][it.skill] ?? 0) + 1;

        // pipeline stage counts
        const stage = (it.pipelineStage as string) ?? "AI_DRAFT";
        byPipeline[stage] = (byPipeline[stage] ?? 0) + 1;

        // status counts
        byStatus[it.status] = (byStatus[it.status] ?? 0) + 1;

        // subskill coverage
        if (it.subskill) {
          const key = `${it.skill}:${it.cefrLevel}`;
          if (!subskillGaps[key]) subskillGaps[key] = {};
          subskillGaps[key][it.subskill] = (subskillGaps[key][it.subskill] ?? 0) + 1;
        }
      }

      const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
      const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];

      // Target coverage per cell (from bank depth ratio §121: need >> items in pool)
      const PHASE1_TARGET = 50; // Phase 1 minimum per cell
      const gaps: Array<{ cefr: string; skill: string; have: number; need: number; priority: "HIGH" | "MEDIUM" | "LOW" }> = [];

      for (const cefr of CEFR_ORDER) {
        for (const skill of SKILLS) {
          const have = heatmap[cefr]?.[skill] ?? 0;
          const need = Math.max(0, PHASE1_TARGET - have);
          if (need > 0) {
            gaps.push({
              cefr,
              skill,
              have,
              need,
              priority: have === 0 ? "HIGH" : have < 20 ? "MEDIUM" : "LOW",
            });
          }
        }
      }

      gaps.sort((a, b) => b.need - a.need);

      return res.json({
        heatmap,
        byPipeline,
        byStatus,
        subskillGaps,
        gaps: gaps.slice(0, 20), // top 20 gaps
        totalItems: items.length,
        liveItems: byStatus["ACTIVE"] ?? 0,
        pilotItems: byStatus["PRETEST"] ?? 0,
        draftItems: (byStatus["DRAFT"] ?? 0) + (byStatus["REVIEW"] ?? 0),
        phase1TargetPct: Math.round(
          (items.length / (CEFR_ORDER.length * SKILLS.length * PHASE1_TARGET)) * 100
        ),
      });
    } catch (err) {
      console.error("[content/coverage]", err);
      res.status(500).json({ error: "Failed to compute coverage" });
    }
  });

  // GET /api/content/gaps — prioritised production queue
  app.get("/api/content/gaps", checkRole(CONTENT_FACTORY_ROLES), async (req, res) => {
    try {
      if (!dbAvailable) return res.json({ gaps: [] });
      const { skill, cefr } = req.query as Record<string, string>;

      const where: any = { status: { not: "RETIRED" } };
      if (skill) where.skill = skill;
      if (cefr) where.cefrLevel = cefr;

      const items = await prisma.item.groupBy({
        by: ["skill", "cefrLevel", "subskill"],
        _count: { id: true },
        where,
      });

      const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];
      const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
      const TARGET = 50;

      const countMap: Record<string, number> = {};
      for (const row of items) {
        const key = `${row.skill}:${row.cefrLevel}:${row.subskill ?? "_"}`;
        countMap[key] = row._count.id;
      }

      const gaps = [];
      for (const s of (skill ? [skill] : SKILLS)) {
        for (const c of (cefr ? [cefr] : CEFR_ORDER)) {
          const key = `${s}:${c}:_`;
          const have = countMap[key] ?? 0;
          const need = Math.max(0, TARGET - have);
          if (need > 0) {
            gaps.push({ skill: s, cefr: c, subskill: null, have, need, priority: have < 10 ? "HIGH" : "MEDIUM" });
          }
        }
      }

      gaps.sort((a, b) => b.need - a.need);
      return res.json({ gaps });
    } catch (err) {
      res.status(500).json({ error: "Failed to compute gaps" });
    }
  });

  // GET /api/content/dashboard — command center snapshot
  app.get("/api/content/dashboard", checkRole(CONTENT_FACTORY_ROLES), async (_req, res) => {
    try {
      if (!dbAvailable) return res.json({ mock: true });

      const [total, byStatus, awaitingReview, flagged, recentReviews] = await Promise.all([
        prisma.item.count(),
        prisma.item.groupBy({ by: ["status"], _count: { id: true } }),
        prisma.item.count({ where: { pipelineStage: { in: ["LANGUAGE_REVIEW", "CEFR_REVIEW", "FAIRNESS_REVIEW", "MODERATION"] as any } } }),
        prisma.item.count({ where: { pipelineStage: "FLAGGED" as any } }),
        prisma.itemReview.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, itemId: true, reviewType: true, verdict: true, createdAt: true },
        }),
      ]);

      const statusMap: Record<string, number> = {};
      for (const row of byStatus) statusMap[row.status] = row._count.id;

      return res.json({
        total,
        live: statusMap["ACTIVE"] ?? 0,
        pilot: statusMap["PRETEST"] ?? 0,
        draft: statusMap["DRAFT"] ?? 0,
        review: statusMap["REVIEW"] ?? 0,
        retired: statusMap["RETIRED"] ?? 0,
        awaitingReview,
        flagged,
        recentReviews,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  // GET /api/content/scale-gate — §192 health check before scaling batch size
  // Returns: rejection rate, reviewer agreement, duplicate block rate, recommendation
  app.get("/api/content/scale-gate", checkRole(CONTENT_FACTORY_ROLES), async (_req, res) => {
    try {
      if (!dbAvailable) return res.json({ mock: true });

      // Last 100 reviews
      const recentReviews = await prisma.itemReview.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { verdict: true, reviewType: true, itemId: true, cefrFit: true, constructClarity: true, languageNaturalness: true, distractorQuality: true, fairnessScore: true },
      });

      const totalReviews = recentReviews.length;
      const rejected = recentReviews.filter((r) => r.verdict === "REJECT").length;
      const majorRevision = recentReviews.filter((r) => r.verdict === "MAJOR_REVISION").length;
      const approved = recentReviews.filter((r) => r.verdict === "APPROVE").length;
      const rejectionRate = totalReviews > 0 ? (rejected + majorRevision) / totalReviews : null;
      const approvalRate = totalReviews > 0 ? approved / totalReviews : null;

      // Reviewer agreement: for items reviewed by >1 reviewer, check verdict consensus
      const itemVerdictMap = new Map<string, string[]>();
      for (const r of recentReviews) {
        const list = itemVerdictMap.get(r.itemId) ?? [];
        list.push(r.verdict);
        itemVerdictMap.set(r.itemId, list);
      }
      const multiReviewed = [...itemVerdictMap.values()].filter((v) => v.length > 1);
      const agreedItems = multiReviewed.filter((v) => new Set(v).size === 1).length;
      const reviewerAgreement = multiReviewed.length > 0 ? agreedItems / multiReviewed.length : null;

      // Duplicate block rate from last 7 days (read from item metadata)
      const recentItems = await prisma.item.findMany({
        where: {
          pipelineStage: { in: ["AI_DRAFT", "LANGUAGE_REVIEW", "CEFR_REVIEW"] as any[] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
        },
        select: { metadata: true },
      });
      const withNearMatch = recentItems.filter((i) => {
        const m = i.metadata as Record<string, unknown> | null;
        return m?.nearMatchWarning != null;
      }).length;
      const duplicateWarningRate = recentItems.length > 0 ? withNearMatch / recentItems.length : null;

      // Avg dimension scores
      const avgDims = recentReviews.reduce(
        (acc, r) => {
          acc.cefrFit += r.cefrFit ?? 0;
          acc.constructClarity += r.constructClarity ?? 0;
          acc.languageNaturalness += r.languageNaturalness ?? 0;
          acc.distractorQuality += r.distractorQuality ?? 0;
          acc.fairnessScore += r.fairnessScore ?? 0;
          acc.n++;
          return acc;
        },
        { cefrFit: 0, constructClarity: 0, languageNaturalness: 0, distractorQuality: 0, fairnessScore: 0, n: 0 },
      );
      const divN = Math.max(avgDims.n, 1);
      const avgScores = {
        cefrFit: Math.round(avgDims.cefrFit / divN),
        constructClarity: Math.round(avgDims.constructClarity / divN),
        languageNaturalness: Math.round(avgDims.languageNaturalness / divN),
        distractorQuality: Math.round(avgDims.distractorQuality / divN),
        fairnessScore: Math.round(avgDims.fairnessScore / divN),
      };

      // Gate decision (§192):
      // - rejection rate < 30%  ✓
      // - reviewer agreement > 80% (if data available)  ✓
      // - avg CEFR fit score ≥ 65  ✓
      const gates = {
        rejectionRateOk: rejectionRate !== null ? rejectionRate < 0.30 : null,
        reviewerAgreementOk: reviewerAgreement !== null ? reviewerAgreement >= 0.80 : null,
        cefrFitOk: avgScores.cefrFit >= 65,
        minSampleReached: totalReviews >= 20,
      };
      const passedGates = Object.values(gates).filter((v) => v === true).length;
      const testedGates = Object.values(gates).filter((v) => v !== null).length;
      const recommendation =
        !gates.minSampleReached ? "NOT_READY: review at least 20 items before evaluating scale gate" :
        gates.rejectionRateOk === false ? "NOT_READY: rejection rate ≥ 30% — diagnose prompt or blueprint before scaling" :
        gates.reviewerAgreementOk === false ? "NOT_READY: reviewer agreement < 80% — calibrate reviewers with anchor examples" :
        !gates.cefrFitOk ? "NOT_READY: avg CEFR fit score < 65 — check cell specification and generation prompt" :
        "READY: all gates passed — safe to scale to 100-item batches";

      res.json({
        snapshot: { totalReviews, approved, rejected, majorRevision },
        rates: { rejectionRate, approvalRate, reviewerAgreement, duplicateWarningRate },
        avgDimensionScores: avgScores,
        gates,
        passedGates,
        testedGates,
        recommendation,
      });
    } catch (err) {
      console.error("[content/scale-gate]", err);
      res.status(500).json({ error: "Scale gate check failed" });
    }
  });

  // POST /api/content/item-codes/backfill — assign itemCode to items that have none
  app.post("/api/content/item-codes/backfill",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (req: any, res) => {
      try {
        if (!dbAvailable) return res.status(503).json({ error: "Database required" });
        const maxItems = Math.min(Number(req.body?.maxItems ?? 500), 2000);
        const { backfillItemCodes } = await import("./src/lib/content-factory/item-codes.js");
        const result = await backfillItemCodes(maxItems);
        res.json(result);
      } catch (err) {
        console.error("[content/item-codes/backfill]", err);
        res.status(500).json({ error: "Item code backfill failed" });
      }
    }
  );

  // ── PILOT PIPELINE ────────────────────────────────────────────────────────────

  // POST /api/content/pilot/promote — APPROVED_FOR_PILOT → isPretest=true + status=PRETEST
  // ?dryRun=true  returns candidate list without committing.
  app.post("/api/content/pilot/promote",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (req: any, res) => {
      try {
        if (!dbAvailable) return res.status(503).json({ error: "Database required" });
        const dryRun = String(req.query.dryRun ?? req.body?.dryRun) === "true";

        const candidates = await prisma.item.findMany({
          where: { pipelineStage: "APPROVED_FOR_PILOT" as any },
          select: { id: true, skill: true, cefrLevel: true, subskill: true, itemCode: true, iqScore: true },
        });

        if (dryRun) return res.json({ dryRun: true, candidates, count: candidates.length });

        // Promote: set status=PRETEST, isPretest=true, pipelineStage=PILOT
        // The assessment engine picks up PRETEST items and embeds them silently in live sessions.
        const ids = candidates.map((c) => c.id);
        await prisma.item.updateMany({
          where: { id: { in: ids } },
          data: {
            status: "PRETEST",
            isPretest: true,
            pipelineStage: "PILOT" as any,
            metadata: undefined, // keep existing metadata
          },
        });

        // Log each promotion in metadata
        for (const item of candidates) {
          await prisma.item.update({
            where: { id: item.id },
            data: {
              metadata: {
                pilotStartedAt: new Date().toISOString(),
                promotedBy: req.user?.id ?? "system",
              } as any,
            },
          });
        }

        res.json({ promoted: ids.length, ids, message: "Items are now PRETEST — will be embedded as silent pretests in live sessions" });
      } catch (err) {
        console.error("[content/pilot/promote]", err);
        res.status(500).json({ error: "Pilot promotion failed" });
      }
    }
  );

  // GET /api/content/monitor — live health of PILOT (PRETEST) items
  // Returns per-item: response count, p-value, IQS, DIF status, calibration readiness
  app.get("/api/content/monitor", checkRole(CONTENT_FACTORY_ROLES), async (_req, res) => {
    try {
      if (!dbAvailable) return res.json({ items: [], summary: {} });

      const pilotItems = await prisma.item.findMany({
        where: {
          OR: [
            { pipelineStage: "PILOT" as any },
            { pipelineStage: "CALIBRATION" as any },
          ],
        },
        select: {
          id: true, itemCode: true, skill: true, cefrLevel: true, subskill: true,
          difficulty: true, iqScore: true, difStatus: true,
          pipelineStage: true, status: true, isPretest: true,
          createdAt: true,
          responses: {
            where: { isPretest: true },
            select: { score: true, latencyMs: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      const CALIBRATION_THRESHOLD = 200;
      const IQS_MIN = 65;

      const items = pilotItems.map((item) => {
        const responses = item.responses;
        const nResponses = responses.length;
        const pValue = nResponses > 0
          ? responses.filter((r) => (r.score ?? 0) > 0).length / nResponses
          : null;
        const avgLatencyMs = nResponses > 0
          ? Math.round(responses.reduce((s, r) => s + (r.latencyMs ?? 0), 0) / nResponses)
          : null;

        // Expected p-value from IRT 3PL at θ=0 (population mean)
        const b = item.difficulty;
        const expectedP = 0.25 + 0.75 * (1 / (1 + Math.exp(-1.0 * (0 - b))));

        const drift = pValue !== null ? Math.abs(pValue - expectedP) : null;
        const isDrifting = drift !== null && drift > 0.20;

        const calibrationReady =
          nResponses >= CALIBRATION_THRESHOLD &&
          (item.iqScore ?? 0) >= IQS_MIN &&
          item.pipelineStage === "PILOT" &&
          !isDrifting;

        const status =
          calibrationReady ? "CALIBRATION_READY" :
          isDrifting ? "DRIFTING" :
          item.difStatus === "FLAGGED" ? "DIF_FLAGGED" :
          nResponses >= CALIBRATION_THRESHOLD ? "AWAITING_CALIBRATION_REVIEW" :
          nResponses > 0 ? "COLLECTING" :
          "AWAITING_EXPOSURE";

        return {
          id: item.id,
          itemCode: item.itemCode,
          skill: item.skill,
          cefrLevel: item.cefrLevel,
          subskill: item.subskill,
          pipelineStage: item.pipelineStage,
          nResponses,
          pValue: pValue !== null ? Math.round(pValue * 1000) / 1000 : null,
          expectedP: Math.round(expectedP * 1000) / 1000,
          drift: drift !== null ? Math.round(drift * 1000) / 1000 : null,
          avgLatencyMs,
          iqScore: item.iqScore,
          difStatus: item.difStatus ?? "CLEAR",
          calibrationReady,
          isDrifting,
          status,
          daysInPilot: Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86400000),
        };
      });

      const summary = {
        total: items.length,
        collecting: items.filter((i) => i.status === "COLLECTING").length,
        calibrationReady: items.filter((i) => i.status === "CALIBRATION_READY").length,
        drifting: items.filter((i) => i.isDrifting).length,
        difFlagged: items.filter((i) => i.difStatus === "FLAGGED").length,
        awaitingExposure: items.filter((i) => i.status === "AWAITING_EXPOSURE").length,
      };

      res.json({ items, summary, calibrationThreshold: CALIBRATION_THRESHOLD });
    } catch (err) {
      console.error("[content/monitor]", err);
      res.status(500).json({ error: "Monitor fetch failed" });
    }
  });

  // POST /api/content/calibration/promote — PILOT items with ≥200 responses → CALIBRATION stage
  app.post("/api/content/calibration/promote",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "PSYCHOMETRICIAN"]),
    async (req: any, res) => {
      try {
        if (!dbAvailable) return res.status(503).json({ error: "Database required" });

        // Find items already identified as CALIBRATION_READY by the monitor
        // We re-derive here rather than trusting the client to pass IDs
        const pilotItems = await prisma.item.findMany({
          where: { pipelineStage: "PILOT" as any },
          select: {
            id: true, itemCode: true, skill: true, cefrLevel: true,
            iqScore: true, difficulty: true,
            responses: { where: { isPretest: true }, select: { score: true } },
          },
        });

        const readyIds = pilotItems
          .filter((item) => {
            const n = item.responses.length;
            if (n < 200) return false;
            if ((item.iqScore ?? 0) < 65) return false;
            return true;
          })
          .map((item) => item.id);

        if (readyIds.length === 0) {
          return res.json({ promoted: 0, message: "No items meet calibration threshold (≥200 responses, IQS ≥65)" });
        }

        await prisma.item.updateMany({
          where: { id: { in: readyIds } },
          data: { pipelineStage: "CALIBRATION" as any },
        });

        res.json({ promoted: readyIds.length, ids: readyIds });
      } catch (err) {
        console.error("[content/calibration/promote]", err);
        res.status(500).json({ error: "Calibration promotion failed" });
      }
    }
  );

  // POST /api/items/:id/review — submit a review record
  app.post("/api/items/:id/review",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "LANGUAGE_REVIEWER", "CEFR_REVIEWER", "MODERATOR", "CONTENT_ADMIN"]),
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const reviewerId = req.user.userId;
        const { reviewType, verdict, stageTarget, notes, revisionsReq,
          constructClarity, cefrFit, cefrFitLabel, languageNaturalness,
          distractorQuality, fairnessScore, ambiguityRisk } = req.body;

        if (!["APPROVE", "MINOR_REVISION", "MAJOR_REVISION", "REJECT"].includes(verdict)) {
          return res.status(400).json({ error: "Invalid verdict" });
        }

        const review = await prisma.itemReview.create({
          data: {
            itemId: id, reviewerId, reviewType, verdict,
            stageTarget: stageTarget ?? null,
            notes: notes ?? null,
            revisionsReq: revisionsReq ?? [],
            constructClarity: constructClarity ?? null,
            cefrFit: cefrFit ?? null,
            cefrFitLabel: cefrFitLabel ?? null,
            languageNaturalness: languageNaturalness ?? null,
            distractorQuality: distractorQuality ?? null,
            fairnessScore: fairnessScore ?? null,
            ambiguityRisk: ambiguityRisk ?? null,
          },
        });

        // Advance pipeline stage on APPROVE
        if (verdict === "APPROVE" && stageTarget) {
          await prisma.item.update({
            where: { id },
            data: { pipelineStage: stageTarget as any },
          });
        }

        return res.json({ review });
      } catch (err) {
        console.error("[items/:id/review]", err);
        res.status(500).json({ error: "Failed to submit review" });
      }
    }
  );

  // POST /api/items/:id/pipeline — advance or set pipelineStage
  app.post("/api/items/:id/pipeline",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { stage } = req.body;
        const item = await prisma.item.update({
          where: { id },
          data: { pipelineStage: stage as any },
          select: { id: true, pipelineStage: true, status: true },
        });
        return res.json(item);
      } catch (err) {
        res.status(500).json({ error: "Failed to update pipeline stage" });
      }
    }
  );

  // GET /api/items/:id/reviews — list review history for an item
  app.get("/api/items/:id/reviews",
    checkRole(CONTENT_FACTORY_ROLES),
    async (req, res) => {
      try {
        const { id } = req.params;
        const reviews = await prisma.itemReview.findMany({
          where: { itemId: id },
          orderBy: { createdAt: "desc" },
        });
        return res.json({ reviews });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch reviews" });
      }
    }
  );

  // --- RATING QUEUE API ---
  const { RatingQueueService } = await import("./src/lib/scoring/rating-queue.js");

  app.get("/api/rating/tasks", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "RATER"]), async (req, res) => {
    try {
      const { status } = req.query;
      const tasks = await RatingQueueService.getTasks(status as any);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rating tasks" });
    }
  });

  app.post("/api/rating/tasks/:id/claim", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "RATER"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { raterId } = req.body;
      const task = await RatingQueueService.claimTask(id, raterId);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to claim task" });
    }
  });

  app.post("/api/rating/tasks/:id/submit", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "RATER"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { score, feedback } = req.body;
      const task = await RatingQueueService.submitRating(id, score, feedback);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit rating" });
    }
  });

  // --- BRANDING & ANALYTICS API ---
  const { BrandingService } = await import("./src/lib/tenant/branding-service.js");
  const { AnalyticsService } = await import("./src/lib/analytics/analytics-service.js");

  app.get("/api/branding/:orgId", async (req, res) => {
    try {
      const { orgId } = req.params;
      const branding = await BrandingService.getBranding(orgId);
      res.json(branding);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch branding" });
    }
  });

  // --- REPORTING API ---
  const { ReportingService } = await import("./src/lib/reporting/reporting-service.js");

  app.get("/api/analytics/cohort", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]), async (req, res) => {
    try {
      const { organizationId } = req.query;
      if (!organizationId) return res.status(400).json({ error: "Organization ID required" });
      const analytics = await ReportingService.getCohortAnalytics(organizationId as string);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // --- ONBOARDING API ---
  const { BulkOnboardingService } = await import("./src/lib/onboarding/bulk-onboarding-service.js");

  app.post("/api/onboarding/bulk", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]), async (req, res) => {
    try {
      const { candidates } = req.body;
      if (!Array.isArray(candidates)) return res.status(400).json({ error: "Invalid candidates list" });
      const results = await BulkOnboardingService.onboardingCandidates(candidates);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to process bulk onboarding" });
    }
  });

  // --- EXAM CODES API ---
  app.post("/api/codes/generate", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]), async (req, res) => {
    try {
      const { organizationId, productLine, count = 1, prefix = "E", expiresAt } = req.body;
      const targetOrg = organizationId || "b4skills-demo";

      // Ensure the organization exists to prevent foreign key errors
      const org = await prisma.organization.findUnique({ where: { id: targetOrg } });
      if (!org) {
        await prisma.organization.create({
          data: {
            id: targetOrg,
            name: targetOrg,
            slug: targetOrg + "-" + Date.now()
          }
        });
      }

      const codes = [];
      const generated = new Date();
      for(let i = 0; i < count; i++) {
        // Generate a random string 8 chars
        const ran = crypto.randomBytes(4).toString("hex").toUpperCase() + crypto.randomBytes(4).toString("hex").toUpperCase();
        codes.push(`${prefix}-${ran}`);
      }
      
      const created = await prisma.examCode.createMany({
        data: codes.map(c => ({
          code: c,
          organizationId: targetOrg,
          productLine: productLine || "General",
          createdAt: generated,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        }))
      });
      res.json({ message: `Generated ${created.count} codes`, codes });
    } catch(err) {
      console.error("Exam Code Generation Error:", err);
      res.status(500).json({ error: "Fail to generate codes"});
    }
  });

  app.post("/api/codes/validate", async (req, res) => {
    try {
      const { code } = req.body;
      const examCode = await prisma.examCode.findUnique({ where: { code } });
      if(!examCode) return res.status(404).json({ error: "Code not found" });
      if(examCode.isUsed) return res.status(400).json({ error: "Code is already used" });
      if(examCode.expiresAt && examCode.expiresAt < new Date()) return res.status(400).json({ error: "Code has expired" });
      
      res.json({ valid: true, examCode });
    } catch(err) {
      res.status(500).json({ error: "Validate failed"});
    }
  });

  app.post("/api/codes/redeem", async (req, res) => {
    try {
      const { code, candidateId, email, name, surname, school, className } = req.body;
      // 1. Verify code
      const examCode = await prisma.examCode.findUnique({ where: { code } });
      if(!examCode) return res.status(404).json({ error: "Code not found" });
      if(examCode.isUsed) return res.status(400).json({ error: "Code already used" });

      // 2. Mark code used
      await prisma.examCode.update({
        where: { id: examCode.id },
        data: { isUsed: true, usedByEmail: email, usedAt: new Date() }
      });

      // 3. Upsert user info in DB
      await prisma.organization.upsert({
        where: { id: examCode.organizationId },
        update: {},
        create: { id: examCode.organizationId, name: examCode.organizationId, slug: examCode.organizationId.toLowerCase() + "-" + Date.now() }
      });
      
      const upsertedUser = await prisma.user.upsert({
        where: { email: email },
        update: { name: `${name} ${surname}`, organizationId: examCode.organizationId },
        create: { email: email, name: `${name} ${surname}`, organizationId: examCode.organizationId, role: "CANDIDATE" }
      });

      await prisma.candidateProfile.upsert({
        where: { userId: upsertedUser.id },
        update: { metadata: { school, className } },
        create: { userId: upsertedUser.id, metadata: { school, className } }
      });

      // 4. Issue JWT so the candidate can immediately start a session
      const accessToken = jwt.sign({ userId: upsertedUser.id }, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: upsertedUser.id }, REFRESH_SECRET, { expiresIn: '7d' });
      await prisma.user.update({
        where: { id: upsertedUser.id },
        data: { refreshToken }
      });
      setAuthCookies(res, accessToken, refreshToken);

      res.json({
        success: true,
        organizationId: examCode.organizationId,
        productLine: examCode.productLine,
        candidateId: upsertedUser.id,
        displayName: upsertedUser.name,
      });
    } catch(err) {
      res.status(500).json({ error: "Redeem failed"});
    }
  });

  // --- CALIBRATION API ---
  app.post("/api/calibration/study", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { CalibrationService } = await import("./src/lib/assessment-engine/calibration-service.js");
      const results = await CalibrationService.conductStudy();
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to conduct calibration study" });
    }
  });

  app.post("/api/calibration/apply", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { CalibrationService } = await import("./src/lib/assessment-engine/calibration-service.js");
      const results = await CalibrationService.applyCalibration();
      res.json({ success: true, cutScores: results });
    } catch (error) {
      res.status(500).json({ error: "Failed to apply calibration" });
    }
  });

  app.post("/api/calibration/pretest", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { CalibrationService } = await import("./src/lib/assessment-engine/calibration-service.js");
      const results = await CalibrationService.calibratePretestItems();
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to calibrate pretest items" });
    }
  });

  app.post("/api/calibration/promote", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { CalibrationService } = await import("./src/lib/assessment-engine/calibration-service.js");
      const { minResponses } = req.body;
      const results = await CalibrationService.promotePretestItems(minResponses);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to promote pretest items" });
    }
  });

  // --- SYSTEM CONFIG API ---
  app.get("/api/config/system", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const config = await AssessmentService.getSystemConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system config" });
    }
  });

  app.put("/api/config/system", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const config = await AssessmentService.updateSystemConfig(req.body);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to update system config" });
    }
  });
  const { ProctoringService } = await import("./src/lib/proctoring/proctoring-service.js");

  app.post("/api/proctoring/event", authMiddleware, async (req, res) => {
    try {
      const { sessionId, type, severity, metadata } = req.body;
      // Map string severity to Int as defined in the Prisma schema (1=Low, 3=Medium, 5=High)
      const severityMap: Record<string, number> = { LOW: 1, MEDIUM: 3, HIGH: 5 };
      const severityInt = typeof severity === "number" ? severity : (severityMap[String(severity).toUpperCase()] ?? 1);
      const event = await (prisma as any).proctoringEvent.create({
        data: { sessionId, type, severity: severityInt, metadata: metadata ?? null }
      });
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to log proctoring event" });
    }
  });

  app.get("/api/proctoring/report/:sessionId", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "PROCTOR"]), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const report = await ProctoringService.getTrustReport(sessionId);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trust report" });
    }
  });

  // --- PHASE 6: COMMERCIALIZATION & ECOSYSTEM ---
  app.post("/api/payments/checkout", authMiddleware, async (req, res) => {
    const { userId, organizationId, credits } = req.body;
    try {
      const { PaymentService } = await import("./src/lib/payments/payment-service.js");
      const url = await PaymentService.createCheckoutSession(userId, organizationId, credits);
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/payments/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const { PaymentService } = await import("./src/lib/payments/payment-service.js");
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is not set — rejecting webhook");
        return res.status(400).send("Webhook configuration error");
      }
      if (!sig) return res.status(400).send("Missing stripe-signature header");
      const event = PaymentService.constructWebhookEvent(req.body as Buffer, sig, webhookSecret);
      await PaymentService.handleWebhook(event);
      res.json({ received: true });
    } catch (err) {
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }
  });

  app.put("/api/ecosystem/config", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { organizationId, webhookUrl, generateApiKey } = req.body;
    try {
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!org) return res.status(404).json({ error: "Organization not found" });

      const settings = (org.settings as any) || {};
      if (webhookUrl !== undefined) settings.webhookUrl = webhookUrl;
      if (generateApiKey) settings.apiKey = `sk_live_${crypto.randomBytes(24).toString("hex")}`;

      await prisma.organization.update({
        where: { id: organizationId },
        data: { settings },
      });

      res.json({ settings });
    } catch (err) {
      res.status(500).json({ error: "Failed to update ecosystem config" });
    }
  });

  app.post("/api/proctoring/audit", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "PROCTOR"]), async (req, res) => {
    const { sessionId } = req.body;
    try {
      const { AnomalyDetectionService } = await import("./src/lib/proctoring/anomaly-detection-service.js");
      const trustScore = await AnomalyDetectionService.auditSession(sessionId);
      res.json({ trustScore });
    } catch (err) {
      res.status(500).json({ error: "Failed to audit session" });
    }
  });

  app.post("/api/sessions/:id/complete", authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
      if (!(await assertSessionOwnership(req, res, id))) return;

      // If ScoreReport doesn't exist yet (timeout/dropout), run finalization before marking complete
      if (dbAvailable) {
        const [existingReport, session] = await Promise.all([
          prisma.scoreReport.findUnique({ where: { sessionId: id } }),
          prisma.session.findUnique({ where: { id }, select: { currentTheta: true, status: true } }),
        ]);
        if (!existingReport && session?.currentTheta != null && session.status !== "COMPLETED") {
          try {
            const { AssessmentService } = await import("./src/lib/assessment-engine/server-engine.js");
            await AssessmentService.finalizeSession(id, session.currentTheta);
          } catch (finErr) {
            console.warn("finalizeSession fallback failed in /complete:", finErr);
          }
        }
      }

      await prisma.session.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      const { WebhookService } = await import("./src/lib/ecosystem/webhook-service.js");
      await WebhookService.dispatchTestCompleted(id);

      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to complete session" });
    }
  });

  // --- PHASE 7: ADVANCED AI & MULTIMODAL ---
  app.post("/api/ai/score/speaking-multimodal", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "RATER"]), async (req, res) => {
    const { audioBase64, mimeType, prompt } = req.body;
    try {
      const { GeminiScoringService } = await import("./src/lib/scoring/gemini-scoring-service.js");
      const result = await GeminiScoringService.scoreSpeaking(audioBase64, mimeType, prompt || "Please respond to the task.");
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to perform multimodal scoring" });
    }
  });

  app.get("/api/sessions/:id/responses", authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
      if (!(await assertSessionOwnership(req, res, id))) return;
      const responses = await prisma.response.findMany({
        where: { sessionId: id },
        include: { item: true },
        orderBy: { order: "asc" }
      });
      res.json(responses);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch session responses" });
    }
  });

  app.post("/api/ai/generate-item", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    const { skill, level, type } = req.body;
    try {
      const { ItemGeneratorService } = await import("./src/lib/assessment-engine/item-generator.js");
      const item = await ItemGeneratorService.generateItem(skill, level, type);
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate AI item" });
    }
  });

  app.post("/api/ai/edit-item", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "ITEM_WRITER"]), async (req, res) => {
    const { currentItemContent, instruction } = req.body;
    try {
      const { ItemGeneratorService } = await import("./src/lib/assessment-engine/item-generator.js");
      const updatedContent = await ItemGeneratorService.editItem(currentItemContent, instruction);
      res.json(updatedContent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to edit AI item" });
    }
  });

  app.get("/api/sessions/:id/insights", authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
      if (!(await assertSessionOwnership(req, res, id))) return;
      const session = await prisma.session.findUnique({
        where: { id },
        include: { scoreReport: true }
      }) as any;
      if (!session) return res.status(404).json({ error: "Session not found" });
      
      // Calculate real-time insights based on current theta
      const { getEngine } = await import("./src/lib/assessment-engine/server-engine.js");
      const engine = await getEngine();
      const cefrLevel = engine.mapToCefr(session.currentTheta || 0);
      
      res.json({
        cefrLevel,
        theta: session.currentTheta,
        progress: session.responsesCount || 0,
        skills: await (async () => {
          // Compute skill scores from actual response data
          const responses = await prisma.response.findMany({
            where: { sessionId: id },
            include: { item: { select: { skill: true, type: true } } },
          });
          const skillBuckets: Record<string, { correct: number; total: number }> = {};
          for (const r of responses) {
            const skill = (r.item?.skill ?? "UNKNOWN").toLowerCase();
            if (!skillBuckets[skill]) skillBuckets[skill] = { correct: 0, total: 0 };
            skillBuckets[skill].total++;
            // Numeric score > 0.5 or value === correctIndex treated as correct
            const val = r.value as any;
            const score = typeof val === "number" ? val : (val?.score ?? 0);
            if (score > 0) skillBuckets[skill].correct++;
          }
          const pct = (sk: string) =>
            skillBuckets[sk]
              ? Math.round((skillBuckets[sk].correct / skillBuckets[sk].total) * 100)
              : null;
          return {
            reading: pct("reading"),
            listening: pct("listening"),
            writing: pct("writing"),
            speaking: pct("speaking"),
          };
        })()
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch session insights" });
    }
  });

  // ── GET /api/sessions/:id/adaptive-report ────────────────────────────────────
  // Returns the full AdaptiveReport used by CandidateAdaptiveReport.tsx.
  // Aggregates: session metadata, per-response data, skill scores, BEPS, Can-Do.
  app.get("/api/sessions/:id/adaptive-report", authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    try {
      const { thetaToCefr, thetaToBeps, getCanDo } = await import("./src/lib/cefr/cefr-framework.js");

      if (!dbAvailable) {
        // Demo mode stub
        const theta = 0.8;
        const sem   = 0.38;
        const level = thetaToCefr(theta);
        return res.json({
          sessionId: id,
          candidateName: "Demo Candidate",
          completedAt: new Date().toISOString(),
          finalTheta: theta,
          finalSem: sem,
          beps: thetaToBeps(theta),
          cefrLevel: level,
          stopReason: "SEM_TARGET_REACHED",
          totalItems: 22,
          skillScores: [
            { skill: "READING",    theta: 1.0,  cefrLevel: "B2" },
            { skill: "LISTENING",  theta: 0.6,  cefrLevel: "B2" },
            { skill: "GRAMMAR",    theta: 0.7,  cefrLevel: "B2" },
            { skill: "VOCABULARY", theta: 0.9,  cefrLevel: "B2" },
          ],
          responses: [],
          canDo: getCanDo(level),
        });
      }

      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          responses: {
            orderBy: { order: "asc" },
            include: { item: { select: { skill: true, cefrLevel: true, type: true, content: true } } },
          },
          scoreReport: true,
        },
      }) as any;

      if (!session) return res.status(404).json({ error: "Session not found" });

      const theta: number = session.finalTheta ?? session.currentTheta ?? 0;
      const sem:   number = session.finalSem   ?? session.currentSem   ?? 0.5;
      const level = thetaToCefr(theta);
      const beps  = thetaToBeps(theta);

      // Build per-response entries
      const responses = (session.responses ?? []).map((r: any) => ({
        itemId:    r.itemId,
        skill:     r.item?.skill    ?? "UNKNOWN",
        cefrLevel: r.item?.cefrLevel ?? "B1",
        isCorrect: r.isCorrect   ?? null,
        score:     r.score       ?? null,
        thetaAfter: r.thetaAfter ?? theta,
        semAfter:   r.semAfter   ?? sem,
        latencyMs:  r.responseTimeMs ?? 0,
        rubricScores: r.rubricScores ?? undefined,
        aiFeedback:   r.aiFeedback   ?? undefined,
      }));

      // Aggregate skill-level ability estimates from scoreReport or response data
      const skillMap: Record<string, { thetas: number[]; cefrLevel: string }> = {};
      for (const r of responses) {
        if (!skillMap[r.skill]) skillMap[r.skill] = { thetas: [], cefrLevel: r.cefrLevel };
        if (r.thetaAfter != null) skillMap[r.skill].thetas.push(r.thetaAfter);
      }
      const skillScores = Object.entries(skillMap).map(([skill, { thetas, cefrLevel: cl }]) => {
        const t = thetas.length ? thetas[thetas.length - 1] : theta;
        return { skill, theta: t, cefrLevel: thetaToCefr(t) };
      });

      // Supplement from scoreReport if available
      const sr = session.scoreReport as any;
      if (sr?.skillScores) {
        try {
          const parsed = typeof sr.skillScores === "string" ? JSON.parse(sr.skillScores) : sr.skillScores;
          for (const [sk, val] of Object.entries(parsed as Record<string, any>)) {
            const existing = skillScores.find((s) => s.skill === sk.toUpperCase());
            if (existing) {
              existing.theta = val.theta ?? existing.theta;
              existing.cefrLevel = thetaToCefr(existing.theta);
            } else {
              const t2 = val.theta ?? theta;
              skillScores.push({ skill: sk.toUpperCase(), theta: t2, cefrLevel: thetaToCefr(t2) });
            }
          }
        } catch {}
      }

      res.json({
        sessionId: id,
        candidateId:   session.userId,
        candidateName: session.user?.name ?? session.user?.email ?? undefined,
        completedAt:   (session.completedAt ?? session.updatedAt ?? new Date()).toISOString(),
        finalTheta: theta,
        finalSem:   sem,
        beps,
        cefrLevel:  level,
        stopReason: session.stopReason ?? "COMPLETED",
        totalItems: responses.length,
        skillScores,
        responses,
        canDo: getCanDo(level),
        integrityRisk: session.integrityRisk ?? "LOW",
        productLine:   session.productLine   ?? undefined,
      });
    } catch (err) {
      console.error("adaptive-report error:", err);
      res.status(500).json({ error: "Failed to build adaptive report"});
    }
  });

  // ── GET /api/sessions/:id/full-analysis (admin-facing detailed view) ─────────
  app.get(
    "/api/sessions/:id/full-analysis",
    authMiddleware,
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]),
    async (req: any, res) => {
      const { id } = req.params;
      try {
        if (!dbAvailable) return res.status(503).json({ error: "Database unavailable in demo mode" });

        const session = await prisma.session.findUnique({
          where: { id },
          include: {
            candidate: { select: { id: true, name: true, email: true } },
            responses: {
              orderBy: { order: "asc" },
              include: {
                item: {
                  select: {
                    id: true, itemCode: true, type: true, skill: true, cefrLevel: true,
                    difficulty: true, discrimination: true, guessing: true, content: true,
                  },
                },
              },
            },
            scoreReport: true,
          },
        }) as any;

        if (!session) return res.status(404).json({ error: "Session not found" });

        const theta: number = session.finalTheta ?? session.currentTheta ?? 0;
        const sem:   number = session.finalSem   ?? session.currentSem   ?? 0.5;

        const responses = (session.responses ?? []).map((r: any) => {
          const meta = (r.metadata as any) ?? {};
          return {
            id:          r.id,
            order:       r.order,
            value:       r.value ?? null,
            isCorrect:   r.isCorrect ?? null,
            score:       r.score ?? null,
            aiScore:     r.aiScore ?? null,
            humanScore:  r.humanScore ?? null,
            latencyMs:   r.latencyMs ?? 0,
            rtZScore:    r.rtZScore ?? null,
            rtFlag:      r.rtFlag ?? null,
            transcript:  meta.transcript ?? undefined,
            rubricScores:    meta.rubricScores    ?? r.rubricScores    ?? undefined,
            speakingFeatures: meta.speakingFeatures ?? undefined,
            item: {
              id:             r.item?.id ?? r.itemId,
              itemCode:       r.item?.itemCode ?? null,
              type:           r.item?.type ?? "MULTIPLE_CHOICE",
              skill:          r.item?.skill ?? "UNKNOWN",
              cefrLevel:      r.item?.cefrLevel ?? "B1",
              difficulty:     r.item?.difficulty ?? 0,
              discrimination: r.item?.discrimination ?? 1,
              guessing:       r.item?.guessing ?? 0,
              content:        r.item?.content ?? {},
            },
          };
        });

        // Compute stats
        const totalItems   = responses.length;
        const totalCorrect = responses.filter((r: any) => r.isCorrect === true).length;
        const latencies    = responses.map((r: any) => r.latencyMs as number);
        const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : 0;
        const sorted       = [...latencies].sort((a, b) => a - b);
        const medianLatencyMs = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
        const durationMs = session.startedAt && session.completedAt
          ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()
          : null;

        const skillBreakdown: Record<string, { total: number; correct: number; avgLatency: number }> = {};
        const cefrBreakdown: Record<string, { total: number; correct: number }> = {};
        for (const r of responses) {
          const sk = r.item.skill;
          const cl = r.item.cefrLevel;
          if (!skillBreakdown[sk]) skillBreakdown[sk] = { total: 0, correct: 0, avgLatency: 0 };
          if (!cefrBreakdown[cl])  cefrBreakdown[cl]  = { total: 0, correct: 0 };
          skillBreakdown[sk].total++;
          cefrBreakdown[cl].total++;
          if (r.isCorrect) { skillBreakdown[sk].correct++; cefrBreakdown[cl].correct++; }
          skillBreakdown[sk].avgLatency = Math.round(
            (skillBreakdown[sk].avgLatency * (skillBreakdown[sk].total - 1) + r.latencyMs) / skillBreakdown[sk].total
          );
        }

        // Person fit from metadata
        const fitMeta = (session.metadata as any)?.personFit ?? null;

        res.json({
          session: {
            id:             session.id,
            status:         session.status,
            theta,
            sem,
            cefrLevel:      session.cefrLevel ?? null,
            startedAt:      session.startedAt?.toISOString() ?? null,
            completedAt:    session.completedAt?.toISOString() ?? null,
            responsesCount: totalItems,
          },
          candidate: {
            id:    session.candidate?.id    ?? session.candidateId,
            name:  session.candidate?.name  ?? session.candidate?.email?.split("@")[0] ?? "Unknown",
            email: session.candidate?.email ?? "",
          },
          scoreReport: session.scoreReport
            ? { overallCefr: session.scoreReport.overallCefr, overallScore: session.scoreReport.overallScore }
            : null,
          responses,
          personFit: fitMeta,
          stats: {
            totalItems,
            totalCorrect,
            pctCorrect: totalItems ? Math.round((totalCorrect / totalItems) * 100) : 0,
            avgLatencyMs,
            medianLatencyMs,
            durationMs,
            skillBreakdown,
            cefrBreakdown,
          },
        });
      } catch (err) {
        console.error("full-analysis error:", err);
        res.status(500).json({ error: "Failed to build full analysis" });
      }
    }
  );

  // ── GET /api/verify/:id — public certificate verification alias ───────────────
  app.get("/api/verify/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (!dbAvailable) return res.status(503).json({ valid: false, error: "Service unavailable" });
      const { CertificateService } = await import("./src/lib/certification/certificate-service.js");
      const cert = await CertificateService.verifyCertificate(id);
      if (!cert) return res.status(404).json({ valid: false, error: "Certificate not found" });
      const now = new Date();
      const expired = cert.expiresAt < now;
      res.json({
        valid: !expired,
        certificateId: cert.id,
        candidateName: cert.candidateName,
        cefrLevel:     cert.cefrLevel,
        issuedAt:      cert.issuedAt instanceof Date ? cert.issuedAt.toISOString() : cert.issuedAt,
        expiresAt:     cert.expiresAt instanceof Date ? cert.expiresAt.toISOString() : cert.expiresAt,
        organization:  cert.organizationName,
        expired,
      });
    } catch (err) {
      console.error("verify error:", err);
      res.status(500).json({ valid: false, error: "Verification failed" });
    }
  });

  // ── GET /api/sessions/:id/learning-path ──────────────────────────────────────
  app.get("/api/sessions/:id/learning-path", authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    try {
      if (!dbAvailable) {
        // Demo stub: 7-day / 30-day / 90-day milestones
        return res.json({
          sessionId: id,
          currentCefrLevel: "B1",
          targetCefrLevel: "B2",
          estimatedWeeksToTarget: 12,
          prioritySkills: ["writing", "speaking", "reading"],
          weeklyGoal: { sessions: 3, minutesPerDay: 20 },
          milestones: [
            { id: "m1", title: "Grammar Consolidation", description: "Master B1 conditional and passive structures.", targetCefrLevel: "B1", targetSkill: "grammar", estimatedDays: 14, prerequisiteMilestoneIds: [], completionCriteria: { minScore: 0.75, minSessions: 4 } },
            { id: "m2", title: "Reading Fluency", description: "Read longer texts and identify main ideas accurately.", targetCefrLevel: "B2", targetSkill: "reading", estimatedDays: 21, prerequisiteMilestoneIds: ["m1"], completionCriteria: { minScore: 0.70, minSessions: 5 } },
            { id: "m3", title: "Extended Writing", description: "Write structured essays and reports of 200+ words.", targetCefrLevel: "B2", targetSkill: "writing", estimatedDays: 30, prerequisiteMilestoneIds: ["m1"], completionCriteria: { minScore: 0.65, minSessions: 6 } },
          ],
        });
      }

      const session = await prisma.session.findUnique({
        where: { id },
        include: { responses: { orderBy: { order: "asc" }, include: { item: { select: { skill: true } } } } },
      }) as any;
      if (!session) return res.status(404).json({ error: "Session not found" });

      const { learningPathEngine } = await import("./src/lib/recommendations/learning-path-engine.js");
      const path = await learningPathEngine.generatePersonalisedPath(session.userId);
      return res.json({ sessionId: id, ...path });
    } catch (err) {
      console.error("learning-path error:", err);
      res.status(500).json({ error: "Failed to generate learning path"});
    }
  });

  // --- PHASE 8: ENTERPRISE & GLOBAL ---

  // ── SSE: scoring status stream for async AI responses (Writing / Speaking) ──
  // GET /api/sessions/:id/scoring-status — client subscribes; server pushes events
  // when the AI scoring queue updates the response row.
  // Events: { event: "status", data: { responseId, status, cefrLevel?, score? } }
  // Event: { event: "complete", data: { sessionId } }  — fired once all responses scored.
  app.get("/api/sessions/:id/scoring-status", authMiddleware, async (req, res) => {
    const { id } = req.params;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const SSE_TIMEOUT_MS = 120_000; // 2 min hard limit
    const POLL_INTERVAL_MS = 3_000;

    const writeEvent = (event: string, data: object) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    let elapsed = 0;
    const timer = setInterval(async () => {
      elapsed += POLL_INTERVAL_MS;
      try {
        const responses = await prisma.response.findMany({
          where: { sessionId: id, item: { skill: { in: ["WRITING", "SPEAKING"] } } },
          select: { id: true, metadata: true },
        });

        const pending = responses.filter(r => !(r.metadata as any)?.aiScore && !(r.metadata as any)?.pendingAsyncScore === false);
        const scored  = responses.filter(r => (r.metadata as any)?.aiScore != null);

        for (const r of scored) {
          const meta = r.metadata as any;
          writeEvent("status", {
            responseId: r.id,
            status: "scored",
            cefrLevel: meta.cefrLevel,
            score: meta.aiScore,
          });
        }

        const allScored = responses.length > 0 && pending.length === 0;
        if (allScored || elapsed >= SSE_TIMEOUT_MS) {
          if (elapsed >= SSE_TIMEOUT_MS && pending.length > 0) {
            writeEvent("timeout", { message: "Scoring is taking longer than expected. Results will be sent by email." });
          } else {
            writeEvent("complete", { sessionId: id });
          }
          clearInterval(timer);
          res.end();
        }
      } catch {
        // DB error — keep trying until timeout
      }
    }, POLL_INTERVAL_MS);

    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 30_000);

    req.on("close", () => {
      clearInterval(timer);
      clearInterval(heartbeat);
    });
  });

  app.patch("/api/organizations/:id/branding", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]), async (req, res) => {
    const { id } = req.params;
    const branding = req.body;
    const adminId = req.headers["x-admin-id"] as string; // Mock admin ID for now

    try {
      const org = await (prisma.organization as any).update({
        where: { id },
        data: { branding }
      });

      // Phase 9: Log Action
      if (adminId) {
        const { EnterpriseService } = await import("./src/lib/enterprise/enterprise-service.js");
        await EnterpriseService.logAction({
          organizationId: id,
          userId: adminId,
          action: "BRANDING_UPDATE",
          entityType: "Organization",
          entityId: id,
          details: branding
        });
      }

      res.json(org);
    } catch (err) {
      res.status(500).json({ error: "Failed to update branding" });
    }
  });

  app.post("/api/organizations/:id/candidates/bulk-import", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]), async (req, res) => {
    const { id } = req.params;
    const { candidates } = req.body;
    const adminId = req.headers["x-admin-id"] as string;
    
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const cand of candidates) {
      try {
        // Check if user exists
        let user = await prisma.user.findUnique({ where: { email: cand.email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: cand.email,
              name: cand.name,
              organizationId: id,
              role: "CANDIDATE"
            }
          });
          success++;
        } else {
          failed++;
          errors.push(`User ${cand.email} already exists`);
        }
      } catch (err) {
        failed++;
        errors.push(`Failed to create ${cand.email}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    // Phase 9: Log Action
    if (adminId) {
      const { EnterpriseService } = await import("./src/lib/enterprise/enterprise-service.js");
      await EnterpriseService.logAction({
        organizationId: id,
        userId: adminId,
        action: "CANDIDATE_BULK_IMPORT",
        entityType: "Organization",
        entityId: id,
        details: { success, failed, candidateCount: candidates.length }
      });
    }

    res.json({ success, failed, errors });
  });

  // --- PHASE 9: ECOSYSTEM & COMPLIANCE ---
  app.get("/api/organizations/:id/audit-logs", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id } = req.params;
    try {
      const logs = await (prisma as any).auditLog.findMany({
        where: { organizationId: id },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100
      });
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/organizations/:id/webhooks", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id } = req.params;
    try {
      const webhooks = await (prisma as any).webhook.findMany({
        where: { organizationId: id }
      });
      res.json(webhooks);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.post("/api/organizations/:id/webhooks", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id } = req.params;
    const { url, events } = req.body;
    const secret = crypto.randomBytes(32).toString("hex");

    try {
      const webhook = await (prisma as any).webhook.create({
        data: {
          organizationId: id,
          url,
          events,
          secret
        }
      });
      res.json(webhook);
    } catch (err) {
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  app.get("/api/organizations/:id/api-keys", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id } = req.params;
    try {
      const keys = await (prisma as any).apiKey.findMany({
        where: { organizationId: id },
        select: { id: true, name: true, createdAt: true, lastUsed: true, isActive: true }
      });
      res.json(keys);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  app.post("/api/organizations/:id/api-keys", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
      const { EnterpriseService } = await import("./src/lib/enterprise/enterprise-service.js");
      const key = await EnterpriseService.generateApiKey(id, name);
      res.json({ key });
    } catch (err) {
      res.status(500).json({ error: "Failed to generate API key" });
    }
  });

  app.get("/api/organizations/:id/settings", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]), async (req, res) => {
    const { id } = req.params;
    try {
      const org = await prisma.organization.findUnique({ where: { id }, select: { settings: true } });
      res.json((org?.settings as any) || {});
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/organizations/:id/branding", async (req, res) => {
    const { id } = req.params;
    try {
      const branding = await BrandingService.getBranding(id);
      res.json(branding || {});
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch branding" });
    }
  });

  app.get("/api/organizations/:id/analytics", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "PROCTOR", "INST_ADMIN", "TEACHER"]), async (req: any, res) => {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userOrgId = req.user?.organizationId;
    if (userRole === "TEACHER" && userOrgId !== id) return res.status(403).json({ error: "Forbidden" });
    try {
      const sessionsCount = await prisma.session.count({ where: { organizationId: id } });
      const feedbacksCount = await (prisma as any).feedback.count({ where: { organizationId: id } });
      const feedbacks = await (prisma as any).feedback.findMany({ where: { organizationId: id }, select: { rating: true } });
      const avgRating = feedbacks.length > 0 ? feedbacks.reduce((acc: any, f: any) => acc + f.rating, 0) / feedbacks.length : 0;

      // CEFR Distribution
      const sessions = await prisma.session.findMany({
        where: { organizationId: id, status: "COMPLETED" },
        select: { theta: true }
      });

      const { getEngine } = await import("./src/lib/assessment-engine/server-engine.js");
      const engine = await getEngine();
      
      const distribution: Record<string, number> = { "A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0, "C2": 0 };
      sessions.forEach(s => {
        const cefr = engine.mapToCefr(s.theta);
        distribution[cefr] = (distribution[cefr] || 0) + 1;
      });

      const cefrData = Object.entries(distribution).map(([name, value]) => ({ name, value }));

      // Skill Breakdown — aggregate from score reports
      const scoreReports = await (prisma as any).scoreReport.findMany({
        where: { session: { organizationId: id } },
        select: { readingScore: true, listeningScore: true, writingScore: true, speakingScore: true, grammarScore: true, vocabularyScore: true },
      });
      const skillTotals: Record<string, number[]> = { Reading: [], Listening: [], Writing: [], Speaking: [], Grammar: [], Vocabulary: [] };
      for (const r of scoreReports) {
        if (r.readingScore != null)    skillTotals.Reading.push(r.readingScore);
        if (r.listeningScore != null)  skillTotals.Listening.push(r.listeningScore);
        if (r.writingScore != null)    skillTotals.Writing.push(r.writingScore);
        if (r.speakingScore != null)   skillTotals.Speaking.push(r.speakingScore);
        if (r.grammarScore != null)    skillTotals.Grammar.push(r.grammarScore);
        if (r.vocabularyScore != null) skillTotals.Vocabulary.push(r.vocabularyScore);
      }
      const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) : 0;
      const skillBreakdown = Object.entries(skillTotals).map(([skill, arr]) => ({
        skill,
        avg: avg(arr),
        count: arr.length,
      }));

      // Monthly trend
      const monthlyRaw = await prisma.session.groupBy({
        by: ["createdAt"],
        where: { organizationId: id, status: "COMPLETED" },
        _count: { id: true },
      });
      const monthMap: Record<string, number> = {};
      for (const r of monthlyRaw) {
        const key = new Date(r.createdAt).toLocaleString("en", { month: "short" });
        monthMap[key] = (monthMap[key] || 0) + r._count.id;
      }
      const monthlyTrend = Object.entries(monthMap).slice(-6).map(([month, count]) => ({ month, count }));

      res.json({
        sessionsCount,
        feedbacksCount,
        avgRating,
        cefrDistribution: cefrData,
        skillBreakdown,
        monthlyTrend,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/organizations/:id/billing", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id } = req.params;
    try {
      const summary = await BillingService.getBillingSummary(id);
      res.json(summary);
    } catch (err) {
      console.error(err); res.status(500).json({ error: "Failed to fetch billing summary" });
    }
  });

  app.post("/api/organizations/:id/billing/topup", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    try {
      await BillingService.addCredits(id, amount);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to top up credits" });
    }
  });

  app.get("/api/organizations/:id/proctoring-alerts", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "PROCTOR"]), async (req, res) => {
    const { id } = req.params;
    try {
      const alerts = await (prisma as any).proctoringEvent.findMany({
        where: { session: { organizationId: id }, severity: { gte: 2 } }, // MEDIUM or HIGH
        include: { 
          session: { 
            include: { 
              candidate: { select: { name: true, email: true } } 
            } 
          } 
        },
        orderBy: { timestamp: "desc" },
        take: 50
      });
      res.json(alerts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch proctoring alerts" });
    }
  });

  app.get("/api/organizations/:id/sso-config", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id } = req.params;
    try {
      const org = await (prisma.organization as any).findUnique({
        where: { id },
        select: { ssoConfig: true }
      });
      res.json(org?.ssoConfig || {});
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch SSO config" });
    }
  });

  // --- PHASE 10: POLISHING & ANALYTICS ---
  app.post("/api/sessions/:id/feedback", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { rating, comment, category, organizationId } = req.body;
    try {
      const feedback = await (prisma as any).feedback.create({
        data: {
          sessionId: id,
          organizationId,
          rating,
          comment,
          category
        }
      });
      res.json(feedback);
    } catch (err) {
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.get("/api/candidates/:id/history", authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    try {
      const userId: string | undefined = req.user?.id;
      const role: string | undefined = req.user?.role;
      const adminRoles = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN", "PROCTOR"];
      if (userId !== id && !(role && adminRoles.includes(role))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const sessions = await prisma.session.findMany({
        where: { candidateId: id },
        include: { scoreReport: true },
        orderBy: { createdAt: "desc" }
      });
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch candidate history" });
    }
  });

  // GET /api/candidates/:id/progress-history — theta time series for trend chart
  app.get("/api/candidates/:id/progress-history", authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    try {
      const userId: string | undefined = req.user?.id;
      const role: string | undefined = req.user?.role;
      const adminRoles = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN", "PROCTOR", "TEACHER"];
      if (userId !== id && !(role && adminRoles.includes(role))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const sessions = await prisma.session.findMany({
        where: { candidateId: id, status: "COMPLETED" },
        select: {
          id: true,
          createdAt: true,
          completedAt: true,
          theta: true,
          cefrLevel: true,
          metadata: true,
          scoreReport: {
            select: {
              overallCefr: true,
              overallScore: true,
              readingScore: true,
              listeningScore: true,
              writingScore: true,
              speakingScore: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      });

      const history = sessions
        .filter((s) => s.theta != null)
        .map((s) => {
          const meta = s.metadata as Record<string, any> | null;
          return {
            sessionId: s.id,
            date: (s.completedAt ?? s.createdAt).toISOString(),
            productLine: meta?.productLine ?? "Assessment",
            theta: s.theta,
            cefrLevel: s.scoreReport?.overallCefr ?? s.cefrLevel ?? "—",
            skillScores: s.scoreReport
              ? {
                  reading: s.scoreReport.readingScore,
                  listening: s.scoreReport.listeningScore,
                  writing: s.scoreReport.writingScore,
                  speaking: s.scoreReport.speakingScore,
                }
              : null,
          };
        });

      return res.json({ candidateId: id, history });
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch progress history" });
    }
  });

  // --- CERTIFICATION API ---
  const { CertificateService } = await import("./src/lib/certification/certificate-service.js");

  app.post("/api/certificates/generate", authMiddleware, async (req, res) => {
    try {
      const { sessionData, candidateProfile, branding } = req.body;
      const cert = await CertificateService.generateCertificate(sessionData, candidateProfile, branding);
      res.json(cert);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate certificate" });
    }
  });

  app.get("/api/certificates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const cert = await CertificateService.verifyCertificate(id);
      if (!cert) return res.status(404).json({ error: "Certificate not found" });
      res.json(cert);
    } catch (error) {
      res.status(500).json({ error: "Failed to verify certificate" });
    }
  });

  // Mock AI Scoring Endpoint (Simulation)
  app.post("/api/score/ai", authMiddleware, async (req, res) => {
    try {
      const { type, content } = req.body;

      if (!type || !content) {
        return res.status(400).json({ error: "Missing type or content" });
      }

      // Simulate AI processing delay (2-3 seconds)
      const delay = 2000 + Math.floor(Math.random() * 1000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Basic heuristic for mock scoring
      const length = typeof content === 'string' ? content.length : 100;
      let baseScore = 2;
      if (length > 200) baseScore = 3;
      if (length > 500) baseScore = 4;
      
      // Add some randomness
      const score = Math.min(4, Math.max(1, baseScore + (Math.random() > 0.7 ? 1 : (Math.random() < 0.3 ? -1 : 0))));
      
      const feedbacks = {
        SPEAKING: [
          "Pronunciation is clear, but intonation could be more natural.",
          "Good fluency and coherence. Try to use more complex grammatical structures.",
          "Good use of vocabulary, but some pauses were noticeable.",
          "Excellent delivery and range of expression."
        ],
        WRITING: [
          "The response is relevant but lacks sufficient detail.",
          "Good organization and paragraphing. Watch for minor spelling errors.",
          "Strong argument with good supporting evidence. Lexical range is impressive.",
          "Exceptional writing style with sophisticated vocabulary and perfect grammar."
        ]
      };

      const typeKey = type.toUpperCase() as keyof typeof feedbacks;
      const feedbackList = feedbacks[typeKey] || feedbacks.WRITING;
      const feedback = feedbackList[score - 1] || feedbackList[0];

      res.json({
        score,
        feedback: `[AI Analysis] ${feedback}`,
        confidence: 0.85 + (Math.random() * 0.1),
        metadata: {
          processedAt: new Date().toISOString(),
          wordCount: typeof content === 'string' ? content.split(/\s+/).length : null
        }
      });
    } catch (error) {
      console.error("AI Scoring Error:", error);
      res.status(500).json({ error: "Internal AI processing error" });
    }
  });

  // --- MISSING ROUTES: DELETE webhook, DELETE api-key, GET candidates, PUT org settings, PUT sso-config, GET sessions ---

  app.delete("/api/organizations/:id/webhooks/:webhookId", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id, webhookId } = req.params;
    try {
      await (prisma as any).webhook.deleteMany({ where: { id: webhookId, organizationId: id } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  app.delete("/api/organizations/:id/api-keys/:keyId", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id, keyId } = req.params;
    try {
      await (prisma as any).apiKey.update({ where: { id: keyId }, data: { isActive: false } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to revoke API key" });
    }
  });

  app.get("/api/organizations/:id/candidates", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN", "TEACHER"]), async (req: any, res) => {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userOrgId = req.user?.organizationId;
    if (userRole === "TEACHER" && userOrgId !== id) return res.status(403).json({ error: "Forbidden" });
    const { search } = req.query;
    try {
      const where: any = { organizationId: id, role: "CANDIDATE" };
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { email: { contains: search as string, mode: "insensitive" } }
        ];
      }
      const candidates = await prisma.user.findMany({
        where,
        include: {
          sessions: {
            select: { status: true, completedAt: true, theta: true },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { createdAt: "desc" },
        take: 100
      });
      res.json(candidates);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  app.patch("/api/organizations/:id/settings", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]), async (req, res) => {
    const { id } = req.params;
    try {
      const org = await prisma.organization.findUnique({ where: { id } });
      if (!org) return res.status(404).json({ error: "Organization not found" });

      const existingSettings = (org.settings as any) || {};
      const updatedSettings = { ...existingSettings, ...req.body };

      const updated = await prisma.organization.update({
        where: { id },
        data: { settings: updatedSettings }
      });
      res.json({ settings: updated.settings });
    } catch (err) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.put("/api/organizations/:id/sso-config", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    const { id } = req.params;
    try {
      const updated = await (prisma.organization as any).update({
        where: { id },
        data: { ssoConfig: req.body }
      });
      res.json(updated.ssoConfig || {});
    } catch (err) {
      res.status(500).json({ error: "Failed to update SSO config" });
    }
  });

  app.get("/api/organizations/:id/sessions", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN", "PROCTOR"]), async (req, res) => {
    const { id } = req.params;
    const { status, limit = "50" } = req.query;
    try {
      const where: any = { organizationId: id };
      if (status) where.status = status;
      const sessions = await prisma.session.findMany({
        where,
        include: {
          candidate: { select: { id: true, name: true, email: true } },
          scoreReport: { select: { overallCefr: true, overallScore: true } }
        },
        orderBy: { createdAt: "desc" },
        take: parseInt(limit as string)
      });
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.delete("/api/candidates/:id", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]), async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.user.update({ where: { id }, data: { role: "CANDIDATE" } });
      // Soft-delete: mark as inactive by clearing organization
      await prisma.user.update({ where: { id }, data: { organizationId: undefined } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove candidate" });
    }
  });

  // --- FREEMIUM PLACEMENT TEST API ---
  // Anonymous, no-auth CAT placement test used by FreemiumTestWidget
  const placementSessions: Record<string, {
    theta: number; sem: number; items: any[]; usedIds: Set<string>;
    itemsAdministered: number; maxItems: number;
    name: string; email: string;
    skillBreakdown: Record<string, { total: number; correct: number }>;
  }> = {};

  const CEFR_BANDS: { level: string; minTheta: number }[] = [
    { level: "C2", minTheta: 2.67 }, { level: "C1", minTheta: 1.67 },
    { level: "B2", minTheta: 0.67 }, { level: "B1", minTheta: -0.33 },
    { level: "A2", minTheta: -1.33 }, { level: "A1", minTheta: -Infinity },
  ];
  const thetaToCefr = (theta: number) => CEFR_BANDS.find(b => theta >= b.minTheta)?.level ?? "A1";

  // Freemium placement now covers ALL 6 macro skills (Q3 2026 expansion).
  // Productive (WRITING/SPEAKING) responses are accepted as text/audio and IRT-
  // scored on submission; deep AI scoring runs server-side via the scoring queue.
  const FREEMIUM_PLACEMENT_SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];

  // Each skill must collect at least this many items before the test may stop —
  // ensures the 6-skill breakdown isn't lopsided toward whatever the IRT loop
  // happened to favour. With 6 skills × 2 = 12 minimum responses out of 36 max.
  const FREEMIUM_MIN_ITEMS_PER_SKILL = 2;

  // Hard cap per skill: prevents WRITING/SPEAKING from dominating the session
  // when the item bank happens to cluster productive items near the candidate's θ.
  // Receptive skills (GRAMMAR/VOCABULARY/READING/LISTENING) can go up to the cap;
  // productive skills are also bounded here (they have longer response latency).
  const FREEMIUM_MAX_ITEMS_PER_SKILL = 4;

  const pickNextPlacementItem = (allItems: any[], usedIds: Set<string>, theta: number, skillBreakdown: Record<string, any> = {}) => {
    // Pre-compute per-skill counts so the cap check is O(1) per item
    const skillCounts: Record<string, number> = {};
    for (const s of FREEMIUM_PLACEMENT_SKILLS) skillCounts[s] = 0;
    Object.entries(skillBreakdown).forEach(([s, data]) => { skillCounts[s] = (data as any).total ?? 0; });

    const available = allItems.filter(
      it =>
        !usedIds.has(it.id) &&
        it.active !== false &&
        FREEMIUM_PLACEMENT_SKILLS.includes(it.skill) &&
        (skillCounts[it.skill] ?? 0) < FREEMIUM_MAX_ITEMS_PER_SKILL
    );
    if (!available.length) return null;

    // ── Skill-coverage guard ──────────────────────────────────────────────
    // If any skill in the placement set still hasn't met the per-skill
    // minimum, force-pick from those under-served skills first. Otherwise
    // pure IRT selection ignores WRITING/SPEAKING (item info is lower than
    // for receptive MCQs at moderate θ), and the productive sections never
    // appear in the freemium result.
    // (skillCounts already computed above for the cap filter)

    const underServed = FREEMIUM_PLACEMENT_SKILLS.filter(
      s => skillCounts[s] < FREEMIUM_MIN_ITEMS_PER_SKILL && available.some(it => it.skill === s)
    );

    let set: any[];
    if (underServed.length > 0) {
      // Prefer the under-served skill with the fewest items so far, then IRT-pick.
      const targetSkill = underServed.sort((a, b) => skillCounts[a] - skillCounts[b])[0];
      set = available.filter(it => it.skill === targetSkill);
    } else {
      // All skills met the minimum — fall back to the original "min-count + 1" balancing.
      const values = Object.values(skillCounts);
      const minSkillCount = values.length > 0 ? Math.min(...values as number[]) : 0;
      const balancedAvailable = available.filter(it => (skillCounts[it.skill] || 0) <= minSkillCount + 1);
      set = balancedAvailable.length > 0 ? balancedAvailable : available;
    }

    return set.reduce((best, it) => {
      const diff = Math.abs((it.irtB ?? it.difficulty ?? 0) - theta);
      const bestDiff = Math.abs((best.irtB ?? best.difficulty ?? 0) - theta);
      return diff < bestDiff ? it : best;
    });
  };

  app.post("/api/assessment/placement/start", async (req, res) => {
    try {
      const { name, email, consentToResearch } = req.body;
      if (!name || !email) return res.status(400).json({ error: "name and email are required" });

      let allItems: any[] = [];
      try {
        const dbItems = await prisma.item.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, skill: true, type: true, cefrLevel: true, content: true,
                    difficulty: true, discrimination: true, guessing: true, assets: true }
        });
        allItems = dbItems.map(it => {
          const raw = it.content as any;
          // Normalize options: DB may store them as objects {id,text,isCorrect,rationale} or strings
          const normalizeOptions = (opts: any[]): string[] =>
            (opts ?? []).map(o => (typeof o === "string" ? o : String(o?.text ?? o)));
          const content = {
            ...raw,
            options: raw?.options ? normalizeOptions(raw.options) : undefined,
            correctIndex: raw?.correctIndex ?? (Array.isArray(raw?.options)
              ? raw.options.findIndex((o: any) => typeof o === "object" && o?.isCorrect)
              : undefined),
          };
          return {
            id: it.id, skill: it.skill, type: it.type, cefrLevel: it.cefrLevel,
            content, irtA: it.discrimination, irtB: it.difficulty, irtC: it.guessing,
            assets: it.assets ?? [], active: true,
          };
        });
      } catch {
        // DB unavailable — fall back to studioItems
        const { studioItems } = await import("./src/data/studioItems.js");
        allItems = (studioItems as any[]).map((it: any) => ({
          id: it.id, skill: it.skill, type: it.type, cefrLevel: it.cefrLevel,
          content: { prompt: it.prompt, options: it.options?.map((o: any) => o.text), correctIndex: it.options?.findIndex((o: any) => o.isCorrect) },
          irtA: it.discrimination ?? 1, irtB: it.difficulty ?? 0, irtC: it.guessing ?? 0,
          assets: [], active: true,
        }));
      }

      if (!allItems.length) return res.status(503).json({ error: "No items available" });

      const pId = "placement-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
      const startTheta = 0.0;
      const firstItem = pickNextPlacementItem(allItems, new Set(), startTheta, {});
      if (!firstItem) return res.status(503).json({ error: "No items available" });

      placementSessions[pId] = {
        theta: startTheta, sem: 1.5, items: allItems,
        usedIds: new Set([firstItem.id]),
        itemsAdministered: 0, maxItems: 36,
        name: name.trim(), email: email.trim().toLowerCase(),
        skillBreakdown: {},
      };

      // sectionOrder lets the frontend render the section breadcrumb directly
      // from the server response (no more hardcoded 4-skill list in the UI).
      return res.json({
        placementId: pId,
        firstItem,
        maxItems: 36,
        sectionOrder: FREEMIUM_PLACEMENT_SKILLS,
      });
    } catch (err) {
      console.error("PLACEMENT START ERROR", err);
      res.status(500).json({ error: "Failed to start placement test"});
    }
  });

  app.post("/api/assessment/placement/:id/respond", async (req, res) => {
    try {
      const { id } = req.params;
      const sess = placementSessions[id];
      if (!sess) return res.status(404).json({ error: "Placement session not found" });

      const { itemId, selectedOption, latencyMs } = req.body;
      const item = sess.items.find(it => it.id === itemId);

      // Simple IRT-based theta update (EAP approximation)
      if (item) {
        const a = item.irtA ?? 1; const b = item.irtB ?? 0; const c = item.irtC ?? 0;
        const correct = (() => {
          if (selectedOption === "speaking_recorded") return true;
          // Open-response (writing/speaking): any non-empty text answer is treated as
          // correct for IRT purposes — the freemium test cannot machine-score prose.
          if (
            (item.type === "OPEN_RESPONSE" || item.skill === "WRITING") &&
            typeof selectedOption === "string" &&
            selectedOption.trim().length > 0
          ) return true;
          const ci = item.content?.correctIndex;
          if (ci !== undefined && ci !== null) return Number(selectedOption) === ci;
          const co = item.content?.correctOption || item.content?.correctAnswer;
          if (co !== undefined) {
             const normalizedInput = String(selectedOption || "").toLowerCase().trim();
             const normalizedCorrect = String(co).toLowerCase().trim();
             if (normalizedCorrect.includes("|")) {
                const parts = normalizedCorrect.split("|").map(p => p.trim());
                return parts.some(p => p === normalizedInput) || normalizedInput === normalizedCorrect;
             }
             return normalizedInput === normalizedCorrect;
          }
          return false;
        })();

        // Update skill breakdown
        const sk = item.skill || "GENERAL";
        if (!sess.skillBreakdown[sk]) sess.skillBreakdown[sk] = { total: 0, correct: 0 };
        sess.skillBreakdown[sk].total++;
        if (correct) sess.skillBreakdown[sk].correct++;

        const p = c + (1 - c) / (1 + Math.exp(-1.702 * a * (sess.theta - b)));
        const info = Math.pow(1.702 * a, 2) * p * (1 - p);
        sess.theta += ((correct ? 1 : 0) - p) / Math.max(info, 0.01);
        sess.theta = Math.max(-4, Math.min(4, sess.theta));
        sess.sem = Math.max(0.1, 1 / Math.sqrt(Math.max(info, 0.01)));
      }
      sess.itemsAdministered++;
      // ── Stop condition (6-skill coverage required) ─────────────────────────
      // The session may stop only when every skill in FREEMIUM_PLACEMENT_SKILLS
      // has received its minimum number of items AND we're either out of
      // questions or have hit our SEM target. This prevents the test from
      // ending early on a stretch of low-θ items before WRITING/SPEAKING ran.
      const allSkillsCovered = FREEMIUM_PLACEMENT_SKILLS.every(
        s => (sess.skillBreakdown[s]?.total ?? 0) >= FREEMIUM_MIN_ITEMS_PER_SKILL
      );
      const reachedMax = sess.itemsAdministered >= sess.maxItems;
      const semOk = sess.sem < 0.35;
      const done = reachedMax || (allSkillsCovered && semOk);

      if (done) {
        const cefrLevel = thetaToCefr(sess.theta);
        const ciLow = sess.theta - 1.645 * sess.sem;
        const ciHigh = sess.theta + 1.645 * sess.sem;
        const lowerCEFR = thetaToCefr(ciLow);
        const upperCEFR = thetaToCefr(ciHigh);
        const cefrRange = lowerCEFR === upperCEFR ? cefrLevel : `${lowerCEFR}–${upperCEFR}`;
        
        const completionMs = Date.now() - (Number(id.split("-")[1]) || Date.now());
        
        const result = {
          placementId: id,
          cefrLevel,
          theta: sess.theta,
          sem: sess.sem,
          cefrConfidenceInterval: [ciLow, ciHigh] as [number, number],
          cefrRange,
          itemsAdministered: sess.itemsAdministered,
          completionMs,
          skillBreakdown: sess.skillBreakdown,
          upgradePrompt: {
            message: "Unlock the full psychometric report — detailed error analysis, per-CEFR can-do breakdown, and a personalised study plan.",
            skills: ["Detailed Psychometrics", "Error Analysis", "Personalised Study Plan"],
            callToActionUrl: "#pricing"
          }
        };

        delete placementSessions[id]; // clean up
        return res.json({ complete: true, result });
      }

      const nextItem = pickNextPlacementItem(sess.items, sess.usedIds, sess.theta, sess.skillBreakdown);
      if (!nextItem) {
        const cefrLevel = thetaToCefr(sess.theta);
        const ciLow = sess.theta - 1.645 * sess.sem;
        const ciHigh = sess.theta + 1.645 * sess.sem;
        const lowerCEFR = thetaToCefr(ciLow);
        const upperCEFR = thetaToCefr(ciHigh);
        const cefrRange = lowerCEFR === upperCEFR ? cefrLevel : `${lowerCEFR}–${upperCEFR}`;
        const completionMs = Date.now() - (Number(id.split("-")[1]) || Date.now());

        const result = {
          placementId: id,
          cefrLevel,
          theta: sess.theta,
          sem: sess.sem,
          cefrConfidenceInterval: [ciLow, ciHigh] as [number, number],
          cefrRange,
          itemsAdministered: sess.itemsAdministered,
          completionMs,
          skillBreakdown: sess.skillBreakdown,
          upgradePrompt: {
            message: "Unlock the full psychometric report — detailed error analysis, per-CEFR can-do breakdown, and a personalised study plan.",
            skills: ["Detailed Psychometrics", "Error Analysis", "Personalised Study Plan"],
            callToActionUrl: "#pricing"
          }
        };

        delete placementSessions[id];
        return res.json({ complete: true, result });
      }
      sess.usedIds.add(nextItem.id);
      return res.json({
        complete: false, nextItem,
        itemsAdministered: sess.itemsAdministered,
        currentCefrBand: thetaToCefr(sess.theta),
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to process response"});
    }
  });

  // ── Cohort Analytics ─────────────────────────────────────────────────────
  const { cohortAnalytics } = await import("./src/lib/analytics/cohort-analytics.js");

  app.get("/api/analytics/cohort/:orgId/full", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const stats = await cohortAnalytics.getCohortStats(req.params.orgId);
      res.json(stats);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q3: Report Generator ──────────────────────────────────────────────────
  const { ReportGenerator } = await import("./src/lib/analytics/report-generator.js");

  app.get("/api/reports/candidate/:id", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const format = (req.query.format as string) ?? "csv";
      const { buffer, mimeType, filename } = await ReportGenerator.generateCandidateReport(id, format as any);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) { res.status(500).json({ error: "Report generation failed"}); }
  });

  app.get("/api/reports/cohort/:orgId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { orgId } = req.params;
      const format = (req.query.format as string) ?? "csv";
      const { buffer, mimeType, filename } = await ReportGenerator.generateCohortReport(orgId, format as any);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) { res.status(500).json({ error: "Cohort report generation failed"}); }
  });

  // ── Q3: Privacy Manager ───────────────────────────────────────────────────
  const { privacyManager } = await import("./src/lib/compliance/privacy-manager.js");

  app.get("/api/privacy/settings/:userId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const settings = await privacyManager.getPrivacySettings(req.params.userId);
      res.json(settings);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.post("/api/privacy/consent/:userId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { consents } = req.body;
      const user = (req as any).user;
      await privacyManager.updateConsent(req.params.userId, consents, { ipAddress: req.ip!, userAgent: req.headers["user-agent"] ?? "" });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.post("/api/privacy/export/:userId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const actorId = (req as any).user?.id ?? "system";
      const bundle = await privacyManager.requestDataExport(req.params.userId, actorId);
      res.json(bundle);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.post("/api/privacy/delete/:userId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const actorId = (req as any).user?.id ?? "system";
      const { reason } = req.body;
      const deletion = await privacyManager.requestDeletion(req.params.userId, actorId, reason);
      res.json(deletion);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/privacy/audit/:userId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const log = await privacyManager.getAuditLog(req.params.userId, limit);
      res.json(log);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q5: Learning Trajectory ───────────────────────────────────────────────
  const { LearningTrajectoryAnalyzer } = await import("./src/lib/analytics/learning-trajectory.js");
  const trajectoryAnalyzer = new LearningTrajectoryAnalyzer();

  app.get("/api/analytics/trajectory/:candidateId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const skill = req.query.skill as string | undefined;
      const trajectory = await trajectoryAnalyzer.analyzeTrajectory(req.params.candidateId, skill as any);
      res.json(trajectory);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/analytics/trajectory/:candidateId/multi", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const trajectories = await trajectoryAnalyzer.analyzeMultiSkillTrajectory(req.params.candidateId);
      res.json(trajectories);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/analytics/trajectory/:candidateId/vs-cohort", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { orgId } = req.query;
      if (!orgId) return res.status(400).json({ error: "orgId required" });
      const comparison = await trajectoryAnalyzer.compareCandidateVsCohort(req.params.candidateId, orgId as string);
      res.json(comparison);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q5: Item Difficulty ───────────────────────────────────────────────────
  const { DifficultyEstimator } = await import("./src/lib/analytics/difficulty-estimation.js");
  const diffEstimator = new DifficultyEstimator();

  app.get("/api/analytics/difficulty/:itemId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const report = await diffEstimator.computeItemDifficultyReport(req.params.itemId);
      res.json(report);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/analytics/difficulty", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const skill = req.query.skill as string | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const reports = await diffEstimator.batchEstimate(skill as any, limit);
      res.json(reports);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q5: Learning Path & Spaced Repetition ────────────────────────────────
  const { LearningPathEngine } = await import("./src/lib/recommendations/learning-path-engine.js");
  const { SpacedRepetitionScheduler } = await import("./src/lib/recommendations/spaced-repetition.js");
  const pathEngine = new LearningPathEngine();
  const spacedRep = new SpacedRepetitionScheduler();

  app.get("/api/recommendations/path/:candidateId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const target = req.query.targetCefrLevel as string | undefined;
      const path = await pathEngine.generatePersonalisedPath(req.params.candidateId, target as any);
      res.json(path);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/recommendations/review-queue/:candidateId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      await spacedRep.syncFromSessions(req.params.candidateId);
      const queue = await spacedRep.getReviewQueue(req.params.candidateId);
      res.json(queue);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.post("/api/recommendations/review/:candidateId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const result = await spacedRep.recordReview(req.body);
      res.json(result);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/recommendations/review/:candidateId/forecast", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      await spacedRep.syncFromSessions(req.params.candidateId);
      const queue = await spacedRep.getReviewQueue(req.params.candidateId);
      const days = parseInt(req.query.days as string) || 30;
      const forecast = spacedRep.forecastRetention([...queue.dueItems, ...queue.upcomingItems], days);
      res.json(forecast);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q5: Data Warehouse / BI ───────────────────────────────────────────────
  const { DataWarehouseExporter } = await import("./src/lib/analytics/data-warehouse-exporter.js");
  const dataExporter = new DataWarehouseExporter();

  app.get("/api/bi/metrics/:orgId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const metrics = await dataExporter.getBIMetrics(req.params.orgId);
      res.json(metrics);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.post("/api/bi/export/:orgId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { format, from: fromDate, to: toDate, skill } = req.body;
      const result = await dataExporter.exportAssessments({
        organizationId: req.params.orgId,
        format: format ?? "json",
        from: fromDate ? new Date(fromDate) : undefined,
        to: toDate ? new Date(toDate) : undefined,
      });
      if (result.format === "json") return res.json(JSON.parse(result.data.toString()));
      res.setHeader("Content-Type", result.format === "csv" ? "text/csv" : "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="export-${req.params.orgId}.${result.format}"`);
      res.send(result.data);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q6: SLA Manager ──────────────────────────────────────────────────────
  const { slaManager } = await import("./src/lib/sla/sla-manager.js");

  app.get("/api/sla/:orgId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const report = await slaManager.generateMonthlyReport(req.params.orgId);
      res.json(report);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/sla/:orgId/range", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const from = new Date(req.query.from as string || Date.now() - 30 * 86400000);
      const to   = new Date(req.query.to   as string || Date.now());
      const report = await slaManager.evaluateSLACompliance(req.params.orgId, from, to);
      res.json(report);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q7: Webhook Manager ───────────────────────────────────────────────────
  const { webhookManager } = await import("./src/lib/webhooks/webhook-manager.js");
  await webhookManager.loadFromDatabase();

  app.post("/api/webhooks/register", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const endpoint = await webhookManager.registerWebhook(req.body);
      res.status(201).json(endpoint);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/webhooks/logs", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { webhookId, limit } = req.query;
      const logs = await webhookManager.getDeliveryLog(webhookId as string, parseInt(limit as string) || 100);
      res.json(logs);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/webhooks/stats/:orgId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const stats = await webhookManager.getDeliveryStats(req.params.orgId);
      res.json(stats);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q6: Accessibility / WCAG ──────────────────────────────────────────────
  const { WCAGChecker } = await import("./src/lib/accessibility/wcag-checker.js");
  const wcagChecker = new WCAGChecker();

  app.post("/api/wcag/audit", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { html, level } = req.body;
      if (!html) return res.status(400).json({ error: "html body required" });
      const result = wcagChecker.audit(html, level ?? "AA");
      const report = wcagChecker.generateReport(result);
      res.json({ ...result, report });
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q6: Brand Manager ────────────────────────────────────────────────────
  const { brandManager } = await import("./src/lib/branding/brand-manager.js");

  app.get("/api/brand/:orgId", async (req: express.Request, res: express.Response) => {
    try {
      const config = await brandManager.getBrandConfig(req.params.orgId);
      const css = brandManager.generateCssVariables(config);
      res.json({ config, css });
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/brand/by-domain/:domain", async (req: express.Request, res: express.Response) => {
    try {
      const config = await brandManager.getBrandConfigByDomain(req.params.domain);
      res.json(config);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q8: Cultural Framework ───────────────────────────────────────────────
  const { getCulturalContext, getAllCulturalProfiles, getInstructionalStyle, getFeedbackStyle } = await import("./src/lib/i18n/cultural-framework.js");

  app.get("/api/cultural/profile/:region", async (req: express.Request, res: express.Response) => {
    try {
      const ctx = getCulturalContext(req.params.region as any);
      if (!ctx) return res.status(404).json({ error: "Unknown region" });
      const instructionalStyle = getInstructionalStyle(ctx);
      const feedbackStyle = getFeedbackStyle(ctx);
      res.json({ ...ctx, instructionalStyle, feedbackStyle });
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.get("/api/cultural/profiles", async (_req: express.Request, res: express.Response) => {
    try {
      res.json(getAllCulturalProfiles());
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q8: Cultural Sensitivity Filter ──────────────────────────────────────
  const { CulturalSensitivityFilter } = await import("./src/lib/i18n/cultural-sensitivity-filter.js");
  const sensitivityFilter = new CulturalSensitivityFilter();

  app.post("/api/cultural/filter", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { text, regions } = req.body;
      if (!text) return res.status(400).json({ error: "text required" });
      const report = sensitivityFilter.evaluate(text, regions ?? []);
      res.json(report);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.post("/api/cultural/filter/check", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { text, region } = req.body;
      if (!text || !region) return res.status(400).json({ error: "text and region required" });
      const safe = sensitivityFilter.isSafeForRegion(text, region);
      res.json({ safe, region, textLength: text.length });
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Q8: Regional Compliance ───────────────────────────────────────────────
  const { getComplianceConfig, formatScore, isTestingAllowed } = await import("./src/lib/compliance/regional-compliance.js");

  app.get("/api/cultural/compliance/:region", async (req: express.Request, res: express.Response) => {
    try {
      const config = getComplianceConfig(req.params.region as any);
      if (!config) return res.status(404).json({ error: "Unknown region" });
      res.json(config);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.post("/api/cultural/compliance/:region/check-eligibility", async (req: express.Request, res: express.Response) => {
    try {
      const { attemptsThisYear, daysSinceLastAttempt } = req.body;
      const result = isTestingAllowed(req.params.region as any, attemptsThisYear ?? 0, daysSinceLastAttempt ?? 999);
      res.json(result);
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  app.post("/api/cultural/compliance/:region/format-score", async (req: express.Request, res: express.Response) => {
    try {
      const { score } = req.body;
      if (score === undefined) return res.status(400).json({ error: "score required" });
      const formatted = formatScore(score, req.params.region as any);
      res.json({ formatted, region: req.params.region, rawScore: score });
    } catch (err) { res.status(500).json({ error: "Internal server error" }); }
  });

  // ── Multi-Region: attach region middleware ──────────────────────────────
  const { regionMiddleware, detectRegionFromRequest } = await import("./src/lib/regional/multi-region.js");
  app.use(regionMiddleware);

  app.get("/api/region", (req: any, res) => {
    res.json({
      region: req.region ?? detectRegionFromRequest(req),
      flyRegion: process.env.FLY_REGION ?? "local",
    });
  });

  // ── Edge cache headers ──────────────────────────────────────────────────
  const { edgeCacheMiddleware } = await import("./src/lib/cdn/edge-cache.js");
  app.use(edgeCacheMiddleware);

  // ── Anti-cheat ML v1 ────────────────────────────────────────────────────
  const { computeAnticheatReport } = await import("./src/lib/proctoring/anticheat-ml.js");

  app.post("/api/proctoring/anticheat", authMiddleware, async (req, res) => {
    try {
      const telemetry = req.body;
      if (!telemetry?.sessionId) return res.status(400).json({ error: "sessionId required" });
      const report = computeAnticheatReport(telemetry);
      // Persist risk score to DB if available
      if (dbAvailable && report.riskScore >= 25) {
        try {
          await prisma.session.update({
            where: { id: telemetry.sessionId },
            data: { status: report.riskScore >= 75 ? "FLAGGED" : "IN_PROGRESS" },
          });
        } catch { /* session may not exist in mock mode */ }
      }
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: "Anti-cheat analysis failed"});
    }
  });

  app.get("/api/proctoring/anticheat/:sessionId", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]), async (req, res) => {
    try {
      const { sessionId } = req.params;
      if (dbAvailable) {
        const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true, status: true } });
        if (!session) return res.status(404).json({ error: "Session not found" });
      }
      res.json({ sessionId, message: "Submit telemetry via POST /api/proctoring/anticheat to compute report" });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Whisper Speech Pipeline ─────────────────────────────────────────────
  const whisperRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: "Too many speaking submissions, please wait." },
  });

  app.post("/api/speaking/transcribe", whisperRateLimit, authMiddleware, async (req, res) => {
    try {
      const { audio, filename = "recording.webm", prompt = "", includeTimestamps = false } = req.body;
      if (!audio) return res.status(400).json({ error: "audio (base64) required" });

      const { runWhisperPipelineFromBase64 } = await import("./src/lib/scoring/whisper-pipeline.js");
      const result = await runWhisperPipelineFromBase64(audio, filename, { prompt, includeTimestamps });
      res.json(result);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("OPENAI_API_KEY")) return res.status(503).json({ error: "Whisper not configured — OPENAI_API_KEY missing" });
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  // ── Health / SLO endpoints ───────────────────────────────────────────────
  {
    const { runDeepHealthCheck, uptimeTracker } = await import("./src/lib/observability/uptime-slo.js");

    app.get("/api/healthz/live", (_req, res) => res.json({ status: "ok" }));

    app.get("/api/healthz/ready", async (_req, res) => {
      try {
        const result = await runDeepHealthCheck();
        const httpStatus = result.status === "healthy" ? 200 : 503;
        res.status(httpStatus).json(result);
      } catch (err: any) {
        res.status(503).json({ healthy: false, error: "Health check failed" });
      }
    });

    app.get("/api/healthz/deep", checkRole(["SUPER_ADMIN", "INST_ADMIN"]), async (_req, res) => {
      try {
        const result = await runDeepHealthCheck();
        const slo = uptimeTracker.sloStatus();
        res.json({ ...result, slo });
      } catch (err: any) {
        res.status(503).json({ healthy: false, error: "Health check failed" });
      }
    });

    app.get("/api/admin/slo/uptime", checkRole(["SUPER_ADMIN", "INST_ADMIN"]), (_req, res) => {
      res.json(uptimeTracker.sloStatus());
    });
  }

  // ── Compliance endpoints ─────────────────────────────────────────────────
  {
    const { generateEvidencePackage, buildAuditEvent } = await import("./src/lib/compliance/soc2-iso27001.js");
    const { generateFedRAMPPackage } = await import("./src/lib/compliance/fedramp.js");

    app.get("/api/admin/compliance/soc2", checkRole(["SUPER_ADMIN"]), (_req, res) => {
      res.json(generateEvidencePackage("SOC2"));
    });

    app.get("/api/admin/compliance/iso27001", checkRole(["SUPER_ADMIN"]), (_req, res) => {
      res.json(generateEvidencePackage("ISO27001"));
    });

    app.get("/api/admin/compliance/fedramp", checkRole(["SUPER_ADMIN"]), (_req, res) => {
      res.json(generateFedRAMPPackage());
    });

    app.post("/api/admin/compliance/audit-event", checkRole(["SUPER_ADMIN"]), async (req, res) => {
      try {
        const { actor, action, resource, organizationId, ipAddress, userAgent, outcomeSuccess, previousHash } = req.body;
        if (!actor || !action || !resource) return res.status(400).json({ error: "actor, action, resource required" });
        const event = buildAuditEvent({ category: "ACCESS_CONTROL", severity: "INFO", actor, action, resource, organizationId, ipAddress: ipAddress ?? req.ip, userAgent: userAgent ?? req.headers["user-agent"] ?? "", outcomeSuccess: outcomeSuccess !== false });
        res.json(event);
      } catch (err: any) {
        res.status(500).json({ error: "Internal server error" });
      }
    });
  }

  // ── Real-time IRT calibration streaming (SSE) ────────────────────────────
  {
    const { calibrationStreamer } = await import("./src/lib/psychometrics/realtime-irt-calibration.js");
    calibrationStreamer.start();

    // Snapshot endpoint (REST polling fallback)
    app.get("/api/admin/calibration/status", checkRole(["SUPER_ADMIN", "INST_ADMIN", "ASSESSMENT_DIRECTOR"]), (_req, res) => {
      res.json({ items: calibrationStreamer.getBufferSnapshot(), timestamp: new Date().toISOString() });
    });

    // SSE stream — admin dashboard subscribes and receives live calibration updates
    app.get("/api/admin/calibration/stream", checkRole(["SUPER_ADMIN", "INST_ADMIN", "ASSESSMENT_DIRECTOR"]), (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const onCalibrated = (data: object) => {
        res.write(`event: item_calibrated\ndata: ${JSON.stringify(data)}\n\n`);
      };
      const onCycle = (data: object) => {
        res.write(`event: cycle_complete\ndata: ${JSON.stringify(data)}\n\n`);
      };

      calibrationStreamer.on("item_calibrated", onCalibrated);
      calibrationStreamer.on("cycle_complete", onCycle);

      // Send heartbeat every 30s to keep connection alive through proxies
      const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 30_000);

      req.on("close", () => {
        clearInterval(heartbeat);
        calibrationStreamer.off("item_calibrated", onCalibrated);
        calibrationStreamer.off("cycle_complete", onCycle);
      });
    });
  }

  // ── Item Bank Administration ─────────────────────────────────────────────
  {
    const { expansionEngine } = await import("./src/lib/item-bank/expansion-engine.js");

    app.get("/api/admin/item-bank/snapshot", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), (req, res) => {
      const tier = (req.query.tier as string | undefined) ?? "TIER1";
      res.json(expansionEngine.snapshot(tier as any));
    });

    app.get("/api/admin/item-bank/expansion-plan", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), (req, res) => {
      const tier = (req.query.tier as string | undefined) ?? "TIER1";
      res.json(expansionEngine.expansionPlan(tier as any));
    });

    app.post("/api/admin/item-bank/quality-check", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const { items } = req.body as { items: unknown[] };
        if (!Array.isArray(items)) { res.status(400).json({ error: "items must be an array" }); return; }
        const reports = await expansionEngine.runQualityBatch(items as any);
        res.json(reports);
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });

    app.post("/api/admin/item-bank/promote", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const minN = typeof req.body?.minN === "number" ? req.body.minN : 200;
        const promoted = await expansionEngine.promoteCalibrated(minN);
        res.json({ promoted });
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });

    app.get("/api/admin/item-bank/coverage-heatmap", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        res.json(await expansionEngine.coverageHeatmap());
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });
  }

  // ── Anchor Pool / Equating ───────────────────────────────────────────────
  {
    const { computeAnchorDrift } = await import("./src/lib/item-bank/anchor-pool.js");
    const { meanSigmaEquating, stockingLordEquating, EXTERNAL_CONCORDANCE_TABLE, lookupConcordance }
      = await import("./src/lib/psychometrics/concordance.js");

    app.get("/api/admin/anchors/drift", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const { anchors } = req.body as { anchors?: unknown[] };
        if (!Array.isArray(anchors)) { res.json([]); return; }
        res.json(computeAnchorDrift(anchors as any));
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });

    app.post("/api/admin/anchors/equating", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), (req, res) => {
      try {
        const { anchors, formX, formY, method } = req.body as any;
        if (!Array.isArray(anchors) || !formX || !formY) {
          res.status(400).json({ error: "anchors, formX, formY required" }); return;
        }
        const result = method === "STOCKING_LORD"
          ? stockingLordEquating(anchors, formX, formY)
          : meanSigmaEquating(anchors, formX, formY);
        res.json(result);
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });

    // Public concordance lookup
    app.get("/api/concordance", (req, res) => {
      const theta = parseFloat(req.query.theta as string);
      if (isNaN(theta)) { res.status(400).json({ error: "theta required" }); return; }
      res.json(lookupConcordance(theta));
    });

    app.get("/api/admin/concordance/table", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), (_req, res) => {
      res.json(EXTERNAL_CONCORDANCE_TABLE);
    });
  }

  // ── Exposure Control ─────────────────────────────────────────────────────
  {
    const { generateExposureReport } = await import("./src/lib/item-bank/exposure-control.js");

    app.get("/api/admin/exposure/report", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (_req, res) => {
      try {
        res.json(await generateExposureReport());
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });
  }

  // ── Native Rater Pool ────────────────────────────────────────────────────
  {
    const { NATIVE_RATER_POOL, computeIRRReport } = await import("./src/lib/scoring/native-rater-pool.js");

    app.get("/api/admin/raters", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), (_req, res) => {
      res.json(NATIVE_RATER_POOL);
    });

    app.post("/api/admin/raters/irr", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), (req, res) => {
      try {
        const { tasks } = req.body as { tasks?: unknown[] };
        if (!Array.isArray(tasks)) { res.status(400).json({ error: "tasks array required" }); return; }
        res.json(computeIRRReport(tasks as any));
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });
  }

  // ── Certificates ─────────────────────────────────────────────────────────
  {
    const { issueCertificate, buildCertificatePayload, verifyCertificate, lookupCertificate, listCertificatesByCandidate }
      = await import("./src/lib/certificates/blockchain-cert.js");

    app.post("/api/certificates/issue", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const payload = buildCertificatePayload(req.body);
        const cert    = await issueCertificate(payload);
        res.status(201).json(cert);
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });

    // Public: no auth required
    app.get("/api/certificates/:certId/verify", async (req, res) => {
      try {
        const cert = await lookupCertificate(req.params.certId);
        if (!cert) { res.status(404).json({ error: "Certificate not found" }); return; }
        res.json(await verifyCertificate(cert));
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });

    app.get("/api/certificates/candidate/:candidateId", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        res.json(await listCertificatesByCandidate(req.params.candidateId));
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });
  }

  // ── ALTE Compliance ──────────────────────────────────────────────────────
  {
    const { generateALTEMembershipPackage } = await import("./src/lib/compliance/alte-compliance.js");

    app.get("/api/admin/compliance/alte", checkRole(["SUPER_ADMIN"]), (_req, res) => {
      res.json(generateALTEMembershipPackage());
    });
  }

  // ── Research / Publication Pipeline ─────────────────────────────────────
  {
    const { generatePublicationPackage } = await import("./src/lib/research/publication-pipeline.js");

    app.get("/api/admin/research/export", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const { skill, cefrLevel } = req.query as Record<string, string | undefined>;
        const pkg = await generatePublicationPackage({ skill, cefrLevel });
        const fmt = req.query.format as string | undefined;
        if (fmt === "csv") {
          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", `attachment; filename="item_analysis_${pkg.packageId}.csv"`);
          res.send(pkg.csvFiles["item_analysis.csv"]);
          return;
        }
        res.json(pkg);
      } catch (err) { res.status(500).json({ error: "Internal server error" }); }
    });
  }

  // ── LMS Integration — LTI 1.3, Canvas, Moodle ────────────────────────────
  {
    const { LtiService }          = await import("./src/lib/lti/lti-service.js");
    const { createCanvasAdapter } = await import("./src/lib/lms/canvas-adapter.js");
    const { createMoodleAdapter } = await import("./src/lib/lms/moodle-adapter.js");

    // In-memory platform registry (production: store in DB)
    const ltiPlatforms: Map<string, any> = new Map();

    // ── LTI OIDC login initiation (step 1 of 3-step LTI 1.3 launch)
    // POST /api/lms/lti/login  — receives iss, login_hint, target_link_uri from LMS
    app.post("/api/lms/lti/login", (req, res) => {
      try {
        const { iss, login_hint, target_link_uri, lti_message_hint, client_id } = req.body;
        const platform = ltiPlatforms.get(iss) ?? LtiService.resolvePlatformConfig(iss, client_id ?? "");
        if (!platform) return res.status(400).json({ error: `Unknown LTI platform: ${iss}` });
        const toolLaunchUrl = `${req.protocol}://${req.get("host")}/api/lms/lti/launch`;
        const { redirectUrl } = LtiService.initiateLogin(
          { iss, login_hint, target_link_uri, lti_message_hint, client_id },
          platform,
          toolLaunchUrl,
        );
        return res.redirect(redirectUrl);
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    });

    // ── LTI launch callback (step 3 — platform redirects here with id_token)
    // POST /api/lms/lti/launch
    app.post("/api/lms/lti/launch", async (req, res) => {
      try {
        const { id_token, state } = req.body;
        if (!id_token || !state) return res.status(400).send("Missing id_token or state");

        const stateData = LtiService.consumeState(state);
        if (!stateData) return res.status(403).send("Invalid or expired state");

        const claims = LtiService.parseIdToken(id_token);
        // Resolve platform config for validation
        const platform = ltiPlatforms.get(claims.iss) ?? LtiService.resolvePlatformConfig(claims.iss, Array.isArray(claims.aud) ? claims.aud[0] : claims.aud);
        if (platform) {
          const validation = LtiService.validateLaunchClaims(claims, platform, stateData.nonce);
          if (!validation.valid) return res.status(403).send(`LTI validation failed: ${validation.reason}`);
        }

        // Auto-provision user from LTI identity
        const email = (claims as any)["https://purl.imsglobal.org/spec/lti/claim/lis"]?.person_contact_email_primary
                    ?? `${claims.sub}@lti.linguadapt.com`;
        const name  = (claims as any).name ?? claims.sub;

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: { email, name, role: "CANDIDATE" as const, emailVerified: new Date() },
          });
        }

        const accessToken  = jwt.sign({ userId: user.id }, JWT_SECRET,     { expiresIn: "15m" });
        const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: "7d"  });
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
        setAuthCookies(res, accessToken, refreshToken);

        // Redirect to assessment start, carrying deep-link context
        const targetUri = claims.resourceLink?.id
          ? `/assessment?lti_resource=${encodeURIComponent(claims.resourceLink.id)}`
          : "/dashboard";
        return res.redirect(targetUri);
      } catch (err: any) {
        console.error("[lti] launch error:", err.message);
        return res.status(401).send("LTI launch failed");
      }
    });

    // ── LTI JWKS endpoint (tool public keys)
    // GET /api/lms/lti/jwks
    app.get("/api/lms/lti/jwks", (_req, res) => {
      // Return an empty JWKS; in production, expose the tool's public key
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.json({ keys: [] });
    });

    // ── Canvas grade passback
    // POST /api/lms/canvas/grade-passback
    app.post("/api/lms/canvas/grade-passback", checkRole(["INST_ADMIN", "SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const { lineItemUrl, ltiUserId, score, pointsPossible, comment, baseUrl, accessToken: token } = req.body;
        if (!lineItemUrl || !ltiUserId || score === undefined) {
          return res.status(400).json({ error: "lineItemUrl, ltiUserId, score required" });
        }
        const canvas = createCanvasAdapter({ baseUrl, accessToken: token });
        await canvas.agsGradePassback(lineItemUrl, ltiUserId, Number(score), Number(pointsPossible ?? 100), comment);
        return res.json({ ok: true });
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // ── Moodle grade passback
    // POST /api/lms/moodle/grade-passback
    app.post("/api/lms/moodle/grade-passback", checkRole(["INST_ADMIN", "SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const { courseId, assignmentId, moodleUserId, score, maxScore, comment, baseUrl, wsToken } = req.body;
        if (!courseId || !assignmentId || !moodleUserId || score === undefined) {
          return res.status(400).json({ error: "courseId, assignmentId, moodleUserId, score required" });
        }
        const moodle = createMoodleAdapter({ baseUrl, wsToken });
        await moodle.agsGradePassback({ courseId, assignmentId, moodleUserId, score: Number(score), maxScore, comment });
        return res.json({ ok: true });
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // ── LMS platform registration (admin CRUD)
    // GET /api/lms/platforms
    app.get("/api/lms/platforms", checkRole(["SUPER_ADMIN", "INST_ADMIN"]), (_req, res) => {
      const platforms = [...ltiPlatforms.values()];
      return res.json({ platforms });
    });

    // POST /api/lms/platforms — register a new LMS platform
    app.post("/api/lms/platforms", checkRole(["SUPER_ADMIN"]), (req, res) => {
      try {
        const { platformId, clientId, oidcAuthEndpoint, tokenEndpoint, jwksEndpoint, deploymentId } = req.body;
        if (!platformId || !clientId) return res.status(400).json({ error: "platformId and clientId required" });
        const config = { platformId, clientId, oidcAuthEndpoint, tokenEndpoint, jwksEndpoint, deploymentId };
        ltiPlatforms.set(platformId, config);
        return res.status(201).json({ platform: config });
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    });
  }

  // ── Score Reporting API ───────────────────────────────────────────────────
  {
    const { ScoreReportService, resolveOrgFromApiKey } = await import("./src/lib/reporting/score-report-api.js");

    /** Middleware: accept either JWT cookie OR API key (Bearer la_…) */
    async function reportAuth(req: any, res: any, next: any) {
      // 1. Try standard JWT cookie
      const accessToken = req.cookies?.accessToken;
      if (accessToken) {
        try {
          const decoded = jwt.verify(accessToken, JWT_SECRET) as any;
          req.user    = decoded;
          req.apiOrg  = null;
          return next();
        } catch { /* fall through to API key */ }
      }
      // 2. Try API key
      const authHeader = req.headers["authorization"] ?? "";
      const raw        = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (raw.startsWith("la_")) {
        const org = await resolveOrgFromApiKey(raw);
        if (org) {
          req.user   = null;
          req.apiOrg = org;
          return next();
        }
      }
      return res.status(401).json({ error: "Unauthorized" });
    }

    function baseUrl(req: any) {
      return `${req.protocol}://${req.get("host")}`;
    }

    // GET /api/reports/scores/:sessionId
    app.get("/api/reports/scores/:sessionId", reportAuth, async (req, res) => {
      try {
        const orgId = req.apiOrg?.id ?? (await prisma.session.findUnique({ where: { id: req.params.sessionId }, select: { organizationId: true } }))?.organizationId;
        if (!orgId) return res.status(404).json({ error: "Session not found" });
        const report = await ScoreReportService.getSessionReport(req.params.sessionId, orgId, baseUrl(req));
        if (!report) return res.status(404).json({ error: "Session not found" });
        return res.json(report);
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // GET /api/reports/candidates/:candidateId/history
    app.get("/api/reports/candidates/:candidateId/history", reportAuth, async (req, res) => {
      try {
        const limit  = Math.min(parseInt(req.query.limit  as string ?? "20"), 100);
        const offset = parseInt(req.query.offset as string ?? "0");
        const orgId  = req.apiOrg?.id;
        if (!orgId && !req.user) return res.status(401).json({ error: "Cannot determine organisation" });
        const resolvedOrgId = orgId ?? (await prisma.user.findUnique({ where: { id: req.user?.userId }, select: { organizationId: true } }))?.organizationId ?? "";
        const result = await ScoreReportService.getCandidateHistory(req.params.candidateId, resolvedOrgId, baseUrl(req), limit, offset);
        return res.json(result);
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // GET /api/reports/organisations/:orgId/aggregate
    app.get("/api/reports/organisations/:orgId/aggregate", reportAuth, async (req, res) => {
      try {
        // Only the org itself (via API key) or admins can view aggregate
        const callerOrgId = req.apiOrg?.id ?? null;
        if (callerOrgId && callerOrgId !== req.params.orgId) return res.status(403).json({ error: "Forbidden" });
        const result = await ScoreReportService.getOrgAggregate(req.params.orgId, baseUrl(req));
        return res.json(result);
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // POST /api/reports/batch
    app.post("/api/reports/batch", reportAuth, async (req, res) => {
      try {
        const { sessionIds } = req.body;
        if (!Array.isArray(sessionIds) || sessionIds.length === 0 || sessionIds.length > 200) {
          return res.status(400).json({ error: "sessionIds must be a non-empty array of ≤ 200 IDs" });
        }
        const callerOrgId = req.apiOrg?.id;
        if (!callerOrgId) return res.status(400).json({ error: "API key required for batch requests" });
        const reports = await ScoreReportService.batchReports(sessionIds, callerOrgId, baseUrl(req));
        return res.json({ data: reports, meta: { generated_at: new Date().toISOString(), count: reports.length } });
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // POST /api/reports/api-keys — generate a new API key for an org (admin only)
    app.post("/api/reports/api-keys", checkRole(["SUPER_ADMIN", "INST_ADMIN"]), async (req, res) => {
      try {
        const { generateApiKey } = await import("./src/lib/reporting/score-report-api.js");
        const { orgId } = req.body;
        if (!orgId) return res.status(400).json({ error: "orgId required" });
        const { key, digest } = generateApiKey();
        await prisma.organization.update({ where: { id: orgId }, data: { apiKeyDigest: digest } as any });
        return res.json({ key, note: "Store this key securely — it will not be shown again." });
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });
  }

  // ── Diagnostic Test Engine ───────────────────────────────────────────────
  {
    const { DiagnosticService } = await import("./src/lib/assessment-engine/diagnostic-service.js");

    // POST /api/sessions/diagnostic/launch
    app.post("/api/sessions/diagnostic/launch", checkRole(["CANDIDATE", "INST_ADMIN", "SUPER_ADMIN"]), async (req, res) => {
      try {
        const userId = (req as any).user?.userId;
        const user   = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "User not found" });
        const orgId = user.organizationId ?? "default";
        const result = await DiagnosticService.launch(userId, orgId);
        return res.status(201).json(result);
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // POST /api/sessions/diagnostic/:id/respond
    app.post("/api/sessions/diagnostic/:id/respond", checkRole(["CANDIDATE", "INST_ADMIN", "SUPER_ADMIN"]), async (req, res) => {
      try {
        const { itemId, value, latencyMs } = req.body;
        if (!itemId || value === undefined) return res.status(400).json({ error: "itemId and value required" });
        const result = await DiagnosticService.respond(req.params.id, itemId, String(value), Number(latencyMs ?? 0));
        return res.json(result);
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    });

    // GET /api/sessions/diagnostic/:id/report
    app.get("/api/sessions/diagnostic/:id/report", checkRole(["CANDIDATE", "INST_ADMIN", "SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const report = await DiagnosticService.getReport(req.params.id);
        return res.json(report);
      } catch (err: any) {
        return res.status(404).json({ error: err.message });
      }
    });
  }

  // ── 2-Year Score Validity Policy ─────────────────────────────────────────
  {
    const { ValidityPolicyService } = await import("./src/lib/certificates/validity-policy.js");

    // Public — GET /api/validity/:sessionId
    app.get("/api/validity/:sessionId", async (req, res) => {
      try {
        const result = await ValidityPolicyService.publicVerify(req.params.sessionId);
        return res.json(result);
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // Authenticated — GET /api/validity/:sessionId/detail (full result with candidate info)
    app.get("/api/validity/:sessionId/detail", checkRole(["CANDIDATE", "INST_ADMIN", "SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const result = await ValidityPolicyService.checkValidity(req.params.sessionId);
        return res.json(result);
      } catch (err: any) {
        return res.status(404).json({ error: err.message });
      }
    });

    // Admin — GET /api/admin/expiring-certificates?orgId=&days=60
    app.get("/api/admin/expiring-certificates", checkRole(["INST_ADMIN", "SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const orgId   = req.query.orgId as string;
        const days    = parseInt(req.query.days as string ?? "60");
        if (!orgId) return res.status(400).json({ error: "orgId required" });
        const results = await ValidityPolicyService.getExpiringSessions(orgId, days);
        return res.json({ data: results, meta: { count: results.length, withinDays: days } });
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // Admin — POST /api/admin/validity/expire-batch (manual cron trigger)
    app.post("/api/admin/validity/expire-batch", checkRole(["SUPER_ADMIN"]), async (_req, res) => {
      try {
        const result = await ValidityPolicyService.markExpiredSessions();
        return res.json({ ok: true, ...result });
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // Extend /api/certificates/:certId/verify to include validity
    app.get("/api/certificates/verify/:certId/validity", async (req, res) => {
      try {
        // certId here is treated as sessionId for the validity lookup
        const result = await ValidityPolicyService.publicVerify(req.params.certId);
        return res.json(result);
      } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
      }
    });
  }

  // ── Teacher / Class / Assignment API ────────────────────────────────────

  const teacherRoles = ["TEACHER", "INST_ADMIN", "SUPER_ADMIN", "ASSESSMENT_DIRECTOR"];

  // GET /api/teacher/classes — list classes the authenticated user teaches (or all for admin)
  app.get("/api/teacher/classes", checkRole(teacherRoles), async (req: any, res) => {
    try {
      const user = req.user as { userId: string; role: string };
      const isAdmin = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"].includes(user.role);
      const classes = await prisma.class.findMany({
        where: isAdmin ? undefined : { teacherId: user.userId },
        include: {
          _count: { select: { members: true, assignments: true } },
          teacher: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return res.json(classes);
    } catch (err: any) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/teacher/classes/:id — class detail with members and recent sessions
  app.get("/api/teacher/classes/:id", checkRole(teacherRoles), async (req: any, res) => {
    try {
      const user = req.user as { userId: string; role: string };
      const cls = await prisma.class.findUnique({
        where: { id: req.params.id },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
          members: {
            include: {
              user: {
                select: {
                  id: true, name: true, email: true,
                  sessions: {
                    where: { status: "COMPLETED" },
                    orderBy: { completedAt: "desc" },
                    take: 1,
                    select: { id: true, cefrLevel: true, theta: true, completedAt: true },
                  },
                },
              },
            },
          },
          assignments: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
      if (!cls) return res.status(404).json({ error: "Class not found" });
      const isAdmin = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"].includes(user.role);
      if (!isAdmin && cls.teacherId !== user.userId)
        return res.status(403).json({ error: "Access denied" });
      return res.json(cls);
    } catch (err: any) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/teacher/classes — create a class
  app.post("/api/teacher/classes", checkRole(teacherRoles), async (req: any, res) => {
    try {
      const user = req.user as { userId: string; organizationId?: string };
      const { name, description, teacherId } = req.body;
      if (!name || typeof name !== "string") return res.status(400).json({ error: "name required" });
      const orgUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { organizationId: true } });
      const orgId = orgUser?.organizationId;
      if (!orgId) return res.status(400).json({ error: "User has no organization" });
      const cls = await prisma.class.create({
        data: {
          name: name.trim(),
          description: description ?? null,
          organizationId: orgId,
          teacherId: teacherId ?? user.userId,
        },
      });
      return res.status(201).json(cls);
    } catch (err: any) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/teacher/classes/:id/members — add student(s) to class
  app.post("/api/teacher/classes/:id/members", checkRole(teacherRoles), async (req: any, res) => {
    try {
      const user = req.user as { userId: string; role: string };
      const cls = await prisma.class.findUnique({ where: { id: req.params.id } });
      if (!cls) return res.status(404).json({ error: "Class not found" });
      const isAdmin = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"].includes(user.role);
      if (!isAdmin && cls.teacherId !== user.userId)
        return res.status(403).json({ error: "Access denied" });
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0)
        return res.status(400).json({ error: "userIds array required" });
      await prisma.classMember.createMany({
        data: userIds.map((uid: string) => ({ classId: cls.id, userId: uid })),
        skipDuplicates: true,
      });
      return res.json({ ok: true, added: userIds.length });
    } catch (err: any) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /api/teacher/classes/:id/members/:userId — remove member
  app.delete("/api/teacher/classes/:id/members/:userId", checkRole(teacherRoles), async (req: any, res) => {
    try {
      await prisma.classMember.deleteMany({
        where: { classId: req.params.id, userId: req.params.userId },
      });
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/teacher/classes/:id/skills — aggregated skill stats for the class
  app.get("/api/teacher/classes/:id/skills", checkRole(teacherRoles), async (req: any, res) => {
    try {
      const user = req.user as { userId: string; role: string };
      const cls = await prisma.class.findUnique({
        where: { id: req.params.id },
        include: { members: { select: { userId: true } } },
      });
      if (!cls) return res.status(404).json({ error: "Class not found" });
      const isAdmin = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"].includes(user.role);
      if (!isAdmin && cls.teacherId !== user.userId)
        return res.status(403).json({ error: "Access denied" });
      const memberIds = cls.members.map((m) => m.userId);
      // Get latest completed session per member
      const sessions = await prisma.session.findMany({
        where: { candidateId: { in: memberIds }, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        distinct: ["candidateId"],
        select: { candidateId: true, cefrLevel: true, theta: true, metadata: true },
      });
      // Build CEFR distribution
      const dist: Record<string, number> = {};
      for (const s of sessions) {
        const lvl = s.cefrLevel ?? "UNCLASSIFIED";
        dist[lvl] = (dist[lvl] ?? 0) + 1;
      }
      return res.json({
        memberCount: memberIds.length,
        assessedCount: sessions.length,
        cefrDistribution: dist,
        averageTheta: sessions.length
          ? sessions.reduce((a, s) => a + (s.theta ?? 0), 0) / sessions.length
          : null,
        members: sessions,
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/teacher/assignments — list assignments for the teacher's classes
  app.get("/api/teacher/assignments", checkRole(teacherRoles), async (req: any, res) => {
    try {
      const user = req.user as { userId: string; role: string };
      const isAdmin = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"].includes(user.role);
      const assignments = await prisma.assignment.findMany({
        where: isAdmin ? undefined : { class: { teacherId: user.userId } },
        include: {
          class: { select: { id: true, name: true } },
          _count: { select: { sessions: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return res.json(assignments);
    } catch (err: any) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/teacher/assignments — create an assignment
  app.post("/api/teacher/assignments", checkRole(teacherRoles), async (req: any, res) => {
    try {
      const user = req.user as { userId: string; role: string };
      const { classId, productLine, title, openAt, dueAt, maxAttempts } = req.body;
      if (!productLine) return res.status(400).json({ error: "productLine required" });
      let orgId: string | null = null;
      if (classId) {
        const cls = await prisma.class.findUnique({ where: { id: classId } });
        if (!cls) return res.status(404).json({ error: "Class not found" });
        const isAdmin = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"].includes(user.role);
        if (!isAdmin && cls.teacherId !== user.userId)
          return res.status(403).json({ error: "Access denied" });
        orgId = cls.organizationId;
      } else {
        const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { organizationId: true } });
        orgId = u?.organizationId ?? null;
      }
      if (!orgId) return res.status(400).json({ error: "Cannot determine organization" });
      const assignment = await prisma.assignment.create({
        data: {
          title: title ?? null,
          organizationId: orgId,
          classId: classId ?? null,
          assignedById: user.userId,
          productLine,
          openAt: openAt ? new Date(openAt) : null,
          dueAt: dueAt ? new Date(dueAt) : null,
          maxAttempts: maxAttempts ?? 1,
        },
      });
      return res.status(201).json(assignment);
    } catch (err: any) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── SEO: robots.txt + sitemap.xml ───────────────────────────────────────
  app.get("/robots.txt", (_req, res) => {
    res.set("Content-Type", "text/plain; charset=utf-8").send(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/",
        "Disallow: /admin",
        "Disallow: /assessment",
        "Disallow: /dashboard",
        "Disallow: /verify-email",
        "Disallow: /reset-password",
        "",
        `Sitemap: ${APP_BASE_URL}/sitemap.xml`,
      ].join("\n")
    );
  });

  app.get("/sitemap.xml", (_req, res) => {
    const now = new Date().toISOString().split("T")[0];
    const urls: Array<{ loc: string; priority: string; changefreq: string }> = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/pricing", priority: "0.9", changefreq: "monthly" },
      { loc: "/english-level-test", priority: "0.9", changefreq: "monthly" },
      { loc: "/ingilizce-seviye-testi", priority: "0.9", changefreq: "monthly" },
      { loc: "/cefr-english-test", priority: "0.8", changefreq: "monthly" },
      { loc: "/english-assessment-for-universities", priority: "0.8", changefreq: "monthly" },
      { loc: "/english-assessment-for-companies", priority: "0.8", changefreq: "monthly" },
      { loc: "/schools", priority: "0.7", changefreq: "monthly" },
      { loc: "/corporate", priority: "0.7", changefreq: "monthly" },
      { loc: "/academia", priority: "0.7", changefreq: "monthly" },
      { loc: "/language-schools", priority: "0.7", changefreq: "monthly" },
      { loc: "/methodology", priority: "0.6", changefreq: "monthly" },
    ];
    const urlTags = urls
      .map(
        (u) =>
          `  <url>\n    <loc>${APP_BASE_URL}${u.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join("\n");
    res
      .set("Content-Type", "application/xml; charset=utf-8")
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlTags}\n</urlset>`);
  });

  // ── Q3: Realtime WebSocket Dashboard ────────────────────────────────────
  // Import http module to get underlying server for WS attachment
  const http = await import("http");
  const { realtimeManager } = await import("./src/lib/realtime/websocket-manager.js");

  // Create http.Server from Express app and attach WS
  const httpServer = http.createServer(app);
  realtimeManager.attach(httpServer);

  // Override app.listen with httpServer.listen below
  httpServer.listen(parseInt(process.env.PORT || "3001", 10), "0.0.0.0", () => {
    console.log(`LinguAdapt Server running on http://localhost:${process.env.PORT || "3001"}`);
    console.log(`[WS] Realtime dashboard WebSocket attached at /ws/dashboard`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    // ── Per-route meta injection for marketing/SEO pages ──────────────────
    interface RouteMeta {
      title: string;
      description: string;
      keywords?: string;
      jsonLd?: object;
    }

    const ORG_LD = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "B4Skills",
      url: APP_BASE_URL,
      logo: `${APP_BASE_URL}/icons/pwa-192.png`,
      sameAs: [],
    };

    const WEBSITE_LD = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "B4Skills",
      url: APP_BASE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${APP_BASE_URL}/english-level-test`,
        "query-input": "required name=search_term_string",
      },
    };

    const ROUTE_META: Record<string, RouteMeta> = {
      "/": {
        title: "B4Skills — Adaptive English Assessment Platform",
        description: "AI-powered adaptive CEFR English assessment for individuals, schools, universities, and corporates. Get your certified English level in 15–60 minutes.",
        keywords: "english assessment, cefr test, adaptive english test, english proficiency, b4skills",
        jsonLd: [ORG_LD, WEBSITE_LD],
      },
      "/pricing": {
        title: "Pricing — B4Skills English Assessment",
        description: "Transparent pricing for adaptive CEFR English testing. Free Quick Check, €19 Full Assessment, and volume plans for institutions from €6/learner.",
        keywords: "english test price, cefr test cost, english assessment pricing, b4skills pricing",
        jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: "B4Skills Pricing", description: "Pricing plans for adaptive CEFR English assessment.", url: `${APP_BASE_URL}/pricing` },
      },
      "/methodology": {
        title: "Assessment Methodology — B4Skills",
        description: "How B4Skills works: adaptive CAT engine, IRT 3PL, CEFR alignment, AI multi-model scoring, DIF fairness monitoring, and certificate validation.",
        keywords: "cefr methodology, adaptive testing methodology, irt 3pl, cat engine, english assessment methodology",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "Why does my result differ from IELTS?", acceptedAnswer: { "@type": "Answer", text: "Different assessments measure proficiency through different tasks and stakes conditions." } },
            { "@type": "Question", name: "What is theta (θ)?", acceptedAnswer: { "@type": "Answer", text: "Theta is the latent ability estimate from IRT with a known measurement error, making it more informative than a percentage score." } },
          ],
        },
      },
      "/schools": {
        title: "English Assessment for Schools — B4Skills",
        description: "Adaptive CEFR English testing for primary and secondary schools. Class management, teacher dashboards, and cohort analytics.",
        keywords: "english assessment schools, school english test, cefr schools, teacher english dashboard",
      },
      "/corporate": {
        title: "Corporate English Assessment — B4Skills",
        description: "Screen, place, and develop English skills across your workforce. CEFR-aligned assessment with ATS/HRIS integration and volume pricing.",
        keywords: "corporate english test, workforce english assessment, hr english screening, cefr corporate",
      },
      "/academia": {
        title: "English Assessment for Academia — B4Skills",
        description: "EAP placement and proficiency testing for universities and research institutions. CEFR-aligned with LMS integration.",
        keywords: "academia english test, university english assessment, eap placement, cefr academia",
      },
      "/language-schools": {
        title: "English Assessment for Language Schools — B4Skills",
        description: "Adaptive CEFR placement and progress testing for language schools. Group analysis and institutional dashboard.",
        keywords: "language school english test, language center placement, cefr language school",
      },
      "/english-level-test": {
        title: "Free English Level Test — CEFR A1 to C2 | B4Skills",
        description: "Take a free adaptive English level test and get your official CEFR level in under 15 minutes. Instant results, no account required.",
        keywords: "english level test, free english test, cefr test online, english proficiency test",
      },
      "/ingilizce-seviye-testi": {
        title: "İngilizce Seviye Testi — CEFR A1-C2 | B4Skills",
        description: "Ücretsiz adaptif İngilizce seviye testiyle CEFR seviyenizi 15 dakikada öğrenin. Anında sonuç, kayıt gerektirmez.",
        keywords: "ingilizce seviye testi, ingilizce sınav, cefr testi türkçe, ingilizce test",
      },
      "/cefr-english-test": {
        title: "CEFR English Test — Adaptive Assessment | B4Skills",
        description: "Certified CEFR-aligned adaptive English test with QR-verifiable certificate. Accepted by universities and employers worldwide.",
        keywords: "cefr english test, cefr assessment online, cefr certificate, cefr level test",
      },
      "/english-assessment-for-universities": {
        title: "English Assessment for Universities — B4Skills",
        description: "Adaptive CEFR placement for universities: bulk import, LMS integration, cohort analytics. 14-day free pilot.",
        keywords: "english assessment universities, english placement test university, cefr university test",
      },
      "/english-assessment-for-companies": {
        title: "English Assessment for Companies — B4Skills",
        description: "Fast, reliable English proficiency testing for HR teams. CEFR-aligned, bulk testing, workforce skill analytics.",
        keywords: "english assessment companies, corporate english proficiency, hr english test, workforce english",
      },
    };

    const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const injectSeoMeta = (html: string, meta: RouteMeta, reqPath: string): string => {
      const ldJson = Array.isArray(meta.jsonLd) ? meta.jsonLd : meta.jsonLd ? [meta.jsonLd] : [
        { "@context": "https://schema.org", "@type": "WebPage", name: meta.title, description: meta.description, url: `${APP_BASE_URL}${reqPath}` },
      ];
      const extraTags = [
        meta.keywords ? `<meta name="keywords" content="${escHtml(meta.keywords)}" />` : "",
        `<meta property="og:url" content="${APP_BASE_URL}${reqPath}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:image" content="${APP_BASE_URL}/icons/pwa-192.png" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${escHtml(meta.title)}" />`,
        `<meta name="twitter:description" content="${escHtml(meta.description)}" />`,
        ...ldJson.map((ld) => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`),
      ].filter(Boolean).join("\n    ");

      return html
        .replace(/<title>[^<]*<\/title>/, `<title>${escHtml(meta.title)}</title>`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escHtml(meta.description)}" />`)
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escHtml(meta.title)}" />`)
        .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escHtml(meta.description)}" />`)
        .replace("</head>", `  ${extraTags}\n  </head>`);
    };

    let _cachedIndexHtml: string | null = null;
    const getIndexHtml = () => {
      if (!_cachedIndexHtml) _cachedIndexHtml = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
      return _cachedIndexHtml;
    };

    app.get("*", (req, res) => {
      const ext = path.extname(req.path);
      if (ext && ext !== ".html") return res.status(404).end();

      const meta = ROUTE_META[req.path] ?? null;
      if (meta) {
        const injected = injectSeoMeta(getIndexHtml(), meta, req.path);
        return res.set("Content-Type", "text/html; charset=utf-8").send(injected);
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Note: httpServer.listen() is called above, after the WebSocket attachment.
  // The old app.listen() is replaced by httpServer.listen() to support WS upgrade.
}

startServer();
