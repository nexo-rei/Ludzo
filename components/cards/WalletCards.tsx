"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatCoins, formatUSDT } from "@/lib/utils";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CoinsDuotoneIcon,
  TrophyDuotoneIcon,
  WalletDuotoneIcon,
} from "@/components/ui/DuotoneIcons";
import { useI18n } from "@/hooks/useI18n";

interface WalletCardsProps {
  coinBalance: number;
  usdtBalance: number;
  coinRate?: number;
  wonCoins?: number;
}

export default function WalletCards({ coinBalance, usdtBalance, coinRate = 100, wonCoins = 0 }: WalletCardsProps) {
  const { t } = useI18n();
  const coinValue = (coinBalance / coinRate).toFixed(2);
  return (
    <section className="balance-grid" aria-label={t("your_wallet")}>
      <motion.div className="balance-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div className="balance-label"><span>{t("playable_coins")}</span><CoinsDuotoneIcon size={19} /></div>
        <div className="balance-value font-numeric">{formatCoins(coinBalance)}<span>{t("coins").toLowerCase()}</span></div>
        <p>≈ ${coinValue} USD</p>
        <div className="balance-footer">{t("coins_rate_note", { rate: coinRate })}</div>
      </motion.div>
      <motion.div className="balance-card balance-featured" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div className="balance-label"><span>{t("available_balance")}</span><WalletDuotoneIcon size={19} /></div>
        <div className="balance-value font-numeric">${formatUSDT(usdtBalance)}<span>USDT</span></div>
        <p>{t("ready_to_withdraw")}</p>
        <div className="balance-actions">
          <Link href="/deposit"><ArrowDownLeftIcon size={15} />{t("deposit")}</Link>
          <Link href="/withdraw"><ArrowUpRightIcon size={15} />{t("withdraw")}</Link>
        </div>
      </motion.div>
      <motion.div className="balance-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div className="balance-label"><span>{t("won_coins_title")}</span><TrophyDuotoneIcon size={19} /></div>
        <div className="balance-value font-numeric">{formatCoins(wonCoins)}<span>{t("coins").toLowerCase()}</span></div>
        <p>{t("convertible_value", { amount: formatUSDT(wonCoins / coinRate) })}</p>
        <div className="balance-footer">{t("ludo_prizes_note", { rate: coinRate })}</div>
      </motion.div>
    </section>
  );
}
