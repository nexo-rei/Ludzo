import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import type { GameInfo } from '@/types/games';
import { DiceIcon, WaterSortIcon, ChessIcon } from '@/components/games/GameIcons';

interface GameCardProps {
  game: GameInfo;
  index?: number;
}

const iconMap: Record<string, React.FC<{ className?: string; size?: number; style?: React.CSSProperties }>> = {
  ludo: DiceIcon,
  'water-sort': WaterSortIcon,
  chess: ChessIcon,
};

export const GameCard: React.FC<GameCardProps> = ({ game, index = 0 }) => {
  const navigate = useNavigate();
  const Icon = iconMap[game.id] || DiceIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      whileHover={{ scale: game.isAvailable ? 1.02 : 1 }}
      whileTap={{ scale: game.isAvailable ? 0.98 : 1 }}
      className={`relative overflow-hidden rounded-2xl border transition-shadow duration-300 ${
        game.isAvailable
          ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm hover:shadow-md cursor-pointer'
          : 'bg-muted/30 border-border opacity-75'
      }`}
      onClick={() => {
        if (game.isAvailable) {
          navigate('/games/play');
        }
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${game.iconColor}15` }}
          >
            <Icon size={32} style={{ color: game.iconColor }} />
          </div>
          {!game.isAvailable && (
            <span className="px-2.5 py-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Coming Soon
            </span>
          )}
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">{game.name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{game.description}</p>
      </div>

      {game.isAvailable && (
        <div className="px-5 pb-5">
          <button className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            Play Now
          </button>
        </div>
      )}

      {!game.isAvailable && game.comingSoon && (
        <div className="px-5 pb-5">
          <div className="w-full py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium text-center">
            {game.comingSoon}
          </div>
        </div>
      )}
    </motion.div>
  );
};
