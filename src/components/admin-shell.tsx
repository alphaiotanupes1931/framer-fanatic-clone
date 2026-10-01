import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { isAdminUnlocked, lockAdmin, refreshAdminUnlocked } from "@/lib/admin-gate";
import pbLogo from "@/assets/pb-logo-dark.png";
import { Toaster } from "@/components/ui/sonner";
import { Img } from "@/components/shared/smart-img";
import { Button } from "@/components/ui/button";

const ADMIN_NAV = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/activity", label: "Activity" },
  { to: "/admin/email-groups", label: "Email groups" },
  { to: "/admin/blocked-emails", label: "Blocked emails" },
  { to: "/admin/content", label: "Landing page" },
  { to: "/admin/stripe-logs", label: "Payment logs" },
  { to: "/admin/trash", label: "Trash" },
  { to: "/admin/design-system", label: "Design system" },
] as const;

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    setUnlocked(isAdminUnlocked());
    void refreshAdminUnlocked().then(setUnlocked);
  }, []);
  const path = useRouterState({ select: (st) => st.location.pathname }).replace(/\/$/, "") || "/admin";
  return (
    <div className="min-h-screen bg-neutral-50" style={{ minHeight: "100dvh" }}>
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2 font-semibold text-neutral-900">
            <Img src={pbLogo} alt="Planet Baltimore" className="h-7 w-7 rounded-full bg-neutral-900 object-contain p-1" />
            Planet Baltimore Admin
          </Link>
          {unlocked && (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/onboarding" search={{ preview: true }}>Onboarding preview</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await lockAdmin();
                  window.location.href = "/admin/login";
                }}
              >
                <LogOut /> Sign out
              </Button>
            </div>
          )}
        </div>
        {unlocked && (
          <nav className="mx-auto flex w-full max-w-[1120px] gap-1 overflow-x-auto px-4 sm:px-6">
            {ADMIN_NAV.map((n) => {
              const active = path === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                    active ? "border-orange text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}