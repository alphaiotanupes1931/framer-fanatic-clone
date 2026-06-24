import { createFileRoute } from "@tanstack/react-router";
import { OrgListPage } from "@/components/org-list-page";
export const Route = createFileRoute("/community-associations")({
  component: () => <OrgListPage type="community_assoc" title="Community Associations" subtitle="Official community governance hubs for Baltimore neighborhoods." />,
  head: () => ({ meta: [{ title: "Community Associations - Planet Baltimore" }] }),
});
