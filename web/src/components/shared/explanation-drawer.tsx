"use client";

import { useState } from "react";
import { X, ChevronRight, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExplanationDrawerProps {
  title: string;
  body: string;
  factors?: Record<string, unknown>;
  confidence?: number;
}

export function ExplanationDrawer({
  title,
  body,
  factors,
  confidence,
}: ExplanationDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-1.5 btn-glass rounded-xl px-3.5 py-2 text-xs font-medium text-text-secondary"
      >
        <Sparkles className="h-3.5 w-3.5 text-blue-400 group-hover:text-blue-300 transition-colors" />
        Why this projection?
        <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto glass border-l border-white/[0.06] p-6 shadow-2xl animate-slide-in-right">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/20">
                  <Info className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">{title}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {confidence !== undefined && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-text-muted">Model confidence</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 animate-bar-fill",
                      confidence >= 0.7
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : confidence >= 0.5
                          ? "bg-gradient-to-r from-amber-500 to-amber-400"
                          : "bg-gradient-to-r from-rose-500 to-rose-400"
                    )}
                    style={{ width: `${Math.round(confidence * 100)}%` }}
                  />
                </div>
                <span className={cn(
                  "font-stat text-xs font-bold",
                  confidence >= 0.7 ? "text-emerald-400" : confidence >= 0.5 ? "text-amber-400" : "text-rose-400"
                )}>
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            )}

            <div className="mt-5 space-y-3 text-[13px] leading-relaxed text-text-secondary">
              {body.split("\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {factors && Object.keys(factors).length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
                  Key Factors
                </h4>
                <div className="space-y-1.5 stagger-children">
                  {Object.entries(factors).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl glass-card px-3.5 py-2.5"
                    >
                      <span className="text-xs text-text-secondary">{key}</span>
                      <span className="font-stat text-xs font-bold text-text-primary">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
