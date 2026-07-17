import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import pbLogo from "@/assets/pb-logo.png";
import { useServerFn } from "@tanstack/react-start";
import { becomeArtist } from "@/lib/stripe.functions";
import { Eye, EyeOff } from "lucide-react";

function popPostAuthRedirect(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("redirect");
    const stored = sessionStorage.getItem("pb_post_auth_redirect");
    const v = fromUrl || stored;
    if (v) sessionStorage.removeItem("pb_post_auth_redirect");
    return v?.startsWith("/") && !v.startsWith("//") ? v : null;
  } catch { return null; }
}

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in or create an account" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const becomeArtistFn = useServerFn(becomeArtist);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSignInPw, setShowSignInPw] = useState(false);
  const [showSignUpPw, setShowSignUpPw] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"artist" | "resident" | "visitor">("resident");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const dest = popPostAuthRedirect();
        if (dest) { window.location.replace(dest); return; }
        navigate({ to: "/dashboard" });
      }
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (uid) {
      const { data: p } = await supabase.from("profiles").select("onboarded, must_reset_password").eq("id", uid).maybeSingle();
      if (p?.must_reset_password) {
        return navigate({ to: "/reset-password" });
      }
      const dest = popPostAuthRedirect();
      if (dest && p?.onboarded) { window.location.replace(dest); return; }
      navigate({ to: p?.onboarded ? "/dashboard" : "/onboarding" });
    } else {
      const dest = popPostAuthRedirect();
      if (dest) { window.location.replace(dest); return; }
      navigate({ to: "/dashboard" });
    }
  };

  const handleForgot = async () => {
    if (!email) return toast.error("Enter your email above first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent. Check your inbox.");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRole = role;
    const profileCategory =
      role === "resident" ? "Resident" :
      role === "visitor"  ? "Visitor"  :
      null;
    setLoading(true);
    let referredBy: string | null = null;
    try { referredBy = sessionStorage.getItem("pb_referred_by"); } catch { /* ignore */ }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          display_name: displayName || email.split("@")[0],
          role: finalRole,
          referred_by: referredBy,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(
      finalRole === "artist"
        ? "Account created. Welcome, Artist!"
        : finalRole === "visitor"
          ? "Account created as a Visitor."
          : "Account created as a Resident.",
    );
    if (finalRole === "artist") {
      try { await becomeArtistFn(); } catch { /* harmless - they can also upgrade from profile */ }
    }
    // Tag Resident / Visitor selections on the profile so we can show them appropriately.
    if (profileCategory) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user.id;
        if (uid) await supabase.from("profiles").update({ category: profileCategory }).eq("id", uid);
      } catch { /* non-fatal */ }
    }
    // Flag this session as a fresh signup so the onboarding tour auto-runs once.
    try { localStorage.setItem("pb_new_signup", "1"); } catch { /* ignore */ }
    try { sessionStorage.removeItem("pb_referred_by"); sessionStorage.removeItem("pb_referred_by_username"); } catch { /* ignore */ }
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:py-12">
      <Toaster richColors />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={pbLogo} alt="Logo" className="mx-auto mb-4 h-12 w-auto" />
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>Sign in or create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showSignInPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPw((v) => !v)}
                      aria-label={showSignInPw ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    >
                      {showSignInPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <button
                  type="button"
                  onClick={handleForgot}
                  className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Display name</Label>
                  <Input id="signup-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignUpPw ? "text" : "password"}
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPw((v) => !v)}
                      aria-label={showSignUpPw ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    >
                      {showSignUpPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>I'm signing up as</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("artist")}
                      className={`rounded-md border px-3 py-2 text-sm transition ${role === "artist" ? "border-primary bg-primary/10" : "border-input"}`}
                    >
                      Artist
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("resident")}
                      className={`rounded-md border px-3 py-2 text-sm transition ${role === "resident" ? "border-primary bg-primary/10" : "border-input"}`}
                    >
                      Resident
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("visitor")}
                      className={`col-span-2 rounded-md border px-3 py-2 text-sm transition ${role === "visitor" ? "border-primary bg-primary/10" : "border-input"}`}
                    >
                      Visitor
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:underline">Back to home</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}