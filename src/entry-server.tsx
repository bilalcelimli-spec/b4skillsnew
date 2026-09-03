/**
 * SSR entry point — marketing pages only.
 * Auth-required routes stay CSR; only public marketing routes get renderToString.
 * Called from server.ts in both dev (vite.ssrLoadModule) and prod (dynamic import).
 */
import React from "react";
import { renderToString } from "react-dom/server";

// Marketing page imports — all SSR-safe (browser APIs wrapped in useEffect/callbacks)
import { LandingPage } from "./components/LandingPage";
import { PricingPage } from "./components/PricingPage";
import { MethodologyPage } from "./components/MethodologyPage";
import { SchoolsPage } from "./components/SchoolsPage";
import { CorporatePage } from "./components/CorporatePage";
import { AcademiaPage } from "./components/AcademiaPage";
import { LanguageSchoolsPage } from "./components/LanguageSchoolsPage";
import { SeoLandingPage, SeoVariant } from "./components/SeoLandingPage";

export interface SSRResult {
  html: string;
  didSSR: boolean;
}

const NOOP = () => {};

// Map URL paths → React element factories.
// Props that are navigation callbacks get NOOP — they're inert during SSR.
// Only initial render state matters; useEffect never fires during renderToString.
const ROUTE_FACTORIES: Record<string, () => React.ReactElement> = {
  "/": () => <LandingPage onStart={NOOP} onCodeEntry={NOOP} />,
  "/pricing": () => <PricingPage onBack={NOOP} onStart={NOOP} />,
  "/methodology": () => <MethodologyPage onBack={NOOP} />,
  "/schools": () => <SchoolsPage onBack={NOOP} />,
  "/corporate": () => <CorporatePage onBack={NOOP} />,
  "/academia": () => <AcademiaPage onBack={NOOP} />,
  "/language-schools": () => <LanguageSchoolsPage onBack={NOOP} />,
  "/english-level-test": () => <SeoLandingPage variant={"english-level-test" as SeoVariant} onStart={NOOP} />,
  "/ingilizce-seviye-testi": () => <SeoLandingPage variant={"ingilizce-seviye-testi" as SeoVariant} onStart={NOOP} />,
  "/cefr-english-test": () => <SeoLandingPage variant={"cefr-english-test" as SeoVariant} onStart={NOOP} />,
  "/english-assessment-for-universities": () => <SeoLandingPage variant={"english-assessment-for-universities" as SeoVariant} onStart={NOOP} />,
  "/english-assessment-for-companies": () => <SeoLandingPage variant={"english-assessment-for-companies" as SeoVariant} onStart={NOOP} />,
};

export function render(url: string): SSRResult {
  const factory = ROUTE_FACTORIES[url];
  if (!factory) return { html: "", didSSR: false };

  try {
    const html = renderToString(factory());
    return { html, didSSR: true };
  } catch (err) {
    // SSR failure is non-fatal — server falls back to CSR shell
    console.error(`[SSR] renderToString failed for ${url}:`, err);
    return { html: "", didSSR: false };
  }
}
