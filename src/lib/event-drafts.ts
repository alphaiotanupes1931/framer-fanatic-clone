// Local event drafts. Lets an organizer step away from the create-event page
// (for example to connect payouts) without losing anything they typed.

export type EventDraft = {
  id: string;
  updated_at: string;
  org?: string | undefined;
  kind?: "exhibition" | undefined;
  startMode: "set" | "now";
  isOnline: boolean;
  pricing: "free" | "paid";
  donation?: boolean;
  form: {
    image_url: string;
    video_url: string;
    title: string;
    description: string;
    starts_at: string;
    ends_at: string;
    venue_name: string;
    address: string;
    neighborhood: string;
    category: string;
    capacity: string;
    per_person: string;
    gallery_urls?: string[];
  };
};

const KEY = "pb:event-drafts";

function read(): EventDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as EventDraft[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: EventDraft[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)));
    window.dispatchEvent(new Event("pb:event-drafts"));
  } catch {
    /* storage full or unavailable */
  }
}

export function listEventDrafts(): EventDraft[] {
  return read().sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export function getEventDraft(id: string): EventDraft | null {
  return read().find((d) => d.id === id) ?? null;
}

export function saveEventDraft(draft: Omit<EventDraft, "updated_at">): EventDraft {
  const full: EventDraft = { ...draft, updated_at: new Date().toISOString() };
  write([full, ...read().filter((d) => d.id !== full.id)]);
  return full;
}

export function deleteEventDraft(id: string) {
  write(read().filter((d) => d.id !== id));
}

/** A draft is only worth keeping once something meaningful has been typed. */
export function draftHasContent(d: Pick<EventDraft, "form">): boolean {
  const f = d.form;
  return Boolean(
    f.title.trim() ||
      f.description.trim() ||
      f.venue_name.trim() ||
      f.address.trim() ||
      f.image_url ||
      f.video_url ||
      f.starts_at,
  );
}
