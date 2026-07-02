import type { ReactNode } from "react";
import { Sparkles, TrendingUp } from "lucide-react";

export function DiscoverCard({ children, isNew = false, reason = "" }: { children: ReactNode; isNew?: boolean; reason?: string }) {
  const hasBadge = isNew || !!reason;
  return (
    <div className="relative">
      {isNew && (
        <div className="absolute -top-1 right-3 z-10">
          <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground shadow-sm">
            <Sparkles className="h-2.5 w-2.5" />New to You
          </span>
        </div>
      )}
      {!isNew && reason && (
        <div className="absolute -top-1 left-3 z-10">
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm">
            <TrendingUp className="h-2.5 w-2.5" />{reason}
          </span>
        </div>
      )}
      <div className={hasBadge ? "pt-3" : ""}>{children}</div>
    </div>
  );
}