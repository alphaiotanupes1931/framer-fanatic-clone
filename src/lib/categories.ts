export const CREATOR_CATEGORIES = [
  "Resident",
  "Visitor",
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
  "Resident",
  "Visitor",
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

/** Display names for stored arts org types; stored values stay unchanged. */
export const ARTS_ORG_LABELS: Record<string, { singular: string; plural: string; description?: string }> = {
  Museum: { singular: "Museum", plural: "Museums", description: "Collecting, preserving, and exhibiting art and culture." },
  Gallery: { singular: "Gallery", plural: "Galleries", description: "Exhibiting, promoting, and selling visual art." },
  "Studio Space": { singular: "Studio", plural: "Studios", description: "Individual and shared creative workspaces." },
  Collective: { singular: "Collective", plural: "Collectives", description: "Artists collaborating on projects and programming." },
  Residency: { singular: "Residency", plural: "Residencies", description: "Providing artists with space, resources, and support." },
  Nonprofit: { singular: "Nonprofit", plural: "Nonprofits" },
  Cultural: { singular: "Cultural", plural: "Cultural", description: "Celebrating and preserving cultural heritage and traditions." },
  Performance: { singular: "Performing Arts", plural: "Performing Arts", description: "Theater, dance, music, and live performance." },
  Community: { singular: "Community Arts", plural: "Community Arts", description: "Connecting communities through creative programs." },
  "DIY / Alt": { singular: "DIY/Alt", plural: "DIY/Alt", description: "Independent, experimental, and artist-run spaces." },
  Education: { singular: "Arts Education", plural: "Arts Education", description: "Classes, workshops, and creative training." },
};

export const BUSINESS_SUBTYPE_DESCRIPTIONS: Record<string, string> = {
  "Restaurants": "Restaurants, diners, takeout spots, food trucks, and other prepared-food businesses.",
  "Bars": "Bars, lounges, pubs, taverns, and nightlife establishments.",
  "Cafés": "Coffee shops, tea houses, bakeries, and casual cafés.",
  "Retail": "Boutiques, clothing stores, bookstores, gift shops, and other retail businesses.",
  "Groceries": "Grocery stores, markets, specialty food shops, and convenience stores.",
  "Salons": "Hair salons, nail salons, beauty studios, and other personal grooming businesses.",
  "Barbers": "Barbershops and professional barbering services.",
  "Venues": "Event spaces, performance halls, theaters, and other locations available for gatherings or events.",
  "Entertainment": "Businesses providing live entertainment, recreational experiences, nightlife activities, and amusement.",
  "Creative": "Design studios, photography businesses, production companies, and other creative enterprises.",
  "Services": "Professional, personal, home, automotive, and other service-based businesses.",
  "Health": "Medical practices, wellness centers, fitness studios, therapists, and other health-related businesses.",
  "Hotels": "Hotels, inns, boutique accommodations, and other lodging establishments.",
  "Nonprofits": "Charitable, civic, cultural, educational, and community-based nonprofit organizations.",
};

export const BUSINESS_SUBTYPES = Object.keys(BUSINESS_SUBTYPE_DESCRIPTIONS) as readonly string[];

export const BUSINESS_OFFERS = ["Product", "Service", "Both"] as const;

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
  resident: "Resident",
  visitor: "Visitor",
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