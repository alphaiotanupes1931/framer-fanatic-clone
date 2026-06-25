import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "pb-cookie-consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {}
  }, []);
  if (!show) return null;
  const decide = (v: "accepted" | "declined") => {
    try { localStorage.setItem(KEY, v); } catch {}
    setShow(false);
  };
  return (
    <div className="fixed inset-x-3 bottom-3 z-[80] md:inset-x-auto md:right-5 md:bottom-5 md:max-w-md">
      <div className="rounded-2xl border border-white/10 bg-neutral-900 text-white shadow-2xl p-4 md:p-5 dark:bg-card dark:text-card-foreground dark:border-border">
        <div className="text-sm leading-snug">
          We use cookies to keep you signed in and improve Planet Baltimore. See our{" "}
          <Link to="/privacy" className="underline">Privacy Policy</Link> and{" "}
          <Link to="/cookies" className="underline">Cookie Policy</Link>.
        </div>
        <div className="mt-3 flex gap-2 justify-end">
          <button
            onClick={() => decide("declined")}
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium hover:bg-white/10 dark:border-border dark:hover:bg-accent"
          >
            Decline
          </button>
          <button
            onClick={() => decide("accepted")}
            className="rounded-full bg-white !text-neutral-900 px-4 py-1.5 text-xs font-semibold hover:brightness-95 dark:bg-orange dark:!text-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}