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
