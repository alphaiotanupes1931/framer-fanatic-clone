import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HandHeart, Building2, Users, Clock } from "lucide-react";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "Support - Planet Baltimore" },
      { name: "description", content: "Sponsor or donate to support Baltimore creators on Planet Baltimore." },
    ],
  }),
});

function SupportPage() {
  return (
    <AppLayout title="Support the platform" subtitle="For organizations and individuals who want to back Baltimore's creative community.">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-orange/10 via-card to-card p-8 sm:p-12">
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-orange/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-start gap-6 max-w-2xl">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange/15 text-orange">
            <HandHeart className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3 w-3" /> Coming soon
            </div>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
              Sponsor or donate to Planet Baltimore.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              We're building a home for Baltimore's artists, organizers and neighbors. Sponsorships and donations
              go directly toward keeping the platform free for creators, paying for events, and supporting local
              programming. If your organization wants to back the initiative, this page will soon let you contribute.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl border border-border bg-background/60 p-5">
              <Building2 className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <div className="mt-3 text-sm font-semibold text-foreground">For organizations</div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Sponsor a neighborhood, event series, or the platform as a whole.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-5">
              <Users className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <div className="mt-3 text-sm font-semibold text-foreground">For individuals</div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                One-time and recurring donations to keep this free for artists.
              </p>
            </div>
          </div>

          <div className="pt-2 text-[13px] text-muted-foreground">
            Want to get involved before this launches? Reach out at{" "}
            <a href="mailto:hello@planetbaltimore.com" className="font-medium text-foreground underline underline-offset-4">
              hello@planetbaltimore.com
            </a>
            .
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
