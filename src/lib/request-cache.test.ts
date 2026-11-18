import { describe, expect, it, vi } from "vitest";
import { createRequestCache } from "./request-cache";

describe("shared request cache", () => {
  it("coalesces simultaneous readers and keeps different accounts separate", async () => {
    const cache = createRequestCache<number>(60_000);
    const fetch = vi.fn(async () => 42);
    expect(await Promise.all([cache.read("one", fetch), cache.read("one", fetch)])).toEqual([42, 42]);
    await cache.read("one", fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    await cache.read("two", fetch);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("expires after one minute", async () => {
    vi.useFakeTimers();
    try {
      const cache = createRequestCache<number>(60_000);
      const fetch = vi.fn(async () => 1);
      await cache.read("one", fetch);
      vi.advanceTimersByTime(60_001);
      await cache.read("one", fetch);
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally { vi.useRealTimers(); }
  });
  it("does not restore a previous account's pending result after clearing", async () => {
    const cache = createRequestCache<number>(60_000);
    let finish: ((value: number) => void) | undefined;
    const old = cache.read("one", () => new Promise<number>((resolve) => { finish = resolve; }));
    await Promise.resolve();
    cache.clear();
    finish?.(7);
    await old;
    expect(await cache.read("one", async () => 9)).toBe(9);
  });
  it("retries failures instead of caching them", async () => {
    const cache = createRequestCache<number>(60_000);
    await expect(cache.read("one", async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    expect(await cache.read("one", async () => 2)).toBe(2);
  });
});