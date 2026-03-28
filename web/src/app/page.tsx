import Link from "next/link";
import {
  Activity,
  Star,
  Flame,
  Shield,
  Brain,
  Target,
  Zap,
  BarChart3,
  GitCompare,
  Radio,
  ArrowRight,
  ChevronRight,
  Crown,
  BookOpen,
  LogIn,
} from "lucide-react";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: Star,
    title: "BIS Scores",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    description:
      "Proprietary player impact scores that go beyond box stats \u2014 measuring offense, defense, form, and clutch performance in one number.",
  },
  {
    icon: BarChart3,
    title: "Game Projections",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    description:
      "AI-powered game predictions with win probability, projected scores, confidence levels, and upset risk alerts. 65%+ season accuracy.",
  },
  {
    icon: GitCompare,
    title: "H2H Compare",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    description:
      "Deep head-to-head player analysis with 6-metric battle system, form trends, and AI-generated analytical verdicts.",
  },
  {
    icon: Radio,
    title: "Live Intelligence",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
    description:
      "Real-time scores, trending players, momentum shifts, and daily picks \u2014 all updated automatically.",
  },
];

const metrics = [
  { abbr: "BIS", emoji: "\u2b50", label: "Overall Impact", color: "text-indigo-400", description: "Composite score combining all facets of player performance into a single rating" },
  { abbr: "LFI", emoji: "\ud83d\udd25", label: "Live Form", color: "text-emerald-400", description: "Recent performance trajectory measuring hot and cold streaks" },
  { abbr: "DRS", emoji: "\ud83d\udee1\ufe0f", label: "Defense", color: "text-sky-400", description: "Defensive rating capturing rim protection, steals, contests, and team impact" },
  { abbr: "OIQ", emoji: "\ud83e\udde0", label: "Offense", color: "text-amber-400", description: "Offensive intelligence quantifying scoring efficiency and shot creation" },
  { abbr: "PEM", emoji: "\ud83c\udfaf", label: "Playmaking", color: "text-violet-400", description: "Playmaking effectiveness measuring assists, ball handling, and court vision" },
  { abbr: "GOI", emoji: "\u26a1", label: "Clutch", color: "text-rose-400", description: "Game outcome influence in high-leverage moments and close-game performance" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-indigo-500/[0.07] blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 h-[300px] w-[400px] rounded-full bg-violet-500/[0.05] blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 h-[250px] w-[350px] rounded-full bg-emerald-500/[0.04] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center px-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 mb-8">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
              2025-26 Season Live
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="gradient-text">See the Game</span>
            <br />
            <span className="text-text-primary">Before It Happens</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-text-muted leading-relaxed mb-10">
            AI-powered NBA analytics with proprietary metrics, live projections, and player intelligence trusted by serious basketball minds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signin"
              className="group flex items-center gap-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white px-7 py-3.5 text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-400/30"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pricing"
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] hover:border-white/[0.15] bg-white/[0.03] hover:bg-white/[0.05] text-text-primary px-7 py-3.5 text-sm font-semibold transition-all duration-200"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 sm:py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-3">
              Platform Features
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
              Intelligence at Every Level
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.10] hover:bg-white/[0.03] transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: "radial-gradient(400px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(99,102,241,0.04), transparent)" }}
                />
                <div className="relative">
                  <div className={`inline-flex items-center justify-center h-10 w-10 rounded-lg ${feature.bgColor} border ${feature.borderColor} mb-4`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <h3 className="text-[15px] font-bold text-text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[13px] text-text-muted leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics Showcase */}
      <section className="py-16 sm:py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">
              Proprietary Metrics
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
              6 Dimensions of Player Intelligence
            </h2>
            <p className="text-sm text-text-muted max-w-xl mx-auto">
              Our metrics engine goes beyond traditional box scores to quantify what actually wins games \u2014 from clutch performance to defensive impact.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metrics.map((metric) => (
              <div
                key={metric.abbr}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.10] transition-all duration-300"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-lg">{metric.emoji}</span>
                  <div>
                    <span className={`font-stat text-sm font-bold ${metric.color}`}>
                      {metric.abbr}
                    </span>
                    <p className="text-[10px] text-text-muted/60">{metric.label}</p>
                  </div>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  {metric.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-16 sm:py-20 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            {/* Background glow */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[500px] rounded-full bg-indigo-500/[0.06] blur-[80px]" />
            </div>

            <div className="relative p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
                Ready to see the full court?
              </h2>
              <p className="text-sm text-text-muted mb-8 max-w-md mx-auto">
                From casual fans to analytics pros \u2014 choose the plan that fits your game.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto text-left">
                {/* Free tier */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-text-muted" />
                    <span className="text-sm font-bold text-text-primary">Free</span>
                  </div>
                  <ul className="space-y-1.5">
                    <li className="text-[11px] text-text-muted flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-text-muted/40 shrink-0" />
                      Basic player stats and scores
                    </li>
                    <li className="text-[11px] text-text-muted flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-text-muted/40 shrink-0" />
                      Daily game projections
                    </li>
                    <li className="text-[11px] text-text-muted flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-text-muted/40 shrink-0" />
                      Team rankings
                    </li>
                  </ul>
                </div>

                {/* Pro tier */}
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-bold text-text-primary">Pro</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                      Popular
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    <li className="text-[11px] text-text-muted flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-indigo-400/40 shrink-0" />
                      Full 6-metric player profiles
                    </li>
                    <li className="text-[11px] text-text-muted flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-indigo-400/40 shrink-0" />
                      H2H compare + AI verdicts
                    </li>
                    <li className="text-[11px] text-text-muted flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-indigo-400/40 shrink-0" />
                      Studio + shareable exports
                    </li>
                  </ul>
                </div>
              </div>

              <Link
                href="/pricing"
                className="group inline-flex items-center gap-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white px-7 py-3 text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-400/30"
              >
                View Plans
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-4 mt-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-sm font-bold text-text-primary tracking-tight">
              courtvisionai.io
            </span>
          </div>

          <nav className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-[12px] text-text-muted hover:text-indigo-400 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/methodology"
              className="text-[12px] text-text-muted hover:text-indigo-400 transition-colors"
            >
              Methodology
            </Link>
            <Link
              href="/auth/signin"
              className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-indigo-400 transition-colors"
            >
              <LogIn className="h-3 w-3" />
              Sign In
            </Link>
          </nav>
        </div>

        <div className="text-center mt-6">
          <span className="text-[10px] text-text-muted/30">
            CourtVision NBA Intelligence Platform
          </span>
        </div>
      </footer>
    </div>
  );
}
