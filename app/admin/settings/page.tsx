'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, RotateCcw } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      const res = await fetch('/api/admin/settings', {
        headers: { 'x-telegram-id': String(admin.telegram_id) },
      });
      const json = await res.json();
      const map: Record<string, string> = {};
      json.settings?.forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    setSaving(key);
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-telegram-id': String(admin.telegram_id) },
        body: JSON.stringify({ key, value }),
      });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const settingGroups = [
    {
      title: 'Rewards',
      items: [
        { key: 'welcome_bonus', label: 'Welcome Bonus (Coins)', type: 'number' },
        { key: 'referral_reward', label: 'Referral Reward (Coins)', type: 'number' },
        { key: 'referral_commission', label: 'Referral Commission (%)', type: 'number' },
        { key: 'ad_reward', label: 'Ad Reward (Coins)', type: 'number' },
        { key: 'daily_ad_limit', label: 'Daily Ad Limit', type: 'number' },
      ],
    },
    {
      title: 'Withdrawal',
      items: [
        { key: 'upi_min', label: 'UPI Minimum (INR)', type: 'number' },
        { key: 'upi_max', label: 'UPI Maximum (INR)', type: 'number' },
        { key: 'usdt_min', label: 'USDT Minimum', type: 'number' },
        { key: 'usdt_max', label: 'USDT Maximum', type: 'number' },
        { key: 'withdrawal_fee', label: 'Withdrawal Fee (%)', type: 'number' },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {settingGroups.map(group => (
        <div key={group.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{group.title}</h2>
          <div className="grid gap-4">
            {group.items.map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <label className="text-sm text-gray-300">{item.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings[item.key] || ''}
                    onChange={e => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))}
                    className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white text-right"
                  />
                  <button
                    onClick={() => updateSetting(item.key, settings[item.key] || '0')}
                    disabled={saving === item.key}
                    className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {saving === item.key ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
