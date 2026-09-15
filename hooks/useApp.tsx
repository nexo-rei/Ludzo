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
    // The gaming hub is now a self-contained route group (/games/*), so this
    // flag only exists for backwards compatibility with old saved state.
    // Never let a stale "true" from a previous session turn the main app's
    // Home/Profile into the gamer dashboard.
    setIsInGamingHubState(value);
    localStorage.setItem("ludzo_in_gaming_hub", value ? "true" : "false");
  }, []);

  useEffect(() => {
    // Clear legacy hub mode saved by older builds — the /games/* routes own
    // the game experience now, not the shared Home/Profile screens.
    localStorage.removeItem("ludzo_in_gaming_hub");
    setIsInGamingHubState(false);
  }, []);

  const userId = user?.id ?? null;

  // Sync legacy local stats on mount. Won Coins are NOT read from localStorage
  // anymore — they are always the DB value (wallets.won_coins_balance), because
  // every match is settled server-side by settle_ludo_match().
  useEffect(() => {
    const storedStats = localStorage.getItem("ludzo_gaming_stats");
    if (storedStats) {
      try {
        setGamingStatsState(JSON.parse(storedStats));
      } catch { /* silent */ }
    }
  }, []);

  const fetchWallet = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/wallet", { headers: { "x-user-id": id }, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // The database is the single source of truth for balances. The old
          // localStorage "override" values used to shadow DB writes, which is
          // why Won Coins / Coins never appeared to change after a match.
          const dbWallet = data.data;
          setWallet(dbWallet);
          setWonCoinsBalanceState(Number(dbWallet?.won_coins_balance ?? 0));
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

  // Update wallet coin and usdt balances locally (optimistic, DB wins on next refresh)
  const updateWalletBalances = useCallback((coinsChange: number, usdtChange: number, wonCoinsChange: number) => {
    setWallet((prev) => {
      if (!prev) return null;
      const nextCoins = Math.max(0, prev.coin_balance + coinsChange);
      const nextUsdt = Math.max(0, prev.usdt_balance + usdtChange);
      const nextWon = Math.max(0, (prev.won_coins_balance || 0) + wonCoinsChange);

      return {
        ...prev,
        coin_balance: nextCoins,
        usdt_balance: nextUsdt,
        won_coins_balance: nextWon,
      };
    });

    setWonCoinsBalanceState((prev) => Math.max(0, prev + wonCoinsChange));
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

  // Clear all legacy game logs / demo overrides and statistics
  const clearGamingData = useCallback(() => {
    localStorage.removeItem("ludzo_won_coins_balance");
    localStorage.removeItem("ludzo_gaming_stats");
    localStorage.removeItem("ludzo_match_history");
    localStorage.removeItem("ludzo_wallet_coins_override");
    localStorage.removeItem("ludzo_wallet_usdt_override");
    localStorage.removeItem("ludzo_in_gaming_hub");

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
    showToast("Local cache cleared — balances reloaded from the server.", "info");
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
