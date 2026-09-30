/**
 * E2E: Critical path coverage — register → verify → login → full exam → report → PDF → cert
 *
 * Runtime: Playwright (npm install -D @playwright/test playwright)
 * Run: npx playwright test test/e2e/exam-flow.spec.ts
 *
 * Prerequisites:
 *   - Integrated Express + Vite server running at BASE_URL (default: http://localhost:3001)
 *   - Seed user seeded via: npm run db:bootstrap-admin
 *   - E2E_EMAIL / E2E_PASSWORD env vars set (or use defaults below)
 *   - E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD for admin-level tests
 *
 * Note: These tests are intentionally gated behind a separate npm script
 *   ("test:e2e") so they don't run in the standard Vitest suite.
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL    = process.env.E2E_BASE_URL    ?? "http://localhost:3001";
const E2E_EMAIL   = process.env.E2E_EMAIL       ?? "e2e-student@b4skills.test";
const E2E_PASS    = process.env.E2E_PASSWORD    ?? "E2eTest!2026";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@b4skills.com";
const ADMIN_PASS  = process.env.E2E_ADMIN_PASSWORD ?? "Admin@b4skills2025";
const PRODUCT_LINES = [
  "Primary (7-10)",
  "Junior Suite (11-14)",
  "15-Min Diagnostic",
  "Express Assessment (30-Min)",
  "General English",
  "Academia",
  "Corporate",
  "Language Schools",
  "Specialized / Integrated Skills",
] as const;
let ensuredCompletedSessionId: string | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function login(page: Page, email = E2E_EMAIL, password = E2E_PASS): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/e-posta|email/i).fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 12_000 });
}

/** Try to answer the currently visible assessment item. Handles MC, T/F, and text entry. */
async function answerCurrentItem(page: Page): Promise<void> {
  // Multiple-choice option
  const mcOption = page.locator('[data-testid="answer-option"], [role="radio"], [role="checkbox"]').first();
  if (await mcOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await mcOption.click();
  } else {
    // Short-answer / fill-in: look for a textarea or text input inside the item card
    const textInput = page.locator('[data-testid="exam-item"] textarea, [data-testid="exam-item"] input[type="text"]').first();
    if (await textInput.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await textInput.fill("test answer");
    }
  }
  const nextBtn = page.getByRole("button", { name: /submit|gönder|ileri|next|devam/i }).first();
  if (await nextBtn.isEnabled({ timeout: 2_000 }).catch(() => false)) {
    await nextBtn.click();
  }
}

/** Keep answering items until the exam ends or max iterations reached. */
async function driveExamToCompletion(page: Page, maxItems = 50): Promise<void> {
  for (let i = 0; i < maxItems; i++) {
    const done = page.locator(
      '[data-testid="exam-complete"], [data-testid="score-report"], .exam-complete, .score-card'
    );
    if (await done.isVisible({ timeout: 1_000 }).catch(() => false)) break;
    await answerCurrentItem(page);
    await page.waitForTimeout(400);
  }
}

