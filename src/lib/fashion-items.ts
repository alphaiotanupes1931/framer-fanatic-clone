/** Lookbook captions are optional: blank text stores nothing and shows no caption UI. */
export function normalizeCaption(text: string | null | undefined): string | null {
  const trimmed = (text ?? "").trim();
  return trimmed.length ? trimmed : null;
}

/** True only when an item actually has caption text to show. */
export function hasCaption(text: string | null | undefined): boolean {
  return normalizeCaption(text) !== null;
}
