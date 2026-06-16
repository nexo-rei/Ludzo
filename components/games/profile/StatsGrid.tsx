import React from 'react';
import { motion } from 'motion/react';
import { useGames } from '@/contexts/GamesContext';
import { ChartIcon, TrophyIcon, FlameIcon, MedalIcon } from '@/components/games/GameIcons';

export const StatsGrid: React.FC = () => {
  const { stats } = useGames();

  const items = [
    { label: 'Total Matches', value: stats.totalMatches.toLocaleString(), icon: ChartIcon, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Wins', value: stats.wins.toLocaleString(), icon: TrophyIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Losses', value: stats.losses.toLocaleString(), icon: MedalIcon, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'Win Rate', value: `${stats.winRate}%`, icon: ChartIcon, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Current Streak', value: stats.currentStreak.toLocaleString(), icon: FlameIcon, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Best Streak', value: stats.bestStreak.toLocaleString(), icon: FlameIcon, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.16 }}
      className="px-4"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3">Statistics</h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.16 + i * 0.05 }}
              className="rounded-xl bg-card border border-border p-3.5"
            >
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>
                <Icon size={16} className={item.color} />
              </div>
              <p className="text-lg font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
