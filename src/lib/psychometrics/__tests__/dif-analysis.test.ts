import { beforeEach, describe, expect, it, vi } from "vitest";

type ResponseRow = {
  itemId: string;
  isCorrect: boolean;
  session: {
    theta: number;
    candidate: { metadata: { gender?: string; nativeLanguage?: string; ageGroup?: string } };
  };
};

const responseStore: ResponseRow[] = [];
const itemStore = [
  { id: "item-balanced", skill: "READING", cefrLevel: "B1" },
  { id: "item-biased", skill: "READING", cefrLevel: "B2" },
];

vi.mock("../../prisma", () => {
  return {
    prisma: {
      response: {
        findMany: vi.fn(async ({ where }: any) => {
          const itemId = where?.itemId;
          return responseStore.filter((r) => r.itemId === itemId);
        }),
      },
      item: {
        findMany: vi.fn(async () => itemStore),
      },
    },
  };
});

import { DifAnalysisService } from "../dif-analysis";

function pushResponse(
  itemId: string,
  theta: number,
  gender: string,
  isCorrect: boolean
) {
  responseStore.push({
    itemId,
    isCorrect,
    session: {
      theta,
      candidate: { metadata: { gender } },
    },
  });
}

describe("DifAnalysisService", () => {
  beforeEach(() => {
    responseStore.length = 0;
  });

  it("returns neutral result when sample size is insufficient", async () => {
    for (let i = 0; i < 8; i++) {
      pushResponse("item-balanced", -1 + i * 0.2, "female", i % 2 === 0);
      pushResponse("item-balanced", -1 + i * 0.2, "male", i % 2 === 0);
    }

    const result = await DifAnalysisService.analyzeItemDif(
      "item-balanced",
      "gender",
      "female",
      "male"
    );

    expect(result.classification).toBe("A");
    expect(result.pValue).toBe(1);
    expect(result.referenceN).toBe(8);
    expect(result.focalN).toBe(8);
  });

  it("flags large DIF when focal group consistently underperforms", async () => {
    for (let i = 0; i < 40; i++) {
      const theta = -2 + i * 0.1;
      pushResponse("item-biased", theta, "female", i % 5 !== 0); // ~80% correct
      pushResponse("item-biased", theta, "male", i % 5 === 0); // ~20% correct
    }

    const result = await DifAnalysisService.analyzeItemDif(
      "item-biased",
      "gender",
      "female",
      "male"
    );

    expect(result.referenceN).toBeGreaterThanOrEqual(10);
    expect(result.focalN).toBeGreaterThanOrEqual(10);
    expect(["B", "C"]).toContain(result.classification);
    expect(Math.abs(result.logisticUniformDif)).toBeGreaterThan(0.3);
  });

  it("analyzes all active items and returns only flagged ones via getFlaggedItems", async () => {
    for (let i = 0; i < 30; i++) {
      const theta = -1.5 + i * 0.1;

      // balanced item -> no major DIF
      pushResponse("item-balanced", theta, "female", i % 2 === 0);
      pushResponse("item-balanced", theta, "male", i % 2 === 0);

      // biased item -> noticeable DIF
      pushResponse("item-biased", theta, "female", i % 4 !== 0);
      pushResponse("item-biased", theta, "male", i % 4 === 0);
    }

    const all = await DifAnalysisService.analyzeAllItems("gender", "female", "male");
    const flagged = await DifAnalysisService.getFlaggedItems("gender", "female", "male");

    expect(all.length).toBe(2);
    expect(all.some((r) => r.itemId === "item-balanced")).toBe(true);
    expect(all.some((r) => r.itemId === "item-biased")).toBe(true);
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    expect(flagged.every((r) => r.hasDif)).toBe(true);
    expect(flagged.some((r) => r.itemId === "item-biased")).toBe(true);
  });
});
