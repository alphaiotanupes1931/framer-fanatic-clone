import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, Search, Plus, User, Menu, MessageCircle, Compass, BookOpen,
  Users, Shield, Palette, Landmark, Building2, MapPin, Calendar, Ticket,
  Video, Trophy, Settings, PenSquare, Store, Bookmark,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Primary = { icon: typeof Home; label: string; to: string };

const primaryItems: Primary[] = [
  { icon: Home, label: "Home", to: "/dashboard" },
  { icon: Search, label: "Search", to: "/search" },
  { icon: User, label: "Profile", to: "/profile" },
];

const createItems = [
  { icon: Ticket, label: "Event", to: "/events/new" },
  { icon: Users, label: "Groups", to: "/groups" },
  { icon: Palette, label: "Artist Page", to: "/artists" },
  { icon: Landmark, label: "Arts Org", to: "/arts-orgs" },
  { icon: Building2, label: "Business", to: "/businesses" },
  { icon: Video, label: "Video", to: "/videos" },
  { icon: Store, label: "Marketplace Listing", to: "/marketplace" },
  { icon: PenSquare, label: "Post to Feed", to: "/dashboard" },
] as const;

const moreItems: Primary[] = [
  { icon: Compass, label: "Discover", to: "/search" },
  { icon: BookOpen, label: "Stories", to: "/stories" },
  { icon: Ticket, label: "Events", to: "/events" },
  { icon: Calendar, label: "Calendar", to: "/calendar" },
  { icon: MessageCircle, label: "Messages", to: "/messages" },
  { icon: Bookmark, label: "Saved", to: "/saved" },
  { icon: Users, label: "Groups", to: "/groups" },
  { icon: Shield, label: "Associations", to: "/community-associations" },
  { icon: Palette, label: "Artists", to: "/artists" },
  { icon: Landmark, label: "Arts Orgs", to: "/arts-orgs" },
  { icon: Building2, label: "Businesses", to: "/businesses" },
  { icon: MapPin, label: "Neighborhoods", to: "/neighborhoods" },
  { icon: Video, label: "Videos", to: "/videos" },
  { icon: Trophy, label: "Baltimore 100", to: "/leaderboard" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

export function MobileNav() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

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
          <DropdownMenuContent align="end" side="top" className="z-[1001] w-56">
            {moreItems.map(({ icon: Icon, label, to }) => (
              <DropdownMenuItem key={to + label} asChild>
                <Link to={to} className="flex cursor-pointer items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
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
              className={`relative flex min-h-[44px] w-full flex-col items-center justify-center rounded-lg px-2 py-1 transition-colors ${isActive ? "text-[#d4580a]" : "text-muted-foreground"}`}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] font-medium">{item.label}</span>
            </Link>
          );
}