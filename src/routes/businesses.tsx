import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PlaceholderGrid } from "@/components/app-layout";
export const Route = createFileRoute("/businesses")({
  component: () => (
    <AppLayout title="Businesses" subtitle="Discover and support local Baltimore businesses." cta="Create Business" ctaTo="#">
      <PlaceholderGrid label="Business" />
    </AppLayout>
  ),
  head: () => ({ meta: [{ title: "Businesses — Planet Baltimore" }] }),
});
