import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { getLeaderboard } from '@/services/api';
import type { LeaderboardEntry } from '@/types/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then(data => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Leaderboard</h1>
          <span className="ml-auto text-xs text-muted-foreground">All Time • USDT Earned</span>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Trophy className="w-12 h-12 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">No Rankings Yet</p>
            <p className="text-sm text-muted-foreground">Be the first to earn USDT!</p>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const isCurrentUser = entry.user_id === user?.id;
            return (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isCurrentUser ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'}`}
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {idx < 3 ? (
                    <span className="text-lg">{RANK_MEDAL[idx]}</span>
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground tabular-nums">#{entry.rank}</span>
                  )}
                </div>
                {/* Avatar */}
                {entry.photo_url ? (
                  <img src={entry.photo_url} alt={entry.first_name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {entry.first_name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                    {entry.username ? `@${entry.username}` : entry.first_name}
                    {isCurrentUser && <span className="ml-1 text-xs">(You)</span>}
                  </p>
                </div>
                {/* Earnings */}
                <div className="text-sm font-bold text-success tabular-nums shrink-0">
                  ${Number(entry.usdt_earned).toFixed(2)}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
