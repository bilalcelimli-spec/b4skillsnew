import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AngoffRating } from "../standard-setting";

type SystemConfigDoc = { id: string; config: any };

const systemConfigStore = new Map<string, SystemConfigDoc>();

const mockItems = [
  { id: "i1", discrimination: 1.0, difficulty: -0.8, guessing: 0.2 },
  { id: "i2", discrimination: 1.1, difficulty: -0.1, guessing: 0.2 },
  { id: "i3", discrimination: 0.9, difficulty: 0.7, guessing: 0.2 },
];

const mockSessions = [
  { theta: -1.0, cefrLevel: "A2" },
  { theta: -0.9, cefrLevel: "A2" },
  { theta: -0.8, cefrLevel: "A2" },
  { theta: -0.7, cefrLevel: "A2" },
  { theta: -0.6, cefrLevel: "A2" },
  { theta: -0.5, cefrLevel: "A2" },
  { theta: -0.4, cefrLevel: "A2" },
  { theta: -0.3, cefrLevel: "A2" },
  { theta: -0.2, cefrLevel: "A2" },
  { theta: -0.1, cefrLevel: "A2" },
  { theta: 0.1, cefrLevel: "B1" },
  { theta: 0.2, cefrLevel: "B1" },
  { theta: 0.3, cefrLevel: "B1" },
  { theta: 0.4, cefrLevel: "B1" },
  { theta: 0.5, cefrLevel: "B1" },
  { theta: 0.6, cefrLevel: "B1" },
  { theta: 0.7, cefrLevel: "B1" },
  { theta: 0.8, cefrLevel: "B1" },
  { theta: 0.9, cefrLevel: "B1" },
  { theta: 1.0, cefrLevel: "B1" },
];

vi.mock("../../prisma", () => {
  return {
    prisma: {
      systemConfig: {
        upsert: vi.fn(async ({ where, create, update }: any) => {
          const existing = systemConfigStore.get(where.id);
          const doc = existing
            ? { id: where.id, config: update.config }
            : { id: create.id, config: create.config };
          systemConfigStore.set(where.id, doc);
          return doc;
        }),
        findUnique: vi.fn(async ({ where }: any) => {
          return systemConfigStore.get(where.id) ?? null;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const existing = systemConfigStore.get(where.id);
          if (!existing) throw new Error("Config not found");
          const updated = { id: where.id, config: data.config };
          systemConfigStore.set(where.id, updated);
          return updated;
        }),
      },
      item: {
        findMany: vi.fn(async ({ where }: any) => {
          const ids = where?.id?.in as string[] | undefined;
          if (!ids) return mockItems;
          return mockItems.filter((i) => ids.includes(i.id));
        }),
      },
      session: {
        findMany: vi.fn(async () => mockSessions),
      },
    },
  };
});

import { StandardSettingService } from "../standard-setting";

describe("StandardSettingService", () => {
  beforeEach(() => {
    systemConfigStore.clear();
  });

  it("creates a study and stores default border config", async () => {
    const studyId = await StandardSettingService.createStudy("Pilot Angoff", "ANGOFF");
    const doc = systemConfigStore.get(`standard_setting_${studyId}`);

    expect(studyId.startsWith("ss_")).toBe(true);
    expect(doc).toBeTruthy();
    expect(doc?.config.method).toBe("ANGOFF");
    expect(Array.isArray(doc?.config.borders)).toBe(true);
    expect(doc?.config.borders.length).toBeGreaterThan(0);
  });

  it("submits ratings, calculates cut scores, and applies thresholds", async () => {
    const studyId = await StandardSettingService.createStudy("Pilot Angoff", "ANGOFF");
    const ratings: AngoffRating[] = [
      { raterId: "r1", itemId: "i1", cefrBorder: "A2_B1", probability: 0.62 },
      { raterId: "r1", itemId: "i2", cefrBorder: "A2_B1", probability: 0.58 },
      { raterId: "r1", itemId: "i3", cefrBorder: "A2_B1", probability: 0.41 },
      { raterId: "r2", itemId: "i1", cefrBorder: "A2_B1", probability: 0.64 },
      { raterId: "r2", itemId: "i2", cefrBorder: "A2_B1", probability: 0.56 },
      { raterId: "r2", itemId: "i3", cefrBorder: "A2_B1", probability: 0.39 },
    ];

    await StandardSettingService.submitRatings(studyId, ratings);
    const cutScores = await StandardSettingService.calculateCutScores(studyId);

    expect(cutScores.length).toBe(1);
    expect(cutScores[0].border).toBe("A2_B1");
    expect(cutScores[0].confidence).toBeGreaterThanOrEqual(0);
    expect(cutScores[0].confidence).toBeLessThanOrEqual(1);
    expect(Number.isFinite(cutScores[0].empiricalTheta)).toBe(true);
    expect(cutScores[0].empiricalTheta).toBeGreaterThanOrEqual(-4);
    expect(cutScores[0].empiricalTheta).toBeLessThanOrEqual(4);
    expect(Number.isFinite(cutScores[0].blendedTheta)).toBe(true);

    const studyDoc = systemConfigStore.get(`standard_setting_${studyId}`);
    expect(studyDoc?.config.panelSize).toBe(2);
    expect(studyDoc?.config.interRaterReliability).toBeGreaterThanOrEqual(0);

    await StandardSettingService.applyCutScores(studyId);
    const globalDoc = systemConfigStore.get("global");
    expect(globalDoc?.config.cefrThresholds.B1).toBeDefined();
    expect(typeof globalDoc?.config.cefrThresholds.B1).toBe("number");
  });

  it("throws for unknown studies", async () => {
    await expect(
      StandardSettingService.submitRatings("missing", [])
    ).rejects.toThrow("Study not found");
    await expect(
      StandardSettingService.calculateCutScores("missing")
    ).rejects.toThrow("Study not found");
    await expect(
      StandardSettingService.applyCutScores("missing")
    ).rejects.toThrow("Study not found");
  });
});
