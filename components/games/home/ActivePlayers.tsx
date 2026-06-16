import React from 'react';
import { motion } from 'motion/react';
import { useGames } from '@/contexts/GamesContext';
import { UsersIcon, ZapIcon } from '@/components/games/GameIcons';

export const ActivePlayers: React.FC = () => {
  const { activePlayers } = useGames();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.32 }}
      className="px-4"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <UsersIcon size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Active Players</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <p className="text-xs text-muted-foreground">Online now</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ZapIcon size={14} className="text-amber-500" />
          <span className="text-lg font-bold text-foreground">{activePlayers.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
};
