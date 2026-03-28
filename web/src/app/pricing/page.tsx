import type { Metadata } from "next";
import { GlassCard } from "@/components/ui/glass-card";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pricing | CourtVision AI",
  description:
    "Unlock advanced NBA analytics, AI projections, and player intelligence. Free and Pro plans available.",
  openGraph: {
    title: "Pricing | CourtVision AI",
    description:
      "Unlock advanced NBA analytics, AI projections, and player intelligence. Free and Pro plans available.",
    siteName: "CourtVision AI",
    url: "https://courtvisionai.io/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | CourtVision AI",
    description:
      "Unlock advanced NBA analytics, AI projections, and player intelligence. Free and Pro plans available.",
  },
};
import { PLANS } from "@/lib/stripe";
import { Check, X, Zap, Crown, Shield, HelpCircle } from "lucide-react";
import { UpgradeButton } from "./upgrade-button";

const COMPARISON_ROWS = [
  { feature: "Team Standings & Records", free: true, pro: true },
  { feature: "Basic Player Stats (PPG, RPG, APG)", free: true, pro: true },
  { feature: "Game Scores & Results", free: true, pro: true },
  { feature: "CourtVision BIS Score", free: "Top 10 only", pro: true },
  { feature: "Live Form Index (LFI)", free: false, pro: true },
  { feature: "Defensive Reality Score (DRS)", free: false, pro: true },
  { feature: "Offensive Impact (OIQ) & Playmaking (PEM)", free: false, pro: true },
  { feature: "Game Projections with Win Probability", free: "Win/Loss only", pro: true },
  { feature: "Score Ranges & Confidence Levels", free: false, pro: true },
  { feature: "Player Opponent Splits (H2H)", free: false, pro: true },
  { feature: "AI Scouting Reports", free: false, pro: true },
  { feature: "Studio — Shareable Charts & Visuals", free: "1 per day", pro: true },
  { feature: "Performance Trend Charts", free: false, pro: true },
  { feature: "Contract Value (VFM) Analysis", free: false, pro: true },
];

const FAQ = [
  {
    q: "What makes CourtVision different from other NBA stats sites?",
    a: "We go beyond box scores with proprietary metrics like BIS (overall impact), DRS (real defensive data from contested shots, deflections, and opponent shooting), and LFI (live momentum tracking). Our game projections hit 65%+ accuracy using Elo, efficiency models, injury data, and head-to-head matchups.",
  },
  {
    q: "How often is data updated?",
    a: "Player and team stats update daily. Live game scores update every 60 seconds during games. Projections recompute after each game finishes with fresh Elo ratings and rolling averages.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel anytime from your account page. You'll keep Pro access until the end of your billing period. No long-term contracts.",
  },
  {
    q: "How does the free plan work?",
    a: "The free plan gives you permanent access to standings, basic stats, and game results. When you're ready for advanced metrics, AI projections, and full player intelligence, upgrade to Pro — it's instant access, cancel anytime.",
  },
];

export default async function PricingPage() {
  const session = await auth();
  const isPro = (session?.user as any)?.isPro === true;
  const isSignedIn = !!session?.user;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight gradient-text mb-3">
          Unlock the Full Court
        </h1>
        <p className="text-text-muted text-lg max-w-xl mx-auto">
          Advanced analytics, live projections, and AI-powered scouting reports trusted by basketball analysts.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <GlassCard className="p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-text-muted" />
            <h2 className="text-xl font-bold text-text-primary">{PLANS.free.name}</h2>
          </div>
          <div className="mb-2">
            <span className="text-4xl font-bold font-stat text-text-primary">$0</span>
            <span className="text-text-muted/60 ml-1">/forever</span>
          </div>
          <p className="text-[12px] text-text-muted/50 mb-6">Perfect for casual fans who want standings and basic stats.</p>
          <ul className="space-y-3 mb-6">
            {PLANS.free.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                <Check className="h-4 w-4 text-text-muted/40 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          {!isSignedIn ? (
            <a href="/auth/signin" className="block w-full text-center py-2.5 rounded-lg border border-white/[0.08] text-text-muted hover:text-text-primary hover:border-white/[0.15] transition-all text-sm font-semibold">
              Sign Up Free
            </a>
          ) : (
            <div className="w-full text-center py-2.5 rounded-lg border border-white/[0.06] text-text-muted/40 text-sm">
              {isPro ? "Included in Pro" : "Current Plan"}
            </div>
          )}
        </GlassCard>

        {/* Pro Plan */}
        <GlassCard variant="accent" className="p-6 relative ring-1 ring-indigo-500/30">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Most Popular
            </span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-text-primary">{PLANS.pro.name}</h2>
          </div>
          <div className="mb-2">
            <span className="text-4xl font-bold font-stat text-indigo-400">${PLANS.pro.price}</span>
            <span className="text-text-muted/60 ml-1">/month</span>
          </div>
          <p className="text-[12px] text-text-muted/50 mb-6">For analysts, writers, bettors, and serious basketball minds.</p>
          <ul className="space-y-3 mb-6">
            {PLANS.pro.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          {isPro ? (
            <div className="w-full text-center py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold">
              Current Plan
            </div>
          ) : isSignedIn ? (
            <UpgradeButton />
          ) : (
            <a href="/auth/signin" className="block w-full text-center py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors text-sm font-semibold">
              Start Pro — $24.99/mo
            </a>
          )}
        </GlassCard>
      </div>

      {/* Feature Comparison Table */}
      <GlassCard hover={false} padding="sm">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-lg font-bold text-text-primary">Feature Comparison</h2>
          <p className="text-[11px] text-text-muted/50 mt-0.5">Everything included in each plan</p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_100px] px-4 py-2.5 border-b border-white/[0.06] text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">
              <span>Feature</span>
              <span className="text-center">Free</span>
              <span className="text-center text-indigo-400/70">Pro</span>
            </div>
            {/* Rows */}
            {COMPARISON_ROWS.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_100px] px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                <span className="text-[12px] text-text-secondary">{row.feature}</span>
                <span className="text-center">
                  {row.free === true ? (
                    <Check className="h-3.5 w-3.5 text-text-muted/40 mx-auto" />
                  ) : row.free === false ? (
                    <X className="h-3.5 w-3.5 text-text-muted/20 mx-auto" />
                  ) : (
                    <span className="text-[10px] text-amber-400/60">{row.free}</span>
                  )}
                </span>
                <span className="text-center">
                  <Check className="h-3.5 w-3.5 text-indigo-400 mx-auto" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Social Proof */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-indigo-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted/60">Trusted Analytics</span>
        </div>
        <p className="text-sm text-text-muted/50 max-w-lg mx-auto">
          65%+ game prediction accuracy this season. Proprietary defensive metrics using NBA hustle stats, opponent shooting data, and real matchup analysis — not just blocks and steals.
        </p>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQ.map((faq, i) => (
            <GlassCard key={i} className="p-4">
              <div className="flex items-start gap-2 mb-2">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-400/60 shrink-0 mt-0.5" />
                <h3 className="text-[13px] font-semibold text-text-primary">{faq.q}</h3>
              </div>
              <p className="text-[12px] text-text-muted/70 leading-relaxed pl-5">{faq.a}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
