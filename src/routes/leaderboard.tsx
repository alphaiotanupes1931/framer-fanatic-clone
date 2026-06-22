import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, MessageCircle, Heart } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
  head: () => ({ meta: [{ title: "Baltimore 100 — Planet Baltimore" }] }),
});

type Row = {
  id: string; display_name: string | null; username: string | null; avatar_url: string | null;
  posts: number; comments: number; likes: number; points: number;
};

function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { (async () => {
    const { data: profs } = await supabase.from("profiles").select("id, display_name, username, avatar_url").limit(100);
    const list = profs || [];
    const results: Row[] = await Promise.all(list.map(async (p: any) => {
      const { count: posts } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", p.id);
      const { data: postRows } = await supabase.from("posts").select("likes_count, comments_count").eq("user_id", p.id);
      const likes = (postRows || []).reduce((a, r: any) => a + (r.likes_count || 0), 0);
      const comments = (postRows || []).reduce((a, r: any) => a + (r.comments_count || 0), 0);
      const points = (posts || 0) * 5 + comments * 2 + likes * 1;
      return { ...p, posts: posts || 0, comments, likes, points };
    }));
    results.sort((a, b) => b.points - a.points);
    setRows(results.slice(0, 100));
  })(); }, []);

  return (
    <AppLayout title="Baltimore 100" subtitle="Top 100 people who keep Planet Baltimore moving.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-neutral-200 bg-white px-6 py-4 text-sm text-neutral-600">
          <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> <b>5</b> / post</span>
          <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> <b>2</b> / comment</span>
          <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> <b>1</b> / like received</span>
        </div>

        {rows.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">No activity yet.</div>}

        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-4">
            <div className="w-10 text-lg font-bold text-neutral-400">#{i + 1}</div>
            <Avatar className="h-12 w-12">
              {r.avatar_url && <AvatarImage src={r.avatar_url} />}
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
          </div>
        ))}
      </div>
    </AppLayout>
  );
}