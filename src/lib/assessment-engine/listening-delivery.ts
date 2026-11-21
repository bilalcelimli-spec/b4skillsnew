/**
 * Listening delivery rules that must hold for every candidate.
 *
 * How often a recording may be heard is part of the item's measurement
 * condition, so the count lives on the server: the browser asks before each
 * play and a reload cannot hand the plays back. Counts are kept per recording
 * in `Session.metadata.audioPlays` (the questions of one recording share them)
 * and copied onto the Response when it is saved.
 */

import { prisma } from "../prisma";
import { passageKey } from "./passage-cap.js";

/**
 * Key under which plays are counted: the recording (script hash), so the two
 * questions of one recording share one budget; the item id when it has no script.
 */
export function audioPlayKey(item: { id: string; metadata?: unknown }): string {
  const key = passageKey({ metadata: item.metadata } as Parameters<typeof passageKey>[0]);
  return key ? `rec:${key}` : item.id;
}

/**
 * Plays allowed per recording, shared by its questions: two up to A2 and for
 * young learners (as in Cambridge A2 Key and YLE), one from B1 (as in IELTS,
 * TOEFL and PTE). A question with no level keeps two.
 * Changing this changes item difficulty — recalibrate the levels it touches.
 */
export const LISTENING_PLAYS = { lower: 2, upper: 1 } as const;
const TWO_PLAY_LEVELS = new Set(["PRE_A1", "A1", "A2"]);

/** Play limit for a question of this level; `youngLearners` (profile for ages up to 10) always gets two. */
export function listeningMaxPlays(cefrLevel: unknown, youngLearners = false): number {
  const level = typeof cefrLevel === "string" ? cefrLevel.trim().toUpperCase().replace(/[\s-]+/g, "_") : "";
  return youngLearners || !level || TWO_PLAY_LEVELS.has(level) ? LISTENING_PLAYS.lower : LISTENING_PLAYS.upper;
}

/** Whether a product line is for young learners (ages up to 10). */
export function isYoungLearnerProfile(profile: { ageRange?: [number, number] } | null | undefined): boolean {
  return !!profile?.ageRange && profile.ageRange[1] <= 10;
}

export interface AudioPlayGrant {
  allowed: boolean;
  playsUsed: number;
  maxPlays: number;
}

/** Plays already used under a key (audioPlayKey), read from session metadata. */
export function audioPlaysUsed(metadata: unknown, key: string): number {
  const plays = (metadata as { audioPlays?: Record<string, unknown> } | null | undefined)?.audioPlays;
  const used = Number(plays?.[key]);
  return Number.isInteger(used) && used > 0 ? used : 0;
}

/** Candidate-facing playback policy sent with a listening item. */
export function audioPolicy(metadata: unknown, key: string, maxPlays: number) {
  return { maxPlays, playsUsed: Math.min(maxPlays, audioPlaysUsed(metadata, key)) };
}

/**
 * Count one play under a key (audioPlayKey), atomically. Returns `allowed: false`
 * (and the unchanged count) once the limit is reached or the session is not running.
 */
export async function registerAudioPlay(
  sessionId: string,
  key: string,
  maxPlays: number,
  db: Pick<typeof prisma, "$queryRaw" | "session"> = prisma,
): Promise<AudioPlayGrant> {
  const rows = await db.$queryRaw<Array<{ used: number }>>`
    UPDATE "Session" SET metadata = jsonb_set(
      jsonb_set(COALESCE(metadata, '{}'::jsonb), '{audioPlays}', COALESCE(metadata->'audioPlays', '{}'::jsonb)),
      ARRAY['audioPlays', ${key}::text],
      to_jsonb(COALESCE((metadata->'audioPlays'->>${key}::text)::int, 0) + 1))
    WHERE id = ${sessionId} AND status = 'IN_PROGRESS'
      AND COALESCE((metadata->'audioPlays'->>${key}::text)::int, 0) < ${maxPlays}
    RETURNING (metadata->'audioPlays'->>${key}::text)::int AS used
  `;
  if (rows.length > 0) return { allowed: true, playsUsed: Number(rows[0].used), maxPlays };
  const session = await db.session.findUnique({ where: { id: sessionId }, select: { metadata: true } });
  return { allowed: false, playsUsed: audioPlaysUsed(session?.metadata, key), maxPlays };
}

/** Where a recording is fetched from on the server: a file under /audio/ or the project's own storage host. */
export type AudioSource = { kind: "local"; file: string } | { kind: "remote"; url: string };

/** The stored address of a recording, when the session audio route can serve it; null otherwise. */
export function audioSource(audioUrl: unknown, storageUrl = process.env.SUPABASE_URL): AudioSource | null {
  if (typeof audioUrl !== "string") return null;
  const local = /^\/audio\/([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(audioUrl);
  if (local) return local[1].includes("..") ? null : { kind: "local", file: local[1] };
  try {
    const url = new URL(audioUrl);
    if (url.protocol !== "https:" || !storageUrl || url.host !== new URL(storageUrl).host) return null;
    return url.pathname.startsWith("/storage/v1/object/public/") ? { kind: "remote", url: url.href } : null;
  } catch {
    return null;
  }
}

/** Address the candidate's browser uses: valid only for the owner while the item is on screen. */
export function sessionAudioUrl(sessionId: string, itemId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/audio/${encodeURIComponent(itemId)}`;
}

/**
 * Replace the stored recording address in candidate content with the session
 * route, so the file name and storage location never reach the browser.
 * Addresses the route cannot serve are left as they are.
 */
export function withSessionAudio<T>(content: T, sessionId: string, itemId: string): T {
  if (!content || typeof content !== "object" || Array.isArray(content)) return content;
  const audioUrl = (content as Record<string, unknown>).audioUrl;
  return audioSource(audioUrl) ? { ...content, audioUrl: sessionAudioUrl(sessionId, itemId) } : content;
}
