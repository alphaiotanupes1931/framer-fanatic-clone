import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export async function getPayoutAccount(profileId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("stripe_account_id, stripe_charges_enabled, display_name, username")
    .eq("id", profileId)
    .maybeSingle();
  return data;
}

export function isConnectPlatformProfileError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("responsibilities of managing losses") || message.includes("connect/platform-profile");
}

/**
 * Pull the seller's public-facing details straight from their Stripe account so
 * the buyer can see who they are actually paying (name, business, contact).
 */
export async function getSellerDetails(accountId: string) {
  try {
    const acct = await getStripe().accounts.retrieve(accountId);
    const bp = acct.business_profile ?? {};
    const addr = (bp as { support_address?: { city?: string | null; state?: string | null } | null }).support_address;
    return {
      businessName: bp.name || acct.settings?.dashboard?.display_name || null,
      supportEmail: bp.support_email || acct.email || null,
      supportPhone: bp.support_phone || null,
      website: bp.url || null,
      city: addr?.city ?? null,
      state: addr?.state ?? null,
    };
  } catch {
    return null;
  }
}

/** One short line describing the seller, safe for Stripe Checkout custom text. */
export function sellerBlurb(
  seller: Awaited<ReturnType<typeof getSellerDetails>>,
  fallbackName: string,
): string {
  const name = seller?.businessName || fallbackName;
  const parts = [`Sold by ${name}`];
  const place = [seller?.city, seller?.state].filter(Boolean).join(", ");
  if (place) parts.push(place);
  if (seller?.supportPhone) parts.push(seller.supportPhone);
  if (seller?.supportEmail) parts.push(seller.supportEmail);
  if (seller?.website) parts.push(seller.website);
  return parts.join(" · ").slice(0, 1200);
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

/** White, minimal Checkout look (no peach brand background). */
export const CHECKOUT_BRANDING = {
  background_color: "#FFFFFF",
  border_style: "rounded",
} as const;

type Breakdown = ReturnType<typeof priceBreakdown>;

/**
 * Split a charge into visible line items so the buyer sees exactly how the
 * base price becomes the total: base + Planet Baltimore service fee +
 * card processing fee. Amounts always sum to buyerTotalCents.
 */
export function checkoutLineItems(
  breakdown: Breakdown,
  base: { name: string; description?: string | undefined; images?: string[] | undefined },
) {
  return [
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: breakdown.artistNetCents,
        product_data: {
          name: base.name,
          ...(base.description ? { description: base.description } : {}),
          ...(base.images ? { images: base.images } : {}),
        },
      },
    },
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: breakdown.platformFeeCents,
        product_data: {
          name: "Platform fee",
          description: "Flat fee that keeps this platform running.",
        },
      },
    },
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: breakdown.stripeFeeCents,
        product_data: {
          name: "Card processing fee",
          description: "Payment processing (2.9% + 30 cents).",
        },
      },
    },
  ];
}