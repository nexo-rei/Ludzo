"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import { useApp } from "@/hooks/useApp";
import { formatUSDT, formatDateTime } from "@/lib/utils";

interface DepositHistoryItem {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  completed_at?: string;
  binance_transaction_id?: string;
}

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  completed: "success", pending: "warning", failed: "error",
};

export default function DepositPage() {
  const { userId } = useApp();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<DepositHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [walletRes, histRes] = await Promise.all([
        fetch("/api/wallet", { headers: { "x-user-id": userId } }),
        fetch("/api/deposits/history", { headers: { "x-user-id": userId } }),
      ]);
      const [walletData, histData] = await Promise.all([walletRes.json(), histRes.json()]);
      if (walletData.success) setBalance(walletData.data.usdt_balance ?? 0);
      if (histData.success) setHistory(histData.data.items ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleDeposit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt < 5) { setError("Minimum deposit is $5"); return; }
    if (!userId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/deposits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Redirecting to Binance Pay… 💰", "success");
        window.open(data.data.payment_url, "_blank");
        setAmount("");
        setTimeout(load, 5000);
      } else {
        setError(data.error ?? "Failed to create deposit");
      }
    } catch { setError("Connection error. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <AppShell hideNav>
      <PageHeader title="Deposit USDT" back />
      <div className="px-4 py-4 space-y-5 pb-6">
        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 text-center"
        >
          <p className="text-xs text-[var(--text-muted)] mb-1">Current Balance</p>
          <p className="text-4xl font-black font-numeric text-[#10B981]">
            ${formatUSDT(balance)} <span className="text-lg text-[var(--text-muted)]">USDT</span>
          </p>
        </motion.div>

        {/* Deposit form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Deposit with Binance Pay</h3>

          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium">Amount (USDT)</label>
            <div className="relative mt-1.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-semibold">$</span>
              <input
                type="number"
                min={5}
                step={1}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl
                           text-[var(--text-primary)] font-numeric text-base outline-none
                           focus:border-[#7C3AED] transition-colors"
              />
            </div>
            {error && <p className="text-xs text-[#EF4444] mt-1.5">{error}</p>}
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Minimum deposit: $5.00</p>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2">
            {[10, 25, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  amount === String(v)
                    ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#A855F7]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[#7C3AED]/40"
                }`}
              >
                ${v}
              </button>
            ))}
          </div>

          <button
            onClick={handleDeposit}
            disabled={submitting || !amount}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl
                       bg-[#F0B90B] hover:bg-[#D4A00A] text-black font-bold text-sm
                       transition-colors disabled:opacity-60 shadow-lg shadow-[#F0B90B]/20"
          >
            <ExternalLink size={16} />
            {submitting ? "Processing…" : "Pay with Binance Pay"}
          </button>

          <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed">
            You'll be redirected to Binance Pay to complete the payment. USDT will be credited after confirmation.
          </p>
        </motion.div>

        {/* History */}
        <div>
          <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
            Deposit History
          </h3>
          {loading ? (
            <SkeletonCard />
          ) : history.length === 0 ? (
            <EmptyState emoji="💸" title="No deposits yet" description="Make your first deposit above." />
          ) : (
            <div className="space-y-2">
              {history.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl">
                  <span className="text-xl">💰</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold font-numeric text-[#10B981]">+${formatUSDT(d.amount)} USDT</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{formatDateTime(d.created_at)}</div>
                  </div>
                  <Badge variant={STATUS_COLOR[d.status] ?? "default"} size="sm">{d.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
