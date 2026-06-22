import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PlaceholderGrid } from "@/components/app-layout";
export const Route = createFileRoute("/artists")({
  component: () => (
    <AppLayout title="Artists" subtitle="Discover Baltimore's creative voices — visual art, music, photography & more." cta="Create Artist Page" ctaTo="#">
      <PlaceholderGrid label="Artist" />
    </AppLayout>
  ),
  head: () => ({ meta: [{ title: "Artists — Planet Baltimore" }] }),
});