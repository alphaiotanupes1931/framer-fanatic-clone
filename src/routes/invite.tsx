import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/invite")({
  component: InvitePage,
  head: () => ({ meta: [{ title: "You're invited to Planet Baltimore" }] }),
});

function InvitePage() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    (async () => {
      if (ref) {
        try {
          const { data } = await supabase.rpc("resolve_referrer", { _username: ref });
          if (data) sessionStorage.setItem("pb_referred_by", data as unknown as string);
          sessionStorage.setItem("pb_referred_by_username", ref);
        } catch { /* ignore */ }
      }
      navigate({ to: "/auth" });
    })();
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Loading your invite...
    </div>
  );
}