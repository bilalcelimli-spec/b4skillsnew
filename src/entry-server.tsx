/**
 * SSR entry point — public pages only.
 * Auth-required routes stay CSR; public marketing and legal routes get renderToString.
 * Called from server.ts in both dev (vite.ssrLoadModule) and prod (dynamic import).
 *
 * The tree comes from the same builder App.tsx uses (src/public-pages.tsx), so
 * the browser can hydrate this HTML without changing it.
 */
import React from "react";
import { renderToString } from "react-dom/server";

// Marketing page imports — all SSR-safe (browser APIs wrapped in useEffect/callbacks)
import { LandingPage } from "./components/LandingPage";
import { PricingPage } from "./components/PricingPage";
import { MethodologyPage } from "./components/MethodologyPage";
import { AccessibilityStatementPage } from "./components/AccessibilityStatementPage";
import { ResearchPage } from "./components/ResearchPage";
import { SchoolsPage } from "./components/SchoolsPage";
import { CorporatePage } from "./components/CorporatePage";
import { AcademiaPage } from "./components/AcademiaPage";
import { LanguageSchoolsPage } from "./components/LanguageSchoolsPage";
import { SeoLandingPage } from "./components/SeoLandingPage";
import { CefrGuidePage } from "./components/CefrGuidePage";
import { CEFR_GUIDE_PATHS } from "./lib/site/cefr-guides";
import { DomProviders, LEGAL_ROUTES, SEO_PATHS, publicLegalElement, publicMarketingElement, type PublicPageComponents } from "./public-pages";
import type { PublicPageData } from "./lib/research/public-bank-facts";

export interface SSRResult {
  html: string;
  didSSR: boolean;
}

const NOOP = () => {};

export const EAGER_PUBLIC_PAGES: PublicPageComponents = {
  LandingPage, PricingPage, MethodologyPage, AccessibilityStatementPage, ResearchPage,
  SchoolsPage, AcademiaPage, CorporatePage, LanguageSchoolsPage, SeoLandingPage, CefrGuidePage,
};

/** Paths the server renders. Each must also be in server.ts SSR_PATHS. */
export const SSR_RENDERED_PATHS: readonly string[] = [
  ...Object.keys(LEGAL_ROUTES), "/verify",
  "/", "/pricing", "/methodology", "/accessibility-statement", "/research",
  "/schools", "/corporate", "/academia", "/language-schools",
  ...Object.keys(SEO_PATHS), ...CEFR_GUIDE_PATHS,
];

/** The first browser render of a signed-out visitor: no user known yet, analytics off. */
const SERVER_CONTEXT = {
  signedIn: false, showLanding: true, measurementEnabled: false,
  onHome: NOOP, onStart: NOOP, onPricing: NOOP, onLandingStart: NOOP, onCodeEntry: NOOP,
};

/** The element for `url`, wrapped as main.tsx wraps <App />. */
export function publicPageTree(url: string, pageData: PublicPageData = {}): React.ReactElement | null {
  if (!SSR_RENDERED_PATHS.includes(url)) return null;
  const page = publicLegalElement(url) ?? publicMarketingElement(url, EAGER_PUBLIC_PAGES, { ...SERVER_CONTEXT, pageData });
  return page && <DomProviders>{page}</DomProviders>;
}

/** `pageData` must also be embedded in the HTML (server.ts) so the browser hydrates with it. */
export function render(url: string, pageData: PublicPageData = {}): SSRResult {
  const tree = publicPageTree(url, pageData);
  if (!tree) return { html: "", didSSR: false };

  try {
    const html = renderToString(tree);
    return { html, didSSR: true };
  } catch (err) {
    // SSR failure is non-fatal — server falls back to CSR shell
    console.error(`[SSR] renderToString failed for ${url}:`, err);
    return { html: "", didSSR: false };
  }
}
