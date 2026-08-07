import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Paths that must stay reachable even before onboarding is finished.
const EXEMPT = ["/onboarding", "/auth", "/reset-password", "/admin", "/lovable", "/email"];

/**
 * Email confirmation links can be opened on a different device than the one
 * used to sign up (phone vs laptop). In that case the signup choices saved in
 * localStorage aren't there, and the user lands straight in the app with an
 * unfinished profile. This guard checks the server-side `onboarded` flag on
 * every navigation and sends them to /onboarding until it's set.
 */
export function OnboardingGuard() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const checking = useRef(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || checking.current) return;
    if (EXEMPT.some((p) => pathname === p || pathname.startsWith(p + "/"))) return;
    checking.current = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id;
        if (!uid) return;
        const { data: p } = await supabase
          .from("profiles")
          .select("onboarded")
          .eq("id", uid)
          .maybeSingle();
        if (p && !p.onboarded) {
          navigate({ to: "/onboarding" });
        } else if (p?.onboarded) {
          done.current = true;
        }
      } catch {
        /* never block the app on this check */
      } finally {
        checking.current = false;
      }
    })();
  }, [pathname, navigate]);

  return null;
}
