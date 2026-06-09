"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";

const SUPPORT_USERNAME = process.env.NEXT_PUBLIC_SUPPORT_USERNAME ?? "LudzoSupport";

export default function SupportPage() {
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
          <div className="w-14 h-14 rounded-full bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-2xl">
            💬
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

        {/* Info */}
        <div className="text-center">
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            Response time: 24–48 hours • Critical issues prioritized
          </p>
        </div>
      </div>
    </AppShell>
  );
}
