"use client";

import { motion } from "framer-motion";
import { TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatCoins, formatUSDT } from "@/lib/utils";

interface WalletCardsProps {
  coinBalance: number;
  usdtBalance: number;
  coinRate?: number;
}

export default function WalletCards({ coinBalance, usdtBalance, coinRate = 100 }: WalletCardsProps) {
  const coinValue = (coinBalance / coinRate).toFixed(2);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Coin Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 glow-purple"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wide">
            Coins
          </span>
          <span className="text-lg">🪙</span>
        </div>
        <div className="font-numeric text-2xl font-bold text-[var(--text-primary)]">
          {formatCoins(coinBalance)}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-1">
          ≈ ${coinValue} USD
        </div>
        <div className="mt-2 text-[10px] text-[#A855F7] font-medium">
          100 Coins = $1
        </div>
      </motion.div>

      {/* USDT Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-4"
        style={{ borderColor: "rgba(16,185,129,0.25)", boxShadow: "0 0 20px rgba(16,185,129,0.1)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wide">
            USDT
          </span>
          <TrendingUp size={14} className="text-[#10B981]" />
        </div>
        <div className="font-numeric text-2xl font-bold text-[#10B981]">
          ${formatUSDT(usdtBalance)}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-1">Withdrawable</div>
        <div className="flex gap-2 mt-2">
          <Link
            href="/deposit"
            className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded-lg
                       bg-[#10B981]/15 text-[#10B981] text-[10px] font-semibold
                       hover:bg-[#10B981]/25 transition-colors"
          >
            <ArrowDownLeft size={10} /> Add
          </Link>
          <Link
            href="/withdraw"
            className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded-lg
                       bg-[var(--border)] text-[var(--text-secondary)] text-[10px] font-semibold
                       hover:bg-[var(--border)]/80 transition-colors"
          >
            <ArrowUpRight size={10} /> Out
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
