export const CALENDAR_ORGANIZERS = [
  { id: "all", label: "All" },
  { id: "business", label: "Businesses" },
  { id: "artist", label: "Artists" },
  { id: "arts", label: "Arts Orgs" },
] as const;

export function calendarOrganizer(value: string) {
  return CALENDAR_ORGANIZERS.find((option) => option.id === value)?.id ?? "all";
}

export function matchesCalendarOrganizer(organizer: string, orgType: string | null | undefined) {
  const type = calendarOrganizer(organizer);
  return type === "all" || orgType === (type === "arts" ? "arts_org" : type);
}

export function activeCalendarOrganizer(view: string, monthly: string, upcoming: string) {
  return calendarOrganizer(view === "monthly" ? monthly : upcoming);
}