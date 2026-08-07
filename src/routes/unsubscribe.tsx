import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MailX, Check } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Unsubscribe | Planet Baltimore" },
      { name: "description", content: "Manage your Planet Baltimore email preferences and unsubscribe from future emails." },
      { property: "og:title", content: "Unsubscribe | Planet Baltimore" },
      { property: "og:description", content: "Manage your Planet Baltimore email preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function UnsubscribePage() {
  const [state, setState] = useState<"loading" | "ready" | "done" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
    if (!t) {
      setState("error");
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || "Invalid link");
        setEmail(body.email ?? null);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  const confirm = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!r.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {state === "done" ? (
            <Check className="h-6 w-6 text-primary" />
          ) : (
            <MailX className="h-6 w-6 text-primary" />
          )}
        </div>
        {state === "loading" && (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link...
          </p>
        )}
        {state === "ready" && (
          <>
            <h1 className="text-xl font-bold text-foreground">Confirm unsubscribe</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {email ? `${email} will stop receiving emails from Planet Baltimore.` : "You will stop receiving emails from Planet Baltimore."}
            </p>
            <Button onClick={confirm} disabled={submitting} className="mt-5 w-full">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Unsubscribe
            </Button>
          </>
        )}
        {state === "done" && (
          <>
            <h1 className="text-xl font-bold text-foreground">You are unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You will no longer receive these emails. You can always rejoin from your account settings.
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-xl font-bold text-foreground">This link is not valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The unsubscribe link may have expired. Please use the link in your most recent email.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
