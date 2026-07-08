import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/ticketing")({
  component: TicketingPage,
  head: () => ({
    meta: [
      { title: "Ticketing - Planet Baltimore" },
      { name: "description", content: "Sell and manage event tickets on Planet Baltimore." },
    ],
  }),
});

function TicketingPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <HeroBanner title="Ticketing" subtitle="Sell tickets to your Baltimore events." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Ticketing tools coming soon.
        </div>
      </div>
    </AppLayout>
  );
}