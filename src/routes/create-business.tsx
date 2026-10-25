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
      { property: "og:title", content: "Create Business - Planet Baltimore" },
      { property: "og:description", content: "Create your business page with products, services or both on Planet Baltimore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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