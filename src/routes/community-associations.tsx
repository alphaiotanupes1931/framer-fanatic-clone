import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PlaceholderGrid } from "@/components/app-layout";
export const Route = createFileRoute("/community-associations")({
  component: () => (
    <AppLayout title="Community Associations" subtitle="Official community governance hubs for Baltimore neighborhoods." cta="Create Community Association" ctaTo="#">
      <PlaceholderGrid label="Association" />
    </AppLayout>
  ),
  head: () => ({ meta: [{ title: "Community Associations — Planet Baltimore" }] }),
});
