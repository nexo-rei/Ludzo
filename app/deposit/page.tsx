"use client";
import SymbolIcon from "@/components/ui/SymbolIcon";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import { useApp } from "@/hooks/useApp";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CheckIcon,
  CloseCircleIcon,
  CopyIcon,
  LoaderIcon,
  NetworkIcon,
  ShieldIcon,
  TimerIcon,
} from "@/components/ui/DuotoneIcons";

// ─── Types ────────────────────────────────────────────────────────────────────
type Network = "TRC20" | "BEP20" | "TON";
type PaymentStatus = "waiting" | "confirming" | "finished" | "failed" | "expired";
type Step = 1 | 2 | 3;

interface ActivePayment {
  deposit_id:      string;
  payment_id:      string;
  payment_address: string;
  usdt_amount:     number;
  coin_amount:     number;
  network:         Network;
  status:          PaymentStatus;
  created_at?:     number; // epoch ms
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

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_COINS = 300;
const MAX_COINS = 50_000;
const SESSION_SECONDS = 40 * 60; // 40 minutes

const PRESET_COINS = [300, 500, 1000, 2000, 5000, 10000];

const NETWORKS: { id: Network; label: string; desc: string; badge: string; badgeColor: string; color: string; bg: string; border: string }[] = [
  {
    id: "TON", label: "USDT TON", desc: "TON Blockchain",
    badge: "Lowest Fee",
    badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    color: "#0098EA", bg: "rgba(0,152,234,0.08)", border: "rgba(0,152,234,0.35)",
  },
  {
    id: "TRC20", label: "USDT TRC20", desc: "Tron Network",
    badge: "Fast",
    badgeColor: "text-red-400 bg-red-400/10 border-red-400/30",
    color: "#E50914", bg: "rgba(229,9,20,0.08)", border: "rgba(229,9,20,0.35)",
  },
  {
    id: "BEP20", label: "USDT BEP20", desc: "BNB Smart Chain",
    badge: "Recommended",
    badgeColor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    color: "#F3BA2F", bg: "rgba(243,186,47,0.08)", border: "rgba(243,186,47,0.35)",
  },
];

const STATUS_META: Record<PaymentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  waiting:    { label: "Waiting for payment",       color: "text-yellow-400",     icon: <TimerIcon size={16} /> },
  confirming: { label: "Confirming on blockchain",  color: "text-blue-400",       icon: <LoaderIcon size={16} className="animate-spin" /> },
  finished:   { label: "Payment complete",          color: "text-emerald-400",    icon: <CheckCircleIcon size={16} /> },
  failed:     { label: "Payment failed",            color: "text-red-400",        icon: <CloseCircleIcon size={16} /> },
  expired:    { label: "Payment expired",           color: "text-[var(--text-muted)]", icon: <AlertCircleIcon size={16} /> },
};

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  completed: "success", pending: "warning", failed: "error",
  finished: "success", waiting: "warning", confirming: "default", expired: "default",
};

