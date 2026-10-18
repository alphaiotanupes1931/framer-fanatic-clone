import { describe, expect, it } from "vitest";
import { usageLevel, formatBytes, GB } from "./usage-metrics";

describe("usageLevel", () => {
  it("warns at 80% of the limit", () => {
    expect(usageLevel(80 * GB, 100 * GB).state).toBe("warn");
    expect(usageLevel(79 * GB, 100 * GB).state).toBe("ok");
  });
  it("is over at 100% and remaining never negative", () => {
    const r = usageLevel(120, 100);
    expect(r.state).toBe("over");
    expect(r.remaining).toBe(0);
  });
  it("has no percent when no limit is set", () => {
    expect(usageLevel(5, null).state).toBe("unset");
  });
  it("formats bytes", () => {
    expect(formatBytes(1.5 * GB)).toBe("1.5 GB");
  });
});

import { monthlyStorageCharge } from "./usage-metrics";
describe("monthlyStorageCharge", () => {
  it("charges nothing under the free line", () => {
    expect(monthlyStorageCharge(500, 720, 1, 0.25).dollars).toBe(0);
  });
  it("charges only GB-hours above the free line", () => {
    const r = monthlyStorageCharge(7200, 720, 5, 1);
    expect(r.billableGbHours).toBe(3600);
    expect(r.dollars).toBeCloseTo(3600 * 0.00014384);
  });
});
