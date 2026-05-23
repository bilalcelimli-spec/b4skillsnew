/**
 * b4skills White-Label Brand Manager
 *
 * Manages per-organisation branding: colours, typography, logo, custom pages.
 * Injects CSS variables and meta tags at runtime for multi-tenant deployments.
 */

import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrandColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
}

export interface BrandTypography {
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  baseFontSize: string;
}

export interface BrandConfig {
  organizationId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: BrandColors;
  typography: BrandTypography;
  domain?: string;
  supportEmail?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  customCss?: string;
  customPages: Record<string, string>; // slug → HTML
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_BRAND: Omit<BrandConfig, "organizationId" | "name" | "slug"> = {
  logoUrl: null,
  faviconUrl: null,
  colors: {
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    secondary: "#7c3aed",
    accent: "#0891b2",
    background: "#ffffff",
    surface: "#f8fafc",
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    success: "#16a34a",
    warning: "#d97706",
    error: "#dc2626",
  },
  typography: {
    headingFont: "Inter, system-ui, sans-serif",
    bodyFont: "Inter, system-ui, sans-serif",
    monoFont: "'JetBrains Mono', 'Courier New', monospace",
    baseFontSize: "16px",
  },
  customPages: {},
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const brandCache = new Map<string, BrandConfig>();

// ---------------------------------------------------------------------------
// Brand Manager
// ---------------------------------------------------------------------------

export class BrandManager {
  /**
   * Get brand config for an organisation (with caching).
   */
  async getBrandConfig(organizationId: string): Promise<BrandConfig> {
    if (brandCache.has(organizationId)) {
      return brandCache.get(organizationId)!;
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });

    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    // Try to load custom branding from ecosystem config
    let config: BrandConfig = {
      organizationId: org.id,
      name: org.name,
      slug: org.slug,
      ...DEFAULT_BRAND,
    };

    try {
      const ecosystem = await (prisma as any).ecosystemConfig.findUnique({
        where: { organizationId },
        select: { brandingConfig: true },
      });
      if (ecosystem?.brandingConfig) {
        const custom = typeof ecosystem.brandingConfig === "string"
          ? JSON.parse(ecosystem.brandingConfig)
          : ecosystem.brandingConfig;
        config = { ...config, ...custom };
      }
    } catch {
      // EcosystemConfig table may not exist
    }

    brandCache.set(organizationId, config);
    return config;
  }

  /**
   * Get brand config by domain (for multi-tenant routing).
   */
  async getBrandConfigByDomain(domain: string): Promise<BrandConfig | null> {
    for (const config of brandCache.values()) {
      if (config.domain === domain) return config;
    }

    // Try to find by slug match in domain
    try {
      const orgs = await prisma.organization.findMany({
        select: { id: true, name: true, slug: true },
      });
      for (const org of orgs) {
        if (domain.includes(org.slug)) {
          return this.getBrandConfig(org.id);
        }
      }
    } catch { /* noop */ }

    return null;
  }

  /**
   * Update brand config for an organisation.
   */
  async updateBrandConfig(organizationId: string, updates: Partial<BrandConfig>): Promise<BrandConfig> {
    const current = await this.getBrandConfig(organizationId);
    const updated: BrandConfig = {
      ...current,
      ...updates,
      colors: { ...current.colors, ...(updates.colors ?? {}) },
      typography: { ...current.typography, ...(updates.typography ?? {}) },
    };

    brandCache.set(organizationId, updated);

    try {
      await (prisma as any).ecosystemConfig.upsert({
        where: { organizationId },
        update: { brandingConfig: updated },
        create: { organizationId, brandingConfig: updated },
      });
    } catch { /* Table may not exist */ }

    return updated;
  }

  /**
   * Generate CSS variables string from brand config.
   */
  generateCssVariables(config: BrandConfig): string {
    const { colors, typography } = config;
    return `
:root {
  --color-primary: ${colors.primary};
  --color-primary-dark: ${colors.primaryDark};
  --color-secondary: ${colors.secondary};
  --color-accent: ${colors.accent};
  --color-bg: ${colors.background};
  --color-surface: ${colors.surface};
  --color-text: ${colors.textPrimary};
  --color-text-muted: ${colors.textSecondary};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};
  --font-heading: ${typography.headingFont};
  --font-body: ${typography.bodyFont};
  --font-mono: ${typography.monoFont};
  --font-size-base: ${typography.baseFontSize};
}
${config.customCss ?? ""}
`.trim();
  }

  /**
   * Apply branding to document (client-side).
   */
  applyBrandingToPage(config: BrandConfig): void {
    if (typeof document === "undefined") return;

    // Inject CSS variables
    let styleEl = document.getElementById("b4skills-brand-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "b4skills-brand-styles";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = this.generateCssVariables(config);

    // Set page title
    document.title = config.name;

    // Favicon
    if (config.faviconUrl) {
      let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = config.faviconUrl;
    }

    // Inject logo if header element exists
    if (config.logoUrl) {
      const logoContainer = document.getElementById("brand-logo");
      if (logoContainer) {
        logoContainer.innerHTML = `<img src="${config.logoUrl}" alt="${config.name} logo" style="height:40px" />`;
      }
    }

    // OG meta tags
    this.setMeta("og:title", config.name);
    if (config.supportEmail) {
      this.setMeta("og:site_name", config.name);
    }
  }

  /**
   * Generate branded HTML email header.
   */
  generateEmailHeader(config: BrandConfig): string {
    return `
<div style="background-color:${config.colors.primary};padding:24px;text-align:center;">
  ${config.logoUrl ? `<img src="${config.logoUrl}" alt="${config.name}" style="height:40px;margin-bottom:8px;" />` : ""}
  <h1 style="color:#ffffff;font-family:${config.typography.headingFont};margin:0;font-size:20px;">${config.name}</h1>
</div>
`.trim();
  }

  /**
   * Generate branded HTML email footer.
   */
  generateEmailFooter(config: BrandConfig): string {
    return `
<div style="background-color:${config.colors.surface};padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
  <p style="color:${config.colors.textSecondary};font-size:12px;margin:0;">
    © ${new Date().getFullYear()} ${config.name}
    ${config.supportEmail ? ` · <a href="mailto:${config.supportEmail}">${config.supportEmail}</a>` : ""}
    ${config.privacyPolicyUrl ? ` · <a href="${config.privacyPolicyUrl}">Privacy Policy</a>` : ""}
  </p>
</div>
`.trim();
  }

  private setMeta(property: string, content: string): void {
    let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", property);
      document.head.appendChild(el);
    }
    el.content = content;
  }

  clearCache(organizationId?: string): void {
    if (organizationId) {
      brandCache.delete(organizationId);
    } else {
      brandCache.clear();
    }
  }
}

export const brandManager = new BrandManager();
