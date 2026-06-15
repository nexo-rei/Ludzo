"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, CheckCircle, XCircle, AlertCircle, Loader2, ChevronLeft,
  AlertTriangle, Shield, Timer
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import { useApp } from "@/hooks/useApp";

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

const NETWORKS: { id: Network; label: string; desc: string; emoji: string; badge: string; badgeColor: string; color: string; bg: string; border: string }[] = [
  {
    id: "TON", label: "USDT TON", desc: "TON Blockchain",
    emoji: "⭐", badge: "Lowest Fee",
    badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    color: "#0098EA", bg: "rgba(0,152,234,0.08)", border: "rgba(0,152,234,0.35)",
  },
  {
    id: "TRC20", label: "USDT TRC20", desc: "Tron Network",
    emoji: "⚡", badge: "Fast",
    badgeColor: "text-red-400 bg-red-400/10 border-red-400/30",
    color: "#E50914", bg: "rgba(229,9,20,0.08)", border: "rgba(229,9,20,0.35)",
  },
  {
    id: "BEP20", label: "USDT BEP20", desc: "BNB Smart Chain",
    emoji: "🔥", badge: "Recommended",
    badgeColor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    color: "#F3BA2F", bg: "rgba(243,186,47,0.08)", border: "rgba(243,186,47,0.35)",
  },
];

const STATUS_META: Record<PaymentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  waiting:    { label: "Waiting for payment",       color: "text-yellow-400", icon: <Timer size={16} /> },
  confirming: { label: "Confirming on blockchain",  color: "text-blue-400",   icon: <Loader2 size={16} className="animate-spin" /> },
  finished:   { label: "Payment complete",           color: "text-emerald-400", icon: <CheckCircle size={16} /> },
  failed:     { label: "Payment failed",             color: "text-red-400",    icon: <XCircle size={16} /> },
  expired:    { label: "Payment expired",            color: "text-gray-400",   icon: <AlertCircle size={16} /> },
};

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  completed: "success", pending: "warning", failed: "error",
  finished: "success", waiting: "warning", confirming: "default", expired: "default",
};

const TERMINAL = new Set<PaymentStatus>(["finished", "failed", "expired"]);

// ─── SVG Network Icons ────────────────────────────────────────────────────────
function TonIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill="#0098EA"/>
      <path d="M37.5 15H18.5C15.46 15 13.62 18.33 15.16 20.9L26.42 39.97C27.2 41.34 29.21 41.34 29.99 39.97L41.25 20.9C42.79 18.33 40.95 15 37.5 15Z" fill="white"/>
      <path d="M28.7 15H37.5C40.95 15 42.79 18.33 41.25 20.9L30 39.97C29.6 40.66 28.94 41 28.28 41L28.7 15Z" fill="white" opacity="0.6"/>
    </svg>
  );
}

function TronIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill="#E50914"/>
      <path d="M40.5 22.5L28.2 13L14 23.5L19.8 42.5H36.4L40.5 22.5Z" fill="white" opacity="0.15"/>
      <path d="M40.5 22.5L28.2 13L20.5 21.5L36.4 26.5L40.5 22.5Z" fill="white"/>
      <path d="M36.4 26.5L20.5 21.5L19.8 42.5L36.4 26.5Z" fill="white" opacity="0.7"/>
    </svg>
  );
}

function BscIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill="#F3BA2F"/>
      <path d="M22 28L28 22L34 28L28 34L22 28Z" fill="white"/>
      <path d="M14 28L17 25L20 28L17 31L14 28Z" fill="white"/>
      <path d="M36 28L39 25L42 28L39 31L36 28Z" fill="white"/>
      <path d="M22 20L25 17L28 20L25 23L22 20Z" fill="white"/>
      <path d="M22 36L25 33L28 36L25 39L22 36Z" fill="white"/>
    </svg>
  );
}

