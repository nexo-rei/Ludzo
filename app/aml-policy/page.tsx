"use client";

import LegalPageLayout from "@/components/legal/LegalPageLayout";

const SECTIONS = [
  {
    title: "1. Our Commitment",
    paragraphs: [
      "LUDZO is committed to maintaining a safe platform and preventing its use for money laundering, fraud, or other illicit activity. This policy outlines the measures we take and the responsibilities of users who hold a USDT balance or make withdrawals.",
    ],
  },
  {
    title: "2. Identity Verification",
    paragraphs: [
      "We reserve the right to request identity verification information from any user, particularly before processing withdrawals or in cases involving unusual account activity. This may include confirming Telegram account details, wallet ownership, or providing additional documentation.",
    ],
    bullets: [
      "Withdrawals may be paused or delayed until verification is completed.",
      "Failure to provide requested verification within a reasonable timeframe may result in a withdrawal being declined or an account being restricted.",
      "Verification requests are made for compliance and security purposes and are handled with care for your privacy, in line with our Privacy Policy.",
    ],
  },
  {
    title: "3. Monitoring of Suspicious Activity",
    paragraphs: [
      "Account activity, including coin earning patterns, referral activity, and wallet transactions, is monitored on an ongoing basis using automated systems and manual review. Activity that deviates significantly from normal usage patterns may be flagged for further investigation.",
    ],
    bullets: [
      "Unusually rapid coin accumulation inconsistent with normal app usage.",
      "Large or frequent withdrawal requests shortly after account creation.",
      "Multiple accounts linked to the same device, IP address, or wallet address.",
      "Patterns consistent with structuring (splitting transactions to avoid review thresholds).",
    ],
  },
  {
    title: "4. Multiple Accounts & Fake Referrals",
    paragraphs: [
      "Each user is permitted one LUDZO account. Creating or operating multiple accounts — whether to claim duplicate rewards, refer yourself, or circumvent limits — is strictly prohibited and is treated as a fraud-prevention matter under this policy, in addition to being a violation of our Terms & Conditions.",
    ],
    bullets: [
      "Referral relationships between accounts that show signs of being controlled by the same person may be invalidated.",
      "Commissions earned from fraudulent or self-referrals will be reversed and the related accounts may be suspended.",
    ],
  },
  {
    title: "5. Bonus & Promotion Abuse",
    paragraphs: [
      "Promotional rewards, bonuses, and streak incentives are intended for genuine individual use. Attempting to claim the same bonus repeatedly through multiple accounts, exploiting bugs in reward systems, or coordinating with others to abuse promotional mechanics constitutes bonus abuse and may result in forfeiture of the related rewards and account restrictions.",
    ],
  },
  {
    title: "6. Automated Scripts & Bots",
    paragraphs: [
      "The use of bots, scripts, emulators, or any automated tools to interact with LUDZO — including to watch ads, complete tasks, claim streaks, or play games — is prohibited. Accounts found to be using such tools may have related rewards reversed and may be suspended or permanently banned, as described in our Fair Play Policy.",
    ],
  },
  {
    title: "7. Suspicious Withdrawals & Transaction Review",
    paragraphs: [
      "All withdrawal requests are subject to review before approval. Reviews may take up to 48 hours, and certain withdrawals may take longer if additional checks are required. We may decline or delay a withdrawal where:",
    ],
    bullets: [
      "The destination wallet address is associated with known fraudulent activity.",
      "The withdrawal pattern is inconsistent with the account's earning history.",
      "The account has been flagged for any of the suspicious activity indicators described above.",
      "Required verification information has not been provided.",
    ],
  },
  {
    title: "8. Account Restrictions",
    paragraphs: [
      "Where suspicious or fraudulent activity is identified, LUDZO may take one or more of the following actions while an investigation is conducted or as a permanent measure: temporarily freeze withdrawals, restrict access to certain features, suspend the account, or permanently terminate the account in line with our Terms & Conditions.",
    ],
  },
  {
    title: "9. Compliance Procedures",
    paragraphs: [
      "We maintain internal procedures for reviewing flagged accounts, escalating significant cases, and retaining relevant records in line with our Privacy Policy's data retention provisions. Where legally required, we may cooperate with law enforcement or regulatory authorities and provide information relevant to an investigation.",
    ],
  },
  {
    title: "10. Reporting Suspicious Activity",
    paragraphs: [
      "If you become aware of activity on LUDZO that may indicate fraud, money laundering, or abuse of the platform, please report it via the Support page. Reports are reviewed confidentially as part of our ongoing compliance efforts.",
    ],
  },
];

export default function AmlPolicyPage() {
  return (
    <LegalPageLayout
      title="AML & Anti-Fraud Policy"
      lastUpdated="June 2026"
      intro="This Anti-Money-Laundering (AML) and Anti-Fraud Policy describes the measures LUDZO takes to detect, prevent, and respond to fraud, abuse, and money-laundering risk on the platform, and what is expected of users."
      sections={SECTIONS}
    />
  );
}
