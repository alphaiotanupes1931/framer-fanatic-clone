import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { prefetchHandlers } from "@/lib/prefetch";
import { Home, Search, Plus, User, Menu, LogOut } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navItems, utilItems, createItems, type NavItem } from "@/lib/nav-items";

type Primary = NavItem;

const primaryItems: Primary[] = [
  { icon: Home, label: "Home", to: "/dashboard" },
  { icon: Search, label: "Search", to: "/search" },
  { icon: User, label: "Profile", to: "/profile" },
];

const moreItems: Primary[] = [...navItems, ...utilItems];


export function MobileNav() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md lg:hidden"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="grid grid-cols-5 items-center px-2 py-1.5">
        {primaryItems.slice(0, 2).map((item) => renderPrimary(item, currentPath))}

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Create"
            className="flex min-h-[44px] items-center justify-center focus-visible:outline-none -mt-6"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-xl ring-4 ring-background transition-transform duration-150 active:scale-95"
              style={{ backgroundColor: "#d4580a" }}
            >
              <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="z-[1001] w-60">
            {createItems.map(({ icon: Icon, label, to }) => (
              <DropdownMenuItem key={label} asChild>
                <Link to={to} className="flex cursor-pointer items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {primaryItems.slice(2).map((item) => renderPrimary(item, currentPath))}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-h-[44px] w-full flex-col items-center justify-center rounded-lg px-2 py-1 text-muted-foreground">
            <Menu className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="z-[1001] max-h-[70vh] w-56 overflow-y-auto">
            {moreItems.map(({ icon: Icon, label, to }) => (
              <DropdownMenuItem key={to + label} asChild>
                <Link to={to} className="flex cursor-pointer items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}

function renderPrimary(item: Primary, currentPath: string) {
          const isActive = item.to === "/dashboard" ? currentPath === "/dashboard" : currentPath.startsWith(item.to);
          const Icon = item.icon;
  return (
            <Link
              key={item.label}
              to={item.to}
              {...prefetchHandlers(item.to)}
              className={`relative flex min-h-[44px] w-full flex-col items-center justify-center rounded-lg px-2 py-1 transition-colors ${isActive ? "text-[#d4580a]" : "text-muted-foreground"}`}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] font-medium">{item.label}</span>
            </Link>
          );
}