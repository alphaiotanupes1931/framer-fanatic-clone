import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Eye, EyeOff } from "lucide-react";
import pbLogo from "@/assets/pb-logo.png";
import { Img } from "@/components/shared/smart-img";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Set a new password" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Recovery links arrive with #type=recovery in the URL hash; supabase-js handles it.
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setHasSession(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters.");
    if (pw !== pw2) return toast.error("Passwords don't match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setLoading(false); return toast.error(error.message); }
    // Clear the temp-password flag for this user, if set.
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (uid) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("onboarded, neighborhood, category, avatar_url, bio, display_name")
        .eq("id", uid)
        .maybeSingle();
      const patch: Record<string, unknown> = { must_reset_password: false };
      // Existing members shouldn't be pushed back through onboarding after a reset.
      if (prof && !prof.onboarded && !profileNeedsOnboarding(prof as any)) patch.onboarded = true;
      await supabase.from("profiles").update(patch).eq("id", uid);
    }
    setLoading(false);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:py-12">
      <Toaster richColors />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Img src={pbLogo} alt="Logo" className="mx-auto mb-4 h-12 w-auto" />
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription>
            {hasSession === false
              ? "Your reset link may have expired. Request a new one from the sign-in page."
              : "Choose a new password to finish signing in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession === false ? (
            <p className="text-center text-sm">
              <Link to="/auth" className="underline">Back to sign in</Link>
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pw">New password</Label>
                <div className="relative">
                  <Input
                    id="new-pw"
                    type={show ? "text" : "password"}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    minLength={6}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pw2">Confirm password</Label>
                <Input
                  id="new-pw2"
                  type={show ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Save new password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}