import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home, Compass, Calendar, MapPin, Users, Shield, Palette, Landmark, Building2,
  BookOpen, MessageCircle, Bell, User, Menu, Search, Ticket, Plus, FileText, PenLine, Plane, Bookmark,
} from "lucide-react";
import { useUnreadCounts } from "@/hooks/use-unread-counts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import pbLogo from "@/assets/pb-logo.png";

type Item = { icon: typeof Home; label: string; to: string };

const navItems: Item[] = [
  { icon: Shield, label: "Associations", to: "/community-associations" },
  { icon: Palette, label: "Artists", to: "/artists" },
  { icon: Landmark, label: "Arts Orgs", to: "/arts-orgs" },
  { icon: Building2, label: "Businesses", to: "/businesses" },
  { icon: Users, label: "Groups", to: "/groups" },
  { icon: Calendar, label: "Community Calendar", to: "/calendar" },
  { icon: Compass, label: "Discover", to: "/search" },
  { icon: Ticket, label: "Events", to: "/events" },
  { icon: Home, label: "Home", to: "/dashboard" },
  { icon: MapPin, label: "Neighborhoods", to: "/neighborhoods" },
  { icon: BookOpen, label: "Stories", to: "/stories" },
];

const utilItems: Item[] = [
  { icon: MessageCircle, label: "Messages", to: "/messages" },
  { icon: Bell, label: "Notifications", to: "/notifications" },
  { icon: Bookmark, label: "Saved", to: "/saved" },
  { icon: User, label: "Profile", to: "/profile" },
];

const createItems: Item[] = [
  { icon: FileText, label: "New Post", to: "/create-post" },
  { icon: PenLine, label: "New Story", to: "/create-story" },
  { icon: Palette, label: "Artist Profile", to: "/create-artist" },
  { icon: Home, label: "Resident Profile", to: "/create-resident" },
  { icon: Plane, label: "Visitor Profile", to: "/create-visitor" },
  { icon: Building2, label: "Business", to: "/create-business" },
  { icon: Landmark, label: "Arts Organization", to: "/create-arts-org" },
  { icon: Users, label: "Community", to: "/create-community" },
  { icon: Shield, label: "Community Association", to: "/create-community-association" },
];

export function TopMenuBar() {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { unreadNotifications, unreadMessages } = useUnreadCounts();

  return (
    <header
      className="sticky top-0 z-[1000] border-b border-border bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      <div className="flex min-h-[52px] items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={pbLogo} alt="Planet Baltimore" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
          <span className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">Planet Baltimore</span>
        </Link>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Create" className="rounded-lg">
                <Plus className="h-5 w-5" style={{ color: "#d4580a" }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[1001] w-56">
              {createItems.map(({ icon: Icon, label, to }) => (
                <DropdownMenuItem key={to} onSelect={() => navigate({ to })} className="flex cursor-pointer items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/search" aria-label="Search" className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors active:bg-secondary ${currentPath === "/search" ? "text-[#d4580a]" : "text-muted-foreground"}`}>
            <Search className="h-5 w-5" />
          </Link>
          <Link to="/notifications" aria-label="Notifications" className={`relative hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors active:bg-secondary ${currentPath === "/notifications" ? "text-[#d4580a]" : "text-muted-foreground"}`}>
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: "#d4580a" }}>
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </Link>
          <Link to="/messages" aria-label="Messages" className={`relative hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors active:bg-secondary ${currentPath === "/messages" ? "text-[#d4580a]" : "text-muted-foreground"}`}>
            <MessageCircle className="h-5 w-5" />
            {unreadMessages > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: "#d4580a" }}>
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Navigation menu" className="rounded-lg">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[1001] w-56">
              {navItems.map(({ icon: Icon, label, to }) => (
                <DropdownMenuItem key={to + label} onSelect={() => navigate({ to })} className="flex cursor-pointer items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {utilItems.map(({ icon: Icon, label, to }) => (
                <DropdownMenuItem key={to + label} onSelect={() => navigate({ to })} className="flex cursor-pointer items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}