/**
 * SocialLoginButtons
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders branded buttons for Google, Microsoft, and LinkedIn SSO.
 * Initiates the redirect-based OAuth flow via GET /api/auth/social/:provider.
 * Falls back to a POST /api/auth/social/google/id-token flow for Google One-Tap.
 */

import React from "react";
import { cn } from "../design-system/components.js";

// ── Provider brand assets ─────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg viewBox="0 0 21 21" width="18" height="18" aria-hidden="true" focusable="false">
    <rect x="1" y="1"   width="9" height="9" fill="#F25022"/>
    <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
    <rect x="1" y="11"  width="9" height="9" fill="#00A4EF"/>
    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type SocialProvider = "google" | "microsoft" | "linkedin";

export interface SocialLoginButtonsProps {
  /** Called on successful SSO (when using id-token flow, not redirect) */
  onSuccess?: (provider: SocialProvider) => void;
  /** Called on error */
  onError?:   (provider: SocialProvider, error: string) => void;
  /** Which providers to show (default: all) */
  providers?: SocialProvider[];
  /** Optional redirect_uri passed to the server for the OAuth redirect flow */
  redirectUri?: string;
  /** CSS class override */
  className?: string;
  /** Layout — "stack" (vertical) or "row" (horizontal) */
  layout?: "stack" | "row";
}

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google:    "Continue with Google",
  microsoft: "Continue with Microsoft",
  linkedin:  "Continue with LinkedIn",
};

const PROVIDER_ICONS: Record<SocialProvider, React.ReactNode> = {
  google:    <GoogleIcon />,
  microsoft: <MicrosoftIcon />,
  linkedin:  <LinkedInIcon />,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SocialLoginButtons({
  onSuccess,
  onError,
  providers = ["google", "microsoft", "linkedin"],
  redirectUri,
  className,
  layout = "stack",
}: SocialLoginButtonsProps) {
  const [loading, setLoading] = React.useState<SocialProvider | null>(null);

  function handleClick(provider: SocialProvider) {
    if (loading) return;
    setLoading(provider);
    // Build the redirect URL to the server's OAuth initiation endpoint
    const qs = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : "";
    window.location.href = `/api/auth/social/${provider}${qs}`;
    // Note: if redirect fails, reset loading after 5 s
    setTimeout(() => setLoading(null), 5000);
  }

  return (
    <div
      role="group"
      aria-label="Social sign-in options"
      className={cn(
        layout === "stack" ? "flex flex-col gap-2" : "flex flex-row gap-2 flex-wrap",
        className,
      )}
    >
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => handleClick(provider)}
          disabled={!!loading}
          aria-label={PROVIDER_LABELS[provider]}
          aria-busy={loading === provider}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-medium",
            "bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-primary)]",
            "hover:bg-[var(--bg-subtle)] transition-colors duration-150",
            "focus:outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            layout === "stack" ? "w-full justify-center" : "flex-1 min-w-[160px] justify-center",
          )}
        >
          <span className="flex-shrink-0">{PROVIDER_ICONS[provider]}</span>
          <span>{loading === provider ? "Redirecting…" : PROVIDER_LABELS[provider]}</span>
        </button>
      ))}
    </div>
  );
}

// ── Divider helper ─────────────────────────────────────────────────────────────

export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-2" role="separator" aria-label={label}>
      <div className="flex-1 h-px bg-[var(--border)]" />
      <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  );
}
