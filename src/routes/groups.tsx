import { createFileRoute } from "@tanstack/react-router";
import { OrgListPage } from "@/components/org-list-page";
export const Route = createFileRoute("/groups")({
  component: () => <OrgListPage type="group" title="Groups / Communities" subtitle="Find your people and build something together in Baltimore." />,
  head: () => ({ meta: [{ title: "Groups / Communities - Planet Baltimore" }] }),
});
