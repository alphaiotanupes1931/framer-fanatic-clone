import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { useUserRole } from "@/hooks/use-user-role";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Search as SearchIcon, Ban, CheckCircle2, Loader2, Download, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Lock } from "lucide-react";

export const Route = createFileRoute("/admin")({
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
};

function isLive(ts: string | null) {
  if (!ts) return false;
  return Date.now() - new Date(ts).getTime() < 5 * 60 * 1000;
}

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate({ to: "/dashboard" });
  }, [roleLoading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) toast.error(error.message);
    setUsers((data as AdminUser[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      [u.email, u.display_name, u.username, u.neighborhood]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(s)),
    );
  }, [users, q]);

  const liveCount = users.filter((u) => isLive(u.last_seen_at)).length;
  const bannedCount = users.filter((u) => u.banned).length;

  const toggleBan = async (u: AdminUser) => {
    setBusy(u.id);
    const { error } = await supabase.rpc("admin_set_banned", {
      _user_id: u.id,
      _banned: !u.banned,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(u.banned ? "Account unbanned" : "Account banned");
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, banned: !u.banned } : p)));
  };

  const toggleShowcase = async (u: AdminUser) => {
    setBusy(u.id);
    const { error } = await supabase.rpc("admin_set_showcase_hidden", {
      _user_id: u.id,
      _hidden: !u.hidden_from_showcase,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(u.hidden_from_showcase ? "Now visible in showcase" : "Hidden from showcase");
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, hidden_from_showcase: !u.hidden_from_showcase } : p)));
  };

  const onSaved = (id: string, patch: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  if (roleLoading || !isAdmin) {
    return (
      <AppLayout title="Admin" hero={false}>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking permissions...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Admin"
      subtitle="Manage users, monitor live activity, and moderate accounts."
    >
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Total users" value={users.length} />
        <Stat label="Live now" value={liveCount} accent="bg-emerald-500" />
        <Stat label="Banned" value={bannedCount} accent="bg-rose-500" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-2.5">
          <SearchIcon className="h-4 w-4 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, username, email, neighborhood"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
          <button
            onClick={load}
            className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Refresh
          </button>
        </div>
        <button
          onClick={() => {
            const rows = [["Name", "Email"]];
            filtered.forEach((u) => {
              rows.push([u.display_name || u.username || "Unnamed", u.email || ""]);
            });
            const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "planet-baltimore-users.csv";
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Exported " + filtered.length + " users");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export name and email
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.6fr_0.8fr] gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          <div>User</div>
          <div className="hidden sm:block">Email</div>
          <div className="hidden sm:block">Role</div>
          <div>Status</div>
          <div className="text-right">Action</div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-500">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-500">
            No users found.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((u) => {
              const live = isLive(u.last_seen_at);
              const initials = (u.display_name || u.email || "U").slice(0, 2).toUpperCase();
              return (
                <li
                  key={u.id}
                  className="grid grid-cols-[1.6fr_1fr_0.8fr_0.6fr_0.8fr] items-center gap-3 px-4 py-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                      <AvatarFallback className="bg-neutral-900 text-[11px] text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate font-medium text-neutral-900">
                        {u.display_name || u.username || "Unnamed"}
                        {u.is_admin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-neutral-500">
                        @{u.username || "no-handle"} {u.neighborhood && `- ${u.neighborhood}`}
                      </div>
                    </div>
                  </div>
                  <div className="hidden truncate text-neutral-600 sm:block">{u.email}</div>
                  <div className="hidden sm:block">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium capitalize text-neutral-700">
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        live ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" : "bg-neutral-300"
                      }`}
                    />
                    <span className="text-[11px] text-neutral-500">{live ? "Live" : "Offline"}</span>
                  </div>
                  <div className="flex justify-end">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setEditing(u)}
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      title="Edit user"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleShowcase(u)}
                      disabled={busy === u.id}
                      title={u.hidden_from_showcase ? "Show in Baltimore showcase" : "Hide from Baltimore showcase"}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                        u.hidden_from_showcase
                          ? "border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                          : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                    >
                      {u.hidden_from_showcase ? "Show" : "Hide"}
                    </button>
                    <button
                      onClick={() => toggleBan(u)}
                      disabled={busy === u.id || u.is_admin}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                        u.banned
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      {busy === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : u.banned ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> Unban</>
                      ) : (
                        <><Ban className="h-3.5 w-3.5" /> Ban</>
                      )}
                    </button>
                  </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <EditUserDialog user={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      <DangerZone onUserDeleted={(id: string) => setUsers((prev) => prev.filter((p) => p.id !== id))} />
    </AppLayout>
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

function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: (id: string, patch: Partial<AdminUser>) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? "");
    setUsername(user.username ?? "");
    setNeighborhood(user.neighborhood ?? "");
    setBio("");
    setAvatarUrl(user.avatar_url ?? "");
  }, [user]);

  if (!user) return null;

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data, error: signErr } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (signErr || !data) {
      setUploading(false);
      return toast.error(signErr?.message || "Could not sign URL");
    }
    setAvatarUrl(data.signedUrl);
    setUploading(false);
    toast.success("Photo uploaded");
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("admin_update_profile", {
      _user_id: user.id,
      _display_name: displayName || undefined,
      _username: username || undefined,
      _avatar_url: avatarUrl || undefined,
      _bio: bio || undefined,
      _neighborhood: neighborhood || undefined,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    onSaved(user.id, {
      display_name: displayName || null,
      username: username || null,
      neighborhood: neighborhood || null,
      avatar_url: avatarUrl || null,
    });
    toast.success("Profile updated");
    onClose();
  };

  const initials = (displayName || user.email || "U").slice(0, 2).toUpperCase();

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {avatarUrl && <AvatarImage src={avatarUrl} />}
              <AvatarFallback className="bg-neutral-900 text-white">{initials}</AvatarFallback>
            </Avatar>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? "Uploading..." : "Change photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }}
              />
            </label>
          </div>
          <div>
            <Label htmlFor="adm-name">Display name</Label>
            <Input id="adm-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="adm-username">Username</Label>
            <Input id="adm-username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="adm-hood">Neighborhood</Label>
            <Input id="adm-hood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="adm-bio">Bio (leave empty to keep current)</Label>
            <Textarea id="adm-bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="adm-avatar">Avatar URL</Label>
            <Input id="adm-avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
