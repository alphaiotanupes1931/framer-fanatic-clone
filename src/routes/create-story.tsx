import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/create-story")({
  component: CreateStoryPage,
  head: () => ({
    meta: [
      { title: "Create Story - Planet Baltimore" },
      { name: "description", content: "Write a long-form story for the Planet Baltimore community." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreateStoryPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Story" subtitle="Publish a long-form piece for Baltimore." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Story editor coming soon.
        </div>
      </div>
    </AppLayout>
  );
}