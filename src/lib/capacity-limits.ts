// Shared rules for the two ticket limits organizers can set on an event.
// Capacity = total tickets the event can sell. Per person = most one guest can get.

export type CapacityErrors = { capacity?: string; per_person?: string };

const isBlank = (v: string) => v.trim() === "";

export function validateCapacityFields(capacity: string, perPerson: string): CapacityErrors {
  const errors: CapacityErrors = {};

  if (!isBlank(capacity)) {
    const n = Number(capacity);
    if (!Number.isInteger(n)) errors.capacity = "Enter a whole number of tickets, or leave this blank for unlimited.";
    else if (n < 1) errors.capacity = "Capacity must be at least 1. Leave it blank for unlimited.";
  }

  if (!isBlank(perPerson)) {
    const n = Number(perPerson);
    if (!Number.isInteger(n)) errors.per_person = "Enter a whole number of tickets, or leave this blank for no limit.";
    else if (n < 1) errors.per_person = "Tickets per person must be at least 1. Leave it blank for no limit.";
  }

  if (!errors.capacity && !errors.per_person && !isBlank(capacity) && !isBlank(perPerson)) {
    if (Number(perPerson) > Number(capacity)) {
      errors.per_person = "Tickets per person cannot be more than the event capacity.";
    }
  }

  return errors;
}

export const hasCapacityErrors = (e: CapacityErrors) => Boolean(e.capacity || e.per_person);

/** Turns a form value into the number stored on the event (null means no limit). */
export const parseLimit = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : null;
};
