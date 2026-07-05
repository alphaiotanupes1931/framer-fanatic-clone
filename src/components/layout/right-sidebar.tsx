import { Link } from "@tanstack/react-router";
import { TrendingUp, Sparkles, ArrowRight, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Story, Event } from "@/lib/entities";
import { supabase } from "@/integrations/supabase/client";
import { EventImage } from "@/components/event-image";
import type { ReactNode, ComponentType } from "react";

function SuggestionSection({ title, icon: Icon, children, seeAllLink }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode; seeAllLink?: string }) {
  return (
    <div className="mb-7">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-[#d4580a]" />
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
        </div>
        {seeAllLink && (
          <Link to={seeAllLink} className="text-[11px] font-bold" style={{ color: "#d4580a" }}>See all</Link>
        )}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function RightSidebar() {
  const { data: stories = [] } = useQuery({
    queryKey: ["sidebar-stories"],
    queryFn: () => Story.filter({ status: "published" }, "-created_at", 5),
    staleTime: 300000,
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["sidebar-artists"],
    queryFn: async () => {
      const { data } = await supabase.rpc("public_creators", { lim: 5 });
      return data ?? [];
    },
    staleTime: 300000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["sidebar-events"],
    queryFn: () => Event.filter({ status: "upcoming" }, "date", 5),
    staleTime: 300000,
  });

  return (
    <aside className="fixed right-0 top-0 z-30 hidden h-screen w-[19%] min-w-[240px] overflow-y-auto border-l border-border bg-card xl:block">
      <div className="space-y-5 p-4 pt-20 sm:p-5 sm:pt-24">
        {stories.length > 0 && (
          <SuggestionSection title="Trending Stories" icon={TrendingUp} seeAllLink="/stories">
            {stories.map((s: any, i: number) => (
              <Link
                key={s.id}
                to="/stories/$storyId"
                params={{ storyId: s.id }}
                className="group flex items-start gap-4 rounded-lg p-2 transition-all duration-150 hover:bg-secondary/60 active:bg-secondary"
              >
                <span className="w-6 flex-shrink-0 pt-0.5 text-xl font-black italic leading-none text-muted-foreground/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-[#d4580a]">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.author_name}</p>
                </div>
              </Link>
            ))}
          </SuggestionSection>
        )}

        {artists.length > 0 && (
          <SuggestionSection title="Artists to Follow" icon={Sparkles} seeAllLink="/artists">
            {artists.map((a: any) => (
              <Link
                key={a.id}
                to="/u/$username"
                params={{ username: a.username || a.id }}
                className="group flex items-center gap-3 rounded-xl p-2 transition-all duration-150 hover:bg-secondary/60 active:bg-secondary"
              >
                <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-[#d4580a]/40 to-[#d4580a]/5 p-[2px] ring-1 ring-border/60">
                  <Avatar className="h-11 w-11 rounded-2xl">
                    <AvatarImage src={a.avatar_url} className="rounded-2xl object-cover" />
                    <AvatarFallback className="rounded-2xl bg-card text-sm font-bold text-foreground">{a.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-[#d4580a]">{a.display_name || a.username}</p>
                  <p className="truncate text-xs capitalize text-muted-foreground">{(a.category || a.role || "Artist").replace("_", " ")}</p>
                </div>
              </Link>
            ))}
          </SuggestionSection>
        )}

        {events.length > 0 && (
          <SuggestionSection title="Upcoming Events" icon={Calendar} seeAllLink="/events">
            {events.map((e: any) => (
              <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className="group flex items-center gap-3 rounded-lg p-1.5 transition-all duration-150 hover:bg-secondary/60 active:bg-secondary">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-accent/10">
                  {e.image_url ? (
                    <EventImage src={e.image_url} alt={e.title} className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-accent-foreground">{e.title?.charAt(0)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-[#d4580a]">{e.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.starts_at ? new Date(e.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                    {e.venue_name ? ` · ${e.venue_name}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </SuggestionSection>
        )}

        <div className="border-t border-border pt-4">
          <Link to="/search" className="group flex items-center gap-2 rounded-md p-0.5 text-sm font-medium transition-all duration-150" style={{ color: "#d4580a" }}>
            Explore more of Baltimore
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground/60">© 2026 Planet Baltimore</p>
      </div>
    </aside>
  );
}