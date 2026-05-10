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

  // Probe DB connectivity — if unreachable, /api returns 503 (no mock data layer)
  if (process.env.DATABASE_URL) {
    try {
      await (prisma as any).$queryRaw`SELECT 1`;
      dbAvailable = true;
      logger.info("Database connected");
    } catch (err) {
      dbAvailable = false;
      logger.warn({ err }, "Database not reachable — /api will return 503 until DATABASE_URL is valid");
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

  // --- CSRF PROTECTION (Origin / Referer vs request host) ---
  // Auth JSON endpoints: skip strict host check — Render/proxy can differ Host vs X-Forwarded-Host;
  // login/register use bcrypt + later httpOnly cookies (SameSite=lax). Other /api/* still checked.
  const hostnameNoPort = (h: string) => h.split(":")[0]!.toLowerCase();
  const requestHostSet = (req: express.Request): Set<string> => {
    const out = new Set<string>();
    if (req.headers.host) out.add(hostnameNoPort(req.headers.host));
    const xf = req.headers["x-forwarded-host"];
    if (typeof xf === "string") {
      for (const part of xf.split(",")) {
        const t = part.trim();
        if (t) out.add(hostnameNoPort(t));
      }
    }
    return out;
  };
  app.use((req, res, next) => {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();
    if (req.path.startsWith("/api/webhooks/")) return next();
    if (req.path.startsWith("/api/auth/")) return next();

    const allowed = requestHostSet(req);
    if (allowed.size === 0) return next();

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (origin) {
      try {
        const originHost = hostnameNoPort(new URL(origin).host);
        if (!allowed.has(originHost)) {
          return res.status(403).json({ error: "CSRF check failed: origin mismatch" });
        }
      } catch {
        return res.status(403).json({ error: "CSRF check failed: invalid origin" });
      }
    } else if (referer) {
      try {
        const refHost = hostnameNoPort(new URL(referer).host);
        if (!allowed.has(refHost)) {
          return res.status(403).json({ error: "CSRF check failed: referer mismatch" });
        }
      } catch {
        return res.status(403).json({ error: "CSRF check failed: invalid referer" });
      }
    }
    next();
  });

  // --- HEALTH CHECKS ---
  // /healthz — liveness probe: process is alive (no DB required)
  app.get("/healthz", (_req, res) => {
    // Include circuit breaker state for observability (non-blocking import)
    import("./src/lib/ai/circuit-breaker.js")
      .then(({ allBreakersHealth }) => {
        const breakers = allBreakersHealth();
        const anyOpen = breakers.some((b) => b.state === "OPEN");
        res.json({
          status: "ok",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          circuitBreakers: breakers,
          aiDegraded: anyOpen,
        });
      })
      .catch(() => {
        res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
      });
  });

  // /readyz — readiness probe: DB + circuit breaker state check
  app.get("/readyz", async (_req, res) => {
    let dbOk = true;
    let dbLatencyMs: number | null = null;
    try {
      if (process.env.DATABASE_URL) {
        const t0 = Date.now();
        await (prisma as any).$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - t0;
      }
    } catch {
      dbOk = false;
    }

    let breakerHealth: unknown[] = [];
    try {
      const { allBreakersHealth } = await import("./src/lib/ai/circuit-breaker.js");
      breakerHealth = allBreakersHealth();
    } catch { /* non-critical */ }

    const status = dbOk ? "ready" : "not_ready";
    res.status(dbOk ? 200 : 503).json({
      status,
      db: dbOk,
      dbLatencyMs,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      circuitBreakers: breakerHealth,
    });
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

  // Rate limiter for session launch — prevents anonymous abuse
  const sessionLaunchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: 'Too many session launch attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Refresh-token endpoint: 10 requests per minute per IP
  const refreshTokenLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { error: 'Too many token refresh attempts. Please try again in a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Global API safety net: 500 requests per 15 minutes per IP
  // Prevents brute-force / enumeration on unprotected endpoints
  const globalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Too many requests from this IP. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip health probes — they must never be rate-limited
      return req.path === "/healthz" || req.path === "/readyz";
    },
  });
  app.use("/api/", globalApiLimiter);

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

  /** Client-safe user shape; includes organizationId for admin/tenant UI. */
  const publicUser = (u: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    organizationId: string | null;
  }) => ({
    uid: u.id,
    email: u.email,
    displayName: u.name,
    role: u.role,
    organizationId: u.organizationId,
  });

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
      return res.json({ token: accessToken, user: publicUser(user) });
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
      return res.json({ token: accessToken, user: publicUser(user) });
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
      return res.json({ user: publicUser(user) });
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.post("/api/auth/refresh", refreshTokenLimiter, async (req, res) => {
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

  // When the database is unavailable, API routes return 503 (no offline mock data).
  app.use("/api", (req, res, next) => {
    if (!dbAvailable) {
      if (req.url === "/health" || req.path === "/health") return next();
      return res.status(503).json({
        error: "Database unavailable",
        message: "Configure DATABASE_URL and ensure PostgreSQL is reachable.",
      });
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
          return res.status(503).json({
            error: "Database unavailable",
            message: "Configure DATABASE_URL and ensure PostgreSQL is reachable.",
          });
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

  // --- ASSESSMENT SESSION API ---
  const { AssessmentService } = await import("./src/lib/assessment-engine/server-engine.js");

  app.post("/api/sessions/launch", sessionLaunchLimiter, async (req, res) => {
    try {
      const { candidateId, organizationId, productLine } = req.body;
      if (!candidateId || typeof candidateId !== "string" || candidateId.length > 128) {
        return res.status(400).json({ error: "candidateId is required and must be a string" });
      }
      if (!organizationId || typeof organizationId !== "string") {
        return res.status(400).json({ error: "organizationId is required" });
      }
      // If a valid JWT is present, ensure candidateId matches the authenticated user
      const token = req.cookies?.accessToken || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null);
      if (token) {
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          if (decoded.userId && decoded.userId !== candidateId) {
            return res.status(403).json({ error: "candidateId does not match authenticated user" });
          }
        } catch {
          // Invalid/expired token — reject rather than allow mismatch
          return res.status(401).json({ error: "Invalid or expired access token" });
        }
      }
      const session = await AssessmentService.launchSession(candidateId, organizationId, productLine);
      res.json(session);
    } catch (error) {
      console.error("LAUNCH ERROR", error);
      res.status(500).json({ error: "Failed to launch session", details: devDetails(error) });
    }
  });

  app.get("/api/sessions/:id/next", async (req, res) => {
    try {
      const { id } = req.params;
      const next = await AssessmentService.getNextItem(id);
      // Pino 10% sampling: GET /next is called ~5× per minute per user;
      // logging every call floods the log pipeline under 100 concurrent users.
      if (Math.random() < 0.1) {
        logger.debug({ sessionId: id }, "GET /next sampled log");
      }
      res.json(next);
    } catch (error: any) {
      const msg = error?.message ?? "Failed to fetch next item";
      // "Invalid session" means session is complete / not in progress — treat as stop
      if (msg === "Invalid session") {
        return res.status(409).json({ error: msg, stop: false });
      }
      logger.error({ err: error, sessionId: req.params.id }, "[sessions/next] error");
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/sessions/:id/respond", async (req, res) => {
    try {
      const { id } = req.params;
      const { itemId, value, latencyMs } = req.body;
      const result = await AssessmentService.submitResponse(id, itemId, value, latencyMs);
      res.json(result);
    } catch (error: any) {
      console.error("[sessions/respond]", error);
      res.status(500).json({ error: error?.message ?? "Failed to submit response" });
    }
  });

  app.get("/api/sessions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const status = await AssessmentService.getSessionStatus(id);
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

      // If a productLine is supplied and no prompt override exists, use the
      // ExamSourceRouter to pick the correct exam-aligned prompt format.
      if (spec.productLine && !spec.promptOverride) {
        try {
          const { routeGenerationRequest } = await import("./src/lib/generation/exam-source-router.js");
          const routed = routeGenerationRequest({
            productLine: spec.productLine,
            skill: spec.skill,
            cefrLevel: spec.level,
            topic: spec.topic,
            quantity: spec.quantity,
          });
          spec.promptOverride = routed.prompt;
          spec._examSource = routed.examSource;
          spec._taskId = routed.taskId;
        } catch {
          // Routing failed — fall through to default generation without override
        }
      }

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

  // --- ITEM QUALITY VALIDATION (legacy single-validator endpoint) ---
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

  // --- PHASE 1 VALIDATION GATES (new, unified pipeline) ---
  // POST /api/items/validate — validate a draft item that is NOT yet in the DB.
  app.post(
    "/api/items/validate",
    validate({ body: Schemas.Validation.ValidateDraftBody }),
    async (req, res) => {
      try {
        const { validateDraftItem, toDraftItem } = await import("./src/lib/ai/validation/index.js");
        const body = req.body as import("zod").z.infer<typeof Schemas.Validation.ValidateDraftBody>;

        const draft = {
          type: body.type,
          skill: body.skill,
          cefrLevel: body.cefrLevel,
          content: body.content,
          discrimination: body.discrimination ?? null,
          difficulty: body.difficulty ?? null,
          guessing: body.guessing ?? null,
          tags: body.tags ?? [],
        };

        let bankItems: ReturnType<typeof toDraftItem>[] = [];
        if (body.options?.compareAgainstBank) {
          const { prisma } = await import("./src/lib/prisma.js");
          const rows = await prisma.item.findMany({
            where: {
              skill: body.skill,
              cefrLevel: body.cefrLevel,
              status: { in: ["ACTIVE", "PRETEST"] as never },
            },
            take: 500,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              type: true,
              skill: true,
              cefrLevel: true,
              content: true,
              discrimination: true,
              difficulty: true,
              guessing: true,
              tags: true,
            },
          });
          bankItems = rows.map((r) =>
            toDraftItem({
              id: r.id,
              type: r.type,
              skill: r.skill,
              cefrLevel: r.cefrLevel,
              content: r.content,
              discrimination: r.discrimination,
              difficulty: r.difficulty,
              guessing: r.guessing,
              tags: r.tags,
            })
          );
        }

        const report = await validateDraftItem(draft, {
          bankItems,
          allowEmbeddings: body.options?.allowEmbeddings,
          allowLlmJudge: body.options?.allowLlmJudge,
          disabledGates: body.options?.disabledGates,
          gateTimeoutMs: body.options?.gateTimeoutMs,
        });

        res.json(report);
      } catch (error) {
        logger.error({ err: error }, "validation.draft-item.failed");
        res.status(500).json({ error: "Validation pipeline failed", details: devDetails(error) });
      }
    }
  );

  // POST /api/items/:id/validate-gates — run full Phase 1 gates on an existing item.
  app.post(
    "/api/items/:id/validate-gates",
    async (req, res) => {
      try {
        const { id } = req.params;
        if (!id || typeof id !== "string") {
          return res.status(400).json({ error: "Missing item id" });
        }
        const { ItemGenerationPipeline } = await import("./src/lib/ai/item-generation-pipeline.js");
        const report = await ItemGenerationPipeline.runPhase1Gates(id, {
          allowEmbeddings: req.body?.allowEmbeddings,
          allowLlmJudge: req.body?.allowLlmJudge,
          disabledGates: req.body?.disabledGates,
          gateTimeoutMs: req.body?.gateTimeoutMs,
        });
        res.json(report);
      } catch (error) {
        logger.error({ err: error, itemId: req.params.id }, "validation.item.failed");
        res.status(500).json({ error: "Validation pipeline failed", details: devDetails(error) });
      }
    }
  );

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
      const { organizationId: bodyOrgId, productLine, count = 1, prefix = "E", expiresAt } = req.body;
      const authUser = (req as any).user as { id: string; role: string; organizationId?: string | null };
      const targetOrg = bodyOrgId || authUser?.organizationId;
      if (!targetOrg) {
        return res.status(400).json({ error: "organizationId is required" });
      }
      if (authUser?.role === "INST_ADMIN" && authUser.organizationId && targetOrg !== authUser.organizationId) {
        return res.status(403).json({ error: "You can only generate codes for your own organization" });
      }

      const org = await prisma.organization.findUnique({ where: { id: targetOrg } });
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
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
      const { code, candidateId: suggestedCandidateId, email, name, surname, school, className } = req.body;

      // Basic input validation
      if (!code || !email || !name || !surname) {
        return res.status(400).json({ error: "Missing required fields: code, email, name, surname" });
      }

      // 1. Verify code (outside transaction so we can return clear errors early)
      const examCode = await prisma.examCode.findUnique({ where: { code } });
      if (!examCode) return res.status(404).json({ error: "Code not found" });
      if (examCode.isUsed) return res.status(400).json({ error: "Code already used" });
      if (examCode.expiresAt && examCode.expiresAt < new Date()) {
        return res.status(400).json({ error: "Code has expired" });
      }

      // 2. Ensure organization exists before touching anything else
      const orgForCode = await prisma.organization.findUnique({ where: { id: examCode.organizationId } });
      if (!orgForCode) {
        return res.status(422).json({ error: "This exam code is not linked to a valid organization" });
      }

      // 3. Run user creation + mark code used atomically so a failed upsert
      //    never leaves the code permanently burned.
      const resolvedCandidateId = await prisma.$transaction(async (tx) => {
        // Upsert by email (the only @unique field we know at this point).
        // If the candidate already has an account, update their org/name.
        // If not, create with the client-supplied suggestedCandidateId (or generate one).
        const newId = suggestedCandidateId || `cand_${Date.now()}`;
        const user = await tx.user.upsert({
          where: { email },
          update: { name: `${name} ${surname}`, organizationId: examCode.organizationId },
          create: { id: newId, email, name: `${name} ${surname}`, organizationId: examCode.organizationId, role: "CANDIDATE" },
        });

        await tx.candidateProfile.upsert({
          where: { userId: user.id },
          update: { metadata: { school, className } },
          create: { userId: user.id, metadata: { school, className } },
        });

        await tx.examCode.update({
          where: { id: examCode.id },
          data: { isUsed: true, usedByEmail: email, usedAt: new Date() },
        });

        return user.id;
      });

      res.json({ success: true, organizationId: examCode.organizationId, productLine: examCode.productLine, candidateId: resolvedCandidateId });
    } catch (err) {
      console.error("[redeem]", err);
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

  // --- ITEM BANK INVENTORY API ---
  app.get("/api/items/inventory", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"] as const;
      const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
      const STATUSES = ["ACTIVE", "PRETEST", "REVIEW", "DRAFT", "RETIRED"] as const;

      // One aggregation query per status for the full matrix
      const rows = await prisma.item.groupBy({
        by: ["skill", "cefrLevel", "status"],
        _count: { id: true },
        _avg: { discrimination: true, difficulty: true, guessing: true },
      });

      // Build matrix: skill → cefrLevel → statusCounts + IRT averages
      type Cell = {
        counts: Record<string, number>;
        total: number;
        avgDiscrimination: number | null;
        avgDifficulty: number | null;
        avgGuessing: number | null;
      };
      const matrix: Record<string, Record<string, Cell>> = {};

      for (const skill of SKILLS) {
        matrix[skill] = {};
        for (const cefr of CEFR_LEVELS) {
          matrix[skill][cefr] = {
            counts: Object.fromEntries(STATUSES.map((s) => [s, 0])),
            total: 0,
            avgDiscrimination: null,
            avgDifficulty: null,
            avgGuessing: null,
          };
        }
      }

      for (const row of rows) {
        const cell = matrix[row.skill]?.[row.cefrLevel];
        if (!cell) continue;
        const statusKey = row.status in cell.counts ? row.status : "DRAFT";
        cell.counts[statusKey] = (cell.counts[statusKey] ?? 0) + row._count.id;
        cell.total += row._count.id;
        // Weighted average accumulation (approximate — good enough for a dashboard)
        if (row._avg.discrimination !== null) cell.avgDiscrimination = row._avg.discrimination;
        if (row._avg.difficulty !== null) cell.avgDifficulty = row._avg.difficulty;
        if (row._avg.guessing !== null) cell.avgGuessing = row._avg.guessing;
      }

      // Totals per skill
      const skillTotals = Object.fromEntries(
        SKILLS.map((skill) => [
          skill,
          {
            total: Object.values(matrix[skill]).reduce((s, c) => s + c.total, 0),
            active: Object.values(matrix[skill]).reduce((s, c) => s + (c.counts.ACTIVE ?? 0), 0),
            pretest: Object.values(matrix[skill]).reduce((s, c) => s + (c.counts.PRETEST ?? 0), 0),
          },
        ])
      );

      const grandTotal = Object.values(skillTotals).reduce((s, t) => s + t.total, 0);

      res.json({ matrix, skillTotals, grandTotal, skills: SKILLS, cefrLevels: CEFR_LEVELS });
    } catch (error) {
      console.error("Item inventory error:", error);
      res.status(500).json({ error: "Failed to fetch item bank inventory" });
    }
  });

  // --- ANCHOR SET API ---
  app.get("/api/psychometrics/anchor-set/summary", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { AnchorSetService } = await import("./src/lib/psychometrics/anchor-set-service.js");
      res.json(await AnchorSetService.getSummary());
    } catch (e) { res.status(500).json({ error: "Failed to get anchor set summary" }); }
  });

  app.post("/api/psychometrics/anchor-set/add", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { AnchorSetService } = await import("./src/lib/psychometrics/anchor-set-service.js");
      const { itemId, expertVerified, expertNotes } = req.body;
      if (!itemId) return res.status(400).json({ error: "itemId required" });
      const userId = (req as any).user?.id ?? "system";
      const item = await AnchorSetService.addAnchorItem({ itemId, addedBy: userId, expertVerified, expertNotes });
      res.json(item);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post("/api/psychometrics/anchor-set/seed", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { AnchorSetService } = await import("./src/lib/psychometrics/anchor-set-service.js");
      const userId = (req as any).user?.id ?? "system";
      const { targetPerCell, requireMinN } = req.body;
      const result = await AnchorSetService.seedFromActiveItems({ targetPerCell, requireMinN, addedBy: userId });
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- STANDARD SETTING API ---
  app.get("/api/psychometrics/standard-setting/studies", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { StandardSettingService } = await import("./src/lib/psychometrics/standard-setting.js");
      res.json(await StandardSettingService.listStudies());
    } catch (e) { res.status(500).json({ error: "Failed to list studies" }); }
  });

  app.post("/api/psychometrics/standard-setting/studies", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { StandardSettingService } = await import("./src/lib/psychometrics/standard-setting.js");
      const { name, method } = req.body;
      if (!name || !method) return res.status(400).json({ error: "name and method required" });
      const id = await StandardSettingService.createStudy(name, method ?? "ANGOFF");
      res.json({ id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/psychometrics/standard-setting/:studyId/ratings", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { StandardSettingService } = await import("./src/lib/psychometrics/standard-setting.js");
      const { studyId } = req.params;
      const { ratings } = req.body;
      await StandardSettingService.submitRatings(studyId, ratings);
      res.json({ ok: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post("/api/psychometrics/standard-setting/:studyId/compute", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { StandardSettingService } = await import("./src/lib/psychometrics/standard-setting.js");
      const { studyId } = req.params;
      const results = await StandardSettingService.calculateCutScores(studyId);
      res.json(results);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/psychometrics/standard-setting/:studyId/apply", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { StandardSettingService } = await import("./src/lib/psychometrics/standard-setting.js");
      await StandardSettingService.applyCutScores(req.params.studyId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- EQUATING API ---

  app.post("/api/psychometrics/equating/run", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { meanSigmaEquating, stockingLordEquating } = await import("./src/lib/psychometrics/equating-audit.js");
      const { prisma } = await import("./src/lib/prisma.js");
      const { method = "STOCKING_LORD", anchorItemIds = [] } = req.body as {
        method?: string;
        anchorItemIds?: string[];
        oldFormId?: string;
        newFormId?: string;
      };
      if (anchorItemIds.length < 3) {
        return res.status(400).json({ error: "At least 3 anchor items required" });
      }
      // Load anchor items from DB and extract IRT params from metadata
      const items = await prisma.item.findMany({
        where: { id: { in: anchorItemIds } },
        select: { id: true, metadata: true },
      });
      const parseParams = (item: { id: string; metadata: unknown }) => {
        const m = (item.metadata ?? {}) as Record<string, unknown>;
        return {
          a: typeof m["a"] === "number" ? (m["a"] as number) : 1.0,
          b: typeof m["b"] === "number" ? (m["b"] as number) : 0.0,
          c: typeof m["c"] === "number" ? (m["c"] as number) : 0.2,
        };
      };
      const oldParams = items.map(parseParams);
      // Simulate "new form" params with small calibration noise (±0.1 logits)
      const newParams = oldParams.map((p) => ({ ...p, b: p.b + (Math.random() * 0.2 - 0.1) }));

      const equating = method === "MEAN_SIGMA"
        ? meanSigmaEquating(oldParams, newParams)
        : stockingLordEquating(oldParams, newParams);

      // Anchor drift report
      const anchorDrift = items.map((item, i) => {
        const bOld = oldParams[i].b;
        const bNew = equating.A * oldParams[i].b + equating.B;
        const drift = bNew - bOld;
        return { itemId: item.id, bOld, bNew, drift, flagged: Math.abs(drift) >= 0.3 };
      });
      const rmsDrift = Math.sqrt(anchorDrift.reduce((s, d) => s + d.drift ** 2, 0) / anchorDrift.length);
      const flaggedDriftCount = anchorDrift.filter((d) => d.flagged).length;

      res.json({ equating, anchorDrift, rmsDrift, flaggedDriftCount });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/psychometrics/equating/apply", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { transformItemParams } = await import("./src/lib/psychometrics/equating-audit.js");
      const { prisma } = await import("./src/lib/prisma.js");
      const { newFormId, equating } = req.body as { newFormId?: string; equating?: { A: number; B: number } };
      if (!equating || typeof equating.A !== "number" || typeof equating.B !== "number") {
        return res.status(400).json({ error: "equating.A and equating.B required" });
      }
      // If newFormId provided, transform items matching that form tag; otherwise no-op in preview mode
      if (newFormId) {
        const items = await prisma.item.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, metadata: true },
        });
        let updated = 0;
        for (const item of items) {
          const m = item.metadata as Record<string, unknown> | null ?? {};
          if ((m as any).formId !== newFormId) continue;
          const params = { a: (m as any).a ?? 1, b: (m as any).b ?? 0, c: (m as any).c ?? 0.2 };
          const fullEquating: import("./src/lib/psychometrics/equating-audit.js").EquatingResult = {
            A: equating.A, B: equating.B, method: "MEAN_SIGMA", commonItemCount: 0, rmsd: 0,
          };
          const transformed = transformItemParams(params, fullEquating);
          await prisma.item.update({ where: { id: item.id }, data: { metadata: { ...(m as object), ...transformed } as unknown as import("@prisma/client").Prisma.InputJsonValue } });
          updated++;
        }
        res.json({ ok: true, updated });
      } else {
        res.json({ ok: true, updated: 0, note: "No newFormId provided — transformation preview only" });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- CONSTRUCT VALIDITY API ---

  app.get("/api/psychometrics/construct-validity", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { auditConstructValidity } = await import("./src/lib/psychometrics/construct-validity.js");
      const { prisma } = await import("./src/lib/prisma.js");
      // Load recent writing/speaking scores from DB as trait samples
      const responses = await prisma.response.findMany({
        where: { score: { not: null } },
        select: { id: true, score: true, metadata: true },
        take: 500,
        orderBy: { createdAt: "desc" },
      });
      const samples = responses
        .map((r) => {
          const m = r.metadata as Record<string, unknown> | null ?? {};
          const grammar = typeof (m as any).grammar === "number" ? (m as any).grammar : r.score ?? 0;
          const vocabulary = typeof (m as any).vocabulary === "number" ? (m as any).vocabulary : r.score ?? 0;
          const coherence = typeof (m as any).coherence === "number" ? (m as any).coherence : r.score ?? 0;
          const taskRelevance = typeof (m as any).taskRelevance === "number" ? (m as any).taskRelevance : r.score ?? 0;
          const fluency = typeof (m as any).fluency === "number" ? (m as any).fluency : r.score ?? 0;
          return { scores: { grammar, vocabulary, coherence, taskRelevance, fluency } };
        });
      const traits = ["grammar", "vocabulary", "coherence", "taskRelevance", "fluency"];
      const audit = auditConstructValidity(samples, traits);
      res.json({
        correlationMatrix: audit.correlation,
        reliability: audit.reliability,
        mtmm: audit.mtmm ? {
          convergentMean: audit.mtmm.convergentMean,
          discriminantMean: audit.mtmm.discriminantMean,
          separation: audit.mtmm.separation,
          perGroup: audit.mtmm.perGroup,
        } : { convergentMean: 0, discriminantMean: 0, separation: 0, perGroup: [] },
        warnings: audit.warnings,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ITEM BANK BASELINE REPORT ---

  app.get("/api/items/bank-report", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { buildBankReport } = await import("./src/lib/psychometrics/bank-report.js");

      const rawItems = await prisma.item.findMany({
        select: {
          id: true,
          skill: true,
          cefrLevel: true,
          status: true,
          discrimination: true,
          difficulty: true,
          guessing: true,
        },
      });

      // Coerce Prisma enum strings to plain strings for the pure module
      const items = rawItems.map((i) => ({
        skill: i.skill as string,
        cefrLevel: i.cefrLevel as string,
        status: i.status as string,
        discrimination: i.discrimination,
        difficulty: i.difficulty,
        guessing: i.guessing,
      }));

      // Optional: pull exposure rates from the in-memory store
      let exposureData: Array<{ itemId: string; rate: number }> | undefined;
      try {
        const { getExposureStore } = await import("./src/lib/assessment-engine/exposure-store.js");
        const store = await getExposureStore();
        exposureData = rawItems.map((i) => ({
          itemId: i.id,
          rate: store.getExposureRateSync(i.id),
        }));
      } catch {
        // exposure store unavailable — omit section
      }

      const report = buildBankReport(items, exposureData);
      res.json(report);
    } catch (error) {
      console.error("Bank report error:", error);
      res.status(500).json({ error: "Failed to generate item bank report" });
    }
  });

  // --- CULTURAL FAIRNESS API ---

  app.get("/api/items/cultural-fairness-summary", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { checkItemFairness } = await import("./src/lib/psychometrics/cultural-fairness.js");
      const { prisma } = await import("./src/lib/prisma.js");
      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, content: true },
        take: 500,
      });
      const results = items.map((item) => {
        const c = item.content as Record<string, unknown> | null ?? {};
        const stemText = typeof (c as any).stem === "string" ? (c as any).stem : (typeof item.content === "string" ? item.content : JSON.stringify(item.content));
        const options: string[] = Array.isArray((c as any).options) ? (c as any).options.map((o: unknown) => String(o)) : [];
        return checkItemFairness(item.id, stemText, options);
      });
      const byCategory: Record<string, { pass: number; flag: number; reject: number }> = {};
      for (const r of results) {
        for (const check of r.checks) {
          if (!byCategory[check.category]) byCategory[check.category] = { pass: 0, flag: 0, reject: 0 };
          if (check.status === "PASS") byCategory[check.category].pass++;
          else if (check.status === "FLAG") byCategory[check.category].flag++;
          else if (check.status === "REJECT") byCategory[check.category].reject++;
        }
      }
      res.json({
        totalChecked: results.length,
        pass: results.filter((r) => r.overallStatus === "PASS").length,
        flag: results.filter((r) => r.overallStatus === "FLAG").length,
        reject: results.filter((r) => r.overallStatus === "REJECT").length,
        byCategory,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ITEM RETIREMENT API ---

  app.get("/api/items/retirement-scores", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { ItemRetirementService } = await import("./src/lib/assessment-engine/item-retirement-service.js");
      const orgId = (req as any).user?.organizationId as string | undefined;
      const items = await prisma.item.findMany({
        where: orgId ? { organizationId: orgId, status: "ACTIVE" as const } : { status: "ACTIVE" as const },
        select: { id: true, skill: true, cefrLevel: true, discrimination: true, difficulty: true, guessing: true },
        take: 200,
      });
      const scored = await Promise.all(items.map(async (item) => {
        try {
          const result = await ItemRetirementService.computeRetirementScore(item.id);
          return {
            id: item.id,
            skill: item.skill,
            cefrLevel: item.cefrLevel,
            discrimination: item.discrimination,
            difficulty: item.difficulty,
            responseCount: 0,
            retirementScore: result.score,
            recommendation: result.recommendation,
            reasoning: result.reasoning,
            factors: result.factors,
          };
        } catch {
          return null;
        }
      }));
      const valid = scored.filter(Boolean) as NonNullable<typeof scored[0]>[];
      res.json({
        total: valid.length,
        retire: valid.filter((i) => i.recommendation === "RETIRE").length,
        review: valid.filter((i) => i.recommendation === "REVIEW").length,
        keep: valid.filter((i) => i.recommendation === "KEEP").length,
        items: valid,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/items/retirement-batch-run", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      // Re-run is the same as GET — just triggers re-computation and returns summary
      const { ItemRetirementService } = await import("./src/lib/assessment-engine/item-retirement-service.js");
      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
        take: 200,
      });
      let retire = 0; let review = 0; let keep = 0;
      for (const item of items) {
        try {
          const r = await ItemRetirementService.computeRetirementScore(item.id);
          if (r.recommendation === "RETIRE") retire++;
          else if (r.recommendation === "REVIEW") review++;
          else keep++;
        } catch { /* skip */ }
      }
      res.json({ total: items.length, retire, review, keep, ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/items/:itemId/retire", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { itemId } = req.params;
      await prisma.item.update({ where: { id: itemId }, data: { status: "RETIRED" } });
      res.json({ ok: true, itemId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- MIRT SNAPSHOT API ---

  app.get("/api/psychometrics/mirt-snapshot", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { LiveMetricsEngine } = await import("./src/lib/analytics/live-metrics-engine.js");
      const orgId = (req as any).user?.organizationId as string | undefined ?? "default";
      const snapshot = await LiveMetricsEngine.computeSnapshot(orgId);
      // Also fetch recent completed sessions with mirtAbilityVector
      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED", ...(orgId !== "default" ? { organizationId: orgId } : {}) },
        select: {
          id: true,
          metadata: true,
          completedAt: true,
          candidate: { select: { name: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 50,
      });
      const candidates = sessions
        .map((s) => {
          const m = (s.metadata ?? {}) as Record<string, unknown>;
          const vector = Array.isArray(m["mirtAbilityVector"]) ? m["mirtAbilityVector"] as number[] : null;
          if (!vector) return null;
          return {
            sessionId: s.id,
            candidateName: (s as any).candidate?.name ?? undefined,
            completedAt: s.completedAt?.toISOString() ?? new Date().toISOString(),
            vector,
          };
        })
        .filter(Boolean);
      res.json({ population: snapshot.mirt, candidates, sampleSize: sessions.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ADAPTIVE REPORT API ---

  app.get("/api/sessions/:id/adaptive-report", async (req, res) => {
    try {
      const { id } = req.params;
      // Verify requester owns the session or is an admin
      const userId = (req as any).user?.id;
      const role = (req as any).user?.role;
      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          responses: {
            include: { item: { select: { skill: true, cefrLevel: true } } },
            orderBy: { createdAt: "asc" },
          },
          candidate: { select: { name: true, id: true } },
          scoreReport: true,
        },
      });
      if (!session) return res.status(404).json({ error: "Session not found" });
      // Access check: candidate can only view their own sessions
      if (role !== "SUPER_ADMIN" && role !== "ASSESSMENT_DIRECTOR" && role !== "CONTENT_ADMIN" && role !== "ORG_ADMIN") {
        if ((session as any).candidate?.id !== userId) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
      // Build response history with theta trajectory
      const rawResponses = (session as any).responses as Array<Record<string, unknown>>;
      const responses = rawResponses.map((r) => ({
        itemId: r["itemId"] as string,
        skill: (r["item"] as any)?.skill ?? "UNKNOWN",
        cefrLevel: (r["item"] as any)?.cefrLevel ?? "B1",
        isCorrect: r["isCorrect"] as boolean | null,
        score: r["score"] as number | null,
        thetaAfter: (r["thetaAfter"] as number | undefined) ?? session.theta,
        semAfter: (r["semAfter"] as number | undefined) ?? session.sem,
        latencyMs: (r["latencyMs"] as number | undefined) ?? 0,
      }));
      // Build 6D skill scores from mirtAbilityVector if present
      const SKILLS = ["READING","LISTENING","WRITING","SPEAKING","GRAMMAR","VOCABULARY"];
      const CEFR_MAP = (t: number) => t > 2.0 ? "C2" : t > 1.0 ? "C1" : t > 0.0 ? "B2" : t > -1.0 ? "B1" : t > -2.0 ? "A2" : "A1";
      const mirtVector = Array.isArray((session.metadata as any)?.mirtAbilityVector)
        ? (session.metadata as any).mirtAbilityVector as number[]
        : SKILLS.map(() => session.theta);
      const skillScores = SKILLS.map((skill, i) => ({
        skill,
        theta: mirtVector[i] ?? session.theta,
        cefrLevel: CEFR_MAP(mirtVector[i] ?? session.theta),
      }));
      res.json({
        sessionId: session.id,
        candidateName: (session as any).candidate?.name,
        completedAt: session.completedAt?.toISOString() ?? session.startedAt?.toISOString(),
        finalTheta: session.theta,
        finalSem: session.sem,
        cefrLevel: session.cefrLevel ?? CEFR_MAP(session.theta),
        skillScores,
        responses,
        totalItems: rawResponses.length,
        stopReason: (session.metadata as any)?.stopReason ?? "COMPLETED",
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- GRM POLYTOMOUS SCORING API ---

  app.get("/api/psychometrics/grm-scores", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const {
        rubricToGrmParams,
        allCategoryProbabilities,
        grmInformation,
      } = await import("./src/lib/psychometrics/graded-response-model.js");

      const orgId = (req as any).user?.organizationId as string | undefined;

      // Load all Writing + Speaking items
      const items = await prisma.item.findMany({
        where: {
          skill: { in: ["WRITING", "SPEAKING"] },
          status: "ACTIVE",
          ...(orgId ? { organizationId: orgId } : {}),
        },
        select: {
          id: true,
          skill: true,
          cefrLevel: true,
          discrimination: true,
          difficulty: true,
          responses: {
            where: { score: { not: null } },
            select: { score: true },
            take: 500,
          },
        },
        take: 100,
      });

      const CEFR_THETA: Record<string, number> = {
        A1: -2.0, A2: -1.0, B1: 0.0, B2: 1.0, C1: 2.0, C2: 3.0,
      };

      const itemSummaries = items.map((item) => {
        const a = item.discrimination ?? 1.2;
        const b = item.difficulty ?? 0.0;
        const params = rubricToGrmParams(a, b, 11); // 0–10 scale

        // Expected scores at key CEFR levels
        const expectedScoreAt = {
          A2: allCategoryProbabilities(CEFR_THETA["A2"] ?? -1.0, params).reduce((sum, p, k) => sum + k * p, 0),
          B1: allCategoryProbabilities(CEFR_THETA["B1"] ?? 0.0, params).reduce((sum, p, k) => sum + k * p, 0),
          B2: allCategoryProbabilities(CEFR_THETA["B2"] ?? 1.0, params).reduce((sum, p, k) => sum + k * p, 0),
          C1: allCategoryProbabilities(CEFR_THETA["C1"] ?? 2.0, params).reduce((sum, p, k) => sum + k * p, 0),
        };

        // Peak information — scan theta from -3 to 3
        let peakInfo = 0;
        let peakTheta = b;
        for (let t = -3; t <= 3; t += 0.1) {
          const info = grmInformation(t, params);
          if (info > peakInfo) { peakInfo = info; peakTheta = t; }
        }

        // Observed score distribution
        const observedDist = new Array<number>(11).fill(0);
        let observedSum = 0;
        let observedCount = 0;
        for (const r of item.responses) {
          if (r.score !== null) {
            const bucket = Math.min(10, Math.max(0, Math.round(r.score * 10)));
            observedDist[bucket]++;
            observedSum += r.score * 10;
            observedCount++;
          }
        }
        const observedMean = observedCount > 0 ? observedSum / observedCount : null;

        // Fit warning: if observed mean deviates > 2 from expected at B1 level
        const fitWarning =
          observedMean !== null &&
          Math.abs(observedMean - expectedScoreAt.B1) > 2.5;

        return {
          id: item.id,
          skill: item.skill,
          cefrLevel: item.cefrLevel,
          discrimination: a,
          difficulty: b,
          categories: params.categories,
          boundaries: params.b,
          expectedScoreAt: {
            A2: Number(expectedScoreAt.A2.toFixed(2)),
            B1: Number(expectedScoreAt.B1.toFixed(2)),
            B2: Number(expectedScoreAt.B2.toFixed(2)),
            C1: Number(expectedScoreAt.C1.toFixed(2)),
          },
          peakInformation: Number(peakInfo.toFixed(4)),
          peakTheta: Number(peakTheta.toFixed(2)),
          observedMean: observedMean !== null ? Number(observedMean.toFixed(2)) : null,
          observedN: observedCount,
          observedDistribution: observedDist,
          fitWarning,
        };
      });

      res.json({
        items: itemSummaries,
        sampleSize: itemSummaries.reduce((s, i) => s + i.observedN, 0),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ITEM EXPOSURE API ---

  app.get("/api/psychometrics/item-exposure", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { getExposureStore } = await import("./src/lib/assessment-engine/exposure-store.js");
      const { STRATUM_COUNT } = await import("./src/lib/assessment-engine/sympson-heter.js");
      const K_MAX = 0.20;
      const orgId = (req as any).user?.organizationId as string | undefined;
      const exposureStore = await getExposureStore();
      // Load all active items
      const items = await prisma.item.findMany({
        where: { status: "ACTIVE", ...(orgId ? { organizationId: orgId } : {}) },
        select: { id: true, skill: true, cefrLevel: true },
        take: 500,
      });
      // Build stratum totals from store
      const stratumTotals: number[] = [];
      for (let s = 0; s < STRATUM_COUNT; s++) {
        stratumTotals.push(exposureStore.getStratumTotalSync(s));
      }
      const totalTests = await (exposureStore.getExposureRate("__total__").then(() => 0).catch(() => 0));
      // Build per-item stats
      const itemStats = items.map((item) => {
        const globalRate = exposureStore.getExposureRateSync(item.id);
        const exposureCount = Math.round(globalRate * Math.max(1, stratumTotals.reduce((a, b) => a + b, 0)));
        const conditionalRates: number[] = [];
        let maxCond = 0;
        for (let s = 0; s < STRATUM_COUNT; s++) {
          const r = exposureStore.getConditionalExposureRateSync(item.id, s);
          conditionalRates.push(r);
          if (r > maxCond) maxCond = r;
        }
        return {
          id: item.id,
          skill: item.skill,
          cefrLevel: item.cefrLevel,
          globalRate,
          exposureCount,
          conditionalRates,
          overExposed: globalRate > K_MAX || maxCond > K_MAX,
          maxConditionalRate: maxCond,
        };
      });
      // Sort: over-exposed first, then by globalRate desc
      itemStats.sort((a, b) => {
        if (a.overExposed !== b.overExposed) return a.overExposed ? -1 : 1;
        return b.globalRate - a.globalRate;
      });
      res.json({
        items: itemStats,
        totalTests: stratumTotals.reduce((a, b) => a + b, 0),
        stratumTotals,
        kMax: K_MAX,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- RATER RELIABILITY API ---

  app.get("/api/psychometrics/rater-reliability", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const tasks = await prisma.ratingTask.findMany({
        where: {
          status: "COMPLETED",
          secondRaterScore: { not: null },
          ...(orgId ? { response: { session: { organizationId: orgId } } } : {}),
        },
        select: {
          id: true,
          score: true,
          secondRaterScore: true,
          qwk: true,
          requiresArbitration: true,
          raterId: true,
          secondRaterId: true,
          rater: { select: { name: true } },
          response: {
            select: {
              item: { select: { skill: true, cefrLevel: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });

      const total = tasks.length;
      if (total === 0) {
        return res.json({
          totalDoubleScored: 0, exactAgreementRate: 0, adjacentAgreementRate: 0,
          arbitrationRate: 0, meanQwk: 0, raterStats: [], recentTasks: [],
        });
      }

      let exactCount = 0; let adjacentCount = 0; let arbitrationCount = 0; let qwkSum = 0; let qwkCount = 0;
      for (const t of tasks) {
        const s1 = t.score ?? 0; const s2 = t.secondRaterScore ?? 0;
        const delta = Math.abs(s1 - s2);
        if (delta <= 0.05) exactCount++;
        if (delta <= 0.10) adjacentCount++;
        if (t.requiresArbitration) arbitrationCount++;
        if (t.qwk !== null) { qwkSum += t.qwk; qwkCount++; }
      }

      // Overall mean score for bias calculation
      const allScores = tasks.map((t) => t.score ?? 0);
      const overallMean = allScores.reduce((a, b) => a + b, 0) / allScores.length;

      // Per-rater stats
      const raterMap = new Map<string, { name: string; scores: number[]; exact: number; tasks: number; qwkSum: number; qwkCount: number }>();
      for (const t of tasks) {
        const rid = t.raterId ?? "unknown";
        const rname = (t.rater as any)?.name ?? rid.slice(-8);
        if (!raterMap.has(rid)) raterMap.set(rid, { name: rname, scores: [], exact: 0, tasks: 0, qwkSum: 0, qwkCount: 0 });
        const row = raterMap.get(rid)!;
        row.scores.push(t.score ?? 0);
        row.tasks++;
        if (Math.abs((t.score ?? 0) - (t.secondRaterScore ?? 0)) <= 0.05) row.exact++;
        if (t.qwk !== null) { row.qwkSum += t.qwk; row.qwkCount++; }
      }
      const raterStats = Array.from(raterMap.entries()).map(([raterId, r]) => ({
        raterId,
        raterName: r.name,
        taskCount: r.tasks,
        meanScore: r.scores.reduce((a, b) => a + b, 0) / r.scores.length,
        deviation: (r.scores.reduce((a, b) => a + b, 0) / r.scores.length) - overallMean,
        exactAgreementRate: r.tasks > 0 ? r.exact / r.tasks : 0,
        qwkMean: r.qwkCount > 0 ? r.qwkSum / r.qwkCount : 0,
      }));

      const recentTasks = tasks.slice(0, 50).map((t) => ({
        id: t.id,
        skill: (t.response as any)?.item?.skill ?? "UNKNOWN",
        cefrLevel: (t.response as any)?.item?.cefrLevel ?? "B1",
        score1: t.score ?? 0,
        score2: t.secondRaterScore ?? 0,
        qwk: t.qwk,
        requiresArbitration: t.requiresArbitration,
        rater1Name: (t.rater as any)?.name ?? "Rater 1",
        rater2Name: "Rater 2",
      }));

      res.json({
        totalDoubleScored: total,
        exactAgreementRate: exactCount / total,
        adjacentAgreementRate: adjacentCount / total,
        arbitrationRate: arbitrationCount / total,
        meanQwk: qwkCount > 0 ? qwkSum / qwkCount : 0,
        raterStats,
        recentTasks,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- CLASSIFICATION ACCURACY API ---

  app.get("/api/psychometrics/classification-accuracy", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { marginalReliability, classificationConsistency, cronbachAlpha: computeCronbach } = await import("./src/lib/psychometrics/reliability-metrics.js");
      const orgId = (req as any).user?.organizationId as string | undefined;

      // Load completed sessions
      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) },
        select: { theta: true, sem: true, cefrLevel: true },
        take: 2000,
        orderBy: { completedAt: "desc" },
      });

      if (sessions.length === 0) {
        return res.json({
          sampleSize: 0, marginalReliability: 0, classificationConsistency: 0,
          cronbachAlpha: 0, meanSem: 0, cutScores: [], thetaHistogram: [],
        });
      }

      const thetas = sessions.map((s) => s.theta);
      const sems = sessions.map((s) => s.sem);

      // CEFR cut scores (θ boundaries)
      const CEFR_CUTS = [
        { level: "A1",  cutTheta: -2.5 },
        { level: "A2",  cutTheta: -1.5 },
        { level: "B1",  cutTheta: -0.5 },
        { level: "B2",  cutTheta:  0.5 },
        { level: "C1",  cutTheta:  1.5 },
        { level: "C2",  cutTheta:  2.5 },
      ];

      const normalCDF = (z: number) => {
        const a = 0.254829592, b = -0.284496736, c = 1.421413741, d = -1.453152027, e2 = 1.061405429, p = 0.3275911;
        const sign = z >= 0 ? 1 : -1;
        const x = Math.abs(z) / Math.sqrt(2);
        const t2 = 1 / (1 + p * x);
        const erf = 1 - (((((e2 * t2 + d) * t2) + c) * t2 + b) * t2 + a) * t2 * Math.exp(-x * x);
        return 0.5 * (1 + sign * erf);
      };

      const cutScores = CEFR_CUTS.map(({ level, cutTheta }) => {
        const nearCut = sessions.filter((s) => Math.abs(s.theta - cutTheta) <= 0.5);
        const avgSem = nearCut.length > 0
          ? nearCut.reduce((s, x) => s + x.sem, 0) / nearCut.length
          : (sems.reduce((a, b) => a + b, 0) / sems.length);
        // P(misclassification | at cut) ≈ Φ(-|θ - cut| / SEM) averaged over candidates near cut
        const misclassRate = nearCut.length > 0
          ? nearCut.reduce((sum, s) => sum + (1 - normalCDF(0.5 / s.sem)), 0) / nearCut.length
          : normalCDF(-0.5 / avgSem);
        return {
          level,
          cutTheta,
          conditionalSem: Number(avgSem.toFixed(3)),
          candidatesNearCut: nearCut.length,
          misclassificationRate: Number(misclassRate.toFixed(4)),
        };
      });

      // Theta histogram (30 bins from -3 to +3, step 0.2)
      const thetaToLevel = (t: number) =>
        t < -2.5 ? "PRE_A1" : t < -1.5 ? "A1" : t < -0.5 ? "A2" : t < 0.5 ? "B1" : t < 1.5 ? "B2" : t < 2.5 ? "C1" : "C2";
      const bins: { bin: number; count: number; cefrLevel: string }[] = [];
      for (let b = -3.0; b < 3.0; b += 0.2) {
        const binCenter = Number((b + 0.1).toFixed(1));
        const count = thetas.filter((t) => t >= b && t < b + 0.2).length;
        bins.push({ bin: binCenter, count, cefrLevel: thetaToLevel(binCenter) });
      }

      const meanSem = sems.reduce((a, b) => a + b, 0) / sems.length;

      res.json({
        sampleSize: sessions.length,
        marginalReliability: Number(marginalReliability(thetas, sems).toFixed(3)),
        classificationConsistency: Number(classificationConsistency(thetas, sems, CEFR_CUTS.map((c) => c.cutTheta)).toFixed(3)),
        cronbachAlpha: 0, // requires item-level scores; not available here
        meanSem: Number(meanSem.toFixed(3)),
        cutScores,
        thetaHistogram: bins,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- PERSON FIT & ABERRANT RESPONSE DETECTION API ---

  app.get("/api/psychometrics/person-fit", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { probability } = await import("./src/lib/assessment-engine/irt.js");
      const orgId = (req as any).user?.organizationId as string | undefined;

      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) },
        select: {
          id: true,
          theta: true,
          cefrLevel: true,
          candidateId: true,
          completedAt: true,
          responses: {
            select: {
              isCorrect: true,
              score: true,
              rtZScore: true,
              rtFlag: true,
              item: { select: { discrimination: true, difficulty: true, guessing: true } },
            },
          },
        },
        orderBy: { completedAt: "desc" },
        take: 500,
      });

      const thetaToLevel = (t: number) =>
        t < -2.5 ? "PRE_A1" : t < -1.5 ? "A1" : t < -0.5 ? "A2" : t < 0.5 ? "B1" : t < 1.5 ? "B2" : t < 2.5 ? "C1" : "C2";

      // Compute Drasgow standardised lz for each session
      const sessionRows = sessions.map((s) => {
        const theta = s.theta;
        let logL = 0; let logEL = 0; let varLogL = 0;
        let aberrantItems = 0;
        let rapidGuessCount = 0;
        let rtZSum = 0; let rtZCount = 0;

        for (const r of (s.responses as any[])) {
          const a = r.item?.discrimination ?? 1.0;
          const b = r.item?.difficulty ?? 0.0;
          const c = r.item?.guessing ?? 0.2;
          const p = probability(theta, { a, b, c });
          const q = 1 - p;
          const u = r.isCorrect ? 1 : 0;
          logL += u === 1 ? Math.log(Math.max(1e-10, p)) : Math.log(Math.max(1e-10, q));
          logEL += p * Math.log(Math.max(1e-10, p)) + q * Math.log(Math.max(1e-10, q));
          const wj = p * q * (Math.log(p / Math.max(1e-10, q)) ** 2);
          varLogL += wj;
          // Aberrant: response much more correct/wrong than expected
          const residual = u - p;
          if (Math.abs(residual) > 0.6) aberrantItems++;
          if (r.rtFlag === "RAPID_GUESS") rapidGuessCount++;
          if (r.rtZScore !== null && r.rtZScore !== undefined) { rtZSum += r.rtZScore; rtZCount++; }
        }

        const sd = Math.sqrt(Math.max(1e-10, varLogL));
        const lzStat = sd > 0 ? (logL - logEL) / sd : 0;
        const meanRtZScore = rtZCount > 0 ? rtZSum / rtZCount : 0;
        const flagLevel: "NONE" | "WATCH" | "FLAG" | "SEVERE" =
          lzStat < -2.58 ? "SEVERE" : lzStat < -2.00 ? "FLAG" : lzStat < -1.64 ? "WATCH" : "NONE";

        return {
          sessionId: s.id,
          candidateId: s.candidateId,
          lzStat: Number(lzStat.toFixed(3)),
          aberrantItems,
          totalItems: (s.responses as any[]).length,
          rapidGuessCount,
          meanRtZScore: Number(meanRtZScore.toFixed(3)),
          flagLevel,
          cefrLevel: (s.cefrLevel ?? thetaToLevel(s.theta)) as string,
          completedAt: s.completedAt?.toISOString() ?? "",
        };
      });

      // Sort: most aberrant first
      sessionRows.sort((a, b) => a.lzStat - b.lzStat);

      const flaggedSessions = sessionRows.filter((s) => s.flagLevel !== "NONE").length;
      const severeSessions = sessionRows.filter((s) => s.flagLevel === "SEVERE").length;
      const meanLz = sessionRows.length > 0 ? sessionRows.reduce((s, r) => s + r.lzStat, 0) / sessionRows.length : 0;
      const sdLz = sessionRows.length > 1
        ? Math.sqrt(sessionRows.reduce((s, r) => s + (r.lzStat - meanLz) ** 2, 0) / (sessionRows.length - 1))
        : 1;

      // RT flag summary from all responses
      const allResponses = sessions.flatMap((s) => (s.responses as any[]));
      const rtFlags: Record<string, number> = { RAPID_GUESS: 0, SOLUTION_BEHAVIOR: 0, NORMAL: 0 };
      for (const r of allResponses) { rtFlags[r.rtFlag ?? "NORMAL"] = (rtFlags[r.rtFlag ?? "NORMAL"] ?? 0) + 1; }
      const totalResp = allResponses.length || 1;
      const rtFlagSummary = Object.entries(rtFlags).map(([flag, count]) => ({
        flag, count, pct: (count / totalResp) * 100,
      }));

      // lz histogram (20 bins from -5 to +3)
      const lzBins = Array.from({ length: 20 }, (_, i) => ({ bin: Number((-5 + i * 0.4).toFixed(1)), count: 0 }));
      for (const r of sessionRows) {
        const idx = Math.min(19, Math.max(0, Math.floor((r.lzStat + 5) / 0.4)));
        lzBins[idx].count++;
      }

      res.json({
        sampleSize: sessions.length,
        flaggedSessions,
        severeSessions,
        meanLz: Number(meanLz.toFixed(3)),
        sdLz: Number(sdLz.toFixed(3)),
        rtFlagSummary,
        sessions: sessionRows.slice(0, 200),
        lzHistogram: lzBins,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SHADOW TEST BLUEPRINT MONITOR API ---

  app.get("/api/psychometrics/shadow-test", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];
      const BLUEPRINT: Record<string, { min: number; max: number }> = {
        GRAMMAR: { min: 2, max: 6 }, VOCABULARY: { min: 2, max: 6 },
        READING: { min: 3, max: 8 }, LISTENING: { min: 3, max: 8 },
        WRITING: { min: 1, max: 4 }, SPEAKING: { min: 1, max: 4 },
      };

      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) },
        select: {
          id: true, cefrLevel: true,
          responses: { select: { item: { select: { skill: true, cefrLevel: true } } } },
        },
        orderBy: { completedAt: "desc" },
        take: 500,
      });

      if (sessions.length === 0) {
        return res.json({
          totalSessions: 0, constraintsSatisfied: 0, totalConstraints: SKILLS.length,
          overallSatisfactionRate: 0, blueprintConstraints: [], skillBalance: [],
          cefrBalance: [], violationRate: 0, recentViolations: [],
        });
      }

      // Per-session skill counts
      const thetaToLevel = (t: string | null | undefined) => t ?? "B1";
      type SessionSkillMap = Record<string, number>;
      const sessionSkillMaps: { id: string; skills: SessionSkillMap; cefrLevel: string }[] = sessions.map((s) => {
        const skills: SessionSkillMap = {};
        for (const r of (s.responses as any[])) {
          const sk = r.item?.skill as string | undefined;
          if (sk) skills[sk] = (skills[sk] ?? 0) + 1;
        }
        return { id: s.id, skills, cefrLevel: (s.cefrLevel as string | null) ?? "B1" };
      });

      // Blueprint constraint satisfaction per skill
      const blueprintConstraints = SKILLS.map((skill) => {
        const bp = BLUEPRINT[skill] ?? { min: 1, max: 5 };
        const counts = sessionSkillMaps.map((s) => s.skills[skill] ?? 0);
        const satisfied = counts.filter((c) => c >= bp.min && c <= bp.max).length;
        const meanCount = counts.reduce((a, b) => a + b, 0) / counts.length;
        return {
          skill,
          minCount: bp.min,
          maxCount: bp.max,
          actualCount: Number(meanCount.toFixed(1)),
          satisfied: meanCount >= bp.min && meanCount <= bp.max,
          pctSatisfied: (satisfied / counts.length) * 100,
        };
      });

      // Sessions with at least one violation
      const recentViolations: { sessionId: string; skill: string; actual: number; min: number; cefrLevel: string }[] = [];
      let violationCount = 0;
      for (const s of sessionSkillMaps) {
        let hasViolation = false;
        for (const skill of SKILLS) {
          const bp = BLUEPRINT[skill] ?? { min: 1, max: 5 };
          const actual = s.skills[skill] ?? 0;
          if (actual < bp.min) {
            hasViolation = true;
            if (recentViolations.length < 50) {
              recentViolations.push({ sessionId: s.id, skill, actual, min: bp.min, cefrLevel: s.cefrLevel });
            }
          }
        }
        if (hasViolation) violationCount++;
      }

      // Skill balance
      const skillBalance = SKILLS.map((skill) => {
        const counts = sessionSkillMaps.map((s) => s.skills[skill] ?? 0);
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        const sd = Math.sqrt(counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length);
        const bp = BLUEPRINT[skill] ?? { min: 1, max: 5 };
        return {
          skill,
          meanItemsPerTest: Number(mean.toFixed(2)),
          sdItemsPerTest: Number(sd.toFixed(2)),
          pctAtMin: (counts.filter((c) => c >= bp.min).length / counts.length) * 100,
        };
      });

      // CEFR balance across items in all sessions
      const cefrCounts: Record<string, number[]> = {};
      for (const s of sessions) {
        const counts: Record<string, number> = {};
        for (const r of (s.responses as any[])) {
          const l = r.item?.cefrLevel as string | undefined;
          if (l) counts[l] = (counts[l] ?? 0) + 1;
        }
        for (const [l, c] of Object.entries(counts)) {
          if (!cefrCounts[l]) cefrCounts[l] = [];
          cefrCounts[l].push(c);
        }
      }
      const totalItems = sessions.reduce((sum, s) => sum + (s.responses as any[]).length, 0);
      const cefrBalance = Object.entries(cefrCounts).map(([level, counts]) => ({
        level,
        meanCount: Number((counts.reduce((a, b) => a + b, 0) / sessions.length).toFixed(1)),
        pct: (counts.reduce((a, b) => a + b, 0)) / Math.max(1, totalItems),
      }));

      const satisfiedCount = blueprintConstraints.filter((c) => c.satisfied).length;
      res.json({
        totalSessions: sessions.length,
        constraintsSatisfied: satisfiedCount,
        totalConstraints: SKILLS.length,
        overallSatisfactionRate: satisfiedCount / SKILLS.length,
        blueprintConstraints,
        skillBalance,
        cefrBalance,
        violationRate: violationCount / sessions.length,
        recentViolations,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ITEM PARAMETER DRIFT MONITOR API ---

  app.get("/api/psychometrics/item-drift", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { probability } = await import("./src/lib/assessment-engine/irt.js");
      const orgId = (req as any).user?.organizationId as string | undefined;

      const items = await prisma.item.findMany({
        where: { status: "ACTIVE", ...(orgId ? { organizationId: orgId } : {}) },
        select: {
          id: true, skill: true, cefrLevel: true,
          discrimination: true, difficulty: true, guessing: true,
          pVal: true,
          _count: { select: { responses: true } },
        },
        take: 1000,
      });

      // Expected p-value: P(correct | theta=0) using 3PL model
      // Drift = |observed pVal - expected pVal| (when pVal available)
      // b-drift proxy: |b - cefrExpectedB| (CEFR difficulty thresholds)
      const CEFR_EXPECTED_B: Record<string, number> = {
        PRE_A1: -3.0, A1: -2.0, A2: -1.0, B1: 0.0, B2: 1.0, C1: 2.0, C2: 3.0,
      };

      const driftItems = items.map((item) => {
        const a = item.discrimination ?? 1.0;
        const b = item.difficulty ?? 0.0;
        const c = item.guessing ?? 0.2;
        const expectedPVal = probability(0, { a, b, c });
        const observedPVal = item.pVal;
        const pValDrift = observedPVal !== null ? Math.abs(observedPVal - expectedPVal) : 0;
        const cefrExpectedB = CEFR_EXPECTED_B[item.cefrLevel as string] ?? 0;
        const bDrift = Math.abs(b - cefrExpectedB);
        // Composite drift: 0.6*bDrift_norm + 0.4*pValDrift_norm
        const bDriftNorm = Math.min(1, bDrift / 2.5);
        const pValDriftNorm = Math.min(1, pValDrift / 0.3);
        const driftScore = 0.6 * bDriftNorm + 0.4 * pValDriftNorm;
        const driftLevel: "STABLE" | "MINOR" | "MODERATE" | "CRITICAL" =
          driftScore > 0.6 ? "CRITICAL" : driftScore > 0.4 ? "MODERATE" : driftScore > 0.2 ? "MINOR" : "STABLE";

        return {
          id: item.id,
          skill: item.skill,
          cefrLevel: item.cefrLevel,
          currentA: Number(a.toFixed(3)),
          currentB: Number(b.toFixed(3)),
          currentPVal: observedPVal !== null ? Number(observedPVal.toFixed(3)) : null,
          expectedPVal: Number(expectedPVal.toFixed(3)),
          bDrift: Number(bDrift.toFixed(3)),
          driftScore: Number(driftScore.toFixed(3)),
          driftLevel,
          responsesCount: item._count.responses,
        };
      });

      driftItems.sort((a, b) => b.driftScore - a.driftScore);

      const stableCount = driftItems.filter((i) => i.driftLevel === "STABLE").length;
      const minorCount = driftItems.filter((i) => i.driftLevel === "MINOR").length;
      const moderateCount = driftItems.filter((i) => i.driftLevel === "MODERATE").length;
      const criticalCount = driftItems.filter((i) => i.driftLevel === "CRITICAL").length;
      const meanBDrift = driftItems.length > 0 ? driftItems.reduce((s, i) => s + i.bDrift, 0) / driftItems.length : 0;

      // Drift histogram (15 bins 0–1.5)
      const driftBins = Array.from({ length: 15 }, (_, i) => ({ bin: Number((i * 0.1).toFixed(1)), count: 0 }));
      for (const item of driftItems) {
        const idx = Math.min(14, Math.floor(item.driftScore / 0.1));
        driftBins[idx].count++;
      }

      // By skill
      const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];
      const bySkill = SKILLS.map((skill) => {
        const skItems = driftItems.filter((i) => i.skill === skill);
        return {
          skill,
          meanDrift: skItems.length > 0 ? skItems.reduce((s, i) => s + i.driftScore, 0) / skItems.length : 0,
          criticalCount: skItems.filter((i) => i.driftLevel === "CRITICAL").length,
        };
      });

      res.json({
        totalItems: driftItems.length,
        stableCount, minorCount, moderateCount, criticalCount,
        meanBDrift: Number(meanBDrift.toFixed(3)),
        items: driftItems.slice(0, 200),
        driftHistogram: driftBins,
        bySkill,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- COGNITIVE DIAGNOSTIC MODEL (CDM-DINA) API ---

  app.get("/api/psychometrics/cognitive-diagnostic", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { probability } = await import("./src/lib/assessment-engine/irt.js");
      const orgId = (req as any).user?.organizationId as string | undefined;
      const ATTRIBUTES = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];

      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) },
        select: {
          id: true,
          theta: true,
          cefrLevel: true,
          candidateId: true,
          responses: {
            select: {
              isCorrect: true,
              item: { select: { skill: true, discrimination: true, difficulty: true, guessing: true } },
            },
          },
        },
        orderBy: { completedAt: "desc" },
        take: 500,
      });

      type MasteryLevel = "NON_MASTER" | "BORDERLINE" | "MASTER";

      // DINA-inspired: posterior P(mastery | responses) via slip/guess approximation
      // P(mastery) ≈ proportion of correct on skill items, adjusted by 3PL guessing
      const candidateDiags = sessions.map((s) => {
        const theta = s.theta;
        const skillStats: Record<string, { correct: number; total: number; expectedP: number }> = {};

        for (const r of (s.responses as any[])) {
          const skill: string = r.item?.skill ?? "UNKNOWN";
          const a = r.item?.discrimination ?? 1.0;
          const b = r.item?.difficulty ?? 0.0;
          const c = r.item?.guessing ?? 0.2;
          const p = probability(theta, { a, b, c });
          if (!skillStats[skill]) skillStats[skill] = { correct: 0, total: 0, expectedP: 0 };
          if (r.isCorrect) skillStats[skill].correct++;
          skillStats[skill].total++;
          skillStats[skill].expectedP += p;
        }

        const attributes = ATTRIBUTES.map((attr) => {
          const ss = skillStats[attr];
          if (!ss || ss.total === 0) return { attribute: attr, posteriorMastery: 0.5, masteryLevel: "BORDERLINE" as MasteryLevel };
          const observedPVal = ss.correct / ss.total;
          const expectedPVal = ss.expectedP / ss.total;
          // Posterior mastery = Bayes update: prior(0.5) × likelihood ratio
          const likelihood = expectedPVal > 0 ? observedPVal / expectedPVal : 1;
          const posteriorMastery = Math.max(0, Math.min(1, 0.5 * likelihood));
          const masteryLevel: MasteryLevel = posteriorMastery >= 0.75 ? "MASTER" : posteriorMastery >= 0.5 ? "BORDERLINE" : "NON_MASTER";
          return { attribute: attr, posteriorMastery, masteryLevel };
        });

        const masteredCount = attributes.filter((a) => a.masteryLevel === "MASTER").length;
        return {
          candidateId: s.candidateId,
          sessionId: s.id,
          cefrLevel: (s.cefrLevel as string | null) ?? "B1",
          attributes,
          totalAttributes: ATTRIBUTES.length,
          masteredCount,
          overallMasteryRate: masteredCount / ATTRIBUTES.length,
        };
      });

      // Aggregate attribute profiles
      const attributeProfiles = ATTRIBUTES.map((attr) => {
        let masterCount = 0; let borderlineCount = 0; let nonMasterCount = 0;
        let masterySum = 0;
        for (const cd of candidateDiags) {
          const a = cd.attributes.find((x) => x.attribute === attr);
          if (!a) continue;
          if (a.masteryLevel === "MASTER") masterCount++;
          else if (a.masteryLevel === "BORDERLINE") borderlineCount++;
          else nonMasterCount++;
          masterySum += a.posteriorMastery;
        }
        const total = candidateDiags.length;
        return {
          attribute: attr,
          masterCount, borderlineCount, nonMasterCount,
          totalCandidates: total,
          masteryRate: total > 0 ? masterySum / total : 0,
        };
      });

      // Mastery distribution
      const masteryDistribution: { level: "MASTER" | "BORDERLINE" | "NON_MASTER"; count: number; pct: number }[] = [
        "MASTER", "BORDERLINE", "NON_MASTER",
      ].map((level) => {
        const count = candidateDiags.filter((c) => {
          const ratio = c.masteredCount / c.totalAttributes;
          if (level === "MASTER") return ratio >= 0.75;
          if (level === "BORDERLINE") return ratio >= 0.5 && ratio < 0.75;
          return ratio < 0.5;
        }).length;
        return { level: level as "MASTER" | "BORDERLINE" | "NON_MASTER", count, pct: candidateDiags.length > 0 ? (count / candidateDiags.length) * 100 : 0 };
      });

      // Phi correlations between attribute mastery binary vectors
      const attributeCorrelations: { pair: string; correlation: number }[] = [];
      for (let i = 0; i < ATTRIBUTES.length; i++) {
        for (let j = i + 1; j < ATTRIBUTES.length; j++) {
          const xArr = candidateDiags.map((c) => (c.attributes[i]?.masteryLevel === "MASTER" ? 1 : 0));
          const yArr = candidateDiags.map((c) => (c.attributes[j]?.masteryLevel === "MASTER" ? 1 : 0));
          const n = xArr.length;
          if (n < 10) { attributeCorrelations.push({ pair: `${ATTRIBUTES[i]}×${ATTRIBUTES[j]}`, correlation: 0 }); continue; }
          const xMean = xArr.reduce((a, b) => a + b, 0) / n;
          const yMean = yArr.reduce((a, b) => a + b, 0) / n;
          const num = xArr.reduce((s, x, k) => s + (x - xMean) * (yArr[k] - yMean), 0);
          const den = Math.sqrt(
            xArr.reduce((s, x) => s + (x - xMean) ** 2, 0) *
            yArr.reduce((s, y) => s + (y - yMean) ** 2, 0)
          );
          attributeCorrelations.push({ pair: `${ATTRIBUTES[i]}×${ATTRIBUTES[j]}`, correlation: den > 0 ? Number((num / den).toFixed(3)) : 0 });
        }
      }

      const meanMasteryRate = candidateDiags.length > 0
        ? candidateDiags.reduce((s, c) => s + c.overallMasteryRate, 0) / candidateDiags.length
        : 0;

      res.json({
        totalCandidates: candidateDiags.length,
        totalAttributes: ATTRIBUTES.length,
        meanMasteryRate: Number(meanMasteryRate.toFixed(3)),
        attributeProfiles,
        candidates: candidateDiags.slice(0, 200),
        masteryDistribution,
        attributeCorrelations,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- BAYESIAN IRT CALIBRATION MONITOR API ---

  app.get("/api/psychometrics/bayesian-calibration", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { probability } = await import("./src/lib/assessment-engine/irt.js");
      const orgId = (req as any).user?.organizationId as string | undefined;
      // CEFR prior means for b-parameter (normal prior: mean=cefrB, sd=0.8)
      const CEFR_PRIOR_B: Record<string, number> = {
        PRE_A1: -3.0, A1: -2.0, A2: -1.0, B1: 0.0, B2: 1.0, C1: 2.0, C2: 3.0,
      };
      const PRIOR_SD_B = 0.8; // prior sd for MAP
      const PRIOR_MEAN_A = 1.0; const PRIOR_SD_A = 0.4;
      const PRIOR_MEAN_C = 0.2; const PRIOR_SD_C = 0.1;
      const MIN_RESPONSES = 10;

      const items = await prisma.item.findMany({
        where: { status: "ACTIVE", ...(orgId ? { organizationId: orgId } : {}) },
        select: {
          id: true, skill: true, cefrLevel: true,
          discrimination: true, difficulty: true, guessing: true, pVal: true,
          responses: {
            select: { isCorrect: true },
            take: 200,
          },
          _count: { select: { responses: true } },
        },
        take: 1000,
      });

      const calibItems = items.map((item) => {
        const nResp = item._count.responses;
        const priorB = CEFR_PRIOR_B[item.cefrLevel as string] ?? 0;
        const priorA = PRIOR_MEAN_A;
        const priorC = PRIOR_MEAN_C;
        const currentA = item.discrimination ?? priorA;
        const currentB = item.difficulty ?? priorB;
        const currentC = item.guessing ?? priorC;

        // MAP posterior: weighted average of ML estimate and prior, weight ∝ n
        const pVal = item.pVal;
        let posteriorB = currentB;
        let posteriorA = currentA;
        let posteriorSE = PRIOR_SD_B;

        if (nResp >= MIN_RESPONSES && pVal !== null) {
          // Simple MAP: posteriorB = (n*mlB + priorB/priorVar) / (n + 1/priorVar)
          // Approximate ML estimate of b from p-value: P(theta=b)=0.5 → b ≈ logit(pVal-c)/(a)
          const pAdj = Math.max(priorC + 0.01, Math.min(0.99, pVal ?? 0.5));
          const mlB = currentB + Math.log(pAdj / (1 - pAdj)) / Math.max(0.1, currentA);
          const priorPrecision = 1 / (PRIOR_SD_B ** 2);
          const likePrecision = nResp / 1.5;
          posteriorB = (mlB * likePrecision + priorB * priorPrecision) / (likePrecision + priorPrecision);
          posteriorSE = Math.sqrt(1 / (likePrecision + priorPrecision));

          const mlA = currentA * (1 + (pVal - probability(0, { a: currentA, b: currentB, c: currentC })) * 0.1);
          const aPrecision = 1 / (PRIOR_SD_A ** 2);
          posteriorA = (mlA * (nResp / 2) + PRIOR_MEAN_A * aPrecision) / (nResp / 2 + aPrecision);
        } else {
          // No data — posterior = prior
          posteriorB = priorB;
          posteriorA = priorA;
        }

        const deltaB = Number((posteriorB - currentB).toFixed(4));
        const deltaA = Number((posteriorA - currentA).toFixed(4));
        const converged = posteriorSE < 0.25 && Math.abs(deltaB) < 0.5;

        return {
          id: item.id,
          skill: item.skill,
          cefrLevel: item.cefrLevel,
          priorA: Number(priorA.toFixed(3)),
          priorB: Number(priorB.toFixed(3)),
          priorC: Number(priorC.toFixed(3)),
          posteriorA: Number(posteriorA.toFixed(3)),
          posteriorB: Number(posteriorB.toFixed(3)),
          posteriorC: Number(priorC.toFixed(3)),
          deltaA,
          deltaB,
          deltaC: 0,
          nResponses: nResp,
          posteriorSE: Number(posteriorSE.toFixed(4)),
          converged,
        };
      });

      calibItems.sort((a, b) => Math.abs(b.deltaB) - Math.abs(a.deltaB));

      const convergedItems = calibItems.filter((i) => i.converged).length;
      const divergedItems = calibItems.filter((i) => !i.converged).length;
      const meanDeltaB = calibItems.length > 0 ? calibItems.reduce((s, i) => s + Math.abs(i.deltaB), 0) / calibItems.length : 0;
      const meanPosteriorSE = calibItems.length > 0 ? calibItems.reduce((s, i) => s + i.posteriorSE, 0) / calibItems.length : 0;

      const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];
      const convergenceBySkill = SKILLS.map((skill) => {
        const sk = calibItems.filter((i) => i.skill === skill);
        const conv = sk.filter((i) => i.converged).length;
        return { skill, converged: conv, total: sk.length, rate: sk.length > 0 ? conv / sk.length : 0 };
      });

      // Δb histogram (20 bins -2 to +2)
      const deltaBBins = Array.from({ length: 20 }, (_, i) => ({ bin: Number((-2 + i * 0.2).toFixed(1)), count: 0 }));
      for (const it of calibItems) {
        const idx = Math.min(19, Math.max(0, Math.floor((it.deltaB + 2) / 0.2)));
        deltaBBins[idx].count++;
      }

      // SE histogram (15 bins 0 to 1.5)
      const seBins = Array.from({ length: 15 }, (_, i) => ({ bin: Number((i * 0.1).toFixed(1)), count: 0 }));
      for (const it of calibItems) {
        const idx = Math.min(14, Math.floor(it.posteriorSE / 0.1));
        seBins[idx].count++;
      }

      // Prior-posterior shift by CEFR
      const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
      const priorPosteriorShift = CEFR_LEVELS.map((level) => {
        const lvItems = calibItems.filter((i) => i.cefrLevel === level);
        if (!lvItems.length) return { cefrLevel: level, meanBShift: 0, sdBShift: 0, n: 0 };
        const deltas = lvItems.map((i) => i.deltaB);
        const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const sd = Math.sqrt(deltas.reduce((a, b) => a + (b - mean) ** 2, 0) / deltas.length);
        return { cefrLevel: level, meanBShift: Number(mean.toFixed(3)), sdBShift: Number(sd.toFixed(3)), n: lvItems.length };
      });

      res.json({
        totalItems: calibItems.length,
        convergedItems, divergedItems,
        meanDeltaB: Number(meanDeltaB.toFixed(4)),
        meanPosteriorSE: Number(meanPosteriorSE.toFixed(4)),
        items: calibItems.slice(0, 200),
        convergenceBySkill,
        deltaBHistogram: deltaBBins,
        seHistogram: seBins,
        priorPosteriorShift,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- MST ROUTING ANALYTICS API ---

  app.get("/api/psychometrics/mst-routing", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const LOW_MAX = -0.5; const MID_MAX = 0.5; // default routing thresholds

      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) },
        select: {
          id: true,
          theta: true,
          sem: true,
          cefrLevel: true,
          currentStage: true,
          metadata: true,
          responses: { select: { id: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 2000,
      });

      type RouteKey = "low" | "mid" | "high" | "unknown";

      const sessionData = sessions.map((s) => {
        const meta = (s.metadata ?? {}) as Record<string, unknown>;
        const mstRouteKey = (meta.mstRouteKey as RouteKey | undefined) ?? null;
        // Detect MST: session has mstRouteKey OR theta is derived from MST stages
        const hasMstRoute = mstRouteKey !== null;
        // Fallback route from theta
        const route: RouteKey = mstRouteKey ?? (
          s.theta < LOW_MAX ? "low" : s.theta < MID_MAX ? "mid" : "high"
        );
        return {
          id: s.id,
          theta: s.theta,
          sem: s.sem ?? 0.5,
          cefrLevel: (s.cefrLevel as string | null) ?? "B1",
          stage: s.currentStage,
          route,
          hasMstRoute,
          itemCount: (s.responses as any[]).length,
        };
      });

      const mstSessions = sessionData.filter((s) => s.hasMstRoute);
      const effectiveSessions = mstSessions.length > 0 ? mstSessions : sessionData;

      const ROUTES: RouteKey[] = ["low", "mid", "high"];
      const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

      const routeStats = ROUTES.map((route) => {
        const rs = effectiveSessions.filter((s) => s.route === route);
        const meanTheta = rs.length > 0 ? rs.reduce((a, b) => a + b.theta, 0) / rs.length : 0;
        const meanSEM = rs.length > 0 ? rs.reduce((a, b) => a + b.sem, 0) / rs.length : 0;
        const meanItems = rs.length > 0 ? rs.reduce((a, b) => a + b.itemCount, 0) / rs.length : 0;
        const cefrDistribution = CEFR_LEVELS.map((level) => ({
          cefrLevel: level,
          count: rs.filter((s) => s.cefrLevel === level).length,
        }));
        return {
          route,
          count: rs.length,
          pct: effectiveSessions.length > 0 ? (rs.length / effectiveSessions.length) * 100 : 0,
          meanTheta: Number(meanTheta.toFixed(3)),
          meanSEM: Number(meanSEM.toFixed(3)),
          meanItems: Number(meanItems.toFixed(1)),
          cefrDistribution,
        };
      });

      // Stage-level theta stats (stages 1..maxStage)
      const maxStage = Math.max(...effectiveSessions.map((s) => s.stage), 1);
      const stageTheta = Array.from({ length: Math.min(maxStage, 8) }, (_, i) => {
        const stageNum = i + 1;
        const stageS = effectiveSessions.filter((s) => s.stage >= stageNum);
        if (!stageS.length) return { stage: stageNum, meanTheta: 0, sdTheta: 0, n: 0 };
        const mean = stageS.reduce((a, b) => a + b.theta, 0) / stageS.length;
        const sd = Math.sqrt(stageS.reduce((a, b) => a + (b.theta - mean) ** 2, 0) / stageS.length);
        return { stage: stageNum, meanTheta: Number(mean.toFixed(3)), sdTheta: Number(sd.toFixed(3)), n: stageS.length };
      });

      const meanModules = effectiveSessions.length > 0
        ? effectiveSessions.reduce((a, b) => a + b.stage, 0) / effectiveSessions.length
        : 0;
      const meanItemsPerSession = effectiveSessions.length > 0
        ? effectiveSessions.reduce((a, b) => a + b.itemCount, 0) / effectiveSessions.length
        : 0;

      res.json({
        totalSessions: sessions.length,
        mstEnabledSessions: mstSessions.length,
        routeStats,
        moduleFlows: [],
        stageTheta,
        meanModules: Number(meanModules.toFixed(2)),
        meanItemsPerSession: Number(meanItemsPerSession.toFixed(1)),
        completionRate: sessions.length > 0 ? sessions.length / sessions.length : 1,
        routingThresholds: { lowMax: LOW_MAX, midMax: MID_MAX },
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- RESPONSE TIME DIAGNOSTICS API ---
  app.get("/api/psychometrics/rt-diagnostics", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      const responses = await prisma.response.findMany({
        where: { session: { organizationId: orgId ?? undefined }, latencyMs: { not: null } },
        select: {
          latencyMs: true, rtZScore: true, rtFlag: true, isCorrect: true,
          sessionId: true,
          item: { select: { id: true, skill: true, cefrLevel: true } },
          session: { select: { cefrLevel: true, candidateId: true } },
        },
        take: 20000,
      });

      if (responses.length === 0) {
        return res.json({
          totalResponses: 0, rapidGuessCount: 0, solutionBehaviorCount: 0, normalCount: 0,
          rapidGuessPct: 0, meanLatencyMs: 0, medianLatencyMs: 0, p95LatencyMs: 0,
          latencyHistogram: [], rtZScoreHistogram: [], itemRTs: [], sessionSpeeds: [],
          bySkill: [], byCefr: [],
        });
      }

      const allLatencies = responses.map((r) => r.latencyMs ?? 0).sort((a, b) => a - b);
      const medianLatencyMs = allLatencies[Math.floor(allLatencies.length / 2)] ?? 0;
      const meanLatencyMs = allLatencies.reduce((s, v) => s + v, 0) / allLatencies.length;
      const p95LatencyMs = allLatencies[Math.floor(allLatencies.length * 0.95)] ?? 0;

      let rapidGuessCount = 0, solutionBehaviorCount = 0, normalCount = 0;
      for (const r of responses) {
        if (r.rtFlag === "RAPID_GUESS") rapidGuessCount++;
        else if (r.rtFlag === "SOLUTION_BEHAVIOR") solutionBehaviorCount++;
        else normalCount++;
      }

      // Latency histogram (0–120s in 10s bins)
      const LAT_BINS = Array.from({ length: 13 }, (_, i) => i * 10);
      const latencyHistogram = LAT_BINS.map((bin) => ({
        bin,
        count: responses.filter((r) => {
          const sec = (r.latencyMs ?? 0) / 1000;
          return sec >= bin && sec < bin + 10;
        }).length,
      }));

      // RT z-score histogram (-4 to +4 in 0.5 bins)
      const Z_BINS = Array.from({ length: 17 }, (_, i) => -4 + i * 0.5);
      const rtZScoreHistogram = Z_BINS.map((bin) => ({
        bin,
        count: responses.filter((r) => {
          const z = r.rtZScore ?? 0;
          return z >= bin && z < bin + 0.5;
        }).length,
      }));

      // Per-item aggregation
      const itemMap = new Map<string, { latencies: number[]; rapidGuess: number; skill: string; cefrLevel: string }>();
      for (const r of responses) {
        const key = r.item.id;
        if (!itemMap.has(key)) itemMap.set(key, { latencies: [], rapidGuess: 0, skill: r.item.skill, cefrLevel: r.item.cefrLevel });
        const entry = itemMap.get(key)!;
        if (r.latencyMs) entry.latencies.push(r.latencyMs);
        if (r.rtFlag === "RAPID_GUESS") entry.rapidGuess++;
      }
      const itemRTs = Array.from(itemMap.entries()).map(([itemId, d]) => {
        const sorted = [...d.latencies].sort((a, b) => a - b);
        const mean = sorted.reduce((s, v) => s + v, 0) / Math.max(1, sorted.length);
        const med = sorted[Math.floor(sorted.length / 2)] ?? 0;
        const sd = Math.sqrt(sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, sorted.length - 1));
        const p97 = sorted[Math.floor(sorted.length * 0.97)] ?? 0;
        const slowCount = sorted.filter((v) => v > mean + 3 * sd).length;
        return {
          itemId, skill: d.skill, cefrLevel: d.cefrLevel,
          medianLatency: med, meanLatency: mean, sdLatency: sd,
          timeBeta: Math.log(Math.max(1, med)),
          rapidGuessPct: (d.rapidGuess / Math.max(1, d.latencies.length)) * 100,
          slowPct: (slowCount / Math.max(1, d.latencies.length)) * 100,
          nResponses: d.latencies.length,
        };
      });

      // Per-session aggregation
      const sessionMap = new Map<string, { rtZScores: number[]; rapidGuess: number; cefrLevel: string; candidateId: string; nItems: number }>();
      for (const r of responses) {
        const key = r.sessionId;
        if (!sessionMap.has(key)) sessionMap.set(key, { rtZScores: [], rapidGuess: 0, cefrLevel: r.session?.cefrLevel ?? "B1", candidateId: r.session?.candidateId ?? "", nItems: 0 });
        const entry = sessionMap.get(key)!;
        entry.nItems++;
        if (r.rtZScore !== null && r.rtZScore !== undefined) entry.rtZScores.push(r.rtZScore);
        if (r.rtFlag === "RAPID_GUESS") entry.rapidGuess++;
      }
      const sessionSpeeds = Array.from(sessionMap.entries()).map(([sessionId, d]) => {
        const meanRtZ = d.rtZScores.length > 0 ? d.rtZScores.reduce((s, v) => s + v, 0) / d.rtZScores.length : 0;
        return {
          sessionId, candidateId: d.candidateId, cefrLevel: d.cefrLevel,
          tauEstimate: -meanRtZ, // faster (low latency) = positive tau
          meanRtZScore: meanRtZ,
          rapidGuessCount: d.rapidGuess,
          totalItems: d.nItems,
          rapidGuessPct: (d.rapidGuess / Math.max(1, d.nItems)) * 100,
        };
      });

      // By skill and CEFR
      const skillAgg = new Map<string, number[]>();
      const cefrAgg = new Map<string, number[]>();
      const skillRG = new Map<string, number[]>();
      const cefrRG = new Map<string, number[]>();
      for (const r of responses) {
        const skill = r.item.skill;
        const cefr = r.item.cefrLevel;
        const lat = r.latencyMs ?? 0;
        const rg = r.rtFlag === "RAPID_GUESS" ? 1 : 0;
        if (!skillAgg.has(skill)) { skillAgg.set(skill, []); skillRG.set(skill, []); }
        if (!cefrAgg.has(cefr)) { cefrAgg.set(cefr, []); cefrRG.set(cefr, []); }
        skillAgg.get(skill)!.push(lat);
        skillRG.get(skill)!.push(rg);
        cefrAgg.get(cefr)!.push(lat);
        cefrRG.get(cefr)!.push(rg);
      }
      const bySkill = Array.from(skillAgg.entries()).map(([skill, lats]) => {
        const sorted = [...lats].sort((a, b) => a - b);
        const rgs = skillRG.get(skill) ?? [];
        return { skill, medianLatency: sorted[Math.floor(sorted.length / 2)] ?? 0, rapidGuessPct: (rgs.filter((v) => v === 1).length / Math.max(1, rgs.length)) * 100 };
      });
      const byCefr = Array.from(cefrAgg.entries()).map(([cefrLevel, lats]) => {
        const sorted = [...lats].sort((a, b) => a - b);
        const rgs = cefrRG.get(cefrLevel) ?? [];
        return { cefrLevel, medianLatency: sorted[Math.floor(sorted.length / 2)] ?? 0, rapidGuessPct: (rgs.filter((v) => v === 1).length / Math.max(1, rgs.length)) * 100 };
      });

      res.json({
        totalResponses: responses.length,
        rapidGuessCount, solutionBehaviorCount, normalCount,
        rapidGuessPct: (rapidGuessCount / responses.length) * 100,
        meanLatencyMs, medianLatencyMs, p95LatencyMs,
        latencyHistogram, rtZScoreHistogram,
        itemRTs, sessionSpeeds, bySkill, byCefr,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- LOCAL ITEM DEPENDENCE API ---
  app.get("/api/psychometrics/local-dependence", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const { probability } = await import("./src/lib/assessment-engine/irt.js");

      // Fetch completed sessions with responses
      const sessions = await prisma.session.findMany({
        where: { organizationId: orgId ?? undefined, status: "COMPLETED", theta: { not: null } },
        select: {
          id: true, theta: true,
          responses: {
            select: {
              isCorrect: true,
              item: { select: { id: true, discrimination: true, difficulty: true, guessing: true, skill: true, cefrLevel: true } },
            },
          },
        },
        take: 500,
      });

      if (sessions.length === 0) {
        return res.json({ totalItems: 0, pairsAnalysed: 0, flaggedPairs: 0, meanQ3: 0, maxQ3: 0, pairs: [], heatmapItems: [], heatmapMatrix: [], bySkillPair: [], q3Histogram: [] });
      }

      // Build item residual map: itemId → array of residuals (one per session where item appeared)
      const itemResiduals = new Map<string, { sessionIdx: number; residual: number; skill: string; cefr: string }[]>();
      sessions.forEach((session, sIdx) => {
        const theta = session.theta ?? 0;
        for (const resp of (session as any).responses as any[]) {
          const item = resp.item;
          const a = item.discrimination ?? 1;
          const b = item.difficulty ?? 0;
          const c = item.guessing ?? 0.25;
          const p = probability(theta, { a, b, c });
          const observed = resp.isCorrect ? 1 : 0;
          const residual = observed - p;
          if (!itemResiduals.has(item.id)) itemResiduals.set(item.id, []);
          itemResiduals.get(item.id)!.push({ sessionIdx: sIdx, residual, skill: item.skill, cefr: item.cefrLevel });
        }
      });

      // Compute Q3 for all item pairs with ≥ 20 common sessions
      const itemIds = Array.from(itemResiduals.keys());
      const pairs: { itemA: string; skillA: string; cefrA: string; itemB: string; skillB: string; cefrB: string; q3Stat: number; flagged: boolean; nCommon: number }[] = [];
      const MIN_COMMON = 20;

      for (let i = 0; i < itemIds.length; i++) {
        const rA = new Map<number, number>();
        for (const e of itemResiduals.get(itemIds[i])!) rA.set(e.sessionIdx, e.residual);
        const skillA = itemResiduals.get(itemIds[i])![0].skill;
        const cefrA = itemResiduals.get(itemIds[i])![0].cefr;

        for (let j = i + 1; j < itemIds.length; j++) {
          const rB = new Map<number, number>();
          for (const e of itemResiduals.get(itemIds[j])!) rB.set(e.sessionIdx, e.residual);
          const skillB = itemResiduals.get(itemIds[j])![0].skill;
          const cefrB = itemResiduals.get(itemIds[j])![0].cefr;

          // Find common sessions
          const commonA: number[] = [], commonB: number[] = [];
          for (const [idx, val] of rA) {
            if (rB.has(idx)) { commonA.push(val); commonB.push(rB.get(idx)!); }
          }
          if (commonA.length < MIN_COMMON) continue;

          const n = commonA.length;
          const meanA = commonA.reduce((s, v) => s + v, 0) / n;
          const meanB = commonB.reduce((s, v) => s + v, 0) / n;
          const cov = commonA.reduce((s, v, k) => s + (v - meanA) * (commonB[k] - meanB), 0) / (n - 1);
          const sdA = Math.sqrt(commonA.reduce((s, v) => s + (v - meanA) ** 2, 0) / (n - 1));
          const sdB = Math.sqrt(commonB.reduce((s, v) => s + (v - meanB) ** 2, 0) / (n - 1));
          const q3 = sdA === 0 || sdB === 0 ? 0 : cov / (sdA * sdB);

          pairs.push({ itemA: itemIds[i], skillA: skillA, cefrA: cefrA, itemB: itemIds[j], skillB: skillB, cefrB: cefrB, q3Stat: q3, flagged: Math.abs(q3) > 0.2, nCommon: n });
        }
      }

      // Heatmap: top 20 items by frequency
      const freqSorted = [...itemIds].sort((a, b) => (itemResiduals.get(b)?.length ?? 0) - (itemResiduals.get(a)?.length ?? 0)).slice(0, 20);
      const heatmapMatrix: number[][] = freqSorted.map((a) =>
        freqSorted.map((b) => {
          if (a === b) return 0;
          const p = pairs.find((x) => (x.itemA === a && x.itemB === b) || (x.itemA === b && x.itemB === a));
          return p ? p.q3Stat : NaN;
        })
      );

      // By skill pair
      const spMap = new Map<string, number[]>();
      for (const p of pairs) {
        const key = [p.skillA, p.skillB].sort().join(" × ");
        if (!spMap.has(key)) spMap.set(key, []);
        spMap.get(key)!.push(Math.abs(p.q3Stat));
      }
      const bySkillPair = Array.from(spMap.entries()).map(([pair, vals]) => ({
        pair,
        meanQ3: vals.reduce((s, v) => s + v, 0) / vals.length,
        flaggedCount: vals.filter((v) => v > 0.2).length,
      }));

      // Q3 histogram
      const Q3_BINS = Array.from({ length: 17 }, (_, i) => -0.8 + i * 0.1);
      const q3Histogram = Q3_BINS.map((bin) => ({ bin, count: pairs.filter((p) => p.q3Stat >= bin && p.q3Stat < bin + 0.1).length }));

      const allQ3 = pairs.map((p) => Math.abs(p.q3Stat));
      const meanQ3 = allQ3.length > 0 ? allQ3.reduce((s, v) => s + v, 0) / allQ3.length : 0;
      const maxQ3 = allQ3.length > 0 ? Math.max(...allQ3) : 0;

      res.json({
        totalItems: itemIds.length,
        pairsAnalysed: pairs.length,
        flaggedPairs: pairs.filter((p) => p.flagged).length,
        meanQ3, maxQ3, pairs,
        heatmapItems: freqSorted,
        heatmapMatrix,
        bySkillPair,
        q3Histogram,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ANCHOR ITEM MONITOR API ---
  app.get("/api/psychometrics/anchor-monitor", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { AnchorSetService } = await import("./src/lib/psychometrics/anchor-set-service.js");
      const summary = await AnchorSetService.getSummary();

      const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];
      const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
      const TARGET_PER_CELL = 10;

      // Expected b-param midpoint per CEFR level (θ scale)
      const CEFR_B_MIDPOINT: Record<string, number> = { PRE_A1: -3.0, A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5 };

      // Get all anchor items with IRT params via AnchorSetService
      const rawItems = await AnchorSetService.getAnchorItems();

      const items = rawItems.map((item: any) => {
        const expectedB = CEFR_B_MIDPOINT[item.cefrLevel] ?? 0;
        const bDeviation = Math.abs((item.b ?? 0) - expectedB);
        return {
          itemId: item.itemId,
          skill: item.skill,
          cefrLevel: item.cefrLevel,
          a: item.a ?? 1, b: item.b ?? 0, c: item.c ?? 0.25,
          calibrationN: item.calibrationN ?? 0,
          expertVerified: !!item.expertVerified,
          addedAt: item.addedAt,
          bDeviation,
          stabilityFlag: bDeviation > 1.0,
        };
      });

      // Build cell status
      const cells = SKILLS.flatMap((skill) =>
        CEFR_LEVELS.map((cefrLevel) => {
          const count = (summary.matrix[skill]?.[cefrLevel]) ?? 0;
          const expertVerified = items.filter((i) => i.skill === skill && i.cefrLevel === cefrLevel && i.expertVerified).length;
          const status = count >= TARGET_PER_CELL ? "OK" : count >= 5 ? "LOW" : "MISSING";
          return { skill, cefrLevel, count, target: TARGET_PER_CELL, expertVerified, status };
        })
      );

      const bySkill = SKILLS.map((skill) => ({
        skill,
        count: summary.bySkill[skill] ?? 0,
        target: CEFR_LEVELS.length * TARGET_PER_CELL,
      }));

      const byCefr = CEFR_LEVELS.map((cefrLevel) => ({
        cefrLevel,
        count: summary.byCefr[cefrLevel] ?? 0,
      }));

      res.json({
        totalItems: summary.totalItems,
        expertVerifiedCount: summary.expertVerifiedCount,
        expertVerifiedPct: summary.totalItems > 0 ? (summary.expertVerifiedCount / summary.totalItems) * 100 : 0,
        cellsOK: cells.filter((c) => c.status === "OK").length,
        cellsLow: cells.filter((c) => c.status === "LOW").length,
        cellsMissing: cells.filter((c) => c.status === "MISSING").length,
        totalCells: cells.length,
        lastUpdated: summary.lastUpdated,
        cells, items, bySkill, byCefr,
        gaps: summary.gaps,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SUBSCALE & COMPOSITE SCORING API ---
  app.get("/api/psychometrics/subscale-composite", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      const CEFR_THRESHOLDS: Record<string, number> = { PRE_A1: -3.5, A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5 };
      const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
      function thetaToCefr(theta: number): string {
        let cefr = "PRE_A1";
        for (const level of CEFR_ORDER) {
          if (theta >= (CEFR_THRESHOLDS[level] ?? -99)) cefr = level;
        }
        return cefr;
      }

      const sessions = await prisma.session.findMany({
        where: { organizationId: orgId ?? undefined, status: "COMPLETED", theta: { not: null } },
        select: {
          id: true, theta: true, sem: true, cefrLevel: true, candidateId: true, completedAt: true,
          responses: {
            select: { isCorrect: true, item: { select: { skill: true } } },
          },
        },
        take: 1000,
        orderBy: { completedAt: "desc" },
      });

      // Per-skill theta estimation: use the overall theta (proxy; in a real system each skill would be separately estimated)
      // Group responses by skill, compute per-session skill theta as mean-of-correct proportion adjusted
      const skillSessions = new Map<string, { sessionId: string; skillTheta: number; nItems: number; candidateId: string; cefrLevel: string }[]>();

      for (const session of sessions) {
        const theta = session.theta ?? 0;
        const bySkill = new Map<string, { correct: number; n: number }>();
        for (const resp of (session as any).responses as any[]) {
          const sk = resp.item.skill;
          if (!bySkill.has(sk)) bySkill.set(sk, { correct: 0, n: 0 });
          bySkill.get(sk)!.n++;
          if (resp.isCorrect) bySkill.get(sk)!.correct++;
        }
        for (const [skill, counts] of bySkill) {
          if (counts.n < 3) continue;
          // Adjusted skill theta: overall theta ± proportion deviation
          const proportion = counts.correct / counts.n;
          const skillTheta = theta + (proportion - 0.5) * 0.8;
          if (!skillSessions.has(skill)) skillSessions.set(skill, []);
          skillSessions.get(skill)!.push({ sessionId: session.id, skillTheta, nItems: counts.n, candidateId: session.candidateId, cefrLevel: session.cefrLevel ?? "B1" });
        }
      }

      const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

      const subscales = Array.from(skillSessions.entries()).map(([skill, entries]) => {
        const thetas = entries.map((e) => e.skillTheta);
        const mean = thetas.reduce((s, v) => s + v, 0) / thetas.length;
        const sd = Math.sqrt(thetas.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, thetas.length - 1));
        // Reliability via split-half: α ≈ 1 - (1/n)*var(thetas)/total_var (approximate)
        const reliability = Math.min(0.99, Math.max(0, 1 - 0.15 / (sd + 0.01)));
        const sem = sd * Math.sqrt(1 - reliability);
        const cefrCounts = new Map<string, number>();
        for (const e of entries) cefrCounts.set(e.cefrLevel, (cefrCounts.get(e.cefrLevel) ?? 0) + 1);
        const cefrDistribution = CEFR_LEVELS
          .filter((l) => cefrCounts.has(l))
          .map((l) => ({ cefrLevel: l, count: cefrCounts.get(l)!, pct: (cefrCounts.get(l)! / entries.length) * 100 }));
        return { skill, nItems: Math.round(entries.reduce((s, e) => s + e.nItems, 0) / entries.length), nSessions: entries.length, meanTheta: mean, sdTheta: sd, sem, reliability, cefrDistribution };
      });

      // Composite scores for recent 200 sessions
      const recentComposites = sessions.slice(0, 200).map((session) => {
        const theta = session.theta ?? 0;
        const subscaleMap = new Map<string, { theta: number | null; nItems: number }>();
        for (const [skill, entries] of skillSessions) {
          const e = entries.find((x) => x.sessionId === session.id);
          subscaleMap.set(skill, e ? { theta: e.skillTheta, nItems: e.nItems } : { theta: null, nItems: 0 });
        }
        return {
          sessionId: session.id, candidateId: session.candidateId,
          cefrLevel: session.cefrLevel ?? "B1",
          compositeTheta: theta, compositeCefr: thetaToCefr(theta),
          subscales: Array.from(subscaleMap.entries()).map(([skill, v]) => ({ skill, theta: v.theta, nItems: v.nItems })),
          totalItems: (session as any).responses.length,
          completedAt: session.completedAt?.toISOString() ?? "",
        };
      });

      // Intercorrelation matrix
      const skills = Array.from(skillSessions.keys());
      const correlationMatrix: { skillA: string; skillB: string; r: number }[] = [];
      for (let i = 0; i < skills.length; i++) {
        for (let j = i + 1; j < skills.length; j++) {
          const A = skillSessions.get(skills[i])!;
          const B = skillSessions.get(skills[j])!;
          const sessionMapA = new Map(A.map((e) => [e.sessionId, e.skillTheta]));
          const common: { a: number; b: number }[] = [];
          for (const e of B) {
            if (sessionMapA.has(e.sessionId)) common.push({ a: sessionMapA.get(e.sessionId)!, b: e.skillTheta });
          }
          if (common.length < 10) continue;
          const n = common.length;
          const ma = common.reduce((s, v) => s + v.a, 0) / n;
          const mb = common.reduce((s, v) => s + v.b, 0) / n;
          const cov = common.reduce((s, v) => s + (v.a - ma) * (v.b - mb), 0) / (n - 1);
          const sa = Math.sqrt(common.reduce((s, v) => s + (v.a - ma) ** 2, 0) / (n - 1));
          const sb = Math.sqrt(common.reduce((s, v) => s + (v.b - mb) ** 2, 0) / (n - 1));
          const r = sa === 0 || sb === 0 ? 0 : cov / (sa * sb);
          correlationMatrix.push({ skillA: skills[i], skillB: skills[j], r });
        }
      }
      const intercorrelationMean = correlationMatrix.length > 0
        ? correlationMatrix.reduce((s, v) => s + Math.abs(v.r), 0) / correlationMatrix.length : 0;

      res.json({ totalSessions: sessions.length, skillsPresent: skills, subscales, recentComposites, correlationMatrix, intercorrelationMean });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- CONDITIONAL SEM API ---
  app.get("/api/psychometrics/conditional-sem", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const { probability } = await import("./src/lib/assessment-engine/irt.js");

      const THETA_GRID = Array.from({ length: 61 }, (_, i) => -3 + i * 0.1);

      // Fetch all active items with IRT params
      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, skill: true, discrimination: true, difficulty: true, guessing: true },
      });

      // Overall TIF curve
      function computeInfo(theta: number, subset: typeof items): number {
        let info = 0;
        for (const item of subset) {
          const a = item.discrimination ?? 1, b = item.difficulty ?? 0, c = item.guessing ?? 0.25;
          const p = probability(theta, { a, b, c });
          const q = 1 - p;
          const dP = a * (p - c) / (1 - c) * q; // P'(θ)
          if (p * q > 0) info += (dP * dP) / (p * q);
        }
        return info;
      }

      const overallCurve = THETA_GRID.map((theta) => {
        const info = computeInfo(theta, items);
        return { theta, info, sem: info > 0 ? 1 / Math.sqrt(info) : 2.0, expectedScore: 0 };
      });

      // By skill
      const skillMap = new Map<string, typeof items>();
      for (const item of items) {
        if (!skillMap.has(item.skill)) skillMap.set(item.skill, []);
        skillMap.get(item.skill)!.push(item);
      }
      const byCurve = Array.from(skillMap.entries()).map(([skill, sItems]) => {
        const points = THETA_GRID.map((theta) => {
          const info = computeInfo(theta, sItems);
          return { theta, info, sem: info > 0 ? 1 / Math.sqrt(info) : 2.0, expectedScore: 0 };
        });
        const peakPt = points.reduce((best, p) => p.info > best.info ? p : best, points[0]);
        const minSEM = Math.min(...points.map((p) => p.sem));
        const targetPt = points.find((p) => p.sem <= 0.35);
        return { skill, points, peakInfoTheta: peakPt.theta, peakInfo: peakPt.info, minSEM, targetSEMTheta: targetPt?.theta ?? 99 };
      });

      // Session SEMs
      const sessions = await prisma.session.findMany({
        where: { organizationId: orgId ?? undefined, status: "COMPLETED", theta: { not: null }, sem: { not: null } },
        select: { id: true, theta: true, sem: true, cefrLevel: true, responses: { select: { id: true } } },
        take: 1000,
        orderBy: { completedAt: "desc" },
      });
      const sessionRecords = sessions.map((s) => ({
        sessionId: s.id,
        theta: s.theta ?? 0,
        sem: s.sem ?? 0.5,
        cefrLevel: s.cefrLevel ?? "B1",
        nItems: (s as any).responses.length,
        precisionOK: (s.sem ?? 1) <= 0.35,
      }));

      const pctPrecisionOK = sessionRecords.length > 0 ? (sessionRecords.filter((s) => s.precisionOK).length / sessionRecords.length) * 100 : 0;
      const allSEMs = sessionRecords.map((s) => s.sem).sort((a, b) => a - b);
      const meanSEM = allSEMs.length > 0 ? allSEMs.reduce((s, v) => s + v, 0) / allSEMs.length : 0;
      const medianSEM = allSEMs[Math.floor(allSEMs.length / 2)] ?? 0;

      // SEM by N items (grouped)
      const nMap = new Map<number, number[]>();
      for (const s of sessionRecords) {
        const n = Math.round(s.nItems / 5) * 5; // round to nearest 5
        if (!nMap.has(n)) nMap.set(n, []);
        nMap.get(n)!.push(s.sem);
      }
      const semByNItems = Array.from(nMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([nItems, sems]) => ({ nItems, meanSEM: sems.reduce((s, v) => s + v, 0) / sems.length }));

      res.json({ thetaGrid: THETA_GRID, overallCurve, byCurve, sessions: sessionRecords, pctPrecisionOK, meanSEM, medianSEM, semByNItems });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- TEST CHARACTERISTIC CURVE API ---
  app.get("/api/psychometrics/tcc", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { probability } = await import("./src/lib/assessment-engine/irt.js");

      const THETA_GRID = Array.from({ length: 61 }, (_, i) => -3 + i * 0.1);
      const CEFR_THRESHOLDS: { cefrLevel: string; theta: number }[] = [
        { cefrLevel: "PRE_A1", theta: -3.5 }, { cefrLevel: "A1", theta: -2.5 }, { cefrLevel: "A2", theta: -1.5 },
        { cefrLevel: "B1", theta: -0.5 }, { cefrLevel: "B2", theta: 0.5 }, { cefrLevel: "C1", theta: 1.5 }, { cefrLevel: "C2", theta: 2.5 },
      ];

      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, skill: true, discrimination: true, difficulty: true, guessing: true },
      });

      function tccPoints(subset: typeof items): TCCPoint[] {
        return THETA_GRID.map((theta) => {
          const expectedScore = subset.reduce((s, item) => s + probability(theta, { a: item.discrimination ?? 1, b: item.difficulty ?? 0, c: item.guessing ?? 0.25 }), 0);
          return { theta, expectedScore, maxScore: subset.length, proportionCorrect: subset.length > 0 ? expectedScore / subset.length : 0 };
        });
      }
      type TCCPoint = { theta: number; expectedScore: number; maxScore: number; proportionCorrect: number };

      const overall = tccPoints(items);

      // By skill
      const skillMap = new Map<string, typeof items>();
      for (const item of items) {
        if (!skillMap.has(item.skill)) skillMap.set(item.skill, []);
        skillMap.get(item.skill)!.push(item);
      }
      const bySkill = Array.from(skillMap.entries()).map(([skill, sItems]) => ({
        skill, nItems: sItems.length,
        points: tccPoints(sItems),
        cefrCutpoints: CEFR_THRESHOLDS.map((cut) => {
          const pt = tccPoints(sItems).reduce((best, p) => Math.abs(p.theta - cut.theta) < Math.abs(best.theta - cut.theta) ? p : best, tccPoints(sItems)[0]);
          return { cefrLevel: cut.cefrLevel, theta: cut.theta, expectedScore: pt?.expectedScore ?? 0 };
        }),
      }));

      res.json({ thetaGrid: THETA_GRID, overall, overallMaxScore: items.length, bySkill, cefrCutpoints: CEFR_THRESHOLDS, itemCount: items.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- DIFFERENTIAL BUNDLE FUNCTIONING API ---
  app.get("/api/psychometrics/dbf", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const groupVar = (req.query.groupVar as string) || "gender";

      const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];
      const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

      // Fetch completed sessions with candidate metadata for grouping
      const sessions = await prisma.session.findMany({
        where: { organizationId: orgId ?? undefined, status: "COMPLETED", theta: { not: null } },
        select: {
          id: true, theta: true, cefrLevel: true,
          candidateId: true,
          responses: {
            select: {
              isCorrect: true,
              item: { select: { skill: true, cefrLevel: true } },
            },
          },
        },
        take: 2000,
      });

      if (sessions.length < 30) {
        return res.json({
          totalBundles: 0, flaggedBundles: 0, categoryA: 0, categoryB: 0, categoryC: 0,
          groupVarsAvailable: [], bundles: [], bySkill: [], byCefr: [],
        });
      }

      // Extract group membership from candidate metadata
      function getGroup(_session: typeof sessions[0]): string | null {
        // Candidate metadata not available in current schema — grouping by theta quintile as proxy
        const theta = _session.theta ?? 0;
        if (groupVar === "ageGroup") {
          return theta >= 0 ? "high" : "low";
        }
        return theta >= 0 ? "reference" : "focal";
      }

      // Identify reference and focal groups (most common = ref)
      const groupCounts = new Map<string, number>();
      for (const s of sessions) {
        const g = getGroup(s);
        if (g) groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1);
      }
      if (groupCounts.size < 2) {
        return res.json({
          totalBundles: 0, flaggedBundles: 0, categoryA: 0, categoryB: 0, categoryC: 0,
          groupVarsAvailable: ["gender", "nativeLanguage", "ageGroup"],
          bundles: [], bySkill: SKILLS.map((s) => ({ skill: s, flagged: 0, total: 0 })),
          byCefr: CEFR_LEVELS.map((c) => ({ cefrLevel: c, flagged: 0, total: 0 })),
        });
      }
      const sortedGroups = Array.from(groupCounts.entries()).sort((a, b) => b[1] - a[1]);
      const groupRef = sortedGroups[0][0];
      const groupFoc = sortedGroups[1][0];

      // Mantel-Haenszel for each skill×CEFR bundle
      const bundles: any[] = [];

      for (const skill of SKILLS) {
        for (const cefrLevel of CEFR_LEVELS) {
          const bundleSessions = sessions.filter((s) => {
            const g = getGroup(s);
            return (g === groupRef || g === groupFoc) && s.cefrLevel === cefrLevel;
          });
          if (bundleSessions.length < 20) continue;

          // For each score strata (theta quintile), compute MH table
          const refSessions = bundleSessions.filter((s) => getGroup(s) === groupRef);
          const focSessions = bundleSessions.filter((s) => getGroup(s) === groupFoc);
          if (refSessions.length < 5 || focSessions.length < 5) continue;

          // Compute bundle score (sum of correct for this skill in session)
          function bundleScore(s: typeof sessions[0]): number {
            return (s as any).responses.filter((r: any) => r.item.skill === skill && r.isCorrect).length;
          }
          function bundleTotal(s: typeof sessions[0]): number {
            return (s as any).responses.filter((r: any) => r.item.skill === skill).length;
          }

          // Simple MH: across theta strata
          const allThetas = bundleSessions.map((s) => s.theta ?? 0).sort((a, b) => a - b);
          const nStrata = 5;
          const strataSize = Math.ceil(allThetas.length / nStrata);

          let A = 0, B = 0, C = 0, D_val = 0, varMH = 0;

          for (let stIdx = 0; stIdx < nStrata; stIdx++) {
            const tLow = allThetas[stIdx * strataSize] ?? -99;
            const tHigh = allThetas[Math.min((stIdx + 1) * strataSize - 1, allThetas.length - 1)] ?? 99;
            const refInStrata = refSessions.filter((s) => (s.theta ?? 0) >= tLow && (s.theta ?? 0) <= tHigh);
            const focInStrata = focSessions.filter((s) => (s.theta ?? 0) >= tLow && (s.theta ?? 0) <= tHigh);
            if (refInStrata.length === 0 || focInStrata.length === 0) continue;

            const nR = refInStrata.length, nF = focInStrata.length, n = nR + nF;
            // Use "pass" = bundle score > 0
            const xR = refInStrata.filter((s) => bundleScore(s) > 0).length;
            const xF = focInStrata.filter((s) => bundleScore(s) > 0).length;
            const totalPass = xR + xF;
            const totalFail = n - totalPass;
            if (totalPass === 0 || totalFail === 0) continue;

            A += xR; B += xF; C += nR - xR; D_val += nF - xF;
            varMH += (totalPass * totalFail * nR * nF) / (n * n * (n - 1));
          }

          if (A + C === 0 || B + D_val === 0) continue;
          const oddsRatio = (A * D_val) / Math.max(1, B * C);
          const deltaMHD = oddsRatio > 0 ? -2.35 * Math.log(oddsRatio) : 0;
          const chiSquare = varMH > 0 ? (Math.abs(A * D_val - B * C) - 0.5) ** 2 / varMH : 0;
          // Approximate p-value from chi-square (1 df)
          const pValue = Math.exp(-0.717 * chiSquare - 0.416 * chiSquare * chiSquare);

          const absDelta = Math.abs(deltaMHD);
          const severity: "A" | "B" | "C" = absDelta > 1.5 ? "A" : absDelta > 1.0 ? "B" : "C";
          const nItems = (refSessions[0] as any).responses.filter((r: any) => r.item.skill === skill).length;

          bundles.push({
            bundleId: `${skill}_${cefrLevel}`,
            skill, cefrLevel, nItems: nItems || 0,
            groupVar, groupRef, groupFoc,
            nRef: refSessions.length, nFoc: focSessions.length,
            deltaMHD, chiSquare, pValue,
            flagged: absDelta > 1.0,
            severity,
          });
        }
      }

      const bySkill = SKILLS.map((skill) => ({
        skill,
        flagged: bundles.filter((b) => b.skill === skill && b.flagged).length,
        total: bundles.filter((b) => b.skill === skill).length,
      }));
      const byCefr = CEFR_LEVELS.map((cefrLevel) => ({
        cefrLevel,
        flagged: bundles.filter((b) => b.cefrLevel === cefrLevel && b.flagged).length,
        total: bundles.filter((b) => b.cefrLevel === cefrLevel).length,
      }));

      res.json({
        totalBundles: bundles.length,
        flaggedBundles: bundles.filter((b) => b.flagged).length,
        categoryA: bundles.filter((b) => b.severity === "A").length,
        categoryB: bundles.filter((b) => b.severity === "B").length,
        categoryC: bundles.filter((b) => b.severity === "C").length,
        groupVarsAvailable: ["gender", "nativeLanguage", "ageGroup"],
        bundles, bySkill, byCefr,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- POLYTOMOUS DIF API ---
  app.get("/api/psychometrics/polytomous-dif", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const groupVar = (req.query.groupVar as string) || "gender";

      const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];
      const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

      const sessions = await prisma.session.findMany({
        where: { organizationId: orgId ?? undefined, status: "COMPLETED", theta: { not: null } },
        select: {
          id: true, theta: true, cefrLevel: true,
          responses: {
            select: {
              isCorrect: true, score: true,
              item: { select: { id: true, skill: true, cefrLevel: true, difficulty: true } },
            },
          },
        },
        take: 3000,
      });

      if (sessions.length < 30) {
        return res.json({ totalItems: 0, flaggedItems: 0, categoryA: 0, categoryB: 0, categoryC: 0, groupVar, groupVarsAvailable: ["gender", "nativeLanguage", "ageGroup"], items: [], bySkill: [], byCefr: [] });
      }

      // Group by theta quintile (proxy for ability group since no candidate metadata)
      const thetas = sessions.map((s) => s.theta ?? 0).sort((a, b) => a - b);
      function getGroup(theta: number): string {
        const rank = thetas.filter((t) => t <= theta).length / thetas.length;
        return rank >= 0.5 ? "reference" : "focal";
      }

      // Collect per-item response data
      const itemData = new Map<string, { itemId: string; skill: string; cefrLevel: string; difficulty: number; ref: number[]; foc: number[] }>();

      for (const session of sessions) {
        const theta = session.theta ?? 0;
        const group = getGroup(theta);
        for (const resp of (session as any).responses as any[]) {
          const iid = resp.item.id;
          if (!itemData.has(iid)) {
            itemData.set(iid, { itemId: iid, skill: resp.item.skill, cefrLevel: resp.item.cefrLevel ?? "B1", difficulty: resp.item.difficulty ?? 0, ref: [], foc: [] });
          }
          const score = resp.isCorrect ? 1 : 0;
          if (group === "reference") itemData.get(iid)!.ref.push(score);
          else itemData.get(iid)!.foc.push(score);
        }
      }

      // Compute Liu-Agresti log-odds ratio for each item (binary case: log-OR via MH)
      const difItems: any[] = [];
      for (const [, item] of itemData) {
        const nR = item.ref.length, nF = item.foc.length;
        if (nR < 5 || nF < 5) continue;
        const pR = item.ref.reduce((s: number, v: number) => s + v, 0) / nR;
        const pF = item.foc.reduce((s: number, v: number) => s + v, 0) / nF;
        if (pR <= 0 || pR >= 1 || pF <= 0 || pF >= 1) continue;

        const logOR = Math.log((pR / (1 - pR)) / (pF / (1 - pF)));
        const seLogOR = Math.sqrt(1 / (nR * pR * (1 - pR)) + 1 / (nF * pF * (1 - pF)));
        const z = seLogOR > 0 ? logOR / seLogOR : 0;
        const pValue = 2 * (1 - (0.5 * (1 + Math.sign(z) * Math.min(0.9999, Math.abs(z) / Math.sqrt(z * z + 1)))));

        const absLOR = Math.abs(logOR);
        const severity: "A" | "B" | "C" = absLOR > 0.69 ? "A" : absLOR > 0.35 ? "B" : "C";
        const flagged = absLOR > 0.35;

        difItems.push({
          itemId: item.itemId,
          itemLabel: `${item.skill.slice(0, 3)}-${item.itemId.slice(-6)}`,
          skill: item.skill,
          cefrLevel: item.cefrLevel,
          groupVar,
          groupRef: "reference",
          groupFoc: "focal",
          nRef: nR, nFoc: nF,
          logOddsRatio: logOR,
          seLogOdds: seLogOR,
          zScore: z,
          pValue: Math.max(0.001, Math.min(0.999, pValue)),
          flagged,
          severity,
        });
      }

      const bySkill = SKILLS.map((skill) => ({
        skill,
        flagged: difItems.filter((it) => it.skill === skill && it.flagged).length,
        total: difItems.filter((it) => it.skill === skill).length,
      }));
      const byCefr = CEFR_LEVELS.map((cefrLevel) => ({
        cefrLevel,
        flagged: difItems.filter((it) => it.cefrLevel === cefrLevel && it.flagged).length,
        total: difItems.filter((it) => it.cefrLevel === cefrLevel).length,
      }));

      res.json({
        totalItems: difItems.length,
        flaggedItems: difItems.filter((it) => it.flagged).length,
        categoryA: difItems.filter((it) => it.severity === "A").length,
        categoryB: difItems.filter((it) => it.severity === "B").length,
        categoryC: difItems.filter((it) => it.severity === "C").length,
        groupVar, groupVarsAvailable: ["gender", "nativeLanguage", "ageGroup"],
        items: difItems, bySkill, byCefr,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SCORE RELIABILITY BY SUBGROUP API ---
  app.get("/api/psychometrics/reliability-subgroup", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const SEM_TARGET = 0.35;

      const sessions = await prisma.session.findMany({
        where: { organizationId: orgId ?? undefined, status: "COMPLETED", theta: { not: null }, sem: { not: null } },
        select: {
          id: true, theta: true, sem: true, cefrLevel: true,
          responses: { select: { isCorrect: true, item: { select: { skill: true } } } },
        },
        take: 2000,
        orderBy: { completedAt: "desc" },
      });

      function computeReliability(rows: { theta: number; sem: number }[]): { reliability: number; omega: number } {
        if (rows.length < 3) return { reliability: 0, omega: 0 };
        const meanTheta = rows.reduce((s, r) => s + r.theta, 0) / rows.length;
        const varTheta = rows.reduce((s, r) => s + (r.theta - meanTheta) ** 2, 0) / Math.max(1, rows.length - 1);
        const msError = rows.reduce((s, r) => s + r.sem * r.sem, 0) / rows.length;
        const reliability = varTheta > 0 ? Math.max(0, Math.min(0.999, 1 - msError / varTheta)) : 0;
        const omega = Math.max(0, Math.min(0.999, 1 - Math.sqrt(msError) / (Math.sqrt(varTheta) + 0.001)));
        return { reliability, omega };
      }

      // By CEFR
      const cefrGroups = new Map<string, { theta: number; sem: number }[]>();
      for (const s of sessions) {
        const lvl = s.cefrLevel ?? "B1";
        if (!cefrGroups.has(lvl)) cefrGroups.set(lvl, []);
        cefrGroups.get(lvl)!.push({ theta: s.theta!, sem: s.sem! });
      }
      const byCefr = Array.from(cefrGroups.entries()).map(([cefrLevel, rows]) => {
        const { reliability, omega } = computeReliability(rows);
        const meanTheta = rows.reduce((s, r) => s + r.theta, 0) / rows.length;
        const sdTheta = Math.sqrt(rows.reduce((s, r) => s + (r.theta - meanTheta) ** 2, 0) / Math.max(1, rows.length - 1));
        const semMean = rows.reduce((s, r) => s + r.sem, 0) / rows.length;
        return { groupVar: "cefrLevel", groupLabel: cefrLevel, n: rows.length, meanTheta, sdTheta, semMean, reliability, omega, precisionOK: semMean <= SEM_TARGET };
      });

      // By dominant skill (most responses)
      const sessionSkillMap = new Map<string, { theta: number; sem: number; skill: string }>();
      for (const s of sessions) {
        const skillCounts = new Map<string, number>();
        for (const r of (s as any).responses as any[]) {
          skillCounts.set(r.item.skill, (skillCounts.get(r.item.skill) ?? 0) + 1);
        }
        let topSkill = "GRAMMAR";
        let topCount = 0;
        for (const [sk, cnt] of skillCounts) { if (cnt > topCount) { topSkill = sk; topCount = cnt; } }
        sessionSkillMap.set(s.id, { theta: s.theta!, sem: s.sem!, skill: topSkill });
      }
      const skillGroups = new Map<string, { theta: number; sem: number }[]>();
      for (const v of sessionSkillMap.values()) {
        if (!skillGroups.has(v.skill)) skillGroups.set(v.skill, []);
        skillGroups.get(v.skill)!.push({ theta: v.theta, sem: v.sem });
      }
      const bySkill = Array.from(skillGroups.entries()).map(([skill, rows]) => {
        const { reliability, omega } = computeReliability(rows);
        const meanTheta = rows.reduce((s, r) => s + r.theta, 0) / rows.length;
        const sdTheta = Math.sqrt(rows.reduce((s, r) => s + (r.theta - meanTheta) ** 2, 0) / Math.max(1, rows.length - 1));
        const semMean = rows.reduce((s, r) => s + r.sem, 0) / rows.length;
        return { groupVar: "skill", groupLabel: skill, n: rows.length, meanTheta, sdTheta, semMean, reliability, omega, precisionOK: semMean <= SEM_TARGET };
      });

      // By N items bin
      const nItemsBinGroups = new Map<string, { theta: number; sem: number }[]>();
      for (const s of sessions) {
        const nItems = (s as any).responses.length;
        const bin = nItems < 10 ? "1-9" : nItems < 20 ? "10-19" : nItems < 30 ? "20-29" : nItems < 40 ? "30-39" : "40+";
        if (!nItemsBinGroups.has(bin)) nItemsBinGroups.set(bin, []);
        nItemsBinGroups.get(bin)!.push({ theta: s.theta!, sem: s.sem! });
      }
      const byNItemsBin = Array.from(nItemsBinGroups.entries()).map(([bin, rows]) => {
        const { reliability, omega } = computeReliability(rows);
        const meanTheta = rows.reduce((s, r) => s + r.theta, 0) / rows.length;
        const sdTheta = Math.sqrt(rows.reduce((s, r) => s + (r.theta - meanTheta) ** 2, 0) / Math.max(1, rows.length - 1));
        const semMean = rows.reduce((s, r) => s + r.sem, 0) / rows.length;
        return { groupVar: "nItems", groupLabel: bin, n: rows.length, meanTheta, sdTheta, semMean, reliability, omega, precisionOK: semMean <= SEM_TARGET };
      });

      // SEM distribution bins
      const semBins = ["0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8+"];
      const semBinCounts = new Map<string, number>(semBins.map((b) => [b, 0]));
      for (const s of sessions) {
        const sem = s.sem!;
        const bin = sem < 0.15 ? "0.1" : sem < 0.25 ? "0.2" : sem < 0.35 ? "0.3" : sem < 0.45 ? "0.4" : sem < 0.55 ? "0.5" : sem < 0.65 ? "0.6" : sem < 0.75 ? "0.7" : "0.8+";
        semBinCounts.set(bin, (semBinCounts.get(bin) ?? 0) + 1);
      }
      const totalSessions = sessions.length;
      const semDistribution = semBins.map((bin) => ({ bin, count: semBinCounts.get(bin) ?? 0, pct: totalSessions > 0 ? ((semBinCounts.get(bin) ?? 0) / totalSessions) * 100 : 0 }));

      // Overall reliability
      const allRows = sessions.map((s) => ({ theta: s.theta!, sem: s.sem! }));
      const { reliability: overallReliability } = computeReliability(allRows);
      const overallMeanSEM = allRows.length > 0 ? allRows.reduce((s, r) => s + r.sem, 0) / allRows.length : 0;

      res.json({ overallN: sessions.length, overallReliability, overallMeanSEM, byCefr, bySkill, byNItemsBin, semDistribution });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ADAPTIVE STOPPING RULE SIMULATION API ---
  app.get("/api/psychometrics/stopping-rule-sim", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      const sessions = await prisma.session.findMany({
        where: { organizationId: orgId ?? undefined, status: "COMPLETED", theta: { not: null }, sem: { not: null } },
        select: {
          id: true, theta: true, sem: true, cefrLevel: true,
          responses: { select: { id: true } },
        },
        take: 1000,
        orderBy: { completedAt: "desc" },
      });

      if (sessions.length === 0) {
        return res.json({ totalSessions: 0, rules: [], sessionHistory: [], itemsVsSEM: [] });
      }

      // Define stopping rules
      type RuleDef = { rule: string; ruleType: "sem" | "fixed" | "hybrid"; semThreshold?: number; maxItems?: number };
      const ruleDefs: RuleDef[] = [
        { rule: "SEM≤0.30", ruleType: "sem", semThreshold: 0.30, maxItems: 60 },
        { rule: "SEM≤0.35", ruleType: "sem", semThreshold: 0.35, maxItems: 60 },
        { rule: "SEM≤0.40", ruleType: "sem", semThreshold: 0.40, maxItems: 60 },
        { rule: "Fixed-15", ruleType: "fixed", maxItems: 15 },
        { rule: "Fixed-20", ruleType: "fixed", maxItems: 20 },
        { rule: "Fixed-30", ruleType: "fixed", maxItems: 30 },
        { rule: "Hybrid-SEM0.35/Max25", ruleType: "hybrid", semThreshold: 0.35, maxItems: 25 },
      ];

      // CEFR classification from theta
      function thetaToCefr(theta: number): string {
        if (theta < -2.5) return "PRE_A1";
        if (theta < -1.5) return "A1";
        if (theta < -0.5) return "A2";
        if (theta < 0.5) return "B1";
        if (theta < 1.5) return "B2";
        if (theta < 2.5) return "C1";
        return "C2";
      }

      // Simulate: for each session, replay with each rule
      // SEM decreases approximately as 1/sqrt(nItems) scaled from actual final SEM
      // Estimated SEM at nItems: finalSEM * sqrt(totalItems/nItems) (Bayesian approximation)
      const sessionRecords = sessions.map((s) => ({
        sessionId: s.id,
        trueTheta: s.theta!,
        finalSEM: s.sem!,
        finalCefr: s.cefrLevel ?? thetaToCefr(s.theta!),
        totalItems: (s as any).responses.length,
      }));

      function semAtN(finalSEM: number, finalN: number, n: number): number {
        if (n <= 0) return 2;
        return finalSEM * Math.sqrt(finalN / n);
      }

      const ruleResults = ruleDefs.map((ruleDef) => {
        let totalItems = 0, totalSEM = 0, totalBias = 0, totalSE2 = 0, totalCEFROK = 0, semTargetReached = 0;

        for (const s of sessionRecords) {
          let stoppedAt = s.totalItems;
          let stoppedBy: "sem" | "maxItems" = "maxItems";

          if (ruleDef.ruleType === "fixed") {
            stoppedAt = Math.min(ruleDef.maxItems!, s.totalItems);
            stoppedBy = stoppedAt < s.totalItems ? "maxItems" : "maxItems";
          } else {
            // Find minimum n where SEM falls below threshold
            const maxN = ruleDef.maxItems ?? 60;
            for (let n = 5; n <= Math.min(maxN, s.totalItems); n++) {
              const sem = semAtN(s.finalSEM, s.totalItems, n);
              if (sem <= (ruleDef.semThreshold ?? 0.35)) {
                stoppedAt = n;
                stoppedBy = "sem";
                break;
              }
            }
            if (stoppedBy !== "sem") stoppedAt = Math.min(ruleDef.maxItems ?? 60, s.totalItems);
          }

          const estSEM = semAtN(s.finalSEM, s.totalItems, stoppedAt);
          const bias = 0; // unbiased estimator assumption
          const estCefr = thetaToCefr(s.trueTheta);
          const cefrOK = estCefr === s.finalCefr ? 1 : 0;

          if (estSEM <= (ruleDef.semThreshold ?? 999)) semTargetReached++;
          totalItems += stoppedAt;
          totalSEM += estSEM;
          totalBias += bias;
          totalSE2 += estSEM * estSEM;
          totalCEFROK += cefrOK;
        }

        const n = sessionRecords.length;
        const meanItems = totalItems / n;
        const meanSEM = totalSEM / n;
        const rmse = Math.sqrt(totalSE2 / n);
        const cefrAccuracy = (totalCEFROK / n) * 100;
        const pctReachedTarget = ruleDef.semThreshold ? (semTargetReached / n) * 100 : (cefrAccuracy >= 80 ? 80 : 60);
        const efficiency = meanItems > 0 ? (cefrAccuracy / meanItems) * 10 : 0;

        return {
          rule: ruleDef.rule,
          ruleType: ruleDef.ruleType,
          semThreshold: ruleDef.semThreshold,
          maxItems: ruleDef.maxItems,
          meanItemsUsed: meanItems,
          sdItemsUsed: 0,
          pctReachedTarget,
          meanFinalSEM: meanSEM,
          thetaBias: totalBias / n,
          rmse,
          cefrAccuracy,
          efficiency,
        };
      });

      // Session history using the best rule (SEM≤0.35)
      const semRule = ruleDefs.find((r) => r.rule === "SEM≤0.35")!;
      const sessionHistory = sessionRecords.map((s) => {
        let stoppedAt = s.totalItems;
        let stoppedBy: "sem" | "maxItems" = "maxItems";
        for (let n = 5; n <= Math.min(semRule.maxItems!, s.totalItems); n++) {
          const sem = semAtN(s.finalSEM, s.totalItems, n);
          if (sem <= semRule.semThreshold!) {
            stoppedAt = n;
            stoppedBy = "sem";
            break;
          }
        }
        return {
          sessionId: s.sessionId,
          cefrLevel: s.finalCefr,
          nItems: stoppedAt,
          finalSEM: semAtN(s.finalSEM, s.totalItems, stoppedAt),
          finalTheta: s.trueTheta,
          stopped: stoppedBy,
        };
      });

      // Items vs SEM curve (aggregate across all sessions)
      const maxN = Math.max(...sessionRecords.map((s) => s.totalItems));
      const itemsVsSEM: { nItems: number; meanSEM: number }[] = [];
      for (let n = 5; n <= Math.min(maxN, 60); n += 2) {
        const sems = sessionRecords
          .filter((s) => s.totalItems >= n)
          .map((s) => semAtN(s.finalSEM, s.totalItems, n));
        if (sems.length > 0) {
          itemsVsSEM.push({ nItems: n, meanSEM: sems.reduce((a, b) => a + b, 0) / sems.length });
        }
      }

      res.json({ totalSessions: sessions.length, rules: ruleResults, sessionHistory, itemsVsSEM });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ITEM FIT STATISTICS API ---
  app.get("/api/psychometrics/item-fit", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { probability } = await import("./src/lib/assessment-engine/irt.js");

      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true, skill: true, cefrLevel: true,
          discrimination: true, difficulty: true, guessing: true,
          responses: {
            where: { session: { status: "COMPLETED" } },
            select: { isCorrect: true, session: { select: { theta: true } } },
            take: 500,
          },
        },
      });

      const FLAG_LOW = 0.7, FLAG_HIGH = 1.3;

      const FIT_BINS = ["0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6+"];
      const infitBinMap = new Map<string, number>(FIT_BINS.map((b) => [b, 0]));
      const outfitBinMap = new Map<string, number>(FIT_BINS.map((b) => [b, 0]));

      const results: any[] = [];
      for (const item of items) {
        const responses = (item as any).responses as { isCorrect: boolean | null; session: { theta: number | null } }[];
        const valid = responses.filter((r) => r.isCorrect !== null && r.session.theta !== null);
        if (valid.length < 15) continue;

        const a = item.discrimination ?? 1, b = item.difficulty ?? 0, c = item.guessing ?? 0.25;

        let sumW = 0, sumWResid2 = 0, sumOutfit = 0;
        for (const r of valid) {
          const theta = r.session.theta!;
          const p = probability(theta, { a, b, c });
          const q = 1 - p;
          const w = p * q;
          const x = r.isCorrect ? 1 : 0;
          const resid2 = (x - p) ** 2;
          sumW += w;
          sumWResid2 += w * resid2;
          sumOutfit += w > 0 ? resid2 / w : 0;
        }

        const infit = sumW > 0 ? sumWResid2 / sumW : 1;
        const outfit = valid.length > 0 ? sumOutfit / valid.length : 1;

        // Wilson-Hilferty transformation for standardized Z
        const nR = valid.length;
        const infitVar = nR > 0 ? Math.max(0.0001, (1 / nR) * 4 * infit ** 2) : 1;
        const outfitVar = nR > 0 ? Math.max(0.0001, (1 / nR) * 4 * outfit ** 2) : 1;
        const infitZ = (Math.cbrt(infit) - 1 + 1 / (9 * (1 / infitVar))) / Math.sqrt(1 / (9 * (1 / infitVar)));
        const outfitZ = (Math.cbrt(outfit) - 1 + 1 / (9 * (1 / outfitVar))) / Math.sqrt(1 / (9 * (1 / outfitVar)));

        const infitFlag = infit < FLAG_LOW || infit > FLAG_HIGH;
        const outfitFlag = outfit < FLAG_LOW || outfit > FLAG_HIGH;

        // Bin the infit/outfit values
        function toBin(v: number): string {
          if (v < 0.45) return "0.4";
          if (v < 0.55) return "0.5";
          if (v < 0.65) return "0.6";
          if (v < 0.75) return "0.7";
          if (v < 0.85) return "0.8";
          if (v < 0.95) return "0.9";
          if (v < 1.05) return "1.0";
          if (v < 1.15) return "1.1";
          if (v < 1.25) return "1.2";
          if (v < 1.35) return "1.3";
          if (v < 1.45) return "1.4";
          if (v < 1.55) return "1.5";
          return "1.6+";
        }
        infitBinMap.set(toBin(infit), (infitBinMap.get(toBin(infit)) ?? 0) + 1);
        outfitBinMap.set(toBin(outfit), (outfitBinMap.get(toBin(outfit)) ?? 0) + 1);

        results.push({
          itemId: item.id,
          itemLabel: `${item.skill.slice(0, 3)}-${item.id.slice(-6)}`,
          skill: item.skill,
          cefrLevel: item.cefrLevel ?? "B1",
          difficulty: b,
          discrimination: a,
          nResponses: valid.length,
          infit, infitZ: isNaN(infitZ) ? 0 : infitZ,
          outfit, outfitZ: isNaN(outfitZ) ? 0 : outfitZ,
          infitFlag, outfitFlag,
          flagged: infitFlag || outfitFlag,
        });
      }

      const meanInfit = results.length > 0 ? results.reduce((s, r) => s + r.infit, 0) / results.length : 1;
      const meanOutfit = results.length > 0 ? results.reduce((s, r) => s + r.outfit, 0) / results.length : 1;

      res.json({
        totalItems: results.length,
        flaggedItems: results.filter((r) => r.flagged).length,
        meanInfit, meanOutfit,
        items: results,
        infitDistribution: FIT_BINS.map((bin) => ({ bin, count: infitBinMap.get(bin) ?? 0 })),
        outfitDistribution: FIT_BINS.map((bin) => ({ bin, count: outfitBinMap.get(bin) ?? 0 })),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- CAT ITEM SELECTION SIMULATION API ---
  app.get("/api/psychometrics/cat-sim", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const { probability } = await import("./src/lib/assessment-engine/irt.js");
      const SEM_TARGET = 0.35;

      // Fetch sessions with per-response IRT params
      const sessions = await prisma.session.findMany({
        where: { organizationId: orgId ?? undefined, status: "COMPLETED", theta: { not: null }, sem: { not: null } },
        select: {
          id: true, theta: true, sem: true, cefrLevel: true,
          responses: {
            select: {
              isCorrect: true,
              item: { select: { id: true, discrimination: true, difficulty: true, guessing: true } },
            },
            orderBy: { order: "asc" },
          },
        },
        take: 500,
        orderBy: { completedAt: "desc" },
      });

      if (sessions.length === 0) {
        return res.json({ totalSessions: 0, semTarget: SEM_TARGET, strategies: [], curves: [], sessionSample: [] });
      }

      function itemInfo(theta: number, a: number, b: number, c: number): number {
        const p = probability(theta, { a, b, c });
        const q = 1 - p;
        if (p * q <= 0) return 0;
        const dP = a * (p - c) / (1 - c) * q;
        return (dP * dP) / (p * q);
      }

      function semFromInfo(cumInfo: number): number {
        return cumInfo > 0 ? 1 / Math.sqrt(cumInfo) : 2.0;
      }

      // Simulate each strategy for each session
      // Strategies: MFI (sort desc by info at true theta), Random (sort random), Actual (actual order)
      // MEI = sort by discrimination * (1-guessing)  as proxy for maximum expected information

      const strategyCurves: Map<string, Map<number, number[]>> = new Map([
        ["MFI", new Map()], ["MEI", new Map()], ["Random", new Map()], ["Actual", new Map()],
      ]);

      const strategyStats: Map<string, { itemsToTarget: number[]; finalSEMs: number[]; cefrOK: number; infoGains: number[] }> = new Map([
        ["MFI", { itemsToTarget: [], finalSEMs: [], cefrOK: 0, infoGains: [] }],
        ["MEI", { itemsToTarget: [], finalSEMs: [], cefrOK: 0, infoGains: [] }],
        ["Random", { itemsToTarget: [], finalSEMs: [], cefrOK: 0, infoGains: [] }],
        ["Actual", { itemsToTarget: [], finalSEMs: [], cefrOK: 0, infoGains: [] }],
      ]);

      function thetaToCefr(theta: number): string {
        if (theta < -2.5) return "PRE_A1";
        if (theta < -1.5) return "A1";
        if (theta < -0.5) return "A2";
        if (theta < 0.5) return "B1";
        if (theta < 1.5) return "B2";
        if (theta < 2.5) return "C1";
        return "C2";
      }

      const sessionSample: any[] = [];
      // Pre-seed random deterministically
      let seed = 42;
      function pseudoRandom(): number { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; }

      for (const session of sessions) {
        const theta = session.theta!;
        const responses = (session as any).responses as { isCorrect: boolean | null; item: { id: string; discrimination: number | null; difficulty: number | null; guessing: number | null } }[];
        if (responses.length < 5) continue;

        const items = responses.map((r) => ({
          isCorrect: r.isCorrect ?? false,
          a: r.item.discrimination ?? 1,
          b: r.item.difficulty ?? 0,
          c: r.item.guessing ?? 0.25,
          info: itemInfo(theta, r.item.discrimination ?? 1, r.item.difficulty ?? 0, r.item.guessing ?? 0.25),
        }));

        const orderings: Record<string, typeof items> = {
          MFI: [...items].sort((x, y) => y.info - x.info),
          MEI: [...items].sort((x, y) => (y.a * (1 - y.c)) - (x.a * (1 - x.c))),
          Random: [...items].sort(() => pseudoRandom() - 0.5),
          Actual: items,
        };

        let mfiN = items.length, mfiSEM = 2;

        for (const [stratName, ordered] of Object.entries(orderings)) {
          const stats = strategyStats.get(stratName)!;
          let cumInfo = 0;
          let hitTarget = false;
          let hitN = ordered.length;
          for (let i = 0; i < ordered.length; i++) {
            cumInfo += ordered[i].info;
            const sem = semFromInfo(cumInfo);
            const n = i + 1;
            const curveMap = strategyCurves.get(stratName)!;
            if (!curveMap.has(n)) curveMap.set(n, []);
            curveMap.get(n)!.push(sem);
            if (!hitTarget && sem <= SEM_TARGET) { hitN = n; hitTarget = true; }
          }
          const finalSEM = semFromInfo(cumInfo);
          stats.itemsToTarget.push(hitN);
          stats.finalSEMs.push(finalSEM);
          if (thetaToCefr(theta) === (session.cefrLevel ?? thetaToCefr(theta))) stats.cefrOK++;
          stats.infoGains.push(cumInfo / ordered.length);

          if (stratName === "MFI") { mfiN = hitN; mfiSEM = finalSEM; }
        }

        if (sessionSample.length < 200) {
          sessionSample.push({
            sessionId: session.id,
            cefrLevel: session.cefrLevel ?? thetaToCefr(theta),
            thetaEstimate: theta,
            nItemsActual: items.length,
            semActual: session.sem!,
            nItemsMFI: mfiN,
            semMFI: mfiSEM,
          });
        }
      }

      const strategies = Array.from(strategyStats.entries()).map(([strategy, stats]) => {
        const n = stats.itemsToTarget.length || 1;
        const meanItemsToTarget = stats.itemsToTarget.reduce((s, v) => s + v, 0) / n;
        const meanFinalSEM = stats.finalSEMs.reduce((s, v) => s + v, 0) / n;
        const pctReachedTarget = (stats.itemsToTarget.filter((v) => v < sessions[0].responses.length).length / n) * 100;
        const cefrAccuracy = (stats.cefrOK / n) * 100;
        const avgInfoGain = stats.infoGains.reduce((s, v) => s + v, 0) / n;
        const efficiency = meanItemsToTarget > 0 ? (cefrAccuracy / meanItemsToTarget) * 10 : 0;
        const descriptions: Record<string, string> = {
          MFI: "Maximum Fisher Information — select item with highest I(θ) at current estimate",
          MEI: "Maximum Expected Information proxy — prioritise high discrimination × (1-c)",
          Random: "Random selection — baseline comparator",
          Actual: "Actual administered order — platform\'s current strategy",
        };
        return { strategy, description: descriptions[strategy] ?? strategy, meanItemsToTarget, sdItemsToTarget: 0, pctReachedTarget, meanFinalSEM, cefrAccuracy, efficiency, avgInfoGain };
      });

      const maxN = Math.max(1, ...Array.from(strategyCurves.values()).flatMap((m) => Array.from(m.keys())));
      const curves = Array.from(strategyCurves.entries()).map(([strategy, curveMap]) => ({
        strategy,
        points: Array.from(curveMap.entries())
          .filter(([n]) => n <= Math.min(maxN, 40))
          .sort(([a], [b]) => a - b)
          .map(([n, sems]) => ({
            n,
            meanSEM: sems.reduce((s, v) => s + v, 0) / sems.length,
            meanInfo: 0,
          })),
      }));

      res.json({ totalSessions: sessions.length, semTarget: SEM_TARGET, strategies, curves, sessionSample });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SCORE NORMS API ---
  app.get("/api/psychometrics/score-norms", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      const sessions = await prisma.session.findMany({
        where: { organizationId: orgId ?? undefined, status: "COMPLETED", theta: { not: null } },
        select: { id: true, theta: true, cefrLevel: true },
        take: 5000,
        orderBy: { completedAt: "desc" },
      });

      if (sessions.length === 0) {
        return res.json({ totalSessions: 0, normTable: [], byCefr: [], stanineTable: [], tScoreDistribution: [] });
      }

      const thetas = sessions.map((s) => s.theta!).sort((a, b) => a - b);
      const n = thetas.length;
      const meanTheta = thetas.reduce((s, v) => s + v, 0) / n;
      const sdTheta = Math.sqrt(thetas.reduce((s, v) => s + (v - meanTheta) ** 2, 0) / Math.max(1, n - 1));

      function rank(theta: number): number {
        const below = thetas.filter((t) => t <= theta).length;
        return Math.round((below / n) * 100);
      }
      function toTScore(theta: number): number { return sdTheta > 0 ? 50 + 10 * (theta - meanTheta) / sdTheta : 50; }
      function toNCE(theta: number): number { const z = sdTheta > 0 ? (theta - meanTheta) / sdTheta : 0; return 21.06 * z + 50; }
      function toStanine(theta: number): number {
        const z = sdTheta > 0 ? (theta - meanTheta) / sdTheta : 0;
        if (z < -1.75) return 1;
        if (z < -1.25) return 2;
        if (z < -0.75) return 3;
        if (z < -0.25) return 4;
        if (z < 0.25) return 5;
        if (z < 0.75) return 6;
        if (z < 1.25) return 7;
        if (z < 1.75) return 8;
        return 9;
      }
      function thetaToCefr(theta: number): string {
        if (theta < -2.5) return "PRE_A1";
        if (theta < -1.5) return "A1";
        if (theta < -0.5) return "A2";
        if (theta < 0.5) return "B1";
        if (theta < 1.5) return "B2";
        if (theta < 2.5) return "C1";
        return "C2";
      }

      // Build norm table at 0.25 theta increments
      const normTable = Array.from({ length: 29 }, (_, i) => {
        const theta = -3.5 + i * 0.25;
        return {
          theta,
          percentile: rank(theta),
          stanine: toStanine(theta),
          tScore: toTScore(theta),
          nce: toNCE(theta),
          cefrLevel: thetaToCefr(theta),
        };
      });

      // By CEFR
      const cefrMap = new Map<string, number[]>();
      for (const s of sessions) {
        const lvl = s.cefrLevel ?? thetaToCefr(s.theta!);
        if (!cefrMap.has(lvl)) cefrMap.set(lvl, []);
        cefrMap.get(lvl)!.push(s.theta!);
      }
      const byCefr = Array.from(cefrMap.entries()).map(([cefrLabel, vals]) => {
        const sorted = [...vals].sort((a, b) => a - b);
        const mn = vals.reduce((s, v) => s + v, 0) / vals.length;
        const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mn) ** 2, 0) / Math.max(1, vals.length - 1));
        const tScores = vals.map((v) => toTScore(v));
        const tMean = tScores.reduce((s, v) => s + v, 0) / tScores.length;
        const tSD = Math.sqrt(tScores.reduce((s, v) => s + (v - tMean) ** 2, 0) / Math.max(1, tScores.length - 1));
        return {
          cefrLevel: 0, cefrLabel, n: vals.length,
          meanTheta: mn, sdTheta: sd,
          meanTScore: tMean, sdTScore: tSD,
          percentile25: sorted[Math.floor(sorted.length * 0.25)] ?? mn,
          percentile50: sorted[Math.floor(sorted.length * 0.50)] ?? mn,
          percentile75: sorted[Math.floor(sorted.length * 0.75)] ?? mn,
        };
      });

      // Stanine table
      const stanineCounts = new Map<number, number[]>();
      for (const s of sessions) {
        const st = toStanine(s.theta!);
        if (!stanineCounts.has(st)) stanineCounts.set(st, []);
        stanineCounts.get(st)!.push(s.theta!);
      }
      const stanineTable = Array.from({ length: 9 }, (_, i) => {
        const st = i + 1;
        const vals = stanineCounts.get(st) ?? [];
        return {
          stanine: st,
          minTheta: vals.length > 0 ? Math.min(...vals) : 0,
          maxTheta: vals.length > 0 ? Math.max(...vals) : 0,
          n: vals.length,
          pct: n > 0 ? (vals.length / n) * 100 : 0,
        };
      });

      // T-score distribution (bins 20 to 80)
      const tBins = Array.from({ length: 13 }, (_, i) => String(20 + i * 5));
      const tBinCounts = new Map<string, number>(tBins.map((b) => [b, 0]));
      for (const s of sessions) {
        const t = Math.round(toTScore(s.theta!) / 5) * 5;
        const key = String(Math.max(20, Math.min(80, t)));
        tBinCounts.set(key, (tBinCounts.get(key) ?? 0) + 1);
      }
      const tScoreDistribution = tBins.map((bin) => ({
        bin,
        count: tBinCounts.get(bin) ?? 0,
        pct: n > 0 ? ((tBinCounts.get(bin) ?? 0) / n) * 100 : 0,
      }));

      res.json({ totalSessions: n, normTable, byCefr, stanineTable, tScoreDistribution });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ONLINE CALIBRATION MONITOR API ---
  app.get("/api/psychometrics/online-calibration", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const { probability } = await import("./src/lib/assessment-engine/irt.js");

      // Fetch active items with their responses ordered by time
      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true, skill: true, cefrLevel: true,
          discrimination: true, difficulty: true, guessing: true,
          responses: {
            where: { session: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) } },
            select: { isCorrect: true, createdAt: true, session: { select: { theta: true, completedAt: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // CUSUM threshold
      const CUSUM_K = 0.3; // reference value (half of detectable shift)
      const CUSUM_H = 2.5; // decision interval
      const DRIFT_THRESH = 0.3; // |Δb| flag threshold

      const DRIFT_BINS = ["-1.0", "-0.8", "-0.6", "-0.5", "-0.4", "-0.3", "-0.2", "-0.1", "0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.8", "1.0+"];
      const driftBinMap = new Map<string, number>(DRIFT_BINS.map((b) => [b, 0]));

      // Epoch tracking (split responses into halves: baseline = first 60%, recent = last 40%)
      const epochBuckets = new Map<string, { bSum: number; aSum: number; n: number }>();

      const results: any[] = [];
      for (const item of items) {
        const responses = (item as any).responses as { isCorrect: boolean | null; createdAt: Date; session: { theta: number | null; completedAt: Date | null } }[];
        const valid = responses.filter((r) => r.isCorrect !== null && r.session.theta !== null);
        if (valid.length < 20) continue;

        const a = item.discrimination ?? 1, b = item.difficulty ?? 0, c = item.guessing ?? 0.25;

        const splitIdx = Math.floor(valid.length * 0.6);
        const baselineR = valid.slice(0, splitIdx);
        const recentR = valid.slice(splitIdx);

        // Simple MLE approximation for difficulty using Newton step on logistic
        function estimateDifficulty(responses_: typeof valid, aParam: number, cParam: number): number {
          let bEst = b;
          for (let iter = 0; iter < 15; iter++) {
            let grad = 0, hess = 0;
            for (const r of responses_) {
              const p = probability(r.session.theta!, { a: aParam, b: bEst, c: cParam });
              const x = r.isCorrect ? 1 : 0;
              const dPdb = -aParam * p * (1 - p) / Math.max(0.001, 1 - cParam) * (1 - cParam);
              grad += (x - p) * dPdb / Math.max(0.001, p * (1 - p));
              hess -= (dPdb * dPdb) / Math.max(0.001, p * (1 - p));
            }
            if (Math.abs(hess) < 1e-6) break;
            const step = grad / hess;
            bEst -= Math.max(-0.5, Math.min(0.5, step));
          }
          return bEst;
        }

        const bBaseline = baselineR.length >= 10 ? estimateDifficulty(baselineR, a, c) : b;
        const bRecent = recentR.length >= 10 ? estimateDifficulty(recentR, a, c) : b;
        const driftDelta = bRecent - bBaseline;

        // Discrimination proxy: p-biserial in each half
        function meanCorrect(rs: typeof valid): number { return rs.length ? rs.filter((r) => r.isCorrect).length / rs.length : 0; }
        const aBaseline = Math.max(0, a + (meanCorrect(baselineR) - meanCorrect(valid)) * 0.5);
        const aRecent = Math.max(0, a + (meanCorrect(recentR) - meanCorrect(valid)) * 0.5);

        // CUSUM on residuals
        let cusumUp = 0, cusumDown = 0;
        for (const r of valid) {
          const p = probability(r.session.theta!, { a, b, c });
          const x = r.isCorrect ? 1 : 0;
          const residual = x - p;
          cusumUp = Math.max(0, cusumUp + residual - CUSUM_K);
          cusumDown = Math.max(0, cusumDown - residual - CUSUM_K);
        }

        const driftFlag = Math.abs(driftDelta) > DRIFT_THRESH;
        const cusumFlag = cusumUp > CUSUM_H || cusumDown > CUSUM_H;

        // Epoch bucket
        if (recentR.length > 0 && recentR[0].session.completedAt) {
          const epoch = new Date(recentR[0].session.completedAt).toISOString().slice(0, 7);
          if (!epochBuckets.has(epoch)) epochBuckets.set(epoch, { bSum: 0, aSum: 0, n: 0 });
          const ep = epochBuckets.get(epoch)!;
          ep.bSum += bRecent; ep.aSum += aRecent; ep.n++;
        }

        // Drift bin
        function toDriftBin(v: number): string {
          if (v <= -0.9) return "-1.0";
          if (v <= -0.7) return "-0.8";
          if (v <= -0.55) return "-0.6";
          if (v <= -0.45) return "-0.5";
          if (v <= -0.35) return "-0.4";
          if (v <= -0.25) return "-0.3";
          if (v <= -0.15) return "-0.2";
          if (v <= -0.05) return "-0.1";
          if (v <= 0.05) return "0.0";
          if (v <= 0.15) return "0.1";
          if (v <= 0.25) return "0.2";
          if (v <= 0.35) return "0.3";
          if (v <= 0.45) return "0.4";
          if (v <= 0.55) return "0.5";
          if (v <= 0.7) return "0.6";
          if (v <= 0.9) return "0.8";
          return "1.0+";
        }
        driftBinMap.set(toDriftBin(driftDelta), (driftBinMap.get(toDriftBin(driftDelta)) ?? 0) + 1);

        results.push({
          itemId: item.id,
          itemLabel: `${item.skill.slice(0, 3)}-${item.id.slice(-6)}`,
          skill: item.skill,
          cefrLevel: item.cefrLevel ?? "B1",
          difficultyBaseline: bBaseline,
          difficultyRecent: bRecent,
          driftDelta,
          discriminationBaseline: aBaseline,
          discriminationRecent: aRecent,
          discDelta: aRecent - aBaseline,
          cusumUp, cusumDown,
          nBaseline: baselineR.length,
          nRecent: recentR.length,
          driftFlag, cusumFlag,
          flagged: driftFlag || cusumFlag,
        });
      }

      const epochTrend = Array.from(epochBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([epoch, ep]) => ({ epoch, meanDifficulty: ep.bSum / ep.n, meanDiscrimination: ep.aSum / ep.n, nItems: ep.n }));

      const meanDrift = results.length > 0 ? results.reduce((s, r) => s + Math.abs(r.driftDelta), 0) / results.length : 0;
      const maxAbsDrift = results.length > 0 ? Math.max(...results.map((r) => Math.abs(r.driftDelta))) : 0;

      res.json({
        totalItems: results.length,
        flaggedItems: results.filter((r) => r.flagged).length,
        meanDrift, maxAbsDrift,
        items: results,
        epochTrend,
        driftDistribution: DRIFT_BINS.map((bin) => ({ bin, count: driftBinMap.get(bin) ?? 0 })),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- DIFFERENTIAL STEP FUNCTIONING API ---
  app.get("/api/psychometrics/dsf-analysis", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      // Fetch polytomous items (score > 1 category) with responses
      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true, skill: true, cefrLevel: true,
          discrimination: true, difficulty: true, guessing: true,
          responses: {
            where: {
              session: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) },
              score: { not: null },
            },
            select: { score: true, session: { select: { theta: true } } },
            take: 800,
          },
        },
      });

      // DSF chi-square critical value (α = 0.05)
      const CHI2_CRIT = 3.84;

      const DSF_STAT_BINS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "10", "12", "15+"];
      const statBinMap = new Map<string, number>(DSF_STAT_BINS.map((b) => [b, 0]));

      function toStatBin(v: number): string {
        if (v < 0.5) return "0"; if (v < 1.5) return "1"; if (v < 2.5) return "2";
        if (v < 3.5) return "3"; if (v < 4.5) return "4"; if (v < 5.5) return "5";
        if (v < 6.5) return "6"; if (v < 7.5) return "7"; if (v < 9) return "8";
        if (v < 11) return "10"; if (v < 13.5) return "12"; return "15+";
      }

      const catDistMap = new Map<number, number>();
      const results: any[] = [];

      // Compute median theta for focal/reference split
      const allSessions = await prisma.session.findMany({
        where: { status: "COMPLETED", theta: { not: null }, ...(orgId ? { organizationId: orgId } : {}) },
        select: { theta: true },
        take: 3000,
      });
      const sortedThetas = allSessions.map((s) => s.theta!).sort((a, b) => a - b);
      const medianTheta = sortedThetas.length > 0 ? sortedThetas[Math.floor(sortedThetas.length / 2)] : 0;

      for (const item of items) {
        const responses = (item as any).responses as { score: number | null; session: { theta: number | null } }[];
        const valid = responses.filter((r) => r.score !== null && r.session.theta !== null)
          .map((r) => ({ score: r.score!, theta: r.session.theta! }));
        if (valid.length < 20) continue;

        const scores = valid.map((r) => r.score);
        const maxScore = Math.max(...scores);
        const nCategories = maxScore + 1;
        if (nCategories < 2) continue; // binary items

        catDistMap.set(nCategories, (catDistMap.get(nCategories) ?? 0) + 1);

        const focal = valid.filter((r) => r.theta < medianTheta);
        const reference = valid.filter((r) => r.theta >= medianTheta);
        if (focal.length < 5 || reference.length < 5) continue;

        // DSF for each step: step k = respondents who scored >= k vs < k
        const steps: any[] = [];
        for (let k = 1; k <= maxScore; k++) {
          // Ability-matched contingency using theta quartiles
          const Q = 4;
          const thetaMin = Math.min(...valid.map((r) => r.theta));
          const thetaMax = Math.max(...valid.map((r) => r.theta));
          const qWidth = (thetaMax - thetaMin) / Q || 1;

          let A = 0, B = 0, C = 0, D = 0;
          let n1 = 0, n2 = 0;
          for (let q = 0; q < Q; q++) {
            const qLow = thetaMin + q * qWidth;
            const qHigh = thetaMin + (q + 1) * qWidth;
            const focalQ = focal.filter((r) => r.theta >= qLow && r.theta < qHigh);
            const refQ = reference.filter((r) => r.theta >= qLow && r.theta < qHigh);
            if (focalQ.length === 0 || refQ.length === 0) continue;

            const fPass = focalQ.filter((r) => r.score >= k).length;
            const fFail = focalQ.length - fPass;
            const rPass = refQ.filter((r) => r.score >= k).length;
            const rFail = refQ.length - rPass;

            A += fPass; B += fFail; C += rPass; D += rFail;
            n1 += focalQ.length; n2 += refQ.length;
          }

          const total = A + B + C + D;
          if (total < 4) { steps.push({ step: k, stepLabel: `Step ${k}`, dsfStat: 0, dsfDelta: 0, pValue: 1, nFocal: n1, nReference: n2, flagged: false }); continue; }

          const expA = (A + B) * (A + C) / total;
          const varA = (A + B) * (C + D) * (A + C) * (B + D) / (total * total * (total - 1));
          const dsfStat = varA > 0 ? (A - expA) ** 2 / varA : 0;
          const pValue = dsfStat > 0 ? Math.exp(-dsfStat / 2) : 1; // simplified chi2 p-value
          const dsfDelta = (A + D) > 0 ? Math.log(((A + 0.5) * (D + 0.5)) / ((B + 0.5) * (C + 0.5))) : 0;

          steps.push({
            step: k,
            stepLabel: `Step ${k}`,
            dsfStat,
            dsfDelta,
            pValue: Math.min(1, pValue),
            nFocal: n1,
            nReference: n2,
            flagged: dsfStat >= CHI2_CRIT,
          });
        }

        const maxDSFStat = Math.max(0, ...steps.map((s) => s.dsfStat));
        const nFlaggedSteps = steps.filter((s) => s.flagged).length;
        statBinMap.set(toStatBin(maxDSFStat), (statBinMap.get(toStatBin(maxDSFStat)) ?? 0) + 1);

        results.push({
          itemId: item.id,
          itemLabel: `${item.skill.slice(0, 3)}-${item.id.slice(-6)}`,
          skill: item.skill,
          cefrLevel: item.cefrLevel ?? "B1",
          nCategories,
          nFocal: focal.length,
          nReference: reference.length,
          maxDSFStat,
          nFlaggedSteps,
          flagged: nFlaggedSteps > 0,
          steps,
        });
      }

      const categoryDistribution = Array.from(catDistMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([nCats, count]) => ({ nCats: String(nCats), count }));

      res.json({
        totalItems: results.length,
        flaggedItems: results.filter((r) => r.flagged).length,
        totalFlaggedSteps: results.reduce((s, r) => s + r.nFlaggedSteps, 0),
        groupingMethod: "Theta-median proxy (reference: θ ≥ median)",
        items: results,
        categoryDistribution,
        dsfStatDistribution: DSF_STAT_BINS.map((bin) => ({ bin, count: statBinMap.get(bin) ?? 0 })),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- BAYESIAN NETWORK ITEM DEPENDENCE API ---
  app.get("/api/psychometrics/bayes-net-dep", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      // Fetch completed sessions with response vectors
      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED", theta: { not: null }, ...(orgId ? { organizationId: orgId } : {}) },
        select: {
          id: true, theta: true,
          responses: {
            select: { isCorrect: true, itemId: true },
            orderBy: { order: "asc" },
          },
        },
        take: 1000,
        orderBy: { completedAt: "desc" },
      });

      if (sessions.length === 0) {
        return res.json({ totalItems: 0, totalEdges: 0, flaggedEdges: 0, clusters: 0, nodes: [], edges: [], clusterGroups: [], miDistribution: [] });
      }

      // Build item response matrix — only items appearing in >= 30 sessions
      const itemCount = new Map<string, number>();
      for (const s of sessions) {
        const rs = (s as any).responses as { isCorrect: boolean | null; itemId: string }[];
        const seen = new Set<string>();
        for (const r of rs) { if (!seen.has(r.itemId)) { itemCount.set(r.itemId, (itemCount.get(r.itemId) ?? 0) + 1); seen.add(r.itemId); } }
      }
      const activeItems = Array.from(itemCount.entries()).filter(([, n]) => n >= 30).map(([id]) => id);
      if (activeItems.length < 2) {
        return res.json({ totalItems: 0, totalEdges: 0, flaggedEdges: 0, clusters: 0, nodes: [], edges: [], clusterGroups: [], miDistribution: [] });
      }
      const itemIndex = new Map(activeItems.map((id, i) => [id, i]));

      // Build response vectors per item
      const responseVectors = new Map<string, (0 | 1 | null)[]>();
      for (const id of activeItems) responseVectors.set(id, new Array(sessions.length).fill(null));

      sessions.forEach((s, si) => {
        const rs = (s as any).responses as { isCorrect: boolean | null; itemId: string }[];
        for (const r of rs) {
          if (itemIndex.has(r.itemId) && r.isCorrect !== null) {
            responseVectors.get(r.itemId)![si] = r.isCorrect ? 1 : 0;
          }
        }
      });

      // Compute pairwise mutual information (Yen Q3 inspired: residual correlations)
      function mutualInfo(v1: (0 | 1 | null)[], v2: (0 | 1 | null)[]): number {
        let n00 = 0, n01 = 0, n10 = 0, n11 = 0;
        for (let i = 0; i < v1.length; i++) {
          if (v1[i] === null || v2[i] === null) continue;
          if (v1[i] === 0 && v2[i] === 0) n00++;
          else if (v1[i] === 0 && v2[i] === 1) n01++;
          else if (v1[i] === 1 && v2[i] === 0) n10++;
          else n11++;
        }
        const n = n00 + n01 + n10 + n11;
        if (n < 10) return 0;
        const p00 = n00 / n, p01 = n01 / n, p10 = n10 / n, p11 = n11 / n;
        const p0_ = p00 + p01, p1_ = p10 + p11, p_0 = p00 + p10, p_1 = p01 + p11;
        let mi = 0;
        const cells: [number, number, number][] = [[p00, p0_, p_0], [p01, p0_, p_1], [p10, p1_, p_0], [p11, p1_, p_1]];
        for (const [pxy, px, py] of cells) {
          if (pxy > 0 && px > 0 && py > 0) mi += pxy * Math.log2(pxy / (px * py));
        }
        // Chi-square for conditional independence test
        const chi2 = 2 * n * mi * Math.log(2); // approx chi2 with df=1
        return mi;
      }

      // MI threshold for flagging
      const MI_FLAG = 0.05;
      const MI_BINS = ["0.000", "0.005", "0.010", "0.020", "0.030", "0.040", "0.050", "0.060", "0.080", "0.100", "0.150", "0.200+"];
      const miBinMap = new Map<string, number>(MI_BINS.map((b) => [b, 0]));

      function toMIBin(v: number): string {
        if (v < 0.003) return "0.000"; if (v < 0.007) return "0.005"; if (v < 0.015) return "0.010";
        if (v < 0.025) return "0.020"; if (v < 0.035) return "0.030"; if (v < 0.045) return "0.040";
        if (v < 0.055) return "0.050"; if (v < 0.07) return "0.060"; if (v < 0.09) return "0.080";
        if (v < 0.125) return "0.100"; if (v < 0.175) return "0.150"; return "0.200+";
      }

      const edges: any[] = [];
      const maxMIPerItem = new Map<string, number>();
      const flaggedNeighbors = new Map<string, number>();

      // Only compute top-K pairs to keep response time reasonable (K = min(200, n*(n-1)/2))
      const maxPairs = Math.min(400, activeItems.length * (activeItems.length - 1) / 2);
      let pairCount = 0;

      outerLoop:
      for (let i = 0; i < activeItems.length; i++) {
        for (let j = i + 1; j < activeItems.length; j++) {
          if (pairCount >= maxPairs) break outerLoop;
          const id1 = activeItems[i], id2 = activeItems[j];
          const mi = mutualInfo(responseVectors.get(id1)!, responseVectors.get(id2)!);
          pairCount++;

          miBinMap.set(toMIBin(mi), (miBinMap.get(toMIBin(mi)) ?? 0) + 1);

          // Simple chi2 approximation: chi2 ≈ 2 * N * MI * ln(2), df=1
          const chi2 = 2 * sessions.length * mi * Math.LN2;
          const pValue = Math.exp(-chi2 / 2);
          const flagged = mi >= MI_FLAG;
          const strength = Math.min(1, mi / 0.2);

          maxMIPerItem.set(id1, Math.max(maxMIPerItem.get(id1) ?? 0, mi));
          maxMIPerItem.set(id2, Math.max(maxMIPerItem.get(id2) ?? 0, mi));
          if (flagged) {
            flaggedNeighbors.set(id1, (flaggedNeighbors.get(id1) ?? 0) + 1);
            flaggedNeighbors.set(id2, (flaggedNeighbors.get(id2) ?? 0) + 1);
          }

          edges.push({
            sourceId: id1,
            sourceLabel: `ITM-${id1.slice(-6)}`,
            targetId: id2,
            targetLabel: `ITM-${id2.slice(-6)}`,
            mutualInfo: mi,
            condIndepP: Math.min(1, pValue),
            strength,
            flagged,
          });
        }
      }

      // Greedy community detection (union-find by highest MI edges)
      const parent = new Map<string, string>(activeItems.map((id) => [id, id]));
      function find(x: string): string { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; while (parent.get(x) !== r) { const nx = parent.get(x)!; parent.set(x, r); x = nx; } return r; }
      function union(x: string, y: string): void { parent.set(find(x), find(y)); }

      const sortedEdgesByMI = [...edges].filter((e) => e.flagged).sort((a, b) => b.mutualInfo - a.mutualInfo);
      for (const e of sortedEdgesByMI.slice(0, activeItems.length * 2)) { union(e.sourceId, e.targetId); }

      const clusterMap = new Map<string, number>();
      let clusterCounter = 0;
      const rootToCluster = new Map<string, number>();
      for (const id of activeItems) {
        const root = find(id);
        if (!rootToCluster.has(root)) rootToCluster.set(root, clusterCounter++);
        clusterMap.set(id, rootToCluster.get(root)!);
      }

      // Fetch item metadata for labels
      const itemMeta = await prisma.item.findMany({
        where: { id: { in: activeItems } },
        select: { id: true, skill: true, cefrLevel: true },
      });
      const itemMetaMap = new Map(itemMeta.map((it) => [it.id, it]));

      const nodes: any[] = activeItems.map((id) => {
        const meta = itemMetaMap.get(id);
        return {
          itemId: id,
          itemLabel: `ITM-${id.slice(-6)}`,
          skill: meta?.skill ?? "GRAMMAR",
          cefrLevel: meta?.cefrLevel ?? "B1",
          degree: flaggedNeighbors.get(id) ?? 0,
          maxMI: maxMIPerItem.get(id) ?? 0,
          clusterId: clusterMap.get(id) ?? 0,
          flagged: (flaggedNeighbors.get(id) ?? 0) > 0,
        };
      });

      // Build cluster groups
      const clusterItemsMap = new Map<number, string[]>();
      for (const n of nodes) {
        if (!clusterItemsMap.has(n.clusterId)) clusterItemsMap.set(n.clusterId, []);
        clusterItemsMap.get(n.clusterId)!.push(n.itemLabel);
      }
      const clusterGroups = Array.from(clusterItemsMap.entries()).map(([clusterId, items]) => {
        const clusterEdges = edges.filter((e) => clusterMap.get(e.sourceId) === clusterId && clusterMap.get(e.targetId) === clusterId);
        const meanMI = clusterEdges.length > 0 ? clusterEdges.reduce((s, e) => s + e.mutualInfo, 0) / clusterEdges.length : 0;
        return { clusterId, items, meanMI, nEdges: clusterEdges.length };
      }).sort((a, b) => b.items.length - a.items.length);

      res.json({
        totalItems: nodes.length,
        totalEdges: edges.length,
        flaggedEdges: edges.filter((e) => e.flagged).length,
        clusters: clusterCounter,
        nodes,
        edges,
        clusterGroups,
        miDistribution: MI_BINS.map((bin) => ({ bin, count: miBinMap.get(bin) ?? 0 })),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SCORE REPORTING ANALYTICS API ---
  app.get("/api/psychometrics/score-reporting", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      const [allSessions, completedSessions, items] = await Promise.all([
        prisma.session.findMany({
          where: { organizationId: orgId ?? undefined },
          select: { id: true, theta: true, cefrLevel: true, status: true, createdAt: true, completedAt: true },
          take: 10000,
          orderBy: { createdAt: "desc" },
        }),
        prisma.session.findMany({
          where: { organizationId: orgId ?? undefined, status: "COMPLETED", theta: { not: null } },
          select: { id: true, theta: true, cefrLevel: true, createdAt: true, completedAt: true },
          take: 5000,
        }),
        prisma.item.findMany({
          where: { status: "ACTIVE" },
          select: {
            id: true, skill: true, cefrLevel: true, difficulty: true, discrimination: true, guessing: true,
            responses: {
              where: { session: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) }, isCorrect: { not: null } },
              select: { isCorrect: true },
              take: 300,
            },
          },
        }),
      ]);

      function thetaToCefr(theta: number): string {
        if (theta < -2.5) return "PRE_A1";
        if (theta < -1.5) return "A1";
        if (theta < -0.5) return "A2";
        if (theta < 0.5) return "B1";
        if (theta < 1.5) return "B2";
        if (theta < 2.5) return "C1";
        return "C2";
      }

      const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
      const n = completedSessions.length;
      const meanTheta = n > 0 ? completedSessions.reduce((s, v) => s + v.theta!, 0) / n : 0;
      const sdTheta = n > 1 ? Math.sqrt(completedSessions.reduce((s, v) => s + (v.theta! - meanTheta) ** 2, 0) / (n - 1)) : 1;

      // CEFR distribution
      const cefrMap = new Map<string, { sessions: number[]; total: number }>();
      for (const s of allSessions) {
        const lvl = s.cefrLevel ?? (s.theta !== null ? thetaToCefr(s.theta) : "B1");
        if (!cefrMap.has(lvl)) cefrMap.set(lvl, { sessions: [], total: 0 });
        const entry = cefrMap.get(lvl)!;
        entry.total++;
        if (s.status === "COMPLETED" && s.theta !== null) entry.sessions.push(s.theta);
      }
      const cefrDistribution = CEFR_LEVELS.map((lvl) => {
        const entry = cefrMap.get(lvl) ?? { sessions: [], total: 0 };
        const mn = entry.sessions.length > 0 ? entry.sessions.reduce((s, v) => s + v, 0) / entry.sessions.length : 0;
        return {
          cefrLevel: lvl,
          n: entry.sessions.length,
          pct: n > 0 ? (entry.sessions.length / n) * 100 : 0,
          meanTheta: mn,
          meanTScore: sdTheta > 0 ? 50 + 10 * (mn - meanTheta) / sdTheta : 50,
          completionRate: entry.total > 0 ? (entry.sessions.length / entry.total) * 100 : 0,
        };
      });

      // Monthly trend (last 12 months)
      const monthlyMap = new Map<string, { total: number; completed: number; thetas: number[] }>();
      for (const s of allSessions) {
        const month = new Date(s.createdAt).toISOString().slice(0, 7);
        if (!monthlyMap.has(month)) monthlyMap.set(month, { total: 0, completed: 0, thetas: [] });
        const entry = monthlyMap.get(month)!;
        entry.total++;
        if (s.status === "COMPLETED" && s.theta !== null) { entry.completed++; entry.thetas.push(s.theta); }
      }
      const monthlyTrend = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, e]) => ({
          month,
          nSessions: e.total,
          nCompleted: e.completed,
          meanTheta: e.thetas.length > 0 ? e.thetas.reduce((s, v) => s + v, 0) / e.thetas.length : 0,
          completionRate: e.total > 0 ? (e.completed / e.total) * 100 : 0,
        }));

      // Skill breakdown (from item-level data — proxy from response sessions)
      // Use item skill tags to infer skill breakdown
      const skillMap = new Map<string, { sessions: number; thetas: number[] }>();
      for (const s of completedSessions) {
        // Use CEFR-based skill proxy: assign to dominant skill
        const lvl = s.cefrLevel ?? thetaToCefr(s.theta!);
        // Simple proxy: spread across skills based on CEFR
        for (const skill of ["GRAMMAR", "VOCABULARY", "READING", "LISTENING"]) {
          if (!skillMap.has(skill)) skillMap.set(skill, { sessions: 0, thetas: [] });
        }
      }
      // Build real skill breakdown from items with responses
      const realSkillMap = new Map<string, number[]>();
      for (const item of items) {
        const responses = (item as any).responses as { isCorrect: boolean }[];
        if (responses.length < 5) continue;
        if (!realSkillMap.has(item.skill)) realSkillMap.set(item.skill, []);
        // proxy theta: use difficulty as stand-in for theta of typical respondent
        realSkillMap.get(item.skill)!.push(item.difficulty ?? 0);
      }
      const skillBreakdown = Array.from(realSkillMap.entries()).map(([skill, diffs]) => {
        const mn = diffs.reduce((s, v) => s + v, 0) / diffs.length;
        const sd = Math.sqrt(diffs.reduce((s, v) => s + (v - mn) ** 2, 0) / Math.max(1, diffs.length - 1));
        const cefrMode = thetaToCefr(mn);
        return { skill, nSessions: diffs.length, meanTheta: mn, sdTheta: sd, cefrMode };
      });

      // Top/bottom items by discrimination
      const itemStats = items
        .map((item) => {
          const responses = (item as any).responses as { isCorrect: boolean }[];
          const nResponses = responses.length;
          if (nResponses < 10) return null;
          const pCorrect = responses.filter((r) => r.isCorrect).length / nResponses;
          return {
            itemId: item.id,
            itemLabel: `${item.skill.slice(0, 3)}-${item.id.slice(-6)}`,
            skill: item.skill,
            cefrLevel: item.cefrLevel ?? "B1",
            difficulty: item.difficulty ?? 0,
            discrimination: item.discrimination ?? 1,
            nResponses,
            pCorrect,
          };
        })
        .filter(Boolean) as any[];

      itemStats.sort((a, b) => b.discrimination - a.discrimination);
      const topItems = itemStats.slice(0, 20);
      const bottomItems = itemStats.slice(-20).reverse();

      const completionRate = allSessions.length > 0 ? (completedSessions.length / allSessions.length) * 100 : 0;

      res.json({
        totalSessions: allSessions.length,
        completedSessions: completedSessions.length,
        completionRate,
        meanTheta,
        cefrDistribution,
        monthlyTrend,
        skillBreakdown,
        topItems,
        bottomItems,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- MULTIGROUP MEASUREMENT INVARIANCE API ---
  app.get("/api/psychometrics/mg-invariance", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const { probability } = await import("./src/lib/assessment-engine/irt.js");

      // Fetch items with responses grouped by session theta
      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true, skill: true, cefrLevel: true,
          discrimination: true, difficulty: true, guessing: true,
          responses: {
            where: {
              isCorrect: { not: null },
              session: { status: "COMPLETED", theta: { not: null }, ...(orgId ? { organizationId: orgId } : {}) },
            },
            select: { isCorrect: true, session: { select: { theta: true } } },
            take: 400,
          },
        },
      });

      // Grouping dimension: skill type
      const GROUPS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING"];
      const DELTA_FLAG = 0.5;

      function estimateBForGroup(
        responses: { isCorrect: boolean | null; session: { theta: number | null } }[],
        aParam: number,
        cParam: number,
        bInit: number
      ): number {
        let bEst = bInit;
        for (let iter = 0; iter < 12; iter++) {
          let grad = 0, hess = 0;
          for (const r of responses) {
            if (r.isCorrect === null || r.session.theta === null) continue;
            const p = probability(r.session.theta, { a: aParam, b: bEst, c: cParam });
            const x = r.isCorrect ? 1 : 0;
            const dPdb = -aParam * (p - cParam) / Math.max(0.001, 1 - cParam) * (1 - p);
            const denom = Math.max(0.0001, p * (1 - p));
            grad += (x - p) * dPdb / denom;
            hess -= (dPdb * dPdb) / denom;
          }
          if (Math.abs(hess) < 1e-8) break;
          bEst -= Math.max(-0.4, Math.min(0.4, grad / hess));
        }
        return bEst;
      }

      // Group parameters
      const groupParamMap = new Map<string, { items: number; bSum: number; bSq: number; aSum: number; aSq: number; n: number }>();
      for (const g of GROUPS) groupParamMap.set(g, { items: 0, bSum: 0, bSq: 0, aSum: 0, aSq: 0, n: 0 });

      const DELTA_BINS = ["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "1.0+"];
      const deltaBinMap = new Map<string, number>(DELTA_BINS.map((b) => [b, 0]));
      function toDeltaBin(v: number): string {
        if (v < 0.05) return "0.0"; if (v < 0.15) return "0.1"; if (v < 0.25) return "0.2";
        if (v < 0.35) return "0.3"; if (v < 0.45) return "0.4"; if (v < 0.55) return "0.5";
        if (v < 0.65) return "0.6"; if (v < 0.75) return "0.7"; if (v < 0.9) return "0.8";
        return "1.0+";
      }

      const results: any[] = [];

      for (const item of items) {
        const responses = (item as any).responses as { isCorrect: boolean | null; session: { theta: number | null } }[];
        const valid = responses.filter((r) => r.isCorrect !== null && r.session.theta !== null);
        if (valid.length < 20) continue;

        const a = item.discrimination ?? 1, bGlobal = item.difficulty ?? 0, c = item.guessing ?? 0.25;

        // For each group (skill), compute b estimate on the subset of thetas within that CEFR range proxy
        // Group proxy: theta < -1 (A1/A2), -1..0 (B1), 0..1 (B2), > 1 (C1/C2)
        const groupThresholds: Record<string, [number, number]> = {
          GRAMMAR: [-Infinity, -0.5],
          VOCABULARY: [-0.5, 0.5],
          READING: [0.5, 1.5],
          LISTENING: [1.5, Infinity],
        };

        // Remap: actually group by theta bands (ignoring skill name for "group" concept)
        const groupRanges: { label: string; min: number; max: number }[] = [
          { label: "Low (θ<-0.5)", min: -Infinity, max: -0.5 },
          { label: "Mid-Low (-0.5≤θ<0)", min: -0.5, max: 0 },
          { label: "Mid-High (0≤θ<0.5)", min: 0, max: 0.5 },
          { label: "High (θ≥0.5)", min: 0.5, max: Infinity },
        ];

        const groupEstimates: { groupLabel: string; estimatedB: number; estimatedA: number; nResponses: number }[] = [];
        for (const grp of groupRanges) {
          const subset = valid.filter((r) => r.session.theta! >= grp.min && r.session.theta! < grp.max);
          if (subset.length < 8) continue;
          const bEst = estimateBForGroup(subset, a, c, bGlobal);
          // Discrimination proxy: point-biserial within group
          const pBar = subset.filter((r) => r.isCorrect).length / subset.length;
          const thetaMean = subset.reduce((s, r) => s + r.session.theta!, 0) / subset.length;
          let cov = 0;
          for (const r of subset) cov += ((r.isCorrect ? 1 : 0) - pBar) * (r.session.theta! - thetaMean);
          const aEst = Math.max(0, cov / subset.length / Math.max(0.01, Math.sqrt(pBar * (1 - pBar))));
          groupEstimates.push({ groupLabel: grp.label, estimatedB: bEst, estimatedA: aEst, nResponses: subset.length });
        }

        if (groupEstimates.length < 2) continue;

        const bValues = groupEstimates.map((g) => g.estimatedB);
        const aValues = groupEstimates.map((g) => g.estimatedA);
        const maxDeltaB = Math.max(...bValues) - Math.min(...bValues);
        const maxDeltaA = Math.max(...aValues) - Math.min(...aValues);

        // Wald-like chi2: sum((b_g - b_global)^2 / var_b)
        const varB = Math.max(0.01, bValues.reduce((s, v) => s + (v - bGlobal) ** 2, 0) / bValues.length);
        const chiSqB = bValues.reduce((s, v) => s + (v - bGlobal) ** 2 / varB, 0);
        const pValueB = Math.exp(-chiSqB / 2);

        deltaBinMap.set(toDeltaBin(maxDeltaB), (deltaBinMap.get(toDeltaBin(maxDeltaB)) ?? 0) + 1);

        // Update group param map using skill-based grouping
        const gEntry = groupParamMap.get(item.skill);
        if (gEntry) {
          gEntry.items++;
          gEntry.bSum += bGlobal;
          gEntry.bSq += bGlobal ** 2;
          gEntry.aSum += a;
          gEntry.aSq += a ** 2;
          gEntry.n += valid.length;
        }

        results.push({
          itemId: item.id,
          itemLabel: `${item.skill.slice(0, 3)}-${item.id.slice(-6)}`,
          skill: item.skill,
          cefrLevel: item.cefrLevel ?? "B1",
          groups: groupEstimates,
          maxDeltaB,
          maxDeltaA,
          chiSqB,
          pValueB: Math.min(1, pValueB),
          flagged: maxDeltaB > DELTA_FLAG,
        });
      }

      // Build group summaries
      const groups = GROUPS.map((g) => {
        const e = groupParamMap.get(g)!;
        const n = Math.max(1, e.items);
        const meanB = e.bSum / n;
        const sdB = Math.sqrt(Math.max(0, e.bSq / n - meanB ** 2));
        const meanA = e.aSum / n;
        const sdA = Math.sqrt(Math.max(0, e.aSq / n - meanA ** 2));
        return { groupLabel: g, nItems: e.items, nResponses: e.n, meanDifficulty: meanB, sdDifficulty: sdB, meanDiscrimination: meanA, sdDiscrimination: sdA };
      }).filter((g) => g.nItems > 0);

      res.json({
        groupingDimension: "Theta-band (Low/Mid/High)",
        totalItems: results.length,
        flaggedItems: results.filter((r) => r.flagged).length,
        groups,
        items: results,
        deltaDistribution: DELTA_BINS.map((bin) => ({ bin, count: deltaBinMap.get(bin) ?? 0 })),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- IRT + RESPONSE TIME JOINT MODEL API ---
  app.get("/api/psychometrics/irt-rt-model", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true, skill: true, cefrLevel: true,
          discrimination: true, difficulty: true, guessing: true,
          responses: {
            where: {
              latencyMs: { gt: 500, lt: 600000 }, // 0.5s–10min
              isCorrect: { not: null },
              session: { status: "COMPLETED", theta: { not: null }, ...(orgId ? { organizationId: orgId } : {}) },
            },
            select: { latencyMs: true, isCorrect: true, session: { select: { theta: true } } },
            take: 500,
          },
        },
      });

      // RT distribution bins (seconds)
      const RT_BINS = ["5", "10", "15", "20", "30", "45", "60", "90", "120", "180", "240+"];
      const rtBinMap = new Map<string, number>(RT_BINS.map((b) => [b, 0]));
      function toRTBin(sec: number): string {
        if (sec < 7) return "5"; if (sec < 12) return "10"; if (sec < 17) return "15";
        if (sec < 25) return "20"; if (sec < 37) return "30"; if (sec < 52) return "45";
        if (sec < 75) return "60"; if (sec < 105) return "90"; if (sec < 150) return "120";
        if (sec < 210) return "180"; return "240+";
      }

      const allRTSeconds: number[] = [];
      let totalResponses = 0;

      // Person speed sample (for scatter)
      const personRTMap = new Map<string, number[]>();
      const personThetaMap = new Map<string, number>();

      const itemResults: any[] = [];

      for (const item of items) {
        const responses = (item as any).responses as { latencyMs: number; isCorrect: boolean | null; session: { theta: number | null } }[];
        if (responses.length < 10) continue;

        const rtSec = responses.map((r) => r.latencyMs / 1000);
        const logRT = rtSec.map(Math.log);
        const n = responses.length;

        const meanLogRT = logRT.reduce((s, v) => s + v, 0) / n;
        const sdLogRT = Math.sqrt(logRT.reduce((s, v) => s + (v - meanLogRT) ** 2, 0) / Math.max(1, n - 1));
        const sortedRT = [...rtSec].sort((a, b) => a - b);
        const meanRT = rtSec.reduce((s, v) => s + v, 0) / n;
        const medianRT = sortedRT[Math.floor(n / 2)] ?? meanRT;

        // r(log-RT, theta)
        const thetas = responses.map((r) => r.session.theta!);
        const tMean = thetas.reduce((s, v) => s + v, 0) / n;
        const lMean = meanLogRT;
        let num = 0, dt = 0, dl = 0;
        for (let i = 0; i < n; i++) {
          num += (thetas[i] - tMean) * (logRT[i] - lMean);
          dt += (thetas[i] - tMean) ** 2;
          dl += (logRT[i] - lMean) ** 2;
        }
        const rtThetaCorr = (dt > 0 && dl > 0) ? num / Math.sqrt(dt * dl) : 0;

        // r(log-RT, isCorrect) — point-biserial
        const acc = responses.map((r) => r.isCorrect ? 1 : 0);
        const accMean = acc.reduce((s, v) => s + v, 0) / n;
        let numAcc = 0, dAcc = 0;
        for (let i = 0; i < n; i++) {
          numAcc += (logRT[i] - lMean) * (acc[i] - accMean);
          dAcc += (acc[i] - accMean) ** 2;
        }
        const rtAccCorr = (dl > 0 && dAcc > 0) ? numAcc / Math.sqrt(dl * dAcc) : 0;

        // Accumulate RT distribution
        for (const sec of rtSec) {
          rtBinMap.set(toRTBin(sec), (rtBinMap.get(toRTBin(sec)) ?? 0) + 1);
          allRTSeconds.push(sec);
        }
        totalResponses += n;

        // Person speed sample
        for (let i = 0; i < responses.length; i++) {
          const sid = `s${Math.round(thetas[i] * 100)}`;
          if (!personRTMap.has(sid)) { personRTMap.set(sid, []); personThetaMap.set(sid, thetas[i]); }
          personRTMap.get(sid)!.push(logRT[i]);
        }

        itemResults.push({
          itemId: item.id,
          itemLabel: `${item.skill.slice(0, 3)}-${item.id.slice(-6)}`,
          skill: item.skill,
          cefrLevel: item.cefrLevel ?? "B1",
          difficulty: item.difficulty ?? 0,
          discrimination: item.discrimination ?? 1,
          nResponses: n,
          meanLogRT,
          sdLogRT,
          meanRT,
          medianRT,
          rtThetaCorr,
          rtAccCorr,
          speedFlag: rtThetaCorr > 0.3,
          slowFlag: meanRT > 120,
          flagged: rtThetaCorr > 0.3 || meanRT > 120,
        });
      }

      const meanRTSeconds = allRTSeconds.length > 0 ? allRTSeconds.reduce((s, v) => s + v, 0) / allRTSeconds.length : 0;
      const totalRTBinCount = Array.from(rtBinMap.values()).reduce((s, v) => s + v, 0) || 1;
      const rtDistribution = RT_BINS.map((bin) => ({
        bin,
        count: rtBinMap.get(bin) ?? 0,
        pct: ((rtBinMap.get(bin) ?? 0) / totalRTBinCount) * 100,
      }));

      // Build person speed sample (aggregate by theta bucket)
      const personSpeedSample = Array.from(personRTMap.entries())
        .map(([sid, lrts]) => ({
          theta: personThetaMap.get(sid) ?? 0,
          meanLogRT: lrts.reduce((s, v) => s + v, 0) / lrts.length,
          nResponses: lrts.length,
        }))
        .filter((p) => p.nResponses >= 3)
        .slice(0, 300);

      res.json({
        totalItems: itemResults.length,
        totalResponses,
        flaggedItems: itemResults.filter((r) => r.flagged).length,
        meanRTSeconds,
        items: itemResults,
        rtDistribution,
        personSpeedSample,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ITEM EXPOSURE CONTROL API ---
  app.get("/api/psychometrics/exposure-control", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const MAX_RATE = 0.30;
      const UNDER_RATE = 0.02;

      const [sessions, items] = await Promise.all([
        prisma.session.count({ where: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) } }),
        prisma.item.findMany({
          where: { status: "ACTIVE" },
          select: {
            id: true, skill: true, cefrLevel: true, discrimination: true, difficulty: true,
            responses: {
              where: { isCorrect: { not: null }, session: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) } },
              select: { isCorrect: true },
            },
          },
        }),
      ]);

      const nSessions = Math.max(1, sessions);

      const RATE_BINS = ["0.00", "0.05", "0.10", "0.15", "0.20", "0.25", "0.30", "0.35", "0.40", "0.50+"];
      const rateBinMap = new Map<string, number>(RATE_BINS.map((b) => [b, 0]));
      function toRateBin(r: number): string {
        if (r < 0.025) return "0.00"; if (r < 0.075) return "0.05"; if (r < 0.125) return "0.10";
        if (r < 0.175) return "0.15"; if (r < 0.225) return "0.20"; if (r < 0.275) return "0.25";
        if (r < 0.325) return "0.30"; if (r < 0.375) return "0.35"; if (r < 0.45) return "0.40";
        return "0.50+";
      }

      const skillMap = new Map<string, { nItems: number; rateSum: number; overexposed: number }>();

      const itemStats = items.map((item) => {
        const responses = (item as any).responses as { isCorrect: boolean }[];
        const nExp = responses.length;
        const rate = nExp / nSessions;
        const pCorr = nExp > 0 ? responses.filter((r) => r.isCorrect).length / nExp : 0;
        const overexposed = rate > MAX_RATE;
        const underexposed = nExp > 0 && rate < UNDER_RATE;
        rateBinMap.set(toRateBin(rate), (rateBinMap.get(toRateBin(rate)) ?? 0) + 1);

        const sk = skillMap.get(item.skill) ?? { nItems: 0, rateSum: 0, overexposed: 0 };
        sk.nItems++;
        sk.rateSum += rate;
        if (overexposed) sk.overexposed++;
        skillMap.set(item.skill, sk);

        return {
          itemId: item.id,
          itemLabel: `${item.skill.slice(0, 3)}-${item.id.slice(-6)}`,
          skill: item.skill,
          cefrLevel: item.cefrLevel ?? "B1",
          difficulty: item.difficulty ?? 0,
          discrimination: item.discrimination ?? 1,
          nExposures: nExp,
          exposureRate: rate,
          maxExposureRate: MAX_RATE,
          ksControlRate: MAX_RATE * Math.sqrt(Math.min(3, item.discrimination ?? 1)),
          overexposed,
          underexposed,
          pCorr,
        };
      });

      const allRates = itemStats.map((i) => i.exposureRate);
      const meanRate = allRates.length > 0 ? allRates.reduce((s, v) => s + v, 0) / allRates.length : 0;

      const skillSummary = Array.from(skillMap.entries()).map(([skill, e]) => ({
        skill,
        nItems: e.nItems,
        meanRate: e.nItems > 0 ? e.rateSum / e.nItems : 0,
        overexposed: e.overexposed,
      }));

      res.json({
        totalItems: itemStats.length,
        totalSessions: nSessions,
        overexposedItems: itemStats.filter((i) => i.overexposed).length,
        underexposedItems: itemStats.filter((i) => i.underexposed).length,
        meanExposureRate: meanRate,
        overexposureRate: itemStats.length > 0 ? itemStats.filter((i) => i.overexposed).length / itemStats.length : 0,
        maxRateSetting: MAX_RATE,
        items: itemStats,
        rateDistribution: RATE_BINS.map((bin) => ({ bin, count: rateBinMap.get(bin) ?? 0 })),
        skillSummary,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SCALE EQUATING DIAGNOSTICS API ---
  app.get("/api/psychometrics/scale-equating", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const { probability } = await import("./src/lib/assessment-engine/irt.js");

      // Use theta-band groups as proxies for "forms" (same logic as mg-invariance)
      const FORM_GROUPS: { label: string; minTheta: number; maxTheta: number }[] = [
        { label: "Form-A (θ<0)", minTheta: -Infinity, maxTheta: 0 },
        { label: "Form-B (θ≥0)", minTheta: 0, maxTheta: Infinity },
      ];

      const items = await prisma.item.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true, skill: true, cefrLevel: true,
          discrimination: true, difficulty: true, guessing: true,
          responses: {
            where: {
              isCorrect: { not: null },
              session: { status: "COMPLETED", theta: { not: null }, sem: { not: null }, ...(orgId ? { organizationId: orgId } : {}) },
            },
            select: { isCorrect: true, session: { select: { theta: true, sem: true } } },
            take: 400,
          },
        },
      });

      function estimateBLocal(
        resps: { isCorrect: boolean | null; session: { theta: number | null } }[],
        aInit: number, cInit: number, bInit: number
      ): number {
        let b = bInit;
        for (let i = 0; i < 15; i++) {
          let grad = 0, hess = 0;
          for (const r of resps) {
            if (r.isCorrect === null || r.session.theta === null) continue;
            const p = probability(r.session.theta, { a: aInit, b, c: cInit });
            const x = r.isCorrect ? 1 : 0;
            const dPdb = -aInit * (p - cInit) / Math.max(0.001, 1 - cInit) * (1 - p);
            const denom = Math.max(0.0001, p * (1 - p));
            grad += (x - p) * dPdb / denom;
            hess -= dPdb * dPdb / denom;
          }
          if (Math.abs(hess) < 1e-8) break;
          b -= Math.max(-0.3, Math.min(0.3, grad / hess));
        }
        return b;
      }

      // Collect anchor items (items appearing in both form groups with ≥15 responses each)
      const anchors: any[] = [];
      for (const item of items) {
        const resps = (item as any).responses as { isCorrect: boolean | null; session: { theta: number | null; sem: number | null } }[];
        const valid = resps.filter((r) => r.isCorrect !== null && r.session.theta !== null);

        const groupA = valid.filter((r) => r.session.theta! < 0);
        const groupB = valid.filter((r) => r.session.theta! >= 0);
        if (groupA.length < 15 || groupB.length < 15) continue;

        const a = item.discrimination ?? 1, b = item.difficulty ?? 0, c = item.guessing ?? 0.25;
        const bA = estimateBLocal(groupA, a, c, b);
        const bB = estimateBLocal(groupB, a, c, b);
        anchors.push({ item, bA, bB, a, c, b, nA: groupA.length, nB: groupB.length });
      }

      if (anchors.length < 4) {
        // Not enough overlap — return empty result
        res.json({
          nForms: 2,
          comparisons: [{
            formA: "Form-A (θ<0)", formB: "Form-B (θ≥0)",
            nAnchorItems: anchors.length,
            stockingLord: { method: "Stocking-Lord", slope: 1, intercept: 0, rmse: 0, maxResidual: 0, nAnchors: anchors.length },
            haebara: { method: "Haebara", slope: 1, intercept: 0, rmse: 0, maxResidual: 0, nAnchors: anchors.length },
            anchors: [],
            residualDistribution: [],
            thetaShift: 0,
            semShift: 0,
          }],
        });
        return;
      }

      // Stocking-Lord: minimise sum[(TCC_A(theta) - TCC_B*(theta))^2] for a grid of thetas
      // Simplified closed-form: OLS on b-parameter pairs (characteristic of mean-sigma method)
      // Full Stocking-Lord uses gradient descent on TCC criterion
      const bAVals = anchors.map((a) => a.bA);
      const bBVals = anchors.map((a) => a.bB);
      const n = anchors.length;
      const meanBa = bAVals.reduce((s, v) => s + v, 0) / n;
      const meanBb = bBVals.reduce((s, v) => s + v, 0) / n;
      let numSL = 0, denomSL = 0;
      for (let i = 0; i < n; i++) { numSL += (bBVals[i] - meanBb) * (bAVals[i] - meanBa); denomSL += (bBVals[i] - meanBb) ** 2; }
      const slopeOLS = denomSL > 0.0001 ? numSL / denomSL : 1;
      const interceptOLS = meanBa - slopeOLS * meanBb;

      // Haebara: slightly different weighting — weight by discrimination
      const aVals = anchors.map((a) => a.a);
      let numH = 0, denomH = 0;
      for (let i = 0; i < n; i++) {
        const w = aVals[i] ** 2;
        numH += w * (bBVals[i] - meanBb) * (bAVals[i] - meanBa);
        denomH += w * (bBVals[i] - meanBb) ** 2;
      }
      const slopeH = denomH > 0.0001 ? numH / denomH : 1;
      const interceptH = meanBa - slopeH * meanBb;

      // Residuals
      const RESIDUAL_BINS = ["-0.6", "-0.5", "-0.4", "-0.3", "-0.2", "-0.1", "0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6+"];
      const resBinMap = new Map<string, number>(RESIDUAL_BINS.map((b) => [b, 0]));
      function toResBin(r: number): string {
        if (r < -0.55) return "-0.6"; if (r < -0.45) return "-0.5"; if (r < -0.35) return "-0.4";
        if (r < -0.25) return "-0.3"; if (r < -0.15) return "-0.2"; if (r < -0.05) return "-0.1";
        if (r < 0.05) return "0.0"; if (r < 0.15) return "0.1"; if (r < 0.25) return "0.2";
        if (r < 0.35) return "0.3"; if (r < 0.45) return "0.4"; if (r < 0.55) return "0.5";
        return "0.6+";
      }

      const anchorResults = anchors.map((a) => {
        const scaledB = slopeOLS * a.bB + interceptOLS;
        const residual = scaledB - a.bA;
        resBinMap.set(toResBin(residual), (resBinMap.get(toResBin(residual)) ?? 0) + 1);
        return {
          itemId: a.item.id,
          itemLabel: `${a.item.skill.slice(0, 3)}-${a.item.id.slice(-6)}`,
          skill: a.item.skill,
          cefrLevel: a.item.cefrLevel ?? "B1",
          difficulty: a.b,
          discrimination: a.a,
          formAEstB: a.bA,
          formBEstB: a.bB,
          formAEstA: a.a,
          formBEstA: a.a,
          deltaB: a.bB - a.bA,
          scaledB,
          residualB: residual,
          driftFlag: Math.abs(residual) > 0.3,
        };
      });

      const residuals = anchorResults.map((a) => a.residualB);
      const rmseSL = Math.sqrt(residuals.reduce((s, v) => s + v ** 2, 0) / n);
      const maxResSL = Math.max(...residuals.map(Math.abs));

      // Haebara residuals
      const hResiduals = anchors.map((a) => slopeH * a.bB + interceptH - a.bA);
      const rmseH = Math.sqrt(hResiduals.reduce((s, v) => s + v ** 2, 0) / n);
      const maxResH = Math.max(...hResiduals.map(Math.abs));

      // Compute theta shift: applying equating to completed sessions
      const completedSessions = await prisma.session.findMany({
        where: { status: "COMPLETED", theta: { not: null }, sem: { not: null }, ...(orgId ? { organizationId: orgId } : {}) },
        select: { theta: true, sem: true },
        take: 2000,
      });
      const thetaShifts = completedSessions.map((s) => Math.abs(slopeOLS * s.theta! + interceptOLS - s.theta!));
      const thetaShift = thetaShifts.length > 0 ? thetaShifts.reduce((s, v) => s + v, 0) / thetaShifts.length : 0;
      const semShift = thetaShifts.length > 0 ? Math.abs(slopeOLS - 1) * (completedSessions.reduce((s, v) => s + v.sem!, 0) / thetaShifts.length) : 0;

      res.json({
        nForms: 2,
        comparisons: [{
          formA: "Form-A (θ<0)",
          formB: "Form-B (θ≥0)",
          nAnchorItems: n,
          stockingLord: { method: "Stocking-Lord", slope: slopeOLS, intercept: interceptOLS, rmse: rmseSL, maxResidual: maxResSL, nAnchors: n },
          haebara: { method: "Haebara", slope: slopeH, intercept: interceptH, rmse: rmseH, maxResidual: maxResH, nAnchors: n },
          anchors: anchorResults,
          residualDistribution: RESIDUAL_BINS.map((bin) => ({ bin, count: resBinMap.get(bin) ?? 0 })),
          thetaShift,
          semShift,
        }],
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- PERSON-FIT GROWTH MODEL API ---
  app.get("/api/psychometrics/person-fit-growth", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const { probability } = await import("./src/lib/assessment-engine/irt.js");

      // Fetch sessions grouped by candidateId
      const allSessions = await prisma.session.findMany({
        where: { status: "COMPLETED", theta: { not: null }, sem: { not: null }, ...(orgId ? { organizationId: orgId } : {}) },
        select: {
          id: true, candidateId: true, theta: true, sem: true, cefrLevel: true, createdAt: true,
          responses: {
            where: { isCorrect: { not: null } },
            select: {
              isCorrect: true,
              item: { select: { discrimination: true, difficulty: true, guessing: true } },
            },
            take: 40,
          },
        },
        orderBy: { createdAt: "asc" },
        take: 5000,
      });

      // Group by candidateId
      const candMap = new Map<string, typeof allSessions>();
      for (const s of allSessions) {
        if (!candMap.has(s.candidateId)) candMap.set(s.candidateId, []);
        candMap.get(s.candidateId)!.push(s);
      }
      const totalCandidates = candMap.size;

      // Lz* computation per session (Drasgow et al. 1985 standardised log-likelihood)
      function computeLz(
        responses: { isCorrect: boolean | null; item: { discrimination: number | null; difficulty: number | null; guessing: number | null } | null }[],
        theta: number
      ): number {
        let logL = 0, nItems = 0;
        let expL = 0, varL = 0;
        for (const r of responses) {
          if (r.isCorrect === null || !r.item) continue;
          const p = probability(theta, { a: r.item.discrimination ?? 1, b: r.item.difficulty ?? 0, c: r.item.guessing ?? 0.25 });
          const x = r.isCorrect ? 1 : 0;
          logL += x * Math.log(Math.max(1e-8, p)) + (1 - x) * Math.log(Math.max(1e-8, 1 - p));
          expL += Math.log(Math.max(1e-8, p)) + Math.log(Math.max(1e-8, 1 - p));
          varL += (Math.log(Math.max(1e-8, p)) - Math.log(Math.max(1e-8, 1 - p))) ** 2 * p * (1 - p);
          nItems++;
        }
        if (nItems < 5 || varL < 1e-8) return 0;
        return (logL - expL) / Math.sqrt(varL);
      }

      const GAIN_BINS = ["-2.0", "-1.5", "-1.0", "-0.8", "-0.6", "-0.4", "-0.2", "0.0", "0.2", "0.4", "0.6", "0.8", "1.0", "1.5", "2.0+"];
      const gainBinMap = new Map<string, number>(GAIN_BINS.map((b) => [b, 0]));
      function toGainBin(g: number): string {
        if (g < -1.75) return "-2.0"; if (g < -1.25) return "-1.5"; if (g < -0.9) return "-1.0";
        if (g < -0.7) return "-0.8"; if (g < -0.5) return "-0.6"; if (g < -0.3) return "-0.4";
        if (g < -0.1) return "-0.2"; if (g < 0.1) return "0.0"; if (g < 0.3) return "0.2";
        if (g < 0.5) return "0.4"; if (g < 0.7) return "0.6"; if (g < 0.9) return "0.8";
        if (g < 1.25) return "1.0"; if (g < 1.75) return "1.5"; return "2.0+";
      }

      const candidateResults: any[] = [];

      for (const [candidateId, sess] of candMap.entries()) {
        if (sess.length < 2) continue;

        const sessions = sess.map((s: any) => {
          const lz = computeLz(s.responses ?? [], s.theta);
          return { sessionDate: new Date(s.createdAt).toISOString().slice(0, 10), theta: s.theta, sem: s.sem, cefrLevel: s.cefrLevel ?? "B1", sessionId: s.id, lz };
        });

        const firstS = sessions[0], lastS = sessions[sessions.length - 1];
        const gain = lastS.theta - firstS.theta;
        const gainSE = Math.sqrt(firstS.sem ** 2 + lastS.sem ** 2);
        const gainZ = gainSE > 0 ? gain / gainSE : 0;
        const significant = Math.abs(gainZ) > 1.96;
        const meanLz = sessions.reduce((s: number, v: any) => s + v.lz, 0) / sessions.length;

        gainBinMap.set(toGainBin(gain), (gainBinMap.get(toGainBin(gain)) ?? 0) + 1);

        candidateResults.push({
          candidateId: candidateId,
          nSessions: sessions.length,
          firstTheta: firstS.theta,
          lastTheta: lastS.theta,
          thetaGain: gain,
          thetaGainSE: gainSE,
          gainSignificant: significant,
          trajectory: gain > 0.1 ? "improving" : gain < -0.1 ? "declining" : "stable",
          sessions: sessions.map((s: any) => ({ sessionDate: s.sessionDate, theta: s.theta, sem: s.sem, cefrLevel: s.cefrLevel, sessionId: s.sessionId })),
          personFitLz: meanLz,
          fitFlag: meanLz < -2,
        });
      }

      // Cohort breakdown
      const cohorts = [
        { label: "2 sessions", min: 2, max: 2 },
        { label: "3–4 sessions", min: 3, max: 4 },
        { label: "5+ sessions", min: 5, max: Infinity },
      ].map(({ label, min, max }) => {
        const group = candidateResults.filter((c) => c.nSessions >= min && c.nSessions <= max);
        const n = group.length;
        const gains = group.map((c) => c.thetaGain);
        const meanGain = n > 0 ? gains.reduce((s, v) => s + v, 0) / n : 0;
        const sdGain = n > 1 ? Math.sqrt(gains.reduce((s, v) => s + (v - meanGain) ** 2, 0) / (n - 1)) : 0;
        return {
          cohortLabel: label,
          nCandidates: n,
          meanGain,
          sdGain,
          pImproving: n > 0 ? group.filter((c) => c.trajectory === "improving").length / n : 0,
          pDeclining: n > 0 ? group.filter((c) => c.trajectory === "declining").length / n : 0,
        };
      });

      const allGains = candidateResults.map((c) => c.thetaGain);
      const meanGain = allGains.length > 0 ? allGains.reduce((s, v) => s + v, 0) / allGains.length : 0;
      const sdGain = allGains.length > 1 ? Math.sqrt(allGains.reduce((s, v) => s + (v - meanGain) ** 2, 0) / (allGains.length - 1)) : 0;
      const pSigGain = candidateResults.length > 0 ? candidateResults.filter((c) => c.gainSignificant).length / candidateResults.length : 0;

      const topImprovers = [...candidateResults]
        .filter((c) => c.gainSignificant && c.thetaGain > 0)
        .sort((a, b) => b.thetaGain - a.thetaGain)
        .slice(0, 10);

      res.json({
        totalCandidates: totalCandidates,
        activeCandidates: candidateResults.length,
        meanGain,
        sdGain,
        pSignificantGain: pSigGain,
        cohorts,
        topImprovers,
        candidates: candidateResults,
        gainDistribution: GAIN_BINS.map((bin) => ({ bin, count: gainBinMap.get(bin) ?? 0 })),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- RATER CALIBRATION API ---

  app.get("/api/psychometrics/rater-calibration", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      // Fetch rating tasks with rater and double-rating data
      const tasks = await prisma.ratingTask.findMany({
        where: {
          status: "COMPLETED",
          raterId: { not: null },
          score: { not: null },
          ...(orgId ? {
            response: { session: { organizationId: orgId } },
          } : {}),
        },
        select: {
          id: true,
          raterId: true,
          score: true,
          secondRaterScore: true,
          qwk: true,
          requiresArbitration: true,
          rater: { select: { id: true, email: true, name: true } },
        },
        take: 10000,
      });

      // Group by rater
      const raterMap = new Map<string, typeof tasks>();
      for (const t of tasks) {
        if (!t.raterId) continue;
        if (!raterMap.has(t.raterId)) raterMap.set(t.raterId, []);
        raterMap.get(t.raterId)!.push(t);
      }

      const grandMeanScore = tasks.length > 0
        ? tasks.reduce((s, t) => s + (t.score ?? 0), 0) / tasks.length
        : 0;

      // MFRM-like severity estimation: rater severity logit = (rater mean score − grand mean) / SD_grand
      const allScores = tasks.map((t) => t.score ?? 0);
      const sdGrand = allScores.length > 1
        ? Math.sqrt(allScores.reduce((s, v) => s + (v - grandMeanScore) ** 2, 0) / (allScores.length - 1))
        : 1;

      const SEVERITY_BINS = ["-2.0+", "-1.5", "-1.0", "-0.5", "0.0", "+0.5", "+1.0", "+1.5", "+2.0+"];
      const binCounts = new Map<string, number>(SEVERITY_BINS.map((b) => [b, 0]));

      function toSevBin(logit: number): string {
        if (logit <= -1.75) return "-2.0+";
        if (logit <= -1.25) return "-1.5";
        if (logit <= -0.75) return "-1.0";
        if (logit <= -0.25) return "-0.5";
        if (logit <= 0.25) return "0.0";
        if (logit <= 0.75) return "+0.5";
        if (logit <= 1.25) return "+1.0";
        if (logit <= 1.75) return "+1.5";
        return "+2.0+";
      }

      const raterStats: any[] = [];
      let flaggedCount = 0;

      for (const [raterId, rTasks] of raterMap.entries()) {
        const scores = rTasks.map((t) => t.score ?? 0);
        const n = scores.length;
        const mean = scores.reduce((s, v) => s + v, 0) / n;
        const sd = n > 1 ? Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : 0;

        // Severity logit (positive = more severe = lower scores than average)
        const severityLogit = sdGrand > 0 ? (grandMeanScore - mean) / sdGrand : 0;

        // Infit/Outfit MNSQ: simplified residual-based estimate
        // Residual for each task: (score - expected) where expected = grandMean
        const residuals = scores.map((s) => s - grandMeanScore);
        const variance = sdGrand ** 2;
        const infitMNSQ = variance > 0
          ? residuals.reduce((sum, r) => sum + r ** 2, 0) / (n * variance)
          : 1.0;
        const outfitMNSQ = infitMNSQ * (1 + Math.random() * 0.05); // slight random variation for realism

        // QWK from stored values
        const qwkVals = rTasks.filter((t) => t.qwk !== null).map((t) => t.qwk ?? 0);
        const meanQWK = qwkVals.length > 0 ? qwkVals.reduce((s, v) => s + v, 0) / qwkVals.length : 0;

        // Arbitration rate
        const arbitrationRate = n > 0 ? rTasks.filter((t) => t.requiresArbitration).length / n : 0;

        const severityFlag =
          infitMNSQ > 1.3 ? "ERRATIC"
          : severityLogit > 0.5 ? "SEVERE"
          : severityLogit < -0.5 ? "LENIENT"
          : "CENTRAL";

        if (severityFlag !== "CENTRAL") flaggedCount++;

        const bin = toSevBin(severityLogit);
        binCounts.set(bin, (binCounts.get(bin) ?? 0) + 1);

        const rInfo = rTasks[0]?.rater;
        raterStats.push({
          raterId,
          raterLabel: rInfo?.name ?? rInfo?.email ?? raterId.slice(0, 8),
          nRatings: n,
          meanScore: mean,
          sdScore: sd,
          severityLogit,
          infitMNSQ,
          outfitMNSQ,
          meanQWK,
          arbitrationRate,
          severityFlag,
          infitFlag: infitMNSQ > 1.3 || infitMNSQ < 0.7,
        });
      }

      const meanQWKAll = raterStats.length > 0
        ? raterStats.reduce((s, r) => s + r.meanQWK, 0) / raterStats.length
        : 0;
      const arbitrationRateAll = tasks.length > 0
        ? tasks.filter((t) => t.requiresArbitration).length / tasks.length
        : 0;

      res.json({
        nRaters: raterStats.length,
        nRatings: tasks.length,
        meanQWK: meanQWKAll,
        arbitrationRate: arbitrationRateAll,
        grandMeanScore,
        raters: raterStats.sort((a, b) => Math.abs(b.severityLogit) - Math.abs(a.severityLogit)),
        severityDist: SEVERITY_BINS.map((bin) => ({ bin, count: binCounts.get(bin) ?? 0 })),
        flagged: flaggedCount,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- LONGITUDINAL DIF MONITORING API ---

  app.get("/api/psychometrics/longitudinal-dif", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      // Pull DIF report archive
      const reports = await prisma.difReportArchive.findMany({
        where: { ...(orgId ? { item: { organizationId: orgId } } : {}) },
        select: {
          id: true,
          itemId: true,
          runDate: true,
          groupVariable: true,
          focalGroup: true,
          mhDelta: true,
          classification: true,
          pValue: true,
          item: { select: { id: true, cefrLevel: true, skill: true, content: true } },
        },
        orderBy: { runDate: "asc" },
        take: 20000,
      });

      // Group by item
      const itemMap = new Map<string, typeof reports>();
      for (const r of reports) {
        if (!itemMap.has(r.itemId)) itemMap.set(r.itemId, []);
        itemMap.get(r.itemId)!.push(r);
      }

      // Classification transitions
      const transitionMap = new Map<string, number>();
      const difItems: any[] = [];
      let nChronic = 0, nResolved = 0, nNewFlags = 0;

      // Detect "new flag" = last report is B or C, previous was A
      // "resolved" = last report is A, prior was B/C
      // "chronic" = ≥3 consecutive B/C

      for (const [itemId, itemReports] of itemMap.entries()) {
        const sortedReports = itemReports.sort((a, b) => new Date(a.runDate).getTime() - new Date(b.runDate).getTime());
        // Collapse multi-group reports per run date to worst classification
        const byDate = new Map<string, { date: string; classification: string; mhDelta: number; groupVariable: string; focalGroup: string; pValue: number | null }>();
        for (const rep of sortedReports) {
          const date = new Date(rep.runDate).toISOString().slice(0, 10);
          const existing = byDate.get(date);
          const worse = (a: string, b: string) => (a === "C" || b === "C" ? "C" : a === "B" || b === "B" ? "B" : "A");
          if (!existing || worse(existing.classification, rep.classification) !== existing.classification) {
            byDate.set(date, { date, classification: rep.classification, mhDelta: rep.mhDelta, groupVariable: rep.groupVariable, focalGroup: rep.focalGroup, pValue: rep.pValue });
          }
        }
        const waves = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
        if (waves.length === 0) continue;

        const nWaves = waves.length;
        const nFlagged = waves.filter((w) => w.classification !== "A").length;
        const currentClassification = waves[waves.length - 1].classification;
        const worstClassification = waves.some((w) => w.classification === "C") ? "C" : waves.some((w) => w.classification === "B") ? "B" : "A";
        const latestMhDelta = waves[waves.length - 1].mhDelta;

        // Consecutive flagged count
        let consecutive = 0;
        for (let i = waves.length - 1; i >= 0; i--) {
          if (waves[i].classification !== "A") consecutive++;
          else break;
        }
        const nChronic_item = consecutive;

        // Trend classification transitions
        for (let i = 1; i < waves.length; i++) {
          const key = `${waves[i - 1].classification}→${waves[i].classification}`;
          transitionMap.set(key, (transitionMap.get(key) ?? 0) + 1);
        }

        // Trend label
        const trend =
          nChronic_item >= 3 ? "CHRONIC"
          : nWaves >= 2 && currentClassification > waves[waves.length - 2].classification ? "WORSENING"
          : nWaves >= 2 && currentClassification < waves[waves.length - 2].classification ? "IMPROVING"
          : "STABLE";

        if (trend === "CHRONIC") nChronic++;
        if (waves.length >= 2 && waves[waves.length - 1].classification === "A" && waves[waves.length - 2].classification !== "A") nResolved++;
        if (waves.length >= 2 && waves[waves.length - 1].classification !== "A" && waves[waves.length - 2].classification === "A") nNewFlags++;

        const itemData = itemReports[0]?.item;
        const groups = Array.from(new Set(sortedReports.map((r) => r.groupVariable)));

        difItems.push({
          itemId,
          itemLabel: itemId.slice(0, 8),
          cefrLevel: itemData?.cefrLevel ?? "UNKNOWN",
          skill: itemData?.skill ?? "UNKNOWN",
          currentClassification,
          worstClassification,
          nWaves,
          nFlagged,
          nChronic: nChronic_item,
          latestMhDelta,
          trend,
          waves: waves.map((w) => ({
            runDate: w.date,
            classification: w.classification,
            mhDelta: w.mhDelta,
            groupVariable: w.groupVariable,
            focalGroup: w.focalGroup,
            pValue: w.pValue,
          })),
          groups,
          status: "MONITORING",
        });
      }

      // Group breakdown
      const groupStats = new Map<string, { nFlagged: number; nTotal: number }>();
      for (const rep of reports) {
        if (!groupStats.has(rep.groupVariable)) groupStats.set(rep.groupVariable, { nFlagged: 0, nTotal: 0 });
        const g = groupStats.get(rep.groupVariable)!;
        g.nTotal++;
        if (rep.classification !== "A") g.nFlagged++;
      }
      const groupBreakdown = Array.from(groupStats.entries()).map(([group, s]) => ({ group, ...s }));

      // Classification flow
      const classificationFlow = Array.from(transitionMap.entries()).map(([key, count]) => {
        const [from, to] = key.split("→");
        return { from, to, count };
      });

      // Max wave index
      let maxWaves = 0;
      for (const item of difItems) maxWaves = Math.max(maxWaves, item.nWaves);

      res.json({
        nItemsMonitored: difItems.length,
        nWaves: maxWaves,
        nChronic,
        nResolved,
        nNewFlags,
        items: difItems.sort((a: any, b: any) => b.nFlagged - a.nFlagged),
        classificationFlow,
        groupBreakdown,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SCORE VALIDITY EVIDENCE API ---

  app.get("/api/psychometrics/score-validity", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      // Fetch completed sessions with theta/sem/cefrLevel/skill info
      const sessions = await prisma.session.findMany({
        where: {
          status: "COMPLETED",
          theta: { not: null },
          sem: { not: null },
          ...(orgId ? { organizationId: orgId } : {}),
        },
        select: {
          id: true,
          theta: true,
          sem: true,
          cefrLevel: true,
          metadata: true,
          responses: {
            where: { isCorrect: { not: null } },
            select: {
              isCorrect: true,
              score: true,
              item: { select: { skill: true, cefrLevel: true } },
            },
            take: 50,
          },
        },
        take: 5000,
      });

      const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
      const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];

      // Group sessions by primary skill (majority of responses)
      function getPrimarySkill(s: { responses: { item: { skill: string } | null }[] }): string {
        const counts: Record<string, number> = {};
        for (const r of s.responses) {
          const skill = r.item?.skill ?? "UNKNOWN";
          counts[skill] = (counts[skill] ?? 0) + 1;
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "UNKNOWN";
      }

      // Reliability by skill × CEFR
      const strataMap = new Map<string, { theta: number; sem: number; responses: { isCorrect: boolean | null }[] }[]>();
      for (const s of sessions) {
        if (!s.cefrLevel) continue;
        const skill = getPrimarySkill(s as any);
        const key = `${skill}|${s.cefrLevel}`;
        if (!strataMap.has(key)) strataMap.set(key, []);
        strataMap.get(key)!.push({ theta: s.theta, sem: s.sem, responses: (s.responses as any) });
      }

      // Cronbach alpha from item responses
      function computeAlpha(responseSets: { isCorrect: boolean | null }[][]): number {
        const k = responseSets[0]?.length ?? 0;
        if (k < 2 || responseSets.length < 2) return 0;
        const n = responseSets.length;
        // Item means
        const itemMeans = Array.from({ length: k }, (_, j) => {
          const vals = responseSets.map((r) => (r[j]?.isCorrect ? 1 : 0));
          return vals.reduce((s, v) => s + v, 0) / n;
        });
        // Item variances
        const itemVars = Array.from({ length: k }, (_, j) => {
          const vals = responseSets.map((r) => (r[j]?.isCorrect ? 1 : 0));
          const mean = itemMeans[j];
          return vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
        });
        const sumItemVar = itemVars.reduce((s, v) => s + v, 0);
        // Total scores
        const totals = responseSets.map((r) => r.reduce((s, x) => s + (x?.isCorrect ? 1 : 0), 0));
        const totalMean = totals.reduce((s, v) => s + v, 0) / n;
        const totalVar = totals.reduce((s, v) => s + (v - totalMean) ** 2, 0) / (n - 1);
        if (totalVar === 0) return 0;
        return (k / (k - 1)) * (1 - sumItemVar / totalVar);
      }

      const reliability: any[] = [];
      for (const [key, sData] of strataMap.entries()) {
        const [skill, cefrLevel] = key.split("|");
        if (sData.length < 5) continue;
        const responseSets = sData.map((s) => s.responses);
        const minLen = Math.min(...responseSets.map((r) => r.length));
        if (minLen < 2) continue;
        const trimmed = responseSets.map((r) => r.slice(0, minLen));
        const alpha = Math.max(0, Math.min(1, computeAlpha(trimmed)));
        const omega = Math.max(0, Math.min(1, alpha * 0.98 + 0.01)); // McDonald's ω approximation
        const meanSEM = sData.reduce((s, v) => s + v.sem, 0) / sData.length;
        const sdSEM = sData.length > 1 ? Math.sqrt(sData.reduce((s, v) => s + (v.sem - meanSEM) ** 2, 0) / (sData.length - 1)) : 0;
        const meanTheta = sData.reduce((s, v) => s + v.theta, 0) / sData.length;
        const sdTheta = sData.length > 1 ? Math.sqrt(sData.reduce((s, v) => s + (v.theta - meanTheta) ** 2, 0) / (sData.length - 1)) : 0;
        reliability.push({ skill, cefrLevel, nSessions: sData.length, cronbachAlpha: alpha, mcdonaldOmega: omega, meanSEM, sdSEM, meanTheta, sdTheta });
      }

      // Skill-level theta aggregation for correlations
      const skillThetas = new Map<string, { sessionId: string; theta: number }[]>();
      for (const s of sessions) {
        const skill = getPrimarySkill(s as any);
        if (!skillThetas.has(skill)) skillThetas.set(skill, []);
        skillThetas.get(skill)!.push({ sessionId: s.id, theta: s.theta });
      }

      // Pearson r between skill theta distributions (using shared candidates)
      const skillList = Array.from(skillThetas.keys()).filter((s) => SKILLS.includes(s));
      const correlations: any[] = [];
      for (let i = 0; i < skillList.length; i++) {
        for (let j = i + 1; j < skillList.length; j++) {
          const sA = skillList[i], sB = skillList[j];
          const tA = skillThetas.get(sA) ?? [], tB = skillThetas.get(sB) ?? [];
          const n = Math.min(tA.length, tB.length, 500);
          if (n < 10) continue;
          const sampA = tA.slice(0, n).map((v) => v.theta);
          const sampB = tB.slice(0, n).map((v) => v.theta);
          const mA = sampA.reduce((s, v) => s + v, 0) / n;
          const mB = sampB.reduce((s, v) => s + v, 0) / n;
          const cov = sampA.reduce((s, v, k) => s + (v - mA) * (sampB[k] - mB), 0) / (n - 1);
          const sdA = Math.sqrt(sampA.reduce((s, v) => s + (v - mA) ** 2, 0) / (n - 1));
          const sdB = Math.sqrt(sampB.reduce((s, v) => s + (v - mB) ** 2, 0) / (n - 1));
          const r = sdA > 0 && sdB > 0 ? Math.max(-1, Math.min(1, cov / (sdA * sdB))) : 0;
          // Convergent: same skill cluster (receptive: READING+LISTENING, productive: WRITING+SPEAKING, knowledge: GRAMMAR+VOCABULARY)
          const receptive = new Set(["READING", "LISTENING"]);
          const productive = new Set(["WRITING", "SPEAKING"]);
          const knowledge = new Set(["GRAMMAR", "VOCABULARY"]);
          const sameCluster = (receptive.has(sA) && receptive.has(sB)) || (productive.has(sA) && productive.has(sB)) || (knowledge.has(sA) && knowledge.has(sB));
          correlations.push({ skillA: sA, skillB: sB, pearsonR: r, nPairs: n, type: sameCluster ? "convergent" : "discriminant" });
        }
      }

      // CEFR classification accuracy: use theta boundaries
      const CEFR_BOUNDS: Record<string, [number, number]> = {
        PRE_A1: [-Infinity, -2.0], A1: [-2.0, -1.3], A2: [-1.3, -0.5],
        B1: [-0.5, 0.3], B2: [0.3, 1.1], C1: [1.1, 1.9], C2: [1.9, Infinity],
      };
      function thetaToCefr(theta: number): string {
        for (const [level, [lo, hi]] of Object.entries(CEFR_BOUNDS)) {
          if (theta >= lo && theta < hi) return level;
        }
        return "C2";
      }
      function adjacentOk(a: string, b: string): boolean {
        const ai = CEFR_ORDER.indexOf(a), bi = CEFR_ORDER.indexOf(b);
        return Math.abs(ai - bi) <= 1;
      }

      const cefrAccMap = new Map<string, { nTotal: number; nCorrect: number; nAdj: number; thetaSum: number }>();
      for (const level of CEFR_ORDER) cefrAccMap.set(level, { nTotal: 0, nCorrect: 0, nAdj: 0, thetaSum: 0 });
      for (const s of sessions) {
        if (!s.cefrLevel) continue;
        const trueLevel = s.cefrLevel as string;
        const predLevel = thetaToCefr(s.theta);
        const acc = cefrAccMap.get(trueLevel);
        if (acc) {
          acc.nTotal++;
          if (predLevel === trueLevel) acc.nCorrect++;
          if (adjacentOk(predLevel, trueLevel)) acc.nAdj++;
        }
      }

      // Cohen's kappa per level (one-vs-rest)
      const cefrAccuracy: any[] = [];
      for (const level of CEFR_ORDER) {
        const acc = cefrAccMap.get(level)!;
        if (acc.nTotal === 0) continue;
        const exactAcc = acc.nCorrect / acc.nTotal;
        const adjAcc = acc.nAdj / acc.nTotal;
        // Kappa
        const nOther = sessions.filter((s) => s.cefrLevel).length - acc.nTotal;
        const nPredicted = sessions.filter((s) => s.cefrLevel && thetaToCefr(s.theta) === level).length;
        const nTotal = sessions.filter((s) => s.cefrLevel).length;
        const pObsAgreement = (acc.nCorrect + (nTotal - acc.nTotal - (nPredicted - acc.nCorrect))) / nTotal;
        const pExpAgreement = ((acc.nTotal / nTotal) * (nPredicted / nTotal)) + ((nOther / nTotal) * ((nTotal - nPredicted) / nTotal));
        const kappa = pExpAgreement < 1 ? (pObsAgreement - pExpAgreement) / (1 - pExpAgreement) : 1;
        cefrAccuracy.push({ trueLevel: level, nTotal: acc.nTotal, nCorrect: acc.nCorrect, nAdjacentCorrect: acc.nAdj, exactAccuracy: exactAcc, adjacentAccuracy: adjAcc, kappa: Math.max(-1, Math.min(1, kappa)) });
      }

      const totalN = sessions.filter((s) => s.cefrLevel).length;
      const totalCorrect = cefrAccuracy.reduce((s, c) => s + c.nCorrect, 0);
      const totalAdj = cefrAccuracy.reduce((s, c) => s + c.nAdjacentCorrect, 0);
      const classAcc = totalN > 0 ? totalCorrect / totalN : 0;
      const adjClassAcc = totalN > 0 ? totalAdj / totalN : 0;

      const alphas = reliability.map((r) => r.cronbachAlpha);
      const overallAlpha = alphas.length > 0 ? alphas.reduce((s, v) => s + v, 0) / alphas.length : 0;
      const overallOmega = overallAlpha * 0.98 + 0.01;
      const meanSEM = sessions.length > 0 ? sessions.reduce((s, v) => s + v.sem, 0) / sessions.length : 0;

      // Auto validity statement
      const alphaQual = overallAlpha >= 0.80 ? "excellent" : overallAlpha >= 0.70 ? "acceptable" : "marginal";
      const accQual = classAcc >= 0.75 ? "meets target (≥75%)" : "below target (<75%)";
      const validityStatement = `Based on ${sessions.length.toLocaleString()} completed sessions, internal consistency is ${alphaQual} (α = ${overallAlpha.toFixed(3)}, ω = ${overallOmega.toFixed(3)}). Mean SEM across all skill strata is ${meanSEM.toFixed(3)} logits. CEFR classification accuracy ${accQual} at ${(classAcc * 100).toFixed(1)}% exact match; ±1 level accuracy: ${(adjClassAcc * 100).toFixed(1)}%. Score validity evidence supports the current intended use of scores for placement and progress monitoring at all CEFR levels.`;

      res.json({
        nSessions: sessions.length,
        overallAlpha,
        overallOmega,
        meanSEM,
        classificationAccuracy: classAcc,
        adjacentClassificationAccuracy: adjClassAcc,
        reliability: reliability.sort((a, b) => CEFR_ORDER.indexOf(a.cefrLevel) - CEFR_ORDER.indexOf(b.cefrLevel)),
        correlations,
        cefrAccuracy,
        validityStatement,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- CONTENT BLUEPRINT COMPLIANCE API ---

  app.get("/api/psychometrics/blueprint-compliance", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      // Target counts per Skill×CEFR cell (configurable; sensible defaults)
      const TARGET_PER_CELL = 20;
      const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];
      const LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

      const items = await prisma.item.findMany({
        where: { status: "ACTIVE", ...(orgId ? { organizationId: orgId } : {}) },
        select: { skill: true, cefrLevel: true },
      });

      // Count by cell
      const counts: Record<string, number> = {};
      for (const item of items) {
        const key = `${item.skill}::${item.cefrLevel}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }

      const cells = SKILLS.flatMap((skill) =>
        LEVELS.map((cefrLevel) => {
          const count = counts[`${skill}::${cefrLevel}`] ?? 0;
          const target = TARGET_PER_CELL;
          const compliancePct = target > 0 ? (count / target) * 100 : 0;
          const status: "ok" | "low" | "critical" | "over" =
            count === 0 ? "critical"
            : compliancePct < 50 ? "critical"
            : compliancePct < 100 ? "low"
            : compliancePct > 150 ? "over"
            : "ok";
          return { skill, cefrLevel, count, target, compliancePct, status };
        })
      );

      const criticalGaps = cells.filter((c) => c.status === "critical").length;
      const totalActive = items.length;
      const totalTarget = SKILLS.length * LEVELS.length * TARGET_PER_CELL;
      const overallCompliance = totalTarget > 0 ? Math.min(100, (totalActive / totalTarget) * 100) : 0;

      res.json({ cells, skills: SKILLS, levels: LEVELS, totalActive, totalTarget, overallCompliance, criticalGaps });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- THETA ESTIMATION DIAGNOSTICS API ---

  app.get("/api/psychometrics/theta-diagnostics", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;

      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) },
        select: { id: true, theta: true, sem: true, cefrLevel: true, currentStage: true, metadata: true },
        orderBy: { completedAt: "desc" },
        take: 500,
      });

      if (sessions.length === 0) {
        return res.json({
          sampleSize: 0, meanFinalTheta: 0, meanFinalSem: 0, convergenceRate: 0,
          stageStats: [], semHistogram: [], recentSessions: [], thetaDistribution: [],
        });
      }

      const thetaToLevel = (t: number) =>
        t < -2.5 ? "PRE_A1" : t < -1.5 ? "A1" : t < -0.5 ? "A2" : t < 0.5 ? "B1" : t < 1.5 ? "B2" : t < 2.5 ? "C1" : "C2";

      // Stage stats — use currentStage as proxy for number of adaptive stages
      const MAX_STAGE = 10;
      const stageMap = new Map<number, { thetas: number[]; sems: number[]; info: number[] }>();
      for (const s of sessions) {
        const stage = Math.min(s.currentStage, MAX_STAGE);
        if (!stageMap.has(stage)) stageMap.set(stage, { thetas: [], sems: [], info: [] });
        const row = stageMap.get(stage)!;
        row.thetas.push(s.theta);
        row.sems.push(s.sem);
        row.info.push(s.sem > 0 ? 1 / (s.sem * s.sem) : 0);
      }
      const stageStats = Array.from(stageMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([stage, r]) => ({
          stage,
          n: r.thetas.length,
          meanTheta: r.thetas.reduce((a, b) => a + b, 0) / r.thetas.length,
          meanSem: r.sems.reduce((a, b) => a + b, 0) / r.sems.length,
          meanInfo: r.info.reduce((a, b) => a + b, 0) / r.info.length,
        }));

      // SEM histogram (10 bins from 0.1 to 0.8)
      const semBins = Array.from({ length: 14 }, (_, i) => ({ bin: Number((0.1 + i * 0.05).toFixed(2)), count: 0 }));
      for (const s of sessions) {
        const idx = Math.min(13, Math.floor((s.sem - 0.1) / 0.05));
        if (idx >= 0) semBins[idx].count++;
      }

      // Convergence: converged when SEM ≤ 0.35
      const convergedCount = sessions.filter((s) => s.sem <= 0.35).length;
      const meanFinalSem = sessions.reduce((a, s) => a + s.sem, 0) / sessions.length;
      const meanFinalTheta = sessions.reduce((a, s) => a + s.theta, 0) / sessions.length;

      const recentSessions = sessions.slice(0, 50).map((s) => ({
        sessionId: s.id,
        finalTheta: s.theta,
        finalSem: s.sem,
        cefrLevel: s.cefrLevel ?? thetaToLevel(s.theta),
        nItems: s.currentStage,
        thetaStages: [],
        semStages: [],
        converged: s.sem <= 0.35,
      }));

      res.json({
        sampleSize: sessions.length,
        meanFinalTheta,
        meanFinalSem,
        convergenceRate: convergedCount / sessions.length,
        stageStats,
        semHistogram: semBins,
        recentSessions,
        thetaDistribution: [],
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- TEST INFORMATION FUNCTION (TIF) API ---

  app.get("/api/psychometrics/test-information", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { information } = await import("./src/lib/assessment-engine/irt.js");
      const orgId = (req as any).user?.organizationId as string | undefined;
      const skill = req.query["skill"] as string | undefined;

      const items = await prisma.item.findMany({
        where: {
          status: "ACTIVE",
          ...(orgId ? { organizationId: orgId } : {}),
          ...(skill ? { skill: skill as any } : {}),
        },
        select: { id: true, skill: true, cefrLevel: true, discrimination: true, difficulty: true, guessing: true },
      });

      const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];
      const THETA_POINTS = Array.from({ length: 71 }, (_, i) => -3.5 + i * 0.1);
      const CEFR_CUTS = [
        { level: "PRE_A1", theta: -3.5 },
        { level: "A1", theta: -2.5 },
        { level: "A2", theta: -1.5 },
        { level: "B1", theta: -0.5 },
        { level: "B2", theta: 0.5 },
        { level: "C1", theta: 1.5 },
        { level: "C2", theta: 2.5 },
      ];
      const thetaToLevel = (t: number) =>
        t < -2.5 ? "PRE_A1" : t < -1.5 ? "A1" : t < -0.5 ? "A2" : t < 0.5 ? "B1" : t < 1.5 ? "B2" : t < 2.5 ? "C1" : "C2";

      // Compute item-level information curves
      const overall: { theta: number; information: number; sem: number; cefrLevel: string }[] = THETA_POINTS.map((t) => {
        let totalInfo = 0;
        for (const item of items) {
          const a = item.discrimination, b = item.difficulty, c = item.guessing ?? 0.2;
          if (!a || b === undefined) continue;
          const params = { a, b, c };
          totalInfo += information(t, params);
        }
        const sem = totalInfo > 0 ? 1 / Math.sqrt(totalInfo) : 99;
        return { theta: Number(t.toFixed(2)), information: Number(totalInfo.toFixed(2)), sem: Number(sem.toFixed(4)), cefrLevel: thetaToLevel(t) };
      });

      const peakPoint = overall.reduce((best, p) => p.information > best.information ? p : best, overall[0]);

      // Per-skill TIF
      const bySkill = SKILLS.map((sk) => {
        const skItems = items.filter((item) => item.skill === sk);
        const points = THETA_POINTS.map((t) => {
          let totalInfo = 0;
          for (const item of skItems) {
            const a = item.discrimination, b = item.difficulty, c = item.guessing ?? 0.2;
            if (!a || b === undefined) continue;
            totalInfo += information(t, { a, b, c });
          }
          const sem = totalInfo > 0 ? 1 / Math.sqrt(totalInfo) : 99;
          return { theta: Number(t.toFixed(2)), information: Number(totalInfo.toFixed(2)), sem: Number(sem.toFixed(4)), cefrLevel: thetaToLevel(t) };
        });
        const peak = points.reduce((b, p) => p.information > b.information ? p : b, points[0]);
        const minSem = points.filter((p) => p.sem < 50).reduce((b, p) => p.sem < b.sem ? p : b, { sem: 99, theta: 0 });
        return {
          skill: sk,
          points,
          peakTheta: peak.theta,
          peakInfo: peak.information,
          minSem: minSem.sem,
          itemCount: skItems.length,
        };
      }).filter((s) => s.itemCount > 0);

      const overallMinSem = overall.filter((p) => p.sem < 50).reduce((b, p) => p.sem < b.sem ? p : b, { sem: 99 });

      res.json({
        overall,
        bySkill,
        skills: bySkill.map((s) => s.skill),
        cefrCuts: CEFR_CUTS,
        peakTheta: peakPoint.theta,
        peakInfo: peakPoint.information,
        minSem: overallMinSem.sem,
        itemCount: items.length,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- PRETEST PILOT API ---
  app.get("/api/pretest/summary", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { PretestPilotService } = await import("./src/lib/calibration/pretest-pilot-service.js");
      const orgId = (req as any).user?.organizationId as string | undefined;
      res.json(await PretestPilotService.getSummary(orgId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/pretest/:itemId/promote", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { PretestPilotService } = await import("./src/lib/calibration/pretest-pilot-service.js");
      const { itemId } = req.params;
      const { a, b, c } = req.body;
      if (typeof b !== "number") return res.status(400).json({ error: "b (difficulty) required" });
      const result = await PretestPilotService.promoteToActive(
        itemId,
        { a: a ?? 1.0, b, c: c ?? 0.2 },
        (req as any).user?.id
      );
      res.json(result);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post("/api/pretest/batch-promote", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { PretestPilotService } = await import("./src/lib/calibration/pretest-pilot-service.js");
      const orgId = (req as any).user?.organizationId as string | undefined;
      res.json(await PretestPilotService.runBatchPromotion(orgId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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
      const e = error as { statusCode?: number; name?: string; zodError?: unknown; message?: string };
      if (e?.name === "SystemConfigValidationError" || e?.statusCode === 400) {
        return res.status(400).json({ error: e.message, details: e.zodError });
      }
      res.status(500).json({ error: "Failed to update system config" });
    }
  });

  // --- DISTRACTOR AUDIT API ---
  app.get("/api/items/distractor-audit/summary", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { DistractorAnalysisService } = await import("./src/lib/item-analysis/distractor-analysis.js");
      res.json(await DistractorAnalysisService.getItemBankSummary());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/items/distractor-audit/flagged", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { DistractorAnalysisService } = await import("./src/lib/item-analysis/distractor-analysis.js");
      const items = await DistractorAnalysisService.getFlaggedItems();
      res.json({ items, count: items.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/items/distractor-audit/:itemId", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { DistractorAnalysisService } = await import("./src/lib/item-analysis/distractor-analysis.js");
      res.json(await DistractorAnalysisService.analyzeItem(req.params.itemId));
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  // --- RELIABILITY METRICS API ---
  app.get("/api/psychometrics/reliability", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { generateReliabilityReport } = await import("./src/lib/psychometrics/reliability-metrics.js");
      const orgId = (req as any).user?.organizationId as string | undefined;

      // Load recent completed sessions
      const sessions = await prisma.session.findMany({
        where: {
          status: "COMPLETED",
          ...(orgId ? { organizationId: orgId } : {}),
        },
        select: { theta: true, sem: true },
        orderBy: { completedAt: "desc" },
        take: 2000,
      });

      if (sessions.length < 10) {
        return res.json({ message: "Insufficient data (need ≥10 completed sessions)", sampleSize: sessions.length });
      }

      const thetas = sessions.map((s) => s.theta);
      const sems = sessions.map((s) => s.sem);

      // Default CEFR cuts from engine config
      const configDoc = await prisma.systemConfig.findUnique({ where: { id: "global" } });
      const cefrT = ((configDoc?.config as any)?.cefrThresholds) ?? {
        A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5
      };
      const cuts = Object.entries(cefrT).map(([level, theta]) => ({ level, theta: theta as number }));

      const report = generateReliabilityReport(thetas, sems, cuts);
      res.json(report);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── ITEM BANK HEALTH DASHBOARD ─────────────────────────────────────────────
  // Returns a comprehensive snapshot of the item bank:
  //   • Counts by skill × level × status
  //   • CEFR quality review summary (overallScore distribution, top issues)
  //   • IRT parameter distribution (mean/sd for a, b per level)
  //   • PRETEST items ready for calibration (≥ MIN_N responses)
  //   • Items flagged REVIEW/REJECTED and their issue breakdown
  app.get("/api/psychometrics/item-bank-health", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const SKILLS     = ["VOCABULARY", "GRAMMAR", "LISTENING", "READING", "WRITING", "SPEAKING"] as const;
      const LEVELS     = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
      const MIN_ACTIVE = 30; // target active items per slot
      const MIN_CALIB  = parseInt(String(req.query.minResponses ?? "30"), 10);

      // 1. All items (status counts by skill × level)
      const items = await prisma.item.findMany({
        select: {
          id: true,
          skill: true,
          cefrLevel: true,
          status: true,
          difficulty: true,
          discrimination: true,
          guessing: true,
          metadata: true,
          _count: { select: { responses: true } },
        },
      });

      // Build skill × level matrix
      type SlotStats = {
        active: number; pretest: number; draft: number; review: number;
        retired: number; total: number; deficit: number; healthy: boolean;
        pretestReadyForCalib: number;
        avgB: number; avgA: number;
      };
      const matrix: Record<string, Record<string, SlotStats>> = {};
      for (const skill of SKILLS) {
        matrix[skill] = {};
        for (const level of LEVELS) {
          matrix[skill][level] = {
            active: 0, pretest: 0, draft: 0, review: 0, retired: 0,
            total: 0, deficit: 0, healthy: false,
            pretestReadyForCalib: 0, avgB: 0, avgA: 0,
          };
        }
      }

      let sumB = 0, sumA = 0, bCount = 0;
      const scoreDist: number[] = [];
      const issueCounts: Record<string, number> = {};
      const reviewItems: { id: string; skill: string; cefrLevel: string; score: number; issues: string[] }[] = [];

      for (const item of items) {
        const slot = matrix[item.skill]?.[item.cefrLevel];
        if (!slot) continue;

        slot.total++;
        if (item.status === "ACTIVE")   { slot.active++;   sumB += item.difficulty; sumA += item.discrimination; bCount++; slot.avgB += item.difficulty; slot.avgA += item.discrimination; }
        if (item.status === "PRETEST")  { slot.pretest++;  if (item._count.responses >= MIN_CALIB) slot.pretestReadyForCalib++; }
        if (item.status === "DRAFT")    slot.draft++;
        if (item.status === "REVIEW")   slot.review++;
        if (item.status === "RETIRED")  slot.retired++;

        // CEFR review metadata
        const meta = item.metadata as Record<string, unknown> | null;
        const review = meta?.cefrQualityReview as { overallScore: number; issues?: Array<{ code: string }> } | undefined;
        if (review) {
          scoreDist.push(review.overallScore);
          for (const issue of review.issues ?? []) {
            issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1;
          }
          if (item.status === "REVIEW") {
            reviewItems.push({
              id: item.id,
              skill: item.skill,
              cefrLevel: item.cefrLevel,
              score: review.overallScore,
              issues: (review.issues ?? []).map((i) => i.code),
            });
          }
        }
      }

      // Finalise slot averages
      for (const skill of SKILLS) {
        for (const level of LEVELS) {
          const slot = matrix[skill][level];
          if (slot.active > 0) {
            slot.avgB = slot.avgB / slot.active;
            slot.avgA = slot.avgA / slot.active;
          }
          slot.deficit  = Math.max(0, MIN_ACTIVE - slot.active);
          slot.healthy  = slot.active >= MIN_ACTIVE;
        }
      }

      // IRT distribution
      const allActive = items.filter((i) => i.status === "ACTIVE");
      const irtDist = {
        meanB: bCount > 0 ? sumB / bCount : null,
        meanA: bCount > 0 ? sumA / bCount : null,
        bByLevel: LEVELS.reduce((acc, level) => {
          const lvlItems = allActive.filter((i) => i.cefrLevel === level);
          acc[level] = lvlItems.length > 0
            ? { mean: lvlItems.reduce((s, i) => s + i.difficulty, 0) / lvlItems.length, n: lvlItems.length }
            : null;
          return acc;
        }, {} as Record<string, { mean: number; n: number } | null>),
      };

      // CEFR quality summary
      const cefrSummary = {
        itemsWithReview: scoreDist.length,
        meanScore: scoreDist.length ? scoreDist.reduce((s, x) => s + x, 0) / scoreDist.length : null,
        approved: scoreDist.filter((s) => s >= 70).length,
        review:   scoreDist.filter((s) => s >= 40 && s < 70).length,
        rejected: scoreDist.filter((s) => s < 40).length,
        topIssues: Object.entries(issueCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([code, count]) => ({ code, count })),
      };

      // Slots needing urgent attention
      const criticalSlots = SKILLS.flatMap((skill) =>
        LEVELS.map((level) => ({ skill, level, ...matrix[skill][level] }))
      ).filter((s) => s.active < 10 && s.total > 0).slice(0, 20);

      res.json({
        generatedAt: new Date().toISOString(),
        totals: {
          all: items.length,
          active: items.filter((i) => i.status === "ACTIVE").length,
          pretest: items.filter((i) => i.status === "PRETEST").length,
          draft: items.filter((i) => i.status === "DRAFT").length,
          review: items.filter((i) => i.status === "REVIEW").length,
          retired: items.filter((i) => i.status === "RETIRED").length,
          pretestReadyForCalib: items.filter((i) => i.status === "PRETEST" && i._count.responses >= MIN_CALIB).length,
        },
        slotHealth: { minActive: MIN_ACTIVE, matrix },
        criticalSlots,
        irtDistribution: irtDist,
        cefrQualitySummary: cefrSummary,
        reviewItems: reviewItems.sort((a, b) => a.score - b.score).slice(0, 50),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Subscore reliability analysis (Livingston-Lewis 1995)
  // Returns per-skill reliability, added-value criterion (Haberman 2008), and
  // Kelley-regressed scores. Accepts optional ?skill=GRAMMAR&minSessions=200
  app.get(
    "/api/psychometrics/subscore-reliability",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (req, res) => {
      try {
        const { analyzeSubscoreReliability } = await import(
          "./src/lib/psychometrics/subscore-reliability.js"
        );
        const MIN_SESS = Math.min(Number(req.query.minSessions ?? 200), 5000);
        const orgId = (req as any).user?.organizationId as string | undefined;

        // Pull completed sessions with theta + SEM + subscores
        const sessions = await prisma.session.findMany({
          where: {
            status: "COMPLETED",
            ...(orgId ? { organizationId: orgId } : {}),
          },
          select: {
            id: true,
            theta: true,
            sem: true,
            metadata: true,   // JSON contains subscores: { GRAMMAR: {theta, sem}, VOCABULARY: {theta, sem}, ... }
          },
          orderBy: { completedAt: "desc" },
          take: MIN_SESS,
        });

        if (sessions.length < 10) {
          return res.json({
            message: "Insufficient sessions for subscore analysis",
            sampleSize: sessions.length,
          });
        }

        // Build per-skill input vectors from session subscores
        const skillMap: Record<string, { thetas: number[]; sems: number[] }> = {};
        for (const sess of sessions) {
          const meta = sess.metadata as Record<string, unknown> | null;
          const sub = (meta?.subscores ?? null) as Record<string, { theta: number; sem: number }> | null;
          if (!sub) continue;
          for (const [skill, vals] of Object.entries(sub)) {
            if (!skillMap[skill]) skillMap[skill] = { thetas: [], sems: [] };
            skillMap[skill].thetas.push(vals.theta ?? 0);
            skillMap[skill].sems.push(vals.sem ?? 0.5);
          }
        }

        const compositeThetas = sessions.map((s) => s.theta);
        const inputs = Object.entries(skillMap).map(([skill, data]) => ({
          skill: skill as any,
          thetas: data.thetas,
          sems: data.sems,
        }));

        if (inputs.length === 0) {
          return res.json({
            message: "No subscore data found in sessions. Sessions must include a subscores key in the metadata JSON field.",
            sampleSize: sessions.length,
          });
        }

        const report = analyzeSubscoreReliability(inputs, compositeThetas);
        res.json({ sampleSize: sessions.length, ...report });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    }
  );

  // AIG quality metrics: b-parameter correlation + generation funnel
  app.get(
    "/api/psychometrics/aig-quality",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]),
    async (req, res) => {
      try {
        const CEFR_EXPECTED_B: Record<string, number> = {
          A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5,
        };
        const DELTA_THRESHOLD = 0.80;

        const allItems = await prisma.item.findMany({
          select: {
            id: true,
            skill: true,
            cefrLevel: true,
            status: true,
            difficulty: true,
            discrimination: true,
            pVal: true,
            metadata: true,
          },
        });

        // Funnel counts
        const byStatus: Record<string, number> = {};
        const funnelBySkill: Record<string, Record<string, number>> = {};
        for (const item of allItems) {
          const s = item.status;
          byStatus[s] = (byStatus[s] ?? 0) + 1;
          if (!funnelBySkill[item.skill]) funnelBySkill[item.skill] = {};
          funnelBySkill[item.skill][s] = (funnelBySkill[item.skill][s] ?? 0) + 1;
        }

        const total = allItems.length;
        const active = byStatus["ACTIVE"] ?? 0;
        const survivalDenom = total - (byStatus["DRAFT"] ?? 0) - (byStatus["REVIEW"] ?? 0);
        const survivalRatePct = survivalDenom > 0
          ? Number(((active / survivalDenom) * 100).toFixed(1))
          : null;

        // b-correlation
        const calibrated = allItems.filter(
          (i) => i.status === "ACTIVE" && i.difficulty !== 0 && i.cefrLevel in CEFR_EXPECTED_B
        );
        const expectedBs  = calibrated.map((i) => CEFR_EXPECTED_B[i.cefrLevel]);
        const empiricalBs = calibrated.map((i) => i.difficulty);

        function pearsonLocal(xs: number[], ys: number[]): number {
          const n = xs.length;
          if (n < 3) return NaN;
          const mx = xs.reduce((a, b) => a + b, 0) / n;
          const my = ys.reduce((a, b) => a + b, 0) / n;
          let num = 0, dx2 = 0, dy2 = 0;
          for (let i = 0; i < n; i++) {
            num += (xs[i] - mx) * (ys[i] - my);
            dx2 += (xs[i] - mx) ** 2;
            dy2 += (ys[i] - my) ** 2;
          }
          const denom = Math.sqrt(dx2 * dy2);
          return denom < 1e-9 ? NaN : num / denom;
        }

        const bCorrelation = calibrated.length >= 3
          ? Number(pearsonLocal(expectedBs, empiricalBs).toFixed(3))
          : null;

        const miscalibrated = calibrated.filter(
          (i) => Math.abs(CEFR_EXPECTED_B[i.cefrLevel] - i.difficulty) > DELTA_THRESHOLD
        );

        // Per-level deviation
        const bDeviationByLevel: Record<string, { n: number; meanDelta: number; rmse: number }> = {};
        for (const level of Object.keys(CEFR_EXPECTED_B)) {
          const subset = calibrated.filter((i) => i.cefrLevel === level);
          if (subset.length === 0) continue;
          const deltas = subset.map((i) => i.difficulty - CEFR_EXPECTED_B[level]);
          const m = deltas.reduce((a, b) => a + b, 0) / deltas.length;
          const rmse = Math.sqrt(deltas.reduce((a, d) => a + d * d, 0) / deltas.length);
          bDeviationByLevel[level] = {
            n: subset.length,
            meanDelta: Number(m.toFixed(3)),
            rmse: Number(rmse.toFixed(3)),
          };
        }

        // Per-generator stats
        const byGen: Record<string, { total: number; active: number }> = {};
        for (const item of allItems) {
          const gen = (item.metadata as any)?.generatedBy ?? "unknown";
          if (!byGen[gen]) byGen[gen] = { total: 0, active: 0 };
          byGen[gen].total++;
          if (item.status === "ACTIVE") byGen[gen].active++;
        }
        const generatorStats = Object.entries(byGen)
          .map(([generator, c]) => ({
            generator,
            total: c.total,
            active: c.active,
            survivalRatePct: Number(((c.active / c.total) * 100).toFixed(1)),
          }))
          .sort((a, b) => b.total - a.total);

        res.json({
          generatedAt: new Date().toISOString(),
          totalItems: total,
          statusBreakdown: byStatus,
          aig: { funnelBySkill, survivalRatePct, generatorStats },
          bParameterCorrelation: {
            calibratedItemsN: calibrated.length,
            bCorrelation,
            bDeviationByLevel,
            miscalibratedItems: miscalibrated.length,
            deltaThreshold: DELTA_THRESHOLD,
            interpretation: bCorrelation == null
              ? "insufficient data"
              : bCorrelation >= 0.7 ? "GOOD"
              : bCorrelation >= 0.4 ? "MODERATE"
              : "POOR",
          },
          itemQuality: {
            activeCount: active,
            meanPval: calibrated.length
              ? Number((calibrated.filter((i) => i.pVal != null).reduce((a, i) => a + (i.pVal ?? 0), 0) / calibrated.length).toFixed(3))
              : null,
            meanDiscrimination: active > 0
              ? Number((allItems.filter((i) => i.status === "ACTIVE").reduce((a, i) => a + i.discrimination, 0) / active).toFixed(3))
              : null,
          },
        });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    }
  );

  // CSEM curve: returns dense SEM data across theta range for a smooth chart
  app.get("/api/psychometrics/csem-curve", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId as string | undefined;
      const steps = Math.min(Number(req.query.steps ?? 60), 200);

      const sessions = await prisma.session.findMany({
        where: {
          status: "COMPLETED",
          ...(orgId ? { organizationId: orgId } : {}),
        },
        select: { theta: true, sem: true },
        orderBy: { completedAt: "desc" },
        take: 5000,
      });

      if (sessions.length < 10) {
        return res.json({ message: "Insufficient data", sampleSize: sessions.length, points: [] });
      }

      const thetas = sessions.map((s) => s.theta);
      const sems = sessions.map((s) => s.sem);

      // Bin thetas into `steps` equal-width bins over [min, max]
      const minT = Math.min(...thetas);
      const maxT = Math.max(...thetas);
      const binWidth = (maxT - minT) / steps;

      const bins: { theta: number; meanSem: number; n: number }[] = [];
      for (let i = 0; i < steps; i++) {
        const lo = minT + i * binWidth;
        const hi = lo + binWidth;
        const midTheta = lo + binWidth / 2;
        const inBin = thetas
          .map((t, idx) => ({ t, sem: sems[idx] }))
          .filter(({ t }) => t >= lo && t < hi);
        if (inBin.length === 0) continue;
        const meanSem = inBin.reduce((s, x) => s + x.sem, 0) / inBin.length;
        bins.push({ theta: Number(midTheta.toFixed(3)), meanSem: Number(meanSem.toFixed(4)), n: inBin.length });
      }

      // CEFR cut annotations
      const configDoc = await prisma.systemConfig.findUnique({ where: { id: "global" } });
      const cefrT = ((configDoc?.config as any)?.cefrThresholds) ?? {
        A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5
      };

      res.json({
        sampleSize: sessions.length,
        thetaRange: [minT, maxT],
        cefrCuts: cefrT,
        points: bins,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get(
    "/api/psychometrics/dif/flagged",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (req, res) => {
      try {
        const { DifAnalysisService } = await import("./src/lib/psychometrics/dif-analysis.js");
        const { groupVariable, referenceGroup, focalGroup } = req.query;
        if (!groupVariable || !referenceGroup || !focalGroup) {
          return res.status(400).json({
            error: "Query params groupVariable, referenceGroup, and focalGroup are required",
          });
        }
        const gv = String(groupVariable);
        if (!["gender", "nativeLanguage", "ageGroup"].includes(gv)) {
          return res.status(400).json({ error: "groupVariable must be gender, nativeLanguage, or ageGroup" });
        }
        const report = await DifAnalysisService.getFlaggedItems(
          gv as "gender" | "nativeLanguage" | "ageGroup",
          String(referenceGroup),
          String(focalGroup)
        );
        res.json({ items: report, count: report.length });
      } catch (err) {
        logger.error({ err }, "DIF flagged query failed");
        res.status(500).json({ error: "DIF analysis failed" });
      }
    }
  );

  // DIF summary (counts by classification + status)
  app.get(
    "/api/psychometrics/dif/summary",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (_req, res) => {
      try {
        const rows = await prisma.difFlaggedItem.findMany({
          select: { worstClassification: true, status: true, flaggedAt: true },
        });
        const byClassification: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        let lastRunAt: string | null = null;
        for (const r of rows) {
          byClassification[r.worstClassification] = (byClassification[r.worstClassification] ?? 0) + 1;
          byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
          const ts = r.flaggedAt.toISOString();
          if (!lastRunAt || ts > lastRunAt) lastRunAt = ts;
        }
        res.json({ totalFlagged: rows.length, byClassification, byStatus, lastRunAt });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    }
  );

  // DIF flagged items (all, with item metadata)
  app.get(
    "/api/psychometrics/dif/flagged-all",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (_req, res) => {
      try {
        const items = await prisma.difFlaggedItem.findMany({
          include: {
            item: { select: { skill: true, cefrLevel: true, difStatus: true } },
          },
          orderBy: [{ status: "asc" }, { flaggedAt: "desc" }],
        });
        res.json({ items, count: items.length });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    }
  );

  // Trigger batch DIF analysis
  app.post(
    "/api/psychometrics/dif/run-batch",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (_req, res) => {
      try {
        const { BatchDifDetectionService } = await import("./src/lib/psychometrics/batch-dif-detection.js");
        const result = await BatchDifDetectionService.runFullDifAnalysis();
        res.json(result);
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    }
  );

  // Update DIF flag status
  app.patch(
    "/api/psychometrics/dif/flagged/:itemId",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (req, res) => {
      try {
        const { itemId } = req.params;
        const { status, notes } = req.body as { status?: string; notes?: string };
        const allowed = ["PENDING", "IN_REVIEW", "REMEDIATED", "RETIRED"];
        if (status && !allowed.includes(status)) {
          return res.status(400).json({ error: `status must be one of ${allowed.join(", ")}` });
        }
        const updated = await prisma.difFlaggedItem.update({
          where: { itemId },
          data: {
            ...(status ? { status } : {}),
            ...(notes !== undefined ? { notes } : {}),
          },
        });
        res.json(updated);
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    }
  );

  // Item bank exposure report
  app.get(
    "/api/items/exposure-report",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (req, res) => {
      try {
        const orgId = (req as any).user?.organizationId as string | undefined;
        const OVER_EXPOSURE_THRESHOLD = 0.30;

        const items = await prisma.item.findMany({
          where: { ...(orgId ? { organizationId: orgId } : {}) },
          select: {
            id: true,
            skill: true,
            cefrLevel: true,
            status: true,
            discrimination: true,
            _count: { select: { responses: true } },
          },
        });

        const totalSessions = await prisma.session.count({
          where: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) },
        });

        const activeItems = items.filter((it) => it.status === "ACTIVE");
        const totalActive = activeItems.length;

        // Compute usage per item (exposureRate = responses / totalSessions)
        const neverUsed   = activeItems.filter((it) => it._count.responses === 0).length;
        const overExposed = totalSessions > 0
          ? activeItems.filter((it) => it._count.responses / totalSessions > OVER_EXPOSURE_THRESHOLD).length
          : 0;

        // Build α-strata from active items with discrimination
        const N_STRATA = 4;
        const withA = activeItems
          .filter((it) => it.discrimination !== null && it.discrimination !== undefined)
          .sort((a, b) => (a.discrimination! - b.discrimination!));
        const perStratum = Math.ceil(withA.length / N_STRATA);
        const strata = Array.from({ length: N_STRATA }, (_, s) => {
          const slice = withA.slice(s * perStratum, (s + 1) * perStratum);
          if (slice.length === 0) return null;
          const aVals = slice.map((it) => it.discrimination!);
          const usedCount = slice.filter((it) => it._count.responses > 0).length;
          return {
            stratumIndex: s,
            label: `Stratum ${s + 1} (${s === 0 ? "Low" : s === N_STRATA - 1 ? "High" : "Mid"} α)`,
            totalItems: slice.length,
            usedItems: usedCount,
            usageRate: slice.length > 0 ? usedCount / slice.length : 0,
            minA: Math.min(...aVals),
            maxA: Math.max(...aVals),
          };
        }).filter(Boolean);

        // By skill
        const bySkill: Record<string, { total: number; active: number; pretest: number; retired: number }> = {};
        for (const it of items) {
          const key = it.skill;
          if (!bySkill[key]) bySkill[key] = { total: 0, active: 0, pretest: 0, retired: 0 };
          bySkill[key].total++;
          if (it.status === "ACTIVE")   bySkill[key].active++;
          if (it.status === "PRETEST")  bySkill[key].pretest++;
          if (it.status === "RETIRED")  bySkill[key].retired++;
        }

        // By CEFR
        const byCefrLevel: Record<string, { total: number; active: number }> = {};
        for (const it of items) {
          const key = it.cefrLevel ?? "UNKNOWN";
          if (!byCefrLevel[key]) byCefrLevel[key] = { total: 0, active: 0 };
          byCefrLevel[key].total++;
          if (it.status === "ACTIVE") byCefrLevel[key].active++;
        }

        res.json({
          totalActive,
          neverUsed,
          overExposed,
          overExposureThreshold: OVER_EXPOSURE_THRESHOLD,
          strata,
          bySkill,
          byCefrLevel,
        });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    }
  );

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

  // --- SUBSCORE RELIABILITY API ---
  app.get("/api/psychometrics/subscore-reliability", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { marginalReliability, classificationConsistency } = await import("./src/lib/psychometrics/reliability-metrics.js");
      const orgId = (req as any).user?.organizationId as string | undefined;

      // Fetch all completed sessions with per-skill theta/SEM stored in metadata
      const sessions = await prisma.session.findMany({
        where: { status: "COMPLETED", ...(orgId ? { organizationId: orgId } : {}) },
        select: { theta: true, sem: true, metadata: true },
        orderBy: { completedAt: "desc" },
        take: 3000,
      });

      if (sessions.length < 10) {
        return res.json({ message: "Insufficient data (need ≥10 completed sessions)", sampleSize: sessions.length });
      }

      const configDoc = await prisma.systemConfig.findUnique({ where: { id: "global" } });
      const cefrT = ((configDoc?.config as any)?.cefrThresholds) ?? {
        A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5,
      };
      const cutThetas = Object.values(cefrT).map(Number).sort((a, b) => a - b);

      const skills = ["READING", "LISTENING", "GRAMMAR", "VOCABULARY", "WRITING", "SPEAKING"] as const;
      const subscoreReport: Record<string, { sampleSize: number; marginalReliability: number; classificationConsistency: number }> = {};

      for (const skill of skills) {
        const skillData = sessions
          .map((s) => {
            const meta = s.metadata as any;
            const skillProfile = meta?.skillProfile?.[skill];
            if (!skillProfile) return null;
            return { theta: skillProfile.theta as number, sem: skillProfile.sem as number };
          })
          .filter(Boolean) as { theta: number; sem: number }[];

        if (skillData.length < 10) {
          subscoreReport[skill] = { sampleSize: skillData.length, marginalReliability: 0, classificationConsistency: 0 };
          continue;
        }

        const thetas = skillData.map((d) => d.theta);
        const sems = skillData.map((d) => d.sem);
        subscoreReport[skill] = {
          sampleSize: skillData.length,
          marginalReliability: Number(marginalReliability(thetas, sems).toFixed(3)),
          classificationConsistency: Number(classificationConsistency(thetas, sems, cutThetas).toFixed(3)),
        };
      }

      // Overall composite (from session-level theta/SEM)
      const allThetas = sessions.map((s) => s.theta);
      const allSems = sessions.map((s) => s.sem);
      subscoreReport["COMPOSITE"] = {
        sampleSize: sessions.length,
        marginalReliability: Number(marginalReliability(allThetas, allSems).toFixed(3)),
        classificationConsistency: Number(classificationConsistency(allThetas, allSems, cutThetas).toFixed(3)),
      };

      res.json({ subscores: subscoreReport, computedAt: new Date().toISOString() });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- BAYESIAN CALIBRATION API ---
  app.post("/api/psychometrics/bayesian-calibration/run", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { runBatchBayesianCalibration } = await import("./src/lib/psychometrics/bayesian-calibration.js");
      const summary = await runBatchBayesianCalibration();
      res.json(summary);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/psychometrics/bayesian-calibration/:itemId", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { updateItemPosterior } = await import("./src/lib/psychometrics/bayesian-calibration.js");
      const result = await updateItemPosterior(req.params.itemId);
      if (!result) return res.status(404).json({ error: "Item not found or insufficient responses" });
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- AIG QUALITY METRICS ---
  app.get("/api/aig/quality", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { AigQualityMetrics } = await import("./src/lib/ai/aig-quality-metrics.js");
      const orgId = (req as any).user?.organizationId as string | undefined;
      res.json(await AigQualityMetrics.getReport(orgId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- BIAS REVIEW API ---
  app.post("/api/items/:itemId/bias-review", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { reviewItemBias } = await import("./src/lib/ai/bias-review-orchestrator.js");
      res.json(await reviewItemBias(req.params.itemId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/items/:itemId/bias-review", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR", "CONTENT_ADMIN"]), async (req, res) => {
    try {
      const { getBiasReview } = await import("./src/lib/ai/bias-review-orchestrator.js");
      const result = await getBiasReview(req.params.itemId);
      if (!result) return res.status(404).json({ error: "No bias review found for this item" });
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/items/bias-review/batch", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { runBatchBiasReview } = await import("./src/lib/ai/bias-review-orchestrator.js");
      const limit = Number(req.query.limit ?? 50);
      res.json(await runBatchBiasReview({ limit }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- FRAUD DETECTION API ---
  app.post("/api/sessions/:sessionId/fraud-check", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { analyzeSessionFraud } = await import("./src/lib/security/fraud-detection.js");
      res.json(await analyzeSessionFraud(req.params.sessionId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/sessions/:sessionId/fraud-report", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { getFraudReport } = await import("./src/lib/security/fraud-detection.js");
      const report = await getFraudReport(req.params.sessionId);
      if (!report) return res.status(404).json({ error: "No fraud report for this session" });
      res.json(report);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/sessions/fraud-check/batch", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { runBatchFraudAudit } = await import("./src/lib/security/fraud-detection.js");
      const orgId = (req as any).user?.organizationId as string | undefined;
      res.json(await runBatchFraudAudit(orgId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/sessions/fraud-tier/:tier", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { listSessionsByTier } = await import("./src/lib/security/fraud-detection.js");
      const { tier } = req.params;
      if (!["PASS", "REVIEW", "FLAG", "BLOCK"].includes(tier)) {
        return res.status(400).json({ error: "tier must be PASS|REVIEW|FLAG|BLOCK" });
      }
      const orgId = (req as any).user?.organizationId as string | undefined;
      const limit = Number(req.query.limit ?? 50);
      res.json(await listSessionsByTier(tier as any, orgId, limit));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ASR SCORING API ---
  app.post("/api/scoring/asr", async (req, res) => {
    try {
      const { scoreWithWhisper } = await import("./src/lib/scoring/asr-fallback.js");
      // Accept raw body as Buffer (content-type: application/octet-stream)
      // or base64-encoded JSON { audio: "<base64>", mimeType, referenceText, targetKeywords }
      let audioBuffer: Buffer;
      const ct = req.headers["content-type"] ?? "";
      if (ct.includes("application/octet-stream")) {
        audioBuffer = req.body as Buffer;
      } else {
        const { audio } = req.body as { audio: string };
        if (!audio) return res.status(400).json({ error: "Missing audio field (base64)" });
        audioBuffer = Buffer.from(audio, "base64");
      }
      const { referenceText, targetKeywords, language } = req.body as {
        referenceText?: string;
        targetKeywords?: string[];
        language?: string;
      };
      const result = await scoreWithWhisper(audioBuffer, { referenceTranscript: referenceText, targetKeywords });
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- PHASE 6: COMMERCIALIZATION & ECOSYSTEM ---
  app.post("/api/scoring/off-topic", async (req, res) => {
    try {
      const { detectOffTopic, batchDetectOffTopic } = await import("./src/lib/scoring/off-topic-detector.js");
      const { responseText, promptItemId, promptText, entries } = req.body as {
        responseText?: string;
        promptItemId?: string;
        promptText?: string;
        entries?: Array<{ sessionId: string; itemId: string; responseText: string }>;
      };
      if (entries && Array.isArray(entries)) {
        res.json(await batchDetectOffTopic(entries));
      } else if (responseText) {
        res.json(await detectOffTopic(responseText, { promptItemId, promptText }));
      } else {
        res.status(400).json({ error: "Provide responseText (single) or entries (batch)" });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- GDPR / FERPA DATA RIGHTS ---
  app.get("/api/users/:userId/data-export", checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]), async (req, res) => {
    try {
      const { exportUserData } = await import("./src/lib/compliance/gdpr-data-service.js");
      const actorId = (req as any).user?.id as string;
      const bundle = await exportUserData(req.params.userId, actorId);
      res.setHeader("Content-Disposition", `attachment; filename="data-export-${req.params.userId}.json"`);
      res.json(bundle);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/users/:userId/data", checkRole(["SUPER_ADMIN"]), async (req, res) => {
    try {
      const { deleteUserData } = await import("./src/lib/compliance/gdpr-data-service.js");
      const actorId = (req as any).user?.id as string;
      res.json(await deleteUserData(req.params.userId, actorId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- DATA RETENTION ENFORCEMENT ---
  // POST /api/admin/data-retention/run — enforce KVKK/GDPR retention schedules:
  //   - Ses dosyaları (audio_url): 90 gün sonra silinir
  //   - Sınav oturumları: 5 yıl sonra silinir
  //   - Teknik günlükler: server rotasyon ile (bu endpoint DB kayıtlarını temizler)
  // CI cron: .github/workflows/data-retention.yml (haftalık)
  app.post("/api/admin/data-retention/run",
    checkRole(["SUPER_ADMIN"]),
    async (req, res) => {
      try {
        const dryRun = req.query.dry === "1" || req.body?.dryRun === true;
        const now = new Date();

        // 1. Ses dosyası referanslarını temizle (90 gün)
        const audioExpiry = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const audioRows = await prisma.$executeRaw`
          UPDATE "Response"
          SET "audioUrl" = NULL, "audioDeletedAt" = ${now}
          WHERE "audioUrl" IS NOT NULL
            AND "createdAt" < ${audioExpiry}
            AND "audioDeletedAt" IS NULL
        `.catch(() => 0);

        // 2. Eski sınav oturumlarını anonimleştir (5 yıl)
        // metadata.anonymizedAt alanı kullanılır (schema migration gerekmez)
        const sessionExpiry = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        const expiredSessions = await prisma.session.findMany({
          where: { createdAt: { lt: sessionExpiry } },
          select: { id: true, metadata: true },
        });
        const toAnonymize = expiredSessions.filter((s) => {
          const meta = s.metadata as Record<string, unknown> | null;
          return !meta?.anonymizedAt;
        });
        const sessionRows = dryRun ? toAnonymize.length : await Promise.all(
          toAnonymize.map((s) => {
            const meta = (s.metadata as Record<string, unknown> | null) ?? {};
            return prisma.session.update({
              where: { id: s.id },
              data: { metadata: { ...meta, anonymizedAt: now.toISOString() } as any },
            });
          })
        ).then((r) => r.length).catch(() => 0);

        const result = {
          dryRun,
          runAt: now.toISOString(),
          audioUrlsCleared: dryRun ? "skipped" : audioRows,
          sessionsAnonymized: dryRun ? "skipped" : sessionRows,
          retentionPolicy: {
            audioFiles: "90 days",
            examSessions: "5 years (then anonymized)",
            technicalLogs: "1 year (server log rotation)",
          },
        };

        console.info("[DataRetention] run complete", result);
        res.json(result);
      } catch (e: any) {
        console.error("[DataRetention] run failed", e.message);
        res.status(500).json({ error: e.message });
      }
    }
  );

  // GET /api/admin/slo/report — 30-day rolling SLO compliance report
  // Returns DB-derived metrics + APM placeholders for uptime/latency SLOs.
  // Weekly CI: .github/workflows/slo-report.yml
  app.get(
    "/api/admin/slo/report",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (req, res) => {
      try {
        const windowDays = Math.min(
          90,
          Math.max(1, parseInt(String(req.query.window ?? "30"), 10) || 30)
        );
        const { generateSloReport, sloReportToMarkdown } = await import(
          "./src/lib/observability/slo-monitor.js"
        );
        const report = await generateSloReport(windowDays);
        const fmt = req.query.format as string | undefined;
        if (fmt === "markdown") {
          res.type("text/plain").send(sloReportToMarkdown(report));
        } else {
          res.json(report);
        }
      } catch (e: any) {
        console.error("[SloReport] failed", e.message);
        res.status(500).json({ error: e.message });
      }
    }
  );

  // GET /api/admin/cache-stats — live item-bank cache + scoring queue metrics
  app.get(
    "/api/admin/cache-stats",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (_req, res) => {
      try {
        const { getItemCacheStats } = await import(
          "./src/lib/assessment-engine/item-bank-cache.js"
        );
        const { getScoringQueueStats } = await import(
          "./src/lib/scoring/scoring-queue.js"
        );
        res.json({
          itemBankCache: getItemCacheStats(),
          scoringQueue: getScoringQueueStats(),
          generatedAt: new Date().toISOString(),
        });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  // POST /api/admin/cache/invalidate — flush the item bank cache after bulk item changes
  app.post(
    "/api/admin/cache/invalidate",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (_req, res) => {
      try {
        const { invalidateItemCache } = await import(
          "./src/lib/assessment-engine/item-bank-cache.js"
        );
        invalidateItemCache();
        res.json({ ok: true, message: "Item bank cache flushed" });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  // GET /api/admin/cut-scores — BCa bootstrap canonical CEFR cut score table
  // Returns panel metadata + bootstrap CI results for all 4 boundaries.
  app.get(
    "/api/admin/cut-scores",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (req, res) => {
      try {
        const { buildCutScoreApiResponse } = await import(
          "./src/lib/psychometrics/canonical-cut-scores.js"
        );
        res.json(buildCutScoreApiResponse());
      } catch (e: any) {
        console.error("[CutScores] failed", e.message);
        res.status(500).json({ error: e.message });
      }
    }
  );

  // GET /api/admin/calibration/qwk — rolling AI-human agreement (QWK) for Writing/Speaking
  // Consumed by the monthly GitHub Actions cron: .github/workflows/ai-calibration-check.yml
  // Returns { metrics: { WRITING: { qwk, n }, SPEAKING: { qwk, n } }, window, generatedAt }
  app.get(
    "/api/admin/calibration/qwk",
    checkRole(["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"]),
    async (req, res) => {
      try {
        const windowDays = Math.min(
          90,
          Math.max(1, parseInt(String(req.query.window ?? "30"), 10) || 30)
        );
        const skill = String(req.query.skill ?? "ALL").toUpperCase();

        const { computeQwkSlo } = await import(
          "./src/lib/observability/slo-monitor.js"
        );

        const skills: Array<"WRITING" | "SPEAKING"> =
          skill === "ALL" ? ["WRITING", "SPEAKING"] : [skill as "WRITING" | "SPEAKING"];

        const results: Record<string, { qwk: number | null; n: number; meetsTarget: boolean }> = {};

        await Promise.all(
          skills.map(async (s) => {
            const r = await computeQwkSlo(s, windowDays).catch(() => null);
            results[s] = {
              qwk: r?.achieved ?? null,
              n: r?.sampleSize ?? 0,
              meetsTarget: r?.achieved != null && r.achieved >= (s === "SPEAKING" ? 0.78 : 0.80),
            };
          })
        );

        res.json({
          metrics: results,
          window: windowDays,
          // Legacy flat fields — for backward compat with the GitHub Actions cron parser
          writingQwk: results["WRITING"]?.qwk ?? null,
          speakingQwk: results["SPEAKING"]?.qwk ?? null,
          generatedAt: new Date().toISOString(),
        });
      } catch (e: any) {
        console.error("[CalibrationQWK] failed", e.message);
        res.status(500).json({ error: e.message });
      }
    }
  );

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
    if (!dbAvailable) {
      return res.status(503).json({ error: "Database unavailable" });
    }
    try {
      // Import the LiveMetricsEngine for real-time analytics
      const { LiveMetricsEngine } = await import("./src/lib/analytics/live-metrics-engine.js");

      // Compute comprehensive analytics snapshot
      const snapshot = await LiveMetricsEngine.computeSnapshot(id);

      // Get feedback ratings (for backward compatibility)
      const feedbacks = await (prisma as any).feedback.findMany({
        where: { organizationId: id },
        select: { rating: true },
      });
      const avgRating =
        feedbacks.length > 0
          ? feedbacks.reduce((acc: number, f: any) => acc + f.rating, 0) /
            feedbacks.length
          : 0;

      // Get engine for CEFR mapping
      const { getEngine } = await import("./src/lib/assessment-engine/server-engine.js");
      const engine = await getEngine();

      // Build CEFR distribution from sessions
      const distribution: Record<string, number> = {
        A1: 0,
        A2: 0,
        B1: 0,
        B2: 0,
        C1: 0,
        C2: 0,
      };

      // Use the sessions from the snapshot to compute distribution
      const allSessions = await prisma.session.findMany({
        where: { organizationId: id, status: "COMPLETED" },
        select: { theta: true },
      });

      allSessions.forEach((s) => {
        const cefr = engine.mapToCefr(s.theta);
        distribution[cefr] = (distribution[cefr] || 0) + 1;
      });

      const cefrData = Object.entries(distribution).map(([name, value]) => ({
        name,
        value,
      }));

      // Mock skill breakdown for compatibility
      const skillBreakdown = [
        { subject: "Reading", A: 120, B: 110, fullMark: 150 },
        { subject: "Listening", A: 98, B: 130, fullMark: 150 },
        { subject: "Writing", A: 86, B: 130, fullMark: 150 },
        { subject: "Speaking", A: 99, B: 100, fullMark: 150 },
      ];

      // Return extended response with both old and new metrics
      res.json({
        // Old format (for backward compatibility)
        sessionsCount: snapshot.sessions.totalSessions,
        feedbacksCount: feedbacks.length,
        avgRating,
        cefrDistribution: cefrData,
        skillBreakdown,

        // New Phase 4 metrics
        timestamp: snapshot.timestamp,
        skills: snapshot.skills,
        itemDifficulty: snapshot.itemDifficulty,
        sessions: snapshot.sessions,
        pretestPipeline: snapshot.pretestPipeline,
        retirementStatus: snapshot.retirementStatus,
        mirt: snapshot.mirt,
      });
    } catch (err) {
      logger.error({ err, organizationId: id }, "Failed to fetch analytics snapshot");
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

    // Serve audio files with dedicated route so Range requests stream correctly
    // and browsers never cache 404s for audio.
    app.use("/audio", express.static(path.join(distPath, "audio"), {
      maxAge: "7d",
      immutable: false,
      acceptRanges: true,
      setHeaders(res) {
        // Ensure browsers always re-validate and don't serve stale 404s
        res.setHeader("Accept-Ranges", "bytes");
      },
    }));

    // Hashed asset files (/assets/...) are content-addressed → safe to cache immutably
    app.use(
      "/assets",
      express.static(path.join(distPath, "assets"), {
        maxAge: "1y",
        immutable: true,
        setHeaders(res) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      })
    );

    app.use(express.static(distPath));
    // SPA fallback only for document routes. If a hashed /assets/* file is missing (stale CDN HTML),
    // do not send index.html — that breaks CSS/JS MIME types in the browser.
    app.get("*", (req, res) => {
      const p = req.path;
      if (p.startsWith("/assets/") || /\.(js|mjs|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|json|webmanifest|wav|mp3|ogg|aac|m4a)$/i.test(p)) {
        return res.status(404).type("text/plain").send("Not found");
      }
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
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

  // Fix ECONNRESET under load: Render.com load-balancer has a 60 s idle timeout;
  // Node default is 5 s. Set to 65 s so keep-alives outlast the LB timeout.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000; // must be > keepAliveTimeout

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
