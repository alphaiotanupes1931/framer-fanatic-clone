import { createFileRoute } from "@tanstack/react-router";
import { OrgProfile } from "@/components/org/org-profile-page";
import { loadOrgSeo, orgHead, OrgError, OrgNotFound } from "@/components/org/org-route";

export const Route = createFileRoute("/ca/$slug")({
  component: OrgProfile,
  loader: ({ params }) => loadOrgSeo(params.slug, "ca"),
  head: ({ params, loaderData }) => orgHead("ca", params.slug, loaderData),
  errorComponent: OrgError,
  notFoundComponent: OrgNotFound,
});
