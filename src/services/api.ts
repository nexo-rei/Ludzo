import { supabase } from '@/db/supabase';
import type { AppUser, Wallet, UserPreferences, AppSettings, Transaction, Task, TaskWithUserStatus, LeaderboardEntry, Announcement, Deposit, Withdrawal, DailyStreak, AdStatus } from '@/types/types';

const TELEGRAM_ID = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return window.Telegram.WebApp.initDataUnsafe.user.id;
  }
  return null;
};

// ---- Auth ----
export async function authTelegram(telegramData: {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  referral_code?: string;
}): Promise<{ user: AppUser; wallet: Wallet; preferences: UserPreferences; isNew: boolean }> {
  const { id, first_name, last_name, username, photo_url, language_code, referral_code } = telegramData;

  // Upsert user
  let { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', id)
    .maybeSingle();

  let isNew = false;

  if (!existingUser) {
    isNew = true;
    const insertData: Record<string, unknown> = {
      telegram_id: id,
      first_name,
      last_name: last_name ?? null,
      username: username ?? null,
      photo_url: photo_url ?? null,
      language: language_code?.split('-')[0] ?? 'en',
    };

    // Handle referral
    if (referral_code) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referral_code.toUpperCase())
        .maybeSingle();
      if (referrer) {
        insertData.referred_by = referrer.id;
      }
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert(insertData)
      .select('*')
      .single();

    if (error || !newUser) throw new Error('Failed to create user');
    existingUser = newUser;

    // Create wallet
    await supabase.from('wallets').insert({ user_id: newUser.id });

    // Award welcome bonus
    const { data: settings } = await supabase.from('settings').select('key,value');
    const welcomeBonus = settings?.find(s => s.key === 'welcome_bonus')?.value ?? '10';
    await supabase.rpc('award_coins', {
      p_user_id: newUser.id,
      p_amount: parseInt(welcomeBonus),
      p_type: 'welcome_bonus',
      p_description: 'Welcome bonus',
    });

    // Create referral record
    if (insertData.referred_by) {
      await supabase.from('referrals').insert({
        referrer_id: insertData.referred_by,
        referred_user_id: newUser.id,
      });
      // Award new user referral coins
      await supabase.rpc('award_coins', {
        p_user_id: newUser.id,
        p_amount: 10,
        p_type: 'referral_reward',
        p_description: 'Referral join bonus',
      });
    }

    // Init daily streak
    await supabase.from('daily_streaks').insert({ user_id: newUser.id });

    // Init preferences
    await supabase.from('user_preferences').insert({
      user_id: newUser.id,
      language: language_code?.split('-')[0] ?? 'en',
    });
  } else {
    // Update photo_url if changed
    await supabase.from('users')
      .update({ photo_url: photo_url ?? existingUser.photo_url, updated_at: new Date().toISOString() })
      .eq('id', existingUser.id);
  }

  const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', existingUser.id).maybeSingle();
  const { data: preferences } = await supabase.from('user_preferences').select('*').eq('user_id', existingUser.id).maybeSingle();

  return {
    user: existingUser as AppUser,
    wallet: wallet as Wallet,
    preferences: preferences as UserPreferences,
    isNew,
  };
}

// ---- Wallet ----
export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
  return data as Wallet | null;
}

export async function getTransactionHistory(userId: string, page = 0, filter?: string): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(page * 20, page * 20 + 19);

  if (filter === 'coins') query = query.eq('currency', 'coins');
  else if (filter === 'usdt') query = query.eq('currency', 'usdt');
  else if (filter === 'deposits') query = query.eq('type', 'deposit');
  else if (filter === 'withdrawals') query = query.eq('type', 'withdraw');
  else if (filter === 'referrals') query = query.eq('type', 'referral_reward');
  else if (filter === 'tasks') query = query.eq('type', 'task_reward');
  else if (filter === 'ads') query = query.in('type', ['ad_reward', 'streak_reward']);

  const { data } = await query;
  return Array.isArray(data) ? data as Transaction[] : [];
}

