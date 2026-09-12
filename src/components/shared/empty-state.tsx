import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/60 px-6 py-14 text-center ${className}`}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange/10"
      >
        <Icon className="h-6 w-6 text-orange" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CardGridSkeleton({
  count = 6,
  aspect = "aspect-[16/9]",
  cols = "sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  aspect?: string;
  cols?: string;
}) {
  return (
    <div className={`grid gap-5 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
        >
          <div
            className={`${aspect} w-full animate-pulse bg-neutral-100`}
          />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-neutral-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );
}