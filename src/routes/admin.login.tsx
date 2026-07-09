import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { unlockAdmin, refreshAdminUnlocked } from "@/lib/admin-gate";
import pbLogo from "@/assets/pb-logo-dark.png";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
  head: () => ({ meta: [{ title: "Admin login - Planet Baltimore" }] }),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshAdminUnlocked().then((ok) => { if (ok) navigate({ to: "/admin" }); });
  }, [navigate]);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await unlockAdmin(username, password);
      setSubmitting(false);
      if (!result.ok) {
        const msg = result.reason === "not_configured"
          ? "Admin login is not configured on this deployment"
          : "Invalid username or password";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Welcome");
      navigate({ to: "/admin" });
    } catch (err) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
      toast.error(msg);
    }
  };

  const submitFromKeyboard = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || submitting) return;
    e.preventDefault();
    void submit();
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-sm space-y-6 py-10">
        <div className="text-center">
          <img src={pbLogo} alt="Planet Baltimore" className="mx-auto mb-3 h-12 w-12 rounded-full bg-neutral-900 object-contain p-2" />
          <h1 className="text-2xl font-bold">Admin login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Restricted area. Enter credentials to continue.</p>
        </div>
        <div role="form" className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={submitFromKeyboard} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={submitFromKeyboard} required />
          </div>
          <Button type="button" className="w-full" disabled={submitting} onClick={() => void submit()}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
          {error && (
            <p className="text-center text-sm text-red-600" role="alert">{error}</p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