// ---- Ads ----
export async function getAdStatus(userId: string): Promise<AdStatus> {
  const { data: settings } = await supabase.from('settings').select('key,value');
  const dailyLimit = parseInt(settings?.find(s => s.key === 'daily_ad_limit')?.value ?? '15');

  const today = new Date().toISOString().split('T')[0];
  const { data: adLogs } = await supabase
    .from('ad_logs')
    .select('id, is_streak_ad')
    .eq('user_id', userId)
    .gte('watched_at', `${today}T00:00:00Z`);

  const regularAds = (adLogs ?? []).filter(l => !l.is_streak_ad).length;
  const bonusAds = (adLogs ?? []).filter(l => l.is_streak_ad).length;

  const { data: streak } = await supabase.from('daily_streaks').select('last_claim_date').eq('user_id', userId).maybeSingle();
  const alreadyClaimed = streak?.last_claim_date === today;

  return {
    ads_today: regularAds,
    daily_limit: dailyLimit,
    can_watch: regularAds < dailyLimit,
    bonus_ads_today: bonusAds,
    can_claim_streak: bonusAds >= 3 && !alreadyClaimed,
  };
}

export async function rewardAd(userId: string): Promise<{ success: boolean; coins: number; message: string }> {
  const status = await getAdStatus(userId);
  if (!status.can_watch) {
    return { success: false, coins: 0, message: 'Daily ad limit reached' };
  }
  const { data: settings } = await supabase.from('settings').select('key,value');
  const adReward = parseInt(settings?.find(s => s.key === 'ad_reward')?.value ?? '2');

  await supabase.from('ad_logs').insert({ user_id: userId, reward_coins: adReward, is_streak_ad: false });
  await supabase.rpc('award_coins', {
    p_user_id: userId,
    p_amount: adReward,
    p_type: 'ad_reward',
    p_description: 'Rewarded ad',
  });

  return { success: true, coins: adReward, message: `+${adReward} Coins earned!` };
}

export async function rewardBonusAd(userId: string): Promise<{ success: boolean; message: string }> {
  const status = await getAdStatus(userId);
  if (status.bonus_ads_today >= 3) {
    return { success: false, message: 'Already watched 3 bonus ads today' };
  }
  await supabase.from('ad_logs').insert({ user_id: userId, reward_coins: 0, is_streak_ad: true });
  return { success: true, message: 'Bonus ad counted!' };
}

