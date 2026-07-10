import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { ProfileKindForm } from "@/components/create/profile-kind-form";

export const Route = createFileRoute("/create-visitor")({
  component: CreateVisitorPage,
  head: () => ({
    meta: [
      { title: "Create Visitor Profile - Planet Baltimore" },
      { name: "description", content: "Set up your Baltimore visitor profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreateVisitorPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Visitor Profile" subtitle="Introduce yourself to the Baltimore scene." />
        <ProfileKindForm kind="visitor" saveLabel="Save Visitor Profile" />
      </div>
    </AppLayout>
  );
}