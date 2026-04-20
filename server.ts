import "dotenv/config";
import "./src/lib/observability/instrument.js";
import express from "express";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "./src/lib/prisma.js";
import { BillingService } from "./src/lib/enterprise/billing-service.js";
import { logger, httpLogger, captureException, Sentry } from "./src/lib/observability/index.js";
import { buildCorsMiddleware, buildHelmetMiddleware, assertProductionSecrets } from "./src/lib/security/http-security.js";
import { validate } from "./src/lib/security/validate.js";
import * as Schemas from "./src/lib/security/schemas/index.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set to true once a live DB connection is confirmed at startup
let dbAvailable = false;

async function startServer() {
  assertProductionSecrets();

  const app = express();
  const PORT = parseInt(process.env.PORT || "3001", 10);

  app.set("trust proxy", 1);

  // Probe DB connectivity — fall back to mock/demo mode if unreachable
  if (process.env.DATABASE_URL) {
    try {
      await (prisma as any).$queryRaw`SELECT 1`;
      dbAvailable = true;
      logger.info("Database connected");
    } catch (err) {
      dbAvailable = false;
      logger.warn({ err }, "Database not reachable — running in mock/demo mode");
    }
  }

  app.use(httpLogger);
  // --- REQUEST CORRELATION ID ---
  // Attach a unique request ID to every request for distributed tracing.
  // Reuses X-Request-Id if sent by a trusted upstream proxy, otherwise generates one.
  app.use((req, res, next) => {
    const id = (req.headers["x-request-id"] as string) || crypto.randomUUID();
    (req as any).id = id;
    res.setHeader("X-Request-Id", id);
    next();
  });
  app.use(buildHelmetMiddleware());
  app.use(compression());
  app.use(buildCorsMiddleware());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  app.use(cookieParser());

  // --- CSRF PROTECTION ---
  // For state-changing requests (POST/PUT/PATCH/DELETE) that carry cookies,
  // verify the Origin or Referer header matches the expected host to block
  // cross-site form submissions. SPA clients also send X-Requested-With.
  app.use((req, res, next) => {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();
    // Skip webhook-like routes that use HMAC signatures instead
    if (req.path.startsWith('/api/webhooks/')) return next();

    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const host = req.headers.host;

    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return res.status(403).json({ error: 'CSRF check failed: origin mismatch' });
        }
      } catch {
        return res.status(403).json({ error: 'CSRF check failed: invalid origin' });
      }
    } else if (referer) {
      try {
        const refHost = new URL(referer).host;
        if (refHost !== host) {
          return res.status(403).json({ error: 'CSRF check failed: referer mismatch' });
        }
      } catch {
        return res.status(403).json({ error: 'CSRF check failed: invalid referer' });
      }
    }
    // Allow requests with no Origin/Referer only in dev (server-to-server calls)
    next();
  });

  // --- HEALTH CHECKS ---
  // /healthz — liveness probe: process is alive (no DB required)
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // /readyz — readiness probe: DB must be reachable before accepting traffic
  app.get("/readyz", async (_req, res) => {
    try {
      if (process.env.DATABASE_URL) {
        await (prisma as any).$queryRaw`SELECT 1`;
      }
      res.json({ status: "ready", db: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(503).json({ status: "not_ready", db: false, error: "Database unreachable", timestamp: new Date().toISOString() });
    }
  });

  // /api/health — alias kept for backwards-compatibility; same as /readyz
  app.get("/api/health", async (_req, res) => {
    try {
      if (process.env.DATABASE_URL) {
        await (prisma as any).$queryRaw`SELECT 1`;
      }
      res.json({ status: "ok", db: dbAvailable, uptime: process.uptime(), timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: "degraded", db: false, uptime: process.uptime(), timestamp: new Date().toISOString() });
    }
  });

  // --- AUTH ROUTES ---
  const isProd = process.env.NODE_ENV === "production";
  const JWT_SECRET = process.env.JWT_SECRET
    || (isProd ? (() => { throw new Error("JWT_SECRET is required in production"); })() : "dev-only-insecure-jwt-secret-do-not-use-in-prod");
  const REFRESH_SECRET = process.env.REFRESH_SECRET
    || (isProd ? (() => { throw new Error("REFRESH_SECRET is required in production"); })() : "dev-only-insecure-refresh-secret-do-not-use-in-prod");

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per `window` (here, per 15 minutes)
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter limiter for password-reset/email-verify/Google-auth endpoints
  const authSensitiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: 'Too many attempts from this IP. Please try again after 1 hour.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Returns error details only in non-production environments
  const devDetails = (err: unknown): string | undefined =>
    process.env.NODE_ENV !== 'production' ? String(err) : undefined;

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

  app.post("/api/auth/register", validate({ body: Schemas.Auth.RegisterBody }), async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
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
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", loginLimiter, validate({ body: Schemas.Auth.LoginBody }), async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      const user = await prisma.user.findUnique({ where: { email } });
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
      return res.json({ token: accessToken, user: { uid: user.id, email: user.email, displayName: user.name, role: user.role } });
    } catch (err: any) {
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const rf = req.cookies.refreshToken;
    if (rf) {
      const decoded: any = jwt.decode(rf);
      if (decoded && decoded.userId) {
        await prisma.user.updateMany({
           where: { id: decoded.userId, refreshToken: rf },
           data: { refreshToken: null }
        }).catch(() => {});
      }
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json({ success: true });
  });

  app.get("/api/auth/me", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const userId = (req as any).user.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: { uid: user.id, email: user.email, displayName: user.name, role: user.role } });
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const rf = req.cookies.refreshToken;
      if (!rf) return res.status(401).json({ error: 'No refresh token' });
      const decoded: any = jwt.verify(rf, REFRESH_SECRET);
      
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
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

  const sendMockEmail = async (to: string, subject: string, text: string) => {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    const info = await transporter.sendMail({
      from: '"Linguadapt Auth" <noreply@linguadapt.com>',
      to,
      subject,
      text,
    });
    console.log(`✉️ Email Mock to ${to}: ${subject}`);
    console.log(`✉️ Preview URL: %s`, nodemailer.getTestMessageUrl(info));
  };

  app.post("/api/auth/forgot-password", authSensitiveLimiter, validate({ body: Schemas.Auth.ForgotPasswordBody }), async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'If email exists, reset link sent.' }); // Generic response

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpires: resetExpires }
    });

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;
    await sendMockEmail(user.email, "Password Reset", `Click here to reset: ${resetLink}`);
    
    return res.json({ message: 'If email exists, reset link sent.' });
  });

  app.post("/api/auth/reset-password", authSensitiveLimiter, validate({ body: Schemas.Auth.ResetPasswordBody }), async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Missing required fields' });
    
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

  app.post("/api/auth/verify-email", authSensitiveLimiter, validate({ body: Schemas.Auth.VerifyEmailBody }), async (req, res) => {
    const { email } = req.body; // Mock endpoint to start email verification process
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return res.json({ message: 'Process started if email needs verification' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyEmailToken: verifyToken }
    });
    
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const verifyLink = `${appUrl}/verify-email?token=${verifyToken}`;
    await sendMockEmail(user.email, "Verify your email", `Click here to verify: ${verifyLink}`);
    return res.json({ message: 'Process started if email needs verification' });
  });

  app.post("/api/auth/google", authSensitiveLimiter, validate({ body: Schemas.Auth.GoogleAuthBody }), async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    
    try {
      const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
      if (!GOOGLE_CLIENT_ID) {
        return res.status(503).json({ error: 'Google OAuth is not configured on this server' });
      }

      const client = new OAuth2Client(GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new Error("Invalid token payload");

      const { email, name } = payload;

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email, name: name || email, role: 'CANDIDATE', emailVerified: new Date() }
        });
      }
      
      const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
      await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
      
      setAuthCookies(res, accessToken, refreshToken);
      return res.json({ token: accessToken, user: { uid: user.id, email: user.email, displayName: user.name, role: user.role } });
    } catch(err) {
      return res.status(401).json({ error: 'Invalid Google Token' });
    }
  });
  
  // --- OFFLINE MOCK MIDDLEWARE ---
  // If no database is available, we intercept admin routes and serve mock data
  app.use("/api", (req, res, next) => {
    if (!dbAvailable) {
      const url = req.url;
      const method = req.method;

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
        if (method === "POST") return res.json({ id: "ak-" + Date.now(), name: req.body.name, key: "b4s_" + Math.random().toString(36).substr(2, 16), createdAt: new Date().toISOString() });
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
          const ran = Math.random().toString(36).substring(2, 6).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
          codes.push({ code: `${prefix}-${ran}` });
        }
        return res.json({ message: `Generated ${codes.length} codes`, codes: codes.map(c => c.code) });
      }
      if (url === "/codes/validate" && method === "POST") {
        return res.json({ valid: true, examCode: { code: req.body?.code, productLine: "General", organizationId: "b4skills-demo" } });
      }
      if (url === "/codes/redeem" && method === "POST") {
        return res.json({ success: true, organizationId: "b4skills-demo", productLine: "General" });
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
    }
    next();
  });

  // --- RBAC MIDDLEWARE ---
  const checkRole = (roles: string[]) => {
    return async (req: any, res: any, next: any) => {
      try {
        // Verify JWT token (same logic as authMiddleware — do not trust arbitrary headers)
        let token = req.cookies.accessToken;
        if (!token && req.headers.authorization?.startsWith("Bearer ")) {
          token = req.headers.authorization.split(" ")[1];
        }
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        const decoded: any = jwt.verify(token, JWT_SECRET);

        if (!dbAvailable) {
          // Demo mode: grant limited read-only access; never SUPER_ADMIN without DB
          req.user = { id: decoded.userId, role: "INST_ADMIN", organizationId: "default-org" };
          if (roles.some(r => ["INST_ADMIN", "PROCTOR", "RATER", "CANDIDATE"].includes(r))) return next();
          return res.status(403).json({ error: "Forbidden: Insufficient permissions in demo mode" });
        }

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { role: true, organizationId: true }
        });

        if (!user || !roles.includes(user.role)) {
          return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        }

        req.user = { id: decoded.userId, role: user.role, organizationId: user.organizationId };
        next();
      } catch (err) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    };
  };

  
