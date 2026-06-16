"use client";

import { motion } from "framer-motion";
import { CoinIcon, CashIcon } from "./GamingIcons";

interface EconomyCardProps {
  coinBalance?: number;
  cashBalance?: number;
  totalCoinsWon?: number;
  totalCoinsLost?: number;
  lifetimeEarnings?: number;
  netProfit?: number;
  compact?: boolean;
}

export default function EconomyCard({
  coinBalance = 2450,
  cashBalance = 24.5,
  totalCoinsWon = 12800,
  totalCoinsLost = 3500,
  lifetimeEarnings = 128.0,
  netProfit = 93.0,
  compact = false,
}: EconomyCardProps) {
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-gaming-border/60 bg-gaming-surface/60 backdrop-blur-sm p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gaming-gold/10 text-gaming-gold">
              <CoinIcon size={18} />
            </div>
            <div>
              <p className="text-xs text-gaming-muted">Coin Balance</p>
              <p className="text-sm font-bold text-gaming-foreground">{coinBalance.toLocaleString()}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-gaming-border/50" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gaming-success/10 text-gaming-success">
              <CashIcon size={18} />
            </div>
            <div>
              <p className="text-xs text-gaming-muted">Cash Balance</p>
              <p className="text-sm font-bold text-gaming-foreground">${cashBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <p className="mt-2.5 text-[10px] text-gaming-muted/70">100 Coins = $1</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
      className="space-y-3"
    >
      {/* Main economy card */}
      <div className="relative overflow-hidden rounded-2xl border border-gaming-border/50 bg-gaming-surface/50 backdrop-blur-sm p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gaming-gold/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gaming-muted mb-4">Economy</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gaming-gold/10 text-gaming-gold">
                <CoinIcon size={20} />
              </div>
              <div>
                <p className="text-xs text-gaming-muted">Coins</p>
                <p className="text-base font-bold text-gaming-foreground">{coinBalance.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gaming-success/10 text-gaming-success">
                <CashIcon size={20} />
              </div>
              <div>
                <p className="text-xs text-gaming-muted">Cash</p>
                <p className="text-base font-bold text-gaming-foreground">${cashBalance.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gaming-border/40 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gaming-muted">Total Won</p>
              <p className="text-sm font-semibold text-gaming-success">+{totalCoinsWon.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-gaming-muted">Total Lost</p>
              <p className="text-sm font-semibold text-gaming-error">-{totalCoinsLost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-gaming-muted">Lifetime Earnings</p>
              <p className="text-sm font-semibold text-gaming-foreground">${lifetimeEarnings.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gaming-muted">Net Profit</p>
              <p className="text-sm font-semibold text-gaming-success">+${netProfit.toFixed(2)}</p>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-gaming-muted/60">100 Coins = $1</p>
        </div>
      </div>
    </motion.div>
  );
}
