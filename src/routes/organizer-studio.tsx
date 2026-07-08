import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/organizer-studio")({
  component: OrganizerStudioPage,
  head: () => ({
    meta: [
      { title: "Organizer Studio - Planet Baltimore" },
      { name: "description", content: "Tools for Baltimore event organizers." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function OrganizerStudioPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <HeroBanner title="Organizer Studio" subtitle="Plan, publish, and track your events." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Organizer tools coming soon.
        </div>
      </div>
    </AppLayout>
  );
}