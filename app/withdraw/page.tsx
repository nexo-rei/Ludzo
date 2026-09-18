"use client";
import SymbolIcon from "@/components/ui/SymbolIcon";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import { useApp } from "@/hooks/useApp";
import { formatUSDT, formatDateTime } from "@/lib/utils";

interface WithdrawalItem {
  id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  wallet_address: string;
  status: string;
  created_at: string;
}

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  paid: "success", approved: "success", pending: "warning", rejected: "error",
};

const WITHDRAWAL_FEE_PCT = 5;

export default function WithdrawPage() {
  const { userId, t } = useApp();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ amount?: string; address?: string; general?: string }>({});

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [walletRes, histRes] = await Promise.all([
        fetch("/api/wallet", { headers: { "x-user-id": userId } }),
        fetch("/api/withdrawals/history", { headers: { "x-user-id": userId } }),
      ]);
      const [walletData, histData] = await Promise.all([walletRes.json(), histRes.json()]);
      if (walletData.success) setBalance(walletData.data.usdt_balance ?? 0);
      if (histData.success) setHistory(histData.data.items ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const amountNum = parseFloat(amount) || 0;
  const fee = amountNum * (WITHDRAWAL_FEE_PCT / 100);
  const netAmount = amountNum - fee;

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!amountNum || amountNum < 5) errs.amount = t("min_withdraw_note", { amount: 5 });
    else if (amountNum > balance) errs.amount = t("insufficient_balance");
    if (!address.trim()) errs.address = t("error");
    else if (address.trim().length < 20) errs.address = t("error");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleWithdraw = async () => {
    if (!validate() || !userId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ amount: amountNum, wallet_address: address.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Withdrawal submitted! Admin will review within 48h.", "success");
        setAmount("");
        setAddress("");
        await load();
      } else {
        setErrors({ general: data.error ?? t("failed") });
      }
    } catch { setErrors({ general: t("error") }); }
    finally { setSubmitting(false); }
  };

  return (
    <AppShell hideNav>
      <PageHeader title={t("withdraw_title")} back />
      <div className="px-4 py-4 space-y-5 pb-6">
        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 text-center"
        >
          <p className="text-xs text-[var(--text-muted)] mb-1">{t("available_balance")}</p>
          <p className="text-4xl font-black font-numeric text-[#10B981]">
            ${formatUSDT(balance)} <span className="text-lg text-[var(--text-muted)]">USDT</span>
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{t("withdrawal_request")}</h3>

          {/* Amount */}
          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium">{t("amount")} (USDT)</label>
            <div className="relative mt-1.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-semibold">$</span>
              <input
                type="number" min={5} step={1} value={amount}
                onChange={(e) => { setAmount(e.target.value); setErrors({}); }}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl
                           text-[var(--text-primary)] font-numeric text-base outline-none focus:border-[#23856C] transition-colors"
              />
            </div>
            {errors.amount && <p className="text-xs text-[#EF4444] mt-1">{errors.amount}</p>}
          </div>

          {/* Wallet address */}
          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium">{t("wallet_address_label")}</label>
            <input
              type="text" value={address}
              onChange={(e) => { setAddress(e.target.value); setErrors({}); }}
              placeholder="Your USDT wallet address"
              className="w-full mt-1.5 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl
                         text-[var(--text-primary)] text-sm outline-none focus:border-[#23856C] transition-colors font-mono"
            />
            {errors.address && <p className="text-xs text-[#EF4444] mt-1">{errors.address}</p>}
          </div>

          {/* Fee summary */}
          {amountNum > 0 && (
            <div className="bg-[var(--bg)] rounded-xl p-3 space-y-1.5 text-xs">
              {[
                { label: t("amount"), value: `$${formatUSDT(amountNum)}` },
                { label: t("fee_note", { fee: WITHDRAWAL_FEE_PCT }), value: `-$${formatUSDT(fee)}`, className: "text-[#EF4444]" },
                { label: t("you_pay"), value: `$${formatUSDT(Math.max(0, netAmount))}`, bold: true },
              ].map(({ label, value, className, bold }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className={`font-numeric ${bold ? "font-bold text-[var(--text-primary)]" : ""} ${className ?? "text-[var(--text-secondary)]"}`}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {errors.general && <p className="text-xs text-[#EF4444]">{errors.general}</p>}

          <button
            onClick={handleWithdraw}
            disabled={submitting || !amount || !address}
            className="w-full py-4 rounded-xl bg-[#23856C] hover:bg-[#196A55] text-white font-bold text-sm
                       transition-colors disabled:opacity-60 shadow-lg shadow-[#23856C]/30"
          >
            {submitting ? t("submitting") : t("submit_withdrawal")}
          </button>

          <div className="flex items-start gap-2 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl p-3">
            <span className="text-base">⏰</span>
            <p className="text-[10px] text-[#F59E0B] leading-relaxed">
              {t("review_note")}
            </p>
          </div>
        </motion.div>

        {/* History */}
        <div>
          <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">{t("withdrawal_history")}</h3>
          {loading ? (
            <SkeletonCard />
          ) : history.length === 0 ? (
            <EmptyState emoji="💸" title={t("no_withdrawals")} description={t("no_withdrawals_desc")} />
          ) : (
            <div className="space-y-2">
              {history.map((w) => (
                <div key={w.id} className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl">
                  <div className="flex items-center gap-3">
                    <SymbolIcon name="withdraw" />
                    <div className="flex-1">
                      <div className="text-sm font-bold font-numeric text-[var(--text-primary)]">
                        ${formatUSDT(w.amount)} → ${formatUSDT(w.net_amount)} USDT
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">{formatDateTime(w.created_at)}</div>
                    </div>
                    <Badge variant={STATUS_COLOR[w.status] ?? "default"} size="sm">{w.status}</Badge>
                  </div>
                  <div className="mt-1.5 ml-9 text-[10px] text-[var(--text-muted)] font-mono truncate">{w.wallet_address}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
