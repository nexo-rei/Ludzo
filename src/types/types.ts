// ---- Telegram ----
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

// ---- App User ----
export interface AppUser {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  language: string;
  referral_code: string;
  referred_by: string | null;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Wallet ----
export interface Wallet {
  id: string;
  user_id: string;
  coins_balance: number;
  usdt_balance: number;
  total_usdt_earned: number;
  total_coins_earned: number;
  created_at: string;
  updated_at: string;
}

// ---- Transaction ----
export type TransactionType =
  | 'ad_reward'
  | 'streak_reward'
  | 'task_reward'
  | 'referral_reward'
  | 'deposit'
  | 'withdraw'
  | 'withdraw_fee'
  | 'game_entry'
  | 'game_win'
  | 'admin_adjustment'
  | 'welcome_bonus';

export type TransactionCurrency = 'coins' | 'usdt';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: TransactionCurrency;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

// ---- Deposit ----
export type DepositStatus = 'pending' | 'completed' | 'failed';

export interface Deposit {
  id: string;
  user_id: string;
  order_id: string;
  transaction_id: string | null;
  amount_usdt: number;
  status: DepositStatus;
  payment_provider: string;
  created_at: string;
  completed_at: string | null;
}

// ---- Withdrawal ----
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  final_amount: number;
  wallet_address: string;
  network: string;
  status: WithdrawalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ---- Referral ----
export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  first_deposit_completed: boolean;
  commission_paid: boolean;
  created_at: string;
}

// ---- Daily Streak ----
export interface DailyStreak {
  id: string;
  user_id: string;
  current_day: number;
  last_claim_date: string | null;
  streak_count: number;
  bonus_ads_today: number;
  bonus_ads_date: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Task ----
export type TaskType = 'ad' | 'channel' | 'group' | 'custom';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  reward_coins: number;
  target_link: string | null;
  telegram_chat_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type UserTaskStatus = 'not_started' | 'pending' | 'verified' | 'completed';

export interface UserTask {
  id: string;
  user_id: string;
  task_id: string;
  status: UserTaskStatus;
  completed_at: string | null;
}

export interface TaskWithUserStatus extends Task {
  userStatus: UserTaskStatus;
  userTaskId?: string;
}

// ---- Announcement ----
export interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

// ---- Notification ----
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ---- User Preferences ----
export type ThemeMode = 'dark' | 'light' | 'system';

export interface UserPreferences {
  id: string;
  user_id: string;
  language: string;
  theme: ThemeMode;
  notifications_enabled: boolean;
  dismissed_announcements: string[];
  created_at: string;
  updated_at: string;
}

// ---- Settings ----
export interface AppSettings {
  coin_rate: number;
  ad_reward: number;
  daily_ad_limit: number;
  withdraw_fee: number;
  withdraw_minimum: number;
  deposit_minimum: number;
  referral_percentage: number;
  welcome_bonus: number;
}

// ---- Leaderboard ----
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string | null;
  first_name: string;
  photo_url: string | null;
  usdt_earned: number;
}

// ---- Admin ----
export type AdminRole = 'super_admin' | 'admin' | 'moderator';

export interface AdminUser {
  id: string;
  telegram_id: number;
  role: AdminRole;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_deposits: number;
  total_withdrawals: number;
  total_ads_watched: number;
  total_revenue: number;
  pending_withdrawals: number;
}

// ---- Ads ----
export interface AdStatus {
  ads_today: number;
  daily_limit: number;
  can_watch: boolean;
  bonus_ads_today: number;
  can_claim_streak: boolean;
}

// ---- Auth Context ----
export interface AuthContextType {
  user: AppUser | null;
  wallet: Wallet | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshWallet: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}
