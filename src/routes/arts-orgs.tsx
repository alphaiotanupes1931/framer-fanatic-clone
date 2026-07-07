import { createFileRoute } from "@tanstack/react-router";
import { OrgListPage } from "@/components/org-list-page";
export const Route = createFileRoute("/arts-orgs")({
  component: () => <OrgListPage type="arts_org" title="Arts Organizations" subtitle="The living cultural map of Baltimore." showFeatured />,
  head: () => ({ meta: [{ title: "Arts Organizations - Planet Baltimore" }] }),
});
