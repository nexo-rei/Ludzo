'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { useI18n } from '@/hooks/useI18n';
import { Crown, Gem, Medal } from 'lucide-react';
import { getRankLabel } from '@/lib/utils';

type LeaderboardType = 'inr' | 'usdt';

export default function LeaderboardPage() {
  const { user, api } = useTelegram();
  const { t } = useI18n();
  const [type, setType] = useState<LeaderboardType>('inr');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadLeaderboard();
  }, [user, type]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/leaderboard?type=${type}`);
      setEntries(res.leaderboard || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Gem className="w-5 h-5 text-blue-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-400" />;
    return <span className="text-sm font-bold text-gray-500 w-5 text-center">{rank}</span>;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30';
    if (rank === 2) return 'bg-blue-500/10 border-blue-500/30';
    if (rank === 3) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-gray-900/50 border-gray-700/50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">{t('leaderboard.title')}</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setType('inr')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
            type === 'inr' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          {t('leaderboard.inr')}
        </button>
        <button
          onClick={() => setType('usdt')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
            type === 'usdt' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          {t('leaderboard.usdt')}
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <motion.div
            key={entry.user_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-3 p-3 rounded-xl border ${getRankStyle(entry.rank)}`}
          >
            <div className="shrink-0 w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
            <div className="w-10 h-10 rounded-full bg-purple-600/30 overflow-hidden flex items-center justify-center shrink-0">
              {entry.photo_url ? (
                <img src={entry.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-purple-300">{entry.display_name?.[0] || '?'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{entry.display_name}</p>
              {entry.rank_label && (
                <span className={`text-[10px] font-medium ${
                  entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-blue-400' : 'text-orange-400'
                }`}>
                  {entry.rank_label}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-white">
                {type === 'inr' ? '₹' : ''}{entry.balance.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-500">{t('leaderboard.balance')}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
