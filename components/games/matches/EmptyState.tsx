import React from 'react';
import { motion } from 'motion/react';
import { ClockIcon, HistoryIcon, ZapIcon } from '@/components/games/GameIcons';

interface EmptyStateProps {
  type: 'live' | 'recent' | 'history';
  title?: string;
  description?: string;
}

const config = {
  live: {
    icon: ZapIcon,
    title: 'No Live Matches',
    description: 'Live matches will appear here when players are competing',
  },
  recent: {
    icon: ClockIcon,
    title: 'No Recent Matches',
    description: 'Your recent matches will be shown here after you play',
  },
  history: {
    icon: HistoryIcon,
    title: 'No Match History',
    description: 'Your completed matches will appear here',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({ type, title, description }) => {
  const cfg = config[type];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon size={26} className="text-muted-foreground/50" />
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">
        {title || cfg.title}
      </h4>
      <p className="text-xs text-muted-foreground max-w-[220px]">
        {description || cfg.description}
      </p>
    </motion.div>
  );
};
