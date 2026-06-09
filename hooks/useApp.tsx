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

interface AppContextValue {
  user: User | null;
  wallet: Wallet | null;
  prefs: UserPreferences | null;
  userId: string | null;
  loading: boolean;
  refreshWallet: () => Promise<void>;
  setUser: (u: User | null) => void;
  setPrefs: (p: UserPreferences | null) => void;
}

const AppContext = createContext<AppContextValue>({
  user: null, wallet: null, prefs: null, userId: null,
  loading: true, refreshWallet: async () => {}, setUser: () => {}, setPrefs: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? null;

  const fetchWallet = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/wallet", { headers: { "x-user-id": id } });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setWallet(data.data);
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
    }
  }, [fetchWallet]);

  const handleSetPrefs = useCallback((p: UserPreferences | null) => {
    setPrefs(p);
    if (p) localStorage.setItem("ludzo_prefs", JSON.stringify(p));
  }, []);

  return (
    <AppContext.Provider
      value={{ user, wallet, prefs, userId, loading, refreshWallet, setUser: handleSetUser, setPrefs: handleSetPrefs }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
