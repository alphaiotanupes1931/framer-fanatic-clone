import { useState } from "react";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyContentReport } from "@/lib/reports.functions";

const REASONS = [
  "Spam or misleading",
  "Harassment or hate speech",
  "Violence or threats",
  "Nudity or sexual content",
  "Scam or fraud",
  "Copyright violation",
  "Other",
];

export function ReportDialog({
  open, onClose, contentType, contentId,
}: {
  open: boolean;
  onClose: () => void;
  contentType: "post" | "story" | "comment" | "user" | "event" | "message" | "video" | "org_post";
  contentId: string;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setSubmitting(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { toast.error("Sign in to report"); setSubmitting(false); return; }
    const { data: inserted, error } = await supabase.from("content_reports").insert({
      reporter_id: uid, content_type: contentType, content_id: contentId, reason, details: details.trim() || null,
    }).select("id").single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    if (inserted?.id) {
      void notifyContentReport({ data: { reportId: inserted.id } }).catch(() => {});
    }
    toast.success("Report submitted. Thank you.");
    setDetails("");
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
            <Flag className="h-4 w-4 text-[#d4580a]" /> Report content
          </h3>
          <button onClick={onClose} className="rounded p-1 text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 py-4">
          <label className="block text-sm font-medium text-neutral-700">Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="block text-sm font-medium text-neutral-700">Details (optional)</label>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Add any context that will help us review this report" className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} style={{ backgroundColor: "#d4580a", color: "white" }}>
            {submitting ? "Submitting..." : "Submit report"}
          </Button>
        </div>
      </div>
    </div>
  );
}