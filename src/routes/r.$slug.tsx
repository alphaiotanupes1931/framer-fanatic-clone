import { createFileRoute } from "@tanstack/react-router";
import { OrgProfile } from "@/components/org/org-profile-page";
import { loadOrgSeo, orgHead, OrgError, OrgNotFound } from "@/components/org/org-route";

export const Route = createFileRoute("/r/$slug")({
  component: OrgProfile,
  loader: ({ params }) => loadOrgSeo(params.slug, "r"),
  head: ({ params, loaderData }) => orgHead("r", params.slug, loaderData),
  errorComponent: OrgError,
  notFoundComponent: OrgNotFound,
});
