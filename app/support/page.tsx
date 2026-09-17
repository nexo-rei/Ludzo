"use client";

import SymbolIcon from "@/components/ui/SymbolIcon";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MessageIcon, SendIcon, ChevronRightIcon, ChevronDownIcon, RefreshIcon } from "@/components/ui/DuotoneIcons";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import { timeAgo } from "@/lib/utils";
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
  { label: "Tasks & Games", href: "/games", color: "#63D9B4", bg: "rgba(99,217,180,0.12)", icon: <GamesIcon size={18} /> },
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

const TICKET_CATEGORIES = [
  { value: "general", label: "General question" },
  { value: "withdrawal", label: "Withdrawal issue" },
  { value: "deposit", label: "Deposit issue" },
  { value: "task", label: "Task / reward issue" },
  { value: "game", label: "Ludo game issue" },
  { value: "account", label: "Account access" },
  { value: "other", label: "Something else" },
];

interface TicketMessage {
  id: string;
  sender_type: string;
  sender_name?: string;
  body: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  admin_reply?: string | null;
  created_at: string;
  updated_at: string;
  messages: TicketMessage[];
}

const STATUS_VARIANT: Record<string, "warning" | "blue" | "success" | "default"> = {
  open: "warning",
  in_progress: "blue",
  resolved: "success",
  closed: "default",
};

