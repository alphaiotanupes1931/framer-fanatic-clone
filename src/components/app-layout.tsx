import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { clearSignedUrlCache } from "@/components/smart-image";
import { clearDataCache } from "@/hooks/use-cached-fetch";
import { warmConnections, invalidateConnections } from "@/lib/connections";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { TopMenuBar } from "@/components/layout/top-menu-bar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { isStaffAllowedPath, useStaffMode } from "@/lib/staff-mode";


export type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  neighborhood: string | null;
  bio: string | null;
  website: string | null;
  banner_url: string | null;
  stripe_account_id: string | null;
  stripe_account_status: string | null;
  stripe_charges_enabled: boolean;
};

// The signed-in profile is read by many components at once. Without a shared
// cache every one of them fires its own session lookup + RPC on mount, which
// is a large part of why profile pages felt slow. Cache the profile in module
// scope and share a single in-flight request across all callers.
let profileCache: Profile | null = null;
let profileRequest: Promise<Profile | null> | null = null;
const profileSubscribers = new Set<(p: Profile | null) => void>();

// The signed-in profile drives the sidebar, avatar and every "is this mine?"
// check. Persisting it means a hard refresh paints the signed-in chrome right
// away instead of flashing the logged-out version for a moment.
const PROFILE_STORAGE_KEY = "pb:profile:v1";

function storeProfile(p: Profile | null) {
  if (typeof window === "undefined") return;
  try {
    if (p) window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Storage being unavailable is never fatal.
  }
}

function publishProfile(p: Profile | null) {
  // Keep the previous object identity when nothing actually changed. Every
  // consumer keys effects off this value, so handing back a fresh object on
  // each fetch would restart those effects (and their fetches) forever.
  if (p && profileCache && JSON.stringify(p) === JSON.stringify(profileCache)) {
    return;
  }
  profileCache = p;
  storeProfile(p);
  for (const fn of profileSubscribers) fn(p);
}

function loadProfile(): Promise<Profile | null> {
  if (!profileRequest) {
    profileRequest = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // No session: drop any optimistically restored profile so guards and
        // the sidebar reflect the real signed-out state.
        profileCache = null;
        storeProfile(null);
        for (const fn of profileSubscribers) fn(null);
        return null;
      }
      const { data: rows } = await supabase.rpc("my_profile");
      const p = (rows as unknown as Profile[] | null)?.[0] ?? null;
      publishProfile(p);
      return p;
    })().finally(() => {
      profileRequest = null;
    });
  }
  return profileRequest;
}

/** Drop the cached profile so the next read refetches (after edits/sign-out). */
export function invalidateCurrentProfile() {
  profileCache = null;
  profileRequest = null;
}

/**
 * Routes signed-out visitors (and search crawlers) may read without being
 * bounced to the sign-in screen.
 */
const PUBLIC_PATH_PREFIXES = ["/events/", "/t/", "/invite", "/auth", "/reset-password", "/business-login", "/u/", "/o/"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

export function useCurrentProfile() {
  const [profile, setProfile] = useState<Profile | null>(profileCache);
  const navigate = useNavigate();
  // Owner-only UI must be driven by the live session, never a stale persisted
  // profile from another account on the same browser.
  // useNavigate() returns a new function on every render; keeping it in the
  // dependency list re-ran this effect after each state update, which is what
  // made profile/story pages refetch and flicker in a loop.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  useEffect(() => {
    profileSubscribers.add(setProfile);
    let cancelled = false;
    loadProfile().then((p) => {
      if (cancelled) return;
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      if (!p && !profileCache && !isPublicPath(path)) navigateRef.current({ to: "/auth" });
      // Warm the people-you-know list so share sheets open with no spinner.
      if (p?.id) warmConnections(p.id);
    });
    return () => {
      cancelled = true;
      profileSubscribers.delete(setProfile);
    };
  }, []);
  return profile;
}

// Cached app data is per-account. Anything left in storage after sign-out is
// readable by whoever uses the device next, so wipe it on every identity change.
function clearCachedAppData() {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("pb:")) window.localStorage.removeItem(key);
    }
  } catch {
    // Storage being unavailable is never fatal.
  }
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
      invalidateCurrentProfile();
      invalidateConnections();
      // Signed URLs are per-session capability links; don't leak them across users.
      if (event !== "USER_UPDATED" && event !== "INITIAL_SESSION") {
        clearSignedUrlCache();
        clearDataCache();
        clearCachedAppData();
      }
      publishProfile(null);
      if (event !== "SIGNED_OUT") void loadProfile();
    }
  });
}

// Repo-styled shell: LeftSidebar (desktop), RightSidebar (xl+), TopMenuBar (mobile),
// MobileNav bottom bar. Content column shifts based on sidebar collapsed state.
// Same public API as before so existing callers keep working.
export function AppLayout(props: {
  title?: string;
  subtitle?: string;
  cta?: string;
  ctaTo?: string;
  onCta?: () => void;
  hero?: boolean;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <Shell>{props.children}</Shell>
    </SidebarProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  useStaffRouteGuard();
  return (
    <div className="min-h-screen bg-background" style={{ minHeight: "100dvh" }}>
      <LeftSidebar />
      <div
        className={`flex min-h-[100dvh] flex-col transition-all duration-300 ${collapsed ? "lg:ml-[78px]" : "lg:ml-[288px]"}`}
      >
        <TopMenuBar />
        <main className="w-full flex-1">
          <div className="mx-auto w-full max-w-[1600px] min-w-0 px-3 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] text-base sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pb-10 xl:px-10 2xl:px-14 lg:text-[18px] [&_.text-xs]:text-[13px] [&_.text-sm]:text-[15px] [&_.text-base]:text-[17px]">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

/** Employees signed in through a staff login stay on their business page. */
function useStaffRouteGuard() {
  const staff = useStaffMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  useEffect(() => {
    if (!staff) return;
    if (isStaffAllowedPath(pathname, staff.slug)) return;
    navigate({ to: "/o/$slug", params: { slug: staff.slug }, replace: true });
  }, [staff, pathname, navigate]);
}

export function PlaceholderGrid({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}