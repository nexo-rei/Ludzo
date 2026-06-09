import React from 'react';
import { Coins, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BalanceCardsProps {
  coinsBalance: number;
  usdtBalance: number;
  loading?: boolean;
}

export default function BalanceCards({ coinsBalance, usdtBalance, loading }: BalanceCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Coins Card */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-4 flex flex-col gap-2">
        <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full bg-amber-500/10" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg coin-gradient flex items-center justify-center">
            <Coins className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Coins</span>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {coinsBalance.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            ≈ ${(coinsBalance / 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* USDT Card */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-4 flex flex-col gap-2">
        <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full bg-emerald-500/10" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg usdt-gradient flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">USDT</span>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            ${Number(usdtBalance).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Withdrawable
          </div>
        </div>
      </div>
    </div>
  );
}
