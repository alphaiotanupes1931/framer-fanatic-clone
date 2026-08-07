import { Link } from "@tanstack/react-router";
import { TrendingUp, Palette, ArrowRight, Calendar, ChevronRight, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Story, Event } from "@/lib/entities";
import { supabase } from "@/integrations/supabase/client";
import { EventImage } from "@/components/event-image";
import { useSidebar } from "@/components/layout/sidebar-context";
import type { ReactNode, ComponentType } from "react";
import { Img, SmartAvatarImage } from "@/components/shared/smart-img";
import { useHydrated } from "@/hooks/use-hydrated";

function SuggestionSection({ title, icon: Icon, children, seeAllLink }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode; seeAllLink?: string }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-slate-800" />
          <h3 className="text-sm font-extrabold uppercase tracking-normal text-slate-800">{title}</h3>
        </div>
        {seeAllLink && (
          <Link to={seeAllLink} className="text-xs font-bold" style={{ color: "#d4580a" }}>See all</Link>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function RightSidebar() {
  const { rightCollapsed, setRightCollapsed } = useSidebar();
  const hydrated = useHydrated();
  const { data: stories = [] } = useQuery({
    queryKey: ["sidebar-trending-stories"],
    queryFn: () => Story.trending(5),
    staleTime: 60000,
    refetchInterval: 120000,
    refetchOnWindowFocus: true,
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["sidebar-top-artists"],
    queryFn: async () => {
      const { data } = await supabase.rpc("top_creators", { lim: 8 });
      return (data ?? []).slice(0, 5);
    },
    staleTime: 60000,
    refetchInterval: 120000,
    refetchOnWindowFocus: true,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["sidebar-upcoming-events"],
    queryFn: () => Event.upcoming(5),
    staleTime: 60000,
    refetchInterval: 300000,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setRightCollapsed(!rightCollapsed)}
        aria-label={rightCollapsed ? "Show panel" : "Hide panel"}
        className={`fixed top-1/2 z-40 hidden -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-white p-1.5 shadow-sm transition-all duration-300 hover:bg-slate-50 xl:flex ${rightCollapsed ? "right-0" : "right-[280px]"}`}
      >
        {rightCollapsed ? <ChevronLeft className="h-4 w-4 text-slate-600" /> : <ChevronRight className="h-4 w-4 text-slate-600" />}
      </button>
      <aside className={`fixed right-0 top-0 z-30 hidden h-screen w-[280px] overflow-y-auto border-l border-slate-200 bg-white transition-transform duration-300 xl:block ${rightCollapsed ? "translate-x-full" : "translate-x-0"}`}>
      <div className="space-y-4 px-5 pb-6 pt-12">
        {hydrated && stories.length > 0 && (
          <SuggestionSection title="Trending Stories" icon={TrendingUp} seeAllLink="/stories">
            {stories.map((s: any, i: number) => (
              <Link
                key={s.id}
                to="/stories/$storyId"
                params={{ storyId: s.id }}
                className="group flex items-center gap-3 rounded-md transition-all duration-150 hover:bg-slate-50 active:bg-slate-100"
              >
                <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {s.cover_url ? (
                    <Img src={s.cover_url} alt="" className="h-full w-full object-cover" loading={i < 2 ? "eager" : "lazy"} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">{s.title?.charAt(0)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-extrabold leading-tight text-slate-800 transition-colors group-hover:text-[#d4580a]">{s.title}</p>
                  <p className="truncate text-xs leading-tight text-slate-500">by {s.author_name}</p>
                </div>
              </Link>
            ))}
          </SuggestionSection>
        )}

        {hydrated && artists.length > 0 && (
          <SuggestionSection title="Artists to Follow" icon={Palette} seeAllLink="/artists">
            {artists.map((a: any) => (
              <Link
                key={a.id}
                to="/u/$username"
                params={{ username: a.username || a.id }}
                className="group flex items-center gap-3 rounded-md transition-all duration-150 hover:bg-slate-50 active:bg-slate-100"
              >
                <div className="flex-shrink-0">
                  <Avatar className="h-11 w-11 rounded-lg">
                    <SmartAvatarImage src={a.avatar_url} className="rounded-lg object-cover" />
                    <AvatarFallback className="rounded-lg bg-slate-100 text-sm font-bold text-slate-600">{a.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-800 transition-colors group-hover:text-[#d4580a]">{a.display_name || a.username}</p>
                  <p className="truncate text-xs capitalize text-slate-500">{(a.category || a.role || "Artist").replace("_", " ")}</p>
                </div>
              </Link>
            ))}
          </SuggestionSection>
        )}

        {hydrated && events.length > 0 && (
          <SuggestionSection title="Upcoming Events" icon={Calendar} seeAllLink="/events">
            {events.map((e: any) => (
              <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className="group flex items-center gap-3 rounded-md transition-all duration-150 hover:bg-slate-50 active:bg-slate-100">
                <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {e.image_url ? (
                    <EventImage src={e.image_url} alt={e.title} className="h-full w-full rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">{e.title?.charAt(0)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-800 transition-colors group-hover:text-[#d4580a]">{e.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {e.starts_at ? new Date(e.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                    {e.venue_name ? ` · ${e.venue_name}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </SuggestionSection>
        )}

        <div className="border-t border-slate-200 pt-4">
          <Link to="/discover" className="group flex items-center gap-2 rounded-md p-0.5 text-sm font-semibold transition-all duration-150" style={{ color: "#d4580a" }}>
            Explore more of Baltimore
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="text-xs text-slate-400">© 2026 Planet Baltimore</p>
      </div>
      </aside>
    </>
  );
}