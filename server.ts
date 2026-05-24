import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import * as crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { prisma } from "./src/lib/prisma.js";
import { BillingService } from "./src/lib/enterprise/billing-service.js";
import { SecretsManager } from "./src/lib/secrets/secrets-manager.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set to true once a live DB connection is confirmed at startup
let dbAvailable = false;

async function startServer() {
  // Load secrets first — AWS Secrets Manager if configured, else env vars
  await SecretsManager.load();

  const app = express();
  const PORT = parseInt(process.env.PORT || "3001", 10);

  // Probe DB connectivity — fall back to mock/demo mode if unreachable
  if (process.env.DATABASE_URL) {
    try {
      await (prisma as any).$queryRaw`SELECT 1`;
      dbAvailable = true;
      console.log("✅ Database connected");
      // Ensure default admin org + user exist on every startup
      try {
        await prisma.organization.upsert({
          where: { id: "b4skills-demo" },
          update: {},
          create: { id: "b4skills-demo", name: "b4skills", slug: "b4skills-demo" }
        });
        const { default: bcryptSeed } = await import("bcrypt");
        const adminHash = await bcryptSeed.hash("Admin@b4skills2025", 10);
        await prisma.user.upsert({
          where: { email: "admin@b4skills.com" },
          update: {},
          create: { email: "admin@b4skills.com", name: "Admin", password: adminHash, role: "SUPER_ADMIN", organizationId: "b4skills-demo" }
        });
        console.log("✅ Admin seed OK");
      } catch (seedErr) {
        console.warn("⚠️  Admin seed failed:", seedErr);
      }
    } catch {
      dbAvailable = false;
      console.warn("⚠️  Database not reachable — running in mock/demo mode");
    }
  }

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  // --- SECURITY: Block known scanner / probe paths (WordPress, PHP, xmlrpc, etc.) ---
  const BLOCKED_PROBE_PATTERN = /\.(php|asp|aspx|jsp|cgi|env|git|svn|htaccess|htpasswd|DS_Store|config|bak|old|sql|xml)$/i;
  const BLOCKED_PROBE_PATHS = /\/(wp-admin|wp-login|wp-content|wp-includes|xmlrpc|phpmyadmin|phpinfo|admin|install\.php|setup\.php|\.well-known\/security)/i;

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
    skip: (req) => req.path.startsWith("/api/"),
  });
  app.use(genericPostLimiter);

  // --- AUTH ROUTES ---
      const JWT_SECRET = process.env.JWT_SECRET || "super-secret-default-key";
      const REFRESH_SECRET = process.env.REFRESH_SECRET || "super-secret-refresh-key";

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per `window` (here, per 15 minutes)
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
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
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
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
      return res.json({ token: accessToken, user: { uid: user.id, email: user.email, displayName: user.name, role: user.role, organizationId: user.organizationId || null } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
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

  app.post("/api/auth/forgot-password", async (req, res) => {
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

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    await sendMockEmail(user.email, "Password Reset", `Click here to reset: ${resetLink}`);
    
    return res.json({ message: 'If email exists, reset link sent.' });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
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

  app.post("/api/auth/verify-email", async (req, res) => {
    const { email } = req.body; // Mock endpoint to start email verification process
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return res.json({ message: 'Process started if email needs verification' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyEmailToken: verifyToken }
    });
    
    const verifyLink = `http://localhost:5173/verify-email?token=${verifyToken}`;
    await sendMockEmail(user.email, "Verify your email", `Click here to verify: ${verifyLink}`);
    return res.json({ message: 'Process started if email needs verification' });
  });

  app.post("/api/auth/google", async (req, res) => {
    // Shell implementation expecting a token usually verified via google-auth-library
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    
    try {
      // MOCK Verify: In real scenario, use `const ticket = await authClient.verifyIdToken({ idToken: token }); const { email, name, sub } = ticket.getPayload();`
      const mockDecoded = jwt.decode(token) as any || { email: 'mock-google@example.com', name: 'Mock Google User' };
      if (!mockDecoded.email) throw new Error("Invalid format");
      
      let user = await prisma.user.findUnique({ where: { email: mockDecoded.email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email: mockDecoded.email, name: mockDecoded.name, role: 'CANDIDATE', emailVerified: new Date() }
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
        res.clearCookie("accessToken"); res.clearCookie("refreshToken");
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
      // Use in-memory counter keyed by placementId to track item number
      if (!((res as any).__demoCounters)) (res as any).__demoCounters = {};
      const _dc = (app as any).__demoCounters || ((app as any).__demoCounters = {} as Record<string, number>);

      if (url === "/assessment/placement/start" && method === "POST") {
        const demoId = "demo-placement-" + Date.now();
        _dc[demoId] = 0;
        const mockItems = [
          { id: "dp-1", skill: "GRAMMAR",    type: "MULTIPLE_CHOICE", cefrLevel: "B1", content: { prompt: "She ___ to work every day by bus.",               options: ["go", "goes", "going", "gone"],          correctIndex: 1 } },
          { id: "dp-2", skill: "VOCABULARY", type: "MULTIPLE_CHOICE", cefrLevel: "A2", content: { prompt: "Which word means the opposite of 'difficult'?",   options: ["hard", "easy", "complex", "tricky"],    correctIndex: 1 } },
          { id: "dp-3", skill: "READING",    type: "MULTIPLE_CHOICE", cefrLevel: "B1", content: { prompt: "According to the passage, what improved last quarter?", passage: "A recent company report outlined how productivity had increased significantly over the last quarter, attributing the improvement to new workflow software.", options: ["Staff numbers", "Productivity", "Customer satisfaction", "Product quality"], correctIndex: 1 } },
          { id: "dp-4", skill: "LISTENING",  type: "MULTIPLE_CHOICE", cefrLevel: "A2", content: { prompt: "A student missed a class. Which response is most polite?", options: ["Can I get the notes?", "Could I possibly borrow your notes?", "Give me the notes.", "I need the notes now."], correctIndex: 1 } },
          { id: "dp-5", skill: "GRAMMAR",    type: "MULTIPLE_CHOICE", cefrLevel: "B2", content: { prompt: "If I ___ you, I would apologise immediately.",     options: ["am", "was", "were", "be"],              correctIndex: 2 } },
          { id: "dp-6", skill: "SPEAKING",   type: "OPEN_RESPONSE",   cefrLevel: "B1", content: { prompt: "Describe your daily routine in 2–3 sentences. Tap the microphone when ready." } },
          { id: "dp-7", skill: "WRITING",    type: "OPEN_RESPONSE",   cefrLevel: "B1", content: { prompt: "Write 2–3 sentences about a place you would like to visit and explain why." } },
        ];
        return res.json({ placementId: demoId, firstItem: { ...mockItems[0], irtA: 1.2, irtB: 0.0, irtC: 0.2, assets: [] }, maxItems: 7 });
      }
      if (url.match(/^\/assessment\/placement\/[^/]+\/respond$/) && method === "POST") {
        // Extract placementId from the URL
        const urlParts = url.split("/");
        const demoId = urlParts[urlParts.length - 2];
        const count = (_dc[demoId] = (_dc[demoId] ?? 0) + 1);

        if (count >= 7) {
          delete _dc[demoId];
          return res.json({ complete: true, result: {
            placementId: demoId,
            cefrLevel: "B1",
            theta: 0.2,
            sem: 0.4,
            cefrConfidenceInterval: [-0.5, 0.9] as [number, number],
            cefrRange: "A2\u2013B1",
            itemsAdministered: 7,
            completionMs: 240000,
            skillBreakdown: {
              GRAMMAR:    { total: 2, correct: 1 },
              VOCABULARY: { total: 1, correct: 1 },
              READING:    { total: 1, correct: 1 },
              LISTENING:  { total: 1, correct: 1 },
              SPEAKING:   { total: 1, correct: 1 },
              WRITING:    { total: 1, correct: 1 },
            },
            upgradePrompt: {
              message: "Get a full psychometric report with detailed skill breakdowns and a certified CEFR certificate.",
              skills: ["Deep Psychometrics", "Certified Report", "Speaking & Writing AI Scoring"],
              callToActionUrl: "#pricing"
            }
          }});
        }

        const demoItems = [
          { id: "dp-2", skill: "VOCABULARY", type: "MULTIPLE_CHOICE", cefrLevel: "A2", content: { prompt: "Which word means the opposite of 'difficult'?",   options: ["hard", "easy", "complex", "tricky"],    correctIndex: 1 } },
          { id: "dp-3", skill: "READING",    type: "MULTIPLE_CHOICE", cefrLevel: "B1", content: { prompt: "According to the passage, what improved last quarter?", passage: "A recent company report outlined how productivity had increased significantly over the last quarter.", options: ["Staff numbers", "Productivity", "Customer satisfaction", "Product quality"], correctIndex: 1 } },
          { id: "dp-4", skill: "LISTENING",  type: "MULTIPLE_CHOICE", cefrLevel: "A2", content: { prompt: "A student missed a class. Which response is most polite?", options: ["Can I get the notes?", "Could I possibly borrow your notes?", "Give me the notes.", "I need the notes now."], correctIndex: 1 } },
          { id: "dp-5", skill: "GRAMMAR",    type: "MULTIPLE_CHOICE", cefrLevel: "B2", content: { prompt: "If I ___ you, I would apologise immediately.",     options: ["am", "was", "were", "be"],              correctIndex: 2 } },
          { id: "dp-6", skill: "SPEAKING",   type: "OPEN_RESPONSE",   cefrLevel: "B1", content: { prompt: "Describe your daily routine in 2–3 sentences. Tap the microphone when ready." } },
          { id: "dp-7", skill: "WRITING",    type: "OPEN_RESPONSE",   cefrLevel: "B1", content: { prompt: "Write 2–3 sentences about a place you would like to visit and explain why." } },
        ];
        const nextRaw = demoItems[Math.min(count - 1, demoItems.length - 1)];
        const nextItem = { ...nextRaw, irtA: 1.0, irtB: 0.2, irtC: 0.2, assets: [] };
        return res.json({ complete: false, nextItem, itemsAdministered: count, currentCefrBand: "B1" });
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

      // 2. Fall back to x-user-email header (legacy/internal)
      const userEmailHeader = req.headers["x-user-email"];
      const userEmail = Array.isArray(userEmailHeader) ? userEmailHeader[0] : userEmailHeader;
      if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

      if (userEmail === "bilalcelimli@gmail.com" || !dbAvailable) {
        req.user = { role: "SUPER_ADMIN", organizationId: "default-org" };
        return next();
      }

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
      } catch (err: any) {
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
          return res.json({ sessionId: sId, candidateId, organizationId, productLine, status: "STARTED", theta: 0, sem: 1, history: [] });
        }
        throw err;
      }
      res.json(session);
    } catch (error) {
      console.error("LAUNCH ERROR", error);
      res.status(500).json({ error: "Failed to launch session", details: String(error) });
    }
  });

  app.get("/api/sessions/:id/next", async (req, res) => {
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

  app.post("/api/sessions/:id/respond", async (req, res) => {
    try {
      const { id } = req.params;
      const { itemId, value, latencyMs } = req.body;
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

  app.get("/api/sessions/:id/status", async (req, res) => {
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
        select: { id: true, skill: true, cefrLevel: true, discrimination: true, active: true, status: true },
      });
      const responses = await prisma.response.groupBy({
        by: ["itemId"],
        _count: { itemId: true },
      });
      const usageMap: Record<string, number> = {};
      for (const r of responses) usageMap[r.itemId] = r._count.itemId;

      const totalActive = items.filter((i) => i.active).length;
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
        if (i.active) bySkill[i.skill].active++;
        if (i.status === "PRETEST") bySkill[i.skill].pretest++;
        if (i.status === "RETIRED") bySkill[i.skill].retired++;
      }

      const byCefrLevel: Record<string, { total: number; active: number }> = {};
      for (const i of items) {
        if (!byCefrLevel[i.cefrLevel]) byCefrLevel[i.cefrLevel] = { total: 0, active: 0 };
        byCefrLevel[i.cefrLevel].total++;
        if (i.active) byCefrLevel[i.cefrLevel].active++;
      }

      res.json({ totalActive, neverUsed, overExposed, overExposureThreshold, strata, bySkill, byCefrLevel });
    } catch (err) {
      res.status(500).json({ error: "Failed to compute exposure report", details: String(err) });
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
      res.status(500).json({ error: "Item generation failed", details: String(error) });
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
      res.status(500).json({ error: "Bulk generation failed", details: String(error) });
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
      res.status(500).json({ error: "Preview generation failed", details: String(error) });
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
      res.status(500).json({ error: "Validation failed", details: String(error) });
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
    try {
      const { PaymentService } = await import("./src/lib/payments/payment-service.js");
      const event = JSON.parse(req.body.toString());
      await PaymentService.handleWebhook(event);
      res.json({ received: true });
    } catch (err) {
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
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
  app.post("/api/ai/score/speaking-multimodal", async (req, res) => {
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

  const pickNextPlacementItem = (allItems: any[], usedIds: Set<string>, theta: number, skillBreakdown: Record<string, any> = {}) => {
    const available = allItems.filter(it => !usedIds.has(it.id) && it.active !== false);
    if (!available.length) return null;

    // Try to balance skills: prefer skills with fewer items administered so far
    const skillCounts: Record<string, number> = {};
    Object.entries(skillBreakdown).forEach(([s, data]) => { skillCounts[s] = (data as any).total; });
    const values = Object.values(skillCounts);
    const minSkillCount = values.length > 0 ? Math.min(...values as number[]) : 0;
    
    // Filter to skills that are within 1 item of the minimum count
    const balancedAvailable = available.filter(it => (skillCounts[it.skill] || 0) <= minSkillCount + 1);
    const set = balancedAvailable.length > 0 ? balancedAvailable : available;

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

      const pId = "placement-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
      const startTheta = 0.0;
      const firstItem = pickNextPlacementItem(allItems, new Set(), startTheta, {});
      if (!firstItem) return res.status(503).json({ error: "No items available" });

      placementSessions[pId] = {
        theta: startTheta, sem: 1.5, items: allItems,
        usedIds: new Set([firstItem.id]),
        itemsAdministered: 0, maxItems: 30,
        name: name.trim(), email: email.trim().toLowerCase(),
        skillBreakdown: {},
      };

      return res.json({ placementId: pId, firstItem, maxItems: 30 });
    } catch (err) {
      console.error("PLACEMENT START ERROR", err);
      res.status(500).json({ error: "Failed to start placement test", details: String(err) });
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
      const done = sess.itemsAdministered >= sess.maxItems || sess.sem < 0.35;

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
            message: "To get a detailed breakdown of your Grammar, Vocabulary, and Listening skills, try our comprehensive adaptive test.",
            skills: ["Speaking", "Writing", "Deep Psychometrics"],
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
            message: "To get a detailed breakdown of your Grammar, Vocabulary, and Listening skills, try our comprehensive adaptive test.",
            skills: ["Speaking", "Writing", "Deep Psychometrics"],
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
      res.status(500).json({ error: "Failed to process response", details: String(err) });
    }
  });

  // ── Cohort Analytics ─────────────────────────────────────────────────────
  const { cohortAnalytics } = await import("./src/lib/analytics/cohort-analytics.js");

  app.get("/api/analytics/cohort/:orgId/full", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const stats = await cohortAnalytics.getCohortStats(req.params.orgId);
      res.json(stats);
    } catch (err) { res.status(500).json({ error: String(err) }); }
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
    } catch (err) { res.status(500).json({ error: "Report generation failed", details: String(err) }); }
  });

  app.get("/api/reports/cohort/:orgId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { orgId } = req.params;
      const format = (req.query.format as string) ?? "csv";
      const { buffer, mimeType, filename } = await ReportGenerator.generateCohortReport(orgId, format as any);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) { res.status(500).json({ error: "Cohort report generation failed", details: String(err) }); }
  });

  // ── Q3: Privacy Manager ───────────────────────────────────────────────────
  const { privacyManager } = await import("./src/lib/compliance/privacy-manager.js");

  app.get("/api/privacy/settings/:userId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const settings = await privacyManager.getPrivacySettings(req.params.userId);
      res.json(settings);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.post("/api/privacy/consent/:userId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { consents } = req.body;
      const user = (req as any).user;
      await privacyManager.updateConsent(req.params.userId, consents, { ipAddress: req.ip!, userAgent: req.headers["user-agent"] ?? "" });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.post("/api/privacy/export/:userId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const actorId = (req as any).user?.id ?? "system";
      const bundle = await privacyManager.requestDataExport(req.params.userId, actorId);
      res.json(bundle);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.post("/api/privacy/delete/:userId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const actorId = (req as any).user?.id ?? "system";
      const { reason } = req.body;
      const deletion = await privacyManager.requestDeletion(req.params.userId, actorId, reason);
      res.json(deletion);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/privacy/audit/:userId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const log = await privacyManager.getAuditLog(req.params.userId, limit);
      res.json(log);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Q5: Learning Trajectory ───────────────────────────────────────────────
  const { LearningTrajectoryAnalyzer } = await import("./src/lib/analytics/learning-trajectory.js");
  const trajectoryAnalyzer = new LearningTrajectoryAnalyzer();

  app.get("/api/analytics/trajectory/:candidateId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const skill = req.query.skill as string | undefined;
      const trajectory = await trajectoryAnalyzer.analyzeTrajectory(req.params.candidateId, skill as any);
      res.json(trajectory);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/analytics/trajectory/:candidateId/multi", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const trajectories = await trajectoryAnalyzer.analyzeMultiSkillTrajectory(req.params.candidateId);
      res.json(trajectories);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/analytics/trajectory/:candidateId/vs-cohort", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { orgId } = req.query;
      if (!orgId) return res.status(400).json({ error: "orgId required" });
      const comparison = await trajectoryAnalyzer.compareCandidateVsCohort(req.params.candidateId, orgId as string);
      res.json(comparison);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Q5: Item Difficulty ───────────────────────────────────────────────────
  const { DifficultyEstimator } = await import("./src/lib/analytics/difficulty-estimation.js");
  const diffEstimator = new DifficultyEstimator();

  app.get("/api/analytics/difficulty/:itemId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const report = await diffEstimator.computeItemDifficultyReport(req.params.itemId);
      res.json(report);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/analytics/difficulty", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const skill = req.query.skill as string | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const reports = await diffEstimator.batchEstimate(skill as any, limit);
      res.json(reports);
    } catch (err) { res.status(500).json({ error: String(err) }); }
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
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/recommendations/review-queue/:candidateId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      await spacedRep.syncFromSessions(req.params.candidateId);
      const queue = await spacedRep.getReviewQueue(req.params.candidateId);
      res.json(queue);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.post("/api/recommendations/review/:candidateId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const result = await spacedRep.recordReview(req.body);
      res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/recommendations/review/:candidateId/forecast", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      await spacedRep.syncFromSessions(req.params.candidateId);
      const queue = await spacedRep.getReviewQueue(req.params.candidateId);
      const days = parseInt(req.query.days as string) || 30;
      const forecast = spacedRep.forecastRetention([...queue.dueItems, ...queue.upcomingItems], days);
      res.json(forecast);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Q5: Data Warehouse / BI ───────────────────────────────────────────────
  const { DataWarehouseExporter } = await import("./src/lib/analytics/data-warehouse-exporter.js");
  const dataExporter = new DataWarehouseExporter();

  app.get("/api/bi/metrics/:orgId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const metrics = await dataExporter.getBIMetrics(req.params.orgId);
      res.json(metrics);
    } catch (err) { res.status(500).json({ error: String(err) }); }
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
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Q6: SLA Manager ──────────────────────────────────────────────────────
  const { slaManager } = await import("./src/lib/sla/sla-manager.js");

  app.get("/api/sla/:orgId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const report = await slaManager.generateMonthlyReport(req.params.orgId);
      res.json(report);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/sla/:orgId/range", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const from = new Date(req.query.from as string || Date.now() - 30 * 86400000);
      const to   = new Date(req.query.to   as string || Date.now());
      const report = await slaManager.evaluateSLACompliance(req.params.orgId, from, to);
      res.json(report);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Q7: Webhook Manager ───────────────────────────────────────────────────
  const { webhookManager } = await import("./src/lib/webhooks/webhook-manager.js");
  await webhookManager.loadFromDatabase();

  app.post("/api/webhooks/register", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const endpoint = await webhookManager.registerWebhook(req.body);
      res.status(201).json(endpoint);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/webhooks/logs", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { webhookId, limit } = req.query;
      const logs = await webhookManager.getDeliveryLog(webhookId as string, parseInt(limit as string) || 100);
      res.json(logs);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/webhooks/stats/:orgId", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const stats = await webhookManager.getDeliveryStats(req.params.orgId);
      res.json(stats);
    } catch (err) { res.status(500).json({ error: String(err) }); }
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
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Q6: Brand Manager ────────────────────────────────────────────────────
  const { brandManager } = await import("./src/lib/branding/brand-manager.js");

  app.get("/api/brand/:orgId", async (req: express.Request, res: express.Response) => {
    try {
      const config = await brandManager.getBrandConfig(req.params.orgId);
      const css = brandManager.generateCssVariables(config);
      res.json({ config, css });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/brand/by-domain/:domain", async (req: express.Request, res: express.Response) => {
    try {
      const config = await brandManager.getBrandConfigByDomain(req.params.domain);
      res.json(config);
    } catch (err) { res.status(500).json({ error: String(err) }); }
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
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.get("/api/cultural/profiles", async (_req: express.Request, res: express.Response) => {
    try {
      res.json(getAllCulturalProfiles());
    } catch (err) { res.status(500).json({ error: String(err) }); }
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
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.post("/api/cultural/filter/check", authMiddleware, async (req: express.Request, res: express.Response) => {
    try {
      const { text, region } = req.body;
      if (!text || !region) return res.status(400).json({ error: "text and region required" });
      const safe = sensitivityFilter.isSafeForRegion(text, region);
      res.json({ safe, region, textLength: text.length });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Q8: Regional Compliance ───────────────────────────────────────────────
  const { getComplianceConfig, formatScore, isTestingAllowed } = await import("./src/lib/compliance/regional-compliance.js");

  app.get("/api/cultural/compliance/:region", async (req: express.Request, res: express.Response) => {
    try {
      const config = getComplianceConfig(req.params.region as any);
      if (!config) return res.status(404).json({ error: "Unknown region" });
      res.json(config);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.post("/api/cultural/compliance/:region/check-eligibility", async (req: express.Request, res: express.Response) => {
    try {
      const { attemptsThisYear, daysSinceLastAttempt } = req.body;
      const result = isTestingAllowed(req.params.region as any, attemptsThisYear ?? 0, daysSinceLastAttempt ?? 999);
      res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  app.post("/api/cultural/compliance/:region/format-score", async (req: express.Request, res: express.Response) => {
    try {
      const { score } = req.body;
      if (score === undefined) return res.status(400).json({ error: "score required" });
      const formatted = formatScore(score, req.params.region as any);
      res.json({ formatted, region: req.params.region, rawScore: score });
    } catch (err) { res.status(500).json({ error: String(err) }); }
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

  app.post("/api/proctoring/anticheat", async (req, res) => {
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
      res.status(500).json({ error: "Anti-cheat analysis failed", details: String(err) });
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
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Whisper Speech Pipeline ─────────────────────────────────────────────
  const whisperRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: "Too many speaking submissions, please wait." },
  });

  app.post("/api/speaking/transcribe", whisperRateLimit, async (req, res) => {
    try {
      const { audio, filename = "recording.webm", prompt = "", includeTimestamps = false } = req.body;
      if (!audio) return res.status(400).json({ error: "audio (base64) required" });

      const { runWhisperPipelineFromBase64 } = await import("./src/lib/scoring/whisper-pipeline.js");
      const result = await runWhisperPipelineFromBase64(audio, filename, { prompt, includeTimestamps });
      res.json(result);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("OPENAI_API_KEY")) return res.status(503).json({ error: "Whisper not configured — OPENAI_API_KEY missing" });
      res.status(500).json({ error: "Transcription failed", details: msg });
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
        res.status(503).json({ healthy: false, error: String(err?.message ?? err) });
      }
    });

    app.get("/api/healthz/deep", checkRole(["SUPER_ADMIN", "INST_ADMIN"]), async (_req, res) => {
      try {
        const result = await runDeepHealthCheck();
        const slo = uptimeTracker.sloStatus();
        res.json({ ...result, slo });
      } catch (err: any) {
        res.status(503).json({ healthy: false, error: String(err?.message ?? err) });
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
        res.status(500).json({ error: String(err?.message ?? err) });
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
      } catch (err) { res.status(500).json({ error: String(err) }); }
    });

    app.post("/api/admin/item-bank/promote", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        const minN = typeof req.body?.minN === "number" ? req.body.minN : 200;
        const promoted = await expansionEngine.promoteCalibrated(minN);
        res.json({ promoted });
      } catch (err) { res.status(500).json({ error: String(err) }); }
    });

    app.get("/api/admin/item-bank/coverage-heatmap", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        res.json(await expansionEngine.coverageHeatmap());
      } catch (err) { res.status(500).json({ error: String(err) }); }
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
      } catch (err) { res.status(500).json({ error: String(err) }); }
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
      } catch (err) { res.status(500).json({ error: String(err) }); }
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
      } catch (err) { res.status(500).json({ error: String(err) }); }
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
      } catch (err) { res.status(500).json({ error: String(err) }); }
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
      } catch (err) { res.status(500).json({ error: String(err) }); }
    });

    // Public: no auth required
    app.get("/api/certificates/:certId/verify", async (req, res) => {
      try {
        const cert = await lookupCertificate(req.params.certId);
        if (!cert) { res.status(404).json({ error: "Certificate not found" }); return; }
        res.json(await verifyCertificate(cert));
      } catch (err) { res.status(500).json({ error: String(err) }); }
    });

    app.get("/api/certificates/candidate/:candidateId", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
      try {
        res.json(await listCertificatesByCandidate(req.params.candidateId));
      } catch (err) { res.status(500).json({ error: String(err) }); }
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
      } catch (err) { res.status(500).json({ error: String(err) }); }
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
        return res.status(500).json({ error: err.message });
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
        return res.status(500).json({ error: err.message });
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
        return res.status(500).json({ error: err.message });
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
        return res.status(500).json({ error: err.message });
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
        return res.status(500).json({ error: err.message });
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
        return res.status(500).json({ error: err.message });
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
        return res.status(500).json({ error: err.message });
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
        return res.status(500).json({ error: err.message });
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
        return res.status(500).json({ error: err.message });
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
        return res.status(500).json({ error: err.message });
      }
    });

    // Admin — POST /api/admin/validity/expire-batch (manual cron trigger)
    app.post("/api/admin/validity/expire-batch", checkRole(["SUPER_ADMIN"]), async (_req, res) => {
      try {
        const result = await ValidityPolicyService.markExpiredSessions();
        return res.json({ ok: true, ...result });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    });

    // Extend /api/certificates/:certId/verify to include validity
    app.get("/api/certificates/verify/:certId/validity", async (req, res) => {
      try {
        // certId here is treated as sessionId for the validity lookup
        const result = await ValidityPolicyService.publicVerify(req.params.certId);
        return res.json(result);
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    });
  }

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
    app.get("*", (req, res) => {
      // Don't serve the SPA shell for static asset requests — return 404 instead
      const ext = path.extname(req.path);
      if (ext && ext !== ".html") {
        return res.status(404).end();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Note: httpServer.listen() is called above, after the WebSocket attachment.
  // The old app.listen() is replaced by httpServer.listen() to support WS upgrade.
}

startServer();
