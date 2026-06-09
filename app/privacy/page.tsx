"use client";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";

const SECTIONS = [
  {
    title: "Information We Collect",
    content: "We collect your Telegram profile information (ID, name, username, profile photo URL) when you authenticate via Telegram. We also collect usage data including ad watch history, task completions, transaction records, and referral activity.",
  },
  {
    title: "How We Use Your Information",
    content: "Your information is used to operate the LUDZO platform, process rewards and payments, prevent fraud, and improve our services. We do not sell your personal data to third parties.",
  },
  {
    title: "Data Storage and Security",
    content: "Your data is stored securely using Supabase (PostgreSQL) with row-level security. Financial transactions are protected with industry-standard encryption. Wallet addresses are stored only to process withdrawal requests.",
  },
  {
    title: "Third-Party Services",
    content: "We use Binance Pay for payment processing and Monetag for ad delivery. These services have their own privacy policies. We share only necessary data with these providers to process transactions.",
  },
  {
    title: "Data Retention",
    content: "We retain your account data for as long as your account is active. Transaction records are kept for up to 5 years for compliance purposes. You may request account deletion by contacting our support team.",
  },
  {
    title: "Your Rights",
    content: "You have the right to access, correct, or delete your personal data. To exercise these rights, contact us via the Support page. We will respond within 30 days.",
  },
  {
    title: "Cookies and Local Storage",
    content: "We use local storage to save your language and theme preferences. No cross-site tracking cookies are used.",
  },
  {
    title: "Changes to This Policy",
    content: "We may update this Privacy Policy from time to time. Changes will be announced via the in-app announcements system. Continued use of LUDZO after changes constitutes acceptance of the new policy.",
  },
];

export default function PrivacyPage() {
  return (
    <AppShell hideNav>
      <PageHeader title="Privacy Policy" back />
      <div className="px-4 py-4 pb-8 space-y-5">
        <p className="text-xs text-[var(--text-muted)]">Last updated: January 2025</p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          This Privacy Policy describes how LUDZO collects, uses, and protects your personal information when you use our Telegram Mini App.
        </p>
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-2">{section.title}</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{section.content}</p>
          </div>
        ))}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)] text-center">
            Questions about this policy? Contact us via the Support page.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
