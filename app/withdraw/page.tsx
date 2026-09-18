"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import SymbolIcon from "@/components/ui/SymbolIcon";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import { formatDateTime, formatUSDT } from "@/lib/utils";
import {
  COINS_PER_HALF_USD,
  COINS_PER_USDT,
  MIN_WON_WITHDRAWAL_COINS,
  WON_WITHDRAWAL_STEP,
  coinsToUsd,
  isValidWonWithdrawalAmount,
  isValidUsdtWalletAddress,
} from "@/lib/economy";

interface WithdrawalItem {
  id: string;
  amount: number;
  coin_amount?: number;
  source?: string;
  fee_amount: number;
  net_amount: number;
  wallet_address: string;
  status: string;
  created_at: string;
}

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  paid: "success",
  approved: "success",
  pending: "warning",
  rejected: "error",
};

const DEFAULT_FEE_PCT = 5;

/** Branded SVG: the locked Ludo prize vault turning into a USDT payout. */
function ConverterIllustration() {
  return (
    <motion.svg
      viewBox="0 0 320 180"
      role="img"
      aria-label="Won Coins convert into a USDT withdrawal"
      className="h-auto w-full max-w-[320px]"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <linearGradient id="vault-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B5CF6" stopOpacity="0.32" />
          <stop offset="1" stopColor="#06B6D4" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="coin-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="0.48" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="coin-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#92400E" />
        </linearGradient>
        <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect x="4" y="4" width="312" height="172" rx="28" fill="url(#vault-bg)" stroke="#A78BFA" strokeOpacity="0.22" />
      <motion.circle
        cx="78" cy="88" r="49" fill="none" stroke="#A78BFA" strokeOpacity="0.24" strokeDasharray="3 8"
        animate={{ rotate: 360 }} transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "78px 88px" }}
      />
      <motion.circle
        cx="78" cy="88" r="39" fill="none" stroke="#22D3EE" strokeOpacity="0.22" strokeDasharray="20 12"
        animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "78px 88px" }}
      />

      <g filter="url(#soft-glow)">
        <ellipse cx="78" cy="107" rx="31" ry="9" fill="#78350F" opacity="0.55" />
        <path d="M47 86h62v21c0 5-14 10-31 10s-31-5-31-10V86Z" fill="url(#coin-edge)" stroke="#FBBF24" strokeOpacity="0.65" />
        <ellipse cx="78" cy="86" rx="31" ry="11" fill="url(#coin-face)" stroke="#FDE68A" strokeWidth="2" />
        <ellipse cx="78" cy="86" rx="20" ry="6.5" fill="none" stroke="#FEF3C7" strokeOpacity="0.6" />
        <path d="M78 79v14M71 82.5c4-3 14-1 14 2 0 4-14 2-14 6 0 3 10 5 14 1" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <text x="78" y="139" textAnchor="middle" fill="#DDD6FE" fontSize="9" fontWeight="800" letterSpacing="2">WON COINS</text>

      <motion.path
        d="M129 88h65m0 0-12-10m12 10-12 10" fill="none" stroke="#67E8F9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        animate={{ pathLength: [0.25, 1, 0.25], opacity: [0.35, 1, 0.35] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <circle cx="162" cy="65" r="3" fill="#A78BFA"><animate attributeName="cy" values="65;58;65" dur="2.2s" repeatCount="indefinite" /></circle>
      <circle cx="179" cy="112" r="2" fill="#67E8F9"><animate attributeName="cy" values="112;119;112" dur="1.8s" repeatCount="indefinite" /></circle>

      <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
        <circle cx="245" cy="88" r="38" fill="#0F172A" stroke="#22D3EE" strokeOpacity="0.45" strokeWidth="2" />
        <circle cx="245" cy="88" r="29" fill="none" stroke="#67E8F9" strokeOpacity="0.16" strokeWidth="1" />
        <path d="M245 67v42M232 76c7-6 25-3 25 5 0 9-25 5-25 14 0 8 18 12 26 4" fill="none" stroke="#67E8F9" strokeWidth="4" strokeLinecap="round" />
        <text x="245" y="139" textAnchor="middle" fill="#A5F3FC" fontSize="9" fontWeight="800" letterSpacing="2">USDT PAYOUT</text>
      </motion.g>
    </motion.svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
    </svg>
  );
}

