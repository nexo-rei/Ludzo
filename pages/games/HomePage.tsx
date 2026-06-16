import React from 'react';
import { ProfileSummary } from '@/components/games/home/ProfileSummary';
import { BalanceCard } from '@/components/games/home/BalanceCard';
import { PlayButton } from '@/components/games/home/PlayButton';
import { RecentWinners } from '@/components/games/home/RecentWinners';
import { ActivePlayers } from '@/components/games/home/ActivePlayers';
import { Announcements } from '@/components/games/home/Announcements';

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <ProfileSummary />
      <BalanceCard />
      <PlayButton />
      <RecentWinners />
      <ActivePlayers />
      <Announcements />
    </div>
  );
};

export default HomePage;

