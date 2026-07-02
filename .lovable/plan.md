## Goal
Make Planet Baltimore an exact structural / visual replica of https://planetbaltimore.us across every page. All data continues to come from Base44 (no data-layer changes).

## Method
Work page-by-page. For each page I will:
1. Fetch the reference at that URL.
2. Diff structure vs the current implementation.
3. Rewrite only the layout / presentation of that route.
4. Confirm visually before moving on.

No changes to data fetching, entities, or auth flows.

## Order of work (one page per turn — you'll see progress after each)

**1. Home (`/dashboard`)**
- Keep orange hero banner (already correct).
- Feed order: Stories dominate (matches reference), then Posts, then Events — not the current post-heavy weave.
- Story item layout: `STORY` chip label above card, avatar + name + colored category tag (Poetry / Blog / Essay), title, one-line excerpt, `min · likes · comments`, right-side square thumbnail. Replace current `StoryCard`.
- Welcome onboarding: 4-tile grid (Follow artists / Join community / Share something / Explore events) with dismiss X — replace current `OnboardingCard`.
- Filter pills: `For You · Following · Nearby · Discover` (already present, restyle to match).

**2. Right sidebar**
- Add `UPCOMING EVENTS` section under `ARTISTS TO FOLLOW` (currently missing).
- Match spacing / header treatment (small icon + uppercase label + See all link).

**3. Left sidebar**
- Already close. Confirm order matches reference exactly: Home, Artists, Arts Orgs, Businesses, Calendar, Community Associations, Discover, Events, Groups/Communities, Messages, Neighborhoods, Notifications, Profile, Search, Stories, Videos, Baltimore 100, Settings.
- Login button pinned to bottom above chevron.

**4. Stories (`/stories`)**
- Orange hero banner "Stories — Discover stories from Baltimore's writing community" + `Write A Story` button on the right.
- `BROWSE BY FORMAT` dropdown (All Formats).
- Tabs: Discover · Trending · Featured (orange underline for active).
- Category pills: All / Poetry / Blog / Essay / Resource.
- List layout matching reference (same as home story cards).

**5. Artists (`/artists`)**
- Hero banner + `Create Artist Page` button (already present, refine spacing).
- Search input full-width left, `Newest` sort dropdown right (currently a pill, needs to be a select).
- Category pills: All / Visual Art / Music / Video / Photography / Performance / Literary / Fashion / Podcaster.
- Card: square image with rounded corners, name below, category, neighborhood.

**6. Events (`/events`)**
- Hero banner "Events — Find what's happening in Baltimore" + `Create Event` button.
- Match card layout (image, date chip, title, venue, neighborhood).

**7. Remaining pages** (Arts Orgs, Businesses, Calendar, Community Associations, Discover, Groups, Neighborhoods, Videos, Baltimore 100)
- Each gets the same hero-banner + filter-pills + card-grid pattern as above.
- One turn per page so you can approve as we go.

## Out of scope for this plan
- Data model changes (Base44 API stays as-is).
- Detail pages (`/o/$slug`, `/u/$username`, `/stories/$storyId`, `/events/$eventId`) — I'll flag those for a follow-up after list pages are aligned.
- Auth, admin, onboarding wizard, settings, notifications details.

## Confirm before I start
- OK to change the home feed so **Stories lead** instead of Posts? (Reference does this; you previously asked for posts to be visible — they'll still appear, just further down.)
- OK to remove the current `OnboardingCard` in favor of the reference's 4-tile Welcome card?
- Any page you want done first out of order?
