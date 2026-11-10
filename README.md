# Planet Baltimore

Planet Baltimore connects Baltimore residents, artists, businesses, arts organizations, and neighborhood communities. The app includes a social feed, public pages, private groups, events and festivals, ticketing, shops, messaging, and referrals.

Production: [planetbaltimore.com](https://planetbaltimore.com)

This is a full-stack application, not a static website. Running the frontend locally does not provision the database, storage, email delivery, or payment accounts.

## How it was built

The project has been developed iteratively with Claude Code. It uses React and TanStack Start for the application, with PostgreSQL, managed authentication, and object storage behind it. Most features combine file-based routes, shared React components, browser queries, and server functions for operations that need credentials or privileged access.

Parts of the UI were ported from an earlier application. `src/lib/entities.ts` is the compatibility adapter: it translates older field names such as `author_id` and `created_date` into the current database shape. Not every screen uses that adapter; many query the database client directly. Check both paths before changing a shared data field.

The codebase has grown around working product features rather than a strict module boundary. Some route files contain substantial UI and data logic. Follow the existing shared helpers where they exist, and avoid introducing a second implementation of the same business rule.

## Stack

Versions below reflect `package.json`; the lockfile records the resolved dependency versions.

| Area | Tools |
| --- | --- |
| Application | React 19.2, TypeScript 5.8, TanStack Start 1.168 |
| Routing | TanStack Router 1.170, file-based routes |
| Data and caching | TanStack Query 5, persisted browser query cache |
| Styling | Tailwind CSS 4.2, semantic CSS tokens, shadcn-style components and Radix UI |
| Forms | React Hook Form, Zod |
| Build | Vite 8, Nitro, shared Vite configuration wrapper |
| Backend | PostgreSQL, managed auth and storage, row-level security, database RPCs |
| Payments | Stripe 22, Connect, Checkout, signed webhooks |
| Email | Resend, React Email templates, managed email delivery endpoints |
| Maps | Leaflet and React Leaflet |
| Tickets | QRCode, jsQR, pdf-lib |
| Other UI | Lucide icons, Motion, Recharts |
| Testing and tooling | Vitest 5, ESLint 9, Prettier 3, Bun |

## Local development

### Prerequisites

- Bun and a current Node.js runtime compatible with Vite 8. Node.js 22.12 or newer is a reasonable baseline; this repository does not pin a Node version.
- Access to an approved development backend and its public browser configuration.
- Server-side credentials for whichever integrations you need to exercise. Reading the frontend does not require Stripe or email credentials, but those flows will fail without them.

```sh
bun install --frozen-lockfile
bun run dev
```

Use the URL printed by Vite. The hosted development environment uses port 8080; a standalone checkout may use a different port.

Bun is the preferred package manager for changes. Both `bun.lock` and `package-lock.json` exist, so avoid mixing installers casually. `bunfig.toml` includes a 24-hour minimum package release age with explicit exceptions.

### Configuration

Browser configuration is injected through Vite. Server credentials must remain server-only.

| Variables | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Public browser connection settings |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Server-side public client configuration used by some handlers |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server access where supplied by the deployment |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout, Connect operations, and webhook verification |
| `RESEND_API_KEY`, `LOVABLE_API_KEY` | Connected email delivery and managed email services |
| `LOVABLE_SEND_URL` | Optional managed auth-email delivery URL |
| `ADMIN_SHARED_USERNAME`, `ADMIN_SHARED_PASSWORD`, `ADMIN_SESSION_SECRET_V2` | Separate admin login and signed session configuration |
| `LOVABLE_DB_MIGRATION_URL` | Connection used by the Drizzle migration configuration |

These are variable names, not instructions to copy production secrets into a local checkout. The managed backend does not expose its privileged key or database password to project users. An independent deployment needs its own backend and credentials; some email endpoints also depend on managed services and are not portable by setting a mail key alone.

Use an untracked `.env.local` for local configuration. Never put secrets behind a `VITE_` prefix: those values can reach the browser bundle. Do not commit private keys, access tokens, or session files.

The generated browser client has deployment-specific settings. Changing environment variables alone is not proof that a checkout is isolated from production. Verify which backend the generated clients actually use before testing writes.

### Commands

```sh
bun run dev                      # Development server
bun run build                    # Production bundle
bun run build:dev                # Development-mode bundle
bun run preview                  # Preview the built application
bun run lint                     # ESLint
bunx vitest run                  # Unit tests
bunx vitest run src/lib/business-offers.test.ts
```

`bun run format` formats the whole repository. Use it intentionally; for a small change, format only the files you touched.

## Repository map

```text
src/
  routes/          Pages, dynamic routes, and HTTP handlers
  components/      Shared UI and feature-specific components
    ui/            Design-system primitives
    org/           Shared organization page experience
    artist/        Artist-specific views
    shared/        Feed cards, viewers, media, and follow controls
    create/        Page creation forms
  hooks/           Current user, roles, theme, cache, and UI hooks
  lib/             Domain helpers, server functions, email, and tests
  integrations/    Generated service clients and auth middleware
  assets/          Bundled media
  styles.css       Global styles and theme tokens
  router.tsx       Router and QueryClient configuration
  start.ts         Request and server-function middleware
  server.ts        Server entry and SSR error handling
  routeTree.gen.ts Generated route tree
drizzle/
  migrations/      Numbered SQL migrations and migration metadata
  schema.ts        Generated placeholder, currently empty
supabase/
  migrations/      Additional SQL migration history
public/            Static public files
AGENTS.md          Repository conventions and architectural rules
roadmap.md         Existing task checklist
```

## Architecture and data flow

### Routes and application shell

`src/routes/__root.tsx` owns the document shell, query provider, theme initialization, notifications, and shared guards. `src/router.tsx` creates the QueryClient and enables scroll restoration and intent-based preloading. `src/components/app-layout.tsx` supplies the main application layout.

Routes use TanStack file naming. For example, `events.$eventId.tsx` serves `/events/:eventId`. Add a real route file for every new destination; do not manually edit `src/routeTree.gen.ts` or add a separate React Router page switcher. See [the route conventions](src/routes/README.md).

### Browser queries and server functions

Browser queries go through the generated client and are subject to row-level security. App-internal server operations live primarily in `src/lib/*.functions.ts` and use `createServerFn`. Protected functions use the existing authentication middleware; `src/start.ts` attaches the user's bearer token to client calls.

Server-only integration code generally lives in `*.server.ts`. Keep private clients and credentials out of the browser import graph. A server function is not automatically protected merely because it runs on the server.

External HTTP entry points include:

- `src/routes/api/public/stripe-webhook.ts`
- `src/routes/api/public/hooks/weekly-profile-reminders.ts`
- Email delivery, preview, queue, and unsubscribe handlers under `src/routes/`

The `/api/public/` prefix is not an authorization boundary. Each handler must verify its own caller, webhook signature, or applicable credential.

### Database and migrations

The schema includes profiles, organizations, memberships and followers, posts and page stories, events, ticketing, product inventory, referrals, and messaging. Permissions and validation also live in SQL policies, functions, and triggers, not just in the forms.

Migration history is split between `supabase/migrations/` and `drizzle/migrations/`. `drizzle/schema.ts` is empty, so it is not a complete schema definition and should not be used to generate a replacement database with a schema-push command.

Before a schema change, compare the target database's applied history with both directories. Do not replay either directory blindly or assume one contains the entire baseline. Preserve existing migration files, add forward migrations, and review grants, RLS policies, triggers, and RPC callers together.

A Git commit does not apply SQL migrations. Backend changes need a separate, explicit migration step. Storage objects, auth-provider settings, secrets, scheduled jobs, and email configuration also need separate provisioning.

### Deployment

The current `vite.config.ts` selects Nitro's `vercel` preset and a custom server entry. The shared configuration wrapper already installs the React, TanStack, Tailwind, path-alias, and build plugins; adding them again can break the build.

Do not assume local Node behavior matches every hosting target. Parts of the code retain worker-compatible patterns, including Stripe's fetch-based HTTP client. Verify runtime compatibility when changing the deployment target.

`vercel.json` contains existing rewrites, including a development-proxy destination. Review those rewrites and generated output before deploying independently; this README does not certify the current file as a production deployment recipe.

Repository sync saves code, not a release. Publishing, applying migrations, configuring providers, and setting secrets are separate operations. The current GitHub connection and hosting settings are managed outside this checkout.

## Important domain conventions

Read [AGENTS.md](AGENTS.md) before changing these areas. In particular:

- **Profiles and pages are different identities.** A post made from a business or artist page should show that page's name, avatar, and link. See `src/lib/post-page-author.ts` and the entity adapter before changing post headers.
- **Organization URLs use shared helpers.** `src/lib/org-paths.ts` maps page types to `/a/`, `/ao/`, `/b/`, `/ca/`, `/g/`, `/r/`, and `/v/`. The database resolves slug collisions and retains aliases. `/o/:slug` is a compatibility redirect.
- **Followers are not one table.** Page audiences combine approved memberships and explicit follows. Use the shared audience readers so counts, lists, and messaging agree; pending requests do not count as followers.
- **Follow mode matters.** Posts Only and Posts & Messages are different choices. Do not accidentally include Posts Only followers in mass messaging.
- **Group content has an explicit public opt-in.** Posts and events use `also_public`; private organization events also use `is_private_org`. Preserve those fields in selects and filters. Hiding something in the feed is not an access-control check.
- **Business type and offer are separate.** Product, Service, and Both determine which offer tabs exist through `src/lib/business-offers.ts`. A category is not a substitute for an offer choice; existing blank choices must not be inferred from the business name.
- **Product categories are not checkout inventory.** The Lookbook-style category display and shop inventory have separate responsibilities. Preserve empty categories and scope media to the opened album/category.
- **Rich text needs deliberate rendering.** Story bodies preserve formatting through the shared editor and renderer. Short card descriptions need plain text, not escaped HTML fragments. See `src/lib/text-utils.ts` and `src/components/rich-html.tsx`.
- **Ticketing has database rules.** Read capacity, RSVP, payment, and refund helpers alongside the SQL functions before changing quantities or statuses. Failed or refunded tickets must not be treated as active admissions.
- **Referral templates are account-specific.** Saved wording and recipient state must not leak between users. Preserve suppression and unsubscribe handling when changing delivery.
- **Styling is token-based.** Reuse the existing UI components and semantic tokens in `src/styles.css`. Check light and dark themes; do not hardcode a second color system in a feature.

## Testing and handoff

Unit tests sit next to helpers in `src/lib/`, including business offers, calendar filters, neighborhood artists, search, fashion items, referral recipients, email templates, quotas, and usage metrics. There is no `test` script in `package.json`; run Vitest directly. These tests cover selected rules, not every screen or integration.

For a change that affects a real workflow:

1. Run the relevant helper tests and lint the files you changed.
2. Check the production bundle in your development or CI environment.
3. Exercise the screen as the right account: owner, assigned staff, member, or public visitor as applicable.
4. Verify a successful write reads back through the UI. An optimistic success message is not enough.
5. For visibility changes, check both public discovery and direct-link access.
6. Check mobile layout, dark mode, and browser Back behavior where relevant.

Use an isolated backend and Stripe test mode for write-heavy checks. Do not seed fake content into the live community, send referral mail to real recipients, or create real charges just to validate a change.

### Good starting points

| Working on | Start here |
| --- | --- |
| Home feed or post identity | `src/routes/dashboard.tsx`, `src/lib/entities.ts`, `src/lib/post-page-author.ts` |
| Business and arts organization discovery | `src/components/org-list-page.tsx`, `src/lib/categories.ts` |
| Organization page creation | `src/components/create/org-form.tsx` |
| Shared page tabs and content | `src/components/org/`, `src/lib/business-offers.ts`, `src/lib/artist-tabs.ts` |
| Events and calendar | `src/routes/events.new.tsx`, `src/routes/events.$eventId.tsx`, `src/lib/events.functions.ts`, `src/lib/calendar-filters.ts` |
| Payments and ticketing | `src/lib/stripe.functions.ts`, `src/lib/stripe.server.ts`, `src/lib/tickets.functions.ts` |
| Referrals and email | `src/components/referral-network-dialog.tsx`, `src/lib/referral-recipients.ts`, `src/lib/email-templates/`, `src/lib/resend.server.ts` |
| Authentication and staff access | `src/hooks/use-current-user.ts`, `src/start.ts`, `src/lib/staff-login.functions.ts`, `src/lib/org-access.functions.ts` |
| Admin tools | `src/routes/admin.*`, `src/components/admin/`, `src/lib/admin-site.functions.ts` |

Keep changes focused. If a feature touches permissions, stored data, or paid flows, document the migration and manual verification needed in the pull request rather than treating it as a frontend-only change.