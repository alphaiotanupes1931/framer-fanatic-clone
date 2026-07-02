import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Mic } from "lucide-react";

function PodcastsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <HeroBanner
          title="Podcasts"
          subtitle="Voices, interviews, and conversations from Baltimore."
        />
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#d4580a]/10">
            <Mic className="h-6 w-6" style={{ color: "#d4580a" }} />
          </div>
          <h3 className="text-base font-semibold text-foreground">Podcast directory coming soon</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            We're gathering Baltimore's best audio storytellers. Check back shortly.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

export const Route = createFileRoute("/podcasts")({
  component: PodcastsPage,
  head: () => ({ meta: [
    { title: "Podcasts - Planet Baltimore" },
    { name: "description", content: "Baltimore's podcast community." },
  ] }),
});
