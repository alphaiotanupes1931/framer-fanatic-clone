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
      className="relative min-h-[118px] overflow-hidden rounded-xl border-2 bg-[#fffdfb] px-8 py-7 sm:px-9 sm:py-8"
      style={{ borderColor: "#d4580a" }}
    >
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h1
            className="mb-2 font-display text-[32px] font-extrabold leading-tight sm:text-[38px]"
            style={{ color: "#d4580a" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-[15px] font-normal leading-relaxed text-neutral-500">{subtitle}</p>
          )}
        </div>
        {cta && <div className="flex-shrink-0">{cta}</div>}
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.055]">
        <div
          className="absolute right-[-58px] top-[-84px] h-48 w-48 rounded-full"
          style={{ backgroundColor: "#d4580a" }}
        />
        <div
          className="absolute bottom-[-74px] left-[-70px] h-36 w-36 rounded-full"
          style={{ backgroundColor: "#d4580a" }}
        />
      </div>
    </div>
  );
}