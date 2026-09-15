import { BANNER_RATIO, BANNER_SIZE_INCHES, BANNER_SIZE_PX } from "@/lib/media-guidelines";
import logo from "@/assets/pb-logo.png";

/**
 * Clean sizing watermark shown inside an empty banner box so people know
 * exactly how to resize their photo before uploading it.
 */
export function BannerWatermark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[linear-gradient(135deg,hsl(var(--muted))_0%,hsl(var(--background))_100%)] ${className}`}
    >
      {/* dashed guide frame in the exact banner ratio */}
      <div className="relative flex w-[86%] max-w-md flex-col items-center gap-2 rounded-xl border-2 border-dashed border-foreground/15 bg-background/40 px-4 py-4 text-center backdrop-blur-[1px] sm:gap-3 sm:py-5">
        <img
          src={logo}
          alt="Planet Baltimore"
          className="h-7 w-auto opacity-40 grayscale sm:h-9"
        />
        <div className="text-base font-black tracking-tight text-foreground/55 sm:text-xl">
          {BANNER_SIZE_INCHES}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 sm:text-[11px]">
          {BANNER_SIZE_PX} · {BANNER_RATIO}
        </div>
        <div className="text-[10px] font-medium leading-relaxed text-foreground/35 sm:text-[11px]">
          Resize your photo to this shape so nothing gets cropped
        </div>
      </div>
    </div>
  );
}
