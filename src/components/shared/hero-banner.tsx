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
      className="relative rounded-2xl overflow-hidden p-8 sm:p-12 bg-transparent border-2"
      style={{ borderColor: "#d4580a" }}
    >
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-3xl sm:text-4xl font-bold font-display mb-2"
            style={{ color: "#d4580a" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>
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