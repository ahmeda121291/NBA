import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
