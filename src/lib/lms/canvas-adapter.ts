/**
 * Canvas LMS Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Bridges LinguAdapt ↔ Canvas LMS via:
 *
 *   1. LTI 1.3 launch (handled by the shared lti-service)
 *   2. Canvas REST API — grade passback, roster sync, assignment creation
 *   3. Outcome Service v2 (AGS) score submission
 *
 * Canvas API Docs: https://canvas.instructure.com/doc/api/
 *
 * Environment variables needed:
 *   CANVAS_BASE_URL     — e.g. https://canvas.institution.edu
 *   CANVAS_ACCESS_TOKEN — Teacher / Admin OAuth token for bootstrapping
 */

import https from "https";
import { URL }  from "url";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CanvasConfig {
  baseUrl:     string;  // https://canvas.example.edu
  accessToken: string;  // Canvas OAuth2 or Developer token
}

export interface CanvasUser {
  id:             number;
  name:           string;
  email:          string;
  login_id:       string;
  enrollment_type?: string;
}

export interface CanvasAssignment {
  id:          number;
  name:        string;
  points_possible: number;
  external_tool_tag_attributes?: { url: string; new_tab: boolean };
}

export interface CanvasSubmission {
  id:                 number;
  user_id:            number;
  assignment_id:      number;
  score:              number | null;
  grade:              string | null;
  submitted_at:       string | null;
  workflow_state:     string;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function canvasRequest<T = any>(
  config: CanvasConfig,
  method: string,
  path:   string,
  body?:  object,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const u = new URL(path, config.baseUrl);
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: u.hostname,
        port:     u.port || 443,
        path:     u.pathname + u.search,
        method,
        headers: {
          Authorization:  `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
          Accept:         "application/json",
          ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Canvas API ${res.statusCode}: ${JSON.stringify(parsed).slice(0, 200)}`));
            } else {
              resolve(parsed as T);
            }
          } catch { reject(new Error(`Invalid JSON from Canvas: ${data.slice(0, 200)}`)); }
        });
      },
    );
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Canvas Adapter ────────────────────────────────────────────────────────────

export class CanvasAdapter {
  constructor(private cfg: CanvasConfig) {}

  /** List all enrolled students for a course */
  async getCourseRoster(courseId: string | number): Promise<CanvasUser[]> {
    return canvasRequest<CanvasUser[]>(
      this.cfg,
      "GET",
      `/api/v1/courses/${courseId}/enrollments?type[]=StudentEnrollment&per_page=100`,
    );
  }

  /** Get a specific assignment */
  async getAssignment(courseId: string | number, assignmentId: string | number): Promise<CanvasAssignment> {
    return canvasRequest<CanvasAssignment>(this.cfg, "GET", `/api/v1/courses/${courseId}/assignments/${assignmentId}`);
  }

  /** Create an External Tool assignment linked to LinguAdapt */
  async createLtiAssignment(
    courseId:    string | number,
    name:        string,
    pointsPossible: number,
    launchUrl:   string,
  ): Promise<CanvasAssignment> {
    return canvasRequest<CanvasAssignment>(this.cfg, "POST", `/api/v1/courses/${courseId}/assignments`, {
      assignment: {
        name,
        points_possible:              pointsPossible,
        submission_types:             ["external_tool"],
        external_tool_tag_attributes: { url: launchUrl, new_tab: true },
        published:                    true,
      },
    });
  }

  /**
   * Submit a score via AGS (Assignment and Grade Services).
   * `lineItemUrl` comes from the LTI launch ags.lineitemUrl claim.
   * `score` is 0–1 (normalised).
   */
  async agsGradePassback(
    lineItemUrl: string,
    userId:      string,  // LTI sub (platform user_id)
    score:       number,  // 0.0 to 1.0
    pointsPossible: number,
    comment?:    string,
  ): Promise<void> {
    const scoreUrl = lineItemUrl.endsWith("/") ? `${lineItemUrl}scores` : `${lineItemUrl}/scores`;
    const u = new URL(scoreUrl);
    const body = JSON.stringify({
      scoreMaximum:   pointsPossible,
      scoreGiven:     score * pointsPossible,
      comment,
      userId,
      activityProgress: "Completed",
      gradingProgress:  "FullyGraded",
      timestamp:        new Date().toISOString(),
    });
    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          hostname: u.hostname,
          port:     u.port || 443,
          path:     u.pathname + u.search,
          method:   "POST",
          headers:  {
            Authorization:  `Bearer ${this.cfg.accessToken}`,
            "Content-Type": "application/vnd.ims.lis.v1.score+json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (c) => { data += c; });
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`AGS passback failed ${res.statusCode}: ${data.slice(0, 200)}`));
            } else { resolve(); }
          });
        },
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  /** Update a submission grade directly via Canvas API (fallback when AGS unavailable) */
  async updateSubmissionGrade(
    courseId:     string | number,
    assignmentId: string | number,
    studentId:    string | number,
    score:        number,
    pointsPossible: number,
  ): Promise<CanvasSubmission> {
    return canvasRequest<CanvasSubmission>(
      this.cfg,
      "PUT",
      `/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${studentId}`,
      { submission: { posted_grade: score * pointsPossible } },
    );
  }
}

/** Factory — creates a CanvasAdapter from env or explicit config */
export function createCanvasAdapter(cfg?: Partial<CanvasConfig>): CanvasAdapter {
  return new CanvasAdapter({
    baseUrl:     cfg?.baseUrl     ?? process.env.CANVAS_BASE_URL     ?? "",
    accessToken: cfg?.accessToken ?? process.env.CANVAS_ACCESS_TOKEN ?? "",
  });
}
