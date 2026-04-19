import { z } from "zod";
import { CuidLike, NonEmptyString, ShortText, Email, Url } from "./common.js";

const HexColor = z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "must be a hex color");

export const BrandingPatchBody = z.object({
  logoUrl: z.string().url().max(2048).optional(),
  primaryColor: HexColor.optional(),
  secondaryColor: HexColor.optional(),
  accentColor: HexColor.optional(),
  customDomain: z.string().trim().max(253).regex(/^[a-z0-9.-]+$/).optional(),
  displayName: ShortText.optional(),
  theme: z.enum(["light", "dark", "auto"]).optional(),
}).strict();

export const BulkImportCandidatesBody = z.object({
  candidates: z.array(z.object({
    email: Email,
    name: ShortText.optional(),
    externalId: ShortText.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).min(1).max(5000),
  sendInvite: z.boolean().optional(),
  cohortId: CuidLike.optional(),
}).strict();

export const CreateWebhookBody = z.object({
  url: Url,
  events: z.array(z.string().max(100)).min(1).max(50),
  secret: z.string().min(16).max(200).optional(),
  active: z.boolean().optional(),
}).strict();

export const CreateApiKeyBody = z.object({
  name: NonEmptyString.max(200),
  scopes: z.array(z.string().max(100)).max(50).optional(),
  expiresAt: z.string().datetime().optional(),
}).strict();

export const BillingTopupBody = z.object({
  amountCents: z.number().int().min(100).max(10_000_000),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/).default("USD"),
  description: ShortText.optional(),
}).strict();

export const UpdateSettingsBody = z.object({
  name: ShortText.optional(),
  timezone: z.string().max(60).optional(),
  locale: z.string().max(20).optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  limits: z.record(z.string(), z.number()).optional(),
}).strict();

export const SsoConfigBody = z.object({
  provider: z.enum(["saml", "oidc", "google", "microsoft", "none"]),
  enabled: z.boolean(),
  metadataUrl: z.string().url().max(2048).optional(),
  metadataXml: z.string().max(200_000).optional(),
  clientId: ShortText.optional(),
  clientSecret: z.string().max(500).optional(),
  issuer: ShortText.optional(),
  discoveryUrl: z.string().url().max(2048).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
}).strict();

export const EcosystemConfigBody = z.object({
  config: z.record(z.string(), z.unknown()),
}).strict();

export const WebhookIdParams = z.object({ id: CuidLike, webhookId: CuidLike });
export const ApiKeyIdParams = z.object({ id: CuidLike, keyId: CuidLike });
