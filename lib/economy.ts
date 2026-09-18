/**
 * Ludzo's single source of truth for coin conversion.
 *
 * Coins that come from deposits, tasks, ads, streaks, referrals, or an admin
 * are playable only. Ludo prizes are stored separately in won_coins_balance
 * and use the same display rate when a user converts them for withdrawal.
 */
export const COINS_PER_USDT = 200;
export const COINS_PER_HALF_USD = 100;
export const MIN_WON_WITHDRAWAL_COINS = 1_000;
export const WON_WITHDRAWAL_STEP = COINS_PER_USDT;

/**
 * Deposit floor. The public Coin rate is unchanged (100 Coins = $0.50), only
 * the smallest purchase moved to $3.00 — 600 Coins at the fixed rate.
 */
export const MIN_DEPOSIT_USD = 3;
export const MIN_DEPOSIT_COINS = MIN_DEPOSIT_USD * COINS_PER_USDT; // 600
export const MAX_DEPOSIT_COINS = 50_000;
export const MAX_DEPOSIT_USD = MAX_DEPOSIT_COINS / COINS_PER_USDT; // 250

export function coinsToUsd(coins: number): number {
  if (!Number.isFinite(coins)) return 0;
  return Math.round((Math.max(0, coins) / COINS_PER_USDT) * 100) / 100;
}

export function usdToCoins(usd: number): number {
  if (!Number.isFinite(usd)) return 0;
  return Math.round(Math.max(0, usd) * COINS_PER_USDT);
}

export function formatCoinRate(): string {
  return `${COINS_PER_HALF_USD.toLocaleString()} Coins = $0.50`;
}

/**
 * A deposit must be a whole number of Coins between the $3 floor and the
 * existing ceiling. The rate itself never changes — only the floor does.
 */
export function isValidDepositCoinAmount(coins: number): boolean {
  return (
    Number.isInteger(coins) &&
    coins >= MIN_DEPOSIT_COINS &&
    coins <= MAX_DEPOSIT_COINS
  );
}

export function isValidWonWithdrawalAmount(coins: number): boolean {
  return (
    Number.isInteger(coins) &&
    coins >= MIN_WON_WITHDRAWAL_COINS &&
    coins % WON_WITHDRAWAL_STEP === 0
  );
}

/** The USDT payout networks supported by the withdrawal flow. */
export const WITHDRAWAL_NETWORKS = ["TRC20", "BEP20"] as const;
export type WithdrawalNetwork = (typeof WITHDRAWAL_NETWORKS)[number];

const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function isWithdrawalNetwork(value: unknown): value is WithdrawalNetwork {
  return typeof value === "string" && (WITHDRAWAL_NETWORKS as readonly string[]).includes(value);
}

/** Accept the two USDT networks shown by the converter (TRC20 and BEP20). */
export function isValidUsdtWalletAddress(address: string, network?: WithdrawalNetwork): boolean {
  const value = address.trim();
  if (network === "TRC20") return TRON_ADDRESS.test(value);
  if (network === "BEP20") return EVM_ADDRESS.test(value);
  return TRON_ADDRESS.test(value) || EVM_ADDRESS.test(value);
}

/** Mask a payout address for confirmation screens and receipts. */
export function maskWalletAddress(address: string): string {
  const value = address.trim();
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}
