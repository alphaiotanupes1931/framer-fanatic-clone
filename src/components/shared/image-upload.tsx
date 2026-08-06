import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Img } from "@/components/shared/smart-img";

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
  className?: string;
};

export function ImageUpload({ value, onChange, label = "Upload photo", bucket = "post-media", className }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
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
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <Img src={value} alt="" className="w-full max-h-56 object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-black/50 p-2">
            <button type="button" onClick={() => ref.current?.click()} disabled={busy}
              className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-900">
              {busy ? "Uploading…" : "Replace"}
            </button>
            <button type="button" onClick={() => onChange("")}
              className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-red-600">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground hover:bg-muted"
        >
          {busy ? "Uploading…" : label}
        </button>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}