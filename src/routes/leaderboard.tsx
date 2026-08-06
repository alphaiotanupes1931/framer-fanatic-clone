import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { useAuthState } from "@/components/public-preview";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, MessageCircle, Heart, Gift } from "lucide-react";
import { SmartAvatarImage } from "@/components/shared/smart-img";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
  head: () => pageHead({ path: "/leaderboard", title: "Baltimore 100 | Planet Baltimore", description: "The 100 most active creators and residents on Planet Baltimore right now." }),
});

type Row = {
  id: string; display_name: string | null; username: string | null; avatar_url: string | null;
  posts: number; comments: number; likes: number; points: number;
};

function LeaderboardPage() {
  const auth = useAuthState();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!auth.signedIn) return;
    (async () => {
    const { data: profs } = await (supabase as any).from("profiles_public").select("id, display_name, username, avatar_url").limit(100);
    const list = profs || [];
    const results: Row[] = await Promise.all(list.map(async (p: any) => {
      const { count: posts } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", p.id);
      const { data: postRows } = await supabase.from("posts").select("likes_count, comments_count").eq("user_id", p.id);
      const { count: referrals } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", p.id);
      const likes = (postRows || []).reduce((a, r: any) => a + (r.likes_count || 0), 0);
      const comments = (postRows || []).reduce((a, r: any) => a + (r.comments_count || 0), 0);
      const points = (posts || 0) * 5 + comments * 2 + likes * 1 + (referrals || 0) * 5;
      return { ...p, posts: posts || 0, comments, likes, points };
    }));
    results.sort((a, b) => b.points - a.points);
    setRows(results.slice(0, 100));
    })();
  }, [auth.signedIn]);

  if (auth.loading) return null;
  if (!auth.signedIn) {
    if (typeof window !== "undefined") {
      try { sessionStorage.setItem("pb_post_auth_redirect", "/leaderboard"); } catch { /* ignore */ }
      window.location.replace("/auth");
    }
    return null;
  }

  return (
    <AppLayout>
      <HeroBanner title="Baltimore 100" subtitle="Top 100 people who keep Planet Baltimore moving." />
      <div className="h-6" />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-neutral-200 bg-white px-6 py-4 text-sm text-neutral-600">
          <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> <b>5 pts</b> / post</span>
          <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> <b>2 pts</b> / comment</span>
          <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> <b>1 pt</b> / like received</span>
          <span className="flex items-center gap-1.5"><Gift className="h-4 w-4" /> <b>5 pts</b> / referral</span>
        </div>

        {rows.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">No activity yet.</div>}

        {rows.map((r, i) => {
          const content = (
            <>
              <div className="w-10 text-lg font-bold text-neutral-400">#{i + 1}</div>
              <Avatar className="h-12 w-12">
                {r.avatar_url && <SmartAvatarImage src={r.avatar_url} />}
                <AvatarFallback className="bg-orange-100 text-orange-700">{(r.display_name || r.username || "U")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{r.display_name || r.username || "Anonymous"}</div>
                <div className="mt-0.5 flex gap-3 text-xs text-neutral-500">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {r.posts}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {r.comments}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {r.likes}</span>
                </div>
              </div>
              <div className="text-lg font-bold text-orange-600">{r.points} <span className="text-sm font-normal text-neutral-400">pts</span></div>
            </>
          );
          const className = "flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-4 transition hover:border-orange-300 hover:shadow-sm";
          return r.username ? (
            <Link key={r.id} to="/u/$username" params={{ username: r.username }} className={className}>{content}</Link>
          ) : (
            <div key={r.id} className={className}>{content}</div>
          );
        })}
      </div>
    </AppLayout>
  );
}

// AnonLeaderboard removed. Unauthenticated users are redirected to /auth.