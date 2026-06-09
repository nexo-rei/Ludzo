import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold text-foreground">Terms & Conditions</h1>
        </div>
      </div>
      <div className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-4 text-sm text-muted-foreground leading-relaxed">
        <p className="text-xs text-muted-foreground">Last updated: June 2025</p>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">User Responsibilities</h2>
          <p>By using Ludzo, you agree to use the platform lawfully and honestly. You are responsible for the security of your Telegram account. Do not share your account access with others.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Withdrawal Rules</h2>
          <p>Minimum withdrawal is $5 USDT. A 5% fee applies to all withdrawals. Only USDT can be withdrawn — Coins are not withdrawable. Withdrawals are processed within 48 hours after manual review and approval.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Referral Rules</h2>
          <p>Referral commission (10% USDT) is earned only on the referred user's first deposit. Self-referral is strictly prohibited. Abuse of the referral system will result in account suspension.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Fraud Prevention</h2>
          <p>Using bots, scripts, VPNs to abuse the ad reward system, creating multiple accounts, or any other fraudulent activity is strictly prohibited and will result in immediate account ban without recovery of funds.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Account Suspension</h2>
          <p>We reserve the right to suspend or permanently ban accounts found to be engaging in fraudulent, abusive, or illegal activity. Decisions are made at the sole discretion of Ludzo administrators.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Disclaimer</h2>
          <p>Ludzo is a reward and gaming platform. Past earnings do not guarantee future results. The platform may modify coin rates, reward amounts, and game rules at any time with prior notice.</p>
        </section>
      </div>
    </div>
  );
}
