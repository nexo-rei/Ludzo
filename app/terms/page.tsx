"use client";

import LegalPageLayout from "@/components/legal/LegalPageLayout";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    paragraphs: [
      "By accessing or using LUDZO (\"the App\", \"the Platform\", \"we\", \"us\"), you agree to be bound by these Terms & Conditions (\"Terms\"). If you do not agree to these Terms, please do not access or use the App.",
    ],
  },
  {
    title: "2. Eligibility & Minimum Age",
    paragraphs: [
      "You must be at least 18 years old to create an account or use LUDZO. By using the App, you confirm that you meet this requirement and that you are legally permitted to use platforms of this kind in your jurisdiction. LUDZO may request information to verify your age or identity, and may suspend accounts where eligibility cannot be confirmed.",
    ],
  },
  {
    title: "3. Account Registration & Telegram Ownership",
    paragraphs: [
      "LUDZO operates as a Telegram Mini App and authenticates users through their Telegram account. By signing in, you confirm that you are the legitimate owner of the Telegram account being used, and that the information provided by Telegram (such as your Telegram ID, name, and username) is accurate.",
      "You may only register and use one LUDZO account per person. Your LUDZO account is linked to your Telegram identity and cannot be transferred to another person or Telegram account.",
    ],
  },
  {
    title: "4. Account Responsibility & Security",
    paragraphs: [
      "You are responsible for maintaining the security of the Telegram account associated with your LUDZO account, including keeping your device and Telegram account secure from unauthorized access. LUDZO is not responsible for any loss arising from unauthorized access to your Telegram account.",
    ],
    bullets: [
      "Do not share your account access or allow others to use your LUDZO account.",
      "Notify Support immediately if you believe your account has been compromised.",
      "You are responsible for all activity that occurs through your account.",
    ],
  },
  {
    title: "5. The Coin System — Virtual Currency Disclaimer",
    paragraphs: [
      "Coins are a virtual, in-app currency used within LUDZO. Coins have no real-world monetary value, are not legal tender, cannot be exchanged for cash, and cannot be transferred to other users, withdrawn, or converted into USDT or any other currency.",
      "Coins may be earned through watching rewarded ads, completing tasks, claiming daily streaks, referrals, and — in the future — through games and optional purchases. LUDZO reserves the right to adjust Coin earning rates, values, costs, and availability at any time, including reducing or removing ways to earn Coins.",
    ],
  },
  {
    title: "6. Earning Coins",
    paragraphs: [
      "Coins are earned subject to daily limits and platform rules that may change over time. Examples of current and planned earning methods include watching rewarded video ads (subject to a daily cap), completing one-time or recurring tasks, claiming a daily streak bonus, and earning referral rewards. LUDZO may introduce, modify, or discontinue any earning method at its discretion.",
    ],
  },
  {
    title: "7. USDT Wallet & Withdrawals",
    paragraphs: [
      "USDT held in your LUDZO wallet represents real value associated with your account. You may request withdrawals of your USDT balance to an external wallet address that you provide, subject to the following conditions:",
    ],
    bullets: [
      "A minimum withdrawal amount applies, currently $5 USDT, which may be adjusted by LUDZO at any time.",
      "A processing fee, currently 5% of the withdrawal amount, is deducted before the net amount is sent.",
      "Withdrawal requests are subject to manual review, typically completed within 48 hours, and may be delayed for additional verification under our AML & Anti-Fraud Policy.",
      "LUDZO reserves the right to decline or reverse a withdrawal that is suspected to be fraudulent, erroneous, or in violation of these Terms, our Fair Play Policy, or our AML & Anti-Fraud Policy.",
      "You are solely responsible for providing an accurate and compatible withdrawal address. LUDZO is not responsible for funds sent to an incorrect address provided by you.",
    ],
  },
  {
    title: "8. Future Deposits",
    paragraphs: [
      "LUDZO plans to introduce optional USDT deposits in future releases, which would allow users to add funds to their wallet for use on the platform. Deposit features, minimum amounts, and supported payment methods will be described in-app and governed by these Terms, our Refund Policy, and any additional terms presented at the time of the deposit feature's launch.",
    ],
  },
  {
    title: "9. Future Games",
    paragraphs: [
      "LUDZO plans to introduce additional skill-based and coin-based games, including Ludo Clash, Water Sort, Bottle Match, and other titles. These games will use Coins (and, where applicable, USDT) according to rules disclosed within each game. LUDZO does not operate any games involving real-money wagering against the house; any future competitive or skill-based formats will be clearly described as such within the App.",
    ],
  },
  {
    title: "10. Referral Program",
    paragraphs: [
      "LUDZO's referral program allows users to share a unique referral link. Where applicable, a referral commission (currently 10% of a referred user's first qualifying deposit, once deposits are available) may be credited to the referring user's USDT balance, subject to validation.",
    ],
    bullets: [
      "Referrals must represent genuine, independent individuals. Self-referrals, fake accounts, and coordinated referral schemes are prohibited.",
      "LUDZO may withhold, delay, or reverse referral commissions found to be associated with fraudulent or invalid referrals.",
      "LUDZO may modify or discontinue the referral program, or change commission rates, at any time.",
    ],
  },
  {
    title: "11. Prohibited Activities",
    paragraphs: ["When using LUDZO, you agree that you will not:"],
    bullets: [
      "Create, operate, or attempt to operate more than one account per person (multiple-account abuse).",
      "Refer yourself, create fake accounts to generate referrals, or otherwise abuse the referral program.",
      "Use bots, scripts, emulators, automation tools, or modified clients to interact with the App, complete tasks, claim rewards, or play games.",
      "Manipulate, exploit, or attempt to exploit bugs, vulnerabilities, or unintended behavior of the App for personal gain.",
      "Engage in any activity intended to defraud LUDZO, other users, advertisers, or payment providers.",
      "Use LUDZO for money laundering, to disguise the origin of funds, or for any other unlawful purpose.",
      "Attempt to reverse-engineer, decompile, or interfere with the proper functioning of the App.",
    ],
  },
  {
    title: "12. Fraud Prevention & Verification",
    paragraphs: [
      "To protect the platform and its users, LUDZO may request verification information, monitor account activity, and apply automated or manual review to transactions and rewards, as described in our AML & Anti-Fraud Policy. You agree to cooperate with reasonable verification requests.",
    ],
  },
  {
    title: "13. Platform Rights",
    paragraphs: [
      "LUDZO reserves the right, at its sole discretion and without prior notice, to modify, suspend, or discontinue any part of the App or its features (including earning methods, rewards, games, and the referral program); adjust Coin values, fees, limits, and conversion rates; and update these Terms and other policies from time to time.",
    ],
  },
  {
    title: "14. Account Suspension & Termination",
    paragraphs: [
      "LUDZO may suspend or terminate any account, with or without notice, where we reasonably believe these Terms, our Fair Play Policy, or our AML & Anti-Fraud Policy have been violated, or where required by law.",
    ],
    bullets: [
      "Suspended or terminated accounts forfeit any pending Coins, rewards, or unredeemed bonuses associated with the violation.",
      "USDT balances in suspended or terminated accounts will be handled on a case-by-case basis, in line with our AML & Anti-Fraud Policy and applicable law.",
      "You may stop using LUDZO at any time. Closing your Telegram account or ceasing to use the App does not automatically delete your data — see our Privacy Policy for information on data deletion requests.",
    ],
  },
  {
    title: "15. Limitation of Liability",
    paragraphs: [
      "LUDZO is provided on an \"as is\" and \"as available\" basis, without warranties of any kind, whether express or implied. To the maximum extent permitted by law, LUDZO and its operators are not liable for any indirect, incidental, or consequential losses, including losses arising from platform downtime, errors in Coin balances, delays in reward crediting, or third-party service failures (including payment processors, ad networks, and Telegram itself). Where liability cannot be excluded, our total liability to you is limited to the USDT balance held in your LUDZO wallet at the time the issue arose.",
    ],
  },
  {
    title: "16. Service Availability",
    paragraphs: [
      "LUDZO does not guarantee that the App will be available at all times, or that it will be free from interruptions, delays, or errors. We may perform maintenance, updates, or experience downtime due to factors outside our control (including issues with Telegram, hosting providers, or third-party services). We will aim to communicate planned maintenance via in-app announcements where practical.",
    ],
  },
  {
    title: "17. Updates to These Terms",
    paragraphs: [
      "We may update these Terms from time to time to reflect changes to the platform, new features, or legal requirements. Material changes will be communicated via in-app announcements. Your continued use of LUDZO after an update to these Terms constitutes your acceptance of the revised Terms. If you do not agree with an update, you should stop using the App.",
    ],
  },
  {
    title: "18. Contact",
    paragraphs: [
      "If you have questions about these Terms, please visit the Legal Center for related policies, or contact us through the Support page.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      lastUpdated="June 2026"
      intro="Please read these Terms & Conditions carefully before using LUDZO. They govern your access to and use of the platform, including all current and future features such as ads, tasks, streaks, referrals, the USDT wallet, deposits, and games."
      sections={SECTIONS}
      footerNote={
        <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
          By using LUDZO, you agree to these Terms in full. For related policies, visit the Legal Center.
        </p>
      }
    />
  );
}
