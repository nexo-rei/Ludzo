import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getAdStatus, getLeaderboard, getAnnouncements, getTransactionHistory, rewardAd, rewardBonusAd, claimStreak, getDailyStreak } from '@/services/api';
import type { AdStatus, DailyStreak, Transaction, LeaderboardEntry, Announcement } from '@/types/types';
import BalanceCards from '@/components/home/BalanceCards';
import WatchAdsCard from '@/components/home/WatchAdsCard';
import DailyStreakCard from '@/components/home/DailyStreakCard';
import ActivityFeed from '@/components/home/ActivityFeed';
import LeaderboardPreview from '@/components/home/LeaderboardPreview';
import AnnouncementBanner from '@/components/home/AnnouncementBanner';
import { Skeleton } from '@/components/ui/skeleton';
import LudzoLogo from '@/components/common/LudzoLogo';
import { Bell } from 'lucide-react';

declare global {
  interface Window {
    show_11113056?: () => Promise<void>;
  }
}

export default function HomePage() {
  const { user, wallet, refreshWallet } = useAuth();
  const navigate = useNavigate();

  const [adStatus, setAdStatus] = useState<AdStatus | null>(null);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [ads, str, txs, lb, ann] = await Promise.all([
        getAdStatus(user.id),
        getDailyStreak(user.id),
        getTransactionHistory(user.id),
        getLeaderboard(),
        getAnnouncements(),
      ]);
      setAdStatus(ads);
      setStreak(str);
      setTransactions(txs);
      setLeaderboard(lb);
      setAnnouncements(ann);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleWatchAd = useCallback(async () => {
    if (!user) return;
    try {
      if (typeof window.show_11113056 === 'function') {
        await window.show_11113056();
      }
      const result = await rewardAd(user.id);
      if (result.success) {
        toast.success(result.message, { icon: '🪙' });
        await Promise.all([refreshWallet(), loadData()]);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Ad failed. Please try again.');
    }
  }, [user, refreshWallet, loadData]);

  const handleBonusAd = useCallback(async () => {
    if (!user) return;
    try {
      if (typeof window.show_11113056 === 'function') {
        await window.show_11113056();
      }
      const result = await rewardBonusAd(user.id);
      if (result.success) {
        toast.success('Bonus ad counted!', { icon: '🔥' });
        await loadData();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Ad failed. Please try again.');
    }
  }, [user, loadData]);

  const handleClaimStreak = useCallback(async () => {
    if (!user) return;
    const result = await claimStreak(user.id);
    if (result.success) {
      toast.success(result.message, { icon: '🎁' });
      await Promise.all([refreshWallet(), loadData()]);
    } else {
      toast.error(result.message);
    }
  }, [user, refreshWallet, loadData]);

  const handleDismiss = (id: string) => {
    setDismissed(prev => [...prev, id]);
  };

  const visibleAnnouncements = announcements.filter(a => !dismissed.includes(a.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <LudzoLogo size={28} />
            <span className="font-bold text-lg gradient-text tracking-wider">LUDZO</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="text-right">
                <p className="text-xs font-medium text-foreground">
                  {user.first_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.username ? `@${user.username}` : `#${user.telegram_id}`}
                </p>
              </div>
            )}
            {user?.photo_url ? (
              <img src={user.photo_url} alt={user.first_name} className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {user?.first_name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-4">
        {/* Announcements */}
        {visibleAnnouncements.map(a => (
          <AnnouncementBanner key={a.id} announcement={a} onDismiss={handleDismiss} />
        ))}

        {/* Balance Cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          ) : (
            <BalanceCards
              coinsBalance={wallet?.coins_balance ?? 0}
              usdtBalance={wallet?.usdt_balance ?? 0}
            />
          )}
        </motion.div>

        {/* Watch Ads */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {loading ? <Skeleton className="h-32 rounded-2xl" /> : (
            <WatchAdsCard
              adStatus={adStatus}
              onWatchAd={handleWatchAd}
            />
          )}
        </motion.div>

        {/* Daily Streak */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {loading ? <Skeleton className="h-40 rounded-2xl" /> : (
            <DailyStreakCard
              streak={streak}
              adStatus={adStatus}
              onWatchBonusAd={handleBonusAd}
              onClaimStreak={handleClaimStreak}
            />
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
              <button onClick={() => navigate('/transactions')} className="text-xs text-primary font-medium">
                View All
              </button>
            </div>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : (
              <ActivityFeed transactions={transactions} />
            )}
          </div>
        </motion.div>

        {/* Leaderboard Preview */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          {loading ? <Skeleton className="h-40 rounded-2xl" /> : (
            <LeaderboardPreview entries={leaderboard} onViewAll={() => navigate('/leaderboard')} />
          )}
        </motion.div>

        {/* Bottom padding for notification bell */}
        <div className="h-4" />
      </div>
    </div>
  );
}
