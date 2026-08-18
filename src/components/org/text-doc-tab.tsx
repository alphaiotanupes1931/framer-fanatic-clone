import { useEffect, useState } from "react";
import { FileText, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TextDocTab({
  orgId, canManage, field, title, emptyTitle, emptyHint, initialValue,
}: {
  orgId: string;
  canManage: boolean;
  field: "bylaws" | "rules" | "mission";
  title: string;
  emptyTitle: string;
  emptyHint: string;
  initialValue: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [draft, setDraft] = useState(initialValue ?? "");
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setValue(initialValue ?? ""); setDraft(initialValue ?? ""); }, [initialValue, orgId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("organizations").update({ [field]: draft } as never).eq("id", orgId);
    setSaving(false);
    if (error) { toast.error("Could not save. Please try again."); return; }
    setValue(draft);
    setEdit(false);
    toast.success("Saved");
  };

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
          <FileText className="h-5 w-5 text-[#d4580a]" /> {title}
        </h3>
        {canManage && !edit && (
          <button
            onClick={() => { setDraft(value); setEdit(true); }}
            className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        )}
      </div>

      {edit ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={16}
            placeholder={`Write your ${title.toLowerCase()} here...`}
            className="w-full rounded-2xl border border-border bg-background p-4 text-sm leading-relaxed outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => { setEdit(false); setDraft(value); }} className="flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-muted">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      ) : value.trim() ? (
        <div className="whitespace-pre-wrap rounded-2xl border border-border bg-background p-6 text-sm leading-relaxed text-neutral-800">
          {value}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
          <p className="text-sm text-neutral-600">{emptyTitle}</p>
          <p className="mt-1 text-xs text-neutral-500">{emptyHint}</p>
        </div>
      )}
    </div>
  );
}
