/**
 * b4skills Regional Compliance Manager
 * Testing windows, score formats, privacy laws, CEFR interpretation per region.
 */

export interface RegionalComplianceConfig {
  region: string;
  testingWindow: { allowedMonths: number[]; maxAttemptsPerYear: number; minDaysBetweenAttempts: number };
  scoreFormat: "numeric" | "band" | "percentage" | "descriptive";
  scoreScale?: { min: number; max: number };
  scoreBands?: Array<{ name: string; min: number; max: number }>;
  privacyLaw: "GDPR" | "LGPD" | "CCPA" | "PIPEDA" | "PDPL" | "none";
  maxDataRetentionDays: number;
  timezone: string;
  cefrStrictMode: boolean;
}

const COMPLIANCE_CONFIGS: Record<string, RegionalComplianceConfig> = {
  GB: {
    region: "GB",
    testingWindow: { allowedMonths: [1,2,3,4,5,6,7,8,9,10,11,12], maxAttemptsPerYear: 3, minDaysBetweenAttempts: 30 },
    scoreFormat: "band",
    scoreBands: [
      { name: "A1", min: 0, max: 19 }, { name: "A2", min: 20, max: 39 },
      { name: "B1", min: 40, max: 59 }, { name: "B2", min: 60, max: 79 },
      { name: "C1", min: 80, max: 89 }, { name: "C2", min: 90, max: 100 },
    ],
    privacyLaw: "GDPR", maxDataRetentionDays: 2555, timezone: "Europe/London", cefrStrictMode: true,
  },
  US: {
    region: "US",
    testingWindow: { allowedMonths: [1,2,3,4,5,6,7,8,9,10,11,12], maxAttemptsPerYear: 12, minDaysBetweenAttempts: 0 },
    scoreFormat: "numeric", scoreScale: { min: 0, max: 120 },
    privacyLaw: "CCPA", maxDataRetentionDays: 1825, timezone: "America/New_York", cefrStrictMode: false,
  },
  TR: {
    region: "TR",
    testingWindow: { allowedMonths: [1,2,3,4,5,6,7,8,9,10,11,12], maxAttemptsPerYear: 2, minDaysBetweenAttempts: 60 },
    scoreFormat: "numeric", scoreScale: { min: 0, max: 100 },
    privacyLaw: "PDPL", maxDataRetentionDays: 365, timezone: "Europe/Istanbul", cefrStrictMode: false,
  },
  DE: {
    region: "DE",
    testingWindow: { allowedMonths: [1,2,3,4,5,6,7,8,9,10,11,12], maxAttemptsPerYear: 3, minDaysBetweenAttempts: 30 },
    scoreFormat: "band",
    scoreBands: [
      { name: "A1", min: 0, max: 19 }, { name: "A2", min: 20, max: 39 },
      { name: "B1", min: 40, max: 59 }, { name: "B2", min: 60, max: 79 },
      { name: "C1", min: 80, max: 89 }, { name: "C2", min: 90, max: 100 },
    ],
    privacyLaw: "GDPR", maxDataRetentionDays: 2555, timezone: "Europe/Berlin", cefrStrictMode: true,
  },
  BR: {
    region: "BR",
    testingWindow: { allowedMonths: [1,2,3,4,5,6,7,8,9,10,11,12], maxAttemptsPerYear: 2, minDaysBetweenAttempts: 60 },
    scoreFormat: "percentage", scoreScale: { min: 0, max: 100 },
    privacyLaw: "LGPD", maxDataRetentionDays: 1825, timezone: "America/Sao_Paulo", cefrStrictMode: false,
  },
  CN: {
    region: "CN",
    testingWindow: { allowedMonths: [1,2,3,4,5,6,7,8,9,10,11,12], maxAttemptsPerYear: 4, minDaysBetweenAttempts: 30 },
    scoreFormat: "numeric", scoreScale: { min: 0, max: 100 },
    privacyLaw: "none", maxDataRetentionDays: 1095, timezone: "Asia/Shanghai", cefrStrictMode: false,
  },
  JP: {
    region: "JP",
    testingWindow: { allowedMonths: [1,2,3,4,5,6,7,8,9,10,11,12], maxAttemptsPerYear: 4, minDaysBetweenAttempts: 30 },
    scoreFormat: "numeric", scoreScale: { min: 0, max: 100 },
    privacyLaw: "none", maxDataRetentionDays: 1095, timezone: "Asia/Tokyo", cefrStrictMode: false,
  },
};

export function getComplianceConfig(region: string): RegionalComplianceConfig {
  return COMPLIANCE_CONFIGS[region] ?? COMPLIANCE_CONFIGS["GB"];
}

export function formatScore(score: number, region: string): string {
  const cfg = getComplianceConfig(region);
  switch (cfg.scoreFormat) {
    case "band": {
      const band = cfg.scoreBands?.find((b) => score >= b.min && score <= b.max);
      return band?.name ?? "A1";
    }
    case "percentage":
      return `${Math.round(score)}%`;
    case "numeric":
      return `${Math.round(score)}${cfg.scoreScale ? `/${cfg.scoreScale.max}` : ""}`;
    case "descriptive":
      if (score >= 80) return "Excellent";
      if (score >= 60) return "Good";
      if (score >= 40) return "Fair";
      return "Needs Improvement";
    default:
      return String(Math.round(score));
  }
}

export function isTestingAllowed(region: string, attemptsThisYear: number, daysSinceLastAttempt: number): { allowed: boolean; reason?: string } {
  const cfg = getComplianceConfig(region);
  const currentMonth = new Date().getMonth() + 1;

  if (!cfg.testingWindow.allowedMonths.includes(currentMonth)) {
    return { allowed: false, reason: `Testing not available in month ${currentMonth} for region ${region}` };
  }
  if (attemptsThisYear >= cfg.testingWindow.maxAttemptsPerYear) {
    return { allowed: false, reason: `Maximum ${cfg.testingWindow.maxAttemptsPerYear} attempts per year reached` };
  }
  if (daysSinceLastAttempt < cfg.testingWindow.minDaysBetweenAttempts) {
    return { allowed: false, reason: `Must wait ${cfg.testingWindow.minDaysBetweenAttempts} days between attempts` };
  }
  return { allowed: true };
}

export function getAllComplianceConfigs(): Record<string, RegionalComplianceConfig> {
  return COMPLIANCE_CONFIGS;
}
