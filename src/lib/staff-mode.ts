/**
 * Staff mode.
 *
 * An employee who signs in at /business-login is working *on behalf of* a
 * business page, not on the owner's personal account. We remember that in the
 * browser so the app can hide the owner's personal areas (messages, settings,
 * their other pages) and the destructive page controls.
 */
import { useEffect, useState } from "react";

// Deliberately not prefixed "pb:" — the app wipes pb:* keys on every auth
// state change, which would drop the staff flag right after signing in.
const KEY = "planetbaltimore_staff_mode_v1";

export type StaffMode = { slug: string; name: string };

export function getStaffMode(): StaffMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StaffMode;
    return parsed?.slug ? parsed : null;
  } catch {
    return null;
  }
}

export function setStaffMode(mode: StaffMode) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(mode));
    window.dispatchEvent(new Event("pb:staff-mode"));
  } catch {
    /* storage unavailable is never fatal */
  }
}

export function clearStaffMode() {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("pb:staff-mode"));
  } catch {
    /* ignore */
  }
}

/** Paths an employee may visit while signed in through a staff login. */
export function isStaffAllowedPath(pathname: string, slug: string): boolean {
  if (pathname === `/o/${slug}`) return true;
  if (pathname.startsWith(`/o/${slug}/`)) return true;
  return (
    pathname === "/" ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/business-login")
  );
}

/** Reactive read of staff mode for components. */
export function useStaffMode(): StaffMode | null {
  const [mode, setMode] = useState<StaffMode | null>(null);
  useEffect(() => {
    const read = () => setMode(getStaffMode());
    read();
    window.addEventListener("pb:staff-mode", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("pb:staff-mode", read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return mode;
}
