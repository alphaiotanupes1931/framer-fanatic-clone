import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/promoter-dashboard")({
  component: PromoterDashboardPage,
  head: () => ({
    meta: [
      { title: "Promoter Dashboard - Planet Baltimore" },
      { name: "description", content: "Track your promoted events and reach." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function PromoterDashboardPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <HeroBanner title="Promoter Dashboard" subtitle="Reach, sales, and audience at a glance." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Promoter analytics coming soon.
        </div>
      </div>
    </AppLayout>
  );
}