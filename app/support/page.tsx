"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MessageCircle, Send, ChevronRight } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import {
  WithdrawalIcon,
  DepositIcon,
  ReferralIcon,
  GamesIcon,
  FaqIcon,
  SupportDisputesIcon,
} from "@/components/ui/Icons";

const SUPPORT_USERNAME = process.env.NEXT_PUBLIC_SUPPORT_USERNAME ?? "LudzoSupport";

const CATEGORIES = [
  { label: "Withdrawals", href: "/withdraw", color: "#10B981", bg: "rgba(16,185,129,0.12)", icon: <WithdrawalIcon size={18} /> },
  { label: "Deposits", href: "/deposit", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: <DepositIcon size={18} /> },
  { label: "Referrals", href: "/refer", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: <ReferralIcon size={18} /> },
  { label: "Tasks & Games", href: "/games", color: "#A855F7", bg: "rgba(168,85,247,0.12)", icon: <GamesIcon size={18} /> },
  { label: "FAQ", href: "/faq", color: "#06B6D4", bg: "rgba(6,182,212,0.12)", icon: <FaqIcon size={18} /> },
  { label: "Disputes & Appeals", href: "/support-disputes", color: "#EF4444", bg: "rgba(239,68,68,0.12)", icon: <SupportDisputesIcon size={18} /> },
];

const QUICK_LINKS = [
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Fair Play Policy", href: "/fair-play" },
  { label: "AML & Anti-Fraud", href: "/aml-policy" },
  { label: "Legal Center", href: "/legal" },
];

const RESPONSE_TIMES = [
  { label: "General support tickets", value: "24–48 hours" },
  { label: "Withdrawal reviews", value: "Up to 48 hours" },
  { label: "Refund requests", value: "3–7 business days" },
  { label: "Appeals & disputes", value: "5–7 business days" },
];

export default function SupportPage() {
  const router = useRouter();
  const { userId } = useApp();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !userId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        showToast("Ticket submitted! We'll get back to you soon.", "success");
      } else {
        showToast(data.error ?? "Failed to submit ticket", "error");
      }
    } catch {
      showToast("Connection error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openTelegram = () => {
    const tgUrl = `https://t.me/${SUPPORT_USERNAME}`;
    if (typeof window !== "undefined" && (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp?.openTelegramLink) {
      (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp?.openTelegramLink?.(tgUrl);
    } else {
      window.open(tgUrl, "_blank");
    }
  };

  return (
    <AppShell hideNav>
      <PageHeader title="Support" back />
      <div className="px-4 py-4 space-y-5 pb-6">
        {/* Direct contact */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 flex flex-col items-center text-center gap-4"
        >
          <div className="w-14 h-14 rounded-full bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center">
            <MessageCircle size={24} className="text-[#229ED9]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Chat with Support</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Get instant help via Telegram. Response time: usually within a few hours.
            </p>
          </div>
          <button
            onClick={openTelegram}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#229ED9] text-white font-bold text-sm
                       hover:bg-[#1a8abf] transition-colors shadow-lg shadow-[#229ED9]/25"
          >
            <MessageCircle size={16} /> Open Telegram
          </button>
        </motion.div>

        {/* Categories */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
            Browse by Category
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {CATEGORIES.map(({ label, href, color, bg, icon }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl text-center transition-colors"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: bg, border: `1px solid ${color}30`, color }}
                >
                  {icon}
                </div>
                <span className="text-[11px] font-semibold text-[var(--text-primary)] leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Ticket form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5"
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Submit a Ticket</h3>

          {submitted ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <h4 className="font-semibold text-[var(--text-primary)]">Ticket Submitted!</h4>
              <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                We received your message and will respond as soon as possible. Check Telegram for updates.
              </p>
              <button
                onClick={() => { setSubmitted(false); setSubject(""); setMessage(""); }}
                className="mt-4 px-5 py-2 text-sm text-[#7C3AED] border border-[#7C3AED]/40 rounded-xl hover:bg-[#7C3AED]/10 transition-colors"
              >
                Submit Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-muted)] font-medium">Subject</label>
                <input
                  type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Briefly describe your issue"
                  className="w-full mt-1.5 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl
                             text-[var(--text-primary)] text-sm outline-none focus:border-[#7C3AED] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] font-medium">Message</label>
                <textarea
                  value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail…"
                  rows={5}
                  className="w-full mt-1.5 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl
                             text-[var(--text-primary)] text-sm outline-none focus:border-[#7C3AED] transition-colors resize-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !subject.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                           bg-[#7C3AED] text-white font-bold text-sm hover:bg-[#5B21B6]
                           transition-colors disabled:opacity-60"
              >
                <Send size={14} />
                {submitting ? "Submitting…" : "Send Ticket"}
              </button>
            </form>
          )}
        </motion.div>

        {/* Common issue shortcuts */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] px-4 pt-4 pb-1">Common Issue Shortcuts</h3>
          {QUICK_LINKS.map(({ label, href }, i) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[rgba(124,58,237,0.06)] transition-colors"
              style={{ borderTop: i === 0 ? "1px solid var(--border)" : "none", borderBottom: i < QUICK_LINKS.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
              <ChevronRight size={13} className="text-[#475569]" />
            </button>
          ))}
        </motion.div>

        {/* Response expectations */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="rounded-2xl p-4"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Response Expectations</h3>
          <div className="space-y-2.5">
            {RESPONSE_TIMES.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">{row.label}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{row.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mt-3 pt-3 border-t border-[var(--border)]">
            Critical issues (such as account access problems) are prioritized. For full details on our
            process, see Support &amp; Disputes in the Legal Center.
          </p>
        </motion.div>
      </div>
    </AppShell>
  );
}
