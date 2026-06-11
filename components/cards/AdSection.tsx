"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Zap } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
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

export default function AdSection({
  adsWatchedToday,
  dailyLimit,
  adReward,
  onAdWatched,
}: AdSectionProps) {
  const [loading, setLoading] = useState(false);
  const { userId, refreshWallet } = useApp();
  const limitReached = adsWatchedToday >= dailyLimit;
  const remaining = Math.max(0, dailyLimit - adsWatchedToday);

  const handleWatchAd = async () => {
  if (limitReached || loading || !userId) return;

  setLoading(true);

  try {
    if (typeof window.show_11113056 !== "function") {
      showToast("Ads unavailable. Please try again later.", "error");
      return;
    }

    // Wait for rewarded interstitial completion
    //rebuild
    await window.show_11113056();

    const res = await fetch("/api/ads/reward", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        ad_type: "normal",
      }),
    });

    const data = await res.json();

    if (data.success) {
      showToast(`+${adReward} Coins earned! 🪙`, "success");
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
      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[#7C3AED]" />
          <span className="text-sm font-bold text-[var(--text-primary)]">Rewarded Ads</span>
        </div>
        <span className="font-numeric text-xs text-[var(--text-secondary)]">
          {adsWatchedToday}/{dailyLimit}
        </span>
      </div>

      <ProgressBar value={adsWatchedToday} max={dailyLimit} className="mb-3" />

      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-[var(--text-muted)]">
            {limitReached
              ? "Daily limit reached. Come back tomorrow."
              : `${remaining} ads left today · +${adReward} Coins each`}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          loading={loading}
          disabled={limitReached}
          onClick={handleWatchAd}
          className="gap-1.5 shrink-0"
        >
          <Play size={12} /> Watch Ad
        </Button>
      </div>
    </motion.div>
  );
}
