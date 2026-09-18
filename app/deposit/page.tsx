"use client";

import SymbolIcon from "@/components/ui/SymbolIcon";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  COINS_PER_HALF_USD,
  COINS_PER_USDT,
  MAX_DEPOSIT_COINS,
  MAX_DEPOSIT_USD,
  MIN_DEPOSIT_COINS,
  MIN_DEPOSIT_USD,
} from "@/lib/economy";
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
  ZapIcon,
} from "@/components/ui/DuotoneIcons";

// ─── Types ────────────────────────────────────────────────────────────────────

type Network = "TRC20" | "BEP20" | "TON";
type PaymentStatus =
  | "waiting"
  | "confirming"
  | "finished"
  | "failed"
  | "expired";
type Step = 1 | 2 | 3;

interface ActivePayment {
  deposit_id: string;
  payment_id: string;
  payment_address: string;
  usdt_amount: number;
  coin_amount: number;
  network: Network;
  status: PaymentStatus;
  created_at?: number;
}

interface DepositHistoryItem {
  id: string;
  coin_amount?: number;
  usdt_amount?: number;
  amount: number;
  network?: string;
  nowpayments_status?: string;
  status: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_COINS = MIN_DEPOSIT_COINS;
const MAX_COINS = MAX_DEPOSIT_COINS;
const SESSION_SECONDS = 40 * 60;

const PRESET_COINS: { coins: number; tag?: string }[] = [
  { coins: MIN_COINS, tag: "Minimum" },
  { coins: 1_000 },
  { coins: 2_000, tag: "Popular" },
  { coins: 4_000 },
  { coins: 10_000 },
  { coins: 20_000, tag: "Best value" },
];

const NETWORKS: {
  id: Network;
  label: string;
  desc: string;
  badge: string;
  badgeColor: string;
  color: string;
  bg: string;
  border: string;
  speed: string;
  fee: string;
}[] = [
  {
    id: "TON",
    label: "USDT TON",
    desc: "TON Blockchain",
    badge: "Lowest Fee",
    badgeColor:
      "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    color: "#0098EA",
    bg: "rgba(0,152,234,0.08)",
    border: "rgba(0,152,234,0.35)",
    speed: "~10 sec",
    fee: "Very low",
  },
  {
    id: "TRC20",
    label: "USDT TRC20",
    desc: "Tron Network",
    badge: "Fast",
    badgeColor: "text-red-400 bg-red-400/10 border-red-400/30",
    color: "#E50914",
    bg: "rgba(229,9,20,0.08)",
    border: "rgba(229,9,20,0.35)",
    speed: "~1 min",
    fee: "Low",
  },
  {
    id: "BEP20",
    label: "USDT BEP20",
    desc: "BNB Smart Chain",
    badge: "Recommended",
    badgeColor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    color: "#F3BA2F",
    bg: "rgba(243,186,47,0.08)",
    border: "rgba(243,186,47,0.35)",
    speed: "~1 min",
    fee: "Low",
  },
];

const STATUS_META: Record<
  PaymentStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  waiting: {
    label: "Waiting for payment",
    color: "text-yellow-400",
    icon: <TimerIcon size={16} />,
  },
  confirming: {
    label: "Confirming on blockchain",
    color: "text-blue-400",
    icon: <LoaderIcon size={16} className="animate-spin" />,
  },
  finished: {
    label: "Payment complete",
    color: "text-emerald-400",
    icon: <CheckCircleIcon size={16} />,
  },
  failed: {
    label: "Payment failed",
    color: "text-red-400",
    icon: <CloseCircleIcon size={16} />,
  },
  expired: {
    label: "Payment expired",
    color: "text-[var(--text-muted)]",
    icon: <AlertCircleIcon size={16} />,
  },
};

const STATUS_COLOR: Record<
  string,
  "success" | "warning" | "error" | "default"
> = {
  completed: "success",
  pending: "warning",
  failed: "error",
  finished: "success",
  waiting: "warning",
  confirming: "default",
  expired: "default",
};

