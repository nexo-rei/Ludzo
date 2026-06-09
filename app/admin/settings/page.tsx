"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { showToast } from "@/components/ui/Toast";

interface AppSettings {
  coin_rate: number;
  ad_reward_coins: number;
  daily_ad_limit: number;
  welcome_bonus_coins: number;
  referral_commission_pct: number;
  min_deposit_usdt: number;
  min_withdrawal_usdt: number;
  withdrawal_fee_pct: number;
  streak_day_1: number;
  streak_day_2: number;
  streak_day_3: number;
  streak_day_4: number;
  streak_day_5: number;
  streak_day_6: number;
  streak_day_7: number;
  site_name: string;
  support_username: string;
  maintenance_mode: boolean;
  maintenance_message: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  coin_rate: 100, ad_reward_coins: 2, daily_ad_limit: 15, welcome_bonus_coins: 10,
  referral_commission_pct: 10, min_deposit_usdt: 5, min_withdrawal_usdt: 5, withdrawal_fee_pct: 5,
  streak_day_1: 2, streak_day_2: 3, streak_day_3: 4, streak_day_4: 5, streak_day_5: 6, streak_day_6: 8, streak_day_7: 10,
  site_name: "LUDZO", support_username: "LudzoSupport", maintenance_mode: false, maintenance_message: "We'll be back shortly!",
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      if (data.success) setSettings({ ...DEFAULT_SETTINGS, ...data.data });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) showToast("Settings saved successfully!", "success");
      else showToast(data.error ?? "Failed to save", "error");
    } catch { showToast("Connection error", "error"); }
    finally { setSaving(false); }
  };

  const set = (key: keyof AppSettings, value: string | number | boolean) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const NumberInput = ({ label, field }: { label: string; field: keyof AppSettings }) => (
    <div>
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      <input
        type="number"
        value={settings[field] as number}
        onChange={(e) => set(field, Number(e.target.value))}
        className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED]"
      />
    </div>
  );

  return (
    <AdminShell title="Settings">
      {loading ? (
        <div className="text-center text-gray-500 py-10">Loading…</div>
      ) : (
        <div className="p-4 md:p-6 space-y-8 pb-10">
          {/* Economy */}
          <section>
            <h2 className="text-sm font-bold text-[#7C3AED] uppercase tracking-wide mb-4">Economy</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumberInput label="Coin Display Rate (X coins = $1)" field="coin_rate" />
              <NumberInput label="Coins Per Ad" field="ad_reward_coins" />
              <NumberInput label="Daily Ad Limit" field="daily_ad_limit" />
              <NumberInput label="Welcome Bonus (Coins)" field="welcome_bonus_coins" />
              <NumberInput label="Referral Commission (%)" field="referral_commission_pct" />
              <NumberInput label="Min Deposit (USDT)" field="min_deposit_usdt" />
              <NumberInput label="Min Withdrawal (USDT)" field="min_withdrawal_usdt" />
              <NumberInput label="Withdrawal Fee (%)" field="withdrawal_fee_pct" />
            </div>
          </section>

          {/* Daily streak */}
          <section>
            <h2 className="text-sm font-bold text-[#7C3AED] uppercase tracking-wide mb-4">Daily Streak Rewards (Coins)</h2>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
              {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => (
                <div key={day} className="text-center">
                  <label className="text-xs text-gray-400 font-medium">Day {day}</label>
                  <input
                    type="number"
                    value={settings[`streak_day_${day}` as keyof AppSettings] as number}
                    onChange={(e) => set(`streak_day_${day}` as keyof AppSettings, Number(e.target.value))}
                    className="w-full mt-1 px-2 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm text-center outline-none focus:border-[#7C3AED]"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Platform */}
          <section>
            <h2 className="text-sm font-bold text-[#7C3AED] uppercase tracking-wide mb-4">Platform</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 font-medium">Site Name</label>
                <input
                  type="text" value={settings.site_name} onChange={(e) => set("site_name", e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium">Support Telegram Username</label>
                <input
                  type="text" value={settings.support_username} onChange={(e) => set("support_username", e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium">Maintenance Message</label>
                <textarea
                  value={settings.maintenance_message} onChange={(e) => set("maintenance_message", e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED] resize-none"
                />
              </div>

              {/* Maintenance toggle */}
              <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                settings.maintenance_mode ? "border-yellow-500/40 bg-yellow-500/05" : "border-[#333] bg-[#1a1a1a]"
              }`}>
                <div>
                  <div className="text-sm font-bold text-white">Maintenance Mode</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {settings.maintenance_mode ? "🔴 App is OFFLINE for users" : "🟢 App is LIVE for users"}
                  </div>
                </div>
                <button
                  onClick={() => set("maintenance_mode", !settings.maintenance_mode)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.maintenance_mode ? "bg-yellow-500" : "bg-[#333]"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.maintenance_mode ? "translate-x-7" : "translate-x-1"
                  }`} />
                </button>
              </div>
            </div>
          </section>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-xl bg-[#7C3AED] text-white font-bold text-base hover:bg-[#5B21B6] transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save All Settings"}
          </button>
        </div>
      )}
    </AdminShell>
  );
}
