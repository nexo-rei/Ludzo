"use client";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    content: "By accessing or using LUDZO, you agree to be bound by these Terms of Service. If you do not agree, do not use the app.",
  },
  {
    title: "2. Eligibility",
    content: "You must be at least 18 years old to use LUDZO. By using the app, you represent that you meet this age requirement. LUDZO is not available in jurisdictions where such platforms are prohibited.",
  },
  {
    title: "3. Coins and Rewards",
    content: "Coins are virtual points with no real monetary value, no cash equivalent, and cannot be transferred, withdrawn, or converted to USDT. Coins may be earned through watching ads, completing tasks, and daily streaks. LUDZO reserves the right to modify coin values and earning rates at any time.",
  },
  {
    title: "4. USDT Balance",
    content: "USDT deposited into LUDZO is held for platform use. You may withdraw USDT subject to minimum amounts ($5) and a 5% processing fee. Withdrawals are subject to manual review within 48 hours. LUDZO reserves the right to reject withdrawals suspected of fraud.",
  },
  {
    title: "5. No Gambling",
    content: "LUDZO does not operate any gambling, betting, wagering, or prize pool activities. The platform is strictly a rewards and engagement platform. Any use of the platform for gambling-related purposes is strictly prohibited.",
  },
  {
    title: "6. Referral Program",
    content: "The referral commission (10% of first deposit) is subject to validation. Referrals found to be fraudulent, self-referrals, or fake accounts will be disqualified and commissions reversed. LUDZO may suspend the referral program at any time.",
  },
  {
    title: "7. Prohibited Activities",
    content: "You may not: create fake accounts, abuse the referral system, use bots or automation to claim rewards, manipulate ad metrics, engage in any fraudulent activity, or use LUDZO for money laundering. Violations will result in immediate account suspension and forfeiture of balances.",
  },
  {
    title: "8. Account Suspension",
    content: "LUDZO reserves the right to suspend or terminate accounts without notice for violations of these Terms. Suspended accounts forfeit any pending rewards. USDT balances will be handled on a case-by-case basis.",
  },
  {
    title: "9. Limitation of Liability",
    content: "LUDZO is provided 'as is' without warranties of any kind. We are not liable for any losses arising from platform downtime, payment processing issues, or third-party service failures. Our maximum liability is limited to the USDT balance in your account.",
  },
  {
    title: "10. Changes to Terms",
    content: "These Terms may be updated at any time. Changes will be communicated via in-app announcements. Continued use of LUDZO after changes constitutes acceptance of the updated Terms.",
  },
];

export default function TermsPage() {
  return (
    <AppShell hideNav>
      <PageHeader title="Terms of Service" back />
      <div className="px-4 py-4 pb-8 space-y-5">
        <p className="text-xs text-[var(--text-muted)]">Last updated: January 2025</p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Please read these Terms of Service carefully before using LUDZO. These terms govern your use of the platform.
        </p>
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-2">{section.title}</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{section.content}</p>
          </div>
        ))}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)] text-center">
            By using LUDZO you agree to all terms above. Contact support for questions.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
