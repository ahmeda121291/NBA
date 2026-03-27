"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Activity, Flame, Shield, Target, BarChart3, Zap } from "lucide-react";

interface TourStep {
  title: string;
  content: string;
  icon: React.ReactNode;
  highlight?: string; // CSS selector to highlight (not used in modal mode)
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to CourtVision",
    content: "The most advanced NBA analytics platform. We use proprietary metrics that go beyond box scores to tell you who's actually impactful, who's trending, and who's going to win tonight.",
    icon: <Sparkles className="h-5 w-5 text-indigo-400" />,
  },
  {
    title: "BIS — Baseline Impact Score",
    content: "Our flagship metric. BIS measures a player's total per-game value blending offense, defense, efficiency, and impact — all normalized to a 0-99 scale. 99 = best in the league. Think of it as one number that tells you how good a player truly is.",
    icon: <Activity className="h-5 w-5 text-indigo-400" />,
  },
  {
    title: "LFI — Live Form Index",
    content: "Is this player hot or cold RIGHT NOW? LFI compares recent performance (last 5-10 games) against their season baseline. A player with BIS 70 but LFI 95 is playing way above their usual level. Great for spotting breakouts and slumps before anyone else.",
    icon: <Flame className="h-5 w-5 text-amber-400" />,
  },
  {
    title: "DRS — Defensive Reality Score",
    content: "Defense that goes beyond blocks and steals. DRS uses opponent shooting % when defended, contested shots, deflections, defensive load, and on/off court impact. A player who makes opponents afraid to shoot at them scores higher than a block chaser.",
    icon: <Shield className="h-5 w-5 text-emerald-400" />,
  },
  {
    title: "OIQ — Offensive Impact Quotient",
    content: "How much offensive firepower does this player bring? OIQ weighs scoring efficiency (TS%), usage rate relative to position, volume bonuses for high-PPG scorers, and assist creation. Stars who score 25+ on good efficiency get rewarded.",
    icon: <Target className="h-5 w-5 text-rose-400" />,
  },
  {
    title: "Game Projections",
    content: "Every game gets a CourtVision projection powered by Elo ratings, rolling efficiency, injuries, head-to-head matchup history, rest days, and our custom metrics. We're hitting 65%+ accuracy this season — check the tracker on the dashboard.",
    icon: <BarChart3 className="h-5 w-5 text-indigo-400" />,
  },
  {
    title: "Studio — Create Viral Charts",
    content: "Build shareable scatter plots, tier lists, Top 10 rankings, and comparison cards. Every chart is watermarked and downloadable as PNG for Twitter/Instagram. Pick a template, select your data, and download in seconds.",
    icon: <Zap className="h-5 w-5 text-amber-400" />,
  },
];

const TOUR_KEY = "courtvision_tour_completed";

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Only show tour if user hasn't completed it
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      // Slight delay so page renders first
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(TOUR_KEY, "true");
  };

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg bg-[#0d1117] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="h-1 bg-white/[0.04]">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <div className="flex items-center gap-2.5">
              {currentStep.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/50">
                Step {step + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="text-text-muted/40 hover:text-text-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-4">
            <h2 className="text-xl font-bold text-text-primary mb-3">
              {currentStep.title}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {currentStep.content}
            </p>
          </div>

          {/* Score visualization for metric steps */}
          {step >= 1 && step <= 4 && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex gap-1">
                  {[0, 20, 40, 60, 80, 99].map((val) => (
                    <div key={val} className="text-center">
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold font-stat ${
                          val >= 80
                            ? "bg-emerald-500/20 text-emerald-400"
                            : val >= 65
                            ? "bg-indigo-500/20 text-indigo-400"
                            : val >= 50
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-white/[0.04] text-text-muted/50"
                        }`}
                      >
                        {val}
                      </div>
                      <span className="text-[8px] text-text-muted/30 mt-0.5 block">
                        {val >= 80
                          ? "Elite"
                          : val >= 65
                          ? "Great"
                          : val >= 50
                          ? "Good"
                          : val >= 35
                          ? "Avg"
                          : "Low"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.04]">
            <button
              onClick={handleSkip}
              className="text-[11px] text-text-muted/40 hover:text-text-muted transition-colors"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-text-muted/60 hover:text-text-primary transition-colors rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 text-[11px] font-semibold text-white bg-indigo-500 hover:bg-indigo-400 transition-colors rounded-lg"
              >
                {isLast ? "Get Started" : "Next"}
                {!isLast && <ChevronRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Button to manually restart the tour */
export function TourRestartButton() {
  return (
    <button
      onClick={() => {
        localStorage.removeItem(TOUR_KEY);
        window.location.reload();
      }}
      className="text-[10px] text-text-muted/40 hover:text-indigo-400 transition-colors"
    >
      Restart Tour
    </button>
  );
}
