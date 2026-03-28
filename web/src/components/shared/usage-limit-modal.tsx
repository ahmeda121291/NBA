"use client";

import { Crown, X } from "lucide-react";

interface UsageLimitModalProps {
  feature: string;
  limit: number;
  onClose: () => void;
}

export function UsageLimitModal({ feature, limit, onClose }: UsageLimitModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#0f1420] border border-white/[0.08] rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
            <Crown className="h-6 w-6 text-amber-400" />
          </div>

          <h3 className="text-lg font-bold text-text-primary mb-2">
            Daily Limit Reached
          </h3>

          <p className="text-sm text-text-muted mb-1">
            Free accounts get <span className="font-bold text-amber-400">{limit}</span> {feature} {limit === 1 ? 'use' : 'uses'} per day.
          </p>

          <p className="text-xs text-text-muted/60 mb-6">
            Upgrade to Pro for unlimited access to all features.
          </p>

          <a
            href="/pricing"
            className="block w-full py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors mb-2"
          >
            Upgrade to Pro — $24.99/mo
          </a>

          <button
            onClick={onClose}
            className="block w-full py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
