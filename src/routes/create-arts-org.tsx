import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/create-arts-org")({
  component: CreateArtsOrgPage,
  head: () => ({
    meta: [
      { title: "Create Arts Organization - Planet Baltimore" },
      { name: "description", content: "Register an arts organization on Planet Baltimore." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreateArtsOrgPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Arts Organization" subtitle="Bring your arts org into the network." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Arts org builder coming soon.
        </div>
      </div>
    </AppLayout>
  );
}