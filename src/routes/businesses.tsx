import { createFileRoute } from "@tanstack/react-router";
import { OrgListPage } from "@/components/org-list-page";
import { pageHead } from "@/lib/seo";
export const Route = createFileRoute("/businesses")({
  component: () => <OrgListPage type="business" title="Businesses" subtitle="Discover and support local Baltimore businesses." showMap={false} showSort />,
  head: () => pageHead({ path: "/businesses", title: "Baltimore Small Businesses | Planet Baltimore", description: "Discover local Baltimore shops, restaurants, cafes and bars, and support them directly." }),
});
