"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { coinsToUsd, COINS_PER_HALF_USD, MIN_WON_WITHDRAWAL_COINS } from "@/lib/economy";

/**
 * Compact, professional Won-Coin → USDT conversion mark.
 *
 * Deliberately small (one card row, no full-screen hero) so it can sit inside
 * the existing Home wallet section and the Games profile without changing the
 * surrounding layout.
 */
function ConvertMark({ size = 46 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Won Coins converting to USDT"
      className="flex-none"
    >
      <defs>
        <linearGradient id="cwc-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="cwc-usdt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34D399" />
          <stop offset="1" stopColor="#0E9F6E" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="30" fill="var(--accent-soft)" />

      {/* Won Coin */}
      <g>
        <circle cx="22" cy="32" r="13" fill="url(#cwc-coin)" />
        <circle cx="22" cy="32" r="9.5" fill="none" stroke="#FFFBEB" strokeOpacity="0.7" />
        <path
          d="M22 25.5v13M18 28.5c2.6-2 8-0.8 8 1.4 0 2.6-8 1.4-8 4 0 2.2 5.4 3.4 8 1"
          fill="none"
          stroke="#7C2D12"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* USDT chip sliding in from behind the coin */}
      <motion.g
        initial={{ x: -4, opacity: 0.85 }}
        animate={{ x: [0, 2, 0], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="42" cy="32" r="13" fill="url(#cwc-usdt)" />
        <path
          d="M42 25.5v13M36 28.5h12"
          fill="none"
          stroke="#ECFDF5"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </motion.g>

      {/* Conversion pulse */}
      <motion.circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="5 9"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "32px 32px" }}
      />
    </svg>
  );
}

interface ConvertWonCoinsCardProps {
  wonCoins: number;
  /** Optional class hook so hosts can control spacing within their own grid. */
  className?: string;
}

export default function ConvertWonCoinsCard({ wonCoins, className = "" }: ConvertWonCoinsCardProps) {
  const eligible = wonCoins >= MIN_WON_WITHDRAWAL_COINS;
  const value = coinsToUsd(wonCoins).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-center gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 ${className}`}
    >
      <ConvertMark />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--text-primary)]">Convert Ludo Won Coins</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          {wonCoins.toLocaleString()} Won Coins · ${value} USDT
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
          {COINS_PER_HALF_USD} Coins = $0.50 · min {MIN_WON_WITHDRAWAL_COINS.toLocaleString()} Won Coins
        </p>
      </div>

      <Link
        href="/withdraw"
        className="flex-none rounded-xl px-3.5 py-2.5 text-[11px] font-bold transition-opacity hover:opacity-90"
        style={{
          background: eligible ? "var(--accent)" : "var(--accent-soft)",
          color: eligible ? "var(--accent-contrast)" : "var(--accent)",
        }}
      >
        Convert
      </Link>
    </motion.div>
  );
}
