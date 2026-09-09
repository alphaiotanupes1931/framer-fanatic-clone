/**
 * Profile completion scoring.
 *
 * A profile is "complete" when every part of the page a visitor can see has
 * something in it: identity, photos, story, location and at least one piece of
 * content. Used both for the weekly reminder email and any UI meter.
 */

export type CompletionProfile = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  neighborhood?: string | null;
  category?: string | null;
  website?: string | null;
};

export type CompletionStep = {
  key: string;
  label: string;
  hint: string;
  done: boolean;
};

const has = (v: unknown) => typeof v === "string" && v.trim().length > 0;

export function profileCompletionSteps(
  p: CompletionProfile,
  extras: { hasPost?: boolean } = {},
): CompletionStep[] {
  return [
    { key: "avatar", label: "Profile photo", hint: "Add a photo so people recognize you.", done: has(p.avatar_url) },
    { key: "cover", label: "Cover photo", hint: "A banner image makes your page feel like yours.", done: has(p.banner_url) },
    { key: "name", label: "Display name", hint: "Use the name people know you by.", done: has(p.display_name) },
    { key: "username", label: "Username", hint: "Your handle is how people find and tag you.", done: has(p.username) },
    { key: "bio", label: "Bio", hint: "A line or two about what you do.", done: has(p.bio) },
    { key: "neighborhood", label: "Neighborhood", hint: "Show up in your part of Baltimore.", done: has(p.neighborhood) },
    { key: "category", label: "Category", hint: "Tell people what kind of page this is.", done: has(p.category) },
    { key: "website", label: "Link", hint: "Add a website or social link.", done: has(p.website) },
    { key: "post", label: "First post", hint: "Share something so your page is not empty.", done: !!extras.hasPost },
  ];
}

export function profileCompletionPercent(
  p: CompletionProfile,
  extras: { hasPost?: boolean } = {},
): number {
  const steps = profileCompletionSteps(p, extras);
  const done = steps.filter((s) => s.done).length;
  return Math.round((done / steps.length) * 100);
}
