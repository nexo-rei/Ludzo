"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Play } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import type { DailyStreak, HomePageStreak } from "@/types";

interface StreakSectionProps {
  streak: DailyStreak | HomePageStreak | null;
  todayReward: number;
  onClaimed?: () => void;
}

const BONUS_ADS_REQUIRED = 3;

const DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

export default function StreakSection({ streak, todayReward, onClaimed }: StreakSectionProps) {
  const { userId, refreshWallet } = useApp();
  const [bonusWatched, setBonusWatched] = useState(0);
  const [loading, setLoading] = useState(false);
  const [watchingBonus, setWatchingBonus] = useState(false);

  const currentDay = streak?.current_day ?? 1;
  const alreadyClaimed = (() => {
    if (!streak?.last_claimed_at) return false;
    const last = new Date(streak.last_claimed_at);
    const now = new Date();
    return (
      last.getUTCFullYear() === now.getUTCFullYear() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCDate() === now.getUTCDate()
    );
  })();

  const canClaim = bonusWatched >= BONUS_ADS_REQUIRED && !alreadyClaimed;

  const handleWatchBonusAd = async () => {
    if (bonusWatched >= BONUS_ADS_REQUIRED || watchingBonus || !userId) return;
    setWatchingBonus(true);
    try {
      const res = await fetch("/api/ads/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ ad_type: "bonus" }),
      });
      const data = await res.json();
      if (data.success) {
        setBonusWatched((prev) => prev + 1);
        if (bonusWatched + 1 >= BONUS_ADS_REQUIRED) {
          showToast("3 bonus ads watched! Claim your streak reward.", "success");
        } else {
          showToast(`Bonus ad ${bonusWatched + 1}/${BONUS_ADS_REQUIRED} watched`, "info");
        }
      } else {
        showToast(data.error ?? "Failed", "error");
      }
    } catch {
      showToast("Connection error", "error");
    } finally {
      setWatchingBonus(false);
    }
  };

  const handleClaimStreak = async () => {
    if (!canClaim || loading || !userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ads/streak", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ bonus_ads_watched: bonusWatched }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Streak Day ${currentDay} claimed! +${todayReward} Coins 🔥`, "success");
        setBonusWatched(0);
        await refreshWallet();
        onClaimed?.();
      } else {
        showToast(data.error ?? "Failed to claim streak", "error");
      }
    } catch {
      showToast("Connection error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-[#F59E0B]" />
          <span className="text-sm font-bold text-[var(--text-primary)]">Daily Streak</span>
        </div>
        <span className="font-numeric text-xs font-semibold text-[#F59E0B]">
          Day {currentDay}/7
        </span>
      </div>

      {/* Day progress dots */}
      <div className="flex gap-1.5 mb-3">
        {DAY_LABELS.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              i < currentDay - 1
                ? "bg-[#F59E0B]"
                : i === currentDay - 1
                ? alreadyClaimed ? "bg-[#10B981]" : "bg-[#F59E0B] animate-pulse"
                : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>

      {alreadyClaimed ? (
        <p className="text-xs text-[#10B981] font-medium">
          ✅ Streak claimed today! Come back tomorrow for Day {Math.min(currentDay + 1, 7)}.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)]">
              Bonus ads: {bonusWatched}/{BONUS_ADS_REQUIRED}
            </span>
            <span className="text-xs text-[#F59E0B] font-semibold">+{todayReward} Coins</span>
          </div>

          <ProgressBar
            value={bonusWatched}
            max={BONUS_ADS_REQUIRED}
            color="#F59E0B"
            className="mb-3"
          />

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={watchingBonus}
              disabled={bonusWatched >= BONUS_ADS_REQUIRED}
              onClick={handleWatchBonusAd}
              className="flex-1 gap-1"
            >
              <Play size={12} /> Bonus Ad
            </Button>
            <Button
              size="sm"
              loading={loading}
              disabled={!canClaim}
              onClick={handleClaimStreak}
              className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-white gap-1"
            >
              <Flame size={12} /> Claim
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