export default function SupportPage() {
  const router = useRouter();
  const { userId } = useApp();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [setupWarning, setSetupWarning] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!userId) return;
    setTicketsLoading(true);
    try {
      const res = await fetch("/api/support", { headers: { "x-user-id": userId } });
      const data = await res.json();
      if (data.success) {
        setTickets(Array.isArray(data.data) ? data.data : []);
        setSetupWarning(data.warning === "support_table_missing");
      }
    } catch {
      /* silent — form se naya ticket phir bhi try kar sakte ho */
    } finally {
      setTicketsLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    if (!userId) {
      showToast("Please open the app from Telegram to link your account.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), category }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setSubject("");
        setMessage("");
        setCategory("general");
        showToast("Ticket submitted! We'll get back to you soon.", "success");
        await loadTickets();
      } else {
        if (data.code === "support_table_missing") setSetupWarning(true);
        showToast(data.error ?? "Failed to submit ticket", "error");
      }
    } catch {
      // Ab /api/support route maujood hai — ye sirf network fail par aata hai
      showToast("Network problem. Please check your connection and try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!userId || replyText.trim().length < 2) return;
    setReplying(true);
    try {
      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ ticket_id: ticketId, message: replyText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        setReplyFor(null);
        showToast("Reply sent", "success");
        await loadTickets();
      } else {
        showToast(data.error ?? "Reply failed", "error");
      }
    } catch {
      showToast("Network problem. Please try again.", "error");
    } finally {
      setReplying(false);
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
        {setupWarning && (
          <div className="rounded-xl px-4 py-3 text-[11px] leading-relaxed"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#D97706" }}>
            Support system setup pending hai. Please contact us on Telegram in the meantime —
            admin ko <span className="font-mono">sql/05_support_and_task_verification.sql</span> run karna hai.
          </div>
        )}

        {/* Direct contact */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 flex flex-col items-center text-center gap-4"
        >
          <div className="w-14 h-14 rounded-full bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center">
            <MessageIcon size={24} className="text-[#229ED9]" />
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
            <MessageIcon size={16} /> Open Telegram
          </button>
        </motion.div>

        {/* Ticket form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5"
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Submit a Ticket</h3>

          {submitted ? (
            <div className="text-center py-4">
              <div className="mb-3 text-[var(--accent)]"><SymbolIcon name="success" size={40} /></div>
              <h4 className="font-semibold text-[var(--text-primary)]">Ticket Submitted!</h4>
              <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                We received your message and will respond as soon as possible. Replies show up in
                &ldquo;My Tickets&rdquo; below and in Telegram.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 px-5 py-2 text-sm text-[#23856C] border border-[#23856C]/40 rounded-xl hover:bg-[#23856C]/10 transition-colors"
              >
                Submit Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-muted)] font-medium">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl
                             text-[var(--text-primary)] text-sm outline-none focus:border-[#23856C] transition-colors"
                >
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] font-medium">Subject</label>
                <input
                  type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Briefly describe your issue"
                  className="w-full mt-1.5 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl
                             text-[var(--text-primary)] text-sm outline-none focus:border-[#23856C] transition-colors"
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
                             text-[var(--text-primary)] text-sm outline-none focus:border-[#23856C] transition-colors resize-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !subject.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                           bg-[#23856C] text-white font-bold text-sm hover:bg-[#196A55]
                           transition-colors disabled:opacity-60"
              >
                <SendIcon size={14} />
                {submitting ? "Submitting…" : "Send Ticket"}
              </button>
            </form>
          )}
        </motion.div>

        {/* My tickets */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">My Tickets</h3>
            <button onClick={loadTickets} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <RefreshIcon size={14} />
            </button>
          </div>

          {ticketsLoading ? (
            <p className="px-4 pb-4 text-xs text-[var(--text-muted)]">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="px-4 pb-4 text-xs text-[var(--text-muted)]">
              No tickets yet. Submit one above and it will show up here with our reply.
            </p>
          ) : (
            <div>
              {tickets.map((t, i) => {
                const open = expanded === t.id;
                return (
                  <div key={t.id} style={{ borderTop: i === 0 ? "1px solid var(--border)" : "none", borderBottom: i < tickets.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <button
                      onClick={() => setExpanded(open ? null : t.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[rgba(35,133,108,0.06)] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{t.subject}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {t.category} · {timeAgo(t.updated_at ?? t.created_at)} · {(t.messages?.length ?? 0) || 1} message{((t.messages?.length ?? 0) || 1) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANT[t.status] ?? "default"} size="sm">
                        {t.status.replace(/_/g, " ")}
                      </Badge>
                      {open ? <ChevronDownIcon size={14} className="text-[var(--text-muted)]" /> : <ChevronRightIcon size={14} className="text-[var(--text-muted)]" />}
                    </button>

                    {open && (
                      <div className="px-4 pb-4 space-y-2.5">
                        {(t.messages && t.messages.length > 0 ? t.messages : [{
                          id: "root", sender_type: "user", sender_name: "", body: t.message, created_at: t.created_at,
                        }]).map((m) => (
                          <div
                            key={m.id}
                            className="rounded-xl p-3"
                            style={{
                              background: m.sender_type === "admin" ? "rgba(35,133,108,0.1)" : "var(--bg)",
                              border: `1px solid ${m.sender_type === "admin" ? "rgba(35,133,108,0.3)" : "var(--border)"}`,
                            }}
                          >
                            <p className="text-[10px] text-[var(--text-muted)] mb-1">
                              {m.sender_type === "admin" ? `Support${m.sender_name ? ` · ${m.sender_name}` : ""}` : "You"} · {timeAgo(m.created_at)}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{m.body}</p>
                          </div>
                        ))}

                        {t.status !== "closed" && (
                          replyFor === t.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                                placeholder="Add more details…"
                                className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-xs outline-none focus:border-[#23856C] resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReply(t.id)}
                                  disabled={replying || replyText.trim().length < 2}
                                  className="flex-1 py-2.5 rounded-xl bg-[#23856C] text-white text-xs font-bold disabled:opacity-50"
                                >
                                  {replying ? "Sending…" : "Send"}
                                </button>
                                <button
                                  onClick={() => { setReplyFor(null); setReplyText(""); }}
                                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setReplyFor(t.id); setReplyText(""); }}
                              className="text-[11px] font-semibold text-[#23856C] hover:underline"
                            >
                              + Add a reply
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Categories */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[rgba(35,133,108,0.06)] transition-colors"
              style={{ borderTop: i === 0 ? "1px solid var(--border)" : "none", borderBottom: i < QUICK_LINKS.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
              <ChevronRightIcon size={13} className="text-[#475569]" />
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
