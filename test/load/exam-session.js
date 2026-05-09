/**
 * k6 Load Test — Adaptive Exam Session
 *
 * Simulates concurrent exam sessions hitting the assessment API.
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 * Run:        k6 run test/load/exam-session.js
 * Run (CI):   k6 run --vus 50 --duration 60s test/load/exam-session.js
 *
 * Environment variables:
 *   K6_BASE_URL  - defaults to http://localhost:3000
 *   K6_EMAIL     - test user e-mail
 *   K6_PASSWORD  - test user password
 *
 * Thresholds (production targets):
 *   - p95 response time < 500ms for item selection
 *   - p99 response time < 2000ms for AI scoring endpoint
 *   - Error rate < 1% overall
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ─── Configuration ─────────────────────────────────────────────────────────

const BASE_URL = __ENV.K6_BASE_URL ?? "http://localhost:3000";
const EMAIL = __ENV.K6_EMAIL ?? "loadtest@b4skills.test";
const PASSWORD = __ENV.K6_PASSWORD ?? "LoadTest!2026";

// ─── Custom metrics ────────────────────────────────────────────────────────

const itemSelectionTime = new Trend("item_selection_ms", true);
const scoringTime = new Trend("scoring_ms", true);
const errorRate = new Rate("error_rate");

// ─── Thresholds ────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    // Steady-state load: 20 concurrent virtual users for 60 seconds
    steady: {
      executor: "constant-vus",
      vus: 20,
      duration: "60s",
      tags: { scenario: "steady" },
    },
    // Spike: burst to 100 VUs for 10 seconds (after warm-up)
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 },
        { duration: "10s", target: 0 },
      ],
      startTime: "65s",
      tags: { scenario: "spike" },
    },
  },
  thresholds: {
    // Overall HTTP request p95 < 500ms
    http_req_duration: ["p(95)<500", "p(99)<2000"],
    // Item selection endpoint specifically
    item_selection_ms: ["p(95)<300"],
    // Scoring endpoint (AI can be slower)
    scoring_ms: ["p(99)<3000"],
    // Error rate < 1%
    error_rate: ["rate<0.01"],
    // All checks pass
    checks: ["rate>0.99"],
  },
};

// ─── Auth helper ───────────────────────────────────────────────────────────

function authenticate() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(res, {
    "login 200": (r) => r.status === 200,
    "login has token": (r) => {
      try {
        return !!JSON.parse(r.body).token;
      } catch {
        return false;
      }
    },
  });
  if (res.status !== 200) {
    errorRate.add(1);
    return null;
  }
  try {
    return JSON.parse(res.body).token;
  } catch {
    return null;
  }
}

// ─── Main scenario ─────────────────────────────────────────────────────────

export default function () {
  const token = authenticate();
  if (!token) {
    sleep(1);
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 1. Start a new exam session
  const sessionRes = http.post(
    `${BASE_URL}/api/sessions`,
    JSON.stringify({ skill: "READING" }),
    { headers }
  );
  const sessionOk = check(sessionRes, {
    "session created (200/201)": (r) => r.status === 200 || r.status === 201,
    "session has id": (r) => {
      try {
        return !!JSON.parse(r.body).id;
      } catch {
        return false;
      }
    },
  });
  if (!sessionOk) {
    errorRate.add(1);
    sleep(1);
    return;
  }
  errorRate.add(0);

  let sessionId;
  try {
    sessionId = JSON.parse(sessionRes.body).id;
  } catch {
    sleep(1);
    return;
  }

  // 2. Simulate 5–8 item answers per virtual user session
  const itemCount = Math.floor(Math.random() * 4) + 5; // 5–8 items

  for (let i = 0; i < itemCount; i++) {
    // Fetch next item
    const itemStart = Date.now();
    const nextItemRes = http.get(
      `${BASE_URL}/api/sessions/${sessionId}/next-item`,
      { headers }
    );
    itemSelectionTime.add(Date.now() - itemStart);

    const itemOk = check(nextItemRes, {
      "next item 200": (r) => r.status === 200,
      "next item has content": (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!(body.item || body.done);
        } catch {
          return false;
        }
      },
    });

    if (!itemOk) {
      errorRate.add(1);
      break;
    }
    errorRate.add(0);

    let itemBody;
    try {
      itemBody = JSON.parse(nextItemRes.body);
    } catch {
      break;
    }

    if (itemBody.done) break; // Session complete

    const itemId = itemBody.item?.id;
    if (!itemId) break;

    // Submit a random answer (score 0 or 1)
    const score = Math.random() > 0.4 ? 1 : 0;
    const answerStart = Date.now();
    const answerRes = http.post(
      `${BASE_URL}/api/sessions/${sessionId}/respond`,
      JSON.stringify({
        itemId,
        score,
        latencyMs: Math.floor(Math.random() * 8000) + 3000, // 3–11 seconds
      }),
      { headers }
    );
    scoringTime.add(Date.now() - answerStart);

    const answerOk = check(answerRes, {
      "answer accepted (200/204)": (r) => r.status === 200 || r.status === 204,
    });
    if (!answerOk) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }

    // Realistic inter-item think time: 3–10 seconds
    sleep(Math.random() * 7 + 3);
  }

  // 3. Finalize session
  const finalRes = http.post(
    `${BASE_URL}/api/sessions/${sessionId}/finalize`,
    null,
    { headers }
  );
  check(finalRes, {
    "session finalized": (r) => r.status === 200 || r.status === 204,
  });

  sleep(1);
}
