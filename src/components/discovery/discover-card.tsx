import type { ReactNode } from "react";
import { Star, TrendingUp } from "lucide-react";

export function DiscoverCard({ children, isNew = false, reason = "" }: { children: ReactNode; isNew?: boolean; reason?: string }) {
  return (
    <div className="space-y-2">
      {(reason || isNew) && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/70 px-2.5 py-1 text-[11px] font-medium leading-none text-muted-foreground">
          {reason ? <TrendingUp className="h-3 w-3 shrink-0" /> : <Star className="h-3 w-3 shrink-0" />}
          <span className="leading-none">{reason || "New to you"}</span>
        </span>
      )}
      {children}
    </div>
  );
}