'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { useI18n } from '@/hooks/useI18n';
import WalletCard from '@/components/WalletCard';
import { CoinIcon, TasksIcon, ShareIcon } from '@/components/icons';
import { Watch } from 'lucide-react';

export default function HomePage() {
  const { user, api, shareReferral } = useTelegram();
  const { t } = useI18n();
  const [stats, setStats] = useState({ tasksCompleted: 0, adsWatched: 0, referrals: 0, totalCoinsEarned: 0, gamesPlayed: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState({ totalReferrals: 0, totalCoins: 0, totalCash: 0 });
  const [adStatus, setAdStatus] = useState({ adsWatchedToday: 0, dailyLimit: 15 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [statsRes, txRes, refRes, adRes] = await Promise.all([
        api('/api/users/stats'),
        api('/api/transactions'),
        api('/api/referrals'),
        api('/api/ads/status'),
      ]);
      setStats(statsRes);
      setReferralStats(refRes);
      setAdStatus(adRes);

      // Build activity feed from transactions
      const txs = txRes.transactions?.slice(0, 5) || [];
      setActivities(txs.map((tx: any) => ({
        id: tx.id,
        text: `${tx.type.replace('_', ' ')} +${tx.amount} ${tx.currency}`,
        date: tx.created_at,
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const watchAd = async () => {
    // Monetag integration placeholder - in production, this would show the actual ad
    // and call the reward API on completion callback
    try {
      const res = await api('/api/ads/reward', { method: 'POST' });
      if (res.success) {
        setAdStatus(prev => ({ ...prev, adsWatchedToday: prev.adsWatchedToday + 1 }));
        loadData();
      }
    } catch (e: any) {
      alert(e.message || 'Failed to watch ad');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const wallet = user?.wallets?.[0] || { coins: 0, inr_balance: 0, usdt_balance: 0 };

  return (
    <div className="space-y-6">
      {/* User Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3"
      >
        <div className="w-12 h-12 rounded-full bg-purple-600/30 overflow-hidden flex items-center justify-center">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-purple-300">{user?.display_name?.[0] || '?'}</span>
          )}
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">{t('home.welcome')}, {user?.display_name || 'User'}</h1>
          <p className="text-xs text-purple-400">{user?.rank || 'Newbie'}</p>
        </div>
      </motion.div>

      {/* Wallet */}
      <WalletCard coins={wallet.coins || 0} inrBalance={wallet.inr_balance || 0} usdtBalance={wallet.usdt_balance || 0} />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={watchAd}
          disabled={adStatus.adsWatchedToday >= adStatus.dailyLimit}
          className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2 disabled:opacity-50"
        >
          <Watch className="w-5 h-5 text-purple-400" />
          <span className="text-xs text-gray-300">{t('home.watchAd')}</span>
          <span className="text-[10px] text-gray-500">{adStatus.adsWatchedToday}/{adStatus.dailyLimit}</span>
        </motion.button>
        <motion.a
          whileTap={{ scale: 0.95 }}
          href="/tasks"
          className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2"
        >
          <TasksIcon className="w-5 h-5 text-purple-400" />
          <span className="text-xs text-gray-300">{t('home.openTasks')}</span>
        </motion.a>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={shareReferral}
          className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2"
        >
          <ShareIcon className="w-5 h-5 text-purple-400" />
          <span className="text-xs text-gray-300">{t('home.shareReferral')}</span>
        </motion.button>
      </div>

      {/* Referral Summary */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">{t('home.shareReferral')}</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-white">{referralStats.totalReferrals}</p>
            <p className="text-[10px] text-gray-500">{t('home.totalReferrals')}</p>
          </div>
          <div>
            <p className="text-xl font-bold text-yellow-400">{referralStats.totalCoins}</p>
            <p className="text-[10px] text-gray-500">{t('home.coinsEarned')}</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-400">₹{referralStats.totalCash.toFixed(2)}</p>
            <p className="text-[10px] text-gray-500">{t('home.cashEarned')}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <TasksIcon className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-sm font-bold text-white">{stats.tasksCompleted}</p>
              <p className="text-[10px] text-gray-500">{t('home.tasksCompleted')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Watch className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-sm font-bold text-white">{stats.adsWatched}</p>
              <p className="text-[10px] text-gray-500">{t('home.adsWatched')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CoinIcon className="w-4 h-4 text-yellow-400" />
            <div>
              <p className="text-sm font-bold text-white">{stats.totalCoinsEarned}</p>
              <p className="text-[10px] text-gray-500">{t('home.totalCoinsEarned')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShareIcon className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-sm font-bold text-white">{stats.gamesPlayed}</p>
              <p className="text-[10px] text-gray-500">{t('home.gamesPlayed')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">{t('home.activityFeed')}</h3>
        {activities.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">{t('home.noActivity')}</p>
        ) : (
          <div className="space-y-2">
            {activities.map((act) => (
              <div key={act.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <span className="text-xs text-gray-300 capitalize">{act.text}</span>
                <span className="text-[10px] text-gray-500">{new Date(act.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
