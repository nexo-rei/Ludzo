"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { formatCoins, formatUSDT } from "@/lib/utils";
import { coinsToUsd, COINS_PER_HALF_USD } from "@/lib/economy";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CoinsDuotoneIcon,
  TrophyDuotoneIcon,
  WalletDuotoneIcon,
} from "@/components/ui/DuotoneIcons";
import { useI18n } from "@/hooks/useI18n";

interface WalletCardsProps {
  /** Playable coins from deposits, ads, tasks, streaks, referrals and admin credits. */
  coinBalance: number;
  /** Protected deposit/admin USDT. This balance is not withdrawable. */
  usdtBalance: number;
  coinRate?: number;
  /** Locked prizes credited only by a settled Ludo match. */
  wonCoins?: number;
}

export default function WalletCards({
  coinBalance,
  usdtBalance,
  wonCoins = 0,
}: WalletCardsProps) {
  const { t } = useI18n();
  const coinValue = coinsToUsd(coinBalance).toFixed(2);
  const wonValue = coinsToUsd(wonCoins).toFixed(2);

  return (
    <section className="balance-grid" aria-label={t("your_wallet")}>
      <motion.div className="balance-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div className="balance-label"><span>{t("playable_coins")}</span><CoinsDuotoneIcon size={19} /></div>
        <div className="balance-value font-numeric">{formatCoins(coinBalance)}<span>{t("coins").toLowerCase()}</span></div>
        <p>≈ ${coinValue} USD</p>
        <div className="balance-footer">Ads · tasks · deposits · admin credits · play only</div>
      </motion.div>

      <motion.div className="balance-card balance-featured" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div className="balance-label"><span>Protected funds</span><WalletDuotoneIcon size={19} /></div>
        <div className="balance-value font-numeric">${formatUSDT(usdtBalance)}<span>USDT</span></div>
        <p>Deposits & admin funds · not withdrawable</p>
        <div className="balance-actions">
          <Link href="/deposit"><ArrowDownLeftIcon size={15} />{t("deposit")}</Link>
          <span className="flex items-center gap-1.5 text-[10px] opacity-60"><ArrowUpRightIcon size={15} />Locked</span>
        </div>
      </motion.div>

      <motion.div className="balance-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div className="balance-label"><span>{t("won_coins_title")}</span><TrophyDuotoneIcon size={19} /></div>
        <div className="balance-value font-numeric">{formatCoins(wonCoins)}<span>{t("coins").toLowerCase()}</span></div>
        <p>${wonValue} eligible value · Ludo prizes only</p>
        <div className="flex items-center justify-between gap-2">
          <div className="balance-footer">{COINS_PER_HALF_USD} Coins = $0.50 · min 1,000</div>
          <Link href="/withdraw" className="text-[10px] font-bold text-[var(--accent)] hover:underline whitespace-nowrap">
            Convert
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
