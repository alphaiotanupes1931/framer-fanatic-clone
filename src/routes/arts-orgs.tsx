import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PlaceholderGrid } from "@/components/app-layout";
export const Route = createFileRoute("/arts-orgs")({
  component: () => (
    <AppLayout title="Arts Organizations" subtitle="The living cultural map of Baltimore." cta="Create Arts Org" ctaTo="#">
      <PlaceholderGrid label="Arts Org" />
    </AppLayout>
  ),
  head: () => ({ meta: [{ title: "Arts Organizations - Planet Baltimore" }] }),
});
