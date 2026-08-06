import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (url: string, name?: string) => void;
  label?: string;
  accept?: string;
  bucket?: string;
  maxSizeMB?: number;
  fileName?: string;
  className?: string;
};

export function FileUpload({
  value,
  onChange,
  label = "Upload file (PDF, DOC, CSV, etc.)",
  accept = ".pdf,.doc,.docx,.csv,.xls,.xlsx,.txt,.rtf,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain",
  bucket = "post-media",
  maxSizeMB = 25,
  fileName,
  className,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [localName, setLocalName] = useState<string | undefined>(fileName);

  async function handleFile(file: File) {
    setErr(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErr(`File is over ${maxSizeMB}MB`);
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? "anon";
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, STORED_URL_TTL);
      if (sErr || !signed?.signedUrl) throw sErr ?? new Error("Failed to sign URL");
      setLocalName(file.name);
      onChange(signed.signedUrl, file.name);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const displayName = localName || fileName || (value ? value.split("/").pop()?.split("?")[0] : "");

  return (
    <div className={className}>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          if (ref.current) ref.current.value = "";
        }}
      />
      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <FileText className="h-4 w-4 text-[#d4580a]" />
          <a href={value} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm font-medium text-neutral-800 hover:underline">
            {displayName || "Attached file"}
          </a>
          <button type="button" onClick={() => ref.current?.click()} disabled={busy}
            className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-white">
            {busy ? "Uploading…" : "Replace"}
          </button>
          <button type="button" onClick={() => { setLocalName(undefined); onChange("", ""); }}
            className="grid h-7 w-7 place-items-center rounded-full text-red-600 hover:bg-red-50">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground hover:bg-muted"
        >
          <Upload className="h-4 w-4" />
          {busy ? "Uploading…" : label}
        </button>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}