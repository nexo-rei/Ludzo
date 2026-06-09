import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Copy, Share2, Users, DollarSign, Percent, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getReferralStats } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTelegram } from '@/hooks/useTelegram';
import { formatDistanceToNow } from 'date-fns';

interface ReferralStats {
  referrals: Array<{
    id: string;
    first_deposit_completed: boolean;
    commission_paid: boolean;
    created_at: string;
    users?: { first_name: string; username?: string; photo_url?: string };
  }>;
  total: number;
  totalEarnings: number;
}

const HOW_IT_WORKS = [
  { icon: Share2, title: 'Invite Friends', desc: 'Share your unique referral link with friends', color: 'bg-primary/10 text-primary' },
  { icon: DollarSign, title: 'Friend Deposits', desc: 'Your friend makes their first USDT deposit', color: 'bg-secondary/10 text-secondary' },
  { icon: Percent, title: 'Earn 10% Commission', desc: 'Receive 10% USDT on their first deposit only', color: 'bg-success/10 text-success' },
];

export default function ReferPage() {
  const { user } = useAuth();
  const { shareLink } = useTelegram();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getReferralStats(user.id);
      setStats(data as ReferralStats);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const referralLink = user
    ? `https://t.me/LudzoBot?start=${user.referral_code}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!', { icon: '📋' });
  };

  const handleShare = () => {
    shareLink(referralLink, 'Join LUDZO and earn Coins! Use my referral link:');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-foreground">Refer & Earn</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-4">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          ) : (
            <>
              <div className="rounded-2xl bg-card border border-border p-3 text-center">
                <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Referrals</p>
              </div>
              <div className="rounded-2xl bg-card border border-border p-3 text-center">
                <DollarSign className="w-5 h-5 text-success mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">${(stats?.totalEarnings ?? 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </div>
              <div className="rounded-2xl bg-card border border-border p-3 text-center">
                <Percent className="w-5 h-5 text-secondary mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">10%</p>
                <p className="text-xs text-muted-foreground">Rate</p>
              </div>
            </>
          )}
        </div>

        {/* Referral Link */}
        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-foreground">Your Referral Link</h3>
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
            <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate font-mono">{referralLink}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2 h-10" onClick={handleCopy}>
              <Copy className="w-4 h-4" />
              Copy
            </Button>
            <Button className="gap-2 h-10" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-foreground">How It Works</h3>
          <div className="flex flex-col gap-3">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc, color }, i) => (
              <div key={title} className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2.5" />}
              </div>
            ))}
          </div>
        </div>

        {/* Referral History */}
        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-foreground">Referral History</h3>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)
          ) : !stats?.referrals?.length ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <Users className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No Referrals Yet</p>
              <p className="text-xs text-muted-foreground text-center">Share your link to start earning commissions.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.referrals.map(ref => {
                const u = ref.users as { first_name: string; username?: string; photo_url?: string } | undefined;
                return (
                  <div key={ref.id} className="flex items-center gap-3 py-1.5">
                    {u?.photo_url ? (
                      <img src={u.photo_url} alt={u.first_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {u?.first_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u?.username ? `@${u.username}` : (u?.first_name ?? 'User')}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(ref.created_at), { addSuffix: true })}</p>
                    </div>
                    <div className="shrink-0">
                      {ref.first_deposit_completed ? (
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />Deposited
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
