/**
 * Data retention periods — the single source for code, the privacy policy
 * (src/components/LegalPage.tsx) and the retention sweep. Release policy 2026-11-04.
 * Changing a value here changes what the published policy promises: update both.
 */
export const RETENTION = {
  /** Answers and results are deleted after this period. */
  resultsYears: 2,
  /** Speaking audio inside responses. */
  audioDays: 30,
  /** Audio still waiting for human rating or async AI scoring is kept until then, at most this long. */
  audioMaxDaysWithOpenReview: 60,
  /** Camera evidence (native baseline photo, web frames, web identity snapshot) unless the tenant sets 1–30. */
  cameraDefaultDays: 7,
  cameraMaxDays: 30,
} as const;

const DAY_MS = 86_400_000;
export const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);
export function yearsAgo(now: Date, years: number) {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d;
}
