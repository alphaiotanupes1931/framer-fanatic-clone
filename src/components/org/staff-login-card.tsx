import { useEffect, useState } from "react";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteStaffLogin, listStaffLogins, setStaffLogin } from "@/lib/staff-login.functions";

type Row = { id: string; username: string; last_login_at: string | null; created_at: string };

/** Owner-only: manage the username/password employees use to sign in to this page. */
export function StaffLoginCard({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setRows((await listStaffLogins({ data: { organizationId: orgId } })) as Row[]);
    } catch { /* owner-only; ignore */ }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const save = async () => {
    setBusy(true);
    try {
      await setStaffLogin({ data: { organizationId: orgId, username: username.trim(), password } });
      toast.success("Staff login saved");
      setUsername(""); setPassword(""); setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this staff login? Employees using it will no longer be able to sign in.")) return;
    try {
      await deleteStaffLogin({ data: { id } });
      toast.success("Staff login removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#d4580a]" />
          <div>
            <p className="text-sm font-semibold text-neutral-900">Employee login</p>
            <p className="text-xs text-neutral-600">A separate username and password for staff, so nobody needs your account.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          {rows.length ? "Change" : "Create"}
        </Button>
      </div>

      {rows.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 text-sm">
              <span className="font-medium text-neutral-800">{r.username}</span>
              <span className="flex items-center gap-3 text-xs text-neutral-500">
                {r.last_login_at ? `Last used ${new Date(r.last_login_at).toLocaleDateString()}` : "Never used"}
                <button onClick={() => remove(r.id)} aria-label={`Remove ${r.username}`} className="text-neutral-500 hover:text-[#d4580a]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="staff-u">Username</Label>
            <Input id="staff-u" value={username} autoComplete="off" onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-p">Password</Label>
            <Input id="staff-p" type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between">
            <p className="text-xs text-neutral-500">Staff sign in at /business-login</p>
            <Button size="sm" onClick={save} disabled={busy || username.trim().length < 3 || password.length < 8}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
