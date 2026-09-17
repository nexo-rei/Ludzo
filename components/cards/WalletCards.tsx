"use client";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Coins, Wallet, Trophy } from "lucide-react";
import Link from "next/link";
import { formatCoins, formatUSDT } from "@/lib/utils";
interface WalletCardsProps { coinBalance: number; usdtBalance: number; coinRate?: number; wonCoins?: number; }
export default function WalletCards({ coinBalance, usdtBalance, coinRate = 100, wonCoins = 0 }: WalletCardsProps) {
  const coinValue = (coinBalance / coinRate).toFixed(2);
  return <section className="balance-grid" aria-label="Your balances">
    <motion.div className="balance-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="balance-label"><span>Playable coins</span><Coins size={19} /></div>
      <div className="balance-value font-numeric">{formatCoins(coinBalance)}<span>coins</span></div>
      <p>≈ ${coinValue} USD</p><div className="balance-footer">{coinRate} Coins = $1</div>
    </motion.div>
    <motion.div className="balance-card balance-featured" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06 }}>
      <div className="balance-label"><span>Available balance</span><Wallet size={19} /></div>
      <div className="balance-value font-numeric">${formatUSDT(usdtBalance)}<span>USDT</span></div>
      <p>Ready to withdraw</p><div className="balance-actions"><Link href="/deposit"><ArrowDownLeft size={15} />Deposit</Link><Link href="/withdraw"><ArrowUpRight size={15} />Withdraw</Link></div>
    </motion.div>
    <motion.div className="balance-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}>
      <div className="balance-label"><span>Won coins</span><Trophy size={19} /></div>
      <div className="balance-value font-numeric">{formatCoins(wonCoins)}<span>coins</span></div>
      <p>${formatUSDT(wonCoins / coinRate)} convertible</p><div className="balance-footer">Ludo prizes · {coinRate} Won Coins = $1</div>
    </motion.div>
  </section>;
}
