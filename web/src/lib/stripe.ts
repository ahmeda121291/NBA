import Stripe from "stripe";

// Lazy init to avoid crashing at build time when env var is missing
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

/** @deprecated Use getStripe() instead — kept for backward compat */
export const stripe = typeof process.env.STRIPE_SECRET_KEY === "string"
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : (null as unknown as Stripe);

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "Team standings & basic stats",
      "Today's game picks (win/loss only)",
      "Player search with basic stats",
    ],
  },
  pro: {
    name: "Pro",
    price: 24.99,
    priceId: process.env.STRIPE_PRICE_ID!,
    features: [
      "Full CourtVision metrics (BIS, LFI, DRS + all 6 scores)",
      "Live projections with confidence %, score ranges",
      "Player H2H matchup splits & opponent analysis",
      "AI scouting reports",
      "All advanced stats (USG%, BPM, VORP, WS)",
      "Auto-refreshing live scores",
      "Game detail with key reasons & upset risk",
      "Player rolling form & trend analysis",
    ],
  },
} as const;