function NetworkIcon({ id, size }: { id: Network; size?: number }) {
  if (id === "TON")   return <TonIcon size={size} />;
  if (id === "TRC20") return <TronIcon size={size} />;
  return <BscIcon size={size} />;
}

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

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps = ["Select Coins", "Network", "Payment"];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => {
        const num = (i + 1) as Step;
        const active = num === step;
        const done   = num < step;
        return (
          <div key={num} className="flex items-center" style={{ flex: i < steps.length - 1 ? "1" : "none" }}>
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{
                  background: done ? "#10B981" : active ? "#7C3AED" : "rgba(255,255,255,0.08)",
                  borderColor: done ? "#10B981" : active ? "#7C3AED" : "rgba(255,255,255,0.15)",
                }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{ color: done || active ? "#fff" : "rgba(255,255,255,0.3)" }}
              >
                {done ? <CheckCircle size={14} /> : num}
              </motion.div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${active ? "text-[#7C3AED]" : done ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-2 mb-4" style={{ background: done ? "#10B981" : "rgba(255,255,255,0.1)" }} />
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
        <XCircle size={14} className="text-red-400" />
        <span className="text-red-400 text-sm font-bold">Payment Session Expired</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${urgent ? "border-red-500/40 bg-red-500/10" : "border-[var(--border)] bg-[var(--card-bg)]"}`}
    >
      <Timer size={14} className={urgent ? "text-red-400" : "text-yellow-400"} />
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
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/8">
      <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
      <p className="text-xs text-yellow-300/90 leading-relaxed">
        <span className="font-bold">⚠️ Ensure the exact amount is received.</span>
        {" "}Deposits with insufficient received amount may not be credited automatically.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepositPage() {
  const { userId } = useApp();

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
  const showBack = step > 1 && !payment;

  const handleStepBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3 && !payment) setStep(2);
  };

  // ── STEP 1 — Select Coins ─────────────────────────────────────────────────
  const Step1 = (
    <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
      {/* Balance */}
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Current Balance</p>
        <p className="text-3xl font-black text-[#7C3AED]">
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
        <div className="grid grid-cols-3 gap-2">
          {PRESET_COINS.map((v) => (
            <motion.button
              key={v}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setUseCustom(false); setCoinAmount(v); setError(""); }}
              className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                !useCustom && coinAmount === v
                  ? "border-[#7C3AED] bg-[#7C3AED]/12 text-[#A855F7]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[#7C3AED]/40 hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="block font-bold">{fmtCoins(v)}</span>
              <span className="block text-[10px] opacity-70">${coinsToUsdt(v).toFixed(2)}</span>
            </motion.button>
          ))}
        </div>

        {/* Custom input */}
        <div>
          <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">
            Custom amount (300–50,000)
          </label>
          <input
            type="number" min={MIN_COINS} max={MAX_COINS} step={1}
            value={customInput}
            onFocus={() => setUseCustom(true)}
            onChange={(e) => { setCustomInput(e.target.value); setUseCustom(true); setError(""); }}
            placeholder="e.g. 2500"
            className={`w-full px-4 py-3 bg-[var(--bg)] border rounded-xl text-[var(--text-primary)] text-base outline-none transition-colors ${useCustom ? "border-[#7C3AED]" : "border-[var(--border)]"} focus:border-[#7C3AED]`}
          />
        </div>

        {/* Live conversion */}
        <AnimatePresence>
          {isValidAmount && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between px-4 py-3 bg-[#7C3AED]/5 border border-[#7C3AED]/20 rounded-xl"
            >
              <span className="text-sm text-[var(--text-muted)]">You pay</span>
              <span className="text-sm font-bold text-emerald-400">${usdtAmount.toFixed(2)} USDT</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation message */}
        <AnimatePresence>
          {(validationMsg || error) && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle size={12} className="shrink-0" />
              {validationMsg || error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        onClick={() => { if (isValidAmount) setStep(2); }}
        disabled={!isValidAmount}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue — {isValidAmount ? `${fmtCoins(effectiveCoinAmount)} Coins ($${usdtAmount.toFixed(2)})` : "Select amount"}
      </motion.button>
    </motion.div>
  );

  // ── STEP 2 — Select Network ───────────────────────────────────────────────
  const Step2 = (
    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)]">You will receive</p>
          <p className="text-lg font-black text-[#7C3AED]">{fmtCoins(effectiveCoinAmount)} Coins</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">You pay</p>
          <p className="text-lg font-bold text-emerald-400">${usdtAmount.toFixed(2)} USDT</p>
        </div>
      </div>

      <p className="text-sm font-bold text-[var(--text-primary)] px-1">Choose payment network</p>

      <div className="space-y-3">
        {NETWORKS.map((n) => {
          const selected = network === n.id;
          return (
            <motion.button
              key={n.id}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setNetwork(n.id)}
              className="w-full text-left"
            >
              <motion.div
                animate={{
                  borderColor: selected ? n.border : "var(--border)",
                  background:  selected ? n.bg : "var(--card-bg)",
                  boxShadow:   selected ? `0 0 0 1px ${n.border}, 0 4px 16px ${n.bg}` : "none",
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
                        {n.emoji} {n.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{n.desc}</p>
                  </div>
                  <motion.div
                    animate={{ scale: selected ? 1 : 0.5, opacity: selected ? 1 : 0 }}
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                    style={{ background: n.color }}
                  >
                    <CheckCircle size={12} color="#fff" />
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
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {network ? `Continue with ${NETWORKS.find(n => n.id === network)?.label}` : "Select a network"}
      </motion.button>
    </motion.div>
  );

  // ── STEP 3 — Payment Confirmation ─────────────────────────────────────────
  const Step3 = (
    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

      {payment ? (
        // ── Active payment ──
        <>
          {/* Status bar */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            payment.status === "finished"
              ? "border-emerald-500/30 bg-emerald-500/8"
              : sessionExpired || payment.status === "expired" || payment.status === "failed"
              ? "border-red-500/30 bg-red-500/8"
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
              <div className="text-5xl">⏰</div>
              <p className="text-red-400 font-bold text-base">Session expired after 40 minutes</p>
              <p className="text-xs text-[var(--text-muted)]">Please create a new payment to continue.</p>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={resetAll}
                className="mt-2 px-6 py-3 rounded-xl bg-[#7C3AED] text-white font-bold text-sm"
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
                className="text-6xl"
              >🎉</motion.div>
              <div className="text-2xl font-black text-emerald-400">+{fmtCoins(payment.coin_amount)} Coins</div>
              <p className="text-xs text-[var(--text-muted)]">Credited to your wallet</p>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={resetAll}
                className="mt-3 px-6 py-3 rounded-xl bg-[#7C3AED] text-white font-bold text-sm"
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
                      <div className="text-sm font-bold text-[var(--text-primary)]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-3 rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.payment_address)}&margin=8`}
                    alt="Payment QR" width={180} height={180} className="rounded-lg"
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">Scan to pay</p>
              </div>

              {/* Payment address */}
              <div>
                <div className="text-xs text-[var(--text-muted)] font-medium mb-1.5">Payment Address</div>
                <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-xs font-mono text-[var(--text-primary)] truncate">{payment.payment_address}</span>
                  <button onClick={() => copyText(payment.payment_address, "addr")} className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors">
                    {copiedAddr ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="text-xs text-[var(--text-muted)] font-medium mb-1.5">Exact Amount to Send</div>
                <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm font-bold font-mono text-emerald-400">{payment.usdt_amount.toFixed(2)} USDT</span>
                  <button onClick={() => copyText(String(payment.usdt_amount.toFixed(2)), "amt")} className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors">
                    {copiedAmt ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
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
              <p className="text-lg font-black text-[#7C3AED]">{fmtCoins(effectiveCoinAmount)} Coins</p>
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
            className="rounded-2xl border border-yellow-500/30 bg-yellow-500/6 p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-yellow-400 shrink-0" />
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
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              agreed
                ? "border-[#7C3AED]/50 bg-[#7C3AED]/8"
                : "border-[var(--border)] bg-[var(--card-bg)]"
            }`}
          >
            <div className="relative shrink-0 mt-0.5">
              <input
                type="checkbox" id="agree-checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <motion.div
                animate={{
                  background: agreed ? "#7C3AED" : "transparent",
                  borderColor: agreed ? "#7C3AED" : "rgba(255,255,255,0.2)",
                }}
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center"
              >
                <AnimatePresence>
                  {agreed && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <CheckCircle size={12} color="#fff" strokeWidth={3} />
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
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle size={12} />
              {error}
            </p>
          )}

          <motion.button
            whileHover={{ scale: agreed ? 1.01 : 1 }} whileTap={{ scale: agreed ? 0.98 : 1 }}
            onClick={handleCreatePayment}
            disabled={!agreed || submitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> Creating Payment…</>
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
          {history.map((d) => {
            const coins = d.coin_amount ?? Math.round((d.usdt_amount ?? d.amount) * 100);
            const usdt  = d.usdt_amount ?? d.amount;
            const st    = d.nowpayments_status ?? d.status;
            return (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl">
                <span className="text-xl">🪙</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#7C3AED]">+{fmtCoins(coins)} Coins</div>
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
                    <span>${usdt.toFixed(2)} USDT</span>
                    {d.network && <><span className="opacity-40">·</span><span>{d.network}</span></>}
                    <span className="opacity-40">·</span>
                    <span>{fmtDt(d.created_at)}</span>
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
      <PageHeader
        title={headerTitle}
        back={showBack}
        onBack={handleStepBack}
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