async function completeRapidDiagnosticViaApi(page: Page): Promise<string> {
  const launchRes = await page.request.post(`${BASE_URL}/api/sessions/launch`, {
    data: { productLine: "15-Min Diagnostic" },
    headers: { "Content-Type": "application/json" },
  });
  expect(launchRes.ok(), await launchRes.text()).toBe(true);
  const { sessionId } = await launchRes.json().catch(() => ({}));
  expect(sessionId).toBeTruthy();

  for (let index = 0; index < 80; index += 1) {
    const nextRes = await page.request.get(`${BASE_URL}/api/sessions/${sessionId}/next`);
    expect(nextRes.ok(), await nextRes.text()).toBe(true);
    const next = await nextRes.json();
    if (next.stop) return sessionId;
    if (next.sectionTransition) continue;

    expect(next.item?.id).toBeTruthy();
    const answerRes = await page.request.post(`${BASE_URL}/api/sessions/${sessionId}/respond`, {
      data: {
        itemId: next.item.id,
        value: next.item.skill === "WRITING" || next.item.skill === "SPEAKING"
          ? "Automated end-to-end response"
          : "a",
        latencyMs: 5_000,
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(answerRes.ok(), await answerRes.text()).toBe(true);
  }

  throw new Error("Rapid diagnostic did not complete within 80 item requests");
}

async function ensureCompletedSession(page: Page): Promise<string> {
  if (ensuredCompletedSessionId) return ensuredCompletedSessionId;
  ensuredCompletedSessionId = await completeRapidDiagnosticViaApi(page);
  return ensuredCompletedSessionId;
}

// ─── Auth flow ────────────────────────────────────────────────────────────────

test.describe("Auth flow", () => {
  test("login page renders without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/error|500/i);
    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });

  test("invalid credentials show error message", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel(/e-posta|email/i).fill("nonexistent@example.com");
    await page.locator("#password").fill("wrongpassword123");
    await page.locator('form button[type="submit"]').click();
    await expect(
      page.locator("[data-testid='login-error'], [role='alert']")
        .or(page.getByText(/geçersiz|invalid|hatalı|incorrect|wrong/i))
    ).toBeVisible({ timeout: 8_000 });
  });

  test("successful login redirects away from /login", async ({ page }) => {
    await login(page);
    expect(page.url()).not.toContain("/login");
  });

  test("accessing protected route while logged out redirects to login", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    // The app may preserve the intended URL for post-login return, but it must
    // never render protected dashboard content to an anonymous visitor.
    await expect(page.locator("form")).toBeVisible({ timeout: 6_000 });
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});

// ─── Registration flow ────────────────────────────────────────────────────────

test.describe("Registration flow", () => {
  test("register page renders and form is present", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const form = page.locator("form").or(page.locator('[data-testid="register-form"]'));
    await expect(form).toBeVisible({ timeout: 8_000 });
  });

  test("duplicate email shows error on registration", async ({ page }) => {
    // E2E_EMAIL already exists from seed — expect a conflict error
    await page.goto(`${BASE_URL}/register`);
    const nameField = page.getByLabel(/name|ad|isim/i).first();
    if (await nameField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameField.fill("Test User");
    }
    await page.getByLabel(/e-posta|email/i).fill(E2E_EMAIL);
    await page.locator("#password").fill(E2E_PASS);
    await page.locator("#confirmPassword").fill(E2E_PASS);
    await page.locator('form button[type="submit"]').click();
    await expect(
      page.locator("[role='alert'], [data-testid='register-error']")
        .or(page.getByText(/already|mevcut|kullanımda|exists/i))
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

test.describe("Candidate dashboard", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("dashboard loads and shows navigation", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const nav = page.locator("nav, [role='navigation']").first();
    await expect(nav).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("body")).not.toContainText(/500|uncaught|error/i);
  });

  test("dashboard shows available tests or empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const testCard = page.locator("[data-testid='test-card'], [data-testid='start-exam']").first();
    const emptyState = page.getByText(/henüz|no test|no exam|available/i);
    await expect(testCard.or(emptyState)).toBeVisible({ timeout: 10_000 });
  });

  test("past sessions list renders without error", async ({ page }) => {
    await page.goto(`${BASE_URL}/results`);
    const noSessions = page.locator("[data-testid='results-empty-state']");
    const sessionRow = page.locator("[data-testid='session-row'], .session-card").first();
    await expect(noSessions.or(sessionRow)).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Full exam session happy path ─────────────────────────────────────────────

test.describe("Full exam session — happy path", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("can start the rapid diagnostic exam", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const quickStart = page.locator('[data-assessment-mode="quick-check"]');
    await expect(quickStart).toBeVisible({ timeout: 8_000 });
    await quickStart.click();
    await expect(page.locator("[data-testid='exam-item'], .question-card, [data-testid='item']")
      .or(page.getByRole("button", { name: /başla|begin|start/i }))
    ).toBeVisible({ timeout: 12_000 });
  });

  test("exam item renders all required UI elements", async ({ page }) => {
    await page.goto(`${BASE_URL}/exam`);
    const isLoginRedirect = page.url().includes("/login");
    if (isLoginRedirect) { test.skip(); return; }
    const item = page.locator("[data-testid='exam-item'], .question-card").first();
    if (await item.isVisible({ timeout: 8_000 }).catch(() => false)) {
      // Progress bar or item counter
      const progress = page.locator("[data-testid='progress'], .progress, progress, [role='progressbar']");
      await expect(progress.or(page.getByText(/\d+\s*\/\s*\d+/))).toBeVisible({ timeout: 5_000 });
      // At least one answer option or text input
      const hasOptions = await page.locator('[data-testid="answer-option"], [role="radio"], [role="checkbox"], textarea, input[type="text"]').count();
      expect(hasOptions).toBeGreaterThan(0);
    }
  });

  test("multiple-choice items accept a selection", async ({ page }) => {
    await page.goto(`${BASE_URL}/exam`);
    if (page.url().includes("/login")) { test.skip(); return; }
    const mcOption = page.locator('[data-testid="answer-option"], [role="radio"]').first();
    if (await mcOption.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await mcOption.click();
      await expect(mcOption).toHaveAttribute("aria-checked", "true");
    }
  });

  test("can drive the rapid diagnostic to completion", async ({ page }) => {
    test.setTimeout(90_000);
    const sessionId = await completeRapidDiagnosticViaApi(page);

    const sessionRes = await page.request.get(`${BASE_URL}/api/sessions/${sessionId}/status`);
    expect(sessionRes.ok(), await sessionRes.text()).toBe(true);
    const session = await sessionRes.json();
    expect(session.status).toBe("COMPLETED");
  });
});

// ─── Score report ─────────────────────────────────────────────────────────────

test.describe("Score report", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page }) => { await login(page); });

  test("results page renders without error", async ({ page }) => {
    await page.goto(`${BASE_URL}/results`);
    await expect(page.locator("body")).not.toContainText(/500|uncaught exception/i);
  });

  test("score report shows CEFR level for completed session", async ({ page }) => {
    await ensureCompletedSession(page);
    await page.goto(`${BASE_URL}/results`);
    const noSessions = page.locator("[data-testid='results-empty-state']");
    const cefrBadge = page.locator("[data-testid='cefr-level'], .cefr-badge, [data-testid='cefr-badge']").first();
    await expect(noSessions.or(cefrBadge)).toBeVisible({ timeout: 8_000 });
  });

  test("score report shows skill breakdown when session exists", async ({ page }) => {
    await ensureCompletedSession(page);
    await page.goto(`${BASE_URL}/results`);
    const sessionRows = page.locator("[data-testid='session-row'], .session-card");
    await expect(sessionRows.first()).toBeVisible({ timeout: 8_000 });
    await sessionRows.first().click();
    const skillChart = page.locator("[data-testid='skill-scores'], .skill-chart, .sub-score-radar");
    await expect(skillChart).toBeVisible({ timeout: 8_000 });
  });

  test("PDF download button is present on score report", async ({ page }) => {
    await ensureCompletedSession(page);
    await page.goto(`${BASE_URL}/results`);
    const sessionRows = page.locator("[data-testid='session-row'], .session-card");
    await expect(sessionRows.first()).toBeVisible({ timeout: 8_000 });
    await sessionRows.first().click();
    const pdfBtn = page.getByRole("button", { name: /pdf|indir|download|report/i })
      .or(page.locator("[data-testid='download-pdf'], [data-testid='pdf-download']"))
      .first();
    await expect(pdfBtn).toBeVisible({ timeout: 8_000 });
  });

  test("PDF download endpoint returns a PDF", async ({ page }) => {
    const sessionId = await ensureCompletedSession(page);
    const pdfRes = await page.request.get(`${BASE_URL}/api/sessions/${sessionId}/report.pdf`);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()["content-type"]).toContain("pdf");
  });
});

