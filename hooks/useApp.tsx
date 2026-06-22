"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { User, Wallet, UserPreferences } from "@/types";
import { showToast } from "@/components/ui/Toast";

export interface GamingStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: string;
  currentStreak: number;
  bestStreak: number;
}

interface AppContextValue {
  user: User | null;
  wallet: Wallet | null;
  prefs: UserPreferences | null;
  userId: string | null;
  loading: boolean;
  refreshWallet: () => Promise<void>;
  setUser: (u: User | null) => void;
  setPrefs: (p: UserPreferences | null) => void;
  isInGamingHub: boolean;
  setIsInGamingHub: (b: boolean) => void;
  wonCoinsBalance: number;
  gamingStats: GamingStats;
  updateWalletBalances: (coinsChange: number, usdtChange: number, wonCoinsChange: number) => void;
  recordMatchResult: (isWin: boolean, stakes: number) => void;
  clearGamingData: () => void;
}

const AppContext = createContext<AppContextValue>({
  user: null, wallet: null, prefs: null, userId: null,
  loading: true, refreshWallet: async () => {}, setUser: () => {}, setPrefs: () => {},
  isInGamingHub: false, setIsInGamingHub: () => {},
  wonCoinsBalance: 0,
  gamingStats: { totalMatches: 0, wins: 0, losses: 0, winRate: "0%", currentStreak: 0, bestStreak: 0 },
  updateWalletBalances: () => {},
  recordMatchResult: () => {},
  clearGamingData: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInGamingHub, setIsInGamingHubState] = useState<boolean>(false);

  // Gaming integrations
  const [wonCoinsBalance, setWonCoinsBalanceState] = useState<number>(0);
  const [gamingStats, setGamingStatsState] = useState<GamingStats>({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: "0%",
    currentStreak: 0,
    bestStreak: 0,
  });

  const setIsInGamingHub = useCallback((value: boolean) => {
    setIsInGamingHubState(value);
    localStorage.setItem("ludzo_in_gaming_hub", value ? "true" : "false");
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("ludzo_in_gaming_hub");
    if (stored === "true") {
      setIsInGamingHubState(true);
    }
  }, []);

  const userId = user?.id ?? null;

  // Sync won coins balance and stats on mount/changes
  useEffect(() => {
    const storedWon = localStorage.getItem("ludzo_won_coins_balance");
    const storedStats = localStorage.getItem("ludzo_gaming_stats");

    if (storedWon) {
      setWonCoinsBalanceState(Number(storedWon));
    } else {
      // Seed with some won coins for interactive testing
      setWonCoinsBalanceState(250);
      localStorage.setItem("ludzo_won_coins_balance", "250");
    }

    if (storedStats) {
      try {
        setGamingStatsState(JSON.parse(storedStats));
      } catch { /* silent */ }
    }
  }, []);

  const fetchWallet = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/wallet", { headers: { "x-user-id": id } });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // If we have stored wallet overrides, merge them to preserve demo consistency
          const storedCoinsOverride = localStorage.getItem("ludzo_wallet_coins_override");
          const storedUsdtOverride = localStorage.getItem("ludzo_wallet_usdt_override");
          const finalWallet = { ...data.data };
          if (storedCoinsOverride !== null) {
            finalWallet.coin_balance = Number(storedCoinsOverride);
          }
          if (storedUsdtOverride !== null) {
            finalWallet.usdt_balance = Number(storedUsdtOverride);
          }
          setWallet(finalWallet);
        }
      }
    } catch { /* silent */ }
  }, []);

  const refreshWallet = useCallback(async () => {
    if (userId) await fetchWallet(userId);
  }, [userId, fetchWallet]);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("ludzo_user");
    const storedPrefs = localStorage.getItem("ludzo_prefs");
    if (stored) {
      try {
        const u = JSON.parse(stored) as User;
        setUser(u);
        fetchWallet(u.id).finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    if (storedPrefs) {
      try { setPrefs(JSON.parse(storedPrefs)); } catch { /* silent */ }
    }
  }, [fetchWallet]);

  // Apply theme
  useEffect(() => {
    const theme = prefs?.theme ?? "dark";
    const effective =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        : theme;
    document.documentElement.classList.toggle("dark", effective === "dark");
    document.documentElement.setAttribute("data-theme", effective);
  }, [prefs?.theme]);

  const handleSetUser = useCallback((u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem("ludzo_user", JSON.stringify(u));
      fetchWallet(u.id);
    } else {
      localStorage.removeItem("ludzo_user");
      localStorage.removeItem("ludzo_wallet_coins_override");
      localStorage.removeItem("ludzo_wallet_usdt_override");
    }
  }, [fetchWallet]);

  const handleSetPrefs = useCallback((p: UserPreferences | null) => {
    setPrefs(p);
    if (p) localStorage.setItem("ludzo_prefs", JSON.stringify(p));
  }, []);

  // Update wallet coin and usdt balances locally
  const updateWalletBalances = useCallback((coinsChange: number, usdtChange: number, wonCoinsChange: number) => {
    setWallet((prev) => {
      if (!prev) return null;
      const nextCoins = Math.max(0, prev.coin_balance + coinsChange);
      const nextUsdt = Math.max(0, prev.usdt_balance + usdtChange);

      localStorage.setItem("ludzo_wallet_coins_override", String(nextCoins));
      localStorage.setItem("ludzo_wallet_usdt_override", String(nextUsdt));

      return {
        ...prev,
        coin_balance: nextCoins,
        usdt_balance: nextUsdt,
      };
    });

    setWonCoinsBalanceState((prev) => {
      const nextWon = Math.max(0, prev + wonCoinsChange);
      localStorage.setItem("ludzo_won_coins_balance", String(nextWon));
      return nextWon;
    });
  }, []);

  // Record simulated match result
  const recordMatchResult = useCallback((isWin: boolean, stakes: number) => {
    setGamingStatsState((prev) => {
      const nextWins = isWin ? prev.wins + 1 : prev.wins;
      const nextLosses = !isWin ? prev.losses + 1 : prev.losses;
      const nextTotal = prev.totalMatches + 1;
      const nextWinRate = nextTotal > 0 ? `${Math.round((nextWins / nextTotal) * 100)}%` : "0%";
      const nextStreak = isWin ? prev.currentStreak + 1 : 0;
      const nextBestStreak = Math.max(prev.bestStreak, nextStreak);

      const nextStats = {
        totalMatches: nextTotal,
        wins: nextWins,
        losses: nextLosses,
        winRate: nextWinRate,
        currentStreak: nextStreak,
        bestStreak: nextBestStreak,
      };

      localStorage.setItem("ludzo_gaming_stats", JSON.stringify(nextStats));

      // Append to the list of user match history in localStorage
      const historyKey = "ludzo_match_history";
      const storedHistory = localStorage.getItem(historyKey);
      let historyList = [];
      if (storedHistory) {
        try { historyList = JSON.parse(storedHistory); } catch { /* silent */ }
      }
      const newMatch = {
        id: `match_${Date.now()}`,
        gameName: "Ludo Clash",
        isWin,
        stakes,
        reward: isWin ? stakes * 2 : 0,
        timestamp: new Date().toISOString()
      };
      historyList.unshift(newMatch);
      localStorage.setItem(historyKey, JSON.stringify(historyList));

      return nextStats;
    });

    if (isWin) {
      // Entry fee of 50 was deducted at start of match. Winning awards 100 total (refund 50 stake + win 50).
      // This results in net +50 Coins. We also add +50 to Won Coins balance!
      updateWalletBalances(100, 0, 50);
    } else {
      // Loss: entry fee of 50 was deducted at start, and nothing is returned. Net -50 Coins.
    }
  }, [updateWalletBalances]);

  // Clear all game logs, override balances, and statistics
  const clearGamingData = useCallback(() => {
    localStorage.removeItem("ludzo_won_coins_balance");
    localStorage.removeItem("ludzo_gaming_stats");
    localStorage.removeItem("ludzo_match_history");
    localStorage.removeItem("ludzo_wallet_coins_override");
    localStorage.removeItem("ludzo_wallet_usdt_override");

    setWonCoinsBalanceState(0);
    setGamingStatsState({
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: "0%",
      currentStreak: 0,
      bestStreak: 0,
    });

    if (user?.id) {
      fetchWallet(user.id);
    }
    showToast("Gaming statistics and wallet overrides reset.", "info");
  }, [user, fetchWallet]);

  return (
    <AppContext.Provider
      value={{
        user,
        wallet,
        prefs,
        userId,
        loading,
        refreshWallet,
        setUser: handleSetUser,
        setPrefs: handleSetPrefs,
        isInGamingHub,
        setIsInGamingHub,
        wonCoinsBalance,
        gamingStats,
        updateWalletBalances,
        recordMatchResult,
        clearGamingData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
