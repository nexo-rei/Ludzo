"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon, PlayIcon, StreakFlameIcon } from "@/components/ui/DuotoneIcons";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import LudzoCoin from "@/components/ui/LudzoCoin";
import type { DailyStreak, HomePageStreak } from "@/types";

interface StreakSectionProps {
  streak: DailyStreak | HomePageStreak | null;
  todayReward: number;
  dayRewards?: number[];
  bonusAdsToday?: number;
  onClaimed?: () => void;
}

const BONUS_ADS_REQUIRED = 3;
const DEFAULT_DAY_REWARDS = [2, 3, 4, 5, 6, 8, 10];

declare global {
  interface Window {
    show_11113056?: () => Promise<void>;
  }
}

export default function StreakSection({
  streak,
  todayReward,
  dayRewards,
  bonusAdsToday = 0,
  onClaimed,
}: StreakSectionProps) {
  const { userId, refreshWallet } = useApp();
  const rewards = dayRewards && dayRewards.length === 7 ? dayRewards : DEFAULT_DAY_REWARDS;
  const [bonusWatched, setBonusWatched] = useState(bonusAdsToday);
  const [loading, setLoading] = useState(false);
  const [watchingBonus, setWatchingBonus] = useState(false);

  useEffect(() => {
    setBonusWatched(bonusAdsToday);
  }, [bonusAdsToday]);

  const nextDayToClaim = streak?.current_day ?? 1;

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

  // After a claim the DB already points at tomorrow's day.
  const displayDay = alreadyClaimed
    ? nextDayToClaim === 1 ? 7 : nextDayToClaim - 1
    : nextDayToClaim;

  const canClaim = bonusWatched >= BONUS_ADS_REQUIRED && !alreadyClaimed;
  const bonusProgress = Math.min((bonusWatched / BONUS_ADS_REQUIRED) * 100, 100);

  const handleWatchBonusAd = async () => {
    if (bonusWatched >= BONUS_ADS_REQUIRED || watchingBonus || !userId) return;
    setWatchingBonus(true);
    try {
      if (typeof window.show_11113056 !== "function") {
        showToast("Ads unavailable. Please try again later.", "error");
        return;
      }
      await window.show_11113056();
      const res = await fetch("/api/ads/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ ad_type: "bonus" }),
      });
      const data = await res.json();
      if (data.success) {
        const next = bonusWatched + 1;
        setBonusWatched(next);
        if (next >= BONUS_ADS_REQUIRED) {
          showToast("3 bonus ads watched! Claim your streak reward.", "success");
        } else {
          showToast(`Bonus ad ${next}/${BONUS_ADS_REQUIRED} watched`, "info");
        }
      } else {
        showToast(data.error ?? "Failed to log bonus ad", "error");
      }
    } catch (err) {
      console.error("Bonus ad error:", err);
      showToast("Ad closed or failed. Please try again.", "error");
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
        showToast(`Streak Day ${displayDay} claimed! +${todayReward} Coins`, "success");
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
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="reward-card"
    >
      <div className="reward-card-head">
        <div className="flex items-center gap-3 min-w-0">
          <div className="reward-icon streak flame" aria-hidden="true">
            <StreakFlameIcon size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="reward-title">Daily streak</h3>
            <p className="reward-sub" style={{ color: alreadyClaimed ? "var(--success-strong)" : "#D97706" }}>
              {alreadyClaimed ? `Day ${displayDay} claimed` : `Day ${displayDay} of 7`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="reward-count font-numeric" style={{ color: "#D97706" }}>
            <LudzoCoin size={14} /> +{alreadyClaimed ? (rewards[displayDay - 1] ?? todayReward) : todayReward}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">{alreadyClaimed ? "earned today" : "coins today"}</div>
        </div>
      </div>

      <div className="streak-days" role="list" aria-label="Seven day streak">
        {rewards.map((reward, i) => {
          const dayNum = i + 1;
          const isDone = alreadyClaimed ? dayNum <= displayDay : dayNum < displayDay;
          const isCurrent = dayNum === displayDay;
          return (
            <div key={dayNum} className="streak-day" role="listitem">
              <div
                className={`streak-pip${isDone ? " is-done" : ""}${isCurrent && !alreadyClaimed ? " is-current" : ""}${isCurrent && alreadyClaimed ? " is-done" : ""}`}
              >
                {isDone || (isCurrent && alreadyClaimed) ? <CheckIcon size={10} /> : dayNum}
              </div>
              <span className="streak-day-reward font-numeric">{reward}</span>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {alreadyClaimed ? (
          <motion.div
            key="claimed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="streak-claimed"
          >
            <CheckIcon size={14} />
            <span>Come back tomorrow for Day {nextDayToClaim}</span>
          </motion.div>
        ) : (
          <motion.div key="unclaimed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[var(--text-muted)]">
                Bonus ads {bonusWatched}/{BONUS_ADS_REQUIRED}
              </span>
              <span className="text-[11px] font-semibold inline-flex items-center gap-1" style={{ color: "#D97706" }}>
                <LudzoCoin size={13} /> +{todayReward}
              </span>
            </div>
            <div className="reward-track" style={{ background: "rgba(217,119,6,0.12)" }}>
              <motion.div
                className="reward-track-fill streak"
                animate={{ width: `${bonusProgress}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="secondary"
                size="sm"
                loading={watchingBonus}
                disabled={bonusWatched >= BONUS_ADS_REQUIRED}
                onClick={handleWatchBonusAd}
                className="flex-1 gap-1"
              >
                <PlayIcon size={12} /> Bonus ad
              </Button>
              <Button
                size="sm"
                loading={loading}
                disabled={!canClaim}
                onClick={handleClaimStreak}
                className="flex-1 gap-1"
                variant="gold"
              >
                <StreakFlameIcon size={13} /> Claim
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
