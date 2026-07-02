import { Link } from "@tanstack/react-router";
import { TrendingUp, Sparkles, ArrowRight, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Story, Event } from "@/lib/entities";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode, ComponentType } from "react";

function SuggestionSection({ title, icon: Icon, children, seeAllLink }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode; seeAllLink?: string }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h3>
        </div>
        {seeAllLink && (
          <Link to={seeAllLink} className="text-[11px] font-medium" style={{ color: "#d4580a" }}>See all</Link>
        )}
      </div>
      <div className="space-y-2">{children}</div>
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
            {stories.map((s: any) => (
              <Link key={s.id} to="/stories" className="group flex items-center gap-3 rounded-lg p-1.5 transition-all duration-150 hover:bg-secondary/60 active:bg-secondary">
                <Avatar className="h-12 w-12 flex-shrink-0 rounded-xl">
                  <AvatarImage src={s.cover_url} className="rounded-xl object-cover" />
                  <AvatarFallback className="rounded-xl bg-accent/10 text-sm font-bold text-accent-foreground">{s.title?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-[#d4580a]">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">by {s.author_name}</p>
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
                className="group flex items-center gap-3 rounded-lg p-1.5 transition-all duration-150 hover:bg-secondary/60 active:bg-secondary"
              >
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={a.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-accent/10 text-sm font-bold text-accent-foreground">{a.display_name?.charAt(0)}</AvatarFallback>
                </Avatar>
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
                <Avatar className="h-12 w-12 flex-shrink-0 rounded-xl">
                  <AvatarImage src={e.image_url} className="rounded-xl object-cover" />
                  <AvatarFallback className="rounded-xl bg-accent/10 text-sm font-bold text-accent-foreground">{e.title?.charAt(0)}</AvatarFallback>
                </Avatar>
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