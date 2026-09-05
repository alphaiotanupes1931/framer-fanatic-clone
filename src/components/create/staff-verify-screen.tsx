import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendStaffVerification, verifyStaffEmail } from "@/lib/staff-login.functions";

/**
 * Shown right after a page is created with a staff login. The staff email has
 * to be confirmed before the login works, so the person can reset the password
 * later if they get locked out. Skipping is allowed: the login is saved but
 * stays unusable until it is verified from the page settings.
 */
export function StaffVerifyScreen({
  email,
  organizationId,
  pageName,
  onVerified,
  onSkip,
}: {
  email: string;
  organizationId: string;
  pageName: string;
  onVerified: () => void;
  onSkip: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await verifyStaffEmail({ data: { email, code: code.trim() } });
      toast.success("Staff email verified. The staff login is ready to use.");
      onVerified();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That code did not work");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await resendStaffVerification({ data: { organizationId, email } });
      toast.success("We sent a new code");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send a new code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
        <MailCheck className="h-5 w-5 text-[#d4580a]" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Verify the staff email</h2>
        <p className="text-sm text-muted-foreground">
          {pageName} is created. We sent a 6 digit code to <span className="font-medium text-foreground">{email}</span>.
          Verifying it means the password can be reset if anyone gets locked out.
        </p>
      </div>
      <form className="space-y-4 text-left" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label htmlFor="staff-code">Verification code</Label>
          <Input
            id="staff-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-lg tracking-[0.4em]"
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy || code.trim().length !== 6}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify and continue
        </Button>
      </form>
      <div className="space-y-2">
        <button type="button" onClick={() => void resend()} disabled={resending} className="text-xs text-muted-foreground underline disabled:opacity-50">
          {resending ? "Sending..." : "Send the code again"}
        </button>
        <button type="button" onClick={onSkip} className="block w-full text-sm font-medium text-[#d4580a] underline">
          I cannot verify at this moment
        </button>
        <p className="text-xs text-muted-foreground">
          If you skip, the staff login is saved but cannot be used to sign in until the email is verified.
        </p>
      </div>
    </div>
  );
}
