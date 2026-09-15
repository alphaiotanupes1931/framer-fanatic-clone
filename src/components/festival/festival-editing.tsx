import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Img } from "@/components/shared/smart-img";
import { resolveMediaUrl } from "@/components/smart-image";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { toast } from "sonner";
import { GripVertical, ImagePlus, Loader2, MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";

/** Rejects when a promise takes longer than `ms`, so uploads never hang forever. */
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e as Error);
      },
    );
  });
}

/** Uploads an image to the shared event image bucket and returns its stored path. */
export async function uploadFestivalImage(file: File): Promise<string> {
  const compressed = await withTimeout(compressImage(file), 30_000, "That image took too long to process. Try a smaller photo.");
  // getSession reads the local session; it cannot stall on the network.
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) throw new Error("Please sign in again to upload images.");
  const ext = (compressed.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await withTimeout(
    supabase.storage.from("event-images").upload(path, compressed, { upsert: false, contentType: compressed.type }),
    60_000,
    "The upload timed out. Check your connection and try again.",
  );
  if (error) throw error;
  return path;
}

export function ImagePickerField({
  value,
  onChange,
  label = "Image",
  aspect = 1,
  trigger,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  /** Starting crop shape; the person can still pick another one. */
  aspect?: number;
  trigger?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  /** Re-opens the crop tool with the photo that is already saved. */
  const adjustExisting = async () => {
    if (!value) return;
    setBusy(true);
    try {
      const url = (await resolveMediaUrl(value)) ?? value;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Could not load that photo");
      const blob = await res.blob();
      setCropFile(new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load that photo");
    } finally {
      setBusy(false);
    }
  };

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
      {trigger ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="disabled:opacity-50"
          >
            {trigger}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setCropFile(f);
              }
              e.target.value = "";
            }}
          />
        </>
      ) : (
        <>
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
            <div className="flex flex-wrap gap-2">
              {value ? (
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void adjustExisting()}>
                  {busy ? "Working…" : "Adjust image"}
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
                {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setCropFile(f);
                }
                e.target.value = "";
              }}
            />
          </div>
        </>
      )}

      <ImageCropDialog
        file={cropFile}
        aspect={aspect}
        maxEdge={1440}
        title="Adjust your photo"
        open={!!cropFile}
        onOpenChange={(open) => {
          if (!open) setCropFile(null);
        }}
        onCropped={(f) => {
          setCropFile(null);
          void pick(f);
        }}
        circleGuide={false}
      />
    </div>
  );
}

export type FieldSpec = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "image" | "select";
  placeholder?: string;
  options?: string[];
  aspect?: number;
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
              <ImagePickerField key={f.key} label={f.label} value={form[f.key] ?? ""} onChange={(v) => set(f.key, v)} aspect={f.aspect ?? 4 / 3} />
            ) : f.type === "select" ? (
              <label key={f.key} className="block">
                <span className="text-xs font-semibold text-muted-foreground">{f.label}</span>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                >
                  {(f.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
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
  reorderable = false,
  listClassName,
}: {
  items: T[];
  canEdit: boolean;
  addLabel: string;
  dialogTitle: string;
  fields: FieldSpec[];
  emptyState: React.ReactNode;
  onChange: (next: T[]) => Promise<void>;
  renderItem: (item: T, index: number) => React.ReactNode;
  reorderable?: boolean;
  listClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const canDrag = canEdit && reorderable;

  const save = async (item: ItemRecord) => {
    const next = [...items];
    if (editIndex === null) next.push(item as T);
    else next[editIndex] = { ...next[editIndex], ...item } as T;
    await onChange(next);
  };

  const remove = async (index: number) => {
    await onChange(items.filter((_, i) => i !== index));
  };

  const move = async (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    await onChange(next);
  };

  return (
    <div>
      {canEdit && (
        <div className="mb-4 flex items-center justify-end gap-3">
          {canDrag && items.length > 1 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <GripVertical className="h-3.5 w-3.5" /> Drag cards to reorder
            </span>
          )}
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
        <div className={listClassName}>
          {items.map((item, index) => {
            const rendered = renderItem(item, index);
            if (rendered === null || rendered === undefined || rendered === false) return null;
            return (
            <div
              key={`${item.name ?? item.q ?? item.title ?? index}-${index}`}
              className={`relative ${canDrag ? "flex items-stretch gap-1.5 cursor-grab select-none active:cursor-grabbing" : ""} ${dragIndex === index ? "opacity-50" : ""}`}
              draggable={canDrag}
              onDragStart={canDrag ? (e) => {
                e.dataTransfer.effectAllowed = "move";
                setDragIndex(index);
              } : undefined}
              onDragEnd={canDrag ? () => setDragIndex(null) : undefined}
              onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
              onDrop={
                canDrag
                  ? (e) => {
                      e.preventDefault();
                      if (dragIndex !== null) void move(dragIndex, index);
                      setDragIndex(null);
                    }
                  : undefined
              }
            >
              {canDrag && (
                <span
                  aria-label="Drag to reorder"
                  title="Drag to reorder"
                  className="pointer-events-none inline-flex shrink-0 items-center self-center rounded-md bg-foreground/60 px-0.5 py-3 text-background shadow"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
              )}
              <div className={canDrag ? "min-w-0 flex-1" : "contents"}>{rendered}</div>
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="secondary" size="icon-sm" className="absolute right-2 top-2 rounded-full bg-foreground/70 text-background hover:bg-foreground" aria-label={`Manage ${item.name ?? item.title ?? "item"}`}>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => { setEditIndex(index); setOpen(true); }}><Pencil /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void remove(index)}><Trash2 /> Remove</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

