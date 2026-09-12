import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow,
  back,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-4", className)}>
      {back}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <div className="mb-2 text-xs font-bold uppercase text-orange">{eyebrow}</div>}
          <h1 className="font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}