"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, CheckCircle, Clock, XCircle, AlertCircle, Loader2, ChevronLeft, Coins, Zap
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import { useApp } from "@/hooks/useApp";
import { formatDateTime } from "@/lib/utils";

type Network = "TRC20" | "BEP20" | "TON";
type PaymentStatus = "waiting" | "confirming" | "finished" | "failed" | "expired";
type Screen = "select" | "payment";

interface ActivePayment {
  deposit_id:      string;
  payment_id:      string;
  payment_address: string;
  usdt_amount:     number;
  coin_amount:     number;
  network:         Network;
  status:          PaymentStatus;
}

interface DepositHistoryItem {
  id:                  string;
  coin_amount?:        number;
  usdt_amount?:        number;
  amount:              number;
  network?:            string;
  nowpayments_status?: string;
  status:              string;
  created_at:          string;
}

const PRESET_COINS = [100, 200, 500, 1000, 2000, 5000];

const NETWORKS: { id: Network; label: string; desc: string; badge: string }[] = [
  { id: "TRC20", label: "USDT TRC20", desc: "Tron Network",   badge: "Low Fee" },
  { id: "BEP20", label: "USDT BEP20", desc: "BSC Network",    badge: "Fast"    },
  { id: "TON",   label: "USDT TON",   desc: "TON Blockchain", badge: "Popular" },
];

const STATUS_META: Record<PaymentStatus, {
  label: string; color: string;
  icon: React.ReactNode;
  badge: "success" | "warning" | "error" | "default";
}> = {
  waiting:    { label: "Waiting for payment",      color: "text-yellow-400", icon: <Clock       size={16} />,                                  badge: "warning" },
  confirming: { label: "Confirming on blockchain", color: "text-blue-400",   icon: <Loader2     size={16} className="animate-spin" />,         badge: "default" },
  finished:   { label: "Payment complete",          color: "text-green-400",  icon: <CheckCircle size={16} />,                                  badge: "success" },
  failed:     { label: "Payment failed",            color: "text-red-400",    icon: <XCircle     size={16} />,                                  badge: "error"   },
  expired:    { label: "Payment expired",           color: "text-gray-400",   icon: <AlertCircle size={16} />,                                  badge: "default" },
};

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  completed: "success", pending: "warning", failed: "error",
  finished: "success", waiting: "warning", confirming: "default", expired: "default",
};

const TERMINAL = new Set<PaymentStatus>(["finished", "failed", "expired"]);

function coinsToUsdt(coins: number): number {
  return parseFloat((coins / 100).toFixed(2));
}

function formatCoins(n: number): string {
  return n.toLocaleString();
}

