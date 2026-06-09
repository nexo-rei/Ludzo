import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Play, Gift, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DailyStreak, AdStatus } from '@/types/types';

const STREAK_REWARDS = [0, 2, 3, 4, 5, 6, 8, 10];

interface DailyStreakCardProps {
  streak: DailyStreak | null;
  adStatus: AdStatus | null;
  onWatchBonusAd: () => Promise<void>;
  onClaimStreak: () => Promise<void>;
}

export default function DailyStreakCard({ streak, adStatus, onWatchBonusAd, onClaimStreak }: DailyStreakCardProps) {
  const [loading, setLoading] = useState(false);
  const currentDay = streak?.current_day ?? 1;
  const bonusAds = adStatus?.bonus_ads_today ?? 0;
  const canClaim = adStatus?.can_claim_streak ?? false;
  const todayReward = STREAK_REWARDS[currentDay] ?? 2;

  const handleBonusAd = async () => {
    if (loading) return;
    setLoading(true);
    try { await onWatchBonusAd(); } finally { setLoading(false); }
  };

  const handleClaim = async () => {
    if (loading) return;
    setLoading(true);
    try { await onClaimStreak(); } finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
            <Flame className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Daily Streak</h3>
            <p className="text-xs text-muted-foreground">Day {currentDay}/7 • +{todayReward} Coins</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-foreground">{bonusAds}/3</div>
          <p className="text-xs text-muted-foreground">bonus ads</p>
        </div>
      </div>

      {/* Day indicators */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map(day => {
          const isPast = day < currentDay;
          const isCurrent = day === currentDay;
          return (
            <div
              key={day}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-xs
                ${isCurrent ? 'bg-primary/15 border border-primary' : isPast ? 'bg-muted' : 'bg-muted/50'}`}
            >
              {isPast ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <span className={`font-bold ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{STREAK_REWARDS[day]}</span>
              )}
              <span className={`text-[10px] ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>D{day}</span>
            </div>
          );
        })}
      </div>

      {/* Bonus ads progress */}
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-colors ${i < bonusAds ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {/* Action button */}
      <motion.div whileTap={{ scale: 0.98 }}>
        {canClaim ? (
          <Button className="w-full h-11 font-semibold gap-2 bg-warning hover:bg-warning/90 text-warning-foreground" onClick={handleClaim} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            Claim +{todayReward} Coins
          </Button>
        ) : (
          <Button variant="outline" className="w-full h-11 font-semibold gap-2" onClick={handleBonusAd} disabled={loading || bonusAds >= 3}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {bonusAds >= 3 ? 'Already Watched 3 Ads' : `Watch Bonus Ad (${bonusAds}/3)`}
          </Button>
        )}
      </motion.div>
    </div>
  );
}
