import { createFileRoute } from "@tanstack/react-router";
import { OrgListPage } from "@/components/org-list-page";
export const Route = createFileRoute("/businesses")({
  component: () => <OrgListPage type="business" title="Businesses" subtitle="Discover and support local Baltimore businesses." showMap={false} showSort />,
  head: () => ({ meta: [{ title: "Businesses - Planet Baltimore" }] }),
});
