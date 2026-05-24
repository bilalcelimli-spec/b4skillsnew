/**
 * Multi-Region Router & Data Residency
 * Handles EU/US/APAC region detection, routing hints, and GDPR/data-residency enforcement.
 *
 * Regions:
 *   US   → iad  (Ashburn, Virginia)
 *   EU   → ams  (Amsterdam)
 *   APAC → nrt  (Tokyo) | sin (Singapore)
 */

export type Region = "US" | "EU" | "APAC";

export interface RegionConfig {
  flyRegion: string;
  dbUrl: string | undefined;
  redisUrl: string | undefined;
  cdnOrigin: string;
  storagePrefix: string;
  dataResidencyNote: string;
}

// Country-code → logical region mapping
const COUNTRY_TO_REGION: Record<string, Region> = {
  // European Economic Area + UK + CH + NO
  AT: "EU", BE: "EU", BG: "EU", CY: "EU", CZ: "EU", DE: "EU", DK: "EU",
  EE: "EU", ES: "EU", FI: "EU", FR: "EU", GR: "EU", HR: "EU", HU: "EU",
  IE: "EU", IT: "EU", LT: "EU", LU: "EU", LV: "EU", MT: "EU", NL: "EU",
  PL: "EU", PT: "EU", RO: "EU", SE: "EU", SI: "EU", SK: "EU", TR: "EU",
  GB: "EU", CH: "EU", NO: "EU",
  // APAC
  JP: "APAC", CN: "APAC", KR: "APAC", SG: "APAC", MY: "APAC", TH: "APAC",
  VN: "APAC", PH: "APAC", ID: "APAC", AU: "APAC", NZ: "APAC", IN: "APAC",
  HK: "APAC", TW: "APAC",
  // Everything else defaults to US
};

// Fly.io regions per logical region (for redirect hints)
const REGION_FLY_TARGETS: Record<Region, string[]> = {
  US:   ["iad", "lax", "ord"],
  EU:   ["ams", "fra", "lhr"],
  APAC: ["nrt", "sin", "syd"],
};

export function detectRegionFromCountry(countryCode: string): Region {
  return COUNTRY_TO_REGION[countryCode?.toUpperCase()] ?? "US";
}

/** Detect region from an Express request using Fly-Client-IP / CF-IPCountry headers */
export function detectRegionFromRequest(req: { headers: Record<string, string | string[] | undefined> }): Region {
  // Cloudflare injects CF-IPCountry; Fly injects fly-region
  const cfCountry = req.headers["cf-ipcountry"];
  if (cfCountry && typeof cfCountry === "string" && cfCountry !== "XX") {
    return detectRegionFromCountry(cfCountry);
  }
  // Fly.io's own region header (where the machine is running)
  const flyRegion = req.headers["fly-region"] ?? process.env.FLY_REGION;
  if (flyRegion) {
    const r = typeof flyRegion === "string" ? flyRegion : flyRegion[0];
    if (["ams", "fra", "lhr"].includes(r)) return "EU";
    if (["nrt", "sin", "syd"].includes(r)) return "APAC";
  }
  return "US";
}

export function getRegionConfig(region: Region): RegionConfig {
  switch (region) {
    case "EU":
      return {
        flyRegion: "ams",
        dbUrl: process.env.DATABASE_URL_EU ?? process.env.DATABASE_URL,
        redisUrl: process.env.REDIS_URL_EU ?? process.env.REDIS_URL,
        cdnOrigin: process.env.CDN_ORIGIN_EU ?? "https://cdn-eu.linguadapt.com",
        storagePrefix: "eu/",
        dataResidencyNote: "Data processed in EU (GDPR Article 44 compliant)",
      };
    case "APAC":
      return {
        flyRegion: "nrt",
        dbUrl: process.env.DATABASE_URL_APAC ?? process.env.DATABASE_URL,
        redisUrl: process.env.REDIS_URL_APAC ?? process.env.REDIS_URL,
        cdnOrigin: process.env.CDN_ORIGIN_APAC ?? "https://cdn-apac.linguadapt.com",
        storagePrefix: "apac/",
        dataResidencyNote: "Data processed in APAC (Singapore/Tokyo)",
      };
    default:
      return {
        flyRegion: "iad",
        dbUrl: process.env.DATABASE_URL,
        redisUrl: process.env.REDIS_URL,
        cdnOrigin: process.env.CDN_ORIGIN_US ?? "https://cdn.linguadapt.com",
        storagePrefix: "us/",
        dataResidencyNote: "Data processed in US",
      };
  }
}

/** Express middleware: attaches region info to req and sets Fly-Prefer-Region header */
export function regionMiddleware(
  req: any,
  res: any,
  next: () => void
): void {
  const region = detectRegionFromRequest(req);
  req.region = region;
  const config = getRegionConfig(region);
  // Signal to Fly.io load balancer to prefer the correct region's machines
  res.setHeader("fly-prefer-region", config.flyRegion);
  // Expose to client for CDN asset selection
  res.setHeader("X-LinguaAdapt-Region", region);
  next();
}

export function getPreferredFlyRegions(region: Region): string[] {
  return REGION_FLY_TARGETS[region];
}
