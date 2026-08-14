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
import { Img } from "@/components/shared/smart-img";
import { siteUrl } from "@/lib/utils";
import { ONBOARDING_FIELDS, profileNeedsOnboarding } from "@/lib/onboarding";

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
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" && search.redirect.startsWith("/") && !search.redirect.startsWith("//")
      ? { redirect: search.redirect }
      : {},
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in or create an account" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const becomeArtistFn = useServerFn(becomeArtist);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSignInPw, setShowSignInPw] = useState(false);
  const [showSignUpPw, setShowSignUpPw] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"artist" | "resident" | "visitor">("resident");
  const [awaitingConfirm, setAwaitingConfirm] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  // Read after mount so server and client markup match.
  useEffect(() => {
    try {
      setReferrerName(sessionStorage.getItem("pb_referred_by_username"));
      setInvited(sessionStorage.getItem("pb_invited") === "1" || !!sessionStorage.getItem("pb_referred_by"));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      // Confirmation links can land here on a different device, so trust the
      // server-side flag rather than anything saved locally at signup.
      const { data: p } = await supabase.from("profiles").select(ONBOARDING_FIELDS).eq("id", uid).maybeSingle();
      if (profileNeedsOnboarding(p as any)) { navigate({ to: "/onboarding" }); return; }
      const dest = redirect || popPostAuthRedirect();
      if (dest) { window.location.replace(dest); return; }
      navigate({ to: "/dashboard" });
    });
  }, [navigate, redirect]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    // Apply any role/category chosen at signup, once the confirmed session exists.
    try {
      const pending = localStorage.getItem("pb_pending_signup");
      if (pending) {
        const { role: pRole, category } = JSON.parse(pending) as { role?: string; category?: string | null };
        if (pRole === "artist") { try { await becomeArtistFn(); } catch { /* can upgrade later */ } }
        if (category) {
          const { data: s } = await supabase.auth.getSession();
          const id = s.session?.user.id;
          if (id) await supabase.from("profiles").update({ category }).eq("id", id);
        }
        localStorage.removeItem("pb_pending_signup");
      }
    } catch { /* non-fatal */ }
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (uid) {
      const { data: p } = await supabase
        .from("profiles")
        .select("onboarded, neighborhood, category, avatar_url, bio, display_name, must_reset_password")
        .eq("id", uid)
        .maybeSingle();
      if (p?.must_reset_password) {
        return navigate({ to: "/reset-password" });
      }
      const needsOnboarding = profileNeedsOnboarding(p as any);
      const dest = redirect || popPostAuthRedirect();
      if (dest && !needsOnboarding) { window.location.replace(dest); return; }
      navigate({ to: needsOnboarding ? "/onboarding" : "/dashboard" });
    } else {
       const dest = redirect || popPostAuthRedirect();
      if (dest) { window.location.replace(dest); return; }
      navigate({ to: "/dashboard" });
    }
  };

  const handleForgot = async () => {
    if (!email) return toast.error("Enter your email above first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: siteUrl("/reset-password"),
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
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: siteUrl("/"),
        data: {
          display_name: displayName || email.split("@")[0],
          role: finalRole,
          referred_by: referredBy,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    // With email confirmation on, there is no session until the user clicks the
    // link in their inbox. Stash their choices and show a "check your email" state.
    if (!signUpData.session) {
      try {
        localStorage.setItem("pb_pending_signup", JSON.stringify({ role: finalRole, category: profileCategory }));
        localStorage.setItem("pb_new_signup", "1");
      } catch { /* ignore */ }
      try { sessionStorage.removeItem("pb_referred_by"); sessionStorage.removeItem("pb_referred_by_username"); sessionStorage.removeItem("pb_invited"); } catch { /* ignore */ }
      setAwaitingConfirm(email);
      toast.success("Check your email to confirm your account.");
      return;
    }
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
    try { sessionStorage.removeItem("pb_referred_by"); sessionStorage.removeItem("pb_referred_by_username"); sessionStorage.removeItem("pb_invited"); } catch { /* ignore */ }
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:py-12">
      <Toaster richColors />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Img src={pbLogo} alt="Logo" className="mx-auto mb-4 h-12 w-auto" />
          <CardTitle className="text-2xl">{awaitingConfirm ? "Confirm your email" : "Welcome"}</CardTitle>
          <CardDescription>
            {awaitingConfirm
              ? `We sent a confirmation link to ${awaitingConfirm}. Click it to activate your account, then sign in.`
              : "Sign in or create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(referrerName || invited) && !awaitingConfirm && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
              <p className="text-sm font-semibold text-foreground">
                {referrerName ? `You were invited by @${referrerName}` : "Your invite is confirmed"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Create your account below and whoever invited you gets their referral credit.
              </p>
            </div>
          )}
          {awaitingConfirm ? (
            <div className="space-y-4 text-center text-sm">
              <p className="text-muted-foreground">
                Didn't get it? Check your spam folder, or resend the link below.
              </p>
              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  const { error } = await supabase.auth.resend({ type: "signup", email: awaitingConfirm });
                  setLoading(false);
                  if (error) return toast.error(error.message);
                  toast.success("Confirmation email resent.");
                }}
              >
                Resend confirmation email
              </Button>
              <button type="button" className="underline text-muted-foreground" onClick={() => setAwaitingConfirm(null)}>
                Back to sign in
              </button>
            </div>
          ) : (
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
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgot}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
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
                      onClick={() => setRole("resident")}
                      className={`rounded-md border px-3 py-2 text-sm transition ${role === "resident" ? "border-primary bg-primary/10" : "border-input"}`}
                    >
                      Resident
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("visitor")}
                      className={`rounded-md border px-3 py-2 text-sm transition ${role === "visitor" ? "border-primary bg-primary/10" : "border-input"}`}
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
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:underline">Back to home</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}