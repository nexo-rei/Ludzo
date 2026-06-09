"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";

const FAQ_DATA = [
  {
    category: "General",
    items: [
      { q: "What is LUDZO?", a: "LUDZO is a Telegram Mini App where you can earn Coins and USDT by watching ads, completing tasks, and referring friends." },
      { q: "How do I start earning?", a: "Simply open the app, authenticate with Telegram, and start watching rewarded ads on the Home page to earn Coins instantly." },
      { q: "Is LUDZO free to use?", a: "Yes, LUDZO is completely free. You can earn Coins without spending anything. USDT requires a deposit." },
    ],
  },
  {
    category: "Earnings",
    items: [
      { q: "How many ads can I watch per day?", a: "You can watch up to 15 normal ads per day, earning 2 Coins per ad (max 30 Coins/day). The limit resets at midnight UTC." },
      { q: "What is the Daily Streak?", a: "Claim a daily streak reward by watching 3 bonus ads. Rewards increase from Day 1 (2 Coins) to Day 7 (10 Coins). Missing a day resets your streak." },
      { q: "What is the difference between Coins and USDT?", a: "Coins are earned through app activities and cannot be withdrawn. USDT is real money that can be deposited and withdrawn to your crypto wallet." },
    ],
  },
  {
    category: "Deposits",
    items: [
      { q: "What is the minimum deposit?", a: "The minimum deposit amount is $5 USDT." },
      { q: "How do I deposit USDT?", a: "Go to the Deposit page, enter an amount, and tap 'Pay with Binance Pay'. You'll be redirected to complete payment. USDT is credited after confirmation." },
      { q: "How long does a deposit take?", a: "Deposits via Binance Pay are usually credited within a few minutes after payment confirmation." },
    ],
  },
  {
    category: "Withdrawals",
    items: [
      { q: "What is the minimum withdrawal?", a: "The minimum withdrawal amount is $5 USDT." },
      { q: "Is there a withdrawal fee?", a: "Yes, a 5% fee is deducted from your withdrawal amount. The net amount you receive is shown before you confirm." },
      { q: "How long does a withdrawal take?", a: "Withdrawals are manually reviewed by our admin team within 48 hours. Once approved, payment is processed to your wallet address." },
    ],
  },
  {
    category: "Referrals",
    items: [
      { q: "How does the referral system work?", a: "Share your unique referral link. When a new user joins through your link and makes their first deposit, you earn a 10% commission in USDT." },
      { q: "Do I earn commission on all deposits from my referral?", a: "No. Commission is only earned on your referred user's FIRST deposit. Subsequent deposits do not generate commission." },
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
          <ChevronDown size={15} className="text-[var(--text-muted)]" />
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
            <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wide mb-2">{cat.category}</h2>
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
