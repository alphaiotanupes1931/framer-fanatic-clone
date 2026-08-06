/**
 * Client-side image resizing / compression for uploads.
 *
 * Large phone photos (8-15MB, 4000px wide) are the single biggest cause of
 * slow uploads and slow feeds. Everything is downscaled to a sane max edge
 * and re-encoded before it ever leaves the browser.
 */

/** TTL for signed URLs we persist in the database (re-signed at render time). */
export const STORED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

const MAX_EDGE = 1920;
const AVATAR_MAX_EDGE = 512;
const QUALITY = 0.82;
/** Files below this size and already reasonably sized are passed through. */
const SKIP_BELOW_BYTES = 200 * 1024;

function isCompressible(file: File) {
  return /^image\/(jpeg|jpg|png|webp)$/i.test(file.type);
}

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export type CompressOptions = { maxEdge?: number; quality?: number };

/**
 * Returns a downscaled/re-encoded copy of the file, or the original file when
 * compression isn't applicable (videos, PDFs, GIFs, SVGs, tiny images) or
 * fails for any reason. Never throws.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  try {
    if (typeof document === "undefined") return file;
    if (!isCompressible(file)) return file;

    const maxEdge = opts.maxEdge ?? MAX_EDGE;
    const quality = opts.quality ?? QUALITY;

    const img = await loadBitmap(file);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return file;

    const scale = Math.min(1, maxEdge / Math.max(w, h));
    // Already small enough and light enough: leave it alone.
    if (scale === 1 && file.size < SKIP_BELOW_BYTES) return file;

    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, tw, th);

    // Preserve transparency: PNG/WebP sources with an alpha channel stay PNG,
    // everything else re-encodes to JPEG.
    const keepAlpha = /png|webp/i.test(file.type) && hasAlpha(ctx, tw, th);
    const outType = keepAlpha ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, quality),
    );
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    const ext = keepAlpha ? "png" : "jpg";
    return new File([blob], `${base}.${ext}`, { type: outType, lastModified: Date.now() });
  } catch {
    return file;
  }
}

function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number) {
  try {
    // Sample a grid rather than every pixel — plenty accurate, far cheaper.
    const step = Math.max(1, Math.floor(Math.min(w, h) / 32));
    for (let y = 0; y < h; y += step) {
      const row = ctx.getImageData(0, y, w, 1).data;
      for (let x = 3; x < row.length; x += 4 * step) {
        if (row[x] < 250) return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

/** Avatars never need more than 512px. */
export function compressAvatar(file: File): Promise<File> {
  return compressImage(file, { maxEdge: AVATAR_MAX_EDGE, quality: 0.85 });
}