<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

> [!IMPORTANT]
> Avoid rewriting published git history by force pushing or rebasing, amending,
> or squashing commits that are already pushed. This can cause project history
> to be lost in the connected editor.
>
> Commits on the connected branch sync to the editor, so keep the branch in a
> working state.

- Canonical organization pages use type-prefixed, dashless slugs through shared page-link helpers; the database allocates collision-safe slugs and aliases old slugs, while `/o/:slug` remains redirect-only for compatibility.
- Page follower counts and lists share a deduplicated audience reader combining approved memberships and explicit follows, because existing Follow controls persist memberships; pending requests remain excluded.
- Group and community About composes the existing details and text-document editors, synchronizing saved mission and rules into page state so tab changes preserve current content without changing storage or permissions.
- Fashion album photo navigation stays scoped to the opened album in both viewers, so arrows never mix separate fashion lines or lookbooks.
- Business product categories reuse the fashion album layout with independent category records and category-linked artwork rows scoped to the products section, so empty categories persist and checkout inventory stays separate.
- Business offer tab selection is centralized in a browser-safe helper, so creation, editing, defaults and visibility agree without inferring an offer from business type.
- Search combines direct page-name matches with public pages owned by matched profiles, deduplicating by page ID so separately named artist and business pages remain discoverable.
- Calendar view and separate per-view organizer filters live in URL search parameters so switching views preserves each selection and browser history.
- Referral recipients use one normalized text source persisted per account in browser storage; deletion confirms returned database IDs before updating the list, preventing stale parsing and silent failed deletes.
- Referral email subjects, previews and body headings share one subject resolver so saved wording cannot diverge between the inbox and email content.
- Page story composers use the shared rich-text editor and readers preserve its HTML formatting; business Stories opt into custom tags stored on organization_posts, keeping tags separate from the story body.
- Existing page stories are edited in the shared page story composer through the authenticated browser client and existing page-management policies; updates preserve authorship and confirm returned IDs so denied saves cannot appear successful.
- Neighborhood Artists combines personal artist profiles with public, visible artist organization pages through a browser-safe selector and canonical page links, because artist pages store their own neighborhood independently of the owner's profile.
