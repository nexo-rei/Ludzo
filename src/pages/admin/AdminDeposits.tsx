import React, { useEffect, useState, useCallback } from 'react';
import { getAdminDeposits } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface DepositRow {
  id: string;
  user_id: string;
  order_id: string;
  amount_usdt: number;
  status: string;
  created_at: string;
  users?: { first_name: string; username?: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-warning bg-warning/10',
  completed: 'text-success bg-success/10',
  failed: 'text-destructive bg-destructive/10',
};

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    const { deposits: d, total: t } = await getAdminDeposits(p);
    setDeposits(d as DepositRow[]);
    setTotal(t);
    setLoading(false);
  }, []);

  useEffect(() => { load(0); }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Deposits</h1>
        <p className="text-sm text-muted-foreground">{total} total deposits</p>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border">
              {['User', 'Order ID', 'Amount', 'Status', 'Date'].map(h => (
                <th key={h} className="text-xs font-semibold text-muted-foreground uppercase px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-2"><Skeleton className="h-10 rounded-lg" /></td></tr>
              ))
            ) : deposits.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No deposits yet.</td></tr>
            ) : deposits.map(d => {
              const u = Array.isArray(d.users) ? d.users[0] : d.users;
              return (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm font-medium text-foreground">{u?.first_name ?? 'Unknown'}</p>
                    {u?.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap max-w-[160px] truncate">{d.order_id}</td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-500 whitespace-nowrap">${Number(d.amount_usdt).toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status] ?? 'text-muted-foreground bg-muted'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(d.created_at), 'MMM d, yyyy HH:mm')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button className="text-sm text-primary disabled:text-muted-foreground" onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page === 0}>← Prev</button>
          <span className="text-sm text-muted-foreground">Page {page + 1}</span>
          <button className="text-sm text-primary disabled:text-muted-foreground" onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={(page + 1) * 20 >= total}>Next →</button>
        </div>
      )}
    </div>
  );
}
