import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  _stripe = new Stripe(key);
  return _stripe;
}

// Baltimore City Admissions & Amusement Tax: 10% on admissions/tickets.
export const BALTIMORE_TAX_RATE = 0.10;

// Stripe US standard pricing: 2.9% + 30¢ per successful card charge.
export const STRIPE_PERCENT = 0.029;
export const STRIPE_FIXED_CENTS = 30;

/**
 * Given the price the artist wants to NET (in cents), compute:
 *  - buyerTotal: what the buyer is charged (grossed up so artist still nets `artistNet` after fees+tax)
 *  - platformTaxCents: 10% Baltimore admissions tax, routed to platform via application_fee_amount
 *  - stripeFeeCents: estimated Stripe processing fee
 *
 * Math:
 *  buyerTotal = (artistNet + tax + 0.30) / (1 - 0.029)
 *  tax = 0.10 * artistNet
 */
export function priceBreakdown(artistNetCents: number) {
  const net = Math.max(0, Math.floor(artistNetCents));
  const tax = Math.round(net * BALTIMORE_TAX_RATE);
  const subtotalBeforeStripe = net + tax + STRIPE_FIXED_CENTS;
  const buyerTotal = Math.ceil(subtotalBeforeStripe / (1 - STRIPE_PERCENT));
  const stripeFee = buyerTotal - net - tax;
  return {
    artistNetCents: net,
    platformTaxCents: tax,
    stripeFeeCents: stripeFee,
    buyerTotalCents: buyerTotal,
  };
}