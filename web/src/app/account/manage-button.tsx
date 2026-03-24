"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

export function ManageButton() {
  const [loading, setLoading] = useState(false);

  async function handleManage() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleManage}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] hover:border-white/[0.15] text-text-secondary text-sm font-semibold transition-all"
    >
      <CreditCard className="h-4 w-4" />
      {loading ? "Opening portal..." : "Manage Subscription"}
    </button>
  );
}
