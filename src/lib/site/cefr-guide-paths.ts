/**
 * Paths of the CEFR guide section, without any guide content. Routing,
 * analytics and the app entry import this module so the guide text (several
 * tens of KB) stays in the guide page's own chunk. Guide content lives in
 * cefr-guides.ts / cefr-guides-tr.ts and must use the same slugs.
 */
export type GuideLang = "en" | "tr";

/** Level slugs in order, A1 to C2. */
export const LEVEL_SLUGS = ["a1", "a2", "b1", "b2", "c1", "c2"] as const;

/** Hub and exam comparison paths for each language. */
export const GUIDE_SECTION_PATHS: Record<GuideLang, { hub: string; comparison: string }> = {
  en: { hub: "/cefr-levels", comparison: "/cefr-levels/exam-comparison" },
  tr: { hub: "/cefr-seviyeleri", comparison: "/cefr-seviyeleri/sinav-karsilastirma" },
};
export const CEFR_GUIDE_HUB_PATH = GUIDE_SECTION_PATHS.en.hub;
export const CEFR_EXAM_COMPARISON_PATH = GUIDE_SECTION_PATHS.en.comparison;

const LANGS = Object.keys(GUIDE_SECTION_PATHS) as GuideLang[];

/** Every guide page path, both languages. */
export const CEFR_GUIDE_PATHS: readonly string[] = LANGS.flatMap((lang) => [
  GUIDE_SECTION_PATHS[lang].hub,
  ...LEVEL_SLUGS.map((slug) => `${GUIDE_SECTION_PATHS[lang].hub}/${slug}`),
  GUIDE_SECTION_PATHS[lang].comparison,
]);

/** The guide section a path belongs to, if any. */
export function guideLangForPath(path: string): GuideLang | undefined {
  return LANGS.find((lang) => {
    const hub = GUIDE_SECTION_PATHS[lang].hub;
    return path === hub || path.startsWith(`${hub}/`);
  });
}
export const isCefrGuidePath = (path: string) => guideLangForPath(path) !== undefined;

/** Public marketing pages written in Turkish (consent text and similar UI follow the page). */
export function isTurkishMarketingPath(path: string): boolean {
  return path === "/ingilizce-seviye-testi" || guideLangForPath(path) === "tr";
}
