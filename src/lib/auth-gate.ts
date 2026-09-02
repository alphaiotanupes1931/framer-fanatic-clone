/**
 * Signed-out visitors land on shared links (an event, a story). The page
 * itself stays readable, but the moment they reach for the navigation we send
 * them to sign up and remember where they were so they come straight back.
 */
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";
import { setPostAuthRedirect } from "@/lib/pending-join";

export function useSignupGate(signedIn: boolean, loading: boolean) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return useCallback(
    (e: React.MouseEvent) => {
      if (loading || signedIn) return;
      e.preventDefault();
      e.stopPropagation();
      const here = `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`;
      setPostAuthRedirect(here);
      navigate({ to: "/auth", search: { mode: "signup", redirect: here } });
    },
    [signedIn, loading, pathname, navigate],
  );
}
