"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import {
  TermsIcon,
  PrivacyShieldIcon,
  ResponsibleGamingIcon,
  RefundIcon,
  AMLShieldIcon,
  FairPlayIcon,
  SupportDisputesIcon,
  LegalIcon,
} from "@/components/ui/Icons";

const LEGAL_ITEMS = [
  {
    label: "Terms & Conditions",
    description: "The rules that govern your use of LUDZO",
    href: "/terms",
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.12)",
    icon: <TermsIcon size={16} />,
  },
  {
    label: "Privacy Policy",
    description: "How we collect, use, and protect your data",
    href: "/privacy",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.12)",
    icon: <PrivacyShieldIcon size={16} />,
  },
  {
    label: "Responsible Gaming Policy",
    description: "Play responsibly — tips and safeguards",
    href: "/responsible-gaming",
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    icon: <ResponsibleGamingIcon size={16} />,
  },
  {
    label: "Refund Policy",
    description: "Refund eligibility and request process",
    href: "/refund-policy",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    icon: <RefundIcon size={16} />,
  },
  {
    label: "AML & Anti-Fraud Policy",
    description: "Anti-money-laundering and fraud prevention",
    href: "/aml-policy",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    icon: <AMLShieldIcon size={16} />,
  },
  {
    label: "Fair Play Policy",
    description: "No bots, cheats, or exploits — ever",
    href: "/fair-play",
    color: "#A855F7",
    bg: "rgba(168,85,247,0.12)",
    icon: <FairPlayIcon size={16} />,
  },
  {
    label: "Support & Disputes",
    description: "How issues, tickets, and appeals are handled",
    href: "/support-disputes",
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.12)",
    icon: <SupportDisputesIcon size={16} />,
  },
];

export default function LegalCenterPage() {
  const router = useRouter();

  return (
    <AppShell hideNav>
      <PageHeader title="Legal Center" back />
      <div className="px-4 py-4 space-y-5 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl p-5 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(59,130,246,0.1) 100%)",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
          />
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.35)" }}
            >
              <span style={{ color: "#A855F7" }}>
                <LegalIcon size={20} />
              </span>
            </div>
            <h2 className="text-base font-black text-[var(--text-primary)]">Legal Center</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Everything you need to know about how LUDZO operates, your rights, and our policies.
            Please review these documents to understand how the platform works.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          {LEGAL_ITEMS.map(({ label, description, href, color, bg, icon }, i) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[rgba(124,58,237,0.06)] transition-colors"
              style={{ borderBottom: i < LEGAL_ITEMS.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: bg, border: `1px solid ${color}30`, color }}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{description}</p>
              </div>
              <ChevronRight size={13} className="text-[#475569] shrink-0" />
            </button>
          ))}
        </motion.div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
            LUDZO is a rewards and engagement platform. Coins are virtual in-app currency with no cash
            value. These policies are provided for transparency and may be updated as the platform grows.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