export default function WithdrawPage() {
  const { userId, t } = useApp();
  const [coinAmountText, setCoinAmountText] = useState(String(MIN_WON_WITHDRAWAL_COINS));
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [feePct, setFeePct] = useState(DEFAULT_FEE_PCT);
  const [history, setHistory] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [walletRes, historyRes] = await Promise.all([
        fetch("/api/wallet", { headers: { "x-user-id": userId }, cache: "no-store" }),
        fetch("/api/withdrawals/history", { headers: { "x-user-id": userId }, cache: "no-store" }),
      ]);
      const [walletData, historyData] = await Promise.all([walletRes.json(), historyRes.json()]);
      if (walletData.success) setBalance(Number(walletData.data?.won_coins_balance ?? 0));
      if (historyData.success) {
        setHistory(historyData.data?.items ?? []);
        const first = historyData.data?.items?.find((item: WithdrawalItem) => Number.isFinite(Number(item.fee_amount)));
        if (first && Number(first.amount) > 0) {
          const inferred = Math.round((Number(first.fee_amount) / Number(first.amount)) * 100);
          if (inferred >= 0 && inferred < 100) setFeePct(inferred);
        }
      }
    } catch {
      // The page remains usable with the empty state if the network is offline.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const coinAmount = Number(coinAmountText) || 0;
  const gross = coinsToUsd(coinAmount);
  const fee = Math.round(gross * (feePct / 100) * 100) / 100;
  const net = Math.max(0, Math.round((gross - fee) * 100) / 100);
  const maxConvertible = Math.floor(balance / WON_WITHDRAWAL_STEP) * WON_WITHDRAWAL_STEP;
  const sliderMax = Math.max(MIN_WON_WITHDRAWAL_COINS, maxConvertible);
  const amountValid = isValidWonWithdrawalAmount(coinAmount) && coinAmount <= balance;
  const addressValid = isValidUsdtWalletAddress(address);
  const ready = amountValid && addressValid && !submitting;

  const amountError = (() => {
    if (!coinAmountText) return "Enter the Won Coins you want to convert.";
    if (coinAmount < MIN_WON_WITHDRAWAL_COINS) return `Minimum is ${MIN_WON_WITHDRAWAL_COINS.toLocaleString()} Won Coins ($${coinsToUsd(MIN_WON_WITHDRAWAL_COINS).toFixed(2)}).`;
    if (coinAmount % WON_WITHDRAWAL_STEP !== 0) return `Use ${WON_WITHDRAWAL_STEP}-Coin steps so every conversion settles to exact cents.`;
    if (coinAmount > balance) return "You do not have enough Won Coins for this conversion.";
    return "";
  })();

  const quickAmounts = [MIN_WON_WITHDRAWAL_COINS, 2_000, 5_000].filter((value) => value <= balance);

  const handleSubmit = async () => {
    setError("");
    if (!amountValid) { setError(amountError); return; }
    if (!addressValid) { setError("Enter a valid TRC20 or BEP20 USDT wallet address."); return; }
    if (!userId) { setError("Authentication error. Please reload the app."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ coin_amount: coinAmount, wallet_address: address.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not submit conversion.");
        return;
      }

      showToast(`${coinAmount.toLocaleString()} Won Coins converted. Admin will review it within 48h.`, "success");
      setCoinAmountText(String(MIN_WON_WITHDRAWAL_COINS));
      setAddress("");
      await load();
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell hideNav>
      <PageHeader title={t("withdraw_title")} back />
      <div className="space-y-5 px-4 py-4 pb-8">
        {/* Conversion hero */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-purple-400/20 bg-[radial-gradient(circle_at_15%_15%,rgba(139,92,246,0.22),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(6,182,212,0.14),transparent_48%),#0f172a] p-4"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="relative flex flex-col items-center">
            <div className="mb-1 flex items-center gap-2 self-start rounded-full border border-purple-300/20 bg-purple-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-purple-200">
              <LockIcon /> Locked Ludo prize vault
            </div>
            <ConverterIllustration />
            <h1 className="mt-1 text-center text-xl font-black tracking-tight text-white">Convert Won Coins</h1>
            <p className="mt-1 max-w-[280px] text-center text-[11px] font-medium leading-relaxed text-slate-400">
              Only coins won in settled Ludo matches can become a USDT withdrawal. Playable coins stay locked to gameplay.
            </p>
          </div>
        </motion.section>

        {/* Two-ledger summary */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-2.5"
        >
          <div className="rounded-2xl border border-purple-400/20 bg-purple-500/[0.07] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-purple-200">Won Coins</span>
              <LockIcon />
            </div>
            <p className="mt-1.5 text-xl font-black tabular-nums text-white">{balance.toLocaleString()}</p>
            <p className="mt-0.5 text-[9px] font-semibold text-purple-200/70">${coinsToUsd(balance).toFixed(2)} eligible value</p>
          </div>
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Playable Coins</span>
              <span className="text-[9px] font-bold text-emerald-400">PLAY ONLY</span>
            </div>
            <p className="mt-1.5 text-xl font-black text-slate-200">Protected</p>
            <p className="mt-0.5 text-[9px] font-semibold text-slate-500">Ads, tasks, deposits & admin credits</p>
          </div>
        </motion.section>

        {/* Converter card */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[0_18px_55px_-35px_rgba(139,92,246,0.7)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-[var(--text-primary)]">How much do you want to convert?</h2>
              <p className="mt-1 text-[10px] font-semibold text-[var(--text-muted)]">{COINS_PER_HALF_USD} Won Coins = $0.50 · {COINS_PER_USDT} = $1</p>
            </div>
            <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-300">Min $5</span>
          </div>

          <div className="mt-4 rounded-2xl border border-purple-400/20 bg-purple-500/[0.06] p-3.5">
            <div className="flex items-end justify-between gap-3">
              <label htmlFor="won-coin-amount" className="text-[10px] font-black uppercase tracking-widest text-purple-200">Won Coins</label>
              <span className="text-[10px] font-bold text-slate-500">Available {balance.toLocaleString()}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-purple-300/20 bg-slate-950/55 px-3 py-2.5 focus-within:border-purple-300/60">
              <span className="text-lg">◈</span>
              <input
                id="won-coin-amount"
                type="number"
                min={MIN_WON_WITHDRAWAL_COINS}
                step={WON_WITHDRAWAL_STEP}
                max={Math.max(balance, MIN_WON_WITHDRAWAL_COINS)}
                value={coinAmountText}
                onChange={(event) => { setCoinAmountText(event.target.value); setError(""); }}
                className="min-w-0 flex-1 bg-transparent text-xl font-black tabular-nums text-white outline-none"
                aria-describedby="won-coin-help"
              />
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-200">coins</span>
            </div>
            <input
              type="range"
              min={MIN_WON_WITHDRAWAL_COINS}
              max={sliderMax}
              step={WON_WITHDRAWAL_STEP}
              value={Math.min(Math.max(coinAmount >= MIN_WON_WITHDRAWAL_COINS ? coinAmount : MIN_WON_WITHDRAWAL_COINS, MIN_WON_WITHDRAWAL_COINS), sliderMax)}
              onChange={(event) => { setCoinAmountText(event.target.value); setError(""); }}
              disabled={balance < MIN_WON_WITHDRAWAL_COINS}
              className="mt-3 w-full accent-purple-500 disabled:opacity-40"
              aria-label="Won Coins to convert"
            />
            <div id="won-coin-help" className="mt-1 flex justify-between text-[9px] font-semibold text-slate-500">
              <span>1,000 minimum</span><span>{maxConvertible.toLocaleString()} max available</span>
            </div>
          </div>

          {quickAmounts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setCoinAmountText(String(value)); setError(""); }}
                  className={`rounded-xl border px-3 py-2 text-[10px] font-black transition-colors ${coinAmount === value ? "border-purple-400/70 bg-purple-500/15 text-purple-200" : "border-[var(--border)] text-[var(--text-muted)] hover:border-purple-400/40"}`}
                >
                  {value.toLocaleString()} · ${coinsToUsd(value).toFixed(2)}
                </button>
              ))}
            </div>
          )}

          {/* Live payout */}
          <div className="mt-4 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <span className="text-[var(--text-muted)]">Gross conversion</span>
              <span className="font-bold tabular-nums text-[var(--text-primary)]">${gross.toFixed(2)} USDT</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <span className="text-[var(--text-muted)]">Review / network fee ({feePct}%)</span>
              <span className="font-bold tabular-nums text-red-400">−${fee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between bg-emerald-500/[0.06] px-3.5 py-3 text-xs">
              <span className="font-black text-emerald-300">Estimated payout</span>
              <span className="text-base font-black tabular-nums text-emerald-300">${net.toFixed(2)} USDT</span>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="withdraw-address" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">USDT wallet address</label>
            <input
              id="withdraw-address"
              type="text"
              value={address}
              onChange={(event) => { setAddress(event.target.value); setError(""); }}
              placeholder="TRC20 / BEP20 wallet address"
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 font-mono text-xs text-[var(--text-primary)] outline-none transition-colors focus:border-purple-400"
            />
          </div>

          <AnimatePresence>
            {(amountError || error) && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-[10px] font-semibold text-red-400" role="alert">
                {error || amountError}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!ready}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-[0_12px_30px_-12px_rgba(124,58,237,0.95)] transition-all hover:from-purple-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Submitting conversion…" : "Convert & request payout"}
          </button>
          <p className="mt-3 text-center text-[9px] font-semibold leading-relaxed text-[var(--text-muted)]">
            Won Coins are debited when this request is submitted. A rejected request returns the same Won Coins to your locked Ludo balance.
          </p>
        </motion.section>

        {/* Rules / source separation */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid gap-2 sm:grid-cols-3"
        >
          {[
            ["LOCKED", "Won Coins never enter the Ludo stake wallet."],
            ["PLAY ONLY", "Ads, tasks, deposits and admin credits stay playable."],
            ["MINIMUM", "1,000 Won Coins are required before conversion."],
          ].map(([label, copy]) => (
            <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3">
              <span className="text-[9px] font-black tracking-[0.18em] text-[var(--accent)]">{label}</span>
              <p className="mt-1 text-[10px] font-semibold leading-relaxed text-[var(--text-muted)]">{copy}</p>
            </div>
          ))}
        </motion.div>

        {/* History */}
        <section>
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">Conversion history</h2>
          {loading ? (
            <SkeletonCard />
          ) : history.length === 0 ? (
            <EmptyState emoji="◈" title="No conversions yet" description="Your Ludo prize withdrawal requests will appear here." />
          ) : (
            <div className="space-y-2">
              {history.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.25) }}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3"
                >
                  <SymbolIcon name="withdraw" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black tabular-nums text-[var(--text-primary)]">
                      {item.coin_amount ? `${Number(item.coin_amount).toLocaleString()} Won Coins` : `$${formatUSDT(Number(item.amount))} legacy`}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">${formatUSDT(Number(item.net_amount))} USDT payout · {formatDateTime(item.created_at)}</div>
                  </div>
                  <Badge variant={STATUS_COLOR[item.status] ?? "default"} size="sm">{item.status}</Badge>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
