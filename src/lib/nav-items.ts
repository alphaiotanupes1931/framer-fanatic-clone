import {
  Home, Compass, Calendar, MapPin, Users, Shield, Palette, Landmark, Building2,
  BookOpen, MessageCircle, Bell, User, Ticket, FileText, PenLine, Plane, Bookmark,
  Settings, Video, Trophy, Search,
} from "lucide-react";

export type NavItem = { icon: typeof Home; label: string; to: string };

/** Main navigation: Home is pinned first, then alphabetical. Shared by desktop menu and mobile "More". */
export const navItems: NavItem[] = [
  { icon: Home, label: "Home", to: "/dashboard" },
  { icon: Palette, label: "Artists", to: "/artists" },
  { icon: Landmark, label: "Arts Orgs", to: "/arts-orgs" },
  { icon: Trophy, label: "Baltimore 100", to: "/leaderboard" },
  { icon: Building2, label: "Businesses", to: "/businesses" },
  { icon: Shield, label: "Community Associations", to: "/community-associations" },
  { icon: Calendar, label: "Community Calendar", to: "/calendar" },
  { icon: Ticket, label: "Events", to: "/events" },
  { icon: Ticket, label: "Festivals", to: "/festivals" },
  { icon: Users, label: "Groups", to: "/groups" },
  { icon: MapPin, label: "Neighborhoods", to: "/neighborhoods" },
  { icon: Search, label: "Search", to: "/search" },
  { icon: BookOpen, label: "Stories", to: "/stories" },
  { icon: Video, label: "Videos", to: "/videos" },
];

/** Account/utility items, alphabetical. */
export const utilItems: NavItem[] = [
  { icon: MessageCircle, label: "Messages", to: "/messages" },
  { icon: Bell, label: "Notifications", to: "/notifications" },
  { icon: User, label: "Profile", to: "/profile" },
  { icon: Bookmark, label: "Saved", to: "/saved" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

/** Create menu, alphabetical. */
export const createItems: NavItem[] = [
  { icon: Palette, label: "Artist Page", to: "/create-artist" },
  { icon: Landmark, label: "Arts Organization", to: "/create-arts-org" },
  { icon: Building2, label: "Business", to: "/create-business" },
  { icon: Shield, label: "Community Association", to: "/create-community-association" },
  { icon: Ticket, label: "Event", to: "/events/new" },
  { icon: Users, label: "Groups", to: "/create-community" },
  { icon: FileText, label: "New Post", to: "/create-post" },
  { icon: PenLine, label: "New Story", to: "/create-story" },
  { icon: Home, label: "Resident Profile", to: "/create-resident" },
  { icon: Plane, label: "Visitor Profile", to: "/create-visitor" },
];
