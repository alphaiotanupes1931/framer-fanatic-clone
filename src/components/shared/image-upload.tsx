import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Img, SmartVideo } from "@/components/shared/smart-img";
import { resolveMediaUrl } from "@/components/smart-image";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { Button } from "@/components/ui/button";
import { STORED_URL_TTL, compressImage } from "@/lib/image-compress";
import { Loader2, Pencil, Trash2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
  className?: string;
  /** File types the picker allows. Defaults to images only. */
  accept?: string;
  /** Sizing guidance shown as a watermark inside the empty box. */
  hint?: string;
  /** Width divided by height of the final display area. */
  aspect?: number;
  /** Show a circular guide, for photos displayed as circles. */
  circleGuide?: boolean;
};

export function ImageUpload({
  value,
  onChange,
  label = "Upload photo",
  bucket = "post-media",
  className,
  accept = "image/*,.heic,.heif",
  hint,
  aspect = 4 / 3,
  circleGuide = false,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const isVideo = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(value);

  async function adjustExisting() {
    if (!value || isVideo) return;
    setBusy(true);
    setErr(null);
    try {
      const url = (await resolveMediaUrl(value, bucket)) ?? value;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not load that photo");
      const blob = await response.blob();
      setCropFile(new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load that photo");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    file = await compressImage(file);
    setErr(null);
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? "anon";
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage.from(bucket).createSignedUrl(path, STORED_URL_TTL);
      if (sErr || !signed?.signedUrl) throw sErr ?? new Error("Failed to sign URL");
      onChange(signed.signedUrl);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            if (f.type.startsWith("video/")) void handleFile(f);
            else setCropFile(f);
          }
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          {isVideo
            ? <SmartVideo src={value} controls playsInline className="max-h-56 w-full bg-white object-contain" />
            : <button type="button" onClick={() => void adjustExisting()} disabled={busy} className="block w-full" aria-label="Adjust image">
                <Img src={value} alt="" style={{ aspectRatio: String(aspect) }} className="w-full object-cover" />
              </button>}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-foreground/60 p-2">
            {!isVideo && (
              <Button type="button" variant="secondary" size="sm" onClick={() => void adjustExisting()} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />} Adjust
              </Button>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
              {busy ? "Uploading…" : "Replace"}
            </Button>
            <Button type="button" variant="destructive" size="icon" onClick={() => onChange("")} aria-label="Remove image">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground hover:bg-hover"
        >
          <span>{busy ? "Uploading…" : label}</span>
          {hint && <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">{hint}</span>}
        </button>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      <ImageCropDialog
        file={cropFile}
        aspect={aspect}
        maxEdge={1600}
        title="Adjust your photo"
        open={!!cropFile}
        onOpenChange={(open) => { if (!open) setCropFile(null); }}
        onCropped={(file) => {
          setCropFile(null);
          void handleFile(file);
        }}
        circleGuide={circleGuide}
      />
    </div>
  );
}