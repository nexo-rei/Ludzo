"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
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
const DAY_REWARDS = [2, 3, 5, 7, 10, 15, 25];

declare global {
  interface Window {
    show_11113056?: () => Promise<void>;
  }
}

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
  const bonusProgress = (bonusWatched / BONUS_ADS_REQUIRED) * 100;

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
        showToast(`Streak Day ${currentDay} claimed! +${todayReward} Coins`, "success");
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
      className="rounded-2xl p-4"
      style={{
        background: "var(--card-bg)",
        border: "1px solid rgba(245,158,11,0.15)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flame"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
              <path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" opacity="0.3"/>
              <path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" fill="none" stroke="#F59E0B" strokeWidth="1.5"/>
              <path d="M9 13c0 0 1 2 3 2s3-2 3-2" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">Daily Streak</div>
            <div className="text-[10px]" style={{ color: "#F59E0B" }}>Day {currentDay} / 7</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black font-numeric" style={{ color: "#F59E0B" }}>+{todayReward}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Coins today</div>
        </div>
      </div>

      {/* 7-day dots */}
      <div className="flex gap-1.5 mb-3">
        {DAY_REWARDS.map((reward, i) => {
          const dayNum = i + 1;
          const isPast = dayNum < currentDay;
          const isCurrent = dayNum === currentDay;
          const isFuture = dayNum > currentDay;
          return (
            <motion.div
              key={i}
              className="flex-1 flex flex-col items-center gap-1"
              whileHover={{ scale: 1.05 }}
            >
              <div
                className="w-full h-1.5 rounded-full transition-all duration-300"
                style={{
                  background: isPast
                    ? "#F59E0B"
                    : isCurrent
                    ? alreadyClaimed ? "#10B981" : "#F59E0B"
                    : "rgba(255,255,255,0.06)",
                  boxShadow: (isPast || (isCurrent && alreadyClaimed))
                    ? "0 0 6px rgba(245,158,11,0.4)" : "none",
                  animation: isCurrent && !alreadyClaimed ? "pulse 1.5s ease-in-out infinite" : "none",
                }}
              />
              <span className="text-[9px] font-medium"
                style={{ color: isFuture ? "#475569" : isPast ? "#F59E0B" : isCurrent ? (alreadyClaimed ? "#10B981" : "#F59E0B") : "#94A3B8" }}>
                {reward}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Claimed state */}
      <AnimatePresence mode="wait">
        {alreadyClaimed ? (
          <motion.div
            key="claimed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 p-2.5 rounded-xl"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: "#10B981" }}>
              Claimed! Come back tomorrow for Day {Math.min(currentDay + 1, 7)}
            </span>
          </motion.div>
        ) : (
          <motion.div key="unclaimed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Bonus progress */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[var(--text-muted)]">Bonus ads: {bonusWatched}/{BONUS_ADS_REQUIRED}</span>
              <span className="text-[11px] font-semibold" style={{ color: "#F59E0B" }}>+{todayReward} Coins</span>
            </div>
            <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: "rgba(245,158,11,0.1)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #D97706, #F59E0B, #FCD34D)" }}
                animate={{ width: `${bonusProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
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
                className="flex-1 gap-1"
                style={{
                  background: canClaim
                    ? "linear-gradient(135deg, #D97706, #F59E0B)"
                    : "rgba(245,158,11,0.15)",
                  color: canClaim ? "#0F172A" : "#64748B",
                } as React.CSSProperties}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" />
                </svg>
                Claim
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
