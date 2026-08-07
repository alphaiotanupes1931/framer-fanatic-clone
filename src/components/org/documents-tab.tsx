import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Upload, Trash2, X, Download } from "lucide-react";
import { FileUpload } from "@/components/shared/file-upload";
import { timeAgo } from "@/lib/text-utils";

type Doc = {
  id: string;
  name: string;
  description: string | null;
  doc_type: string;
  file_url: string;
  file_name: string | null;
  created_at: string;
  uploaded_by: string;
};

const DOC_TYPES = ["Document", "Meeting Minutes", "Budget", "Map", "By Laws", "Agenda", "Newsletter", "Other"];

export function DocumentsTab({ orgId, canManage, me, label = "Document", docType, emptyTitle, emptyHint }: { orgId: string; canManage: boolean; me: string | null; label?: string; docType?: string; emptyTitle?: string; emptyHint?: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    let q = supabase
      .from("organization_documents")
      .select("id, name, description, doc_type, file_url, file_name, created_at, uploaded_by")
      .eq("org_id", orgId);
    if (docType) q = q.eq("doc_type", docType);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) { toast.error("Could not load documents"); setLoading(false); return; }
    setDocs((data ?? []) as Doc[]);
    setLoading(false);
  }, [orgId, docType]);

  useEffect(() => { void load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    const prev = docs;
    setDocs((d) => d.filter((x) => x.id !== id));
    const { error } = await supabase.from("organization_documents").delete().eq("id", id);
    if (error) { setDocs(prev); toast.error("Could not delete document"); return; }
    toast.success("Document deleted");
  }

  return (
    <div className="space-y-6 py-2">
      {canManage && (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-5 text-sm font-semibold text-neutral-600 transition hover:border-[#d4580a] hover:text-[#d4580a]"
        >
          <Upload className="h-4 w-4" /> Upload {label}
        </button>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="py-14 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
          <p className="text-sm font-medium text-neutral-600">{emptyTitle ?? "No documents yet."}</p>
          <p className="mt-1 text-xs text-neutral-500">{emptyHint ?? "Upload meeting minutes, budgets, maps, and more."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <div key={d.id} className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d4580a]/10">
                <FileText className="h-5 w-5 text-[#d4580a]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="truncate font-semibold text-neutral-900 hover:underline">{d.name}</a>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">{d.doc_type}</span>
                </div>
                {d.description && <p className="mt-1 text-sm text-neutral-600">{d.description}</p>}
                <p className="mt-1 text-xs text-neutral-400">{timeAgo(d.created_at)}</p>
              </div>
              <div className="flex items-center gap-1">
                <a href={d.file_url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Open document">
                  <Download className="h-4 w-4" />
                </a>
                {(canManage || me === d.uploaded_by) && (
                  <button onClick={() => void remove(d.id)} className="rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete document">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <UploadDialog orgId={orgId} me={me} fixedType={docType} label={label} onClose={() => setOpen(false)} onDone={() => { setOpen(false); void load(); }} />}
    </div>
  );
}

function UploadDialog({ orgId, me, onClose, onDone, fixedType, label = "Document" }: { orgId: string; me: string | null; onClose: () => void; onDone: () => void; fixedType?: string; label?: string }) {
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [docType, setDocType] = useState(fixedType ?? "Document");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!me) { toast.error("Sign in to upload"); return; }
    if (!url || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("organization_documents").insert({
      org_id: orgId, uploaded_by: me, name: name.trim(),
      description: description.trim() || null, doc_type: docType,
      file_url: url, file_name: fileName || null,
    });
    setSaving(false);
    if (error) { toast.error("Could not save document"); return; }
    toast.success("Document uploaded");
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h3 className="text-lg font-bold text-neutral-900">Upload {label}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          <FileUpload
            value={url}
            onChange={(u, n) => { setUrl(u); if (n) { setFileName(n); if (!name) setName(n.replace(/\.[^.]+$/, "")); } }}
            label="Drop file or click to browse"
            accept=".pdf,.doc,.docx,.csv,.xls,.xlsx,.txt,.rtf,.ppt,.pptx,image/*"
            bucket="post-media"
            maxSizeMB={25}
          />
          <p className="-mt-2 text-center text-xs text-neutral-500">PDF, Word, Excel, images, etc.</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Document Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., January 2026 Meeting Minutes"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add context or notes..."
              className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
          </div>
          {!fixedType && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Document Type</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4580a]">
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-3 border-t border-neutral-200 p-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
          <button onClick={() => void save()} disabled={!url || !name.trim() || saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#d4580a] py-2.5 text-sm font-semibold text-white disabled:bg-neutral-300">
            <Upload className="h-4 w-4" /> {saving ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}