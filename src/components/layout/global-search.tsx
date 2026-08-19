import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, MapPin, Calendar, FileText, BookOpen, User, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SmartAvatarImage } from "@/components/shared/smart-img";

/** One row in the dropdown. `to` is resolved by the click handler. */
type Hit = {
  key: string;
  kind: "Creators" | "Neighborhoods" | "Events" | "Posts" | "Stories";
  title: string;
  subtitle?: string;
  avatar?: string | null;
  go: () => void;
};

const KIND_ICON = {
  Creators: User,
  Neighborhoods: MapPin,
  Events: Calendar,
  Posts: FileText,
  Stories: BookOpen,
} as const;

const ORDER: Hit["kind"][] = ["Creators", "Neighborhoods", "Events", "Posts", "Stories"];

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function GlobalSearch({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [cursor, setCursor] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  // Cmd/Ctrl+K focuses the bar from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (debounced.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const like = `%${debounced}%`;
    void (async () => {
      const [people, hoods, events, posts, stories] = await Promise.all([
        supabase.rpc("search_creators", { q: debounced, lim: 5 }),
        supabase.from("neighborhoods").select("id,name,region").ilike("name", like).order("name").limit(5),
        supabase.from("events").select("id,title,starts_at,venue_name").ilike("title", like).order("starts_at", { ascending: true }).limit(5),
        supabase.from("posts").select("id,content,created_at").eq("is_deleted", false).eq("visibility", "public").ilike("content", like).order("created_at", { ascending: false }).limit(5),
        supabase.from("stories").select("id,title,excerpt,created_at").eq("status", "published").ilike("title", like).order("created_at", { ascending: false }).limit(5),
      ]);
      if (cancelled) return;

      const next: Hit[] = [];
      for (const p of (people.data ?? []) as { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood: string | null }[]) {
        next.push({
          key: `p-${p.id}`,
          kind: "Creators",
          title: p.display_name || p.username || "Someone",
          subtitle: [p.username ? `@${p.username}` : null, p.neighborhood].filter(Boolean).join(" · "),
          avatar: p.avatar_url,
          go: () => navigate({ to: "/u/$username", params: { username: p.username || p.id } }),
        });
      }
      for (const n of (hoods.data ?? []) as { id: string; name: string; region: string }[]) {
        next.push({
          key: `n-${n.id}`,
          kind: "Neighborhoods",
          title: n.name,
          subtitle: n.region,
          go: () => navigate({ to: "/neighborhoods", search: { n: n.name } }),
        });
      }
      for (const e of (events.data ?? []) as { id: string; title: string; starts_at: string; venue_name: string | null }[]) {
        next.push({
          key: `e-${e.id}`,
          kind: "Events",
          title: e.title,
          subtitle: [new Date(e.starts_at).toLocaleDateString(), e.venue_name].filter(Boolean).join(" · "),
          go: () => navigate({ to: "/events/$eventId", params: { eventId: e.id } }),
        });
      }
      for (const p of (posts.data ?? []) as { id: string; content: string; created_at: string }[]) {
        next.push({
          key: `po-${p.id}`,
          kind: "Posts",
          title: stripHtml(p.content).slice(0, 90) || "Post",
          subtitle: new Date(p.created_at).toLocaleDateString(),
          go: () => navigate({ to: "/posts/$postId", params: { postId: p.id } }),
        });
      }
      for (const s of (stories.data ?? []) as { id: string; title: string; excerpt: string | null }[]) {
        next.push({
          key: `s-${s.id}`,
          kind: "Stories",
          title: s.title,
          subtitle: s.excerpt ? stripHtml(s.excerpt).slice(0, 80) : undefined,
          go: () => navigate({ to: "/stories/$storyId", params: { storyId: s.id } }),
        });
      }
      setHits(next);
      setCursor(-1);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debounced, navigate]);

  const grouped = useMemo(
    () => ORDER.map((kind) => ({ kind, rows: hits.filter((h) => h.kind === kind) })).filter((g) => g.rows.length > 0),
    [hits],
  );
  const flat = useMemo(() => grouped.flatMap((g) => g.rows), [grouped]);

  const seeAll = () => {
    setOpen(false);
    navigate({ to: "/search", search: { q: q.trim() } });
  };

  const pick = (h: Hit) => {
    setOpen(false);
    setQ("");
    h.go();
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); return; }
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setCursor((c) => Math.min(c + 1, flat.length - 1)); return; }
          if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, -1)); return; }
          if (e.key === "Enter") {
            e.preventDefault();
            const hit = cursor >= 0 ? flat[cursor] : undefined;
            if (hit) pick(hit);
            else if (q.trim()) seeAll();
          }
        }}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-label="Search Planet Baltimore"
        placeholder={compact ? "Search Baltimore" : "Search posts, stories, events, creators, neighborhoods"}
        className={`w-full rounded-full border border-border bg-card pl-9 pr-3 text-foreground placeholder:text-muted-foreground focus:border-orange focus:outline-none ${compact ? "h-10 text-sm" : "h-11 text-sm"}`}
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}

      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[1200] max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-2xl">
          {flat.length === 0 && !loading ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No results for "{debounced}"</div>
          ) : (
            grouped.map((g) => {
              const Icon = KIND_ICON[g.kind];
              return (
                <div key={g.kind} className="py-1">
                  <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{g.kind}</div>
                  {g.rows.map((h) => {
                    const active = flat[cursor]?.key === h.key;
                    return (
                      <button
                        key={h.key}
                        type="button"
                        onMouseEnter={() => setCursor(flat.findIndex((x) => x.key === h.key))}
                        onClick={() => pick(h)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${active ? "bg-accent" : "hover:bg-accent"}`}
                      >
                        {h.kind === "Creators" ? (
                          <Avatar className="h-8 w-8 shrink-0">
                            {h.avatar && <SmartAvatarImage src={h.avatar} />}
                            <AvatarFallback>{h.title.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{h.title}</span>
                          {h.subtitle && <span className="block truncate text-xs text-muted-foreground">{h.subtitle}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
          <button
            type="button"
            onClick={seeAll}
            className="mt-1 w-full rounded-xl px-3 py-2 text-center text-sm font-semibold text-orange hover:bg-accent"
          >
            See all results for "{debounced}"
          </button>
        </div>
      )}
    </div>
  );
}
