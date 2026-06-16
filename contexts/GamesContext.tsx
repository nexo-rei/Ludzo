import React, { createContext, useContext, useState, useCallback } from 'react';
import type { GameTheme, GameStats, GameEconomy, GameSettings, TelegramUser, WinnerEntry, Announcement } from '@/types/games';

interface GamesContextValue {
  user: TelegramUser | null;
  stats: GameStats;
  economy: GameEconomy;
  settings: GameSettings;
  winners: WinnerEntry[];
  announcements: Announcement[];
  activePlayers: number;
  setTheme: (theme: GameTheme) => void;
  setSoundEnabled: (enabled: boolean) => void;
  isLoading: boolean;
}

const defaultStats: GameStats = {
  totalMatches: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  currentStreak: 0,
  bestStreak: 0,
};

const defaultEconomy: GameEconomy = {
  coinBalance: 0,
  cashBalance: 0,
  totalCoinsWon: 0,
  totalCoinsLost: 0,
  lifetimeEarnings: 0,
  netProfit: 0,
};

const defaultSettings: GameSettings = {
  theme: 'auto',
  soundEnabled: true,
};

const GamesContext = createContext<GamesContextValue | null>(null);

export const GamesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState<TelegramUser | null>(null);
  const [stats] = useState<GameStats>(defaultStats);
  const [economy] = useState<GameEconomy>(defaultEconomy);
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [winners] = useState<WinnerEntry[]>([]);
  const [announcements] = useState<Announcement[]>([]);
  const [activePlayers] = useState<number>(0);
  const [isLoading] = useState(false);

  const setTheme = useCallback((theme: GameTheme) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, soundEnabled: enabled }));
  }, []);

  return (
    <GamesContext.Provider
      value={{
        user,
        stats,
        economy,
        settings,
        winners,
        announcements,
        activePlayers,
        setTheme,
        setSoundEnabled,
        isLoading,
      }}
    >
      {children}
    </GamesContext.Provider>
  );
};

export const useGames = (): GamesContextValue => {
  const ctx = useContext(GamesContext);
  if (!ctx) {
    throw new Error('useGames must be used within a GamesProvider');
  }
  return ctx;
};
