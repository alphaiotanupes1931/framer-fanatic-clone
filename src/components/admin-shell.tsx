import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Shield, LogOut } from "lucide-react";
import { isAdminUnlocked, lockAdmin } from "@/lib/admin-gate";

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const unlocked = typeof window !== "undefined" && isAdminUnlocked();
  return (
    <div className="min-h-screen bg-neutral-50" style={{ minHeight: "100dvh" }}>
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2 font-semibold text-neutral-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange/10 text-orange">
              <Shield className="h-3.5 w-3.5" />
            </span>
            Planet Baltimore Admin
          </Link>
          {unlocked && (
            <button
              onClick={async () => {
                await lockAdmin();
                window.location.href = "/admin/login";
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          )}
        </div>
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
    </div>
  );
}