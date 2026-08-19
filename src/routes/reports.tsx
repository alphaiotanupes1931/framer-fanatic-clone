import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flag, Loader2, Check, Trash2, ExternalLink } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { timeAgo } from "@/lib/text-utils";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Content Reports - Planet Baltimore" }] }),
});

type Report = {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  created_at: string;
  reporter_name?: string;
};

const STATUS_TABS: Array<Report["status"] | "all"> = ["pending", "resolved", "dismissed", "all"];

function ReportsPage() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Report["status"] | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("content_reports").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) { toast.error(error.message); setLoading(false); return; }
    const rows = (data ?? []) as Report[];
    const ids = Array.from(new Set(rows.map((r) => r.reporter_id)));
    if (ids.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      const byId = new Map((profs ?? []).map((p: { id: string; display_name: string | null; username: string | null }) => [p.id, p]));
      rows.forEach((r) => { r.reporter_name = byId.get(r.reporter_id)?.display_name || byId.get(r.reporter_id)?.username || "Someone"; });
    }
    setReports(rows);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, filter]);

  const setStatus = async (r: Report, status: Report["status"]) => {
    setBusy(r.id);
    const { data: sess } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("content_reports")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: sess.session?.user.id })
      .eq("id", r.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Report " + status);
    setReports((prev) => prev.filter((p) => (filter === "all" ? true : p.id !== r.id)));
  };

  const remove = async (r: Report) => {
    if (!confirm("Delete this report?")) return;
    setBusy(r.id);
    const { error } = await supabase.from("content_reports").delete().eq("id", r.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    setReports((prev) => prev.filter((p) => p.id !== r.id));
  };

  const linkTo = (r: Report): string | null => {
    if (r.content_type === "post") return `/posts/${r.content_id}`;
    if (r.content_type === "story") return `/stories/${r.content_id}`;
    if (r.content_type === "event") return `/events/${r.content_id}`;
    if (r.content_type === "video") return `/videos/${r.content_id}`;
    if (r.content_type === "user") return `/u/${r.content_id}`;
    return null;
  };

  if (roleLoading) {
    return <AppLayout><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div></AppLayout>;
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <Flag className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Admin access required</h2>
          <p className="mt-1 text-sm text-muted-foreground">Only administrators can view content reports.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d4580a]/10 text-[#d4580a]"><Flag className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content Reports</h1>
          <p className="text-sm text-muted-foreground">Review and act on user-submitted reports.</p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${filter === s ? "bg-[#d4580a] text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {s}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">No {filter === "all" ? "" : filter} reports.</div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const href = linkTo(r);
            return (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-[#d4580a]/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-[#d4580a]">{r.content_type}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{r.status}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{r.reason}</div>
                    {r.details && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{r.details}</p>}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Reported by <span className="font-medium text-foreground">{r.reporter_name}</span>
                      {" · "}Content ID: <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{r.content_id}</code>
                    </div>
                    {href && (
                      <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#d4580a] hover:underline">
                        View content <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {r.status !== "resolved" && (
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => setStatus(r, "resolved")}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Resolve
                      </Button>
                    )}
                    {r.status !== "dismissed" && (
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => setStatus(r, "dismissed")}>
                        Dismiss
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === r.id} onClick={() => remove(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppLayout>
  );
}