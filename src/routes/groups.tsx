import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PlaceholderGrid } from "@/components/app-layout";
export const Route = createFileRoute("/groups")({
  component: () => (
    <AppLayout title="Groups / Communities" subtitle="Find your people and build something together in Baltimore." cta="Create Group" ctaTo="#">
      <PlaceholderGrid label="Group" />
    </AppLayout>
  ),
  head: () => ({ meta: [{ title: "Groups / Communities - Planet Baltimore" }] }),
});
