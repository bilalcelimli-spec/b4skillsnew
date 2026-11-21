/**
 * Lazy versions of the public pages for the browser bundle, each with a
 * `preload()`. main.tsx preloads the current page before hydrating, so the
 * page renders on the first pass and React never swaps the server HTML for
 * the Suspense spinner.
 */
import { lazy, type ComponentType } from "react";
import { publicPageKey, type PublicPageComponents } from "./public-pages";

type Preloadable<T extends ComponentType<any>> = T & { preload: () => Promise<unknown> };

function preloadableLazy<T extends ComponentType<any>>(load: () => Promise<T>): Preloadable<T> {
  let loaded: T | undefined;
  let pending: Promise<T> | undefined;
  const preload = () => (pending ??= load().then(component => (loaded = component)));
  // A thenable that resolves synchronously lets React.lazy return the
  // component on the first render instead of suspending.
  const Component = lazy(() => loaded
    ? ({ then: (resolve: (m: { default: T }) => void) => resolve({ default: loaded! }) } as unknown as Promise<{ default: T }>)
    : preload().then(component => ({ default: component })));
  return Object.assign(Component, { preload }) as unknown as Preloadable<T>;
}

export const LAZY_PUBLIC_PAGES = {
  LandingPage: preloadableLazy(() => import("./components/LandingPage").then(m => m.LandingPage)),
  PricingPage: preloadableLazy(() => import("./components/PricingPage").then(m => m.PricingPage)),
  MethodologyPage: preloadableLazy(() => import("./components/MethodologyPage").then(m => m.MethodologyPage)),
  AccessibilityStatementPage: preloadableLazy(() => import("./components/AccessibilityStatementPage").then(m => m.AccessibilityStatementPage)),
  ResearchPage: preloadableLazy(() => import("./components/ResearchPage").then(m => m.ResearchPage)),
  SchoolsPage: preloadableLazy(() => import("./components/SchoolsPage").then(m => m.SchoolsPage)),
  AcademiaPage: preloadableLazy(() => import("./components/AcademiaPage").then(m => m.AcademiaPage)),
  CorporatePage: preloadableLazy(() => import("./components/CorporatePage").then(m => m.CorporatePage)),
  LanguageSchoolsPage: preloadableLazy(() => import("./components/LanguageSchoolsPage").then(m => m.LanguageSchoolsPage)),
  SeoLandingPage: preloadableLazy(() => import("./components/SeoLandingPage").then(m => m.SeoLandingPage)),
  CefrGuidePage: preloadableLazy(() => import("./components/CefrGuidePage").then(m => m.CefrGuidePage)),
} satisfies Record<keyof PublicPageComponents, Preloadable<ComponentType<any>>>;

/** Loads the page chunk for `path` (no-op for other paths). */
export function preloadPublicPage(path: string): Promise<unknown> {
  const key = publicPageKey(path);
  return key ? LAZY_PUBLIC_PAGES[key].preload() : Promise.resolve();
}
