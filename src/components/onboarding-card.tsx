import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Sparkles, Users, PenLine, Calendar } from "lucide-react";

const STORAGE_KEY = "pb_onboarding_dismissed";

const steps = [
  { icon: Sparkles, color: "#d4580a", title: "Follow artists & creators", description: "Discover Baltimore talent and see their updates in your feed.", to: "/artists", cta: "Browse Artists" },
  { icon: Users, color: "#2563eb", title: "Join a community", description: "Find neighborhoods, groups, and organizations near you.", to: "/neighborhoods", cta: "Find Communities" },
  { icon: PenLine, color: "#16a34a", title: "Share something", description: "Post an update, story, or event to connect with the city.", to: "/dashboard", cta: "Create a Post" },
  { icon: Calendar, color: "#7c3aed", title: "Explore local events", description: "RSVP to events happening around Baltimore.", to: "/events", cta: "See Events" },
] as const;

export function OnboardingCard() {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    setDismissed(typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true");
  }, []);
  if (dismissed) return null;
  const dismiss = () => { localStorage.setItem(STORAGE_KEY, "true"); setDismissed(true); };
  return (
    <div className="relative rounded-2xl border-2 bg-card p-5 sm:p-6" style={{ borderColor: "#d4580a" }}>
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary">
        <X className="h-4 w-4" />
      </button>
      <div className="mb-4 pr-6">
        <h2 className="text-lg font-bold text-foreground">Welcome to Planet Baltimore</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Here's how to get the most out of your community.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {steps.map(({ icon: Icon, color, title, description, to, cta }) => (
          <Link key={to + title} to={to} className="group flex items-start gap-3 rounded-xl bg-secondary/50 p-3 transition-colors hover:bg-secondary">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18` }}>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-[#d4580a]">{title}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
              <span className="mt-1.5 inline-block text-xs font-medium" style={{ color }}>{cta} →</span>
            </div>
          </Link>
        ))}
      </div>
      <button onClick={dismiss} className="mt-4 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground">
        I'm all set, dismiss this
      </button>
    </div>
  );
}