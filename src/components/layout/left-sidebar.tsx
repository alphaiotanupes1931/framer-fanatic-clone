import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home, Compass, MapPin, Calendar, Users, Palette, Landmark, Building2,
  MessageCircle, Bell, User, ChevronLeft, ChevronRight, Plus, Shield,
  BookOpen, Search, Ticket, LogOut, LogIn, Video, Trophy, Settings, Mic, ShoppingBag, Flag,
  LayoutDashboard, Menu, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, PenLine, Palette as PaletteIcon, Building2 as BusinessIcon, Landmark as LandmarkIcon, Users as UsersIcon, Shield as ShieldIcon, Home as HomeIcon, Plane as PlaneIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadCounts } from "@/hooks/use-unread-counts";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserRole } from "@/hooks/use-user-role";
import { useSidebar } from "./sidebar-context";
import pbLogo from "@/assets/pb-logo.png";
import pbLogoWhite from "@/assets/pb-logo-white.png";
import { Img } from "@/components/shared/smart-img";
import { prefetchHandlers } from "@/lib/prefetch";
import type { ReactNode, ComponentType } from "react";

// Desktop and mobile share one navigation config so both surfaces always
// offer exactly the same destinations, in the same order.
type NavItem = { icon: typeof Home; label: string; to: string };

const navItems: NavItem[] = [...sharedNavItems, ...sharedUtilItems];
const createItems: NavItem[] = sharedCreateItems;

function SidebarCard({ title, icon: Icon, children, action }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-700" />
          <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-2 py-2">{children}</div>
    </section>
  );
}

function SidebarCardCollapsed({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center border-b border-slate-200 px-2 py-3">
            <Icon className="h-4 w-4 text-slate-700" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">{title}</TooltipContent>
      </Tooltip>
      <div className="flex flex-col items-center gap-1 px-1 py-2">{children}</div>
    </section>
  );
}

export function LeftSidebar() {
  const { collapsed, setCollapsed } = useSidebar();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { unreadMessages, unreadNotifications } = useUnreadCounts();
  const { user } = useCurrentUser();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.error("signOut failed", e); }
    try { localStorage.clear(); } catch {}
    navigate({ to: "/auth", replace: true });
    // Hard reload to fully clear any cached auth state
    setTimeout(() => { if (typeof window !== "undefined") window.location.href = "/auth"; }, 50);
  };

  const isActive = (path: string) => currentPath === path || (path !== "/dashboard" && currentPath.startsWith(path));

  const visibleNavItems = isAdmin
    ? [...navItems, { icon: Flag, label: "Content Reports", to: "/reports" } as NavItem]
    : navItems;

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300 lg:flex ${collapsed ? "w-[78px]" : "w-[288px]"}`}>
        <div className={`flex h-16 items-center px-4 sm:px-5 ${collapsed ? "justify-center" : ""}`}>
          {collapsed ? (
            <Link to="/dashboard" className="flex items-center gap-2">
              <Img src={pbLogo} alt="Planet Baltimore" width={24} height={24} className="h-6 w-6 object-contain dark:hidden" />
              <Img src={pbLogoWhite} alt="" aria-hidden="true" width={24} height={24} className="hidden h-6 w-6 object-contain dark:block" />
            </Link>
          ) : (
            <Link to="/dashboard" className="flex items-center gap-2">
              <Img src={pbLogo} alt="Planet Baltimore" width={24} height={24} className="h-6 w-6 object-contain dark:hidden" />
              <Img src={pbLogoWhite} alt="" aria-hidden="true" width={24} height={24} className="hidden h-6 w-6 object-contain dark:block" />
              <span className="font-display text-sm font-extrabold uppercase tracking-wide text-slate-900">Planet Baltimore</span>
            </Link>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto px-3 pb-4 pt-3 ${collapsed ? "px-2" : ""}`}>
          {collapsed ? (
            <SidebarCardCollapsed title="Create" icon={Sparkles}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="aspect-square rounded-full" style={{ borderColor: "#d4580a", color: "#d4580a" }} aria-label="Create">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="right" className="z-[1001] w-56">
                  <DropdownMenuLabel>Create</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {createItems.map(({ icon: Icon, label, to }) => (
                    <DropdownMenuItem key={to} asChild>
                      <Link to={to} className="flex cursor-pointer items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarCardCollapsed>
          ) : (
            <div className="mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full justify-center rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "#d4580a" }}>
                    <Plus className="mr-1.5 h-4 w-4" /> Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="z-[1001] w-56">
                  <DropdownMenuLabel>Create</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {createItems.map(({ icon: Icon, label, to }) => (
                    <DropdownMenuItem key={to} asChild>
                      <Link to={to} className="flex cursor-pointer items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {collapsed ? (
            <SidebarCardCollapsed title="Menu" icon={Menu}>
              {visibleNavItems.map((item) => {
                const active = isActive(item.to);
                const Icon = item.icon;
                const badge = item.label === "Notifications" ? unreadNotifications : item.label === "Messages" ? unreadMessages : 0;
                return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.to}
                        {...prefetchHandlers(item.to)}
                        className={`relative flex w-10 items-center justify-center rounded-lg py-2 transition-all ${active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
                      >
                        <Icon className="h-5 w-5" />
                        {badge > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: "#d4580a" }}>
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </SidebarCardCollapsed>
          ) : (
            <SidebarCard title="Menu" icon={Menu}>
              <nav className="space-y-0.5">
                {visibleNavItems.map((item) => {
                  const active = isActive(item.to);
                  const Icon = item.icon;
                  const badge = item.label === "Notifications" ? unreadNotifications : item.label === "Messages" ? unreadMessages : 0;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      {...prefetchHandlers(item.to)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] ${active ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                    >
                      <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-150 ${active ? "scale-110 text-slate-900" : "text-slate-500"}`} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span className="flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: "#d4580a" }}>
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </SidebarCard>
          )}
        </div>

        {/* Footer */}
        <div className={`space-y-3 px-3 pb-3 ${collapsed ? "px-2" : ""}`}>
          {collapsed ? (
            <SidebarCardCollapsed title="Account" icon={User}>
              {user ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleLogout} className="flex w-10 items-center justify-center rounded-lg py-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900">
                      <LogOut className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Logout</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/auth" className="flex w-10 items-center justify-center rounded-lg py-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900">
                      <LogIn className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Login</TooltipContent>
                </Tooltip>
              )}
              <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="flex w-10 items-center justify-center rounded-lg py-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900">
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </SidebarCardCollapsed>
          ) : (
            <SidebarCard title="Account" icon={User} action={
              <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="flex items-center justify-center rounded-lg p-1.5 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900">
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            }>
              <div className="space-y-0.5">
                {user ? (
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]">
                    <LogOut className="h-5 w-5 flex-shrink-0 text-slate-500" />
                    <span className="truncate">Logout</span>
                  </button>
                ) : (
                  <Link to="/auth" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]">
                    <LogIn className="h-5 w-5 flex-shrink-0 text-slate-500" />
                    <span className="truncate">Login</span>
                  </Link>
                )}
              </div>
            </SidebarCard>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
