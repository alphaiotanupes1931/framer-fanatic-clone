import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home, Compass, MapPin, Calendar, Users, Palette, Landmark, Building2,
  MessageCircle, Bell, User, ChevronLeft, ChevronRight, Plus, Shield,
  BookOpen, Search, Ticket, LogOut, LogIn, Video, Trophy, Settings, Mic, ShoppingBag, Flag,
  LayoutDashboard,
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
import pbLogoAsset from "@/assets/pb-logo-mark.png.asset.json";

// Route-path map: repo path -> this app's existing TanStack route.
type NavItem = { icon: typeof Home; label: string; to: string };

const createItems: NavItem[] = [
  { icon: FileText, label: "New Post", to: "/create-post" },
  { icon: PenLine, label: "New Story", to: "/create-story" },
  { icon: PaletteIcon, label: "Artist Profile", to: "/create-artist" },
  { icon: HomeIcon, label: "Resident Profile", to: "/create-resident" },
  { icon: PlaneIcon, label: "Visitor Profile", to: "/create-visitor" },
  { icon: BusinessIcon, label: "Business", to: "/create-business" },
  { icon: LandmarkIcon, label: "Arts Organization", to: "/create-arts-org" },
  { icon: UsersIcon, label: "Community", to: "/create-community" },
  { icon: ShieldIcon, label: "Community Association", to: "/create-community-association" },
];

const navItems: NavItem[] = [
  { icon: Home, label: "Home", to: "/dashboard" },
  { icon: Palette, label: "Artists", to: "/artists" },
  { icon: Landmark, label: "Arts Orgs", to: "/arts-orgs" },
  { icon: Building2, label: "Businesses", to: "/businesses" },
  { icon: Calendar, label: "Calendar", to: "/calendar" },
  { icon: Shield, label: "Community Associations", to: "/community-associations" },
  { icon: Compass, label: "Discover", to: "/discover" },
  { icon: Ticket, label: "Events", to: "/events" },
  { icon: LayoutDashboard, label: "Organizer Studio", to: "/organizer-studio" },
  { icon: Users, label: "Groups/Communities", to: "/groups" },
  { icon: MessageCircle, label: "Messages", to: "/messages" },
  { icon: MapPin, label: "Neighborhoods", to: "/neighborhoods" },
  { icon: Bell, label: "Notifications", to: "/notifications" },
  { icon: User, label: "Profile", to: "/profile" },
  { icon: Search, label: "Search", to: "/search" },
  { icon: BookOpen, label: "Stories", to: "/stories" },
  { icon: Video, label: "Videos", to: "/videos" },
  { icon: Trophy, label: "Baltimore 100", to: "/leaderboard" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

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
      <aside className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border bg-card transition-all duration-300 lg:flex ${collapsed ? "w-[78px]" : "w-[250px]"}`}>
        {/* Logo */}
        <div className={`flex h-16 items-center border-b border-border px-4 sm:px-5 ${collapsed ? "justify-center" : ""}`}>
          {collapsed ? (
            <Link to="/dashboard" className="flex items-center gap-2 rounded-full bg-black px-3 py-1.5">
              <img src={pbLogoAsset.url} alt="Planet Baltimore" width={20} height={20} className="h-5 w-5 invert" />
            </Link>
          ) : (
            <Link to="/dashboard" className="flex items-center gap-2 rounded-full bg-black px-3 py-1.5">
              <img src={pbLogoAsset.url} alt="Planet Baltimore" width={20} height={20} className="h-5 w-5 invert" />
              <span className="font-display text-sm font-extrabold uppercase tracking-wide text-white">Planet Baltimore</span>
            </Link>
          )}
        </div>

        {/* Create button */}
        <div className={`px-3 pb-2 pt-3 ${collapsed ? "flex justify-center" : ""}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <Button size="icon" variant="outline" className="aspect-square rounded-full" style={{ borderColor: "#d4580a", color: "#d4580a" }} aria-label="Create">
                  <Plus className="h-5 w-5" />
                </Button>
              ) : (
                <Button variant="outline" className="w-full rounded-lg py-2.5 hover:bg-secondary/80" style={{ borderColor: "#d4580a", color: "#d4580a" }}>
                  <Plus className="mr-2 h-4 w-4" /> Create
                </Button>
              )}
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
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2 sm:px-3">
          {visibleNavItems.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            const badge = item.label === "Notifications" ? unreadNotifications : item.label === "Messages" ? unreadMessages : 0;

            if (collapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <Link to={item.to} className={`relative flex w-full items-center justify-center rounded-lg py-2 transition-all ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                      <Icon className="h-5 w-5" />
                      {badge > 0 && (
                        <span className="absolute right-1 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: "#d4580a" }}>
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] ${active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-150 ${active ? "scale-110 text-foreground" : ""}`} />
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

        {/* Auth Links */}
        <div className="space-y-0.5 border-t border-border p-2 sm:p-3">
          {user ? (
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handleLogout} className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
                    <LogOut className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            ) : (
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-[0.98]">
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">Logout</span>
              </button>
            )
          ) : (
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/auth" className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
                    <LogIn className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Login</TooltipContent>
              </Tooltip>
            ) : (
              <Link to="/auth" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-[0.98]">
                <LogIn className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">Login</span>
              </Link>
            )
          )}
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2 sm:p-3">
          <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground active:scale-95">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}