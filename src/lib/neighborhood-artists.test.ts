import { describe, expect, it } from "vitest";
import { neighborhoodArtists } from "./neighborhood-artists";

const page = (id: string, type = "artist") => ({
  id, type, name: id, slug: id, avatar_url: null, bio: null, neighborhood: "Harwood",
});

describe("neighborhood artist discovery", () => {
  it("includes artist pages even when their owner has no artist profile", () => {
    expect(neighborhoodArtists([], [page("ainsleyburrowsmighty")])).toEqual([
      { id: "ainsleyburrowsmighty", display_name: "ainsleyburrowsmighty", username: null,
        avatar_url: null, bio: null, neighborhood: "Harwood", page_slug: "ainsleyburrowsmighty" },
    ]);
  });
  it("keeps personal artist profiles alongside separately named artist pages", () => {
    const profile = { id: "person", display_name: "Artist", username: "artist", avatar_url: null, bio: null, neighborhood: "Harwood" };
    expect(neighborhoodArtists([profile], [page("studio")]).map((artist) => artist.id)).toEqual(["studio", "person"]);
  });
  it("does not include businesses, groups or associations in Artists", () => {
    expect(neighborhoodArtists([], [page("shop", "business"), page("group", "group"), page("association", "community_assoc")])).toEqual([]);
  });
});