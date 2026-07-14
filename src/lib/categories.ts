export const CREATOR_CATEGORIES = [
  "Attendee",
  "Musician",
  "Podcaster",
  "Visual Artist",
  "Photographer",
  "Videographer",
  "Filmmaker",
  "Fashion Designer",
  "Graphic Designer",
  "Writer",
  "Poet",
  "Dancer",
  "DJ",
  "Producer",
  "Comedian",
  "Chef / Culinary",
  "Tattoo Artist",
  "Muralist",
  "Curator",
  "Event Organizer",
] as const;

export type CreatorCategory = (typeof CREATOR_CATEGORIES)[number];

// Tags a user can pick to describe themselves on their profile.
// Kept in sync with the "Create Artist Page" options, plus DJ.
export const PROFILE_TAGS = [
  "Attendee",
  "Visual Art",
  "Music",
  "DJ",
  "Video",
  "Photography",
  "Performance",
  "Literary",
  "Mixed Media",
  "Fashion",
  "Podcaster",
  "Other",
] as const;

export type ProfileTag = (typeof PROFILE_TAGS)[number];

// Maps a category -> the extra tabs shown on a public profile.
// Each tab maps to a "kind" stored in profile_sections.kind.
const TABS: Record<string, { label: string; kind: string }[]> = {
  "Visual Artist": [
    { label: "Gallery", kind: "gallery" },
    { label: "Studio", kind: "studio" },
  ],
  Muralist: [
    { label: "Gallery", kind: "gallery" },
    { label: "Commissions", kind: "commissions" },
  ],
  Photographer: [
    { label: "Gallery", kind: "gallery" },
    { label: "Studio", kind: "studio" },
  ],
  Podcaster: [
    { label: "Episodes", kind: "episodes" },
    { label: "Series", kind: "series" },
  ],
  Musician: [
    { label: "Tracks", kind: "tracks" },
    { label: "Shows", kind: "shows" },
  ],
  DJ: [
    { label: "Mixes", kind: "tracks" },
    { label: "Shows", kind: "shows" },
  ],
  Producer: [
    { label: "Tracks", kind: "tracks" },
    { label: "Beats", kind: "beats" },
  ],
  Videographer: [
    { label: "Reels", kind: "reels" },
    { label: "Projects", kind: "projects" },
  ],
  Filmmaker: [
    { label: "Reels", kind: "reels" },
    { label: "Projects", kind: "projects" },
  ],
  Writer: [{ label: "Writings", kind: "writings" }],
  Poet: [{ label: "Writings", kind: "writings" }],
  "Fashion Designer": [
    { label: "Lookbook", kind: "lookbook" },
    { label: "Shop", kind: "shop" },
  ],
  "Graphic Designer": [
    { label: "Portfolio", kind: "portfolio" },
    { label: "Shop", kind: "shop" },
  ],
  Dancer: [{ label: "Performances", kind: "performances" }],
  Comedian: [{ label: "Performances", kind: "performances" }],
  "Chef / Culinary": [
    { label: "Menu", kind: "menu" },
    { label: "Pop-ups", kind: "popups" },
  ],
  "Tattoo Artist": [
    { label: "Portfolio", kind: "portfolio" },
    { label: "Booking", kind: "booking" },
  ],
  Curator: [
    { label: "Curated", kind: "curated" },
    { label: "Upcoming", kind: "upcoming" },
  ],
  "Event Organizer": [
    { label: "Curated", kind: "curated" },
    { label: "Upcoming", kind: "upcoming" },
  ],
};

export function tabsForCategory(category: string | null | undefined) {
  if (!category) return [];
  return TABS[category] ?? [];
}

export const ARTS_ORG_SUBTYPES = [
  "Museum",
  "Gallery",
  "Studio Space",
  "Collective",
  "Residency",
  "Nonprofit",
  "Cultural",
  "Performance",
  "Community",
  "DIY / Alt",
  "Education",
] as const;

export const BUSINESS_SUBTYPES = [
  "Cafe",
  "Restaurant",
  "Venue",
  "Retail",
  "Service",
  "Barber Shop",
  "Salon",
  "Spa",
  "Entertainment",
  "Health",
  "Creative",
  "Nonprofit",
] as const;

export const GROUP_SUBTYPES = [
  "Crew",
  "Club",
  "Meetup",
  "Open Mic",
  "Reading Group",
  "Other",
] as const;

export const COMMUNITY_ASSOC_SUBTYPES = [
  "Neighborhood Association",
  "Mutual Aid",
  "Advocacy",
  "Civic",
  "Other",
] as const;

export const ORG_TYPE_LABEL: Record<string, string> = {
  arts_org: "Arts Organization",
  business: "Business",
  community_assoc: "Community Association",
  group: "Group",
};

export function subtypesFor(type: string): readonly string[] {
  switch (type) {
    case "arts_org": return ARTS_ORG_SUBTYPES;
    case "business": return BUSINESS_SUBTYPES;
    case "community_assoc": return COMMUNITY_ASSOC_SUBTYPES;
    case "group": return GROUP_SUBTYPES;
    default: return [];
  }
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}