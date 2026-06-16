import React from 'react';
import { motion } from 'motion/react';
import { useGames } from '@/contexts/GamesContext';
import { TrophyIcon } from '@/components/games/GameIcons';

export const RecentWinners: React.FC = () => {
  const { winners } = useGames();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.24 }}
      className="px-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrophyIcon size={18} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Recent Winners</h3>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {winners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <TrophyIcon size={22} className="text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No winners yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Be the first to win a match</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {winners.map((winner) => (
              <div key={winner.id} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {winner.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{winner.name}</p>
                  <p className="text-xs text-muted-foreground">{winner.game}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {winner.prizeType === 'cash' ? `$${winner.prize}` : `${winner.prize} Coins`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
