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

- Canonical organization pages use type-prefixed, dashless slugs through shared page-link helpers; the database allocates collision-safe slugs and aliases old slugs, while `/o/:slug` remains redirect-only for compatibility.
- Page follower counts and lists share a deduplicated audience reader combining approved memberships and explicit follows, because existing Follow controls persist memberships; pending requests remain excluded.
- Group and community About composes the existing details and text-document editors, synchronizing saved mission and rules into page state so tab changes preserve current content without changing storage or permissions.
- Fashion album photo navigation stays scoped to the opened album in both viewers, so arrows never mix separate fashion lines or lookbooks.
- Search combines direct page-name matches with public pages owned by matched profiles, deduplicating by page ID so separately named artist and business pages remain discoverable.
- Calendar view and separate per-view organizer filters live in URL search parameters so switching views preserves each selection and browser history.
- Referral recipients use one normalized text source persisted per account in browser storage; deletion confirms returned database IDs before updating the list, preventing stale parsing and silent failed deletes.
- Page story composers use the shared rich-text editor and readers preserve its HTML formatting; business Stories opt into custom tags stored on organization_posts, keeping tags separate from the story body.
