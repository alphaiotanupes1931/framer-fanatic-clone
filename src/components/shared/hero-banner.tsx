import type { ReactNode } from "react";

// Repo-styled hero: orange bordered banner with title/subtitle and optional CTA.
// Matches planet-baltimore's Stories/Artists/Events pages.
export function HeroBanner({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle?: string;
  cta?: ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border bg-[#d4580a]/[0.04] p-6 sm:p-10"
      style={{ borderColor: "rgba(212, 88, 10, 0.35)" }}
    >
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h1
            className="mb-1.5 font-display text-2xl font-bold tracking-tight sm:text-4xl"
            style={{ color: "#d4580a" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>
          )}
        </div>
        {cta && <div className="flex-shrink-0">{cta}</div>}
      </div>
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2"
          style={{ backgroundColor: "#d4580a" }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full translate-y-1/2 -translate-x-1/2"
          style={{ backgroundColor: "#d4580a" }}
        />
      </div>
    </div>
  );
}