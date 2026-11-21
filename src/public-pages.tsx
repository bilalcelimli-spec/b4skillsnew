/**
 * The public marketing and legal pages, built the same way on the server
 * (`entry-server.tsx`, eager components) and in the browser (`App.tsx`, lazy
 * components). Both sides go through `publicPageElement`, so the tree the
 * browser hydrates is the tree the server rendered: same wrappers, same
 * Suspense boundary, same props. A difference here shows up as a hydration
 * error (see test/public-pages-hydration.test.tsx).
 */
import React, { Suspense, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { FooterConsentContext, MarketingConsent, MeasurementPrivacyContext } from "./components/MarketingConsent";
import { PublicLayout } from "./components/PublicLayout";
import { ToastProvider } from "./design-system/components";
import { AppToastProvider } from "./hooks/useToast";
import { LegalPage, type LegalPageKind } from "./components/LegalPage";
import { VerificationPage } from "./components/VerificationPage";
import type { SeoVariant } from "./components/SeoLandingPage";
import { isCefrGuidePath, isTurkishMarketingPath } from "./lib/site/cefr-guide-paths";

type Page<K extends string> = ComponentType<Record<K, any>>;

/** The page components; lazy in the browser, eager on the server. */
export interface PublicPageComponents {
  LandingPage: Page<"onStart" | "onCodeEntry">;
  PricingPage: Page<"onBack" | "onStart">;
  MethodologyPage: Page<"onBack" | "onStart">;
  AccessibilityStatementPage: Page<"onStart">;
  ResearchPage: Page<"onStart">;
  SchoolsPage: Page<"onBack" | "onStart">;
  AcademiaPage: Page<"onBack" | "onStart">;
  CorporatePage: Page<"onBack" | "onStart">;
  LanguageSchoolsPage: Page<"onBack" | "onStart">;
  SeoLandingPage: Page<"variant" | "onStart" | "onPricing">;
  CefrGuidePage: Page<"path">;
}

export interface PublicPageContext {
  /** A signed-in user. Pages marked "signed out only" fall through to the app. */
  signedIn: boolean;
  /** The landing page is still the chosen view for "/". */
  showLanding: boolean;
  /** Analytics may run on this page (signed out and the session check done). */
  measurementEnabled: boolean;
  onHome: () => void;
  onStart: () => void;
  onPricing: () => void;
  onLandingStart: () => void;
  onCodeEntry: () => void;
}

export const SEO_PATHS: Record<string, SeoVariant> = {
  "/english-level-test": "english-level-test",
  "/ingilizce-seviye-testi": "ingilizce-seviye-testi",
  "/cefr-english-test": "cefr-english-test",
  "/english-assessment-for-universities": "english-assessment-for-universities",
  "/english-assessment-for-companies": "english-assessment-for-companies",
};

export const LEGAL_ROUTES: Record<string, LegalPageKind> = {
  "/privacy": "privacy", "/kvkk": "kvkk", "/terms": "terms", "/support": "support",
  "/refund-policy": "refund", "/sales-terms": "sales",
};

export { isCefrGuidePath };

/** Which page component a path shows. Only the page decides; `signedIn` is applied by `publicPageElement`. */
export function publicPageKey(path: string): keyof PublicPageComponents | null {
  switch (path) {
    case "/": return "LandingPage";
    case "/pricing": return "PricingPage";
    case "/methodology": return "MethodologyPage";
    case "/accessibility-statement": return "AccessibilityStatementPage";
    case "/research": return "ResearchPage";
    case "/schools": return "SchoolsPage";
    case "/academia": return "AcademiaPage";
    case "/corporate": return "CorporatePage";
    case "/language-schools": return "LanguageSchoolsPage";
  }
  if (SEO_PATHS[path]) return "SeoLandingPage";
  if (isCefrGuidePath(path)) return "CefrGuidePage";
  return null;
}

export function MarketingPage({ children, path, enabled }: { children: React.ReactNode; path: string; enabled: boolean }) {
  const { i18n } = useTranslation();
  const [privateAssessmentOpen, setPrivateAssessmentOpen] = useState(false);
  // Every marketing page ends with SiteFooter, which renders this consent control.
  // Turkish pages always show Turkish consent text; elsewhere follow the interface language.
  const isTr = isTurkishMarketingPath(path) || (i18n?.language || "en").startsWith("tr");
  const consent = <MarketingConsent path={path} isTr={isTr} enabled={enabled && !privateAssessmentOpen} />;
  return <MeasurementPrivacyContext.Provider value={setPrivateAssessmentOpen}><FooterConsentContext.Provider value={consent}>{children}</FooterConsentContext.Provider></MeasurementPrivacyContext.Provider>;
}

export const PageLoader = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
  </div>
);

/**
 * The marketing page for `path`, or null when the path is not a marketing page
 * or the page is for signed-out visitors only and someone is signed in.
 * It needs no session answer, so `App` shows it before the session check ends.
 */
export function publicMarketingElement(path: string, pages: PublicPageComponents, ctx: PublicPageContext): React.ReactElement | null {
  const key = publicPageKey(path);
  if (!key) return null;
  const signedOutOnly = !["PricingPage", "AccessibilityStatementPage", "ResearchPage", "CefrGuidePage"].includes(key);
  if (signedOutOnly && ctx.signedIn) return null;
  if (key === "LandingPage" && !ctx.showLanding) return null;
  const { onHome, onStart } = ctx;
  let page: React.ReactElement;
  switch (key) {
    case "LandingPage": page = <pages.LandingPage onStart={ctx.onLandingStart} onCodeEntry={ctx.onCodeEntry} />; break;
    case "AccessibilityStatementPage": page = <pages.AccessibilityStatementPage onStart={onStart} />; break;
    case "ResearchPage": page = <pages.ResearchPage onStart={onStart} />; break;
    case "SeoLandingPage": page = <pages.SeoLandingPage variant={SEO_PATHS[path]} onStart={onStart} onPricing={ctx.onPricing} />; break;
    case "CefrGuidePage": page = <pages.CefrGuidePage path={path} />; break;
    default: {
      const Component = pages[key];
      page = <Component onBack={onHome} onStart={onStart} />;
    }
  }
  return <MarketingPage path={path} enabled={ctx.measurementEnabled}><Suspense fallback={<PageLoader />}>{page}</Suspense></MarketingPage>;
}

/** Legal pages and certificate verification: public, no session needed. */
export function publicLegalElement(path: string): React.ReactElement | null {
  if (LEGAL_ROUTES[path]) return <LegalPage kind={LEGAL_ROUTES[path]} />;
  const verifyMatch = path.match(/^\/verify(?:\/([^/]+))?\/?$/);
  if (verifyMatch) return <PublicLayout><VerificationPage certId={verifyMatch[1]} /></PublicLayout>;
  return null;
}

/** The providers that draw DOM around the app (the toast viewport). main.tsx and the server both use them. */
export function DomProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider><AppToastProvider>{children}</AppToastProvider></ToastProvider>;
}
