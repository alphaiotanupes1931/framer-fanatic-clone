export type EventPricingFields = {
  price_cents?: number | null;
  pricing_mode?: string | null;
  donations_enabled?: boolean | null;
};

/**
 * The ticket price determines whether an event is paid. Donations are optional
 * support for a free event and must never change its Free label.
 */
export function isPaidEvent(event: EventPricingFields, ticketPrices: Array<number | null | undefined> = []): boolean {
  return (event.price_cents ?? 0) > 0 || ticketPrices.some((price) => (price ?? 0) > 0);
}