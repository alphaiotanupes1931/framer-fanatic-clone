import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/create-post")({
  component: CreatePostPage,
  head: () => ({
    meta: [
      { title: "Create Post - Planet Baltimore" },
      { name: "description", content: "Share an update, photo, or story with the Planet Baltimore community." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreatePostPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Post" subtitle="Share what's happening in Baltimore." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Post composer coming soon.
        </div>
      </div>
    </AppLayout>
  );
}