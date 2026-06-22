import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PlaceholderGrid } from "@/components/app-layout";
export const Route = createFileRoute("/calendar")({
  component: () => (
    <AppLayout title="Calendar" subtitle="Events from local businesses, organizations & communities." cta="Create Event" ctaTo="#">
      <PlaceholderGrid label="Event" />
    </AppLayout>
  ),
  head: () => ({ meta: [{ title: "Calendar - Planet Baltimore" }] }),
});
