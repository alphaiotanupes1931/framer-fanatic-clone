import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { staffLogin } from "@/lib/staff-login.functions";
import { setStaffMode } from "@/lib/staff-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Store } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business-login")({
  component: BusinessLoginPage,
  head: () => ({
    meta: [
      { title: "Staff Login | Planet Baltimore" },
      { name: "description", content: "Employees and board members can sign in to their page on Planet Baltimore with the email and password from the owner." },
      { property: "og:title", content: "Staff Login | Planet Baltimore" },
      { property: "og:description", content: "Sign in to manage your page on Planet Baltimore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function BusinessLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    try {
      const res = await staffLogin({ data: { username: username.trim(), password } });
      const { error } = await supabase.auth.signInWithPassword({ email: res.email, password });
      if (error) throw error;
      setStaffMode({ slug: res.slug, name: res.name });
      toast.success(`Signed in to ${res.name}`);
      navigate({ to: "/o/$slug", params: { slug: res.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Incorrect email or password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
            <Store className="h-5 w-5 text-orange" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Staff login</h1>
          <p className="text-sm text-muted-foreground">
            Use the staff or board email and password the page owner gave you.
          </p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="staff-username">Staff email</Label>
            <Input id="staff-username" type="email" placeholder="staff@business.com" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-password">Password</Label>
            <Input id="staff-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !username.trim() || !password}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in to your page
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Personal account? <a href="/auth" className="text-orange underline">Sign in here</a>
        </p>
      </div>
    </main>
  );
}