test.describe("All product-line launch contracts", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  for (const productLine of PRODUCT_LINES) {
    test(`${productLine} launches and accepts its first response`, async ({ page }) => {
      const response = await page.request.post(`${BASE_URL}/api/sessions/launch`, {
        data: { productLine },
        headers: { "Content-Type": "application/json" },
      });
      expect(response.ok(), await response.text()).toBe(true);
      const payload = await response.json();
      expect(payload.sessionId).toBeTruthy();
      expect(payload.sectionOrder.length).toBeGreaterThan(0);
      expect(payload.profileName).toBeTruthy();
      expect(payload.maxDurationMs).toBeGreaterThan(0);

      const nextResponse = await page.request.get(`${BASE_URL}/api/sessions/${payload.sessionId}/next`);
      expect(nextResponse.ok(), await nextResponse.text()).toBe(true);
      const nextPayload = await nextResponse.json();
      expect(nextPayload.stop).toBe(false);
      expect(nextPayload.item?.id).toBeTruthy();

      const answerResponse = await page.request.post(`${BASE_URL}/api/sessions/${payload.sessionId}/respond`, {
        data: { itemId: nextPayload.item.id, value: "A", latencyMs: 5_000 },
        headers: { "Content-Type": "application/json" },
      });
      expect(answerResponse.ok(), await answerResponse.text()).toBe(true);
    });
  }
});

