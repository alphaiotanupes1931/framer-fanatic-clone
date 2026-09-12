import type { ButtonHTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Chip({ selected = false, removable = false, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; removable?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected ? "border-orange bg-orange text-orange-foreground" : "border-border bg-background text-muted-foreground hover:border-orange hover:text-orange",
        className,
      )}
      {...props}
    >
      {children}
      {removable && <X className="h-3 w-3" aria-hidden />}
    </button>
  );
}