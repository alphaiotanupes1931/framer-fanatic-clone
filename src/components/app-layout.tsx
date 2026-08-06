import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { clearSignedUrlCache } from "@/components/smart-image";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { TopMenuBar } from "@/components/layout/top-menu-bar";
import { MobileNav } from "@/components/layout/mobile-nav";

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

function publishProfile(p: Profile | null) {
  profileCache = p;
  for (const fn of profileSubscribers) fn(p);
}

function loadProfile(): Promise<Profile | null> {
  if (!profileRequest) {
    profileRequest = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return null;
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

export function useCurrentProfile() {
  const [profile, setProfile] = useState<Profile | null>(profileCache);
  const navigate = useNavigate();
  useEffect(() => {
    profileSubscribers.add(setProfile);
    let cancelled = false;
    loadProfile().then((p) => {
      if (cancelled) return;
      if (!p && !profileCache) navigate({ to: "/auth" });
    });
    return () => {
      cancelled = true;
      profileSubscribers.delete(setProfile);
    };
  }, [navigate]);
  return profile;
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
      invalidateCurrentProfile();
      // Signed URLs are per-session capability links; don't leak them across users.
      if (event !== "USER_UPDATED") clearSignedUrlCache();
      publishProfile(null);
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
  const { collapsed, rightCollapsed } = useSidebar();
  return (
    <div className="min-h-screen bg-background" style={{ minHeight: "100dvh" }}>
      <LeftSidebar />
      <RightSidebar />
      <div
        className={`flex min-h-[100dvh] flex-col transition-all duration-300 ${rightCollapsed ? "xl:mr-0" : "xl:mr-[280px]"} ${collapsed ? "lg:ml-[78px]" : "lg:ml-[288px]"}`}
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

export function PlaceholderGrid({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}