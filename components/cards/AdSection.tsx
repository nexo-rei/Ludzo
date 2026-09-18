"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AdPlayIcon, PlayIcon } from "@/components/ui/DuotoneIcons";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import LudzoCoin from "@/components/ui/LudzoCoin";
import { useI18n } from "@/hooks/useI18n";

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
  const [adStartedAt, setAdStartedAt] = useState<number | null>(null);
  const MIN_VIEW_SECONDS = 10;
  const { userId, refreshWallet } = useApp();
  const { t } = useI18n();
  const limitReached = adsWatchedToday >= dailyLimit;
  const remaining = Math.max(0, dailyLimit - adsWatchedToday);
  const progress = dailyLimit > 0 ? Math.min((adsWatchedToday / dailyLimit) * 100, 100) : 0;

  const handleWatchAd = async () => {
    if (limitReached || loading || !userId) return;
    setLoading(true);
    const startedAt = Date.now();
    setAdStartedAt(startedAt);
    try {
      if (typeof window.show_11113056 !== "function") {
        showToast("Ads unavailable. Please try again later.", "error");
        return;
      }
      await window.show_11113056();
      const res = await fetch("/api/ads/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ ad_type: "normal", started_at: startedAt }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(t("earned_coins_toast", { amount: adReward }), "success");
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
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="reward-card"
    >
      <div className="reward-card-head">
        <div className="flex items-center gap-3 min-w-0">
          <div className="reward-icon ads" aria-hidden="true">
            <AdPlayIcon size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="reward-title">{t("rewarded_ads")}</h3>
            <p className="reward-sub">
              {limitReached ? t("limit_reached") : t("ads_left_today", { remaining })}
            </p>
          </div>
        </div>
        <div className="reward-count font-numeric" style={{ color: "var(--accent)" }}>
          {adsWatchedToday}
          <span>/{dailyLimit}</span>
        </div>
      </div>

      <div className="reward-track" aria-hidden="true">
        <motion.div
          className="reward-track-fill ads"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
      </div>

      <div className="reward-card-foot">
        <span className="reward-payout">
          <LudzoCoin size={15} /> {t("coins_per_ad", { amount: adReward })}
        </span>
        <Button
          variant="primary"
          size="sm"
          loading={loading}
          disabled={limitReached}
          onClick={handleWatchAd}
          className="gap-1.5 shrink-0"
        >
          <PlayIcon size={12} /> {limitReached ? t("done") : t("watch_ad")}
        </Button>
      </div>
    </motion.article>
  );
}
