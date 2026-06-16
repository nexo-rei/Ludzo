"use client";

import { motion } from "framer-motion";
import { TrophyIcon, CoinIcon } from "./GamingIcons";

interface Winner {
  id: string;
  username: string;
  avatar?: string;
  coinsWon: number;
  game: string;
}

const MOCK_WINNERS: Winner[] = [
  { id: "w1", username: "AlexGamer", coinsWon: 4500, game: "Ludo" },
  { id: "w2", username: "PriyaWin", coinsWon: 3200, game: "Ludo" },
  { id: "w3", username: "RajPlays", coinsWon: 2800, game: "Ludo" },
  { id: "w4", username: "MiaLuck", coinsWon: 5600, game: "Ludo" },
  { id: "w5", username: "JonSkill", coinsWon: 1900, game: "Ludo" },
];

interface WinnerCardProps {
  winner: Winner;
  index: number;
}

function WinnerAvatar({ winner }: { winner: Winner }) {
  if (winner.avatar) {
    return (
      <img
        src={winner.avatar}
        alt={winner.username}
        className="h-9 w-9 rounded-full object-cover border border-gaming-border/50"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gaming-primary/10 border border-gaming-border/30 text-gaming-primary text-xs font-bold">
      {winner.username.slice(0, 2).toUpperCase()}
    </div>
  );
}

function SingleWinnerCard({ winner, index }: WinnerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + index * 0.07, duration: 0.35 }}
      className="flex-shrink-0 w-[152px] rounded-xl border border-gaming-border/40 bg-gaming-surface/40 p-3"
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <WinnerAvatar winner={winner} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gaming-foreground truncate">{winner.username}</p>
          <p className="text-[10px] text-gaming-muted">{winner.game}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-gaming-gold/8 px-2.5 py-1.5">
        <CoinIcon size={14} className="text-gaming-gold" />
        <span className="text-xs font-bold text-gaming-gold">+{winner.coinsWon.toLocaleString()}</span>
      </div>
    </motion.div>
  );
}

export default function WinnersSection() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <TrophyIcon size={16} className="text-gaming-gold" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gaming-muted">
          Recent Winners
        </h3>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {MOCK_WINNERS.map((winner, index) => (
          <SingleWinnerCard key={winner.id} winner={winner} index={index} />
        ))}
      </div>
    </div>
  );
}
