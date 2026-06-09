// ─── Settings ────────────────────────────────────────────────────────────────

export interface AppSettings {
  app_name: string;
  support_username: string;
  coin_rate: number;
  ad_reward_coins: number;
  daily_ad_limit: number;
  welcome_bonus_coins: number;
  referral_commission_pct: number;
  min_deposit: number;
  min_withdrawal: number;
  withdrawal_fee_pct: number;
  streak_day_1: number;
  streak_day_2: number;
  streak_day_3: number;
  streak_day_4: number;
  streak_day_5: number;
  streak_day_6: number;
  streak_day_7: number;
  maintenance_mode: boolean;
  maintenance_message: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  photo_url?: string;
  country?: string;
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  coin_balance: number;
  usdt_balance: number;
  updated_at: string;
}

export interface UserWithWallet extends User {
  coin_balance: number;
  usdt_balance: number;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  currency: "coins" | "usdt";
  amount: number;
  description?: string;
  status: "pending" | "completed" | "failed" | "refunded";
  reference_id?: string;
  created_at: string;
}

// ─── Daily Streak ─────────────────────────────────────────────────────────────

export interface DailyStreak {
  id: string;
  user_id: string;
  current_day: number;
  last_claimed_at?: string;
  total_claimed: number;
  created_at: string;
  updated_at: string;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskType = "channel_join" | "group_join" | "ad_task" | "custom";

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  reward_coins: number;
  target_link?: string;
  target_id?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserTask {
  id: string;
  user_id: string;
  task_id: string;
  status: "in_progress" | "completed" | "failed";
  completed_at?: string;
  created_at: string;
}

export interface TaskWithStatus extends Task {
  user_task: UserTask | null;
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  commission_amount: number;
  commission_status: "pending" | "earned";
  first_deposit_processed: boolean;
  created_at: string;
}

export interface ReferralItem {
  id: string;
  name: string;
  username?: string;
  commission_amount: number;
  commission_status: "pending" | "earned";
  joined_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  total_commission: number;
  pending_commission: number;
}

// ─── Deposits ─────────────────────────────────────────────────────────────────

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  binance_order_id?: string;
  binance_transaction_id?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  wallet_address: string;
  status: "pending" | "approved" | "rejected" | "paid";
  admin_note?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Announcements ────────────────────────────────────────────────────────────

export interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username?: string;
  first_name: string;
  photo_url?: string;
  country?: string;
  total_usdt_earned: number;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export type AdminRole = "super_admin" | "admin" | "moderator" | "support";

export interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
  admin_username?: string;
}

// ─── Support ─────────────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_reply?: string;
  created_at: string;
  updated_at: string;
}

// ─── Home Page Data ───────────────────────────────────────────────────────────

export interface HomePageUser {
  id: string;
  first_name: string;
  photo_url?: string;
}

export interface HomePageAds {
  watched_today: number;
  daily_limit: number;
  reward_per_ad: number;
}

export interface HomePageStreak {
  current_day: number;
  last_claimed_at: string | null;
  today_reward: number;
}

export interface HomePageSettings {
  coin_rate: number;
}

export interface HomePageData {
  user: HomePageUser;
  wallet: { coin_balance: number; usdt_balance: number };
  ads: HomePageAds;
  streak: HomePageStreak;
  announcements: Announcement[];
  recent_activity: Transaction[];
  leaderboard_top3: LeaderboardEntry[];
  settings: HomePageSettings;
}

// ─── User Preferences ────────────────────────────────────────────────────────

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: "dark" | "light" | "system";
  language: string;
  notifications_enabled: boolean;
  updated_at: string;
}
