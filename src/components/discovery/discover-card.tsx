import type { ReactNode } from "react";
import { Sparkles, TrendingUp } from "lucide-react";

export function DiscoverCard({ children, isNew = false, reason = "" }: { children: ReactNode; isNew?: boolean; reason?: string }) {
  return (
    <div className="space-y-2">
      {(reason || isNew) && (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {reason ? <TrendingUp className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
          <span>{reason || "New to you"}</span>
        </span>
      )}
      {children}
    </div>
  );
}