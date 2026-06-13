"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";

interface AdSectionProps {
  adsWatchedToday: number;
  dailyLimit: number;
  adReward: number;
  onAdWatched?: () => void;
}

declare global {
  interface Window {
    show_11113056?: () => Promise<void>;
  }
}

export default function AdSection({ adsWatchedToday, dailyLimit, adReward, onAdWatched }: AdSectionProps) {
  const [loading, setLoading] = useState(false);
  const { userId, refreshWallet } = useApp();
  const limitReached = adsWatchedToday >= dailyLimit;
  const remaining = Math.max(0, dailyLimit - adsWatchedToday);
  const progress = Math.min((adsWatchedToday / dailyLimit) * 100, 100);

  const handleWatchAd = async () => {
    if (limitReached || loading || !userId) return;
    setLoading(true);
    try {
      if (typeof window.show_11113056 !== "function") {
        showToast("Ads unavailable. Please try again later.", "error");
        return;
      }
      await window.show_11113056();
      const res = await fetch("/api/ads/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ ad_type: "normal" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`+${adReward} Coins earned!`, "success");
        await refreshWallet();
        onAdWatched?.();
      } else {
        showToast(data.error ?? "Failed to reward ad", "error");
      }
    } catch (err) {
      console.error("Monetag error:", err);
      showToast("Ad closed or failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl p-4"
      style={{
        background: "var(--card-bg)",
        border: "1px solid rgba(59,130,246,0.15)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">Rewarded Ads</div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {limitReached ? "Come back tomorrow" : `${remaining} remaining today`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "#3B82F6" }}>
          <span className="font-numeric">{adsWatchedToday}</span>
          <span className="text-[var(--text-muted)] font-normal">/</span>
          <span className="font-numeric text-[var(--text-muted)] font-normal">{dailyLimit}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: "rgba(59,130,246,0.1)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #3B82F6, #60A5FA)" }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">
          +{adReward} Coins per ad
        </span>
        <Button
          variant="primary"
          size="sm"
          loading={loading}
          disabled={limitReached}
          onClick={handleWatchAd}
          className="gap-1.5 shrink-0"
          style={{ background: limitReached ? "rgba(59,130,246,0.2)" : "linear-gradient(135deg, #3B82F6, #2563EB)" } as React.CSSProperties}
        >
          <Play size={12} /> Watch Ad
        </Button>
      </div>
    </motion.div>
  );
}
