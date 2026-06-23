import { useEffect, useState } from "react";
import { Joyride, EVENTS, STATUS, type EventData, type Step } from "react-joyride";
import { HelpCircle } from "lucide-react";

const STORAGE_KEY = "pb_onboarding_tour_v1";
const SIGNUP_FLAG = "pb_new_signup";

const STEPS: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Welcome to Planet Baltimore",
    content:
      "A 60-second tour of everything you can do here - discover artists, attend events, and connect with your neighborhood.",
  },
  {
    target: '[data-tour="nav-home"]',
    title: "Home Feed",
    content: "Your dashboard - posts, updates, and what's happening across the city right now.",
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
      "Browse upcoming events. Buy tickets in one tap - artists can create paid events here.",
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
      "Manage your profile, become an artist, set up Stripe payouts, and view tickets you've purchased.",
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
      "Attendees can browse and buy tickets. To post, host events, or sell tickets, become an Artist from your Profile (Baltimore residents only).",
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
      }
    }
  };

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
      <button
        onClick={() => setRun(true)}
        aria-label="Replay onboarding tour"
        title="Take a tour"
        className="fixed bottom-[132px] right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-md transition hover:bg-neutral-50 hover:text-orange md:bottom-24 md:right-6 md:h-12 md:w-12"
      >
        <HelpCircle className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </>
  );
}