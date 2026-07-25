import type { LucideIcon } from "lucide-react";
import {
  List, Disc3, Music2, Mic, Ticket, FileText, BookOpen, Calendar, MessageCircle,
  UserPlus2, Layers, Image as ImageIcon, Flame, Headphones, Mail, Shirt,
  ShoppingBag, Package, Users, Film, Camera, Radio,
} from "lucide-react";
import { DollarSign, Scissors, HelpCircle, Star, Palette, Hammer, Building2, Newspaper, PenTool, MapPin } from "lucide-react";

export type ArtistTabKey =
  | "posts" | "album" | "singles" | "shows" | "epk" | "book" | "events" | "talk" | "cv" | "invite"
  | "episodes" | "guests" | "listen" | "contact" | "sponsors" | "clips" | "qa" | "bonus"
  | "studio" | "series" | "gallery"
  | "fashion_line" | "lookbook" | "drops" | "collabs" | "saved" | "tickets"
  | "videos" | "shop" | "reviews"
  | "filmography" | "reel" | "watch" | "screenings" | "awards" | "support"
  | "materials" | "installations" | "commissions" | "press"
  | "repertoire" | "writing" | "appearances" | "newsletter" | "books";

export type ArtistTab = { key: ArtistTabKey; label: string; Icon: LucideIcon };

const MUSIC: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "listen", label: "Listen", Icon: Headphones },
  { key: "album", label: "Album", Icon: Disc3 },
  { key: "singles", label: "Singles", Icon: Music2 },
  { key: "epk", label: "EPK", Icon: FileText },
  { key: "book", label: "Book", Icon: BookOpen },
  { key: "videos", label: "Videos", Icon: Film },
  { key: "shop", label: "Shop", Icon: ShoppingBag },
  { key: "reviews", label: "Reviews", Icon: MessageCircle },
  { key: "events", label: "Events", Icon: Calendar },
  { key: "talk", label: "Talk", Icon: MessageCircle },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
];

const VIDEO: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "filmography", label: "Filmography", Icon: Film },
  { key: "reel", label: "Reel", Icon: Radio },
  { key: "watch", label: "Watch", Icon: Camera },
  { key: "screenings", label: "Screenings", Icon: Ticket },
  { key: "awards", label: "Awards", Icon: Flame },
  { key: "shop", label: "Shop", Icon: ShoppingBag },
  { key: "support", label: "Support", Icon: UserPlus2 },
  { key: "talk", label: "Talk", Icon: MessageCircle },
  { key: "contact", label: "Contact", Icon: Mail },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
];

const PODCAST: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "episodes", label: "Episodes", Icon: Mic },
  { key: "guests", label: "Guests", Icon: Users },
  { key: "sponsors", label: "Sponsors", Icon: DollarSign },
  { key: "clips", label: "Clips", Icon: Scissors },
  { key: "qa", label: "Q&A", Icon: HelpCircle },
  { key: "bonus", label: "Bonus", Icon: Star },
  { key: "shop", label: "Shop", Icon: ShoppingBag },
  { key: "reviews", label: "Reviews", Icon: MessageCircle },
  { key: "events", label: "Events", Icon: Calendar },
  { key: "contact", label: "Contact", Icon: Mail },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
];

const STUDIO: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "shop", label: "Shop", Icon: ShoppingBag },
  { key: "studio", label: "Studio", Icon: Flame },
  { key: "series", label: "Series", Icon: Layers },
  { key: "events", label: "Events", Icon: Calendar },
  { key: "talk", label: "Talk", Icon: MessageCircle },
  { key: "contact", label: "Contact", Icon: Mail },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
];

const PHOTO: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "gallery", label: "Portfolio", Icon: ImageIcon },
  { key: "shop", label: "Print Shop", Icon: ShoppingBag },
  { key: "book", label: "Bookings", Icon: BookOpen },
  { key: "awards", label: "Recognition", Icon: Flame },
  { key: "writing", label: "Field Notes", Icon: PenTool },
  { key: "events", label: "Events", Icon: Calendar },
  { key: "talk", label: "Talk", Icon: MessageCircle },
  { key: "contact", label: "Contact", Icon: Mail },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
];

const MIXED: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "materials", label: "Materials", Icon: Palette },
  { key: "installations", label: "Installations", Icon: Building2 },
  { key: "commissions", label: "Commissions", Icon: Hammer },
  { key: "shop", label: "Shop", Icon: ShoppingBag },
  { key: "press", label: "Press", Icon: Newspaper },
  { key: "events", label: "Events", Icon: Calendar },
  { key: "talk", label: "Talk", Icon: MessageCircle },
  { key: "contact", label: "Contact", Icon: Mail },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
];

const PERFORMANCE: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "repertoire", label: "Repertoire", Icon: Layers },
  { key: "reel", label: "Reel", Icon: Radio },
  { key: "shows", label: "Shows", Icon: MapPin },
  { key: "shop", label: "Shop", Icon: ShoppingBag },
  { key: "reviews", label: "Reviews", Icon: MessageCircle },
  { key: "book", label: "Book", Icon: BookOpen },
  { key: "events", label: "Events", Icon: Calendar },
  { key: "talk", label: "Talk", Icon: MessageCircle },
  { key: "contact", label: "Contact", Icon: Mail },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
];

