/**
 * Moodle LMS Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Bridges LinguAdapt ↔ Moodle via:
 *
 *   1. LTI 1.3 launch (handled by shared lti-service)
 *   2. Moodle Web Services REST API — grade passback, user provisioning
 *   3. AGS-compatible score submission (same as Canvas but Moodle-flavoured)
 *
 * Moodle WS Docs: https://docs.moodle.org/dev/Web_services
 *
 * Environment variables:
 *   MOODLE_BASE_URL  — e.g. https://moodle.university.edu
 *   MOODLE_WS_TOKEN  — Moodle Web Service token (REST)
 */

import https from "https";
import { URL }  from "url";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MoodleConfig {
  baseUrl:  string;
  wsToken:  string;
}

export interface MoodleUser {
  id:          number;
  username:    string;
  firstname:   string;
  lastname:    string;
  email:       string;
  idnumber:    string;
}

export interface MoodleCourseUser {
  id:       number;
  fullname: string;
  email:    string;
  roles:    Array<{ roleid: number; name: string }>;
}

export interface MoodleGradeItem {
  id:           number;
  courseid:     number;
  itemname:     string;
  grademax:     number;
  grademin:     number;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function moodleWsCall<T = any>(cfg: MoodleConfig, wsFunction: string, params: Record<string, any> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({
      wstoken:       cfg.wsToken,
      wsfunction:    wsFunction,
      moodlewsrestformat: "json",
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });
    const qsStr = qs.toString();
    const u = new URL(`/webservice/rest/server.php`, cfg.baseUrl);
    const req = https.request(
      {
        hostname: u.hostname,
        port:     u.port || 443,
        path:     u.pathname + "?" + qsStr,
        method:   "GET",
        headers:  { Accept: "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed?.exception) reject(new Error(`Moodle WS error: ${parsed.message}`));
            else resolve(parsed as T);
          } catch { reject(new Error(`Invalid Moodle response: ${data.slice(0, 200)}`)); }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

// Helper for POST-based WS calls (grade updates need POST)
function moodleWsPost<T = any>(cfg: MoodleConfig, wsFunction: string, params: Record<string, any> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      wstoken:                cfg.wsToken,
      wsfunction:             wsFunction,
      moodlewsrestformat:     "json",
      ...flattenForMoodle(params),
    }).toString();
    const u = new URL("/webservice/rest/server.php", cfg.baseUrl);
    const req = https.request(
      {
        hostname: u.hostname,
        port:     u.port || 443,
        path:     u.pathname,
        method:   "POST",
        headers:  {
          "Content-Type":   "application/x-www-form-urlencoded",
          Accept:           "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed?.exception) reject(new Error(`Moodle WS error: ${parsed.message}`));
            else resolve(parsed as T);
          } catch { reject(new Error(`Invalid Moodle response: ${data.slice(0, 200)}`)); }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/** Flatten nested objects into Moodle's indexed array notation: grades[0][userid]=1 */
function flattenForMoodle(obj: any, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, idx) => {
        if (typeof item === "object") {
          Object.assign(result, flattenForMoodle(item, `${key}[${idx}]`));
        } else {
          result[`${key}[${idx}]`] = String(item);
        }
      });
    } else if (v !== null && typeof v === "object") {
      Object.assign(result, flattenForMoodle(v, key));
    } else {
      result[key] = String(v);
    }
  }
  return result;
}

// ── Moodle Adapter ────────────────────────────────────────────────────────────

export class MoodleAdapter {
  constructor(private cfg: MoodleConfig) {}

  /** Get enrolled users in a course */
  async getCourseRoster(courseId: number): Promise<MoodleCourseUser[]> {
    return moodleWsCall<MoodleCourseUser[]>(this.cfg, "core_enrol_get_enrolled_users", {
      courseid: courseId,
    });
  }

  /** Get a user by email */
  async getUserByEmail(email: string): Promise<MoodleUser | null> {
    const users = await moodleWsCall<MoodleUser[]>(this.cfg, "core_user_get_users_by_field", {
      field: "email",
      "values[0]": email,
    });
    return users?.[0] ?? null;
  }

  /** Submit grade via Moodle gradebook (core_grades_update_grades) */
  async submitGrade(opts: {
    courseid:        number;
    component:       string;    // "mod_assign"
    activityId:      number;
    userId:          number;
    rawgrade:        number;    // 0–100
    feedback?:       string;
  }): Promise<void> {
    await moodleWsPost(this.cfg, "core_grades_update_grades", {
      source:     "lingadapt",
      courseid:   opts.courseid,
      component:  opts.component,
      activityid: opts.activityId,
      "grades[0][studentid]":  opts.userId,
      "grades[0][rawgrade]":   opts.rawgrade,
      "grades[0][feedback]":   opts.feedback ?? "",
      "grades[0][feedbackformat]": 1,
    });
  }

  /**
   * AGS-compatible grade passback.
   * Wraps submitGrade for callers that have an AGS lineItemUrl context.
   */
  async agsGradePassback(opts: {
    courseId:      number;
    assignmentId:  number;
    moodleUserId:  number;
    score:         number;  // 0–1
    maxScore?:     number;  // default 100
    comment?:      string;
  }): Promise<void> {
    const max     = opts.maxScore ?? 100;
    const rawGrade = Math.round(opts.score * max);
    await this.submitGrade({
      courseid:   opts.courseId,
      component:  "mod_assign",
      activityId: opts.assignmentId,
      userId:     opts.moodleUserId,
      rawgrade:   rawGrade,
      feedback:   opts.comment,
    });
  }

  /** Provision (create) a new Moodle user */
  async createUser(user: {
    username:  string;
    firstname: string;
    lastname:  string;
    email:     string;
    password:  string;  // temporary
  }): Promise<MoodleUser> {
    const result = await moodleWsPost<{ id: number }[]>(this.cfg, "core_user_create_users", {
      "users[0][username]":  user.username,
      "users[0][firstname]": user.firstname,
      "users[0][lastname]":  user.lastname,
      "users[0][email]":     user.email,
      "users[0][password]":  user.password,
      "users[0][auth]":      "manual",
    });
    return moodleWsCall<MoodleUser>(this.cfg, "core_user_get_users_by_field", {
      field: "id", "values[0]": result[0].id,
    }).then((arr: any) => arr[0]);
  }
}

/** Factory — creates a MoodleAdapter from env or explicit config */
export function createMoodleAdapter(cfg?: Partial<MoodleConfig>): MoodleAdapter {
  return new MoodleAdapter({
    baseUrl: cfg?.baseUrl ?? process.env.MOODLE_BASE_URL ?? "",
    wsToken: cfg?.wsToken ?? process.env.MOODLE_WS_TOKEN ?? "",
  });
}
