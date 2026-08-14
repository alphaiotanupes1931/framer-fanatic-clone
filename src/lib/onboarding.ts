/**
 * A profile only needs onboarding when it is genuinely new.
 *
 * The `onboarded` flag was added after launch, so many existing accounts still
 * have it false even though their profile is fully set up. Those users were
 * being bounced into onboarding after a password reset. Treat any profile that
 * already has real setup data as onboarded.
 */
export type OnboardingProfile = {
  onboarded?: boolean | null;
  neighborhood?: string | null;
  category?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  display_name?: string | null;
} | null | undefined;

export const ONBOARDING_FIELDS =
  "onboarded, neighborhood, category, avatar_url, bio, display_name";

export function profileNeedsOnboarding(p: OnboardingProfile): boolean {
  if (!p) return false;
  if (p.onboarded) return false;
  const hasSetup = !!(p.neighborhood || p.category || p.avatar_url || p.bio);
  return !hasSetup;
}
