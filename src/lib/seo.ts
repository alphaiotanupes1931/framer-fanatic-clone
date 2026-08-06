export const SITE_URL = "https://planetbaltimore.com";
export const SITE_NAME = "Planet Baltimore";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

type SeoInput = {
  path: string;
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
};

/** Builds a complete, self-referencing head() payload for a public route. */
export function pageHead({ path, title, description, image, type = "website", noindex }: SeoInput) {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  const img = image || DEFAULT_OG_IMAGE;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:image", content: img },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: img },
      ...(noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
