import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setPendingGroup, groupInvitePath } from "@/lib/pending-join";

export const Route = createFileRoute("/invite")({
  component: InvitePage,
  head: () => ({ meta: [{ title: "You're invited to Planet Baltimore" }] }),
});

function InvitePage() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const inviteToken = params.get("iv");
    const groupSlug = params.get("g");
    (async () => {
      if (inviteToken) {
        try {
          const { data } = await supabase.rpc("record_invite_click", { _token: inviteToken });
          if (data) sessionStorage.setItem("pb_referred_by", data as unknown as string);
          sessionStorage.setItem("pb_invite_token", inviteToken);
          sessionStorage.setItem("pb_invited", "1");
        } catch { /* ignore */ }
      }
      if (ref) {
        try {
          const { data } = await supabase.rpc("resolve_referrer", { _username: ref });
          if (data) sessionStorage.setItem("pb_referred_by", data as unknown as string);
          sessionStorage.setItem("pb_referred_by_username", ref);
        } catch { /* ignore */ }
      }
      if (groupSlug) {
        // Group invites end on that page. Signed-out guests sign in or sign up
        // first, then get sent straight back to the group.
        setPendingGroup(groupSlug);
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) {
          window.location.replace(groupInvitePath(groupSlug));
        } else {
          navigate({ to: "/auth", search: { redirect: groupInvitePath(groupSlug) } });
        }
        return;
      }
      // Referral visitors land on the homepage first, referral credit stays in session.
      navigate({ to: "/" });
    })();
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Loading your invite...
    </div>
  );
}