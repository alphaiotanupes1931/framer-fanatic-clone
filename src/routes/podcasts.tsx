import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Mic, Plus, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ListSkeleton } from "@/components/shared/empty-state";

type Pod = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  neighborhood: string | null;
  bio: string | null;
};

function PodcastsPage() {
  const [items, setItems] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, neighborhood, bio, category")
        .eq("hidden_from_showcase", false)
        .ilike("category", "%podcast%")
        .order("created_at", { ascending: false })
        .limit(48);
      setItems((data ?? []) as Pod[]);
      setLoading(false);
    })();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <HeroBanner
          title="Planet Baltimore Podcasts"
          subtitle="Real voices, real stories from Baltimore creators."
          cta={
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 rounded-full border border-[#d4580a]/40 bg-white px-4 py-2 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
            >
              <Plus className="h-4 w-4" /> Add your podcast
            </Link>
          }
        />

        {!loading && (
          <div className="text-sm text-neutral-500">
            {items.length} podcast{items.length === 1 ? "" : "s"} on Planet Baltimore
          </div>
        )}

        {loading ? (
          <ListSkeleton count={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Mic}
            title="No podcasts yet"
            description="Be the first to add yours."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((p) => {
              const name = p.display_name || p.username || "Podcast";
              return (
                <Link
                  key={p.id}
                  to="/u/$username"
                  params={{ username: p.username || p.id }}
                  className="group flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm"
                >
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400">
                        <Mic className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-bold text-neutral-900">{name}</div>
                    {p.neighborhood && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-sm text-neutral-500">
                        <MapPin className="h-3.5 w-3.5" /> {p.neighborhood}
                      </div>
                    )}
                    {p.bio && <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{p.bio}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export const Route = createFileRoute("/podcasts")({
  component: PodcastsPage,
  head: () => ({ meta: [
    { title: "Planet Baltimore Podcasts" },
    { name: "description", content: "Real voices, real stories from Baltimore creators." },
  ] }),
});
