import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import pbLogo from "@/assets/pb-logo.png";

export function useAuthState() {
  const [state, setState] = useState<{ loading: boolean; signedIn: boolean }>({ loading: true, signedIn: false });
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ loading: false, signedIn: !!data.session });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setState({ loading: false, signedIn: !!s });
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  return state;
}

export function PublicShell({
  title,
  subtitle,
  signedIn,
  children,
}: { title: string; subtitle?: string; signedIn: boolean; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-paper/10 sticky top-0 z-40 bg-ink/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={pbLogo} alt="Planet Baltimore" className="w-8 h-8 invert shrink-0" />
            <span className="font-display text-base sm:text-lg font-extrabold tracking-tight uppercase truncate hidden sm:inline">Planet Baltimore</span>
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm text-paper/80">
            <Link to="/events" className="hover:text-paper">Events</Link>
            <Link to="/artists" className="hover:text-paper">Creators</Link>
            <Link to="/stories" className="hover:text-paper">Stories</Link>
            <Link to="/videos" className="hover:text-paper">Videos</Link>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {signedIn ? (
              <Link to="/dashboard" className="rounded-full bg-paper text-ink px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-medium">Dashboard</Link>
            ) : (
              <>
                <Link to="/auth" className="rounded-full border border-paper/40 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">Log in</Link>
                <Link to="/auth" className="rounded-full bg-paper text-ink px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-medium">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-4 sm:pb-6">
        <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 sm:mt-3 text-paper/70 max-w-2xl text-sm sm:text-base">{subtitle}</p>}
      </section>
      <section className="max-w-6xl mx-auto px-6 pb-24">{children}</section>
    </div>
  );
}

export function SignUpDialog({
  open,
  onOpenChange,
  thing,
}: { open: boolean; onOpenChange: (o: boolean) => void; thing: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ink text-paper border-paper/20">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-paper/10 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-paper">Sign up to see this {thing}</DialogTitle>
              <DialogDescription className="text-paper/70">
                Join Planet Baltimore to unlock every {thing}, follow creators, and join the community.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Link to="/auth" className="rounded-full border border-paper/30 px-5 py-2 text-sm">Log in</Link>
          <Link to="/auth" className="rounded-full bg-paper text-ink px-5 py-2 text-sm font-medium">Sign up - it's free</Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Renders items in a grid. The first `unlockedCount` items render normally;
 * the rest are blurred and clicking any item opens a sign-up prompt.
 * Signed-in users see everything unblurred and clicks fall through to `onItemClick`.
 */
export function PreviewGrid<T>({
  items,
  unlockedCount = 1,
  signedIn,
  thing,
  render,
  onItemClick,
  className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5",
  emptyLabel = "Nothing here yet.",
}: {
  items: T[];
  unlockedCount?: number;
  signedIn: boolean;
  thing: string;
  render: (item: T, locked: boolean) => ReactNode;
  onItemClick?: (item: T) => void;
  className?: string;
  emptyLabel?: string;
}) {
  const [askOpen, setAskOpen] = useState(false);
  if (!items.length) return <div className="text-paper/60 text-sm">{emptyLabel}</div>;
  return (
    <>
      <div className={className}>
        {items.map((item, i) => {
          const locked = !signedIn && i >= unlockedCount;
          return (
            <button
              key={i}
              type="button"
              onClick={() => (locked ? setAskOpen(true) : onItemClick?.(item))}
              className="text-left relative group"
            >
              <div className={locked ? "blur-sm select-none pointer-events-none" : ""}>
                {render(item, locked)}
              </div>
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-ink/80 border border-paper/30 px-4 py-2 text-xs font-medium">
                    <Lock className="w-3.5 h-3.5" /> Sign up to view
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <SignUpDialog open={askOpen} onOpenChange={setAskOpen} thing={thing} />
    </>
  );
}