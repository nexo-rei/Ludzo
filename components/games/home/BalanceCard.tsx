import React from 'react';
import { motion } from 'motion/react';
import { useGames } from '@/contexts/GamesContext';
import { CoinIcon, CashIcon } from '@/components/games/GameIcons';

export const BalanceCard: React.FC = () => {
  const { economy } = useGames();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="grid grid-cols-2 gap-3 px-4"
    >
      {/* Coin Balance */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-600/5 border border-amber-500/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <CoinIcon size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Coins</span>
        </div>
        <p className="text-xl font-bold text-foreground">
          {economy.coinBalance.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">100 Coins = $1</p>
      </div>

      {/* Cash Balance */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-600/5 border border-emerald-500/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <CashIcon size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Cash</span>
        </div>
        <p className="text-xl font-bold text-foreground">
          ${economy.cashBalance.toFixed(2)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">USDT</p>
      </div>
    </motion.div>
  );
};
