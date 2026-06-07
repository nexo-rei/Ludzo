'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Coins, Eye, Wallet, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      const res = await fetch('/api/admin/dashboard', {
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

  const statCards = [
    { label: 'Total Users', value: data?.stats?.totalUsers || 0, icon: Users, color: 'text-blue-400' },
    { label: 'New Today', value: data?.stats?.newUsersToday || 0, icon: Users, color: 'text-green-400' },
    { label: 'Total Coins', value: data?.stats?.totalCoins || 0, icon: Coins, color: 'text-yellow-400' },
    { label: 'Total Ads', value: data?.stats?.totalAds || 0, icon: Eye, color: 'text-purple-400' },
    { label: 'Pending', value: data?.stats?.pendingWithdrawals || 0, icon: Clock, color: 'text-orange-400' },
    { label: 'Approved', value: data?.stats?.approvedWithdrawals || 0, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Rejected', value: data?.stats?.rejectedWithdrawals || 0, icon: XCircle, color: 'text-red-400' },
    { label: 'Total Withdrawals', value: (data?.stats?.approvedWithdrawals || 0) + (data?.stats?.rejectedWithdrawals || 0) + (data?.stats?.pendingWithdrawals || 0), icon: Wallet, color: 'text-gray-400' },
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
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{card.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Top Earners */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Top 10 Earners</h2>
          <div className="space-y-2">
            {data?.topEarners?.map((earner: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                  <span className="text-sm text-white">{earner.users?.display_name || 'Anonymous'}</span>
                </div>
                <span className="text-sm font-bold text-yellow-400">{earner.coins} Coins</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Top 10 Referrers</h2>
          <div className="space-y-2">
            {data?.topReferrers?.map((ref: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                  <span className="text-sm text-white">{ref.users?.display_name || 'Anonymous'}</span>
                </div>
                <span className="text-sm font-bold text-purple-400">{ref.count} refs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {data?.recentLogs?.map((log: any) => (
            <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <p className="text-sm text-white">{log.action}</p>
                <p className="text-xs text-gray-500">by {log.admin?.display_name || 'System'}</p>
              </div>
              <span className="text-xs text-gray-600">{new Date(log.created_at).toLocaleDateString()}</span>
            </div>
          )) || <p className="text-sm text-gray-500">No recent activity</p>}
        </div>
      </div>
    </div>
  );
}
