import React from 'react';
import { motion } from 'motion/react';
import { useGames } from '@/contexts/GamesContext';
import { StatsGrid } from '@/components/games/profile/StatsGrid';
import { EconomyCard } from '@/components/games/profile/EconomyCard';
import { SettingsSection } from '@/components/games/profile/SettingsSection';
import { ChartIcon } from '@/components/games/GameIcons';

const ProfilePage: React.FC = () => {
  const { user, stats } = useGames();

  const displayName = user
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'Player';

  return (
    <div className="flex flex-col pt-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-4 mb-6"
      >
        <h1 className="text-xl font-bold text-foreground mb-1">Profile</h1>
        <p className="text-sm text-muted-foreground">Your gaming identity and stats</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="px-4 mb-6"
      >
        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/15 p-5">
          {user?.photo_url ? (
            <img
              src={user.photo_url}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-2xl border-2 border-primary/20">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">{displayName}</h2>
            <p className="text-sm text-muted-foreground">
              {user?.username ? `@${user.username}` : 'Guest Player'}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <ChartIcon size={14} className="text-primary" />
              <span className="text-xs font-medium text-foreground">
                {stats.totalMatches} Matches Played
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col gap-5">
        <StatsGrid />
        <EconomyCard />
        <SettingsSection />
      </div>
    </div>
  );
};

export default ProfilePage;
