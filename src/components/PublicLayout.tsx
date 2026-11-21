import React from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

/**
 * Shared header and footer for public pages that do not draw them
 * themselves (sign-in, exam code, verification, shared reports, consent).
 * Marketing pages render SiteNav and SiteFooter directly; both are prop-free,
 * so every public page shows the same header and footer.
 */
export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-slate-50">
    <SiteNav />
    {/* The fixed header is about 72px tall. */}
    <div className="flex-1 pt-[72px]">{children}</div>
    <SiteFooter />
  </div>
);
