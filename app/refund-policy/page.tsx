"use client";

import LegalPageLayout from "@/components/legal/LegalPageLayout";

const SECTIONS = [
  {
    title: "1. Overview",
    paragraphs: [
      "This Refund Policy explains when refunds may be available on LUDZO and how to request one. It applies to USDT deposits, any future Coin purchases, and other paid features that may be introduced to the platform.",
    ],
  },
  {
    title: "2. Coins Are Non-Refundable",
    paragraphs: [
      "Coins are a virtual, in-app currency with no cash value. Coins earned through ads, tasks, streaks, or referrals — and any Coins acquired in the future through purchases or bundles — are non-refundable once credited to your account, except where required by applicable law.",
    ],
  },
  {
    title: "3. USDT Deposits",
    paragraphs: [
      "Deposits are not yet enabled on LUDZO but are planned for future releases. Once available, deposits will generally be final once successfully processed and credited to your wallet balance, as they represent a transfer of funds into your account for use on the platform.",
    ],
    bullets: [
      "A refund may be considered if a deposit was charged but never credited to your account due to a confirmed technical error.",
      "Refunds are not available simply because a user changes their mind after a deposit has been successfully completed and credited.",
    ],
  },
  {
    title: "4. Failed or Incomplete Transactions",
    paragraphs: [
      "If a payment is deducted from your payment method but the corresponding deposit, withdrawal, or in-app credit is not received, please contact Support with your transaction details. We will investigate with our payment processor and either complete the credit or process a refund once the issue is confirmed.",
    ],
  },
  {
    title: "5. Duplicate Payments",
    paragraphs: [
      "If you are accidentally charged more than once for the same deposit or transaction (for example, due to a network error causing a double submission), please contact Support as soon as possible. Once verified, any duplicate charge will be refunded to the original payment method or credited to your account balance, at our discretion.",
    ],
  },
  {
    title: "6. Technical Issues Affecting Gameplay",
    paragraphs: [
      "If a paid game session is interrupted by a confirmed platform-side technical fault (such as a server outage), any Coins or entry amounts spent on that session may be reinstated to your balance after review. Refunds are not provided for issues caused by the user's own device, internet connection, or for normal gameplay outcomes.",
    ],
  },
  {
    title: "7. Withdrawal Processing",
    paragraphs: [
      "Withdrawal requests are not 'refunds' but are subject to review as described in our Terms & Conditions. If a withdrawal is rejected after review (for example, due to a failed verification check), the withdrawn amount — minus any non-recoverable network or processing fees already incurred — will be returned to your in-app USDT balance.",
    ],
  },
  {
    title: "8. How to Request a Refund",
    paragraphs: [
      "To request a refund, go to the Support page and submit a ticket, or use the Support & Disputes page in the Legal Center. Please include the following information so we can investigate quickly:",
    ],
    bullets: [
      "Your Telegram ID or username associated with your LUDZO account.",
      "The date and approximate time of the transaction.",
      "The transaction ID or payment reference, if available.",
      "A description of the issue, including any error messages received.",
    ],
  },
  {
    title: "9. Refund Review Timeline",
    paragraphs: [
      "Refund requests are typically reviewed within 3–7 business days of submission. Complex cases involving third-party payment providers may take longer. You will be notified of the outcome via the same channel you used to submit your ticket.",
    ],
  },
  {
    title: "10. Cases Where Refunds Are Not Available",
    paragraphs: ["Refunds will generally not be issued in the following situations:"],
    bullets: [
      "Coins, rewards, or balances that have already been spent, transferred, or used within the platform.",
      "Disputes arising from a user's own change of mind after a transaction has completed successfully.",
      "Losses resulting from a user sharing their account or device access with others.",
      "Activity flagged as fraudulent, abusive, or in violation of our Terms & Conditions, Fair Play Policy, or AML & Anti-Fraud Policy.",
      "Issues caused by incorrect information provided by the user, such as an incorrect wallet address.",
    ],
  },
  {
    title: "11. Changes to This Policy",
    paragraphs: [
      "As deposits, Coin purchases, and new games are introduced, this Refund Policy may be updated to reflect those features. Material changes will be announced via the in-app announcements system.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout
      title="Refund Policy"
      lastUpdated="June 2026"
      intro="This Refund Policy describes when refunds may be available for transactions made on LUDZO, and how to request one. Please read it carefully before making any payment on the platform."
      sections={SECTIONS}
    />
  );
}
