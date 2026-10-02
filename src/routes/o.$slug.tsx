import { createFileRoute, redirect, notFound } from "@tanstack/react-router";
import { resolveOrgSlug } from "@/lib/org-access.functions";
import { orgPrefix } from "@/lib/org-paths";
import { OrgNotFound } from "@/components/org/org-route";

// Pages now live at short typed URLs (/b/slug, /g/slug ...). Old /o/ links forward there.
export const Route = createFileRoute("/o/$slug")({
  beforeLoad: async ({ params, location }) => {
    // Leave sub-pages like /o/slug/donate alone.
    if (location.pathname.replace(/\/$/, "") !== `/o/${params.slug}`) return;
    const resolved = await resolveOrgSlug({ data: { slug: params.slug } });
    if (!resolved.type || !resolved.slug) throw notFound();
    throw redirect({ href: `/${orgPrefix(resolved.type)}/${resolved.slug}${location.searchStr ?? ""}`, replace: true });
  },
  notFoundComponent: OrgNotFound,
  head: () => ({ meta: [{ title: "Planet Baltimore" }, { name: "robots", content: "noindex" }] }),
});
