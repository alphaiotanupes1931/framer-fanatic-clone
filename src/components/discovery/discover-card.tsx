import type { ReactNode } from "react";
import { Sparkles, TrendingUp } from "lucide-react";

export function DiscoverCard({ children, isNew = false, reason = "" }: { children: ReactNode; isNew?: boolean; reason?: string }) {
  return (
    <div className="space-y-1.5">
      {(reason || isNew) && (
        <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-muted-foreground">
          {reason ? (
            <>
              <TrendingUp className="h-3 w-3" />
              <span>{reason}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              <span>New to you</span>
            </>
          )}
        </div>
      )}
      {children}
    </div>
  );
}