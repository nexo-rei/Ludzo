import React from 'react';
import { motion } from 'motion/react';
import { useGames } from '@/contexts/GamesContext';
import { SparklesIcon } from '@/components/games/GameIcons';

export const ProfileSummary: React.FC = () => {
  const { user } = useGames();

  const displayName = user
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'Player';
  const username = user?.username ? `@${user.username}` : 'Guest';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex items-center gap-4 p-4"
    >
      <div className="relative shrink-0">
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt={displayName}
            className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-xl border-2 border-primary/20">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-background" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-foreground truncate">{displayName}</h2>
        <p className="text-sm text-muted-foreground truncate">{username}</p>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
        <SparklesIcon size={14} />
        <span>Premium</span>
      </div>
    </motion.div>
  );
};
