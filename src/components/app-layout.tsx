import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
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

export function useCurrentProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/auth" }); return; }
      const { data: p } = await supabase.from("profiles")
        .select("id, display_name, username, email, avatar_url, role, neighborhood, bio, website, banner_url, stripe_account_id, stripe_account_status, stripe_charges_enabled")
        .eq("id", data.session.user.id).maybeSingle();
      if (p) setProfile(p as Profile);
    })();
  }, [navigate]);
  return profile;
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
  return (
    <div className="min-h-screen bg-background" style={{ minHeight: "100dvh" }}>
      <LeftSidebar />
      <RightSidebar />
      <div
        className={`flex min-h-[100dvh] flex-col transition-all duration-300 2xl:mr-[300px] ${collapsed ? "lg:ml-[78px]" : "lg:ml-[240px]"}`}
      >
        <TopMenuBar />
        <main className="w-full flex-1">
          <div className="mx-auto w-full max-w-[1120px] px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] text-base sm:px-6 sm:py-6 lg:px-10 lg:py-10 lg:pb-10 lg:text-[18px] [&_.text-xs]:text-[13px] [&_.text-sm]:text-[15px] [&_.text-base]:text-[17px]">
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