export type GameTheme = 'light' | 'dark' | 'auto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface GameStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
}

export interface GameEconomy {
  coinBalance: number;
  cashBalance: number;
  totalCoinsWon: number;
  totalCoinsLost: number;
  lifetimeEarnings: number;
  netProfit: number;
}

export interface GameSettings {
  theme: GameTheme;
  soundEnabled: boolean;
}

export interface WinnerEntry {
  id: string;
  name: string;
  avatarUrl?: string;
  prize: number;
  prizeType: 'coins' | 'cash';
  game: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'high' | 'normal' | 'low';
  createdAt: string;
}

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  bannerColor: string;
  iconColor: string;
  isAvailable: boolean;
  comingSoon?: string;
}
