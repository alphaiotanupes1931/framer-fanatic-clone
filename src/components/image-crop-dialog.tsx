import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { decodeImage } from "@/lib/image-compress";
import { toast } from "sonner";

type Props = {
  file: File | null;
  /** width / height of the crop frame. 1 = square avatar, 3 = wide banner. */
  aspect?: number;
  /** longest edge of the exported image */
  maxEdge?: number;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropped: (file: File) => void;
  /** Show the round avatar guide (defaults to on for square crops). */
  circleGuide?: boolean;
  /** Extra controls rendered under the zoom slider, e.g. aspect ratio chips. */
  extraControls?: React.ReactNode;
};

const FRAME = 288;

export function ImageCropDialog({
  file,
  aspect = 1,
  maxEdge = 1024,
  title = "Crop your photo",
  open,
  onOpenChange,
  onCropped,
  circleGuide,
  extraControls,
}: Props) {
  const [img, setImg] = useState<HTMLImageElement | ImageBitmap | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const frameW = FRAME;
  const frameH = Math.round(FRAME / aspect);

  useEffect(() => {
    let cancelled = false;
    if (!file || !open) return;
    setLoading(true);
    setImg(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    decodeImage(file)
      .then((decoded) => {
        if (!cancelled) setImg(decoded);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("We could not open that photo. Try a JPG or PNG, or take a new screenshot of it.");
        onOpenChange(false);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [file, open, onOpenChange]);

  const natural = img
    ? {
        w: "naturalWidth" in img ? img.naturalWidth : img.width,
        h: "naturalHeight" in img ? img.naturalHeight : img.height,
      }
    : null;

  // Scale that makes the image cover the frame at zoom = 1.
  const baseScale = natural ? Math.max(frameW / natural.w, frameH / natural.h) : 1;
  const drawW = natural ? natural.w * baseScale * zoom : 0;
  const drawH = natural ? natural.h * baseScale * zoom : 0;

  const clamp = useCallback(
    (x: number, y: number) => {
      const maxX = Math.max(0, (drawW - frameW) / 2);
      const maxY = Math.max(0, (drawH - frameH) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
    },
    [drawW, drawH, frameW, frameH],
  );

  useEffect(() => {
    setOffset((o) => clamp(o.x, o.y));
  }, [clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = drag.current;
    setOffset(clamp(d.ox + (e.clientX - d.x), d.oy + (e.clientY - d.y)));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const apply = async () => {
    if (!img || !natural || !file) return;
    const outW = aspect >= 1 ? maxEdge : Math.round(maxEdge * aspect);
    const outH = aspect >= 1 ? Math.round(maxEdge / aspect) : maxEdge;
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);

    const ratio = outW / frameW;
    const dx = (frameW - drawW) / 2 + offset.x;
    const dy = (frameH - drawH) / 2 + offset.y;
    ctx.drawImage(img as CanvasImageSource, dx * ratio, dy * ratio, drawW * ratio, drawH * ratio);

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    if (!blob) {
      toast.error("Could not process that photo.");
      return;
    }
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    onCropped(new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative touch-none overflow-hidden rounded-lg bg-muted"
            style={{ width: frameW, height: frameH, maxWidth: "100%" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {loading && <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading photo…</div>}
            {img && natural && (
              <canvas
                ref={(el) => {
                  if (!el) return;
                  el.width = frameW;
                  el.height = frameH;
                  const c = el.getContext("2d");
                  if (!c) return;
                  c.clearRect(0, 0, frameW, frameH);
                  c.imageSmoothingQuality = "high";
                  c.drawImage(
                    img as CanvasImageSource,
                    (frameW - drawW) / 2 + offset.x,
                    (frameH - drawH) / 2 + offset.y,
                    drawW,
                    drawH,
                  );
                }}
                className="cursor-grab active:cursor-grabbing"
              />
            )}
            {(circleGuide ?? aspect === 1) && <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80" />}
          </div>
          <div className="flex w-full items-center gap-3">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <Slider value={[zoom]} min={1} max={4} step={0.01} onValueChange={(v) => setZoom(v[0])} className="flex-1" />
          </div>
          {extraControls}
          <p className="text-center text-xs text-muted-foreground">Drag the photo to reposition it.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!img}>
            Use photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
