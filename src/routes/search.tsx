import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PlaceholderGrid } from "@/components/app-layout";
export const Route = createFileRoute("/search")({
  component: () => (
    <AppLayout title="Search" subtitle="Find anything across Planet Baltimore.">
      <PlaceholderGrid label="Result" />
    </AppLayout>
  ),
  head: () => ({ meta: [{ title: "Search — Planet Baltimore" }] }),
});
