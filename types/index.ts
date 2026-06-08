export type UserRole = 'user' | 'moderator' | 'admin' | 'owner';
export type TaskType = 'channel' | 'group' | 'ad';
export type TaskStatus = 'not_started' | 'pending' | 'verified' | 'completed';
export type TransactionType = 'welcome_bonus' | 'channel_reward' | 'group_reward' | 'ad_reward' | 'referral_reward' | 'referral_commission' | 'game_reward' | 'withdrawal' | 'deposit';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';
export type WithdrawalMethod = 'upi' | 'binance';
export type Currency = 'coins' | 'inr' | 'usdt';

export interface User {
  id: string;
  telegram_id: number;
  display_name: string;
  username?: string;
  photo_url?: string;
  language: string;
  country: string;
  theme: string;
  avatar?: string;
  rank: string;
  role: UserRole;
  status: string;
  referral_code: string;
  referred_by?: string;
  welcome_bonus_claimed: boolean;
  created_at: string;
  updated_at: string;
  wallets?: Wallet[];
}

export interface Wallet {
  id: string;
  user_id: string;
  coins: number;
  inr_balance: number;
  usdt_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  target_link?: string;
  reward_coins: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserTask {
  id: string;
  user_id: string;
  task_id: string;
  status: TaskStatus;
  completed_at?: string;
  claimed_at?: string;
  created_at: string;
  task?: Task;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  source?: string;
  status: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: Currency;
  method: WithdrawalMethod;
  payment_details: Record<string, any>;
  status: WithdrawalStatus;
  fee: number;
  net_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  coins_rewarded: number;
  cash_commission: number;
  created_at: string;
}

export interface AdLog {
  id: string;
  user_id: string;
  watched_at: string;
  reward_coins: number;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  admin_id?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar?: string;
  photo_url?: string;
  balance: number;
  rank_label?: string;
}
