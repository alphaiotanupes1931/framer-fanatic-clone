import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { isAdminUnlocked, unlockAdmin } from "@/lib/admin-gate";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
  head: () => ({ meta: [{ title: "Admin login - Planet Baltimore" }] }),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdminUnlocked()) navigate({ to: "/admin" });
  }, [navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = unlockAdmin(username, password);
    setSubmitting(false);
    if (!ok) { toast.error("Invalid username or password"); return; }
    toast.success("Welcome");
    navigate({ to: "/admin" });
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-sm space-y-6 py-10">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange/10">
            <Lock className="h-5 w-5 text-orange" />
          </div>
          <h1 className="text-2xl font-bold">Admin login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Restricted area. Enter credentials to continue.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </AdminShell>
  );
}
