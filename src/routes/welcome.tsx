import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SmartAvatarImage } from "@/components/smart-image";
import { Check, MapPin, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { invalidateConnections } from "@/lib/connections";

const CREATOR_GOAL = 5;
const HOOD_GOAL = 1;

type Creator = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; category?: string | null; role?: string | null };

export const Route = createFileRoute("/welcome")({
  component: Welcome,
  head: () => ({
    meta: [
      { title: "Build your feed | Planet Baltimore" },
      { name: "description", content: "Follow five Baltimore creators and a neighborhood so your feed is full from day one." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Welcome() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [hoods, setHoods] = useState<string[]>([]);
  const [pickedCreators, setPickedCreators] = useState<string[]>([]);
  const [pickedHoods, setPickedHoods] = useState<string[]>([]);
  const [hoodQuery, setHoodQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/auth" }); return; }
      const uid = data.session.user.id;
      setUserId(uid);

      const [{ data: top }, { data: hoodRows }, { data: mine }] = await Promise.all([
        supabase.rpc("top_creators", { lim: 24 }),
        supabase.from("neighborhoods").select("name").order("name", { ascending: true }),
        supabase.from("profiles").select("neighborhood").eq("id", uid).maybeSingle(),
      ]);
      setCreators(((top ?? []) as Creator[]).filter((c) => c.id !== uid));
      setHoods((hoodRows ?? []).map((n: { name: string }) => n.name));
      // Their own neighborhood is the obvious first follow, so pre-select it.
      if (mine?.neighborhood) setPickedHoods([mine.neighborhood]);
    })();
  }, [navigate]);

  const visibleHoods = useMemo(() => {
    const q = hoodQuery.trim().toLowerCase();
    const list = q ? hoods.filter((h) => h.toLowerCase().includes(q)) : hoods;
    // Keep already-picked ones visible even when the search filters them out.
    return Array.from(new Set([...pickedHoods, ...list])).slice(0, q ? 40 : 24);
  }, [hoods, hoodQuery, pickedHoods]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const creatorsLeft = Math.max(0, CREATOR_GOAL - pickedCreators.length);
  const hoodsLeft = Math.max(0, HOOD_GOAL - pickedHoods.length);
  const ready = creatorsLeft === 0 && hoodsLeft === 0;

  const goNext = () => {
    let dest: string | null = null;
    try {
      const v = sessionStorage.getItem("pb_post_auth_redirect");
      if (v && v.startsWith("/") && !v.startsWith("//")) dest = v;
      sessionStorage.removeItem("pb_post_auth_redirect");
    } catch { /* ignore */ }
    if (dest) { window.location.replace(dest); return; }
    navigate({ to: "/dashboard" });
  };

  const finish = async () => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      if (pickedCreators.length) {
        const { error } = await supabase
          .from("follows")
          .upsert(
            pickedCreators.map((id) => ({ follower_id: userId, following_id: id })),
            { onConflict: "follower_id,following_id", ignoreDuplicates: true },
          );
        if (error) throw error;
      }
      if (pickedHoods.length) {
        const { error } = await supabase
          .from("neighborhood_follows")
          .upsert(
            pickedHoods.map((neighborhood) => ({ user_id: userId, neighborhood })),
            { onConflict: "user_id,neighborhood", ignoreDuplicates: true },
          );
        if (error) throw error;
      }
      invalidateConnections();
      toast.success("Your feed is ready.");
      goNext();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save your picks.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <Toaster richColors />
      <div className="mx-auto w-full max-w-3xl">
        <header className="text-center">
          <h1 className="font-display text-3xl font-extrabold text-neutral-900">Fill up your feed</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-600">
            Follow at least {CREATOR_GOAL} creators and {HOOD_GOAL} neighborhood so Planet Baltimore is full of
            people and places you care about the moment you land.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-800">
              <Users className="h-4 w-4 text-[#d4580a]" /> Creators
            </h2>
            <span className="text-xs font-semibold text-neutral-500">
              {pickedCreators.length}/{CREATOR_GOAL} {creatorsLeft > 0 ? `(${creatorsLeft} to go)` : "done"}
            </span>
          </div>
          {creators.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">Loading people to follow…</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {creators.map((c) => {
                const on = pickedCreators.includes(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(pickedCreators, setPickedCreators, c.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${on ? "border-[#d4580a] bg-orange-50" : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"}`}
                    >
                      <Avatar className="h-10 w-10 rounded-full">
                        <SmartAvatarImage src={c.avatar_url} className="rounded-full object-cover" />
                        <AvatarFallback className="rounded-full bg-neutral-100 text-sm font-bold text-neutral-600">
                          {(c.display_name || c.username || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-neutral-900">{c.display_name || c.username}</span>
                        <span className="block truncate text-xs capitalize text-neutral-500">{(c.category || c.role || "Creator").replace("_", " ")}</span>
                      </span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${on ? "border-[#d4580a] bg-[#d4580a] text-white" : "border-neutral-300 text-transparent"}`}>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-800">
              <MapPin className="h-4 w-4 text-[#d4580a]" /> Neighborhoods
            </h2>
            <span className="text-xs font-semibold text-neutral-500">
              {pickedHoods.length}/{HOOD_GOAL} {hoodsLeft > 0 ? "(pick one)" : "done"}
            </span>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={hoodQuery}
              onChange={(e) => setHoodQuery(e.target.value)}
              placeholder="Search neighborhoods"
              className="pl-9"
              aria-label="Search neighborhoods"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleHoods.map((h) => {
              const on = pickedHoods.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(pickedHoods, setPickedHoods, h)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-[#d4580a] bg-[#d4580a] font-semibold text-white" : "border-neutral-200 text-neutral-700 hover:border-neutral-400"}`}
                >
                  {h}
                </button>
              );
            })}
            {visibleHoods.length === 0 && (
              <p className="text-sm text-neutral-500">No neighborhoods match that search.</p>
            )}
          </div>
        </section>

        <div className="sticky bottom-4 mt-6 flex flex-col items-center gap-2">
          <Button
            onClick={() => void finish()}
            disabled={!ready || busy}
            className="w-full max-w-sm bg-[#d4580a] text-white hover:bg-[#b8490a]"
          >
            {busy ? "Saving…" : ready ? "Go to my feed" : `Follow ${creatorsLeft} more creator${creatorsLeft === 1 ? "" : "s"}${hoodsLeft ? " and 1 neighborhood" : ""}`}
          </Button>
          <button type="button" onClick={goNext} className="text-xs font-medium text-neutral-500 underline">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
