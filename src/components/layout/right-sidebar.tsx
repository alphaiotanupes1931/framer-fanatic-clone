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
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-slate-800" />
          <h3 className="text-[10px] font-extrabold uppercase tracking-normal text-slate-800">{title}</h3>
        </div>
        {seeAllLink && (
          <Link to={seeAllLink} className="text-[9px] font-bold" style={{ color: "#d4580a" }}>See all</Link>
        )}
      </div>
      <div className="space-y-2.5">{children}</div>
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
    <aside className="fixed right-0 top-0 z-30 hidden h-screen w-[300px] overflow-y-auto border-l border-slate-200 bg-white xl:block">
      <div className="space-y-4 px-5 pb-6 pt-[70px]">
        {stories.length > 0 && (
          <SuggestionSection title="Trending Stories" icon={TrendingUp} seeAllLink="/stories">
            {stories.map((s: any, i: number) => (
              <Link
                key={s.id}
                to="/stories/$storyId"
                params={{ storyId: s.id }}
                className="group flex items-center gap-3 rounded-md transition-all duration-150 hover:bg-slate-50 active:bg-slate-100"
              >
                <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {s.cover_url ? (
                    <img src={s.cover_url} alt="" className="h-full w-full object-cover" loading={i < 2 ? "eager" : "lazy"} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">{s.title?.charAt(0)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-xs font-extrabold leading-tight text-slate-800 transition-colors group-hover:text-[#d4580a]">{s.title}</p>
                  <p className="truncate text-[11px] leading-tight text-slate-500">by {s.author_name}</p>
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
                className="group flex items-center gap-3 rounded-md transition-all duration-150 hover:bg-slate-50 active:bg-slate-100"
              >
                <div className="flex-shrink-0">
                  <Avatar className="h-9 w-9 rounded-lg">
                    <AvatarImage src={a.avatar_url} className="rounded-lg object-cover" />
                    <AvatarFallback className="rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{a.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-slate-800 transition-colors group-hover:text-[#d4580a]">{a.display_name || a.username}</p>
                  <p className="truncate text-[11px] capitalize text-slate-500">{(a.category || a.role || "Artist").replace("_", " ")}</p>
                </div>
              </Link>
            ))}
          </SuggestionSection>
        )}

        {events.length > 0 && (
          <SuggestionSection title="Upcoming Events" icon={Calendar} seeAllLink="/events">
            {events.map((e: any) => (
              <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className="group flex items-center gap-3 rounded-md transition-all duration-150 hover:bg-slate-50 active:bg-slate-100">
                <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {e.image_url ? (
                    <EventImage src={e.image_url} alt={e.title} className="h-full w-full rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">{e.title?.charAt(0)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-slate-800 transition-colors group-hover:text-[#d4580a]">{e.title}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {e.starts_at ? new Date(e.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                    {e.venue_name ? ` · ${e.venue_name}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </SuggestionSection>
        )}

        <div className="border-t border-slate-200 pt-4">
          <Link to="/discover" className="group flex items-center gap-2 rounded-md p-0.5 text-xs font-semibold transition-all duration-150" style={{ color: "#d4580a" }}>
            Explore more of Baltimore
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="text-[11px] text-slate-400">© 2026 Planet Baltimore</p>
      </div>
    </aside>
  );
}