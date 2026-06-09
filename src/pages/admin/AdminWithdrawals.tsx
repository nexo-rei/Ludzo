import React, { useEffect, useState, useCallback } from 'react';
import { getAdminWithdrawals, reviewWithdrawal } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface WithdrawRow {
  id: string;
  amount: number;
  fee: number;
  final_amount: number;
  wallet_address: string;
  network: string;
  status: string;
  created_at: string;
  users?: { first_name: string; username?: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-warning bg-warning/10',
  approved: 'text-secondary bg-secondary/10',
  rejected: 'text-destructive bg-destructive/10',
  paid: 'text-success bg-success/10',
};

const FILTERS = ['all', 'pending', 'approved', 'rejected', 'paid'];

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<WithdrawRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    const { withdrawals: w, total: t } = await getAdminWithdrawals(p, filter);
    setWithdrawals(w as WithdrawRow[]);
    setTotal(t);
    setLoading(false);
  }, [filter]);

  useEffect(() => { setPage(0); load(0); }, [filter, load]);

  const handleAction = async (id: string, action: 'approved' | 'rejected' | 'paid') => {
    setActionLoading(`${id}-${action}`);
    try {
      await reviewWithdrawal(id, action);
      toast.success(`Withdrawal ${action}`);
      load(page);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Withdrawals</h1>
          <p className="text-sm text-muted-foreground">{total} total withdrawals</p>
        </div>
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border">
              {['User', 'Amount', 'Fee', 'Net', 'Network', 'Address', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="text-xs font-semibold text-muted-foreground uppercase px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={9} className="px-4 py-2"><Skeleton className="h-10 rounded-lg" /></td></tr>
              ))
            ) : withdrawals.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">No withdrawals found.</td></tr>
            ) : withdrawals.map(w => {
              const u = Array.isArray(w.users) ? w.users[0] : w.users;
              return (
                <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm font-medium text-foreground">{u?.first_name ?? 'Unknown'}</p>
                    {u?.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground whitespace-nowrap">${Number(w.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-destructive whitespace-nowrap">-${Number(w.fee).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-success whitespace-nowrap">${Number(w.final_amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{w.network}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap max-w-[120px] truncate">{w.wallet_address}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[w.status] ?? ''}`}>{w.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(w.created_at), 'MMM d HH:mm')}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      {w.status === 'pending' && (
                        <>
                          <Button size="sm" className="h-7 text-xs bg-success hover:bg-success/90" onClick={() => handleAction(w.id, 'approved')} disabled={!!actionLoading}>Approve</Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleAction(w.id, 'rejected')} disabled={!!actionLoading}>Reject</Button>
                        </>
                      )}
                      {w.status === 'approved' && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleAction(w.id, 'paid')} disabled={!!actionLoading}>Mark Paid</Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
