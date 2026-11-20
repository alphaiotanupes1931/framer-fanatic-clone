import { describe, expect, it } from "vitest";
import { videoPage, videoPageRange, uniqueVideos } from "./video-pagination";

describe("video browsing pagination", () => {
  it("shows 24 videos initially and reserves the lookahead for the next page", () => {
    const rows = Array.from({ length: 25 }, (_, id) => ({ id: String(id) }));
    expect(videoPage(rows, 0).items.map((row) => row.id)).toEqual(rows.slice(0, 24).map((row) => row.id));
    expect(videoPage(rows, 0).nextPage).toBe(1);
    expect(videoPageRange(0)).toEqual({ from: 0, to: 24 });
    expect(videoPageRange(1)).toEqual({ from: 24, to: 48 });
  });
  it("continues past the old 50-video limit without a total cap", () => {
    const rows = Array.from({ length: 101 }, (_, id) => ({ id: String(id) }));
    const pages = Array.from({ length: 5 }, (_, page) => {
      const range = videoPageRange(page);
      return videoPage(rows.slice(range.from, range.to + 1), page);
    });
    expect(uniqueVideos(pages)).toEqual(rows);
    expect(pages.map((page) => page.nextPage)).toEqual([1, 2, 3, 4, undefined]);
  });
  it("stops on a full final batch or an empty result", () => {
    expect(videoPage(Array.from({ length: 24 }, (_, id) => id), 1).nextPage).toBeUndefined();
    expect(videoPage([], 0)).toEqual({ items: [], nextPage: undefined });
  });
  it("does not repeat cards when rows shift between requests", () => {
    expect(uniqueVideos([{ items: [{ id: "a" }, { id: "b" }] }, { items: [{ id: "b" }, { id: "c" }] }]))
      .toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });
});