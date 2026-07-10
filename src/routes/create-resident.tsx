import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { ProfileKindForm } from "@/components/create/profile-kind-form";

export const Route = createFileRoute("/create-resident")({
  component: CreateResidentPage,
  head: () => ({
    meta: [
      { title: "Create Resident Profile - Planet Baltimore" },
      { name: "description", content: "Set up your Baltimore resident profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreateResidentPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Resident Profile" subtitle="Share your Baltimore neighborhood story." />
        <ProfileKindForm kind="resident" saveLabel="Save Resident Profile" />
      </div>
    </AppLayout>
  );
}