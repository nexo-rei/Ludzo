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
import { useI18n } from "./useI18n";
import { isSupportedLanguage, type LanguageCode } from "@/lib/i18n";

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
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
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
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const { language, setLanguage, t } = useI18n();

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
    localStorage.removeItem("ludzo_in_gaming_hub");
    setIsInGamingHubState(false);
  }, []);

  const userId = user?.id ?? null;

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

  // Load user and prefs from localStorage on mount
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
      try {
        const p = JSON.parse(storedPrefs);
        setPrefs(p);
        if (p?.language && isSupportedLanguage(p.language)) {
          setLanguage(p.language);
        }
      } catch { /* silent */ }
    }
  }, [fetchWallet, setLanguage]);

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
    if (p) {
      localStorage.setItem("ludzo_prefs", JSON.stringify(p));
      if (p.language && isSupportedLanguage(p.language)) {
        setLanguage(p.language as LanguageCode);
      }
    }
  }, [setLanguage]);

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

    // Match settlement is server-authoritative. Never manufacture Won Coins in
    // localStorage or in the playable wallet; the room settlement RPC updates
    // `won_coins_balance`, and the next wallet refresh reads that value.
  }, []);

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
        language,
        setLanguage,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
