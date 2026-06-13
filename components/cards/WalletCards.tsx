"use client";

import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatCoins, formatUSDT } from "@/lib/utils";

interface WalletCardsProps {
  coinBalance: number;
  usdtBalance: number;
  coinRate?: number;
}

function LudzoCoinIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill="url(#wc-gold)" stroke="url(#wc-stroke)" strokeWidth="1" />
      <circle cx="16" cy="16" r="12.5" fill="url(#wc-purple)" />
      <path d="M11 10V22H21V19H14V10H11Z" fill="white" />
      <path d="M15 15.5L18 13.5L16.5 16.5L19.5 15.5" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="wc-gold" x1="1" y1="1" x2="31" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" /><stop offset="50%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="wc-stroke" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" /><stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="wc-purple" x1="3.5" y1="3.5" x2="28.5" y2="28.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" /><stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function WalletCards({ coinBalance, usdtBalance, coinRate = 100 }: WalletCardsProps) {
  const coinValue = (coinBalance / coinRate).toFixed(2);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Coin Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative rounded-2xl p-4 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #2A1F4E 0%, #1E1640 100%)",
          border: "1px solid rgba(124,58,237,0.3)",
          boxShadow: "0 4px 24px rgba(124,58,237,0.15)",
        }}
      >
        {/* Glow blob */}
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-widest">Coins</span>
          <div className="coin-pulse"><LudzoCoinIcon size={22} /></div>
        </div>
        <motion.div
          key={coinBalance}
          className="font-numeric text-2xl font-black text-white"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {formatCoins(coinBalance)}
        </motion.div>
        <div className="text-[11px] mt-1" style={{ color: "#A855F7" }}>
          ≈ ${coinValue} USD
        </div>
        <div className="mt-1 text-[10px] text-[#64748B]">100 Coins = $1</div>
      </motion.div>

      {/* USDT Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="relative rounded-2xl p-4 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0D2E26 0%, #0A1F1B 100%)",
          border: "1px solid rgba(16,185,129,0.3)",
          boxShadow: "0 4px 24px rgba(16,185,129,0.1)",
        }}
      >
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-widest">USDT</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v12M8 9h8M9 12h6" strokeLinecap="round" />
          </svg>
        </div>
        <motion.div
          key={usdtBalance}
          className="font-numeric text-2xl font-black"
          style={{ color: "#10B981" }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          ${formatUSDT(usdtBalance)}
        </motion.div>
        <div className="text-[11px] text-[#64748B] mt-1">Withdrawable</div>
        <div className="flex gap-2 mt-2">
          <Link href="/deposit"
            className="flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
            style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
            <ArrowDownLeft size={10} /> Add
          </Link>
          <Link href="/withdraw"
            className="flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ArrowUpRight size={10} /> Out
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
