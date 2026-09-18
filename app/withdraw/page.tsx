"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import SymbolIcon from "@/components/ui/SymbolIcon";
import { useApp } from "@/hooks/useApp";
import { formatDateTime, formatUSDT } from "@/lib/utils";
import {
  AlertCircleIcon,
  CheckIcon,
  LoaderIcon,
  NetworkIcon,
  ShieldIcon,
} from "@/components/ui/DuotoneIcons";
import {
  COINS_PER_HALF_USD,
  MIN_WON_WITHDRAWAL_COINS,
  WON_WITHDRAWAL_STEP,
  coinsToUsd,
  isValidWonWithdrawalAmount,
  isValidUsdtWalletAddress,
  maskWalletAddress,
  type WithdrawalNetwork,
} from "@/lib/economy";

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;

interface WithdrawalItem {
  id: string;
  amount: number;
  coin_amount?: number;
  source?: string;
  network?: string | null;
  fee_amount: number;
  net_amount: number;
  wallet_address: string;
  status: string;
  created_at: string;
}

interface Receipt {
  id: string;
  coin_amount: number;
  amount: number;
  fee_amount: number;
  net_amount: number;
  network: WithdrawalNetwork;
  wallet_address: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_FEE_PCT = 5;

// Presets mirror the deposit page's preset grid, in 200-Coin steps.
const PRESET_COINS = [1000, 2000, 5000, 10000];

const NETWORKS: {
  id: WithdrawalNetwork;
  label: string;
  desc: string;
  badge: string;
  badgeColor: string;
  color: string;
  bg: string;
  border: string;
  placeholder: string;
}[] = [
  {
    id: "TRC20", label: "USDT TRC20", desc: "Tron Network",
    badge: "Fast",
    badgeColor: "text-red-400 bg-red-400/10 border-red-400/30",
    color: "#E50914", bg: "rgba(229,9,20,0.08)", border: "rgba(229,9,20,0.35)",
    placeholder: "T… (34 characters)",
  },
  {
    id: "BEP20", label: "USDT BEP20", desc: "BNB Smart Chain",
    badge: "Recommended",
    badgeColor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    color: "#F3BA2F", bg: "rgba(243,186,47,0.08)", border: "rgba(243,186,47,0.35)",
    placeholder: "0x… (42 characters)",
  },
];

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  paid: "success",
  approved: "success",
  pending: "warning",
  rejected: "error",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtCoins(n: number): string {
  return n.toLocaleString();
}

// ─── Step Indicator (same contract as the deposit flow) ──────────────────────
function StepBar({ step }: { step: Step }) {
  const steps = ["Select Amount", "Network", "Confirmation"];
  return (
    <div className="flex items-center mb-6" aria-label={`Step ${step} of ${steps.length}: ${steps[step - 1]}`}>
      {steps.map((label, i) => {
        const num = (i + 1) as Step;
        const active = num === step;
        const done = num < step;
        return (
          <div key={num} className="flex items-center" style={{ flex: i < steps.length - 1 ? "1" : "none" }}>
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  background: done ? "var(--success-strong)" : "transparent",
                  borderColor: done ? "var(--success-strong)" : active ? "var(--accent)" : "var(--border)",
                  boxShadow: active ? "0 0 0 4px var(--accent-soft)" : "0 0 0 0 rgba(0,0,0,0)",
                  scale: active ? 1.06 : 1,
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WithdrawPage() {
  const { userId, t } = useApp();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [coinAmount, setCoinAmount] = useState<number>(MIN_WON_WITHDRAWAL_COINS);
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [network, setNetwork] = useState<WithdrawalNetwork | null>(null);
  const [address, setAddress] = useState("");
  const [wonBalance, setWonBalance] = useState(0);
  const [protectedUsdt, setProtectedUsdt] = useState(0);
  const [feePct, setFeePct] = useState(DEFAULT_FEE_PCT);
  const [history, setHistory] = useState<WithdrawalItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const effectiveCoins = useCustom ? (Number(customInput) || 0) : coinAmount;
  const gross = coinsToUsd(effectiveCoins);
  const fee = Math.round(gross * (feePct / 100) * 100) / 100;
  const net = Math.max(0, Math.round((gross - fee) * 100) / 100);

  const validationMsg = (() => {
    if (!effectiveCoins) return "";
    if (effectiveCoins < MIN_WON_WITHDRAWAL_COINS)
      return `Minimum conversion is ${fmtCoins(MIN_WON_WITHDRAWAL_COINS)} Won Coins ($${coinsToUsd(MIN_WON_WITHDRAWAL_COINS).toFixed(2)}).`;
    if (effectiveCoins % WON_WITHDRAWAL_STEP !== 0)
      return `Amounts must use ${WON_WITHDRAWAL_STEP}-Coin steps.`;
    if (effectiveCoins > wonBalance) return "You do not have enough Won Coins for this conversion.";
    return "";
  })();
  const isValidAmount = !validationMsg && isValidWonWithdrawalAmount(effectiveCoins) && effectiveCoins <= wonBalance;
  const addressValid = Boolean(network) && isValidUsdtWalletAddress(address, network ?? undefined);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!userId) return;
    setHistLoading(true);
    try {
      const [wRes, hRes] = await Promise.all([
        fetch("/api/wallet", { headers: { "x-user-id": userId }, cache: "no-store" }),
        fetch("/api/withdrawals/history", { headers: { "x-user-id": userId }, cache: "no-store" }),
      ]);
      const [w, h] = await Promise.all([wRes.json(), hRes.json()]);
      if (w.success) {
        setWonBalance(Number(w.data?.withdrawable_won_coins ?? w.data?.won_coins_balance ?? 0));
        setProtectedUsdt(Number(w.data?.protected_usdt_balance ?? w.data?.usdt_balance ?? 0));
      }
      if (h.success) {
        const items: WithdrawalItem[] = h.data?.items ?? [];
        setHistory(items);
        const first = items.find((item) => Number(item.amount) > 0 && Number.isFinite(Number(item.fee_amount)));
        if (first) {
          const inferred = Math.round((Number(first.fee_amount) / Number(first.amount)) * 100);
          if (inferred >= 0 && inferred < 100) setFeePct(inferred);
        }
      }
    } catch { /* silent — the page stays usable offline */ }
    finally { setHistLoading(false); }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isValidAmount || !network || !addressValid || !userId) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ coin_amount: effectiveCoins, wallet_address: address.trim(), network }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not submit the withdrawal request.");
        return;
      }
      setReceipt({
        id: String(data.data?.id ?? data.data?.withdrawal_id ?? ""),
        coin_amount: Number(data.data?.coin_amount ?? effectiveCoins),
        amount: Number(data.data?.amount ?? gross),
        fee_amount: Number(data.data?.fee_amount ?? fee),
        net_amount: Number(data.data?.net_amount ?? net),
        network,
        wallet_address: address.trim(),
      });
      setStep(3);
      await loadData();
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setReceipt(null);
    setNetwork(null);
    setAddress("");
    setUseCustom(false);
    setCustomInput("");
    setCoinAmount(MIN_WON_WITHDRAWAL_COINS);
    setError("");
    setStep(1);
    loadData();
  };

  const headerTitle = step === 1 ? t("withdraw_title") : step === 2 ? "Network & Wallet" : "Request Submitted";
  const showBack = !receipt && !submitting;

  const handleStepBack = () => {
    if (step === 1) router.push("/home");
    else if (step === 2) setStep(2 - 1 as Step);
  };

  // ── STEP 1 — Balance / amount selection ────────────────────────────────────
  const Step1 = (
    <motion.div key="step1" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="space-y-5">
      {/* Protected deposit / admin funds — display only, never a source */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldIcon size={15} className="text-emerald-400 shrink-0" />
            <p className="text-sm font-bold text-[var(--text-primary)]">Protected deposit / admin funds</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]">
            Not withdrawable
          </span>
        </div>
        <p className="mt-2 text-lg font-black font-numeric text-[var(--text-primary)]">${formatUSDT(protectedUsdt)} USDT</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          Deposits and admin credits stay locked for gameplay and cannot be selected as a withdrawal source.
        </p>
      </div>

      {/* Won Coins balance */}
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Ludo Won Coins</p>
        <p className="text-3xl font-black font-numeric text-[var(--accent)]">
          {fmtCoins(wonBalance)} <span className="text-base text-[var(--text-muted)] font-semibold">Coins</span>
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">≈ ${coinsToUsd(wonBalance).toFixed(2)} USDT</p>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">Only settled Ludo winnings are eligible.</p>
      </div>

      {/* Amount selector card */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-0.5">Select Amount</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {COINS_PER_HALF_USD} Coins = $0.50 · Min {fmtCoins(MIN_WON_WITHDRAWAL_COINS)} · {WON_WITHDRAWAL_STEP}-Coin steps
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Preset conversion amounts">
          {PRESET_COINS.map((v, i) => (
            <motion.button
              key={v}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.18 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setUseCustom(false); setCoinAmount(v); setError(""); }}
              disabled={v > wonBalance}
              aria-pressed={!useCustom && coinAmount === v}
              className={`py-3 rounded-xl text-sm border transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed ${
                !useCustom && coinAmount === v
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="block font-bold font-numeric">{fmtCoins(v)}</span>
              <span className="block text-[10px] opacity-70">${coinsToUsd(v).toFixed(2)}</span>
            </motion.button>
          ))}
        </div>

        <div>
          <label htmlFor="withdraw-custom-amount" className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">
            Custom amount (min {fmtCoins(MIN_WON_WITHDRAWAL_COINS)}, {WON_WITHDRAWAL_STEP}-Coin steps)
          </label>
          <input
            id="withdraw-custom-amount"
            type="number"
            min={MIN_WON_WITHDRAWAL_COINS}
            step={WON_WITHDRAWAL_STEP}
            value={customInput}
            onFocus={() => setUseCustom(true)}
            onChange={(e) => { setCustomInput(e.target.value); setUseCustom(true); setError(""); }}
            placeholder="e.g. 2000"
            aria-invalid={useCustom && !!validationMsg}
            className={`w-full px-4 py-3 bg-[var(--bg)] border rounded-xl text-[var(--text-primary)] font-numeric text-base outline-none transition-colors ${
              useCustom
                ? validationMsg ? "border-red-400/70 focus:border-red-400" : "border-[var(--accent)]"
                : "border-[var(--border)] focus:border-[var(--accent)]"
            }`}
          />
        </div>

        {/* Live payout breakdown */}
        <AnimatePresence>
          {isValidAmount && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-[var(--text-muted)]">Gross USDT</span>
                  <span className="text-sm font-bold font-numeric text-[var(--text-primary)]">${gross.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-[var(--text-muted)]">Fee ({feePct}%)</span>
                  <span className="text-sm font-bold font-numeric text-red-400">−${fee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--accent-soft)]">
                  <span className="text-xs font-bold text-[var(--accent)]">Estimated net payout</span>
                  <span className="text-sm font-black font-numeric text-[var(--accent)]">${net.toFixed(2)} USDT</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm
                   transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
      >
        Continue — {isValidAmount ? `${fmtCoins(effectiveCoins)} Won Coins ($${net.toFixed(2)} net)` : "Select amount"}
      </motion.button>
    </motion.div>
  );

  // ── STEP 2 — Network + wallet address ──────────────────────────────────────
  const Step2 = (
    <motion.div key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="space-y-4">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)]">You convert</p>
          <p className="text-lg font-black font-numeric text-[var(--accent)]">{fmtCoins(effectiveCoins)} Won Coins</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">You receive</p>
          <p className="text-lg font-bold font-numeric text-[var(--accent)]">${net.toFixed(2)} USDT</p>
        </div>
      </div>

      <p className="text-sm font-bold text-[var(--text-primary)] px-1">Choose payout network</p>

      <div className="space-y-3" role="radiogroup" aria-label="Payout network">
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
              onClick={() => { setNetwork(n.id); setError(""); }}
              role="radio"
              aria-checked={selected}
              className="w-full text-left"
            >
              <motion.div
                animate={{
                  borderColor: selected ? n.border : "var(--border)",
                  background: selected ? n.bg : "var(--card-bg)",
                  boxShadow: selected ? `0 0 0 1px ${n.border}, 0 6px 20px -8px ${n.border}` : "0 1px 3px rgba(0,0,0,0.04)",
                }}
                className="rounded-2xl border p-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <motion.div animate={{ scale: selected ? 1.08 : 1, rotate: selected ? 5 : 0 }} transition={{ type: "spring", stiffness: 300 }}>
                    <NetworkIcon id={n.id} size={44} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--text-primary)]">{n.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${n.badgeColor}`}>
                        <SymbolIcon name={n.id === "TRC20" ? "star" : "award"} size={11} /> {n.badge}
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

      <AnimatePresence>
        {network && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 space-y-2">
              <label htmlFor="withdraw-address" className="text-xs text-[var(--text-muted)] font-medium block">
                {network} USDT wallet address
              </label>
              <input
                id="withdraw-address"
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setError(""); }}
                placeholder={NETWORKS.find((n) => n.id === network)?.placeholder}
                aria-invalid={address.length > 0 && !addressValid}
                className={`w-full px-4 py-3 bg-[var(--bg)] border rounded-xl font-mono text-xs text-[var(--text-primary)] outline-none transition-colors ${
                  address.length > 0 && !addressValid ? "border-red-400/70 focus:border-red-400" : "border-[var(--border)] focus:border-[var(--accent)]"
                }`}
              />
              <p className="text-[10px] text-[var(--text-muted)]">
                Double-check the address. Payouts sent to a wrong address cannot be recovered.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertCircleIcon size={12} /> {error}
        </p>
      )}

      <motion.button
        whileHover={{ scale: addressValid ? 1.01 : 1 }} whileTap={{ scale: addressValid ? 0.98 : 1 }}
        onClick={handleSubmit}
        disabled={!addressValid || submitting}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm
                   transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
      >
        {submitting
          ? <><LoaderIcon size={16} className="animate-spin" /> Submitting request…</>
          : !network ? "Select a network" : addressValid ? "Submit withdrawal request" : "Enter wallet address"}
      </motion.button>

      <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed px-2">
        Won Coins are debited when the request is submitted. A rejected request returns the same Won Coins to your locked Ludo balance.
      </p>
    </motion.div>
  );

  // ── STEP 3 — Success ───────────────────────────────────────────────────────
  const Step3 = receipt && (
    <motion.div key="step3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="space-y-4">
      <div className="text-center py-6 space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
        >
          <SymbolIcon name="success" size={34} />
        </motion.div>
        <p className="text-xl font-black text-emerald-400">Congratulations</p>
        <p className="text-xs text-[var(--text-muted)]">Your withdrawal request was submitted successfully.</p>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Request Summary</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Converted Won Coins", value: `${fmtCoins(receipt.coin_amount)}` },
            { label: "Gross USDT", value: `$${receipt.amount.toFixed(2)}` },
            { label: "Fee", value: `$${receipt.fee_amount.toFixed(2)}` },
            { label: "Expected net payout", value: `$${receipt.net_amount.toFixed(2)}` },
            { label: "Network", value: receipt.network },
            { label: "Wallet", value: maskWalletAddress(receipt.wallet_address) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[var(--bg)] rounded-xl px-3 py-2.5">
              <div className="text-[10px] text-[var(--text-muted)] mb-0.5">{label}</div>
              <div className="text-sm font-bold font-numeric text-[var(--text-primary)] truncate">{value}</div>
            </div>
          ))}
        </div>
        <div className="bg-[var(--bg)] rounded-xl px-3 py-2.5">
          <div className="text-[10px] text-[var(--text-muted)] mb-0.5">Request ID</div>
          <div className="text-xs font-mono text-[var(--text-primary)] break-all">{receipt.id}</div>
        </div>
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
        <ShieldIcon size={15} className="text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300/90 leading-relaxed">
          Your request will be reviewed within 48 hours. You can track its status in your withdrawal history below.
        </p>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        onClick={resetAll}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all duration-150"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
      >
        View withdrawal history
      </motion.button>
    </motion.div>
  );

  // ── Withdrawal history ─────────────────────────────────────────────────────
  const HistorySection = (
    <div>
      <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Withdrawal History</h3>
      {histLoading ? <SkeletonCard /> : history.length === 0 ? (
        <EmptyState emoji="◈" title="No withdrawals yet" description="Your Ludo prize withdrawal requests will appear here." />
      ) : (
        <div className="space-y-2">
          {history.map((item, i) => {
            const isWon = Number(item.coin_amount) > 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl"
              >
                <SymbolIcon name="withdraw" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold font-numeric text-[var(--text-primary)]">
                    {isWon
                      ? `${fmtCoins(Number(item.coin_amount))} Won Coins`
                      : `$${formatUSDT(Number(item.amount))} USDT`}
                    {!isWon && <span className="ml-1.5 text-[10px] font-semibold text-[var(--text-muted)]">Legacy</span>}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
                    <span>Gross ${formatUSDT(Number(item.amount))}</span>
                    <span className="opacity-40">·</span>
                    <span>Fee ${formatUSDT(Number(item.fee_amount))}</span>
                    <span className="opacity-40">·</span>
                    <span>Net ${formatUSDT(Number(item.net_amount))}</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
                    {item.network && <><span>{item.network}</span><span className="opacity-40">·</span></>}
                    <span className="font-mono">{maskWalletAddress(item.wallet_address ?? "")}</span>
                    <span className="opacity-40">·</span>
                    <span>{formatDateTime(item.created_at)}</span>
                  </div>
                </div>
                <Badge variant={STATUS_COLOR[item.status] ?? "default"} size="sm">{item.status}</Badge>
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
        backLabel={step === 1 ? "Back to home" : "Back to amount"}
      />
      <div className="px-4 py-4 pb-8 space-y-5">
        <StepBar step={step} />

        <AnimatePresence mode="wait">
          {step === 1 && Step1}
          {step === 2 && Step2}
          {step === 3 && Step3}
        </AnimatePresence>

        {(step === 1 || step === 3) && <div className="pt-2">{HistorySection}</div>}
      </div>
    </AppShell>
  );
}