const LITERARY: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "books", label: "Books", Icon: BookOpen },
  { key: "writing", label: "Writing", Icon: PenTool },
  { key: "shop", label: "Shop", Icon: ShoppingBag },
  { key: "support", label: "Support", Icon: UserPlus2 },
  { key: "appearances", label: "Appearances", Icon: MapPin },
  { key: "newsletter", label: "Newsletter", Icon: Mail },
  { key: "press", label: "Press", Icon: Newspaper },
  { key: "events", label: "Events", Icon: Calendar },
  { key: "talk", label: "Talk", Icon: MessageCircle },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
];

const FASHION: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "fashion_line", label: "Fashion Line", Icon: Layers },
  { key: "lookbook", label: "Lookbook", Icon: Shirt },
  { key: "drops", label: "Drops", Icon: Package },
  { key: "collabs", label: "Collabs", Icon: Users },
  { key: "shop", label: "Shop", Icon: ShoppingBag },
  { key: "events", label: "Events", Icon: Calendar },
  { key: "talk", label: "Talk", Icon: MessageCircle },
  { key: "contact", label: "Contact", Icon: Mail },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
];

const DEFAULT_TABS: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "gallery", label: "Gallery", Icon: ImageIcon },
  { key: "events", label: "Events", Icon: Calendar },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
];

const RESIDENT_TABS: ArtistTab[] = [
  { key: "posts", label: "Posts", Icon: List },
  { key: "events", label: "Events", Icon: Calendar },
  { key: "talk", label: "Talk", Icon: MessageCircle },
  { key: "contact", label: "Contact", Icon: Mail },
  { key: "cv", label: "CV/Bio", Icon: FileText },
  { key: "invite", label: "Invite", Icon: UserPlus2 },
  { key: "saved", label: "Saved", Icon: ShoppingBag },
  { key: "tickets", label: "My Tickets", Icon: Ticket },
];

// Marker icons reserved for future domain-specific rendering.
void ImageIcon;

function norm(s?: string | null) {
  return (s ?? "").toLowerCase().trim();
}

export function tabsForArtist(category?: string | null, role?: string | null): ArtistTab[] {
  const c = norm(category);
  const r = norm(role);
  const hay = `${c} ${r}`;
  if (/podcast/.test(hay)) return PODCAST;
  if (/videograph|film/.test(hay)) return VIDEO;
  if (/music|musician|dj|producer/.test(hay)) return MUSIC;
  if (/fashion/.test(hay)) return FASHION;
  if (/literary|poet|writer/.test(hay)) return LITERARY;
  if (/performance|dancer/.test(hay)) return PERFORMANCE;
  if (/mixed media/.test(hay)) return MIXED;
  if (/photograph/.test(hay)) return PHOTO;
  if (/visual art|muralist|artist|painter|sculpt|illustrat|designer|creative/.test(hay))
    return STUDIO;
  // Any artist role falls back to the full studio tab set.
  if (/artist/.test(hay)) return STUDIO;
  return DEFAULT_TABS;
}

export function isArtistProfile(category?: string | null, role?: string | null): boolean {
  const hay = `${norm(category)} ${norm(role)}`;
  if (/resident|visitor/.test(hay) && !/artist|music|dj|producer|podcast|fashion|photograph|videograph|film|visual art|muralist|painter|sculpt|illustrat|designer|writer|poet|dancer|performance|mixed media|literary/.test(hay)) {
    return false;
  }
  return /artist|music|musician|dj|producer|podcast|fashion|mixed media|performance|photograph|videograph|film|visual art|literary|poet|writer|dancer|muralist|painter|sculpt|illustrat|designer|creative/.test(hay);
}

export function tabsForProfile(category?: string | null, role?: string | null): ArtistTab[] {
  void category;
  void role;
  return RESIDENT_TABS;
}

export function bannerLabelForArtist(category?: string | null, role?: string | null): string | null {
  const hay = `${norm(category)} ${norm(role)}`;
  if (/podcast/.test(hay)) return "Podcaster";
  if (/music|musician/.test(hay)) return "Music";
  if (/dj/.test(hay)) return "DJ";
  if (/producer/.test(hay)) return "Producer";
  if (/fashion/.test(hay)) return "Fashion";
  if (/mixed media/.test(hay)) return "Mixed Media";
  if (/performance|dancer/.test(hay)) return "Performance";
  if (/photograph/.test(hay)) return "Photography";
  if (/videograph|film/.test(hay)) return "Video";
  if (/visual art|muralist/.test(hay)) return "Visual Art";
  if (/literary|poet|writer/.test(hay)) return "Literary";
  if (/resident/.test(hay)) return "Resident";
  if (/visitor/.test(hay)) return "Visitor";
  return null;
}