// --- MOCK MODE FOR UI DEMO WITHOUT DB ---
let mockSessions: Record<string, any> = {};
let mockSessionIdCounter = 0;
function isDBError(err: any) { return err && (err.message || "").includes("DATABASE_URL"); }

// --- ASSESSMENT SESSION API ---
  const { AssessmentService } = await import("./src/lib/assessment-engine/server-engine.js");

  app.post("/api/sessions/launch", async (req, res) => {
    try {
      const { candidateId, organizationId, productLine } = req.body;
      let session;
      try {
        session = await AssessmentService.launchSession(
          candidateId || "demo-user", 
          organizationId || "demo-org",
          productLine
        );
      } catch (err) {
        if (isDBError(err) || err.name === "PrismaClientInitializationError") {
          const { studioItems } = await import("./src/data/studioItems.js");
          const sId = "demo-session-" + Date.now();
          const filteredItems = productLine && productLine !== "General" ? studioItems.filter((i: any) => i.productLine === productLine) : studioItems;
          const mappedItems = filteredItems.map((it: any) => ({
            id: it.id,
            skill: it.skill,
            type: it.type,
            metadata: {
              prompt: it.prompt,
              options: it.options?.map(o => o.text),
              correctOption: it.options?.find(o => o.isCorrect)?.text,
              rubric: it.rubric,
              minWords: 30, maxTime: 60
            },
            irtA: it.discrimination,
            irtB: it.difficulty,
            irtC: it.guessing,
            active: true
          }));
          mockSessions[sId] = { progress: 0, productLine, items: mappedItems.length ? mappedItems : [{ id: "fallback1", skill: "READING", type: "MULTIPLE_CHOICE", metadata: { prompt: "Default fallback item", options: ["A", "B", "C"], correctOption: "A" }, irtA:1, irtB:0, irtC:0 }] };
          return res.json({ sessionId: sId, candidateId, organizationId, productLine, status: "STARTED", theta: 0, sem: 1, history: [] });
        }
        throw err;
      }
      res.json(session);
    } catch (error) {
      console.error("LAUNCH ERROR", error);
      res.status(500).json({ error: "Failed to launch session", details: devDetails(error) });
    }
  });

  app.get("/api/sessions/:id/next", async (req, res) => {
    try {
      const { id } = req.params;
      let next;
      try {
        next = await AssessmentService.getNextItem(id);
      } catch(err) {
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

  app.post("/api/sessions/:id/respond", async (req, res) => {
    try {
      const { id } = req.params;
      const { itemId, value, latencyMs } = req.body;
      let result;
      try {
        result = await AssessmentService.submitResponse(id, itemId, value, latencyMs);
      } catch(err) {
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

  app.get("/api/sessions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      let status;
      try {
        status = await AssessmentService.getSessionStatus(id);
      } catch(err) {
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

  // --- ITEM BANK API ---
  app.get("/api/items", async (req, res) => {
    try {
      const items = await AssessmentService.getAllItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      const item = await AssessmentService.createItem(req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  // --- ITEM GENERATION (AI) — Single spec ---
  app.post("/api/items/generate", async (req, res) => {
    try {
      const { itemGenerator } = await import("./src/lib/language-skills/ai-item-generator.js");
      const spec = req.body;
      if (!spec.skill || !spec.level || !spec.format) {
        return res.status(400).json({ error: "skill, level, and format are required" });
      }
      spec.quantity = Math.min(Number(spec.quantity) || 1, 5); // Cap at 5 per request
      const result = await itemGenerator.generate(spec);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Item generation failed", details: devDetails(error) });
    }
  });

  // --- ITEM GENERATION (AI) — Bulk (multiple specs) ---
  app.post("/api/items/generate/bulk", async (req, res) => {
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
      res.status(500).json({ error: "Bulk generation failed", details: devDetails(error) });
    }
  });

  // --- ITEM GENERATION PREVIEW (generate without persisting to bank) ---
  app.post("/api/items/preview", async (req, res) => {
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
      res.status(500).json({ error: "Preview generation failed", details: devDetails(error) });
    }
  });

  // --- ITEM QUALITY VALIDATION ---
  app.get("/api/items/:id/validate", async (req, res) => {
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
      res.status(500).json({ error: "Validation failed", details: devDetails(error) });
    }
  });

  app.put("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await AssessmentService.updateItem(id, req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await AssessmentService.deleteItem(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.post("/api/items/:id/assets", async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await AssessmentService.addItemAsset(id, req.body);
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to add asset" });
    }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await AssessmentService.deleteAsset(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // --- RATING QUEUE API ---
  const { RatingQueueService } = await import("./src/lib/scoring/rating-queue.js");

  app.get("/api/rating/tasks", async (req, res) => {
    try {
      const { status } = req.query;
      const tasks = await RatingQueueService.getTasks(status as any);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rating tasks" });
    }
  });

  app.post("/api/rating/tasks/:id/claim", async (req, res) => {
    try {
      const { id } = req.params;
      const { raterId } = req.body;
      const task = await RatingQueueService.claimTask(id, raterId);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to claim task" });
    }
  });

  app.post("/api/rating/tasks/:id/submit", async (req, res) => {
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

  app.get("/api/analytics/cohort", async (req, res) => {
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

  app.post("/api/onboarding/bulk", async (req, res) => {
    try {
      const { candidates } = req.body;
      if (!Array.isArray(candidates)) return res.status(400).json({ error: "Invalid candidates list" });
      if (candidates.length > 500) return res.status(400).json({ error: "Maximum 500 candidates per bulk request" });
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
        const ran = Math.random().toString(36).substring(2, 6).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
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
      res.status(500).json({ error: "Fail to generate codes", details: String(err) });
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
      res.status(500).json({ error: "Validate failed", details: String(err) });
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
      
      await prisma.user.upsert({
        where: { id: candidateId },
        update: { email: email, name: `${name} ${surname}`, organizationId: examCode.organizationId },
        create: { id: candidateId, email: email, name: `${name} ${surname}`, organizationId: examCode.organizationId, role: "CANDIDATE" }
      });

      await prisma.candidateProfile.upsert({
        where: { userId: candidateId },
        update: { metadata: { school, className } },
        create: { userId: candidateId, metadata: { school, className } }
      });

      res.json({ success: true, organizationId: examCode.organizationId, productLine: examCode.productLine });
    } catch(err) {
      res.status(500).json({ error: "Redeem failed", details: String(err) });
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

  app.post("/api/proctoring/event", async (req, res) => {
    try {
      const { sessionId, type, severity, metadata } = req.body;
      const event = await ProctoringService.logEvent(sessionId, { sessionId, type, severity, metadata });
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to log proctoring event" });
    }
  });

  app.get("/api/proctoring/report/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const report = await ProctoringService.getTrustReport(sessionId);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trust report" });
    }
  });

  // --- PHASE 6: COMMERCIALIZATION & ECOSYSTEM ---
  app.post("/api/payments/checkout", async (req, res) => {
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
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error("STRIPE_WEBHOOK_SECRET is not set — cannot verify webhook");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }
    if (!sig) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    try {
      const { PaymentService } = await import("./src/lib/payments/payment-service.js");
      const event = PaymentService.constructWebhookEvent(req.body, sig, webhookSecret);
      await PaymentService.handleWebhook(event);
      res.json({ received: true });
    } catch (err) {
      logger.warn({ err }, "Stripe webhook signature verification failed");
      res.status(400).json({ error: "Webhook signature verification failed" });
    }
  });

  app.put("/api/ecosystem/config", async (req, res) => {
    const { organizationId, webhookUrl, generateApiKey } = req.body;
    try {
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!org) return res.status(404).json({ error: "Organization not found" });

      const settings = (org.settings as any) || {};
      if (webhookUrl !== undefined) settings.webhookUrl = webhookUrl;
      if (generateApiKey) settings.apiKey = `sk_live_${Math.random().toString(36).substring(2, 15)}`;

      await prisma.organization.update({
        where: { id: organizationId },
        data: { settings },
      });

      res.json({ settings });
    } catch (err) {
      res.status(500).json({ error: "Failed to update ecosystem config" });
    }
  });

  app.post("/api/proctoring/audit", async (req, res) => {
    const { sessionId } = req.body;
    try {
      const { AnomalyDetectionService } = await import("./src/lib/proctoring/anomaly-detection-service.js");
      const trustScore = await AnomalyDetectionService.auditSession(sessionId);
      res.json({ trustScore });
    } catch (err) {
      res.status(500).json({ error: "Failed to audit session" });
    }
  });

  app.post("/api/sessions/:id/complete", async (req, res) => {
    const { id } = req.params;
    try {
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
  // 10 MB allowed for base64-encoded audio payloads
  app.post("/api/ai/score/speaking-multimodal", express.json({ limit: "10mb" }), async (req, res) => {
    const { audioBase64, mimeType, prompt } = req.body;
    try {
      const { GeminiScoringService } = await import("./src/lib/scoring/gemini-scoring-service.js");
      const result = await GeminiScoringService.scoreSpeaking(audioBase64, mimeType, prompt || "Please respond to the task.");
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to perform multimodal scoring" });
    }
  });

  app.get("/api/sessions/:id/responses", async (req, res) => {
    const { id } = req.params;
    try {
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

  app.post("/api/ai/generate-item", async (req, res) => {
    const { skill, level, type } = req.body;
    try {
      const { ItemGeneratorService } = await import("./src/lib/assessment-engine/item-generator.js");
      const item = await ItemGeneratorService.generateItem(skill, level, type);
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate AI item" });
    }
  });

  app.post("/api/ai/edit-item", async (req, res) => {
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

  app.get("/api/sessions/:id/insights", async (req, res) => {
    const { id } = req.params;
    try {
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
        skills: {
          reading: Math.random() * 100,
          listening: Math.random() * 100,
          writing: Math.random() * 100,
          speaking: Math.random() * 100
        }
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch session insights" });
    }
  });

  // --- PHASE 8: ENTERPRISE & GLOBAL ---
  app.patch("/api/organizations/:id/branding", async (req, res) => {
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

  app.post("/api/organizations/:id/candidates/bulk-import", async (req, res) => {
    const { id } = req.params;
    const { candidates } = req.body;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "candidates array is required" });
    }
    if (candidates.length > 500) {
      return res.status(400).json({ error: "Maximum 500 candidates per bulk import" });
    }

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

    // Phase 9: Log Action (uses authenticated user if available)
    const actorId = (req as any).user?.id;
    if (actorId) {
      const { EnterpriseService } = await import("./src/lib/enterprise/enterprise-service.js");
      await EnterpriseService.logAction({
        organizationId: id,
        userId: actorId,
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

  app.get("/api/organizations/:id/analytics", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "PROCTOR"]), async (req, res) => {
    const { id } = req.params;
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

      // Skill Breakdown (Mocked from responses for now, in real app we'd aggregate score reports)
      const skillBreakdown = [
        { subject: 'Reading', A: 120, B: 110, fullMark: 150 },
        { subject: 'Listening', A: 98, B: 130, fullMark: 150 },
        { subject: 'Writing', A: 86, B: 130, fullMark: 150 },
        { subject: 'Speaking', A: 99, B: 100, fullMark: 150 },
      ];

      res.json({
        sessionsCount,
        feedbacksCount,
        avgRating,
        cefrDistribution: cefrData,
        skillBreakdown
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

  app.get("/api/organizations/:id/sso-config", async (req, res) => {
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
  app.post("/api/sessions/:id/feedback", async (req, res) => {
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

  app.get("/api/candidates/:id/history", async (req, res) => {
    const { id } = req.params;
    try {
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

  // --- CERTIFICATION API ---
  const { CertificateService } = await import("./src/lib/certification/certificate-service.js");

  app.post("/api/certificates/generate", async (req, res) => {
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
  app.post("/api/score/ai", async (req, res) => {
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

  app.get("/api/organizations/:id/candidates", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "INST_ADMIN"]), async (req, res) => {
    const { id } = req.params;
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

  // 404 handler for unknown /api/* routes — must come after all route registrations
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  Sentry.setupExpressErrorHandler(app);

  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const reqId = (res.getHeader("x-request-id") as string) || undefined;
    logger.error({ err, reqId, url: req.url, method: req.method }, "Unhandled request error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", requestId: reqId });
    }
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, `LinguAdapt Server running on http://localhost:${PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(() => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
  captureException(reason);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  captureException(err);
  process.exit(1);
});

startServer().catch((err) => {
  logger.fatal({ err }, "Server failed to start");
  captureException(err);
  process.exit(1);
});