const TERMINAL = new Set<PaymentStatus>(["finished", "failed", "expired"]);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function coinsToUsdt(coins: number): number {
  return parseFloat((coins / 100).toFixed(2));
}
function fmtCoins(n: number): string {
  return n.toLocaleString();
}
function fmtDt(dt: string): string {
  return new Date(dt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Step Indicator (theme-aware) ────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps = ["Select Coins", "Network", "Payment"];
  return (
    <div className="flex items-center mb-6" aria-label={`Step ${step} of ${steps.length}: ${steps[step - 1]}`}>
      {steps.map((label, i) => {
        const num = (i + 1) as Step;
        const active = num === step;
        const done   = num < step;
        return (
          <div key={num} className="flex items-center" style={{ flex: i < steps.length - 1 ? "1" : "none" }}>
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  background:   done ? "var(--success-strong)" : "transparent",
                  borderColor:  done ? "var(--success-strong)" : active ? "var(--accent)" : "var(--border)",
                  boxShadow:    active ? "0 0 0 4px var(--accent-soft)" : "0 0 0 0 rgba(0,0,0,0)",
                  scale:        active ? 1.06 : 1,
                }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{ color: done ? "var(--accent-contrast)" : active ? "var(--accent)" : "var(--text-muted)" }}
              >
                {done ? <CheckIcon size={14} /> : num}
              </motion.div>
              <span
                className="text-[10px] font-semibold whitespace-nowrap transition-colors duration-200"
                style={{ color: active ? "var(--accent)" : done ? "var(--success-strong)" : "var(--text-muted)" }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-2 mb-5" style={{ background: done ? "var(--success-strong)" : "var(--border)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────
function useCountdown(expiresAt: number | null) {
  const [secs, setSecs] = useState<number>(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecs(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return secs;
}

function CountdownBadge({ expiresAt, expired }: { expiresAt: number | null; expired: boolean }) {
  const secs = useCountdown(expiresAt);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const urgent = secs < 300 && !expired;

  if (expired) {
    return (
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10"
      >
        <CloseCircleIcon size={14} className="text-red-400" />
        <span className="text-red-400 text-sm font-bold">Payment Session Expired</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={urgent ? { repeat: Infinity, duration: 1, ease: "easeInOut" } : { duration: 0.2 }}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${urgent ? "border-red-500/40 bg-red-500/10" : "border-[var(--border)] bg-[var(--card-bg)]"}`}
    >
      <TimerIcon size={14} className={urgent ? "text-red-400" : "text-yellow-400"} />
      <span className={`text-sm font-mono font-bold tabular-nums ${urgent ? "text-red-400" : "text-yellow-400"}`}>
        {mm}:{ss}
      </span>
      <span className="text-xs text-[var(--text-muted)]">remaining</span>
    </motion.div>
  );
}

// ─── Warning Banner ──────────────────────────────────────────────────────────
function WarningBanner() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
      <AlertTriangleIcon size={15} className="text-yellow-400 shrink-0 mt-0.5" />
      <p className="text-xs text-yellow-300/90 leading-relaxed">
        <span className="font-bold">Ensure the exact amount is received.</span>
        {" "}Deposits with insufficient received amount may not be credited automatically.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepositPage() {
  const { userId } = useApp();
  const router = useRouter();

  const [step,        setStep]        = useState<Step>(1);
  const [coinAmount,  setCoinAmount]  = useState<number>(500);
  const [customInput, setCustomInput] = useState("");
  const [useCustom,   setUseCustom]   = useState(false);
  const [network,     setNetwork]     = useState<Network | null>(null);
  const [agreed,      setAgreed]      = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");
  const [payment,     setPayment]     = useState<ActivePayment | null>(null);
  const [sessionExp,  setSessionExp]  = useState<number | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [history,     setHistory]     = useState<DepositHistoryItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [copiedAddr,  setCopiedAddr]  = useState(false);
  const [copiedAmt,   setCopiedAmt]   = useState(false);

  const pollRef     = useRef<NodeJS.Timeout | null>(null);
  const expireRef   = useRef<NodeJS.Timeout | null>(null);

  const effectiveCoinAmount = useCustom ? (Number(customInput) || 0) : coinAmount;
  const usdtAmount = coinsToUsdt(effectiveCoinAmount);

  const validationMsg = (() => {
    if (!effectiveCoinAmount) return "";
    if (effectiveCoinAmount < MIN_COINS) return `Minimum deposit is ${MIN_COINS.toLocaleString()} Coins ($${coinsToUsdt(MIN_COINS)})`;
    if (effectiveCoinAmount > MAX_COINS) return `Maximum deposit is ${MAX_COINS.toLocaleString()} Coins ($${coinsToUsdt(MAX_COINS)})`;
    return "";
  })();
  const isValidAmount = !validationMsg && effectiveCoinAmount >= MIN_COINS;

  // ── Load data ──────────────────────────────────────────────────────────────
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

  // ── Poll payment status ────────────────────────────────────────────────────
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
          showToast(`+${fmtCoins(data.data.coin_amount ?? 0)} Coins credited!`, "success");
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

  // ── Session expiry ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionExp) return;
    const delay = sessionExp - Date.now();
    if (delay <= 0) { setSessionExpired(true); return; }
    expireRef.current = setTimeout(() => setSessionExpired(true), delay);
    return () => { if (expireRef.current) clearTimeout(expireRef.current); };
  }, [sessionExp]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreatePayment = async () => {
    if (!isValidAmount || !network || !agreed || !userId) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/deposits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ coin_amount: effectiveCoinAmount, network }),
      });
      const data = await res.json();
      if (data.success) {
        const exp = Date.now() + SESSION_SECONDS * 1000;
        setPayment({ ...data.data, created_at: Date.now() });
        setSessionExp(exp);
        setSessionExpired(false);
        setStep(3);
      } else {
        setError(data.error ?? "Failed to create payment.");
      }
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

  const resetAll = () => {
    if (pollRef.current)   clearInterval(pollRef.current);
    if (expireRef.current) clearTimeout(expireRef.current);
    setPayment(null);
    setSessionExp(null);
    setSessionExpired(false);
    setAgreed(false);
    setNetwork(null);
    setStep(1);
    loadData();
  };

  const headerTitle = step === 1 ? "Buy Coins" : step === 2 ? "Select Network" : "Complete Payment";

  // Back navigation contract:
  //   • step 1 (first deposit screen)  → always visible, returns to Home
  //   • step 2 (network selection)     → visible, returns to coin selection
  //   • step 3 before payment exists   → visible, returns to network selection
  //   • active payment / creating      → hidden (protects the payment flow)
  const showBack = !payment && !submitting;

  const handleStepBack = () => {
    if (step === 1) router.push("/home");
    else if (step === 2) setStep(1);
    else if (step === 3 && !payment) setStep(2);
  };

  // ── STEP 1 — Select Coins ─────────────────────────────────────────────────
  const Step1 = (
    <motion.div key="step1" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="space-y-5">
      {/* Balance */}
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Current Balance</p>
        <p className="text-3xl font-black font-numeric text-[var(--accent)]">
          {fmtCoins(coinBalance)}{" "}
          <span className="text-base text-[var(--text-muted)] font-semibold">Coins</span>
        </p>
      </div>

      {/* Coin selector card */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-0.5">Select Amount</p>
          <p className="text-[11px] text-[var(--text-muted)]">100 Coins = 1 USDT · Min 300 · Max 50,000</p>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Preset deposit amounts">
          {PRESET_COINS.map((v, i) => (
            <motion.button
              key={v}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.18 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setUseCustom(false); setCoinAmount(v); setError(""); }}
              aria-pressed={!useCustom && coinAmount === v}
              className={`py-3 rounded-xl text-sm border transition-all duration-150 ${
                !useCustom && coinAmount === v
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="block font-bold font-numeric">{fmtCoins(v)}</span>
              <span className="block text-[10px] opacity-70">${coinsToUsdt(v).toFixed(2)}</span>
            </motion.button>
          ))}
        </div>

        {/* Custom input */}
        <div>
          <label htmlFor="deposit-custom-amount" className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">
            Custom amount (300–50,000)
          </label>
          <input
            id="deposit-custom-amount"
            type="number" min={MIN_COINS} max={MAX_COINS} step={1}
            value={customInput}
            onFocus={() => setUseCustom(true)}
            onChange={(e) => { setCustomInput(e.target.value); setUseCustom(true); setError(""); }}
            placeholder="e.g. 2500"
            aria-invalid={useCustom && !!validationMsg}
            aria-describedby="deposit-amount-hint"
            className={`w-full px-4 py-3 bg-[var(--bg)] border rounded-xl text-[var(--text-primary)] font-numeric text-base outline-none transition-colors ${
              useCustom
                ? validationMsg
                  ? "border-red-400/70 focus:border-red-400"
                  : "border-[var(--accent)]"
                : "border-[var(--border)] focus:border-[var(--accent)]"
            }`}
          />
          <p id="deposit-amount-hint" className="text-[10px] text-[var(--text-muted)] mt-1.5">
            {useCustom && validationMsg
              ? ""
              : "Enter the exact number of Coins you want to receive."}
          </p>
        </div>

        {/* Live conversion */}
        <AnimatePresence>
          {isValidAmount && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-xl">
                <span className="text-sm text-[var(--text-muted)]">You pay</span>
                <span className="text-sm font-bold font-numeric text-[var(--accent)]">${usdtAmount.toFixed(2)} USDT</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation message */}
        <AnimatePresence>
          {(validationMsg || error) && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="alert"
              className="text-xs text-red-400 flex items-center gap-1.5"
            >
              <AlertCircleIcon size={12} className="shrink-0" />
              {validationMsg || error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        onClick={() => { if (isValidAmount) setStep(2); }}
        disabled={!isValidAmount}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-sm
                   transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
      >
        Continue — {isValidAmount ? `${fmtCoins(effectiveCoinAmount)} Coins ($${usdtAmount.toFixed(2)})` : "Select amount"}
      </motion.button>
    </motion.div>
  );

  // ── STEP 2 — Select Network ───────────────────────────────────────────────
  const Step2 = (
    <motion.div key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="space-y-4">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)]">You will receive</p>
          <p className="text-lg font-black font-numeric text-[var(--accent)]">{fmtCoins(effectiveCoinAmount)} Coins</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">You pay</p>
          <p className="text-lg font-bold font-numeric text-[var(--accent)]">${usdtAmount.toFixed(2)} USDT</p>
        </div>
      </div>

      <p className="text-sm font-bold text-[var(--text-primary)] px-1">Choose payment network</p>

      <div className="space-y-3" role="radiogroup" aria-label="Payment network">
        {NETWORKS.map((n, i) => {
          const selected = network === n.id;
          return (
            <motion.button
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.2 }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setNetwork(n.id)}
              role="radio"
              aria-checked={selected}
              className="w-full text-left"
            >
              <motion.div
                animate={{
                  borderColor: selected ? n.border : "var(--border)",
                  background:  selected ? n.bg : "var(--card-bg)",
                  boxShadow:   selected ? `0 0 0 1px ${n.border}, 0 6px 20px -8px ${n.border}` : "0 1px 3px rgba(0,0,0,0.04)",
                }}
                className="rounded-2xl border p-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ scale: selected ? 1.08 : 1, rotate: selected ? 5 : 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <NetworkIcon id={n.id} size={44} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--text-primary)]">{n.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${n.badgeColor}`}>
                        <SymbolIcon name={n.id === "TON" ? "fast" : n.id === "TRC20" ? "star" : "award"} size={11} /> {n.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{n.desc}</p>
                  </div>
                  <motion.div
                    animate={{ scale: selected ? 1 : 0.5, opacity: selected ? 1 : 0 }}
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                    style={{ background: n.color }}
                  >
                    <CheckIcon size={11} color="#fff" />
                  </motion.div>
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        onClick={() => { if (network) setStep(3); }}
        disabled={!network}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-sm
                   transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
      >
        {network ? `Continue with ${NETWORKS.find(n => n.id === network)?.label}` : "Select a network"}
      </motion.button>
    </motion.div>
  );

  // ── STEP 3 — Payment Confirmation ─────────────────────────────────────────
  const Step3 = (
    <motion.div key="step3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="space-y-4">

      {payment ? (
        // ── Active payment ──
        <>
          {/* Status bar */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            payment.status === "finished"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : sessionExpired || payment.status === "expired" || payment.status === "failed"
              ? "border-red-500/30 bg-red-500/10"
              : "border-[var(--border)] bg-[var(--card-bg)]"
          }`}>
            <span className={STATUS_META[payment.status]?.color ?? "text-yellow-400"}>
              {STATUS_META[payment.status]?.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-bold ${STATUS_META[payment.status]?.color ?? "text-yellow-400"}`}>
                {sessionExpired && payment.status !== "finished" ? "Payment Session Expired" : STATUS_META[payment.status]?.label}
              </div>
              {!TERMINAL.has(payment.status) && !sessionExpired && (
                <div className="text-[10px] text-[var(--text-muted)]">Checking every 5 seconds…</div>
              )}
            </div>
            {!TERMINAL.has(payment.status) && !sessionExpired && (
              <CountdownBadge expiresAt={sessionExp} expired={sessionExpired} />
            )}
          </div>

          {/* Session expired state */}
          {sessionExpired && payment.status !== "finished" && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8 space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/25 text-red-400">
                <TimerIcon size={26} />
              </div>
              <p className="text-red-400 font-bold text-base">Session expired after 40 minutes</p>
              <p className="text-xs text-[var(--text-muted)]">Please create a new payment to continue.</p>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={resetAll}
                className="mt-2 px-6 py-3 rounded-xl font-bold text-sm"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
              >
                Start New Deposit
              </motion.button>
            </motion.div>
          )}

          {/* Success state */}
          {payment.status === "finished" && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-center py-10 space-y-3">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6 }}
                className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
              >
                <SymbolIcon name="success" size={34} />
              </motion.div>
              <div className="text-2xl font-black font-numeric text-emerald-400">+{fmtCoins(payment.coin_amount)} Coins</div>
              <p className="text-xs text-[var(--text-muted)]">Credited to your wallet</p>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={resetAll}
                className="mt-3 px-6 py-3 rounded-xl font-bold text-sm"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
              >
                Make Another Deposit
              </motion.button>
            </motion.div>
          )}

          {/* Payment details — hide when session expired or finished */}
          {!sessionExpired && payment.status !== "finished" && (
            <>
              <WarningBanner />

              {/* Info card */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Payment Information</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Network",    value: NETWORKS.find(n => n.id === payment.network)?.label ?? payment.network },
                    { label: "Amount",     value: `${payment.usdt_amount.toFixed(2)} USDT` },
                    { label: "Coins",      value: `+${fmtCoins(payment.coin_amount)}` },
                    { label: "Expiration", value: "40 Minutes" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[var(--bg)] rounded-xl px-3 py-2.5">
                      <div className="text-[10px] text-[var(--text-muted)] mb-0.5">{label}</div>
                      <div className="text-sm font-bold font-numeric text-[var(--text-primary)]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  // The QR is the one place a long press is still useful (save the
                  // code for a hardware wallet), so it opts out of the global
                  // callout suppression — see app/workspace.css.
                  className="allow-longpress bg-white p-3 rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.payment_address)}&margin=8`}
                    alt="Payment QR" width={180} height={180} className="rounded-lg"
                  />
                </motion.div>
                <p className="text-[10px] text-[var(--text-muted)]">Scan to pay</p>
              </div>

              {/* Payment address */}
              <div>
                <div className="text-xs text-[var(--text-muted)] font-medium mb-1.5">Payment Address</div>
                <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-xs font-mono text-[var(--text-primary)] truncate">{payment.payment_address}</span>
                  <button
                    onClick={() => copyText(payment.payment_address, "addr")}
                    aria-label="Copy payment address"
                    className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors"
                  >
                    {copiedAddr ? <CheckCircleIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} className="text-[var(--text-muted)]" />}
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="text-xs text-[var(--text-muted)] font-medium mb-1.5">Exact Amount to Send</div>
                <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm font-bold font-mono text-emerald-400">{payment.usdt_amount.toFixed(2)} USDT</span>
                  <button
                    onClick={() => copyText(String(payment.usdt_amount.toFixed(2)), "amt")}
                    aria-label="Copy payment amount"
                    className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors"
                  >
                    {copiedAmt ? <CheckCircleIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} className="text-[var(--text-muted)]" />}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed px-2">
                Send exactly <strong className="text-[var(--text-primary)]">{payment.usdt_amount.toFixed(2)} USDT</strong> on {NETWORKS.find(n => n.id === payment.network)?.desc}. Coins credited automatically after confirmation.
              </p>
            </>
          )}
        </>
      ) : (
        // ── Pre-payment: Notice + checkbox ──
        <>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)]">You will receive</p>
              <p className="text-lg font-black font-numeric text-[var(--accent)]">{fmtCoins(effectiveCoinAmount)} Coins</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-muted)]">Network</p>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <NetworkIcon id={network!} size={18} />
                <p className="text-sm font-bold text-[var(--text-primary)]">{network}</p>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-yellow-500/30 bg-yellow-500/6 p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <ShieldIcon size={16} className="text-yellow-400 shrink-0" />
              <p className="text-sm font-bold text-yellow-300">Important Notice</p>
            </div>
            <p className="text-xs text-yellow-200/80 leading-relaxed">
              Some exchanges and wallets charge withdrawal/network fees.
            </p>
            <p className="text-xs text-yellow-200/80 leading-relaxed">
              The exact payment amount shown by Ludzo must be received.
            </p>
            <p className="text-xs text-yellow-200/80 leading-relaxed">
              If less than the required amount is received, your deposit may not be credited automatically.
            </p>
            <p className="text-xs text-yellow-200/80 leading-relaxed">
              Please verify the final received amount before sending.
            </p>
          </motion.div>

          {/* Agreement checkbox */}
          <motion.label
            whileHover={{ scale: 1.01 }}
            htmlFor="agree-checkbox"
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
              agreed
                ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]"
                : "border-[var(--border)] bg-[var(--card-bg)]"
            }`}
          >
            <div className="relative shrink-0 mt-0.5">
              <input
                type="checkbox" id="agree-checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only peer"
              />
              <motion.div
                animate={{
                  background: agreed ? "var(--accent)" : "transparent",
                  borderColor: agreed ? "var(--accent)" : "var(--border)",
                }}
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--accent)] peer-focus-visible:outline-offset-2"
              >
                <AnimatePresence>
                  {agreed && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <CheckIcon size={12} color="var(--accent-contrast)" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              I understand and agree that the exact payment amount must be received after all exchange and network fees.
            </p>
          </motion.label>

          {error && (
            <p role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircleIcon size={12} />
              {error}
            </p>
          )}

          <motion.button
            whileHover={{ scale: agreed ? 1.01 : 1 }} whileTap={{ scale: agreed ? 0.98 : 1 }}
            onClick={handleCreatePayment}
            disabled={!agreed || submitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm
                       transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
          >
            {submitting
              ? <><LoaderIcon size={16} className="animate-spin" /> Creating Payment…</>
              : "Generate Payment Address"}
          </motion.button>
        </>
      )}
    </motion.div>
  );

  // ── Deposit History ────────────────────────────────────────────────────────
  const HistorySection = (
    <div>
      <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Deposit History</h3>
      {histLoading ? <SkeletonCard /> : history.length === 0 ? (
        <EmptyState emoji="💸" title="No deposits yet" description="Make your first deposit above." />
      ) : (
        <div className="space-y-2">
          {history.map((d, i) => {
            const coins = d.coin_amount ?? Math.round((d.usdt_amount ?? d.amount) * 100);
            const usdt  = d.usdt_amount ?? d.amount;
            const st    = d.nowpayments_status ?? d.status;
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl"
              >
                <SymbolIcon name="coins" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold font-numeric text-[var(--accent)]">+{fmtCoins(coins)} Coins</div>
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
                    <span>${usdt.toFixed(2)} USDT</span>
                    {d.network && <><span className="opacity-40">·</span><span>{d.network}</span></>}
                    <span className="opacity-40">·</span>
                    <span>{fmtDt(d.created_at)}</span>
                  </div>
                </div>
                <Badge variant={STATUS_COLOR[st] ?? "default"} size="sm">{st}</Badge>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <AppShell hideNav>
      <PageHeader
        title={headerTitle}
        back={showBack}
        onBack={handleStepBack}
        backLabel={step === 1 ? "Back to home" : step === 2 ? "Back to amount" : "Back to network"}
      />
      <div className="px-4 py-4 pb-8 space-y-5">
        <StepBar step={step} />

        <AnimatePresence mode="wait">
          {step === 1 && Step1}
          {step === 2 && Step2}
          {step === 3 && Step3}
        </AnimatePresence>

        {step === 1 && <div className="pt-2">{HistorySection}</div>}
      </div>
    </AppShell>
  );
}
