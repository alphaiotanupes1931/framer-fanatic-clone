import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

/**
 * High-contrast, high-resolution QR display optimized for scanning on phones
 * outdoors. Renders at 2x device resolution, forces pure black/white, and
 * offers a full-screen "bright mode" for direct sunlight.
 */
export function QrDisplay({
  value,
  className = "",
  label = "Ticket QR code",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [full, setFull] = useState(false);

  // Request a large, high error-correction QR so it stays readable when
  // scaled up, dimmed by glare, or partially obscured.
  const src = (px: number) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&margin=0&qzone=1&ecc=Q&format=png&color=000000&bgcolor=ffffff&data=${encodeURIComponent(value)}`;

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [full]);

  return (
    <>
      <button
        type="button"
        onClick={() => setFull(true)}
        aria-label="Enlarge QR code for scanning"
        className={`group relative block rounded-xl bg-white ${className}`}
      >
        <img
          src={src(1000)}
          alt={label}
          width={320}
          height={320}
          className="h-[min(74vw,300px)] w-[min(74vw,300px)] rounded-lg contrast-125 [image-rendering:pixelated]"
        />
        <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-black/70 p-1.5 text-white opacity-80 print:hidden">
          <Maximize2 className="h-3.5 w-3.5" />
        </span>
      </button>

      {full && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-white p-4 print:hidden"
          onClick={() => setFull(false)}
        >
          <img
            src={src(1200)}
            alt={label}
            className="h-[min(92vw,92vh)] w-[min(92vw,92vh)] contrast-150 [image-rendering:pixelated]"
          />
          <p className="text-center text-xs font-medium uppercase tracking-widest text-black/60">
            Turn your screen brightness up, then tap anywhere to close
          </p>
          <button
            type="button"
            onClick={() => setFull(false)}
            aria-label="Close enlarged QR code"
            className="absolute right-4 top-4 rounded-full bg-black p-2 text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
