import { prisma } from "../prisma";

/**
 * b4skills Branding Service
 * Manages multi-tenant white-labeling configurations.
 */

export interface OrganizationBranding {
  id: string;
  organizationId: string;
  name: string;
  logoUrl?: string;
  primaryColor: string; 
  secondaryColor: string;
  fontFamily?: string;
  customDomain?: string;
  welcomeMessage?: string;
}

export const BrandingService = {
  async getBranding(organizationId: string): Promise<OrganizationBranding | null> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) return null;

    const branding = org.branding as any;
    const settings = org.settings as any;

    return {
      id: org.id,
      organizationId: org.id,
      name: org.name,
      logoUrl: branding?.logoUrl,
      primaryColor: branding?.primaryColor || "#4f46e5",
      secondaryColor: branding?.secondaryColor || "#0f172a",
      welcomeMessage: settings?.welcomeMessage
    };
  },

  async updateBranding(organizationId: string, updates: Partial<OrganizationBranding>) {
    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        branding: {
          logoUrl: updates.logoUrl,
          primaryColor: updates.primaryColor,
          secondaryColor: updates.secondaryColor
        },
        settings: {
          welcomeMessage: updates.welcomeMessage
        }
      }
    });

    return this.getBranding(org.id);
  }
};
