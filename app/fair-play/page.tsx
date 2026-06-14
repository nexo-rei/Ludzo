"use client";

import LegalPageLayout from "@/components/legal/LegalPageLayout";

const SECTIONS = [
  {
    title: "1. Our Commitment to Fair Play",
    paragraphs: [
      "LUDZO aims to be an enjoyable platform for everyone. To keep things fair, every user is expected to interact with the app, its games, and its reward systems honestly and as intended. This policy applies to ad rewards, tasks, daily streaks, referrals, the leaderboard, and all current and future games such as Ludo Clash, Water Sort, and Bottle Match.",
    ],
  },
  {
    title: "2. Prohibited Conduct",
    paragraphs: ["The following actions are strictly prohibited on LUDZO:"],
    bullets: [
      "Bots & Automation — using bots, scripts, macros, emulators, or any automated tools to watch ads, complete tasks, claim streaks, play games, or otherwise interact with the app.",
      "Exploits & Bugs — intentionally using software bugs, glitches, or unintended behavior to gain Coins, USDT, items, or an unfair advantage.",
      "Cheating — using modified app versions, third-party software, or any tool that alters game outcomes, timers, or reward calculations.",
      "Manipulation — artificially inflating ad views, task completions, referral counts, or leaderboard rankings through fake interactions or coordinated activity.",
      "Match Fixing — in multiplayer or skill-based games, colluding with other players to predetermine outcomes, intentionally losing for another user's benefit, or coordinating to manipulate results.",
      "Abuse of Bugs — discovering an issue that grants unintended rewards and continuing to exploit it instead of reporting it.",
    ],
  },
  {
    title: "3. Multi-Accounting",
    paragraphs: [
      "Operating more than one LUDZO account — including through alternate Telegram accounts, multiple devices, or shared/borrowed devices — to gain additional rewards, referral bonuses, or leaderboard positions is considered a Fair Play violation and is also addressed under our AML & Anti-Fraud Policy.",
    ],
  },
  {
    title: "4. Detection & Enforcement",
    paragraphs: [
      "LUDZO uses a combination of automated monitoring and manual review to detect violations of this policy. Indicators may include abnormal activity patterns, device fingerprinting, timing analysis, and reports from other users or game systems. Findings are reviewed before any enforcement action is taken.",
    ],
  },
  {
    title: "5. Consequences of Violations",
    paragraphs: [
      "Violations of this Fair Play Policy may result in one or more of the following actions, depending on severity and whether the violation is repeated:",
    ],
    bullets: [
      "Reversal of Coins, USDT, or other rewards obtained through the violation.",
      "Removal from leaderboards or disqualification from competitive results.",
      "Temporary restriction of specific features, such as games, tasks, or withdrawals.",
      "Temporary account suspension.",
      "Permanent account suspension and forfeiture of remaining balances, for severe or repeated violations, as described in our Terms & Conditions.",
    ],
  },
  {
    title: "6. Permanent Suspension",
    paragraphs: [
      "Certain violations — including the use of bots or automation, deliberate match fixing, and serious or repeated exploitation of bugs — may result in immediate and permanent suspension without prior warning, at LUDZO's discretion.",
    ],
  },
  {
    title: "7. Reporting Violations",
    paragraphs: [
      "If you encounter a bug that may grant unintended rewards, or suspect another user of cheating, automation, or match fixing, please report it via the Support page as soon as possible. Reports of genuine bugs are appreciated and help us keep the platform fair for everyone.",
    ],
  },
  {
    title: "8. Appeals",
    paragraphs: [
      "If you believe an enforcement action was taken in error, you may submit an appeal through the Support & Disputes page. Appeals are reviewed by our team, and outcomes are communicated through the same channel used to submit the appeal.",
    ],
  },
];

export default function FairPlayPage() {
  return (
    <LegalPageLayout
      title="Fair Play Policy"
      lastUpdated="June 2026"
      intro="Fair Play is core to the LUDZO experience. This policy explains what conduct is prohibited across all games and reward systems, how violations are detected, and what consequences may follow."
      sections={SECTIONS}
    />
  );
}
