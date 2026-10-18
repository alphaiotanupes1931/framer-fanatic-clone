import { EmailUsageCard } from "@/components/admin/email-usage-card";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminToken } from "@/lib/admin-gate";
import { adminRpc } from "@/lib/admin-site.functions";
import { Shield, Ban, Loader2, Pencil, FileText, MapPin, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Lock } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin - Planet Baltimore" }] }),
});

type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  neighborhood: string | null;
  in_baltimore: boolean;
  banned: boolean;
  hidden_from_showcase: boolean;
  created_at: string;
  last_seen_at: string | null;
  is_admin: boolean;
  is_founder: boolean;
  email_confirmed_at: string | null;
};

function isLive(ts: string | null) {
  if (!ts) return false;
  return Date.now() - new Date(ts).getTime() < 5 * 60 * 1000;
}

function AdminPage() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [gateChecked, setGateChecked] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { refreshAdminUnlocked } = await import("@/lib/admin-gate");
      const ok = await refreshAdminUnlocked();
      setUnlocked(ok);
      setGateChecked(true);
      if (!ok) navigate({ to: "/admin/login" });
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminRpc({ data: { name: "admin_list_users", adminToken: getAdminToken() } });
      setUsers((res.data as AdminUser[]) ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (unlocked) void load();
  }, [unlocked]);

  const liveCount = users.filter((u) => isLive(u.last_seen_at)).length;
  const bannedCount = users.filter((u) => u.banned).length;
  const verifiedCount = users.filter((u) => !!u.email_confirmed_at).length;

  if (!gateChecked || !unlocked) {
    return (
      <AdminShell title="Admin">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Redirecting to admin login...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Overview"
      subtitle="Quick stats for Planet Baltimore. Use the menu above to open each admin section."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Total users" value={users.length} />
        <Stat label="Verified" value={verifiedCount} accent="bg-sky-500" />
        <Link to="/admin/users" search={{ live: true }} className="rounded-xl transition hover:ring-2 hover:ring-emerald-200">
          <Stat label="Live now" value={liveCount} accent="bg-emerald-500" />
        </Link>
        <Stat label="Banned" value={bannedCount} accent="bg-rose-500" />
      </div>

      <EmailUsageCard />

      <LocationStats unlocked={unlocked} />



      <DangerZone onUserDeleted={(id: string) => setUsers((prev) => prev.filter((p) => p.id !== id))} />
    </AdminShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2">
        {accent && <span className={`h-2 w-2 rounded-full ${accent}`} />}
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</div>
      </div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

type EventLite = { id: string; title: string; starts_at: string | null; host_name: string | null };
type OrgLite = { id: string; name: string; type: string; slug: string };

function DangerZone({ onUserDeleted }: { onUserDeleted: (id: string) => void }) {
  const [tab, setTab] = useState<"events" | "users" | "orgs">("events");
  const [events, setEvents] = useState<EventLite[]>([]);
  const [orgs, setOrgs] = useState<OrgLite[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; display_name: string | null; email: string | null }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState<null | { kind: "event" | "user" | "org"; id: string; label: string }>(null);
  const [q, setQ] = useState("");

  const reload = async () => {
    try {
      const token = getAdminToken();
      const [e, o, p] = await Promise.all([
        adminRpc({ data: { name: "admin_list_events", adminToken: token } }),
        adminRpc({ data: { name: "admin_list_organizations", adminToken: token } }),
        adminRpc({ data: { name: "admin_list_users", adminToken: token } }),
      ]);
      setEvents((e.data as EventLite[]) ?? []);
      setOrgs((o.data as OrgLite[]) ?? []);
      setProfiles(((p.data as { id: string; display_name: string | null; email: string | null }[]) ?? []));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  useEffect(() => { void reload(); }, []);

  const confirmDelete = async () => {
    if (!pwOpen) return;
    setBusy(pwOpen.id);
    const rpc = pwOpen.kind === "event" ? "admin_delete_event" : pwOpen.kind === "org" ? "admin_delete_organization" : "admin_delete_profile";
    try {
      await adminRpc({ data: { name: rpc, args: { _id: pwOpen.id }, adminToken: getAdminToken() } });
    } catch (e) { setBusy(null); return toast.error((e as Error).message); }
    setBusy(null);
    toast.success("Deleted " + pwOpen.label);
    if (pwOpen.kind === "event") setEvents((prev) => prev.filter((x) => x.id !== pwOpen.id));
    if (pwOpen.kind === "org") setOrgs((prev) => prev.filter((x) => x.id !== pwOpen.id));
    if (pwOpen.kind === "user") { setProfiles((prev) => prev.filter((x) => x.id !== pwOpen.id)); onUserDeleted(pwOpen.id); }
    setPwOpen(null);
  };

  const filterFn = (s: string) => !q.trim() || s.toLowerCase().includes(q.trim().toLowerCase());

  return (
    <div className="mt-10 rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Lock className="h-4 w-4 text-rose-700" />
        <h3 className="font-semibold text-rose-700">Danger zone</h3>
        <span className="text-xs text-rose-700/70">Confirmation required for every delete</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(["events", "users", "orgs"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-xs font-medium ${tab === t ? "bg-rose-600 text-white" : "border border-rose-200 bg-white text-rose-700"}`}>
            {t === "orgs" ? "Organizations / Businesses" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter..." className="flex-1 min-w-[180px] rounded-full border border-rose-200 bg-white px-3 py-1 text-xs outline-none" />
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg border border-rose-100 bg-white">
        {tab === "events" && (
          <ul className="divide-y divide-rose-50">
            {events.filter((e) => filterFn(e.title)).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{e.title}</div>
                  <div className="truncate text-xs text-neutral-500">{e.host_name || "Unknown host"} {e.starts_at ? "- " + new Date(e.starts_at).toLocaleDateString() : ""}</div>
                </div>
                <button disabled={busy === e.id} onClick={() => setPwOpen({ kind: "event", id: e.id, label: e.title })} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </li>
            ))}
            {events.length === 0 && <li className="px-3 py-6 text-center text-xs text-neutral-500">No events</li>}
          </ul>
        )}
        {tab === "users" && (
          <ul className="divide-y divide-rose-50">
            {profiles.filter((p) => filterFn((p.display_name || "") + " " + (p.email || ""))).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.display_name || "Unnamed"}</div>
                  <div className="truncate text-xs text-neutral-500">{p.email}</div>
                </div>
                <button disabled={busy === p.id} onClick={() => setPwOpen({ kind: "user", id: p.id, label: p.display_name || p.email || "user" })} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </li>
            ))}
            {profiles.length === 0 && <li className="px-3 py-6 text-center text-xs text-neutral-500">No profiles</li>}
          </ul>
        )}
        {tab === "orgs" && (
          <ul className="divide-y divide-rose-50">
            {orgs.filter((o) => filterFn(o.name)).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{o.name}</div>
                  <div className="truncate text-xs text-neutral-500">{o.type} - /{o.slug}</div>
                </div>
                <button disabled={busy === o.id} onClick={() => setPwOpen({ kind: "org", id: o.id, label: o.name })} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </li>
            ))}
            {orgs.length === 0 && <li className="px-3 py-6 text-center text-xs text-neutral-500">No organizations</li>}
          </ul>
        )}
      </div>

      <Dialog open={!!pwOpen} onOpenChange={(o) => { if (!o) setPwOpen(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-rose-600" /> Confirm delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">You are about to permanently delete <b>{pwOpen?.label}</b>. This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(null)}>Cancel</Button>
            <Button onClick={confirmDelete} disabled={busy !== null} className="bg-rose-600 text-white hover:bg-rose-700">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type LocationStatRow = { kind: string; label: string; total: number };

function StatList({ title, rows, total }: { title: string; rows: LocationStatRow[]; total: number }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.total / total) * 1000) / 10 : 0;
            return (
              <li key={r.label} className="text-xs text-neutral-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{r.label}</span>
                  <span className="shrink-0 font-semibold text-neutral-900">
                    {pct}% ({r.total})
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-100">
                  <div className="h-1.5 rounded-full bg-orange" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function LocationStats({ unlocked }: { unlocked: boolean }) {
  const [rows, setRows] = useState<LocationStatRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      setLoading(true);
      try {
        const res = await adminRpc({ data: { name: "admin_location_stats", adminToken: getAdminToken() } });
        setRows(((res.data as LocationStatRow[]) ?? []).map((r) => ({ ...r, total: Number(r.total) })));
      } catch (e) {
        toast.error((e as Error).message);
      }
      setLoading(false);
    })();
  }, [unlocked]);

  const sort = (kind: string) =>
    rows.filter((r) => r.kind === kind).sort((a, b) => b.total - a.total);
  const audience = sort("audience");
  const hoods = sort("neighborhood");
  const cities = sort("visitor_city");
  const sum = (list: LocationStatRow[]) => list.reduce((n, r) => n + r.total, 0);

  return (
    <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
        <MapPin className="h-4 w-4 text-orange" /> Location stats
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Where members are based, by share of accounts.
      </p>
      {loading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <StatList title="Residents vs visitors" rows={audience} total={sum(audience)} />
          <StatList title="Resident neighborhoods" rows={hoods.slice(0, 15)} total={sum(hoods)} />
          <StatList title="Visitors by city" rows={cities.slice(0, 15)} total={sum(cities)} />
        </div>
      )}
    </div>
  );
}

