import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/create-artist")({
  component: CreateArtistPage,
  head: () => ({
    meta: [
      { title: "Create Artist Profile - Planet Baltimore" },
      { name: "description", content: "Set up an artist profile on Planet Baltimore." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreateArtistPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Artist Profile" subtitle="Claim your spot on the Baltimore scene." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Artist profile builder coming soon.
        </div>
      </div>
    </AppLayout>
  );
}