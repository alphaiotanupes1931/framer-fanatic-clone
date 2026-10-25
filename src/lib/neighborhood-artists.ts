export type NeighborhoodArtist = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  neighborhood: string | null;
  page_slug?: string;
};

type ArtistPage = {
  id: string;
  name: string;
  slug: string;
  type: string;
  avatar_url: string | null;
  bio: string | null;
  neighborhood: string | null;
};

// Artist pages belong to organizations, independently of their owner's profile.
export function neighborhoodArtists(profiles: NeighborhoodArtist[], pages: ArtistPage[]): NeighborhoodArtist[] {
  const artistPages = pages.filter((page) => page.type === "artist").map((page) => ({
    id: page.id,
    display_name: page.name,
    username: null,
    avatar_url: page.avatar_url,
    bio: page.bio,
    neighborhood: page.neighborhood,
    page_slug: page.slug,
  }));
  return [...artistPages, ...profiles];
}