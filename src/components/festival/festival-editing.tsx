import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Img } from "@/components/shared/smart-img";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { toast } from "sonner";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

/** Uploads an image to the shared event image bucket and returns its stored path. */
export async function uploadFestivalImage(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Please sign in again to upload images.");
  const ext = (compressed.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("event-images")
    .upload(path, compressed, { upsert: false, contentType: compressed.type });
  if (error) throw error;
  return path;
}

export function ImagePickerField({
  value,
  onChange,
  label = "Image",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File) => {
    setBusy(true);
    try {
      onChange(await uploadFestivalImage(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          {value ? (
            <>
              <Img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange("")}
                aria-label="Remove image"
                className="absolute right-1 top-1 rounded-full bg-foreground/70 p-1 text-background"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export type FieldSpec = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "image";
  placeholder?: string;
};

export type ItemRecord = Record<string, string>;

export function ItemEditorDialog({
  open,
  onOpenChange,
  title,
  fields,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  fields: FieldSpec[];
  value: ItemRecord | null;
  onSave: (item: ItemRecord) => Promise<void>;
}) {
  const [form, setForm] = useState<ItemRecord>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next: ItemRecord = {};
    for (const f of fields) next[f.key] = value?.[f.key] ?? "";
    setForm(next);
  }, [open, value, fields]);

  const set = (key: string, v: string) => setForm((f) => ({ ...f, [key]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {fields.map((f) =>
            f.type === "image" ? (
              <ImagePickerField key={f.key} label={f.label} value={form[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
            ) : (
              <label key={f.key} className="block">
                <span className="text-xs font-semibold text-muted-foreground">{f.label}</span>
                {f.type === "textarea" ? (
                  <Textarea
                    className="mt-1"
                    rows={3}
                    value={form[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ) : (
                  <Input
                    className="mt-1"
                    value={form[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </label>
            ),
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="brand" disabled={saving} onClick={() => void submit()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Renders a creator-editable list: an Add button, and Edit/Remove controls on
 * each row. Visitors simply see the rendered items.
 */
export function EditableList<T extends ItemRecord>({
  items,
  canEdit,
  addLabel,
  dialogTitle,
  fields,
  emptyState,
  onChange,
  renderItem,
}: {
  items: T[];
  canEdit: boolean;
  addLabel: string;
  dialogTitle: string;
  fields: FieldSpec[];
  emptyState: React.ReactNode;
  onChange: (next: T[]) => Promise<void>;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const save = async (item: ItemRecord) => {
    const next = [...items];
    if (editIndex === null) next.push(item as T);
    else next[editIndex] = { ...next[editIndex], ...item } as T;
    await onChange(next);
  };

  const remove = async (index: number) => {
    await onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            variant="brand"
            size="sm"
            onClick={() => {
              setEditIndex(null);
              setOpen(true);
            }}
          >
            <Plus /> {addLabel}
          </Button>
        </div>
      )}

      {items.length > 0 ? (
        <div>
          {items.map((item, index) => {
            const rendered = renderItem(item, index);
            if (rendered === null || rendered === undefined || rendered === false) return null;
            return (
            <div key={`${item.name ?? item.q ?? item.title ?? index}-${index}`} className="relative">
              {rendered}
              {canEdit && (
                <div className="mb-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setEditIndex(index);
                      setOpen(true);
                    }}
                  >
                    <Pencil /> Edit
                  </Button>
                  <Button type="button" variant="outline" size="xs" onClick={() => void remove(index)}>
                    <Trash2 /> Remove
                  </Button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      ) : (
        emptyState
      )}

      <ItemEditorDialog
        open={open}
        onOpenChange={setOpen}
        title={dialogTitle}
        fields={fields}
        value={editIndex === null ? null : items[editIndex]}
        onSave={save}
      />
    </div>
  );
}
