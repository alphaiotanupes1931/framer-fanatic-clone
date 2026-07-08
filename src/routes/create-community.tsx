import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/create-community")({
  component: CreateCommunityPage,
  head: () => ({
    meta: [
      { title: "Create Community - Planet Baltimore" },
      { name: "description", content: "Start a new community on Planet Baltimore." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreateCommunityPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Community" subtitle="Build a space around a shared interest." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Community builder coming soon.
        </div>
      </div>
    </AppLayout>
  );
}