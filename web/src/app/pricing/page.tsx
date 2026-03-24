import { GlassCard } from "@/components/ui/glass-card";
import { auth } from "@/lib/auth";
import { PLANS } from "@/lib/stripe";
import { Check, Zap, Crown } from "lucide-react";
import { UpgradeButton } from "./upgrade-button";

export default async function PricingPage() {
  const session = await auth();
  const isPro = (session?.user as any)?.isPro === true;
  const isSignedIn = !!session?.user;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight gradient-text mb-3">
          Unlock the Full Court
        </h1>
        <p className="text-text-muted text-lg max-w-xl mx-auto">
          Get the edge with advanced analytics, live projections, and AI-powered scouting reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <GlassCard className="p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-text-muted" />
            <h2 className="text-xl font-bold text-text-primary">{PLANS.free.name}</h2>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-bold font-stat text-text-primary">$0</span>
            <span className="text-text-muted/60 ml-1">/month</span>
          </div>
          <ul className="space-y-3 mb-6">
            {PLANS.free.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                <Check className="h-4 w-4 text-text-muted/40 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          {!isSignedIn ? (
            <a
              href="/auth/signin"
              className="block w-full text-center py-2.5 rounded-lg border border-white/[0.08] text-text-muted hover:text-text-primary hover:border-white/[0.15] transition-all text-sm font-semibold"
            >
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
          <div className="mb-6">
            <span className="text-4xl font-bold font-stat text-indigo-400">${PLANS.pro.price}</span>
            <span className="text-text-muted/60 ml-1">/month</span>
          </div>
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
            <a
              href="/auth/signin"
              className="block w-full text-center py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors text-sm font-semibold"
            >
              Sign Up & Subscribe
            </a>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