export async function claimStreak(userId: string): Promise<{ success: boolean; coins: number; message: string }> {
  const status = await getAdStatus(userId);
  if (!status.can_claim_streak) {
    return { success: false, coins: 0, message: 'Cannot claim streak yet' };
  }

  const today = new Date().toISOString().split('T')[0];
  const { data: streak } = await supabase.from('daily_streaks').select('*').eq('user_id', userId).maybeSingle();
  if (!streak) return { success: false, coins: 0, message: 'Streak not found' };

  const streakRewards = [0, 2, 3, 4, 5, 6, 8, 10];
  const currentDay = streak.current_day ?? 1;
  const coins = streakRewards[currentDay] ?? 2;
  const nextDay = currentDay >= 7 ? 1 : currentDay + 1;

  await supabase.from('daily_streaks').update({
    current_day: nextDay,
    last_claim_date: today,
    streak_count: (streak.streak_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  await supabase.rpc('award_coins', {
    p_user_id: userId,
    p_amount: coins,
    p_type: 'streak_reward',
    p_description: `Day ${currentDay} streak reward`,
  });

  return { success: true, coins, message: `+${coins} Coins streak reward!` };
}

export async function getDailyStreak(userId: string): Promise<DailyStreak | null> {
  const { data } = await supabase.from('daily_streaks').select('*').eq('user_id', userId).maybeSingle();
  return data as DailyStreak | null;
}

// ---- Tasks ----
export async function getTasks(userId: string, filter?: string): Promise<TaskWithUserStatus[]> {
  let query = supabase.from('tasks').select('*').eq('is_active', true).order('sort_order');
  if (filter && filter !== 'all') query = query.eq('type', filter);
  const { data: tasks } = await query;
  if (!tasks?.length) return [];

  const { data: userTasks } = await supabase.from('user_tasks').select('*').eq('user_id', userId);
  const userTaskMap = new Map((userTasks ?? []).map(ut => [ut.task_id, ut]));

  return (tasks as Task[]).map(task => ({
    ...task,
    userStatus: userTaskMap.get(task.id)?.status ?? 'not_started',
    userTaskId: userTaskMap.get(task.id)?.id,
  }));
}

export async function startTask(userId: string, taskId: string): Promise<void> {
  await supabase.from('user_tasks').upsert({ user_id: userId, task_id: taskId, status: 'pending' }, { onConflict: 'user_id,task_id' });
}

export async function verifyTask(userId: string, taskId: string): Promise<{ success: boolean; message: string }> {
  await supabase.from('user_tasks').update({ status: 'verified' }).eq('user_id', userId).eq('task_id', taskId);
  return { success: true, message: 'Task verified!' };
}

export async function claimTask(userId: string, taskId: string): Promise<{ success: boolean; coins: number; message: string }> {
  const { data: ut } = await supabase.from('user_tasks').select('status').eq('user_id', userId).eq('task_id', taskId).maybeSingle();
  if (!ut || ut.status !== 'verified') return { success: false, coins: 0, message: 'Task not verified' };

  const { data: task } = await supabase.from('tasks').select('reward_coins,title').eq('id', taskId).maybeSingle();
  if (!task) return { success: false, coins: 0, message: 'Task not found' };

  await supabase.from('user_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('user_id', userId).eq('task_id', taskId);
  await supabase.rpc('award_coins', {
    p_user_id: userId,
    p_amount: task.reward_coins,
    p_type: 'task_reward',
    p_description: `Task: ${task.title}`,
    p_reference_id: taskId,
  });

  return { success: true, coins: task.reward_coins, message: `+${task.reward_coins} Coins earned!` };
}

// ---- Referrals ----
export async function getReferralStats(userId: string) {
  const { data: referrals } = await supabase.from('referrals').select('*, users!referred_user_id(first_name,username,photo_url)').eq('referrer_id', userId).order('created_at', { ascending: false });
  const { data: rewards } = await supabase.from('referral_rewards').select('commission_amount').eq('referral_id', (referrals ?? []).map(r => r.id).join(',') || '00000000-0000-0000-0000-000000000000');

  const totalEarnings = (rewards ?? []).reduce((sum, r) => sum + parseFloat(r.commission_amount), 0);
  return {
    referrals: referrals ?? [],
    total: (referrals ?? []).length,
    totalEarnings,
  };
}

// ---- Deposits ----
export async function createDeposit(userId: string, amountUsdt: number): Promise<{ orderId: string; paymentUrl: string }> {
  const orderId = `LUDZO_${userId.slice(0, 8)}_${Date.now()}`;
  await supabase.from('deposits').insert({
    user_id: userId,
    order_id: orderId,
    amount_usdt: amountUsdt,
    status: 'pending',
  });
  // In production, this would call Binance Pay API
  const paymentUrl = `https://bpay.binanceapi.com/checkout?orderId=${orderId}`;
  return { orderId, paymentUrl };
}

export async function getDepositHistory(userId: string): Promise<Deposit[]> {
  const { data } = await supabase.from('deposits').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
  return Array.isArray(data) ? data as Deposit[] : [];
}

// ---- Withdrawals ----
export async function createWithdrawal(userId: string, amount: number, walletAddress: string, network: string): Promise<{ success: boolean; message: string }> {
  const { data: settings } = await supabase.from('settings').select('key,value');
  const minWithdrawal = parseFloat(settings?.find(s => s.key === 'withdraw_minimum')?.value ?? '5');
  const feePercent = parseFloat(settings?.find(s => s.key === 'withdraw_fee')?.value ?? '5');

  if (amount < minWithdrawal) return { success: false, message: `Minimum withdrawal is $${minWithdrawal}` };

  const { data: wallet } = await supabase.from('wallets').select('usdt_balance').eq('user_id', userId).maybeSingle();
  if (!wallet || parseFloat(wallet.usdt_balance) < amount) return { success: false, message: 'Insufficient balance' };

  const fee = amount * (feePercent / 100);
  const finalAmount = amount - fee;

  // Deduct from wallet
  await supabase.from('wallets').update({
    usdt_balance: supabase.rpc as unknown as never,
  });
  await supabase.rpc('award_usdt', {
    p_user_id: userId,
    p_amount: -amount,
    p_type: 'withdraw',
    p_description: `Withdrawal to ${network}:${walletAddress.slice(0, 8)}...`,
  });

  await supabase.from('withdrawals').insert({
    user_id: userId,
    amount,
    fee,
    final_amount: finalAmount,
    wallet_address: walletAddress,
    network,
    status: 'pending',
  });

  return { success: true, message: 'Withdrawal request submitted' };
}

export async function getWithdrawalHistory(userId: string): Promise<Withdrawal[]> {
  const { data } = await supabase.from('withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
  return Array.isArray(data) ? data as Withdrawal[] : [];
}

// ---- Leaderboard ----
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await supabase.rpc('get_leaderboard', { p_limit: 100 });
  return Array.isArray(data) ? data as LeaderboardEntry[] : [];
}

// ---- Announcements ----
export async function getAnnouncements(): Promise<Announcement[]> {
  const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
  return Array.isArray(data) ? data as Announcement[] : [];
}

// ---- Settings ----
export async function getSettings(): Promise<AppSettings> {
  const { data } = await supabase.from('settings').select('key,value');
  const map = new Map((data ?? []).map((s: { key: string; value: string }) => [s.key, s.value]));
  return {
    coin_rate: parseInt(map.get('coin_rate') ?? '100'),
    ad_reward: parseInt(map.get('ad_reward') ?? '2'),
    daily_ad_limit: parseInt(map.get('daily_ad_limit') ?? '15'),
    withdraw_fee: parseFloat(map.get('withdraw_fee') ?? '5'),
    withdraw_minimum: parseFloat(map.get('withdraw_minimum') ?? '5'),
    deposit_minimum: parseFloat(map.get('deposit_minimum') ?? '5'),
    referral_percentage: parseFloat(map.get('referral_percentage') ?? '10'),
    welcome_bonus: parseInt(map.get('welcome_bonus') ?? '10'),
  };
}

export async function updateSettings(key: string, value: string): Promise<void> {
  await supabase.from('settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
}

// ---- Admin ----
export async function getAdminStats() {
  const today = new Date();
  today.setDate(today.getDate() - 7);
  const sevenDaysAgo = today.toISOString();

  const [
    { count: totalUsers },
    { count: activeUsers },
    { data: deposits },
    { data: withdrawals },
    { count: totalAds },
    { count: pendingWithdrawals },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('deposits').select('amount_usdt').eq('status', 'completed'),
    supabase.from('withdrawals').select('final_amount').in('status', ['approved', 'paid']),
    supabase.from('ad_logs').select('id', { count: 'exact', head: true }),
    supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const totalDeposits = (deposits ?? []).reduce((s, d) => s + parseFloat(d.amount_usdt), 0);
  const totalWithdrawals = (withdrawals ?? []).reduce((s, w) => s + parseFloat(w.final_amount), 0);

  return {
    total_users: totalUsers ?? 0,
    active_users: activeUsers ?? 0,
    total_deposits: totalDeposits,
    total_withdrawals: totalWithdrawals,
    total_ads_watched: totalAds ?? 0,
    total_revenue: totalDeposits - totalWithdrawals,
    pending_withdrawals: pendingWithdrawals ?? 0,
  };
}

export async function getAdminUsers(page = 0, search = '') {
  let query = supabase.from('users').select('*, wallets(coins_balance,usdt_balance)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * 20, page * 20 + 19);
  if (search) query = query.or(`username.ilike.%${search}%,first_name.ilike.%${search}%`);
  const { data, count } = await query;
  return { users: data ?? [], total: count ?? 0 };
}

export async function toggleBanUser(userId: string, ban: boolean): Promise<void> {
  await supabase.from('users').update({ is_banned: ban }).eq('id', userId);
}

export async function getAdminTasks() {
  const { data } = await supabase.from('tasks').select('*').order('sort_order');
  return data ?? [];
}

export async function createAdminTask(task: Partial<Task>): Promise<void> {
  await supabase.from('tasks').insert(task);
}

export async function updateAdminTask(id: string, task: Partial<Task>): Promise<void> {
  await supabase.from('tasks').update(task).eq('id', id);
}

export async function deleteAdminTask(id: string): Promise<void> {
  await supabase.from('tasks').delete().eq('id', id);
}

export async function getAdminDeposits(page = 0) {
  const { data, count } = await supabase.from('deposits').select('*, users!user_id(first_name,username)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * 20, page * 20 + 19);
  return { deposits: data ?? [], total: count ?? 0 };
}

export async function getAdminWithdrawals(page = 0, status?: string) {
  let query = supabase.from('withdrawals').select('*, users!user_id(first_name,username)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * 20, page * 20 + 19);
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, count } = await query;
  return { withdrawals: data ?? [], total: count ?? 0 };
}

export async function reviewWithdrawal(id: string, action: 'approved' | 'rejected' | 'paid'): Promise<void> {
  await supabase.from('withdrawals').update({ status: action, reviewed_at: new Date().toISOString() }).eq('id', id);
}

export async function getAdminAnnouncements() {
  const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  return data ?? [];
}

export async function createAdminAnnouncement(title: string, message: string): Promise<void> {
  await supabase.from('announcements').insert({ title, message, is_active: true });
}

export async function updateAdminAnnouncement(id: string, data: Partial<Announcement>): Promise<void> {
  await supabase.from('announcements').update(data).eq('id', id);
}

export async function deleteAdminAnnouncement(id: string): Promise<void> {
  await supabase.from('announcements').delete().eq('id', id);
}
