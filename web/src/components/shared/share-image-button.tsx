"use client";

import { useRef, useState, useCallback, ReactNode } from "react";
import { Download, Check } from "lucide-react";
import { toPng } from "html-to-image";

interface ShareImageButtonProps {
  /** Ref to the DOM node to capture */
  targetRef: React.RefObject<HTMLDivElement | null>;
  /** Filename prefix, e.g. "courtvision-leaderboard" */
  filename?: string;
  /** Optional className for the button */
  className?: string;
  /** Button label */
  label?: string;
  /** Show compact (icon-only) button */
  compact?: boolean;
}

const WATERMARK_URL = "courtvisionai.io";
const BG_COLOR = "#0a0e1a";

export function ShareImageButton({
  targetRef,
  filename = "courtvision",
  className,
  label = "Save as Image",
  compact = false,
}: ShareImageButtonProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!targetRef.current || saving) return;
    setSaving(true);

    // Temporarily inject watermark
    const watermark = document.createElement("div");
    watermark.className = "courtvision-watermark";
    watermark.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 0 8px;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin-top: 12px;
    `;
    watermark.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:rgba(129,140,248,0.6);letter-spacing:0.08em;font-family:system-ui,sans-serif;">
        ⚡ ${WATERMARK_URL}
      </span>
    `;
    targetRef.current.appendChild(watermark);

    try {
      const dataUrl = await toPng(targetRef.current, {
        backgroundColor: BG_COLOR,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `${filename}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to export image:", err);
    } finally {
      // Remove watermark from DOM
      if (targetRef.current?.contains(watermark)) {
        targetRef.current.removeChild(watermark);
      }
      setSaving(false);
    }
  }, [targetRef, filename, saving]);

  if (compact) {
    return (
      <button
        onClick={handleDownload}
        disabled={saving}
        className={`flex items-center justify-center h-7 w-7 rounded-md border border-white/[0.08] text-text-muted hover:text-indigo-400 hover:border-indigo-400/30 transition-all disabled:opacity-40 ${className ?? ""}`}
        title={label}
      >
        {saved ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Download className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={saving}
      className={`flex items-center gap-1.5 text-[10px] text-text-muted hover:text-indigo-400 transition-colors border border-white/[0.08] rounded px-2.5 py-1 disabled:opacity-40 ${className ?? ""}`}
    >
      {saved ? (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400">Saved!</span>
        </>
      ) : (
        <>
          <Download className="h-3 w-3" />
          {saving ? "Saving…" : label}
        </>
      )}
    </button>
  );
}

/**
 * Wrapper that provides a ref and download button for any content.
 * Use this to wrap server-rendered sections that need export capability.
 */
export function ShareImageWrapper({
  children,
  filename = "courtvision",
  label = "Save as Image",
  buttonPosition = "top-right",
  className,
}: {
  children: ReactNode;
  filename?: string;
  label?: string;
  buttonPosition?: "top-right" | "top-left" | "bottom-right";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className={`absolute z-10 ${
        buttonPosition === "top-right" ? "top-2 right-2" :
        buttonPosition === "top-left" ? "top-2 left-2" :
        "bottom-2 right-2"
      }`}>
        <ShareImageButton targetRef={ref} filename={filename} label={label} compact />
      </div>
      <div ref={ref}>
        {children}
      </div>
    </div>
  );
}
