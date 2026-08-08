import { useEffect, useState } from "react";
import { Joyride, EVENTS, STATUS, type EventData, type Step } from "react-joyride";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "pb_onboarding_tour_v1";
const SIGNUP_FLAG = "pb_new_signup";

const STEPS: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Welcome to Planet Baltimore",
    content:
      "A 60-second tour of everything you can do here: discover artists, attend events, and connect with your neighborhood.",
  },
  {
    target: '[data-tour="nav-home"]',
    title: "Home Feed",
    content: "Your dashboard: posts, updates, and what's happening across the city right now.",
  },
  {
    target: '[data-tour="nav-search"]',
    title: "Search",
    content: "Find artists, events, businesses, or anything else across Planet Baltimore.",
  },
  {
    target: '[data-tour="nav-events"]',
    title: "Events & Tickets",
    content:
      "Browse upcoming events. Buy tickets in one tap. Artists can create paid events here.",
  },
  {
    target: '[data-tour="nav-calendar"]',
    title: "Calendar",
    content: "See everything happening on any day at a glance.",
  },
  {
    target: '[data-tour="nav-neighborhoods"]',
    title: "Neighborhoods",
    content: "Tap any neighborhood on the map to see the artists who live and work there.",
  },
  {
    target: '[data-tour="nav-artists"]',
    title: "Artists & Community",
    content: "Discover artists, arts orgs, businesses, community associations, and groups.",
  },
  {
    target: '[data-tour="nav-stories"]',
    title: "Stories & Videos",
    content: "Long-form writing and video from the Baltimore creative community.",
  },
  {
    target: '[data-tour="nav-leaderboard"]',
    title: "Baltimore 100",
    content: "The leaderboard of the most active voices on the platform.",
  },
  {
    target: '[data-tour="nav-profile"]',
    title: "Your Profile",
    content:
      "Manage your profile, become an Artist, set up payouts, and view tickets you've purchased.",
  },
  {
    target: '[data-tour="notifications"]',
    title: "Notifications",
    content: "New activity, ticket confirmations, and messages all show up here.",
    placement: "bottom",
  },
  {
    target: "body",
    placement: "center",
    title: "You're all set",
    content:
      "Residents and Visitors can browse and buy tickets. To post, host events, or sell tickets, become an Artist from your Profile.",
  },
];

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>(STEPS);

  const buildVisibleSteps = (): Step[] => {
    if (typeof document === "undefined") return STEPS;
    return STEPS.filter((s) => {
      const t = s.target;
      if (typeof t !== "string") return true;
      if (t === "body") return true;
      return !!document.querySelector(t);
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only auto-run for users who JUST signed up. Anyone else can replay
    // via the help button in the bottom corner.
    const justSignedUp = localStorage.getItem(SIGNUP_FLAG) === "1";
    const alreadySeen = localStorage.getItem(STORAGE_KEY) === "1";
    let cancelled = false;
    if (justSignedUp && !alreadySeen) {
      const t = setTimeout(() => {
        setSteps(buildVisibleSteps());
        setRun(true);
      }, 800);
      return () => clearTimeout(t);
    }
    // Existing users who never logged in before this change: silently mark
    // the tour as seen so it never auto-pops again.
    if (!alreadySeen) localStorage.setItem(STORAGE_KEY, "1");
    // The dismissal is also stored on the account so a new device or a
    // cleared browser never brings the directions back.
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      await supabase.from("user_ui_prefs").upsert(
        { user_id: user.id, onboarding_dismissed: true, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__pbStartTour = () => {
      setSteps(buildVisibleSteps());
      setRun(true);
    };
  }, []);

  const handleEvent = (data: EventData) => {
    if (data.type === EVENTS.TOUR_END) {
      const s = data.status;
      if (s === STATUS.FINISHED || s === STATUS.SKIPPED) {
        localStorage.setItem(STORAGE_KEY, "1");
        try { localStorage.removeItem(SIGNUP_FLAG); } catch { /* ignore */ }
        setRun(false);
        // Persist the dismissal to the account so the directions stay closed
        // on every other device the person signs in from.
        void (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          await supabase.from("user_ui_prefs").upsert(
            { user_id: user.id, onboarding_dismissed: true, updated_at: new Date().toISOString() },
            { onConflict: "user_id" },
          );
        })();
      }
    }
  };

  const location = useLocation();
  const hideShare =
    location.pathname.startsWith("/onboarding") ||
    location.pathname.startsWith("/auth");

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        continuous
        scrollToFirstStep
        onEvent={handleEvent}
        options={{ showProgress: true, skipBeacon: true, zIndex: 10000, primaryColor: "#FF6A1A", textColor: "#0a0a0a", closeButtonAction: "skip", dismissKeyAction: false, overlayClickAction: false }}
        locale={{ last: "Done", skip: "Skip tour" }}
        styles={{
          tooltip: { borderRadius: 14, padding: 16, maxWidth: "calc(100vw - 32px)", width: 320 },
          tooltipContainer: { textAlign: "left" },
          tooltipTitle: { fontSize: 15, fontWeight: 600, marginBottom: 6 },
          tooltipContent: { fontSize: 13, lineHeight: 1.5, padding: 0 },
          buttonPrimary: { borderRadius: 999, padding: "8px 14px", fontSize: 13 },
          buttonBack: { color: "#6b6b6b", fontSize: 13 },
          buttonSkip: { color: "#9a9a9a", fontSize: 12 },
        }}
      />
    </>
  );
}