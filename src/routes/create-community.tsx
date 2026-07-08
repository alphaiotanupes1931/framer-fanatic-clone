import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { OrgForm } from "@/components/create/org-form";

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
        <OrgForm type="group" kindLabel="Community" />
      </div>
    </AppLayout>
  );
}