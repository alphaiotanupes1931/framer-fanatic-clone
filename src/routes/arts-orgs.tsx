import { createFileRoute } from "@tanstack/react-router";
import { OrgListPage } from "@/components/org-list-page";
import { pageHead } from "@/lib/seo";
export const Route = createFileRoute("/arts-orgs")({
  component: () => <OrgListPage type="arts_org" title="Arts Organizations" subtitle="The living cultural map of Baltimore." showFeatured />,
  head: () => pageHead({ path: "/arts-orgs", title: "Baltimore Arts Organizations | Planet Baltimore", description: "Galleries, theaters, studios and nonprofits building the Baltimore arts scene." }),
});
