import { useEffect, useState } from "react";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteStaffLogin, listStaffLogins, resendStaffVerification, setStaffLogin, verifyStaffEmail } from "@/lib/staff-login.functions";
import { staffLoginCopy } from "@/lib/staff-login-copy";

type Row = { id: string; username: string; last_login_at: string | null; created_at: string; email_verified: boolean };

/** Owner-only: manage the username/password employees use to sign in to this page. */
export function StaffLoginCard({ orgId, orgType = "business" }: { orgId: string; orgType?: string }) {
  const copy = staffLoginCopy(orgType);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [code, setCode] = useState("");

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
      toast.success("Staff login saved. We sent a verification code to that email.");
      setCodeFor(username.trim().toLowerCase());
      setUsername(""); setPassword(""); setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const resend = async (email: string) => {
    try {
      await resendStaffVerification({ data: { organizationId: orgId, email } });
      toast.success("We sent a new code");
      setCodeFor(email);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send a new code");
    }
  };

  const confirmCode = async () => {
    if (!codeFor) return;
    try {
      await verifyStaffEmail({ data: { email: codeFor, code: code.trim() } });
      toast.success("Staff email verified");
      setCodeFor(null); setCode("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That code did not work");
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
            <p className="text-sm font-semibold text-neutral-900">{copy.cardTitle}</p>
            <p className="text-xs text-neutral-600">{copy.description}</p>
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
                {r.email_verified ? (
                  <span className="text-emerald-600">Verified</span>
                ) : (
                  <button onClick={() => void resend(r.username)} className="text-[#d4580a] underline">Not verified - send code</button>
                )}
                {r.last_login_at ? `Last used ${new Date(r.last_login_at).toLocaleDateString()}` : "Never used"}
                <button onClick={() => remove(r.id)} aria-label={`Remove ${r.username}`} className="text-neutral-500 hover:text-[#d4580a]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {codeFor && (
        <div className="mt-3 flex items-end gap-2 rounded-lg bg-neutral-50 p-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="staff-code-card">Code sent to {codeFor}</Label>
            <Input id="staff-code-card" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" />
          </div>
          <Button size="sm" onClick={() => void confirmCode()} disabled={code.trim().length !== 6}>Verify</Button>
          <Button size="sm" variant="ghost" onClick={() => { setCodeFor(null); setCode(""); }}>Later</Button>
        </div>
      )}

      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="staff-u">{copy.emailLabel}</Label>
            <Input id="staff-u" type="email" placeholder="staff@business.com" value={username} autoComplete="off" onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-p">{copy.passwordLabel}</Label>
            <Input id="staff-p" type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between">
            <p className="text-xs text-neutral-500">Staff sign in at /business-login</p>
            <Button size="sm" onClick={save} disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username.trim()) || password.length < 8}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
