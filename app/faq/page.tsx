"use client";
//rebuild 

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon } from "@/components/ui/DuotoneIcons";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";

const FAQ_DATA = [
  {
    category: "General",
    items: [
      { q: "What is LUDZO?", a: "LUDZO is a Telegram Mini App where you can earn Coins and USDT by watching ads, completing tasks, and referring friends." },
      { q: "What are Coins?", a: "Playable Coins are LUDZO's virtual in-app currency. Coins earned from ads, tasks, streaks, referrals, deposits, welcome bonuses, or admin adjustments stay playable and cannot be withdrawn. Won Coins are a separate locked balance awarded only for settled Ludo wins and can be converted under the withdrawal rules." },
      { q: "How do I start earning?", a: "Simply open the app, authenticate with Telegram, and start watching rewarded ads on the Home page to earn Coins instantly." },
      { q: "Is LUDZO free to use?", a: "Yes, LUDZO is completely free. You can earn playable Coins and win locked Won Coins through Ludo without depositing. Deposits are separate playable funds and are not required for the Won-Coin converter." },
    ],
  },
  {
    category: "Earnings",
    items: [
      { q: "How many ads can I watch per day?", a: "You can watch up to 15 normal ads per day, earning 2 Coins per ad (max 30 Coins/day). The limit resets at midnight UTC." },
      { q: "What is the Daily Streak?", a: "Claim a daily streak reward by watching 3 bonus ads. Rewards increase from Day 1 (2 Coins) to Day 7 (10 Coins). Missing a day resets your streak." },
      { q: "What is the difference between Coins and USDT?", a: "Playable Coins are for Ludo entry and rewards only. Won Coins are locked Ludo prize Coins and cannot be staked, but may be converted at 200 Won Coins = $1 USDT. Protected deposit/admin USDT is not eligible for the user withdrawal converter." },
    ],
  },
  {
    category: "Deposits",
    items: [
      { q: "What is the minimum deposit?", a: "The minimum deposit is 100 Coins, equal to $0.50 at the current 200 Coins = $1 rate. Deposits are credited to the playable Coin ledger only." },
      { q: "How do I deposit USDT?", a: "Go to the Deposit page, enter an amount, and tap 'Pay with Binance Pay'. You'll be redirected to complete payment. USDT is credited after confirmation." },
      { q: "How long does a deposit take?", a: "Deposits via Binance Pay are usually credited within a few minutes after payment confirmation." },
    ],
  },
  {
    category: "Withdrawals",
    items: [
      { q: "How do withdrawals work?", a: "Open the Withdraw page from the Convert Ludo Won Coins card on Home or your Games profile. Step 1 selects the Won-Coin amount, step 2 selects the payout network (TRC20 or BEP20) and your USDT wallet address, and step 3 confirms the request. Only Won Coins from settled Ludo matches are eligible; your request is queued for manual review within 48 hours before payment is sent." },
      { q: "What is the minimum withdrawal?", a: "The minimum is exactly 1,000 Won Coins, equal to $5 USDT. Requests must use 200 Won-Coin steps. Playable Coins and protected deposit/admin funds are not eligible." },
      { q: "Is there a withdrawal fee?", a: "Yes, a 5% fee is deducted from your withdrawal amount. The net amount you receive is shown before you confirm." },
      { q: "How long do withdrawals take?", a: "Withdrawals are manually reviewed by our admin team within 48 hours. Once approved, payment is processed to your wallet address." },
      { q: "Why was my withdrawal reviewed?", a: "All withdrawals go through a manual review as part of our standard AML and anti-fraud checks — this isn't unique to your account. Some withdrawals may need extra verification, which can take a little longer. See our AML & Anti-Fraud Policy for details." },
    ],
  },
  {
    category: "Referrals",
    items: [
      { q: "How do referrals work?", a: "Share your unique referral link from the Refer & Earn page. When a new user joins through your link and makes their first deposit, you earn a 10% commission in playable Coins. Referral Coins stay in the gameplay ledger and cannot be withdrawn." },
      { q: "Do I earn commission on all deposits from my referral?", a: "No. Commission is only earned on your referred user's FIRST deposit. Subsequent deposits do not generate commission." },
    ],
  },
  {
    category: "Games",
    items: [
      { q: "What happens if a game disconnects?", a: "If a game session is interrupted by a confirmed technical issue on our side, any Coins spent entering that session may be reinstated after review. Disconnections caused by your own internet connection or device are not eligible for reinstatement. Contact Support if this happens to you." },
    ],
  },
  {
    category: "Account & Security",
    items: [
      { q: "Can I have multiple accounts?", a: "No. Each person may have only one LUDZO account, linked to one Telegram account. Operating multiple accounts is against our Terms & Conditions and Fair Play Policy and may result in suspension and forfeiture of rewards." },
    ],
  },
  {
    category: "Support & Legal",
    items: [
      { q: "How do I contact support?", a: "Open the Support page from your Profile menu to chat with us on Telegram or submit a support ticket. You can also visit the Legal Center for our full policies, including Support & Disputes." },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[var(--border)]/30 transition-colors"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] leading-snug">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
          <ChevronDownIcon size={15} className="text-[var(--text-muted)]" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-xs text-[var(--text-secondary)] leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqPage() {
  return (
    <AppShell hideNav>
      <PageHeader title="FAQ" back />
      <div className="px-4 py-4 space-y-5 pb-6">
        {FAQ_DATA.map((cat, i) => (
          <motion.div
            key={cat.category}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
          >
            <h2 className="text-xs font-bold text-[#23856C] uppercase tracking-wide mb-2">{cat.category}</h2>
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {cat.items.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
