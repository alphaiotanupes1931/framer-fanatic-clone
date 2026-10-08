import { describe, expect, it } from "vitest";
import { computeQuota } from "./email-quota";

const now = 1_000_000_000;
describe("email quota", () => {
  it("allows 10 sends per 15 minutes", () => {
    expect(computeQuota(Array(9).fill(now - 1000), now).remaining).toBe(1);
    expect(computeQuota(Array(10).fill(now - 1000), now).remaining).toBe(0);
  });
  it("waits until the oldest send leaves the 15 minute window", () => {
    const q = computeQuota(Array(10).fill(now - 5 * 60_000), now);
    expect(q.waitSeconds).toBe(600);
  });
  it("ignores sends older than 15 minutes", () => {
    expect(computeQuota(Array(10).fill(now - 16 * 60_000), now).remaining).toBe(10);
  });
});
