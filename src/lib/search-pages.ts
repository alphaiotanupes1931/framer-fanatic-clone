export type SearchPageResult = {
  id: string;
  name: string;
  slug: string;
  type: string;
  avatar_url: string | null;
  neighborhood: string | null;
  owner_id: string;
  is_public: boolean;
  hidden_from_showcase: boolean;
};

// Match page names and people independently, then combine without duplicates.
export function mergeSearchPages(named: SearchPageResult[], owned: SearchPageResult[]) {
  return [...new Map([...named, ...owned]
    .filter((page) => page.is_public && !page.hidden_from_showcase)
    .map((page) => [page.id, page])).values()];
}

export function pageTypeLabel(type: string) {
  const labels: Record<string, string> = {
    artist: "Artist page", business: "Business page", arts_org: "Arts organization",
    community_assoc: "Community Association", group: "Group",
  };
  return labels[type] ?? type.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}