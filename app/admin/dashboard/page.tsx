"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import AdminShell from "@/components/admin/AdminShell";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { formatUSDT, formatCoins, formatDateTime } from "@/lib/utils";

interface DashboardStats {
  total_users: number;
  active_users_today: number;
  new_users_today: number;
  pending_withdrawals: number;
  pending_withdrawal_amount: number;
  pending_deposits: number;
  total_deposited: number;
  total_withdrawn: number;
  total_coins_distributed: number;
  weekly_signups: { created_at: string }[];
  monthly_revenue: { amount: number; created_at: string }[];
}

const STAT_CARDS = (s: DashboardStats) => [
  { label: "Total Users", value: s.total_users.toLocaleString(), icon: "👥", color: "#7C3AED" },
  { label: "Active Today", value: s.active_users_today.toLocaleString(), icon: "🟢", color: "#10B981" },
  { label: "New Today", value: s.new_users_today.toLocaleString(), icon: "✨", color: "#A855F7" },
  { label: "Total Deposited", value: `$${formatUSDT(s.total_deposited)}`, icon: "💰", color: "#F59E0B" },
  { label: "Total Withdrawn", value: `$${formatUSDT(s.total_withdrawn)}`, icon: "💸", color: "#EF4444" },
  { label: "Coins Distributed", value: formatCoins(s.total_coins_distributed), icon: "🪙", color: "#F59E0B" },
  { label: "Pending Withdrawals", value: s.pending_withdrawals.toString(), icon: "⏳", color: "#F59E0B", alert: s.pending_withdrawals > 0 },
  { label: "Pending Deposits", value: s.pending_deposits.toString(), icon: "📥", color: "#7C3AED" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = localStorage.getItem("ludzo_admin_token");
    if (!token) { router.replace("/admin"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Build chart data
  const chartData = stats?.weekly_signups
    ? (() => {
        const days: Record<string, number> = {};
        stats.weekly_signups.forEach((u) => {
          const d = u.created_at.slice(0, 10);
          days[d] = (days[d] ?? 0) + 1;
        });
        return Object.entries(days).slice(-7).map(([date, count]) => ({ date: date.slice(5), count }));
      })()
    : [];

  return (
    <AdminShell title="Dashboard">
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : stats ? (
        <div className="p-6 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STAT_CARDS(stats).map((card) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#111] border rounded-2xl p-4 ${card.alert ? "border-yellow-500/50" : "border-[#222]"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{card.icon}</span>
                  {card.alert && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full font-bold">Action</span>}
                </div>
                <div className="text-xl font-black text-white font-numeric">{card.value}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{card.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Review Withdrawals", href: "/admin/withdrawals", urgent: stats.pending_withdrawals > 0 },
                { label: "Manage Tasks", href: "/admin/tasks", urgent: false },
                { label: "New Announcement", href: "/admin/announcements", urgent: false },
                { label: "View Logs", href: "/admin/logs", urgent: false },
              ].map((action) => (
                <button
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    action.urgent
                      ? "bg-yellow-500 text-black hover:bg-yellow-400"
                      : "bg-[#222] text-gray-300 hover:bg-[#333]"
                  }`}
                >
                  {action.label}
                  {action.urgent && stats.pending_withdrawals > 0 && ` (${stats.pending_withdrawals})`}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-gray-300 mb-4">New Signups (Last 7 Days)</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#aaa" }}
                    itemStyle={{ color: "#A855F7" }}
                  />
                  <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : null}
    </AdminShell>
  );
}
