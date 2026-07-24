import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminToken, refreshAdminUnlocked } from "@/lib/admin-gate";
import { adminRpc } from "@/lib/admin-site.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Trash2, Loader2, Search as SearchIcon } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/trash")({
  component: AdminTrashPage,
  head: () => ({ meta: [{ title: "Admin: Trash - Planet Baltimore" }] }),
});

type TrashRow = {
  kind: "profile" | "post" | "story" | "event" | "organization" | "video";
  id: string;
  title: string | null;
  owner_id: string | null;
  owner_name: string | null;
  deleted_at: string;
};

const KIND_LABEL: Record<TrashRow["kind"], string> = {
  profile: "Profile", post: "Post", story: "Story",
  event: "Event", organization: "Organization", video: "Video",
};

function AdminTrashPage() {
  const navigate = useNavigate();
  const [gateChecked, setGateChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [rows, setRows] = useState<TrashRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<TrashRow["kind"] | "all">("all");
  const [purgeTarget, setPurgeTarget] = useState<TrashRow | null>(null);

  useEffect(() => {
    (async () => {
      const ok = await refreshAdminUnlocked();
      setUnlocked(ok); setGateChecked(true);
      if (!ok) navigate({ to: "/admin/login" });
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminRpc({ data: { name: "admin_list_trash", adminToken: getAdminToken() } });
      setRows((res.data as TrashRow[]) ?? []);
    } catch (e) { toast.error((e as Error).message); }
    setLoading(false);
  };
  useEffect(() => { if (unlocked) void load(); }, [unlocked]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (!s) return true;
      return (r.title ?? "").toLowerCase().includes(s) || (r.owner_name ?? "").toLowerCase().includes(s);
    });
  }, [rows, q, kindFilter]);

  const restore = async (r: TrashRow) => {
    setBusy(r.id);
    try {
      await adminRpc({ data: { name: "admin_restore_content", args: { _kind: r.kind, _id: r.id }, adminToken: getAdminToken() } });
      toast.success(`${KIND_LABEL[r.kind]} restored`);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) { toast.error((e as Error).message); }
    setBusy(null);
  };

  const purge = async (r: TrashRow) => {
    setBusy(r.id);
    try {
      await adminRpc({ data: { name: "admin_purge_content", args: { _kind: r.kind, _id: r.id }, adminToken: getAdminToken() } });
      toast.success(`${KIND_LABEL[r.kind]} permanently deleted`);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) { toast.error((e as Error).message); }
    setBusy(null);
    setPurgeTarget(null);
  };

  if (!gateChecked) return <AdminShell><div className="p-8 text-sm text-neutral-500">Loading...</div></AdminShell>;

  const kinds: (TrashRow["kind"] | "all")[] = ["all","profile","post","story","event","organization","video"];

  return (
    <AdminShell title="Trash" subtitle="Deleted items are kept here so nothing is lost. Restore or permanently purge.">
      <div className="mb-4">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2">
          <SearchIcon className="h-4 w-4 text-neutral-400" />
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search title or owner"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
        </div>
        <div className="flex flex-wrap gap-1">
          {kinds.map((k) => (
            <button key={k} onClick={()=>setKindFilter(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${kindFilter===k ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200 text-neutral-700"}`}>
              {k === "all" ? "All" : KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading trash...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">Trash is empty.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Deleted</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.kind}:${r.id}`} className="border-t border-neutral-100">
                  <td className="px-4 py-2.5"><span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">{KIND_LABEL[r.kind]}</span></td>
                  <td className="px-4 py-2.5 text-neutral-900">{r.title || <span className="italic text-neutral-400">(untitled)</span>}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{r.owner_name || <span className="italic text-neutral-400">-</span>}</td>
                  <td className="px-4 py-2.5 text-neutral-500">{new Date(r.deleted_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" variant="outline" onClick={()=>restore(r)} disabled={busy===r.id}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
                      </Button>
                      <Button size="sm" variant="destructive" onClick={()=>setPurgeTarget(r)} disabled={busy===r.id}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Purge
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AlertDialog open={!!purgeTarget} onOpenChange={(o)=>!o && setPurgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this {purgeTarget ? KIND_LABEL[purgeTarget.kind].toLowerCase() : "item"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The item will be removed from the database forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={()=>purgeTarget && purge(purgeTarget)} className="bg-red-600 hover:bg-red-700">
              Permanently delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}