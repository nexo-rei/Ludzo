import React from 'react';
import { motion } from 'motion/react';
import { useGames } from '@/contexts/GamesContext';
import { CoinIcon, CashIcon, TrendingUpIcon, TrendingDownIcon } from '@/components/games/GameIcons';

export const EconomyCard: React.FC = () => {
  const { economy } = useGames();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.24 }}
      className="px-4"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3">Economy</h3>
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {/* Header balances */}
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CoinIcon size={16} className="text-amber-500" />
              <span className="text-xs text-muted-foreground">Coin Balance</span>
            </div>
            <p className="text-lg font-bold text-foreground">{economy.coinBalance.toLocaleString()}</p>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CashIcon size={16} className="text-emerald-500" />
              <span className="text-xs text-muted-foreground">Cash Balance</span>
            </div>
            <p className="text-lg font-bold text-foreground">${economy.cashBalance.toFixed(2)}</p>
          </div>
        </div>

        {/* Conversion info */}
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
          <p className="text-[11px] text-muted-foreground text-center">100 Coins = $1 USDT</p>
        </div>

        {/* Details */}
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUpIcon size={14} className="text-emerald-500" />
              <span className="text-sm text-muted-foreground">Total Coins Won</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{economy.totalCoinsWon.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingDownIcon size={14} className="text-rose-500" />
              <span className="text-sm text-muted-foreground">Total Coins Lost</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{economy.totalCoinsLost.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <CashIcon size={14} className="text-primary" />
              <span className="text-sm text-muted-foreground">Lifetime Earnings</span>
            </div>
            <span className="text-sm font-semibold text-foreground">${economy.lifetimeEarnings.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUpIcon size={14} className="text-violet-500" />
              <span className="text-sm text-muted-foreground">Net Profit</span>
            </div>
            <span className={`text-sm font-semibold ${economy.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              ${economy.netProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
