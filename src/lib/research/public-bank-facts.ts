/**
 * Item bank facts that are safe to put in server-rendered HTML for search
 * engines and AI assistants: how many items are active and how they spread
 * over CEFR levels and skills. Usage figures (sessions, SEM, reliability)
 * are deliberately not part of this — the Research page loads them in the
 * browser after it renders.
 */
import { serializeJsonLd } from "../site/seo-serialization";

export interface PublicBankFacts {
  year: number;
  totalActive: number;
  cefr: Record<string, number>;
  skills: Record<string, number>;
}

/** Data the server renders a public page with; the browser hydrates with the same object. */
export interface PublicPageData {
  researchBank?: PublicBankFacts;
}

export function rollUpBankFacts(
  rows: ReadonlyArray<{ cefrLevel: string | null; skill: string | null; _count: { id: number } }>,
  year: number,
): PublicBankFacts {
  const cefr: Record<string, number> = {};
  const skills: Record<string, number> = {};
  let totalActive = 0;
  for (const row of rows) {
    const level = row.cefrLevel ?? "Unknown";
    const skill = row.skill ?? "Unknown";
    cefr[level] = (cefr[level] ?? 0) + row._count.id;
    skills[skill] = (skills[skill] ?? 0) + row._count.id;
    totalActive += row._count.id;
  }
  return { year, totalActive, cefr, skills };
}

const GLOBAL_NAME = "__B4_PAGE_DATA__";

/** The inline script that hands the server's page data to the browser. */
export function pageDataScript(data: PublicPageData): string {
  return `<script>window.${GLOBAL_NAME}=${serializeJsonLd(data)}</script>`;
}

/** Page data the server embedded, or an empty object (no server render, or not in a browser). */
export function readPageData(): PublicPageData {
  if (typeof window === "undefined") return {};
  const data = (window as unknown as Record<string, unknown>)[GLOBAL_NAME];
  return data && typeof data === "object" ? (data as PublicPageData) : {};
}
