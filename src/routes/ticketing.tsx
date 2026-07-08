import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Ticket, LayoutDashboard, LineChart, Megaphone } from "lucide-react";

export const Route = createFileRoute("/ticketing")({
  component: TicketingPage,
  head: () => ({
    meta: [
      { title: "Ticketing for Baltimore Events - Planet Baltimore" },
      { name: "description", content: "Sell tickets to your Baltimore events, track sales in real time, and share promoter links, all from one dashboard." },
      { property: "og:title", content: "Ticketing for Baltimore Events - Planet Baltimore" },
      { property: "og:description", content: "Sell tickets, track sales, and run promoters for your Baltimore events." },
    ],
  }),
});

const tools = [
  { to: "/events/new", icon: Ticket, title: "Create an event", body: "Publish a free RSVP or paid ticketed event in minutes." },
  { to: "/organizer-studio", icon: LayoutDashboard, title: "Organizer Studio", body: "Manage every event you host in one place." },
  { to: "/ticket-sales-dashboard", icon: LineChart, title: "Ticket sales", body: "See revenue, orders, and buyers per event." },
  { to: "/promoter-dashboard", icon: Megaphone, title: "Promoters", body: "Track promoter sales and shareable links." },
] as const;

function TicketingPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <HeroBanner title="Ticketing" subtitle="Everything you need to run a paid event in Baltimore." />
        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map(({ to, icon: Icon, title, body }) => (
            <Link key={to} to={to} className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-[#d4580a]/50 hover:shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#d4580a]/10 text-[#d4580a]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-900 group-hover:text-[#d4580a]">{title}</div>
                <div className="text-sm text-neutral-600">{body}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}