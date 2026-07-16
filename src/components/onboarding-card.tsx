import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Palette, Users, PenLine, Calendar } from "lucide-react";

const STORAGE_KEY = "pb_onboarding_v3_dismissed";

const steps = [
  { icon: Palette, color: "#d4580a", title: "Follow artists & creators", description: "Discover Baltimore talent and see their updates in your feed.", to: "/artists", cta: "Browse Artists" },
  { icon: Users, color: "#2563eb", title: "Join a community", description: "Find neighborhoods, groups, and organizations near you.", to: "/neighborhoods", cta: "Find Communities" },
  { icon: PenLine, color: "#16a34a", title: "Share something", description: "Post an update, story, or event to connect with the city.", to: "/dashboard", cta: "Create a Post" },
  { icon: Calendar, color: "#7c3aed", title: "Explore local events", description: "RSVP to events happening around Baltimore.", to: "/events", cta: "See Events" },
] as const;

export function OnboardingCard() {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true");
  }, []);
  if (dismissed) return null;
  const dismiss = () => { localStorage.setItem(STORAGE_KEY, "true"); setDismissed(true); };
  return (
    <div className="relative rounded-xl border-2 bg-white px-4 py-3.5 sm:px-[18px] sm:py-4" style={{ borderColor: "#d4580a" }}>
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="mb-2.5 pr-6">
        <h2 className="text-sm font-extrabold leading-tight text-slate-950">Welcome to Planet Baltimore 🏙️</h2>
        <p className="mt-0.5 text-xs font-medium text-slate-500">Here's how to get the most out of your community.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {steps.map(({ icon: Icon, color, title, description, to, cta }) => (
          <Link key={to + title} to={to} className="group flex min-h-[62px] items-start gap-3 rounded-lg bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18` }}>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold leading-tight text-slate-800 transition-colors group-hover:text-[#d4580a]">{title}</p>
              <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-slate-500">{description}</p>
              <span className="mt-1 inline-block text-[10px] font-bold" style={{ color }}>{cta} →</span>
            </div>
          </Link>
        ))}
      </div>
      <button onClick={dismiss} className="mt-2.5 w-full text-center text-[10px] font-medium text-slate-500 transition-colors hover:text-slate-900">
        I'm all set, dismiss this
      </button>
    </div>
  );
}