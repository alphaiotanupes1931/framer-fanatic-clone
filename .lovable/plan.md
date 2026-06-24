## What you get

### 1. Onboarding categories (20 options)
Add a required "What best describes you?" step in `/onboarding`. Options:

Attendee, Musician, Podcaster, Visual Artist, Photographer, Videographer, Filmmaker, Fashion Designer, Graphic Designer, Writer, Poet, Dancer, DJ, Producer, Comedian, Chef / Culinary, Tattoo Artist, Muralist, Curator, Event Organizer.

Stored on `profiles.category` (new column). Used everywhere to shape the public profile.

### 2. Everyone can post videos
- Loosen the `/videos` page so any signed-in user sees Add Video (DB policy already allows it).
- Attendees keep the no-posts/no-events restriction; videos become the universal creative outlet.

### 3. Category-specific public profile tabs
The base tabs (Posts, Videos, Events, About) stay. On top, smart-defaults add tabs per category:

- Visual Artist / Muralist / Photographer: Gallery, Studio
- Podcaster: Episodes, Series
- Musician / DJ / Producer: Tracks, Shows
- Videographer / Filmmaker: Reels, Projects
- Writer / Poet: Writings
- Fashion / Graphic Designer: Lookbook, Shop
- Dancer / Comedian: Performances
- Chef: Menu, Pop-ups
- Tattoo Artist: Portfolio, Booking
- Curator / Event Organizer: Curated, Upcoming
- Attendee: just base tabs

New table `profile_sections` (user_id, kind, title, body, media_url, link_url, order_index) feeds these tabs. Owners can add/edit cards in each tab; visitors just view.

### 4. Arts Orgs / Businesses / Community Assocs / Groups
- New table `organizations` with columns: id, owner_id, type (`arts_org` | `business` | `community_assoc` | `group`), subtype, name, slug, bio, avatar_url, banner_url, website, phone, email, address, neighborhood, hours (jsonb), created_at.
- Arts org subtypes (filter chips on `/arts-orgs`): Museum, Gallery, Studio, Collective, Residency, Non-profit, Cultural Center, Performance Venue, Education, Public Art.
- Each org has a public profile at `/o/$slug` with tabs: About, Events, Opportunities, Press, Updates, Comments. Owner can post into Opportunities / Press / Updates; anyone signed-in can comment.
- Supporting tables: `organization_posts` (kind, title, body, link_url, media_url) and `organization_comments` (org_id, user_id, body).
- Creation restricted to artists + admins via RLS using `has_role`.
- `/arts-orgs`, `/businesses`, `/community-associations`, `/groups` become real list pages with search + (arts-orgs only) subtype filter chips + Create button (artist/admin only).

### 5. Dashboard share button
A floating "Share Planet Baltimore" button in the dashboard corner. Uses Web Share API where available, otherwise copies the site URL with a toast.

---

## Technical detail

### Migrations (one batch)
1. `ALTER TABLE profiles ADD COLUMN category text;`
2. `CREATE TABLE profile_sections (...)` + grants + RLS (owner write, public read).
3. `CREATE TABLE organizations (...)` + slug unique + grants + RLS (insert/update gated by `has_role(auth.uid(),'artist') OR has_role(auth.uid(),'admin')`, public read).
4. `CREATE TABLE organization_posts (...)` + RLS (owner write, public read).
5. `CREATE TABLE organization_comments (...)` + RLS (authenticated insert as self, public read, owner/author delete).
6. Indexes on org `(type, subtype, neighborhood)` and `organization_posts(org_id, kind)`.

### Files touched / created
- `src/routes/onboarding.tsx` — add category step.
- `src/routes/profile.tsx` — render category tabs from `profile_sections` with an inline editor for owners.
- `src/routes/o.$slug.tsx` — new public org profile page with tabs.
- `src/routes/arts-orgs.tsx`, `businesses.tsx`, `community-associations.tsx`, `groups.tsx` — real list pages with search/filter/create.
- `src/components/org-create-dialog.tsx` — shared create form (artist/admin gated).
- `src/routes/dashboard.tsx` — fixed share button.
- `src/routes/videos.tsx` — confirm Add Video visible for everyone signed-in.
- `src/hooks/use-user-role.ts` — no change.

### Out of scope (call out so you know)
- No payments/ticketing on opportunities — just listings.
- "Hours" stored as simple `{mon:{open,close}, ...}` jsonb; UI is a compact day-by-day editor, not a calendar widget.
- Org photos use existing `avatars` storage bucket.

### Estimated migrations
1 migration with everything above (CREATE TABLE + GRANT + RLS + indexes), then several file writes.