const TERMINAL = new Set<PaymentStatus>([
  "finished",
  "failed",
  "expired",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function coinsToUsdt(coins: number): number {
  return parseFloat((coins / COINS_PER_USDT).toFixed(2));
}

function fmtCoins(n: number): string {
  return n.toLocaleString();
}

function fmtUsd(n: number): string {
  return n.toFixed(2);
}

function fmtDt(dt: string): string {
  return new Date(dt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps = ["Amount", "Network", "Payment"];

  return (
    <div
      className="deposit-steps"
      aria-label={`Step ${step} of ${steps.length}: ${steps[step - 1]}`}
    >
      <div className="deposit-steps-rail" aria-hidden>
        <motion.span
          className="deposit-steps-rail-fill"
          initial={false}
          animate={{
            width: `${((step - 1) / (steps.length - 1)) * 100}%`,
          }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 30,
          }}
        />
      </div>

      {steps.map((label, i) => {
        const num = (i + 1) as Step;
        const active = num === step;
        const done = num < step;

        return (
          <div key={num} className="deposit-step">
            <motion.div
              initial={false}
              animate={{
                background: done
                  ? "var(--success-strong)"
                  : active
                    ? "var(--accent)"
                    : "var(--card-bg)",
                borderColor: done
                  ? "var(--success-strong)"
                  : active
                    ? "var(--accent)"
                    : "var(--border)",
                color:
                  done || active
                    ? "var(--accent-contrast)"
                    : "var(--text-muted)",
                scale: active ? 1.08 : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 26,
              }}
              className="deposit-step-dot"
            >
              {active && (
                <motion.span
                  className="deposit-step-halo"
                  animate={{
                    opacity: [0.55, 0, 0.55],
                    scale: [1, 1.75, 1],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  aria-hidden
                />
              )}

              <span className="relative z-[1] flex items-center justify-center">
                {done ? <CheckIcon size={14} /> : num}
              </span>
            </motion.div>

            <span
              className="deposit-step-label"
              style={{
                color: active
                  ? "var(--accent)"
                  : done
                    ? "var(--success-strong)"
                    : "var(--text-muted)",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────

function useCountdown(expiresAt: number | null) {
  const [secs, setSecs] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt - Date.now()) / 1000),
      );

      setSecs(remaining);
    };

    tick();

    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, [expiresAt]);

  return secs;
}

function CountdownBadge({
  expiresAt,
  expired,
}: {
  expiresAt: number | null;
  expired: boolean;
}) {
  const secs = useCountdown(expiresAt);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const urgent = secs < 300 && !expired;

  const pct = Math.min(1, Math.max(0, secs / SESSION_SECONDS));
  const R = 13;
  const C = 2 * Math.PI * R;

  if (expired) {
    return (
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10"
      >
        <CloseCircleIcon size={14} className="text-red-400" />
        <span className="text-red-400 text-xs font-bold">Expired</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={
        urgent
          ? {
              repeat: Infinity,
              duration: 1,
              ease: "easeInOut",
            }
          : { duration: 0.2 }
      }
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
        urgent
          ? "border-red-500/40 bg-red-500/10"
          : "border-[var(--border)] bg-[var(--bg)]"
      }`}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 30 30"
        aria-hidden
        className="shrink-0 -rotate-90"
      >
        <circle
          cx="15"
          cy="15"
          r={R}
          fill="none"
          stroke="var(--border)"
          strokeWidth="2.5"
        />

        <circle
          cx="15"
          cy="15"
          r={R}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          stroke={urgent ? "#EF4444" : "var(--accent)"}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>

      <span
        className={`text-sm font-mono font-bold tabular-nums ${
          urgent
            ? "text-red-400"
            : "text-[var(--text-primary)]"
        }`}
      >
        {mm}:{ss}
      </span>
    </motion.div>
  );
}

// ─── Warning Banner ───────────────────────────────────────────────────────────

function WarningBanner() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
      <AlertTriangleIcon
        size={15}
        className="text-yellow-400 shrink-0 mt-0.5"
      />

      <p className="text-xs text-yellow-300/90 leading-relaxed">
        <span className="font-bold">
          Ensure the exact amount is received.
        </span>{" "}
        Deposits with insufficient received amount may not be credited
        automatically.
      </p>
    </div>
  );
}

// ─── Trust Strip ──────────────────────────────────────────────────────────────

function TrustStrip() {
  const items = [
    {
      icon: <ShieldIcon size={14} />,
      label: "Secure gateway",
    },
    {
      icon: <ZapIcon size={14} />,
      label: "Auto credit",
    },
    {
      icon: <CheckCircleIcon size={14} />,
      label: "On-chain proof",
    },
  ];

  return (
    <div className="deposit-trust">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.05 * i + 0.1,
            duration: 0.25,
          }}
          className="deposit-trust-item"
        >
          <span className="text-[var(--accent)]">{it.icon}</span>
          {it.label}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DepositPage() {
  const { userId } = useApp();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [coinAmount, setCoinAmount] = useState<number>(1_000);
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [network, setNetwork] = useState<Network | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<ActivePayment | null>(null);
  const [sessionExp, setSessionExp] = useState<number | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [history, setHistory] = useState<DepositHistoryItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedAmt, setCopiedAmt] = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const expireRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveCoinAmount = useCustom
    ? Number(customInput) || 0
    : coinAmount;

  const usdtAmount = coinsToUsdt(effectiveCoinAmount);

  const validationMsg = (() => {
    if (!effectiveCoinAmount) return "";

    if (effectiveCoinAmount < MIN_COINS) {
      return `Minimum deposit is ${fmtCoins(
        MIN_COINS,
      )} Coins ($${fmtUsd(MIN_DEPOSIT_USD)})`;
    }

    if (effectiveCoinAmount > MAX_COINS) {
      return `Maximum deposit is ${fmtCoins(
        MAX_COINS,
      )} Coins ($${fmtUsd(MAX_DEPOSIT_USD)})`;
    }

    if (!Number.isInteger(effectiveCoinAmount)) {
      return "Enter a whole number of Coins.";
    }

    return "";
  })();

  const isValidAmount =
    !validationMsg && effectiveCoinAmount >= MIN_COINS;

  const amountProgress = useMemo(() => {
    if (!effectiveCoinAmount) return 0;

    const clamped = Math.min(
      Math.max(effectiveCoinAmount, MIN_COINS),
      MAX_COINS,
    );

    return (
      ((clamped - MIN_COINS) /
        (MAX_COINS - MIN_COINS)) *
      100
    );
  }, [effectiveCoinAmount]);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!userId) return;

    setHistLoading(true);

    try {
      const [wRes, hRes] = await Promise.all([
        fetch("/api/wallet", {
          headers: { "x-user-id": userId },
        }),
        fetch("/api/deposits/history", {
          headers: { "x-user-id": userId },
        }),
      ]);

      const [w, h] = await Promise.all([
        wRes.json(),
        hRes.json(),
      ]);

      if (w.success) {
        setCoinBalance(w.data.coin_balance ?? 0);
      }

      if (h.success) {
        setHistory(h.data.items ?? []);
      }
    } catch {
      // silent
    } finally {
      setHistLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Poll payment status ────────────────────────────────────────────────────

  const pollStatus = useCallback(
    async (pid: string) => {
      if (!userId) return;

      try {
        const res = await fetch(
          `/api/deposits/status/${pid}`,
          {
            headers: { "x-user-id": userId },
          },
        );

        const data = await res.json();

        if (!data.success) return;

        const st = data.data.status as PaymentStatus;

        setPayment((prev) =>
          prev ? { ...prev, status: st } : prev,
        );

        if (TERMINAL.has(st)) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
          }

          if (st === "finished") {
            showToast(
              `+${fmtCoins(
                data.data.coin_amount ?? 0,
              )} Coins credited!`,
              "success",
            );

            await loadData();
          }
        }
      } catch {
        // silent
      }
    },
    [userId, loadData],
  );

  useEffect(() => {
    if (!payment || TERMINAL.has(payment.status)) return;

    const pid = payment.payment_id;

    pollRef.current = setInterval(() => {
      pollStatus(pid);
    }, 5000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [payment, pollStatus]);

  // ── Session expiry ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionExp) return;

    const delay = sessionExp - Date.now();

    if (delay <= 0) {
      setSessionExpired(true);
      return;
    }

    expireRef.current = setTimeout(() => {
      setSessionExpired(true);
    }, delay);

    return () => {
      if (expireRef.current) {
        clearTimeout(expireRef.current);
      }
    };
  }, [sessionExp]);

  // ── Reset scroll when deposit step changes ─────────────────────────────────

  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();

    const frame = window.requestAnimationFrame(resetScroll);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [step]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreatePayment = async () => {
    if (!isValidAmount || !network || !agreed || !userId) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/deposits/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          coin_amount: effectiveCoinAmount,
          network,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const exp = Date.now() + SESSION_SECONDS * 1000;

        setPayment({
          ...data.data,
          created_at: Date.now(),
        });

        setSessionExp(exp);
        setSessionExpired(false);
        setStep(3);
      } else {
        setError(
          data.error ?? "Failed to create payment.",
        );
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (
    text: string,
    type: "addr" | "amt",
  ) => {
    try {
      await navigator.clipboard.writeText(text);

      if (type === "addr") {
        setCopiedAddr(true);
        setTimeout(() => setCopiedAddr(false), 2000);
      } else {
        setCopiedAmt(true);
        setTimeout(() => setCopiedAmt(false), 2000);
      }

      showToast("Copied!", "success");
    } catch {
      showToast("Copy failed", "error");
    }
  };

  const resetAll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }

    if (expireRef.current) {
      clearTimeout(expireRef.current);
    }

    setPayment(null);
    setSessionExp(null);
    setSessionExpired(false);
    setAgreed(false);
    setNetwork(null);
    setStep(1);
    loadData();
  };

  const headerTitle =
    step === 1
      ? "Buy Coins"
      : step === 2
        ? "Select Network"
        : "Complete Payment";

  const showBack = !payment && !submitting;

  const handleStepBack = () => {
    if (step === 1) {
      router.push("/home");
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3 && !payment) {
      setStep(2);
    }
  };

  // ── STEP 1 — Select Coins ──────────────────────────────────────────────────

  const Step1 = (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 30,
      }}
      className="space-y-5"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="deposit-hero"
      >
        <span className="deposit-hero-sheen" aria-hidden />

        <div className="relative z-[1] flex items-start justify-between gap-3">
          <div>
            <p className="deposit-hero-label">Current balance</p>

            <p className="deposit-hero-value">
              {fmtCoins(coinBalance)}
              <span>Coins</span>
            </p>

            <p className="deposit-hero-sub">
              ≈ ${fmtUsd(coinsToUsdt(coinBalance))} in play value
            </p>
          </div>

          <div className="deposit-hero-chip">
            <SymbolIcon name="coins" size={14} />
            {COINS_PER_HALF_USD} Coins = $0.50
          </div>
        </div>
      </motion.div>

      <div className="deposit-card">
        <div className="deposit-card-head">
          <div>
            <p className="deposit-card-title">Select amount</p>

            <p className="deposit-card-sub">
              Min ${fmtUsd(MIN_DEPOSIT_USD)} · Max $
              {fmtUsd(MAX_DEPOSIT_USD)} · fixed rate
            </p>
          </div>

          <AnimatePresence mode="popLayout">
            {isValidAmount && (
              <motion.span
                key={effectiveCoinAmount}
                initial={{
                  opacity: 0,
                  y: -6,
                  scale: 0.94,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 6,
                  scale: 0.94,
                }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 28,
                }}
                className="deposit-amount-pill"
              >
                ${fmtUsd(usdtAmount)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div
          className="deposit-presets"
          role="group"
          aria-label="Preset deposit amounts"
        >
          {PRESET_COINS.map(({ coins, tag }, i) => {
            const selected =
              !useCustom && coinAmount === coins;

            return (
              <motion.button
                key={coins}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.035 * i,
                  duration: 0.2,
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setUseCustom(false);
                  setCoinAmount(coins);
                  setError("");
                }}
                aria-pressed={selected}
                className={`deposit-preset ${
                  selected ? "is-selected" : ""
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="deposit-preset-ring"
                    className="deposit-preset-ring"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                    }}
                    aria-hidden
                  />
                )}

                <span className="relative z-[1] block">
                  <span className="deposit-preset-usd">
                    ${fmtUsd(coinsToUsdt(coins))}
                  </span>

                  <span className="deposit-preset-coins">
                    {fmtCoins(coins)} Coins
                  </span>
                </span>

                {tag && (
                  <span className="deposit-preset-tag">
                    {tag}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="deposit-custom">
          <label
            htmlFor="deposit-custom-amount"
            className="deposit-field-label"
          >
            Custom amount ({fmtCoins(MIN_COINS)}–
            {fmtCoins(MAX_COINS)} Coins)
          </label>

          <div
            className={`deposit-input-wrap ${
              useCustom
                ? validationMsg
                  ? "is-error"
                  : "is-active"
                : ""
            }`}
          >
            <input
              id="deposit-custom-amount"
              type="number"
              min={MIN_COINS}
              max={MAX_COINS}
              step={1}
              value={customInput}
              onFocus={() => setUseCustom(true)}
              onChange={(e) => {
                setCustomInput(e.target.value);
                setUseCustom(true);
                setError("");
              }}
              placeholder={`e.g. ${fmtCoins(MIN_COINS)}`}
              aria-invalid={
                useCustom && !!validationMsg
              }
              aria-describedby="deposit-amount-hint"
              className="deposit-input"
            />

            <span className="deposit-input-suffix">
              Coins
            </span>
          </div>

          <div className="deposit-meter" aria-hidden>
            <motion.span
              className="deposit-meter-fill"
              initial={false}
              animate={{
                width: `${
                  isValidAmount
                    ? Math.max(4, amountProgress)
                    : 0
                }%`,
              }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 28,
              }}
            />
          </div>

          <div className="deposit-meter-scale" aria-hidden>
            <span>${fmtUsd(MIN_DEPOSIT_USD)}</span>
            <span>${fmtUsd(MAX_DEPOSIT_USD)}</span>
          </div>

          <p
            id="deposit-amount-hint"
            className="deposit-field-hint"
          >
            {useCustom && validationMsg
              ? ""
              : "Enter the exact number of Coins you want to receive."}
          </p>
        </div>

        <AnimatePresence initial={false}>
          {isValidAmount && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: "auto",
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="deposit-summary">
                <div className="deposit-summary-row">
                  <span>You receive</span>
                  <strong>
                    {fmtCoins(effectiveCoinAmount)} Coins
                  </strong>
                </div>

                <div className="deposit-summary-divider" />

                <div className="deposit-summary-row is-total">
                  <span>You pay</span>
                  <strong>
                    ${fmtUsd(usdtAmount)} USDT
                  </strong>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(validationMsg || error) && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="text-xs text-red-400 flex items-center gap-1.5"
            >
              <AlertCircleIcon
                size={12}
                className="shrink-0"
              />
              {validationMsg || error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        whileHover={{
          y: isValidAmount ? -1 : 0,
        }}
        whileTap={{
          scale: isValidAmount ? 0.985 : 1,
        }}
        onClick={() => {
          if (isValidAmount) {
            setStep(2);
          }
        }}
        disabled={!isValidAmount}
        className="deposit-cta"
      >
        <span className="deposit-cta-shine" aria-hidden />

        <span className="relative z-[1]">
          {isValidAmount
            ? `Continue — ${fmtCoins(
                effectiveCoinAmount,
              )} Coins ($${fmtUsd(usdtAmount)})`
            : `Minimum deposit $${fmtUsd(
                MIN_DEPOSIT_USD,
              )}`}
        </span>
      </motion.button>

      <TrustStrip />
    </motion.div>
  );

  // ── STEP 2 — Select Network ────────────────────────────────────────────────

  const Step2 = (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 30,
      }}
      className="space-y-4"
    >
      <div className="deposit-recap">
        <div>
          <p className="deposit-recap-label">
            You will receive
          </p>

          <p className="deposit-recap-value">
            {fmtCoins(effectiveCoinAmount)} Coins
          </p>
        </div>

        <div className="deposit-recap-arrow" aria-hidden>
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            →
          </motion.span>
        </div>

        <div className="text-right">
          <p className="deposit-recap-label">You pay</p>

          <p className="deposit-recap-value">
            ${fmtUsd(usdtAmount)} USDT
          </p>
        </div>
      </div>

      <p className="deposit-section-title">
        Choose payment network
      </p>

      <div
        className="space-y-3"
        role="radiogroup"
        aria-label="Payment network"
      >
        {NETWORKS.map((n, i) => {
          const selected = network === n.id;

          return (
            <motion.button
              key={n.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.05 * i,
                duration: 0.2,
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => setNetwork(n.id)}
              role="radio"
              aria-checked={selected}
              className="w-full text-left"
            >
              <motion.div
                animate={{
                  borderColor: selected
                    ? n.border
                    : "var(--border)",
                  background: selected
                    ? n.bg
                    : "var(--card-bg)",
                  boxShadow: selected
                    ? `0 0 0 1px ${n.border}, 0 12px 28px -18px ${n.border}`
                    : "0 1px 3px rgba(0,0,0,0.04)",
                }}
                className="rounded-2xl border p-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{
                      scale: selected ? 1.08 : 1,
                      rotate: selected ? 5 : 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                    }}
                  >
                    <NetworkIcon id={n.id} size={44} />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {n.label}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${n.badgeColor}`}
                      >
                        <SymbolIcon
                          name={
                            n.id === "TON"
                              ? "fast"
                              : n.id === "TRC20"
                                ? "star"
                                : "award"
                          }
                          size={11}
                        />{" "}
                        {n.badge}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {n.desc}
                    </p>

                    <div className="deposit-network-meta">
                      <span>
                        <TimerIcon size={11} />
                        {n.speed}
                      </span>

                      <span>
                        <SymbolIcon name="coins" size={11} />
                        {n.fee} fee
                      </span>
                    </div>
                  </div>

                  <motion.div
                    animate={{
                      scale: selected ? 1 : 0.5,
                      opacity: selected ? 1 : 0,
                    }}
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
        type="button"
        whileHover={{
          y: network ? -1 : 0,
        }}
        whileTap={{
          scale: network ? 0.985 : 1,
        }}
        onClick={() => {
          if (network) {
            setStep(3);
          }
        }}
        disabled={!network}
        className="deposit-cta"
      >
        <span className="deposit-cta-shine" aria-hidden />

        <span className="relative z-[1]">
          {network
            ? `Continue with ${
                NETWORKS.find((n) => n.id === network)
                  ?.label
              }`
            : "Select a network"}
        </span>
      </motion.button>
    </motion.div>
  );

  // ── STEP 3 — Payment Confirmation ─────────────────────────────────────────

  const Step3 = (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 30,
      }}
      className="space-y-4"
    >
      {payment ? (
        <>
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
              payment.status === "finished"
                ? "border-emerald-500/30 bg-emerald-500/10"
                : sessionExpired ||
                    payment.status === "expired" ||
                    payment.status === "failed"
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-[var(--border)] bg-[var(--card-bg)]"
            }`}
          >
            <span
              className={
                STATUS_META[payment.status]?.color ??
                "text-yellow-400"
              }
            >
              {STATUS_META[payment.status]?.icon}
            </span>

            <div className="flex-1 min-w-0">
              <div
                className={`text-sm font-bold ${
                  STATUS_META[payment.status]?.color ??
                  "text-yellow-400"
                }`}
              >
                {sessionExpired &&
                payment.status !== "finished"
                  ? "Payment Session Expired"
                  : STATUS_META[payment.status]?.label}
              </div>

              {!TERMINAL.has(payment.status) &&
                !sessionExpired && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                    <motion.span
                      className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                      animate={{
                        opacity: [1, 0.25, 1],
                        scale: [1, 0.85, 1],
                      }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    Checking every 5 seconds…
                  </div>
                )}
            </div>

            {!TERMINAL.has(payment.status) &&
              !sessionExpired && (
                <CountdownBadge
                  expiresAt={sessionExp}
                  expired={sessionExpired}
                />
              )}
          </div>

          {sessionExpired &&
            payment.status !== "finished" && (
              <motion.div
                initial={{
                  scale: 0.9,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                className="text-center py-8 space-y-3"
              >
                <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/25 text-red-400">
                  <TimerIcon size={26} />
                </div>

                <p className="text-red-400 font-bold text-base">
                  Session expired after 40 minutes
                </p>

                <p className="text-xs text-[var(--text-muted)]">
                  Please create a new payment to continue.
                </p>

                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetAll}
                  className="mt-2 px-6 py-3 rounded-xl font-bold text-sm"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                  }}
                >
                  Start New Deposit
                </motion.button>
              </motion.div>
            )}

          {payment.status === "finished" && (
            <motion.div
              initial={{
                scale: 0.8,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
              }}
              className="text-center py-10 space-y-3"
            >
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 0.6 }}
                className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
              >
                <SymbolIcon name="success" size={34} />
              </motion.div>

              <div className="text-2xl font-black font-numeric text-emerald-400">
                +{fmtCoins(payment.coin_amount)} Coins
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Credited to your wallet
              </p>

              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetAll}
                className="mt-3 px-6 py-3 rounded-xl font-bold text-sm"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                }}
              >
                Make Another Deposit
              </motion.button>
            </motion.div>
          )}

          {!sessionExpired &&
            payment.status !== "finished" && (
              <>
                <WarningBanner />

                <div className="deposit-card">
                  <p className="deposit-card-eyebrow">
                    Payment information
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "Network",
                        value:
                          NETWORKS.find(
                            (n) => n.id === payment.network,
                          )?.label ?? payment.network,
                      },
                      {
                        label: "Amount",
                        value: `${fmtUsd(
                          payment.usdt_amount,
                        )} USDT`,
                      },
                      {
                        label: "Coins",
                        value: `+${fmtCoins(
                          payment.coin_amount,
                        )}`,
                      },
                      {
                        label: "Expiration",
                        value: "40 Minutes",
                      },
                    ].map(({ label, value }, i) => (
                      <motion.div
                        key={label}
                        initial={{
                          opacity: 0,
                          y: 6,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay: 0.04 * i,
                          duration: 0.2,
                        }}
                        className="deposit-kv"
                      >
                        <div className="deposit-kv-label">
                          {label}
                        </div>

                        <div className="deposit-kv-value">
                          {value}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    initial={{
                      opacity: 0,
                      scale: 0.94,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    transition={{ duration: 0.25 }}
                    className="allow-longpress deposit-qr"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        payment.payment_address,
                      )}&margin=8`}
                      alt="Payment QR"
                      width={180}
                      height={180}
                      className="rounded-lg"
                    />

                    <span
                      className="deposit-qr-scan"
                      aria-hidden
                    />
                  </motion.div>

                  <p className="text-[10px] text-[var(--text-muted)]">
                    Scan to pay
                  </p>
                </div>

                <div>
                  <div className="deposit-field-label">
                    Payment address
                  </div>

                  <div className="deposit-copy-row">
                    <span className="flex-1 text-xs font-mono text-[var(--text-primary)] truncate">
                      {payment.payment_address}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          payment.payment_address,
                          "addr",
                        )
                      }
                      aria-label="Copy payment address"
                      className="deposit-copy-btn"
                    >
                      {copiedAddr ? (
                        <CheckCircleIcon
                          size={14}
                          className="text-emerald-400"
                        />
                      ) : (
                        <CopyIcon
                          size={14}
                          className="text-[var(--text-muted)]"
                        />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="deposit-field-label">
                    Exact amount to send
                  </div>

                  <div className="deposit-copy-row">
                    <span className="flex-1 text-sm font-bold font-mono text-emerald-400">
                      {fmtUsd(payment.usdt_amount)} USDT
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          String(
                            fmtUsd(payment.usdt_amount),
                          ),
                          "amt",
                        )
                      }
                      aria-label="Copy payment amount"
                      className="deposit-copy-btn"
                    >
                      {copiedAmt ? (
                        <CheckCircleIcon
                          size={14}
                          className="text-emerald-400"
                        />
                      ) : (
                        <CopyIcon
                          size={14}
                          className="text-[var(--text-muted)]"
                        />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed px-2">
                  Send exactly{" "}
                  <strong className="text-[var(--text-primary)]">
                    {fmtUsd(payment.usdt_amount)} USDT
                  </strong>{" "}
                  on{" "}
                  {
                    NETWORKS.find(
                      (n) => n.id === payment.network,
                    )?.desc
                  }
                  . Coins credited automatically after confirmation.
                </p>
              </>
            )}
        </>
      ) : (
        <>
          <div className="deposit-recap">
            <div>
              <p className="deposit-recap-label">
                You will receive
              </p>

              <p className="deposit-recap-value">
                {fmtCoins(effectiveCoinAmount)} Coins
              </p>
            </div>

            <div className="text-right">
              <p className="deposit-recap-label">Network</p>

              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <NetworkIcon
                  id={network ?? "TON"}
                  size={18}
                />

                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {network}
                </p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-yellow-500/30 bg-yellow-500/6 p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <ShieldIcon
                size={16}
                className="text-yellow-400 shrink-0"
              />

              <p className="text-sm font-bold text-yellow-300">
                Important Notice
              </p>
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

          <motion.label
            whileHover={{ y: -1 }}
            htmlFor="agree-checkbox"
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-150 ${
              agreed
                ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]"
                : "border-[var(--border)] bg-[var(--card-bg)]"
            }`}
          >
            <div className="relative shrink-0 mt-0.5">
              <input
                type="checkbox"
                id="agree-checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only peer"
              />

              <motion.div
                animate={{
                  background: agreed
                    ? "var(--accent)"
                    : "transparent",
                  borderColor: agreed
                    ? "var(--accent)"
                    : "var(--border)",
                }}
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--accent)] peer-focus-visible:outline-offset-2"
              >
                <AnimatePresence>
                  {agreed && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <CheckIcon
                        size={12}
                        color="var(--accent-contrast)"
                        strokeWidth={3}
                      />
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
            <p
              role="alert"
              className="text-xs text-red-400 flex items-center gap-1.5"
            >
              <AlertCircleIcon size={12} />
              {error}
            </p>
          )}

          <motion.button
            type="button"
            whileHover={{
              y: agreed ? -1 : 0,
            }}
            whileTap={{
              scale: agreed ? 0.985 : 1,
            }}
            onClick={handleCreatePayment}
            disabled={!agreed || submitting}
            className="deposit-cta"
          >
            <span className="deposit-cta-shine" aria-hidden />

            <span className="relative z-[1] flex items-center justify-center gap-2">
              {submitting ? (
                <>
                  <LoaderIcon
                    size={16}
                    className="animate-spin"
                  />
                  Creating Payment…
                </>
              ) : (
                "Generate Payment Address"
              )}
            </span>
          </motion.button>
        </>
      )}
    </motion.div>
  );

  // ── Deposit History ────────────────────────────────────────────────────────

  const HistorySection = (
    <div>
      <h3 className="deposit-card-eyebrow mb-3">
        Deposit history
      </h3>

      {histLoading ? (
        <SkeletonCard />
      ) : history.length === 0 ? (
        <EmptyState
          emoji="💸"
          title="No deposits yet"
          description="Make your first deposit above."
        />
      ) : (
        <div className="space-y-2">
          {history.map((d, i) => {
            const coins =
              d.coin_amount ??
              Math.round(
                (d.usdt_amount ?? d.amount) *
                  COINS_PER_USDT,
              );

            const usdt = d.usdt_amount ?? d.amount;
            const st =
              d.nowpayments_status ?? d.status;

            return (
              <motion.div
                key={d.id}
                initial={{
                  opacity: 0,
                  y: 6,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: Math.min(i * 0.04, 0.3),
                }}
                className="deposit-history-row"
              >
                <span className="deposit-history-icon">
                  <SymbolIcon name="coins" />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold font-numeric text-[var(--accent)]">
                    +{fmtCoins(coins)} Coins
                  </div>

                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
                    <span>${fmtUsd(usdt)} USDT</span>

                    {d.network && (
                      <>
                        <span className="opacity-40">·</span>
                        <span>{d.network}</span>
                      </>
                    )}

                    <span className="opacity-40">·</span>
                    <span>{fmtDt(d.created_at)}</span>
                  </div>
                </div>

                <Badge
                  variant={STATUS_COLOR[st] ?? "default"}
                  size="sm"
                >
                  {st}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  // One active keyed step keeps the wizard stable in Telegram WebView.
  const activeStep =
    step === 1 ? Step1 : step === 2 ? Step2 : Step3;

  return (
    <AppShell hideNav>
      <PageHeader
        title={headerTitle}
        back={showBack}
        onBack={handleStepBack}
        backLabel={
          step === 1
            ? "Back to home"
            : step === 2
              ? "Back to amount"
              : "Back to network"
        }
      />

      <div className="deposit-page">
        <StepBar step={step} />

        <AnimatePresence mode="sync" initial={false}>
          {activeStep}
        </AnimatePresence>

        {step === 1 && (
          <div className="pt-2">
            {HistorySection}
          </div>
        )}
      </div>
    </AppShell>
  );
}