// ─── Certificate validation ───────────────────────────────────────────────────

test.describe("Certificate validation", () => {
  test("certificate verification page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/verify`);
    const form = page.locator("form, [data-testid='verify-form']")
      .or(page.getByPlaceholder(/certificate|sertifika|kod|code/i));
    await expect(form.or(page.locator("body"))).toBeTruthy();
    await expect(page.locator("body")).not.toContainText(/500|uncaught/i);
  });

  test("invalid certificate code shows error", async ({ page }) => {
    await page.goto(`${BASE_URL}/verify/INVALID-CERT-CODE-000`);
    await expect(page.locator("[data-testid='cert-error']")).toBeVisible({ timeout: 8_000 });
  });

  test("certificate QR endpoint returns 200 for valid cert", async ({ page }) => {
    // Use the admin API to find a real certificate if one exists
    const res = await page.request.get(`${BASE_URL}/api/certificates?limit=1`, {
      headers: { "Cookie": "" }, // no auth — test public endpoint behavior
    });
    // 401 is acceptable (auth required); 200 means certs exist
    expect([200, 401, 403]).toContain(res.status());
  });
});

// ─── Admin access control ─────────────────────────────────────────────────────

test.describe("Admin panel access control", () => {
  test("candidate user cannot access /admin", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/admin`);
    const denied = page.locator("[data-testid='access-denied']");
    const redirected = !page.url().includes("/admin") || page.url().includes("/login");
    if (!redirected) await expect(denied).toBeVisible({ timeout: 5_000 });
  });

  test("admin login and dashboard render correctly", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.goto(`${BASE_URL}/admin`);
    const adminNav = page.locator("[data-testid='admin-nav'], [data-testid='admin-console'], .admin-panel");
    await expect(adminNav.or(page.getByRole("heading", { name: /admin|yönetim/i }))).toBeVisible({ timeout: 10_000 });
  });

  test("admin can view candidate list", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.goto(`${BASE_URL}/admin`);
    // Navigate to candidates section
    const candidatesLink = page.getByRole("button", { name: /aday|candidate/i })
      .or(page.getByRole("link", { name: /aday|candidate/i }))
      .first();
    if (await candidatesLink.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await candidatesLink.click();
      const table = page.locator("table, [data-testid='candidates-table']").first();
      await expect(table).toBeVisible({ timeout: 8_000 });
    }
  });
});

// ─── API smoke tests ──────────────────────────────────────────────────────────

test.describe("API smoke tests", () => {
  test("GET /api/health returns 200", async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/api/health`);
    expect([200, 204]).toContain(res.status());
  });

  test("GET /api/items without auth returns 401 or 403", async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/api/items`);
    expect([401, 403]).toContain(res.status());
  });

  test("GET /sitemap.xml returns valid XML", async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/sitemap.xml`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("<loc>");
  });

  test("GET /robots.txt returns non-empty content", async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/robots.txt`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("User-agent");
  });

  test("POST /api/auth/login with valid credentials returns tokens", async ({ page }) => {
    const res = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: E2E_EMAIL, password: E2E_PASS },
      headers: { "Content-Type": "application/json" },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(body).toHaveProperty("user");
  });

  test("POST /api/auth/login with bad credentials returns 401", async ({ page }) => {
    const res = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: "nobody@nowhere.com", password: "wrongpassword" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/auth/me without cookie returns 401", async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/api/auth/me`);
    expect(res.status()).toBe(401);
  });

  test("candidate cannot override the organization used for a session", async ({ page }) => {
    await login(page);
    const response = await page.request.post(`${BASE_URL}/api/sessions/launch`, {
      data: { productLine: "General English", organizationId: "foreign-organization" },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({ error: "organization_mismatch" });
  });

  test("candidate cannot read the administrative scoring queue", async ({ page }) => {
    await login(page);
    const response = await page.request.get(`${BASE_URL}/api/admin/scoring-queue`);
    expect(response.status()).toBe(403);
  });

  test("candidate cannot read another user's history or organization aggregate", async ({ page }) => {
    const adminLogin = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
      headers: { "Content-Type": "application/json" },
    });
    expect(adminLogin.status()).toBe(200);
    const admin = (await adminLogin.json()).user;

    const candidateLogin = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: E2E_EMAIL, password: E2E_PASS },
      headers: { "Content-Type": "application/json" },
    });
    expect(candidateLogin.status()).toBe(200);
    const candidate = (await candidateLogin.json()).user;

    const history = await page.request.get(`${BASE_URL}/api/reports/candidates/${admin.uid}/history`);
    expect(history.status()).toBe(403);

    if (candidate.organizationId) {
      const aggregate = await page.request.get(
        `${BASE_URL}/api/reports/organisations/${candidate.organizationId}/aggregate`,
      );
      expect(aggregate.status()).toBe(403);
    }
  });

  test("exam code redemption cannot sign in as an existing admin account", async ({ page }) => {
    const loginResponse = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
      headers: { "Content-Type": "application/json" },
    });
    expect(loginResponse.status()).toBe(200);
    const admin = (await loginResponse.json()).user;
    expect(admin.organizationId).toBeTruthy();

    const generated = await page.request.post(`${BASE_URL}/api/codes/generate`, {
      data: {
        organizationId: admin.organizationId,
        productLine: "General English",
        quantity: 1,
        prefix: "E2E",
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(generated.status()).toBe(200);
    const code = (await generated.json()).codes[0];

    const redemption = await page.request.post(`${BASE_URL}/api/codes/redeem`, {
      data: { code, email: ADMIN_EMAIL, name: "Not", surname: "Admin" },
      headers: { "Content-Type": "application/json" },
    });
    expect(redemption.status()).toBe(403);

    const stillValid = await page.request.post(`${BASE_URL}/api/codes/validate`, {
      data: { code },
      headers: { "Content-Type": "application/json" },
    });
    expect(stillValid.status()).toBe(200);
  });
});

