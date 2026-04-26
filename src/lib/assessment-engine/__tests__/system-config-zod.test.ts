import { describe, it, expect } from "vitest";
import { parseSystemConfigPayload, SystemConfigValidationError } from "../system-config-zod";

describe("system-config-zod (Faz7)", () => {
  it("accepts a valid config with passthrough fields", () => {
    const p = parseSystemConfigPayload({
      useRtIrt: true,
      cefrThresholds: { A1: -2.5, B1: -0.5 },
      customOrgField: 123,
    });
    expect(p.useRtIrt).toBe(true);
    expect(p.customOrgField).toBe(123);
  });

  it("rejects bad types", () => {
    expect(() =>
      parseSystemConfigPayload({ useRtIrt: "yes" })
    ).toThrow(SystemConfigValidationError);
  });
});
