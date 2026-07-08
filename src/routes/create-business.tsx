import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { OrgForm } from "@/components/create/org-form";

export const Route = createFileRoute("/create-business")({
  component: CreateBusinessPage,
  head: () => ({
    meta: [
      { title: "Create Business - Planet Baltimore" },
      { name: "description", content: "List a Baltimore business on Planet Baltimore." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreateBusinessPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Business" subtitle="Put your Baltimore business on the map." />
        <OrgForm type="business" kindLabel="Business" />
      </div>
    </AppLayout>
  );
}