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

export function isValidWonWithdrawalAmount(coins: number): boolean {
  return (
    Number.isInteger(coins) &&
    coins >= MIN_WON_WITHDRAWAL_COINS &&
    coins % WON_WITHDRAWAL_STEP === 0
  );
}

/** Accept the two USDT networks shown by the converter (TRC20 and BEP20). */
export function isValidUsdtWalletAddress(address: string): boolean {
  const value = address.trim();
  const tron = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
  const evm = /^0x[a-fA-F0-9]{40}$/;
  return tron.test(value) || evm.test(value);
}
