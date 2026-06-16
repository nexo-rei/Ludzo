import React from 'react';
import { motion } from 'motion/react';
import { GameCard } from '@/components/games/play/GameCard';
import type { GameInfo } from '@/types/games';

const games: GameInfo[] = [
  {
    id: 'ludo',
    name: 'Ludo',
    description: 'The classic board game. Race your tokens to the finish and outsmart your opponents.',
    bannerColor: '#7C3AED',
    iconColor: '#7C3AED',
    isAvailable: true,
  },
  {
    id: 'water-sort',
    name: 'Water Sort',
    description: 'Sort colorful liquids into matching bottles. A relaxing yet challenging puzzle.',
    bannerColor: '#0EA5E9',
    iconColor: '#0EA5E9',
    isAvailable: false,
    comingSoon: 'Coming Q3 2026',
  },
  {
    id: 'chess',
    name: 'Chess',
    description: 'Strategic battle of minds. Master the board and checkmate your rival.',
    bannerColor: '#F59E0B',
    iconColor: '#F59E0B',
    isAvailable: false,
    comingSoon: 'Coming Q4 2026',
  },
];

const PlayPage: React.FC = () => {
  return (
    <div className="flex flex-col pt-4">
      <div className="px-4 mb-5">
        <h1 className="text-xl font-bold text-foreground mb-1">Play</h1>
        <p className="text-sm text-muted-foreground">Choose your game and start playing</p>
      </div>

      {/* Featured */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-5 h-5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-amber-500">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" />
            </svg>
          </motion.div>
          <h2 className="text-sm font-semibold text-foreground">Featured</h2>
        </div>
        <GameCard game={games[0]} index={0} />
      </div>

      {/* Coming Soon */}
      <div className="px-4 pb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Coming Soon</h2>
        <div className="flex flex-col gap-3">
          {games.slice(1).map((game, i) => (
            <GameCard key={game.id} game={game} index={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayPage;
