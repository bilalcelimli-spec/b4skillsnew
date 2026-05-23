/**
 * b4skills Timezone Manager
 * Timezone-aware timestamp handling for regional compliance and test scheduling.
 */

const REGION_TIMEZONES: Record<string, string> = {
  GB: "Europe/London", US: "America/New_York", CA: "America/Toronto",
  TR: "Europe/Istanbul", DE: "Europe/Berlin", FR: "Europe/Paris",
  ES: "Europe/Madrid", PT: "Europe/Lisbon", BR: "America/Sao_Paulo",
  CN: "Asia/Shanghai", JP: "Asia/Tokyo", KR: "Asia/Seoul",
  IN: "Asia/Kolkata", AU: "Australia/Sydney", NZ: "Pacific/Auckland",
  SA: "Asia/Riyadh", AE: "Asia/Dubai", ZA: "Africa/Johannesburg",
};

export class TimezoneManager {
  getTimezone(region: string): string {
    return REGION_TIMEZONES[region] ?? "UTC";
  }

  toRegionalTime(utcDate: Date, region: string): Date {
    const tz = this.getTimezone(region);
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      });
      const parts = formatter.formatToParts(utcDate);
      const p: Record<string, string> = {};
      for (const { type, value } of parts) if (type !== "literal") p[type] = value;
      const h = p.hour === "24" ? "00" : p.hour;
      return new Date(`${p.year}-${p.month}-${p.day}T${h}:${p.minute}:${p.second}`);
    } catch {
      return utcDate;
    }
  }

  formatForRegion(date: Date, region: string, includeTime = true): string {
    const tz = this.getTimezone(region);
    try {
      const opts: Intl.DateTimeFormatOptions = {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      };
      if (includeTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
      return new Intl.DateTimeFormat(region.toLowerCase(), opts).format(date);
    } catch {
      return date.toISOString();
    }
  }

  isBusinessHours(region: string, utcDate: Date = new Date()): boolean {
    const regional = this.toRegionalTime(utcDate, region);
    const hour = regional.getHours();
    const day = regional.getDay(); // 0=Sun, 6=Sat
    return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
  }

  daysUntil(targetDate: Date, fromDate: Date = new Date()): number {
    const diffMs = targetDate.getTime() - fromDate.getTime();
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  }

  getOffsetMinutes(region: string): number {
    const tz = this.getTimezone(region);
    try {
      const now = new Date();
      const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
      const tzStr = now.toLocaleString("en-US", { timeZone: tz });
      return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60_000;
    } catch {
      return 0;
    }
  }

  getAllTimezones(): Record<string, string> {
    return { ...REGION_TIMEZONES };
  }
}

export const timezoneManager = new TimezoneManager();
