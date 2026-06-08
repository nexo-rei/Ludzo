'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CoinIcon, CashIcon } from './icons';

interface WalletCardProps {
  coins: number;
  inrBalance: number;
  usdtBalance: number;
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const start = performance.now();
    const from = display;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(from + (value - from) * easeOut));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{prefix}{display.toLocaleString()}</span>;
}

export default function WalletCard({ coins, inrBalance, usdtBalance }: WalletCardProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="grid grid-cols-1 gap-3"
    >
      <div className="bg-gradient-to-r from-purple-900/50 to-purple-600/30 border border-purple-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <CoinIcon className="w-8 h-8" />
          <span className="text-purple-300 text-sm font-medium">Coin Wallet</span>
        </div>
        <p className="text-3xl font-bold text-white">
          <AnimatedNumber value={coins} />
        </p>
        <p className="text-xs text-gray-400 mt-1">For future games</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CashIcon className="w-5 h-5 text-green-400" />
            <span className="text-green-400 text-xs font-medium">INR</span>
          </div>
          <p className="text-xl font-bold text-white">
            <AnimatedNumber value={Math.floor(inrBalance)} prefix="₹" />
          </p>
        </div>
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CashIcon className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 text-xs font-medium">USDT</span>
          </div>
          <p className="text-xl font-bold text-white">
            <AnimatedNumber value={Math.floor(usdtBalance)} />
          </p>
        </div>
      </div>
    </motion.div>
  );
}
