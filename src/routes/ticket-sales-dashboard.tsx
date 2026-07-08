import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/ticket-sales-dashboard")({
  component: TicketSalesDashboardPage,
  head: () => ({
    meta: [
      { title: "Ticket Sales Dashboard - Planet Baltimore" },
      { name: "description", content: "Monitor ticket sales for your events." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function TicketSalesDashboardPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <HeroBanner title="Ticket Sales Dashboard" subtitle="Live view of orders and revenue." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Sales analytics coming soon.
        </div>
      </div>
    </AppLayout>
  );
}