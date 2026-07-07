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
      className="relative overflow-hidden rounded-xl border-2 bg-[#fffdfb] px-5 py-5 sm:min-h-[118px] sm:px-9 sm:py-8"
      style={{ borderColor: "#d4580a" }}
    >
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 max-w-2xl sm:flex-1">
          <h1
            className="mb-1.5 font-display text-[24px] font-extrabold leading-[1.15] sm:mb-2 sm:text-[38px]"
            style={{ color: "#d4580a" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] font-normal leading-snug text-neutral-500 sm:text-[15px] sm:leading-relaxed">{subtitle}</p>
          )}
        </div>
        {cta && <div className="flex-shrink-0 self-start">{cta}</div>}
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