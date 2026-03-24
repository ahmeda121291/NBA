"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { METRIC_LABELS } from "@/lib/constants";

interface MetricTooltipProps {
  metricKey: string;
  children: React.ReactNode;
  score?: number | null;
  className?: string;
}

export function MetricTooltip({ metricKey, children, score, className }: MetricTooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const info = METRIC_LABELS[metricKey.toLowerCase()];
  if (!info) return <span className={className}>{children}</span>;

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updatePos();
      setShow(true);
    }, 200);
  };
  const handleLeave = () => {
    clearTimeout(timeoutRef.current);
    setShow(false);
  };

  const tooltip = show && pos ? createPortal(
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ top: pos.top, left: pos.left, transform: "translate(-50%, -100%)" }}
    >
      <div
        className="p-3 text-left"
        style={{
          minWidth: 220,
          maxWidth: 280,
          background: "linear-gradient(145deg, rgba(14, 18, 30, 0.98) 0%, rgba(6, 8, 13, 0.96) 100%)",
          border: "1px solid rgba(129, 140, 248, 0.2)",
          borderRadius: "8px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.7), 0 0 20px rgba(99,102,241,0.08)",
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-stat text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            {info.short}
          </span>
          <span className="text-[11px] font-semibold text-text-primary">{info.name}</span>
        </div>
        <p className="text-[10px] leading-relaxed text-text-muted">{info.description}</p>
        {score != null && (
          <div className="mt-2 pt-1.5 border-t border-white/[0.06] flex items-center gap-2">
            <span className="text-[9px] text-text-muted/60 uppercase tracking-wider">Score</span>
            <span className={`font-stat text-sm font-bold ${
              score >= 80 ? "text-emerald-400" :
              score >= 65 ? "text-blue-400" :
              score >= 50 ? "text-amber-400" :
              "text-rose-400"
            }`}>{score.toFixed(0)}</span>
          </div>
        )}
      </div>
      {/* Arrow */}
      <div className="flex justify-center">
        <div
          className="w-2 h-2 rotate-45 -mt-1"
          style={{
            background: "rgba(14, 18, 30, 0.98)",
            border: "1px solid rgba(129, 140, 248, 0.2)",
            borderTop: "none",
            borderLeft: "none",
          }}
        />
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex cursor-help ${className ?? ""}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span className="border-b border-dotted border-current/30">{children}</span>
      {tooltip}
    </span>
  );
}
