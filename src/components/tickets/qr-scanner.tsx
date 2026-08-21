import { useEffect, useRef, useState } from "react";
import { CameraOff, Loader2 } from "lucide-react";

type Props = {
  onResult: (text: string) => void;
  paused?: boolean;
};

/** Camera QR scanner. Uses the native BarcodeDetector when available, jsQR otherwise. */
export function QrScanner({ onResult, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(paused);
  const firedRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "live" | "error">("starting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused) firedRef.current = false;
  }, [paused]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let detector: { detect: (s: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } | null = null;
    let jsQR: typeof import("jsqr").default | null = null;

    const emit = (value: string) => {
      if (pausedRef.current || firedRef.current) return;
      firedRef.current = true;
      onResult(value);
    };

    const tick = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!stopped && video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !pausedRef.current) {
        try {
          if (detector) {
            const codes = await detector.detect(video);
            if (codes[0]?.rawValue) emit(codes[0].rawValue);
          } else if (jsQR) {
            const w = 480;
            const h = Math.round((video.videoHeight / Math.max(video.videoWidth, 1)) * w) || 480;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h);
              const img = ctx.getImageData(0, 0, w, h);
              const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
              if (code?.data) emit(code.data);
            }
          }
        } catch {
          /* keep scanning */
        }
      }
      if (!stopped) rafRef.current = requestAnimationFrame(() => void tick());
    };

    (async () => {
      try {
        const AnyWin = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } };
        if (AnyWin.BarcodeDetector) {
          detector = new AnyWin.BarcodeDetector({ formats: ["qr_code"] });
        } else {
          jsQR = (await import("jsqr")).default;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setStatus("live");
        void tick();
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Camera unavailable");
      }
    })();

    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-neutral-900">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {status === "live" && !paused && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-3/5 w-3/5 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      )}

      {status === "starting" && (
        <div className="absolute inset-0 grid place-items-center text-white/80">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Starting camera...
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-white/80">
          <div>
            <CameraOff className="mx-auto h-7 w-7" />
            <p className="mt-2 text-sm font-semibold">Camera unavailable</p>
            <p className="mt-1 text-xs text-white/60">{error}</p>
            <p className="mt-2 text-xs text-white/60">Enter the ticket code below instead.</p>
          </div>
        </div>
      )}
    </div>
  );
}
