import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PlaceholderGrid } from "@/components/app-layout";
export const Route = createFileRoute("/discover")({
  component: () => (
    <AppLayout title="Discover Baltimore" subtitle="Find events, artists, communities, and stories across the city.">
      <PlaceholderGrid label="Item" />
    </AppLayout>
  ),
  head: () => ({ meta: [{ title: "Discover Baltimore — Planet Baltimore" }] }),
});
