# Big Batch Plan

Given the scope, here's how I'll tackle everything in order. A few items depend on info from you — flagged below.

## 1. Headers
- Add the standard `HeroBanner` to **Settings** and **Messages** pages so they match the rest of the app.

## 2. Quick activations
- **Search page**: wire the search input to query profiles, events, orgs, posts (already have `search_creators` RPC — extend for other tables).
- **Notifications page**: it already reads from `notifications` table + realtime. I'll verify realtime subscription is live and unread badges update instantly.

## 3. Neighborhoods map rework
- Remove colored region dots + legend.
- Query all upcoming events with lat/lng, drop one pin per event.
- Clicking a pin opens the event dialog (title, time, location, link to `/events/$eventId`).
- Requires event rows to have `latitude`/`longitude`. Events table currently stores `location` text + `neighborhood`. I'll add nullable `latitude`/`longitude` columns via migration and geocode from `location` when a user creates an event (using a lightweight geocoder — Nominatim, free, no key).

## 4. Content migration from planetbaltimore.us
I'll use Firecrawl to scrape:
- `planetbaltimore.us/baltimore-100` → seed Baltimore 100 page
- `planetbaltimore.us/videos` → seed Videos page
- `planetbaltimore.us/groups` (or equivalent) → seed Groups/Communities

**Base44**: you mentioned Base44 keys — I see `BASE44_API_KEY` is set. If you want me to pull structured data from your Base44 app instead of scraping, tell me the Base44 app ID and I'll hit their API. Otherwise I'll go with Firecrawl on the live site.

Firecrawl requires the Firecrawl connector. If not linked, I'll ask you to link it before this step.

## 5. Admin dashboard: landing page text
- New `/admin/content` section (visible only to admins via `has_role`).
- New `site_content` table: `key text PRIMARY KEY`, `value jsonb`, `updated_at`. Public read (anon SELECT), admin-only write.
- Landing page (`src/routes/index.tsx`) reads keys like `hero.title`, `hero.subtitle`, `about.body` from `site_content` with sensible defaults.
- Admin page: simple form per key, save button.

## Execution order
1. Headers (Settings, Messages) — 1 edit each
2. Site content table + admin page + landing page wiring
3. Search activation
4. Notifications realtime verification
5. Neighborhoods map (migration + geocoding + map rewrite)
6. Firecrawl scrape → seed Baltimore 100, Videos, Groups (needs connector link)

## What I need from you
- **Confirm Firecrawl** as the scrape source, or give the Base44 app ID if you'd rather I pull from there.
- **Landing page keys to make editable** — I'll default to hero title/subtitle/CTA + any about section. Tell me if there's more.

Reply "go" and I'll start with steps 1–5 immediately while you decide on the content source for step 6.