function formatDateTime2(dt: string): string {
  return new Date(dt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function DepositPage() {
  const { userId } = useApp();

  const [screen,      setScreen]      = useState<Screen>("select");
  const [coinAmount,  setCoinAmount]  = useState<number>(500);
  const [customInput, setCustomInput] = useState("");
  const [useCustom,   setUseCustom]   = useState(false);
  const [network,     setNetwork]     = useState<Network>("TRC20");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");
  const [payment,     setPayment]     = useState<ActivePayment | null>(null);
  const [history,     setHistory]     = useState<DepositHistoryItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [copiedAddr,  setCopiedAddr]  = useState(false);
  const [copiedAmt,   setCopiedAmt]   = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveCoinAmount = useCustom ? (Number(customInput) || 0) : coinAmount;
  const usdtAmount  = coinsToUsdt(effectiveCoinAmount);
  const isValidAmount = effectiveCoinAmount >= 100 && effectiveCoinAmount <= 5000;

  const loadData = useCallback(async () => {
    if (!userId) return;
    setHistLoading(true);
    try {
      const [wRes, hRes] = await Promise.all([
        fetch("/api/wallet",           { headers: { "x-user-id": userId } }),
        fetch("/api/deposits/history", { headers: { "x-user-id": userId } }),
      ]);
      const [w, h] = await Promise.all([wRes.json(), hRes.json()]);
      if (w.success) setCoinBalance(w.data.coin_balance ?? 0);
      if (h.success) setHistory(h.data.items ?? []);
    } catch { /* silent */ }
    finally { setHistLoading(false); }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const pollStatus = useCallback(async (pid: string) => {
    if (!userId) return;
    try {
      const res  = await fetch(`/api/deposits/status/${pid}`, { headers: { "x-user-id": userId } });
      const data = await res.json();
      if (!data.success) return;
      const st = data.data.status as PaymentStatus;
      setPayment((prev) => prev ? { ...prev, status: st } : prev);
      if (TERMINAL.has(st)) {
        if (pollRef.current) clearInterval(pollRef.current);
        if (st === "finished") {
          showToast(`Payment confirmed! +${formatCoins(data.data.coin_amount ?? 0)} Coins`, "success");
          await loadData();
        }
      }
    } catch { /* silent */ }
  }, [userId, loadData]);

  useEffect(() => {
    if (!payment || TERMINAL.has(payment.status)) return;
    const pid = payment.payment_id;
    pollRef.current = setInterval(() => pollStatus(pid), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [payment, pollStatus]);

  const handleCreatePayment = async () => {
    setError("");
    if (!isValidAmount) { setError("Please enter a coin amount between 100 and 5000."); return; }
    if (!userId) return;
    setSubmitting(true);
    try {
      const res  = await fetch("/api/deposits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body:    JSON.stringify({ coin_amount: effectiveCoinAmount, network }),
      });
      const data = await res.json();
      if (data.success) { setPayment(data.data as ActivePayment); setScreen("payment"); }
      else setError(data.error ?? "Failed to create payment.");
    } catch { setError("Connection error. Please try again."); }
    finally { setSubmitting(false); }
  };

  const copyText = async (text: string, type: "addr" | "amt") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "addr") { setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000); }
      else                 { setCopiedAmt(true);  setTimeout(() => setCopiedAmt(false),  2000); }
      showToast("Copied!", "success");
    } catch { showToast("Copy failed", "error"); }
  };

  const handleBack = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPayment(null);
    setScreen("select");
    loadData();
  };

  // ── Select Screen ──────────────────────────────────────────────────────────
  const SelectScreen = (
    <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* Balance */}
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Current Balance</p>
        <p className="text-3xl font-black font-numeric text-[#7C3AED]">
          {formatCoins(coinBalance)}{" "}
          <span className="text-base text-[var(--text-muted)] font-semibold">Coins</span>
        </p>
      </div>

      {/* Coin selector */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-[#7C3AED]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Buy Coins</h3>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Select Amount</label>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_COINS.map((v) => (
              <button
                key={v}
                onClick={() => { setUseCustom(false); setCoinAmount(v); setError(""); }}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  !useCustom && coinAmount === v
                    ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#A855F7]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[#7C3AED]/40 hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="block font-bold">{formatCoins(v)}</span>
                <span className="block text-[10px] opacity-70">${coinsToUsdt(v).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">Or enter custom amount (100–5000)</label>
          <input
            type="number" min={100} max={5000} step={1}
            value={customInput}
            onFocus={() => setUseCustom(true)}
            onChange={(e) => { setCustomInput(e.target.value); setUseCustom(true); setError(""); }}
            placeholder="e.g. 1250"
            className={`w-full px-4 py-3 bg-[var(--bg)] border rounded-xl text-[var(--text-primary)] font-numeric text-base outline-none transition-colors ${useCustom ? "border-[#7C3AED]" : "border-[var(--border)]"} focus:border-[#7C3AED]`}
          />
        </div>
        {isValidAmount && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="flex items-center justify-between px-4 py-3 bg-[#7C3AED]/5 border border-[#7C3AED]/20 rounded-xl">
            <span className="text-sm text-[var(--text-muted)]">You pay</span>
            <span className="text-sm font-bold text-[#10B981]">${usdtAmount.toFixed(2)} USDT</span>
          </motion.div>
        )}
        {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      </div>

      {/* Network selector */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[#7C3AED]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Select Network</h3>
        </div>
        <div className="space-y-2">
          {NETWORKS.map((n) => (
            <button key={n.id} onClick={() => setNetwork(n.id)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
                network === n.id ? "border-[#7C3AED] bg-[#7C3AED]/8" : "border-[var(--border)] hover:border-[#7C3AED]/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full border-2 transition-colors ${network === n.id ? "border-[#7C3AED] bg-[#7C3AED]" : "border-[var(--border)]"}`} />
                <div className="text-left">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{n.label}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{n.desc}</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">{n.badge}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreatePayment}
        disabled={submitting || !isValidAmount}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? <><Loader2 size={16} className="animate-spin" /> Creating Payment…</>
          : <>Create Payment — {isValidAmount ? `$${usdtAmount.toFixed(2)} USDT` : "Select amount"}</>}
      </button>
      <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed px-4">
        100 Coins = $1.00 USDT · Min 100 · Max 5,000 coins
      </p>
    </motion.div>
  );

  // ── Payment Screen ─────────────────────────────────────────────────────────
  const PaymentScreen = payment ? (() => {
    const meta = STATUS_META[payment.status] ?? STATUS_META.waiting;
    const isTerminal = TERMINAL.has(payment.status);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.payment_address)}&margin=10`;
    const networkLabel = NETWORKS.find((n) => n.id === payment.network)?.label ?? payment.network;

    return (
      <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
        {isTerminal && (
          <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ChevronLeft size={14} /> Back to deposit
          </button>
        )}

        {/* Status */}
        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${
          payment.status === "finished" ? "border-green-500/30 bg-green-500/5"
          : (payment.status === "failed" || payment.status === "expired") ? "border-red-500/30 bg-red-500/5"
          : "border-[var(--border)] bg-[var(--card-bg)]"
        }`}>
          <span className={meta.color}>{meta.icon}</span>
          <div>
            <div className={`text-sm font-bold ${meta.color}`}>{meta.label}</div>
            {!isTerminal && <div className="text-[10px] text-[var(--text-muted)]">Auto-checking every 5 seconds…</div>}
          </div>
        </div>

        {/* Success */}
        {payment.status === "finished" && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
            <div className="text-6xl mb-3">🎉</div>
            <div className="text-xl font-black text-[#10B981]">+{formatCoins(payment.coin_amount)} Coins</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Credited to your wallet</div>
          </motion.div>
        )}

        {/* Payment details */}
        {payment.status !== "finished" && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--bg)] rounded-xl px-4 py-3">
                <div className="text-[10px] text-[var(--text-muted)] mb-0.5">Amount</div>
                <div className="text-base font-bold font-numeric text-[#10B981]">${payment.usdt_amount.toFixed(2)} USDT</div>
              </div>
              <div className="bg-[var(--bg)] rounded-xl px-4 py-3">
                <div className="text-[10px] text-[var(--text-muted)] mb-0.5">Network</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{networkLabel}</div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="Payment QR Code" width={180} height={180} className="rounded-lg" />
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Scan to pay</p>
            </div>

            {/* Address */}
            <div>
              <div className="text-xs text-[var(--text-muted)] font-medium mb-1.5">Payment Address</div>
              <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5">
                <span className="flex-1 text-xs font-mono text-[var(--text-primary)] truncate">{payment.payment_address}</span>
                <button onClick={() => copyText(payment.payment_address, "addr")} className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors">
                  {copiedAddr ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="text-xs text-[var(--text-muted)] font-medium mb-1.5">Exact Amount</div>
              <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5">
                <span className="flex-1 text-sm font-bold font-numeric text-[#10B981]">{payment.usdt_amount.toFixed(2)} USDT</span>
                <button onClick={() => copyText(String(payment.usdt_amount.toFixed(2)), "amt")} className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors">
                  {copiedAmt ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed">
              Send exactly <strong className="text-[var(--text-primary)]">{payment.usdt_amount.toFixed(2)} USDT</strong> to the address above. Coins credited automatically after confirmation.
            </p>
          </div>
        )}
      </motion.div>
    );
  })() : null;

  // ── History ────────────────────────────────────────────────────────────────
  const HistorySection = (
    <div>
      <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Deposit History</h3>
      {histLoading ? <SkeletonCard /> : history.length === 0 ? (
        <EmptyState emoji="💸" title="No deposits yet" description="Make your first deposit above." />
      ) : (
        <div className="space-y-2">
          {history.map((d) => {
            const coins = d.coin_amount ?? Math.round((d.usdt_amount ?? d.amount) * 100);
            const usdt  = d.usdt_amount ?? d.amount;
            const st    = d.nowpayments_status ?? d.status;
            return (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl">
                <span className="text-xl">🪙</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#7C3AED]">+{formatCoins(coins)} Coins</div>
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
                    <span>${usdt.toFixed(2)} USDT</span>
                    {d.network && <><span className="opacity-40">·</span><span>{d.network}</span></>}
                    <span className="opacity-40">·</span>
                    <span>{formatDateTime2(d.created_at)}</span>
                  </div>
                </div>
                <Badge variant={STATUS_COLOR[st] ?? "default"} size="sm">{st}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <AppShell hideNav>
      <PageHeader title={screen === "payment" ? "Complete Payment" : "Buy Coins"} back={screen === "select"} />
      <div className="px-4 py-4 pb-8 space-y-5">
        <AnimatePresence mode="wait">
          {screen === "select"  && SelectScreen}
          {screen === "payment" && PaymentScreen}
        </AnimatePresence>
        {screen === "select" && HistorySection}
      </div>
    </AppShell>
  );
}
