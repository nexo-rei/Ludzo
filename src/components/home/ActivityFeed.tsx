import React from 'react';
import { Coins, DollarSign, CheckSquare, Play, Gift, Trophy } from 'lucide-react';
import type { Transaction } from '@/types/types';
import { formatDistanceToNow } from 'date-fns';

const TX_ICONS: Record<string, React.ReactNode> = {
  ad_reward: <Play className="w-4 h-4" />,
  streak_reward: <Gift className="w-4 h-4" />,
  task_reward: <CheckSquare className="w-4 h-4" />,
  referral_reward: <Trophy className="w-4 h-4" />,
  deposit: <DollarSign className="w-4 h-4" />,
  withdraw: <DollarSign className="w-4 h-4" />,
  welcome_bonus: <Gift className="w-4 h-4" />,
};

const TX_LABELS: Record<string, string> = {
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
  admin_adjustment: 'Adjustment',
};

interface ActivityFeedProps {
  transactions: Transaction[];
}

export default function ActivityFeed({ transactions }: ActivityFeedProps) {
  if (!transactions.length) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transactions.slice(0, 5).map(tx => {
        const isCredit = tx.amount > 0;
        const isCoins = tx.currency === 'coins';

        return (
          <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCoins ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
              {TX_ICONS[tx.type] ?? (isCoins ? <Coins className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{TX_LABELS[tx.type] ?? tx.type}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
              </div>
            </div>
            <div className={`text-sm font-bold tabular-nums ${isCredit ? 'text-success' : 'text-destructive'}`}>
              {isCredit ? '+' : '-'}
              {isCoins ? `${Math.abs(tx.amount)} Coins` : `$${Math.abs(tx.amount).toFixed(2)}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
