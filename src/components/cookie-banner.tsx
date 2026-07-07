import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

const KEY = "pb-cookie-consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {}
  }, []);
  if (pathname === "/dashboard") return null;
  if (!show) return null;
  const decide = (v: "accepted" | "declined") => {
    try { localStorage.setItem(KEY, v); } catch {}
    setShow(false);
  };
  return (
    <div
      className="fixed inset-x-2 z-[80] md:inset-x-auto md:right-5 md:bottom-5 md:max-w-md"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }}
    >
      <div className="rounded-xl border border-white/10 bg-neutral-900 p-3 text-white shadow-2xl md:rounded-2xl md:p-5 dark:bg-card dark:text-card-foreground dark:border-border">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 text-[12px] leading-snug md:text-sm">
            We use cookies to keep you signed in. See our{" "}
            <Link to="/privacy" className="underline">Privacy</Link> and{" "}
            <Link to="/cookies" className="underline">Cookies</Link>.
          </div>
          <div className="flex flex-shrink-0 gap-1.5">
            <button
              onClick={() => decide("declined")}
              className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-medium hover:bg-white/10 md:px-4 md:py-1.5 md:text-xs dark:border-border dark:hover:bg-accent"
            >
              Decline
            </button>
            <button
              onClick={() => decide("accepted")}
              className="rounded-full bg-white !text-neutral-900 px-3 py-1 text-[11px] font-semibold hover:brightness-95 md:px-4 md:py-1.5 md:text-xs dark:bg-orange dark:!text-white"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}