"use client";

import LegalPageLayout from "@/components/legal/LegalPageLayout";

const SECTIONS = [
  {
    title: "1. Introduction",
    paragraphs: [
      "This Privacy Policy explains what information LUDZO collects, how it is used, how it is stored and protected, and what rights you have over your information. By using LUDZO, you agree to the collection and use of information as described here.",
    ],
  },
  {
    title: "2. Information We Collect",
    paragraphs: [
      "We collect the following categories of information when you use LUDZO:",
    ],
    bullets: [
      "Telegram Profile Information — your Telegram ID, first and last name, username, and profile photo URL, provided automatically when you authenticate via Telegram.",
      "Wallet Information — the USDT wallet address you provide for withdrawals, and (in the future) deposit-related payment details.",
      "Referral Data — your referral link, the accounts you've referred, and referral commission status.",
      "Activity History — records of ads watched, tasks completed, daily streaks claimed, leaderboard activity, and game sessions (for current and future games).",
      "Transaction History — records of Coin balance changes, USDT deposits and withdrawals, and referral commissions.",
      "Device & Usage Information — basic technical information such as device type, app version, and general usage patterns, used for security, analytics, and fraud prevention.",
      "Preferences — your selected language and theme (light/dark), stored to personalize your experience.",
    ],
  },
  {
    title: "3. Cookies & Local Storage",
    paragraphs: [
      "LUDZO uses local device storage (not cross-site tracking cookies) to remember your language and theme preferences and to maintain your session. We do not use third-party advertising cookies for cross-site tracking. Ad partners integrated into the App may use their own technologies as described in their respective privacy policies.",
    ],
  },
  {
    title: "4. How We Use Your Information",
    paragraphs: ["We use the information we collect to:"],
    bullets: [
      "Operate core platform features, including crediting Coins, processing tasks, streaks, referrals, and (where applicable) deposits and withdrawals.",
      "Verify your identity and prevent fraud, multiple-account abuse, and other violations of our Terms & Conditions, Fair Play Policy, and AML & Anti-Fraud Policy.",
      "Communicate with you, including responding to support tickets and sending important announcements about the platform.",
      "Maintain, improve, and troubleshoot the App, including analyzing aggregated usage trends.",
      "Comply with legal obligations, including record-keeping for compliance purposes.",
    ],
  },
  {
    title: "5. Data Storage & Security",
    paragraphs: [
      "Your data is stored using Supabase (PostgreSQL) with row-level security policies designed to ensure that users can only access their own data. We apply industry-standard security practices, including encrypted connections (HTTPS/TLS) for data in transit, to help protect your information from unauthorized access, alteration, or disclosure.",
      "While we take reasonable steps to protect your data, no system is completely secure, and we cannot guarantee absolute security of information transmitted to or stored by LUDZO.",
    ],
  },
  {
    title: "6. Third-Party Services",
    paragraphs: [
      "LUDZO relies on a small number of third-party services to operate, which may receive limited data necessary to perform their function:",
    ],
    bullets: [
      "Telegram — used for authentication and providing your profile information.",
      "Ad Network Providers (e.g. Monetag) — used to deliver rewarded ads; these providers may receive device and usage information necessary to display ads and verify ad views.",
      "Payment Processors (e.g. Binance Pay) — used to process USDT withdrawals and (in the future) deposits; these providers may receive wallet addresses and transaction details necessary to process payments.",
      "Supabase — our database and backend infrastructure provider, used to securely store account and transaction data.",
    ],
    paragraphsAfter: [
      "Each of these providers maintains its own privacy policy governing how it handles data. We share only the information necessary for these services to function, and we do not sell your personal information to advertisers or any other third party.",
    ],
  },
  {
    title: "7. Data Retention",
    paragraphs: [
      "We retain your account information for as long as your account remains active. Transaction records (including deposits, withdrawals, and referral commissions) may be retained for up to 5 years after the related activity, in order to meet accounting, compliance, and AML record-keeping obligations described in our AML & Anti-Fraud Policy.",
    ],
  },
  {
    title: "8. Your Rights",
    paragraphs: ["Depending on your location, you may have rights to:"],
    bullets: [
      "Access the personal information we hold about you.",
      "Request correction of inaccurate or incomplete information.",
      "Request deletion of your personal information, subject to our legitimate need to retain certain records (such as transaction history) for legal and compliance purposes.",
      "Object to or restrict certain processing of your information.",
    ],
    paragraphsAfter: [
      "To exercise any of these rights, contact us via the Support page. We will respond to verified requests within 30 days.",
    ],
  },
  {
    title: "9. Data Deletion Requests",
    paragraphs: [
      "You may request deletion of your account and associated personal information by contacting Support. Please note that we may retain certain records — such as transaction history related to deposits, withdrawals, and referral commissions — for the retention periods described above, even after an account deletion request, where required for legal, tax, or fraud-prevention purposes. Coins and other in-app virtual items have no value outside the platform and are not transferable upon deletion.",
    ],
  },
  {
    title: "10. Children's Privacy",
    paragraphs: [
      "LUDZO is not directed at, and is not intended for use by, individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that we have collected information from someone under the minimum age, we will take steps to delete that information.",
    ],
  },
  {
    title: "11. Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time to reflect changes to our practices, new features (such as deposits), or legal requirements. Material changes will be announced via the in-app announcements system. Continued use of LUDZO after a change to this Policy constitutes acceptance of the updated Policy.",
    ],
  },
  {
    title: "12. Contact Information",
    paragraphs: [
      "If you have questions about this Privacy Policy, or wish to exercise any of your rights described above, please contact us via the Support page or visit the Legal Center for related policies.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="June 2026"
      intro="This Privacy Policy describes how LUDZO collects, uses, stores, and protects your personal information when you use our Telegram Mini App, and explains the choices and rights available to you."
      sections={SECTIONS}
      footerNote={
        <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
          Questions about this policy or your data? Contact us via the Support page.
        </p>
      }
    />
  );
}
