import React, { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '@/services/api';
import type { AppSettings } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const SETTING_META: { key: keyof AppSettings; label: string; description: string; prefix?: string; suffix?: string }[] = [
  { key: 'coin_rate', label: 'Coin Rate', description: 'Coins per $1 USD', suffix: 'Coins/$1' },
  { key: 'ad_reward', label: 'Ad Reward', description: 'Coins earned per ad watched', suffix: 'Coins/ad' },
  { key: 'daily_ad_limit', label: 'Daily Ad Limit', description: 'Maximum ads per user per day', suffix: 'ads/day' },
  { key: 'withdraw_fee', label: 'Withdrawal Fee', description: 'Percentage fee on withdrawals', suffix: '%' },
  { key: 'withdraw_minimum', label: 'Withdrawal Minimum', description: 'Minimum USDT withdrawal amount', prefix: '$' },
  { key: 'deposit_minimum', label: 'Deposit Minimum', description: 'Minimum USDT deposit amount', prefix: '$' },
  { key: 'referral_percentage', label: 'Referral Commission', description: 'Commission % on first deposit', suffix: '%' },
  { key: 'welcome_bonus', label: 'Welcome Bonus', description: 'Coins awarded to new users', suffix: 'Coins' },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      const v: Record<string, string> = {};
      Object.entries(s).forEach(([k, val]) => { v[k] = String(val); });
      setValues(v);
      setLoading(false);
    });
  }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await updateSettings(key, values[key]);
      toast.success(`${key} updated!`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="flex flex-col gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure platform-wide settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SETTING_META.map(({ key, label, description, prefix, suffix }) => (
          <div key={key} className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3 h-full">
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <div className="flex gap-2 items-center">
              {prefix && <span className="text-sm text-muted-foreground shrink-0">{prefix}</span>}
              <Input
                type="number"
                value={values[key] ?? ''}
                onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
                className="h-9 flex-1"
                step="0.01"
              />
              {suffix && <span className="text-sm text-muted-foreground shrink-0">{suffix}</span>}
              <Button
                size="sm"
                className="h-9 shrink-0"
                onClick={() => handleSave(key)}
                disabled={saving === key}
              >
                {saving === key ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
