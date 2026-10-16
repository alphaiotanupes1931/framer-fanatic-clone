import { describe, expect, it } from "vitest";
import { mergeSearchPages, type SearchPageResult } from "./search-pages";

const page = (id: string, type: string, extra: Partial<SearchPageResult> = {}): SearchPageResult => ({
  id, type, name: id, slug: id, owner_id: "person", avatar_url: null,
  neighborhood: null, is_public: true, hidden_from_showcase: false, ...extra,
});

describe("person's page search", () => {
  it("includes every owned page type even when its name differs from the person's", () => {
    expect(mergeSearchPages([], [page("studio", "artist"), page("shop", "business"), page("neighbors", "community_assoc"), page("club", "group"), page("arts", "arts_org")]).map((p) => p.id))
      .toEqual(["studio", "shop", "neighbors", "club", "arts"]);
  });
  it("deduplicates pages found by both their name and their owner", () => {
    expect(mergeSearchPages([page("studio", "artist")], [page("studio", "artist")])).toHaveLength(1);
  });
  it("excludes private pages", () => {
    expect(mergeSearchPages([], [page("private", "group", { is_public: false })])).toEqual([]);
  });
  it("excludes pages hidden from the public showcase", () => {
    expect(mergeSearchPages([page("hidden", "artist", { hidden_from_showcase: true })], [])).toEqual([]);
  });
  it("does not trim an owner's pages to the six-card overview", () => {
    expect(mergeSearchPages([], Array.from({ length: 30 }, (_, i) => page(`studio${i}`, "artist")))).toHaveLength(30);
  });
});