import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PlaceholderGrid } from "@/components/app-layout";
export const Route = createFileRoute("/events")({
  component: () => (
    <AppLayout title="Your Next Event" subtitle="Tickets for the best events in Baltimore." cta="Create Event" ctaTo="#">
      <PlaceholderGrid label="Event" />
    </AppLayout>
  ),
  head: () => ({ meta: [{ title: "Your Next Event — Planet Baltimore" }] }),
});
