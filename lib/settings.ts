import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSettings } from "@/types";

export const SETTING_DEFAULTS: AppSettings = {
  app_name: "LUDZO",
  support_username: "LudzoSupportBot",
  coin_rate: 100,
  ad_reward_coins: 2,
  daily_ad_limit: 15,
  welcome_bonus_coins: 10,
  referral_commission_pct: 10,
  min_deposit: 5,
  min_withdrawal: 5,
  withdrawal_fee_pct: 5,
  streak_day_1: 2,
  streak_day_2: 3,
  streak_day_3: 4,
  streak_day_4: 5,
  streak_day_5: 6,
  streak_day_6: 8,
  streak_day_7: 10,
  maintenance_mode: false,
  maintenance_message: "We are performing scheduled maintenance. Back soon!",
};

/** Admin panel historically saved aliased keys (min_deposit_usdt, site_name). */
const SETTING_ALIASES: Record<string, keyof AppSettings> = {
  min_deposit_usdt: "min_deposit",
  min_withdrawal_usdt: "min_withdrawal",
  site_name: "app_name",
};

export async function getSettings(supabase: SupabaseClient): Promise<AppSettings> {
  const { data } = await supabase.from("settings").select("key, value");
  if (!data || data.length === 0) return { ...SETTING_DEFAULTS };

  const result: Record<string, unknown> = { ...SETTING_DEFAULTS };
  for (const row of data as Array<{ key: string; value: string }>) {
    const mapped = (SETTING_ALIASES[row.key] ?? row.key) as keyof AppSettings;
    const def = SETTING_DEFAULTS[mapped];
    if (typeof def === "number") result[mapped] = parseFloat(row.value) || 0;
    else if (typeof def === "boolean") result[mapped] = String(row.value) === "true";
    else if (def !== undefined) result[mapped] = row.value;
  }
  return result as unknown as AppSettings;
}

export function getStreakReward(settings: AppSettings, day: number): number {
  const d = Math.min(Math.max(day, 1), 7);
  const key = `streak_day_${d}` as keyof AppSettings;
  return (settings[key] as number) ?? 2;
}
