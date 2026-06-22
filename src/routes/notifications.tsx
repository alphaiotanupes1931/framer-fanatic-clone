import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PlaceholderGrid } from "@/components/app-layout";
export const Route = createFileRoute("/notifications")({
  component: () => (
    <AppLayout title="Notifications" subtitle="What's new in your network.">
      <PlaceholderGrid label="Notification" />
    </AppLayout>
  ),
  head: () => ({ meta: [{ title: "Notifications - Planet Baltimore" }] }),
});
