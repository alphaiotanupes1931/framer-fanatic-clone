import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  // Cloudflare Workers runtime: force fetch-based HTTP client so the SDK
  // does not try to use Node's http/https module (which is stubbed).
  _stripe = new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}

// Planet Baltimore platform fee: flat 69¢ per paid ticket.
export const PLATFORM_FEE_CENTS = 69;

// Stripe US standard pricing: 2.9% + 30¢ per successful card charge.
export const STRIPE_PERCENT = 0.029;
export const STRIPE_FIXED_CENTS = 30;

/**
 * Given the price the artist wants to NET (in cents), compute:
 *  - buyerTotal: what the buyer is charged (grossed up so artist still nets `artistNet` after fees)
 *  - platformFeeCents: flat 69¢ Planet Baltimore platform fee (routed via application_fee_amount)
 *  - stripeFeeCents: estimated Stripe processing fee (2.9% + 30¢)
 *
 * Math:
 *  buyerTotal = (artistNet + platformFee + 0.30) / (1 - 0.029)
 */
export function priceBreakdown(artistNetCents: number) {
  const net = Math.max(0, Math.floor(artistNetCents));
  const platformFee = PLATFORM_FEE_CENTS;
  const subtotalBeforeStripe = net + platformFee + STRIPE_FIXED_CENTS;
  const buyerTotal = Math.ceil(subtotalBeforeStripe / (1 - STRIPE_PERCENT));
  const stripeFee = buyerTotal - net - platformFee;
  return {
    artistNetCents: net,
    platformFeeCents: platformFee,
    // Kept for backward-compat with existing callers/DB columns.
    platformTaxCents: platformFee,
    stripeFeeCents: stripeFee,
    buyerTotalCents: buyerTotal,
  };
}