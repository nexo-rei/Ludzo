'use client';

import { motion } from 'framer-motion';
import { Banknote, Clock } from 'lucide-react';

export default function AdminDepositsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Deposits</h1>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center"
      >
        <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-purple-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Coming Soon</h2>
        <p className="text-sm text-gray-500 mb-6">Deposit system is under development.</p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <Banknote className="w-4 h-4" />
          <span>UPI, Binance Pay, and crypto deposits will be supported.</span>
        </div>
      </motion.div>
    </div>
  );
}
