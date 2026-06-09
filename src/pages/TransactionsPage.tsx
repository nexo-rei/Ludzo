import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, DollarSign, Play, Gift, CheckSquare, ArrowUpCircle, ArrowDownCircle, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactionHistory } from '@/services/api';
import type { Transaction } from '@/types/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'coins', label: 'Coins' },
  { key: 'usdt', label: 'USDT' },
  { key: 'deposits', label: 'Deposits' },
  { key: 'withdrawals', label: 'Withdrawals' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'ads', label: 'Ads' },
];

const TX_ICON: Record<string, React.ElementType> = {
  ad_reward: Play,
  streak_reward: Gift,
  task_reward: CheckSquare,
  referral_reward: Trophy,
  deposit: ArrowDownCircle,
  withdraw: ArrowUpCircle,
  withdraw_fee: ArrowUpCircle,
  welcome_bonus: Gift,
  game_win: Trophy,
  game_entry: Coins,
  admin_adjustment: DollarSign,
};

const TX_LABEL: Record<string, string> = {
  ad_reward: 'Ad Reward',
  streak_reward: 'Streak Reward',
  task_reward: 'Task Reward',
  referral_reward: 'Referral Commission',
  deposit: 'Deposit',
  withdraw: 'Withdrawal',
  withdraw_fee: 'Withdrawal Fee',
  welcome_bonus: 'Welcome Bonus',
  game_win: 'Game Win',
  game_entry: 'Game Entry',
  admin_adjustment: 'Admin Adjustment',
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (p = 0) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getTransactionHistory(user.id, p, filter === 'all' ? undefined : filter);
      if (p === 0) setTransactions(data);
      else setTransactions(prev => [...prev, ...data]);
      setHasMore(data.length === 20);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => {
    setPage(0);
    load(0);
  }, [filter, load]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground flex-1">Transaction History</h1>
        </div>
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto whitespace-nowrap max-w-lg mx-auto">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-1">
        {loading && page === 0 ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Coins className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">No Transactions Yet</p>
            <p className="text-sm text-muted-foreground text-center">Your transaction history will appear here.</p>
          </div>
        ) : (
          <>
            {transactions.map(tx => {
              const Icon = TX_ICON[tx.type] ?? Coins;
              const isCredit = tx.amount > 0;
              const isCoins = tx.currency === 'coins';
              return (
                <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isCoins ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{TX_LABEL[tx.type] ?? tx.type}</p>
                    {tx.description && <p className="text-xs text-muted-foreground truncate">{tx.description}</p>}
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                  <div className={`text-sm font-bold tabular-nums shrink-0 ${isCredit ? 'text-success' : 'text-destructive'}`}>
                    {isCredit ? '+' : ''}
                    {isCoins ? `${tx.amount} Coins` : `$${Number(tx.amount).toFixed(2)}`}
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <button
                className="w-full py-3 text-sm text-primary font-medium"
                onClick={() => { const next = page + 1; setPage(next); load(next); }}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
