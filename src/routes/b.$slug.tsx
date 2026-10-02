import { createFileRoute } from "@tanstack/react-router";
import { OrgProfile } from "@/components/org/org-profile-page";
import { loadOrgSeo, orgHead, OrgError, OrgNotFound } from "@/components/org/org-route";

export const Route = createFileRoute("/b/$slug")({
  component: OrgProfile,
  loader: ({ params }) => loadOrgSeo(params.slug, "b"),
  head: ({ params, loaderData }) => orgHead("b", params.slug, loaderData),
  errorComponent: OrgError,
  notFoundComponent: OrgNotFound,
});
