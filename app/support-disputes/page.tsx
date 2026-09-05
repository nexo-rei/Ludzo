"use client";

import { useRouter } from "next/navigation";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

const SECTIONS = [
  {
    title: "1. How Support Works",
    paragraphs: [
      "Our Support team helps with account issues, transaction questions, technical problems, and policy questions. Support is available through in-app tickets and our Telegram support channel. We aim to respond to every request, though response times vary by issue type and volume.",
    ],
  },
  {
    title: "2. Submitting a Ticket",
    paragraphs: [
      "To open a support ticket, go to the Support page from your Profile menu, fill in a subject and description, and submit. For faster help, include as much detail as possible:",
    ],
    bullets: [
      "Your Telegram username or ID.",
      "A clear description of the issue and when it occurred.",
      "Any relevant transaction IDs, screenshots, or error messages.",
      "Steps you've already taken to try to resolve the issue.",
    ],
  },
  {
    title: "3. Withdrawal Issues",
    paragraphs: [
      "Withdrawals are reviewed manually and typically processed within 48 hours of being approved. If your withdrawal has been pending beyond this window, or was rejected and you're unsure why, submit a ticket with your withdrawal date, amount, and wallet address (you can omit the final characters for privacy in your initial message — full details may be requested for verification).",
    ],
    bullets: [
      "Rejected withdrawals are returned to your in-app USDT balance — see our Refund Policy for details.",
      "Withdrawals may be subject to additional review under our AML & Anti-Fraud Policy, which can extend processing time.",
    ],
  },
  {
    title: "4. Deposit Issues",
    paragraphs: [
      "Deposits are planned for a future release. Once available, if a deposit payment is completed but not reflected in your balance, contact Support with your payment confirmation details so we can investigate with our payment processor.",
    ],
  },
  {
    title: "5. Referral Issues",
    paragraphs: [
      "If a referral commission you expected hasn't appeared, check that your referred user has completed the qualifying action (such as their first deposit, once deposits are live). If you believe a commission is missing in error, contact Support with your referral link and the username or ID of the referred account.",
    ],
  },
  {
    title: "6. Technical Issues",
    paragraphs: [
      "For issues such as the app failing to load, ads not registering, or games disconnecting mid-session, try restarting the Telegram app first. If the issue persists, submit a ticket describing the device and Telegram version you're using, along with what you were doing when the issue occurred. If a confirmed platform-side fault affected your rewards, see our Refund Policy regarding reinstating Coins.",
    ],
  },
  {
    title: "7. Dispute & Appeal Process",
    paragraphs: [
      "If you disagree with an account action — such as a withdrawal rejection, reward reversal, or suspension — you can submit an appeal through the Support page. Please reference the original ticket or notification, if any, and explain why you believe the action should be reviewed.",
    ],
    bullets: [
      "Appeals are reviewed by a member of our team who was not involved in the original decision, where possible.",
      "We may request additional information or verification as part of the appeal review.",
      "Decisions on appeals are final once communicated, unless new information becomes available.",
    ],
  },
  {
    title: "8. Review Timelines",
    paragraphs: ["Typical timelines for common requests are:"],
    bullets: [
      "General support tickets: response within 24–48 hours.",
      "Withdrawal reviews: up to 48 hours from submission.",
      "Refund requests: 3–7 business days.",
      "Appeals: reviewed within 5–7 business days of submission.",
    ],
  },
  {
    title: "9. Contact Information",
    paragraphs: [
      "You can reach Support directly via Telegram or by submitting a ticket through the in-app Support page. Contact details are available on the Support page and may be updated from time to time via in-app announcements.",
    ],
  },
];

export default function SupportDisputesPage() {
  const router = useRouter();

  return (
    <LegalPageLayout
      title="Support & Disputes"
      lastUpdated="June 2026"
      intro="This page explains how LUDZO's support and dispute process works — from submitting a ticket to appealing a decision. For category-specific issues such as withdrawals, deposits, and technical problems, see the sections below."
      sections={SECTIONS}
      footerNote={
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
            Need help right now? Open a support ticket or chat with our team.
          </p>
          <button
            onClick={() => router.push("/support")}
            className="px-5 py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-bold hover:bg-[#5B21B6] transition-colors"
          >
            Go to Support
          </button>
        </div>
      }
    />
  );
}
