import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

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
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Business listing builder coming soon.
        </div>
      </div>
    </AppLayout>
  );
}