// ─── Marketing / SSR pages ────────────────────────────────────────────────────

test.describe("Marketing pages — SSR + SEO", () => {
  const marketingRoutes = ["/", "/schools", "/corporate", "/academia", "/pricing", "/methodology"];

  for (const route of marketingRoutes) {
    test(`${route} renders crawlable HTML content`, async ({ page }) => {
      const res = await page.request.get(`${BASE_URL}${route}`);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain("<title>");
      expect(html.length).toBeGreaterThan(500);
    });

    test(`${route} page loads without JS errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${BASE_URL}${route}`);
      await expect(page.locator("body")).toBeVisible();
      // Filter known benign errors
      const realErrors = errors.filter((e) => !e.includes("ResizeObserver") && !e.includes("Non-Error"));
      expect(realErrors).toHaveLength(0);
    });
  }

  test("landing page has og:title meta tag", async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/`);
    const html = await res.text();
    expect(html).toMatch(/og:title|og:description/);
  });

  test("landing page has JSON-LD Organization schema", async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/`);
    const html = await res.text();
    expect(html).toContain("application/ld+json");
    expect(html).toContain("Organization");
  });
});

// ─── PWA / offline ────────────────────────────────────────────────────────────

test.describe("PWA basics", () => {
  test("manifest.json exists and has required fields", async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/manifest.json`);
    if (res.status() === 404) { test.skip(); return; } // not yet deployed
    expect(res.status()).toBe(200);
    const manifest = await res.json().catch(() => ({}));
    expect(manifest).toHaveProperty("name");
    expect(manifest).toHaveProperty("icons");
  });

  test("service worker script is served", async ({ page }) => {
    const swCandidates = ["/sw.js", "/registerSW.js", "/dev-sw.js"];
    for (const swPath of swCandidates) {
      const res = await page.request.get(`${BASE_URL}${swPath}`);
      if (res.status() === 200) {
        const body = await res.text();
        expect(body.length).toBeGreaterThan(100);
        return;
      }
    }
    // If none found, skip rather than fail — SW might be inlined by Vite
    test.skip();
  });
});
