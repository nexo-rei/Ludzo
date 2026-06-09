import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { AdStatus } from '@/types/types';

interface WatchAdsCardProps {
  adStatus: AdStatus | null;
  onWatchAd: () => Promise<void>;
  loading?: boolean;
}

export default function WatchAdsCard({ adStatus, onWatchAd, loading }: WatchAdsCardProps) {
  const [watching, setWatching] = useState(false);

  const handleWatch = async () => {
    if (watching || !adStatus?.can_watch) return;
    setWatching(true);
    try {
      await onWatchAd();
    } finally {
      setWatching(false);
    }
  };

  const percent = adStatus ? (adStatus.ads_today / adStatus.daily_limit) * 100 : 0;

  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Watch Ads</h3>
          <p className="text-xs text-muted-foreground">Earn 2 Coins per ad</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-foreground tabular-nums">
            {adStatus?.ads_today ?? 0}
          </span>
          <span className="text-sm text-muted-foreground">
            /{adStatus?.daily_limit ?? 15}
          </span>
          <p className="text-xs text-muted-foreground">today</p>
        </div>
      </div>

      <Progress value={percent} className="h-2" />

      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          className="w-full h-11 font-semibold gap-2"
          onClick={handleWatch}
          disabled={watching || loading || !adStatus?.can_watch}
        >
          {watching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          {adStatus?.can_watch ? 'Watch Ad & Earn 2 Coins' : 'Daily Limit Reached'}
        </Button>
      </motion.div>
    </div>
  );
}
