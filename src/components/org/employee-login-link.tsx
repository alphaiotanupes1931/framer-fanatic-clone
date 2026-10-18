import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { staffLogin } from "@/lib/staff-login.functions";
import { clearStaffMode, setStaffMode } from "@/lib/staff-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Inline "Employee login" link that opens the staff sign-in form in place. */
export function EmployeeLoginLink() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    try {
      const res = await staffLogin({ data: { username: username.trim(), password } });
      setStaffMode({ slug: res.slug, name: res.name });
      const { error } = await supabase.auth.signInWithPassword({ email: res.email, password });
      if (error) { clearStaffMode(); throw error; }
      toast.success(`Signed in to ${res.name}`);
      setOpen(false);
      navigate({ to: "/o/$slug", params: { slug: res.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Incorrect email or password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5">
        <KeyRound className="h-4 w-4" /> Employee login
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Employee login</DialogTitle>
            <DialogDescription>Use the staff email and password the page owner gave you.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="emp-username">Staff email</Label>
              <Input id="emp-username" type="email" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-password">Password</Label>
              <Input id="emp-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !username.trim() || !password}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
