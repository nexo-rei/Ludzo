'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Eye } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [range]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      const res = await fetch(`/api/admin/analytics?range=${range}`, {
        headers: { 'x-telegram-id': String(admin.telegram_id) },
      });
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const ranges = [
    { key: '24h', label: '24 Hours' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const grouped = {
    userGrowth: data?.userGrowth?.length || 0,
    taskCompletions: data?.taskCompletions?.length || 0,
    adWatches: data?.adWatches?.length || 0,
    totalWithdrawn: data?.withdrawals?.reduce((s: number, w: any) => w.status === 'approved' ? s + Number(w.amount) : s, 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <div className="flex gap-2">
          {ranges.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${range === r.key ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'User Signups', value: grouped.userGrowth, icon: Users, color: 'text-blue-400' },
          { label: 'Task Completions', value: grouped.taskCompletions, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Ad Watches', value: grouped.adWatches, icon: Eye, color: 'text-purple-400' },
          { label: 'Withdrawn (Total)', value: `₹${grouped.totalWithdrawn}`, icon: BarChart3, color: 'text-yellow-400' },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
