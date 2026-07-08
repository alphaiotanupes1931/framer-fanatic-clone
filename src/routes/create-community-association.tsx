import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/create-community-association")({
  component: CreateCommunityAssociationPage,
  head: () => ({
    meta: [
      { title: "Create Community Association - Planet Baltimore" },
      { name: "description", content: "Register a Baltimore neighborhood association." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreateCommunityAssociationPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Community Association" subtitle="Register your neighborhood association." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Association builder coming soon.
        </div>
      </div>
    </AppLayout>
  );
}