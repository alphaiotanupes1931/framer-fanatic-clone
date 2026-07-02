# Full rebuild plan: planet-baltimore repo → this app

Goal: the app looks and behaves like the GitHub repo (`AinsleyBurrows/planet-baltimore`), not the current editorial design. All routes, chrome, cards, and colors come from the repo. Backend stays on your Supabase; missing tables/columns get added.

Because this touches ~50 pages and ~40 components, I'll ship it in phases. Each phase ends with a working preview and I check in before starting the next.

## Phase 0 — Schema deltas (this turn, needs your approval)

Repo assumes some tables/columns you don't have. Adding the missing ones now avoids ugly workarounds later.

- New table `public.ephemeral_stories` — 24-hour "Story bar" items (author, media_url, expires_at). Not the same as `stories` (long-form).
- New column `public.posts.is_deleted boolean default false` — repo filters soft-deletes.
- New column `public.stories.status text default 'published'` — repo filters by `status='published'`.
- New column `public.events.status text default 'upcoming'` — repo filters by `status='upcoming'`. Kept alongside your existing `is_published`.
- New column `public.profiles.neighborhood_names text[] default '{}'` — repo supports multiple neighborhoods; will backfill from existing `neighborhood`.

RLS + GRANTs included. Existing tables unchanged in shape.

Where the repo uses fields I *won't* add (e.g. `follows.target_name`, `posts.author_name`, `posts.page_id`), I adapt the ported code to use the equivalent join through `public_profiles_by_ids` / `follows.following_id`. This keeps the DB clean.

## Phase 1 — App shell + Dashboard

Replace `AppLayout` and rebuild `/dashboard` (the repo's `Home.jsx`).

Chrome, all ported from the repo:
- `LeftSidebar` — nav (Home, Discover, Communities, Events, Marketplace, Messages, Notifications, Profile, Settings) with brand mark
- `RightSidebar` — trending, artists to follow, upcoming events
- `TopMenuBar` — top bar with search + avatar
- `MobileNav` — bottom tab bar for mobile

Dashboard:
- Orange-bordered "Planet Baltimore" hero
- 4 filter chips: For You / Following / Nearby / Discover
- `StoryBar` (ephemeral stories with Add-Story modal + viewer)
- My Neighborhood quick-filter button
- `OnboardingCard` for 0-follow users
- Mixed feed of `PostCard`, `StoryCard`, `EventCard` wrapped in `DiscoverCard` badges
- Composer via repo's `CreatePost` flow

Delete/replace: current `src/components/app-layout.tsx`, current `dashboard.tsx` implementation, current welcome-hero + CreatorSearch styling.

## Phase 2 — Content routes

Rebuild page-by-page using the repo's designs and shared cards:
- `Home` (done in Phase 1)
- `Discover`, `Artists` + `ArtistDetail`, `Businesses` + `BusinessDetail`
- `ArtsOrganizations` + `ArtsOrgDetail`, `CommunityAssociations` + detail, `Communities` + `CommunityDetail`
- `Events` + `EventDetail`, `Stories` + `StoryDetail`, `Podcasts`, `Videos`
- `Marketplace` + detail + sell + confirmation
- `Neighborhoods`, `CommunityCalendar`, `Leaderboard`, `Search`

Create flows: `CreatePost`, `CreateArtist`, `CreateBusiness`, `CreateArtsOrg`, `CreateCommunity`, `CreateCommunityAssociation`, `CreateEvent`, `CreateStory`.

## Phase 3 — User surfaces

`Profile`, `Messages` (real-time), `Notifications`, `NotificationSettings`, `Settings`, `OrganizerStudio`, `PromoterDashboard`, `TicketingHub`, `TicketSalesDashboard`, `EventCheckIn`, `WritingDashboardV2`, `AdminDashboard`, `AdminReports`.

## Phase 4 — Polish

Theme tokens matched to repo's `index.css` (the `#d4580a` orange, radii, shadows). Fonts, spacing, dark mode. Any remaining repo pages (BannerPreview, MarketplaceConfirmation, StoriesV2, StoryDetailV2).

## Technical details

**Data adapter layer**: repo code uses `base44.entities.Post/Story/Event/Follow`. I'm replacing every entity call with Supabase equivalents in a thin adapter (`src/lib/entities.ts`) so ported components need almost no changes — `Post.list('-created_date', 50)` becomes `supabase.from('posts').select().order('created_at', {ascending:false}).limit(50)`.

**Column renames** the adapter handles: `created_date`→`created_at`, `author_id`→`user_id`, `organizer_id`→`user_id`, `neighborhood_name`→`neighborhood`, `is_deleted` (new column above), `target_id`→`following_id`.

**Auth**: keep current Supabase auth. `base44.auth.me()` maps to `supabase.auth.getUser()` + `profiles` join.

**Routing**: repo uses `react-router-dom`. Rewriting imports to `@tanstack/react-router` and using `to`/`params` shape. Each page becomes a file under `src/routes/`.

**Deletes**: current `src/components/app-layout.tsx`, `src/components/globe.tsx` (not in repo), and any welcome-hero/editorial styling get removed as they're replaced.

**Not touching**: `src/integrations/supabase/*` (managed), `src/routeTree.gen.ts` (generated), auth flow.

## What I need from you before Phase 1

Approve the Phase 0 migration (I'll submit it right after this plan). Once it runs, I start on shell + dashboard. Expect Phase 1 to take one full turn; Phases 2–4 will each take multiple turns.

Sound good, or want to trim scope (skip admin pages, skip marketplace, etc.)?