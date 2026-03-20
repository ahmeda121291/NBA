"use client";

import { useState } from "react";
import { X, ChevronRight, Info } from "lucide-react";
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
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
      >
        <Info className="h-3.5 w-3.5" />
        Why this projection?
        <ChevronRight className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-text-muted hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {confidence !== undefined && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-text-muted">Confidence:</span>
                <span
                  className={cn(
                    "font-stat text-xs font-medium",
                    confidence >= 0.7
                      ? "text-emerald-400"
                      : confidence >= 0.5
                        ? "text-amber-400"
                        : "text-rose-400"
                  )}
                >
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            )}

            <div className="mt-4 space-y-3 text-sm leading-relaxed text-text-secondary">
              {body.split("\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {factors && Object.keys(factors).length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-text-primary">Key Factors</h4>
                <div className="mt-2 space-y-2">
                  {Object.entries(factors).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                    >
                      <span className="text-xs text-text-secondary">{key}</span>
                      <span className="font-stat text-xs text-text-primary">
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
