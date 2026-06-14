"use client";

import LegalPageLayout from "@/components/legal/LegalPageLayout";

const SECTIONS = [
  {
    title: "1. An Entertainment-First Platform",
    paragraphs: [
      "LUDZO is built as a rewards and engagement platform. Activities such as watching ads, completing tasks, claiming daily streaks, and playing in-app games are intended for entertainment and light engagement — not as a way to generate significant income or as a substitute for financial planning.",
    ],
  },
  {
    title: "2. Play Responsibly",
    paragraphs: [
      "We encourage every user to treat LUDZO as a fun addition to their day, not an obligation. A few simple habits go a long way toward keeping your experience enjoyable:",
    ],
    bullets: [
      "Use LUDZO during your free time, not as a replacement for work, study, sleep, or time with family and friends.",
      "Treat Coins and any potential USDT rewards as a bonus, never as guaranteed or relied-upon income.",
      "Avoid making financial decisions (such as bill payments or purchases) based on anticipated app earnings or withdrawals.",
    ],
  },
  {
    title: "3. Manage Your Time",
    paragraphs: [
      "It's easy for short app sessions to add up over a day. We recommend keeping track of how much time you spend in LUDZO and setting a personal daily cap that fits comfortably around your other responsibilities.",
    ],
    bullets: [
      "Decide on a maximum daily session length before you start using the app.",
      "Use your phone's built-in screen-time tools to monitor or limit time spent in LUDZO.",
      "If you notice you're checking the app far more often than planned, treat that as a signal to step back.",
    ],
  },
  {
    title: "4. Set Your Own Spending Limits",
    paragraphs: [
      "Future versions of LUDZO may introduce optional deposits. If you choose to use this feature, only ever deposit amounts you are fully comfortable using for entertainment purposes and could afford to lose without any impact on your daily life, savings, or obligations.",
    ],
    bullets: [
      "Decide on a personal spending limit in advance and stick to it, regardless of in-app prompts or offers.",
      "Never deposit funds that are borrowed, set aside for essential expenses, or that you cannot afford to spend.",
      "Avoid chasing losses or trying to 'win back' previously spent amounts — LUDZO is not a gambling platform and outcomes are not designed around wagering.",
    ],
  },
  {
    title: "5. Avoid Compulsive Behavior",
    paragraphs: [
      "Compulsive use of any app — checking it constantly, feeling anxious when you can't open it, or prioritizing it over real-life responsibilities — is not the experience LUDZO is designed to create. If using LUDZO starts to feel like something you can't control, it's important to take that seriously.",
    ],
  },
  {
    title: "6. Warning Signs to Watch For",
    paragraphs: [
      "Consider taking a break from LUDZO, and from similar apps, if you notice any of the following:",
    ],
    bullets: [
      "Spending significantly more time on the app than you originally intended, on a regular basis.",
      "Feeling stressed, anxious, or irritable when you are unable to access the app.",
      "Neglecting work, studies, sleep, meals, or relationships in favor of app activity.",
      "Spending money you can't comfortably afford in pursuit of in-app rewards.",
      "Hiding or downplaying how much time or money you spend on the app to others.",
    ],
  },
  {
    title: "7. Take Regular Breaks",
    paragraphs: [
      "Stepping away from any app periodically is healthy. We encourage users to take regular breaks — daily, weekly, and whenever life gets busy. LUDZO will still be here when you come back, and your account, balances, and progress are preserved during periods of inactivity (subject to our Terms & Conditions).",
    ],
  },
  {
    title: "8. Age Restrictions",
    paragraphs: [
      "LUDZO is intended for users aged 18 and older, in line with our Terms & Conditions. Parents and guardians are encouraged to be aware of the apps installed on devices used by minors and to use available parental control tools where appropriate.",
    ],
  },
  {
    title: "9. Getting Support",
    paragraphs: [
      "If you feel that your use of LUDZO, or of apps and games in general, is becoming difficult to manage, please consider speaking with a trusted person in your life or a qualified professional. You can also reach out to our Support team through the Support page, and we will do our best to help — including, where requested, assisting with steps to reduce your usage of the platform.",
    ],
  },
];

export default function ResponsibleGamingPage() {
  return (
    <LegalPageLayout
      title="Responsible Gaming"
      lastUpdated="June 2026"
      intro="LUDZO is a Telegram Mini App focused on entertainment, rewards, and engagement. This Responsible Gaming Policy explains our approach to healthy usage and the steps you can take to keep your experience positive."
      highlight={{
        title: "Our Commitment",
        text: "LUDZO does not encourage gambling addiction. The platform does not operate any betting, wagering, or prize-pool gambling activity, and Coins have no cash value. This policy exists to help users maintain a healthy, balanced relationship with the app.",
        color: "#10B981",
      }}
      sections={SECTIONS}
      footerNote={
        <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
          If you have concerns about your usage of LUDZO, contact our Support team — we're here to help.
        </p>
      }
    />
  );
}
