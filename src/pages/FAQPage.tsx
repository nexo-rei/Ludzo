import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'What is Ludzo?',
    a: 'Ludzo is a Telegram Mini App that lets you earn Coins by watching rewarded ads, completing tasks, and maintaining daily streaks. Coins can be used in future skill-based games where you can win real USDT.',
  },
  {
    q: 'How do Coins work?',
    a: 'Coins are earned through rewarded ads (2 Coins per ad), daily streak rewards (2–10 Coins), and tasks. 100 Coins = $1 value. Coins will be used as entry fees for future games. Coins cannot be withdrawn or converted to USDT.',
  },
  {
    q: 'How does USDT work?',
    a: 'USDT is deposited via Binance Pay and earned through referral commissions. It is the only withdrawable currency on Ludzo. Minimum deposit and withdrawal is $5.',
  },
  {
    q: 'How do Referrals work?',
    a: 'Share your unique referral link. When a friend joins using your link, they receive 10 bonus Coins. When they make their first deposit, you earn a 10% USDT commission on that deposit only. No commission on future deposits.',
  },
  {
    q: 'How do Withdrawals work?',
    a: 'You can withdraw your USDT balance to any USDT wallet (TRC20, ERC20, or BEP20). Minimum withdrawal is $5. A 5% fee is deducted. Withdrawals are manually reviewed within 48 hours.',
  },
  {
    q: 'How do Games work?',
    a: 'Games are coming soon! You will be able to spend Coins to enter skill-based matches. Winners earn real USDT rewards. Future game types include 100, 500, and 1000 Coin matches, plus tournament modes.',
  },
];

export default function FAQPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">FAQ</h1>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-2">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="rounded-xl bg-card border border-border overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left gap-3"
            >
              <span className="text-sm font-semibold text-foreground">{item.q}</span>
              {open === i ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>
            {open === i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
