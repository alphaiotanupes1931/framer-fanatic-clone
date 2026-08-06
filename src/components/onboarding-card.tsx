import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Palette, Users, PenLine, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "pb_onboarding_v3_dismissed";

const steps = [
  { icon: Palette, title: "Follow artists & creators", description: "Discover Baltimore talent and see their updates in your feed.", to: "/artists", cta: "Browse Artists" },
  { icon: Users, title: "Join a community", description: "Find neighborhoods, groups, and organizations near you.", to: "/groups", cta: "Find Communities" },
  { icon: PenLine, title: "Share something", description: "Post an update, story, or event to connect with the city.", to: "/create-post", cta: "Create a Post" },
  { icon: Calendar, title: "Explore local events", description: "RSVP to events happening around Baltimore.", to: "/events", cta: "See Events" },
] as const;

export function OnboardingCard() {
  // `undefined` = still resolving, so the card never flashes before we know.
  const [dismissed, setDismissed] = useState<boolean | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      if (!user) { setDismissed(local); return; }
      const { data } = await supabase
        .from("user_ui_prefs")
        .select("onboarding_dismissed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const remote = !!data?.onboarding_dismissed;
      setDismissed(remote || local);
      // Local dismissal from a previous session gets promoted to the account.
      if (local && !remote) {
        await supabase.from("user_ui_prefs").upsert(
          { user_id: user.id, onboarding_dismissed: true, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      }
    })();
    return () => { cancelled = true; };
  }, []);
  if (dismissed !== false) return null;
  const dismiss = async () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
    if (userId) {
      await supabase.from("user_ui_prefs").upsert(
        { user_id: userId, onboarding_dismissed: true, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    }
  };
  return (
    <div className="relative rounded-xl border bg-white px-4 py-3.5 sm:px-[18px] sm:py-4" style={{ borderColor: "#d4580a" }}>
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="mb-5 pr-6">
        <h2 className="text-sm font-extrabold leading-tight text-slate-950">Welcome to Planet Baltimore</h2>
        <p className="mt-0.5 text-xs font-medium text-slate-500">Here's how to get the most out of your community.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {steps.map(({ icon: Icon, title, description, to, cta }) => (
          <Link key={to + title} to={to} className="group flex min-h-[62px] items-start gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 transition-colors hover:border-[#d4580a]">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center">
              <Icon className="h-4 w-4 text-slate-900 transition-colors group-hover:text-[#d4580a]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold leading-tight text-slate-900 transition-colors group-hover:text-[#d4580a]">{title}</p>
              <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-slate-500">{description}</p>
              <span className="mt-1 inline-block text-[10px] font-bold text-slate-900 transition-colors group-hover:text-[#d4580a]">{cta} →</span>
            </div>
          </Link>
        ))}
      </div>
      <button onClick={dismiss} className="mt-4 w-full text-center text-[10px] font-medium text-slate-500 transition-colors hover:text-slate-900">
        I'm all set, dismiss this
      </button>
    </div>
  );
}