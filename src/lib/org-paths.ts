/** Short URL prefix for each kind of page, e.g. /b/my-shop for a business. */
export const ORG_PREFIX: Record<string, string> = {
  artist: "a",
  arts_org: "ao",
  business: "b",
  community_assoc: "ca",
  group: "g",
  resident: "r",
  visitor: "v",
};

export function orgPrefix(type: string | null | undefined): string {
  return ORG_PREFIX[type ?? ""] ?? "o";
}

/** Public path for a page. Falls back to /o/slug, which redirects. */
export function orgPath(type: string | null | undefined, slug: string): string {
  return `/${orgPrefix(type)}/${slug}`;
}

/** New page addresses are joined lowercase words; the database resolves collisions. */
export function orgSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 60) || "page";
}
