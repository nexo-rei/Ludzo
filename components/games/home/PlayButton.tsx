import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { DiceIcon } from '@/components/games/GameIcons';

export const PlayButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: 0.16 }}
      className="px-4 py-3"
    >
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/games/play')}
        className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary p-5 text-primary-foreground shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-30" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <DiceIcon size={32} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold">Play Ludo</p>
              <p className="text-sm text-primary-foreground/70">Classic board game</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
};
