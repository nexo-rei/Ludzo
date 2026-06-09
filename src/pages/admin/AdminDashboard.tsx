import React, { useEffect, useState } from 'react';
import { Users, Eye, DollarSign, TrendingUp, ArrowUpCircle, Clock } from 'lucide-react';
import { getAdminStats } from '@/services/api';
import type { AdminStats } from '@/types/types';
import { Skeleton } from '@/components/ui/skeleton';

const STAT_CARDS = (stats: AdminStats) => [
  { label: 'Total Users', value: stats.total_users.toLocaleString(), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Active (7d)', value: stats.active_users.toLocaleString(), icon: Users, color: 'text-secondary', bg: 'bg-secondary/10' },
  { label: 'Total Deposits', value: `$${stats.total_deposits.toFixed(2)}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
  { label: 'Total Withdrawals', value: `$${stats.total_withdrawals.toFixed(2)}`, icon: ArrowUpCircle, color: 'text-warning', bg: 'bg-warning/10' },
  { label: 'Ad Views', value: stats.total_ads_watched.toLocaleString(), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Net Revenue', value: `$${stats.total_revenue.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'Pending Withdrawals', value: stats.pending_withdrawals.toString(), icon: Clock, color: 'text-destructive', bg: 'bg-destructive/10' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(s => { setStats(s); setLoading(false); });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform overview and key metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : stats && STAT_CARDS(stats).map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3 h-full">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
