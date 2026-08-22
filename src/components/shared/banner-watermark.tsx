import { ImageIcon } from "lucide-react";
import { BANNER_RATIO, BANNER_SIZE_INCHES, BANNER_SIZE_PX } from "@/lib/media-guidelines";

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
      <div className="flex w-[86%] max-w-md flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-foreground/15 px-4 py-3 text-center sm:gap-2 sm:py-4">
        <ImageIcon className="h-5 w-5 text-foreground/25" />
        <div className="text-base font-black tracking-tight text-foreground/45 sm:text-xl">
          {BANNER_SIZE_INCHES}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/30 sm:text-[11px]">
          {BANNER_SIZE_PX} · {BANNER_RATIO}
        </div>
        <div className="text-[10px] font-medium text-foreground/30 sm:text-[11px]">
          Resize your photo to this shape so nothing gets cropped
        </div>
      </div>
    </div>
  );
}
